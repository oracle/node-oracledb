// Copyright (c) 2022, 2026, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const { Buffer } = require('buffer');
const crypto = require('crypto');
const errors = require('../../errors.js');
const constants = require('./constants.js');

const MAX_PBKDF2_ITERATIONS = 100_000;

function getPBKDF2Iterations(sessionData, key) {
  const iterations = Number(sessionData[key]);
  if (!Number.isInteger(iterations) || iterations < 1 ||
      iterations > MAX_PBKDF2_ITERATIONS) {
    errors.throwErr(errors.ERR_INVALID_SERVER_RESPONSE);
  }
  return iterations;
}

function resolveCipherKey(key) {
  if (!Buffer.isBuffer(key)) {
    errors.throwErr(errors.ERR_INTERNAL,
      'Encryption key must be a Buffer');
  }

  let cipherAlg;
  switch (key.length) {
    case 16:
      cipherAlg = 'aes-128-cbc';
      break;
    case 24:
      cipherAlg = 'aes-192-cbc';
      break;
    case 32:
      cipherAlg = 'aes-256-cbc';
      break;
    default:
      errors.throwErr(errors.ERR_UNSUPPORTED_KEY_LENGTH, key.length);
  }

  return cipherAlg;
}

const _appendBuffer = Buffer.from([0x00, 0x01]);

// Fixed DES key used in the first round of the legacy 10G verifier algorithm.
const _fixedKey10G = Buffer.from('0123456789ABCDEF', 'hex');

// DES-CBC (single DES, 8-byte key, IV=0, no padding). OpenSSL 3 moved single-DES
// to the legacy provider, so we run 3DES with K1=K2=K3 (the key tripled), which
// is equivalent to single DES and remains in the default provider.
function _desCbc10G(key8, data) {
  const iv = Buffer.alloc(8, 0);
  const key24 = Buffer.concat([key8, key8, key8]);
  const cipher = crypto.createCipheriv('des-ede3-cbc', key24, iv);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(data), cipher.final()]);
}

// Computes the legacy 10G (DES) password verifier: the 8-byte hash Oracle stores
// in SYS.USER$.PASSWORD. DES-CBC over UPPER(user+password) encoded as UTF-16BE and
// zero-padded, keyed by a fixed constant; the last block becomes the key for a
// second DES-CBC pass over the same text, whose last block is the verifier.
function getVerifier10G(username, password) {
  // Node has no native UTF-16BE encoding: encode UTF-16LE then swap each 16-bit
  // word to big-endian.
  const text = Buffer.from(String(username + password).toUpperCase(), 'utf16le');
  text.swap16();
  const blockSize = 8;
  const rem = text.length % blockSize;
  const padded = rem ?
    Buffer.concat([text, Buffer.alloc(blockSize - rem)]) : text;
  const interKey = _desCbc10G(_fixedKey10G, padded).subarray(-8);
  return _desCbc10G(interKey, padded).subarray(-8);
}

/**
 * A single Instance which handles all Encrypt, Decrypt,
 * hash related to password verifiers.
 */
class EncryptDecrypt {

  // Key length is dependent on the algorithm. In this case for aes192, it is
  // 24 bytes (192 bits).
  decrypt(key, val) {
    const iv = Buffer.alloc(16, 0); // Initialization vector, same is used in server
    const cipherAlg = resolveCipherKey(key);
    const decipher = crypto.createDecipheriv(cipherAlg, key, iv);
    decipher.setAutoPadding(false);
    let decrypted = decipher.update(val);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted;
  }

  _encrypt(key, val, padding) {
    const block_size = 16;
    const iv = Buffer.alloc(block_size, 0);
    const n = block_size - (val.length % block_size);
    const nv = Buffer.alloc(n, n);
    if (n > 0) {
      if (padding) {
        val += Buffer.alloc(n);
      } else {
        val = Buffer.concat([val, nv]);
      }
    }
    const cipherAlg = resolveCipherKey(key);
    const cipher = crypto.createCipheriv(cipherAlg, key, iv);
    let encrypted = cipher.update(val);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    if (!padding) {
      encrypted = encrypted.slice(0, val.length);
    }
    val.fill(0);
    return encrypted;
  }

  // Encrypt password and newPassword using comboKey
  _setEncryptedPasswordBuffers(passwordBytes, newPasswordBytes, comboKey, authObj) {
    const salt = Buffer.alloc(16);
    crypto.randomFillSync(salt, 0, 16);
    const temp = Buffer.concat([salt, passwordBytes]);
    authObj.encodedPassword = this._encrypt(comboKey, temp);
    temp.fill(0);
    authObj.encodedPassword = authObj.encodedPassword.slice().toString('hex').toUpperCase();

    if (newPasswordBytes) {
      const newPasswordWithSalt = Buffer.concat([salt, newPasswordBytes]);
      authObj.encodedNewPassword = this._encrypt(comboKey, newPasswordWithSalt);
      newPasswordWithSalt.fill(0);
      authObj.encodedNewPassword = authObj.encodedNewPassword.slice().toString('hex').toUpperCase();
    }

    // reset Buffers
    passwordBytes.fill(0);
    if (newPasswordBytes) {
      newPasswordBytes.fill(0);
    }
  }

  /**
   * updates authObject with required data.
   *
   * @param {object} sessionData The key/value pairs returned from OSESS key rpc
   * @param {string} password    Current Password of user
   * @param {string} newPassword New password to be updated
   * @param {number} verifierType Verifier type returned by the server
   */
  updateVerifierData(sessionData, password, newPassword, verifierType, authObj) {
    const verifier11G =
      verifierType === constants.TNS_VERIFIER_TYPE_11G_1 ||
      verifierType === constants.TNS_VERIFIER_TYPE_11G_2;
    const verifier10G = verifierType === constants.TNS_VERIFIER_TYPE_10G;
    let keyLen = 32;

    const verifierData = Buffer.from(sessionData['AUTH_VFR_DATA'], 'hex');
    const encodedServerKey = Buffer.from(sessionData['AUTH_SESSKEY'], 'hex');
    const passwordBytes = Buffer.from(password, 'utf8');
    let passwordHash;
    let passwordKey;

    if (verifier11G) {
      keyLen = 24;
      const h = crypto.createHash('sha1');
      h.update(passwordBytes);
      h.update(verifierData);
      const ph = h.digest();
      passwordHash = Buffer.alloc(ph.length + 4);
      ph.copy(passwordHash, 0, 0, ph.length);
    } else if (verifier10G) {
      // Legacy 10G (DES): the AES-128 key is the 8-byte binary verifier padded
      // to 16 bytes with zeros (the server derives the same key from its stored
      // verifier). The rest of the handshake matches the 12C path.
      keyLen = 16;
      const verifier = getVerifier10G(authObj.username, password);
      passwordHash = Buffer.concat([verifier, Buffer.alloc(16 - verifier.length)]);
    } else {
      const temp = Buffer.from('AUTH_PBKDF2_SPEEDY_KEY', 'utf8');
      const salt = Buffer.concat([verifierData, temp]);
      const iterations = getPBKDF2Iterations(sessionData, 'AUTH_PBKDF2_VGEN_COUNT');
      passwordKey = crypto.pbkdf2Sync(passwordBytes, salt, iterations, 64, 'sha512');
      const h = crypto.createHash('sha512');
      h.update(passwordKey);
      h.update(verifierData);
      passwordHash = h.digest().slice(0, keyLen);
    }

    let newPasswordBytes;
    if (newPassword) {
      newPasswordBytes = Buffer.from(newPassword, 'utf8');
    }
    const sessionKeyParta = this.decrypt(passwordHash, encodedServerKey);
    const sessionKeyPartb = Buffer.alloc(sessionKeyParta.length);
    crypto.randomFillSync(sessionKeyPartb);
    const encodedClientKey = this._encrypt(passwordHash, sessionKeyPartb);

    if (sessionKeyParta.length === 48) {
      authObj.sessionKey = encodedClientKey.slice().toString('hex').toUpperCase().slice(0, 96);
      const buf = Buffer.alloc(24);
      for (let i = 16; i <= 40; i++) {
        buf[i - 16] = sessionKeyParta[i] ^ sessionKeyPartb[i];
      }
      const part1 = crypto.createHash("md5").update(buf.subarray(0, 16)).digest();
      const part2 = crypto.createHash("md5").update(buf.subarray(16)).digest();
      authObj.comboKey = Buffer.concat([part1, part2]).slice(0, keyLen);
    } else {
      authObj.sessionKey = encodedClientKey.slice().toString('hex').toUpperCase().slice(0, 64);
      const mixingSalt = Buffer.from(sessionData['AUTH_PBKDF2_CSK_SALT'], 'hex');
      const iterations = getPBKDF2Iterations(sessionData, 'AUTH_PBKDF2_SDER_COUNT');
      const partABKey = Buffer.concat([sessionKeyPartb.slice(0, keyLen), sessionKeyParta.slice(0, keyLen)]);
      const partABKeyStr = partABKey.toString('hex').toUpperCase();
      const partABKeyBuffer = Buffer.from(partABKeyStr, 'utf8');
      authObj.comboKey = crypto.pbkdf2Sync(partABKeyBuffer, mixingSalt,
        iterations, keyLen, 'sha512');
    }

    const salt = Buffer.alloc(16);
    // Only the 12C verifier sends AUTH_PBKDF2_SPEEDY_KEY (10G has no PBKDF2
    // password key; 11G uses the MD5 session-key path).
    if (verifierType === constants.TNS_VERIFIER_TYPE_12C) {
      crypto.randomFillSync(salt, 0, 16);
      const temp = Buffer.concat([salt, passwordKey]);
      authObj.speedyKey = this._encrypt(authObj.comboKey, temp);
      authObj.speedyKey = authObj.speedyKey.slice(0, 80).toString('hex').toUpperCase();
    }
    this._setEncryptedPasswordBuffers(passwordBytes, newPasswordBytes, authObj.comboKey, authObj);
  }

  getEncryptedJSWPData(sessionKey, jdwpData) {
    let buf = this._encrypt(sessionKey, jdwpData, true);

    // Add a "01" at the end of the hex encrypted data to indicate the
    // use of AES encryption
    buf = buf.slice().toString('hex').toUpperCase();
    buf = Buffer.concat([buf, _appendBuffer]);
    return buf;
  }

  updatePasswordsWithComboKey(password, newPassword, comboKey, authObj) {
    const passwordBytes = Buffer.from(password, 'utf8');
    let newPasswordBytes;
    if (newPassword) {
      newPasswordBytes = Buffer.from(newPassword, 'utf8');
    }
    this._setEncryptedPasswordBuffers(passwordBytes, newPasswordBytes, comboKey, authObj);
  }
}

const encryptDecryptInst = new EncryptDecrypt();
module.exports = encryptDecryptInst;

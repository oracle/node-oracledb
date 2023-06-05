// Copyright (c) 2022, 2023, Oracle and/or its affiliates.

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

let algorithm = 'aes-256-cbc';
const _appendBuffer = Buffer.from([0x00, 0x01]);

/**
 * A single Instance which handles all Encrypt, Decrypt,
 * hash related to password verifiers.
 */
class EncryptDecrypt {

  // Key length is dependent on the algorithm. In this case for aes192, it is
  // 24 bytes (192 bits).
  _decrypt(key, val) {
    const iv = Buffer.alloc(16, 0); // Initialization vector, same is used in server
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAutoPadding(false);
    let decrypted = decipher.update(val);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted;
  }

  _encrypt(key, val, padding) {
    let block_size = 16;
    const iv = Buffer.alloc(block_size, 0);
    let n = block_size - (val.length % block_size);
    const nv = Buffer.alloc(n, n);
    if (n > 0) {
      if (padding) {
        val += Buffer.alloc(n);
      } else {
        val = Buffer.concat([val, nv]);
      }
    }
    const cipher = crypto.createCipheriv(algorithm, key, iv);
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
    let salt = Buffer.alloc(16);
    crypto.randomFillSync(salt, 0, 16);
    let temp = Buffer.concat([salt, passwordBytes]);
    authObj.encodedPassword = this._encrypt(comboKey, temp);
    temp.fill(0);
    authObj.encodedPassword = authObj.encodedPassword.slice().toString('hex').toUpperCase();

    if (newPasswordBytes) {
      let newPasswordWithSalt = Buffer.concat([salt, newPasswordBytes]);
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
   * @param {boolean} verifier11G Verifier type 11g or not(12c)
   */
  updateVerifierData(sessionData, password, newPassword, verifier11G, authObj) {
    let keyLen = 32;
    let hashAlg = 'sha512';

    let verifierData = Buffer.from(sessionData['AUTH_VFR_DATA'], 'hex');
    let encodedServerKey = Buffer.from(sessionData['AUTH_SESSKEY'], 'hex');
    let iterations = Number(sessionData['AUTH_PBKDF2_VGEN_COUNT']);
    let passwordBytes = Buffer.from(password, 'utf8');
    let passwordHash;
    let passwordKey;

    if (verifier11G) {
      algorithm = 'aes-192-cbc';
      keyLen = 24;
      hashAlg = 'sha1';
      let h = crypto.createHash(hashAlg);
      h.update(passwordBytes);
      h.update(verifierData);
      let ph = h.digest();
      passwordHash = Buffer.alloc(ph.length + 4);
      ph.copy(passwordHash, 0, 0, ph.length);
    } else {
      algorithm = 'aes-256-cbc';
      let temp = Buffer.from('AUTH_PBKDF2_SPEEDY_KEY', 'utf8');
      let salt = Buffer.concat([verifierData, temp]);
      passwordKey = crypto.pbkdf2Sync(passwordBytes, salt, iterations, 64, 'sha512');
      let h = crypto.createHash(hashAlg);
      h.update(passwordKey);
      h.update(verifierData);
      passwordHash = h.digest().slice(0, keyLen);
    }

    let newPasswordBytes;
    if (newPassword) {
      newPasswordBytes = Buffer.from(newPassword, 'utf8');
    }
    let sessionKeyParta = this._decrypt(passwordHash, encodedServerKey);
    let sessionKeyPartb = Buffer.alloc(32);
    crypto.randomFillSync(sessionKeyPartb, 0, 32);
    let encodedClientKey = this._encrypt(passwordHash, sessionKeyPartb);
    authObj.sessionKey = encodedClientKey.slice().toString('hex').toUpperCase().slice(0, 64);

    iterations = Number(sessionData['AUTH_PBKDF2_SDER_COUNT']);
    let mixingSalt = Buffer.from(sessionData['AUTH_PBKDF2_CSK_SALT'], 'hex');
    let partABKey = Buffer.concat([sessionKeyPartb.slice(0, keyLen), sessionKeyParta.slice(0, keyLen)]);
    let partABKeyStr = partABKey.toString('hex').toUpperCase();
    let partABKeyBuffer = Buffer.from(partABKeyStr, 'utf8');
    authObj.comboKey = crypto.pbkdf2Sync(partABKeyBuffer, mixingSalt, iterations, keyLen, 'sha512');

    let salt = Buffer.alloc(16);
    if (!verifier11G) {
      crypto.randomFillSync(salt, 0, 16);
      let temp = Buffer.concat([salt, passwordKey]);
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
    let passwordBytes = Buffer.from(password, 'utf8');
    let newPasswordBytes;
    if (newPassword) {
      newPasswordBytes = Buffer.from(newPassword, 'utf8');
    }
    this._setEncryptedPasswordBuffers(passwordBytes, newPasswordBytes, comboKey, authObj);
  }
}

let encryptDecryptInst = new EncryptDecrypt();
module.exports = encryptDecryptInst;

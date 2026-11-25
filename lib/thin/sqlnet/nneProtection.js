// Oracle Net AES256 and SHA256 packet protection, based on go-ora v2.9.0
// and the per-session encryption and integrity code in go-ora v3 b4ef646.
// https://github.com/sijms/go-ora
//
// MIT License
//
// Copyright (c) 2020 Samy Sultan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

'use strict';

const { Buffer } = require('buffer');
const crypto = require('crypto');
const errors = require('../../errors.js');

const BLOCK_SIZE = 16;
const KEY_SIZE = 32;
const CHECKSUM_SIZE = 32;
const PACKET_TRAILER_SIZE = 2;
const MAX_OVERHEAD = CHECKSUM_SIZE + BLOCK_SIZE - 1 + PACKET_TRAILER_SIZE;
const ZERO_IV = Buffer.alloc(BLOCK_SIZE);

function encryptBlocks(algorithm, key, iv, plaintext) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(plaintext), cipher.final()]);
}

function checksum(payload, stream) {
  // Oracle derives a fresh checksum suffix for each DATA packet by advancing
  // a CBC stream. Each direction has its own stream and suffix state.
  stream.suffix = encryptBlocks('aes-128-cbc', stream.key, stream.iv, stream.suffix);
  stream.iv = stream.suffix.subarray(CHECKSUM_SIZE - BLOCK_SIZE);
  return crypto.createHash('sha256').update(payload).update(stream.suffix).digest();
}

class NneProtection {
  constructor(sessionKey, iv, { modernEncryption = false, modernIntegrity = false } = {}) {
    if (sessionKey.length < KEY_SIZE || iv.length < BLOCK_SIZE ||
        ((modernEncryption || modernIntegrity) && sessionKey.length < KEY_SIZE + BLOCK_SIZE)) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    this.modernEncryption = modernEncryption;
    this.modernIntegrity = modernIntegrity;
    this.sessionKey = Buffer.from(sessionKey.subarray(0, KEY_SIZE));
    this.legacyIv = Buffer.from(iv.subarray(0, BLOCK_SIZE));
    this.derivedIv = Buffer.from(sessionKey.subarray(KEY_SIZE, KEY_SIZE + BLOCK_SIZE));
    this.folded = false;
    this._initialize();
  }

  get maxOverhead() {
    return MAX_OVERHEAD;
  }

  get requiresKeyFoldIn() {
    return this.modernEncryption || this.modernIntegrity;
  }

  _initialize() {
    // The modern negotiation uses 120 bits of the shared secret for checksum
    // generation and derives independent initialization material from its tail.
    this.encryptionIv = this.modernEncryption ? this.derivedIv : ZERO_IV;
    this.checksumKeyMarkerOffset = this.modernIntegrity ? 15 : 5;
    this.generationKey = Buffer.alloc(BLOCK_SIZE);
    this.sessionKey.copy(this.generationKey, 0, 0, this.checksumKeyMarkerOffset);
    this.generationKey[this.checksumKeyMarkerOffset] = 0xff;
    this.generationIv = this.modernIntegrity ? this.derivedIv : this.legacyIv;
    this.generationBuffer = Buffer.alloc(2 * BLOCK_SIZE);
    this.sendChecksum = { suffix: Buffer.alloc(CHECKSUM_SIZE) };
    this.receiveChecksum = { suffix: Buffer.alloc(CHECKSUM_SIZE) };
    this.reset();
  }

  foldIn(authKey) {
    if (!this.requiresKeyFoldIn) {
      return;
    }
    if (this.folded || !Buffer.isBuffer(authKey) || authKey.length < BLOCK_SIZE) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    for (let i = 0; i < Math.min(authKey.length, this.sessionKey.length); i++) {
      this.sessionKey[i] ^= authKey[i];
    }
    for (let i = 0; i < this.derivedIv.length; i++) {
      this.derivedIv[i] ^= authKey[i];
    }
    this._initialize();
    this.folded = true;
  }

  reset() {
    this.generationBuffer = encryptBlocks('aes-128-cbc', this.generationKey,
      this.generationIv, this.generationBuffer);
    this.generationKey = this.generationBuffer.subarray(0, BLOCK_SIZE);
    this.generationIv = this.generationBuffer.subarray(BLOCK_SIZE);
    this.sendChecksum.key = Buffer.from(this.generationKey);
    this.sendChecksum.key[this.checksumKeyMarkerOffset] = 90;
    this.sendChecksum.iv = this.generationIv;
    this.receiveChecksum.key = Buffer.from(this.generationKey);
    this.receiveChecksum.key[this.checksumKeyMarkerOffset] = 180;
    this.receiveChecksum.iv = this.generationIv;
  }

  protect(payload) {
    const digest = checksum(payload, this.sendChecksum);
    const unpaddedLength = payload.length + CHECKSUM_SIZE;
    const padding = (BLOCK_SIZE - unpaddedLength % BLOCK_SIZE) % BLOCK_SIZE;
    const plaintext = Buffer.concat([payload, digest, Buffer.alloc(padding)]);
    const ciphertext = encryptBlocks('aes-256-cbc', this.sessionKey, this.encryptionIv, plaintext);
    // The padding length plus one and key fold-in flag are outside the ciphertext.
    return Buffer.concat([ciphertext, Buffer.from([padding + 1, this.folded ? 1 : 0])]);
  }

  unprotect(payload) {
    const ciphertextLength = payload.length - PACKET_TRAILER_SIZE;
    const padding = payload[ciphertextLength] - 1;
    const foldFlag = payload[payload.length - 1];
    if (ciphertextLength < CHECKSUM_SIZE || ciphertextLength % BLOCK_SIZE !== 0 ||
        !(padding >= 0 && padding < BLOCK_SIZE) || ciphertextLength - padding < CHECKSUM_SIZE ||
        (foldFlag !== 0 && (foldFlag !== 1 || !this.folded))) {
      errors.throwErr(errors.ERR_INVALID_PACKET, 'invalid native network encryption payload');
    }
    // Once folded, always use the folded keys regardless of the peer's flag.
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.sessionKey, this.encryptionIv);
    decipher.setAutoPadding(false);
    const plaintext = Buffer.concat([
      decipher.update(payload.subarray(0, ciphertextLength)), decipher.final(),
    ]);
    const checksumOffset = ciphertextLength - padding - CHECKSUM_SIZE;
    const data = plaintext.subarray(0, checksumOffset);
    const digest = checksum(data, this.receiveChecksum);
    if (!crypto.timingSafeEqual(digest, plaintext.subarray(checksumOffset, checksumOffset + CHECKSUM_SIZE))) {
      errors.throwErr(errors.ERR_INVALID_PACKET, 'invalid native network encryption payload');
    }
    return data;
  }
}

module.exports = { NneProtection };

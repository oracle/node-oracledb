// Copyright (c) 2026, Oracle and/or its affiliates.

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

class ObfuscatedValue {

  constructor(value, options = {}) {
    this._valueBuffer = null;
    this._maskBuffer = null;
    this._defaultReturnBuffer =
      options.returnBuffer ??
      (value !== undefined && value !== null && Buffer.isBuffer(value));
    if (value !== undefined && value !== null) {
      this.set(value, options);
    }
  }

  set(value, options = {}) {
    if (value === undefined || value === null) {
      this.clear();
      return;
    }
    const returnBuffer = options.returnBuffer ??
      (Buffer.isBuffer(value) || this._defaultReturnBuffer === true);
    const source = Buffer.isBuffer(value)
      ? Buffer.from(value)
      : Buffer.from(String(value));
    const mask = crypto.randomBytes(source.length);
    for (let i = 0; i < source.length; i++) {
      source[i] = source[i] ^ mask[i];
    }
    this.clear();
    this._valueBuffer = source;
    this._maskBuffer = mask;
    this._defaultReturnBuffer = returnBuffer;
  }

  get(options = {}) {
    if (!this._valueBuffer || !this._maskBuffer) {
      return null;
    }
    const returnBuffer = options.returnBuffer ??
      (this._defaultReturnBuffer === true);
    const result = Buffer.allocUnsafe(this._valueBuffer.length);
    for (let i = 0; i < this._valueBuffer.length; i++) {
      result[i] = this._valueBuffer[i] ^ this._maskBuffer[i];
    }
    if (returnBuffer) {
      return result;
    }
    const text = result.toString();
    result.fill(0);
    return text;
  }

  clear() {
    if (this._valueBuffer) {
      this._valueBuffer.fill(0);
      this._valueBuffer = null;
    }
    if (this._maskBuffer) {
      this._maskBuffer.fill(0);
      this._maskBuffer = null;
    }
  }
}

module.exports = {
  ObfuscatedValue
};

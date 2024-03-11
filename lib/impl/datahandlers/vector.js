// Copyright (c) 2024, Oracle and/or its affiliates.

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

const { BaseBuffer, GrowableBuffer } = require('./buffer.js');
const { Buffer } = require('buffer');
const constants = require("./constants.js");
const errors = require("../../errors.js");

/**
 * Class used for decoding
 */
class VectorDecoder extends BaseBuffer {

  //---------------------------------------------------------------------------
  // decode()
  //
  // Decodes the VECTOR image and returns a JavaScript array corresponding to
  // its contents.
  //---------------------------------------------------------------------------
  decode() {

    // parse header
    const magicByte = this.readUInt8();
    if (magicByte != constants.TNS_VECTOR_MAGIC_BYTE)
      errors.throwErr(errors.ERR_UNEXPECTED_DATA,
        Buffer.from([magicByte]).toString('hex'));
    const version = this.readUInt8();
    if (version != constants.TNS_VECTOR_VERSION)
      errors.throwErr(errors.ERR_VECTOR_VERSION_NOT_SUPPORTED, version);
    const flags = this.readUInt16BE();
    const vectorFormat = this.readUInt8();
    let numElements;
    if (flags & constants.TNS_VECTOR_FLAG_DIM_UINT8) {
      numElements = this.readUInt8();
    } else if (flags & constants.TNS_VECTOR_FLAG_DIM_UINT32) {
      numElements = this.readUInt32BE();
    } else {
      numElements = this.readUInt16BE();
    }
    let elementSize, result;
    if (vectorFormat === constants.VECTOR_FORMAT_FLOAT32) {
      elementSize = 4;
      result = new Float32Array(numElements);
    } else if (vectorFormat === constants.VECTOR_FORMAT_FLOAT64) {
      elementSize = 8;
      result = new Float64Array(numElements);
    } else if (vectorFormat === constants.VECTOR_FORMAT_INT8) {
      elementSize = 1;
      result = new Int8Array(numElements);
    } else {
      errors.throwErr(errors.ERR_VECTOR_FORMAT_NOT_SUPPORTED, vectorFormat);
    }
    if (flags & constants.TNS_VECTOR_FLAG_NORM)
      this.skipBytes(8);

    // parse data
    for (let i = 0; i < numElements; i++) {
      const buf = this.readBytes(elementSize);
      if (vectorFormat === constants.VECTOR_FORMAT_FLOAT32) {
        result[i] = this.parseBinaryFloat(buf);
      } else if (vectorFormat === constants.VECTOR_FORMAT_FLOAT64)  {
        result[i] = this.parseBinaryDouble(buf);
      } else {
        result[i] = buf[0];
      }
    }

    return result;
  }

}

class VectorEncoder extends GrowableBuffer {

  //---------------------------------------------------------------------------
  // encode()
  //
  // Encodes the value as OSON and returns a buffer containing the OSON bytes.
  //---------------------------------------------------------------------------
  encode(value) {

    // determine some basic information about the vector
    let vectorFormat = constants.VECTOR_FORMAT_FLOAT32;
    let writeFn = this.writeBinaryFloat.bind(this);

    if (Array.isArray(value) || value instanceof Float64Array) {
      vectorFormat = constants.VECTOR_FORMAT_FLOAT64;
      writeFn = this.writeBinaryDouble.bind(this);
    } else if (value instanceof Int8Array) {
      vectorFormat = constants.VECTOR_FORMAT_INT8;
      writeFn = this.writeSB1.bind(this);
    }

    // Let server generate the norm (TNS_VECTOR_FLAG_NORMSRC)
    let flags = constants.TNS_VECTOR_FLAG_NORM
      | constants.TNS_VECTOR_FLAG_NORMSRC;
    const numElements = value.length;
    if (numElements < 256) {
      flags |= constants.TNS_VECTOR_FLAG_DIM_UINT8;
    } else if (numElements > 65535) {
      flags |= constants.TNS_VECTOR_FLAG_DIM_UINT32;
    }

    // write header
    this.writeUInt8(constants.TNS_VECTOR_MAGIC_BYTE);
    this.writeUInt8(constants.TNS_VECTOR_VERSION);
    this.writeUInt16BE(flags);
    this.writeUInt8(vectorFormat);
    if (numElements < 256) {
      this.writeUInt8(numElements);
    } else if (numElements < 65536) {
      this.writeUInt16BE(numElements);
    } else {
      this.writeUInt32BE(numElements);
    }
    this.reserveBytes(8);

    // write data
    value.forEach((element) => {
      writeFn(element);
    });

    return this.buf.subarray(0, this.pos);
  }

}

module.exports = {
  VectorDecoder,
  VectorEncoder
};

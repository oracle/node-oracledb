// Copyright (c) 2025, 2026, Oracle and/or its affiliates.

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

"use strict";

const Message = require("./base.js");
const constants = require("../constants.js");
const errors = require("../../../errors.js");
const { Buffer } = require("buffer");
const types = require("../../../types.js");
const { BaseBuffer } = require("../../../impl/datahandlers/buffer.js");
const vector = require("../../../impl/datahandlers/vector.js");
const oson = require("../../../impl/datahandlers/oson.js");
const transformer = require("../../../transformer.js");

class DirectPathPiece {
  constructor() {
    this.isFast = false;
    this.isFirst = false;
    this.isLast = false;
    this.isSplitWithPrev = false;
    this.isSplitWithNext = false;
    this.flags = 0;
    this.numSegments = 0;
    this.length = 0;
    this.data = null;
  }

  finalize(buf) {
    this.length = buf.pos;
    this.data = Buffer.from(buf.buf.slice(0, buf.pos));
    buf.pos = 0;
    if (this.isFirst) {
      this.flags |= constants.TNS_DPLS_ROW_HEADER_FIRST;
    } else if (this.isSplitWithPrev) {
      this.flags |= constants.TNS_DPLS_ROW_HEADER_SPLIT_WITH_PREV;
    }
    if (this.isLast) {
      this.flags |= constants.TNS_DPLS_ROW_HEADER_LAST;
    } else if (this.isSplitWithNext) {
      this.flags |= constants.TNS_DPLS_ROW_HEADER_SPLIT_WITH_NEXT;
    }
    if (this.isFastRow()) {
      this.flags |= constants.TNS_DPLS_ROW_HEADER_FAST_ROW;
      this.flags |= constants.TNS_DPLS_ROW_HEADER_FAST_PIECE;
    }
  }

  headerLength() {
    let length = 2;
    if (this.isFastRow()) {
      length += 2;
    }
    return length;
  }

  isFastRow() {
    return this.isFirst && this.isLast && this.isFast;
  }

  writeToMessage(buf) {
    buf.writeUInt8(this.flags);
    if (this.isFastRow()) {
      buf.writeUInt16BE(this.length + this.headerLength());
    }
    buf.writeUInt8(this.numSegments);
    buf.writeBytes(this.data);
  }
}

class PieceBuffer extends BaseBuffer {
  constructor(connection) {
    super(Buffer.alloc(constants.TNS_DPLS_MAX_PIECE_SIZE));
    this.connection = connection;
    this.currentPiece = null;
    this.totalPieceLength = 0;
    this.pieces = [];
    this._encodingTempBuf = new BaseBuffer(
      Buffer.alloc(constants.TNS_DPLS_MAX_BUFFER_SIZE_FACTOR)
    );
  }

  _writeMoreData() {
    this._finalizePiece();
    this.currentPiece = new DirectPathPiece();
  }

  _finalizePiece() {
    this.currentPiece.finalize(this);
    this.pieces.push(this.currentPiece);
    const newLength =
      this.totalPieceLength +
      this.currentPiece.length +
      this.currentPiece.headerLength();
    if (newLength > constants.TNS_DPLS_MAX_MESSAGE_SIZE)
      errors.throwErr(errors.ERR_DPL_TOO_MUCH_DATA);
    this.totalPieceLength = newLength;
  }

  // Overloads the already existing function in BaseBuffer for DPL specs
  // This also handles writing length of the encoding done in addColumnValue().
  _writeRawBytesAndLength(value, numBytes) {
    let bytesLeft = this.maxSize - this.pos;
    if (numBytes <= constants.TNS_DPLS_MAX_SHORT_LENGTH) {
      if (numBytes + 1 > bytesLeft) {
        this._finalizePiece();
        this.currentPiece = new DirectPathPiece();
      }
      this.writeUInt8(numBytes);
      if (numBytes > 0) {
        this.writeBytes(value);
      }
      this.currentPiece.numSegments += 1;
    } else {
      let startPos = 0;
      while (numBytes + 3 > bytesLeft) {
        const bytesToWrite = bytesLeft - 3;
        this.writeUInt8(constants.TNS_LONG_LENGTH_INDICATOR);
        this.writeUInt16BE(bytesToWrite);
        this.writeBytes(value.subarray(startPos, startPos + bytesToWrite));
        startPos += bytesToWrite;
        numBytes -= bytesToWrite;
        bytesLeft = this.maxSize;
        this.currentPiece.isSplitWithNext = true;
        this.currentPiece.numSegments += 1;
        this._finalizePiece();
        this.currentPiece = new DirectPathPiece();
        this.currentPiece.isSplitWithPrev = numBytes > 0;
      }
      if (numBytes > 0) {
        this.currentPiece.numSegments += 1;
        this.writeUInt8(constants.TNS_LONG_LENGTH_INDICATOR);
        this.writeUInt16BE(numBytes);
        this.writeBytes(value.subarray(startPos));
      }
    }
  }

  addColumnValue(metadata, value, caps) {
    if (this.currentPiece.numSegments === 255) {
      this._finalizePiece();
      this.currentPiece = new DirectPathPiece();
    }

    if (!metadata.type.isFast) {
      this.currentPiece.isFast = false;
    }

    if (value === null) {
      if (!metadata.fetchInfo.nullable)
        errors.throwErr(
          errors.ERR_NULLS_NOT_ALLOWED,
          metadata.fetchInfo.dbColumnName,
          metadata.rowNum
        );
      this.writeUInt8(constants.TNS_NULL_LENGTH_INDICATOR);
      this.currentPiece.numSegments += 1;
      return;
    }

    // Reset the temporary encoding buffer for each column, as it's reused
    this._encodingTempBuf.pos = 0;

    const oraType = metadata.type;
    let columnDataBuffer;

    value = transformer.transformValueIn(
      {
        type: oraType,
        maxSize: metadata.maxSize,
        checkSize: true,
      },
      value,
      {
        allowArray: false,
        pos: metadata.rowNum + 1,
      }
    );

    // TODO use oraTypeNum similar to python for simple int check.
    // Writing only the encoding (data bytes) on buffers for column values
    if (
      [
        types.DB_TYPE_CHAR,
        types.DB_TYPE_VARCHAR,
        types.DB_TYPE_NCHAR,
        types.DB_TYPE_NVARCHAR,
        types.DB_TYPE_LONG,
        types.DB_TYPE_LONG_NVARCHAR,
      ].includes(oraType)
    ) {
      // Encode the data bytes directly after checking charset for strings
      if (oraType._csfrm === constants.CSFRM_NCHAR) {
        caps.checkNCharsetId();
        columnDataBuffer = Buffer.from(
          value,
          constants.TNS_ENCODING_UTF16
        ).swap16();
      } else {
        caps.checkCharsetId();
        columnDataBuffer = Buffer.from(value);
      }
    } else if (
      [
        types.DB_TYPE_RAW,
        types.DB_TYPE_LONG_RAW
      ].includes(oraType)
    ) {
      // Encode the data bytes directly for raw/long types
      columnDataBuffer = Buffer.from(value);
      // Encode the data bytes into a temporary buffer for Oracle types
    } else if (oraType === types.DB_TYPE_NUMBER) {
      this._encodingTempBuf.writeOracleNumber(value.toString(), false);
    } else if (oraType === types.DB_TYPE_BINARY_DOUBLE) {
      this._encodingTempBuf.writeBinaryDouble(value);
    } else if (oraType === types.DB_TYPE_BINARY_FLOAT) {
      this._encodingTempBuf.writeBinaryFloat(value);
    } else if (
      [
        types.DB_TYPE_DATE,
        types.DB_TYPE_TIMESTAMP,
        types.DB_TYPE_TIMESTAMP_LTZ,
        types.DB_TYPE_TIMESTAMP_TZ,
      ].includes(oraType)
    ) {
      this._encodingTempBuf.writeOracleDate(value, oraType, false);
    } else if (oraType === types.DB_TYPE_INTERVAL_DS) {
      this._encodingTempBuf.writeOracleIntervalDS(value, false);
    } else if (oraType === types.DB_TYPE_INTERVAL_YM) {
      this._encodingTempBuf.writeOracleIntervalYM(value, false);
    } else if (oraType === types.DB_TYPE_BOOLEAN) {
      // Needs clarity as normal boolean encoding causes corruption
      if (value) {
        this._encodingTempBuf.writeUInt8(0x01);
      } else {
        this._encodingTempBuf.writeUInt8(0x00);
      }
    } else if (oraType === types.DB_TYPE_JSON) {
      const encoder = new oson.OsonEncoder();
      columnDataBuffer = encoder.encode(
        value,
        this.connection._osonMaxFieldSize
      );
    } else if (oraType === types.DB_TYPE_VECTOR) {
      const encoder = new vector.VectorEncoder();
      columnDataBuffer = encoder.encode(value);
    } else {
      errors.throwErr(
        errors.ERR_UNSUPPORTED_DATA_TYPE,
        oraType.oraTypeNum,
        metadata.columnNum
      );
    }

    // If the type was an Oracle Type we had written the data on a temporary
    // BaseBuffer, so we copy the data to our temporaryBuffer
    if (!columnDataBuffer)
      columnDataBuffer = this._encodingTempBuf.buf.slice(
        0,
        this._encodingTempBuf.pos
      );

    this._writeRawBytesAndLength(columnDataBuffer, columnDataBuffer.length);
  }

  finishRow() {
    this.currentPiece.isLast = true;
    this._finalizePiece();
    this.currentPiece = null;
  }

  startRow() {
    this.currentPiece = new DirectPathPiece();
    this.currentPiece.isFirst = true;
    this.currentPiece.isFast = true;
  }
}

class DirectPathLoadStreamMessage extends Message {
  constructor(connection) {
    super(connection);
    this.caps = connection._protocol.caps;
    this.totalPieceLength = 0;
    this.cursorId = 0;
    this.rowPieces = [];
    this.functionCode = constants.TNS_FUNC_DIRECT_PATH_LOAD_STREAM;
  }

  _calculatePieces(data, columnMetadata) {
    // Probably better to maintain a MAX_BUFFER_SIZE_FACTOR in types.js
    const numRows = data.length;
    const buf = new PieceBuffer(this.connection);

    for (let rowNum = 0; rowNum < numRows; rowNum++) {
      const row = data[rowNum];
      if (row.length !== columnMetadata.length) {
        errors.throwErr(
          errors.ERR_WRONG_NUMBER_OF_BINDS,
          columnMetadata.length,
          row.length
        );
      }
      buf.startRow();
      for (let colNum = 0; colNum < columnMetadata.length; colNum++) {
        const metadata = columnMetadata[colNum];
        metadata.rowNum = rowNum;
        const value = row[colNum];
        buf.addColumnValue(metadata, value, this.caps);
      }
      buf.finishRow();
    }

    this.totalPieceLength = buf.totalPieceLength;
    this.rowPieces = buf.pieces;
  }

  processErrorInfo(buf) {
    super.processErrorInfo(buf);
    if (this.errorInfo.num === constants.TNS_ERR_NO_DATA_FOUND) {
      this.errorInfo.num = 0;
      this.errorOccurred = false;
    }
  }

  processReturnParameter(buf) {
    const numOutValues = buf.readUB2();
    for (let i = 0; i < numOutValues; i++) {
      buf.skipBytes(4);
    }
  }

  encode(buf) {
    this.writeFunctionHeader(buf);
    buf.writeUB2(this.cursorId);
    buf.writeUInt8(1); // pointer (buffer)
    buf.writeUB4(this.totalPieceLength);
    buf.writeUB4(constants.TNS_DP_STREAM_VERSION);
    buf.writeUInt8(0); // pointer (input values)
    buf.writeUB4(0); // number of input values
    buf.writeUInt8(1); // pointer (output values)
    buf.writeUInt8(1); // pointer (output values length)

    for (const piece of this.rowPieces) {
      piece.writeToMessage(buf);
    }
  }

  prepare(cursorId, data, columnMetadata) {
    this.cursorId = cursorId;
    this._calculatePieces(data, columnMetadata);
  }
}

module.exports = DirectPathLoadStreamMessage;

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
const LobImpl = require('../impl/lob.js');
const constants = require('./protocol/constants.js');
const LobOpMessage = require('./protocol/messages/lobOp.js');
const errors = require('../errors.js');

class ThinLobImpl extends LobImpl {

  //---------------------------------------------------------------------------
  // _getConnImpl()
  //
  // Common method on all classes that make use of a connection -- used to
  // ensure serialization of all use of the connection.
  //---------------------------------------------------------------------------
  _getConnImpl() {
    return this.conn;
  }

  //---------------------------------------------------------------------------
  // _sendMessage()
  //
  // Sends a LOB operation message to the server and processes the response.
  //---------------------------------------------------------------------------
  async _sendMessage(options) {
    const message = new LobOpMessage(this.conn, options);
    await this.conn._protocol._processMessage(message);
    if (options.operation === constants.TNS_LOB_OP_READ) {
      return (message.data) ? message.data : null;
    } else {
      return message.amount;
    }
  }

  getChunkSize() {
    return this._chunkSize;
  }

  async _getChunkSizeAsync() {
    this.checkConn();
    const options = {
      operation: constants.TNS_LOB_OP_GET_CHUNK_SIZE,
      sourceLobImpl: this,
      sendAmount: true
    };
    this._chunkSize = this._pieceSize = await this._sendMessage(options);
  }

  getLength() {
    return this._length;
  }

  getPieceSize() {
    return this._pieceSize;
  }

  setPieceSize(value) {
    this._pieceSize = value;
  }

  getType() {
    return this.dbType;
  }

  async getData() {
    if (this._length < 0) {
      errors.throwErr(errors.ERR_INVALID_LOB);
    }
    return await this.read(1, this._length);
  }

  async read(offset, length) {
    this.checkConn();
    const options = {
      operation: constants.TNS_LOB_OP_READ,
      sourceLobImpl: this,
      sourceOffset: offset,
      sendAmount: true,
      amount: length || this._pieceSize
    };
    return await this._sendMessage(options);
  }

  async write(offset, data) {
    this.checkConn();
    const options = {
      operation: constants.TNS_LOB_OP_WRITE,
      sourceLobImpl: this,
      sourceOffset: offset,
      data: data
    };
    await this._sendMessage(options);
    this._length += data.length;
  }

  getCsfrm() {
    if (this.dbType._csfrm !== constants.TNS_CS_NCHAR) {
      if (this._locator[constants.TNS_LOB_LOC_OFFSET_FLAG_3] &
          constants.TNS_LOB_LOC_FLAGS_VAR_LENGTH_CHARSET) {
        return constants.TNS_CS_NCHAR;
      }
    }
    return this.dbType._csfrm;
  }

  /**
   * Creates a temporary LOB.
   *
   * @param {object} conn Connection Impl object
   * @param {number} dbType indicates BLOB/CLOB DB type
   */
  async create(conn, dbType) {
    this.dirtyLength = false;
    this.conn = conn;
    this.dbType = dbType;
    this._locator = Buffer.alloc(40);
    this._isTempLob = true;
    this._length = 0;
    const options = {
      operation: constants.TNS_LOB_OP_CREATE_TEMP,
      sourceLobImpl: this,
      amount: constants.TNS_DURATION_SESSION,
      destOffset: dbType._oraTypeNum,
      sourceOffset: dbType._csfrm,
      sendAmount: true
    };
    await this._sendMessage(options);
    await this._getChunkSizeAsync();
  }

  checkConn() {
    if (!this.conn.nscon.connected)
      errors.throwErr(errors.ERR_LOB_CLOSED);
  }

  close() {
    this.checkConn();
    if (this._isTempLob) {
      // Add to freelist which will be sent in piggyback fashion
      this.conn._tempLobsToClose.push(this._locator);
      this.conn._tempLobsTotalSize += this._locator.length;
    }
  }

  init(conn, locator, dbType, len, chunkSize) {
    this.dirtyLength = false;
    this.conn = conn;
    this._locator = locator;
    this._isTempLob = false;
    if (this._locator[constants.TNS_LOB_LOC_OFFSET_FLAG_4] & constants.TNS_LOB_LOC_FLAGS_TEMP === constants.TNS_LOB_LOC_FLAGS_TEMP
      || this._locator[constants.TNS_LOB_LOC_OFFSET_FLAG_1] & constants.TNS_LOB_LOC_FLAGS_ABSTRACT === constants.TNS_LOB_LOC_FLAGS_ABSTRACT) {
      this._isTempLob = true;
    }
    this.dbType = dbType;
    this._length = len;
    this._chunkSize = chunkSize;
    this._pieceSize = chunkSize;
  }

}

module.exports = ThinLobImpl;

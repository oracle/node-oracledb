// Copyright (c) 2016, 2022, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// You may not use the identified files except in compliance with the Apache
// License, Version 2.0 (the "License.")
//
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0.
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const { Duplex } = require('stream');
const nodbUtil = require('./util.js');

//-----------------------------------------------------------------------------
// close()
//   Close the LOB and make it unusable for further operations. If the LOB is
// already closed, nothing is done in order to support multiple close() calls.
//
//   This method is deprecated and will be removed in a future version of the
// node-oracledb driver. Use lob.destroy() instead. NOTE: this method will
// emit a duplicate "close" event in order to be compatible with previous
// versions of node-oracledb.
//-----------------------------------------------------------------------------
async function close() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  if (this.valid) {
    try {
      await this._close();
      this.emit('close');
    } catch (err) {
      this.destroy(err);
    }
  }
}


//-----------------------------------------------------------------------------
// getData()
//   Returns all of the data in the LOB as a single string or buffer.
//-----------------------------------------------------------------------------
async function getData() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  return await this._getData();
}


class Lob extends Duplex {

  constructor() {
    super({ decodeStrings: false });
    this.offset = 1;
    this._isActive = false;
    this.once('finish', function() {
      if (this._autoCloseLob) {
        this.destroy();
      }
    });
  }

  _extend(oracledb) {
    this._oracledb = oracledb;
    this.close = nodbUtil.callbackify(nodbUtil.preventConcurrent(nodbUtil.serialize(close), 'NJS-023'));
    this.getData = nodbUtil.callbackify(nodbUtil.preventConcurrent(nodbUtil.serialize(getData), 'NJS-023'));
    this._serializedRead = nodbUtil.serialize(this.__read);
    this._serializedWrite = nodbUtil.serialize(this.__write);
  }

  // called by stream.destroy() and ensures that the LOB is closed if it has
  // not already been closed (never called directly)
  async _destroy(err, cb) {
    if (this.valid) {
      try {
        await this._close();
      } catch (closeErr) {
        cb(closeErr);
        return;
      }
    }
    cb(err);
  }

  // return the connection associated with the LOB (used for serializing
  // accesses to the connection)
  _getConnection() {
    let connection = this._parentObj;
    while (!(connection instanceof this._oracledb.Connection))
      connection = connection._parentObj;
    return connection;
  }

  // implementation of streaming read; if lob is set to auto-close, the lob is
  // automatically closed within the C code when an error occurs or when there
  // are no more bytes to transfer; all that needs to be done in the JS layer
  // is to destroy the streaming LOB
  async _read() {
    try {
      const data = await this._serializedRead(this.offset);
      if (data) {
        this.offset += data.length;
        this.push(data);
      } else {
        this.push(null);
        if (this._autoCloseLob) {
          this.destroy();
        }
      }
    } catch (err) {
      this.destroy(err);
    }
  }

  // implementation of streaming write; if lob is set to auto-close, the lob is
  // automatically closed in the "finish" event; all that needs to be done here
  // is to destroy the streaming LOB
  async _write(data, encoding, cb) {

    // convert data if needed
    if (this.type == this._oracledb.DB_TYPE_BLOB && !Buffer.isBuffer(data)) {
      data = Buffer.from(data);
    } else if (this.type == this._oracledb.DB_TYPE_CLOB &&
        Buffer.isBuffer(data)) {
      data = data.toString();
    }

    try {
      await this._serializedWrite(this.offset, data);
    } catch (err) {
      cb(err);
      this.destroy(err);
      return;
    }
    this.offset += data.length;
    cb(null);

  }

}

module.exports = Lob;

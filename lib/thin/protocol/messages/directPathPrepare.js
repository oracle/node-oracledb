// Copyright (c) 2025, Oracle and/or its affiliates.

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

const BaseMessage = require('./base.js');
const constants = require('../constants.js');
const errors = require('../../../errors.js');
const types = require('../../../types.js');

class DirectPathPrepareMessage extends BaseMessage {

  constructor(connection) {
    super(connection);
    this.schemaName = null;
    this.tableName = null;
    this.columnNames = [];
    this.columnMetadata = [];
    this.cursorId = 0;
    this.inValues = new Array(constants.TNS_DPP_IN_MAX_PARAMS).fill(0);
    this.inValuesLength = 0;
    this.outValues = null;
    this.outValuesLength = 0;
    this.functionCode = constants.TNS_FUNC_DIRECT_PATH_PREPARE;
  }

  //---------------------------------------------------------------------------
  // _setInValue()
  //   Sets the value in the input array and updates the maximum value set.
  //---------------------------------------------------------------------------
  _setInValue(key, value) {
    this.inValues[key] = value;
    this.inValuesLength = Math.max(this.inValuesLength, key + 1);
  }

  //---------------------------------------------------------------------------
  // _writeKeywordParam()
  //   Writes a keyword parameter to the buffer.
  //---------------------------------------------------------------------------
  _writeKeywordParam(buf, index, value) {
    const valueBytes = Buffer.from(value, 'utf-8');
    buf.writeUB2(0); // text length (placeholder?)
    buf.writeUB2(valueBytes.length);
    buf.writeBytesWithLength(valueBytes);
    buf.writeUB2(index);
  }

  //---------------------------------------------------------------------------
  // write()
  //   Write the message to the given buffer.
  //---------------------------------------------------------------------------
  encode(buf) {
    // Initialize input array
    this._setInValue(constants.TNS_DPP_IN_INDEX_INTERFACE_VERSION, constants.TNS_DP_INTERFACE_VERSION);
    this._setInValue(constants.TNS_DPP_IN_INDEX_STREAM_VERSION, constants.TNS_DP_STREAM_VERSION);
    this._setInValue(constants.TNS_DPP_IN_INDEX_LOCK_WAIT, 1);
    this._setInValue(constants.TNS_DPP_KW_INDEX_NFOBJ_OID_POS, 0xffff);
    this._setInValue(constants.TNS_DPP_KW_INDEX_NFOBJ_SID_POS, 0xffff);
    this._setInValue(constants.TNS_DPP_KW_INDEX_NFOBJ_VARRAY_INDEX, 0xffff);

    // Write message
    this.writeFunctionHeader(buf);
    const keywordParametersLength = this.columnNames.length + 2;
    buf.writeUB4(constants.TNS_DPP_OP_CODE_LOAD); // op code
    buf.writeUInt8(1); // keyword parameters (pointer)
    buf.writeUB4(keywordParametersLength);
    buf.writeUInt8(1); // input array (pointer)
    buf.writeUB2(this.inValuesLength);
    buf.writeUInt8(1); // metadata (pointer)
    buf.writeUInt8(1); // metadata length (pointer)
    buf.writeUInt8(1); // parameters (pointer)
    buf.writeUInt8(1); // parameters length (pointer)
    buf.writeUInt8(1); // output array (pointer)
    buf.writeUInt8(1); // output array length (pointer)

    this._writeKeywordParam(buf, constants.TNS_DPP_KW_INDEX_SCHEMA_NAME, this.schemaName);
    this._writeKeywordParam(buf, constants.TNS_DPP_KW_INDEX_OBJECT_NAME, this.tableName);
    for (const name of this.columnNames) {
      this._writeKeywordParam(buf, constants.TNS_DPP_KW_INDEX_COLUMN_NAME, name);
    }

    for (let i = 0; i < this.inValuesLength; i++) {
      buf.writeUB4(this.inValues[i]);
    }
  }

  //---------------------------------------------------------------------------
  // processColumnInfo()
  //   Process column metadata returned by the database. CLOB and BLOB are
  //   always treated as strings and bytes when using direct path load.
  //---------------------------------------------------------------------------
  processColumnInfo(buf, columnNum) {
    const metadata = super.processColumnInfo(buf, columnNum);
    if (metadata.type === types.DB_TYPE_CLOB) {
      let csfrm = metadata.type._csfrm;
      if (csfrm === constants.CSFRM_IMPLICIT) {
        const caps = this.connection._protocol.caps;
        // character set ids < 800 are all single-byte character sets
        // while character set ids >= 800 are all multi-byte character sets
        if (caps.charsetId >= 800)
          csfrm = constants.CSFRM_NCHAR;
      }
      metadata.type = types.getTypeByOraTypeNum(types.DB_TYPE_LONG._oraTypeNum,
        csfrm);
    } else if (metadata.type === types.DB_TYPE_BLOB) {
      metadata.type = types.DB_TYPE_LONG_RAW;
    }
    return metadata;
  }

  //---------------------------------------------------------------------------
  // processReturnParameter()
  //   Process the return parameters sent by the database.
  //---------------------------------------------------------------------------
  processReturnParameter(buf) {
    const numColumns = buf.readUB4();
    this.columnMetadata = [];
    for (let i = 0; i < numColumns; i++) {
      this.columnMetadata.push(this.processColumnInfo(buf, i));
    }
    const numParams = buf.readUB2();
    if (numParams > 0) {
      errors.throwErr(errors.ERR_UNEXPECTED_DATA, 'directPathLoad numParams');
    }
    this.outValuesLength = buf.readUB2();
    this.outValues = [];
    for (let i = 0; i < this.outValuesLength; i++) {
      this.outValues.push(buf.readUB4());
    }
    this.cursorId = this.outValues[constants.TNS_DPP_OUT_INDEX_CURSOR];
  }

}

module.exports = DirectPathPrepareMessage;

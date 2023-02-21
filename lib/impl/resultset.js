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

const constants = require('../constants.js');
const errors = require('../errors.js');
const nodbUtil = require('../util.js');
const settings = require('../settings.js');

// define implementation class
class ResultSetImpl {

  //---------------------------------------------------------------------------
  // _determineFetchType()
  //
  // Determine the fetch type to use for the specified metadata.
  //---------------------------------------------------------------------------
  _determineFetchType(metadata, options) {
    if (options.fetchTypeMap && options.fetchTypeMap.has(metadata.name)) {
      metadata.fetchType = options.fetchTypeMap.get(metadata.name);
      if (metadata.fetchType === constants.DEFAULT) {
        metadata.fetchType =
          constants.DB_TYPE_FETCH_TYPE_MAP.get(metadata.dbType);
      } else if (metadata.fetchType === constants.DB_TYPE_VARCHAR &&
          metadata.dbType === constants.DB_TYPE_CLOB) {
        metadata.fetchType = constants.DB_TYPE_LONG;
      } else if (metadata.fetchType === constants.DB_TYPE_VARCHAR &&
          metadata.dbType === constants.DB_TYPE_NCLOB) {
        metadata.fetchType = constants.DB_TYPE_LONG_NVARCHAR;
      } else if (metadata.fetchType === constants.DB_TYPE_RAW &&
          metadata.dbType === constants.DB_TYPE_BLOB) {
        metadata.fetchType = constants.DB_TYPE_LONG_RAW;
      }
    } else {
      metadata.fetchType = settings.fetchTypeMap.get(metadata.dbType);
    }
  }

  //---------------------------------------------------------------------------
  // _getConnImpl()
  //
  // Common method on all classes that make use of a connection -- used to
  // ensure serialization of all use of the connection.
  //---------------------------------------------------------------------------
  _getConnImpl() {
    return this._parentObj;
  }

  //---------------------------------------------------------------------------
  // _setup()
  //
  // Setup a result set. The metadata is examined to to determine if any
  // columns need to be manipulated before being returned to the caller. If the
  // rows fetched from the result set are expected to be objects, a unique set
  // of attribute names are also determined.
  //---------------------------------------------------------------------------
  _setup(options, metaData) {
    this._parentObj = options.connection._impl;
    this.metaData = metaData;
    this.lobIndices = [];
    this.dbObjectIndices = [];
    this.nestedCursorIndices = [];
    this.outFormat = options.outFormat;
    this.fetchArraySize = options.fetchArraySize;
    this.dbObjectAsPojo = options.dbObjectAsPojo;
    this.maxRows = options.maxRows;
    const names = new Map();
    for (let i = 0; i < metaData.length; i++) {
      const name = metaData[i].name;
      if (!names.has(name)) {
        names.set(name, i);
      }
    }
    for (let i = 0; i < metaData.length; i++) {
      const info = metaData[i];
      this._determineFetchType(info, options);
      if (info.fetchType === constants.DB_TYPE_CURSOR) {
        this.nestedCursorIndices.push(i);
      } else if (info.fetchType === constants.DB_TYPE_CLOB ||
          info.fetchType === constants.DB_TYPE_NCLOB ||
          info.fetchType === constants.DB_TYPE_BLOB) {
        this.lobIndices.push(i);
      } else if (info.fetchType === constants.DB_TYPE_OBJECT) {
        const cls = options.connection._getDbObjectClass(info.dbTypeClass);
        info.dbTypeClass = cls;
        this.dbObjectIndices.push(i);
      }
      nodbUtil.addTypeProperties(info, "dbType");
      let name = info.name;
      if (names.get(name) !== i) {
        let seqNum = 0;
        while (names.has(name)) {
          seqNum = seqNum + 1;
          name = `${info.name}_${seqNum}`;
        }
        names.set(name, i);
        info.name = name;
      }
    }
  }

  //---------------------------------------------------------------------------
  // close()
  //
  // Closes the result set.
  //---------------------------------------------------------------------------
  close() {
    errors.throwNotImplemented("closing a result set");
  }

  //---------------------------------------------------------------------------
  // getRows()
  //
  // Returns rows from a result set.
  //---------------------------------------------------------------------------
  getRows() {
    errors.throwNotImplemented("getting rows");
  }

}

module.exports = ResultSetImpl;

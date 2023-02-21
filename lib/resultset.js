// Copyright (c) 2016, 2022, Oracle and/or its affiliates.

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

const QueryStream = require('./queryStream.js');
const BaseDbObject = require('./dbObject.js');
const nodbUtil = require('./util.js');
const constants = require('./constants.js');
const Lob = require('./lob.js');
const errors = require('./errors.js');

class ResultSet {

  constructor() {
    this._rowCache = [];
    this._processingStarted = false;
    this._convertedToStream = false;
    this._allowGetRowCall = false;
    this._isActive = false;
  }

  //---------------------------------------------------------------------------
  // _getAllRows()
  //
  // Return all of the rows in the result set.
  //---------------------------------------------------------------------------
  async _getAllRows() {

    try {

      // retain initial values of the maximum number of rows to fetch and the
      // number of rows to fetch from the database at a single time
      let maxRows = this._setupData.maxRows;
      let fetchArraySize = this._setupData.fetchArraySize;

      // fetch all rows
      let rowsFetched = [];
      while (true) {    // eslint-disable-line
        if (maxRows > 0 && fetchArraySize >= maxRows) {
          fetchArraySize = maxRows;
        }
        const rows = await this._impl.getRows(fetchArraySize);
        if (rows) {
          await this._processRows(rows, true);
          rowsFetched = rowsFetched.concat(rows);
        }
        if (rows.length == maxRows || rows.length < fetchArraySize) {
          break;
        }
        if (maxRows > 0) {
          maxRows -= rows.length;
        }
      }

      return rowsFetched;

    } finally {
      await this._impl.close();
      delete this._impl;
    }

  }

  //---------------------------------------------------------------------------
  // _processRows()
  //
  // Process rows returned by the implementation. This will transform result
  // set and LOB implementations into user facing objects. It will also perform
  // any fetched that are needed (if a result set is undesirable)
  //---------------------------------------------------------------------------
  async _processRows(rows, expandNestedCursors) {

    // transform any nested cursors into user facing objects
    for (let i = 0; i < this._setupData.nestedCursorSetupData.length; i++) {
      const setupData = this._setupData.nestedCursorSetupData[i];
      for (let j = 0; j < rows.length; j++) {
        const row = rows[j];
        const val = row[setupData.index];
        if (val) {
          const resultSet = new ResultSet();
          resultSet._setup(this._connection, val, this._setupData, setupData);
          const metaData = this._setupData.metaData[setupData.index];
          if (!metaData.metaData)
            metaData.metaData = setupData.metaData;
          if (expandNestedCursors) {
            row[setupData.index] = await resultSet._getAllRows();
          } else {
            row[setupData.index] = resultSet;
          }
        }
      }
    }

    // transform any LOBs into user facing objects
    for (const i of this._setupData.lobIndices) {
      for (let j = 0; j < rows.length; j++) {
        const val = rows[j][i];
        if (val) {
          const lob = rows[j][i] = new Lob();
          lob._setup(val, true);
        }
      }
    }

    // transform any database objects into user facing objects
    for (const i of this._setupData.dbObjectIndices) {
      const dbObjectClass = this._setupData.metaData[i].dbTypeClass;
      for (let j = 0; j < rows.length; j++) {
        const val = rows[j][i];
        if (val) {
          const obj = rows[j][i] = Object.create(dbObjectClass.prototype);
          obj._impl = val;
          if (this._setupData.dbObjectAsPojo) {
            rows[j][i] = obj._toPojo();
          } else if (obj.isCollection) {
            rows[j][i] = new Proxy(obj, BaseDbObject._collectionProxyHandler);
          }
        }
      }
    }

    // create objects, if desired
    if (this._setupData.outFormat === constants.OUT_FORMAT_OBJECT) {
      for (let i = 0; i < rows.length; i++) {
        const origRow = rows[i];
        const newRow = rows[i] = {};
        const metaData = this._setupData.metaData;
        for (let j = 0; j < metaData.length; j++) {
          newRow[metaData[j].name] = origRow[j];
        }
      }
    }
  }

  //---------------------------------------------------------------------------
  // _setup()
  //
  // Setup a result set. The metadata is acquired from the implementation and
  // used to determine if any columns need to be manipulated before being
  // returned to the caller. If the rows fetched from the result set are
  // expected to be objects, a unique set of attribute names are also
  // determined.
  // ---------------------------------------------------------------------------
  _setup(connection, resultSetImpl, options, setupData) {
    this._connection = connection;
    this._impl = resultSetImpl;
    if (setupData === undefined)
      setupData = {};
    this._setupData = setupData;
    if (setupData.metaData === undefined) {
      setupData.metaData = this._impl.getMetaData();
      setupData.nestedCursorSetupData = [];
      setupData.lobIndices = [];
      setupData.dbObjectIndices = [];
      setupData.outFormat = options.outFormat;
      setupData.fetchArraySize = options.fetchArraySize;
      setupData.dbObjectAsPojo = options.dbObjectAsPojo;
      setupData.maxRows = options.maxRows;
      const names = new Map();
      for (let i = 0; i < setupData.metaData.length; i++) {
        const name = setupData.metaData[i].name;
        if (!names.has(name)) {
          names.set(name, i);
        }
      }
      for (let i = 0; i < setupData.metaData.length; i++) {
        const info = setupData.metaData[i];
        if (info.fetchType === constants.DB_TYPE_CURSOR) {
          setupData.nestedCursorSetupData.push({"index": i});
        } else if (info.fetchType === constants.DB_TYPE_CLOB ||
            info.fetchType === constants.DB_TYPE_NCLOB ||
            info.fetchType === constants.DB_TYPE_BLOB) {
          setupData.lobIndices.push(i);
        } else if (info.fetchType === constants.DB_TYPE_OBJECT) {
          const cls = this._connection._getDbObjectClass(info.dbTypeClass);
          info.dbTypeClass = cls;
          setupData.dbObjectIndices.push(i);
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
  }

  //---------------------------------------------------------------------------
  // close()
  //
  // Close the result set and make it unusable for further operations.
  //---------------------------------------------------------------------------
  async close() {
    errors.assertArgCount(arguments, 0, 0);
    errors.assert(this._impl && this._connection._impl, errors.ERR_INVALID_RS);

    if (this._convertedToStream) {
      errors.throwErr(errors.ERR_CANNOT_INVOKE_RS_METHODS);
    }

    this._processingStarted = true;
    const resultSetImpl = this._impl;
    delete this._impl;
    delete this._setupData;
    await resultSetImpl.close();
  }

  //---------------------------------------------------------------------------
  // getRow()
  //
  // Returns a single row to the caller from the result set, if one is
  // available. Rows are buffered in a JavaScript array in order to avoid trips
  // through the thread pool that would be required if implemented in C.
  //---------------------------------------------------------------------------
  async getRow() {
    errors.assertArgCount(arguments, 0, 0);
    errors.assert(this._impl && this._connection._impl, errors.ERR_INVALID_RS);

    if (this._convertedToStream && !this._allowGetRowCall) {
      errors.throwErr(errors.ERR_CANNOT_INVOKE_RS_METHODS);
    }

    this._allowGetRowCall = false;
    this._processingStarted = true;

    if (this._rowCache.length == 0) {
      const rows = await this._impl.getRows(this._setupData.fetchArraySize);
      await this._processRows(rows, false);
      this._rowCache = rows;
    }
    return this._rowCache.shift();
  }

  //---------------------------------------------------------------------------
  // getRows()
  //
  // Check to see if any rows are in the JS buffer (which could result from
  // interspersed calls to getRow() and getRows()). If no rows are in the
  // buffer, the call is just proxied to the implementation layer. Otherwise,
  // rows are pulled from the buffer and potentially concatenated with rows
  // from calls to the implementation's getRows().
  //---------------------------------------------------------------------------
  async getRows(numRows) {
    let rowsNeeded;

    errors.assertArgCount(arguments, 0, 1);
    errors.assert(this._impl && this._connection._impl, errors.ERR_INVALID_RS);

    if (arguments.length == 0) {
      numRows = 0;
    } else {
      errors.assertParamValue(Number.isInteger(numRows) && numRows >= 0, 1);
    }

    if (this._convertedToStream) {
      errors.throwErr(errors.ERR_CANNOT_INVOKE_RS_METHODS);
    }

    this._processingStarted = true;

    let requestedRows;
    if (numRows == 0) {
      requestedRows = this._rowCache;
      const fetchArraySize = this._setupData.fetchArraySize;
      while (true) {  // eslint-disable-line
        const rows = await this._impl.getRows(fetchArraySize);
        if (rows) {
          await this._processRows(rows, false);
          requestedRows = requestedRows.concat(rows);
        }
        if (rows.length < fetchArraySize)
          break;
      }
      return requestedRows;
    }

    if (this._rowCache.length === 0) {
      requestedRows = await this._impl.getRows(numRows);
      await this._processRows(requestedRows, false);
    } else {
      rowsNeeded = numRows - this._rowCache.length;
      if (rowsNeeded <= 0) {
        requestedRows = this._rowCache.splice(0, numRows);
      } else {
        const rows = await this._impl.getRows(rowsNeeded);
        await this._processRows(rows, false);
        requestedRows = this._rowCache.concat(rows);
        this._rowCache = [];
      }
    }

    return requestedRows;
  }

  //---------------------------------------------------------------------------
  // metaData()
  //
  // Property returning the metadata associated with the result set.
  //---------------------------------------------------------------------------
  get metaData() {
    if (this._impl) {
      return this._setupData.metaData;
    }
    return undefined;
  }

  //---------------------------------------------------------------------------
  // toQueryStream()
  //
  // Converts a result set to a QueryStream object.
  //---------------------------------------------------------------------------
  toQueryStream() {
    errors.assertArgCount(arguments, 0, 0);

    if (this._processingStarted) {
      errors.throwErr(errors.ERR_CANNOT_CONVERT_RS_TO_STREAM);
    }

    if (this._convertedToStream) {
      errors.throwErr(errors.ERR_RS_ALREADY_CONVERTED);
    }

    this._convertedToStream = true;

    return new QueryStream(this);
  }

  [Symbol.asyncIterator]() {
    const resultSet = this;
    return {
      async next() {
        const row = await resultSet.getRow();
        return {value: row, done: row === undefined};
      },
      return() {
        return {done: true};
      }
    };
  }

}

nodbUtil.wrap_fns(ResultSet.prototype, errors.ERR_BUSY_RS,
  "close",
  "getRow",
  "getRows");

module.exports = ResultSet;

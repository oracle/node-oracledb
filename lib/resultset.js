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

const QueryStream = require('./queryStream.js');
const nodbUtil = require('./util.js');
const constants = require('./constants.js');
const errors = require('./errors.js');
const settings = require('./settings.js');
const Connection = require('./connection.js');

class ResultSet {

  constructor() {
    this._rowCache = [];
    this._processingStarted = false;
    this._convertedToStream = false;
    this._allowGetRowCall = false;
    this._isActive = false;
  }

  _getConnection() {
    let connection = this._parentObj;
    while (!(connection instanceof Connection))
      connection = connection._parentObj;
    return connection;
  }

  async _getAllRows(executeOpts, metaDataObj, isNested) {

    // assign result set metadata to the object; this is either a top-level
    // result object that is returned to the user or a metadata object for a
    // nested cursor or empty (for implicit results which don't provide
    // metadata to the caller)
    if (metaDataObj && !metaDataObj.metaData) {
      metaDataObj.metaData = this.metaData;
    }

    // determine value of maxRows to use
    let maxRows = settings.maxRows;
    if (executeOpts && executeOpts.maxRows !== undefined) {
      maxRows = executeOpts.maxRows;
    }

    // determine value of outFormat to use
    let outFormat = settings.outFormat;
    if (executeOpts && executeOpts.outFormat !== undefined) {
      outFormat = executeOpts.outFormat;
    }

    // determine the nested cursor indices to use, allowing for both
    // OUT_FORMAT_ARRAY and OUT_FORMAT_OBJECT formats
    const nestedCursorMetaDataObjs = [];
    const nestedCursorIndices = this._nestedCursorIndices;
    for (let i = 0; i < nestedCursorIndices.length; i++) {
      nestedCursorMetaDataObjs[i] =
        metaDataObj.metaData[nestedCursorIndices[i]];
      if (outFormat == constants.OUT_FORMAT_OBJECT) {
        nestedCursorIndices[i] = nestedCursorMetaDataObjs[i].name;
      }
    }

    // process all rows; transform nested cursors into arrays of rows by
    // fetching them
    let rowsFetched = [];
    let fetchArraySize = this._fetchArraySize;
    let closeOnFetch = false;
    const closeOnAllRowsFetched = !isNested && nestedCursorIndices.length === 0;
    while (true) {    // eslint-disable-line
      if (maxRows > 0 && fetchArraySize >= maxRows) {
        fetchArraySize = maxRows;
        closeOnFetch = closeOnAllRowsFetched;
      }
      const rows = await this._getRows(fetchArraySize, closeOnFetch,
        closeOnAllRowsFetched);
      if (nestedCursorIndices) {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          for (let j = 0; j < nestedCursorIndices.length; j++) {
            const val = row[nestedCursorIndices[j]];
            if (val) {
              row[nestedCursorIndices[j]] =
                  await val._getAllRows(executeOpts,
                    nestedCursorMetaDataObjs[j], true);
            }
          }
        }
      }
      if (rows) {
        rowsFetched = rowsFetched.concat(rows);
      }
      if (rows.length == maxRows || rows.length < fetchArraySize) {
        break;
      }
      if (maxRows > 0) {
        maxRows -= rows.length;
      }
    }

    // if the cursor was not automatically closed (in order to ensure that
    // nested cursors could be fetched), close it now that all rows have been
    // fetched
    if (!closeOnAllRowsFetched) {
      await this._close();
    }
    return rowsFetched;
  }

  _getDbObjectClassJS(schema, name) {
    return this._connection._getDbObjectClassJS(schema, name);
  }

  //---------------------------------------------------------------------------
  // close()
  //
  // Close the result set and make it unusable for further operations.
  //---------------------------------------------------------------------------
  async close() {
    errors.assertArgCount(arguments, 0, 0);

    if (this._convertedToStream) {
      errors.throwErr(errors.ERR_CANNOT_INVOKE_RS_METHODS);
    }

    this._processingStarted = true;
    await this._close();
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

    if (this._convertedToStream && !this._allowGetRowCall) {
      errors.throwErr(errors.ERR_CANNOT_INVOKE_RS_METHODS);
    }

    this._allowGetRowCall = false;
    this._processingStarted = true;

    if (this._rowCache.length == 0) {
      this._rowCache = await this._getRows(this._fetchArraySize, false, false);
    }
    return this._rowCache.shift();
  }

  //---------------------------------------------------------------------------
  // getRows()
  //
  // Check to see if any rows are in the JS buffer (which could result from
  // interspersed calls to getRow() and getRows()). If no rows are in the buffer
  // buffer, the call is just proxied to the C layer. Otherwise, rows are pulled
  // from the buffer and potentially concatenated with rows from a call to
  // getRows().
  //---------------------------------------------------------------------------
  async getRows(numRows) {
    let rowsNeeded;

    errors.assertArgCount(arguments, 0, 1);

    if (arguments.length == 0) {
      numRows = 0;
    } else {
      errors.assertParamValue(Number.isInteger(numRows) && numRows >= 0, 1);
    }

    if (this._convertedToStream) {
      errors.throwErr(errors.ERR_CANNOT_INVOKE_RS_METHODS);
    }

    this._processingStarted = true;

    if (numRows == 0) {
      let requestedRows = this._rowCache;

      const fetchArraySize = this._fetchArraySize;
      while (true) {  // eslint-disable-line
        let rows = await this._getRows(fetchArraySize, false, false);
        if (rows)
          requestedRows = requestedRows.concat(rows);
        if (rows.length < fetchArraySize)
          break;
      }
      return requestedRows;
    }

    if (this._rowCache.length === 0) {
      return await this._getRows(numRows, false, false);
    }

    rowsNeeded = numRows - this._rowCache.length;
    if (rowsNeeded <= 0) {
      return this._rowCache.splice(0, numRows);
    } else {
      const rows = await this._getRows(rowsNeeded, false, false);
      const requestedRows = this._rowCache.concat(rows);
      this._rowCache = [];
      return requestedRows;
    }
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

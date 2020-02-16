// Copyright (c) 2016, 2020, Oracle and/or its affiliates. All rights reserved

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

//-----------------------------------------------------------------------------
// close()
//   Close the result set and make it unusable for further operations.
//-----------------------------------------------------------------------------
async function close() {
  nodbUtil.checkArgCount(arguments, 0, 0);

  if (this._convertedToStream) {
    throw new Error(nodbUtil.getErrorMessage('NJS-042'));
  }

  this._processingStarted = true;
  await this._close();
}


//-----------------------------------------------------------------------------
// getRow()
//   Returns a single row to the caller from the result set, if one is
// available. Rows are buffered in a JavaScript array in order to avoid trips
// through the thread pool that would be required if implemented in C.
//-----------------------------------------------------------------------------
async function getRow() {
  nodbUtil.checkArgCount(arguments, 0, 0);

  if (this._convertedToStream && !this._allowGetRowCall) {
    throw new Error(nodbUtil.getErrorMessage('NJS-042'));
  }

  this._allowGetRowCall = false;
  this._processingStarted = true;

  if (this._rowCache.length == 0) {
    this._rowCache = await this._getRows(this._fetchArraySize);
  }
  return this._rowCache.shift();
}


//-----------------------------------------------------------------------------
// getRows()
//   Check to see if any rows are in the JS buffer (which could result from
// interspersed calls to getRow() and getRows()). If no rows are in the buffer
// buffer, the call is just proxied to the C layer. Otherwise, rows are pulled
// from the buffer and potentially concatenated with rows from a call to
// getRows().
//-----------------------------------------------------------------------------
async function getRows(numRows) {
  let rowsNeeded;

  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(Number.isInteger(numRows), 'NJS-005', 2);
  nodbUtil.assert(numRows > 0, 'NJS-005', 2);

  if (this._convertedToStream) {
    throw new Error(nodbUtil.getErrorMessage('NJS-042'));
  }

  this._processingStarted = true;

  if (this._rowCache.length === 0) {
    return await this._getRows(numRows);
  }

  rowsNeeded = numRows - this._rowCache.length;
  if (rowsNeeded <= 0) {
    return this._rowCache.splice(0, numRows);
  } else {
    const rows = await this._getRows(rowsNeeded);
    const requestedRows = this._rowCache.concat(rows);
    this._rowCache = [];
    return requestedRows;
  }
}


class ResultSet {

  constructor() {
    this._rowCache = [];
    this._processingStarted = false;
    this._convertedToStream = false;
    this._allowGetRowCall = false;
  }

  _extend(oracledb) {
    this._oracledb = oracledb;
    this.close = nodbUtil.callbackify(close);
    this.getRow = nodbUtil.callbackify(getRow);
    this.getRows = nodbUtil.callbackify(getRows);
  }

  async _getAllRows(executeOpts) {
    let maxRows = this._oracledb.maxRows;
    if (executeOpts && executeOpts.maxRows !== undefined) {
      maxRows = executeOpts.maxRows;
    }
    let rowsFetched = [];
    while (true) {    // eslint-disable-line
      const rows = await this._getRows(this._fetchArraySize);
      if (rows) {
        rowsFetched = rowsFetched.concat(rows);
      }
      if (rowsFetched.length == maxRows ||
          rows.length < this._fetchArraySize) {
        break;
      }
    }
    return rowsFetched;
  }

  _getDbObjectClassJS(schema, name) {
    return this._connection._getDbObjectClassJS(schema, name);
  }

  _setup(executeOpts) {
    this._fetchArraySize = this._oracledb.fetchArraySize;
    if (executeOpts && executeOpts.fetchArraySize) {
      this._fetchArraySize = executeOpts.fetchArraySize;
    }
  }

  toQueryStream() {
    nodbUtil.checkArgCount(arguments, 0, 0);

    if (this._processingStarted) {
      throw new Error(nodbUtil.getErrorMessage('NJS-041'));
    }

    if (this._convertedToStream) {
      throw new Error(nodbUtil.getErrorMessage('NJS-043'));
    }

    this._convertedToStream = true;

    return new QueryStream(this);
  }

}


module.exports = ResultSet;

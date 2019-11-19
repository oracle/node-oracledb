// Copyright (c) 2016, 2019, Oracle and/or its affiliates. All rights reserved

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

// close the result set
function close(closeCb) {
  const self = this;

  nodbUtil.checkAsyncArgs(arguments, 1, 1);

  if (self._convertedToStream) {
    closeCb(new Error(nodbUtil.getErrorMessage('NJS-042')));
    return;
  }

  self._processingStarted = true;

  self._close(function(err) {

    closeCb(err);
  });
}


// getRow is a JavaScript based wrapper on getRows. It buffers rows in a
// JavaScript array to avoid the trips through the thread pool that would be
// required if implemented in C.
function getRow(getRowCb) {
  const self = this;

  nodbUtil.checkAsyncArgs(arguments, 1, 1);

  if (self._convertedToStream && !self._allowGetRowCall) {
    getRowCb(new Error(nodbUtil.getErrorMessage('NJS-042')));
    return;
  }

  self._allowGetRowCall = false;
  self._processingStarted = true;

  if (self._rowCache.length) {
    // Using setImmediate to preserve the async nature of getRow.
    setImmediate(function() {
      getRowCb(null, self._rowCache.shift());
    });

    return;
  }

  self._getRows(self._fetchArraySize, function(err, rows) {
    if (err) {
      getRowCb(err);
      return;
    }

    self._rowCache = rows;

    getRowCb(null, self._rowCache.shift());
  });
}


// The JS getRows will first check to see if any rows are in the JS buffer
// (which could result from interspersed calls to getRow and getRows). If no
// rows are in the buffer, the call is just proxied to the C layer. Otherwise,
// rows are pulled from the buffer and potentially concatenated with rows from
// a call to getRows.
function getRows(numRows, getRowsCb) {
  const self = this;
  let rowsNeeded;

  nodbUtil.checkAsyncArgs(arguments, 2, 2);
  nodbUtil.assert(Number.isInteger(numRows), 'NJS-005', 2);
  nodbUtil.assert(numRows > 0, 'NJS-005', 2);

  if (self._convertedToStream) {
    getRowsCb(new Error(nodbUtil.getErrorMessage('NJS-042')));
    return;
  }

  self._processingStarted = true;

  if (self._rowCache.length === 0) {
    self._getRows(numRows, getRowsCb);
  } else {
    rowsNeeded = numRows - self._rowCache.length;

    if (rowsNeeded <= 0) {
      getRowsCb(null, self._rowCache.splice(0, numRows));
    } else {
      self._getRows(rowsNeeded, function(err, rows) {
        let requestedRows;

        if (err) {
          getRowsCb(err);
          return;
        }

        requestedRows = self._rowCache.concat(rows);

        self._rowCache = [];

        getRowsCb(null, requestedRows);
      });
    }
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
    this.close = nodbUtil.promisify(oracledb, close);
    this.getRow = nodbUtil.promisify(oracledb, getRow);
    this.getRows = nodbUtil.promisify(oracledb, getRows);
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
    const self = this;

    nodbUtil.checkArgCount(arguments, 0, 0);

    if (self._processingStarted) {
      throw new Error(nodbUtil.getErrorMessage('NJS-041'));
    }

    if (self._convertedToStream) {
      throw new Error(nodbUtil.getErrorMessage('NJS-043'));
    }

    self._convertedToStream = true;

    return new QueryStream(self);
  }

}


module.exports = ResultSet;

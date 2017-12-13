/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *****************************************************************************/

'use strict';

var QueryStream = require('./querystream.js');
var nodbUtil = require('./util.js');
var closePromisified;
var getRowPromisified;
var getRowsPromisified;

// This close function is just a place holder to allow for easier extension later.
function close(closeCb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof closeCb === 'function', 'NJS-006', 1);

  if (self._convertedToStream) {
    closeCb(new Error(nodbUtil.getErrorMessage('NJS-042')));
    return;
  }

  self._processingStarted = true;

  self._close(function(err) {

    closeCb(err);
  });
}

closePromisified = nodbUtil.promisify(close);

// getRow is a JavaScript based wrapper on getRows. It buffers rows in a JavaScript
// array to avoid the trips through the thread pool that would be required if
// implemented in C.
function getRow(getRowCb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof getRowCb === 'function', 'NJS-006', 1);

  if (self._convertedToStream) {
    getRowCb(new Error(nodbUtil.getErrorMessage('NJS-042')));
    return;
  }

  self._processingStarted = true;

  if (self._rowCache.length) {
    getRowCb(null, self._rowCache.shift());
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

getRowPromisified = nodbUtil.promisify(getRow);

// The JS getRows will first check to see if any rows are in the JS buffer (which
// could result from interspersed calls to getRow and getRows). If no rows are in the
// buffer, the call is just proxied to the C layer. Otherwise, rows are pulled from
// the buffer and potentially concatenated with rows from a call to getRows.
function getRows(numRows, getRowsCb) {
  var self = this;
  var rowsNeeded;

  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(typeof numRows === 'number', 'NJS-006', 1);
  nodbUtil.assert(typeof getRowsCb === 'function', 'NJS-006', 2);

  if (self._convertedToStream) {
    getRowsCb(new Error(nodbUtil.getErrorMessage('NJS-042')));
    return;
  }

  self._processingStarted = true;

  if (self._rowCache.length === 0) {
    self._getRows.apply(self, arguments);
  } else {
    rowsNeeded = numRows - self._rowCache.length;

    if (rowsNeeded <= 0) {
      getRowsCb(null, self._rowCache.splice(0, numRows));
    } else {
      self._getRows(rowsNeeded, function(err, rows) {
        var requestedRows;

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

getRowsPromisified = nodbUtil.promisify(getRows);

function toQueryStream() {
  var self = this;
  var stream;

  nodbUtil.assert(arguments.length === 0, 'NJS-009');

  if (self._processingStarted) {
    throw new Error(nodbUtil.getErrorMessage('NJS-041'));
  }

  if (self._convertedToStream) {
    throw new Error(nodbUtil.getErrorMessage('NJS-043'));
  }

  self._convertedToStream = true;

  stream = new QueryStream(self, self._oracledb);

  return stream;
}

// The extend method is used to extend the ResultSet instance from the C layer with
// custom properties and method overrides. References to the original methods are
// maintained so they can be invoked by the overriding method at the right time.
function extend(resultSet, oracledb, executeOpts) {
  var fetchArraySize = oracledb.fetchArraySize;

  if (executeOpts && executeOpts.fetchArraySize) {
    fetchArraySize = executeOpts.fetchArraySize;
  }

  // Using Object.defineProperties to add properties to the ResultSet instance with
  // special properties, such as enumerable but not writable.
  Object.defineProperties(
    resultSet,
    {
      _oracledb: { // storing a reference to the base instance to avoid circular references with require
        value: oracledb
      },
      _fetchArraySize: { // stores the value of fetchArraySize that was passed to conn.execute (if any)
        value: fetchArraySize
      },
      _rowCache: { // used for storing rows when getRow is used
        value: [],
        writable: true
      },
      _processingStarted: { // used to prevent conversion to stream after invoking methods
        value: false,
        writable: true
      },
      _convertedToStream: { // used to prevent invoking methods after conversion to stream
        value: false,
        writable: true
      },
      _close: {
        value: resultSet.close
      },
      close: {
        value: closePromisified,
        enumerable: true,
        writable: true
      },
      _getRow: {
        value: resultSet.getRow
      },
      getRow: {
        value: getRowPromisified,
        enumerable: true,
        writable: true
      },
      _getRows: {
        value: resultSet.getRows
      },
      getRows: {
        value: getRowsPromisified,
        enumerable: true,
        writable: true
      },
      toQueryStream: {
        value: toQueryStream,
        enumerable: true,
        writable: true
      }
    }
  );
}

module.exports.extend = extend;

/* Copyright (c) 2018, Oracle and/or its affiliates.  All rights reserved */

/**************************************************************************
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

const nodbUtil = require('./util.js');
const sodaDocument = require('./sodaDocument.js');
const sodaDocCursor = require('./sodaDocCursor.js');

var countPromisified;
var getOnePromisified;
var replaceOnePromisified;
var replaceOneAndGetPromisified;
var removePromisified;
var getCursorPromisified;
var getDocumentsPromisified;


// to obtain count of documents from find() result
// This is a terminal function (no further chaining possible)
function count(cb) {
  var self = this;
  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof cb === 'function', 'NJS-006', 1);

  self._count(this._options, cb);
}

countPromisified = nodbUtil.promisify(count);

// To obtain first document object from find() result
// This is a terminal function (no further chaining possible)
function getOne(cb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof cb === 'function', 'NJS-006', 1);

  self._getOne(this._options, function(err, doc) {
    if (doc) {
      sodaDocument.extend(doc);
    }
    cb(err, doc);
  });
}

getOnePromisified = nodbUtil.promisify(getOne);


// To replace one document by a given document based from find() result
// This is a terminal function (no further chaining possible)
function replaceOne(content, cb) {
  var self = this;

  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(nodbUtil.isObject(content) ||
      nodbUtil.isSodaDocument(content), 'NJS-006', 1);
  nodbUtil.assert(typeof cb === 'function', 'NJS-006', 2);

  if (!nodbUtil.isSodaDocument(content)) {
    content = Buffer.from(JSON.stringify(content));
  }

  self._replaceOne(this._options, content, cb);
}

replaceOnePromisified = nodbUtil.promisify(replaceOne);


// To replace one document by a given document based from find() result
// This is a terminal function (no further chaining possible)
function replaceOneAndGet(content, cb) {
  var self = this;

  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(nodbUtil.isObject(content) ||
      nodbUtil.isSodaDocument(content), 'NJS-006', 1);
  nodbUtil.assert(typeof cb === 'function', 'NJS-006', 2);

  if (!nodbUtil.isSodaDocument(content)) {
    content = Buffer.from(JSON.stringify(content));
  }

  self._replaceOneAndGet(this._options, content, function(err, doc) {
    if (doc) {
      sodaDocument.extend(doc);
    }
    cb(err, doc);
  });
}

replaceOneAndGetPromisified = nodbUtil.promisify(replaceOneAndGet);


// To remove documents obtained from find() result
// This is a terminal function (no further chaining possible)
function remove(cb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof cb === 'function', 'NJS-006', 1);

  self._remove(this._options, cb);
}

removePromisified = nodbUtil.promisify(remove);


// To obtain document-cursor object from find() result
// This is a terminal function (no further chaining possible)
function getCursor(cb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof cb === 'function', 'NJS-006', 1);

  self._getCursor(this._options, function(err, cursor) {
    if (cursor) {
      sodaDocCursor.extend(cursor, self._oracledb);
    }
    cb(err, cursor);
  });
}

getCursorPromisified = nodbUtil.promisify(getCursor);


// to obtain documents from find() result
// This is a terminal function (no further chaining possible)
function getDocuments(cb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof cb === 'function', 'NJS-006', 1);

  self._getDocuments(this._options, function(err, docs) {
    if (err) {
      cb(err, null);
      return;
    }
    for (let i = 0; i < docs.length; i++) {
      sodaDocument.extend(docs[i]);
    }
    cb(null, docs);
  });
}

getDocumentsPromisified = nodbUtil.promisify(getDocuments);


// limit property - a non-terminal function and can chain further
function _limit (n) {
  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof n === 'number', 'NJS-006', 1);
  this._options.limit = n;
  return this;
}


// skip property - a non-terminal function and can chain further
function _skip(n) {
  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof n === 'number', 'NJS-006', 1);
  this._options.skip = n;
  return this;
}

// version property - a non-terminal function and can chain further
function _version(v) {
  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof v === 'string', 'NJS-006', 1);
  this._options.version = v;
  return this;
}

// filter property - a non-terminal function and can chain further
function _filter(f) {
  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(nodbUtil.isObject(f), 'NJS-006', 1);
  this._options.filter = JSON.stringify(f);
  return this;
}

// key - a non-terminal function and can chain further
function _key(k) {
  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof k === 'string', 'NJS-006', 1);
  this._options.key = k;
  this._options.keys = undefined;
  return this;
}

// keys - a non-terminal function and can chain further
function _keys(arr) {
  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(Array.isArray(arr), 'NJS-006', 1);

  for (let i = 0; i < arr.length; i++) {
    nodbUtil.assert(typeof arr[i] === 'string', 'NJS-006', 1);
  }

  this._options.keys = arr;
  this._options.key = undefined;
  return this;
}


// The extend method is used to extend the sodaOperation istance from C Layer
// with custom properties and method overrides.  References to the original
// methods are maintained so they can be invoked by the overriding method at
// the right time
function extend(sodaOp, oracledb) {
  // Using Object.defineProperties to add properties to the soda instance with
  // special properties
  Object.defineProperties (
    sodaOp,
    {
      _oracledb: {
        value: oracledb
      },
      limit: {
        value: _limit,
        enumerable: true,
        writable: true
      },
      skip: {
        value: _skip,
        enumerable: true,
        writable: true
      },
      version: {
        value: _version,
        enumerable: true,
        writable: true
      },
      filter: {
        value: _filter,
        enumerable: true,
        writable: true
      },
      key: {
        value: _key,
        enumerable: true,
        writable: true
      },
      keys: {
        value: _keys,
        enumerable: true,
        writable: true
      },
      _options: {
        value: {}
      },
      _count: {
        value: sodaOp.count
      },
      count: {
        value: countPromisified,
        enumerable: true,
        writable: true
      },
      _getOne: {
        value: sodaOp.getOne
      },
      getOne: {
        value: getOnePromisified,
        enumerable: true,
        writable: true
      },
      _replaceOne: {
        value: sodaOp.replaceOne
      },
      replaceOne: {
        value: replaceOnePromisified,
        enumerable: true,
        writable: true
      },
      _replaceOneAndGet: {
        value: sodaOp.replaceOneAndGet
      },
      replaceOneAndGet: {
        value:  replaceOneAndGetPromisified,
        enumerable: true,
        writable: true
      },
      _remove: {
        value:  sodaOp.remove
      },
      remove: {
        value: removePromisified,
        enumerable: true,
        writable: true
      },
      _getCursor: {
        value: sodaOp.getCursor
      },
      getCursor: {
        value: getCursorPromisified,
        enumerable: true,
        writable: true
      },
      _getDocuments: {
        value: sodaOp.getDocuments
      },
      getDocuments: {
        value: getDocumentsPromisified,
        enumerable: true,
        writable: true
      }
    }
  );
}

module.exports.extend = extend;

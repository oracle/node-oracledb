// Copyright (c) 2018, 2019, Oracle and/or its affiliates. All rights reserved

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

const nodbUtil = require('./util.js');

// to obtain count of documents from find() result
// This is a terminal function (no further chaining possible)
function count(cb) {
  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof cb === 'function', 'NJS-005', 1);

  this._count(this._options, cb);
}


// To obtain first document object from find() result
// This is a terminal function (no further chaining possible)
function getOne(cb) {
  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof cb === 'function', 'NJS-005', 1);

  this._getOne(this._options, cb);
}


// To replace one document by a given document based from find() result
// This is a terminal function (no further chaining possible)
function replaceOne(content, cb) {

  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(nodbUtil.isObject(content) ||
      nodbUtil.isSodaDocument(content), 'NJS-005', 1);
  nodbUtil.assert(typeof cb === 'function', 'NJS-005', 2);

  if (!nodbUtil.isSodaDocument(content)) {
    content = Buffer.from(JSON.stringify(content));
  }

  this._replaceOne(this._options, content, cb);
}


// To replace one document by a given document based from find() result
// This is a terminal function (no further chaining possible)
function replaceOneAndGet(content, cb) {
  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(nodbUtil.isObject(content) ||
      nodbUtil.isSodaDocument(content), 'NJS-005', 1);
  nodbUtil.assert(typeof cb === 'function', 'NJS-005', 2);

  if (!nodbUtil.isSodaDocument(content)) {
    content = Buffer.from(JSON.stringify(content));
  }

  this._replaceOneAndGet(this._options, content, cb);
}


// To remove documents obtained from find() result
// This is a terminal function (no further chaining possible)
function remove(cb) {
  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof cb === 'function', 'NJS-005', 1);

  this._remove(this._options, cb);
}


// To obtain document-cursor object from find() result
// This is a terminal function (no further chaining possible)
function getCursor(cb) {
  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof cb === 'function', 'NJS-005', 1);

  this._getCursor(this._options, cb);
}


// to obtain documents from find() result
// This is a terminal function (no further chaining possible)
function getDocuments(cb) {
  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof cb === 'function', 'NJS-005', 1);

  this._getDocuments(this._options, cb);
}



class SodaOperation {

  constructor() {
    this._options = {};
  }

  _extend(oracledb) {
    this.count = nodbUtil.promisify(oracledb, count);
    this.getCursor = nodbUtil.promisify(oracledb, getCursor);
    this.getDocuments = nodbUtil.promisify(oracledb, getDocuments);
    this.getOne = nodbUtil.promisify(oracledb, getOne);
    this.remove = nodbUtil.promisify(oracledb, remove);
    this.replaceOne = nodbUtil.promisify(oracledb, replaceOne);
    this.replaceOneAndGet = nodbUtil.promisify(oracledb, replaceOneAndGet);
  }

  // filter property - a non-terminal function and can chain further
  filter(f) {
    nodbUtil.assert(arguments.length === 1, 'NJS-009');
    nodbUtil.assert(nodbUtil.isObject(f), 'NJS-005', 1);
    this._options.filter = JSON.stringify(f);
    return this;
  }

  // key - a non-terminal function and can chain further
  key(k) {
    nodbUtil.assert(arguments.length === 1, 'NJS-009');
    nodbUtil.assert(typeof k === 'string', 'NJS-005', 1);
    this._options.key = k;
    this._options.keys = undefined;
    return this;
  }

  // keys - a non-terminal function and can chain further
  keys(arr) {
    nodbUtil.assert(arguments.length === 1, 'NJS-009');
    nodbUtil.assert(Array.isArray(arr), 'NJS-005', 1);

    for (let i = 0; i < arr.length; i++) {
      nodbUtil.assert(typeof arr[i] === 'string', 'NJS-005', 1);
    }

    this._options.keys = arr;
    this._options.key = undefined;
    return this;
  }

  // limit property - a non-terminal function and can chain further
  limit (n) {
    nodbUtil.assert(arguments.length === 1, 'NJS-009');
    nodbUtil.assert(typeof n === 'number', 'NJS-005', 1);
    this._options.limit = n;
    return this;
  }

  // skip property - a non-terminal function and can chain further
  skip(n) {
    nodbUtil.assert(arguments.length === 1, 'NJS-009');
    nodbUtil.assert(typeof n === 'number', 'NJS-005', 1);
    this._options.skip = n;
    return this;
  }

  // version property - a non-terminal function and can chain further
  version(v) {
    nodbUtil.assert(arguments.length === 1, 'NJS-009');
    nodbUtil.assert(typeof v === 'string', 'NJS-005', 1);
    this._options.version = v;
    return this;
  }

}


module.exports = SodaOperation;

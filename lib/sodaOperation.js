// Copyright (c) 2018, 2020, Oracle and/or its affiliates. All rights reserved

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

//-----------------------------------------------------------------------------
// count()
//   Return a count of the number of documents that match the search criteria.
//-----------------------------------------------------------------------------
async function count() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  return await this._count(this._options);
}


//-----------------------------------------------------------------------------
// getOne()
//   Return the first document that matches the search criteria.
//-----------------------------------------------------------------------------
async function getOne() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  return await this._getOne(this._options);
}


//-----------------------------------------------------------------------------
// replaceOne()
//   Replace the first document that matches the search criteria with the
// specified document.
//-----------------------------------------------------------------------------
async function replaceOne(content) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(nodbUtil.isObject(content) ||
      nodbUtil.isSodaDocument(content), 'NJS-005', 1);

  if (!nodbUtil.isSodaDocument(content)) {
    content = Buffer.from(JSON.stringify(content));
  }

  return await this._replaceOne(this._options, content);
}


//-----------------------------------------------------------------------------
// replaceOneAndGet()
//   Replace the first document that matches the search criteria with the
// specified document and then return a result document containing metadata.
//-----------------------------------------------------------------------------
async function replaceOneAndGet(content) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(nodbUtil.isObject(content) ||
      nodbUtil.isSodaDocument(content), 'NJS-005', 1);

  if (!nodbUtil.isSodaDocument(content)) {
    content = Buffer.from(JSON.stringify(content));
  }

  return await this._replaceOneAndGet(this._options, content);
}


//-----------------------------------------------------------------------------
// remove()
//   Remove the documents that match the search criteria from the collection
// and return information about the operation to the caller.
//-----------------------------------------------------------------------------
async function remove() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  return await this._remove(this._options);
}


//-----------------------------------------------------------------------------
// getCursor()
//   Return a cursor which will return the documents that match the search
// criteria.
//-----------------------------------------------------------------------------
async function getCursor() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  return await this._getCursor(this._options);
}


//-----------------------------------------------------------------------------
// getDocuments()
//   Return an array of documents that match the search criteria.
//-----------------------------------------------------------------------------
async function getDocuments() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  return await this._getDocuments(this._options);
}


class SodaOperation {

  constructor() {
    this._options = {};
  }

  _extend() {
    this.count = nodbUtil.callbackify(count);
    this.getCursor = nodbUtil.callbackify(getCursor);
    this.getDocuments = nodbUtil.callbackify(getDocuments);
    this.getOne = nodbUtil.callbackify(getOne);
    this.remove = nodbUtil.callbackify(remove);
    this.replaceOne = nodbUtil.callbackify(replaceOne);
    this.replaceOneAndGet = nodbUtil.callbackify(replaceOneAndGet);
  }

  // fetchArraySize - a non-terminal function that can chain further
  fetchArraySize(n) {
    nodbUtil.checkArgCount(arguments, 1, 1);
    nodbUtil.assert(typeof n === 'number', 'NJS-005', 1);
    this._options.fetchArraySize = n;
    return this;
  }

  // filter property - a non-terminal function and can chain further
  filter(f) {
    nodbUtil.checkArgCount (arguments, 1, 1);
    nodbUtil.assert(nodbUtil.isObject(f), 'NJS-005', 1);
    this._options.filter = JSON.stringify(f);
    return this;
  }

  // key - a non-terminal function and can chain further
  key(k) {
    nodbUtil.checkArgCount(arguments, 1, 1);
    nodbUtil.assert(typeof k === 'string', 'NJS-005', 1);
    this._options.key = k;
    this._options.keys = undefined;
    return this;
  }

  // keys - a non-terminal function and can chain further
  keys(arr) {
    nodbUtil.checkArgCount(arguments, 1, 1);
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
    nodbUtil.checkArgCount(arguments, 1, 1);
    nodbUtil.assert(typeof n === 'number', 'NJS-005', 1);
    this._options.limit = n;
    return this;
  }

  // skip property - a non-terminal function and can chain further
  skip(n) {
    nodbUtil.checkArgCount(arguments, 1, 1);
    nodbUtil.assert(typeof n === 'number', 'NJS-005', 1);
    this._options.skip = n;
    return this;
  }

  // version property - a non-terminal function and can chain further
  version(v) {
    nodbUtil.checkArgCount(arguments, 1, 1);
    nodbUtil.assert(typeof v === 'string', 'NJS-005', 1);
    this._options.version = v;
    return this;
  }

}


module.exports = SodaOperation;

// Copyright (c) 2018, 2022, Oracle and/or its affiliates.

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

const errors = require('./errors.js');
const nodbUtil = require('./util.js');

class SodaOperation {

  constructor() {
    this._options = {};
  }

  _getConnection() {
    return this._collection._database._connection;
  }

  //---------------------------------------------------------------------------
  // count()
  //
  // Return a count of the number of documents that match the search criteria.
  //---------------------------------------------------------------------------
  async count() {
    errors.assertArgCount(arguments, 0, 0);
    return await this._count(this._options);
  }

  //---------------------------------------------------------------------------
  // getCursor()
  //
  // Return a cursor which will return the documents that match the search
  // criteria.
  //---------------------------------------------------------------------------
  async getCursor() {
    errors.assertArgCount(arguments, 0, 0);
    return await this._getCursor(this._options);
  }

  //---------------------------------------------------------------------------
  // getDocuments()
  //   Return an array of documents that match the search criteria.
  //---------------------------------------------------------------------------
  async getDocuments() {
    errors.assertArgCount(arguments, 0, 0);
    return await this._getDocuments(this._options);
  }

  //---------------------------------------------------------------------------
  // getOne()
  //
  // Return the first document that matches the search criteria.
  //---------------------------------------------------------------------------
  async getOne() {
    errors.assertArgCount(arguments, 0, 0);
    return await this._getOne(this._options);
  }

  //---------------------------------------------------------------------------
  // replaceOne()
  //
  // Replace the first document that matches the search criteria with the
  // specified document.
  //---------------------------------------------------------------------------
  async replaceOne(content) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(nodbUtil.isObject(content) ||
        nodbUtil.isSodaDocument(content), 1);

    if (!nodbUtil.isSodaDocument(content)) {
      content = Buffer.from(JSON.stringify(content));
    }

    return await this._replaceOne(this._options, content);
  }

  //---------------------------------------------------------------------------
  // replaceOneAndGet()
  //
  // Replace the first document that matches the search criteria with the
  // specified document and then return a result document containing metadata.
  //---------------------------------------------------------------------------
  async replaceOneAndGet(content) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(nodbUtil.isObject(content) ||
        nodbUtil.isSodaDocument(content), 1);

    if (!nodbUtil.isSodaDocument(content)) {
      content = Buffer.from(JSON.stringify(content));
    }

    return await this._replaceOneAndGet(this._options, content);
  }

  //---------------------------------------------------------------------------
  // remove()
  //
  // Remove the documents that match the search criteria from the collection
  // and return information about the operation to the caller.
  //---------------------------------------------------------------------------
  async remove() {
    errors.assertArgCount(arguments, 0, 0);
    return await this._remove(this._options);
  }

  // fetchArraySize - a non-terminal function that can chain further
  fetchArraySize(n) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof n === 'number', 1);
    this._options.fetchArraySize = n;
    return this;
  }

  // filter property - a non-terminal function and can chain further
  filter(f) {
    errors.assertArgCount (arguments, 1, 1);
    errors.assertParamValue(nodbUtil.isObject(f), 1);
    this._options.filter = JSON.stringify(f);
    return this;
  }

  // hint - a non-terminal function and can chain further
  hint(val) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof val === 'string', 1);
    this._options.hint = val;
    return this;
  }

  // key - a non-terminal function and can chain further
  key(k) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof k === 'string', 1);
    this._options.key = k;
    this._options.keys = undefined;
    return this;
  }

  // keys - a non-terminal function and can chain further
  keys(arr) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Array.isArray(arr), 1);

    for (let i = 0; i < arr.length; i++) {
      errors.assertParamValue(typeof arr[i] === 'string', 1);
    }

    this._options.keys = arr;
    this._options.key = undefined;
    return this;
  }

  // limit property - a non-terminal function and can chain further
  limit(n) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof n === 'number', 1);
    this._options.limit = n;
    return this;
  }

  // skip property - a non-terminal function and can chain further
  skip(n) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof n === 'number', 1);
    this._options.skip = n;
    return this;
  }

  // version property - a non-terminal function and can chain further
  version(v) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof v === 'string', 1);
    this._options.version = v;
    return this;
  }

}

nodbUtil.wrap_fns(SodaOperation.prototype,
  "count",
  "getCursor",
  "getDocuments",
  "getOne",
  "remove",
  "replaceOne",
  "replaceOneAndGet");

module.exports = SodaOperation;

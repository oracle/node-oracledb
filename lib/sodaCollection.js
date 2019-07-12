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

// To drop the collection
function drop(cb) {
  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof cb === 'function', 'NJS-005', 1);

  this._drop(cb);
}


// To insert a given document to the current collection
function insertMany(docs, cb) {
  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(Array.isArray(docs), 'NJS-005', 1);
  nodbUtil.assert(typeof cb === 'function', 'NJS-005', 2);
  if (docs.length == 0) {
    cb(new Error(nodbUtil.getErrorMessage('NJS-005', 1)));
    return;
  }

  let actualDocs = Array(docs.length);
  for (let i = 0; i < docs.length; i++) {
    let content = docs[i];
    if (!nodbUtil.isSodaDocument(content)) {
      content = Buffer.from(JSON.stringify(content));
    }
    actualDocs[i] = content;
  }

  this._insertMany(actualDocs, cb);
}


// To insert a given document into the current collection and return the
// metadata of the new document (result-document)
function insertManyAndGet(docs, cb) {
  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(Array.isArray(docs), 'NJS-005', 1);
  nodbUtil.assert(typeof cb === 'function', 'NJS-005', 2);
  if (docs.length == 0) {
    cb(new Error(nodbUtil.getErrorMessage('NJS-005', 1)));
    return;
  }

  let actualDocs = Array(docs.length);
  for (let i = 0; i < docs.length; i++) {
    let content = docs[i];
    if (!nodbUtil.isSodaDocument(content)) {
      content = Buffer.from(JSON.stringify(content));
    }
    actualDocs[i] = content;
  }

  this._insertManyAndGet(actualDocs, cb);
}

// To insert a given document to the current collection
function insertOne(content, cb) {
  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(nodbUtil.isObject(content) ||
      nodbUtil.isSodaDocument(content), 'NJS-005', 1);
  nodbUtil.assert(typeof cb === 'function', 'NJS-005', 2);

  if (!nodbUtil.isSodaDocument(content)) {
    content = Buffer.from(JSON.stringify(content));
  }

  this._insertOne(content, cb);
}


// To insert a given document into the current collection and return the
// metadata of the new document (result-document)
function insertOneAndGet(content, cb) {
  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(nodbUtil.isObject(content) ||
      nodbUtil.isSodaDocument(content), 'NJS-005', 1);
  nodbUtil.assert(typeof cb === 'function', 'NJS-005', 2);

  if (!nodbUtil.isSodaDocument(content)) {
    content = Buffer.from(JSON.stringify(content));
  }

  this._insertOneAndGet(content, cb);
}


// To create an index on documens
function createIndex(spec, cb) {
  nodbUtil.assert(arguments.length === 2, 'NJS-009', 1);
  nodbUtil.assert(nodbUtil.isObject(spec), 'NJS-005', 1);
  nodbUtil.assert(typeof cb === 'function', 'NJS-005', 2);

  this._createIndex(JSON.stringify(spec), cb);
}


// To drop an index from document-collection
function dropIndex(indexName, a2, a3) {
  let options = {};
  let dropIndexCb;

  nodbUtil.assert(arguments.length >= 2 && arguments.length <= 3, 'NJS-009');
  nodbUtil.assert(typeof indexName === 'string', 'NJS-005', 1);

  switch (arguments.length) {
    case 2:
      nodbUtil.assert(typeof a2 === 'function', 'NJS-005', 2);
      dropIndexCb = a2;
      break;
    case 3:
      nodbUtil.assert(typeof a2 === 'object', 'NJS-005', 2);
      nodbUtil.assert(typeof a3 === 'function', 'NJS-005', 3);
      options = a2;
      dropIndexCb = a3;
      break;
  }

  this._dropIndex(indexName, options, dropIndexCb);
}


// To obtain the dataGuide of the document collection
function getDataGuide(cb) {
  nodbUtil.assert(typeof cb === 'function', 'NJS-009');

  this._getDataGuide(cb);
}


class SodaCollection {

  _extend(oracledb) {
    this.createIndex = nodbUtil.promisify(oracledb, createIndex);
    this.drop = nodbUtil.promisify(oracledb, drop);
    this.dropIndex = nodbUtil.promisify(oracledb, dropIndex);
    this.getDataGuide = nodbUtil.promisify(oracledb, getDataGuide);
    this.insertMany = nodbUtil.promisify(oracledb, insertMany);
    this.insertManyAndGet = nodbUtil.promisify(oracledb, insertManyAndGet);
    this.insertOne = nodbUtil.promisify(oracledb, insertOne);
    this.insertOneAndGet = nodbUtil.promisify(oracledb, insertOneAndGet);
  }

  find() {
    nodbUtil.assert(arguments.length === 0, 'NJS-009');
    return this._find();
  }

  get metaData() {
    return JSON.parse(this._metaData);
  }

}

module.exports = SodaCollection;

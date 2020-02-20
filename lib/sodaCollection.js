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
// drop()
//   Drop the collection.
//-----------------------------------------------------------------------------
async function drop() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  return await this._drop();
}


//-----------------------------------------------------------------------------
// insertMany()
//   Insert an array of documents into the collection in a single round-trip.
//-----------------------------------------------------------------------------
async function insertMany(docs) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(Array.isArray(docs), 'NJS-005', 1);

  if (docs.length == 0) {
    throw new Error(nodbUtil.getErrorMessage('NJS-005', 1));
  }

  let actualDocs = Array(docs.length);
  for (let i = 0; i < docs.length; i++) {
    let content = docs[i];
    if (!nodbUtil.isSodaDocument(content)) {
      content = Buffer.from(JSON.stringify(content));
    }
    actualDocs[i] = content;
  }

  await this._insertMany(actualDocs);
}


//-----------------------------------------------------------------------------
// insertManyAndGet()
//   Insert an array of documents into the collection in a single round-trip
// and return a set of result documents containing metadata.
//-----------------------------------------------------------------------------
async function insertManyAndGet(docs) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(Array.isArray(docs), 'NJS-005', 1);

  if (docs.length == 0) {
    throw new Error(nodbUtil.getErrorMessage('NJS-005', 1));
  }

  let actualDocs = Array(docs.length);
  for (let i = 0; i < docs.length; i++) {
    let content = docs[i];
    if (!nodbUtil.isSodaDocument(content)) {
      content = Buffer.from(JSON.stringify(content));
    }
    actualDocs[i] = content;
  }

  return await this._insertManyAndGet(actualDocs);
}


//-----------------------------------------------------------------------------
// insertOne()
//   Inserts a single document into the collection.
//-----------------------------------------------------------------------------
async function insertOne(content) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(nodbUtil.isObject(content) ||
      nodbUtil.isSodaDocument(content), 'NJS-005', 1);

  if (!nodbUtil.isSodaDocument(content)) {
    content = Buffer.from(JSON.stringify(content));
  }

  await this._insertOne(content);
}


//-----------------------------------------------------------------------------
// insertOneAndGet()
//   Inserts a single document into the collection and returns a result
// document containing metadata.
//-----------------------------------------------------------------------------
async function insertOneAndGet(content) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(nodbUtil.isObject(content) ||
      nodbUtil.isSodaDocument(content), 'NJS-005', 1);

  if (!nodbUtil.isSodaDocument(content)) {
    content = Buffer.from(JSON.stringify(content));
  }

  return await this._insertOneAndGet(content);
}


//-----------------------------------------------------------------------------
// createIndex()
//   Create an index on the collection.
//-----------------------------------------------------------------------------
async function createIndex(spec) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(nodbUtil.isObject(spec), 'NJS-005', 1);
  return await this._createIndex(JSON.stringify(spec));
}


//-----------------------------------------------------------------------------
// dropIndex()
//   Drop an index on the collection.
//-----------------------------------------------------------------------------
async function dropIndex(indexName, a2) {
  let options = {};

  nodbUtil.checkArgCount(arguments, 1, 2);
  nodbUtil.assert(typeof indexName === 'string', 'NJS-005', 1);
  if (arguments.length == 2) {
    nodbUtil.assert(typeof a2 === 'object', 'NJS-005', 2);
    options = a2;
  }

  return await this._dropIndex(indexName, options);
}


//-----------------------------------------------------------------------------
// getDataGuide()
//   Return the data guide for the collection.
//-----------------------------------------------------------------------------
async function getDataGuide() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  return await this._getDataGuide();
}


//-----------------------------------------------------------------------------
// save()
//   Saves a single document into the collection.
//-----------------------------------------------------------------------------
async function save(content) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(nodbUtil.isObject(content) ||
      nodbUtil.isSodaDocument(content), 'NJS-005', 1);

  if (!nodbUtil.isSodaDocument(content)) {
    content = Buffer.from(JSON.stringify(content));
  }

  await this._save(content);
}


//-----------------------------------------------------------------------------
// saveAndGet()
//   Saves a single document into the collection and returns a result
// document containing metadata.
//-----------------------------------------------------------------------------
async function saveAndGet(content) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(nodbUtil.isObject(content) ||
      nodbUtil.isSodaDocument(content), 'NJS-005', 1);

  if (!nodbUtil.isSodaDocument(content)) {
    content = Buffer.from(JSON.stringify(content));
  }

  return await this._saveAndGet(content);
}


//-----------------------------------------------------------------------------
// truncate()
//   Remove all of the documents from a collection.
//-----------------------------------------------------------------------------
async function truncate() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  await this._truncate();
}


class SodaCollection {

  _extend() {
    this.createIndex = nodbUtil.callbackify(createIndex);
    this.drop = nodbUtil.callbackify(drop);
    this.dropIndex = nodbUtil.callbackify(dropIndex);
    this.getDataGuide = nodbUtil.callbackify(getDataGuide);
    this.insertMany = nodbUtil.callbackify(insertMany);
    this.insertManyAndGet = nodbUtil.callbackify(insertManyAndGet);
    this.insertOne = nodbUtil.callbackify(insertOne);
    this.insertOneAndGet = nodbUtil.callbackify(insertOneAndGet);
    this.save = nodbUtil.callbackify(save);
    this.saveAndGet = nodbUtil.callbackify(saveAndGet);
    this.truncate = nodbUtil.callbackify(truncate);
  }

  find() {
    nodbUtil.checkArgCount(arguments, 0, 0);
    return this._find();
  }

  get metaData() {
    return JSON.parse(this._metaData);
  }

}

module.exports = SodaCollection;

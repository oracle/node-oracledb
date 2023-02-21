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

class SodaCollection {

  _getConnection() {
    return this._database._connection;
  }

  find() {
    errors.assertArgCount(arguments, 0, 0);
    return this._find();
  }

  get metaData() {
    return JSON.parse(this._metaData);
  }

  //---------------------------------------------------------------------------
  // createIndex()
  //
  // Create an index on the collection.
  //---------------------------------------------------------------------------
  async createIndex(spec) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(nodbUtil.isObject(spec), 1);
    return await this._createIndex(JSON.stringify(spec));
  }

  //---------------------------------------------------------------------------
  // drop()
  //
  // Drop the collection.
  //---------------------------------------------------------------------------
  async drop() {
    errors.assertArgCount(arguments, 0, 0);
    return await this._drop();
  }

  //---------------------------------------------------------------------------
  // dropIndex()
  //
  // Drop an index on the collection.
  //---------------------------------------------------------------------------
  async dropIndex(indexName, a2) {
    let options = {};

    errors.assertArgCount(arguments, 1, 2);
    errors.assertParamValue(typeof indexName === 'string', 1);
    if (arguments.length == 2) {
      errors.assertParamValue(typeof a2 === 'object', 2);
      options = a2;
    }

    return await this._dropIndex(indexName, options);
  }

  //---------------------------------------------------------------------------
  // getDataGuide()
  //   Return the data guide for the collection.
  //---------------------------------------------------------------------------
  async getDataGuide() {
    errors.assertArgCount(arguments, 0, 0);
    return await this._getDataGuide();
  }

  //---------------------------------------------------------------------------
  // insertMany()
  //
  // Insert an array of documents into the collection in a single round-trip.
  //---------------------------------------------------------------------------
  async insertMany(docs) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Array.isArray(docs) && docs.length > 0, 1);

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

  //---------------------------------------------------------------------------
  // insertManyAndGet()
  //
  // Insert an array of documents into the collection in a single round-trip
  // and return a set of result documents containing metadata.
  //---------------------------------------------------------------------------
  async insertManyAndGet(docs, a2) {
    let options = {};

    errors.assertArgCount(arguments, 1, 2);
    errors.assertParamValue(Array.isArray(docs) && docs.length > 0, 1);

    if (arguments.length == 2) {
      errors.assertParamValue(nodbUtil.isObject(a2), 2);
      options = a2;
    }

    let actualDocs = Array(docs.length);
    for (let i = 0; i < docs.length; i++) {
      let content = docs[i];
      if (!nodbUtil.isSodaDocument(content)) {
        content = Buffer.from(JSON.stringify(content));
      }
      actualDocs[i] = content;
    }

    return await this._insertManyAndGet(actualDocs, options);
  }

  //---------------------------------------------------------------------------
  // insertOne()
  //
  // Inserts a single document into the collection.
  //---------------------------------------------------------------------------
  async insertOne(content) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(nodbUtil.isObject(content) ||
        nodbUtil.isSodaDocument(content), 1);

    if (!nodbUtil.isSodaDocument(content)) {
      content = Buffer.from(JSON.stringify(content));
    }

    await this._insertOne(content);
  }

  //---------------------------------------------------------------------------
  // insertOneAndGet()
  //
  // Inserts a single document into the collection and returns a result
  // document containing metadata.
  //---------------------------------------------------------------------------
  async insertOneAndGet(content, a2) {
    let options = {};

    errors.assertArgCount(arguments, 1, 2);
    errors.assertParamValue(nodbUtil.isObject(content) ||
        nodbUtil.isSodaDocument(content), 1);

    if (arguments.length == 2) {
      errors.assertParamValue(nodbUtil.isObject(a2), 2);
      options = a2;
    }

    if (!nodbUtil.isSodaDocument(content)) {
      content = Buffer.from(JSON.stringify(content));
    }

    return await this._insertOneAndGet(content, options);
  }

  //---------------------------------------------------------------------------
  // save()
  //
  // Saves a single document into the collection.
  //---------------------------------------------------------------------------
  async save(content) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(nodbUtil.isObject(content) ||
        nodbUtil.isSodaDocument(content), 1);

    if (!nodbUtil.isSodaDocument(content)) {
      content = Buffer.from(JSON.stringify(content));
    }

    await this._save(content);
  }

  //---------------------------------------------------------------------------
  // saveAndGet()
  //
  // Saves a single document into the collection and returns a result document
  // containing metadata.
  //---------------------------------------------------------------------------
  async saveAndGet(content, a2) {
    let options = {};

    errors.assertArgCount(arguments, 1, 2);
    errors.assertParamValue(nodbUtil.isObject(content) ||
        nodbUtil.isSodaDocument(content), 1);

    if (arguments.length == 2) {
      errors.assertParamValue(nodbUtil.isObject(a2), 2);
      options = a2;
    }

    if (!nodbUtil.isSodaDocument(content)) {
      content = Buffer.from(JSON.stringify(content));
    }

    return await this._saveAndGet(content, options);
  }

  //---------------------------------------------------------------------------
  // truncate()
  //
  // Remove all of the documents from a collection.
  //---------------------------------------------------------------------------
  async truncate() {
    errors.assertArgCount(arguments, 0, 0);
    await this._truncate();
  }

}

nodbUtil.wrap_fns(SodaCollection.prototype,
  "createIndex",
  "drop",
  "dropIndex",
  "getDataGuide",
  "insertMany",
  "insertManyAndGet",
  "insertOne",
  "insertOneAndGet",
  "save",
  "saveAndGet",
  "truncate");

module.exports = SodaCollection;

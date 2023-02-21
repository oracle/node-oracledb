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

const SodaCollection = require('./sodaCollection.js');
const SodaDocument = require('./sodaDocument.js');
const errors = require('./errors.js');
const nodbUtil = require('./util.js');

class SodaDatabase {

  _getConnection() {
    return this._connection;
  }

  //---------------------------------------------------------------------------
  // createCollection()
  //
  // Creates a SODA collection.
  //---------------------------------------------------------------------------
  async createCollection(name, a2) {
    let options = {};

    errors.assertArgCount(arguments, 1, 2);
    errors.assertParamValue(typeof name === 'string', 1);

    if (arguments.length == 2) {
      errors.assertParamValue(nodbUtil.isObject(a2), 2);
      options = a2;
      if (options.metaData) {
        errors.assertParamPropValue(nodbUtil.isObject(options.metaData), 2,
          "metaData");
        options.metaData = JSON.stringify(options.metaData);
      }
    }

    const coll = new SodaCollection();
    coll._impl = await this._impl.createCollection(name, options);
    return coll;
  }

  //---------------------------------------------------------------------------
  // createDocument()
  //
  // Creates a SODA document.
  //---------------------------------------------------------------------------
  createDocument(content, a2) {
    let options = {};

    errors.assertArgCount(arguments, 1, 2);
    errors.assertParamValue(Buffer.isBuffer(content) ||
        typeof content === 'string' || nodbUtil.isObject(content), 1);
    if (arguments.length > 1) {
      errors.assertParamValue(nodbUtil.isObject(a2), 2);
      options = a2;
    }

    if (typeof content === 'string') {
      content = Buffer.from(content);
    } else if (nodbUtil.isObject(content)) {
      content = Buffer.from(JSON.stringify(content));
    }

    const doc = new SodaDocument();
    doc._impl = this._impl.createDocument(content, options);
    return doc;
  }

  //---------------------------------------------------------------------------
  // getCollectionNames()
  //
  // Return an array of the names of the collections in the database.
  //---------------------------------------------------------------------------
  async getCollectionNames(a1) {
    let options = {};

    errors.assertArgCount(arguments, 0, 1);
    if (arguments.length == 1) {
      errors.assertParamValue(nodbUtil.isObject(a1), 1);
      options = a1;
    }
    return await this._impl.getCollectionNames(options);
  }

  //---------------------------------------------------------------------------
  // openCollection()
  //
  // Open an existing SODA collection and return it to the caller.
  //---------------------------------------------------------------------------
  async openCollection(name) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof name === 'string', 1);
    const collImpl = await this._impl.openCollection(name);
    if (collImpl) {
      const coll = new SodaCollection();
      coll._impl = collImpl;
      return coll;
    }
  }

}

nodbUtil.wrap_fns(SodaDatabase.prototype,
  "createCollection",
  "getCollectionNames",
  "openCollection");

module.exports = SodaDatabase;

// Copyright (c) 2018, 2021, Oracle and/or its affiliates. All rights reserved

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
// createCollection()
//   Creates a SODA collection.
//-----------------------------------------------------------------------------
async function createCollection(name, a2) {
  let options = {};

  nodbUtil.checkArgCount(arguments, 1, 2);
  nodbUtil.assert(typeof name === 'string', 'NJS-005', 1);

  if (arguments.length == 2) {
    nodbUtil.assert(nodbUtil.isObject(a2), 'NJS-005', 2);
    options = a2;
    if (options.metaData) {
      if (!nodbUtil.isObject(options.metaData)) {
        throw new Error(nodbUtil.getErrorMessage('NJS-005', 2));
      }
      options.metaData = JSON.stringify(options.metaData);
    }
  }

  return await this._createCollection(name, options);
}


//-----------------------------------------------------------------------------
// openCollection()
//   Open an existing SODA collection and return it to the caller.
//-----------------------------------------------------------------------------
async function openCollection(name) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(typeof name === 'string', 'NJS-005', 1);
  return await this._openCollection(name);
}


//-----------------------------------------------------------------------------
// getCollectionNames()
//   Return an array of the names of the collections in the database.
//-----------------------------------------------------------------------------
async function getCollectionNames(a1) {
  let options = {};

  nodbUtil.checkArgCount(arguments, 0, 1);
  if (arguments.length == 1) {
    nodbUtil.assert(nodbUtil.isObject(a1), 'NJS-005', 1);
    options = a1;
  }
  return await this._getCollectionNames(options);
}


class SodaDatabase {

  _extend() {
    this.createCollection = nodbUtil.callbackify(nodbUtil.serialize(createCollection));
    this.getCollectionNames = nodbUtil.callbackify(nodbUtil.serialize(getCollectionNames));
    this.openCollection = nodbUtil.callbackify(nodbUtil.serialize(openCollection));
  }

  _getConnection() {
    return this._connection;
  }

  // To create a SODA document object based content and (optional) other fields
  createDocument(content, a2) {
    let options = {};

    nodbUtil.checkArgCount(arguments, 1, 2);
    nodbUtil.assert(Buffer.isBuffer(content) || typeof content === 'string' ||
        nodbUtil.isObject(content), 'NJS-005', 1);
    if (arguments.length > 1) {
      nodbUtil.assert(nodbUtil.isObject(a2), 'NJS-005', 2);
      options = a2;
    }

    if (typeof content === 'string') {
      content = Buffer.from(content);
    } else if (nodbUtil.isObject(content)) {
      content = Buffer.from(JSON.stringify(content));
    }

    return this._createDocument(content, options);
  }

}


module.exports = SodaDatabase;

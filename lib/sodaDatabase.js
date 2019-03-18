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

// To create a SODA collection object
function createCollection(name, a2, a3) {
  let options = {};
  let createCollCb;

  nodbUtil.assert(arguments.length >= 2 && arguments.length <= 3, 'NJS-009');
  nodbUtil.assert(typeof name === 'string', 'NJS-005', 1);

  switch (arguments.length) {
    case 2:
      nodbUtil.assert(typeof a2 === 'function', 'NJS-005', 2);
      createCollCb = a2;
      break;
    case 3:
      nodbUtil.assert(nodbUtil.isObject(a2), 'NJS-005', 2);
      nodbUtil.assert(typeof a3 === 'function', 'NJS-005', 3);
      options = a2;
      createCollCb = a3;
      if (options.metaData) {
        if (!nodbUtil.isObject(options.metaData)) {
          createCollCb(Error(nodbUtil.getErrorMessage('NJS-005', 2)));
          return;
        }
        options.metaData = JSON.stringify(options.metaData);
      }
      break;
  }

  this._createCollection(name, options, createCollCb);
}


// To open a collection using given name
// if the collection does not exist, undefined is returned
function openCollection(name, openCollCb) {
  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(typeof name === 'string', 'NJS-005', 1);
  nodbUtil.assert(typeof openCollCb === 'function', 'NJS-005', 2);

  this._openCollection(name, openCollCb);
}


// To obtain a list of collection names.
function getCollectionNames(a1, a2) {
  let options = {};
  let getCollNamesCb;

  nodbUtil.assert(arguments.length >= 1 && arguments.length <= 2, 'NJS-009');

  switch(arguments.length) {
    case 1:
      nodbUtil.assert(typeof a1 === 'function', 'NJS-005', 1);
      getCollNamesCb = a1;
      break;
    case 2:
      nodbUtil.assert(nodbUtil.isObject(a1), 'NJS-005', 1);
      nodbUtil.assert(typeof a2 === 'function', 'NJS-005', 2);
      options = a1;
      getCollNamesCb = a2;
      break;
  }

  this._getCollectionNames(options, getCollNamesCb);
}




class SodaDatabase {

  _extend(oracledb) {
    this.createCollection = nodbUtil.promisify(oracledb, createCollection);
    this.getCollectionNames = nodbUtil.promisify(oracledb, getCollectionNames);
    this.openCollection = nodbUtil.promisify(oracledb, openCollection);
  }

  // To create a SODA document object based content and (optional) other fields
  createDocument(content, a2) {
    let options = {};

    nodbUtil.assert(arguments.length >= 1 && arguments.length <= 2, 'NJS-009');
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

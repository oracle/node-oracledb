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
const sodaCollection = require('./sodaCollection.js');
const sodaDocument = require('./sodaDocument.js');

var createCollectionPromisified;
var openCollectionPromisified;
var getCollectionNamesPromisified;


// To create a SODA collection object
function createCollection(name, a2, a3) {
  var self = this;
  var options = {};
  var createCollCb;

  nodbUtil.assert(arguments.length >= 2 && arguments.length <= 3, 'NJS-009');
  nodbUtil.assert(typeof name === 'string', 'NJS-006', 1);

  switch (arguments.length) {
    case 2:
      nodbUtil.assert(typeof a2 === 'function', 'NJS-006', 2);
      createCollCb = a2;
      break;
    case 3:
      nodbUtil.assert(nodbUtil.isObject(a2), 'NJS-006', 2);
      nodbUtil.assert(typeof a3 === 'function', 'NJS-006', 3);
      options = a2;
      createCollCb = a3;
      if (options.metaData) {
        if (!nodbUtil.isObject(options.metaData)) {
          createCollCb(Error(nodbUtil.getErrorMessage('NJS-006', 2)));
          return;
        }
        options.metaData = JSON.stringify(options.metaData);
      }
      break;
  }

  self._createCollection.call(self, name, options, function(err, coll) {
    if (err) {
      createCollCb(err);
      return;
    }
    sodaCollection.extend(coll, self._oracledb);
    createCollCb(null, coll);
  });
}

createCollectionPromisified = nodbUtil.promisify(createCollection);


// To open a collection using given name
// if the collection does not exist, undefined is returned
function openCollection(name, openCollCb) {
  var self = this;

  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(typeof name === 'string', 'NJS-006', 1);
  nodbUtil.assert(typeof openCollCb === 'function', 'NJS-006', 2);

  self._openCollection.call(self, name, function (err, coll) {
    if (coll) {
      sodaCollection.extend(coll, self._oracledb);
    }
    openCollCb(err, coll);
  });
}

openCollectionPromisified = nodbUtil.promisify(openCollection);


// To obtain a list of collection names.
function getCollectionNames(a1, a2) {
  var self = this;
  var options = {};
  var getCollNamesCb;

  nodbUtil.assert(arguments.length >= 1 && arguments.length <= 2, 'NJS-009');

  switch(arguments.length) {
    case 1:
      nodbUtil.assert(typeof a1 === 'function', 'NJS-006', 1);
      getCollNamesCb = a1;
      break;
    case 2:
      nodbUtil.assert(nodbUtil.isObject(a1), 'NJS-006', 1);
      nodbUtil.assert(typeof a2 === 'function', 'NJS-006', 2);
      options = a1;
      getCollNamesCb = a2;
      break;
  }

  self._getCollectionNames.call(self, options, getCollNamesCb);
}

getCollectionNamesPromisified = nodbUtil.promisify(getCollectionNames);


// To create a SODA document object based content and (optional) other fields
function createDocument(content, a2) {
  var self = this;
  var options = {};

  nodbUtil.assert(arguments.length >= 1 && arguments.length <= 2, 'NJS-009');
  nodbUtil.assert(Buffer.isBuffer(content) || typeof content === 'string' ||
      nodbUtil.isObject(content), 'NJS-006', 1);
  if (arguments.length > 1) {
    nodbUtil.assert(nodbUtil.isObject(a2), 'NJS-006', 2);
    options = a2;
  }

  if (typeof content === 'string') {
    content = Buffer.from(content);
  } else if (nodbUtil.isObject(content)) {
    content = Buffer.from(JSON.stringify(content));
  }

  var doc = self._createDocument(content, options);
  sodaDocument.extend(doc);
  return doc;
}


// The extend method is used to extend the soda instance from C Layer with
// custom properties and method overrides.  References to the original methods
// are maintained so they can be invoked by the overriding method at the
// right time
function extend(db, conn) {
  // Using Object.defineProperties to add properties to the soda instance with
  // special properties.
  Object.defineProperties (
    db,
    {
      _oracledb: {  // storing a reference to the base instance to avoid circular
        // references with require
        value: conn._oracledb
      },
      _createCollection: {
        value: db.createCollection
      },
      _openCollection: {
        value: db.openCollection
      },
      _getCollectionNames: {
        value: db.getCollectionNames
      },
      _createDocument: {
        value: db.createDocument
      },
      createCollection: {
        value:  createCollectionPromisified,
        enumerable: true,
        writable: true
      },
      openCollection: {
        value: openCollectionPromisified,
        enumerable: true,
        writable: true
      },
      getCollectionNames:  {
        value: getCollectionNamesPromisified,
        enumerable: true,
        writable: true
      },
      createDocument: {
        value: createDocument,
        enumerable: true,
        writable: true
      }
    }
  );
}

module.exports.extend = extend;

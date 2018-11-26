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
const sodaDocument = require('./sodaDocument.js');
const sodaOperation = require('./sodaOperation.js');

var dropCollectionPromisified;
var insertOnePromisified;
var insertOneAndGetPromisified;
var createIndexPromisified;
var dropIndexPromisified;
var getDataGuidePromisified;


// To drop the collection
function drop(cb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof cb === 'function', 'NJS-006', 1);

  self._drop(cb);
}

dropCollectionPromisified = nodbUtil.promisify(drop);


// To insert a given document to the current collection
function insertOne(content, cb) {
  var self = this;

  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(nodbUtil.isObject(content) ||
      nodbUtil.isSodaDocument(content), 'NJS-006', 1);
  nodbUtil.assert(typeof cb === 'function', 'NJS-006', 2);

  if (!nodbUtil.isSodaDocument(content)) {
    content = Buffer.from(JSON.stringify(content));
  }

  self._insertOne(content, cb);
}

insertOnePromisified = nodbUtil.promisify(insertOne);


// To insert a given document into the current collection and return the
// metadata of the new document (result-document)
function insertOneAndGet(content, cb) {
  var self = this;

  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(nodbUtil.isObject(content) ||
      nodbUtil.isSodaDocument(content), 'NJS-006', 1);
  nodbUtil.assert(typeof cb === 'function', 'NJS-006', 2);

  if (!nodbUtil.isSodaDocument(content)) {
    content = Buffer.from(JSON.stringify(content));
  }

  self._insertOneAndGet(content, function(err, doc) {
    if (doc) {
      sodaDocument.extend(doc);
    }
    cb(err, doc);
  });
}

insertOneAndGetPromisified = nodbUtil.promisify(insertOneAndGet);


// To create an index on documens
function createIndex(spec, cb) {
  var self = this;

  nodbUtil.assert(arguments.length === 2, 'NJS-009', 1);
  nodbUtil.assert(nodbUtil.isObject(spec), 'NJS-006', 1);
  nodbUtil.assert(typeof cb === 'function', 'NJS-006', 2);

  self._createIndex(JSON.stringify(spec), cb);
}

createIndexPromisified = nodbUtil.promisify(createIndex);


// To drop an index from document-collection
function dropIndex(indexName, a2, a3) {
  var self = this;
  var options = {};
  var dropIndexCb;

  nodbUtil.assert(arguments.length >= 2 && arguments.length <= 3, 'NJS-009');
  nodbUtil.assert(typeof indexName === 'string', 'NJS-006', 1);

  switch (arguments.length) {
    case 2:
      nodbUtil.assert(typeof a2 === 'function', 'NJS-006', 2);
      dropIndexCb = a2;
      break;
    case 3:
      nodbUtil.assert(typeof a2 === 'object', 'NJS-006', 2);
      nodbUtil.assert(typeof a3 === 'function', 'NJS-006', 3);
      options = a2;
      dropIndexCb = a3;
      break;
  }

  self._dropIndex(indexName, options, dropIndexCb);
}

dropIndexPromisified = nodbUtil.promisify(dropIndex);


// To obtain the dataGuide of the document collection
function getDataGuide(cb) {
  var self = this;

  nodbUtil.assert(typeof cb === 'function', 'NJS-009');

  self._getDataGuide(function(err, doc) {
    if (doc) {
      sodaDocument.extend(doc);
    }
    cb(err, doc);
  });
}

getDataGuidePromisified = nodbUtil.promisify(getDataGuide);


// Creates an instance of sodaOperation object which supports
// terminal/non-terminal functions for find operation.
function find() {
  var self = this;

  var op = self._find();
  sodaOperation.extend(op, self._oracledb);

  return op;
}


// The extend method is used to extend the collection instance from C Layer
// with custom properties and method overrides.  References to the original
// methods are maintained so they can be invoked by the overriding method at
// the right time
function extend(coll, oracledb) {
  // Using Object.defineProperties to add properties to the soda instance with
  // special properties.
  Object.defineProperties (
    coll,
    {
      _oracledb: {
        value: oracledb
      },
      _drop: {
        value: coll.drop
      },
      drop: {
        value: dropCollectionPromisified,
        enumerable: true,
        writable: true
      },
      _insertOne: {
        value: coll.insertOne
      },
      insertOne: {
        value: insertOnePromisified,
        enumerable: true,
        writable: true
      },
      _insertOneAndGet: {
        value: coll.insertOneAndGet
      },
      insertOneAndGet: {
        value: insertOneAndGetPromisified,
        enumerable: true,
        writable: true
      },
      _createIndex:  {
        value: coll.createIndex
      },
      createIndex: {
        value: createIndexPromisified,
        enumerable: true,
        writable: true
      },
      _dropIndex :  {
        value: coll.dropIndex
      },
      dropIndex: {
        value: dropIndexPromisified,
        enumerable: true,
        writable: true
      },
      _getDataGuide: {
        value: coll.getDataGuide
      },
      getDataGuide: {
        value: getDataGuidePromisified,
        enumerable: true,
        writable: true
      },
      _find: {
        value: coll.find
      },
      find: {
        value: find,
        enumerable: true,
        writable: true
      }
    }
  );
}

module.exports.extend = extend;

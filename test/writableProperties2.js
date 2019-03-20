/* Copyright (c) 2019, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
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
 * NAME
 *   186. instanceof2.js
 *
 * DESCRIPTION
 *   The instanceof checks for SODA classes.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('189. writableProperties2.js', function() {

  let conn, sodaDocument, sodaDB, sodaCollection, sodaOperation, sodaCursor;

  before(async function() {
    const runnable = await testsUtil.checkPrerequisites();
    if (!runnable) {
      this.skip();
      return;
    }
    await sodaUtil.cleanup();

    try {
      conn = await oracledb.getConnection(dbConfig);
      sodaDB = conn.getSodaDatabase();
      sodaDocument = sodaDB.createDocument({name: "Chris", city: "Melbourne"});
      sodaCollection = await sodaDB.createCollection("node_test_186_1");
      sodaOperation = sodaCollection.find();
      sodaCursor = await sodaOperation.getCursor();
    } catch (err) {
      should.not.exist(err);
    }
  });

  after(async function() {
    if (sodaCursor) {
      try {
        await sodaCursor.close();
      } catch(err) {
        should.not.exist(err);
      }
    }
    if (sodaCollection) {
      try {
        await sodaCollection.drop();
      } catch(err) {
        should.not.exist(err);
      }
    }
    if (conn) {
      try {
        await conn.close();
      } catch(err) {
        should.not.exist(err);
      }
    }
  })

  it('189.1 Allows overwriting of public methods on SodaDatabase instance', async function() {
    try {
      let keys = Object.keys(sodaDB);
      for (let keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
        if (typeof sodaDB[keys[keysIdx]] === 'function') {
          let originalFunction = sodaDB[keys[keysIdx]];
          sodaDB[keys[keysIdx]] = function() {};
          sodaDB[keys[keysIdx]] = originalFunction;
        }
      }
    } catch (err) {
      should.not.exist(err);
    }
  });

  it('189.2 Allows overwriting of public methods on SodaDocument instance', async function() {
    try {
      let keys = Object.keys(sodaDocument);
      for (let keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
        if (typeof sodaDocument[keys[keysIdx]] === 'function') {
          let originalFunction = sodaDocument[keys[keysIdx]];
          sodaDocument[keys[keysIdx]] = function() {};
          sodaDocument[keys[keysIdx]] = originalFunction;
        }
      }
    } catch (err) {
      should.not.exist(err);
    }
  });

  it('189.3 Allows overwriting of public methods on SodaCollection instance', async function() {
    try {
      let keys = Object.keys(sodaCollection);
      for (let keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
        if (typeof sodaCollection[keys[keysIdx]] === 'function') {
          let originalFunction = sodaCollection[keys[keysIdx]];
          sodaCollection[keys[keysIdx]] = function() {};
          sodaCollection[keys[keysIdx]] = originalFunction;
        }
      }
    } catch (err) {
      should.not.exist(err);
    }
  });

  it('189.4 Allows overwriting of public methods on SodaOperation instance', async function() {
    try {
      let keys = Object.keys(sodaOperation);
      for (let keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
        if (typeof sodaOperation[keys[keysIdx]] === 'function') {
          let originalFunction = sodaOperation[keys[keysIdx]];
          sodaOperation[keys[keysIdx]] = function() {};
          sodaOperation[keys[keysIdx]] = originalFunction;
        }
      }
    } catch (err) {
      should.not.exist(err);
    }
  });

  it('189.5 Allows overwriting of public methods on SodaDocCursor instance', async function() {
    try {
      let keys = Object.keys(sodaCursor);
      for (let keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
        if (typeof sodaCursor[keys[keysIdx]] === 'function') {
          let originalFunction = sodaCursor[keys[keysIdx]];
          sodaCursor[keys[keysIdx]] = function() {};
          sodaCursor[keys[keysIdx]] = originalFunction;
        }
      }
    } catch (err) {
      should.not.exist(err);
    }
  });

});
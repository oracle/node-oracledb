/* Copyright (c) 2019, 2023, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   189. sodaOverwrite.js
 *
 * DESCRIPTION
 *   Test overwriting of public methods on SodaDatabase instance
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('189. sodaOverwrite.js', function() {

  let conn, sodaDocument, sodaDB, sodaCollection, sodaOperation, sodaCursor;

  before(async function() {

    const isSodaRunnable = await testsUtil.isSodaRunnable();

    const clientVersion = testsUtil.getClientVersion();
    let isClientOK;
    if (clientVersion < 2000000000) {
      isClientOK = false;
    } else {
      isClientOK = true;
    }

    const isRunnable = isClientOK && isSodaRunnable;
    if (!isRunnable) {
      this.skip();
    }

    await sodaUtil.cleanup();

    conn = await oracledb.getConnection(dbConfig);
    sodaDB = conn.getSodaDatabase();
    sodaDocument = sodaDB.createDocument({name: "Chris", city: "Melbourne"});
    sodaCollection = await sodaDB.createCollection("node_test_186_1");
    sodaOperation = sodaCollection.find();
    sodaCursor = await sodaOperation.getCursor();
  });

  after(async function() {
    if (sodaCursor) {
      await sodaCursor.close();
    }
    if (sodaCollection) {
      await sodaCollection.drop();
    }
    if (conn) {
      await conn.close();
    }
  });

  it('189.1 Allows overwriting of public methods on SodaDatabase instance', function() {
    const keys = Object.keys(sodaDB);
    for (let keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
      if (typeof sodaDB[keys[keysIdx]] === 'function') {
        const originalFunction = sodaDB[keys[keysIdx]];
        sodaDB[keys[keysIdx]] = function() {};
        sodaDB[keys[keysIdx]] = originalFunction;
      }
    }
  });

  it('189.2 Allows overwriting of public methods on SodaDocument instance', function() {
    const keys = Object.keys(sodaDocument);
    for (let keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
      if (typeof sodaDocument[keys[keysIdx]] === 'function') {
        const originalFunction = sodaDocument[keys[keysIdx]];
        sodaDocument[keys[keysIdx]] = function() {};
        sodaDocument[keys[keysIdx]] = originalFunction;
      }
    }
  });

  it('189.3 Allows overwriting of public methods on SodaCollection instance', function() {
    const keys = Object.keys(sodaCollection);
    for (let keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
      if (typeof sodaCollection[keys[keysIdx]] === 'function') {
        const originalFunction = sodaCollection[keys[keysIdx]];
        sodaCollection[keys[keysIdx]] = function() {};
        sodaCollection[keys[keysIdx]] = originalFunction;
      }
    }
  });

  it('189.4 Allows overwriting of public methods on SodaOperation instance', function() {
    const keys = Object.keys(sodaOperation);
    for (let keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
      if (typeof sodaOperation[keys[keysIdx]] === 'function') {
        const originalFunction = sodaOperation[keys[keysIdx]];
        sodaOperation[keys[keysIdx]] = function() {};
        sodaOperation[keys[keysIdx]] = originalFunction;
      }
    }
  });

  it('189.5 Allows overwriting of public methods on SodaDocCursor instance', function() {
    const keys = Object.keys(sodaCursor);
    for (let keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
      if (typeof sodaCursor[keys[keysIdx]] === 'function') {
        const originalFunction = sodaCursor[keys[keysIdx]];
        sodaCursor[keys[keysIdx]] = function() {};
        sodaCursor[keys[keysIdx]] = originalFunction;
      }
    }
  });

});

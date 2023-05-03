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
 *   186. sodaInstanceof.js
 *
 * DESCRIPTION
 *   The instanceof checks for SODA classes.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('186. sodaInstanceof.js', function() {

  before(async function() {
    let isSodaRunnable = await testsUtil.isSodaRunnable();

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
  });

  it('186.1 instanceof checks for SODA classes', async function() {
    let conn, coll, cursor;

    conn = await oracledb.getConnection(dbConfig);

    let sodaDB = conn.getSodaDatabase();
    assert(sodaDB instanceof oracledb.SodaDatabase);

    let doc = sodaDB.createDocument({name: "Chris", city: "Melbourne"});
    assert(doc instanceof oracledb.SodaDocument);

    coll = await sodaDB.createCollection("node_test_186_1");
    assert(coll instanceof oracledb.SodaCollection);

    let operation = coll.find();
    assert(operation instanceof oracledb.SodaOperation);

    cursor = await operation.getCursor();
    assert(cursor instanceof oracledb.SodaDocCursor);

    if (cursor) {
      await cursor.close();
    }
    if (coll) {
      await coll.drop();
    }
    if (conn) {
      await conn.close();
    }
  });

});

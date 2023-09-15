/* Copyright (c) 2020, 2023, Oracle and/or its affiliates. */

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
 *   287. sodaOperationsLock.js
 *
 * DESCRIPTION
 *  Test the fetch array size for fetching documents from a collection.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');


describe('287. sodaOperationsLock.js', () => {
  let conn, soda, coll;

  const collectionName = 'nodb_collection_286_1';

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
    soda = conn.getSodaDatabase();
    coll = await soda.createCollection(collectionName);

    await conn.commit();
  });     // before

  after(async () => {
    if (conn) {
      ////const result = await coll.drop();
      ////assert.strictEqual(result.dropped, true);
      await conn.close();
    }
  });

  it('287.1 lock on sodaOperations', async() => {
       coll.find().lock();
  });
  

});

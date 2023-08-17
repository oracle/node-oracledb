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
 *   238. soda14.js
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

describe('238. soda14.js', () => {

  let conn, soda, coll;

  const collectionName = 'nodb_collection_14';
  const numRowsInBatch = 50;
  const numBatches = 10;
  const DocSize = numBatches * numRowsInBatch;

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

    // populate the collection with a number of rows
    for (let i = 0; i < numBatches; i++) {
      const docs = [];
      for (let j = 0; j < numRowsInBatch; j++) {
        await docs.push({fred: 5, george: 10});
      }
      await coll.insertMany(docs);
    }

    await conn.commit();
  }); // before()

  after(async () => {
    if (conn) {
      const result = await coll.drop();
      assert.strictEqual(result.dropped, true);

      await conn.close();
    }
  }); // after()

  it('238.1 the fetchArraySize() method works', async () => {
    const SIZE = 100;
    const docs = await coll.find().fetchArraySize(SIZE).getDocuments();
    assert.strictEqual(docs.length, DocSize);
  }); // 238.1

  it('238.2 fetchArraySize value is larger than the size of collection', async () => {
    const SIZE = 10000;
    const docs = await coll.find().fetchArraySize(SIZE).getDocuments();
    assert.strictEqual(docs.length, DocSize);
  }); // 238.2

  it('238.3 Negative - call fetchArraySize() without parameter', async () => {
    await assert.rejects(
      async () => {
        await coll.find().fetchArraySize().getDocuments();
      },
      /NJS-009:/
    );
  }); // 238.3

  it('238.4 fetchArraySize is 0', async () => {
    const SIZE = 0;
    const docs = await coll.find().fetchArraySize(SIZE).getDocuments();
    assert.strictEqual(docs.length, DocSize);
  }); // 238.4

  it('238.5 Negative - fetchArraySize is a negative value', async () => {
    const SIZE = -10;
    await assert.rejects(
      async () => {
        await coll.find().fetchArraySize(SIZE).getDocuments();
      },
      /NJS-005:/
    );
  }); // 238.5
});

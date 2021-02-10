/* Copyright (c) 2020, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
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
const should    = require('should');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('238. soda14.js', () => {

  let conn, soda, coll;

  const collectionName = 'nodb_collection_14';
  const numRowsInBatch = 50;
  const numBatches = 10;
  const DocSize = numBatches * numRowsInBatch;

  before(async function() {
    let isSodaRunnable = await testsUtil.isSodaRunnable();

    const clientVersion = oracledb.oracleClientVersion;
    let isClientOK;
    if (clientVersion < 2000000000) {
      isClientOK = false;
    } else {
      isClientOK = true;
    }

    const isRunnable = isClientOK && isSodaRunnable;
    if (!isRunnable) {
      this.skip();
      return;
    }

    await sodaUtil.cleanup();
    await sodaUtil.grantPrivilege();

    try {
      conn = await oracledb.getConnection(dbconfig);
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
    } catch (err) {
      should.not.exist(err);
    }
  }); // before()

  after(async () => {
    if (conn) {
      try {
        let result = await coll.drop();
        should.strictEqual(result.dropped, true);

        await conn.close();
      } catch (err) {
        should.not.exist(err);
      }
    }
  }); // after()

  it('238.1 the fetchArraySize() method works', async () => {
    try {
      const SIZE = 100;
      const docs = await coll.find().fetchArraySize(SIZE).getDocuments();

      should.strictEqual(docs.length, DocSize);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 238.1

  it('238.2 fetchArraySize value is larger than the size of collection', async () => {
    try {
      const SIZE = 10000;
      const docs = await coll.find().fetchArraySize(SIZE).getDocuments();

      should.strictEqual(docs.length, DocSize);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 238.2

  it('238.3 Negative - call fetchArraySize() without parameter', async () => {
    try {
      let docs;
      await assert.rejects(
        async () => {
          docs = await coll.find().fetchArraySize().getDocuments();
        },
        /NJS-009/
      );
      should.not.exist(docs);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 238.3

  it('238.4 fetchArraySize is 0', async () => {
    try {
      const SIZE = 0;
      const docs = await coll.find().fetchArraySize(SIZE).getDocuments();

      should.strictEqual(docs.length, DocSize);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 238.4

  it('238.5 Negative - fetchArraySize is a negative value', async () => {
    try {
      const SIZE = -10;
      let docs;
      await assert.rejects(
        async () => {
          docs = await coll.find().fetchArraySize(SIZE).getDocuments();
        },
        /NJS-007/
      );

      should.not.exist(docs);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 238.5
});
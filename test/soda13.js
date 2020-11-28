/* Copyright (c) 2020, Oracle and/or its affiliates. All rights reserved. */

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
 *   231. soda13.js
 *
 * DESCRIPTION
 *   Collection.truncate() method.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('231. soda13.js', () => {

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
  }); // before()

  it('231.1 example case', async () => {

    const TABLE = "soda_test_13_1";
    try {
      const conn = await oracledb.getConnection(dbconfig);
      const soda = conn.getSodaDatabase();
      const coll = await soda.createCollection(TABLE);

      // (1)
      await coll.insertOne({fred: 5, george: 6});
      await coll.insertOne({fred: 8, george: 9});
      const docs1 = await coll.find().getDocuments();
      should.strictEqual(docs1.length, 2);

      // (2)
      await coll.truncate();
      const docs2 = await coll.find().getDocuments();
      should.strictEqual(docs2.length, 0);

      await conn.commit();
      let res = await coll.drop();
      should.strictEqual(res.dropped, true);
      await conn.close();

    } catch (error) {
      should.not.exist(error);
    }
  }); // 231.1

  it('231.2 truncate multiple times', async () => {

    const TABLE = "soda_test_13_2";
    try {
      const conn = await oracledb.getConnection(dbconfig);
      const soda = conn.getSodaDatabase();
      const coll = await soda.createCollection(TABLE);

      await coll.insertOne({fred: 5, george: 6});
      await coll.insertOne({fred: 8, george: 9});
      await coll.truncate();
      await coll.truncate();
      const docs1 = await coll.find().getDocuments();
      should.strictEqual(docs1.length, 0);

      await coll.insertOne({fred: 1, george: 2});
      await coll.insertOne({fred: 3, george: 4});
      await coll.insertOne({fred: 5, george: 6});
      const docs2 = await coll.find().getDocuments();
      should.strictEqual(docs2.length, 3);

      await conn.commit();
      let res = await coll.drop();
      should.strictEqual(res.dropped, true);
      await conn.close();

    } catch (error) {
      should.not.exist(error);
    }
  }); // 231.2

  it('231.3 Negative -invalid parameters', async () => {

    const TABLE = "soda_test_13_3";
    try {
      const conn = await oracledb.getConnection(dbconfig);
      const soda = conn.getSodaDatabase();
      const coll = await soda.createCollection(TABLE);

      await coll.insertOne({fred: 1, george: 2});
      await coll.insertOne({fred: 3, george: 4});

      await assert.rejects(
        async () => {
          await coll.truncate("foobar");
        },
        /NJS-009/
      );

      await conn.commit();
      let res = await coll.drop();
      should.strictEqual(res.dropped, true);
      await conn.close();

    } catch (error) {
      should.not.exist(error);
    }
  }); // 231.3
});
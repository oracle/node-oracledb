/* Copyright (c) 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   257. sodahint.js
 *
 * DESCRIPTION
 *   Test Soda hints for insertOneAndGet() and saveAndGet() methods.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbconfig = require('./dbconfig.js');
const sodaUtil = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('257. sodahint.js', () => {

  let runnable;
  let conn, soda;

  before(async function() {

    // The SODA hint is available with Oracle Client 21.3 and
    // in 19 from 19.11
    if (oracledb.oracleClientVersion < 2103000000) {
      if (oracledb.oracleClientVersion < 1911000000 ||
          oracledb.oracleClientVersion >= 2000000000) {
        this.skip();
        return;
      }
    }
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
      return;
    } else {
      conn = await oracledb.getConnection(dbconfig);
      soda = conn.getSodaDatabase();
    }

    await sodaUtil.cleanup();

  }); // before()

  after(async function() {
    if (!runnable) {
      return;
    }
    try {
      await conn.close();
    } catch (err) {
      assert.fail(err);
    }
  }); // after()

  const inContent = { id: 1, name: "Paul",  office: "Singapore" };

  it('257.1 insertOneAndGet() with hint option', async () => {
    const COLL = "soda_test_257_1";
    const collection = await soda.createCollection(COLL);

    let inDocuments = soda.createDocument(inContent); // n.b. synchronous method

    let options = {hint: "MONITOR"};
    await collection.insertOneAndGet(inDocuments, options);

    // Fetch back
    let outDocuments = await collection.find().hint("MONITOR").getDocuments();
    let outContent = outDocuments[0].getContent();
    assert.deepEqual(outContent, inContent);
    await conn.commit();

    let res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 257.1

  it('257.2 Negative - insertOneAndGet() with invalid options parameter', async () => {
    const COLL = "soda_test_257_2";
    const collection = await soda.createCollection(COLL);

    let inDocuments = soda.createDocument(inContent); // n.b. synchronous method

    let options = 3;
    await testsUtil.assertThrowsAsync(
      async () => {
        await collection.insertOneAndGet(inDocuments, options);
      },
      /NJS-005/
    );

    await conn.commit();

    let res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 257.2

  it('257.3 saveAndGet() with hint option', async () => {
    const COLL = "soda_test_257_3";
    const collection = await soda.createCollection(COLL);

    let inDocuments = soda.createDocument(inContent); // n.b. synchronous method

    let options = {hint: "MONITOR"};
    await collection.saveAndGet(inDocuments, options);

    // Fetch back
    let outDocuments = await collection.find().hint("MONITOR").getDocuments();
    let outContent = outDocuments[0].getContent();
    assert.deepEqual(outContent, inContent);

    await conn.commit();

    let res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 257.3

  it('257.4 Negative - saveAndGet() with invalid options parameter', async () => {
    const COLL = "soda_test_257_4";
    const collection = await soda.createCollection(COLL);

    let inDocuments = soda.createDocument(inContent); // n.b. synchronous method

    let options = 3;
    await testsUtil.assertThrowsAsync(
      async () => {
        await collection.saveAndGet(inDocuments, options);
      },
      /NJS-005/
    );

    await conn.commit();

    let res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 257.4

});

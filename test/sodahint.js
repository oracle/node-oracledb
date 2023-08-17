/* Copyright (c) 2021, 2023, Oracle and/or its affiliates. */

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
 *   257. sodahint.js
 *
 * DESCRIPTION
 *   Test Soda hints for insertOneAndGet() and saveAndGet() methods.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');
const sodaUtil = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('257. sodahint.js', () => {

  let runnable;
  let conn, soda;

  before(async function() {

    // The SODA hint is available with Oracle Client 21.3 and
    // in 19 from 19.11
    const clientVersion = testsUtil.getClientVersion();
    if (clientVersion < 2103000000) {
      if (clientVersion < 1911000000 || clientVersion >= 2000000000) {
        this.skip();
      }
    }
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
    } else {
      conn = await oracledb.getConnection(dbConfig);
      soda = conn.getSodaDatabase();
    }

    await sodaUtil.cleanup();

  }); // before()

  after(async function() {
    if (!runnable) {
      return;
    }
    await conn.close();
  }); // after()

  const inContent = { id: 1, name: "Paul",  office: "Singapore" };

  it('257.1 insertOneAndGet() with hint option', async () => {
    const COLL = "soda_test_257_1";
    const collection = await soda.createCollection(COLL);

    const inDocuments = soda.createDocument(inContent); // n.b. synchronous method

    const options = {hint: "MONITOR"};
    await collection.insertOneAndGet(inDocuments, options);

    // Fetch back
    const outDocuments = await collection.find().hint("MONITOR").getDocuments();
    const outContent = outDocuments[0].getContent();
    assert.deepStrictEqual(outContent, inContent);
    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 257.1

  it('257.2 Negative - insertOneAndGet() with invalid options parameter', async () => {
    const COLL = "soda_test_257_2";
    const collection = await soda.createCollection(COLL);

    const inDocuments = soda.createDocument(inContent); // n.b. synchronous method

    const options = 3;
    await assert.rejects(
      async () => {
        await collection.insertOneAndGet(inDocuments, options);
      },
      /NJS-005/
    );

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 257.2

  it('257.3 saveAndGet() with hint option', async () => {
    const COLL = "soda_test_257_3";
    const collection = await soda.createCollection(COLL);

    const inDocuments = soda.createDocument(inContent); // n.b. synchronous method

    const options = {hint: "MONITOR"};
    await collection.saveAndGet(inDocuments, options);

    // Fetch back
    const outDocuments = await collection.find().hint("MONITOR").getDocuments();
    const outContent = outDocuments[0].getContent();
    assert.deepStrictEqual(outContent, inContent);

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 257.3

  it('257.4 Negative - saveAndGet() with invalid options parameter', async () => {
    const COLL = "soda_test_257_4";
    const collection = await soda.createCollection(COLL);

    const inDocuments = soda.createDocument(inContent); // n.b. synchronous method

    const options = 3;
    await assert.rejects(
      async () => {
        await collection.saveAndGet(inDocuments, options);
      },
      /NJS-005/
    );

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 257.4

});

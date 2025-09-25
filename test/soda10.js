/* Copyright (c) 2019, 2025, Oracle and/or its affiliates. */

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
 *   178. soda10.js
 *
 * DESCRIPTION
 *   Test Soda Bulk insertion methods.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert    = require('assert');
const dbConfig = require('./dbconfig.js');
const sodaUtil = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('178. soda10.js', function() {

  let runnable;
  let conn, soda;

  before(async function() {

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

  const inContents = [
    { id: 1, name: "Paul",  office: "Singapore" },
    { id: 2, name: "Emma",  office: "London" },
    { id: 3, name: "Kate",  office: "Edinburgh" },
    { id: 4, name: "Changjie",  office: "Shenzhen" }
  ];

  it('178.1 insertMany() with newSodaDocumentArray', async function() {
    const COLL = "soda_test_178_1";
    const collection = await soda.createCollection(COLL);

    const inDocuments = [];
    for (let i = 0; i < inContents.length; i++) {
      inDocuments[i] = soda.createDocument(inContents[i]); // n.b. synchronous method
    }

    await collection.insertMany(inDocuments);

    // Fetch back
    const outDocuments = await collection.find().getDocuments();
    const outContents = [];
    for (let i = 0; i < outDocuments.length; i++) {
      outContents[i] = testsUtil.removeID(outDocuments[i].getContent()); // n.b. synchronous method
    }

    assert.deepStrictEqual(outContents, inContents);

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 178.1

  it('178.2 insertMany() with newSodaDocumentContentArray', async function() {
    const COLL = "soda_test_178_2";
    const collection = await soda.createCollection(COLL);

    await collection.insertMany(inContents);

    // Fetch back
    const outDocuments = await collection.find().getDocuments();
    const outContents = [];
    for (let i = 0; i < outDocuments.length; i++) {
      outContents[i] = testsUtil.removeID(outDocuments[i].getContent()); // n.b. synchronous method
    }

    assert.deepStrictEqual(outContents, inContents);

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 178.2

  it('178.3 insertManyAndGet() with newDocumentArray', async function() {
    const COLL = "soda_test_178_3";
    const collection = await soda.createCollection(COLL);

    const inDocuments = [];
    for (let i = 0; i < inContents.length; i++) {
      inDocuments[i] = soda.createDocument(inContents[i]); // n.b. synchronous method
    }

    const middleDocuments = await collection.insertManyAndGet(inDocuments);
    const middleContents = [];
    for (let i = 0; i < middleDocuments.length; i++) {
      middleContents[i] = middleDocuments[i].getContent();
      assert(middleDocuments[i].key);
    }
    assert.deepStrictEqual(middleContents, [null, null, null, null]);

    // Fetch back
    const outDocuments = await collection.find().getDocuments();
    const outContents = [];
    for (let i = 0; i < outDocuments.length; i++) {
      outContents[i] = testsUtil.removeID(outDocuments[i].getContent()); // n.b. synchronous method
    }

    assert.deepStrictEqual(outContents, inContents);

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 178.3

  it('178.4 insertManyAndGet() with newDocumentContentArray', async function() {
    const COLL = "soda_test_178_4";
    const collection = await soda.createCollection(COLL);

    const middleDocuments = await collection.insertManyAndGet(inContents);
    const middleContents = [];
    for (let i = 0; i < middleDocuments.length; i++) {
      middleContents[i] = middleDocuments[i].getContent();
      assert(middleDocuments[i].key);
    }
    assert.deepStrictEqual(middleContents, [null, null, null, null]);

    // Fetch back
    const outDocuments = await collection.find().getDocuments();
    const outContents = [];
    for (let i = 0; i < outDocuments.length; i++) {
      outContents[i] = testsUtil.removeID(outDocuments[i].getContent()); // n.b. synchronous method
    }

    assert.deepStrictEqual(outContents, inContents);

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 178.4

  it('178.5 Negative - insertMany() with an empty array', async function() {
    const COLL = "soda_test_178_5";
    const collection = await soda.createCollection(COLL);

    await assert.rejects(
      async function() {
        await collection.insertMany([]);
      },
      /NJS-005/
    );

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 178.5

  it('178.6 Negative - insertManyAndGet() with an empty array', async function() {
    const COLL = "soda_test_178_6";
    const collection = await soda.createCollection(COLL);

    await assert.rejects(
      async function() {
        await collection.insertManyAndGet([]);
      },
      /NJS-005/
    );

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 178.6

  it('178.7 insertManyAndGet() with hint option', async function() {
    // The SODA hint is available with Oracle Client 21.3 and
    // in 19 from 19.11
    const clientVersion = testsUtil.getClientVersion();
    if (clientVersion < 2103000000) {
      if (clientVersion < 1911000000 || clientVersion >= 2000000000) {
        this.skip();
      }
    }
    const COLL = "soda_test_178_7";
    const collection = await soda.createCollection(COLL);

    const inDocuments = [];
    for (let i = 0; i < inContents.length; i++) {
      inDocuments[i] = soda.createDocument(inContents[i]); // n.b. synchronous method
    }

    const options = {hint: "MONITOR"};
    const middleDocuments = await collection.insertManyAndGet(inDocuments, options);
    const middleContents = [];
    for (let i = 0; i < middleDocuments.length; i++) {
      middleContents[i] = middleDocuments[i].getContent();
      assert(middleDocuments[i].key);
    }
    assert.deepStrictEqual(middleContents, [null, null, null, null]);

    // Fetch back
    const outDocuments = await collection.find().hint("MONITOR").getDocuments();
    const outContents = [];
    for (let i = 0; i < outDocuments.length; i++) {
      outContents[i] = testsUtil.removeID(outDocuments[i].getContent()); // n.b. synchronous method
    }

    assert.deepStrictEqual(outContents, inContents);

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 178.7

  it('178.8 Negative - insertManyAndGet() with invalid options parameter', async function() {
    const COLL = "soda_test_178_8";
    const collection = await soda.createCollection(COLL);

    const inDocuments = [];
    for (let i = 0; i < inContents.length; i++) {
      inDocuments[i] = soda.createDocument(inContents[i]); // n.b. synchronous method
    }

    const options = 3;
    await assert.rejects(
      async function() {
        await collection.insertManyAndGet(inDocuments, options);
      },
      /NJS-005/
    );

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 178.8

});

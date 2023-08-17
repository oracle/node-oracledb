/* Copyright (c) 2018, 2023, Oracle and/or its affiliates. */

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
 *   177. soda9.js
 *
 * DESCRIPTION
 *   sodaCollection Class
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert    = require('assert');
const dbConfig = require('./dbconfig.js');
const sodaUtil = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('177. soda9.js', () => {

  before(async function() {
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
    }

    await sodaUtil.cleanup();
  });

  it('177.1 insertOne() with a document content', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_177_1");
    const inContent = { id: 2000, name: "Paul",  office: "Singapore" };
    await collection.insertOne(inContent);

    // fetch back
    const outDocuments = await collection.find().getDocuments();
    const outContent = outDocuments[0].getContent();
    testsUtil.removeID(outContent);
    testsUtil.removeID(inContent);
    assert.deepStrictEqual(outContent, inContent);

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 177.1

  it('177.2 insertOne() with a document', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_177_2");
    const inContent = { id: 2000, name: "Paul",  office: "Singapore" };
    const inDocument = soda.createDocument(inContent);
    await collection.insertOne(inDocument);

    // fetch back
    const outDocuments = await collection.find().getDocuments();
    const outContent = outDocuments[0].getContent();
    testsUtil.removeID(outContent);
    testsUtil.removeID(inContent);
    assert.deepStrictEqual(outContent, inContent);

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 177.2

  it('177.3 insertOneAndGet() with a document content', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_177_3");

    const inContent = { id: 2000, name: "Paul",  office: "Singapore" };
    const middleDocument = await collection.insertOneAndGet(inContent);
    assert(middleDocument);
    const middleContent = middleDocument.getContent();
    assert.ifError(middleContent);

    // Fetch it back
    const outDocuments = await collection.find().getDocuments();
    const outContent = outDocuments[0].getContent();

    testsUtil.removeID(outContent);
    testsUtil.removeID(inContent);
    assert.deepStrictEqual(outContent, inContent);

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 177.3

  it('177.4 insertOneAndGet() with a document', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_177_4");

    const inContent = { id: 2000, name: "Paul",  office: "Singapore" };
    const inDocument = soda.createDocument(inContent);
    const middleDocument = await collection.insertOneAndGet(inDocument);
    assert(middleDocument);
    const middleContent = middleDocument.getContent();
    assert.ifError(middleContent);

    // Fetch it back
    const outDocuments = await collection.find().getDocuments();
    const outContent = outDocuments[0].getContent();

    testsUtil.removeID(outContent);
    testsUtil.removeID(inContent);
    assert.deepStrictEqual(outContent, inContent);

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 177.4

  it('177.5 createDocument() followd by getContent() i.e. without being inserted', async () => {

    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();

    const inContent = { id: 2000, name: "Paul",  office: "Singapore" };
    const inDocument = soda.createDocument(inContent);

    // Get content without being inserted
    const outContent = inDocument.getContent();
    assert.deepStrictEqual(outContent, inContent);

    await conn.commit();
    await conn.close();

  }); // 177.5
});

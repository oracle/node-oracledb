/* Copyright (c) 2018, 2025, Oracle and/or its affiliates. */

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
  let conn;

  before(async function() {
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
    }

    await sodaUtil.cleanup();
  });

  beforeEach(async function() {
    conn = await oracledb.getConnection(dbConfig);
  });

  afterEach(async function() {
    if (conn) {
      await conn.close();
      conn = null;
    }
  });

  it('177.1 insertOne() with a document content', async () => {
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
  }); // 177.1

  it('177.2 insertOne() with a document', async () => {
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
  }); // 177.2

  it('177.3 insertOneAndGet() with a document content', async () => {
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
  }); // 177.3

  it('177.4 insertOneAndGet() with a document', async () => {
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
  }); // 177.4

  it('177.5 createDocument() followd by getContent() i.e. without being inserted', async () => {

    const soda = conn.getSodaDatabase();

    const inContent = { id: 2000, name: "Paul",  office: "Singapore" };
    const inDocument = soda.createDocument(inContent);

    // Get content without being inserted
    const outContent = inDocument.getContent();
    assert.deepStrictEqual(outContent, inContent);

    await conn.commit();
  }); // 177.5

  it('177.6 update a document and verify content', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_177_6");

    const inContent = { id: 3000, name: "John", office: "New York" };
    const doc = await collection.insertOneAndGet(inContent);

    // Update the document
    const updatedContent = { id: 3000, name: "John", office: "Los Angeles" };
    await collection.find().key(doc.key).replaceOne(updatedContent);

    // Verify the updated content
    const outDocuments = await collection.find().getDocuments();
    const outContent = outDocuments[0].getContent();
    testsUtil.removeID(outContent);
    testsUtil.removeID(updatedContent);
    assert.deepStrictEqual(outContent, updatedContent);

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 177.6

  it('177.7 retrieve document metadata', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_177_7");

    const inContent = { id: 4000, name: "Anna", office: "London" };
    const doc = await collection.insertOneAndGet(inContent);

    // Retrieve metadata
    const key = doc.key; // Document key
    assert(key);

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 177.7

  it('177.8 negative test: replace a non-existent document', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_177_8");

    const nonExistentKey = "12345";
    const newContent = { id: 5000, name: "Mike", office: "Tokyo" };

    // Attempt to replace a non-existent document
    const result = await collection.find().key(nonExistentKey).replaceOne(newContent);
    assert.strictEqual(result.replaced, false);

    await conn.commit();
    // Drop the collection and ensure it succeeds
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 177.8

  it('177.9 insert multiple documents and verify retrieval', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_177_9");

    const documents = [
      { id: 6000, name: "Steve", office: "Berlin" },
      { id: 6001, name: "Laura", office: "Madrid" },
      { id: 6002, name: "Tom", office: "Rome" }
    ];

    // Insert multiple documents
    for (const doc of documents) {
      await collection.insertOne(doc);
    }

    // Retrieve documents
    const outDocuments = await collection.find().getDocuments();
    const outContents = outDocuments.map(doc => {
      const content = doc.getContent();
      delete content._id; // Remove auto-generated ID
      return content;
    });

    testsUtil.removeID(documents);
    assert.deepStrictEqual(outContents, documents);

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 177.9

  it('177.10 verify collection drop when empty', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_177_10");

    // Verify collection is empty
    const count = await collection.find().count();
    assert.strictEqual(count.count, 0);

    // Drop collection
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 177.10
});

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
 *   168. soda4.js
 *
 * DESCRIPTION
 *   sodaDocument class
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert    = require('assert');
const dbConfig = require('./dbconfig.js');
const sodaUtil = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('168. soda4.js', () => {
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

  it('168.1 insertOneAndGet() fetches attributes without content', async () => {
    const sd = conn.getSodaDatabase();
    const collectionName = 'soda_test_168_1';
    const coll = await sd.createCollection(collectionName);

    // Insert a new document
    const testContent = {
      name: "Changjie Lin",
      address: {city: "Shenzhen", country: "China"},
      company: "Oracle Corporation",
      manager: null,
      VP: "Bruce"
    };

    const myDoc = await coll.insertOneAndGet(testContent);
    const myKey = myDoc.key;
    assert(myKey);
    assert.strictEqual(typeof (myKey), "string");
    assert.strictEqual(typeof (myDoc), "object");

    const content1 = myDoc.getContent();
    assert.ifError(content1);

    // Fetch it back
    const doc2 = await coll.find().key(myKey).getOne();
    const content2 = doc2.getContent();
    assert.strictEqual(content2.name, testContent.name);
    assert.strictEqual(content2.company, testContent.company);
    assert.strictEqual(content2.manager, null);

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);
  }); // 168.1

  it('168.2 content is null', async () => {
    const sd = conn.getSodaDatabase();
    const collectionName = 'soda_test_168_2';
    const coll = await sd.createCollection(collectionName);

    // Insert a new document
    // Content is empty
    const testContent = {};

    const myDoc = await coll.insertOneAndGet(testContent);
    const myKey = myDoc.key;
    assert(myKey);
    assert.strictEqual(typeof (myKey), "string");
    assert.strictEqual(typeof (myDoc), "object");

    // Fetch it back
    const doc2 = await coll.find().key(myKey).getOne();
    const content2 = doc2.getContent();
    testsUtil.removeID(testContent);
    testsUtil.removeID(content2);
    assert.deepStrictEqual(content2, testContent);

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);
  }); // 168.2

  it('168.3 get mediaType', async () => {
    const sd = conn.getSodaDatabase();
    const collectionName = 'soda_test_168_3';
    const coll = await sd.createCollection(collectionName);

    // Insert a new document
    // Content is empty
    const testContent = {};

    const myDoc = await coll.insertOneAndGet(testContent);
    const myMediaType = myDoc.mediaType;
    assert(myMediaType);
    assert.strictEqual(myMediaType, 'application/json');
    const myKey = myDoc.key;

    // Fetch it back
    const doc2 = await coll.find().key(myKey).getOne();
    assert.strictEqual(doc2.mediaType, 'application/json');

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);
  }); // 168.3

  it('168.4 test documents with JSON data using extended types', async function() {
    if (oracledb.oracleClientVersion < 2304000000) this.skip();
    const sd = conn.getSodaDatabase();
    const collectionName = 'soda_test_168_4';
    const coll = await sd.createCollection(collectionName);

    const testContent = {
      testKey1: "testValue1",
      testKey2: 134535,
      testKey3: new Date('11-06-1987'),
      testKey4: true
    };

    const myDoc = await coll.insertOneAndGet(testContent);
    assert.strictEqual(myDoc.mediaType, 'application/json');

    const myKey = myDoc.key;

    // Fetch it back
    const myDoc2 = await coll.find().key(myKey).getOne();
    assert.strictEqual(myDoc2.mediaType, 'application/json');
    const myContent = testsUtil.removeID(myDoc2.getContent());
    assert.deepStrictEqual(myContent, testContent);
    // check that non-primitive object types are retained as is
    assert.strictEqual(myContent.testKey3 instanceof Date, true);

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);
  }); // 168.4

  it('168.5 test collections with mixture of media types', async function() {
    if (oracledb.oracleClientVersion < 2304000000) this.skip();

    const sd = conn.getSodaDatabase();
    const collectionName = 'soda_test_168_5';
    const metadata = {
      mediaTypeColumn: {
        name: "media_type"
      }
    };

    const coll = await sd.createCollection(collectionName, { metaData: metadata });

    const testData = [
      [{ name: "George", age: 28 }, "application/json"],
      ["Sample Text", "text/plain"],
      [Buffer.from([0x57, 0x25, 0xfe, 0x34, 0x56]), "application/octet-stream"]
    ];

    for (const [value, mediaType] of testData) {
      await coll.find().remove();

      const doc = sd.createDocument(value, { mediaType: mediaType });
      await coll.insertOne(doc);

      const fetchedDocs = await coll.find().getDocuments();
      assert.strictEqual(fetchedDocs.length, 1);
      const fetchedDoc = fetchedDocs[0];

      assert.strictEqual(fetchedDoc.mediaType, mediaType);

      if (mediaType === "application/json") {
        // For JSON documents
        assert.deepStrictEqual(fetchedDoc.getContent(), value);
        assert.deepStrictEqual(JSON.parse(fetchedDoc.getContentAsString()), value);
        assert.deepStrictEqual(JSON.parse(fetchedDoc.getContentAsBuffer().toString()), value);
      } else if (mediaType === "text/plain") {
        // For text documents
        assert.strictEqual(fetchedDoc.getContentAsString(), value);
        assert.deepStrictEqual(fetchedDoc.getContentAsBuffer(), Buffer.from(value));
        // Non-JSON content is returned as a Buffer by getContent()
        assert.strictEqual(fetchedDoc.getContent().toString(), value);
      } else {
        // For binary documents
        const contentAsBuffer = fetchedDoc.getContentAsBuffer();
        const bufferString = contentAsBuffer.toString();

        assert.deepStrictEqual(contentAsBuffer, value);
        assert.strictEqual(fetchedDoc.getContentAsString(), bufferString);

        const content = fetchedDoc.getContent();
        assert.strictEqual(Buffer.isBuffer(content), true);
        assert.deepStrictEqual(content, value);
      }
    }

    await conn.commit();
    await coll.drop();
  }); // 168.5
});

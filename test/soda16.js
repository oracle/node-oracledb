/* Copyright (c) 2025, Oracle and/or its affiliates. */

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
 *   318. soda16.js
 *
 * DESCRIPTION
 *   SODA tests coverage for database and collections
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('318. soda16.js', () => {
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

  describe('318.1 Invalid JSON and Error Handling', function() {

    it('318.1.1 inserting invalid JSON value into SODA collection', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_318_1_1");

      // invalid JSON string
      const invalidJson = "{testKey:testValue}"; // Missing quotes around key and value
      const doc = soda.createDocument(invalidJson);

      await assert.rejects(
        async () => await collection.insertOne(doc),
        /ORA-40780:|ORA-02290:/ // Invalid JSON or check constraint violation
      );

      await collection.drop();
    }); // 318.1.1

    it('318.1.2 various invalid JSON scenarios', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_318_1_2");

      const invalidJsonStrings = [
        '{"key": value}',           // unquoted value
        '{"key": "value",}',       // trailing comma
        '{"key": "unclosed}',      // unclosed string
        '{{"nested": "wrong"}}',   // invalid nesting
      ];

      for (const invalidJson of invalidJsonStrings) {
        const doc = soda.createDocument(invalidJson);
        await assert.rejects(
          async () => await collection.insertOne(doc),
          /ORA-40780:/
          // ORA-40780: JSON syntax error: Invalid JSON keyword
        );
      }

      await collection.drop();
    }); // 318.1.2
  }); // 318.1

  describe('318.2 Document Metadata and Attributes', function() {

    it('318.2.1 createdOn attribute of Document', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_318_2_1");

      const data = { name: "John", address: { city: "Bangalore" } };
      const doc = await collection.insertOneAndGet(data);
      assert.strictEqual(doc.createdOn, doc.lastModified);

      await conn.commit();
      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    }); // 318.2.1

    it('318.2.2 name and metadata attribute', async () => {
      const soda = conn.getSodaDatabase();
      const collectionName = "soda_test_318_2_2";
      const collection = await soda.createCollection(collectionName);

      assert.strictEqual(collection.name, collectionName);
      assert(collection.metaData);
      assert.strictEqual(typeof collection.metaData, 'object');

      await conn.commit();
      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    }); // 318.2.2

    it('318.2.3 document version operations', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_318_2_3");

      const content = { name: "John", address: { city: "Bangalore" } };
      const insertedDoc = await collection.insertOneAndGet(content);
      const key = insertedDoc.key;
      const version = insertedDoc.version;

      // Fetch document by key and version
      const doc = await collection.find().key(key).version(version).getOne();
      assert(doc);
      assert.deepStrictEqual(doc.getContent().name, content.name);

      // Replace document and get new version
      const newContent = { name: "James", address: { city: "Delhi" } };
      const replacedDoc = await collection.find().key(key).replaceOneAndGet(newContent);
      const newVersion = replacedDoc.version;

      // Old version should not exist
      const oldDoc = await collection.find().key(key).version(version).getOne();
      assert.strictEqual(oldDoc, undefined);

      // New version should exist
      const newDoc = await collection.find().key(key).version(newVersion).getOne();
      assert(newDoc);
      assert.deepStrictEqual(newDoc.getContent().name, newContent.name);

      // Remove by version
      const removeResult1 = await collection.find().key(key).version(version).remove();
      assert.strictEqual(removeResult1.count, 0);
      const removeResult2 = await collection.find().key(key).version(newVersion).remove();
      assert.strictEqual(removeResult2.count, 1);

      await conn.commit();
      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    }); // 318.2.3
  }); // 318.2

  describe('318.3 Cursor and Limit Operations', function() {

    it('318.3.1 close document cursor and confirm exception is raised', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_318_3_1");

      await collection.insertOne({ test: "data" });
      await conn.commit();

      const cursor = await collection.find().getCursor();
      await cursor.close();

      // Attempting to close again
      await assert.rejects(
        async () => await cursor.close(),
        /NJS-066:/
        // NJS-066: invalid SODA document cursor
      );

      // Attempting to use closed cursor
      await assert.rejects(
        async () => await cursor.getNext(),
        /NJS-066:/
        // NJS-066: invalid SODA document cursor
      );

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    }); // 318.3.1

    it('318.3.2 limit to get specific number of documents', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_318_3_2");

      const testData = [];
      for (let i = 0; i < 20; i++) {
        testData.push({ group: "TestGroup", index: i });
      }
      await collection.insertMany(testData);
      await conn.commit();

      // without limit
      const allDocs = await collection.find().getDocuments();
      assert.strictEqual(allDocs.length, 20);

      // with limit
      const limitedDocs = await collection.find().limit(3).getDocuments();
      assert.strictEqual(limitedDocs.length, 3);

      // limit larger than available documents
      const largeLimitDocs = await collection.find().limit(50).getDocuments();
      assert.strictEqual(largeLimitDocs.length, 20);

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    }); // 318.3.2

    it('318.3.3 get count exceptions when using limit and skip', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_318_3_3");

      const testData = [];
      for (let i = 0; i < 20; i++) {
        testData.push({ song: "TestSong" + i });
      }
      await collection.insertMany(testData);
      await conn.commit();

      // count() with limit
      await assert.rejects(
        async () => await collection.find().limit(5).count(),
        /ORA-40748:/
        // ORA-40748: SKIP and LIMIT attributes cannot be used for count operation.
      );

      // count() with skip
      await assert.rejects(
        async () => await collection.find().skip(10).count(),
        /ORA-40748:/
        // ORA-40748: SKIP and LIMIT attributes cannot be used for count operation.
      );

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    }); // 318.3.3

    it('318.3.4 valid skip and limit operations', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_318_3_4");

      const testData = [];
      for (let i = 0; i < 10; i++) {
        testData.push({ item: "Item" + i, value: i });
      }
      await collection.insertMany(testData);
      await conn.commit();

      // skip(0)
      const skipZeroDocs = await collection.find().skip(0).getDocuments();
      assert.strictEqual(skipZeroDocs.length, 10);

      // skip with positive value
      const skipFiveDocs = await collection.find().skip(5).getDocuments();
      assert.strictEqual(skipFiveDocs.length, 5);

      // Combined skip(0) and limit
      const skipZeroLimit3 = await collection.find().skip(0).limit(3).getDocuments();
      assert.strictEqual(skipZeroLimit3.length, 3);

      // Skip equal to total documents
      const skipAllDocs = await collection.find().skip(10).getDocuments();
      assert.strictEqual(skipAllDocs.length, 0);

      // Skip more than total documents
      const skipMoreDocs = await collection.find().skip(15).getDocuments();
      assert.strictEqual(skipMoreDocs.length, 0);

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    }); // 318.3.4
  }); // 318.3

  describe('318.4 Advanced Query Operations', function() {

    it('318.4.1 comprehensive search with different QBE filters', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_318_4_1");

      const testData = [
        {
          name: "John",
          age: 22,
          birthday: "2000-12-15",
          locations: [{ city: "Bangalore" }, { city: "Other" }],
          active: true
        },
        {
          name: "Johnson",
          age: 45,
          birthday: "1978-02-03",
          locations: [{ city: "Banaras" }, { city: "Manhattan" }],
          active: false
        },
        {
          name: "William",
          age: 32,
          birthday: "1991-05-17",
          locations: { city: "New Banaras" },
          active: true
        }
      ];

      await collection.insertMany(testData);
      await conn.commit();

      // Create index for search operations
      const index = { name: "js_ix_318_4_1" };
      await collection.createIndex(index);

      // various filter operations
      const testCases = [
        { filter: { "name": { "$like": "J%n" } }, expectedCount: 2 },
        { filter: { "age": { "$gt": 18 } }, expectedCount: 3 },
        { filter: { "age": { "$lt": 25 } }, expectedCount: 1 },
        { filter: { "active": true }, expectedCount: 2 },
        { filter: { "active": false }, expectedCount: 1 }
      ];

      for (const testCase of testCases) {
        const result = await collection.find().filter(testCase.filter).count();
        assert.strictEqual(result.count, testCase.expectedCount,
          `Filter ${JSON.stringify(testCase.filter)} failed`);
      }

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    }); // 318.4.1

    it('318.4.2 $and and $or operations', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_318_4_2");

      const testData = [
        { name: "Alice", age: 25, city: "New York", active: true },
        { name: "Bob", age: 30, city: "London", active: false },
        { name: "Charlie", age: 25, city: "London", active: true },
        { name: "Diana", age: 35, city: "New York", active: true }
      ];

      await collection.insertMany(testData);
      await conn.commit();

      // $and operation
      const andResult = await collection.find().filter({
        "$and": [
          { "age": 25 },
          { "active": true }
        ]
      }).count();
      assert.strictEqual(andResult.count, 2); // Alice and Charlie

      // $or operation
      const orResult = await collection.find().filter({
        "$or": [
          { "city": "New York" },
          { "age": 30 }
        ]
      }).count();
      assert.strictEqual(orResult.count, 3); // Alice, Bob, Diana

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    }); // 318.4.2
  }); // 318.4

  describe('318.5 Collection Management', function() {

    it('318.5.1 createCollection() with same name and metadata', async () => {
      const soda = conn.getSodaDatabase();
      const collectionName = "soda_test_318_5_1";
      const metadata = { "readOnly": true };

      const coll1 = await soda.createCollection(collectionName, { metaData: metadata });
      const coll2 = await soda.createCollection(collectionName, { metaData: metadata });

      // Both should reference the same collection
      assert.strictEqual(coll1.name, coll2.name);

      const res1 = await coll1.drop();
      assert.strictEqual(res1.dropped, true);

      const res2 = await coll2.drop();
      assert.strictEqual(res2.dropped, false);
    }); // 318.5.1

    it('318.5.2 createCollection() with same name but different metadata', async () => {
      const soda = conn.getSodaDatabase();
      const collectionName = "soda_test_318_5_2";

      const coll1 = await soda.createCollection(collectionName);

      // Attempt to create with different metadata should fail
      await assert.rejects(
        async () => await soda.createCollection(collectionName, { metaData: { "readOnly": true } }),
        /ORA-40669:/
        // ORA-40669: Collection create failed: collection with same name but different metadata exists.
      );

      await coll1.drop();
    }); // 318.5.2

    it('318.5.3 read-only collection restrictions', async () => {
      const soda = conn.getSodaDatabase();
      const metadata = { "readOnly": true };
      const collection = await soda.createCollection("soda_test_318_5_3", { metaData: metadata });

      const testDoc = { name: "Test", value: 123 };

      // All write operations should fail on read-only collection
      await assert.rejects(
        async () => await collection.insertOne(testDoc),
        /ORA-40663:/
        // ORA-40663: cannot modify a read-only collection
      );

      await assert.rejects(
        async () => await collection.insertOneAndGet(testDoc),
        /ORA-40663:/
        // ORA-40663: cannot modify a read-only collection
      );

      await assert.rejects(
        async () => await collection.insertMany([testDoc]),
        /ORA-40663:/
        // ORA-40663: cannot modify a read-only collection
      );

      await collection.drop();
    }); // 318.5.3
  }); // 318.5

  describe('318.6 Negative Cases', function() {

    it('318.6.1 negative cases for SodaOperation methods', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_318_6_1");

      // Invalid filter parameter type
      await assert.rejects(
        async () => await collection.find().filter(5).getDocuments(),
        /NJS-005:/
        // NJS-005: invalid value for parameter 2
      );

      // Invalid key parameter type
      await assert.rejects(
        async () => await collection.find().key(2).getDocuments(),
        /NJS-005:/
        // NJS-005: invalid value for parameter 2
      );

      // Invalid keys parameter type
      await assert.rejects(
        async () => await collection.find().keys([1, 2, 3]).getDocuments(),
        /NJS-005:/
        // NJS-005: invalid value for parameter 2
      );

      // Invalid skip parameter type
      await assert.rejects(
        async () => await collection.find().skip("word").getDocuments(),
        /NJS-005:/
        // NJS-005: invalid value for parameter 2
      );

      // Invalid skip parameter (floating point)
      await assert.rejects(
        async () => await collection.find().skip(3.5).getDocuments(),
        /NJS-005:/
        // NJS-005: invalid value for parameter 2
      );

      // Invalid limit parameter (floating point)
      await assert.rejects(
        async () => await collection.find().limit(5.2).getDocuments(),
        /NJS-005:/
        // NJS-005: invalid value for parameter 2
      );

      // Invalid skip parameter (negative)
      await assert.rejects(
        async () => await collection.find().skip(-5).getDocuments(),
        /NJS-005:/
        // NJS-005: invalid value for parameter 2
      );

      // Invalid limit parameter
      await assert.rejects(
        async () => await collection.find().limit(0).getDocuments(),
        /NJS-005:/
        // NJS-005: invalid value for parameter 2
      );

      // Combined skip and limit(0)
      await assert.rejects(
        async () =>  await collection.find().skip(2).limit(0).getDocuments(),
        /NJS-005:/
        // NJS-005: invalid value for parameter 2
      );

      // Invalid version parameter type
      await assert.rejects(
        async () => await collection.find().version(1971).getDocuments(),
        /NJS-005:/
        // NJS-005: invalid value for parameter 2
      );

      // Invalid limit parameter type
      await assert.rejects(
        async () => await collection.find().limit("a word").getDocuments(),
        /NJS-005:/
        // NJS-005: invalid value for parameter 2
      );

      // Negative limit parameter type
      await assert.rejects(
        async () => await collection.find().limit(-5).getDocuments(),
        /NJS-005:/
        // NJS-005: invalid value for parameter 2
      );

      await collection.drop();
    }); // 318.6.1

    it('318.6.2 various unsupported parameter scenarios', async () => {
      const soda = conn.getSodaDatabase();

      // invalid collection name types
      await assert.rejects(
        async () => await soda.createCollection(null),
        /NJS-005:/
        // NJS-005: invalid value for parameter 2
      );

      await assert.rejects(
        async () => await soda.createCollection(123),
        /NJS-005:/
        // NJS-005: invalid value for parameter 2
      );

      // invalid metadata parameter
      await assert.rejects(
        async () => await soda.createCollection("test", "invalid_metadata"),
        /NJS-005:/
        // NJS-005: invalid value for parameter 2
      );
    }); // 318.6.2
  }); // 318.6

  describe('318.7 Mixed Data Types and Edge Cases', function() {

    it('318.7.1 documents with mixed content types', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_318_7_1");

      const mixedData = [
        { type: "object", data: { name: "John", age: 30 } },
        { type: "array", data: [1, 2, 3, "four", true] },
        { type: "string", data: "simple string" },
        { type: "number", data: 42.5 },
        { type: "boolean", data: true },
        { type: "null", data: null }
      ];

      for (const item of mixedData) {
        await collection.insertOne(item);
      }

      await conn.commit();

      const count = await collection.find().count();
      assert.strictEqual(count.count, mixedData.length);

      // filtering by data type
      const objectDocs = await collection.find().filter({ type: "object" }).getDocuments();
      assert.strictEqual(objectDocs.length, 1);
      assert.deepStrictEqual(objectDocs[0].getContent().data.name, "John");

      await collection.drop();
    }); // 318.7.1

    it('318.7.2 empty and whitespace content handling', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_318_7_2");

      const edgeCaseData = [
        {},                          // Empty object
        { data: [] },                // Empty array wrapped in object
        { value: "" },               // Empty string in object
        { value: "   " },            // Whitespace string in object
        { empty: "", spaces: "   " } // Object with empty/whitespace values
      ];

      for (const data of edgeCaseData) {
        await collection.insertOne(data);
      }

      await conn.commit();

      const count = await collection.find().count();
      assert.strictEqual(count.count, edgeCaseData.length);

      await collection.drop();
    }); // 318.7.2
  }); // 318.7

  describe('318.8 Performance and Stress Tests', function() {

    it('318.8.1 operations with large number of documents', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_318_8_1");

      // Insert 500 documents in batches
      const batchSize = 50;
      const totalDocs = 500;

      for (let batch = 0; batch < totalDocs / batchSize; batch++) {
        const batchData = [];
        for (let i = 0; i < batchSize; i++) {
          const docIndex = batch * batchSize + i;
          batchData.push({
            id: docIndex,
            batch: batch,
            name: `Document_${docIndex}`,
            data: `test_data_${docIndex}`
          });
        }
        await collection.insertMany(batchData);
      }

      await conn.commit();

      // Verify total count
      const totalCount = await collection.find().count();
      assert.strictEqual(totalCount.count, totalDocs);

      // batch filtering
      const batchDocs = await collection.find().filter({ batch: 5 }).getDocuments();
      assert.strictEqual(batchDocs.length, batchSize);

      // range queries
      const rangeDocs = await collection.find().filter({
        "id": { "$gte": 100, "$lt": 200 }
      }).count();
      assert.strictEqual(rangeDocs.count, 100);

      await collection.drop();
    }); // 318.8.1

    it('318.8.2 concurrent document operations', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_318_8_2");

      // Prepare data
      const testDocs = [];
      for (let i = 0; i < 10; i++) {
        testDocs.push({
          id: i,
          name: `TestDoc_${i}`,
          value: i * 10
        });
      }

      await collection.insertMany(testDocs);
      await conn.commit();

      // Simulate concurrent read operations
      const readPromises = [];
      for (let i = 0; i < 5; i++) {
        readPromises.push(collection.find().getDocuments());
        readPromises.push(collection.find().count());
        readPromises.push(collection.find().filter({ id: i }).getDocuments());
      }

      const results = await Promise.all(readPromises);

      for (let i = 0; i < 5; i++) {
        const docs = results[i * 3];         // getDocuments results
        const count = results[i * 3 + 1];    // count results
        const filtered = results[i * 3 + 2]; // filtered results

        assert.strictEqual(docs.length, testDocs.length);
        assert.strictEqual(count.count, testDocs.length);
        assert.strictEqual(filtered.length, 1);
      }

      await collection.drop();
    }); // 318.8.2
  }); // 318.8
}); // 318

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
 *   317. soda15.js
 *
 * DESCRIPTION
 *   Test cases covering edge cases, performance scenarios,
 *   and advanced query functionality
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('317. soda15.js', () => {
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

  describe('317.1 data Type and JSON Validation Tests', function() {

    it('317.1.1 insert and query documents with all JSON data types', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_317_1_1");

      const testDoc = {
        stringField: "test string",
        numberField: 42.5,
        integerField: 100,
        booleanTrue: true,
        booleanFalse: false,
        nullField: null,
        arrayField: [1, "two", true, null, {nested: "object"}],
        objectField: {
          nestedString: "nested value",
          nestedNumber: 123,
          deepNested: {
            level3: "deep value"
          }
        },
        emptyArray: [],
        emptyObject: {}
      };

      await collection.insertOne(testDoc);
      await conn.commit();

      // Test querying different data types
      let docs = await collection.find().filter({"stringField": "test string"}).getDocuments();
      assert.strictEqual(docs.length, 1);

      docs = await collection.find().filter({"numberField": 42.5}).getDocuments();
      assert.strictEqual(docs.length, 1);

      docs = await collection.find().filter({"booleanTrue": true}).getDocuments();
      assert.strictEqual(docs.length, 1);

      docs = await collection.find().filter({"nullField": null}).getDocuments();
      assert.strictEqual(docs.length, 1);

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    });

    it('317.1.2 Unicode and special characters in JSON', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_317_1_2");

      const unicodeDoc = {
        english: "Hello World",
        chinese: "你好世界",
        arabic: "مرحبا بالعالم",
        specialChars: "!@#$%^&*()_+-=[]{}|;':\",./<>?",
        backslash: "C:\\path\\to\\file",
        quotes: 'Single "quotes" and \'escaped\' quotes',
        newlines: "Line 1\nLine 2\rLine 3\r\nLine 4",
        tabs: "Column1\tColumn2\tColumn3"
      };

      await collection.insertOne(unicodeDoc);
      await conn.commit();

      const docs = await collection.find().filter({"chinese": "你好世界"}).getDocuments();
      assert.strictEqual(docs.length, 1);

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    });

    it('317.1.3 very large JSON documents', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_317_1_3");

      // Create a document with large string field (1MB)
      const largeString = "x".repeat(1024 * 1024);
      const largeDoc = {
        id: "large_doc_1",
        largeField: largeString,
        description: "Document with 1MB string field"
      };

      await collection.insertOne(largeDoc);
      await conn.commit();

      const docs = await collection.find().filter({"id": "large_doc_1"}).getDocuments();
      assert.strictEqual(docs.length, 1);
      assert.strictEqual(docs[0].getContent().largeField.length, 1024 * 1024);

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    });

  });

  describe('317.2 advanced Query and Filter Tests', function() {

    it('317.2.1 $and, $or, $nor operations', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_317_2_1");

      const testDocs = [
        {name: "Alice", age: 25, city: "New York", active: true},
        {name: "Bob", age: 30, city: "London", active: false},
        {name: "Charlie", age: 25, city: "London", active: true},
        {name: "Diana", age: 35, city: "New York", active: true}
      ];

      await collection.insertMany(testDocs);
      await conn.commit();

      let docs = await collection.find().filter({
        "$and": [
          {"age": 25},
          {"active": true}
        ]
      }).getDocuments();
      assert.strictEqual(docs.length, 2); // Alice and Charlie

      docs = await collection.find().filter({
        "$or": [
          {"city": "New York"},
          {"age": 30}
        ]
      }).getDocuments();
      assert.strictEqual(docs.length, 3); // Alice, Bob, Diana

      docs = await collection.find().filter({
        "$nor": [
          {"city": "London"},
          {"age": 35}
        ]
      }).getDocuments();
      assert.strictEqual(docs.length, 1); // Only Alice

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    });

    it('317.2.2 numeric range queries with $gt, $gte, $lt, $lte', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_317_2_2");

      const numericDocs = [];
      for (let i = 1; i <= 100; i++) {
        numericDocs.push({
          id: i,
          value: i * 10,
          category: i % 3 === 0 ? "A" : i % 2 === 0 ? "B" : "C"
        });
      }

      await collection.insertMany(numericDocs);
      await conn.commit();

      // Test $gt
      let docs = await collection.find().filter({"value": {"$gt": 950}}).getDocuments();
      assert.strictEqual(docs.length, 5); // 96-100

      // Test $gte and $lt combined
      docs = await collection.find().filter({
        "$and": [
          {"value": {"$gte": 200}},
          {"value": {"$lt": 300}}
        ]
      }).getDocuments();
      assert.strictEqual(docs.length, 10); // 20-29

      // Test $lte
      docs = await collection.find().filter({"value": {"$lte": 50}}).getDocuments();
      assert.strictEqual(docs.length, 5); // 1-5

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    });

    it('317.2.3 $in and $nin array operations', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_317_2_3");

      const testDocs = [
        {name: "Product A", category: "electronics", price: 100},
        {name: "Product B", category: "books", price: 25},
        {name: "Product C", category: "clothing", price: 75},
        {name: "Product D", category: "electronics", price: 200},
        {name: "Product E", category: "sports", price: 150}
      ];

      await collection.insertMany(testDocs);
      await conn.commit();

      // Test $in
      let docs = await collection.find().filter({
        "category": {"$in": ["electronics", "books"]}
      }).getDocuments();
      assert.strictEqual(docs.length, 3); // A, B, D

      // Test $nin
      docs = await collection.find().filter({
        "category": {"$nin": ["electronics", "sports"]}
      }).getDocuments();
      assert.strictEqual(docs.length, 2); // B, C

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    });
  });

  describe('317.3 performance and Scale Tests', function() {

    it('317.3.1 bulk operations with large datasets', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_317_3_1");

      // Insert 1000 documents in batches
      const batchSize = 100;
      const totalDocs = 1000;

      for (let batch = 0; batch < totalDocs / batchSize; batch++) {
        const batchDocs = [];
        for (let i = 0; i < batchSize; i++) {
          const docId = batch * batchSize + i;
          batchDocs.push({
            id: docId,
            name: `Document ${docId}`,
            batch: batch,
            timestamp: new Date().toISOString(),
            data: `data_${docId}`.repeat(10) // Some bulk data
          });
        }
        await collection.insertMany(batchDocs);
      }
      await conn.commit();

      // Verify total count
      const count = await collection.find().count();
      assert.strictEqual(count.count, totalDocs);

      // Test batch filtering
      const batchDocs = await collection.find().filter({"batch": 5}).getDocuments();
      assert.strictEqual(batchDocs.length, batchSize);

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    });

    it('317.3.2 concurrent insertions from multiple operations', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_317_3_2");

      // Simulate concurrent operations
      const promises = [];
      const numConcurrent = 10;
      const docsPerOperation = 20;

      for (let i = 0; i < numConcurrent; i++) {
        const promise = (async (operationId) => {
          const docs = [];
          for (let j = 0; j < docsPerOperation; j++) {
            docs.push({
              operationId: operationId,
              docIndex: j,
              data: `Operation ${operationId}, Document ${j}`,
              timestamp: Date.now()
            });
          }
          await collection.insertMany(docs);
        })(i);
        promises.push(promise);
      }

      await Promise.all(promises);
      await conn.commit();

      // Verify all documents were inserted
      const count = await collection.find().count();
      assert.strictEqual(count.count, numConcurrent * docsPerOperation);

      // Verify each operation's documents
      for (let i = 0; i < numConcurrent; i++) {
        const opDocs = await collection.find().filter({"operationId": i}).getDocuments();
        assert.strictEqual(opDocs.length, docsPerOperation);
      }

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    });

  });

  describe('317.4 Error Handling and Edge Cases', function() {

    it('317.4.1 operations on non-existent collections', async () => {
      const soda = conn.getSodaDatabase();

      // open non-existent collection
      const nonExistentColl = await soda.openCollection("non_existent_collection");
      assert.strictEqual(nonExistentColl, undefined);
    });

    it('317.4.2 invalid JSON filter expressions', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_317_4_2");

      await collection.insertOne({test: "data"});
      await conn.commit();

      // various invalid filter expressions
      await assert.rejects(
        async () => await collection.find().filter({"$invalidOperator": "value"}).getDocuments(),
        /ORA-40676:/  // ORA-40676: invalid Query-By-Example (QBE) filter specification
      );

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    });

    it('317.4.3 transaction rollback scenarios', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_317_4_3");

      // Insert initial data
      await collection.insertOne({id: 1, name: "Initial"});
      await conn.commit();

      // Start transaction and insert more data
      await collection.insertOne({id: 2, name: "Transaction 1"});
      await collection.insertOne({id: 3, name: "Transaction 2"});

      // Verify data exists before rollback
      let count = await collection.find().count();
      assert.strictEqual(count.count, 3);

      // Rollback
      await conn.rollback();

      // Verify only initial data remains
      count = await collection.find().count();
      assert.strictEqual(count.count, 1);

      const docs = await collection.find().getDocuments();
      assert.strictEqual(docs[0].getContent().name, "Initial");

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    });

    it('317.4.4 document size edge cases', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_317_4_4");

      // Test empty document
      await collection.insertOne({});
      await conn.commit();

      // Test document with only null values
      await collection.insertOne({
        field1: null,
        field2: null,
        field3: null
      });
      await conn.commit();

      // Test document with empty arrays and objects
      await collection.insertOne({
        emptyArray: [],
        emptyObject: {},
        emptyString: "",
        zeroNumber: 0,
        falseBoolean: false
      });
      await conn.commit();

      const count = await collection.find().count();
      assert.strictEqual(count.count, 3);

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    });

  });

  describe('317_5 Advanced Collection Operations', function() {

    it('317.5.1 collection metadata and statistics', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_317_5_1");

      const testDocs = [];
      for (let i = 0; i < 50; i++) {
        testDocs.push({
          id: i,
          category: i % 5,
          value: Math.random() * 1000
        });
      }
      await collection.insertMany(testDocs);
      await conn.commit();

      // Test collection name
      assert.strictEqual(collection.name, "soda_test_317_5_1");

      // Test document count
      const count = await collection.find().count();
      assert.strictEqual(count.count, 50);

      // Test collection metadata
      const metadata = collection.metaData;
      assert(metadata);
      assert(typeof metadata === 'object');

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    });

    it('317.5.2 mixed operations on same collection', async () => {
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_317_5_2");

      // Insert initial documents
      await collection.insertMany([
        {id: 1, status: "active", value: 100},
        {id: 2, status: "inactive", value: 200},
        {id: 3, status: "active", value: 300}
      ]);
      await conn.commit();

      // Mix of operations: insert, update, delete
      await collection.insertOneAndGet({id: 4, status: "pending", value: 400});

      // Update a document
      const docsToUpdate = await collection.find().filter({id: 2}).getDocuments();
      if (docsToUpdate.length > 0) {
        const updateKey = docsToUpdate[0].key;
        await collection.find().key(updateKey).replaceOne({id: 2, status: "active", value: 250});
      }

      // Delete a document
      await collection.find().filter({id: 3}).remove();

      await conn.commit();

      // Verify final state
      const finalDocs = await collection.find().getDocuments();
      assert.strictEqual(finalDocs.length, 3);

      const activeCount = await collection.find().filter({status: "active"}).count();
      assert.strictEqual(activeCount.count, 2);

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
    });

  });

  describe('317.6 Connection Pool and Resource Management', function() {

    it('317.6.1 SODA operations with autoCommit enabled', async () => {
      const originalAutoCommit = oracledb.autoCommit;
      oracledb.autoCommit = true;

      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_317_6_1");

      // Operations should auto-commit
      await collection.insertOne({test: "autocommit", value: 1});
      await collection.insertOne({test: "autocommit", value: 2});

      // Verify data is committed
      const count = await collection.find().count();
      assert.strictEqual(count.count, 2);

      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);

      oracledb.autoCommit = originalAutoCommit;
    });

    it('317.6.2 SODA collection cleanup after connection close', async () => {
      const tempConn = await oracledb.getConnection(dbConfig);
      const soda = tempConn.getSodaDatabase();
      const collection = await soda.createCollection("soda_test_317_6_2");

      await collection.insertOne({cleanup: "test"});
      await tempConn.commit();

      await tempConn.close();

      // Reconnect and verify collection still exists
      const soda2 = conn.getSodaDatabase();
      const collection2 = await soda2.openCollection("soda_test_317_6_2");

      assert(collection2);
      const docs = await collection2.find().getDocuments();
      assert.strictEqual(docs.length, 1);

      const res = await collection2.drop();
      assert.strictEqual(res.dropped, true);
    });
  });
});

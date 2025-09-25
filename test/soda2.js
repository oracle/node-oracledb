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
 *   165. soda2.js
 *
 * DESCRIPTION
 *   Some more tests of sodaDatabase object and createCollection() method.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('165. soda2.js', () => {
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

  it('165.1 create two sodaDatabase objects which point to the same instance', async () => {
    const sd1 = conn.getSodaDatabase();
    const sd2 = conn.getSodaDatabase();
    // sd1 creates the collection
    const collName = "soda_test_165_1";
    const coll_create = await sd1.createCollection(collName);
    // sd2 opens the collection
    const coll_open = await sd2.openCollection(collName);
    assert(coll_open);
    await coll_create.drop();
  }); // 165.1

  it('165.2 create two sodaDatabase objects from two connections', async () => {
    const conn1 = conn; // Use the beforeEach connection as conn1
    const sd1 = await conn1.getSodaDatabase();
    const conn2 = await oracledb.getConnection(dbConfig);
    const sd2 = await conn1.getSodaDatabase();

    const t_collname = "soda_test_165_2";
    const coll = await sd1.createCollection(t_collname);

    const cNames = await sd2.getCollectionNames();
    assert.deepStrictEqual(cNames, [ t_collname ]);

    await coll.drop();
    await conn2.close();
  }); // 165.2

  it('165.3 will open this collection when creating a collection with the existing name', async () => {
    const sd = conn.getSodaDatabase();

    const t_collname = "soda_test_165_3";
    await sd.createCollection(t_collname);
    const coll = await sd.createCollection(t_collname);

    const cNames = await sd.getCollectionNames();
    assert.deepStrictEqual(cNames, [ t_collname ]);

    await coll.drop();
  }); // 165.3

  it('165.4 Negative - createCollection() when collection name is empty string', async () => {
    const sd = conn.getSodaDatabase();

    const collName = "";
    await assert.rejects(
      async () => await sd.createCollection(collName),
      /ORA-40658:/
    );
    // ORA-40658: Collection name cannot be null for this operation.
  }); // 165.4

  // This is a variation of 173.1
  it('165.5 connections from a pool concurrently insert documents into the same collection', async () => {

    const collectionName = "soda_test_165.5";
    await prepareCollection(collectionName);

    const pool = await oracledb.createPool(dbConfig);

    const t_contents = sodaUtil.t_contents;
    await Promise.all(
      t_contents.map(function(content) {
        return insertDocument(pool, collectionName, content);
      })
    );
    await pool.close(0);

    await dropCollection(collectionName);

    async function prepareCollection(collName) {

      const conn = await oracledb.getConnection(dbConfig);
      const soda = conn.getSodaDatabase();
      const collection = await soda.createCollection(collName);
      const indexSpec = {
        "name": "OFFICE_IDX",
        "fields": [
          {
            "path": "office",
            "datatype": "string",
            "order": "asc"
          }
        ]
      };
      await collection.createIndex(indexSpec);
      await conn.commit();
      await conn.close();

    } // prepareCollection()

    async function insertDocument(pool, collName, content) {
      const conn = await pool.getConnection();
      const soda = conn.getSodaDatabase();
      const collection = await soda.openCollection(collName);

      await collection.insertOne(content);
      await conn.commit();
      await conn.close();
    } // insertDocument()

    async function dropCollection(collName) {
      const conn = await oracledb.getConnection(dbConfig);
      const soda = conn.getSodaDatabase();
      const collection = await soda.openCollection(collName);

      const result = await collection.drop();
      assert.strictEqual(result.dropped, true);

      await conn.commit();
      await conn.close();
    } // dropCollection()

  }); // 165.5

  it('165.6 test multiple collections with same connection', async () => {
    const sd = conn.getSodaDatabase();

    const collections = [
      "soda_test_165_6_1",
      "soda_test_165_6_2",
      "soda_test_165_6_3"
    ];

    // Create multiple collections
    const createdCollections = await Promise.all(
      collections.map(name => sd.createCollection(name))
    );

    // Verify all collections exist
    const collNames = await sd.getCollectionNames();
    assert.strictEqual(collNames.length, collections.length);
    collections.forEach(name => {
      assert(collNames.includes(name));
    });

    // Cleanup
    await Promise.all(
      createdCollections.map(coll => coll.drop())
    );
  });

  it('165.7 test collection creation with metadata', async () => {
    const sd = conn.getSodaDatabase();

    const collName = "soda_test_165_7";
    const metadata = {
      "schemaName": "SODA_TEST",
      "tableName": "SODA_TEST_165_7",
      "keyColumn": {
        "name": "ID",
        "sqlType": "VARCHAR2",
        "maxLength": 255,
        "assignmentMethod": "UUID"
      },
      "contentColumn": {
        "name": "JSON_DOCUMENT",
        "sqlType": "BLOB",
        "compress": "NONE",
        "cache": true,
        "encrypt": "NONE",
        "validation": "STANDARD"
      },
      "versionColumn": {
        "name": "VERSION",
        "method": "UUID"
      },
      "lastModifiedColumn": {
        "name": "LAST_MODIFIED"
      },
      "creationTimeColumn": {
        "name": "CREATED_ON"
      }
    };

    const collection = await sd.createCollection(collName, { metadata });

    // Verify collection exists
    const cNames = await sd.getCollectionNames();
    assert(cNames.includes(collName));

    await collection.drop();
  });

  it('165.8 test concurrent operations on different collections', async () => {
    const pool = await oracledb.createPool(dbConfig);
    const collections = ["soda_test_165_8_1", "soda_test_165_8_2"];

    // Create collections
    const conn = await pool.getConnection();
    const sd = conn.getSodaDatabase();
    await Promise.all(
      collections.map(name => sd.createCollection(name))
    );
    await conn.close();

    // Perform concurrent operations
    const operations = [];
    for (let i = 0; i < 10; i++) {
      operations.push(
        insertIntoCollection(pool, collections[0], { data: `doc1_${i}` }),
        insertIntoCollection(pool, collections[1], { data: `doc2_${i}` })
      );
    }

    await Promise.all(operations);

    // Verify results
    const verifyConn = await pool.getConnection();
    const verifySd = verifyConn.getSodaDatabase();

    for (const collName of collections) {
      const coll = await verifySd.openCollection(collName);
      const documents = await coll.find().getDocuments();
      assert.strictEqual(documents.length, 10);
      await coll.drop();
    }

    await verifyConn.close();
    await pool.close();

    async function insertIntoCollection(pool, collName, content) {
      const conn = await pool.getConnection();
      const soda = conn.getSodaDatabase();
      const collection = await soda.openCollection(collName);
      await collection.insertOne(content);
      await conn.commit();
      await conn.close();
    }
  });

  it('165.9 test collection name with special characters', async () => {
    const sd = conn.getSodaDatabase();

    const specialNames = [
      "SODA_test_165_9$",
      "SODA_test_165_9#",
      "SODA_test_165_9@"
    ];

    for (const name of specialNames) {
      const collection = await sd.createCollection(name);
      await collection.drop();
    }
  });

  it('165.10 test collection creation with custom storage options', async () => {
    const sd = conn.getSodaDatabase();

    const collName = "soda_test_165_10";
    const metadata = {
      "storage": {
        "tablespace": "USERS",
        "logging": true,
        "table": {
          "compressFor": "BASIC",
          "cacheTable": true
        }
      }
    };

    const collection = await sd.createCollection(collName, { metadata });
    assert(collection);

    await collection.drop();
  });

  it('165.11 test collection with maximum name length', async () => {
    const sd = conn.getSodaDatabase();

    // Create collection name with maximum allowed length
    const maxLengthName = "A".repeat(128);
    const collection = await sd.createCollection(maxLengthName);
    assert(collection);

    // Create collection with name longer than maximum
    const tooLongName = "A".repeat(129);
    await assert.rejects(
      async () => await sd.createCollection(tooLongName),
      /ORA-40674:/  // ORA-40674: Length of table or column name metadata value cannot exceed 128 bytes.
    );

    await collection.drop();
  }); // 165.11
});

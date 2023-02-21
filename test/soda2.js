/* Copyright (c) 2018, 2022, Oracle and/or its affiliates. */

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

  before(async function() {
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
      return;
    }

    await sodaUtil.cleanup();
  });

  it('165.1 create two sodaDatabase objects which point to the same instance', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const sd1 = conn.getSodaDatabase();
    const sd2 = conn.getSodaDatabase();
    // sd1 creates the collection
    const collName = "soda_test_165_1";
    const coll_create = await sd1.createCollection(collName);
    // sd2 opens the collection
    const coll_open = await sd2.openCollection(collName);
    assert(coll_open);
    await coll_create.drop();
    await conn.close();
  }); // 165.1

  it('165.2 create two sodaDatabase objects from two connections', async () => {
    const conn1 = await oracledb.getConnection(dbConfig);
    const sd1 = await conn1.getSodaDatabase();
    const conn2 = await oracledb.getConnection(dbConfig);
    const sd2 = await conn1.getSodaDatabase();

    const t_collname = "soda_test_165_2";
    const coll = await sd1.createCollection(t_collname);

    const cNames = await sd2.getCollectionNames();
    assert.deepEqual(cNames, [ t_collname ]);

    await coll.drop();
    await conn1.close();
    await conn2.close();
  }); // 165.2

  it('165.3 will open this collection when creating a collection with the existing name', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const sd = conn.getSodaDatabase();

    const t_collname = "soda_test_165_3";
    await sd.createCollection(t_collname);
    const coll = await sd.createCollection(t_collname);

    const cNames = await sd.getCollectionNames();
    assert.deepEqual(cNames, [ t_collname ]);

    await coll.drop();
    await conn.close();
  }); // 165.3

  it('165.4 Negative - createCollection() when collection name is empty string', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const sd = conn.getSodaDatabase();

    const collName = "";
    await assert.rejects(
      async () => await sd.createCollection(collName),
      /ORA-40658:/
    );
    // ORA-40658: Collection name cannot be null for this operation.

    await conn.close();
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
    await pool.close();

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

});

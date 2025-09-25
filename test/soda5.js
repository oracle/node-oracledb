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
 *   173. soda5.js
 *
 * DESCRIPTION
 *   More tests for sodaCollection class
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

const t_contents = sodaUtil.t_contents;

describe('173. soda5.js', () => {
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

  it('173.1 create index, basic case', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_173_1");

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

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const empInShenzhen = await collection.find()
      .filter({ "office": {"$like": "Shenzhen"} })
      .count();
    assert.strictEqual(empInShenzhen.count, 2);

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 173.1

  it('173.2 query row not via indexSpec', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_173_2");

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

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const empInShenzhen = await collection.find()
      .filter({ "name": {"$like": "Changjie"} })
      .count();
    assert.strictEqual(empInShenzhen.count, 1);

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 173.2

  it('173.3 Negative - invalid indexSpec, invalid index property', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_173_3");

    const indexSpec = { "foo": "bar" };
    await assert.rejects(
      async () => await collection.createIndex(indexSpec),
      /ORA-40719:/
    );
    // ORA-40719: invalid index property foo

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 173.3

  it('173.4 collection.drop(), basic case', async () => {
    const sd = conn.getSodaDatabase();
    const collName = "soda_test_173_4";
    const collection = await sd.createCollection(collName);
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 173.4

  it('173.5 drop multiple times, no error thrown', async () => {
    const sd = conn.getSodaDatabase();

    const collName = "soda_test_173_5";
    const collection = await sd.createCollection(collName);

    let res = await collection.drop();
    assert.strictEqual(res.dropped, true);

    res = await collection.drop();
    assert.strictEqual(res.dropped, false);

    res = await collection.drop();
    assert.strictEqual(res.dropped, false);
  }); // 173.5

  it('173.6 dropIndex(), basic case', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_173_6");

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

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const empInShenzhen = await collection.find()
      .filter({ "office": {"$like": "Shenzhen"} })
      .count();
    assert.strictEqual(empInShenzhen.count, 2);

    // drop index
    const indexName = indexSpec.name;
    await collection.dropIndex(indexName);

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 173.6

  it('173.7 dropping index does not impact query', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_173_7");

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

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // drop index
    const indexName = indexSpec.name;
    await collection.dropIndex(indexName);

    // Fetch back
    const empInShenzhen = await collection.find()
      .filter({ "office": {"$like": "Shenzhen"} })
      .count();
    assert.strictEqual(empInShenzhen.count, 2);

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 173.7

  it('173.8 The index is dropped regardless of the auto commit mode', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_173_8");

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

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const empInShenzhen = await collection.find()
      .filter({ "office": {"$like": "Shenzhen"} })
      .count();
    assert.strictEqual(empInShenzhen.count, 2);

    // drop index
    const indexName = indexSpec.name;
    await collection.dropIndex(indexName);

    // Does not commit changes
    // await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 173.8

  it('173.9 Negative - dropIndex() no parameter', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_173_9");

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

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const empInShenzhen = await collection.find()
      .filter({ "office": {"$like": "Shenzhen"} })
      .count();
    assert.strictEqual(empInShenzhen.count, 2);

    // drop index multiple times
    const indexName = indexSpec.name;

    await collection.dropIndex(indexName);
    await collection.dropIndex(indexName);
    await collection.dropIndex(indexName);

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 173.9

  it('173.10 option object of dropIndex(), basic case', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_173_10");

    await collection.createIndex({
      "name": "OFFICE_IDX_SP",
      "spatial": "geometry",
    });

    await Promise.all(
      sodaUtil.t_contents_spatial.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const empInShenzhen = await collection.find()
      .filter({ "office": {"$like": "Shenzhen"} })
      .count();
    assert.strictEqual(empInShenzhen.count, 2);

    // drop index
    await collection.dropIndex("OFFICE_IDX_SP", { "force": true });
    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 173.10

  it('173.11 option object of dropIndex(), boolean value is false', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_173_11");

    await collection.createIndex({
      "name": "OFFICE_IDX",
      "fields": [
        {
          "path": "office",
          "datatype": "string",
          "order": "asc"
        }
      ]
    });

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const empInShenzhen = await collection.find()
      .filter({ "office": {"$like": "Shenzhen"} })
      .count();
    assert.strictEqual(empInShenzhen.count, 2);

    // drop index
    await collection.dropIndex("OFFICE_IDX", { "force": false });
    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 173.11

  it('173.12 getDataGuide(), basic case', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection('soda_test_173_12');

    let myContent = { name: "Sally", address: {city: "Melbourne"} };
    await collection.insertOne(myContent);

    myContent = { name: "Matilda", address: {city: "Sydney"} };
    await collection.insertOne(myContent);

    myContent = { name: "May", address: {city: "London"} };
    await collection.insertOne(myContent);

    await conn.commit();

    /*
     * if isCreateIndexEligible >= 0: Can Create Index without error
     * if isCreateIndexEligible < 0: Create Index will throw error ORA-00406
     * if isCreateIndexEligible = undefined: Getting COMPATIBLE VERSION string failed, the following part is skipped
     */
    const isCreateIndexEligible = testsUtil.versionStringCompare(await testsUtil.getDBCompatibleVersion(), '12.2.0.0.0');
    const indexSpec = {
      "name": "TEST_IDX",
      "search_on": "none",
      "dataguide": "on"
    };
    if (isCreateIndexEligible >= 0) {
      await collection.createIndex(indexSpec);
      const outDocument = await collection.getDataGuide();
      assert(outDocument);
    } else if (isCreateIndexEligible < 0) {
      await assert.rejects(async () => {
        await collection.createIndex(indexSpec);
      }, /ORA-00406:/);
    }

    if (isCreateIndexEligible >= 0) {
      const result = await collection.dropIndex('TEST_IDX');
      assert.strictEqual(result.dropped, true);
      await conn.commit();
    }

    await collection.drop();

  }); // 173.12

});

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
 *   164. soda1.js
 *
 * DESCRIPTION
 *   Some basic tests of SODA.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('164. soda1.js', () => {

  before(async function() {
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
    }

    await sodaUtil.cleanup();
  });

  it('164.1 getSodaDatabase() creates a sodaDatabase Object', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const sd = conn.getSodaDatabase();
    assert(sd);
    await conn.close();
  }); // 164.1

  it('164.2 createCollection() creates a collection', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const sd = conn.getSodaDatabase();
    const collName = "soda_test_164_2";
    const coll = await sd.createCollection(collName);
    await coll.drop();
    await conn.close();
  });// 164.2

  it('164.3 openCollection() opens an existing collection', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const sd = conn.getSodaDatabase();
    const collName = "soda_test_164_3";
    const coll = await sd.createCollection(collName);
    await conn.commit();
    const newColl = await sd.openCollection(collName);
    assert.strictEqual(newColl.name, coll.name);
    await newColl.drop();
    await conn.close();
  }); // 164.3

  it('164.4 getCollectionNames() gets an array of collection names', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const sd = conn.getSodaDatabase();

    const collNames = [
      "soda_test_164_4_1",
      "soda_test_164_4_2",
      "soda_test_164_4_3",
      "soda_test_164_4_4",
      "soda_test_164_4_5"
    ];

    const collections = await Promise.all(
      collNames.map(function(name) {
        return sd.createCollection(name);
      })
    );

    const cNames = await sd.getCollectionNames();

    assert.deepStrictEqual(cNames, collNames);

    const opResults = await Promise.all(
      collections.map(function(coll) {
        return coll.drop();
      })
    );

    opResults.forEach(function(res) {
      assert.strictEqual(res.dropped, true);
    });
    await conn.close();
  }); // 164.4

  it('164.5 the operation status of collection.drop()', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const sd = conn.getSodaDatabase();
    const collName = "soda_test_164_5";
    const coll = await sd.createCollection(collName);
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 164.5

  it('164.6 Negative: the operation status of collection.drop()', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const sd = conn.getSodaDatabase();
    const collName = "soda_test_164_6";
    const coll = await sd.createCollection(collName);
    await coll.drop();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, false);
    await conn.close();
  }); // 164.6

  it('164.7 get one document', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const sd = conn.getSodaDatabase();
    const collectionName = 'soda_test_164_7';
    const coll = await sd.createCollection(collectionName);
    await coll.find().remove();

    // Insert a new document
    const myContent = { name: "Sally", address: {city: "Melbourne"} };
    await coll.insertOne(myContent);

    const docs = await coll.find().getDocuments();
    assert.strictEqual(docs.length, 1);

    await docs.forEach(function(element) {
      const content = element.getContent();
      assert.strictEqual(content.name, myContent.name);
      assert.strictEqual(content.address.city, myContent.address.city);
    });

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);

    await conn.close();
  }); // 164.7

  it('164.8 get multiple documents', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const sd = conn.getSodaDatabase();
    const collectionName = 'soda_test_164_8';
    const coll = await sd.createCollection(collectionName);

    const myContents = [
      { name: "Sally", address: {city: "Melbourne"} },
      { name: "Venkat", address: {city: "Bangalore"} },
      { name: "Changjie", address: {city: "Shenzhen"} }
    ];
    await Promise.all(
      myContents.map(function(con) {
        return coll.insertOne(con);
      })
    );

    const docs = await coll.find().getDocuments();
    assert.strictEqual(docs.length, 3);

    await docs.forEach(function(element) {
      const content = element.getContent();
      myContents.includes(content);
    });

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);

    await conn.close();
  }); // 164.8

  it('164.9 create index', async () => {
    const indexName = "soda_index_164_9";
    const conn = await oracledb.getConnection(dbConfig);
    const sd = conn.getSodaDatabase();
    const collectionName = 'soda_test_164_9';
    const coll = await sd.createCollection(collectionName);

    const index =
      {
        name: indexName,
        fields: [ { path: "name" }]
      };

    await coll.createIndex(index);

    await coll.dropIndex(indexName);
    await coll.drop();
    await conn.commit();
    await conn.close();
  }); // 164.9

  it('164.10 the "examples/soda1.js" case', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    // Create the parent object for SODA
    const soda = conn.getSodaDatabase();

    // Create a new SODA collection and index
    const collection = await soda.createCollection("soda_test_164_10");
    const indexSpec = {
      "name": "CITY_IDX",
      "fields": [
        {
          "path": "address.city",
          "datatype": "string",
          "order": "asc"
        }
      ]
    };
    await collection.createIndex(indexSpec);

    // Insert a document
    // A system generated key is created by default
    const content1 = { name: "Matilda", address: {city: "Melbourne"} };
    const doc1 = await collection.insertOneAndGet(content1);
    const myKey = doc1.key;
    assert(myKey);
    assert.strictEqual(typeof (myKey), "string");

    // Fetch the document back
    const doc2 = await collection.find().key(myKey).getOne();
    const content2 = doc2.getContent(); // A JavaScript object
    testsUtil.removeID(content1);
    testsUtil.removeID(content2);
    assert.deepStrictEqual(content2, content1);

    const content3 = testsUtil.removeID(doc2.getContentAsString()); // A JSON string

    assert.strictEqual(JSON.stringify(content2), content3);

    // Replace document contents
    const content4 = { name: "Matilda", address: {city: "Sydney"} };
    await collection.find().key(myKey).replaceOne(content4);

    // Insert some more documents without caring about their keys
    const content5 = { name: "Venkat", address: {city: "Bengaluru"} };
    await collection.insertOne(content5);
    const content6 = { name: "May", address: {city: "London"} };
    await collection.insertOne(content6);
    const content7 = { name: "Sally-Ann", address: {city: "San Francisco"} };
    await collection.insertOne(content7);

    // Find all documents with city names starting with 'S'
    const documents = await collection.find()
      .filter({"address.city": {"$like": "S%"}})
      .getDocuments();

    for (let i = 0; i < documents.length; i++) {
      const content = documents[i].getContent();
      (['Sydney', 'San Francisco']).includes(content.address.city);
    }

    // Count all documents
    const res1 = await collection.find().count();
    assert.strictEqual(res1.count, 4);

    // Remove documents with cities containing 'o'
    const res2 = await collection.find().filter({"address.city": {"$regex": ".*o.*"}}).remove();
    assert.strictEqual(res2.count, 2);

    // Count all documents
    const res3 = await collection.find().count();
    assert.strictEqual(res3.count, 2);

    await collection.dropIndex("CITY_IDX");

    // Commit changes
    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 164.10

  it('164.11 Negative: create collection with invalid metaData value', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const sd = conn.getSodaDatabase();

    const t_collname = "soda_test_164_11";
    const options = { metaData: "metaData" };

    await assert.rejects(
      async () => await sd.createCollection(t_collname, options),
      /NJS-007:/
    );

    await conn.close();
  }); // 164.11

});

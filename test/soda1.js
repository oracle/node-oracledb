/* Copyright (c) 2018, 2021, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
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
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('164. soda1.js', () => {

  before(async function() {
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
      return;
    }

    await sodaUtil.cleanup();

    await sodaUtil.grantPrivilege();
  });

  it('164.1 getSodaDatabase() creates a sodaDatabase Object', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();
      should.exist(sd);
    } catch(err) {
      should.not.exist(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 164.1

  it('164.2 createCollection() creates a collection', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();

      let collName = "soda_test_164_2";
      let coll = await sd.createCollection(collName);
      await coll.drop();

    } catch(err) {
      should.not.exist(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }

  });// 164.2

  it('164.3 openCollection() opens an existing collection', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();
      let collName = "soda_test_164_3";
      let coll = await sd.createCollection(collName);
      await conn.commit();
      let newColl = await sd.openCollection(collName);
      should.strictEqual(newColl.name, coll.name);
      await newColl.drop();
    } catch(err) {
      should.not.exist(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 164.3

  it('164.4 getCollectionNames() gets an array of collection names', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();

      let collNames = [
        "soda_test_164_4_1",
        "soda_test_164_4_2",
        "soda_test_164_4_3",
        "soda_test_164_4_4",
        "soda_test_164_4_5"
      ];

      let collections = await Promise.all(
        collNames.map(function(name) {
          return sd.createCollection(name);
        })
      );

      let cNames = await sd.getCollectionNames();

      should.deepEqual(cNames, collNames);

      let opResults = await Promise.all(
        collections.map(function(coll) {
          return coll.drop();
        })
      );

      opResults.forEach(function(res) {
        should.strictEqual(res.dropped, true);
      });
    } catch(err) {
      should.not.exist(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 164.4

  it('164.5 the operation status of collection.drop()', async () => {
    let conn, coll;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();

      let collName = "soda_test_164_5";
      coll = await sd.createCollection(collName);

    } catch(err) {
      should.not.exist(err);
    } finally {
      if (coll) {
        let res = await coll.drop();
        should.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 164.5

  it('164.6 Negative: the operation status of collection.drop()', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();

      let collName = "soda_test_164_6";
      let coll = await sd.createCollection(collName);

      await coll.drop();
      let res = await coll.drop();
      should.strictEqual(res.dropped, false);

    } catch(err) {
      should.not.exist(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 164.6

  it('164.7 get one document', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();
      let collectionName = 'soda_test_164_7';
      let coll = await sd.createCollection(collectionName);
      await coll.find().remove();

      // Insert a new document
      let myContent = { name: "Sally", address: {city: "Melbourne"} };
      await coll.insertOne(myContent);

      let docs = await coll.find().getDocuments();
      //console.log(docs);
      should.strictEqual(docs.length, 1);

      await docs.forEach(function(element) {
        let content = element.getContent();
        should.strictEqual(content.name, myContent.name);
        should.strictEqual(content.address.city, myContent.address.city);
      });

      await conn.commit();
      let res = await coll.drop();
      should.strictEqual(res.dropped, true);

    } catch(err) {
      should.not.exist(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 164.7

  it('164.8 get multiple documents', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();
      let collectionName = 'soda_test_164_8';
      let coll = await sd.createCollection(collectionName);

      let myContents = [
        { name: "Sally", address: {city: "Melbourne"} },
        { name: "Venkat", address: {city: "Bangalore"} },
        { name: "Changjie", address: {city: "Shenzhen"} }
      ];
      await Promise.all(
        myContents.map(function(con) {
          return coll.insertOne(con);
        })
      );

      let docs = await coll.find().getDocuments();
      should.strictEqual(docs.length, 3);

      await docs.forEach(function(element) {
        let content = element.getContent();
        myContents.should.containEql(content);
      });

      await conn.commit();
      let res = await coll.drop();
      should.strictEqual(res.dropped, true);

    } catch(err) {
      should.not.exist(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 164.8

  it('164.9 create index', async () => {
    let conn, coll;
    const indexName = "soda_index_164_9";
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();
      let collectionName = 'soda_test_164_9';
      coll = await sd.createCollection(collectionName);

      var index =
        {
          name :  indexName,
          fields : [ { path: "name" }]
        };

      await coll.createIndex(index);

      await coll.dropIndex(indexName);
      await coll.drop();
      await conn.commit();

    } catch(err) {
      should.not.exist(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 164.9

  it('164.10 the "examples/soda1.js" case', async () => {
    let conn, collection;
    try {
      conn = await oracledb.getConnection(dbconfig);
      // Create the parent object for SODA
      let soda = conn.getSodaDatabase();

      // Create a new SODA collection and index
      collection = await soda.createCollection("soda_test_164_10");
      let indexSpec = {
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
      let content1 = { name: "Matilda", address: {city: "Melbourne"} };
      let doc1 = await collection.insertOneAndGet(content1);
      let myKey = doc1.key;
      should.exist(myKey);
      (myKey).should.be.a.String();

      // Fetch the document back
      let doc2 = await collection.find().key(myKey).getOne();
      let content2 = doc2.getContent(); // A JavaScript object
      should.deepEqual(content2, content1);

      let content3 = doc2.getContentAsString(); // A JSON string
      (content3).should.be.a.String();
      should.strictEqual( JSON.stringify(content2), content3 );

      // Replace document contents
      let content4 = { name: "Matilda", address: {city: "Sydney"} };
      await collection.find().key(myKey).replaceOne(content4);

      // Insert some more documents without caring about their keys
      let content5 = { name: "Venkat", address: {city: "Bengaluru"} };
      await collection.insertOne(content5);
      let content6 = { name: "May", address: {city: "London"} };
      await collection.insertOne(content6);
      let content7 = { name: "Sally-Ann", address: {city: "San Francisco"} };
      await collection.insertOne(content7);

      // Find all documents with city names starting with 'S'
      let documents = await collection.find()
        .filter({"address.city": {"$like": "S%"}})
        .getDocuments();

      for (let i = 0; i < documents.length; i++) {
        let content = documents[i].getContent();
        (['Sydney', 'San Francisco']).should.containEql(content.address.city);
      }

      // Count all documents
      let res1 = await collection.find().count();
      should.strictEqual(res1.count, 4);

      // Remove documents with cities containing 'o'
      let res2 = await collection.find().filter({"address.city": {"$regex": ".*o.*"}}).remove();
      should.strictEqual(res2.count, 2);

      // Count all documents
      let res3 = await collection.find().count();
      should.strictEqual(res3.count, 2);

      await collection.dropIndex("CITY_IDX");

      // Commit changes
      await conn.commit();

    } catch(err) {
      should.not.exist(err);
    } finally {
      // Drop the collection
      if (collection) {
        let res = await collection.drop();
        should.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 164.10

  it('164.11 Negative: create collection with invalid metaData value', async () => {

    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();

      let t_collname = "soda_test_164_11";
      let options = { metaData: "metaData" };

      await testsUtil.assertThrowsAsync(
        async () => await sd.createCollection(t_collname, options),
        /NJS-005:/
      );

    } catch(err) {
      should.not.exist(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 164.11

});

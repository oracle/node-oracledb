/* Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   174. soda6.js
 *
 * DESCRIPTION
 *   Tests for non-terminal methods of SodaOperation class
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');
const sodaUtil = require('./sodaUtil.js');

const t_contents = [
  { id: 1001, name: "Gillian",  office: "Shenzhen" },
  { id: 1002, name: "Chris",    office: "Melbourne" },
  { id: 1003, name: "Changjie", office: "Shenzhen" },
  { id: 1004, name: "Venkat",   office: "Bangalore" },
  { id: 1005, name: "May",      office: "London" },
  { id: 1006, name: "Joe",      office: "San Francisco" },
  { id: 1007, name: "Gavin",    office: "New York" }
];

describe('174. soda6.js', () => {
  
  before(async function() {
    const runnable = await sodaUtil.checkPrerequisites();
    if (!runnable) this.skip();

    await sodaUtil.cleanup();
  });

  it('174.1 filter() basic case', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_174_1");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let empInShenzhen = await collection.find()
        .filter({ "office": {"$like": "Shenzhen"} })
        .count();
      should.strictEqual(empInShenzhen.count, 2);

      await conn.commit();

    } catch(err) {
      should.not.exist(err);
    } finally {
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
  }); // 174.1

  it('174.2 Negative - fiter(filterSpec) when filterSpec is null', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_174_2");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      await sodaUtil.assertThrowsAsync(
        async () => await collection.find().filter(),
        /NJS-009: invalid number of parameters/
      );

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();
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
  }); // 174.2

  it('174.3 filterSpec is OK to be an empty object', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_174_3");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let empInShenzhen = await collection.find()
        .filter({})
        .count();
      should.strictEqual(empInShenzhen.count, t_contents.length);

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();
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
  }); // 174.3

  it('174.4 Key(), basic case', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_174_4");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Insert another document
      let content1 = { id: 1008, name: "Justin",    office: "Shenzhen" };
      let doc1 = await collection.insertOneAndGet(content1);
      let key1 = doc1.key;
      (key1).should.be.a.String();

      // Fetch it back
      let doc2 = await collection.find().key(key1).getOne();
      let content2 = doc2.getContent();
      should.deepEqual(content2, content1);


      let empInShenzhen = await collection.find()
        .filter({ "office": {"$like": "Shenzhen"} })
        .count();
      should.strictEqual(empInShenzhen.count, 3);

      await conn.commit();

    } catch(err) {
      should.not.exist(err);
    } finally {
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
  }); // 174.4

  it('174.5 Key(), no matched key', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_174_5");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch it back
      let key1 = 'C2478535C4404F9DBFE1B2BC2B137079';
      let doc2 = await collection.find().key(key1).getOne();
      should.not.exist(doc2);
      await conn.commit();

    } catch(err) {
      should.not.exist(err);
    } finally {
      
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
  }); // 174.5

  it('174.6 Negative - Key(null)', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_174_6");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      await sodaUtil.assertThrowsAsync(
        async () => await collection.find().key().getOne(),
        /NJS-009: invalid number of parameters/
      );

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();
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
  }); // 174.6

  it('174.7 Key(), invalid type', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_174_7");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch it back
      let key1 = {};
      await sodaUtil.assertThrowsAsync(
        async () => await collection.find().key(key1).getOne(),
        /NJS-006: invalid type for parameter 1/
      );

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();
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
  }); // 174.7

  it('174.8 Keys(), basic case', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_174_8");

      let myKeys = [];
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        let doc = await collection.insertOneAndGet(content);
        myKeys[i] = doc.key;
      }

      // Fetch back
      let documents = await collection.find().keys(myKeys).getDocuments();
      
      // Get contents
      let myContents = [];
      for (let i = 0; i < documents.length; i++ ) {
        myContents[i] = await documents[i].getContent();
        (myContents[i]).should.be.oneOf(t_contents);
      }
      

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();

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
  }); // 174.8

  it('174.9 Keys([]) empty array, it selects all documents', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_174_9");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let documents = await collection.find().keys([]).getDocuments();
      
      // Get contents
      let myContents = [];
      for (let i = 0; i < documents.length; i++ ) {
        myContents[i] = await documents[i].getContent();
        (myContents[i]).should.be.oneOf(t_contents);
      }
      

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();

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
  }); // 174.9

  it('174.10 Negative - keys() no parameter', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_174_10");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      await sodaUtil.assertThrowsAsync(
        async () => await collection.find().keys().getDocuments(),
        /NJS-009: invalid number of parameters/
      );

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();

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
  }); // 174.10

  it('174.11 Negative - keys(null)', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_174_11");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      await sodaUtil.assertThrowsAsync(
        async () => await collection.find().keys(null).getDocuments(),
        /NJS-006: invalid type for parameter 1/
      );

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();

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
  }); // 174.11

  it('174.12 try to query documents with nonexistent keys', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_174_12");

      let myKeys = [];
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        let doc = await collection.insertOneAndGet(content);
        myKeys[i] = doc.key;
      }

      // Fetch back
      let nonexistentKeys = ['4A5AF2AAEB124FD4BFF80BC3630CB048', '4A5AF2AAEB124FD4BFF80BC3630CB049'];
      let result = await collection
        .find()
        .keys(nonexistentKeys)
        .count();

      should.strictEqual(result.count, 0);    

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();

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
  }); // 174.12

});
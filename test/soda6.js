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
 *   174. soda6.js
 *
 * DESCRIPTION
 *   Tests for non-terminal methods of SodaOperation class
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

const t_contents = sodaUtil.t_contents;

describe('174. soda6.js', function() {

  before(async function() {
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
      return;
    }

    await sodaUtil.cleanup();
  });

  it('174.1 filter() basic case', async function() {
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
      assert.strictEqual(empInShenzhen.count, 2);

      await conn.commit();

    } catch (err) {
      assert.ifError(err);
    } finally {
      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.ifError(err);
        }
      }
    }
  }); // 174.1

  it('174.2 Negative - fiter(filterSpec) when filterSpec is null', async function() {
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
      await testsUtil.assertThrowsAsync(
        async () => await collection.find().filter(),
        /NJS-009: invalid number of parameters/
      );

    } catch (err) {
      assert.ifError(err);
    } finally {
      await conn.commit();
      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.ifError(err);
        }
      }
    }
  }); // 174.2

  it('174.3 filterSpec is OK to be an empty object', async function() {
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
      assert.strictEqual(empInShenzhen.count, t_contents.length);

    } catch (err) {
      assert.ifError(err);
    } finally {
      await conn.commit();
      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.ifError(err);
        }
      }
    }
  }); // 174.3

  it('174.4 Key(), basic case', async function() {
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
      let content1 = { id: 1008, name: "Justin", office: "Shenzhen" };
      let doc1 = await collection.insertOneAndGet(content1);
      let key1 = doc1.key;
      assert.strictEqual(typeof (key1), "string");

      // Fetch it back
      let doc2 = await collection.find().key(key1).getOne();
      let content2 = doc2.getContent();
      assert.deepEqual(content2, content1);


      let empInShenzhen = await collection.find()
        .filter({ "office": {"$like": "Shenzhen"} })
        .count();
      assert.strictEqual(empInShenzhen.count, 3);

      await conn.commit();

    } catch (err) {
      assert.ifError(err);
    } finally {
      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.ifError(err);
        }
      }
    }
  }); // 174.4

  it('174.5 Key(), no matched key', async function() {
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
      assert.ifError(doc2);
      await conn.commit();

    } catch (err) {
      assert.ifError(err);
    } finally {

      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.ifError(err);
        }
      }
    }
  }); // 174.5

  it('174.6 Negative - Key(null)', async function() {
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

      await testsUtil.assertThrowsAsync(
        async () => await collection.find().key().getOne(),
        /NJS-009: invalid number of parameters/
      );

    } catch (err) {
      assert.ifError(err);
    } finally {
      await conn.commit();
      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.ifError(err);
        }
      }
    }
  }); // 174.6

  it('174.7 Key(), invalid type', async function() {
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
      await testsUtil.assertThrowsAsync(
        async () => await collection.find().key(key1).getOne(),
        /NJS-005: invalid value for parameter 1/
      );

    } catch (err) {
      assert.ifError(err);
    } finally {
      await conn.commit();
      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.ifError(err);
        }
      }
    }
  }); // 174.7

  it('174.8 Keys(), basic case', async function() {
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
      for (let i = 0; i < documents.length; i++) {
        myContents[i] = documents[i].getContent();
        (t_contents).includes(myContents[i]);
      }

    } catch (err) {
      assert.ifError(err);
    } finally {
      await conn.commit();

      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.ifError(err);
        }
      }
    }
  }); // 174.8

  it('174.9 Keys([]) empty array, it selects all documents', async function() {
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
      for (let i = 0; i < documents.length; i++) {
        myContents[i] = documents[i].getContent();
        (t_contents).includes(myContents[i]);
      }


    } catch (err) {
      assert.ifError(err);
    } finally {
      await conn.commit();

      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.ifError(err);
        }
      }
    }
  }); // 174.9

  it('174.10 Negative - keys() no parameter', async function() {
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

      await testsUtil.assertThrowsAsync(
        async () => await collection.find().keys().getDocuments(),
        /NJS-009: invalid number of parameters/
      );

    } catch (err) {
      assert.ifError(err);
    } finally {
      await conn.commit();

      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.ifError(err);
        }
      }
    }
  }); // 174.10

  it('174.11 Negative - keys(null)', async function() {
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
      await testsUtil.assertThrowsAsync(
        async () => await collection.find().keys(null).getDocuments(),
        /NJS-005: invalid value for parameter 1/
      );

    } catch (err) {
      assert.ifError(err);
    } finally {
      await conn.commit();

      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.ifError(err);
        }
      }
    }
  }); // 174.11

  it('174.12 try to query documents with nonexistent keys', async function() {
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

      assert.strictEqual(result.count, 0);

    } catch (err) {
      assert.ifError(err);
    } finally {
      await conn.commit();

      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.ifError(err);
        }
      }
    }
  }); // 174.12

  it("174.13 hint(), basic case", async function() {
    // The SODA hint is available with Oracle Client 21.3 and
    // in 19 from 19.11
    if (oracledb.oracleClientVersion < 2103000000) {
      if (oracledb.oracleClientVersion < 1911000000 ||
          oracledb.oracleClientVersion >= 2000000000) {
        this.skip();
        return;
      }
    }
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_174_13");

      let options = {hint: "MONITOR"};
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        await collection.insertOneAndGet(content, options);
      }

      // Fetch back
      await collection
        .find()
        .hint("MONITOR");

    } catch (err) {
      assert.ifError(err);
    } finally {
      await conn.commit();

      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.ifError(err);
        }
      }
    }
  }); //174.13

  it("174.14 Negative - hint() no parameter", async function() {
    // The SODA hint is available with Oracle Client 21.3 and
    // in 19 from 19.11
    if (oracledb.oracleClientVersion < 2103000000) {
      if (oracledb.oracleClientVersion < 1911000000 ||
          oracledb.oracleClientVersion >= 2000000000) {
        this.skip();
        return;
      }
    }
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_174_14");

      let options = {hint: "MONITOR"};
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        await collection.insertOneAndGet(content, options);
      }

      // Fetch back
      await collection
        .find()
        .hint();

    } catch (err) {
      assert.match(err.message, /NJS-009:/);
    } finally {
      await conn.commit();

      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.ifError(err);
        }
      }
    }
  }); //174.14

  it("174.15 Negative - hint() invalid parameter type", async function() {
    // The SODA hint is available with Oracle Client 21.3 and
    // in 19 from 19.11
    if (oracledb.oracleClientVersion < 2103000000) {
      if (oracledb.oracleClientVersion < 1911000000 ||
          oracledb.oracleClientVersion >= 2000000000) {
        this.skip();
        return;
      }
    }
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_174_15");

      let options = {hint: "MONITOR"};
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        await collection.insertOneAndGet(content, options);
      }

      // Fetch back
      await collection
        .find()
        .hint(1);

    } catch (err) {
      assert.match(err.message, /NJS-005:/);
    } finally {
      await conn.commit();

      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.ifError(err);
        }
      }
    }
  }); //174.15

});

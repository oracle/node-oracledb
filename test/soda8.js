/* Copyright (c) 2018, 2023, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   176. soda8.js
 *
 * DESCRIPTION
 *   More tests for terminal methods of SodaOperation class
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

const t_contents = sodaUtil.t_contents;

describe('176. soda7.js', () => {

  before(async function() {
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
      return;
    }

    await sodaUtil.cleanup();
  });

  it('176.1 replaceOne(), basic case with document content', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbConfig);
      let soda = await conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_176_1");

      let myKeys = [];
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        let doc = await collection.insertOneAndGet(content);
        myKeys[i] = doc.key;
      }

      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      let res = await collection.find().key(myKeys[1]).replaceOne(inContent);
      assert.strictEqual(res.replaced, true);

      // Fetch all back
      let outDocuments = await collection.find().getDocuments();
      let contents = [];
      for (let i = 0; i < outDocuments.length; i++) {
        contents[i] = outDocuments[i].getContent();
        if (i == 1) {
          assert.deepEqual(contents[i], inContent);
        } else {
          testsUtil.assertOneOf(t_contents, contents[i]);
        }
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
  }); // 176.1

  it('176.2 replaceOne(), basic case with document object', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbConfig);
      let soda = await conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_176_2");

      let myKeys = [];
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        let doc = await collection.insertOneAndGet(content);
        myKeys[i] = doc.key;
      }

      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      let inDocument = soda.createDocument(inContent);

      let res = await collection.find().key(myKeys[1]).replaceOne(inDocument);
      assert.strictEqual(res.replaced, true);

      // Fetch all back
      let documents = await collection.find().getDocuments();
      let contents = [];
      for (let i = 0; i < documents.length; i++) {
        contents[i] = documents[i].getContent();
        if (i == 1) {
          assert.deepEqual(contents[i], inContent);
        } else {
          testsUtil.assertOneOf(t_contents, contents[i]);
        }
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
  }); // 176.2

  it('176.3 replaceOne(), no error is reported if the query criteria do not match any document', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbConfig);
      let soda = await conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_176_3");

      let myKeys = [];
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        let doc = await collection.insertOneAndGet(content);
        myKeys[i] = doc.key;
      }

      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      let res = await collection
        .find()
        .key('4A5AF2AAEB124FD4BFF80BC3630CB048')
        .replaceOne(inContent);
      assert.strictEqual(res.replaced, false);

      // Fetch all back
      let outDocuments = await collection.find().getDocuments();
      let contents = [];
      for (let i = 0; i < outDocuments.length; i++) {
        contents[i] = outDocuments[i].getContent();
        testsUtil.assertOneOf(t_contents, contents[i]);
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
  }); // 176.3

  it('176.4 Negative - replaceOne(), the key() method must be used', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbConfig);
      let soda = await conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_176_4");

      let myKeys = [];
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        let doc = await collection.insertOneAndGet(content);
        myKeys[i] = doc.key;
      }

      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      await assert.rejects(
        async () => await collection.find().replaceOne(inContent),
        /ORA-40734:/
      );
      // ORA-40734: key for the document to replace must be specified using the key attribute

      // Fetch all back
      let outDocuments = await collection.find().keys([myKeys[0]]).getDocuments();

      let contents = [];
      for (let i = 0; i < outDocuments.length; i++) {
        contents[i] = outDocuments[i].getContent();
        testsUtil.assertOneOf(t_contents, contents[i]);
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
  }); // 176.4

  it('176.5 replaceOneAndGet(), basic case with document content', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbConfig);
      let soda = await conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_176_5");

      let myKeys = [];
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        let doc = await collection.insertOneAndGet(content);
        myKeys[i] = doc.key;
      }

      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      let updatedDocument = await collection.find().key(myKeys[1]).replaceOneAndGet(inContent);
      assert(updatedDocument);

      // Fetch all back
      let outDocuments = await collection.find().getDocuments();
      let contents = [];
      for (let i = 0; i < outDocuments.length; i++) {
        contents[i] = outDocuments[i].getContent();
        if (i == 1) {
          assert.deepEqual(contents[i], inContent);
        } else {
          testsUtil.assertOneOf(t_contents, contents[i]);
        }
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
  }); // 176.5

  it('176.6 replaceOneAndGet(), basic case with document object', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbConfig);
      let soda = await conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_176_6");

      let myKeys = [];
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        let doc = await collection.insertOneAndGet(content);
        myKeys[i] = doc.key;
      }

      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      let inDocument = soda.createDocument(inContent);

      let updatedDocument = await collection.find().key(myKeys[1]).replaceOneAndGet(inDocument);
      assert(updatedDocument);

      // Fetch all back
      let documents = await collection.find().getDocuments();
      let contents = [];
      for (let i = 0; i < documents.length; i++) {
        contents[i] = documents[i].getContent();
        if (i == 1) {
          assert.deepEqual(contents[i], inContent);
        } else {
          testsUtil.assertOneOf(t_contents, contents[i]);
        }
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
  }); // 176.6

  it('176.7 replaceOneAndGet(), updatedDocument does not have document content', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbConfig);
      let soda = await conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_176_7");

      let myKeys = [];
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        let doc = await collection.insertOneAndGet(content);
        myKeys[i] = doc.key;
      }

      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      let updatedDocument = await collection.find().key(myKeys[1]).replaceOneAndGet(inContent);
      assert(updatedDocument);

      let outContent = updatedDocument.getContent();
      assert.ifError(outContent);

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
  }); // 176.7

  it('176.8 replaceOneAndGet(), no error is reported if it does not match any document', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbConfig);
      let soda = await conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_176_8");

      let myKeys = [];
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        let doc = await collection.insertOneAndGet(content);
        myKeys[i] = doc.key;
      }

      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      let updatedDocument = await collection
        .find()
        .key('4A5AF2AAEB124FD4BFF80BC3630CB048')
        .replaceOneAndGet(inContent);
      assert.ifError(updatedDocument);

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
  }); // 176.8
});

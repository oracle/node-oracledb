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

describe('176. soda8.js', () => {

  before(async function() {
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
    }

    await sodaUtil.cleanup();
  });

  it('176.1 replaceOne(), basic case with document content', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = await conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_176_1");

    const myKeys = [];
    for (let i = 0; i < t_contents.length; i++) {
      const content = t_contents[i];
      const doc = await collection.insertOneAndGet(content);
      myKeys[i] = doc.key;
    }

    const inContent = { id: 2000, name: "Paul",  office: "Singapore" };
    let res = await collection.find().key(myKeys[1]).replaceOne(inContent);
    assert.strictEqual(res.replaced, true);

    // Fetch all back
    const outDocuments = await collection.find().getDocuments();
    const contents = [];
    for (let i = 0; i < outDocuments.length; i++) {
      contents[i] = outDocuments[i].getContent();
      if (i == 1) {
        testsUtil.removeID(contents[i]);
        testsUtil.removeID(inContent);
        assert.deepStrictEqual(contents[i], inContent);
      } else {
        testsUtil.removeID(contents[i]);
        testsUtil.removeID(t_contents);
        testsUtil.assertOneOf(t_contents, contents[i]);
      }
    }

    await conn.commit();
    res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 176.1

  it('176.2 replaceOne(), basic case with document content with autocommit = true', async () => {
    oracledb.autoCommit = true;
    const conn = await oracledb.getConnection(dbConfig);
    const soda = await conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_176_1");

    const myKeys = [];
    for (let i = 0; i < t_contents.length; i++) {
      const content = t_contents[i];
      const doc = await collection.insertOneAndGet(content);
      myKeys[i] = doc.key;
    }

    const inContent = { id: 2000, name: "Paul",  office: "Singapore" };
    let res = await collection.find().key(myKeys[1]).replaceOne(inContent);
    assert.strictEqual(res.replaced, true);

    // Fetch all back
    const outDocuments = await collection.find().getDocuments();
    const contents = [];
    for (let i = 0; i < outDocuments.length; i++) {
      contents[i] = outDocuments[i].getContent();
      if (i == 1) {
        testsUtil.removeID(contents[i]);
        testsUtil.removeID(inContent);
        assert.deepStrictEqual(contents[i], inContent);
      } else {
        testsUtil.removeID(contents[i]);
        testsUtil.removeID(t_contents);
        testsUtil.assertOneOf(t_contents, contents[i]);
      }
    }

    await conn.commit();
    res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
    oracledb.autoCommit = false;
  }); // 176.2

  it('176.3 replaceOne(), basic case with document object', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = await conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_176_2");

    const myKeys = [];
    for (let i = 0; i < t_contents.length; i++) {
      const content = t_contents[i];
      const doc = await collection.insertOneAndGet(content);
      myKeys[i] = doc.key;
    }

    const inContent = { id: 2000, name: "Paul",  office: "Singapore" };
    const inDocument = soda.createDocument(inContent);

    let res = await collection.find().key(myKeys[1]).replaceOne(inDocument);
    assert.strictEqual(res.replaced, true);

    // Fetch all back
    const documents = await collection.find().getDocuments();
    const contents = [];
    for (let i = 0; i < documents.length; i++) {
      contents[i] = documents[i].getContent();
      if (i == 1) {
        testsUtil.removeID(contents[i]);
        testsUtil.removeID(inContent);
        assert.deepStrictEqual(contents[i], inContent);
      } else {
        testsUtil.removeID(contents[i]);
        testsUtil.removeID(t_contents);
        testsUtil.assertOneOf(t_contents, contents[i]);
      }
    }
    await conn.commit();
    res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 176.3

  it('175.4 replaceOne(), no error is reported if the query criteria do not match any document', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = await conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_176_3");

    const myKeys = [];
    for (let i = 0; i < t_contents.length; i++) {
      const content = t_contents[i];
      const doc = await collection.insertOneAndGet(content);
      myKeys[i] = doc.key;
    }

    const inContent = { id: 2000, name: "Paul",  office: "Singapore" };
    let res = await collection
      .find()
      .key('4A5AF2AAEB124FD4BFF80BC3630CB048')
      .replaceOne(inContent);
    assert.strictEqual(res.replaced, false);

    // Fetch all back
    const outDocuments = await collection.find().getDocuments();
    const contents = [];
    for (let i = 0; i < outDocuments.length; i++) {
      contents[i] = outDocuments[i].getContent();
      testsUtil.removeID(contents[i]);
      testsUtil.removeID(t_contents);
      testsUtil.assertOneOf(t_contents, contents[i]);
    }

    await conn.commit();
    res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.4

  it('175.5 Negative - replaceOne(), the key() method must be used', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = await conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_176_4");

    const myKeys = [];
    for (let i = 0; i < t_contents.length; i++) {
      const content = t_contents[i];
      const doc = await collection.insertOneAndGet(content);
      myKeys[i] = doc.key;
    }

    const inContent = { id: 2000, name: "Paul",  office: "Singapore" };
    await assert.rejects(
      async () => await collection.find().replaceOne(inContent),
      /ORA-40734:/
    );
    // ORA-40734: key for the document to replace must be specified using the key attribute

    // Fetch all back
    const outDocuments = await collection.find().keys([myKeys[0]]).getDocuments();

    const contents = [];
    for (let i = 0; i < outDocuments.length; i++) {
      contents[i] = outDocuments[i].getContent();
      testsUtil.removeID(contents[i]);
      testsUtil.removeID(t_contents);
      testsUtil.assertOneOf(t_contents, contents[i]);
    }

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.5

  it('175.6 replaceOneAndGet(), basic case with document content', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = await conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_176_5");

    const myKeys = [];
    for (let i = 0; i < t_contents.length; i++) {
      const content = t_contents[i];
      const doc = await collection.insertOneAndGet(content);
      myKeys[i] = doc.key;
    }

    const inContent = { id: 2000, name: "Paul",  office: "Singapore" };
    const updatedDocument = await collection.find().key(myKeys[1]).replaceOneAndGet(inContent);
    assert(updatedDocument);

    // Fetch all back
    const outDocuments = await collection.find().getDocuments();
    const contents = [];
    for (let i = 0; i < outDocuments.length; i++) {
      contents[i] = outDocuments[i].getContent();
      if (i == 1) {
        testsUtil.removeID(contents[i]);
        testsUtil.removeID(inContent);
        assert.deepStrictEqual(contents[i], inContent);
      } else {
        testsUtil.removeID(contents[i]);
        testsUtil.removeID(t_contents);
        testsUtil.assertOneOf(t_contents, contents[i]);
      }
    }

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.6

  it('175.7 replaceOneAndGet(), basic case with document content with autocommit = true', async () => {
    oracledb.autoCommit = true;
    const conn = await oracledb.getConnection(dbConfig);
    const soda = await conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_176_5");

    const myKeys = [];
    for (let i = 0; i < t_contents.length; i++) {
      const content = t_contents[i];
      const doc = await collection.insertOneAndGet(content);
      myKeys[i] = doc.key;
    }

    const inContent = { id: 2000, name: "Paul",  office: "Singapore" };
    const updatedDocument = await collection.find().key(myKeys[1]).replaceOneAndGet(inContent);
    assert(updatedDocument);

    // Fetch all back
    const outDocuments = await collection.find().getDocuments();
    const contents = [];
    for (let i = 0; i < outDocuments.length; i++) {
      contents[i] = outDocuments[i].getContent();
      if (i == 1) {
        testsUtil.removeID(contents[i]);
        testsUtil.removeID(inContent);
        assert.deepStrictEqual(contents[i], inContent);
      } else {
        testsUtil.removeID(contents[i]);
        testsUtil.removeID(t_contents);
        testsUtil.assertOneOf(t_contents, contents[i]);
      }
    }

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
    oracledb.autoCommit = false;
  }); // 175.7

  it('175.8 replaceOneAndGet(), basic case with document object', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = await conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_176_6");

    const myKeys = [];
    for (let i = 0; i < t_contents.length; i++) {
      const content = t_contents[i];
      const doc = await collection.insertOneAndGet(content);
      myKeys[i] = doc.key;
    }

    const inContent = { id: 2000, name: "Paul",  office: "Singapore" };
    const inDocument = soda.createDocument(inContent);

    const updatedDocument = await collection.find().key(myKeys[1]).replaceOneAndGet(inDocument);
    assert(updatedDocument);

    // Fetch all back
    const documents = await collection.find().getDocuments();
    const contents = [];
    for (let i = 0; i < documents.length; i++) {
      contents[i] = documents[i].getContent();
      if (i == 1) {
        testsUtil.removeID(contents[i]);
        testsUtil.removeID(inContent);
        assert.deepStrictEqual(contents[i], inContent);
      } else {

        testsUtil.removeID(contents[i]);
        testsUtil.removeID(t_contents);
        testsUtil.assertOneOf(t_contents, contents[i]);
      }
    }

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.8

  it('175.9 replaceOneAndGet(), updatedDocument does not have document content', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = await conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_176_7");

    const myKeys = [];
    for (let i = 0; i < t_contents.length; i++) {
      const content = t_contents[i];
      const doc = await collection.insertOneAndGet(content);
      myKeys[i] = doc.key;
    }

    const inContent = { id: 2000, name: "Paul",  office: "Singapore" };
    const updatedDocument = await collection.find().key(myKeys[1]).replaceOneAndGet(inContent);
    assert(updatedDocument);

    const outContent = updatedDocument.getContent();
    assert.ifError(outContent);

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.9

  it('175.10 replaceOneAndGet(), no error is reported if it does not match any document', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = await conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_176_8");

    const myKeys = [];
    for (let i = 0; i < t_contents.length; i++) {
      const content = t_contents[i];
      const doc = await collection.insertOneAndGet(content);
      myKeys[i] = doc.key;
    }

    const inContent = { id: 2000, name: "Paul",  office: "Singapore" };
    const updatedDocument = await collection
      .find()
      .key('4A5AF2AAEB124FD4BFF80BC3630CB048')
      .replaceOneAndGet(inContent);
    assert.ifError(updatedDocument);

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.10
});

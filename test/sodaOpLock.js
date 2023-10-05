/* Copyright (c) 2020, 2023, Oracle and/or its affiliates. */

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
 *   287. sodaOpLock.js
 *
 * DESCRIPTION
 *  Test the non-terminal lock() method on soda-Operation.
 *
 *****************************************************************************/
'use strict';

const assert  = require('assert');
const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

const t_contents = sodaUtil.t_contents;

describe('287. sodaOpLock.js', () => {
  let conn, isRunnable;
  before(async function() {
    const isSodaRunnable = await testsUtil.isSodaRunnable();
    const clientVersion = testsUtil.getClientVersion();

    let isClientOK;
    if (clientVersion < 2000000000) {
      isClientOK = false;
    } else {
      isClientOK = true;
    }
    isRunnable = isClientOK && isSodaRunnable;
    if (!isRunnable) {
      this.skip();
    }

    conn = await oracledb.getConnection(dbConfig);

    // Auto commit should not be on for testing lock()
    oracledb.autoCommit = false;
  }); // before

  after(async function() {
    if (!isRunnable) {
      return;
    }
    await conn.close();
  });

  it('287.1 lock on document with multiple connections', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_lock_test_287_1");

    const myKeys = [];
    for (let i = 0; i < t_contents.length; i++) {
      const content = t_contents[i];
      const doc = await collection.insertOneAndGet(content);
      myKeys[i] = doc.key;
    }

    await conn.commit();

    // lock and Fetch back
    const outDocuments = await collection.find().lock().getDocuments();
    const contents = [];
    for (let i = 0; i < outDocuments.length; i++) {
      contents[i] = outDocuments[i].getContent();
      testsUtil.removeID(contents[i]);
      testsUtil.removeID(t_contents);
      testsUtil.assertOneOf(t_contents, contents[i]);
    }

    // create another connection
    const conn1 = await oracledb.getConnection(dbConfig);
    const soda1 = await conn1.getSodaDatabase();
    const collection1 = await soda1.createCollection("soda_lock_test_287_1");

    // Replace operation should not succeed until a commit is performed.
    const inContent1 = { id: 2000, name: "Paul",  office: "Singapore" };

    async function delayedCommit() {
      await new Promise((resolve) => setTimeout(resolve, 250));
      await conn.commit();
    }
    const operations = [
      collection1.find().key(myKeys[1]).replaceOne(inContent1),
      delayedCommit()
    ];

    const [replaceResult] = await Promise.all(operations);

    assert.strictEqual(replaceResult.replaced, true);

    let res = await collection1.find().key(myKeys[1]).replaceOne(inContent1);
    assert.strictEqual(res.replaced, true);

    await conn1.close();

    res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 287.1

  it('287.2 lock on fetching a single document', async () => {
    const sd = conn.getSodaDatabase();
    const collName = "soda_lock_test_287_2";
    const coll = await sd.createCollection(collName);

    // Insert a new document
    const myContent = { name: "Sally", address: {city: "Melbourne"} };
    await coll.insertOne(myContent);

    // Lock all documents
    const docs = await coll.find().lock().getDocuments();

    await docs.forEach(function(element) {
      const content = element.getContent();
      assert.strictEqual(content.name, myContent.name);
      assert.strictEqual(content.address.city, myContent.address.city);
    });

    assert.strictEqual(docs.length, 1);
    await conn.commit();

    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);
  }); // 287.2

  it('287.3 lock on fetching multiple documents', async () => {
    const sd = conn.getSodaDatabase();
    const collectionName = 'soda_lock_test_287_3';
    const coll = await sd.createCollection(collectionName);

    const myContents = [
      { name: "Sally", address: {city: "Melbourne"} },
      { name: "John", address: {city: "Bangalore"} },
      { name: "Milan", address: {city: "Shenzhen"} }
    ];

    await Promise.all(
      myContents.map(function(con) {
        return coll.insertOne(con);
      })
    );

    const docs = await coll.find().lock().getDocuments();
    assert.strictEqual(docs.length, 3);

    await docs.forEach(function(element) {
      const content = element.getContent();
      myContents.includes(content);
    });

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);
  }); // 287.3

  it('287.4 lock on insertOneAndGet()', async () => {
    const sd = conn.getSodaDatabase();
    const collectionName = 'soda_lock_test_287_4';
    const coll = await sd.createCollection(collectionName);

    // Insert a new document
    const testContent = {
      name:    "Steven Gomes",
      address: {city: "Los Angeles", country: "US"},
      company: "Oracle Corporation",
      manager: null,
      VP:      "Bruce"
    };

    const myDoc = await coll.insertOneAndGet(testContent);
    const myKey = myDoc.key;
    assert(myKey);
    assert.strictEqual(typeof (myKey), "string");
    assert.strictEqual(typeof (myDoc), "object");

    const content1 = myDoc.getContent();
    assert.ifError(content1);

    // Fetch it back
    const doc2 = await coll.find().key(myKey).lock().getOne();
    const content2 = doc2.getContent();
    assert.strictEqual(content2.name, testContent.name);
    assert.strictEqual(content2.company, testContent.company);
    assert.strictEqual(content2.manager, null);

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);
  }); // 287.4

  it('287.5 lock on filter()', async function() {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_lock_test_287_5");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    await assert.rejects(
      async () => await collection.find()
        .lock().filter({ "office": {"$like": "Shenzhen"} })
        .count(),
      /ORA-40821:/ //ORA-40821: LOCK attribute cannot be set for count operation
    );
  }); // 287.5

  it('287.6 lock on key()', async function() {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_lock_test_287_6");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Insert another document
    const content1 = { id: 1008, name: "Justin", office: "Shenzhen" };
    const doc1 = await collection.insertOneAndGet(content1);
    const key1 = doc1.key;
    assert.strictEqual(typeof (key1), "string");

    // Fetch it back
    const doc2 = await collection.find().lock().key(key1).getOne();
    const content2 = doc2.getContent();
    testsUtil.removeID(content1);
    testsUtil.removeID(content2);
    assert.deepStrictEqual(content2, content1);

    const empInShenzhen = await collection.find()
      .filter({ "office": {"$like": "Shenzhen"} })
      .count();
    assert.strictEqual(empInShenzhen.count, 3);

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 287.6

  it("287.7 lock on hint()", async function() {
    /*
      The SODA hint is available with Oracle Client 21.3 and
      in 19 from 19.11
    */
    const clientVersion = testsUtil.getClientVersion();
    if (clientVersion < 2103000000) {
      if (clientVersion < 1911000000 || clientVersion >= 2000000000) {
        this.skip();
      }
    }

    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_lock_test_287_7");

    const options = {hint: "MONITOR"};
    for (let i = 0; i < t_contents.length; i++) {
      const content = t_contents[i];
      await collection.insertOneAndGet(content, options);
    }

    // Fetch back
    await collection
      .find().lock()
      .hint("MONITOR");

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 287.7

  it('287.8 lock on count()', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_lock_test_287_8");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    await assert.rejects(
      async () => await collection.find().lock().count(),
      /ORA-40821:/ //ORA-40821: LOCK attribute cannot be set for count operation
    );
  }); // 287.8

  it('287.9 lock on keys().count()', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_lock_test_287_9");

    const myKeys = [];
    for (let i = 0; i < t_contents.length; i++) {
      const content = t_contents[i];
      const doc = await collection.insertOneAndGet(content);
      myKeys[i] = doc.key;
    }

    // Fetch back
    const keysToCount = [ myKeys[2], myKeys[3] ];
    await assert.rejects(
      async () => await collection.find().lock().keys(keysToCount).count(),
      /ORA-40821:/ //ORA-40821: LOCK attribute cannot be set for count operation
    );
  }); // 287.9

  it('287.10 lock on getCursor()', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_lock_test_287_10");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const docCursor = await collection.find().lock().getCursor();

    const myContents = [];
    let hasNext = true;
    let myDocument;
    for (let i = 0; hasNext; i++) {
      myDocument = await docCursor.getNext();
      if (!myDocument) {
        hasNext = false;
      } else {
        myContents[i] = myDocument.getContent();
        (t_contents).includes(myContents[i]);
      }
    }

    assert.strictEqual(myContents.length, t_contents.length);

    await docCursor.close();

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 287.10

  it('287.11 lock on skip().getCursor()', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_lock_test_287_11");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const numberToSkip = 3;
    await assert.rejects(
      async () => await collection.find().lock().skip(numberToSkip).getCursor(),
      /ORA-40820:/ //ORA-40820: Cannot set LOCK attribute on the operation if SKIP or LIMIT attributes are set
    );
  }); // 287.11

  it('287.12 lock on getDocuments()', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_lock_test_287_12");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const documents = await collection.find().lock().getDocuments();

    // Get contents
    const myContents = [];
    for (let i = 0; i < documents.length; i++) {
      myContents[i] = documents[i].getContent();
      (t_contents).includes(myContents[i]);
    }

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 287.12

  it('287.13 lock on getOne()', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_lock_test_287_13");

    const myKeys = [];
    for (let i = 0; i < t_contents.length; i++) {
      const content = t_contents[i];
      const doc = await collection.insertOneAndGet(content);
      myKeys[i] = doc.key;
    }

    // Fetch back
    const document = await collection.find().lock().key(myKeys[1]).getOne();
    const content = document.getContent();
    (t_contents).includes(content);

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 287.13

  it('287.14 lock on remove()', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_lock_test_287_14");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const result = await collection
      .find()
      .filter({ "office": {"$like": "Shenzhen"} })
      .remove();

    assert.strictEqual(result.count, 2);

    const remainingLength = await collection.find().count();
    assert.strictEqual(remainingLength.count, (t_contents.length - result.count));

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
  }); // 287.14

  it('287.15 lock on limit()', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_lock_test_287_15");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const limitNumbers = 3;
    await assert.rejects(
      async () => await collection.find().lock().limit(limitNumbers).getCursor(),
      /ORA-40820:/ //ORA-40820: Cannot set LOCK attribute on the operation if SKIP or LIMIT attributes are set
    );
  }); // 287.15
});

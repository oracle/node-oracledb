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
 *   175. soda7.js
 *
 * DESCRIPTION
 *   Tests for terminal methods of SodaOperation class
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

const t_contents = sodaUtil.t_contents;

describe('175. soda7.js', () => {

  before(async function() {
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
    }

    await sodaUtil.cleanup();
  });

  it('175.1 count(), basic case', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_175_1");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const emps = await collection.find().count();
    assert.strictEqual(emps.count, t_contents.length);

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.1

  it('175.2 Negative - skip().count()', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_175_2");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const numberToSkip = 3;
    await assert.rejects(
      async () => await collection.find().skip(numberToSkip).count(),
      /ORA-40748:/
    );
    // ORA-40748: SKIP and LIMIT attributes cannot be used for count operation.

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.2

  it('175.3 Negative - limit().count()', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_175_3");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const numberToLimit = 5;
    await assert.rejects(
      async () => await collection.find().skip(numberToLimit).count(),
      /ORA-40748:/
    );
    // ORA-40748: SKIP and LIMIT attributes cannot be used for count operation.

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.3

  it('175.4 keys().count()', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_175_4");

    const myKeys = [];
    for (let i = 0; i < t_contents.length; i++) {
      const content = t_contents[i];
      const doc = await collection.insertOneAndGet(content);
      myKeys[i] = doc.key;
    }

    // Fetch back
    const keysToCount = [ myKeys[2], myKeys[3] ];
    const emps = await collection.find().keys(keysToCount).count();
    assert.strictEqual(emps.count, keysToCount.length);

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.4

  it('175.5 getCursor(), basic case', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_175_5");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const docCursor = await collection.find().getCursor();

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
    await conn.close();
  }); // 175.5

  it('175.6 skip().getCursor()', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_175_6");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const numberToSkip = 3;
    const docCursor = await collection.find().skip(numberToSkip).getCursor();

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

    assert.strictEqual(myContents.length, (t_contents.length - numberToSkip));
    await docCursor.close();

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.6

  it('175.7 getCursor(), empty document matched', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_175_7");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const numberToSkip = t_contents.length + 3;
    const docCursor = await collection.find().skip(numberToSkip).getCursor();

    const myDocument = await docCursor.getNext();
    assert.strictEqual(myDocument, undefined);
    await docCursor.close();

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.7

  it('175.8 Negative - close document cursor two times', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_175_8");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const docCursor = await collection.find().getCursor();

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
    await assert.rejects(
      async () => await docCursor.close(),
      /NJS-066: invalid SODA document cursor/
    );

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.8

  it('175.9 getDocuments(), basic case', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_175_9");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const documents = await collection.find().getDocuments();

    // Get contents
    const myContents = [];
    for (let i = 0; i < documents.length; i++) {
      myContents[i] = documents[i].getContent();
      (t_contents).includes(myContents[i]);
    }

    await conn.commit();

    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.9

  it('175.10 getDocuments(), no documents matched', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_175_10");

    // Fetch back
    const documents = await collection.find().getDocuments();
    assert.deepStrictEqual(documents, []);
    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.10

  it('175.11 getOne(), basic case', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_175_11");

    const myKeys = [];
    for (let i = 0; i < t_contents.length; i++) {
      const content = t_contents[i];
      const doc = await collection.insertOneAndGet(content);
      myKeys[i] = doc.key;
    }

    // Fetch back
    const document = await collection.find().key(myKeys[1]).getOne();
    const content = document.getContent();
    (t_contents).includes(content);

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.11

  it('175.12 getOne(), the filter matches multiple documents', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_175_12");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const document = await collection.find().getOne();
    const content = document.getContent();
    (t_contents).includes(content);

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.12

  it('175.13 remove(), basic case', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_175_13");

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
    await conn.close();
  }); // 175.13

  it('175.14 remove(), remove zero document', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_175_14");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    const result = await collection
      .find()
      .key('4A5AF2AAEB124FD4BFF80BC3630CB048')
      .remove();

    assert.strictEqual(result.count, 0);

    const remainingLength = await collection.find().count();
    assert.strictEqual(remainingLength.count, (t_contents.length - result.count));

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.14

  it('175.15 remove(), remove multiple times', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_175_13");

    await Promise.all(
      t_contents.map(function(content) {
        return collection.insertOne(content);
      })
    );

    // Fetch back
    await collection.find().remove();
    const result = await collection.find().remove();

    assert.strictEqual(result.count, 0);

    const remainingLength = await collection.find().count();
    assert.strictEqual(remainingLength.count, 0);

    await conn.commit();
    const res = await collection.drop();
    assert.strictEqual(res.dropped, true);
    await conn.close();
  }); // 175.15
});

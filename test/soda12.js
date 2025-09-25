/* Copyright (c) 2021, 2025, Oracle and/or its affiliates. */

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
 *   230. soda12.js
 *
 * DESCRIPTION
 *   save() and saveAndGet() methods
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('230. soda12.js', () => {
  let conn;

  before(async function() {
    if (oracledb.thin) this.skip();
    const clientVersion = testsUtil.getClientVersion();
    const isClientOK = clientVersion < 1909000000 ? false : true;

    const sodaRole = await sodaUtil.isSodaRoleGranted();

    const isRunnable = isClientOK && sodaRole;
    if (!isRunnable) {
      this.skip();
    }

    await sodaUtil.cleanup();
  }); // before()

  function getMetadata(tableName, assignmentMethod = "CLIENT", keyColumnType = "NUMBER") {
    return {
      tableName: tableName,
      keyColumn: {
        name: "ID",
        sqlType: keyColumnType,
        assignmentMethod: assignmentMethod
      },
      contentColumn: {
        name: "JSON_DOCUMENT",
        sqlType: "BLOB",
        compress: "NONE",
        cache: true,
        encrypt: "NONE",
        validation: "STANDARD"
      },
      versionColumn: {
        name: "VERSION",
        method: "SHA256"
      },
      lastModifiedColumn: {
        name: "LAST_MODIFIED"
      },
      creationTimeColumn: {
        name: "CREATED_ON"
      },
      readOnly: false
    };
  }

  beforeEach(async () => {
    conn = await oracledb.getConnection(dbConfig);
  }); // beforeEach()

  afterEach(async () => {
    if (conn) {
      await conn.close();
      conn = null;
    }
  }); // afterEach()

  it('230.1 example case', async () => {

    const TABLE = "soda_test_230_1";
    const metadata = getMetadata(TABLE);

    const soda = conn.getSodaDatabase();
    const coll = await soda.createCollection(TABLE, { metaData: metadata });

    // (1)
    const content1 = {fred: 5, george: 10};
    let doc = soda.createDocument(content1, { key: "1" });
    await coll.save(doc);
    await conn.commit();
    const docs1 = await coll.find().getDocuments();
    assert.strictEqual(docs1.length, 1);
    assert.strictEqual(docs1[0].key, '1');
    assert.deepStrictEqual(docs1[0].getContent(), content1);

    // (2)
    const content2 = {sally: 1, betty: 2};
    doc = soda.createDocument(content2, { key: "2" });
    await coll.save(doc);
    await conn.commit();
    const docs2 = await coll.find().getDocuments();
    assert.strictEqual(docs2.length, 2);
    assert.strictEqual(docs2[1].key, '2');
    assert.deepStrictEqual(docs2[1].getContent(), content2);

    // (3)
    const content3 = {fred: 8, george: 16};
    doc = soda.createDocument(content3, { key: "1" });
    await coll.save(doc);
    await conn.commit();
    const docs3 = await coll.find().getDocuments();
    assert.strictEqual(docs3.length, 2);
    assert.strictEqual(docs3[0].key, '1');
    assert.deepStrictEqual(docs3[0].getContent(), content3);

    // (4)
    const content4 = {sally: 3, betty: 5};
    doc = soda.createDocument(content4, { key: "2" });
    const returnedDoc = await coll.saveAndGet(doc);
    await conn.commit();
    assert.strictEqual(returnedDoc.key, '2');

    const docs4 = await coll.find().getDocuments();
    assert.strictEqual(docs4.length, 2);
    assert.strictEqual(docs4[1].key, '2');
    assert.deepStrictEqual(docs4[1].getContent(), content4);

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);

  }); // 230.1

  it('230.2 insertOne() and save()', async () => {

    const TABLE = "soda_test_230_2";
    const metadata = getMetadata(TABLE);

    const soda = conn.getSodaDatabase();
    const coll = await soda.createCollection(TABLE, { metaData: metadata });

    const content1 = { id: 1, name: "Paul",  office: "Singapore" };
    let doc = soda.createDocument(content1, { key: "3" });
    await coll.insertOne(doc);
    await conn.commit();

    const content2 = {Charlie: 2, David: 20};
    doc = soda.createDocument(content2, { key: "4" });
    await coll.save(doc);
    await conn.commit();

    const content3 = {Eve: 3, Frank: 30};
    doc = soda.createDocument(content3, { key: "3" });
    await coll.save(doc);
    await conn.commit();

    const docs = await coll.find().getDocuments();
    assert.strictEqual(docs.length, 2);
    assert.strictEqual(docs[0].key, '3');
    assert.deepStrictEqual(docs[0].getContent(), content3);
    assert.strictEqual(docs[1].key, '4');
    assert.deepStrictEqual(docs[1].getContent(), content2);

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);

  }); // 230.2

  it('230.3 Negative - client assigned keys are necessary', async () => {

    const TABLE = "soda_test_230_3";
    const metadata = getMetadata(TABLE);

    const soda = conn.getSodaDatabase();
    const coll = await soda.createCollection(TABLE, { metaData: metadata });

    /* save() with content directly */
    // ORA-40661: Key value cannot be null for this operation.
    const content = { id: 23, name: "Changjie",  office: "Shenzhen", key: "1" };
    await assert.rejects(
      async () => {
        await coll.save(content);
      },
      /ORA-40661/
    );

    const doc = soda.createDocument(content);
    await assert.rejects(
      async () => {
        await coll.save(doc);
      },
      /ORA-40661/
    );
    await conn.commit();

    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);

  }); // 230.3

  it('230.4 Negative - save without arguments', async () => {

    const TABLE = "soda_test_230_4";
    const metadata = getMetadata(TABLE);

    const soda = conn.getSodaDatabase();
    const coll = await soda.createCollection(TABLE, { metaData: metadata });

    // NJS-009: invalid number of parameters
    await assert.rejects(
      async () => {
        await coll.save();
      },
      /NJS-009/
    );

    await assert.rejects(
      async () => {
        await coll.saveAndGet();
      },
      /NJS-009/
    );


    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);

  }); // 230.4

  it('230.5 save() with multiple updates for the same key', async () => {

    const TABLE = "soda_test_230_5";
    const metadata = getMetadata(TABLE);

    const soda = conn.getSodaDatabase();
    const coll = await soda.createCollection(TABLE, { metaData: metadata });

    const content1 = { id: 1, name: "Alice", office: "New York" };
    const doc1 = soda.createDocument(content1, { key: "101" });
    await coll.save(doc1);

    // Update the same key with new content
    const content2 = { id: 1, name: "Alice", office: "Boston" };
    const doc2 = soda.createDocument(content2, { key: "101" });
    await coll.save(doc2);

    // Verify the final content for the key
    const docs = await coll.find().getDocuments();
    assert.strictEqual(docs.length, 1);
    assert.strictEqual(docs[0].key, "101");
    assert.deepStrictEqual(docs[0].getContent(), content2);

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);
  }); // 230.5

  it('230.6 save() with different key column types', async () => {
    const TABLE = "soda_test_230_8";
    const metadata = getMetadata(TABLE, "CLIENT", "VARCHAR2");

    const soda = conn.getSodaDatabase();
    const coll = await soda.createCollection(TABLE, { metaData: metadata });

    // Test with various key formats
    const testCases = [
      { key: "ABC123", content: { data: "test1" } },
      { key: "user_001", content: { data: "test2" } },
      { key: "12345", content: { data: "test3" } }
    ];

    for (const testCase of testCases) {
      const doc = soda.createDocument(testCase.content, { key: testCase.key });
      await coll.save(doc);
    }
    await conn.commit();

    // Verify all documents were saved correctly
    const docs = await coll.find().getDocuments();
    assert.strictEqual(docs.length, testCases.length);
    for (let i = 0; i < docs.length; i++) {
      assert.strictEqual(docs[i].key, testCases[i].key);
      assert.deepStrictEqual(docs[i].getContent(), testCases[i].content);
    }

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);
  }); // 230.6
});

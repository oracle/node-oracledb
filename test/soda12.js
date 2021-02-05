/* Copyright (c) 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   230. soda12.js
 *
 * DESCRIPTION
 *   save() and saveAndGet() methods
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('230. soda12.js', () => {

  before(async function() {
    let isSodaRunnable = await testsUtil.isSodaRunnable();

    const clientVersion = oracledb.oracleClientVersion;
    let isClientOK;
    if (clientVersion < 2000000000) {
      isClientOK = false;
    } else {
      isClientOK = true;
    }

    const isRunnable = isClientOK && isSodaRunnable;
    if (!isRunnable) {
      this.skip();
      return;
    }

    await sodaUtil.cleanup();
    await sodaUtil.grantPrivilege();
  }); // before()

  function getMetadata(tableName) {
    const metadata = {
      "tableName": tableName,
      "keyColumn":
      {
        "name": "ID",
        "sqlType": "NUMBER",
        "assignmentMethod": "CLIENT"
      },
      "contentColumn":
      {
        "name": "JSON_DOCUMENT",
        "sqlType": "BLOB",
        "compress": "NONE",
        "cache": true,
        "encrypt": "NONE",
        "validation": "STANDARD"
      },
      "versionColumn":
      {
        "name": "VERSION",
        "method": "SHA256"
      },
      "lastModifiedColumn":
      {
        "name": "LAST_MODIFIED"
      },
      "creationTimeColumn":
      {
        "name": "CREATED_ON"
      },
      "readOnly": false
    };
    return metadata;
  }

  it('230.1 example case', async () => {

    const TABLE = "soda_test_230_1";
    const metadata = await getMetadata(TABLE);

    try {
      const conn = await oracledb.getConnection(dbconfig);
      const soda = await conn.getSodaDatabase();
      const coll = await soda.createCollection(TABLE, { metaData: metadata });

      // (1)
      const content1 = {fred: 5, george: 10};
      let doc = await soda.createDocument(content1, { key: "1" });
      await coll.save(doc);
      await conn.commit();
      const docs1 = await coll.find().getDocuments();
      should.strictEqual(docs1.length, 1);
      should.strictEqual(docs1[0].key, '1');
      should.deepEqual(docs1[0].getContent(), content1);

      // (2)
      const content2 = {sally: 1, betty: 2};
      doc = await soda.createDocument(content2, { key: "2" });
      await coll.save(doc);
      await conn.commit();
      const docs2 = await coll.find().getDocuments();
      should.strictEqual(docs2.length, 2);
      should.strictEqual(docs2[1].key, '2');
      should.deepEqual(docs2[1].getContent(), content2);

      // (3)
      const content3 = {fred: 8, george: 16};
      doc = await soda.createDocument(content3, { key: "1" });
      await coll.save(doc);
      await conn.commit();
      const docs3 = await coll.find().getDocuments();
      should.strictEqual(docs3.length, 2);
      should.strictEqual(docs3[0].key, '1');
      should.deepEqual(docs3[0].getContent(), content3);

      // (4)
      const content4 = {sally: 3, betty: 5};
      doc = await soda.createDocument(content4, { key: "2" });
      const returnedDoc = await coll.saveAndGet(doc);
      await conn.commit();
      should.strictEqual(returnedDoc.key, '2');

      const docs4 = await coll.find().getDocuments();
      should.strictEqual(docs4.length, 2);
      should.strictEqual(docs4[1].key, '2');
      should.deepEqual(docs4[1].getContent(), content4);

      await conn.commit();
      let res = await coll.drop();
      should.strictEqual(res.dropped, true);
      await conn.close();

    } catch (err) {
      should.not.exist(err);
    }

  }); // 230.1

  it('230.2 insertOne() and save()', async () => {

    const TABLE = "soda_test_230_2";
    const metadata = await getMetadata(TABLE);
    try {
      const conn = await oracledb.getConnection(dbconfig);
      const soda = await conn.getSodaDatabase();
      const coll = await soda.createCollection(TABLE, { metaData: metadata });

      const content1 = { id: 1, name: "Paul",  office: "Singapore" };
      let doc = await soda.createDocument(content1, { key: "3" });
      await coll.insertOne(doc);
      await conn.commit();

      const content2 = {Charlie: 2, David: 20};
      doc = await soda.createDocument(content2, { key: "4" });
      await coll.save(doc);
      await conn.commit();

      const content3 = {Eve: 3, Frank: 30};
      doc = await soda.createDocument(content3, { key: "3" });
      await coll.save(doc);
      await conn.commit();

      const docs = await coll.find().getDocuments();
      should.strictEqual(docs.length, 2);
      should.strictEqual(docs[0].key, '3');
      should.deepEqual(docs[0].getContent(), content3);
      should.strictEqual(docs[1].key, '4');
      should.deepEqual(docs[1].getContent(), content2);

      await conn.commit();
      let res = await coll.drop();
      should.strictEqual(res.dropped, true);
      await conn.close();

    } catch (err) {
      should.not.exist(err);
    }
  }); // 230.2

  it('230.3 Negative - client assigned keys are necessary', async () => {

    const TABLE = "soda_test_230_3";
    const metadata = await getMetadata(TABLE);
    try {
      const conn = await oracledb.getConnection(dbconfig);
      const soda = await conn.getSodaDatabase();
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

      let doc = await soda.createDocument(content);
      await assert.rejects(
        async () => {
          await coll.save(doc);
        },
        /ORA-40661/
      );
      await conn.commit();

      let res = await coll.drop();
      should.strictEqual(res.dropped, true);
      await conn.close();

    } catch (err) {
      should.not.exist(err);
    }
  }); // 230.3

  it('230.4 Negative - save without arguments', async () => {

    const TABLE = "soda_test_230_4";
    const metadata = await getMetadata(TABLE);
    try {
      const conn = await oracledb.getConnection(dbconfig);
      const soda = await conn.getSodaDatabase();
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
      let res = await coll.drop();
      should.strictEqual(res.dropped, true);
      await conn.close();

    } catch (err) {
      should.not.exist(err);
    }
  }); // 230.4
});
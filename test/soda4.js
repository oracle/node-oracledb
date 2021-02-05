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
 *   168. soda4.js
 *
 * DESCRIPTION
 *   sodaDocument class
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');
const sodaUtil = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('168. soda4.js', () => {

  before(async function() {
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
      return;
    }

    await sodaUtil.cleanup();
    await sodaUtil.grantPrivilege();
  });

  it('168.1 insertOneAndGet() fetches attributes without content', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = await conn.getSodaDatabase();
      let collectionName = 'soda_test_168_1';
      let coll = await sd.createCollection(collectionName);

      // Insert a new document
      let testContent = {
        name:    "Changjie Lin",
        address: {city: "Shenzhen", country: "China"},
        company: "Oracle Corporation",
        manager: null,
        VP:      "Bruce"
      };

      let myDoc = await coll.insertOneAndGet(testContent);
      let myKey = myDoc.key;
      should.exist(myKey);
      (myKey).should.be.a.String();
      (myDoc).should.be.an.Object();

      let content1 = await myDoc.getContent();
      should.not.exist(content1);

      // Fetch it back
      let doc2 = await coll.find().key(myKey).getOne();
      let content2 = await doc2.getContent();
      should.strictEqual(content2.name, testContent.name);
      should.strictEqual(content2.company, testContent.company);
      should.strictEqual(content2.manager, null);

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
  }); // 168.1

  it('168.2 content is null', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = await conn.getSodaDatabase();
      let collectionName = 'soda_test_168_2';
      let coll = await sd.createCollection(collectionName);

      // Insert a new document
      // Content is empty
      let testContent = {};

      let myDoc = await coll.insertOneAndGet(testContent);
      let myKey = myDoc.key;
      should.exist(myKey);
      (myKey).should.be.a.String();
      (myDoc).should.be.an.Object();

      // Fetch it back
      let doc2 = await coll.find().key(myKey).getOne();
      let content2 = await doc2.getContent();
      should.deepEqual(content2, testContent);

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
  }); // 168.2

  it('168.3 get mediaType', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = await conn.getSodaDatabase();
      let collectionName = 'soda_test_168_3';
      let coll = await sd.createCollection(collectionName);

      // Insert a new document
      // Content is empty
      let testContent = {};

      let myDoc = await coll.insertOneAndGet(testContent);
      let myMediaType = myDoc.mediaType;
      should.exist(myMediaType);
      should.strictEqual(myMediaType, 'application/json');
      let myKey = myDoc.key;

      // Fetch it back
      let doc2 = await coll.find().key(myKey).getOne();
      should.strictEqual(doc2.mediaType, 'application/json');

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
  }); // 168.3

});
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

describe('168. soda4.js', () => {

  before(async function() {
    const runnable = await sodaUtil.checkPrerequisites();
    if (!runnable) this.skip();

    await sodaUtil.cleanup();
  });

  it.skip('168.1 insertOneAndGet() method', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();
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

      let content1 = myDoc.getContent();
      console.log("getContent()");
      console.log(content1);

      // Fetch it back
      let doc2 = await coll.find().key(myKey).getOne();
      let content2 = doc2.getContent();
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

  // ORA-40665:  A client-assigned key cannot be used for this operation.
  it.skip('168.2 customize the key value', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();
      let collectionName = 'soda_test_168_2';
      let coll = await sd.createCollection(collectionName);

      // Insert a new document
      let testContent = {
        name:    "Shelly",
        address: {city: "Shenzhen", country: "China"}
      };
      let testKey = "86755";
      let testDoc = await sd.createDocument(testContent, { key: testKey} );
      should.exist(testDoc);
      console.log(testDoc);
      await coll.insertOne(testDoc);

      // Fetch it back
      let doc2 = await coll.find().key(testKey).getOne();
      let content2 = doc2.getContent();
      console.log(content2);

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

  it('168.3 content is null', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();
      let collectionName = 'soda_test_168_3';
      let coll = await sd.createCollection(collectionName);

      // Insert a new document
      let testContent = {};

      let myDoc = await coll.insertOneAndGet(testContent);
      let myKey = myDoc.key;
      should.exist(myKey);
      (myKey).should.be.a.String();
      (myDoc).should.be.an.Object();

      // Fetch it back
      let doc2 = await coll.find().key(myKey).getOne();
      let content2 = doc2.getContent();
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
  }); // 168.3

});
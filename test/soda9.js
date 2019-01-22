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
 *   177. soda9.js
 *
 * DESCRIPTION
 *   sodaCollection Class
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');
const sodaUtil = require('./sodaUtil.js');

describe('177. soda9.js', () => {
  
  before(async function() {
    const runnable = await sodaUtil.checkPrerequisites();
    if (!runnable) {
      this.skip();
      return;
    }

    await sodaUtil.cleanup();
  });

  it('177.1 insertOne() with a document content', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_177_1");
      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      await collection.insertOne(inContent);

      // fetch back
      let outDocuments = await collection.find().getDocuments();
      let outContent = await outDocuments[0].getContent();
      should.deepEqual(outContent, inContent);

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

  }); // 177.1

  it('177.2 insertOne() with a document', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_177_2");
      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      let inDocument = soda.createDocument(inContent);
      await collection.insertOne(inDocument);

      // fetch back
      let outDocuments = await collection.find().getDocuments();
      let outContent = await outDocuments[0].getContent();
      should.deepEqual(outContent, inContent);

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
  }); // 177.2

  it('177.3 insertOneAndGet() with a document content', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_177_3");

      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      let middleDocument = await collection.insertOneAndGet(inContent);
      should.exist(middleDocument);
      let middleContent = await middleDocument.getContent();
      should.not.exist(middleContent);

      // Fetch it back
      let outDocuments = await collection.find().getDocuments();
      let outContent = await outDocuments[0].getContent();
      should.deepEqual(outContent, inContent);

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
  }); // 177.3

  it('177.4 insertOneAndGet() with a document', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_177_4");

      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      let inDocument = soda.createDocument(inContent);
      let middleDocument = await collection.insertOneAndGet(inDocument);
      should.exist(middleDocument);
      let middleContent = await middleDocument.getContent();
      should.not.exist(middleContent);

      // Fetch it back
      let outDocuments = await collection.find().getDocuments();
      let outContent = await outDocuments[0].getContent();
      should.deepEqual(outContent, inContent);

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
  }); // 177.4

  it('177.5 createDocument() followd by getContent() i.e. without being inserted', async () => {
    
    let conn;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      
      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      let inDocument = soda.createDocument(inContent);

      // Get content without being inserted
      let outContent = await inDocument.getContent();
      should.deepEqual(outContent, inContent);

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
 
  }); // 177.5
});
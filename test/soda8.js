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
 *   176. soda8.js
 *
 * DESCRIPTION
 *   More tests for terminal methods of SodaOperation class
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');
const sodaUtil = require('./sodaUtil.js');

const t_contents = sodaUtil.t_contents;

describe('176. soda8.js', () => {
  
  before(async function() {
    const runnable = await sodaUtil.checkPrerequisites();
    if (!runnable) {
      this.skip();
      return;
    }

    await sodaUtil.cleanup();
  });

  it('176.1 replaceOne(), basic case with document content', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_176_1");

      let myKeys = [];
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        let doc = await collection.insertOneAndGet(content);
        myKeys[i] = doc.key;
      }

      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      let res = await collection.find().key(myKeys[1]).replaceOne(inContent);
      should.strictEqual(res.replaced, true);

      // Fetch all back
      let outDocuments = await collection.find().getDocuments();
      let contents = [];
      for(let i = 0; i < outDocuments.length; i++) {
        contents[i] = await outDocuments[i].getContent();
        if (i == 1) {
          should.deepEqual( contents[i], inContent);
        } else {
          (contents[i]).should.be.oneOf(t_contents);
        }
      }

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
  }); // 176.1

  it('176.2 replaceOne(), basic case with document object', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
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
      should.strictEqual(res.replaced, true);

      // Fetch all back
      let documents = await collection.find().getDocuments();
      let contents = [];
      for(let i = 0; i < documents.length; i++) {
        contents[i] = await documents[i].getContent();
        if (i == 1) {
          should.deepEqual( contents[i], inContent);
        } else {
          (contents[i]).should.be.oneOf(t_contents);
        }
      }

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
  }); // 176.2

  it('175.3 replaceOne(), no error is reported if the query criteria do not match any document', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
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
      should.strictEqual(res.replaced, false);

      // Fetch all back
      let outDocuments = await collection.find().getDocuments();
      let contents = [];
      for(let i = 0; i < outDocuments.length; i++) {
        contents[i] = await outDocuments[i].getContent();
        (contents[i]).should.be.oneOf(t_contents);
      }

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
  }); // 175.3

  it('175.4 Negative - replaceOne(), the key() method must be used', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_176_4");

      let myKeys = [];
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        let doc = await collection.insertOneAndGet(content);
        myKeys[i] = doc.key;
      }

      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      await sodaUtil.assertThrowsAsync(
        async () => await collection.find().replaceOne(inContent),
        /ORA-40734:/
      );
      // ORA-40734: key for the document to replace must be specified using the key attribute

      // Fetch all back
      let outDocuments = await collection.find().keys([myKeys[0]]).getDocuments();
      
      let contents = [];
      for(let i = 0; i < outDocuments.length; i++) {
        contents[i] = await outDocuments[i].getContent();
        (contents[i]).should.be.oneOf(t_contents);
      }

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
  }); // 175.4

  it('175.5 replaceOneAndGet(), basic case with document content', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_176_5");

      let myKeys = [];
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        let doc = await collection.insertOneAndGet(content);
        myKeys[i] = doc.key;
      }

      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      let updatedDocument = await collection.find().key(myKeys[1]).replaceOneAndGet(inContent);
      should.exist(updatedDocument);

      // Fetch all back
      let outDocuments = await collection.find().getDocuments();
      let contents = [];
      for(let i = 0; i < outDocuments.length; i++) {
        contents[i] = await outDocuments[i].getContent();
        if (i == 1) {
          should.deepEqual( contents[i], inContent);
        } else {
          (contents[i]).should.be.oneOf(t_contents);
        }
      }

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
  }); // 175.5

  it('175.6 replaceOneAndGet(), basic case with document object', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
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
      should.exist(updatedDocument);

      // Fetch all back
      let documents = await collection.find().getDocuments();
      let contents = [];
      for(let i = 0; i < documents.length; i++) {
        contents[i] = await documents[i].getContent();
        if (i == 1) {
          should.deepEqual( contents[i], inContent);
        } else {
          (contents[i]).should.be.oneOf(t_contents);
        }
      }

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
  }); // 175.6

  it('175.7 replaceOneAndGet(), updatedDocument does not have document content', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_176_7");

      let myKeys = [];
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        let doc = await collection.insertOneAndGet(content);
        myKeys[i] = doc.key;
      }

      let inContent = { id: 2000, name: "Paul",  office: "Singapore" };
      let updatedDocument = await collection.find().key(myKeys[1]).replaceOneAndGet(inContent);
      should.exist(updatedDocument);

      let outContent = await updatedDocument.getContent();
      should.not.exist(outContent);

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
  }); // 175.7

  it('175.8 replaceOneAndGet(), no error is reported if it does not match any document', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
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
      should.not.exist(updatedDocument);

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
  }); // 175.8


});
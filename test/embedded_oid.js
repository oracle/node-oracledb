/* Copyright (c) 2024, Oracle and/or its affiliates. */

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
 *   288. embedded_oid.js
 *
 * DESCRIPTION
 *   Embedded Keys lets documents include their own keys under an "_id" field,
 *   simplifying data management, while absent "_id" fields get generated
 *   unique "_id" keys upon write.
 *
 *   Refer: https://confluence.oraclecorp.com/confluence/x/kyQxpgE
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('288. embedded_oid.js', function() {
  let connection = null;
  let isRunnable = true;

  before(async function() {
    const sodaRunnable = await testsUtil.isSodaRunnable();
    const preRequisites = await testsUtil.checkPrerequisites(2300000000, 2300000000);
    if (!sodaRunnable || !preRequisites || !dbConfig.test.DBA_PRIVILEGE || oracledb.thin) {
      isRunnable = false;
    }

    if (!isRunnable) this.skip();
    await sodaUtil.cleanup();
    connection = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    if (!isRunnable) return;
    await connection.close();
  });

  describe('288.1 Test embedded oid normal operations', function() {
    it('288.1.1 create collection with No key present in the input doc', async () => {
      const conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      const collname = "myc";
      const options = {metaData: {"keyColumn": {"assignmentMethod": "EMBEDDED_OID"}}};
      const collection = await sd.createCollection(collname, options);
      await conn.commit();

      assert.strictEqual(collection.name, collname);

      assert.strictEqual(typeof (collection.metaData), "object");

      // Insert a new document
      const myContent = {"oracle": "database1a"};
      const docs = await collection.insertOneAndGet(myContent);

      /*
     If the _id field is not present in the document supplied to a write operation,
     then it's injected by SODA into the content.
    */
      const myKey = docs.key;
      assert.strictEqual(typeof (myKey), "string");

      // Fetch the document back
      const fetchedDoc = await collection.find().key(myKey).getOne();
      const content = fetchedDoc.getContent(); // A JavaScript object

      assert.strictEqual("08" + content._id, myKey.toLowerCase());

      await conn.commit();
      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);

      await conn.close();
    }); //288.1.1

    it('288.1.2 Embedded varchar key already present in the doc', async () => {
      const conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      const collname = "myc";
      const options = {metaData: {"keyColumn": {"assignmentMethod": "EMBEDDED_OID"}}};
      const collection = await sd.createCollection(collname, options);
      await conn.commit();

      assert.strictEqual(collection.name, collname);

      // Insert a new document
      const myContent = {"oracle": "database1b", "_id": "key1"};
      const docs = await collection.insertOneAndGet(myContent);

      const myKey = docs.key;
      assert.strictEqual(typeof (myKey), "string");

      // Fetch the document back
      const fetchedDoc = await collection.find().key(myKey).getOne();
      const content = fetchedDoc.getContent(); // A JavaScript object

      assert.strictEqual(content._id, Buffer.from(myKey.substring(2), "hex").toString("ascii"));

      await conn.commit();
      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);

      await conn.close();
    }); //288.1.2

    it('288.1.3 Embedded number key already present in the doc', async () => {
      const conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      const collname = "myc";
      const options = {metaData: {"keyColumn": {"assignmentMethod": "EMBEDDED_OID"}}};
      const collection = await sd.createCollection(collname, options);
      await conn.commit();

      assert.strictEqual(collection.name, collname);

      // Insert a new document
      const myContent = {"oracle": "database1c", "_id": 2};
      const docs = await collection.insertOneAndGet(myContent);

      const myKey = docs.key;
      assert.strictEqual(typeof (myKey), "string");

      assert.strictEqual(myKey, '03C103');

      await conn.commit();
      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);

      await conn.close();
    }); //288.1.3

    it('288.1.4 test replaceOne, for each replace op, use previously retrieved key', async () => {
      const conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      const collname = "myc";
      const options = {metaData: {"keyColumn": {"assignmentMethod": "EMBEDDED_OID"}}};
      const collection = await sd.createCollection(collname, options);
      await conn.commit();

      // Insert a new document
      const myContent = {name: "Steven", office: "Bangalore" };
      const docs = await collection.insertOneAndGet(myContent);

      const myKey = docs.key;
      assert.strictEqual(typeof (myKey), "string");

      const inContent = { name: "Paul",  office: "Singapore" };
      const result = await collection.find().key(myKey).replaceOne(inContent);
      assert.strictEqual(result.replaced, true);

      const fetchedDoc = await collection.find().key(myKey).getOne();
      const content = fetchedDoc.getContent(); // A JavaScript object

      testsUtil.removeID(content);
      assert.deepStrictEqual(content, inContent);

      await conn.commit();
      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);

      await conn.close();
    }); //288.1.4

    it('288.1.5 test replaceOne, A new string ID is present in the target document', async () => {
      const conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      const collname = "myc";
      const options = {metaData: {"keyColumn": {"assignmentMethod": "EMBEDDED_OID"}}};
      const collection = await sd.createCollection(collname, options);
      await conn.commit();

      // Insert a new document
      const myContent = {_id: "new key", name: "Steven", office: "Bangalore" };
      const docs = await collection.insertOneAndGet(myContent);

      const myKey = docs.key;
      assert.strictEqual(typeof (myKey), "string");

      const inContent = { name: "Paul",  office: "Singapore" };
      const result = await collection.find().key(myKey).replaceOne(inContent);
      assert.strictEqual(result.replaced, true);

      const fetchedDoc = await collection.find().key(myKey).getOne();
      const content = fetchedDoc.getContent(); // A JavaScript object

      testsUtil.removeID(content);
      assert.deepStrictEqual(content, inContent);

      await conn.commit();
      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);

      await conn.close();
    }); //288.1.5

    it('288.1.6 test replaceOne, A new integer ID is present in the target document', async () => {
      const conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      const collname = "myc";
      const options = {metaData: {"keyColumn": {"assignmentMethod": "EMBEDDED_OID"}}};
      const collection = await sd.createCollection(collname, options);
      await conn.commit();

      // Insert a new document
      const myContent = {_id: 12345, name: "Steven", office: "Bangalore" };
      const docs = await collection.insertOneAndGet(myContent);

      const myKey = docs.key;
      assert.strictEqual(typeof (myKey), "string");

      const inContent = { name: "Paul",  office: "Singapore" };
      const result = await collection.find().key(myKey).replaceOne(inContent);
      assert.strictEqual(result.replaced, true);

      const fetchedDoc = await collection.find().key(myKey).getOne();
      const content = fetchedDoc.getContent(); // A JavaScript object

      testsUtil.removeID(content);
      assert.deepStrictEqual(content, inContent);

      await conn.commit();
      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);

      await conn.close();
    }); //288.1.6

    it('288.1.7 test replaceOneAndGet, for each replace op, use previously retrieved key', async () => {
      const conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      const collname = "myc";
      const options = {metaData: {"keyColumn": {"assignmentMethod": "EMBEDDED_OID"}}};
      const collection = await sd.createCollection(collname, options);
      await conn.commit();

      // Insert a new document
      const myContent = {name: "Steven", office: "Bangalore" };
      const docs = await collection.insertOneAndGet(myContent);

      const myKey = docs.key;
      assert.strictEqual(typeof (myKey), "string");

      const inContent = { name: "Paul",  office: "Singapore" };
      const updatedDocument = await collection.find().key(myKey).replaceOneAndGet(inContent);
      assert(updatedDocument);

      const fetchedDoc = await collection.find().key(myKey).getOne();
      const content = fetchedDoc.getContent(); // A JavaScript object

      testsUtil.removeID(content);
      assert.deepStrictEqual(content, inContent);

      await conn.commit();
      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);

      await conn.close();
    }); //288.1.7

    it('288.1.8 test replaceOneAndGet, A new string ID is present in the target document', async () => {
      const conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      const collname = "myc";
      const options = {metaData: {"keyColumn": {"assignmentMethod": "EMBEDDED_OID"}}};
      const collection = await sd.createCollection(collname, options);
      await conn.commit();

      // Insert a new document
      const myContent = {_id: "new key", name: "Steven", office: "Bangalore" };
      const docs = await collection.insertOneAndGet(myContent);

      const myKey = docs.key;
      assert.strictEqual(typeof (myKey), "string");

      const inContent = { name: "Paul",  office: "Singapore" };
      const updatedDocument = await collection.find().key(myKey).replaceOneAndGet(inContent);
      assert(updatedDocument);

      const fetchedDoc = await collection.find().key(myKey).getOne();
      const content = fetchedDoc.getContent(); // A JavaScript object

      testsUtil.removeID(content);
      assert.deepStrictEqual(content, inContent);

      await conn.commit();
      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);

      await conn.close();
    }); //288.1.8

    it('288.1.9 test replaceOneAndGet, A new integer ID is present in the target document', async () => {
      const conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      const collname = "myc";
      const options = {metaData: {"keyColumn": {"assignmentMethod": "EMBEDDED_OID"}}};
      const collection = await sd.createCollection(collname, options);
      await conn.commit();

      // Insert a new document
      const myContent = {_id: 12345, name: "Steven", office: "Bangalore" };
      const docs = await collection.insertOneAndGet(myContent);

      const myKey = docs.key;
      assert.strictEqual(typeof (myKey), "string");

      const inContent = { name: "Paul",  office: "Singapore" };
      const updatedDocument = await collection.find().key(myKey).replaceOneAndGet(inContent);
      assert(updatedDocument);

      const fetchedDoc = await collection.find().key(myKey).getOne();
      const content = fetchedDoc.getContent(); // A JavaScript object

      testsUtil.removeID(content);
      assert.deepStrictEqual(content, inContent);

      await conn.commit();
      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);

      await conn.close();
    }); //288.1.9

    it('288.1.10 Negative test for save()', async () => {
      const conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      const collname = "myc";
      const options = {metaData: {"keyColumn": {"assignmentMethod": "EMBEDDED_OID"}}};
      const collection = await sd.createCollection(collname, options);

      const content = {"oracle": "database 23.3", "_id": 12345};
      const doc = sd.createDocument(content);
      await assert.rejects(
        async () => await collection.save(doc),
        /ORA-03001:/ // ORA-03001: unimplemented feature
      );

      await conn.commit();
      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);

      await conn.close();
    }); //288.1.10

    it('288.1.11 Negative test for saveAndGet()', async () => {
      const conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      const collname = "myc";
      const options = {metaData: {"keyColumn": {"assignmentMethod": "EMBEDDED_OID"}}};
      const collection = await sd.createCollection(collname, options);

      const content = {"oracle": "database 23.3", "_id": 12345};
      const doc = sd.createDocument(content);
      await assert.rejects(
        async () => await collection.saveAndGet(doc),
        /ORA-03001:/ // ORA-03001: unimplemented feature
      );

      await conn.commit();
      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);

      await conn.close();
    }); //288.1.11
  });

  describe('288.2 Test QBEs - filter, skip and limit', function() {
    let conn, collection, myContent;
    const collname = "myColl";

    before(async function() {
      conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      collection = await sd.createCollection(collname);
    });

    after(async function() {
      await conn.commit();
      const res = await collection.drop();
      assert.strictEqual(res.dropped, true);
      await conn.close();
    });

    it('288.2.1 filter()', async () => {
      myContent = [{"oracle": "database1a"},
        {"oracle": "database1b", "_id": "key1"},
        {"oracle": "database1c", "_id": 2}];

      await Promise.all(
        myContent.map(function(content) {
          return collection.insertOne(content);
        })
      );
      const documents = await collection.find()
        .filter({"oracle": {"$like": "database%"}})
        .getDocuments();

      assert(documents.length);

      for (let i = 0; i < documents.length; i++) {
        const content = documents[i].getContent();
        testsUtil.removeID(content);
        testsUtil.removeID(myContent[i]);
        assert.deepStrictEqual(content, myContent[i]);
      }

      await collection.find().remove();
    }); //288.2.1

    it('288.2.2 skip() first doc', async () => {
      myContent = [{"oracle": "database1a"},
        {"oracle": "database1b", "_id": "key1"},
        {"oracle": "database1c", "_id": 2}];

      await Promise.all(
        myContent.map(function(content) {
          return collection.insertOne(content);
        })
      );

      const numberToSkip = 1;
      const docCursor = await collection.find()
        .filter({"oracle": {"$like": "database%"}})
        .skip(numberToSkip).getCursor();

      const myContents = [];
      const hasNext = true;
      let myDocument;
      for (let i = 0; hasNext; i++) {
        myDocument = await docCursor.getNext();
        if (!myDocument) {
          break;
        } else {
          myContents[i] = myDocument.getContent();
          (myContent).includes(myContents[i]);
        }
      }

      assert.strictEqual(myContents.length, (myContent.length - numberToSkip));
      await docCursor.close();
      await collection.find().remove();
    }); //288.2.2

    it('288.2.3 limit() operation to 1 doc', async () => {
      myContent = [{"oracle": "database1a"},
        {"oracle": "database1b", "_id": "key1"},
        {"oracle": "database1c", "_id": 2}];

      await Promise.all(
        myContent.map(function(content) {
          return collection.insertOne(content);
        })
      );
      const numberToSkip = 1;
      const docCursor = await collection.find()
        .filter({"oracle": {"$like": "database%"}})
        .skip(numberToSkip).limit(1).getCursor();

      const myContents = [];
      const hasNext = true;
      let myDocument;
      for (let i = 0; hasNext; i++) {
        myDocument = await docCursor.getNext();
        if (!myDocument) {
          break;
        } else {
          myContents[i] = myDocument.getContent();
          (myContent).includes(myContents[i]);
        }
      }

      assert.deepStrictEqual(myContents[0], myContent[1]);
      await docCursor.close();
      await collection.find().remove();
    }); //288.2.3

    it('288.2.4 remove() previously retrieved key', async () => {
      myContent = [{"oracle": "database1a"},
        {"oracle": "database1b", "_id": "key1"},
        {"oracle": "database1c", "_id": 2}];

      await Promise.all(
        myContent.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // fetch back
      const outDocuments = await collection.find().getDocuments();

      // remove
      const result = await collection
        .find()
        .key(outDocuments[0].key)
        .remove();

      assert.strictEqual(result.count, 1);

      const remainingLength = await collection.find().count();
      assert.strictEqual(remainingLength.count, (myContent.length - result.count));
      await collection.find().remove();
    }); //288.2.4

    it('288.2.5 remove() with filter, No key present in the input doc', async () => {
      myContent = [{"oracle": "database1a"},
        {"oracle": "database1b", "_id": "key1"},
        {"oracle": "database1c", "_id": 2}];

      await Promise.all(
        myContent.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      const result = await collection
        .find()
        .filter({"oracle": {"$like": "database1a"}})
        .remove();

      assert.strictEqual(result.count, 1);

      const remainingLength = await collection.find().count();
      assert.strictEqual(remainingLength.count, (myContent.length - result.count));
    }); //288.2.5
  });
});

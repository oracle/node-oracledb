/* Copyright (c) 2019, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   178. soda10.js
 *
 * DESCRIPTION
 *   Test Soda Bulk insertion methods.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');
const sodaUtil = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('178. soda10.js', () => {

  let runnable;
  let conn, soda;

  before(async function() {

    const runnable = await testsUtil.isSodaRunnable();

    if (!runnable) {
      this.skip();
      return;
    } else {
      conn = await oracledb.getConnection(dbconfig);
      soda = conn.getSodaDatabase();
    }

    await sodaUtil.cleanup();

  }); // before()

  after(async function() {
    if (!runnable) {
      return;
    }
    try {
      await conn.close();
    } catch (err) {
      should.not.exist(err);
    }
  }); // after()

  const inContents = [
    { id: 1, name: "Paul",  office: "Singapore" },
    { id: 2, name: "Emma",  office: "London" },
    { id: 3, name: "Kate",  office: "Edinburgh" },
    { id: 4, name: "Changjie",  office: "Shenzhen" }
  ];

  it('178.1 insertMany() with newSodaDocumentArray', async () => {
    try {
      const COLL = "soda_test_178_1";
      const collection = await soda.createCollection(COLL);

      let inDocuments = [];
      for (let i = 0; i < inContents.length; i++) {
        inDocuments[i] = soda.createDocument(inContents[i]); // n.b. synchronous method
      }

      await collection.insertMany(inDocuments);

      // Fetch back
      let outDocuments = await collection.find().getDocuments();
      let outContents = [];
      for (let i = 0; i < outDocuments.length; i++) {
        outContents[i] = outDocuments[i].getContent(); // n.b. synchronous method
      }

      should.deepEqual(outContents, inContents);

      await conn.commit();

      let res = await collection.drop();
      should.strictEqual(res.dropped, true);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 178.1

  it('178.2 insertMany() with newSodaDocumentContentArray', async () => {
    try {
      const COLL = "soda_test_178_2";
      const collection = await soda.createCollection(COLL);

      await collection.insertMany(inContents);

      // Fetch back
      let outDocuments = await collection.find().getDocuments();
      let outContents = [];
      for (let i = 0; i < outDocuments.length; i++) {
        outContents[i] = outDocuments[i].getContent(); // n.b. synchronous method
      }

      should.deepEqual(outContents, inContents);

      await conn.commit();

      let res = await collection.drop();
      should.strictEqual(res.dropped, true);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 178.2

  it('178.3 insertManyAndGet() with newDocumentArray', async () => {
    try {
      const COLL = "soda_test_178_3";
      const collection = await soda.createCollection(COLL);

      let inDocuments = [];
      for (let i = 0; i < inContents.length; i++) {
        inDocuments[i] = soda.createDocument(inContents[i]); // n.b. synchronous method
      }

      let middleDocuments = await collection.insertManyAndGet(inDocuments);
      let middleContents = [];
      for (let i = 0; i < middleDocuments.length; i++) {
        middleContents[i] = middleDocuments[i].getContent();
        should.exist(middleDocuments[i].key);
      }
      should.deepEqual(middleContents, [null, null, null, null]);

      // Fetch back
      let outDocuments = await collection.find().getDocuments();
      let outContents = [];
      for (let i = 0; i < outDocuments.length; i++) {
        outContents[i] = outDocuments[i].getContent(); // n.b. synchronous method
      }

      should.deepEqual(outContents, inContents);

      await conn.commit();

      let res = await collection.drop();
      should.strictEqual(res.dropped, true);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 178.3

  it('178.4 insertManyAndGet() with newDocumentContentArray', async () => {
    try {
      const COLL = "soda_test_178_4";
      const collection = await soda.createCollection(COLL);

      let middleDocuments = await collection.insertManyAndGet(inContents);
      let middleContents = [];
      for (let i = 0; i < middleDocuments.length; i++) {
        middleContents[i] = middleDocuments[i].getContent();
        should.exist(middleDocuments[i].key);
      }
      should.deepEqual(middleContents, [null, null, null, null]);

      // Fetch back
      let outDocuments = await collection.find().getDocuments();
      let outContents = [];
      for (let i = 0; i < outDocuments.length; i++) {
        outContents[i] = outDocuments[i].getContent(); // n.b. synchronous method
      }

      should.deepEqual(outContents, inContents);

      await conn.commit();

      let res = await collection.drop();
      should.strictEqual(res.dropped, true);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 178.4

  it('178.5 Negative - insertMany() with an empty array', async () => {
    try {
      const COLL = "soda_test_178_5";
      const collection = await soda.createCollection(COLL);

      await testsUtil.assertThrowsAsync(
        async () => {
          await collection.insertMany([]);
        },
        /NJS-005/
      );

      await conn.commit();

      let res = await collection.drop();
      should.strictEqual(res.dropped, true);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 178.5

  it('178.6 Negative - insertManyAndGet() with an empty array', async () => {
    try {
      const COLL = "soda_test_178_6";
      const collection = await soda.createCollection(COLL);

      await testsUtil.assertThrowsAsync(
        async () => {
          await collection.insertManyAndGet([]);
        },
        /NJS-005/
      );

      await conn.commit();

      let res = await collection.drop();
      should.strictEqual(res.dropped, true);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 178.6

  it('178.7 insertManyAndGet() with hint option', async () => {
    const COLL = "soda_test_178_7";
    const collection = await soda.createCollection(COLL);

    let inDocuments = [];
    for (let i = 0; i < inContents.length; i++) {
      inDocuments[i] = soda.createDocument(inContents[i]); // n.b. synchronous method
    }

    let options = {hint: "MONITOR"};
    let middleDocuments = await collection.insertManyAndGet(inDocuments, options);
    let middleContents = [];
    for (let i = 0; i < middleDocuments.length; i++) {
      middleContents[i] = middleDocuments[i].getContent();
      should.exist(middleDocuments[i].key);
    }
    should.deepEqual(middleContents, [null, null, null, null]);

    // Fetch back
    let outDocuments = await collection.find().hint("MONITOR").getDocuments();
    let outContents = [];
    for (let i = 0; i < outDocuments.length; i++) {
      outContents[i] = outDocuments[i].getContent(); // n.b. synchronous method
    }

    should.deepEqual(outContents, inContents);

    await conn.commit();

    let res = await collection.drop();
    should.strictEqual(res.dropped, true);
  }); // 178.7

  it('178.8 Negative - insertManyAndGet() with invalid options parameter', async () => {
    const COLL = "soda_test_178_8";
    const collection = await soda.createCollection(COLL);

    let inDocuments = [];
    for (let i = 0; i < inContents.length; i++) {
      inDocuments[i] = soda.createDocument(inContents[i]); // n.b. synchronous method
    }

    let options = 3;
    await testsUtil.assertThrowsAsync(
      async () => {
        await collection.insertManyAndGet(inDocuments, options);
      },
      /NJS-005/
    );

    await conn.commit();

    let res = await collection.drop();
    should.strictEqual(res.dropped, true);
  }); // 178.8

});

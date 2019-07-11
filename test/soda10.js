/* Copyright (c) 2019, Oracle and/or its affiliates. All rights reserved. */

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

  let conn;

  before(async function() {
    try {
      const runnable = await testsUtil.checkPrerequisites();
      if (!runnable) {
        this.skip();
        return;
      } else {
        await sodaUtil.cleanup();
        conn = await oracledb.getConnection(dbconfig);
      }

    } catch (err) {
      should.not.exist(err);
    }
  }); // before()

  after(async() => {
    try {

      await conn.close();
    } catch (err) {
      should.not.exist(err);
    }
  }); // after()

  it('178.1 basic case of sodaCollection.insertMany()', async () => {
    try {
      let soda = conn.getSodaDatabase();
      const COLL = "soda_test_178_1";
      const collection = await soda.createCollection(COLL);

      let inContents = [
        { id: 1, name: "Paul",  office: "Singapore" },
        { id: 2, name: "Emma",  office: "London" },
        { id: 3, name: "Kate",  office: "Edinburgh" },
        { id: 4, name: "Changjie",  office: "Shenzhen" }
      ];
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
});
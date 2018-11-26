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
 *   174. soda6.js
 *
 * DESCRIPTION
 *   Tests for sodaOperation class
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');
const sodaUtil = require('./sodaUtil.js');

const t_contents = [
  { id: 1001, name: "Gillian",  office: "Shenzhen" },
  { id: 1002, name: "Chris",    office: "Melbourne" },
  { id: 1003, name: "Changjie", office: "Shenzhen" },
  { id: 1004, name: "Venkat",   office: "Bangalore" },
  { id: 1005, name: "May",      office: "London" },
  { id: 1006, name: "Joe",      office: "San Francisco" },
  { id: 1007, name: "Gavin",    office: "New York" }
];

describe('174. soda6.js', () => {
  
  before(async function() {
    const runnable = await sodaUtil.checkPrerequisites();
    if (!runnable) this.skip();

    await sodaUtil.cleanup();
  });

  it('174.1 filter() basic case', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_174_1");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let empInShenzhen = await collection.find()
        .filter({ "office": {"$like": "Shenzhen"} })
        .count();
      should.strictEqual(empInShenzhen.count, 2);

      await conn.commit();

    } catch(err) {
      should.not.exist(err);
    } finally {
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
  }); // 174.1

});
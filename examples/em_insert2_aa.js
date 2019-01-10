/* Copyright (c) 2018, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 * NAME
 *   em_insert2.js
 *
 * DESCRIPTION
 *   Array DML example using executeMany() with bind by position.
 *   This example also uses Async/Await of Node 8.
 *   Use demo.sql to create the required schema.
 *
 *   This example requires node-oracledb 2.2 or later.
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

const truncateSql = "TRUNCATE TABLE em_tab";
const insertSql = "INSERT INTO em_tab values (:1, :2)";

const binds = [
  [1, "Test 1 (One)"],
  [2, "Test 2 (Two)"],
  [3, "Test 3 (Three)"],
  [4, null],
  [5, "Test 5 (Five)"]
];

// bindDefs is optional for IN binds but it is generally recommended.
// Without it the data must be scanned to find sizes and types.
const options = {
  autoCommit: true,
  bindDefs: [
    { type: oracledb.NUMBER },
    { type: oracledb.STRING, maxSize: 15 }
  ]
};

async function run() {
  let conn;
  let result;

  try {
    conn = await oracledb.getConnection(dbConfig);

    await conn.execute(truncateSql);

    result = await conn.executeMany(insertSql, binds, options);

    console.log("Result is:", result);

  } catch (err) {
    console.error(err);
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

run();

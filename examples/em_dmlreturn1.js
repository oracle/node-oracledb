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
 *   em_dmlreturn1.js
 *
 * DESCRIPTION
 *   executeMany() example of DML RETURNING that returns single values
 *   This example also uses Async/Await of Node 8.
 *   Use demo.sql to create the required schema.
 *
 *   This example requires node-oracledb 2.2 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
x *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

const truncateSql = "TRUNCATE TABLE em_tab";
const insertSql = "INSERT INTO em_tab VALUES (:1, :2) RETURNING ROWID, id, val INTO :3, :4, :5";

const binds = [
  [1, "Test 1 (One)"],
  [2, "Test 2 (Two)"],
  [3, "Test 3 (Three)"],
  [4, null],
  [5, "Test 5 (Five)"]
];

const options = {
  bindDefs: [
    { type: oracledb.NUMBER },
    { type: oracledb.STRING, maxSize: 20 },
    { type: oracledb.STRING, maxSize: 18, dir: oracledb.BIND_OUT },
    { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
    { type: oracledb.STRING, maxSize: 25, dir: oracledb.BIND_OUT }
  ]
};

async function run() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await connection.execute(truncateSql);

    const result = await connection.executeMany(insertSql, binds, options);

    console.log("rowsAffected is:", result.rowsAffected);
    console.log("Out binds:");
    for (let i = 0; i < result.outBinds.length; i++) {
      console.log("-->", result.outBinds[i]);
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

run();

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
 * NAME
 *   em_plsql_aa.js
 *
 * DESCRIPTION
 *   executeMany() example calling PL/SQL.
 *   This example also uses Async/Await of Node 8.
 *   Use demo.sql to create the required schema.
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

const sql = "BEGIN em_testproc(:1, :2, :3); END;";

const binds = [
  [1],
  [2],
  [3],
  [4],
  [6]
];

const options = {
  bindDefs: [
    { type: oracledb.NUMBER },
    { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
    { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 20 }
  ]
};

async function run() {
  let conn;
  let result;

  try {
    conn = await oracledb.getConnection(dbConfig);

    result = await conn.executeMany(sql, binds, options);

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

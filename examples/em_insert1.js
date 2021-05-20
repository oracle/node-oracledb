/* Copyright (c) 2018, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   em_insert1.js
 *
 * DESCRIPTION
 *   Array DML example using executeMany() with bind-by-name syntax.
 *
 *   This example requires node-oracledb 2.2 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

// On Windows and macOS, you can specify the directory containing the Oracle
// Client Libraries at runtime, or before Node.js starts.  On other platforms
// the system library search path must always be set before Node.js is started.
// See the node-oracledb installation documentation.
// If the search path is not correct, you will get a DPI-1047 error.
if (process.platform === 'win32') { // Windows
  oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_19_11' });
} else if (process.platform === 'darwin') { // macOS
  oracledb.initOracleClient({ libDir: process.env.HOME + '/Downloads/instantclient_19_8' });
}

const sql = "INSERT INTO no_em_tab values (:a, :b)";

const binds = [
  { a: 1, b: "Test 1 (One)" },
  { a: 2, b: "Test 2 (Two)" },
  { a: 3, b: "Test 3 (Three)" },
  { a: 4 },
  { a: 5, b: "Test 5 (Five)" }
];

// bindDefs is optional for IN binds but it is generally recommended.
// Without it the data must be scanned to find sizes and types.
const options = {
  autoCommit: true,
  bindDefs: {
    a: { type: oracledb.NUMBER },
    b: { type: oracledb.STRING, maxSize: 15 }
  }
};

async function run() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupEm(connection);  // create the demo tables

    const result = await connection.executeMany(sql, binds, options);
    console.log("Result is:", result);

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

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
 *   em_batcherrors.js
 *
 * DESCRIPTION
 *   Array DML example showing batchErrors behavior.
 *
 *   Note: Despite the autoCommit flag, no commit occurs because of data
 *   errors. However valid rows are part of a transaction that can be committed
 *   if desired.
 *
 *   This example requires node-oracledb 2.2 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const fs = require('fs');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

// On Windows and macOS, you can specify the directory containing the Oracle
// Client Libraries at runtime, or before Node.js starts.  On other platforms
// the system library search path must always be set before Node.js is started.
// See the node-oracledb installation documentation.
// If the search path is not correct, you will get a DPI-1047 error.
let libPath;
if (process.platform === 'win32') {           // Windows
  libPath = 'C:\\oracle\\instantclient_19_12';
} else if (process.platform === 'darwin') {   // macOS
  libPath = process.env.HOME + '/Downloads/instantclient_19_8';
}
if (libPath && fs.existsSync(libPath)) {
  oracledb.initOracleClient({ libDir: libPath });
}

const sql = "INSERT INTO no_em_childtab VALUES (:1, :2, :3)";

const binds = [
  [1016, 10, "Child 2 of Parent A"],
  [1017, 10, "Child 3 of Parent A"],
  [1018, 20, "Child 4 of Parent B"],
  [1018, 20, "Child 4 of Parent B"],   // duplicate key
  [1019, 30, "Child 3 of Parent C"],
  [1020, 40, "Child 4 of Parent D"],
  [1021, 75, "Child 1 of Parent F"],   // parent does not exist
  [1022, 40, "Child 6 of Parent D"]
];

const options = {
  autoCommit: true,
  batchErrors: true,
  dmlRowCounts: true,
  bindDefs: [
    { type: oracledb.NUMBER },
    { type: oracledb.NUMBER },
    { type: oracledb.STRING, maxSize: 20 }
  ]
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

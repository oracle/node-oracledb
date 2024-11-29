/* Copyright (c) 2018, 2024, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   em_batcherrors.js
 *
 * DESCRIPTION
 *   Array DML example showing batchErrors behavior.
 *
 *   Note: Despite the autoCommit flag, no commit occurs because of data
 *   errors. However valid rows are part of a transaction that can be committed
 *   if desired.
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

// This example runs in both node-oracledb Thin and Thick modes.
//
// Optionally run in node-oracledb Thick mode
if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {

  // Thick mode requires Oracle Client or Oracle Instant Client libraries.
  // On Windows and macOS you can specify the directory containing the
  // libraries at runtime or before Node.js starts.  On other platforms (where
  // Oracle libraries are available) the system library search path must always
  // include the Oracle library path before Node.js starts.  If the search path
  // is not correct, you will get a DPI-1047 error.  See the node-oracledb
  // installation documentation.
  let clientOpts = {};
  // On Windows and macOS platforms, set the environment variable
  // NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
  if (process.platform === 'win32' || process.platform === 'darwin') {
    clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
  }
  oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
}

console.log(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');

const sql = "INSERT INTO no_em_childtab VALUES (:1, :2, :3)";

const binds = [
  [1016, 10, "Child 2 of Parent A"],
  [1017, 10, "Child 3 of Parent A"],
  [1018, 20, "Child 4 of Parent B"],
  [1018, 20, "Duplicate Child"],     // duplicate key
  [1019, 30, "Child 3 of Parent C"],
  [1020, 40, "Child 4 of Parent D"],
  [1021, 75, "Invalid Parent"],      // parent does not exist
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

    await demoSetup.setupEm(connection);  // create the demo table

    // Insert data
    let result = await connection.executeMany(sql, binds, options);
    console.log("Result is:", result);

    // Show the invalid data that couldn't be inserted
    console.log('Bad rows were:');
    for (let i = 0; i < result.batchErrors.length; i++) {
      console.log(binds[result.batchErrors[i].offset]);
    }

    // Show the rows that were successfully inserted
    console.log('Table contains:');
    result = await connection.execute(`select * from no_em_childtab order by childid`);
    console.log(result.rows);

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

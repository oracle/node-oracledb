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
 *   calltimeout.js
 *
 * DESCRIPTION
 *   Shows how to time out long running database calls.
 *   See https://oracle.github.io/node-oracledb/doc/api.html#dbcalltimeouts
 *
 *   This example requires node-oracledb 3 (or later) and Oracle Client 18c
 *   libraries (or later).
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const fs = require('fs');
const oracledb = require("oracledb");
const dbConfig = require('./dbconfig.js');

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

const dboptime = 4; // seconds the simulated database operation will take
const timeout  = 2; // seconds the application will wait for the database operation

async function run() {

  let connection;

  try {

    if (oracledb.oracleClientVersion < 1800000000) {
      throw new Error("Oracle Client libraries must be 18c or later");
    }

    connection = await oracledb.getConnection(dbConfig);

    connection.callTimeout = timeout * 1000;  // milliseconds
    console.log("Database call timeout set to " + connection.callTimeout / 1000 + " seconds");

    console.log("Executing a " + dboptime + " second DB operation");
    await connection.execute(`BEGIN DBMS_SESSION.SLEEP(:sleepsec); END;`, [dboptime]);

    console.log("Database operation successfully completed");

  } catch (err) {
    if (err.message.startsWith('DPI-1067:') || err.errorNum === 3114)
      console.log('Database operation was stopped after exceeding the call timeout');
    else
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

process
  .on('SIGTERM', function() {
    console.log("\nTerminating");
    process.exit(0);
  })
  .on('SIGINT', function() {
    console.log("\nTerminating");
    process.exit(0);
  });

run();

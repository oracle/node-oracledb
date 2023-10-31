/* Copyright (c) 2018, 2023, Oracle and/or its affiliates. */

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
 *   calltimeout.js
 *
 * DESCRIPTION
 *   Shows how to time out long running database calls.
 *   See https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#dbcalltimeouts
 *
 *   This example requires node-oracledb 3 (or later) and Oracle Client 18c
 *   libraries (or later).
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require("oracledb");
const dbConfig = require('./dbconfig.js');

// This example runs in both node-oracledb Thin and Thick modes.
//
// Optionally run in node-oracledb Thick mode
if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {

  // Thick mode requires Oracle Client or Oracle Instant Client libraries.
  // On Windows and macOS Intel you can specify the directory containing the
  // libraries at runtime or before Node.js starts.  On other platforms (where
  // Oracle libraries are available) the system library search path must always
  // include the Oracle library path before Node.js starts.  If the search path
  // is not correct, you will get a DPI-1047 error.  See the node-oracledb
  // installation documentation.
  let clientOpts = {};
  // On Windows and macOS Intel platforms, set the environment
  // variable NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
  if (process.platform === 'win32' || (process.platform === 'darwin' && process.arch === 'x64')) {
    clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
  }
  oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
}

console.log(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');

const dboptime = 4; // seconds the simulated database operation will take
const timeout  = 2; // seconds the application will wait for the database operation

async function run() {

  let connection;

  try {

    connection = await oracledb.getConnection(dbConfig);

    connection.callTimeout = timeout * 1000;  // milliseconds
    console.log("Database call timeout set to " + connection.callTimeout / 1000 + " seconds");

    console.log("Executing a " + dboptime + " second DB operation");
    await connection.execute(`BEGIN DBMS_SESSION.SLEEP(:sleepsec); END;`, [dboptime]);

    console.log("Database operation successfully completed");

  } catch (err) {
    if (err.message.startsWith('NJS-123:') || err.errorNum === 3114)
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
  .once('SIGTERM', function() {
    console.log("\nTerminating");
    process.exit(0);
  })
  .once('SIGINT', function() {
    console.log("\nTerminating");
    process.exit(0);
  });

run();

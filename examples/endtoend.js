/* Copyright (c) 2015, 2024, Oracle and/or its affiliates. */

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
 *   endtoend.js
 *
 * DESCRIPTION
 *   Sets connection metadata for end-to-end tracing and client authorization.
 *
 *   While the script sleeps (keeping the connection open), use SQL*Plus as a
 *   privileged user to execute the SQL statement displayed.
 *
 *   The end-to-end tracing attributes are shown in various other DBA views and
 *   in Enterprise Manager.
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

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

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    // These end-to-end tracing attributes are sent to the database on
    // the next 'round trip' i.e. with execute()
    connection.clientId = "Chris";
    connection.module = "End-to-end example";
    connection.action = "Query departments";

    console.log("Use SQL*Plus as SYSTEM (or ADMIN for Oracle Autonomous Database) to execute the query:");
    console.log("  SELECT username, client_identifier, action, module FROM v$session WHERE username = UPPER('" + dbConfig.user + "');");

    // Sleep 10 seconds to keep the connection open.  This allows
    // external queries on V$SESSION to show the connection
    // attributes before the connection is closed.
    await connection.execute(`BEGIN DBMS_SESSION.SLEEP(10); END;`);

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

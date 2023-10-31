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
 *   sessionfixup.js
 *
 * DESCRIPTION
 *   Shows using a pooled connection callback function to efficiently
 *   set the "session state" of pooled connections to the same values
 *   when each connection is first used.
 *
 *   Each connection in a connection pool can retain state (such as
 *   ALTER SESSION values) from when the connection was previously
 *   used.  Using a sessionCallback function for a connection pool
 *   removes the overhead of unnecessarily re-executing ALTER SESSION
 *   commands after each pool.getConnection() call.
 *
 *   Run this script and experiment sending web requests.  For example
 *   send 20 requests with a concurrency of 4:
 *     ab -n 20 -c 4 http://127.0.0.1:7000/
 *   The function initSession() will be called just once per connection
 *   in the pool.
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const http = require('http');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

const httpPort = 7000;

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

// initSession() will be invoked internally when each brand new pooled
// connection is first used.  Its callback function 'callbackFn' should be
// invoked only when all desired session state has been set.  In this example,
// the requestedTag parameter is ignored.  They would be valid if connection
// tagging was being used.  If you have multiple SQL statements to execute, put
// them in a single, anonymous PL/SQL block for efficiency.
function initSession(connection, requestedTag, callbackFn) {

  // Your session initialization code would be here.  This example just queries
  // the session id and serial number to show that the callback is invoked once
  // per new session.
  connection.execute(
    `SELECT UNIQUE sid||'-'||serial#
     FROM v$session_connect_info
     WHERE sid = SYS_CONTEXT('USERENV', 'SID')`,
    function(err, result) {
      const sidSer = result.rows[0][0];  // session id and serial number
      console.log(`initSession invoked for session and serial number: ${sidSer}`);
      callbackFn();
    });
}

async function init() {
  try {
    await oracledb.createPool({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString,
      sessionCallback: initSession,
      poolMin: 1,
      poolMax: 4,
      poolIncrement: 1
    });

    // Create HTTP server and listen on port httpPort
    const server = http.createServer();
    server.listen(httpPort)
      .on('request', handleRequest)
      .on('error', (err) => {
        console.error('HTTP server problem: ' + err);
      })
      .on('listening', () => {
        console.log('Server running at http://localhost:' + httpPort);
      });
  } catch (err) {
    console.error("init() error: " + err.message);
  }
}

async function handleRequest(request, response) {
  let connection;
  try {
    // Get a connection from the default connection pool
    connection = await oracledb.getConnection();

    const sql = `SELECT UNIQUE CURRENT_TIMESTAMP, sid||'-'||serial#
                 FROM v$session_connect_info
                 WHERE sid = SYS_CONTEXT('USERENV', 'SID')`;

    const result = await connection.execute(sql);
    console.log(`Query at ${result.rows[0][0]} used session and serial number ${result.rows[0][1]}`);
  } catch (err) {
    console.error(err.message);
  } finally {
    if (connection) {
      try {
        await connection.close(); // Put the connection back in the pool
      } catch (err) {
        console.error(err);
      }
    }
    response.end();
  }
}

async function closePoolAndExit() {
  console.log("\nTerminating");
  try {
    // Get the 'default' pool from the pool cache and close it (force
    // closed after 3 seconds).
    // If this hangs, you may need DISABLE_OOB=ON in a sqlnet.ora file.
    // This setting should not be needed if both Oracle Client and Oracle
    // Database are 19c (or later).
    await oracledb.getPool().close(3);
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

process
  .once('SIGTERM', closePoolAndExit)
  .once('SIGINT',  closePoolAndExit);

init();

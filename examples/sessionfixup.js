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
 *   This example requires node-oracledb 3.1 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const fs = require('fs');
const http = require('http');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const httpPort = 7000;

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

// initSession() will be invoked internally when each brand new pooled
// connection is first used.  Its callback function 'callbackFn' should be
// invoked only when all desired session state has been set.
// In this example, the requestedTag and actualTag parameters are
// ignored.  They would be valid if connection tagging was being used.
// If you have multiple SQL statements to execute, put them in a
// single, anonymous PL/SQL block for efficiency.
function initSession(connection, requestedTag, callbackFn) {
  console.log('In initSession');
  connection.execute(`ALTER SESSION SET TIME_ZONE = 'UTC'`, callbackFn);
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
    const result = await connection.execute(`SELECT TO_CHAR(CURRENT_DATE, 'DD-Mon-YYYY HH24:MI') FROM DUAL`);
    console.log(result.rows[0][0]);
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

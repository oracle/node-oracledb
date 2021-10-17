/* Copyright (c) 2015, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   endtoend.js
 *
 * DESCRIPTION
 *   Sets connection metadata for end-to-end tracing and client authorization.
 *
 *   While the script sleeps (keeping the connection open), use SQL*Plus as a privileged user to execute:
 *      SELECT username, client_identifier, action, module FROM v$session WHERE username IS NOT NULL;
 *   The end-to-end tracing attributes are shown in various other DBA views and in Enterprise Manager.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const fs = require('fs');
const oracledb = require('oracledb');
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

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    // These end-to-end tracing attributes are sent to the database on
    // the next 'round trip' i.e. with execute()
    connection.clientId = "Chris";
    connection.module = "End-to-end example";
    connection.action = "Query departments";

    console.log("Use SQL*Plus as SYSTEM (or ADMIN for Oracle Cloud databases) to execute the query:");
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
  .on('SIGTERM', function() {
    console.log("\nTerminating");
    process.exit(0);
  })
  .on('SIGINT', function() {
    console.log("\nTerminating");
    process.exit(0);
  });

run();

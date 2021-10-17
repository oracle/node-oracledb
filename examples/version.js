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
 *   version.js
 *
 * DESCRIPTION
 *   Shows the node-oracledb version attributes
 *
 *   This example requires node-oracledb 2.2 or later.
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

console.log("Run at: " + new Date());
console.log("Node.js version: " + process.version + " (" + process.platform, process.arch + ")");

console.log("Node-oracledb version:", oracledb.versionString); // version (including the suffix)
// console.log("Node-oracledb version:", oracledb.version); // numeric version format is useful for comparisons
// console.log("Node-oracledb version suffix:", oracledb.versionSuffix); // e.g. "-beta.1", or empty for production releases

console.log("Oracle Client library version:", oracledb.oracleClientVersionString);
//console.log("Oracle Client library version:", oracledb.oracleClientVersion); // numeric version format

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    console.log("Oracle Database version:", connection.oracleServerVersionString);
    // console.log("Oracle Database version:", connection.oracleServerVersion); // numeric version format

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

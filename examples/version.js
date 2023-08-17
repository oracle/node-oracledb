/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

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
 *   version.js
 *
 * DESCRIPTION
 *   Shows the node-oracledb version attributes
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
  // On Windows and macOS Intel you can specify the directory containing the
  // libraries at runtime or before Node.js starts.  On other platforms (where
  // Oracle libraries are available) the system library search path must always
  // include the Oracle library path before Node.js starts.  If the search path
  // is not correct, you will get a DPI-1047 error.  See the node-oracledb
  // installation documentation.
  let clientOpts = {};
  if (process.platform === 'win32') {                                   // Windows
    clientOpts = { libDir: 'C:\\oracle\\instantclient_19_17' };
  } else if (process.platform === 'darwin' && process.arch === 'x64') { // macOS Intel
    clientOpts = { libDir: process.env.HOME + '/Downloads/instantclient_19_8' };
  }
  oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
}


// Get the database version and check the driver mode
async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    console.log("Oracle Database version       : ", connection.oracleServerVersionString);
    // console.log("Oracle Database version       : ", connection.oracleServerVersion); // numeric version format

    const result = await connection.execute(
      `SELECT UNIQUE CLIENT_DRIVER
       FROM V$SESSION_CONNECT_INFO
       WHERE SID = SYS_CONTEXT('USERENV', 'SID')`);
    console.log("CLIENT_DRIVER                 : " + result.rows[0][0] + "'");

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

console.log("Run at                        : " + new Date());
console.log("Node.js version               : " + process.version + " (" + process.platform, process.arch + ")");

console.log("Node-oracledb version         : ", oracledb.versionString); // version (including the suffix)
// console.log("Node-oracledb version         : ", oracledb.version); // numeric version format is useful for comparisons
// console.log("Node-oracledb version suffix  : ", oracledb.versionSuffix); // e.g. "-beta.1", or empty for production releases

if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {
  console.log("Oracle Client library version : ", oracledb.oracleClientVersionString);
  // console.log("Oracle Client library version : ", oracledb.oracleClientVersion); // numeric version format
}

run();

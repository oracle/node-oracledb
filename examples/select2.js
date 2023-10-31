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
 *   select2.js
 *
 * DESCRIPTION
 *   Executes queries to show array and object output formats.
 *   Gets results directly without using a ResultSet.
 *
 ******************************************************************************/

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

// Oracledb properties are applicable to all connections and SQL
// executions.  They can also be set or overridden at the individual
// execute() call level

// This script sets outFormat in the execute() call but it could be set here instead:
//
// oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function run() {

  let connection;

  try {
    // Get a non-pooled connection

    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupBf(connection);  // create the demo table

    // The statement to execute
    const sql =
        `SELECT farmer, picked, ripeness
         FROM no_banana_farmer
         ORDER BY id`;

    let result;

    // Default Array Output Format
    result = await connection.execute(sql);
    console.log("----- Banana Farmers (default ARRAY output format) --------");
    console.log(result.rows);

    // Optional Object Output Format
    result = await connection.execute(
      sql,
      [], // A bind parameter is needed to disambiguate the following options parameter and avoid ORA-01036
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,     // outFormat can be OBJECT or ARRAY.  The default is ARRAY
        // fetchArraySize: 100                     // internal buffer allocation size for tuning
      }
    );
    console.log("----- Banana Farmers (default OBJECT output format) --------");
    console.log(result.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        // Connections should always be released when not needed
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

run();

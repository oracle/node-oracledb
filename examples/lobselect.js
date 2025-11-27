/* Copyright (c) 2016, 2025, Oracle and/or its affiliates. */

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
 *   lobselect.js
 *
 * DESCRIPTION
 *   SELECTs a CLOB and displays output to the console.
 *   SELECTs a BLOB and writes it to a file.
 *
 *   'Large' LOBs should be streamed as shown in lobstream1.js
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const fs = require('fs');
const oracledb = require('oracledb');
const path = require('path');
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

const blobOutFileName = 'lobselectout.jpg';  // file to write the BLOB to

// force all queried CLOBs to be returned as Strings
// (An alternative is to use a fetch type handler)
oracledb.fetchAsString = [ oracledb.CLOB ];

// force all queried BLOBs to be returned as Buffers
// (An alternative is to use a fetch type handler)
oracledb.fetchAsBuffer = [ oracledb.BLOB ];

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupLobs(connection, true);  // create the demo table with data

    let result;

    // An alternative to oracledb.fetchAsString and oracledb.fetchAsBuffer is
    // to pass the execute() option fetchTypeHandler and in it tell the
    // database to return any LOB column as a string or buffer, not as a Lob
    // object
    /*
    function fth(metaData) {
      if (metaData.dbType === oracledb.DB_TYPE_CLOB) {
        return {type: oracledb.DB_TYPE_VARCHAR};
      } else if (metaData.dbType === oracledb.DB_TYPE_BLOB) {
        return {type: oracledb.DB_TYPE_LONG_RAW};
      }
    };
    */

    // Fetch a CLOB
    result = await connection.execute(
      `SELECT c FROM no_lobs WHERE id = :idbv`,
      [1],
      // { fetchTypeHandler: fth }  // alternative to using oracledb.fetchAsString
    );

    if (result.rows.length === 0)
      throw new Error("No row found");

    const clob = result.rows[0][0];
    console.log('The CLOB was: ');
    console.log(clob);


    // Fetch a BLOB
    result = await connection.execute(
      `SELECT b FROM no_lobs WHERE id = :idbv`,
      [2],
      // { fetchTypeHandler: fth }  // alternative to using oracledb.fetchAsBuffer
    );

    if (result.rows.length === 0)
      throw new Error("No row found");

    const blob = result.rows[0][0];
    console.log('Writing BLOB to lobselectout.jpg');
    fs.writeFileSync(path.join(__dirname, blobOutFileName), blob);

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

/* Copyright (c) 2015, 2025, Oracle and/or its affiliates. */

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
 *   lobinsert1.js
 *
 * DESCRIPTION
 *   Reads text from clobexample.txt and INSERTs it into a CLOB column.
 *   Reads binary data from fuzzydinosaur.jpg and INSERTs it into a BLOB column.
 *   After running this, Run lobselect.js to query the inserted data.
 *
 *   "Small" amounts of data can be bound directly for INSERT into LOB
 *   columns.  Larger amounts should be streamed, see lobinssert2.js.
 *   The boundary between 'small' and 'large' depends on how Node.js
 *   and V8 handle large data in memory, and on your streaming and
 *   performance requirements.
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

oracledb.autoCommit = true;  // for ease of demonstration only

const clobInFileName = 'clobexample.txt';    // the file with text to be inserted into the database
const blobInFileName = 'fuzzydinosaur.jpg';  // contains the image to be inserted into the database

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupLobs(connection, false);  // create the demo table without data

    let result;

    // Insert a CLOB
    const str = fs.readFileSync(path.join(__dirname, clobInFileName), 'utf8');
    result = await connection.execute(
      `INSERT INTO no_lobs (id, c) VALUES (:id, :c)`,
      { id: 1, c: str }
    );
    if (result.rowsAffected != 1)
      throw new Error('CLOB was not inserted');
    else
      console.log('CLOB inserted from ' + clobInFileName);

    // Insert a BLOB
    const buf = fs.readFileSync(path.join(__dirname, blobInFileName));
    result = await connection.execute(
      `INSERT INTO no_lobs (id, b) VALUES (:id, :b)`,
      { id: 2, b: buf },
    );
    if (result.rowsAffected != 1)
      throw new Error('BLOB was not inserted');
    else
      console.log('BLOB inserted from ' + blobInFileName);

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

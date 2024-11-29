/* Copyright (c) 2016, 2024, Oracle and/or its affiliates. */

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
 *   lobinserttemp.js
 *
 * DESCRIPTION
 *   Creates a 'temporary CLOB', loads clobexample.txt into it, and
 *   then INSERTs it into a CLOB column.
 *
 *   You may prefer the method shown in lobinsert2.js, which inserts
 *   directly into the table.
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const fs = require('fs');
const oracledb = require('oracledb');
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

const inFileName = 'clobexample.txt';  // the file with text to be inserted into the database

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupLobs(connection);  // create the demo table

    // Write into a temporary LOB.
    // An alternative would be to stream into it.
    const tempLob = await connection.createLob(oracledb.CLOB);
    const data = fs.readFileSync(inFileName, 'utf8');
    tempLob.write(data);
    tempLob.write("That's all!");
    tempLob.end();  //  indicate the app has no more data to insert

    const doInsert = new Promise((resolve) => {

      // The 'finish' event is emitted when node-oracledb has
      // processed all data for the Temporary LOB
      tempLob.on('finish', async () => {
        console.log('Inserting the temporary LOB into the database');
        const result = await connection.execute(
          `INSERT INTO no_lobs (id, c) VALUES (:idbv, :lobbv)`,
          {
            idbv: 3,
            lobbv: tempLob
          },
          {
            autoCommit: true
          });
        console.log("Rows inserted: " + result.rowsAffected);
        resolve();
      }); // end 'finish'

    });   // end Promise

    await doInsert;

    // Applications should destroy LOBs that were created using createLob().
    tempLob.destroy();

    // Wait for destroy() to emit the the close event.  This means the lob will
    // be cleanly closed before the app closes the connection, otherwise a race
    // will occur.
    await new Promise((resolve, reject) => {
      tempLob.on('error', reject);
      tempLob.on('close', resolve);
    });

  } catch (err) {
    // Note: in this example tempLob is not explicitly destroyed on error.  This
    // is left to the connection close to initiate.
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

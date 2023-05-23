/* Copyright (c) 2016, 2023, Oracle and/or its affiliates. */

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
 *   lobtempplsql.js
 *
 * DESCRIPTION
 *   Creates a 'temporary CLOB', streams data into it from clobexample.txt, and
 *   then passes it into a PL/SQL procedure to insert into the database.
 *
 *   Smaller amounts of data can be passed directly to PL/SQL without
 *   needed a temporary LOB.  See lobbinds.js
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

const inFileName = 'clobexample.txt';  // the file with text to be inserted into the database

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupLobs(connection);  // create the demo table

    // Create an empty Temporary Lob
    const tempLob = await connection.createLob(oracledb.CLOB);

    // Helper function for loading data to the Temporary Lob
    const doStream = new Promise((resolve, reject) => {

      // Note: there is no 'close' event to destroy templob because it is needed
      // for the INSERT

      tempLob.on('error', (err) => {
        // console.log("templob.on 'error' event");
        reject(err);
      });

      tempLob.on('finish', () => {
        // console.log("templob.on 'finish' event");
        // The data was loaded into the temporary LOB
        resolve();
      });

      console.log('Reading from ' + inFileName);
      const inStream = fs.createReadStream(inFileName);
      inStream.on('error', (err) => {
        // console.log("inStream.on 'error' event");
        tempLob.destroy(err);
      });

      inStream.pipe(tempLob);  // copies the text to the temporary LOB

    });

    // Load the data into the Temporary LOB
    await doStream;

    // Call PL/SQL to insert into the DB
    console.log('Calling PL/SQL to insert the temporary LOB into the database');
    await connection.execute(
      `BEGIN
         no_lobs_in(:id, :c, null);
       END;`,
      {
        id: 3,
        c: tempLob // type and direction are optional for IN binds
      },
      { autoCommit: true }
    );
    console.log("Call completed");

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
    // Note: in this example the stream is not explicitly destroyed on error.
    // This is left to the connection close to initiate.
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

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
 *   lobstream2.js
 *
 * DESCRIPTION
 *   SELECTs a CLOB, streams it using 'data' events, and then displays it to the screen
 *
 *****************************************************************************/

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

async function run() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupLobs(connection, true);  // create the demo table with data

    //
    // Fetch a CLOB and write to the console
    //
    const result = await connection.execute(`SELECT c FROM no_lobs WHERE id = 1`);
    if (result.rows.length === 0) {
      throw new Error("No row found");
    }
    const clob = result.rows[0][0];
    if (clob === null) {
      throw new Error("LOB was NULL");
    }

    // Stream a CLOB and builds up a String piece-by-piece
    const doStream = new Promise((resolve, reject) => {

      let myclob = ""; // or myblob = Buffer.alloc(0) for BLOBs

      // node-oracledb's lob.pieceSize is the number of bytes retrieved
      // for each readable 'data' event.  The default is lob.chunkSize.
      // The recommendation is for it to be a multiple of chunkSize.
      // clob.pieceSize = 100; // fetch smaller chunks to demonstrate repeated 'data' events

      clob.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
      clob.on('error', (err) => {
        // console.log("clob.on 'error' event");
        reject(err);
      });

      clob.on('data', (chunk) => {
        // Build up the string.  For larger LOBs you might want to print or use
        // each chunk separately
        // console.log("clob.on 'data' event.  Got %d bytes of data", chunk.length);
        myclob += chunk; // or use Buffer.concat() for BLOBS
      });

      clob.on('end', () => {
        // console.log("clob.on 'end' event");
        clob.destroy();
        console.log(myclob);
      });

      clob.on('close', () => {
        // console.log("clob.on 'close' event");
        resolve();
      });

    });

    await doStream;

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

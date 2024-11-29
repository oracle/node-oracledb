/* Copyright (c) 2015, 2024, Oracle and/or its affiliates. */

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
 *   lobstream1.js
 *
 * DESCRIPTION
 *   SELECTs a CLOB and a BLOB and streams to files.
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

// Stream a LOB to a file
async function doStream(lob, outFileName) {

  const doStreamHelper = new Promise((resolve, reject) => {

    if (lob.type === oracledb.CLOB) {
      console.log('Writing a CLOB to ' + outFileName);
      lob.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
    } else {
      console.log('Writing a BLOB to ' + outFileName);
    }

    lob.on('error', (err) => {
      // console.log("lob.on 'error' event");
      reject(err);
    });

    lob.on('end', () => {
      // console.log("lob.on 'end' event");
      lob.destroy();
    });

    lob.on('close', () => {
      // console.log("lob.on 'close' event");
      resolve();
    });

    const outStream = fs.createWriteStream(outFileName);
    outStream.on('error', (err) => {
      // console.log("outStream.on 'error' event");
      lob.destroy(err);
    });

    // Switch into flowing mode and push the LOB to the file
    lob.pipe(outStream);
  });

  await doStreamHelper;
}

async function run() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupLobs(connection, true);  // create the demo table

    //
    // Fetch a CLOB and stream it
    //
    let result = await connection.execute(`SELECT c FROM no_lobs WHERE id = 1`);
    if (result.rows.length === 0) {
      throw new Error("No row found");
    }
    let lob = result.rows[0][0];
    if (lob === null) {
      throw new Error("LOB was NULL");
    }
    await doStream(lob, 'clobstream1out.txt');

    //
    // Fetch a BLOB and stream it
    //
    result = await connection.execute(`SELECT b FROM no_lobs WHERE id = 2`);
    if (result.rows.length === 0) {
      throw new Error("No row found");
    }
    lob = result.rows[0][0];
    if (lob === null) {
      throw new Error("LOB was NULL");
    }
    await doStream(lob, 'blobstream1out.jpg');

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

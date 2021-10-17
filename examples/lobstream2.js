/* Copyright (c) 2016, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   lobstream2.js
 *
 * DESCRIPTION
 *   SELECTs a CLOB, streams it using 'data' events, and then displays it to the screen
 *
 *   This example requires node-oracledb 1.12 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const fs = require('fs');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

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

    await demoSetup.setupLobs(connection, true);  // create the demo table with data

    //
    // Fetch a CLOB and write to the console
    //
    let result = await connection.execute(`SELECT c FROM no_lobs WHERE id = 1`);
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
        // Build up the string.  For larger LOBs you might want to print or use each chunk separately
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

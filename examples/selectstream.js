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
 *   selectstream.js
 *
 * DESCRIPTION
 *   Executes a basic query using a Readable Stream.
 *
 *   This example requires node-oracledb 1.8 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

// On Windows and macOS, you can specify the directory containing the Oracle
// Client Libraries at runtime, or before Node.js starts.  On other platforms
// the system library search path must always be set before Node.js is started.
// See the node-oracledb installation documentation.
// If the search path is not correct, you will get a DPI-1047 error.
if (process.platform === 'win32') { // Windows
  oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_19_11' });
} else if (process.platform === 'darwin') { // macOS
  oracledb.initOracleClient({ libDir: process.env.HOME + '/Downloads/instantclient_19_8' });
}

async function run() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupBf(connection);  // create the demo table

    const stream = connection.queryStream(
      `SELECT farmer, weight
       FROM no_banana_farmer
       ORDER BY id`,
      [],  // no binds
      {
        prefetchRows:   150,  // internal buffer sizes can be adjusted for performance tuning
        fetchArraySize: 150
      }
    );

    const consumeStream = new Promise((resolve, reject) => {
      let rowcount = 0;

      stream.on('error', function(error) {
        // console.log("stream 'error' event");
        reject(error);
      });

      stream.on('metadata', function(metadata) {
        // console.log("stream 'metadata' event");
        console.log(metadata);
      });

      stream.on('data', function(data) {
        // console.log("stream 'data' event");
        console.log(data);
        rowcount++;
      });

      stream.on('end', function() {
        // console.log("stream 'end' event"); // all data has been fetched
        stream.destroy();                     // clean up resources being used
      });

      stream.on('close', function() {
        // console.log("stream 'close' event");
        // The underlying ResultSet has been closed, so the connection can now
        // be closed, if desired.  Note: do not close connections on 'end'.
        resolve(rowcount);
      });
    });

    const numrows = await consumeStream;
    console.log('Rows selected: ' + numrows);
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

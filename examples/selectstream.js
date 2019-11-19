/* Copyright (c) 2016, 2019, Oracle and/or its affiliates. All rights reserved. */

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

async function run() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupBf(connection);  // create the demo table

    const stream = await connection.queryStream(
      `SELECT farmer, weight
       FROM no_banana_farmer
       ORDER BY id`,
      [],  // no binds
      {
        fetchArraySize: 150 // internal buffer size can be adjusted for performance tuning
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

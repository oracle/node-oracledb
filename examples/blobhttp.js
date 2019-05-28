/* Copyright (c) 2015, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   blobhttp.js
 *
 * DESCRIPTION
 *   Listens for an HTTP request and returns an image queried from a BLOB column
 *   Also shows the connection pool's caching using a 'default' pool.
 *
 *   Use demo.sql to create the required table or do:
 *     DROP TABLE mylobs;
 *     CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);
 *
 *   Run lobinsert1.js to load an image before running this example.
 *
 *   Start the listener with 'node blobhttp.js' and then use a browser
 *   to load http://localhost:7000/getimage
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

var url = require('url');
var http = require('http');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var httpPort = 7000;

// Main entry point.  Creates a connection pool which becomes the
// 'default' pool, and then creates an HTTP server.
async function init() {
  try {
    await oracledb.createPool(
      {
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: dbConfig.connectString
      });
    console.log('Connection pool started');

    // Create HTTP server and listen on port httpPort
    const server = http.createServer();
    server.on('error', (err) => {
      throw err;
    });
    server.on('request', (request, response) => {
      handleRequest(request, response);
    });
    await server.listen(httpPort);
    console.log("Server running.  Try requesting: http://localhost:" + httpPort + "/getimage");

  } catch (err) {
    console.error('init() error: ' + err.message);
  }
}

// Handles each web request
async function handleRequest(request, response) {

  const requrl = url.parse(request.url, true);
  const action = requrl.pathname;

  if (action == '/getimage') {

    let connection;

    try {
      connection = await oracledb.getConnection();  // gets a connection from the 'default' connection pool

      const result = await connection.execute(
        "SELECT b FROM mylobs WHERE id = :id",  // get the image
        { id: 2 }
      );
      if (result.rows.length === 0) {
        throw new Error("No results.  Did you run lobinsert1.js?");
      }

      var lob = result.rows[0][0];
      if (lob === null) {
        throw new Error("BLOB was NULL");
      }

      const doStream = new Promise((resolve, reject) => {
        lob.on('end', () => {
          // console.log("lob.on 'end' event");
          response.end();
        });
        lob.on('close', () => {
          // console.log("lob.on 'close' event");
          resolve();
        });
        lob.on('error', (err) => {
          // console.log("lob.on 'error' event");
          reject(err);
        });
        response.writeHead(200, {'Content-Type': 'image/jpeg' });
        lob.pipe(response);  // write the image out
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

  } else {
    response.writeHead(200, {'Content-Type': 'text/plain' });
    response.end("Try requesting: http://localhost:" + httpPort + "/getimage\n");
  }
}

async function closePoolAndExit() {
  console.log('\nTerminating');
  try {
    // Get the pool from the pool cache and close it when no
    // connections are in use, or force it closed after 10 seconds
    // If this hangs, you may need DISABLE_OOB=ON in a sqlnet.ora file
    await oracledb.getPool().close(10);
    console.log('Pool closed');
    process.exit(0);
  } catch(err) {
    console.error(err.message);
    process.exit(1);
  }
}

process
  .once('SIGTERM', closePoolAndExit)
  .once('SIGINT',  closePoolAndExit);

init();

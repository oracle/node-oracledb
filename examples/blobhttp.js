/* Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *****************************************************************************/

var url = require('url');
var http = require('http');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var httpPort = 7000;

// Main entry point.  Creates a connection pool which becomes the
// 'default' pool.  The callback creates an HTTP server.
function init() {
  oracledb.createPool(
    {
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString
    },
    function(err) {
      if (err) {
        console.error("createPool() error: " + err.message);
        return;
      }

      // Create HTTP server and listen on port 'httpPort'
      http
      .createServer(function(request, response) {
        handleRequest(request, response);
      })
      .listen(httpPort);

      console.log("Server running.  Try requesting: http://localhost:" + httpPort + "/getimage");
    });
}

// Handles each web request
function handleRequest(request, response) {

  var requrl = url.parse(request.url, true);
  var action = requrl.pathname;

  if (action == '/getimage') {
    oracledb.getConnection(  // gets a connection from the 'default' connection pool
      function(err, connection)
      {
        if (err) {
          console.error(err.message);
          return;
        }

        connection.execute(
          "SELECT b FROM mylobs WHERE id = :id",  // get the image
          { id: 2 },
          function(err, result)
          {
            if (err) {
              console.error(err.message);
              return;
            }

            if (result.rows.length === 0) {
              console.error("No results.  Did you run lobinsert1.js?");
              return;
            }

            var lob = result.rows[0][0];
            if (lob === null) {
              console.log("BLOB was NULL");
              return;
            }

            lob.on(
              'end',
              function()
              {
                console.log("lob.on 'end' event");
                response.end();
              });
            lob.on(
              'close',
              function()
              {
                console.log("lob.on 'close' event");
                connection.close(function(err) {
                  if (err) console.error(err);
                });
              });
            lob.on(
              'error',
              function(err)
              {
                console.log("lob.on 'error' event");
                console.error(err);
                connection.close(function(err) {
                  if (err) console.error(err);
                });
              });
            response.writeHead(200, {'Content-Type': 'image/jpeg' });
            lob.pipe(response);  // write the image out
          });
      });

  } else {
    response.writeHead(200, {'Content-Type': 'text/plain' });
    response.end("Try requesting: http://localhost:" + httpPort + "/getimage\n");
  }
}

process
.on('SIGTERM', function() {
  console.log("\nTerminating");
  process.exit(0);
})
.on('SIGINT', function() {
  console.log("\nTerminating");
  process.exit(0);
});

init();

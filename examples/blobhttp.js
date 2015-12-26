/* Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved. */

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
 *   Use demo.sql to create the required table or do:
 *     DROP TABLE mylobs;
 *     CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);
 *   Run blobinsert1.js to load an image before running this example.
 *   Start the listener with 'node blobhttp.js' and then use a browser
 *   to load http://127.0.0.1:7000/getimage
 *
 *****************************************************************************/

var http = require('http');
var url = require('url');

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var portid = 7000;

http.createServer(function(req, res){
  var request = url.parse(req.url, true);
  var action = request.pathname;

  if (action == '/getimage') {
    oracledb.getConnection(
      {
        user          : dbConfig.user,
        password      : dbConfig.password,
        connectString : dbConfig.connectString
      },
      function(err, connection)
      {
        if (err) { console.error(err.message); return; }

        connection.execute(
          "SELECT b FROM mylobs WHERE id = :id",
          { id: 2 },
          function(err, result)
          {
            if (err) { console.error(err.message); return; }
            if (result.rows.length === 0) { console.log("No results"); return; }

            var lob = result.rows[0][0];
            if (lob === null) { console.log("BLOB was NULL"); return; }

            lob.on(
              'end',
              function()
              {
                console.log("lob.on 'end' event");
                res.end();
              });
            lob.on(
              'close',
              function()
              {
                console.log("lob.on 'close' event");
                connection.release(function(err) {
                  if (err) console.error(err);
                });
              });
            lob.on(
              'error',
              function(err)
              {
                console.log("lob.on 'error' event");
                console.error(err);
              });
            res.writeHead(200, {'Content-Type': 'image/jpeg' });
            lob.pipe(res);
          });
      });

  } else {
    res.writeHead(200, {'Content-Type': 'text/plain' });
    res.end('Try requesting: http://127.0.0.1:7000/getimage\n');
  }
}).listen(portid, '127.0.0.1');

console.log("Server running at http://127.0.0.1:" + portid);
console.log("Try requesting: http://127.0.0.1:7000/getimage");

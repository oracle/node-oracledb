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
 *   clobstream2.js
 *
 * DESCRIPTION
 *   SELECTs a CLOB and writes it to a file, clobstream2out.txt
 *   Use demo.sql to create the required table or do:
 *     DROP TABLE mylobs;
 *     CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);
 *   Run clobinsert1.js to load text before running this example.
 *
 *****************************************************************************/

var fs = require('fs');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var outFileName = 'clobstream2out.txt';

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
      "SELECT c FROM mylobs WHERE id = :id",
      { id: 1 },
      function(err, result)
      {
        if (err) { console.error(err.message); return; }
        if (result.rows.length === 0) { console.log("No results"); return; }

        var clob = '';
        var lob = result.rows[0][0];

        if (lob === null) { console.log("CLOB was NULL"); return; }

        console.log('CLOB length is ' + lob.length);
        console.log("CLOB chunkSize is", lob.chunkSize);

        lob.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
        // pieceSize is the number of bytes retrieved for each readable 'data' event.
        // The default is lob.chunkSize.  The recommendation is for it to be a multiple of chunkSize.
        // lob.pieceSize = 100;  // fetch smaller chunks to show repeated 'data' events

        lob.on('data',
                function(chunk)
                {
                  console.log("lob.on 'data' event");
                  console.log('  - got %d bytes of data', chunk.length);
                  clob += chunk;
                  // an alternative (not shown) would be to write each chunk out
                });
        lob.on('end',
                function()
                {
                  console.log("lob.on 'end' event");
                  console.log("clob size is " + clob.length);
                  fs.writeFile(outFileName, clob, function(err) {
                    if (err)
                      console.error(err);
                    else
                      console.log("Completed write to " + outFileName);
                  });
                });
        lob.on('close',
               function()
               {
                 console.log("lob.on 'close' event");
                 connection.release(function(err) {
                   if (err) console.error(err);
                 });
               });
        lob.on('error',
                function(err)
                {
                  console.log("lob.on 'error' event");
                  console.error(err);
                });
      });
  });

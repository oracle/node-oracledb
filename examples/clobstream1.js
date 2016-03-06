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
 *   clobstream1.js
 *
 * DESCRIPTION
 *   SELECTs a CLOB and pipes it to a file, clobstream1out.txt
 *   Use demo.sql to create the required table or do:
 *     DROP TABLE mylobs;
 *     CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);
 *   Run clobinsert1.js to load text before running this example.
 *
 *****************************************************************************/

var fs = require('fs');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var outFileName = 'clobstream1out.txt';

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

        var lob = result.rows[0][0];
        if (lob === null) { console.log("CLOB was NULL"); return; }

        lob.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
        lob.on(
          'error',
          function(err)
          {
            console.log("lob.on 'error' event");
            console.error(err);
          });
        lob.on(
          'close',
          function()
          {
            console.log("lob.on 'close' event");
            connection.release(function(err) {
              if (err) console.error(err.message);
            });
          });

        console.log('Writing to ' + outFileName);
        var outStream = fs.createWriteStream(outFileName);
        outStream.on(
          'error',
          function(err)
          {
            console.log("outStream.on 'error' event");
            console.error(err);
          });
        lob.pipe(outStream);
      });
  });

/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   templobinsert.js
 *
 * DESCRIPTION
 *   Creates a temporary LOB, stream the data into LOB from clobexample.txt and
 *   INSERTs it into a CLOB column.
 *   Create clobexample.txt before running this example.
 *   Use demo.sql to create the required table or do:
 *     DROP TABLE mylobs;
 *     CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);
 *
 *****************************************************************************/

var fs = require('fs');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var inFileName = 'clobexample.txt';  // the file with text to be inserted into the database

oracledb.getConnection(
  {
    user          : dbConfig.user,
    password      : dbConfig.password,
    connectString : dbConfig.connectString
  },
  function(err, connection)
  {
    if (err) { console.error(err.message); return; }

    console.log("Got the connection");
    connection.createLob (oracledb.CLOB, function(err, lob) {

      console.log("createLob finished");
      if (err) { console.error(err.message); return; }

      lob.on(
        'close',
        function()
        {
          console.log("lob.on 'close' event");
          connection.commit(
            function(err)
            {
              if (err)
                console.error(err.message);
              else
                console.log("Text inserted successfully.");
              connection.close(function(err) {
                if (err) console.error(err.message);
              });
            });
        }
      );

      lob.on(
        'error',
        function(err)
        {
          console.log("lob.on 'error' event");
          console.error(err);
        }
      );

      lob.on(
        'finish',
        function()
        {
          console.log("lob.on 'finish' event");

          connection.execute(
            "INSERT INTO mylobs (id, c) VALUES (:id, :lobbv)",
            { id: 5, lobbv: lob }, // type and direction are optional for LOB
            function(err, result)
            {
              if (err) {
                console.error(err.message);
              } else {
                console.log("Rows inserted: " + result.rowsAffected);
                // Apps should close the the LOBs created using createLOB ()
                // method
                if (lob.tempLob) {
                  lob.close ( function (err) {
                    if (err) {console.error(err.message); return; }
                  }
                  );
                }
              }
            }
          );
        }
      );

      console.log('Reading from ' + inFileName);
      var inStream = fs.createReadStream(inFileName);
      inStream.on(
        'error',
        function(err)
        {
          console.log("inStream.on 'error' event");
          console.error(err);
          connection.close(function(err) {
            if (err) console.error(err.message);
          });
        }
      );

      inStream.pipe(lob);  // copies the text to the CLOB

    }
    ); // End of createLOB
  }
); // End of getConnection


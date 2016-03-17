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
 *   clobinsert2.js
 *
 * DESCRIPTION
 *   INSERTs pieces of text into a CLOB column.
 *   Use demo.sql to create the required table or do:
 *     DROP TABLE mylobs;
 *     CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

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
      "INSERT INTO mylobs (id, c) VALUES (:id, EMPTY_CLOB()) RETURNING c INTO :lobbv",
      { id: 2, lobbv: {type: oracledb.CLOB, dir: oracledb.BIND_OUT} },
      { autoCommit: false },  // a transaction needs to span the INSERT and pipe()
      function(err, result)
      {
        if (err) { console.error(err.message); return; }
        if (result.rowsAffected != 1 || result.outBinds.lobbv.length != 1) {
          console.error('Error getting a LOB locator');
          return;
        }

        var lob = result.outBinds.lobbv[0];
        lob.on(
          'finish',
          function()
          {
            console.log("lob.on 'finish' event");
            connection.commit(
              function(err)
              {
                if (err)
                  console.error(err.message);
                else
                  console.log("Text inserted successfully.");
                connection.release(function(err) {
                  if (err) console.error(err);
                });
              });
          });
        lob.on(
          'error',
          function(err)
          {
            console.log("lob.on 'error' event");
            console.error(err);
            connection.release(function(err) {
              if (err) console.error(err.message);
            });
          });

        // See Node.js Streams examples for how to use 'drain' if write() returns false
        lob.write('Hello, ', 'utf8', function () { console.log("lob.write callback"); });
        lob.end('Oracle!', 'utf8', function () { console.log("lob.end callback"); });
      });
  });

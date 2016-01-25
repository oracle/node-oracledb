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
 *   selectjsonclob.js
 *
 * DESCRIPTION
 *   Executes a query from a JSON table using CLOB storage.
 *   Requires Oracle Database 12.1.0.2, which has extensive JSON datatype support.
 *   See http://docs.oracle.com/database/121/ADXDB/json.htm#CACGCBEG
 * 
 *   Use demo.sql to create the required table.
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');
var stream = require('stream');

oracledb.getConnection(
  {
    user          : dbConfig.user,
    password      : dbConfig.password,
    connectString : dbConfig.connectString
  },
  function(err, connection)
  {
    if (err) { console.error(err.message); return; }

    if (connection.oracleServerVersion < 1201000200) {
      console.error('This example only works with Oracle Database 12.1.0.2 or greater');
      process.exit(1);
    }

    doInsert(
      connection,
      JSON.stringify({ "userId": 2, "userName": "Bob", "location": "USA" }),
      function(err)
      {
        if (err) {
          console.error(err.message);
          doRelease(connection);
          return;
        }

        doQuery(
          connection,
          function(err, result)
          {
            if (err)
              console.error(err.message);
            else              
              console.log('Query results: ', result);
            doRelease(connection);
          });
      });
  });

function doInsert(connection, data, cb)
{
  connection.execute(
    "INSERT INTO j_purchaseorder_c (po_document) VALUES (EMPTY_CLOB()) RETURNING po_document INTO :lobbv",
    { lobbv: {type: oracledb.CLOB, dir: oracledb.BIND_OUT} },
    { autoCommit: false },  // a transaction needs to span the INSERT and pipe()
    function(err, result)
    {
      if (err) { return cb(err); }
      if (result.rowsAffected != 1 || result.outBinds.lobbv.length != 1) {
        return cb(new Error('Error getting a LOB locator'));
      }

      var lob = result.outBinds.lobbv[0];
      lob.on(
        'error',
        function(err) {
          return cb(err);
        });

      lob.on(
        'finish',
        function()
        {
          connection.commit(
            function(err)
            {
              if (err)
                return cb(err);
              else {
                console.log("Data inserted successfully.");
                return cb();
              }
            });
        });

      var inStream = new stream.Readable();
      inStream._read = function noop() {};
      inStream.push(data);
      inStream.push(null);

      inStream.on(
        'error',
        function(err) {
          return cb(err);
        });
      inStream.pipe(lob);
    });
}

function doQuery(connection, cb)
{
  connection.execute(
    "SELECT po_document FROM j_purchaseorder_c WHERE JSON_EXISTS (po_document, '$.location')",
    function(err, result)
    {
      if (err) { return cb(err); }
      if (result.rows.length === 0) { return cb(new Error('No results')); }

      var clob = '';
      var lob = result.rows[0][0];  // just show first record
      if (lob === null) { return cb(new Error('CLOB was NULL')); }
      lob.setEncoding('utf8');      // set the encoding so we get a 'string' not a 'buffer'
      lob.on('data',
             function(chunk)
             {
               clob += chunk;
             });
      lob.on('close',
             function()
             {
               return cb(null, JSON.parse(clob));
             });
      lob.on('error',
             function(err)
             {
               return cb(err);
             });
    });
}

function doRelease(connection)
{
  connection.release(
    function(err) {
      if (err) {
        console.error(err.message);
      }
    });
}

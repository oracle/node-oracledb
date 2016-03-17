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

var async = require('async');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');
var stream = require('stream');

var doconnect = function(cb) {
  oracledb.getConnection(dbConfig, cb);
};

var dorelease = function(conn) {
  conn.release(function (err) {
    if (err)
      console.error(err.message);
  });
};

var checkver = function (conn, cb) {
  if (conn.oracleServerVersion < 1201000200) {
    return cb(new Error('This example only works with Oracle Database 12.1.0.2 or greater'), conn);
  } else {
    return cb(null, conn);
  }
};

var doinsert = function (conn, cb) {
  var data = { "userId": 2, "userName": "Bob", "location": "USA" };
  var s = JSON.stringify(data);
  conn.execute(
    "INSERT INTO j_purchaseorder_c (po_document) VALUES (EMPTY_CLOB()) RETURNING po_document INTO :lobbv",
    { lobbv: {type: oracledb.CLOB, dir: oracledb.BIND_OUT} },
    { autoCommit: false },  // a transaction needs to span the INSERT and pipe()
    function(err, result)
    {
      if (err) { return cb(err, conn); }
      if (result.rowsAffected != 1 || result.outBinds.lobbv.length != 1) {
        return cb(new Error('Error getting a LOB locator'), conn);
      }
      var lob = result.outBinds.lobbv[0];
      lob.on(
        'error',
        function(err) {
          return cb(err, conn);
        });
      lob.on(
        'finish',
        function()
        {
          conn.commit(
            function(err)
            {
              if (err)
                return cb(err, conn);
              else {
                console.log("Data inserted successfully.");
                return cb(null, conn);
              }
            });
        });

      var inStream = new stream.Readable();
      inStream._read = function noop() {};
      inStream.push(s);  // Data to insert
      inStream.push(null);

      inStream.on(
        'error',
        function(err) {
          return cb(err, conn);
        });
      inStream.pipe(lob);
    });
};

var dojsonquery = function (conn, cb) {
  conn.execute(
    "SELECT po_document FROM j_purchaseorder_c WHERE JSON_EXISTS (po_document, '$.location')",
    function(err, result)
    {
      if (err) { return cb(err, conn); }
      if (result.rows.length === 0) { return cb(new Error('No results'), conn); }

      var clob = '';
      var lob = result.rows[0][0];  // just show first record
      if (lob === null) { return cb(new Error('CLOB was NULL'), conn); }
      lob.setEncoding('utf8');      // set the encoding so we get a 'string' not a 'buffer'
      lob.on('data',
             function(chunk)
             {
               clob += chunk;
             });
      lob.on('close',
             function()
             {
               var js = JSON.parse(clob);
               console.log('Query results: ', js);
               return cb(null, conn);
             });
      lob.on('error',
             function(err)
             {
               return cb(err, conn);
             });
    });
};

var dorelationalquery = function (conn, cb) {
  conn.execute(
    "SELECT JSON_VALUE(po_document, '$.location') FROM j_purchaseorder_c",
    function(err, result)
    {
      if (err) {
        return cb(err, conn);
      } else {
        console.log('Query results: ', result.rows[0][0]); // just show first record
        return cb(null, conn);
      }
    });
};

async.waterfall(
  [
    doconnect,
    checkver,
    doinsert,
    dojsonquery,
    dorelationalquery
  ],
  function (err, conn) {
    if (err) { console.error("In waterfall error cb: ==>", err, "<=="); }
    if (conn)
      dorelease(conn);
  });

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
 *   Executes sample queries from a JSON table that uses CLOB storage.
 *   Requires Oracle Database 12.1.0.2, which has extensive JSON datatype support.
 *   See https://docs.oracle.com/database/122/ADJSN/toc.htm
 *
 *   Use demo.sql to create the required table.
 *
 *****************************************************************************/

var async = require('async');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var doconnect = function(cb) {
  oracledb.getConnection(dbConfig, cb);
};

var dorelease = function(conn) {
  conn.close(function (err) {
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

// Insert some data directly.
var doinsert = function (conn, cb) {
  var data = { "userId": 2, "userName": "Bob", "location": "USA" };
  var s = JSON.stringify(data);
  conn.execute(
    "INSERT INTO j_purchaseorder_c (po_document) VALUES (:lobbv)",
    { lobbv: s },
    // { autoCommit: true }, // uncomment if you want data to persist
    function(err)
    {
      if (err) {
        return cb(err, conn);
      } else {
        console.log("Data inserted successfully.");
        return cb(null, conn);
      }
    });
};

// Selecting JSON stored in a CLOB column
var dojsonquery = function (conn, cb) {
  console.log('Selecting JSON stored in a CLOB column');
  conn.execute(
    "SELECT po_document FROM j_purchaseorder_c WHERE JSON_EXISTS (po_document, '$.location')",
    [],
    { fetchInfo: { "PO_DOCUMENT": { type: oracledb.STRING} } },  // Fetch as a String instead of a Stream
    function(err, result)
    {
      if (err)
        return cb(err, conn);
      if (result.rows.length === 0)
        return cb(new Error('No results'), conn);

      console.log('Query results:');
      console.log(result.rows);
      return cb(null, conn);
    });
};

async.waterfall(
  [
    doconnect,
    checkver,
    doinsert,
    dojsonquery
  ],
  function (err, conn) {
    if (err) { console.error("In waterfall error cb: ==>", err, "<=="); }
    if (conn)
      dorelease(conn);
  });

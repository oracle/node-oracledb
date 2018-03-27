/* Copyright (c) 2015, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   selectjsonblob.js
 *
 * DESCRIPTION
 *   Executes sample insert and query statements using a JSON column with BLOB storage.
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

// Insert some JSON data

var doinsert = function (conn, cb) {
  var data = { "userId": 2, "userName": "Bob", "location": "USA" };
  var s = JSON.stringify(data);
  var b = Buffer.from(s, 'utf8');
  conn.execute(
    "INSERT INTO j_purchaseorder_b (po_document) VALUES (:lobbv)",
    { lobbv: b },
    // { autoCommit: true }, // uncomment if you want data to persist
    function(err) {
      if (err) {
        return cb(err, conn);
      } else {
        console.log("Data inserted successfully.");
        return cb(null, conn);
      }
    });
};

// Select JSON with JSON_EXISTS

var dojsonquery = function (conn, cb) {
  console.log('Selecting JSON stored in a BLOB column:');
  conn.execute(
    "SELECT po_document FROM j_purchaseorder_b WHERE JSON_EXISTS (po_document, '$.location')",
    [],
    { fetchInfo: { "PO_DOCUMENT": { type: oracledb.BUFFER } } },  // Fetch as a Buffer instead of a Stream
    function(err, result) {
      if (err)
        return cb(err, conn);
      if (result.rows.length === 0)
        return cb(new Error('No results'), conn);

      console.log(result.rows[0][0].toString('utf8'));
      return cb(null, conn);
    });
};

// Select a JSON value using dot-notation.  This syntax requires Oracle Database 12.2

var dojsonquerydot = function (conn, cb) {
  console.log('Selecting a JSON value:');
  conn.execute(
    "SELECT pob.po_document.location FROM j_purchaseorder_b pob",
    function(err, result) {
      if (err)
        return cb(err, conn);
      if (result.rows.length === 0)
        return cb(new Error('No results'), conn);

      console.log(result.rows[0][0]);
      return cb(null, conn);
    });
};

async.waterfall(
  [
    doconnect,
    checkver,
    doinsert,
    dojsonquery,
    dojsonquerydot
  ],
  function (err, conn) {
    if (err) { console.error("In waterfall error cb: ==>", err, "<=="); }
    if (conn)
      dorelease(conn);
  });

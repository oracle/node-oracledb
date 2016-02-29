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
 *   selectjson.js
 *
 * DESCRIPTION
 *   Executes a query from a JSON table.
 *   Requires Oracle Database 12.1.0.2, which has extensive JSON datatype support.
 *   See http://docs.oracle.com/database/121/ADXDB/json.htm#CACGCBEG
 *   Use demo.sql to create the required table or do:
 *
 *   DROP TABLE j_purchaseorder;
 *   CREATE TABLE j_purchaseorder
 *   (po_document VARCHAR2(4000) CONSTRAINT ensure_json CHECK (po_document IS JSON));
 *
 *****************************************************************************/

var async = require('async');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

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
  var data = { "userId": 1, "userName": "Chris", "location": "Australia" };
  var s = JSON.stringify(data);
  conn.execute(
    "INSERT INTO j_purchaseorder (po_document) VALUES (:bv)",
    [s], // bind the JSON string for inserting into the JSON column.
    { autoCommit: true },
    function (err) {
      if (err) {
        return cb(err, conn);
      } else {
        console.log("Data inserted successfully.");
        return cb(null, conn);
      }
    });
};

var dojsonquery = function (conn, cb) {
  conn.execute(
    "SELECT po_document FROM j_purchaseorder WHERE JSON_EXISTS (po_document, '$.location')",
    function(err, result)
    {
      if (err) {
        return cb(err, conn);
      } else {
        var js = JSON.parse(result.rows[0][0]);  // just show first record
        console.log('Query results: ', js);
        return cb(null, conn);
      }
    });
};

var dorelationalquery = function (conn, cb) {
  conn.execute(
    "SELECT JSON_VALUE(po_document, '$.location') FROM j_purchaseorder",
    function(err, result)
    {
      if (err) {
        return cb(err, conn);
      } else {
        console.log('Query results: ', result.rows[0][0]);  // just show first record
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

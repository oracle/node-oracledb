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
 *   selectjson.js
 *
 * DESCRIPTION
 *   Shows some JSON features of Oracle Database 12c.
 *   Requires Oracle Database 12.1.0.2, which has extensive JSON datatype support.
 *   See https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=ADJSN
 *
 *   Uses Oracle's sample HR schema.
 *   Also run demo.sql to create the required extra table or do:
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

// 1. Selecting JSON stored in a VARCHAR2 column
var dojsonquery = function (conn, cb) {
  console.log('1. Selecting JSON stored in a VARCHAR2 column');
  conn.execute(
    "SELECT po_document FROM j_purchaseorder WHERE JSON_EXISTS (po_document, '$.location')",
    function(err, result) {
      if (err) {
        return cb(err, conn);
      } else {
        var js = JSON.parse(result.rows[0][0]);  // just show first record
        console.log('Query results: ', js);
        return cb(null, conn);
      }
    });
};

// 2. Extract a value from a JSON column.  This syntax requires Oracle Database 12.2
var dorelationalquerydot = function (conn, cb) {
  console.log('2. Using dot-notation to extract a value from a JSON column');
  conn.execute(
    "SELECT po.po_document.location FROM j_purchaseorder po",
    function(err, result) {
      if (err) {
        return cb(err, conn);
      } else {
        console.log('Query results: ', result.rows[0][0]);  // just show first record
        return cb(null, conn);
      }
    });
};

// 3. Using JSON_VALUE to extract a value from a JSON column
var dorelationalquery = function (conn, cb) {
  console.log('3. Using JSON_VALUE to extract a value from a JSON column');
  conn.execute(
    "SELECT JSON_VALUE(po_document, '$.location') FROM j_purchaseorder",
    function(err, result) {
      if (err) {
        return cb(err, conn);
      } else {
        console.log('Query results: ', result.rows[0][0]);  // just show first record
        return cb(null, conn);
      }
    });
};

// 4. Using JSON_OBJECT to extract relational data as JSON
var dojsonfromrelational = function (conn, cb) {
  console.log('4. Using JSON_OBJECT to extract relational data as JSON');
  if (conn.oracleServerVersion < 1202000000) { // JSON_OBJECT is new in Oracle Database 12.2
    console.log('The JSON_OBJECT example only works with Oracle Database 12.2 or greater');
    return cb(null, conn);
  } else {
    conn.execute(
      `SELECT JSON_OBJECT ('deptId' IS d.department_id, 'name' IS d.department_name) department
       FROM departments d
       WHERE department_id < :did`,
      [50],
      function(err, result) {
        if (err) {
          return cb(err, conn);
        } else {
          for (var i = 0; i < result.rows.length; i++)
            console.log(result.rows[i][0]);
          return cb(null, conn);
        }
      });
  }
};

async.waterfall(
  [
    doconnect,
    checkver,
    doinsert,
    dojsonquery,
    dorelationalquerydot,
    dorelationalquery,
    dojsonfromrelational
  ],
  function (err, conn) {
    if (err) { console.error("In waterfall error cb: ==>", err, "<=="); }
    if (conn)
      dorelease(conn);
  });

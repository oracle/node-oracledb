/* Copyright (c) 2015, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   raw1.js
 *
 * DESCRIPTION
 *   Shows using a Buffer to insert and select a RAW.
 *   Use demo.sql to create the dependencies or do:
 *
 *   DROP TABLE myraw;
 *   CREATE TABLE myraw (r RAW(64));
 *
 *   This example requires node-oracledb 1.2 or later.
 *
 *****************************************************************************/

var async = require('async');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var data = [0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x2c, 0x20, 0x4f, 0x72, 0x61, 0x63, 0x6c, 0x65, 0x21];
var buf;
if (Number(process.version.match(/^v(\d+\.\d+)/)[1]) < 4)
  buf = new Buffer(data, 'hex');  // deprecated usage
else
  buf = Buffer.from(data);

var insertRaw = function (conn, cb) {
  conn.execute(
    "INSERT INTO myraw VALUES (:r)",
    { r : { val: buf, type: oracledb.BUFFER, dir:oracledb.BIND_IN }},
    function(err, result) {
      if (err) {
        return cb(err, conn);
      } else {
        console.log(result.rowsAffected + " row(s) inserted.");
        return cb(null, conn);
      }
    });
};

var queryRaw = function (conn, cb) {
  conn.execute(
    "SELECT r FROM myraw",
    function (err, result) {
      if (err) {
        return cb(err, conn);
      } else {
        var buf = result.rows[0];
        console.log("Buffer queried:");
        console.log(buf);
        console.log(buf.toString('utf8'));
        return cb(null, conn);
      }
    });
};

// Insert and query the RAW data
async.waterfall(
  [
    function(cb) {
      oracledb.getConnection(dbConfig, cb);
    },
    insertRaw,
    queryRaw
  ],
  function (err, conn) {
    if (err) { console.error("In waterfall error cb: ==>", err, "<=="); }
    if (conn)
      conn.close(function (err) { if (err) console.error(err.message); });
  });


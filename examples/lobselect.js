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
 *   lobselect.js
 *
 * DESCRIPTION
 *   SELECTs a CLOB and displays it to the screen.
 *
 *   'Large' CLOBs should be streamed as shown in lobstream1.js
 *
 *   Use demo.sql to create the required table or do:
 *     DROP TABLE mylobs;
 *     CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);
 *
 *   Run lobinsert1.js to load data before running this example.
 *
 *****************************************************************************/

var async = require('async');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

// force all CLOBs to be returned as Strings
oracledb.fetchAsString = [ oracledb.CLOB ];

var doconnect = function(cb) {
  oracledb.getConnection(
    {
      user          : dbConfig.user,
      password      : dbConfig.password,
      connectString : dbConfig.connectString
    },
    function(err, conn) {
      if (err)
        return cb(err);
      else {
        return cb(null, conn);
      }
    });
};

var dorelease = function(conn) {
  conn.close(function (err) {
    if (err)
      console.error(err.message);
  });
};

var doquery = function(conn, cb) {
  conn.execute(
    "SELECT c FROM mylobs WHERE id = :idbv",
    [1],
    // An alternative to oracledb.fetchAsString is to use fetchInfo on a column:
    // { fetchInfo: {"C": {type: oracledb.STRING}} },
    function(err, result)
    {
      if (err) {
        return cb(err, conn);
      }
      if (result.rows.length === 0) {
        return cb(new Error("No results.  Did you run lobinsert1.js?"), conn);
      }
      var clob = result.rows[0][0];
      console.log('The CLOB was: ');
      console.log(clob);
      return cb(null, conn);
    });
};

// Connect and call the CLOB example
async.waterfall([
  doconnect,
  doquery
],
function (err, conn) {
  if (err) { console.error("In waterfall error cb: ==>", err, "<=="); }
  if (conn)
    dorelease(conn);
});

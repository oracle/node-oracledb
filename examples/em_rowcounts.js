/* Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   em_rowcounts.js
 *
 * DESCRIPTION
 *   executeMany() example showing dmlRowCounts.
 *   For this example, there no commit so it is re-runnable.
 *   This example also uses Async/Await of Node 8.
 *   Use demo.sql to create the required schema.
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

var dodelete = function(conn, cb) {
  var sql = "DELETE FROM em_childtab WHERE parentid = :1";

  var binds = [
    [20],
    [30],
    [50]
  ];

  var options = { dmlRowCounts: true };

  conn.executeMany(sql, binds, options, function (err, result) {
    if (err)
      return cb(err, conn);
    else {
      console.log("Result is:", result);
      return cb(null, conn);
    }
  });
};

async.waterfall(
  [
    doconnect,
    dodelete
  ],
  function (err, conn) {
    if (err) { console.error("In waterfall error cb: ==>", err, "<=="); }
    if (conn)
      dorelease(conn);
  });

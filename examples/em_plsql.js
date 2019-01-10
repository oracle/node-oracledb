/* Copyright (c) 2018, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   em_plsql.js
 *
 * DESCRIPTION
 *   executeMany() example calling PL/SQL.
 *   Use demo.sql to create the required schema.
 *
 *   This example requires node-oracledb 2.2 or later.
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

var doplsql = function(conn, cb) {
  var plsql = "BEGIN em_testproc(:1, :2, :3); END;";

  var binds = [
    [1],
    [2],
    [3],
    [4],
    [6]
  ];

  var options = {
    bindDefs: [
      { type: oracledb.NUMBER },
      { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 20 }
    ]
  };

  conn.executeMany(plsql, binds, options, function (err, result) {
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
    doplsql
  ],
  function (err, conn) {
    if (err) { console.error("In waterfall error cb: ==>", err, "<=="); }
    if (conn)
      dorelease(conn);
  });

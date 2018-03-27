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
 *   em_batcherrors.js
 *
 * DESCRIPTION
 *   Array DML example showing batchErrors behavior.  Note, despite the
 *   autoCommit flag, no commit occurs because of data errors. However
 *   valid rows are part of a transaction that can be committed if
 *   desired.
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

var doinsert = function(conn, cb) {
  var sql = "INSERT INTO em_childtab VALUES (:1, :2, :3)";

  var binds = [
    [1016, 10, "Child 2 of Parent A"],
    [1017, 10, "Child 3 of Parent A"],
    [1018, 20, "Child 4 of Parent B"],
    [1018, 20, "Child 4 of Parent B"],   // duplicate key
    [1019, 30, "Child 3 of Parent C"],
    [1020, 40, "Child 4 of Parent D"],
    [1021, 75, "Child 1 of Parent F"],   // parent does not exist
    [1022, 40, "Child 6 of Parent D"]
  ];

  var options = {
    autoCommit: true,
    batchErrors: true,
    dmlRowCounts: true,
    bindDefs: [
      { type: oracledb.NUMBER },
      { type: oracledb.NUMBER },
      { type: oracledb.STRING, maxSize: 20 }
    ]
  };

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
    doinsert
  ],
  function (err, conn) {
    if (err) { console.error("In waterfall error cb: ==>", err, "<=="); }
    if (conn)
      dorelease(conn);
  });

/* Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved. */

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
 *   dbmsoutputgetline.js
 *
 * DESCRIPTION
 *   Displays PL/SQL DBMS_OUTPUT in node-oracledb, fetching one record at a time.
 * 
 *****************************************************************************/

var async = require('async');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

oracledb.createPool(
  {
    user          : dbConfig.user,
    password      : dbConfig.password,
    connectString : dbConfig.connectString
  },
  function(err, pool) {
    if (err)
      console.error(err.message);
    else
      doit(pool);
  });

var doit = function(pool) {
  async.waterfall(
    [
      function(cb) {
        pool.getConnection(cb);
      },
      enableDbmsOutput,
      createDbmsOutput,
      fetchDbmsOutputLine
    ],
    function (err, conn) {
      if (err) { console.error("In waterfall error cb: ==>", err, "<=="); }
      conn.release(function (err) { if (err) console.error(err.message); });
    }
  );
};

var enableDbmsOutput = function (conn, cb) {
  conn.execute(
    "BEGIN DBMS_OUTPUT.ENABLE(NULL); END;",
    function(err) { return cb(err, conn); });
};

var createDbmsOutput = function (conn, cb) {
  conn.execute(
    "BEGIN " +
      "DBMS_OUTPUT.PUT_LINE('Hello, Oracle!');" +
      "DBMS_OUTPUT.PUT_LINE('Hello, Node!');" +
      "END;",
    function(err) { return cb(err, conn); });
};

var fetchDbmsOutputLine = function (conn, cb) {
  conn.execute(
    "BEGIN DBMS_OUTPUT.GET_LINE(:ln, :st); END;",
    { ln: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 32767 },
      st: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
    function(err, result) {
      if (err) {
        return cb(err, conn);
      } else if (result.outBinds.st == 1) {
        return cb(null, conn);  // no more output
      } else {
        console.log(result.outBinds.ln);
        return fetchDbmsOutputLine(conn, cb);
      }
    });
};

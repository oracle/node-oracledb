/* Copyright (c) 2015, 2017, Oracle and/or its affiliates. All rights reserved. */

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
 *   dbmsoutputpipe.js
 *
 * DESCRIPTION
 *   Displays PL/SQL DBMS_OUTPUT using a pipelined table.
 *   Use demo.sql to create the dependencies or do:
 *
 *   CREATE OR REPLACE TYPE dorow AS TABLE OF VARCHAR2(32767);
 *   /
 *   SHOW ERRORS
 *
 *   CREATE OR REPLACE FUNCTION mydofetch RETURN dorow PIPELINED IS
 *   line VARCHAR2(32767);
 *   status INTEGER;
 *   BEGIN LOOP
 *     DBMS_OUTPUT.GET_LINE(line, status);
 *     EXIT WHEN status = 1;
 *     PIPE ROW (line);
 *   END LOOP;
 *   END;
 *   /
 *   SHOW ERRORS
 *
 *****************************************************************************/

var async = require('async');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var numRows = 100;  // fetch this many records at a time

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
      fetchDbmsOutput,
      printDbmsOutput,
      closeRS
    ],
    function (err, conn) {
      if (err) { console.error("In waterfall error cb: ==>", err, "<=="); }
      conn.close(function (err) { if (err) console.error(err.message); });
    });
};

var enableDbmsOutput = function (conn, cb) {
  conn.execute(
    "BEGIN DBMS_OUTPUT.ENABLE(NULL); END;",
    function(err) { return cb(err, conn); });
};

var createDbmsOutput = function (conn, cb) {
  conn.execute(
    `BEGIN
       DBMS_OUTPUT.PUT_LINE('Hello, Oracle!');
       DBMS_OUTPUT.PUT_LINE('Hello, Node!');
     END;`,
    function(err) { return cb(err, conn); });
};

var fetchDbmsOutput = function (conn, cb) {
  conn.execute(
    "SELECT * FROM TABLE(mydofetch())",
    [],
    { resultSet: true },
    function (err, result) {
      if (err)
        return cb(err, conn);
      else
        return cb(null, conn, result);
    });
};

var printDbmsOutput = function(conn, result, cb) {
  if (result.resultSet) {
    return fetchRowsFromRS(conn, result.resultSet, numRows, cb);
  } else {
    console.log("No results");
    return cb(null, conn);
  }
};

var fetchRowsFromRS = function(conn, resultSet, numRows, cb) {
  resultSet.getRows(
    numRows,
    function (err, rows) {
      if (err) {
        return cb(err, conn, resultSet);
      } else if (rows.length > 0) {
        console.log(rows);
        return fetchRowsFromRS(conn, resultSet, numRows, cb);
      } else {
        return cb(null, conn, resultSet);
      }
    });
};

var closeRS = function(conn, resultSet, cb) {
  resultSet.close(function(err) {
    return cb(err, conn);
  });
};

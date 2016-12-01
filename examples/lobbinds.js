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
 *   lobbinds.js
 *
 * DESCRIPTION
 *   Demonstrates following LOB bind features
 *   1) DML bind
 *   2) PL/SQL IN OUT bind
 *   3) PL/SQL OUT bind
 *   4) PL/SQL bind IN for CLOB as String and BLOB as Buffer
 *   5) PL/SQL bind OUT for CLOB as String and BLOB as Buffer
 *
 *   Use demo.sql to create the required tables and procedures
 *   Run clobinsert1.js to load text before running this example
 *
 *  *****************************************************************************/

var async = require('async');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var doconnect = function(cb) {
  oracledb.getConnection(
    {
      user          : dbConfig.user,
      password      : dbConfig.password,
      connectString : dbConfig.connectString
    },
    cb);
};

var dorelease = function(conn) {
  conn.close(function (err) {
    if (err)
      console.error(err.message);
  });
};

// SELECTs a CLOB and inserts it back using BIND_IN support
var dmlbind = function (conn, cb) {
  conn.execute(
    "SELECT c FROM mylobs WHERE id = :id",
    { id: 5 },
    function(err, result)
    {
      if (err) {
        console.error(err.message);
        return cb(err, conn);
      }
      if (result.rows.length === 0) {
        console.log("No results");
        return cb(null, conn);
      }
      var lob = result.rows[0][0];
      if (lob === null) {
        console.log("CLOB was NULL");
        return cb(null, conn);
      }
      // Insert the new row using BIND_IN for CLOB column type
      conn.execute(
      "INSERT INTO mylobs (id, c) VALUES (10, :1)",
      [ {val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN} ],
      { autoCommit: true},
        function(err){
          if (err) { console.error(err.message);  return cb(err, conn); }
          console.log ("LOB inserted using BIND_IN support");
          return cb(null, conn);
        }
      );
    }
  );
};

// Test PL/SQL bind IN for CLOB as String and BLOB as Buffer
// binds 50KB text and binary string using PL/SQL IN bind LOBs
var bind_in_as_str_buf = function (conn, cb) {
  var bigStr = 'A'.repeat(50000); // Repeat function not available in node 0.10.x and 0.12.x
  var bigBuf = new Buffer (bigStr);

  conn.execute(
    "BEGIN lobs_in (:c,:b); END;",
    {
      c:{val: bigStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize:50000},
      b:{val: bigBuf, type: oracledb.BUFFER, dir: oracledb.BIND_IN} // maxSize optional for BIND_IN
    },
    { autoCommit: true },
    function (err)
    {
      if (err) { console.error(err.message); return cb(err, conn); }
      console.log("Completed binding of String and Buffer using LOB IN binds");
      return cb(null, conn);
    }
  );
};

// Test PL/SQL bind OUT for CLOB as String and BLOB as Buffer
// Gets 50KB text and binary strings from the database using PL/SQL OUT bind LOBs
var bind_out_as_str_buf = function (conn, cb) {
  conn.execute(
    "BEGIN lobs_out (:c,:b); END;",
    {
      c:{type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize:50000},
      b:{type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize:50000}
    },
    function (err, result)
    {
      if (err) { console.error(err.message); return cb(err, conn); }
      console.log("Procedure binding LOBs OUT as String and Buffer executed");
      console.log("OUT String length: ", result.outBinds.c.length);
      console.log("OUT Buffer length: ", result.outBinds.b.length);
      return cb(null, conn);
    });
};

// Queries a CLOB and passes it to a PL/SQL procedure as an IN OUT bind
var plsql_inout1 = function (conn, cb) {
  conn.execute(
    "SELECT c FROM mylobs WHERE id = :id",
    { id: 5 },
    function(err, result)
    {
      if (err) {
        console.error(err.message);
        return cb(err, conn);
      }
      if (result.rows.length === 0) {
        console.log("No results");
        return cb(null, conn);
      }
      var lob = result.rows[0][0];
      if (lob === null) {
        console.log("CLOB was NULL");
        return cb(null, conn);
      }
      console.log("Passing the queried CLOB as PL/SQL IN OUT argument");
      conn.execute(
        "BEGIN lob_in_out (:lob); END;",
        [ {val: lob, type: oracledb.CLOB, dir: oracledb.BIND_INOUT} ],
        function(err) {
          if (err) { console.error(err.message);  return cb(err, conn); }
          console.log ("Completed LOB query and insertion using PL/SQL IN OUT LOB bind");
          return cb (null, conn);
        }
      );
    }
  );
};

// Get CLOB as an OUT bind and pass it to the other procedure as IN OUT argument
var plsql_inout2 = function (conn, cb) {
  conn.execute(
    "BEGIN lob_out (:outlob); END;",
    { outlob: {type: oracledb.CLOB, dir: oracledb.BIND_OUT} },
    function(err, result)
    {
      if (err) { console.error(err.message); return cb(err, conn); }

      var lob = result.outBinds.outlob;

      if (lob === null) { console.log("CLOB was NULL"); return cb(null, conn); }

      console.log ("PL/SQL OUT BIND FINISHED");

      conn.execute(
        "BEGIN lob_in_out (:lob); END;",
        [ {val: lob, type: oracledb.CLOB, dir: oracledb.BIND_INOUT} ],
        function(err) {
          if (err) { console.error(err.message); return cb(err, conn); }
          console.log ("Completed LOB fetch from OUT bind and insertion using IN OUT LOB bind");
          return cb (null, conn);
        }
      );
    }
  );
};

async.waterfall(
  [
    doconnect,
    dmlbind,
    bind_in_as_str_buf,
    bind_out_as_str_buf,
    plsql_inout1,
    plsql_inout2
  ],
  function (err, conn) {
    if (err) { console.error("In waterfall error cb: ==>", err, "<=="); }
    if (conn)
      dorelease(conn);
  }
);

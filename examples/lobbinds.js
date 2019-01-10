/* Copyright (c) 2016, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   1) DML bind for an INSERT
 *   2) PL/SQL bind IN for CLOB as String, and BLOB as Buffer
 *   3) PL/SQL bind OUT for CLOB as String, and BLOB as Buffer
 *   4) Querying a LOB and binding using PL/SQL IN OUT bind
 *   5) PL/SQL OUT bind followed by PL/SQL IN OUT bind
 *
 *   Use demo.sql to create the required tables and procedures
 *   Run lobinsert1.js to load text before running this example
 *
 *   This example requires node-oracledb 1.13 or later.
 *
 ******************************************************************************/

var fs = require('fs');
var async = require('async');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var clobOutFileName1 = 'lobbindsout1.txt';
var clobOutFileName2 = 'lobbindsout2.txt';

oracledb.autoCommit = true;  // for ease of demonstration

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

// Cleanup anything other than lobinsert1.js demonstration data
var docleanup = function (conn, cb) {
  conn.execute(
    'DELETE FROM mylobs WHERE id > 2',
    function(err) {
      return cb(err, conn);
    });
};

// 1. SELECTs a CLOB and inserts it back using an IN bind to an INSERT statement
var query_bind_insert = function (conn, cb) {
  console.log ("1. query_bind_insert(): Inserting a CLOB using a LOB IN bind for INSERT");
  conn.execute(
    "SELECT c FROM mylobs WHERE id = :id",
    { id: 1 },
    function(err, result) {
      if (err) {
        return cb(err, conn);
      }
      if (result.rows.length === 0) {
        return cb(new Error('query_bind_insert(): No results.  Did you run lobinsert1.js?'), conn);
      }
      var clob1 = result.rows[0][0];
      if (clob1 === null) {
        return cb(new Error('query_bind_insert(): NULL clob1 found'), conn);
      }

      // Insert the value back as a new row
      conn.execute(
        "INSERT INTO mylobs (id, c) VALUES (:id, :c)",
        { id: 10,
          c: {val: clob1, type: oracledb.CLOB, dir: oracledb.BIND_IN} },
        function(err) {
          if (err) {
            return cb(err, conn);
          }
          clob1.close(function(err) {  // clob1 wasn't streamed, so close it explicitly
            if (err) {
              return cb(err, conn);
            }
            console.log ("   Completed");
            return cb(null, conn);
          });
        });
    });
};

// 2. Show PL/SQL bind IN for CLOB as String and for BLOB as Buffer.
var plsql_in_as_str_buf = function (conn, cb) {
  console.log("2. plsql_in_as_str_buf(): Binding of String and Buffer for PL/SQL IN binds");

  // Make up some data
  var bigStr, bigBuf;
  if (Number(process.version.match(/^v(\d+\.\d+)/)[1]) >= 4) {
    bigStr = 'A'.repeat(50000);
    bigBuf = Buffer.from(bigStr);
  } else {
    bigStr = "A";
    for (var i = 0; i < 15; i++)
      bigStr += bigStr;
    bigBuf = new Buffer(bigStr);
  }

  conn.execute(
    "BEGIN lobs_in(:id, :c, :b); END;",
    { id: 20,
      c: {val: bigStr, type: oracledb.STRING, dir: oracledb.BIND_IN},
      b: {val: bigBuf, type: oracledb.BUFFER, dir: oracledb.BIND_IN} },
    function (err) {
      if (err) {
        return cb(err, conn);
      }
      console.log("   Completed");
      return cb(null, conn);
    });
};

// 3. Gets text and binary strings from database LOBs using PL/SQL OUT binds
var plsql_out_as_str_buf = function (conn, cb) {
  console.log("3. plsql_out_as_str_buf(): Fetching as String and Buffer using PL/SQL OUT binds");
  conn.execute(
    "BEGIN lobs_out(:id, :c, :b); END;",
    { id: 20,
      c: {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 50000},
      b: {type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 50000} },
    function (err /*, result */) {
      if (err) {
        return cb(err, conn);
      }

      // In real life do something with the result.outBinds.c String and the result.outBinds.b Buffer here

      console.log ("   Completed");
      return cb(null, conn);
    });
};

// 4. Queries a CLOB and passes it to a PL/SQL procedure as an IN OUT bind
// Persistent LOBs can be bound to PL/SQL calls as IN OUT.  (Temporary LOBs cannot).
var query_plsql_inout = function (conn, cb) {
  console.log ("4. query_plsql_inout(): Querying then inserting a CLOB using a PL/SQL IN OUT LOB bind");
  conn.execute(
    "SELECT c FROM mylobs WHERE id = :id",
    { id: 1 },
    function(err, result) {
      if (err) {
        return cb(err, conn);
      }
      if (result.rows.length === 0) {
        return cb(new Error('query_plsql_inout(): No results'), conn);
      }
      var clob1 = result.rows[0][0];
      if (clob1 === null) {
        return cb(new Error('query_plsql_inout(): NULL clob1 found'), conn);
      }

      // Note binding clob1 as IN OUT here causes it be autoclosed by execute().
      // The returned Lob clob2 will be autoclosed because it is streamed to completion.
      conn.execute(
        "BEGIN lob_in_out(:idbv, :ciobv); END;",
        { idbv: 30,
          ciobv: {val: clob1, type: oracledb.CLOB, dir: oracledb.BIND_INOUT} },
        function(err, result) {
          if (err) {
            return cb(err, conn);
          }

          var errorHandled = false;

          var clob2 = result.outBinds.ciobv;
          if (clob2 === null) {
            return cb(new Error('plsql_out_inout(): NULL clob2 found'), conn);
          }

          // Stream the LOB to a file
          console.log('   Writing to ' + clobOutFileName1);
          clob2.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
          clob2.on(
            'error',
            function(err) {
              // console.log("clob2.on 'error' event");
              if (!errorHandled) {
                errorHandled = true;
                return cb(err);
              }
            });
          clob2.on(
            'end',
            function() {
              // console.log("clob2.on 'end' event");
            });
          clob2.on(
            'close',
            function() {
              // console.log("clob2.on 'close' event");

              console.log ("   Completed");
              if (!errorHandled) {
                return cb(null, conn);
              }
            });

          var outStream = fs.createWriteStream(clobOutFileName1);
          outStream.on(
            'error',
            function(err) {
              // console.log("outStream.on 'error' event");
              if (!errorHandled) {
                errorHandled = true;
                return cb(err);
              }
            });

          // Switch into flowing mode and push the LOB to the file
          clob2.pipe(outStream);
        });
    });
};

// 5. Get CLOB as a PL/SQL OUT bind and pass it to another procedure as IN OUT.
// Persistent LOBs can be bound to PL/SQL calls as IN OUT.  (Temporary LOBs cannot).
var plsql_out_inout = function (conn, cb) {
  console.log ("5. plsql_out_inout(): Getting a LOB using a PL/SQL OUT bind and inserting it using a PL/SQL IN OUT LOB bind");
  conn.execute(
    "BEGIN lobs_out(:idbv, :cobv, :bobv); END;",
    { idbv: 1,
      cobv: {type: oracledb.CLOB, dir: oracledb.BIND_OUT},
      bobv: {type: oracledb.BLOB, dir: oracledb.BIND_OUT} }, // not used in this demo; it will be NULL anyway
    function(err, result) {
      if (err) {
        return cb(err, conn);
      }

      var clob1 = result.outBinds.cobv;
      if (clob1 === null) {
        return cb(new Error('plsql_out_inout(): NULL clob1 found'), conn);
      }

      // Note binding clob1 as IN OUT here causes it be autoclosed by execute().
      // The returned Lob clob2 will be autoclosed because it is streamed to completion.
      conn.execute(
        "BEGIN lob_in_out(:idbv, :ciobv); END;",
        { idbv: 50,
          ciobv: {val: clob1, type: oracledb.CLOB, dir: oracledb.BIND_INOUT} },
        function(err, result) {
          if (err) {
            return cb(err, conn);
          }

          var errorHandled = false;

          var clob2 = result.outBinds.ciobv;
          if (clob2 === null) {
            return cb(new Error('plsql_out_inout(): NULL clob2 found'), conn);
          }

          // Stream the LOB to a file
          console.log('   Writing to ' + clobOutFileName2);
          clob2.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
          clob2.on(
            'error',
            function(err) {
              // console.log("clob2.on 'error' event");
              if (!errorHandled) {
                errorHandled = true;
                return cb(err);
              }
            });
          clob2.on(
            'end',
            function() {
              // console.log("clob2.on 'end' event");
            });
          clob2.on(
            'close',
            function() {
              // console.log("clob2.on 'close' event");
              if (!errorHandled) {
                console.log ("   Completed");
                return cb(null, conn);
              }
            });

          var outStream = fs.createWriteStream(clobOutFileName2);
          outStream.on(
            'error',
            function(err) {
              // console.log("outStream.on 'error' event");
              if (!errorHandled) {
                errorHandled = true;
                return cb(err);
              }
            });

          // Switch into flowing mode and push the LOB to the file
          clob2.pipe(outStream);
        });
    });
};

/*
// 6. Show the number of open temporary LOBs
var doshowvtemplob = function (conn, cb) {
  console.log('6. Query from V$TEMPORARY_LOBS:');
  conn.execute(
    "SELECT * FROM V$TEMPORARY_LOBS",
    [], { outFormat: oracledb.OBJECT },
    function (err, result) {
      if (err) {
        return cb(err, conn);
      } else {
        console.log(result.rows[0]);
        return cb(null, conn);
      }
    });
};
*/

async.waterfall(
  [
    doconnect,
    docleanup,
    query_bind_insert,
    plsql_in_as_str_buf,
    plsql_out_as_str_buf,
    query_plsql_inout,
    plsql_out_inout,
    // doshowvtemplob  // Show open temporary Lobs, if desired
  ],
  function (err, conn) {
    if (err) {
      console.error("In waterfall error cb: ==>", err, "<==");
    }
    if (conn)
      dorelease(conn);
  });

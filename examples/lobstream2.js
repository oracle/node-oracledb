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
 *   lobstream2.js
 *
 * DESCRIPTION
 *   SELECTs a CLOB, streams it using 'data' events, and then displays it to the screen
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
    "SELECT c FROM mylobs WHERE id = 1",
    function(err, result)
    {
      if (err) {
        return cb(err, conn);
      }
      if (result.rows.length === 0) {
        return cb(new Error("No results.  Did you run lobinsert1.js?"), conn);
      }
      var lob = result.rows[0][0];
      if (lob === null) {
        return cb(new Error("LOB was NULL"), conn);
      }
      return cb(null, conn, lob);
    });
};

// Stream a CLOB and builds up a String piece-by-piece
var  dostream = function(conn, clob, cb) {
  clob.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
  clob.on(
    'error',
    function(err)
    {
      console.log("clob.on 'error' event");
      return cb(err, conn);
    });

  // node-oracledb's lob.pieceSize is the number of bytes retrieved
  // for each readable 'data' event.  The default is lob.chunkSize.
  // The recommendation is for it to be a multiple of chunkSize.
  // clob.pieceSize = 100; // fetch smaller chunks to demonstrate repeated 'data' events

  var myclob = ""; // or myblob = Buffer.alloc(0) for BLOBs
  clob.on(
    'data',
    function(chunk)
    {
      console.log("clob.on 'data' event.  Got %d bytes of data", chunk.length);
      // Build up the string.  For larger LOBs you might want to print or use each chunk separately
      myclob += chunk; // or use Buffer.concat() for BLOBS
    });
  clob.on(
    'end',
    function()
    {
      console.log("clob.on 'end' event");
      console.log(myclob);
    });
  clob.on(
    'close',
    function()
    {
      console.log("clob.on 'close' event");
      return cb(null, conn);
    });
};

// Connect and call the CLOB example
async.waterfall([
  doconnect,
  doquery,
  dostream
],
function (err, conn) {
  if (err) { console.error("In waterfall error cb: ==>", err, "<=="); }
  if (conn)
    dorelease(conn);
});

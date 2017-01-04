/* Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   lobstream1.js
 *
 * DESCRIPTION
 *   SELECTs a CLOB and a BLOB and streams to files.
 *
 *   Use demo.sql to create the required table or do:
 *     DROP TABLE mylobs;
 *     CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);
 *
 *   Run lobinsert1.js to load data before running this example.
 *
 *****************************************************************************/

var fs = require('fs');
var async = require('async');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var conn;
var sql;
var outFileName;

var doconnect = function(cb) {
  oracledb.getConnection(
    {
      user          : dbConfig.user,
      password      : dbConfig.password,
      connectString : dbConfig.connectString
    },
    function(err, connection) {
      if (err)
        return cb(err);
      else {
        conn = connection;
        return cb(null);
      }
    });
};

var dorelease = function() {
  conn.close(function (err) {
    if (err)
      console.error(err.message);
  });
};

// Stream a LOB to a file
var  dostream = function(lob, cb) {
  if (lob.type === oracledb.CLOB) {
    console.log('Writing a CLOB to ' + outFileName);
    lob.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
  } else {
    console.log('Writing a BLOB to ' + outFileName);
  }
  lob.on(
    'error',
    function(err)
    {
      // console.log("lob.on 'error' event");
      return cb(err);
    });
  lob.on(
    'end',
    function()
    {
      // console.log("lob.on 'end' event");
    });
  lob.on(
    'close',
    function()
    {
      // console.log("lob.on 'close' event");
      return cb(null);
    });

  var outStream = fs.createWriteStream(outFileName);
  outStream.on(
    'error',
    function(err)
    {
      // console.log("outStream.on 'error' event");
      return cb(err);
    });

  // Switch into flowing mode and push the LOB to the file
  lob.pipe(outStream);
};

var doquery = function(cb) {
  conn.execute(
    sql,
    function(err, result)
    {
      if (err) {
        return cb(err);
      }
      if (result.rows.length === 0) {
        return cb(new Error("No results.  Did you run lobinsert1.js?"));
      }
      var lob = result.rows[0][0];
      if (lob === null) {
        return cb(new Error("LOB was NULL"));
      }
      return cb(null, lob);
    });
};

// Top level method to query and stream a CLOB
var doclob = function(cb) {
  sql = "SELECT c FROM mylobs WHERE id = 1";
  outFileName = 'clobstream1out.txt';
  async.waterfall([doquery, dostream], cb);
};

// Top level method to query and stream a BLOB
var doblob = function(cb) {
  sql = "SELECT b FROM mylobs WHERE id = 2";
  outFileName = 'blobstream1out.jpg';
  async.waterfall([doquery, dostream], cb);
};

// Main routine
// Connect and call the CLOB and BLOB examples
async.waterfall([
  doconnect,
  doclob,
  doblob
],
function (err) {
  if (err) { console.error("In waterfall error cb: ==>", err, "<=="); }
  if (conn)
    dorelease(conn);
});

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
 *   lobinserttemp.js
 *
 * DESCRIPTION
 *   Creates a 'temporary CLOB', streams data into it from clobexample.txt, and
 *   then INSERTs it into a CLOB column.
 *
 *   You may prefer the method shown in lobinsert2.js, which inserts
 *   directly into the table.
 *
 *   Create clobexample.txt before running this example.
 *   Use demo.sql to create the required schema.
 *
 *   This example requires node-oracledb 1.12 or later.
 *
 *****************************************************************************/

var fs = require('fs');
var async = require('async');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var inFileName = 'clobexample.txt';  // the file with text to be inserted into the database

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

// Cleanup anything other than lobinsert1.js demo data
var docleanup = function (conn, cb) {
  conn.execute(
    'DELETE FROM mylobs WHERE id > 2',
    function(err) {
      return cb(err, conn);
    });
};

var docreatetemplob = function (conn, cb) {
  conn.createLob(oracledb.CLOB, function(err, templob) {
    if (err) {
      return cb(err);
    }
    console.log("Temporary LOB created with createLob()");
    return cb(null, conn, templob);
  });
};

var doloadtemplob = function (conn, templob, cb) {
  console.log('Streaming from the text file into the temporary LOB');

  var errorHandled = false;

  templob.on(
    'close',
    function() {
      console.log("templob.on 'close' event");
    });

  templob.on(
    'error',
    function(err) {
      console.log("templob.on 'error' event");
      if (!errorHandled) {
        errorHandled = true;
        return cb(err);
      }
    });

  templob.on(
    'finish',
    function() {
      console.log("templob.on 'finish' event");
      // The data was loaded into the temporary LOB
      if (!errorHandled) {
        return cb(null, conn, templob);
      }
    });

  console.log('Reading from ' + inFileName);
  var inStream = fs.createReadStream(inFileName);
  inStream.on(
    'error',
    function(err) {
      console.log("inStream.on 'error' event");
      if (!errorHandled) {
        errorHandled = true;
        return cb(err);
      }
    });

  inStream.pipe(templob);  // copies the text to the temporary LOB
};

var doinsert = function (conn, templob, cb) {
  console.log('Inserting the temporary LOB into the database');
  conn.execute(
    "INSERT INTO mylobs (id, c) VALUES (:idbv, :lobbv)",
    { idbv: 3,
      lobbv: templob }, // type and direction are optional for IN binds
    { autoCommit: true },
    function(err, result) {
      if (err) {
        return cb(err);
      }
      console.log("Rows inserted: " + result.rowsAffected);
      return cb(null, conn, templob);
    });
};

// Applications should close LOBs that were created using createLob()
var doclosetemplob = function (conn, templob, cb) {
  console.log('Closing the temporary LOB');
  templob.close(function (err) {
    if (err)
      return cb(err);
    else
      return cb(null, conn);
  });
};

async.waterfall(
  [
    doconnect,
    docleanup,
    docreatetemplob,
    doloadtemplob,
    doinsert,
    doclosetemplob
  ],
  function (err, conn) {
    if (err) {
      console.error("In waterfall error cb: ==>", err, "<==");
    }
    if (conn)
      dorelease(conn);
  });

/* Copyright (c) 2016, 2017, Oracle and/or its affiliates. All rights reserved. */

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
 *   lobtempplsql.js
 *
 * DESCRIPTION
 *   Creates a 'temporary CLOB', streams data into it from clobexample.txt, and
 *   then passes it into a PL/SQL procedure to insert into the database.
 *
 *   Smaller amounts of data can be passed directly to PL/SQL without
 *   needed a temporary LOB.  See lobbinds.js
 *
 *   Create clobexample.txt before running this example.
 *   Use demo.sql to create the required schema.
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
var cleanup = function (conn, cb) {
  conn.execute(
    'DELETE FROM mylobs WHERE id > 2',
    function(err) {
      return cb(err, conn);
    });
};

var createtemplob = function (conn, cb) {
  conn.createLob(oracledb.CLOB, function(err, templob) {
    if (err) {
      return cb(err);
    }
    console.log("Temporary LOB created with createLob()");
    return cb(null, conn, templob);
  });
};

var loadtemplob = function (conn, templob, cb) {
  console.log('Streaming from the text file into the temporary LOB');

  var errorHandled = false;

  templob.on(
    'close',
    function()
    {
      console.log("templob.on 'close' event");
    });

  templob.on(
    'error',
    function(err)
    {
      console.log("templob.on 'error' event");
      if (!errorHandled) {
        errorHandled = true;
        return cb(err);
      }
    });

  templob.on(
    'finish',
    function()
    {
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
    function(err)
    {
      console.log("inStream.on 'error' event");
      if (!errorHandled) {
        errorHandled = true;
        return cb(err);
      }
    });

  inStream.pipe(templob);  // copies the text to the temporary LOB
};

var doinsert = function (conn, templob, cb) {
  console.log('Calling PL/SQL to insert the temporary LOB into the database');
  conn.execute(
    "BEGIN lobs_in(:id, :c, null); END;",
    { id: 3,
      c: templob }, // type and direction are optional for IN binds
    { autoCommit: true },
    function(err)
    {
      if (err) {
        return cb(err);
      }
      console.log("Call completed");
      return cb(null, conn, templob);
    });
};

// Applications should close LOBs that were created using createLob()
var closetemplob = function (conn, templob, cb) {
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
    cleanup,
    createtemplob,
    loadtemplob,
    doinsert,
    closetemplob
  ],
  function (err, conn) {
    if (err) {
      console.error("In waterfall error cb: ==>", err, "<==");
    }
    if (conn)
      dorelease(conn);
  });

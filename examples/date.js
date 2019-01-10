/* Copyright (c) 2015, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   date.js
 *
 * DESCRIPTION
 *   Insert and query DATE and TIMESTAMP columns.
 *
 *   When bound in an INSERT, JavaScript Dates are inserted using
 *   TIMESTAMP WITH LOCAL TIMEZONE.  Similarly for queries, TIMESTAMP
 *   and DATE columns are fetched as TIMESTAMP WITH LOCAL TIMEZONE.
 *
 *****************************************************************************///

// Using a fixed Oracle time zone helps avoid machine and deployment differences
process.env.ORA_SDTZ = 'UTC';

var async = require('async');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

oracledb.outFormat = oracledb.OBJECT;

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

var docleanup = function (conn, cb) {
  conn.execute(
    `BEGIN
       DECLARE
         e_table_exists EXCEPTION;
         PRAGMA EXCEPTION_INIT(e_table_exists, -00942);
       BEGIN
         EXECUTE IMMEDIATE ('DROP TABLE datetest');
       EXCEPTION
         WHEN e_table_exists
         THEN NULL;
       END;
     END;`,
    function(err) {
      return cb(err, conn);
    });
};

var docreate = function(conn, cb) {
  conn.execute(
    `CREATE TABLE datetest(
       timestampcol TIMESTAMP,
       timestamptz TIMESTAMP WITH TIME ZONE,
       timestampltz TIMESTAMP WITH LOCAL TIME ZONE,
       datecol DATE)`,
    function(err) {
      return cb(err, conn);
    });
};

var doalter = function(conn, cb) {
  console.log('Altering session time zone');
  conn.execute(
    "ALTER SESSION SET TIME_ZONE='+5:00'",  // resets ORA_SDTZ value
    function(err) {
      return cb(err, conn);
    });
};

// When bound, JavaScript Dates are inserted using TIMESTAMP WITH LOCAL TIMEZONE
var doinsert = function(conn, cb) {
  var date = new Date();

  console.log("Inserting JavaScript date: " + date);

  conn.execute(
    `INSERT INTO datetest (timestampcol, timestamptz, timestampltz, datecol)
     VALUES (:ts, :tstz, :tsltz, :td)`,
    { ts: date, tstz: date, tsltz: date, td: date },
    function(err, result) {
      if (err)
        return cb(err, conn);

      console.log('Rows inserted: ' + result.rowsAffected );
      return cb(null, conn);
    });
};


// Fetch the dates
var doselect = function(conn, cb) {
  conn.execute(
    `SELECT timestampcol, timestamptz, timestampltz, datecol,
            TO_CHAR(CURRENT_DATE, 'DD-Mon-YYYY HH24:MI') AS CD
     FROM datetest`,
    function(err, result) {
      if (err) {
        return cb(err, conn);
      }

      console.log("Query Results:");
      console.log(result.rows[0]);

      // Show the queried dates are of type Date
      var ts = result.rows[0]['TIMESTAMPCOL'];
      ts.setDate(ts.getDate() + 5);
      console.log("TIMESTAMP manipulation in JavaScript:", ts);

      return cb(null, conn);
    });
};

// Main routine
async.waterfall([
  doconnect,
  docleanup,
  docreate,
  doinsert,

  doselect,
  doalter,
  doselect,

  docleanup
],
function (err, conn) {
  if (err) { console.error("In waterfall error cb: ==>", err, "<=="); }
  if (conn)
    dorelease(conn);
});

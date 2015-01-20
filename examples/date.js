﻿/* Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved. */

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
 *   This demo also shows rollback.
 *
 *****************************************************************************///

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');
var connection;

oracledb.getConnection(
  {
    user          : dbConfig.user,
    password      : dbConfig.password,
    connectString : dbConfig.connectString
  },
  createTable
);

function createTable(err, conn) {
  var script;

  if (err) {
    console.error(err.message);
    return;
  }

  connection = conn;
  script = getCreateTableScript();

  connection.execute(
    script,
    insertTestData
  );
}

function insertTestData(err) {
  var date;

  if (err) {
    console.error(err.message);
    return;
  }

  date = new Date();

  console.log("Inserting JavaScript date: " + date);

  // When bound, JavaScript Dates are inserted using TIMESTAMP WITH LOCAL TIMEZONE
  connection.execute(
    "INSERT INTO datetest (timestampcol, datecol) VALUES (:ts, :td)",
    {
      ts: date,
      td: date
    },
    {isAutoCommit : false},
    selectData
  );
}

function selectData(err, result) {
  if (err) {
    console.error(err.message);
    return;
  }

  console.log("----- Insertion Done --------");
  console.log('rowsAffected = %d', result.rowsAffected);

  connection.execute(
    "SELECT timestampcol, datecol FROM datetest",
    processResults
  );
}

function processResults(err, result) {
  var ts;
  var d;

  if (err) {
    console.error(err.message);
    return;
  }

  console.log("----- Query Results --------");
  console.log(result.rows);

  console.log("----- JavaScript Date Manipulation --------");
  // Show the queried dates are of type Date
  ts = result.rows[0][0];
  ts.setDate(ts.getDate() + 5);
  console.log(ts);

  d = result.rows[0][1];
  d.setDate(d.getDate() - 5);
  console.log(d);

  connection.rollback(releaseConnection); // don't actually commit the new row on exit
}

function releaseConnection(err) {
  if (err) {
    console.error(err.message);
    return;
  }

  console.log("----- Rollback complete --------");
  connection.release(logReleaseError); // close the connection
}

function logReleaseError(err) {
  if (err) {
    console.error(err.message);
    return;
  }
}

function getCreateTableScript() {
  var script =
    "BEGIN " +
    "   DECLARE " +
    "       e_table_exists EXCEPTION; " +
    "       PRAGMA EXCEPTION_INIT(e_table_exists, -00942); " +
    "   BEGIN " +
    "       EXECUTE IMMEDIATE ('DROP TABLE datetest'); " +
    "   EXCEPTION " +
    "       WHEN e_table_exists " +
    "       THEN NULL; " +
    "   END; " +
    "   EXECUTE IMMEDIATE (' " +
    "       CREATE TABLE datetest ( " +
    "           timestampcol TIMESTAMP, " +
    "           datecol DATE " +
    "       )" +
    "   '); " +
    "END; ";

  return script;
}

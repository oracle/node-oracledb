/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   date_timestamp2.js
 *
 * DESCRIPTION
 *   Insert and query DATE and TIMESTAMP columns (one date in winter
 *   and one date in summer) to test Daylight Savings Time (DST) settings.
 *
 *   When bound in an INSERT, JavaScript Dates are inserted using
 *   TIMESTAMP unless explicitly bound as another type.
 *   Similarly for queries, TIMESTAMP and DATE columns are fetched
 *   as TIMESTAMP WITH LOCAL TIMEZONE.
 *
 *****************************************************************************///

'use strict';

Error.stackTraceLimit = 50;

// Using a fixed Oracle time zone helps avoid machine and deployment differences
// process.env.ORA_SDTZ = 'UTC';

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

// This example runs in both node-oracledb Thin and Thick modes.
//
// Optionally run in node-oracledb Thick mode
if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {
  // Thick mode requires Oracle Client or Oracle Instant Client libraries.  On
  // Windows and macOS Intel you can specify the directory containing the
  // libraries at runtime or before Node.js starts.  On other platforms (where
  // Oracle libraries are available) the system library search path must always
  // include the Oracle library path before Node.js starts.  If the search path
  // is not correct, you will get a DPI-1047 error.  See the node-oracledb
  // installation documentation.
  let clientOpts = {};
  if (process.platform === 'win32') {                                   // Windows
    // clientOpts = { libDir: 'C:\\oracle\\instantclient_19_17' };
  } else if (process.platform === 'darwin' && process.arch === 'x64') { // macOS Intel
    clientOpts = { libDir: process.env.HOME + '/Downloads/instantclient_19_8' };
  }
  oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
}

console.log(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function run() {

  let connection;

  try {
    let result, date;

    connection = await oracledb.getConnection(dbConfig);
    console.log('Creating table');
    const stmts = [
      `DROP TABLE no_datetab`,

      `CREATE TABLE no_datetab(
        id NUMBER,
        timestampcol TIMESTAMP,
        timestamptz  TIMESTAMP WITH TIME ZONE,
        timestampltz TIMESTAMP WITH LOCAL TIME ZONE,
        datecol DATE)`
    ];

    for (const s of stmts) {
      try {
        await connection.execute(s);
      } catch (e) {
        if (e.errorNum != 942)
          console.error(e);
      }
    }

    // Convert the fetched timestamp data to reflect
    // the locale time settings of the client
    oracledb.fetchTypeHandler = function(metadata) {
      if (metadata.dbType === oracledb.DB_TYPE_DATE ||
        metadata.dbType === oracledb.DB_TYPE_TIMESTAMP ||
        metadata.dbType === oracledb.DB_TYPE_TIMESTAMP_LTZ ||
        metadata.dbType === oracledb.DB_TYPE_TIMESTAMP_TZ)
        return {converter: (v) => v.toLocaleString() };
    };

    date = new Date(2000, 11, 17); // 17th Dec 2000
    console.log('Inserting JavaScript date: ' + date);
    result = await connection.execute(
      `INSERT INTO no_datetab (id, timestampcol, timestamptz, timestampltz, datecol)
    VALUES (1, :ts, :tstz, :tsltz, :td)`,
      { ts: date, tstz: date, tsltz: date, td: date });
    console.log('Rows inserted: ' + result.rowsAffected);

    date = new Date(2000, 3, 25); // 25th Apr 2000
    console.log('Inserting JavaScript date: ' + date);
    result = await connection.execute(
      `INSERT INTO no_datetab (id, timestampcol, timestamptz, timestampltz, datecol)
        VALUES (2, :ts, :tstz, :tsltz, :td)`,
      { ts: date, tstz: date, tsltz: date, td: date });
    console.log('Rows inserted: ' + result.rowsAffected);

    console.log('Query Results:');
    result = await connection.execute(
      `SELECT id, timestampcol, timestamptz, timestampltz, datecol,
        TO_CHAR(CURRENT_DATE, 'DD-Mon-YYYY HH24:MI') AS CD
        FROM no_datetab
        ORDER BY id`);
    console.log(result.rows);

    console.log('Altering session time zone');
    // await connection.execute(`ALTER SESSION SET TIME_ZONE='+5:00'`);
    await connection.execute(`ALTER SESSION SET TIME_ZONE='America/Chicago'`);  // resets ORA_SDTZ value

    console.log('Query Results:');
    result = await connection.execute(
      `SELECT id, timestampcol, timestamptz, timestampltz, datecol,
        TO_CHAR(CURRENT_DATE, 'DD-Mon-YYYY HH24:MI') AS CD
        FROM no_datetab
        ORDER BY id`);
    console.log(result.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

run();

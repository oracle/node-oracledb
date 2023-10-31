/* Copyright (c) 2019, 2023, Oracle and/or its affiliates. */

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
 *   selectvarray.js
 *
 * DESCRIPTION
 *   Shows inserting and selecting from a VARRAY column
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

// This example runs in both node-oracledb Thin and Thick modes.
//
// Optionally run in node-oracledb Thick mode
if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {

  // Thick mode requires Oracle Client or Oracle Instant Client libraries.
  // On Windows and macOS Intel you can specify the directory containing the
  // libraries at runtime or before Node.js starts.  On other platforms (where
  // Oracle libraries are available) the system library search path must always
  // include the Oracle library path before Node.js starts.  If the search path
  // is not correct, you will get a DPI-1047 error.  See the node-oracledb
  // installation documentation.
  let clientOpts = {};
  // On Windows and macOS Intel platforms, set the environment
  // variable NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
  if (process.platform === 'win32' || (process.platform === 'darwin' && process.arch === 'x64')) {
    clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
  }
  oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
}

console.log(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');

async function run() {
  let connection;

  try {

    connection = await oracledb.getConnection(dbConfig);

    // Setup

    const stmts = [
      `DROP TABLE no_sports`,

      `DROP TYPE teamtype`,

      `DROP TYPE playertype`,

      `CREATE TYPE playertype AS OBJECT (
           shirtnumber  NUMBER,
           name         VARCHAR2(20));`,

      `CREATE TYPE teamtype AS VARRAY(10) OF playertype;`,

      `CREATE TABLE no_sports (sportname VARCHAR2(20), team teamtype)`,
    ];

    for (const s of stmts) {
      try {
        await connection.execute(s);
      } catch (e) {
        if (e.errorNum != 942 && e.errorNum != 4043)
          console.error(e);
      }
    }

    // Get a prototype object representing the VARRAY.
    // Only the top level type needs to be acquired.
    // Use a fully qualified name, where possible.
    const TeamTypeClass = await connection.getDbObjectClass("TEAMTYPE");

    // Insert with explicit constructor

    const hockeyTeam = new TeamTypeClass(
      [
        {SHIRTNUMBER: 11, NAME: 'Elizabeth'},
        {SHIRTNUMBER: 22, NAME: 'Frank'},
      ]
    );

    await connection.execute(
      `INSERT INTO no_sports (sportname, team) VALUES (:sn, :t)`,
      {
        sn: "Hockey",
        t: hockeyTeam
      });

    // Insert with direct bind

    await connection.execute(
      `INSERT INTO no_sports (sportname, team) VALUES (:sn, :t)`,
      {
        sn: "Badminton",
        t: {
          val:
          [
            { SHIRTNUMBER: 10, NAME: 'Alison' },
            { SHIRTNUMBER: 20, NAME: 'Bob' },
            { SHIRTNUMBER: 30, NAME: 'Charlie' },
            { SHIRTNUMBER: 40, NAME: 'Doug' }
          ],
          type: TeamTypeClass // could also use 'type: "TEAMTYPE"'
        }
      });

    // Query the new data back

    const result = await connection.execute(
      `SELECT sportname, team FROM no_sports`,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    );
    for (const row of result.rows) {
      console.log("The " + row.SPORTNAME + " team players are:");
      for (const player of row.TEAM) {
        console.log("  " + player.NAME);
      }
      // console.log(JSON.stringify(row.TEAM));  // can easily stringify
    }

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

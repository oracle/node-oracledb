/* Copyright (c) 2019, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   selectvarray.js
 *
 * DESCRIPTION
 *   Shows inserting and selecting from a VARRAY column
 *
 *   This example requires node-oracledb 4 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

'use strict';

const fs = require('fs');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

// On Windows and macOS, you can specify the directory containing the Oracle
// Client Libraries at runtime, or before Node.js starts.  On other platforms
// the system library search path must always be set before Node.js is started.
// See the node-oracledb installation documentation.
// If the search path is not correct, you will get a DPI-1047 error.
let libPath;
if (process.platform === 'win32') {           // Windows
  libPath = 'C:\\oracle\\instantclient_19_12';
} else if (process.platform === 'darwin') {   // macOS
  libPath = process.env.HOME + '/Downloads/instantclient_19_8';
}
if (libPath && fs.existsSync(libPath)) {
  oracledb.initOracleClient({ libDir: libPath });
}

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

    let result = await connection.execute(
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

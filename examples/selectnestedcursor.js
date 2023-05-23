/* Copyright (c) 2020, 2023, Oracle and/or its affiliates. */

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
 *   selectnestedcursor.js
 *
 * DESCRIPTION
 *   An example of querying nested cursors that shows names of people living in
 *   countries.
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
  if (process.platform === 'win32') {                                   // Windows
    clientOpts = { libDir: 'C:\\oracle\\instantclient_19_17' };
  } else if (process.platform === 'darwin' && process.arch === 'x64') { // macOS Intel
    clientOpts = { libDir: process.env.HOME + '/Downloads/instantclient_19_8' };
  }
  oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
}

async function run() {
  let connection;

  try {

    let sql, binds, options, result;

    connection = await oracledb.getConnection(dbConfig);

    //
    // Create a table
    //

    const stmts = [
      `DROP TABLE no_nc_people`,

      `CREATE TABLE no_nc_people (id NUMBER, name VARCHAR2(20), addresskey NUMBER)`,

      `DROP TABLE no_nc_address`,

      `CREATE TABLE no_nc_address (addresskey NUMBER, country VARCHAR2(20))`
    ];

    for (const s of stmts) {
      try {
        await connection.execute(s);
      } catch (e) {
        if (e.errorNum != 942)
          console.error(e);
      }
    }

    //
    // Insert rows
    //

    sql = `INSERT INTO no_nc_people VALUES (:1, :2, :3)`;

    binds = [
      [101, "Alice",     201 ],
      [102, "Bruce",     203 ],
      [103, "Christine", 203 ],
      [104, "David",     201 ],
      [105, "Erica",     203 ],
      [106, "Frank",     202 ]
    ];

    options = {
      autoCommit: true,
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.STRING, maxSize: 20 },
        { type: oracledb.NUMBER },
      ]
    };

    result = await connection.executeMany(sql, binds, options);

    sql = `INSERT INTO no_nc_address VALUES (:1, :2)`;

    binds = [
      [201, "Austria" ],
      [202, "Brazil" ],
      [203, "Chile" ]
    ];

    options = {
      autoCommit: true,
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.STRING, maxSize: 20 }
      ]
    };

    result = await connection.executeMany(sql, binds, options);

    //
    // For each country, show who lives there
    //

    sql = `SELECT country,
                  CURSOR(SELECT name
                         FROM no_nc_people p
                         WHERE p.addresskey = a.addresskey
                         ORDER by name
                  ) as NC
           FROM no_nc_address a
           ORDER BY country`;

    binds = {};

    options = {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    };

    result = await connection.execute(sql, binds, options);

    console.log("Metadata: ");
    console.dir(result.metaData, { depth: null });
    console.log("Query results: ");
    console.dir(result.rows, {depth: null});

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

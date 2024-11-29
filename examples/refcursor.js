/* Copyright (c) 2015, 2024, Oracle and/or its affiliates. */

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
 *   refcursor.js
 *
 * DESCRIPTION
 *   Shows using a ResultSet to fetch rows from a REF CURSOR using getRows().
 *   Streaming is also possible, see refcursortoquerystream.js
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

// This example runs in both node-oracledb Thin and Thick modes.
//
// Optionally run in node-oracledb Thick mode
if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {

  // Thick mode requires Oracle Client or Oracle Instant Client libraries.
  // On Windows and macOS you can specify the directory containing the
  // libraries at runtime or before Node.js starts.  On other platforms (where
  // Oracle libraries are available) the system library search path must always
  // include the Oracle library path before Node.js starts.  If the search path
  // is not correct, you will get a DPI-1047 error.  See the node-oracledb
  // installation documentation.
  let clientOpts = {};
  // On Windows and macOS platforms, set the environment variable
  // NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
  if (process.platform === 'win32' || process.platform === 'darwin') {
    clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
  }
  oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
}

console.log(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupBf(connection);  // create the demo table

    //
    // Create a PL/SQL procedure
    //

    await connection.execute(
      `CREATE OR REPLACE PROCEDURE no_get_rs (p_maxid IN NUMBER, p_recordset OUT SYS_REFCURSOR)
       AS
       BEGIN
         OPEN p_recordset FOR
           SELECT farmer, weight, ripeness
           FROM   no_banana_farmer
           WHERE  id < p_maxid;
       END;`
    );

    //
    // Fetch rows from a REF CURSOR using one getRows() call.
    //
    // This is useful when the ResultSet is known to contain a small number of rows
    // that will always fit in memory.
    //

    console.log('Single getRows() call:');

    const result = await connection.execute(
      `BEGIN
         no_get_rs(:maxid, :cursor);
       END;`,
      {
        maxid: 3,
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      });

    const resultSet1 = result.outBinds.cursor;

    console.log("Cursor metadata:");
    console.log(resultSet1.metaData);

    const rows1 = await resultSet1.getRows();  // no parameter means get all rows
    console.log(rows1);

    await resultSet1.close();                  // always close the ResultSet

    //
    // Fetch rows from a REF CURSOR using multiple getRows() calls to fetch
    // batches of rows.
    //

    console.log('\nLooping getRows() calls:');

    const result2 = await connection.execute(
      `BEGIN
         OPEN :cursor FOR
           SELECT 'row ' || level
           FROM dual
           CONNECT BY LEVEL <= :nr;
       END;`,
      {
        nr: 23, // number of rows to fetch
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      });

    const resultSet2 = result2.outBinds.cursor;

    // If getRows(numRows) returns:
    //   Zero rows               => the table was empty, or there are no more rows
    //   Fewer than numRows rows => this was the last set of rows to get
    //   Exactly numRows rows    => there may be more rows to fetch

    const numRows = 10;  // number of rows to return from each call to getRows()
    let rows2;
    do {
      rows2 = await resultSet2.getRows(numRows); // get numRows rows at a time
      if (rows2.length > 0) {
        console.log("getRows(): Got " + rows2.length + " rows");
        console.log(rows2);
      }
    } while (rows2.length === numRows);

    await resultSet2.close();                    // always close the ResultSet

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

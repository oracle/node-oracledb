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
 *   insert1.js
 *
 * DESCRIPTION
 *   Creates a table and inserts data.  Shows DDL and DML
 *
 *   To insert many records at a time see em_insert1.js
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

    //
    // Create a table
    //

    const stmts = [
      `DROP TABLE no_tab1`,

      `CREATE TABLE no_tab1 (id NUMBER, name VARCHAR2(20))`
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
    // Show several examples of inserting
    //

    // 'bind by name' syntax
    let result = await connection.execute(
      `INSERT INTO no_tab1 VALUES (:id, :nm)`,
      { id: {val: 1 }, nm: {val: 'Chris'} }
    );
    console.log("Rows inserted: " + result.rowsAffected);  // 1
    console.log("ROWID of new row: " + result.lastRowid);

    // 'bind by position' syntax
    result = await connection.execute(
      `INSERT INTO no_tab1 VALUES (:id, :nm)`,
      [2, 'Alison']
    );
    console.log("Rows inserted: " + result.rowsAffected);  // 1
    console.log("ROWID of new row: " + result.lastRowid);

    result = await connection.execute(
      `UPDATE no_tab1 SET name = :nm`,
      ['Bambi'],
      { autoCommit: true }  // commit once for all DML in the script
    );
    console.log("Rows updated: " + result.rowsAffected); // 2
    console.log("ROWID of final row updated: " + result.lastRowid);  // only gives one

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

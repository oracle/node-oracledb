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
 *   insert2.js
 *
 * DESCRIPTION
 *   Show the auto commit behavior.
 *
 *   By default, node-oracledb does not commit on execute.  The driver also has
 *   commit() and rollback() methods to explicitly control transactions.
 *
 *   Note: regardless of the auto commit mode, any open transaction
 *   will be rolled back when a connection is closed.
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

  let connection1, connection2;

  try {
    connection1 = await oracledb.getConnection(dbConfig);
    connection2 = await oracledb.getConnection(dbConfig);

    let result;

    //
    // Create a table
    //

    const stmts = [
      `DROP TABLE no_tab2`,

      `CREATE TABLE no_tab2 (id NUMBER, name VARCHAR2(20))`
    ];

    for (const s of stmts) {
      try {
        await connection1.execute(s);
      } catch (e) {
        if (e.errorNum != 942)
          console.error(e);
      }
    }

    //
    // Show several examples of inserting
    //

    // Insert with autoCommit enabled
    result = await connection1.execute(
      `INSERT INTO no_tab2 VALUES (:id, :nm)`,
      [1, 'Chris'],  // Bind values
      { autoCommit: true}  // Override the default, non-autocommit behavior
    );
    console.log("Rows inserted: " + result.rowsAffected);  // 1

    // Insert without committing
    result = await connection1.execute(
      `INSERT INTO no_tab2 VALUES (:id, :nm)`,
      [2, 'Alison'],  // Bind values
      // { autoCommit: true},  // Since this isn't set, operations using a second connection won't see this row
    );
    console.log("Rows inserted: " + result.rowsAffected);  // 1

    // A query on the second connection will only show 'Chris' because
    // inserting 'Alison' is not commited by default.  Uncomment the
    // autoCommit option above and you will see both rows
    result = await connection2.execute(
      `SELECT * FROM no_tab2`
    );
    console.log(result.rows);

  } catch (err) {
    console.error(err);
  } finally {
    try {
      if (connection1)
        await connection1.close();
      if (connection2)
        await connection2.close();
    } catch (err) {
      console.error(err);
    }
  }
}

run();

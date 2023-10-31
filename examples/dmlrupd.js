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
 *   dmlrupd.js
 *
 * DESCRIPTION
 *   Example of 'DML Returning' with multiple rows matched.
 *   The ROWIDs of the changed records are returned.  This is how to get
 *   the 'last insert id' of multiple rows.  For a single row, use "lastRowid".
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
    // Setup
    //

    const stmts = [
      `DROP TABLE no_dmlrupdtab`,

      `CREATE TABLE no_dmlrupdtab (id NUMBER, name VARCHAR2(40))`,

      `INSERT INTO no_dmlrupdtab VALUES (1001, 'Venkat')`,

      `INSERT INTO no_dmlrupdtab VALUES (1002, 'Neeharika')`
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
    // Show DML Returning
    //

    // SQL statement.
    // Note bind names cannot be reused in the DML section and the RETURNING section
    const sql =
          `UPDATE no_dmlrupdtab
           SET name = :name
           WHERE id IN (:id1, :id2)
           RETURNING id, ROWID INTO :ids, :rids`;

    const result = await connection.execute(
      sql,
      {
        id1: 1001,
        id2: 1002,
        name: "Chris",
        ids: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        rids: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      },
      { autoCommit: true }
    );

    console.log(result.outBinds);

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

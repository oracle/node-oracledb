/* Copyright (c) 2024, Oracle and/or its affiliates. */

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
 *   plsqlrowtype.js
 *
 * DESCRIPTION
 *   Shows binding of PL/SQL %ROWTYPE
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
  let conn;
  const table = 'STAFF';
  const stmts = [
    `DROP TABLE ${table} PURGE`,

    `CREATE TABLE ${table} (ID NUMBER, NAME VARCHAR2(25), AGE NUMBER(3) INVISIBLE)`,

    `INSERT INTO ${table} VALUES (1, 'ADSA')`,

    `CREATE OR REPLACE PACKAGE FOO_TEST AS
       TYPE  FOO_TMP_ARRAY IS TABLE OF ${table}%ROWTYPE
       INDEX BY BINARY_INTEGER;
       PROCEDURE prGetRecords(out_rec OUT FOO_TEST.FOO_TMP_ARRAY);
     END FOO_TEST;`,

    `CREATE OR REPLACE PACKAGE BODY FOO_TEST IS
       PROCEDURE prGetRecords(out_rec OUT FOO_TEST.FOO_TMP_ARRAY)
       IS
         CURSOR c_${table} IS
         SELECT *
         FROM ${table};
       BEGIN
         OPEN c_${table};
         FETCH c_${table} BULK COLLECT INTO out_rec;
         CLOSE c_${table};
       END prGetRecords;
     END FOO_TEST;`
  ];

  try {
    conn = await oracledb.getConnection(dbConfig);
    for (const s of stmts) {
      try {
        await conn.execute(s);
      } catch (e) {
        if (e.errorNum != 942)
          console.error(e);
      }
    }
    const objClass = await conn.getDbObjectClass("FOO_TEST.FOO_TMP_ARRAY");
    const result = await conn.execute(`CALL FOO_TEST.prGetRecords(:out_rec)`,
      { out_rec: { type: objClass, dir: oracledb.BIND_OUT } });

    for (const val of result.outBinds.out_rec) {
      console.log("\nRow contents:");
      console.log(val);
    }
    console.log("\nColumn Information:");
    console.log(objClass.prototype.elementTypeClass.prototype.attributes);
  } catch (err) {
    if (err.errorNum != 942)
      console.log(err);
  } finally {
    if (conn) {
      await conn.execute(`DROP TABLE ${table} PURGE`);
      await conn.close();
    }
  }
}

run();

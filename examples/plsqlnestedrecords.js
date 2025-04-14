/* Copyright (c) 2025, Oracle and/or its affiliates. */

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
 *   plsqlnestedrecords.js
 *
 * DESCRIPTION
 *   Shows binding of nested PL/SQL RECORDS
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
  let connection;

  try {

    connection = await oracledb.getConnection(dbConfig);

    // Create a PL/SQL package that uses a nested RECORD
    const stmts = [
      `CREATE OR REPLACE PACKAGE pkg_nestedrectest AS
         TYPE udt_Inner IS RECORD (Attr1 NUMBER, Attr2 NUMBER);
         TYPE udt_Outer IS RECORD (Inner1 udt_Inner, Inner2 udt_Inner);
         FUNCTION GetOuter (a_Value1 number, a_Value2 number) return udt_Outer;
       END pkg_nestedrectest;`,

      `CREATE OR REPLACE PACKAGE BODY pkg_nestedrectest AS
         FUNCTION GetOuter (a_Value1 NUMBER, a_Value2 NUMBER) return udt_Outer IS
            t_Outer udt_Outer;
          BEGIN
            t_Outer.Inner1.Attr2 := a_Value1;
            t_Outer.Inner2.Attr2 := a_Value2;
            return t_Outer;
          END;
       END pkg_nestedrectest;`
    ];

    for (const s of stmts) {
      try {
        await connection.execute(s);
      } catch (e) {
        console.error(e);
      }
    }

    // Get the outer record type
    const RecTypeClass = await connection.getDbObjectClass('PKG_NESTEDRECTEST.UDT_OUTER');

    const plsql = `BEGIN
                      :outbv := PKG_NESTEDRECTEST.GETOUTER(:val1, :val2);
                   END;`;
    const options = [[null, null], [1, null], [null, 2], [1, 2]];

    for (const option of options) {
      const binds = {
        val1: option[0],
        val2: option[1],
        outbv: { type: RecTypeClass, dir: oracledb.BIND_OUT }
      };

      const result = await connection.execute(plsql, binds);
      console.log(JSON.stringify(result.outBinds.outbv));
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

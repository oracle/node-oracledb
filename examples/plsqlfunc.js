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
 *   plsqlfunc.js
 *
 * DESCRIPTION
 *   Shows how to call a PL/SQL function.
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

    // Create a PL/SQL stored procedure

    await connection.execute(
      `CREATE OR REPLACE FUNCTION no_func
         (p1_in IN VARCHAR2, p2_in IN VARCHAR2, p3_out OUT NUMBER) RETURN VARCHAR2
       AS
       BEGIN
         p3_out := 123;
         RETURN p1_in || ' ' || p2_in;
       END;`
    );

    // Invoke the PL/SQL function.
    //
    // The equivalent call with PL/SQL named parameter syntax is:
    // `BEGIN
    //    :ret := no_func(p1_in => :p1, p2_in => :p2, p3_out => :p3);
    //  END;`

    const result = await connection.execute(
      `BEGIN
         :ret := no_func(:p1, :p2, :p3);
       END;`,
      {
        p1: 'Chris', // Bind type is determined from the data.  Default direction is BIND_IN.
        p2: 'Jones',
        p3: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        ret: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 40 }
      });

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

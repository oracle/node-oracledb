/* Copyright (c) 2019, 2024, Oracle and/or its affiliates. */

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
 *   impres.js
 *
 * DESCRIPTION
 *   Shows PL/SQL 'Implict Results' returning multiple query results
 *   from PL/SQL code.
 *
 *   This example requires Oracle Database 12c or later.  When using
 *   node-oracledb Thick mode, Oracle Client 12c libraries or later are also
 *   required.
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

  if (oracledb.oracleClientVersion < 1200000000) {
    throw new Error('Implicit Results requires Oracle Client libraries 12c or greater');
  }
}

console.log(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');

oracledb.outFormat =  oracledb.OUT_FORMAT_OBJECT;

async function run() {
  let connection;

  try {

    connection = await oracledb.getConnection(dbConfig);
    if (connection.oracleServerVersion < 1200000000) {
      throw new Error('Implicit Results requires Oracle Database 12c or greater');
    }

    await demoSetup.setupBf(connection);  // create the demo table

    let result, row;

    const plsql = `
      DECLARE
        c1 SYS_REFCURSOR;
        c2 SYS_REFCURSOR;
      BEGIN
        OPEN c1 FOR SELECT weight, ripeness
                    FROM no_banana_farmer;
        DBMS_SQL.RETURN_RESULT(c1);

        OPEN C2 FOR SELECT sum(weight) AS KILOGRAMS
                    FROM no_banana_farmer;
        DBMS_SQL.RETURN_RESULT(c2);
      END;`;

    console.log('1. Implict Results fully fetched at execute:');
    result = await connection.execute(plsql);
    console.log(result.implicitResults);

    console.log();

    console.log('2. Implict Results using node-oracledb ResultSets:');
    result = await connection.execute(plsql, [], { resultSet: true });
    for (const rs of result.implicitResults) {
      console.log(" Implicit Result Set:");
      while ((row = await rs.getRow())) {
        console.log("  ", row);
      }
      console.log();
      await rs.close();
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

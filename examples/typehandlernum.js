/* Copyright (c) 2023, 2024, Oracle and/or its affiliates. */

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
 *   typehandlernum.js
 *
 * DESCRIPTION
 *   Show how a type handler can alter queried numbers
 *    - formating numbers in a locale-specific way.
 *    - altering the conversion between Oracle's decimal format and Node.js's
 *      binary format.
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

// This fetch type handler is called once per column in the SELECT list of
// example 1.  If the metadata name & type tests are satified, then the
// returned converter function is enabled for that column.  Data in this column
// will be processed by the converter function before it is returned to the
// application.

function fth(metaData) {
  if (metaData.name == 'N_COL' && metaData.dbType === oracledb.DB_TYPE_NUMBER) {
    return {converter: formatNumber};
  }
}

// Format numbers using a German display format with "." as the thousands
// separator and "," as the decimal separator
function formatNumber(val) {
  if (val !== null) {
    val = val.toLocaleString('de-DE');
  }
  return val;
}

async function run() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    console.log('1. Creating Table');

    try {
      await connection.execute(`DROP TABLE no_typehandler_tab`);
    } catch (e) {
      if (e.errorNum != 942)
        console.error(e);
    }

    await connection.execute(
      `CREATE TABLE no_typehandler_tab (n_col NUMBER)`);

    const data = 123456.78;
    console.log('2. Inserting number ' + data);

    const inssql = `INSERT INTO no_typehandler_tab (n_col) VALUES (:bv)`;
    await connection.execute(inssql, { bv: data });

    // Example 1

    console.log('3. Selecting a formatted number');

    let result = await connection.execute(
      "select n_col from no_typehandler_tab",
      [],
      { fetchTypeHandler: fth }
    );
    console.log(`   Column ${result.metaData[0].name} is formatted as ${result.rows[0][0]}`);

    // Example 2

    // In Thick mode, the default conversion from Oracle's decimal number
    // format to Node.js's binary format may not be desirable.  For example the
    // number 0.94 may be fetched as 0.9400000000000001.  An alternative is to
    // fetch numbers as strings from the database and then convert to floats in
    // Node.js.  This example shows the type handler in-line in the execute()
    // call.  Thin mode does not need the handler.

    console.log('4. Selecting a number where the default Thick mode decimal-to-binary format conversion may not be desired');

    result = await connection.execute(
      "SELECT 0.94 AS col1, 0.94 AS col2 FROM dual", [], {
        fetchTypeHandler: function(metaData) {
          if (metaData.name == 'COL2' && metaData.dbType == oracledb.DB_TYPE_NUMBER) {
            const converter = (v) => {
              if (v !== null)
                v = parseFloat(v);
              return v;
            };
            return {type: oracledb.DB_TYPE_VARCHAR, converter: converter};
          }
        }
      }
    );

    // In Thick mode, the two values will differ
    console.log(`   Raw number is ${result.rows[0][0]}. Number converted is ${result.rows[0][1]}`);

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

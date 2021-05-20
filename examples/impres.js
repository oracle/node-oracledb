/* Copyright (c) 2019, 2021, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
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
 *   This example requires node-oracledb 4.0 or later, Oracle Database
 *   12c or later, and Oracle Client 12c libraries or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

// On Windows and macOS, you can specify the directory containing the Oracle
// Client Libraries at runtime, or before Node.js starts.  On other platforms
// the system library search path must always be set before Node.js is started.
// See the node-oracledb installation documentation.
// If the search path is not correct, you will get a DPI-1047 error.
if (process.platform === 'win32') { // Windows
  oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_19_11' });
} else if (process.platform === 'darwin') { // macOS
  oracledb.initOracleClient({ libDir: process.env.HOME + '/Downloads/instantclient_19_8' });
}

oracledb.outFormat =  oracledb.OUT_FORMAT_OBJECT;

async function run() {
  let connection;

  try {

    connection = await oracledb.getConnection(dbConfig);

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

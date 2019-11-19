/* Copyright (c) 2015, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   select2.js
 *
 * DESCRIPTION
 *   Executes queries to show array and object output formats.
 *   Gets results directly without using a ResultSet.
 *
 *   This example uses Node 8's async/await syntax.
 *
 ******************************************************************************/

'use strict';

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

// Oracledb properties are applicable to all connections and SQL
// executions.  They can also be set or overridden at the individual
// execute() call level

// fetchArraySize can be adjusted to tune the internal data transfer
// from the Oracle Database to node-oracledb.  The value does not
// affect how, or when, rows are returned by node-oracledb to the
// application.  Buffering is handled internally by node-oracledb.
// Benchmark to choose the optimal size for each application or query.
//
// oracledb.fetchArraySize = 100;  // default value is 100

// This script sets outFormat in the execute() call but it could be set here instead:
//
// oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function run() {

  let connection;

  try {
    // Get a non-pooled connection

    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupBf(connection);  // create the demo table

    // The statement to execute
    const sql =
        `SELECT farmer, picked, ripeness
         FROM no_banana_farmer
         ORDER BY id`;

    let result;

    // Default Array Output Format
    result = await connection.execute(sql);
    console.log("----- Banana Farmers (default ARRAY output format) --------");
    console.log(result.rows);

    // Optional Object Output Format
    result = await connection.execute(
      sql,
      {}, // A bind parameter is needed to disambiguate the following options parameter and avoid ORA-01036
      { outFormat: oracledb.OUT_FORMAT_OBJECT }); // outFormat can be OBJECT or ARRAY.  The default is ARRAY
    console.log("----- Banana Farmers (default OBJECT output format) --------");
    console.log(result.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        // Connections should always be released when not needed
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

run();

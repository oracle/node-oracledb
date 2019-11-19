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
 *   resultset1.js
 *
 * DESCRIPTION
 *   Executes a query and uses a ResultSet to fetch rows with getRow().
 *
 *   This example requires node-oracledb 2.0.15 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

// For getRow(), the fetchArraySize property can be adjusted to tune
// data transfer from the Oracle Database to node-oracledb.  The value
// of fetchArraySize does not affect how, or when, rows are returned
// by node-oracledb to the application.  Buffering is handled by
// internally in node-oracledb.  Benchmark to choose the optimal size
// for each application or query.
//
// oracledb.fetchArraySize = 100;  // default value is 100

async function run() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupBf(connection);  // create the demo table

    const result = await connection.execute(
      `SELECT id, farmer
       FROM no_banana_farmer
       ORDER BY id`,
      [], // no bind variables
      {
        resultSet: true // return a ResultSet (default is false)
      }
    );

    const rs = result.resultSet;
    let row;
    let i = 1;

    while ((row = await rs.getRow())) {
      console.log("getRow(): row " + i++);
      console.log(row);
    }

    // always close the ResultSet
    await rs.close();

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

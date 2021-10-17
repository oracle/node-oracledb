/* Copyright (c) 2015, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   resultset2.js
 *
 * DESCRIPTION
 *   Executes a query and uses a ResultSet to fetch batches of rows
 *   with getRows().  Also shows setting the fetch array size.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const fs = require('fs');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

// On Windows and macOS, you can specify the directory containing the Oracle
// Client Libraries at runtime, or before Node.js starts.  On other platforms
// the system library search path must always be set before Node.js is started.
// See the node-oracledb installation documentation.
// If the search path is not correct, you will get a DPI-1047 error.
let libPath;
if (process.platform === 'win32') {           // Windows
  libPath = 'C:\\oracle\\instantclient_19_12';
} else if (process.platform === 'darwin') {   // macOS
  libPath = process.env.HOME + '/Downloads/instantclient_19_8';
}
if (libPath && fs.existsSync(libPath)) {
  oracledb.initOracleClient({ libDir: libPath });
}

// Number of rows to return from each call to getRows()
const numRows = 2;

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

    // Fetch rows from the ResultSet.
    //
    // If getRows(numRows) returns:
    //   Zero rows               => there were no rows, or are no more rows to return
    //   Fewer than numRows rows => this was the last set of rows to get
    //   Exactly numRows rows    => there may be more rows to fetch

    const rs = result.resultSet;
    let rows;

    do {
      rows = await rs.getRows(numRows); // get numRows rows at a time
      if (rows.length > 0) {
        console.log("getRows(): Got " + rows.length + " rows");
        console.log(rows);
      }
    } while (rows.length === numRows);

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

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
 *   refcursor.js
 *
 * DESCRIPTION
 *   Shows using a ResultSet to fetch rows from a REF CURSOR using getRows().
 *   Streaming is also possible (this is not shown).
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

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupBf(connection);  // create the demo table

    //
    // Create a PL/SQL procedure
    //

    await connection.execute(
      `CREATE OR REPLACE PROCEDURE no_get_rs (p_id IN NUMBER, p_recordset OUT SYS_REFCURSOR)
       AS
       BEGIN
         OPEN p_recordset FOR
           SELECT farmer, weight, ripeness
           FROM   no_banana_farmer
           WHERE  id < p_id;
       END;`
    );

    //
    // Get a REF CURSOR result set
    //

    const result = await connection.execute(
      `BEGIN
         no_get_rs(:id, :cursor);
       END;`,
      {
        id:     3,
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      });

    console.log("Cursor metadata:");
    console.log(result.outBinds.cursor.metaData);

    //
    // Fetch rows from the REF CURSOR.
    //

    const resultSet = result.outBinds.cursor;
    const numRows = 10;  // number of rows to return from each call to getRows()
    let rows;

    // If getRows(numRows) returns:
    //   Zero rows               => there were no rows, or are no more rows to return
    //   Fewer than numRows rows => this was the last set of rows to get
    //   Exactly numRows rows    => there may be more rows to fetch

    do {
      rows = await resultSet.getRows(numRows); // get numRows rows at a time
      if (rows.length > 0) {
        console.log("getRows(): Got " + rows.length + " rows");
        console.log(rows);
      }
    } while (rows.length === numRows);

    // From node-oracledb 5.2, you can alternatively fetch all rows in one call.
    // This is useful when the ResultSet is known to contain a small number of
    // rows that will always fit in memory.
    //
    // rows = await resultSet.getRows();  // no parameter means get all rows
    // console.log(rows);

    // always close the ResultSet
    await resultSet.close();

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

/* Copyright (c) 2016, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   refcursortoquerystream.js
 *
 * DESCRIPTION
 *   Converts a refcursor returned from execute() to a query stream.
 *   This is an alternative means of processing instead of using
 *   resultSet.getRows().
 *
 *   This example requires node-oracledb 1.9 or later.
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

    const result = await connection.execute(
      `BEGIN
         OPEN :cursor FOR
           SELECT id, farmer
           FROM no_banana_farmer
           ORDER BY id;
       END;`,
      {
        cursor: {
          type: oracledb.CURSOR,
          dir: oracledb.BIND_OUT
        }
      }
    );

    const cursor = result.outBinds.cursor;
    const queryStream = cursor.toQueryStream();

    const consumeStream = new Promise((resolve, reject) => {
      queryStream.on('data', function(row) {
        console.log(row);
      });
      queryStream.on('error', reject);
      queryStream.on('end', function() {
        queryStream.destroy(); // free up resources
      });
      queryStream.on('close', resolve);
    });

    await consumeStream;

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

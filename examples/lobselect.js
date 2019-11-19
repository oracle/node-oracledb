/* Copyright (c) 2016, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   lobselect.js
 *
 * DESCRIPTION
 *   SELECTs a CLOB and displays output to the console.
 *   SELECTs a BLOB and writes it to a file.
 *
 *   'Large' LOBs should be streamed as shown in lobstream1.js
 *
 *   This example requires node-oracledb 1.13 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const fs = require('fs');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

const blobOutFileName = 'lobselectout.jpg';  // file to write the BLOB to

// force all queried CLOBs to be returned as Strings
oracledb.fetchAsString = [ oracledb.CLOB ];

// force all queried BLOBs to be returned as Buffers
oracledb.fetchAsBuffer = [ oracledb.BLOB ];

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupLobs(connection, true);  // create the demo table with data

    let result;

    // Fetch a CLOB
    result = await connection.execute(
      `SELECT c FROM no_lobs WHERE id = :idbv`,
      [1]
      // An alternative to oracledb.fetchAsString is to pass execute()
      // options and use fetchInfo on the column:
      //, { fetchInfo: {"C": {type: oracledb.STRING}} }
    );

    if (result.rows.length === 0)
      throw new Error("No row found");

    const clob = result.rows[0][0];
    console.log('The CLOB was: ');
    console.log(clob);


    // Fetch a BLOB
    result = await connection.execute(
      `SELECT b FROM no_lobs WHERE id = :idbv`,
      [2]
      // An alternative to oracledb.fetchAsBuffer is to use fetchInfo on the column:
      // , { fetchInfo: {"B": {type: oracledb.BUFFER}} }
    );

    if (result.rows.length === 0)
      throw new Error("No row found");

    const blob = result.rows[0][0];
    console.log('Writing BLOB to lobselectout.jpg');
    fs.writeFileSync(blobOutFileName, blob);

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

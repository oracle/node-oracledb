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
 *   lobinserttemp.js
 *
 * DESCRIPTION
 *   Creates a 'temporary CLOB', loads clobexample.txt into it, and
 *   then INSERTs it into a CLOB column.
 *
 *   You may prefer the method shown in lobinsert2.js, which inserts
 *   directly into the table.
 *
 *   Create clobexample.txt before running this example.
 *   Use demo.sql to create the required schema.
 *
 *   This example requires node-oracledb 1.12 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

var fs = require('fs');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var inFileName = 'clobexample.txt';  // the file with text to be inserted into the database

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    // Cleanup anything other than lobinsert1.js demo data
    await connection.execute(`DELETE FROM mylobs WHERE id > 2`);

    // Write into a temporary LOB.
    // An alternative would be to stream into it.
    let tempLob = await connection.createLob(oracledb.CLOB);
    const data = fs.readFileSync(inFileName, 'utf8');
    tempLob.write(data);
    tempLob.write("That's all!");
    await tempLob.end();  //  indicate the app has no more data to insert

    const doInsert = new Promise((resolve, reject) => {

      // The 'finish' event is emitted when node-oracledb has
      // processed all data for the Temporary LOB
      tempLob.on('finish', async () => {
        try {
          console.log('Inserting the temporary LOB into the database');
          const result = await connection.execute(
            `INSERT INTO mylobs (id, c) VALUES (:idbv, :lobbv)`,
            {
              idbv: 3,
              lobbv: tempLob
            },
            {
              autoCommit: true
            });
          console.log("Rows inserted: " + result.rowsAffected);

        } catch (err) {
          reject(err);
        } finally {
          if (tempLob) {
            try {
              // Applications should close LOBs that were created using createLob()
              console.log('Closing the temporary LOB');
              await tempLob.close();
              resolve();
            } catch (err) {
              reject(err);
            }
          }
        }
      }); // end 'finish'
    });   // end Promise

    await doInsert;

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

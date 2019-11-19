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
 *   lobtempplsql.js
 *
 * DESCRIPTION
 *   Creates a 'temporary CLOB', streams data into it from clobexample.txt, and
 *   then passes it into a PL/SQL procedure to insert into the database.
 *
 *   Smaller amounts of data can be passed directly to PL/SQL without
 *   needed a temporary LOB.  See lobbinds.js
 *
 *   This example requires node-oracledb 1.12.1 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const fs = require('fs');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

const inFileName = 'clobexample.txt';  // the file with text to be inserted into the database

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupLobs(connection);  // create the demo table

    // Create an empty Temporary Lob
    const tempLob = await connection.createLob(oracledb.CLOB);

    // Helper function for loading data to the Temporary Lob
    const doStream = new Promise((resolve, reject) => {

      let errorHandled = false;

      tempLob.on('close', () => {
        // console.log("templob.on 'close' event");
      });

      tempLob.on('error', (err) => {
        // console.log("templob.on 'error' event");
        if (!errorHandled) {
          errorHandled = true;
          reject(err);
        }
      });

      tempLob.on('finish', () => {
        // console.log("templob.on 'finish' event");
        // The data was loaded into the temporary LOB
        if (!errorHandled) {
          resolve();
        }
      });

      console.log('Reading from ' + inFileName);
      const inStream = fs.createReadStream(inFileName);
      inStream.on('error', (err) => {
        // console.log("inStream.on 'error' event");
        if (!errorHandled) {
          errorHandled = true;
          reject(err);
        }
      });

      inStream.pipe(tempLob);  // copies the text to the temporary LOB
    });

    // Load the data into the Temporary LOB
    await doStream;

    // Call PL/SQL to insert into the DB
    console.log('Calling PL/SQL to insert the temporary LOB into the database');
    await connection.execute(
      `BEGIN
         lobs_in(:id, :c, null);
       END;`,
      {
        id: 3,
        c: tempLob // type and direction are optional for IN binds
      },
      { autoCommit: true }
    );
    console.log("Call completed");

    // Applications should close LOBs that were created using createLob()
    await tempLob.close();

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

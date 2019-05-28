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
 *   lobinsert2.js
 *
 * DESCRIPTION
 *   INSERTs text into a CLOB column using the 'RETURNING INTO' method.
 *
 *   For smaller LOBs you will probably prefer the method shown in lobinsert1.js
 *
 *   Create clobexample.txt before running this example.
 *   Use demo.sql to create the required table or do:
 *     DROP TABLE mylobs;
 *     CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);
 *
 *   This example requires node-oracledb 1.12 or later.
 *
 *****************************************************************************/

var fs = require('fs');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var inFileName = 'clobexample.txt';  // the file with text to be inserted into the database

async function run() {

  let connection;

  try {
    const connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `INSERT INTO mylobs (id, c) VALUES (:id, EMPTY_CLOB()) RETURNING c INTO :lobbv`,
      {
        id: 4,
        lobbv: {type: oracledb.CLOB, dir: oracledb.BIND_OUT}
      },
      { autoCommit: false }  // a transaction needs to span the INSERT and pipe()
    );

    if (result.rowsAffected != 1 || result.outBinds.lobbv.length != 1) {
      throw new Error('Error getting a LOB locator');
    }

    const lob = result.outBinds.lobbv[0];
    if (lob === null) {
      throw new Error('NULL lob found');
    }

    const doStream = new Promise((resolve, reject) => {

      let errorHandled = false;

      lob.on('close', () => {
        // console.log("lob.on 'close' event");
        connection.commit((err) => {
          if (err) {
            if (!errorHandled) {
              errorHandled = true;
              reject(err);
            }
          } else {
            console.log("Text inserted successfully.");
            resolve();
          }
        });
      });
      lob.on('error', (err) => {
        // console.log("lob.on 'error' event");
        if (!errorHandled) {
          errorHandled = true;
          lob.close(() => {
            reject(err);
          });
        }
      });

      console.log('Reading from ' + inFileName);
      var inStream = fs.createReadStream(inFileName);
      inStream.on('error', (err) => {
        // console.log("inStream.on 'error' event");
        if (!errorHandled) {
          errorHandled = true;
          reject(err);
        }
      });

      inStream.pipe(lob);  // copies the text to the LOB
    });

    await doStream;

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

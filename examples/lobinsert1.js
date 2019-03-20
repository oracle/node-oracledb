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
 *   lobinsert1.js
 *
 * DESCRIPTION
 *   Reads text from clobexample.txt and INSERTs it into a CLOB column.
 *   Reads binary data from fuzzydinosaur.jpg and INSERTs it into a BLOB column.
 *   Run lobselect.js to query the inserted data.
 *
 *   "Small" amounts of data can be bound directly for INSERT into LOB
 *   columns.  Larger amounts should be streamed, see lobinssert2.js.
 *   The boundary between 'small' and 'large' depends on how Node.js
 *   and V8 handle large data in memory, and on your streaming and
 *   performance requirements.
 *
 *   Create clobexample.txt and fuzzydinosaur.jpg before running this example.
 *   Use demo.sql to create the required table or do:
 *     DROP TABLE mylobs;
 *     CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);
 *
 *   This example requires node-oracledb 1.12 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const fs = require('fs');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

oracledb.autoCommit = true;  // for ease of demonstration only

const clobInFileName = 'clobexample.txt';    // the file with text to be inserted into the database
const blobInFileName = 'fuzzydinosaur.jpg';  // contains the image to be inserted into the database

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    let result;

    // Clean up the table
    await connection.execute(`DELETE FROM mylobs`);

    // Insert a CLOB
    const str = fs.readFileSync(clobInFileName, 'utf8');
    result = await connection.execute(
      `INSERT INTO mylobs (id, c) VALUES (:id, :c)`,
      { id: 1, c: str });
    if (result.rowsAffected != 1)
      throw new Error('CLOB was not inserted');
    else
      console.log('CLOB inserted from ' + clobInFileName);

    // Insert a BLOB
    const buf = fs.readFileSync(blobInFileName);
    result = await connection.execute(
      `INSERT INTO mylobs (id, b) VALUES (:id, :b)`,
      { id: 2, b: buf });
    if (result.rowsAffected != 1)
      throw new Error('BLOB was not inserted');
    else
      console.log('BLOB inserted from ' + blobInFileName);

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

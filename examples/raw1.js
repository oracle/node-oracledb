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
 *   raw1.js
 *
 * DESCRIPTION
 *   Shows using a Buffer to insert and select a RAW.
 *   Use demo.sql to create the dependencies or do:
 *
 *   DROP TABLE myraw;
 *   CREATE TABLE myraw (r RAW(64));
 *
 *   This example requires node-oracledb 1.2 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const data = [0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x2c, 0x20, 0x4f, 0x72, 0x61, 0x63, 0x6c, 0x65, 0x21];
    const inBuf = Buffer.from(data);
    let result = await connection.execute(
      `INSERT INTO myraw VALUES (:r)`,
      { r : { val: inBuf, type: oracledb.BUFFER, dir:oracledb.BIND_IN }});
    console.log(result.rowsAffected + " row(s) inserted.");

    result = await connection.execute(`SELECT r FROM myraw`);
    const outBuf = result.rows[0];
    console.log("Buffer queried:");
    console.log(outBuf);
    console.log(outBuf.toString('utf8'));

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

/* Copyright (c) 2018, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   calltimeout.js
 *
 * DESCRIPTION
 *   Shows how to time out long running database calls.
 *   See https://oracle.github.io/node-oracledb/doc/api.html#dbcalltimeouts
 *
 *   This example uses Async/Await of Node 8.
 *
 *   This example requires node-oracledb 3 or later.
 *   Node-oracledb must be using Oracle Client 18c libraries, or greater.
 *
 *****************************************************************************/

let oracledb = require("oracledb");
let dbConfig = require('./dbconfig.js');

// "Sleep" in the database for a number of seconds.
// This uses an inefficent sleep implementation instead of
// dbms_lock.sleep() which not all users can use.
const sql = `
  DECLARE
     t DATE := SYSDATE + (:sleepsec * (1/86400));
  BEGIN
    LOOP
      EXIT WHEN t <= SYSDATE;
    END LOOP;
  END;`;

let dboptime = 4; // seconds the DB operation will take
let timeout  = 2; // seconds the application will wait for the DB operation

async function runTest() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);
    connection.callTimeout = timeout * 1000;  // milliseconds
    console.log("Database call timeout set to " + connection.callTimeout / 1000 + " seconds");
    console.log("Executing a " + dboptime + " second DB operation");
    await connection.execute(sql, [dboptime]);
    console.log("DB operation successfully completed");
  } catch (err) {
    if (err.message.startsWith('DPI-1067:') || err.errorNum === 3114)
      console.log('DB operation was stopped after exceeding the call timeout');
    else
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

runTest();

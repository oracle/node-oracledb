/* Copyright (c) 2016, 2020, Oracle and/or its affiliates. All rights reserved. */

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
 *   metadata.js
 *
 * DESCRIPTION
 *   Shows default and extended query column metadata
 *
 *   This example requires node-oracledb 1.10 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupBf(connection);  // create the demo table

    console.log('Default query metadata');
    let result = await connection.execute(
      `SELECT id, farmer, picked
       FROM no_banana_farmer`);
    console.dir(result.metaData, { depth: null });

    console.log('Extended query metadata');
    result = await connection.execute(
      `SELECT id, farmer, picked
       FROM no_banana_farmer`,
      {},                           // no binds
      { extendedMetaData: true });  // enable the extra metadata
    console.dir(result.metaData, { depth: null });

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

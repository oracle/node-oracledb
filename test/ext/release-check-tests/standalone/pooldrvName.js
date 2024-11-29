/* Copyright (c) 2024, Oracle and/or its affiliates. All rights reserved. */

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
 *   pooldrvName.js
 *
 * DESCRIPTION
 *   Executes a basic query to get the CLIENT_DRIVER_NAME from
 *     v$session_connect_info.
 *   Expected result: Array with the right version in below format.
 *        After connection in cb
 *           { outBinds: undefined,
 *             rowsAffected: undefined,
 *             metaData: [ { name: 'CLIENT_DRIVER' } ],
 *             rows:
 *             [ [ 'node-oracledb : 2.0.15' ],
 *               [ 'node-oracledb : 2.0.15' ],
 *               [ 'node-oracledb : 2.0.15' ] ],
 *              resultSet: undefined }
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('../../../dbconfig.js');

oracledb.maxRows = 100;

async function run() {
  // Create a connection pool
  const pool = await oracledb.createPool({
    user: dbConfig.user,
    password: dbConfig.password,
    connectString: dbConfig.connectString,
    poolMax: 10,
    poolMin: 1,
    poolIncrement: 2,
    poolTimeout: 20,
    stmtCacheSize: 25
  });

  console.log("Pool created successfully.");

  // Get a connection from the pool
  const connection = await pool.getConnection();

  console.log("After connection");

  // Execute a query
  const result = await connection.execute(
    "SELECT CLIENT_DRIVER FROM V$SESSION_CONNECT_INFO WHERE sid = SYS_CONTEXT('USERENV', 'SID')"
  );

  console.log(result);

  // Release the connection back to the pool
  await connection.close();
  console.log("Connection released.");


  if (pool) {
    // Terminate the pool
    await pool.close(0);
  }
}

// Run the async function
run();

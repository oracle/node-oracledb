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
 *   endtoend.js
 *
 * DESCRIPTION
 *   Show setting connection metadata for end-to-end tracing and client authorization.
 *   While the script sleeps (keeping the connection open), use SQL*Plus as SYSTEM to execute:
 *      SELECT username, client_identifier, action, module FROM v$session WHERE username IS NOT NULL;
 *   The end-to-end tracing attributes are shown in various other DBA views and in Enterprise Manager.
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

    // These end-to-end tracing attributes are sent to the database on
    // the next 'round trip' i.e. with execute()
    connection.clientId = "Chris";
    connection.module = "End-to-end example";
    connection.action = "Query departments";

    console.log("Use SQL*Plus as SYSTEM to execute the query:");
    console.log("SELECT username, client_identifier, action, module FROM v$session WHERE username = UPPER('" + dbConfig.user +"');");

    // Sleep 10 seconds to keep the connection open.  This allows
    // external queries on V$SESSION to show the connection
    // attributes before the connection is closed.
    await connection.execute(`BEGIN DBMS_SESSION.SLEEP(10); END;`);

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

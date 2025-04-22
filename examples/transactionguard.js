/* Copyright (c) 2025, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   transactionguard.js
 *
 * DESCRIPTION
 * Demonstrates the use of Transaction Guard to verify if a transaction has
 * completed, ensuring that a duplicate transaction is not created or attempted
 * if the application chooses to handle the error. This feature is only
 * available from Oracle Database 12.1 onwards. It follows loosely the OCI
 * sample provided by Oracle in its documentation about OCI and Transaction
 * Guard.
 * Run the following as SYSDBA to set up Transaction Guard and grant the
 * relevant privileges:
 *
 *    grant execute on dbms_app_cont to <username>;
 *
 *    declare
 *        t_Params dbms_service.svc_parameter_array;
 *     begin
 *         t_Params('COMMIT_OUTCOME') := 'true';
 *         t_Params('RETENTION_TIMEOUT') := 604800;
 *         dbms_service.create_service('orcl-tg', 'orcl-tg', t_Params);
 *         dbms_service.start_service('orcl-tg');
 *     end;
 *    /
 *  ORACLEDB_CONNECTSTRING_TG environment variable: Connect String for the
 *    transaction guard enabled Oracle Database.
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');
const readline = require('readline');

const readLineAsync = () => {
  const rl = readline.createInterface({
    input: process.stdin
  });

  return new Promise((resolve) => {
    rl.prompt();
    rl.on('line', (line) => {
      rl.close();
      resolve(line);
    });
  });
};

// This example runs in both node-oracledb Thin and Thick modes.
//
// Optionally run in node-oracledb Thick mode
if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {

  // Thick mode requires Oracle Client or Oracle Instant Client libraries.
  // On Windows and macOS you can specify the directory containing the
  // libraries at runtime or before Node.js starts.  On other platforms (where
  // Oracle libraries are available) the system library search path must always
  // include the Oracle library path before Node.js starts.  If the search path
  // is not correct, you will get a DPI-1047 error.  See the node-oracledb
  // installation documentation.
  let clientOpts = {};
  // On Windows and macOS platforms, set the environment variable
  // NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
  if (process.platform === 'win32' || process.platform === 'darwin') {
    clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
  }
  oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
}

console.log(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');

async function run() {

  let connection, ltxid;

  try {
    // Set the connect string to the TG-enabled database service
    dbConfig.connectString = process.env.ORACLEDB_CONNECTSTRING_TG ?? 'localhost/orcl-tg';

    connection = await oracledb.getConnection(dbConfig);
    const table = 'no_tg_tab';

    await demoSetup.setupTg(connection);  // create the demo table

    await connection.execute(`DELETE FROM ${table} where IntCol = 1`);
    await connection.execute(`INSERT INTO ${table} VALUES (1, null)`);

    try {
      const result = await connection.execute(
        `select unique
          'alter system kill session '''||sid||','||serial#||''';'
          from v$session_connect_info
          where sid = sys_context('USERENV', 'SID')
        `);
      console.log(`Execute this SQL statement as a DBA user in SQL*Plus:\n ${result.rows[0]}`);
    } catch (err) {
      console.error(`As a DBA user in SQL*Plus, use ALTER SYSTEM KILL SESSION
        to terminate the ${dbConfig.user} session now`);
    }

    console.log("\nPress ENTER when complete");
    await readLineAsync();

    ltxid = connection.ltxid;

    try {
      await connection.commit(); // This should fail
      process.exit('Session was not killed. Sample cannot continue.');
    } catch (err) {
      console.log('Session is recoverable:', err.isRecoverable);
      if (!err.isRecoverable) {
        console.log('Session is not recoverable. Terminating.');
        process.exit();
      }
    }

    // const ltxid = connection.ltxid;
    if (!ltxid) {
      console.log('Logical transaction not available. Terminating.');
      process.exit();
    }

  } catch (err) {
    console.error(err);
  } finally {
    // Get a new connection
    const connection2 = await oracledb.getConnection(dbConfig);
    console.log ('ltxid of the transaction:', ltxid.toString('hex'));
    const result = await connection2.execute(
      `BEGIN dbms_app_cont.get_ltxid_outcome(:ltxid, :committed, :completed); END;`,
      { ltxid: ltxid,
        committed: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BOOLEAN },
        completed: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BOOLEAN }
      }
    );
    console.log('Failed transaction commit status:', result.outBinds.committed);
    console.log('Failed transaction completion status:', result.outBinds.completed);
    await connection2.close();
    if (connection)
      await connection.close();
  }
}

run();

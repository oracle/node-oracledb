/* Copyright (c) 2018, 2023, Oracle and/or its affiliates. */

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
 *   cqn1.js
 *
 * DESCRIPTION
 *   Shows query-level Continuous Query Notification, allowing a
 *   method to be invoked when a data set changes.
 *
 *   The user must have been granted CHANGE NOTIFICATION.
 *   See https://node-oracledb.readthedocs.io/en/latest/user_guide/cqn.html
 *
 *   Run this script and then, after the subscription has been created, run
 *   these statements in a SQL*Plus session:
 *      INSERT INTO NO_CQNTABLE VALUES (101);
 *      COMMIT;
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require("oracledb");
const dbConfig = require('./dbconfig.js');

// This example requires node-oracledb Thick mode.
//
// Thick mode requires Oracle Client or Oracle Instant Client libraries.  On
// Windows and macOS Intel you can specify the directory containing the
// libraries at runtime or before Node.js starts.  On other platforms (where
// Oracle libraries are available) the system library search path must always
// include the Oracle library path before Node.js starts.  If the search path
// is not correct, you will get a DPI-1047 error.  See the node-oracledb
// installation documentation.
let clientOpts = {};
if (process.platform === 'win32') {                                   // Windows
  clientOpts = { libDir: 'C:\\oracle\\instantclient_19_17' };
} else if (process.platform === 'darwin' && process.arch === 'x64') { // macOS Intel
  clientOpts = { libDir: process.env.HOME + '/Downloads/instantclient_19_8' };
}
oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode

dbConfig.events = true;  // CQN needs events mode

const interval = setInterval(function() {
  console.log("waiting...");
}, 5000);

function myCallback(message) {
  // message.type is one of the oracledb.SUBSCR_EVENT_TYPE_* values
  console.log("Message type:", message.type);
  if (message.type == oracledb.SUBSCR_EVENT_TYPE_DEREG) {
    clearInterval(interval);
    console.log("Deregistration has taken place...");
    return;
  }
  console.log("Message database name:", message.dbName);
  console.log("Message transaction id:", message.txId);
  console.log("Message queries:");
  for (let i = 0; i < message.queries.length; i++) {
    const query = message.queries[i];
    for (let j = 0; j < query.tables.length; j++) {
      const table = query.tables[j];
      console.log("--> --> Table Name:", table.name);
      // Note table.operation and row.operation are masks of
      // oracledb.CQN_OPCODE_* values
      console.log("--> --> Table Operation:", table.operation);
      if (table.rows) {
        console.log("--> --> Table Rows:");
        for (let k = 0; k < table.rows.length; k++) {
          const row = table.rows[k];
          console.log("--> --> --> Row Rowid:", row.rowid);
          console.log("--> --> --> Row Operation:", row.operation);
          console.log(Array(61).join("-"));
        }
      }
    }
    console.log(Array(61).join("="));
  }
}

const options = {
  callback : myCallback,
  sql: `SELECT * FROM no_cqntable WHERE k > :bv`,
  binds: { bv : 100 },
  timeout: 60,               // stop after 60 seconds
  clientInitiated: true,     // for Oracle Database & Client 19.4 or later
  // ipAddress: '127.0.0.1', // where Node.js runs (when not using clientInitiated)
  // qos flags:
  //    SUBSCR_QOS_QUERY:  generate notifications when rows with k > 100 are changed
  //    SUBSCR_QOS_ROWIDS: return ROWIDs in the notification message
  qos: oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS
};

async function setup(connection) {
  const stmts = [
    `DROP TABLE no_cqntable`,

    `CREATE TABLE no_cqntable (k NUMBER)`
  ];

  for (const s of stmts) {
    try {
      await connection.execute(s);
    } catch (e) {
      if (e.errorNum != 942)
        console.error(e);
    }
  }
}

async function runTest() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await setup(connection);

    await connection.subscribe('mysub', options);

    console.log("Subscription created...");

  } catch (err) {
    console.error(err);
    clearInterval(interval);
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

process
  .once('SIGTERM', function() {
    console.log("\nTerminating");
    process.exit(0);
  })
  .once('SIGINT', function() {
    console.log("\nTerminating");
    process.exit(0);
  });

runTest();

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
 *   cqn2.js
 *
 * DESCRIPTION
 *   Shows object-level Continuous Query Notification (formerly known
 *   as Database Change Notification), allowing a method to be invoked
 *   when an object changes.  Notification are grouped into intervals.
 *
 *   The user must have been granted CHANGE NOTIFICATION.
 *   The node-oracledb host must be resolvable by the database host.
 *
 *   Run this script and when the subscription has been created, run
 *   these statements in a SQL*Plus session:
 *      INSERT INTO NO_CQNTABLE VALUES (1);
 *      COMMIT;
 *
 *   This example requires node-oracledb 2.3 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require("oracledb");
const dbConfig = require('./dbconfig.js');

dbConfig.events = true;  // CQN needs events mode

const interval = setInterval(function() {
  console.log("waiting...");
}, 5000);

function myCallback(message)
{
  // message.type is one of the oracledb.SUBSCR_EVENT_TYPE_* values
  console.log("Message type:", message.type);
  if (message.type == oracledb.SUBSCR_EVENT_TYPE_DEREG) {
    clearInterval(interval);
    console.log("Deregistration has taken place...");
    return;
  }
  console.log("Message database name:", message.dbName);
  console.log("Message transaction id:", message.txId);
  for (let i = 0; i < message.tables.length; i++) {
    const table = message.tables[i];
    console.log("--> Table Name:", table.name);
    // Note table.operation and row.operation are masks of
    // oracledb.CQN_OPCODE_* values
    console.log("--> Table Operation:", table.operation);
    if (table.rows) {
      for (let j = 0; j < table.rows.length; j++) {
        const row = table.rows[j];
        console.log("--> --> Row Rowid:", row.rowid);
        console.log("--> --> Row Operation:", row.operation);
        console.log(Array(61).join("-"));
      }
    }
    console.log(Array(61).join("="));
  }
}

const options = {
  callback : myCallback,
  sql: "SELECT * FROM no_cqntable",
  // ipAddress: '127.0.0.1',
  // Stop after 60 seconds
  timeout : 60,
  // Return ROWIDs in the notification message
  qos : oracledb.SUBSCR_QOS_ROWIDS,
  // Group notifications in batches covering 10 second
  // intervals, and send a summary
  groupingClass : oracledb.SUBSCR_GROUPING_CLASS_TIME,
  groupingValue : 10,
  groupingType  : oracledb.SUBSCR_GROUPING_TYPE_SUMMARY
};

async function setup(connection) {
  const stmts = [
    `DROP TABLE no_cqntable`,

    `CREATE TABLE no_cqntable (k NUMBER)`
  ];

  for (const s of stmts) {
    try {
      await connection.execute(s);
    } catch(e) {
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
  .on('SIGTERM', function() {
    console.log("\nTerminating");
    process.exit(0);
  })
  .on('SIGINT', function() {
    console.log("\nTerminating");
    process.exit(0);
  });

runTest();

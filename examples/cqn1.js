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
 *   cqn1.js
 *
 * DESCRIPTION
 *   Shows query-level Continuous Query Notification, allowing a
 *   method to be invoked when a data set changes.
 *
 *   The user must have been granted CHANGE NOTIFICATION.
 *   The node-oracledb host must be resolvable by the database host.
 *
 *   Run this script and when the subscription has been created, run
 *   these statements in a SQL*Plus session:
 *      INSERT INTO CQNTABLE VALUES (101);
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
  sql: "SELECT * FROM cqntable WHERE k > :bv",
  binds: { bv : 100 },
  timeout : 60, // Stop after 60 seconds
  // SUBSCR_QOS_QUERY: generate notifications when rows with k > 100 are changed
  // SUBSCR_QOS_ROWIDS: Return ROWIDs in the notification message
  qos : oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS
};

async function runTest() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

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

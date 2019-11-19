/* Copyright (c) 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   aqmulti.js
 *
 * DESCRIPTION
 *   Oracle Advanced Queuing (AQ) example passing multiple messages.
 *
 *   Before running this, a queue allowing RAW payloads must be
 *   created, see https://oracle.github.io/node-oracledb/doc/api.html#aqrawexample
 *
 *   This example requires node-oracledb 4 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

const queueName = "DEMO_RAW_QUEUE";

async function enq() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);
    const queue = await connection.getQueue(queueName);
    queue.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE; // Send a message without requiring a commit

    console.log('Enqueuing messages');

    const messages = [
      "Message 1",
      "Message 2",
      {
        expiration: 5,
        payload: "Message 3"
      },
      "Message 4"
    ];
    await queue.enqMany(messages);  // !! Review the enqMany() documentation's caveat before using it !!

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

async function deq() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);
    const queue = await connection.getQueue(queueName);
    queue.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE; // Change the visibility so no explicit commit is required

    console.log('Dequeuing messages');

    const messages = await queue.deqMany(5);  // get at most 5 messages
    console.log("Dequeued " + messages.length + " messages");
    for (const msg of messages) {
      console.log(msg.payload.toString());
    }

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

enq();
deq();

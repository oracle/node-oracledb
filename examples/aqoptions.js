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
 *   aqoptions.js
 *
 * DESCRIPTION
 *   Oracle Advanced Queuing (AQ) example setting options and message attributes.
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
    queue.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE; // Send a message immediately without requiring a commit

    const messageString = 'This is my other message';
    const message = {
      payload: messageString, // the message itself
      expiration: 1           // seconds the message will remain in the queue if not dequeued
    };
    console.log('Enqueuing: ' + messageString);
    await queue.enqOne(message);
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
    Object.assign(
      queue.deqOptions,
      {
        visibility: oracledb.AQ_VISIBILITY_IMMEDIATE, // Change the visibility so no explicit commit is required
        wait: 5                                       // Only wait 5 seconds if there are no messages
      }
    );

    const msg = await queue.deqOne();
    if (msg) {
      console.log('Dequeued:  ' + msg.payload.toString());
    } else {
      console.log('No message to dequeue');
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

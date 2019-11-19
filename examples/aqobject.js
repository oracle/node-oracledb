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
 *   aqobject.js
 *
 * DESCRIPTION
 *   Oracle Advanced Queuing (AQ) example passing an Oracle Database object
 *
 *   Before running this, a queue allowing an Oracle Database object
 *   payload must be created, see
 *   https://oracle.github.io/node-oracledb/doc/api.html#aqobjexample
 *
 *   This example requires node-oracledb 4 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

const queueName = "ADDR_QUEUE";

async function enq() {
  let connection;

  // The message to send.
  // The attributes correspond to the USER_ADDRESS_TYPE fields.
  const addrData = {
    NAME: "scott",
    ADDRESS: "The Kennel"
  };

  try {
    connection = await oracledb.getConnection(dbConfig);
    const queue = await connection.getQueue(queueName, {payloadType: "USER_ADDRESS_TYPE"});
    const message = new queue.payloadTypeClass(addrData);
    console.log('Enqueuing: ', addrData);
    await queue.enqOne(message);
    await connection.commit();
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
    const queue = await connection.getQueue(queueName, {payloadType: "USER_ADDRESS_TYPE"});
    const msg = await queue.deqOne();  // wait for a message
    await connection.commit();
    if (msg) {
      console.log('Dequeued:  ', msg.payload);
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

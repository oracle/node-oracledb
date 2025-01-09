/* Copyright (c) 2019, 2025, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   217. aq1.js
 *
 * DESCRIPTION
 *   Test Oracle Advanced Queueing (AQ).
 *   The test version of examples/aqraw.js and examples/aqoptions.js.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('217. aq1.js', function() {

  let isRunnable = true;
  let conn;
  const AQ_USER = 'NODB_SCHEMA_AQTEST1';
  const AQ_USER_PWD = testsUtil.generateRandomPassword();

  const rawQueueName = "NODB_RAW_QUEUE";
  const RAW_TABLE = 'NODB_RAW_QUEUE_TAB';

  before(async function() {
    if (!dbConfig.test.DBA_PRIVILEGE || oracledb.thin) {
      isRunnable = false;
    }

    if (!isRunnable) {
      this.skip();
    } else {
      await testsUtil.createAQtestUser(AQ_USER, AQ_USER_PWD);
      const credential = {
        user: AQ_USER,
        password: AQ_USER_PWD,
        connectString: dbConfig.connectString
      };
      conn = await oracledb.getConnection(credential);

      const plsql = `
          BEGIN
            DBMS_AQADM.CREATE_QUEUE_TABLE(
              QUEUE_TABLE        =>  '${AQ_USER}.${RAW_TABLE}',
              QUEUE_PAYLOAD_TYPE =>  'RAW'
            );
            DBMS_AQADM.CREATE_QUEUE(
              QUEUE_NAME         =>  '${AQ_USER}.${rawQueueName}',
              QUEUE_TABLE        =>  '${AQ_USER}.${RAW_TABLE}'
            );
            DBMS_AQADM.START_QUEUE(
              QUEUE_NAME         => '${AQ_USER}.${rawQueueName}'
            );
          END;
        `;
      await conn.execute(plsql);
    }

  }); // before()

  after(async function() {
    if (!isRunnable) {
      return;
    } else {
      await conn.close();
      await testsUtil.dropAQtestUser(AQ_USER);
    }
  }); // after()

  it('217.1 examples/aqraw.js', async () => {

    // Enqueue
    const queue1 = await conn.getQueue(rawQueueName);
    const messageString = 'This is my message';
    await queue1.enqOne(messageString);
    await conn.commit();

    // Dequeue
    const queue2 = await conn.getQueue(rawQueueName);
    const msg = await queue2.deqOne();
    await conn.commit();

    assert(msg);
    assert.strictEqual(msg.payload.toString(), messageString);

  }); // 217.1

  it('217.2 examples/aqoptions.js', async () => {
    /* Enqueue */
    const queue1 = await conn.getQueue(rawQueueName);

    // Send a message immediately without requiring a commit
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const messageString = 'This is my other message';
    const message = {
      payload: messageString, // the message itself
      expiration: 10           // seconds the message will remain in the queue if not dequeued
    };
    await queue1.enqOne(message);

    /* Dequeue */
    const queue2 = await conn.getQueue(rawQueueName);
    Object.assign(
      queue2.deqOptions,
      {
        visibility: oracledb.AQ_VISIBILITY_IMMEDIATE, // Change the visibility so that no explicit commit is required
        wait: 25                                       // seconds it will wait if there are no messages
      }
    );
    const msg = await queue2.deqOne();
    if (msg) {
      assert.strictEqual(msg.payload.toString(), messageString);
    }

  }); // 217.2

  it('217.3 examples/aqmulti.js', async () => {

    /* Enqueue */
    const queue1 = await conn.getQueue(rawQueueName);
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const messages1 = [
      "Message 1",
      "Message 2",
      {
        expiration: 10,
        payload: "Message 3"
      },
      "Message 4"
    ];
    await queue1.enqMany(messages1);

    /* Dequeue */
    const queue2 = await conn.getQueue(rawQueueName);
    queue2.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const messages2 = await queue2.deqMany(5);  // get at most 5 messages
    if (messages2) {
      assert.strictEqual(messages2.length, messages1.length);
      assert.strictEqual(messages2[0].payload.toString(), messages1[0]);
      assert.strictEqual(messages2[3].payload.toString(), messages1[3]);
      assert.strictEqual(messages2[2].expiration, 10);
    }
  }); // 217.3

  it('217.4 one message in enqMany/deqMany', async () => {
    /* Enqueue */
    const queue1 = await conn.getQueue(rawQueueName);
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const messages1 = ["Message 1"];

    await queue1.enqMany(messages1);

    /* Dequeue */
    const queue2 = await conn.getQueue(rawQueueName);
    queue2.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const messages2 = await queue2.deqMany(1);
    if (messages2) {
      assert.strictEqual(messages2[0].payload.toString(), messages1[0]);
      assert.strictEqual(messages2.length, messages1.length);
    }
  }); // 217.4

  it('217.5 deqOne on empty queue', async () => {
    const queue2 = await conn.getQueue(rawQueueName);
    queue2.deqOptions.wait = oracledb.AQ_DEQ_NO_WAIT;
    const message = await queue2.deqOne();
    assert.strictEqual(message, undefined);
  }); // 217.5

  it('217.6 deqMany on empty queue', async () => {
    const queue2 = await conn.getQueue(rawQueueName);
    queue2.deqOptions.wait = oracledb.AQ_DEQ_NO_WAIT;
    const messages = await queue2.deqMany(1);
    assert.deepStrictEqual(messages, []);
  }); // 217.6

  it('217.7 get delay property', async () => {
    /* Enqueue */
    const queue1 = await conn.getQueue(rawQueueName);

    // Send a message immediately without requiring a commit
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const messageString = 'This is my other message';
    const message = {
      payload: messageString, // the message itself
      delay: 5 // Delay the message by 5 seconds
    };
    const myMsg = await queue1.enqOne(message);

    /* Dequeue */
    const queue2 = await conn.getQueue(rawQueueName);
    Object.assign(
      queue2.deqOptions,
      {
        visibility: oracledb.AQ_VISIBILITY_IMMEDIATE, // Change the visibility so that no explicit commit is required
      }
    );
    queue2.deqOptions.delay = myMsg.delay;
    const msg = await queue2.deqOne();
    if (msg) {
      assert.strictEqual(msg.payload.toString(), messageString);
    }
  }); // 217.7

  it('217.8 get deliveryMode property', async () => {
    /* Enqueue */
    const queue1 = await conn.getQueue(rawQueueName);

    // Send a message immediately without requiring a commit
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    queue1.enqOptions.deliveryMode = 1; // Delivery mode when enqueuing messages

    const messageString = 'This is my other message';
    const message = {
      payload: messageString // the message itself
    };
    const myMsg = await queue1.enqOne(message);

    // Get the deliveryMode attribute in enqOptions
    assert.strictEqual(queue1.enqOptions.deliveryMode, 1);

    /* Dequeue */
    const queue2 = await conn.getQueue(rawQueueName);
    Object.assign(
      queue2.deqOptions,
      {
        visibility: oracledb.AQ_VISIBILITY_IMMEDIATE, // Change the visibility so that no explicit commit is required
      }
    );
    queue2.deqOptions.deliveryMode = myMsg.deliveryMode;
    const msg = await queue2.deqOne();
    if (msg) {
      assert.strictEqual(msg.payload.toString(), messageString);
    }
  }); // 217.8

  it('217.9 get exceptionQueue property', async () => {
    /* Enqueue */
    const queue1 = await conn.getQueue(rawQueueName);

    // Send a message immediately without requiring a commit
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const messageString = 'This is my other message';
    const message = {
      payload: messageString, // the message itself
      exceptionQueue: "QueueName" // Name of the exception queue defined when the message was enqueued
    };
    const myMsg = await queue1.enqOne(message);

    /* Dequeue */
    const queue2 = await conn.getQueue(rawQueueName);
    Object.assign(
      queue2.deqOptions,
      {
        visibility: oracledb.AQ_VISIBILITY_IMMEDIATE, // Change the visibility so that no explicit commit is required
      }
    );
    queue2.deqOptions.exceptionQueue = myMsg.exceptionQueue;
    const msg = await queue2.deqOne();
    if (msg) {
      assert.strictEqual(msg.payload.toString(), messageString);
    }
  }); // 217.9

  it('217.10 set and get visibility attribute', async () => {
    /* Enqueue */
    const queue1 = await conn.getQueue(rawQueueName);

    // Send a message immediately without requiring a commit
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const messageString = 'This is my other message';
    const message = {
      payload: messageString, // the message itself
    };
    await queue1.enqOne(message);
    assert.strictEqual(queue1.enqOptions.visibility, oracledb.AQ_VISIBILITY_IMMEDIATE);

    /* Dequeue */
    const queue2 = await conn.getQueue(rawQueueName);
    Object.assign(
      queue2.deqOptions,
      {
        visibility: oracledb.AQ_VISIBILITY_IMMEDIATE, // Change the visibility so that no explicit commit is required
      }
    );
    const msg = await queue2.deqOne();
    assert.strictEqual(queue2.deqOptions.visibility, oracledb.AQ_VISIBILITY_IMMEDIATE);
    assert.strictEqual(msg.payload.toString(), messageString);
  }); // 217.10

  it('217.11 get numAttempts attribute', async () => {
    /* Enqueue */
    const queue1 = await conn.getQueue(rawQueueName);

    // Send a message immediately without requiring a commit
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const messageString = 'This is my other message';
    const message = {
      payload: messageString, // the message itself
    };
    await queue1.enqOne(message);

    /* Dequeue */
    const queue2 = await conn.getQueue(rawQueueName);

    /*1st dequeue*/
    let msg = await queue2.deqOne();
    if (msg) {
      assert.strictEqual(msg.payload.toString(), messageString);
    }
    assert.strictEqual(msg.numAttempts, 0); // should be 0

    /*rollback*/
    await conn.rollback();

    /*2nd dequeue attempt*/
    msg = await queue2.deqOne();
    assert.strictEqual(msg.numAttempts, 1); // should be 1
  }); // 217.11

  it('217.12 test priority attribute in enqueue', async () => {
    const q = await conn.getQueue(rawQueueName);
    q.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    q.deqOptions.wait = 0; // Don't wait if queue is empty
    q.deqOptions.mode = oracledb.AQ_DEQ_MODE_REMOVE;

    // Dequeue all remaining messages
    let msg;
    do {
      msg = await q.deqOne();
    } while (msg);

    await conn.commit();

    const queue = await conn.getQueue(rawQueueName);
    queue.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const messages = [
      {
        payload: "High Priority Message",
        priority: 7
      },
      {
        payload: "Low Priority Message",
        priority: 1
      }
    ];

    await queue.enqMany(messages);

    // Dequeue should return high priority message first
    const deqQueue = await conn.getQueue(rawQueueName);
    deqQueue.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const msg1 = await deqQueue.deqOne();
    const msg2 = await deqQueue.deqOne();

    assert.strictEqual(msg1.payload.toString(), "High Priority Message");
    assert.strictEqual(msg2.payload.toString(), "Low Priority Message");
  }); // 217.12

  it('217.13 test correlation', async () => {
    const queue = await conn.getQueue(rawQueueName);
    queue.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const correlationId = "TEST_CORR_001";
    const message = {
      payload: "Correlated Message",
      correlation: correlationId
    };

    await queue.enqOne(message);

    const deqQueue = await conn.getQueue(rawQueueName);
    deqQueue.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    deqQueue.deqOptions.correlation = correlationId;

    const msg = await deqQueue.deqOne();

    // Access correlationId directly from the dequeued message object
    assert.strictEqual(msg.correlation, correlationId);
    assert.strictEqual(msg.payload.toString(), "Correlated Message");
  }); // 217.13

  it('217.14 test message ordering in transaction group', async () => {
    const queue = await conn.getQueue(rawQueueName);
    queue.enqOptions.visibility = oracledb.AQ_VISIBILITY_ON_COMMIT;

    // Enqueue messages in a single transaction
    const messages = [
      "First Message",
      "Second Message",
      "Third Message"
    ];

    await queue.enqMany(messages);
    await conn.commit();

    // Dequeue messages - they should come in the same order
    const deqQueue = await conn.getQueue(rawQueueName);
    deqQueue.deqOptions.visibility = oracledb.AQ_VISIBILITY_ON_COMMIT;

    const msg1 = await deqQueue.deqOne();
    const msg2 = await deqQueue.deqOne();
    const msg3 = await deqQueue.deqOne();
    await conn.commit();

    assert.strictEqual(msg1.payload.toString(), "First Message");
    assert.strictEqual(msg2.payload.toString(), "Second Message");
    assert.strictEqual(msg3.payload.toString(), "Third Message");
  }); // 217.14

  it('217.15 test dequeue with wait timeout', async () => {
    const queue = await conn.getQueue(rawQueueName);
    queue.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    queue.deqOptions.wait = 2; // 2 second timeout

    const startTime = Date.now();
    const msg = await queue.deqOne();
    const endTime = Date.now();

    assert.strictEqual(msg, undefined);
    assert(endTime - startTime >= 2000, "Dequeue should wait for at least 2 seconds");
  }); // 217.15

  it('217.16 test buffer message payload - 32KB', async () => {
    const queue = await conn.getQueue(rawQueueName);
    queue.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    // Create a medium-sized message (32KB)
    const largeMessage = Buffer.alloc(32 * 1024, 'x');
    await queue.enqOne(largeMessage);

    const deqQueue = await conn.getQueue(rawQueueName);
    deqQueue.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const msg = await deqQueue.deqOne();
    assert.strictEqual(msg.payload.length, largeMessage.length);
    assert.strictEqual(msg.payload.toString(), largeMessage.toString());
  }); // 217.16

  it('217.17 test large buffer message payload - 1MB', async function() {
    // 1 MB message does not work in Oracle Databases 19c or earlier
    if (await conn.oracleServerVersion < 2304000000)
      this.skip();

    const queue = await conn.getQueue(rawQueueName);
    queue.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    // Create a large message (1MB)
    const largeMessage = Buffer.alloc(1024 * 1024, 'x');
    await queue.enqOne(largeMessage);

    const deqQueue = await conn.getQueue(rawQueueName);
    deqQueue.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const msg = await deqQueue.deqOne();
    assert.strictEqual(msg.payload.length, largeMessage.length);
    assert.strictEqual(msg.payload.toString(), largeMessage.toString());
  }); // 217.17
});

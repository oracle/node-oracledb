/* Copyright (c) 2024, Oracle and/or its affiliates. */

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
 *   219. aq3.js
 *
 * DESCRIPTION
 *   Test Oracle Advanced Queueing (AQ).
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('219. aq3.js', function() {

  let isRunnable = true;
  let conn;
  const AQ_USER = 'NODB_SCHEMA_AQTEST3';
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

  it('219.1 The read-only property "name" of AqQueue Class', async () => {
    const queue = await conn.getQueue(rawQueueName);

    const t = queue.name;
    assert.strictEqual(t, rawQueueName);
    assert.throws(
      () => {
        queue.name = 'foobar';
      },
      "TypeError: Cannot assign to read only property 'name' of object '#<AqQueue>"
    );
  }); // 219.1

  it.skip('219.2 The read-only property "payloadType"', async () => {
    const queue = await conn.getQueue(rawQueueName);

    const t = queue.payloadType;
    assert.strictEqual(t, oracledb.DB_TYPE_RAW);

    queue.payloadType = oracledb.DB_TYPE_OBJECT;
    console.log(queue);
  }); // 219.2

  it.skip('219.3 The read-only property "payloadTypeName"', async () => {
    const queue = await conn.getQueue(rawQueueName);

    const t = queue.payloadTypeName;
    assert.strictEqual(t, 'RAW');
    queue.payloadTypeName = 'Foobar';
  }); // 219.3

  it('219.4 Negative - Set "maxMessages" argument to be -5', async () => {
    const queue = await conn.getQueue(rawQueueName);

    await assert.rejects(
      async () => {
        await queue.deqMany(-5);
      },
      /NJS-005/
    );
  }); // 219.4

  it('219.5 Negative - Set "maxMessages" argument to be 0', async () => {
    const queue = await conn.getQueue(rawQueueName);

    await assert.rejects(
      async () => {
        await queue.deqMany(0);
      },
      /NJS-005/
    );
  }); // 219.5

  it('219.6 Enqueue a Buffer', async () => {
    // Enqueue
    const queue1 = await conn.getQueue(rawQueueName);
    const messageString = 'This is my message';
    const msgBuf = Buffer.from(messageString, 'utf8');
    await queue1.enqOne(msgBuf);
    await conn.commit();

    // Dequeue
    const queue2 = await conn.getQueue(rawQueueName);
    const msg = await queue2.deqOne();
    await conn.commit();

    assert(msg);
    assert.strictEqual(msg.payload.toString(), messageString);
  }); // 219.6

  it('219.7 enqMany() mixes enqueuing string and buffer', async () => {
    /* Enqueue */
    const queue1 = await conn.getQueue(rawQueueName);

    const messages1 = [
      "Message 1",
      Buffer.from("Messege 2", "utf-8"),
      Buffer.from("Messege 3", "utf-8"),
      "Message 4"
    ];
    await queue1.enqMany(messages1);
    await conn.commit();

    /* Dequeue */
    const queue2 = await conn.getQueue(rawQueueName);

    const messages2 = await queue2.deqMany(5);  // get at most 5 messages
    await conn.commit();
    if (messages2) {
      assert.strictEqual(messages2.length, messages1.length);
      assert.strictEqual(messages2[0].payload.toString(), messages1[0]);
      assert.strictEqual(messages2[1].payload.toString(), messages1[1].toString());
      assert.strictEqual(messages2[2].payload.toString(), messages1[2].toString());
      assert.strictEqual(messages2[3].payload.toString(), messages1[3]);
    }
  }); // 219.7

  it('219.8 Get correlation property in deqOne', async () => {
    /* Enqueue */
    const queue1 = await conn.getQueue(rawQueueName);

    const messages = [
      "Message 1",
      {
        correlation: "someId", // Allows a logical grouping of messages
        payload: "Message 2"
      }
    ];
    const myMsg  = await queue1.enqMany(messages);

    /* Dequeue */
    const queue2 = await conn.getQueue(rawQueueName);

    let msg = await queue2.deqOne();
    assert.strictEqual(msg.payload.toString(), "Message 1");

    queue2.deqOptions.correlation = myMsg[1].correlation;
    msg = await queue2.deqOne();
    assert.strictEqual(msg.payload.toString(), "Message 2");
    assert.strictEqual(queue2.deqOptions.correlation, myMsg[1].correlation);
  }); // 219.8

  it('219.9 Get correlation property in deqOne by specifying same correlation ID', async () => {
    /* Enqueue */
    const queue1 = await conn.getQueue(rawQueueName);

    // Send a message immediately without requiring a commit
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    const messages = [
      "Message 1",
      {
        correlation: "someId",
        payload: "Message 2"
      },
      {
        correlation: "someId",
        payload: "Message 3"
      }
    ];
    const myMsg  = await queue1.enqMany(messages);

    /* Dequeue */
    const queue2 = await conn.getQueue(rawQueueName);

    let msg = await queue2.deqOne();
    assert.strictEqual(msg.payload.toString(), "Message 1");

    queue2.deqOptions.correlation = myMsg[1].correlation;
    msg = await queue2.deqOne();
    assert.strictEqual(msg.payload.toString(), "Message 2");
    assert.strictEqual(queue2.deqOptions.correlation, myMsg[1].correlation);

    queue2.deqOptions.correlation = myMsg[2].correlation;
    msg = await queue2.deqOne();
    assert.strictEqual(msg.payload.toString(), "Message 3");
    assert.strictEqual(queue2.deqOptions.correlation, myMsg[2].correlation);
  }); // 219.9

  it('219.10 Negative - Get correlation property in dequeue by changing correlation ID', async () => {
    /* Enqueue */
    const queue1 = await conn.getQueue(rawQueueName);

    // Send a message immediately without requiring a commit
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    const messages = [
      "Message 1",
      {
        correlation: "someOtherID",
        payload: "Message 2"
      }
    ];
    const myMsg  = await queue1.enqMany(messages);

    /* Dequeue */
    const queue2 = await conn.getQueue(rawQueueName);

    let msg = await queue2.deqOne();
    assert.strictEqual(msg.payload.toString(), "Message 1");

    queue2.deqOptions.correlation = myMsg[1].correlation;

    await assert.rejects(
      async () => await queue2.deqOne(),
      /ORA-25241:/ /*
                    ORA-25241: Cannot change correlation ID
                    from 'someId' to 'two' without FIRST_MESSAGE option
                   */
    );
    queue2.deqOptions.navigation = oracledb.AQ_DEQ_NAV_FIRST_MSG;
    msg = await queue2.deqOne();
    assert.strictEqual(msg.payload.toString(), "Message 2");
    assert.strictEqual(queue2.deqOptions.correlation, myMsg[1].correlation);
  }); // 219.10

  it('219.11 get correlation property in deqMany', async () => {
    /* Enqueue */
    const queue1 = await conn.getQueue(rawQueueName);

    // Send a message immediately without requiring a commit
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const messages = [
      "Message 1",
      {
        correlation: "someOtherID",
        payload: "Message 2"
      },
      {
        correlation: "someOtherID",
        payload: "Message 3"
      },
      "Message 4",
      "Message 5",
      "Message 6",
      {
        correlation: "someOtherID",
        payload: "Message 7"
      }
    ];
    const myMsg  = await queue1.enqMany(messages);

    /* Dequeue */
    const queue2 = await conn.getQueue(rawQueueName);
    /*
      Correlation identifier,
      allows multiple messages queued with a user defined identifier to be dequeued together
    */
    queue2.deqOptions.correlation = myMsg[1].correlation;

    let msg = await queue2.deqMany(4); // get at most 4 messages
    assert.strictEqual(msg.length, 3);
    assert.strictEqual(msg[0].payload.toString(), "Message 2");
    assert.strictEqual(msg[1].payload.toString(), "Message 3");
    assert.strictEqual(msg[2].payload.toString(), "Message 7");

    /* Dequeue remaining messages */
    const queue3 = await conn.getQueue(rawQueueName);
    msg = await queue3.deqMany(4); // get at most 4 messages
    assert.strictEqual(msg.length, 4);
    assert.strictEqual(msg[0].payload.toString(), "Message 1");
    assert.strictEqual(msg[1].payload.toString(), "Message 4");
    assert.strictEqual(msg[2].payload.toString(), "Message 5");
    assert.strictEqual(msg[3].payload.toString(), "Message 6");
    assert.strictEqual(queue2.deqOptions.correlation, myMsg[1].correlation);
  }); // 219.11

  it('219.12 Get priority attribute in deqOne', async () => {
    /* Enqueue */
    const queue1 = await conn.getQueue(rawQueueName);

    const messages = [
      {
        priority: 2, // Priority of the message when it was enqueued
        payload: "Message 1"
      },
      {
        priority: 1, // Priority of the message when it was enqueued
        payload: "Message 2"
      }
    ];
    const myMsg  = await queue1.enqMany(messages);

    /* Dequeue */
    const queue2 = await conn.getQueue(rawQueueName);

    queue2.deqOptions.priority = myMsg[0].priority;
    let msg = await queue2.deqOne();
    assert.strictEqual(msg.payload.toString(), "Message 1");

    queue2.deqOptions.priority = myMsg[1].priority;
    msg = await queue2.deqOne();
    assert.strictEqual(msg.payload.toString(), "Message 2");
  }); // 219.12

  it('219.13 Get state attribute in deqOne', async () => {
    /* Enqueue */
    const queue1 = await conn.getQueue(rawQueueName);

    const messageString = 'This is my test message';
    const message = {
      payload: messageString, // the message itself
    };
    await queue1.enqOne(message);

    /* Dequeue and check state */
    const queue2 = await conn.getQueue(rawQueueName);

    const msg = await queue2.deqOne();
    assert.strictEqual(msg.state, oracledb.AQ_MSG_STATE_READY); // Expect ready state
    assert.strictEqual(msg.payload.toString(), messageString);
  }); // 219.13

  it('219.14 Verify state change on expiration', async () => {
    /* Enqueue with expiration */
    const queue1 = await conn.getQueue(rawQueueName);

    // Send a message immediately without requiring a commit
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const messageString = 'This is an expiring message';
    const message = {
      expiration: 3, // seconds the message will remain in the queue if not dequeued
      payload: messageString, // the message itself
    };
    const options = await queue1.enqOne(message);
    assert.strictEqual(options.state, oracledb.AQ_MSG_STATE_READY);

    await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds (longer than expiration)

    /* Dequeue and check state */
    const queue2 = await conn.getQueue(rawQueueName);
    Object.assign(
      queue2.deqOptions,
      {
        visibility: oracledb.AQ_VISIBILITY_IMMEDIATE, // Change the visibility so no explicit commit is required
        wait: 1                                       // seconds it will wait if there are no messages
      }
    );

    const msg = await queue2.deqOne();
    // Message might have expired (expected behavior).
    assert.strictEqual(msg, undefined);
    assert.strictEqual(queue2.deqOptions.wait, 1);
  }); // 219.14
});

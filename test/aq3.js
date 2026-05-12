/* Copyright (c) 2024, 2026, Oracle and/or its affiliates. */

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
    if (!dbConfig.test.DBA_PRIVILEGE) {
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

  it('219.1 The read-only property "name" of AqQueue Class', async function() {
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

  it('219.2 The read-only property "payloadType"', async function() {
    const queue = await conn.getQueue(rawQueueName);

    const t = queue.payloadType;
    assert.strictEqual(t, oracledb.DB_TYPE_RAW);
    assert.throws(
      () => {
        queue.payloadType = oracledb.DB_TYPE_OBJECT;
      },
      "TypeError: Cannot assign to read only property 'payloadType' of object '#<AqQueue>"
    );
  }); // 219.2

  it('219.3 The read-only property "payloadTypeName"', async function() {
    const queue = await conn.getQueue(rawQueueName);

    const t = queue.payloadTypeName;
    assert.strictEqual(t, 'RAW');
    assert.throws(
      () => {
        queue.payloadTypeName = 'Foobar';
      },
      "TypeError: Cannot assign to read only property 'payloadTypeName' of object '#<AqQueue>"
    );
  }); // 219.3

  it('219.4 Negative - Set "maxMessages" argument to be -5', async function() {
    const queue = await conn.getQueue(rawQueueName);

    await assert.rejects(
      async function() {
        await queue.deqMany(-5);
      },
      /NJS-005/
    );
  }); // 219.4

  it('219.5 Negative - Set "maxMessages" argument to be 0', async function() {
    const queue = await conn.getQueue(rawQueueName);

    await assert.rejects(
      async function() {
        await queue.deqMany(0);
      },
      /NJS-005/
    );
  }); // 219.5

  it('219.6 Enqueue a Buffer', async function() {
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

  it('219.7 enqMany() mixes enqueuing string and buffer', async function() {
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

  it('219.8 Get correlation property in deqOne', async function() {
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

  it('219.9 Get correlation property in deqOne by specifying same correlation ID', async function() {
    // Skipping in Thin mode due to existing server-side issue with visibility
    if (oracledb.thin) this.skip();
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

  it('219.10 Negative - Get correlation property in dequeue by changing correlation ID', async function() {
    // Skipping in Thin mode due to existing server-side issue with visibility
    if (oracledb.thin) this.skip();
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

    await assert.rejects(async () =>
      await queue2.deqOne(),
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

  it('219.11 get correlation property in deqMany', async function() {
    // Skipping in Thin mode due to existing server-side issue with visibility
    if (oracledb.thin) this.skip();
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

  it('219.12 Get priority attribute in deqOne', async function() {
    /* Enqueue */
    const queue1 = await conn.getQueue(rawQueueName);

    const messages = [
      {
        priority: 2,  // Priority of the message when it was enqueued
        payload: "Message 1"
      },
      {
        priority: -2, // Priority of the message when it was enqueued
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

  it('219.13 Get state attribute in deqOne', async function() {
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

  it('219.14 Verify state change on expiration', async function() {
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

  it('219.15 deliveryMode property in enqOptions and deqOptions', async function() {
    /* Enqueue with BUFFERED delivery mode */
    const queue1 = await conn.getQueue(rawQueueName);
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    queue1.enqOptions.deliveryMode = oracledb.AQ_MSG_DELIV_MODE_BUFFERED;

    const messageString = 'Message with buffered delivery mode';
    await queue1.enqOne(messageString);

    // Verify enqOptions deliveryMode
    assert.strictEqual(queue1.enqOptions.deliveryMode, oracledb.AQ_MSG_DELIV_MODE_BUFFERED);

    /* Dequeue with matching delivery mode */
    const queue2 = await conn.getQueue(rawQueueName);
    queue2.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    queue2.deqOptions.deliveryMode = oracledb.AQ_MSG_DELIV_MODE_BUFFERED;

    const msg = await queue2.deqOne();
    assert(msg);
    assert.strictEqual(msg.payload.toString(), messageString);
    assert.strictEqual(msg.deliveryMode, oracledb.AQ_MSG_DELIV_MODE_BUFFERED);
  }); // 219.15

  it('219.16 multiple deliveryMode values', async function() {
    const queue1 = await conn.getQueue(rawQueueName);
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    // PERSISTENT mode
    queue1.enqOptions.deliveryMode = oracledb.AQ_MSG_DELIV_MODE_PERSISTENT;
    await queue1.enqOne('Persistent message');
    assert.strictEqual(queue1.enqOptions.deliveryMode, oracledb.AQ_MSG_DELIV_MODE_PERSISTENT);

    // PERSISTENT_OR_BUFFERED mode
    queue1.enqOptions.deliveryMode = oracledb.AQ_MSG_DELIV_MODE_PERSISTENT_OR_BUFFERED;
    await queue1.enqOne('Persistent or buffered message');
    assert.strictEqual(queue1.enqOptions.deliveryMode, oracledb.AQ_MSG_DELIV_MODE_PERSISTENT_OR_BUFFERED);

    // Dequeue messages
    const queue2 = await conn.getQueue(rawQueueName);
    queue2.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    queue2.deqOptions.deliveryMode = oracledb.AQ_MSG_DELIV_MODE_PERSISTENT_OR_BUFFERED;

    const msg1 = await queue2.deqOne();
    assert(msg1);
    const msg2 = await queue2.deqOne();
    assert(msg2);
  }); // 219.16

  it('219.17 condition property in deqOptions', async function() {
    // Immediate visibility with enqMany is not supported in Thin mode
    if (oracledb.thin) this.skip();

    /* Enqueue messages with different correlations */
    const queue1 = await conn.getQueue(rawQueueName);
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const messages = [
      { payload: "Message 1", correlation: "TYPE_A" },
      { payload: "Message 2", correlation: "TYPE_B" },
      { payload: "Message 3", correlation: "TYPE_A" }
    ];

    await queue1.enqMany(messages);

    /* Dequeue with condition */
    const queue2 = await conn.getQueue(rawQueueName);
    queue2.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    queue2.deqOptions.condition = "tab.user_data IS NOT NULL";

    const msg = await queue2.deqOne();
    assert(msg);
    assert.strictEqual(queue2.deqOptions.condition, "tab.user_data IS NOT NULL");
  }); // 219.17

  it('219.18 navigation property values', async function() {
    // Immediate visibility with enqMany is not supported in Thin mode
    if (oracledb.thin) this.skip();

    // clear any existing messages
    const clearQueue = await conn.getQueue(rawQueueName);
    clearQueue.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    clearQueue.deqOptions.wait = oracledb.AQ_DEQ_NO_WAIT;
    let tempMsg;
    do {
      tempMsg = await clearQueue.deqOne();
    } while (tempMsg);

    const queue1 = await conn.getQueue(rawQueueName);
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    // Enqueue multiple messages
    await queue1.enqMany(["Msg1", "Msg2", "Msg3"]);

    const queue2 = await conn.getQueue(rawQueueName);
    queue2.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    // FIRST_MSG navigation
    queue2.deqOptions.navigation = oracledb.AQ_DEQ_NAV_FIRST_MSG;
    let msg = await queue2.deqOne();
    assert(msg);
    assert.strictEqual(msg.payload.toString(), "Msg1");
    assert.strictEqual(queue2.deqOptions.navigation, oracledb.AQ_DEQ_NAV_FIRST_MSG);

    // NEXT_MSG navigation (default) - continues from current position
    queue2.deqOptions.navigation = oracledb.AQ_DEQ_NAV_NEXT_MSG;
    msg = await queue2.deqOne();
    assert(msg);
    assert.strictEqual(msg.payload.toString(), "Msg2");
    assert.strictEqual(queue2.deqOptions.navigation, oracledb.AQ_DEQ_NAV_NEXT_MSG);
  }); // 219.18

  it('219.19 mode property in deqOptions', async function() {
    const queue1 = await conn.getQueue(rawQueueName);
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    await queue1.enqOne("Test message for mode");

    const queue2 = await conn.getQueue(rawQueueName);
    queue2.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    // BROWSE mode
    queue2.deqOptions.mode = oracledb.AQ_DEQ_MODE_BROWSE;
    let msg = await queue2.deqOne();
    assert(msg);
    assert.strictEqual(queue2.deqOptions.mode, oracledb.AQ_DEQ_MODE_BROWSE);

    queue2.deqOptions.mode = oracledb.AQ_DEQ_MODE_REMOVE;
    msg = await queue2.deqOne();
    assert(msg);
    assert.strictEqual(queue2.deqOptions.mode, oracledb.AQ_DEQ_MODE_REMOVE);
  }); // 219.19

  it('219.20 wait property with different timeout values', async function() {
    const clearQueue = await conn.getQueue(rawQueueName);
    clearQueue.deqOptions.visibility = oracledb.AQ_VISIBILITY_ON_COMMIT;
    clearQueue.deqOptions.wait = oracledb.AQ_DEQ_NO_WAIT;
    let tempMsg;
    do {
      tempMsg = await clearQueue.deqOne();
      if (tempMsg) await conn.commit();
    } while (tempMsg);

    clearQueue.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    do {
      tempMsg = await clearQueue.deqOne();
    } while (tempMsg);

    const queue = await conn.getQueue(rawQueueName);
    queue.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    // test NO_WAIT
    queue.deqOptions.wait = oracledb.AQ_DEQ_NO_WAIT;
    let msg = await queue.deqOne();
    assert.strictEqual(msg, undefined, "Queue should be empty after clearing");
    assert.strictEqual(queue.deqOptions.wait, oracledb.AQ_DEQ_NO_WAIT);

    // test specific timeout
    queue.deqOptions.wait = 2;
    const startTime = Date.now();
    msg = await queue.deqOne();
    const elapsed = Date.now() - startTime;
    assert.strictEqual(msg, undefined);
    assert(elapsed >= 2000);
    assert.strictEqual(queue.deqOptions.wait, 2);
  }); // 219.20

  it('219.21 msgId property after enqueue and in dequeue', async function() {
    const queue1 = await conn.getQueue(rawQueueName);
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const enqMsg = await queue1.enqOne("Test msgId");
    assert(enqMsg.msgId);
    assert(enqMsg.msgId instanceof Buffer);
    assert(enqMsg.msgId.length > 0);

    const queue2 = await conn.getQueue(rawQueueName);
    queue2.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    queue2.deqOptions.msgId = enqMsg.msgId;

    const deqMsg = await queue2.deqOne();
    assert(deqMsg);
    assert(deqMsg.msgId);
    assert(deqMsg.msgId instanceof Buffer);
    assert.deepStrictEqual(deqMsg.msgId, enqMsg.msgId);
  }); // 219.21

  it('219.22 originalMsgId property', async function() {
    const queue1 = await conn.getQueue(rawQueueName);
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const enqMsg = await queue1.enqOne("Test originalMsgId");
    assert(enqMsg.msgId);
    assert(enqMsg.msgId instanceof Buffer);

    if (enqMsg.originalMsgId) {
      assert(enqMsg.originalMsgId instanceof Buffer);
    }

    const queue2 = await conn.getQueue(rawQueueName);
    queue2.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const deqMsg = await queue2.deqOne();
    assert(deqMsg);
    assert(deqMsg.msgId);
    assert(deqMsg.msgId instanceof Buffer);

    if (deqMsg.originalMsgId) {
      assert(deqMsg.originalMsgId instanceof Buffer);
    }
  }); // 219.22

  it('219.23 enqTxnId property', async function() {
    const queue1 = await conn.getQueue(rawQueueName);

    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_ON_COMMIT;

    await queue1.enqOne("Test enqTxnId");
    await conn.commit();

    const queue2 = await conn.getQueue(rawQueueName);
    queue2.deqOptions.visibility = oracledb.AQ_VISIBILITY_ON_COMMIT;

    const msg = await queue2.deqOne();
    await conn.commit();

    assert(msg);
    if (msg.enqTxnId !== null && msg.enqTxnId !== undefined) {
      assert(msg.enqTxnId instanceof Buffer);
    }
  }); // 219.23

  it('219.24 getting and setting all deqOptions properties', async function() {
    const queue = await conn.getQueue(rawQueueName);

    // Test all setters and getters
    queue.deqOptions.condition = "test_condition";
    assert.strictEqual(queue.deqOptions.condition, "test_condition");

    queue.deqOptions.consumerName = "test_consumer";
    assert.strictEqual(queue.deqOptions.consumerName, "test_consumer");

    queue.deqOptions.correlation = "test_correlation";
    assert.strictEqual(queue.deqOptions.correlation, "test_correlation");

    queue.deqOptions.mode = oracledb.AQ_DEQ_MODE_BROWSE;
    assert.strictEqual(queue.deqOptions.mode, oracledb.AQ_DEQ_MODE_BROWSE);

    queue.deqOptions.navigation = oracledb.AQ_DEQ_NAV_FIRST_MSG;
    assert.strictEqual(queue.deqOptions.navigation, oracledb.AQ_DEQ_NAV_FIRST_MSG);

    queue.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    assert.strictEqual(queue.deqOptions.visibility, oracledb.AQ_VISIBILITY_IMMEDIATE);

    queue.deqOptions.wait = 10;
    assert.strictEqual(queue.deqOptions.wait, 10);

    queue.deqOptions.deliveryMode = oracledb.AQ_MSG_DELIV_MODE_BUFFERED;

    assert(queue.deqOptions.deliveryMode !== undefined);

    const testMsgId = Buffer.from([1, 2, 3, 4]);
    queue.deqOptions.msgId = testMsgId;
    assert.deepStrictEqual(queue.deqOptions.msgId, testMsgId);
  }); // 219.24

  it('219.25 getting and setting all enqOptions properties', async function() {
    const queue = await conn.getQueue(rawQueueName);

    // Test all setters and getters
    queue.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    assert.strictEqual(queue.enqOptions.visibility, oracledb.AQ_VISIBILITY_IMMEDIATE);

    queue.enqOptions.deliveryMode = oracledb.AQ_MSG_DELIV_MODE_BUFFERED;
    assert.strictEqual(queue.enqOptions.deliveryMode, oracledb.AQ_MSG_DELIV_MODE_BUFFERED);
  }); // 219.25

  it('219.26 message properties after enqMany', async function() {
    // Skipping in Thin mode due to existing server-side issue with visibility
    if (oracledb.thin) this.skip();

    const queue1 = await conn.getQueue(rawQueueName);
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const messages = [
      { payload: "Msg1", correlation: "corr1", delay: 0, expiration: 100, priority: 1 },
      { payload: "Msg2", correlation: "corr2", delay: 0, expiration: 200, priority: 2 },
      { payload: "Msg3", correlation: "corr3", delay: 0, expiration: 300, priority: 3 }
    ];

    const enqMsgs = await queue1.enqMany(messages);

    // Verify all messages have msgId
    for (let i = 0; i < enqMsgs.length; i++) {
      assert(enqMsgs[i].msgId);
      assert(enqMsgs[i].msgId instanceof Buffer);
    }

    // Dequeue and verify properties
    const queue2 = await conn.getQueue(rawQueueName);
    queue2.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const deqMsgs = await queue2.deqMany(3);
    assert.strictEqual(deqMsgs.length, 3);

    for (let i = 0; i < deqMsgs.length; i++) {
      assert(deqMsgs[i].msgId);
      assert(deqMsgs[i].msgId instanceof Buffer);
      // Correlation should be preserved
      assert(deqMsgs[i].correlation);
      assert(deqMsgs[i].priority !== undefined);
    }
  }); // 219.26

  it('219.27 correlation with special characters', async function() {
    const queue1 = await conn.getQueue(rawQueueName);
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const correlationId = "test_corr_!@#$%^&*()";
    const message = {
      payload: "Test special chars",
      correlation: correlationId
    };

    await queue1.enqOne(message);

    const queue2 = await conn.getQueue(rawQueueName);
    queue2.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    queue2.deqOptions.correlation = correlationId;

    const msg = await queue2.deqOne();
    assert(msg);
    assert.strictEqual(msg.correlation, correlationId);
  }); // 219.27
});

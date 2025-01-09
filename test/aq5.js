/* Copyright (c) 2025, Oracle and/or its affiliates. */

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
 *   281. aq5.js
 *
 * DESCRIPTION
 *   Test Oracle Advanced Queueing (AQ).
 *   The test cases are for subscribe callback function parameter message
 *   to have msgId field
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');
const assert    = require('assert');

// callback for subscribe
function cbSubscribe(message) {
  assert(message.msgId.length > 0);
  assert(message.msgId instanceof Buffer);
}

describe('281. aq5.js', function() {

  let isRunnable = true;

  before(function() {
    if (!dbConfig.test.DBA_PRIVILEGE || oracledb.thin) {
      isRunnable = false;
    }

    if (!isRunnable) {
      this.skip();
    }
  });

  describe('281.1 Basic AQ Subscription and Message Handling', function() {
    let conn;
    let origEvents;

    const AQ_USER = 'NODB_SCHEMA_AQTEST5';
    const AQ_USER_PWD = testsUtil.generateRandomPassword();

    const objQueueName = "NODB_ADDR_QUEUE";
    const objTable = "NODB_TAB_ADDR";

    before(async function() {
      origEvents = oracledb.events;
      oracledb.events = true;
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
            QUEUE_TABLE => '${AQ_USER}.${objTable}',
            QUEUE_PAYLOAD_TYPE => 'RAW'
          );
          DBMS_AQADM.CREATE_QUEUE(
            QUEUE_NAME => '${AQ_USER}.${objQueueName}',
            QUEUE_TABLE => '${AQ_USER}.${objTable}'
          );
          DBMS_AQADM.START_QUEUE(
            QUEUE_NAME => '${AQ_USER}.${objQueueName}'
          );
        END;
      `;

      await conn.execute(plsql);
      await conn.commit();
    }); //before

    after(async function() {
      oracledb.events = origEvents;
      await conn.close();
      await testsUtil.dropAQtestUser(AQ_USER);
    });

    it('281.1.1 subscribe dequeue messages', async () => {
      const options = {
        namespace: oracledb.SUBSCR_NAMESPACE_AQ,
        callback: cbSubscribe,
        timeout: 300
      };

      await conn.subscribe(objQueueName, options);

      // Enqueue
      const queue1 = await conn.getQueue(objQueueName);
      const messageString = 'This is my message';
      await queue1.enqOne(messageString);
      await conn.commit();

      // Dequeue
      const queue2 = await conn.getQueue(objQueueName);
      const msg = await queue2.deqOne();
      await conn.commit();
      assert(msg);

      await conn.unsubscribe(objQueueName);
    }); // 281.1.1
  });

  describe('281.2 Advanced AQ Features and Options', function() {
    let conn;
    let origEvents;

    const AQ_USER = 'NODB_SCHEMA_AQTEST6';
    const AQ_USER_PWD = testsUtil.generateRandomPassword();
    const objQueueName = "NODB_ADDR_QUEUE6";
    const objTable = "NODB_TAB_ADDR6";
    const CONSUMER_NAME = "SUBSCRIBER_1";

    before(async function() {
      origEvents = oracledb.events;
      oracledb.events = true;
      await testsUtil.createAQtestUser(AQ_USER, AQ_USER_PWD);

      const credential = {
        user: AQ_USER,
        password: AQ_USER_PWD,
        connectString: dbConfig.connectString
      };
      conn = await oracledb.getConnection(credential);

      // Create queue table and queue
      const plsql = `
                      BEGIN
                        DBMS_AQADM.CREATE_QUEUE_TABLE(
                          QUEUE_TABLE        => '${AQ_USER}.${objTable}',
                          QUEUE_PAYLOAD_TYPE => 'RAW',
                          MULTIPLE_CONSUMERS => TRUE
                        );
                        DBMS_AQADM.CREATE_QUEUE(
                          QUEUE_NAME        => '${AQ_USER}.${objQueueName}',
                          QUEUE_TABLE       => '${AQ_USER}.${objTable}'
                        );
                        DBMS_AQADM.START_QUEUE(
                          QUEUE_NAME        => '${AQ_USER}.${objQueueName}'
                        );
                        -- Add a subscriber
                        DBMS_AQADM.ADD_SUBSCRIBER(
                          QUEUE_NAME => '${AQ_USER}.${objQueueName}',
                          SUBSCRIBER => SYS.AQ$_AGENT('${CONSUMER_NAME}', NULL, NULL)
                        );
                      END;
                    `;
      await conn.execute(plsql);
      await conn.commit();
    });

    after(async function() {
      oracledb.events = origEvents;
      await conn.close();
      await testsUtil.dropAQtestUser(AQ_USER);
    });

    it('281.2.1 test message order and consumer name', async () => {
      const queue = await conn.getQueue(objQueueName);

      // Test messages with different priorities
      const messages = [
        { payload: "High Priority", priority: 5 },
        { payload: "Normal Priority", priority: 3 },
        { payload: "Low Priority", priority: 1 }
      ];

      await queue.enqMany(messages);
      await conn.commit();

      // Dequeue with consumer name
      const deqQueue = await conn.getQueue(objQueueName);
      deqQueue.deqOptions.consumerName = CONSUMER_NAME;

      // Should receive high priority first
      const msg1 = await deqQueue.deqOne();
      assert.strictEqual(msg1.payload.toString(), "High Priority");

      const msg2 = await deqQueue.deqOne();
      assert.strictEqual(msg2.payload.toString(), "Normal Priority");

      const msg3 = await deqQueue.deqOne();
      assert.strictEqual(msg3.payload.toString(), "Low Priority");

      await conn.commit();
    }); // 281.2.1

    it('281.2.2 test dequeue with timeout', async () => {
      const deqQueue = await conn.getQueue(objQueueName);
      deqQueue.deqOptions.consumerName = CONSUMER_NAME;
      deqQueue.deqOptions.wait = 5; // 5 second timeout

      const startTime = Date.now();
      const msg = await deqQueue.deqOne();
      const endTime = Date.now();

      assert.strictEqual(msg, undefined);
      assert(endTime - startTime >= 5000, "Dequeue should wait for at least 5 seconds");
    }); // 281.2.2

    it('281.2.3 test dequeue with correlation ID', async () => {
      const queue = await conn.getQueue(objQueueName);
      const correlationId = "TEST_CORRELATION_123";

      // Enqueue message with correlation ID
      await queue.enqOne({
        payload: "Correlated Message",
        correlation: correlationId
      });
      await conn.commit();

      // Dequeue with correlation ID
      const deqQueue = await conn.getQueue(objQueueName);
      deqQueue.deqOptions.consumerName = CONSUMER_NAME;
      deqQueue.deqOptions.correlation = correlationId;

      const msg = await deqQueue.deqOne();
      assert(msg);
      assert.strictEqual(msg.correlation, correlationId);
      assert.strictEqual(msg.payload.toString(), "Correlated Message");

      await conn.commit();
    }); // 281.2.3

    it('281.2.4 test visibility option', async () => {
      const queue = await conn.getQueue(objQueueName);
      queue.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

      await queue.enqOne("Immediate Visibility Message");

      // No commit needed due to IMMEDIATE visibility

      const deqQueue = await conn.getQueue(objQueueName);
      deqQueue.deqOptions.consumerName = CONSUMER_NAME;
      deqQueue.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

      const msg = await deqQueue.deqOne();
      assert(msg);
      assert.strictEqual(msg.payload.toString(), "Immediate Visibility Message");
    }); // 281.2.4
  });
});

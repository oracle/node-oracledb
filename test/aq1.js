/* Copyright (c) 2019, 2023, Oracle and/or its affiliates. */

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
      let credential = {
        user:          AQ_USER,
        password:      AQ_USER_PWD,
        connectString: dbConfig.connectString
      };
      conn = await oracledb.getConnection(credential);

      let plsql = `
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
    let queue1 = await conn.getQueue(rawQueueName);

    // Send a message immediately without requiring a commit
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    const messageString = 'This is my other message';
    const message = {
      payload: messageString, // the message itself
      expiration: 10           // seconds the message will remain in the queue if not dequeued
    };
    await queue1.enqOne(message);

    /* Dequeue */
    let queue2 = await conn.getQueue(rawQueueName);
    Object.assign(
      queue2.deqOptions,
      {
        visibility: oracledb.AQ_VISIBILITY_IMMEDIATE, // Change the visibility so no explicit commit is required
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
    let queue1 = await conn.getQueue(rawQueueName);
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
});

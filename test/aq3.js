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
 *   219. aq3.js
 *
 * DESCRIPTION
 *   Test Oracle Advanced Queueing (AQ).
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('219. aq3.js', function() {

  let isRunnable = true;
  let conn;
  const AQ_USER = 'NODB_SCHEMA_AQTEST3';
  const AQ_USER_PWD = testsUtil.generateRandomPassword();

  const rawQueueName = "NODB_RAW_QUEUE";
  const RAW_TABLE = 'NODB_RAW_QUEUE_TAB';

  before(async function() {
    if (!dbconfig.test.DBA_PRIVILEGE) {
      isRunnable = false;
    }

    if (!isRunnable) {
      this.skip();
      return;
    } else {
      try {
        await testsUtil.createAQtestUser(AQ_USER, AQ_USER_PWD);

        let credential = {
          user:          AQ_USER,
          password:      AQ_USER_PWD,
          connectString: dbconfig.connectString
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

      } catch (err) {
        should.not.exist(err);
      }
    }

  }); // before()

  after(async function() {
    if (!isRunnable) {
      return;
    } else {
      try {
        await conn.close();
        await testsUtil.dropAQtestUser(AQ_USER);
      } catch (err) {
        should.not.exist(err);
      }
    }
  }); // after()

  it('219.1 The read-only property "name" of AqQueue Class', async () => {
    try {
      const queue = await conn.getQueue(rawQueueName);

      const t = queue.name;
      should.strictEqual(t, rawQueueName);
      should.throws(
        () => {
          queue.name = 'foobar';
        },
        "TypeError: Cannot assign to read only property 'name' of object '#<AqQueue>"
      );
    } catch (err) {
      should.not.exist(err);
    }
  }); // 219.1

  it.skip('219.2 The read-only property "payloadType"', async () => {
    try {
      const queue = await conn.getQueue(rawQueueName);

      const t = queue.payloadType;
      should.strictEqual(t, oracledb.DB_TYPE_RAW);
      // should.throws(
      //   () => {
      //     queue.payloadType = oracledb.DB_TYPE_OBJECT;
      //   },
      //   "TypeError: Cannot assign to read only property 'payloadType' of object '#<AqQueue>"
      // );
      queue.payloadType = oracledb.DB_TYPE_OBJECT;
      console.log(queue);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 219.2

  it.skip('219.3 The read-only property "payloadTypeName"', async () => {
    try {
      const queue = await conn.getQueue(rawQueueName);

      const t = queue.payloadTypeName;
      should.strictEqual(t, 'RAW');
      queue.payloadTypeName = 'Foobar';
      console.log(queue);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 219.3

  it('219.4 Negative - Set "maxMessages" argument to be -5', async () => {
    try {
      const queue = await conn.getQueue(rawQueueName);

      testsUtil.assertThrowsAsync(
        async () => {
          const messages = await queue.deqMany(-5);
          should.not.exist(messages);
        },
        /NJS-005/
      );

    } catch (err) {
      should.not.exist(err);
    }
  }); // 219.4

  it('219.5 Negative - Set "maxMessages" argument to be 0', async () => {
    try {
      const queue = await conn.getQueue(rawQueueName);

      testsUtil.assertThrowsAsync(
        async () => {
          const messages = await queue.deqMany(0);
          should.not.exist(messages);
        },
        /NJS-005/
      );
    } catch (err) {
      should.not.exist(err);
    }
  }); // 219.5

  it('219.6 Enqueue a Buffer', async () => {
    try {
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

      should.exist(msg);
      should.strictEqual(msg.payload.toString(), messageString);

    } catch (err) {
      should.not.exist(err);
    }
  }); // 219.6

  it('219.7 enqMany() mixes enqueuing string and buffer', async () => {
    try {
      /* Enqueue */
      let queue1 = await conn.getQueue(rawQueueName);

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
        should.strictEqual(messages2.length, messages1.length);
        should.strictEqual(messages2[0].payload.toString(), messages1[0]);
        should.strictEqual(messages2[1].payload.toString(), messages1[1].toString());
        should.strictEqual(messages2[2].payload.toString(), messages1[2].toString());
        should.strictEqual(messages2[3].payload.toString(), messages1[3]);
      }
    } catch (err) {
      should.not.exist(err);
    }
  }); // 219.7

});
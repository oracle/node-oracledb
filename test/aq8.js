/* Copyright (c) 2024, 2025, Oracle and/or its affiliates. */

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
 *   285. aq8.js
 *
 * DESCRIPTION
 *   Test Oracle Advanced Queueing (AQ).
 *   Test cases for fetching items based on the msgid and originalMsgId attributes while dequeuing.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');
const assert    = require('assert');

describe('285. aq8.js', function() {

  let isRunnable = true;
  let conn;
  const AQ_USER = 'NODB_SCHEMA_AQTEST8';
  const AQ_USER_PWD = testsUtil.generateRandomPassword();

  const RAW_TABLE = 'NODB_RAW_QUEUE_TAB';

  before(async function() {
    const prerequisites = await testsUtil.checkPrerequisites(2100000000, 2100000000);
    if (!dbConfig.test.DBA_PRIVILEGE || oracledb.thin || !prerequisites) {
      isRunnable = false;
    }

    if (!isRunnable) this.skip();

    await testsUtil.createAQtestUser(AQ_USER, AQ_USER_PWD);
    const credential = {
      user: AQ_USER,
      password: AQ_USER_PWD,
      connectString: dbConfig.connectString
    };
    conn = await oracledb.getConnection(credential);

  }); // before()

  after(async function() {
    if (!isRunnable) return;
    await conn.close();
    await testsUtil.dropAQtestUser(AQ_USER);

  }); // after()

  describe ('285.1 query by messages, payload as RAW Type', function() {
    const rawQueueName = "NODB_RAW_QUEUE";

    before(async function() {
      const plsql = `
        BEGIN
          DBMS_AQADM.CREATE_QUEUE_TABLE(
            QUEUE_TABLE         => '${AQ_USER}.${RAW_TABLE}',
            QUEUE_PAYLOAD_TYPE  =>  'RAW'
          );
          DBMS_AQADM.CREATE_QUEUE(
            QUEUE_NAME    => '${AQ_USER}.${rawQueueName}',
            QUEUE_TABLE   => '${AQ_USER}.${RAW_TABLE}'
          );
          DBMS_AQADM.START_QUEUE(
            QUEUE_NAME   => '${AQ_USER}.${rawQueueName}'
          );
        END;
      `;
      await conn.execute(plsql);
    }); // before ()

    it('285.1.1 enqOne and deqOne by msgId as string in non-sequential order', async function() {
      let msg;
      const messageString1 = "This is my message 1",
        messageString2 = "This is my message 2",
        messageString3 = "This is my message 3";

      // Enqueue
      const queue1 = await conn.getQueue(rawQueueName);
      const msg1 = await queue1.enqOne(messageString1);
      const msg2 = await queue1.enqOne(messageString2);
      const msg3 = await queue1.enqOne(messageString3);
      await conn.commit ();

      const queue2 = await conn.getQueue(rawQueueName);
      queue2.deqOptions.msgId = msg3.msgId;
      msg = await queue2.deqOne();
      assert(msg.payload.toString(), messageString3);
      assert.deepStrictEqual(queue2.deqOptions.msgId, msg3.msgId);

      queue2.deqOptions.msgId = msg2.msgId;
      msg = await queue2.deqOne ();
      assert(msg.payload.toString(), messageString2);
      assert.deepStrictEqual(queue2.deqOptions.msgId.toString('hex'),
        msg2.msgId.toString('hex'));

      queue2.deqOptions.msgId = msg1.msgId;
      msg = await queue2.deqOne();
      assert(msg.payload.toString(), messageString1);
      assert.deepStrictEqual(queue2.deqOptions.msgId.toString('hex'),
        msg1.msgId.toString('hex'));
    }); // 285.1.1

    it('285.1.2 query by msgId in enqMany and deqOne in non-sequential order', async function() {
      const queue1 = await conn.getQueue(rawQueueName);
      queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

      const messages1 = [
        "This is my message 1",
        "This is my message 2",
        {
          expiration: 10,
          payload: "This is my message 3"
        },
        "This is my message 4"
      ];

      const messages = await queue1.enqMany(messages1);

      /*Dequeue*/
      const queue2 = await conn.getQueue(rawQueueName);
      queue2.deqOptions.msgId = messages[3].msgId;
      let msg = await queue2.deqOne();
      assert(msg.payload.toString(), "This is my message 4");
      assert.deepStrictEqual(queue2.deqOptions.msgId.toString('hex'),
        messages[3].msgId.toString('hex'));

      queue2.deqOptions.msgId = messages[2].msgId;
      msg = await queue2.deqOne();
      assert(msg.payload.toString(), "This is my message 3");
      assert.deepStrictEqual(queue2.deqOptions.msgId.toString('hex'),
        messages[2].msgId.toString('hex'));

      queue2.deqOptions.msgId = messages[1].msgId;
      msg = await queue2.deqOne();
      assert(msg.payload.toString(), "This is my message 2");
      assert.deepStrictEqual(queue2.deqOptions.msgId.toString('hex'),
        messages[1].msgId.toString('hex'));

      queue2.deqOptions.msgId = messages[0].msgId;
      msg = await queue2.deqOne();
      assert(msg.payload.toString(), "This is my message 1");
      assert.deepStrictEqual(queue2.deqOptions.msgId.toString('hex'),
        messages[0].msgId.toString('hex'));
    }); // 285.1.2

    it('285.1.3 enqOne and deqOne by msgId as string in random order', async function() {
      let msg;
      const messageString1 = "This is my message 1",
        messageString2 = "This is my message 2",
        messageString3 = "This is my message 3";

      // Enqueue
      const queue1 = await conn.getQueue(rawQueueName);
      const msg1 = await queue1.enqOne(messageString1);
      const msg2 = await queue1.enqOne(messageString2);
      const msg3 = await queue1.enqOne(messageString3);
      await conn.commit ();

      const queue2 = await conn.getQueue(rawQueueName);
      queue2.deqOptions.msgId = msg3.msgId;
      msg = await queue2.deqOne();
      assert(msg.payload.toString(), messageString3);
      assert.deepStrictEqual(queue2.deqOptions.msgId.toString('hex'), msg3.msgId.toString('hex'));

      queue2.deqOptions.msgId = msg2.msgId;
      msg = await queue2.deqOne ();
      assert(msg.payload.toString(), messageString2);
      assert.deepStrictEqual(queue2.deqOptions.msgId.toString('hex'), msg2.msgId.toString('hex'));

      queue2.deqOptions.msgId = msg1.msgId;
      msg = await queue2.deqOne();
      assert(msg.payload.toString(), messageString1);
      assert.deepStrictEqual(queue2.deqOptions.msgId.toString('hex'), msg1.msgId.toString('hex'));
    }); // 285.1.3

    it('285.1.4 query by msgId in enqMany and deqOne in random order', async function() {
      const queue1 = await conn.getQueue(rawQueueName);
      queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

      const messages1 = [
        "This is my message 1",
        "This is my message 2",
        {
          expiration: 10,
          payload: "This is my message 3"
        },
        "This is my message 4"
      ];

      const messages = await queue1.enqMany(messages1);

      /*Dequeue*/
      const queue2 = await conn.getQueue(rawQueueName);
      queue2.deqOptions.msgId = messages[2].msgId;
      let msg = await queue2.deqOne();
      assert(msg.payload.toString(), "This is my message 3");

      queue2.deqOptions.msgId = messages[3].msgId;
      msg = await queue2.deqOne();
      assert(msg.payload.toString(), "This is my message 4");

      queue2.deqOptions.msgId = messages[0].msgId;
      msg = await queue2.deqOne();
      assert(msg.payload.toString(), "This is my message 1");

      queue2.deqOptions.msgId = messages[1].msgId;
      msg = await queue2.deqOne();
      assert(msg.payload.toString(), "This is my message 2");
    }); // 285.1.4

    it('285.1.5 Negative - Invalid msgId in deqOptions', async function() {
      const queue2 = await conn.getQueue(rawQueueName);
      assert.rejects(
        () => {
          queue2.deqOptions.msgId = {
            "type": "Buffer",
            "data": [4, 194, 129, 173, 227, 163, 41, 25, 224, 99, 73, 74, 70, 100, 7, 8]
          };
        },
        /NJS-004:/ // NJS-004: invalid value for property "msgId"
      );

    }); // 285.1.5

    it('285.1.6 enqOne and deqOne by originalMsgId attribute as string in non-sequential order', async function() {
      let msg;
      const messageString1 = "This is my message 1",
        messageString2 = "This is my message 2",
        messageString3 = "This is my message 3";

      // Enqueue
      const queue1 = await conn.getQueue(rawQueueName);
      const msg1 = await queue1.enqOne(messageString1);
      const msg2 = await queue1.enqOne(messageString2);
      const msg3 = await queue1.enqOne(messageString3);
      await conn.commit ();

      const queue2 = await conn.getQueue(rawQueueName);
      queue2.deqOptions.originalMsgId = msg2.originalMsgId;
      msg = await queue2.deqOne ();
      assert(msg.payload.toString(), messageString2);

      queue2.deqOptions.originalMsgId = msg3.originalMsgId;
      msg = await queue2.deqOne();
      assert(msg.payload.toString(), messageString3);

      queue2.deqOptions.originalMsgId = msg1.originalMsgId;
      msg = await queue2.deqOne();
      assert(msg.payload.toString(), messageString1);
    }); // 285.1.6

    it('285.1.7 query by originalMsgId in enqMany and deqOne in random order', async function() {
      const queue1 = await conn.getQueue(rawQueueName);
      queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

      const messages1 = [
        "This is my message 1",
        "This is my message 2",
        {
          expiration: 10,
          payload: "This is my message 3"
        },
        "This is my message 4"
      ];

      const messages = await queue1.enqMany(messages1);

      /*Dequeue*/
      const queue2 = await conn.getQueue(rawQueueName);
      queue2.deqOptions.originalMsgId = messages[2].originalMsgId;
      let msg = await queue2.deqOne();
      assert(msg.payload.toString(), "This is my message 3");

      queue2.deqOptions.originalMsgId = messages[3].originalMsgId;
      msg = await queue2.deqOne();
      assert(msg.payload.toString(), "This is my message 4");

      queue2.deqOptions.originalMsgId = messages[0].originalMsgId;
      msg = await queue2.deqOne();
      assert(msg.payload.toString(), "This is my message 1");

      queue2.deqOptions.originalMsgId = messages[1].originalMsgId;
      msg = await queue2.deqOne();
      assert(msg.payload.toString(), "This is my message 2");
    }); // 285.1.7

  });

  describe('285.2 query by msgId in QUEUE_PAYLOAD_TYPE as ‘JSON’', function() {
    const objQueueName = "NODB_ADDR_QUEUE8";
    const objType      = "JSON";
    const objTable     = "NODB_TAB_JSON";

    before(async function() {
      const plsql = `
      BEGIN
        DBMS_AQADM.CREATE_QUEUE_TABLE(
          QUEUE_TABLE => '${AQ_USER}.${objTable}',
          multiple_consumers =>  FALSE,
          QUEUE_PAYLOAD_TYPE => '${objType}'
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
    });

    it('285.2.1 enqOne and deqOne Json val as array type in non-sequential order', async function() {
      let msgDeq;
      const queue = await conn.getQueue (objQueueName,
        { payloadType: oracledb.DB_TYPE_JSON }
      );

      const payload1 = { "employees": [ "Employee1", "Employee2", "Employee3" ] };
      const msg1 = await queue.enqOne ({
        payload: payload1,
      });

      const payload2 = { "designation": [ "Developer", "Sr. Developer", "Jr. Developer" ] };
      const msg2 = await queue.enqOne ({
        payload: payload2,
      });

      const payload3 = { "names": [ "Steve", "John", "Alice" ] };
      const msg3 = await queue.enqOne ({
        payload: payload3,
      });

      await conn.commit ();

      /*Dequeue*/
      const options = { payloadType: oracledb.DB_TYPE_JSON };
      const queue2 = await conn.getQueue(objQueueName, options);

      queue2.deqOptions.msgId = msg3.msgId;
      msgDeq = await queue2.deqOne();
      assert.deepStrictEqual(msgDeq.payload, payload3);

      queue2.deqOptions.msgId = msg2.msgId;
      msgDeq = await queue2.deqOne();
      assert.deepStrictEqual(msgDeq.payload, payload2);

      queue2.deqOptions.msgId = msg1.msgId;
      msgDeq = await queue2.deqOne();
      assert.deepStrictEqual(msgDeq.payload, payload1);
    }); // 285.2.1

    it('285.2.2 enqOne and deqOne Json val as array type in random order', async function() {
      let msgDeq;
      const queue = await conn.getQueue (objQueueName,
        { payloadType: oracledb.DB_TYPE_JSON }
      );

      const payload1 = { "employees": [ "Employee1", "Employee2", "Employee3" ] };
      const msg1 = await queue.enqOne ({
        payload: payload1,
      });

      const payload2 = { "designation": [ "Developer", "Sr. Developer", "Jr. Developer" ] };
      const msg2 = await queue.enqOne ({
        payload: payload2,
      });

      const payload3 = { "names": [ "Steve", "John", "Alice" ] };
      const msg3 = await queue.enqOne ({
        payload: payload3,
      });

      await conn.commit ();

      /*Dequeue*/
      const options = { payloadType: oracledb.DB_TYPE_JSON };
      const queue2 = await conn.getQueue(objQueueName, options);

      queue2.deqOptions.msgId = msg2.msgId;
      msgDeq = await queue2.deqOne();
      assert.deepStrictEqual(msgDeq.payload, payload2);

      queue2.deqOptions.msgId = msg1.msgId;
      msgDeq = await queue2.deqOne();
      assert.deepStrictEqual(msgDeq.payload, payload1);

      queue2.deqOptions.msgId = msg3.msgId;
      msgDeq = await queue2.deqOne();
      assert.deepStrictEqual(msgDeq.payload, payload3);
    }); //285.2.2

    it('285.2.3 enqMany and deqOne Json val as array type in non-sequential order', async function() {
      let msgDeq;
      const queue = await conn.getQueue (objQueueName,
        { payloadType: oracledb.DB_TYPE_JSON });

      const empList = [
        {payload: { empName: "Employee #1", empId: 101 }},
        {payload: { empName: "Employee #2", empId: 102 }},
        {payload: { empName: "Employee #3", empId: 103 }}
      ];

      const messages = await queue.enqMany(empList);
      await conn.commit();

      const options = { payloadType: oracledb.DB_TYPE_JSON };
      const queue2 = await conn.getQueue(objQueueName, options);

      queue2.deqOptions.msgId = messages[2].msgId;
      msgDeq = await queue2.deqOne();
      assert.deepStrictEqual(msgDeq.payload, { empName: "Employee #3", empId: 103 });

      queue2.deqOptions.msgId = messages[1].msgId;
      msgDeq = await queue2.deqOne();
      assert.deepStrictEqual(msgDeq.payload, { empName: "Employee #2", empId: 102 });
      queue2.deqOptions.msgId = messages[0].msgId;
      msgDeq = await queue2.deqOne();
      assert.deepStrictEqual(msgDeq.payload, { empName: "Employee #1", empId: 101 });
    }); // 285.2.3

    it('285.2.4 enqMany and deqOne Json val as array type in random order', async function() {
      let msgDeq;
      const queue = await conn.getQueue(objQueueName,
        { payloadType: oracledb.DB_TYPE_JSON });

      const empList = [
        {payload: { empName: "Employee #1", empId: 101 }},
        {payload: { empName: "Employee #2", empId: 102 }},
        {payload: { empName: "Employee #3", empId: 103 }}
      ];

      const messages = await queue.enqMany(empList);
      await conn.commit();

      const options = { payloadType: oracledb.DB_TYPE_JSON };
      const queue2 = await conn.getQueue(objQueueName, options);

      queue2.deqOptions.msgId = messages[1].msgId;
      msgDeq = await queue2.deqOne();
      assert.deepStrictEqual(msgDeq.payload, { empName: "Employee #2", empId: 102 });

      queue2.deqOptions.msgId = messages[0].msgId;
      msgDeq = await queue2.deqOne();
      assert.deepStrictEqual(msgDeq.payload, { empName: "Employee #1", empId: 101 });

      queue2.deqOptions.msgId = messages[2].msgId;
      msgDeq = await queue2.deqOne();
      assert.deepStrictEqual(msgDeq.payload, { empName: "Employee #3", empId: 103 });
    }); // 285.2.4
  });

  describe('285.3 query by msgId as Oracle Database Object AQ Messages', function() {
    const objQueueName = "NODB_ADDR_QUEUE";
    const objType = "NODB_ADDR_TYP";
    const objTable = "NODB_TAB_ADDR";

    before(async function() {
      // Create the Type
      let plsql = `
          CREATE OR REPLACE TYPE ${objType} AS OBJECT (
            NAME        VARCHAR2(10),
            ADDRESS     VARCHAR2(50)
          );
        `;
      await conn.execute(plsql);

      // Create and start a queue
      plsql = `
          BEGIN
            DBMS_AQADM.CREATE_QUEUE_TABLE(
              QUEUE_TABLE        =>  '${AQ_USER}.${objTable}',
              QUEUE_PAYLOAD_TYPE =>  '${objType}'
            );
            DBMS_AQADM.CREATE_QUEUE(
              QUEUE_NAME         =>  '${AQ_USER}.${objQueueName}',
              QUEUE_TABLE        =>  '${AQ_USER}.${objTable}'
            );
            DBMS_AQADM.START_QUEUE(
              QUEUE_NAME         => '${AQ_USER}.${objQueueName}'
            );
          END;
        `;
      await conn.execute(plsql);
    });

    const addrData1 = {
      NAME: "John",
      ADDRESS: "100 Oracle Parkway Redwood City, CA US 94065"
    };

    const addrData2 = {
      NAME: "Jenny",
      ADDRESS: "200 Oracle Parkway Redwood City, CA US 94065"
    };

    const addrData3 = {
      NAME: "Laura",
      ADDRESS: "300 Oracle Parkway Redwood City, CA US 94065"
    };

    it('285.3.1 msgId in enqOne/deqOne in non-sequential order', async function() {
      // Enqueue
      const queue = await conn.getQueue(
        objQueueName,
        { payloadType: objType }
      );
      const message1 = new queue.payloadTypeClass(addrData1);
      const msg1 = await queue.enqOne(message1);
      await conn.commit();

      const message2 = new queue.payloadTypeClass(addrData2);
      const msg2 = await queue.enqOne(message2);
      await conn.commit();

      const message3 = new queue.payloadTypeClass(addrData3);
      const msg3 = await queue.enqOne(message3);
      await conn.commit();

      // Dequeue
      const queue2 = await conn.getQueue(
        objQueueName,
        { payloadType: objType }
      );

      queue2.deqOptions.msgId = msg3.msgId;
      let msgDeq = await queue2.deqOne();
      assert.strictEqual(msgDeq.payload.NAME, addrData3.NAME);
      assert.strictEqual(msgDeq.payload.ADDRESS, addrData3.ADDRESS);

      queue2.deqOptions.msgId = msg2.msgId;
      msgDeq = await queue2.deqOne();
      assert.strictEqual(msgDeq.payload.NAME, addrData2.NAME);
      assert.strictEqual(msgDeq.payload.ADDRESS, addrData2.ADDRESS);

      queue2.deqOptions.msgId = msg1.msgId;
      msgDeq = await queue2.deqOne();
      assert.strictEqual(msgDeq.payload.NAME, addrData1.NAME);
      assert.strictEqual(msgDeq.payload.ADDRESS, addrData1.ADDRESS);
    }); // 285.3.1

    it('285.3.2 msgId in enqOne/deqOne in random order', async function() {
      // Enqueue
      const queue = await conn.getQueue(
        objQueueName,
        { payloadType: objType }
      );
      const message1 = new queue.payloadTypeClass(addrData1);
      const msg1 = await queue.enqOne(message1);
      await conn.commit();

      const message2 = new queue.payloadTypeClass(addrData2);
      const msg2 = await queue.enqOne(message2);
      await conn.commit();

      const message3 = new queue.payloadTypeClass(addrData3);
      const msg3 = await queue.enqOne(message3);
      await conn.commit();

      // Dequeue
      const queue2 = await conn.getQueue(
        objQueueName,
        { payloadType: objType }
      );

      queue2.deqOptions.msgId = msg2.msgId;
      let msgDeq = await queue2.deqOne();
      assert.strictEqual(msgDeq.payload.NAME, addrData2.NAME);
      assert.strictEqual(msgDeq.payload.ADDRESS, addrData2.ADDRESS);

      queue2.deqOptions.msgId = msg1.msgId;
      msgDeq = await queue2.deqOne();
      assert.strictEqual(msgDeq.payload.NAME, addrData1.NAME);
      assert.strictEqual(msgDeq.payload.ADDRESS, addrData1.ADDRESS);

      queue2.deqOptions.msgId = msg3.msgId;
      msgDeq = await queue2.deqOne();
      assert.strictEqual(msgDeq.payload.NAME, addrData3.NAME);
      assert.strictEqual(msgDeq.payload.ADDRESS, addrData3.ADDRESS);
    }); // 285.3.2

    const addrArray = [
      {
        NAME: "John",
        ADDRESS: "100 Oracle Parkway Redwood City, CA US 94065"
      },
      {
        NAME: "Jenny",
        ADDRESS: "200 Oracle Parkway Redwood City, CA US 94065"
      },
      {
        NAME: "Laura",
        ADDRESS: "300 Oracle Parkway Redwood City, CA US 94065"
      },
      {
        NAME: "Lawrance",
        ADDRESS: "400 Oracle Parkway Redwood City, CA US 94065"
      }
    ];

    it('285.3.3 msgId in enqOne/deqOne in non-sequential order', async function() {
      // Enqueue
      const queue1 = await conn.getQueue(
        objQueueName,
        { payloadType: objType }
      );
      const msgArray = [];
      for (let i = 0; i < addrArray.length; i++) {
        msgArray[i] = new queue1.payloadTypeClass(addrArray[i]);
      }
      const messages = await queue1.enqMany(msgArray);

      // Dequeue
      const queue2 = await conn.getQueue(
        objQueueName,
        { payloadType: objType }
      );
      queue2.deqOptions.msgId = messages[3].msgId;
      let msgDeq = await queue2.deqOne();
      assert.strictEqual(msgDeq.payload.NAME, addrArray[3].NAME);
      assert.strictEqual(msgDeq.payload.ADDRESS, addrArray[3].ADDRESS);

      queue2.deqOptions.msgId = messages[2].msgId;
      msgDeq = await queue2.deqOne();
      assert.strictEqual(msgDeq.payload.NAME, addrArray[2].NAME);
      assert.strictEqual(msgDeq.payload.ADDRESS, addrArray[2].ADDRESS);

      queue2.deqOptions.msgId = messages[1].msgId;
      msgDeq = await queue2.deqOne();
      assert.strictEqual(msgDeq.payload.NAME, addrArray[1].NAME);
      assert.strictEqual(msgDeq.payload.ADDRESS, addrArray[1].ADDRESS);

      queue2.deqOptions.msgId = messages[0].msgId;
      msgDeq = await queue2.deqOne();
      assert.strictEqual(msgDeq.payload.NAME, addrArray[0].NAME);
      assert.strictEqual(msgDeq.payload.ADDRESS, addrArray[0].ADDRESS);
    }); // 285.3.3

    it('285.3.4 msgId in enqOne/deqOne in random order', async function() {
      // Enqueue
      const queue1 = await conn.getQueue(
        objQueueName,
        { payloadType: objType }
      );
      const msgArray = [];
      for (let i = 0; i < addrArray.length; i++) {
        msgArray[i] = new queue1.payloadTypeClass(addrArray[i]);
      }
      const messages = await queue1.enqMany(msgArray);

      // Dequeue
      const queue2 = await conn.getQueue(
        objQueueName,
        { payloadType: objType }
      );
      queue2.deqOptions.msgId = messages[2].msgId;
      let msgDeq = await queue2.deqOne();
      assert.strictEqual(msgDeq.payload.NAME, addrArray[2].NAME);
      assert.strictEqual(msgDeq.payload.ADDRESS, addrArray[2].ADDRESS);

      queue2.deqOptions.msgId = messages[1].msgId;
      msgDeq = await queue2.deqOne();
      assert.strictEqual(msgDeq.payload.NAME, addrArray[1].NAME);
      assert.strictEqual(msgDeq.payload.ADDRESS, addrArray[1].ADDRESS);

      queue2.deqOptions.msgId = messages[0].msgId;
      msgDeq = await queue2.deqOne();
      assert.strictEqual(msgDeq.payload.NAME, addrArray[0].NAME);
      assert.strictEqual(msgDeq.payload.ADDRESS, addrArray[0].ADDRESS);

      queue2.deqOptions.msgId = messages[3].msgId;
      msgDeq = await queue2.deqOne();
      assert.strictEqual(msgDeq.payload.NAME, addrArray[3].NAME);
      assert.strictEqual(msgDeq.payload.ADDRESS, addrArray[3].ADDRESS);
    }); // 285.3.4
  });
});

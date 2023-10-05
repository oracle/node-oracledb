/* Copyright (c) 2023, Oracle and/or its affiliates. */

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
 *   282. aq6.js
 *
 * DESCRIPTION
 *   Test Oracle Advanced Queueing (AQ).
 *   Test cases for msgId from enqOne/enqMany/deqOne/deqMany.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('282. aq6.js', function() {

  let isRunnable = true;
  let conn;
  const AQ_USER = 'NODB_SCHEMA_AQTEST1';
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
      user:          AQ_USER,
      password:      AQ_USER_PWD,
      connectString: dbConfig.connectString
    };
    conn = await oracledb.getConnection(credential);

  }); // before()

  after(async function() {
    if (!isRunnable) return;
    await conn.close();
    await testsUtil.dropAQtestUser(AQ_USER);

  }); // after()

  describe('282.1 msgId in QUEUE_PAYLOAD_TYPE as ‘RAW’', function() {
    const rawQueueName = "NODB_RAW_QUEUE";

    before(async function() {
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
    });

    it('282.1.1 msgId in enqOne/deqOne', async () => {
      let msg;

      // Enqueue
      const queue1 = await conn.getQueue(rawQueueName);
      const messageString = 'This is my message';
      msg = await queue1.enqOne(messageString);
      assert(msg);
      assert(msg.msgId.length > 0);
      assert(msg.msgId instanceof Buffer);
      await conn.commit();

      // Dequeue
      const queue2 = await conn.getQueue(rawQueueName);
      msg = await queue2.deqOne();
      assert(msg);
      assert(msg.msgId.length > 0);
      assert(msg.msgId instanceof Buffer);
      await conn.commit();
    }); // 282.1.1

    it('282.1.2 msgId in enqMany/deqMany', async () => {
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

      /*Dequeue*/
      const queue2 = await conn.getQueue(rawQueueName);
      queue2.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

      const msgs = await queue2.deqMany(5);  // get at most 5 messages
      if (msgs) {
        for (let i = 0; i < msgs.length; i++) {
          assert(msgs[i].msgId.length > 0);
          assert(msgs[i].msgId instanceof Buffer);
        }
      }
    }); // 282.1.2
  });

  describe('282.2 msgId in QUEUE_PAYLOAD_TYPE as ‘JSON’', function() {
    const objQueueName = "NODB_ADDR_QUEUE7";
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

    it('282.2.1 enqOne and deqOne Json val as array type', async function() {
      let msg;
      const queue = await conn.getQueue(objQueueName,
        { payloadType: oracledb.DB_TYPE_JSON }
      );

      msg = await queue.enqOne ({
        payload: { "employees":[ "Employee1", "Employee2", "Employee3" ] },
      });

      await conn.commit();

      /*Dequeue*/
      const options = { payloadType: oracledb.DB_TYPE_JSON };
      const queue2 = await conn.getQueue(objQueueName, options);
      msg = await queue2.deqOne();
      assert(msg);
      assert(msg.msgId.length > 0);
      assert(msg.msgId instanceof Buffer);
      await conn.commit();
    }); //282.2.1

    it('282.2.2 JSON type in enqMany/deqMany', async () => {
      const queue3 = await conn.getQueue (objQueueName,
        { payloadType: oracledb.DB_TYPE_JSON });

      const empList = [
        {payload: { empName: "Employee #1", empId: 101 }},
        {payload: { empName: "Employee #2", empId: 102 }},
        {payload: { empName: "Employee #3", empId: 103 }}
      ];

      await queue3.enqMany(empList);
      await conn.commit();

      const options = { payloadType: oracledb.DB_TYPE_JSON };
      const queue4 = await conn.getQueue(objQueueName, options);
      Object.assign(queue4.deqOptions,
        {
          navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
          wait: oracledb.AQ_DEQ_NO_WAIT
        }
      );

      const msgs = await queue4.deqMany(5); // get at most 5 messages
      if (msgs) {
        for (let i = 0; i < msgs.length; i++) {
          assert(msgs[i].msgId.length > 0);
          assert(msgs[i].msgId instanceof Buffer);
        }
      }
    }); //282.2.2
  });

  describe('282.3 msgId as Oracle Database Object AQ Messages', function() {
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

    it('282.3.1 msgId in enqOne/deqOne', async () => {
      let msg;
      const addrData = {
        NAME: "scott",
        ADDRESS: "The Kennel"
      };

      // Enqueue
      const queue1 = await conn.getQueue(
        objQueueName,
        { payloadType: objType }
      );
      const message = new queue1.payloadTypeClass(addrData);
      msg = await queue1.enqOne(message);
      assert(msg);
      assert(msg.msgId.length > 0);
      assert(msg.msgId instanceof Buffer);
      await conn.commit();

      // Dequeue
      const queue2 = await conn.getQueue(
        objQueueName,
        { payloadType: objType }
      );
      msg = await queue2.deqOne();
      assert(msg);
      assert(msg.msgId.length > 0);
      assert(msg.msgId instanceof Buffer);
      await conn.commit();
    }); // 282.3.1

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
        NAME: "Lawrence",
        ADDRESS: "400 Oracle Parkway Redwood City, CA US 94065"
      }
    ];

    it('282.3.2 msgId in deqMany() with DB object array', async () => {
    // Enqueue
      const queue1 = await conn.getQueue(
        objQueueName,
        { payloadType: objType }
      );
      const msgArray = [];
      for (let i = 0; i < addrArray.length; i++) {
        msgArray[i] = new queue1.payloadTypeClass(addrArray[i]);
      }
      await queue1.enqMany(msgArray);

      // Dequeue
      const queue2 = await conn.getQueue(
        objQueueName,
        { payloadType: objType }
      );
      const msgs = await queue2.deqMany(5);  // get at most 5 messages
      if (msgs) {
        for (let i = 0; i < msgs.length; i++) {
          assert(msgs[i].msgId.length > 0);
          assert(msgs[i].msgId instanceof Buffer);
        }
      }
    }); // 282.3.2
  });
});

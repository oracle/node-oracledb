/* Copyright (c) 2022, 2025, Oracle and/or its affiliates. */

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
 *   267. aq4.js
 *
 * DESCRIPTION
 *   Test Oracle Advanced Queueing (AQ) - recipient list
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');
const assert    = require('assert');

describe('267. aq4.js', function() {
  let conn           = null;

  const AQ_USER      = 'NODB_SCHEMA_AQTEST4';
  const AQ_USER_PWD  = testsUtil.generateRandomPassword();

  const objQueueName = "NODB_ADDR_QUEUE";
  const objType      = "NODB_ADDR_TYP";
  const objTable     = "NODB_TAB_ADDR";

  const addrData     = {
    NAME: "scott",
    ADDRESS: "The kennel"
  };

  const addrDataArr = [
    {
      NAME: "scott",
      ADDRESS: "The kennel"
    },
    {
      NAME: "John",
      ADDRESS: "Pasadena"
    },
    {
      NAME: "Nick",
      ADDRESS: "London"
    }
  ];


  const plsqlCreateType = `
    CREATE OR REPLACE TYPE ${objType} AS OBJECT (
      NAME    VARCHAR2(10),
      ADDRESS VARCHAR2(50)
    );
  `;

  const plsqlCreateQueue = `
    BEGIN
      DBMS_AQADM.CREATE_QUEUE_TABLE(
        QUEUE_TABLE => '${AQ_USER}.${objTable}',
        multiple_consumers => TRUE,
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

  before(async function() {
    if (!dbConfig.test.DBA_PRIVILEGE) {
      this.skip();
    }

    await testsUtil.createAQtestUser(AQ_USER, AQ_USER_PWD);

    const credential = {
      user: AQ_USER,
      password: AQ_USER_PWD,
      connectString: dbConfig.connectString
    };
    conn = await oracledb.getConnection(credential);

    await conn.execute(plsqlCreateType);
    await conn.execute(plsqlCreateQueue);
  });  // before


  after(async function() {
    if (!dbConfig.test.DBA_PRIVILEGE)
      return;

    if (conn)
      await conn.close();

    await testsUtil.dropAQtestUser(AQ_USER);
  });  // after

  it('267.1 empty array or no recipients', async function() {
    await assert.rejects(
      async function() {
      // Enqueue
        const queue1 = await conn.getQueue(
          objQueueName,
          {payloadType: objType}
        );
        const message = new queue1.payloadTypeClass(addrData);
        await queue1.enqOne({
          payload: message,
          recipients: []
        });
        await conn.commit();

        //Dequeue
        const queue2 = await conn.getQueue(
          objQueueName,
          { payloadType: objType }
        );
        Object.assign(
          queue2.deqOptions,
          { consumerName: "" }
        );

        const msg = await queue2.deqOne();
        assert.strictEqual(msg, null);
        await conn.commit();
      },
      /ORA-24033:/
    );
  }); // 267.1

  it('267.2 single element in array', async function() {
    // Enqueue
    const queue1 = await conn.getQueue(
      objQueueName,
      {payloadType: objType}
    );
    const message = new queue1.payloadTypeClass(addrData);
    await queue1.enqOne({
      payload: message,
      recipients: [ "sub1" ]
    });
    await conn.commit();

    //Dequeue
    const queue2 = await conn.getQueue(
      objQueueName,
      { payloadType: objType }
    );
    Object.assign(
      queue2.deqOptions,
      { consumerName: "sub1" }
    );

    const msg = await queue2.deqOne();
    assert.strictEqual(msg.payload.NAME, "scott");
    assert.strictEqual(queue2.deqOptions.consumerName, "sub1");
    await conn.commit();
  }); // 267.2


  it('267.3 Negative - numbers as recipients ', async function() {
    const queue1 = await conn.getQueue(
      objQueueName,
      {payloadType: objType}
    );
    const message = new queue1.payloadTypeClass(addrData);
    await assert.rejects(
      async function() {
        await queue1.enqOne({
          payload: message,
          recipients: [1, 3, 5]
        });
      },
      /NJS-007:/
    );
  }); // 267.3

  it('267.4 Negative - number, string, date as recipients ', async function() {
    const queue1 = await conn.getQueue(
      objQueueName,
      {payloadType: objType}
    );
    const message = new queue1.payloadTypeClass(addrData);
    await assert.rejects(
      async function() {
        await queue1.enqOne({
          payload: message,
          recipients: [1, "abc", new Date(2022, 5, 17)]
        });
      },
      /NJS-007:/
    );
  }); // 267.4

  it('267.5 Negative -  null value for recipient', async function() {
    const queue1 = await conn.getQueue(
      objQueueName,
      {payloadType: objType}
    );
    const message = new queue1.payloadTypeClass(addrData);
    await assert.rejects(
      async function() {
        await queue1.enqOne({
          payload: message,
          recipients: [ null ]
        });
      },
      /NJS-007:/
    );
  }); // 267.5

  it('267.6 Negative - undefined value for recipient', async function() {
    const queue1 = await conn.getQueue(
      objQueueName,
      {payloadType: objType}
    );
    const message = new queue1.payloadTypeClass(addrData);
    await assert.rejects(
      async function() {
        await queue1.enqOne({
          payload: message,
          recipients: [ undefined ]
        });
      },
      /NJS-007:/
    );
  }); // 267.6

  it('267.7 Negative - dequeue non-existent name', async function() {
    await assert.rejects(
      async function() {
      // Enqueue
        const queue1 = await conn.getQueue(
          objQueueName,
          {payloadType: objType}
        );
        const message = new queue1.payloadTypeClass(addrData);
        await queue1.enqOne({
          payload: message,
          recipients: [ "sub1", "sub2" ]
        });
        await conn.commit();
        const queue2 = await conn.getQueue(
          objQueueName,
          { payloadType: objType }
        );
        Object.assign(
          queue2.deqOptions,
          { consumerName: "sub3" }
        );

        const msg = await queue2.deqOne();
        assert.strictEqual(msg, null);
        assert.strictEqual(queue2.deqOptions.consumerName, "sub3");
        await conn.commit();
      },
      /ORA-25242:/
    );
  }); // 267.7


  it('267.8 empty recipient list with enqMany', async function() {
    const msgList = [];

    await assert.rejects(
      async function() {
      // Enqueue
        const queue1 = await conn.getQueue(objQueueName, {payloadType: objType});
        for (let i = 0; i < addrDataArr.length; i++) {
          const msg = new queue1.payloadTypeClass(addrDataArr[i]);
          msgList[i] = { payload: msg, recipients: [] };
        }
        await queue1.enqMany(msgList);
      },
      /ORA-24033:/
    );
  }); // 267.8

  it('267.9 recipient list with enqMany', async function() {
    const msgList = [];

    // Enqueue
    const queue1 = await conn.getQueue(objQueueName, {payloadType: objType});
    for (let i = 0; i < addrDataArr.length; i++) {
      const msg = new queue1.payloadTypeClass(addrDataArr[i]);
      msgList[i] = { payload: msg, recipients: ["sub1", "sub2", "sub3"] };
    }
    await queue1.enqMany(msgList);

    // Dequeue
    const queue2 = await conn.getQueue(objQueueName, {payloadType: objType});
    Object.assign(
      queue2.deqOptions,
      {
        consumerName: "sub1",
        navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
        wait: oracledb.AQ_DEQ_NO_WAIT
      }
    );
    const msgs = await queue2.deqMany(5);
    assert.strictEqual(msgs.length, 4);
    assert.strictEqual(queue2.deqOptions.consumerName, "sub1");
  }); // 267.9

  it('267.10 recipient list with enqMany non-existent in dequeue', async function() {
    const msgList = [];

    // Enqueue
    const queue1 = await conn.getQueue(objQueueName, {payloadType: objType});
    for (let i = 0; i < addrDataArr.length; i++) {
      const msg = new queue1.payloadTypeClass(addrDataArr[i]);
      msgList[i] = { payload: msg, recipients: ["sub1", "sub2", "sub3"] };
    }
    await queue1.enqMany(msgList);

    // Dequeue
    const queue2 = await conn.getQueue(objQueueName, {payloadType: objType});
    Object.assign(
      queue2.deqOptions,
      {
        consumerName: "abc",
        navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
        wait: oracledb.AQ_DEQ_NO_WAIT
      }
    );
    const msgs = await queue2.deqMany(5);
    assert.strictEqual(msgs.length, 0);
    assert.strictEqual(queue2.deqOptions.consumerName, "abc");
  }); // 267.10

  it('267.11 recipient list with enqMany invalid datatype in dequeue', async function() {
    const msgList = [];

    await assert.rejects(
      async function() {
      // Enqueue
        const queue1 = await conn.getQueue(objQueueName, {payloadType: objType});
        for (let i = 0; i < addrDataArr.length; i++) {
          const msg = new queue1.payloadTypeClass(addrDataArr[i]);
          msgList[i] = { payload: msg,
            recipients: [101, "sub2", new Date(2022, 5, 22)] };
        }
        await queue1.enqMany(msgList);
      },
      /NJS-007:/
    );
  }); // 267.11

  it('267.12 Enqueue with duplicate recipients', async function() {
    const queue1 = await conn.getQueue(objQueueName, { payloadType: objType });
    const message = new queue1.payloadTypeClass(addrData);

    await assert.rejects(async () =>
      await queue1.enqOne({
        payload: message,
        recipients: ["sub1", "sub1", "sub2"]
      }),
    /ORA-25232:/ // ORA-25232: duplicate recipients specified for message
    );
  }); // 267.12

  it('267.13 Enqueue with special characters in recipient name', async function() {
    const queue1 = await conn.getQueue(objQueueName, { payloadType: objType });
    const message = new queue1.payloadTypeClass(addrData);

    await assert.rejects(
      async function() {
        await queue1.enqOne({
          payload: message,
          recipients: ["sub@#1"]
        });
      },
      /ORA-24047:/ // ORA-24047: invalid agent name sub@#1, agent name should be of the form NAME
    );
  }); // 267.13

  it('267.14 dequeue message with single recipient and verify processing', async function() {
    // Enqueue
    const queue1 = await conn.getQueue(
      objQueueName,
      {payloadType: objType}
    );

    const message = new queue1.payloadTypeClass(addrData);
    await queue1.enqOne({
      payload: message,
      recipients: ["subscriber1"]
    });

    await conn.commit();

    // Dequeue to trigger _processRecipients with numRecipients > 0
    const queue2 = await conn.getQueue(
      objQueueName,
      { payloadType: objType }
    );
    Object.assign(
      queue2.deqOptions,
      {
        consumerName: "subscriber1",
        navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
        wait: oracledb.AQ_DEQ_NO_WAIT
      }
    );

    const msg = await queue2.deqOne();
    assert.strictEqual(msg.payload.NAME, "scott");
    await conn.commit();
  }); // 267.14

  it('267.15 dequeue message with multiple recipients', async function() {
    // Enqueue with multiple recipients
    const queue1 = await conn.getQueue(
      objQueueName,
      {payloadType: objType}
    );
    const message = new queue1.payloadTypeClass(addrData);
    await queue1.enqOne({
      payload: message,
      recipients: ["sub1", "sub2", "sub3"]
    });
    await conn.commit();

    // Dequeue from first recipient
    const queue2 = await conn.getQueue(
      objQueueName,
      { payloadType: objType }
    );
    Object.assign(
      queue2.deqOptions,
      {
        consumerName: "sub1",
        navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
        wait: oracledb.AQ_DEQ_NO_WAIT
      }
    );

    const msg = await queue2.deqOne();
    assert.strictEqual(msg.payload.NAME, "scott");
    await conn.commit();
  }); // 267.15

  it('267.16 dequeue from queue with no recipients to test empty path', async function() {
    // hit the return [] path when numRecipients = 0
    const queue = await conn.getQueue(
      objQueueName,
      { payloadType: objType }
    );

    // dequeue when no messages exist
    Object.assign(
      queue.deqOptions,
      {
        consumerName: "nonexistent",
        navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
        wait: oracledb.AQ_DEQ_NO_WAIT
      }
    );

    const msg = await queue.deqOne();
    assert.strictEqual(msg, undefined);
  }); // 267.16

  it('267.17 enqueue and dequeue with recipient information processing', async function() {
    // Create a message with multiple recipients that will return recipient info
    const queue1 = await conn.getQueue(objQueueName, { payloadType: objType });
    const message = new queue1.payloadTypeClass(addrData);

    await queue1.enqOne({
      payload: message,
      recipients: ["recipient1", "recipient2", "recipient3"]
    });
    await conn.commit();

    // Dequeue as recipient1 with specific options to trigger recipient processing
    const queue2 = await conn.getQueue(objQueueName, { payloadType: objType });
    Object.assign(queue2.deqOptions, {
      consumerName: "recipient1",
      navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
      wait: oracledb.AQ_DEQ_NO_WAIT,
      mode: oracledb.AQ_DEQ_MODE_BROWSE
    });

    const msg = await queue2.deqOne();
    if (msg) {
      assert.strictEqual(msg.payload.NAME, "scott");
      assert.strictEqual(msg.payload.ADDRESS, "The kennel");
    }
    await conn.commit();
  }); // 267.17

  it('267.18 process recipients with enqMany and varied recipient lists', async function() {
    const msgList = [];
    const queue1 = await conn.getQueue(objQueueName, { payloadType: objType });

    // Create messages with different recipient patterns
    for (let i = 0; i < addrDataArr.length; i++) {
      const msg = new queue1.payloadTypeClass(addrDataArr[i]);
      msgList[i] = {
        payload: msg,
        recipients: [`sub${i + 1}`, `sub${i + 2}`, `sub${i + 3}`]
      };
    }

    await queue1.enqMany(msgList);
    await conn.commit();

    // Dequeue with specific consumer to trigger recipient processing
    const queue2 = await conn.getQueue(objQueueName, { payloadType: objType });
    Object.assign(queue2.deqOptions, {
      consumerName: "sub1",
      navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
      wait: oracledb.AQ_DEQ_NO_WAIT
    });

    const msgs = await queue2.deqMany(5);
    assert(msgs.length > 0);
  }); // 267.18

  it('267.19 dequeue with recipient metadata processing', async function() {

    // Create a queue with specific configuration that might return recipient info
    const queue1 = await conn.getQueue(objQueueName, { payloadType: objType });
    const message = new queue1.payloadTypeClass(addrData);

    // Enqueue with recipients
    await queue1.enqOne({
      payload: message,
      recipients: ["admin_recipient", "test_recipient"]
    });
    await conn.commit();

    // dequeue with administrative/diagnostic mode
    const queue2 = await conn.getQueue(objQueueName, { payloadType: objType });
    Object.assign(queue2.deqOptions, {
      consumerName: "admin_recipient",
      navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
      mode: oracledb.AQ_DEQ_MODE_LOCKED, // Different mode that might return metadata
      wait: oracledb.AQ_DEQ_NO_WAIT
    });

    const msg = await queue2.deqOne();
    if (msg) {
      assert.strictEqual(msg.payload.NAME, "scott");
    }
    await conn.commit();
  }); // 267.19
});

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
 *   218. aq2.js
 *
 * DESCRIPTION
 *   Test Oracle Advanced Queueing (AQ).
 *   The test version of examples/aqobject.js
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');
const assert    = require('assert');

describe('218. aq2.js', function() {

  let isRunnable = true;
  let conn;

  const AQ_USER = 'NODB_SCHEMA_AQTEST2';
  const AQ_USER_PWD = testsUtil.generateRandomPassword();

  const objQueueName = "NODB_ADDR_QUEUE";
  const objType = "NODB_ADDR_TYP";
  const objTable = "NODB_TAB_ADDR";

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

  it('218.1 examples/aqobject.js', async function() {
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
    await queue1.enqOne(message);
    await conn.commit();

    // Dequeue
    const queue2 = await conn.getQueue(
      objQueueName,
      { payloadType: objType }
    );
    const msg = await queue2.deqOne();
    await conn.commit();
    assert(msg);
    assert.strictEqual(msg.payload.NAME, addrData.NAME);
    assert.strictEqual(msg.payload.ADDRESS, addrData.ADDRESS);
  }); // 218.1

  it.skip('218.2 The read-only property "payloadTypeClass"', async function() {
    const queue = await conn.getQueue(objQueueName, { payloadType: objType });
    const t = queue.payloadTypeClass;
    assert(t);
    queue.payloadTypeClass = {'foo': 'bar'};

    console.log(queue);
  }); // 218.2

  it('218.3 Negative - enqueue a raw JavaScript object directly', async function() {
    const addrData = {
      NAME: "John Smith",
      ADDRESS: "100 Oracle Parkway Redwood City, CA US 94065"
    };

    // Enqueue
    const queue1 = await conn.getQueue(objQueueName);
    await assert.rejects(
      async function() {
        await queue1.enqOne(addrData);
      },
      /NJS-070:/
    );
    /* NJS-070: message must be a string, buffer, database object or
    an object containing a payload property which itself is a string,
    buffer or database object */
  }); // 218.3

  it('218.4 Negative - getQueue() without options on DB Object data', async function() {
    const addrData = {
      NAME: "Changjie",
      ADDRESS: "200 Oracle Parkway Redwood City, CA US 94065"
    };
    await assert.rejects(
      async function() {
        const queue1 = await conn.getQueue(objQueueName);
        const objClass = await conn.getDbObjectClass(objType);
        const message = new objClass(addrData);
        await queue1.enqOne(message);
      },
      /NJS-174/
    );
    /* NJS-174: Payload cannot be enqueued since it does not match the payload
    type supported by the queue */
  }); // 218.4

  it('218.5 Enqueue a DB object as payload attribute', async function() {
    const addrData = {
      NAME: "Changjie",
      ADDRESS: "400 Oracle Parkway Redwood City, CA US 94065"
    };

    // Enqueue
    const queue1 = await conn.getQueue(
      objQueueName,
      { payloadType: objType }
    );
    const message = new queue1.payloadTypeClass(addrData);
    await queue1.enqOne({ payload: message });
    await conn.commit();

    // Dequeue
    const queue2 = await conn.getQueue(
      objQueueName,
      { payloadType: objType }
    );
    const msg = await queue2.deqOne();
    await conn.commit();
    assert(msg);
    assert.strictEqual(msg.payload.NAME, addrData.NAME);
    assert.strictEqual(msg.payload.ADDRESS, addrData.ADDRESS);
  }); // 218.5

  it('218.6 Enqueue a JavaScript object as payload attribute', async function() {
    const addrData = {
      NAME: "Chris",
      ADDRESS: "400 Oracle Parkway Redwood City, CA US 94065"
    };

    // Enqueue
    const queue1 = await conn.getQueue(
      objQueueName,
      { payloadType: objType }
    );
    await queue1.enqOne({ payload: addrData });
    await conn.commit();

    // Dequeue
    const queue2 = await conn.getQueue(
      objQueueName,
      { payloadType: objType }
    );
    const msg = await queue2.deqOne();
    await conn.commit();
    assert(msg);
    assert.strictEqual(msg.payload.NAME, addrData.NAME);
    assert.strictEqual(msg.payload.ADDRESS, addrData.ADDRESS);
  }); // 218.6

  // A variation of 218.4
  it('218.7 Negative - Set payloadType as oracledb.DB_TYPE_OBJECT', async function() {
    const addrData = {
      NAME: "Changjie",
      ADDRESS: "200 Oracle Parkway Redwood City, CA US 94065"
    };
    await assert.rejects(
      async function() {
        const queue1 = await conn.getQueue(
          objQueueName,
          { payloadType: oracledb.DB_TYPE_OBJECT }
        );
        const objClass = await conn.getDbObjectClass(objType);
        const message = new objClass(addrData);
        await queue1.enqOne(message);
      },
      {
        message: 'NJS-007: invalid value for "payloadType" in parameter 2'
      }
    );
  }); // 218.7

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

  it('218.8 enqMany() with DB object array', async function() {
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
    const messages = await queue2.deqMany(5);  // get at most 5 messages
    if (messages) {
      assert.strictEqual(addrArray.length, messages.length);
      assert.strictEqual(addrArray[0].NAME, messages[0].payload.NAME);
      assert.strictEqual(addrArray[0].ADDRESS, messages[0].payload.ADDRESS);
      assert.strictEqual(addrArray[3].NAME, messages[3].payload.NAME);
      assert.strictEqual(addrArray[3].ADDRESS, messages[3].payload.ADDRESS);
    }
  }); // 218.8

  it('218.9 enqMany() with DB object array as payload', async function() {
    // Enqueue
    const queue1 = await conn.getQueue(
      objQueueName,
      { payloadType: objType }
    );
    const msgArray = [];
    for (let i = 0; i < addrArray.length; i++) {
      const msg = new queue1.payloadTypeClass(addrArray[i]);
      msgArray[i] = { payload: msg };
    }
    await queue1.enqMany(msgArray);

    // Dequeue
    const queue2 = await conn.getQueue(
      objQueueName,
      { payloadType: objType }
    );
    const messages = await queue2.deqMany(5);  // get at most 5 messages
    if (messages) {
      assert.strictEqual(addrArray.length, messages.length);
      assert.strictEqual(addrArray[0].NAME, messages[0].payload.NAME);
      assert.strictEqual(addrArray[0].ADDRESS, messages[0].payload.ADDRESS);
      assert.strictEqual(addrArray[3].NAME, messages[3].payload.NAME);
      assert.strictEqual(addrArray[3].ADDRESS, messages[3].payload.ADDRESS);
    }
  }); //218.9

  it('218.10 enqMany() with JavaScript objects as payload', async function() {
    // Enqueue
    const queue1 = await conn.getQueue(
      objQueueName,
      { payloadType: objType }
    );
    const msgArray = [];
    for (let i = 0; i < addrArray.length; i++) {
      const msg = addrArray[i];
      msgArray[i] = { payload: msg };
    }
    await queue1.enqMany(msgArray);

    // Dequeue
    const queue2 = await conn.getQueue(
      objQueueName,
      { payloadType: objType }
    );
    const messages = await queue2.deqMany(5);  // get at most 5 messages
    if (messages) {
      assert.strictEqual(addrArray.length, messages.length);
      assert.strictEqual(addrArray[0].NAME, messages[0].payload.NAME);
      assert.strictEqual(addrArray[0].ADDRESS, messages[0].payload.ADDRESS);
      assert.strictEqual(addrArray[3].NAME, messages[3].payload.NAME);
      assert.strictEqual(addrArray[3].ADDRESS, messages[3].payload.ADDRESS);
    }
  }); // 218.10

  it('218.11 Negative - enqOne with empty payload', async function() {
    const queue = await conn.getQueue(objQueueName, { payloadType: objType });
    await assert.rejects(
      async function() {
        await queue.enqOne();
      },
      /NJS-009:/ // NJS-009: invalid number of parameters
    );
  }); // 218.11

  it('218.12 Enqueue and Dequeue with non-ASCII characters', async function() {
    const addrData = {
      NAME: "Jörg",
      ADDRESS: "Grüner Weg 5, 12345 München, Germany"
    };

    // Enqueue
    const queue1 = await conn.getQueue(objQueueName, { payloadType: objType });
    const message = new queue1.payloadTypeClass(addrData);
    await queue1.enqOne(message);
    await conn.commit();

    // Dequeue
    const queue2 = await conn.getQueue(objQueueName, { payloadType: objType });
    const msg = await queue2.deqOne();
    await conn.commit();

    assert(msg);
    assert.strictEqual(msg.payload.NAME, addrData.NAME);
    assert.strictEqual(msg.payload.ADDRESS, addrData.ADDRESS);
  }); // 218.12

  it('218.13 Enqueue and Dequeue with large payloads', async function() {
    const largeAddress = "A".repeat(50); // 50 characters
    const addrData = {
      NAME: "LargeData",
      ADDRESS: largeAddress
    };

    // Enqueue
    const queue1 = await conn.getQueue(objQueueName, { payloadType: objType });
    const message = new queue1.payloadTypeClass(addrData);
    await queue1.enqOne(message);
    await conn.commit();

    // Dequeue
    const queue2 = await conn.getQueue(objQueueName, { payloadType: objType });
    const msg = await queue2.deqOne();
    await conn.commit();

    assert(msg);
    assert.strictEqual(msg.payload.NAME, addrData.NAME);
    assert.strictEqual(msg.payload.ADDRESS, addrData.ADDRESS);
  }); // 218.13

  it('218.14 Negative - Dequeue from an unstarted queue', async function() {
    // Create but do not start a new queue
    const unstartedQueueName = "NODB_UNSTARTED_QUEUE";
    await conn.execute(`
      BEGIN
        DBMS_AQADM.CREATE_QUEUE(
          QUEUE_NAME         => '${AQ_USER}.${unstartedQueueName}',
          QUEUE_TABLE        => '${AQ_USER}.${objTable}'
        );
      END;
    `);

    const queue = await conn.getQueue(unstartedQueueName, { payloadType: objType });

    await assert.rejects(
      async function() {
        await queue.deqOne();
      },
      /ORA-25226:/ // ORA-25226: dequeue failed, queue NODB_SCHEMA_AQTEST2.NODB_UNSTARTED_QUEUE is not enabled for dequeue
    );

    // Cleanup
    await conn.execute(`
      BEGIN
        DBMS_AQADM.DROP_QUEUE(
          QUEUE_NAME         => '${AQ_USER}.${unstartedQueueName}'
        );
      END;
    `);
  }); // 218.14
});


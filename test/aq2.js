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
 *   218. aq2.js
 *
 * DESCRIPTION
 *   Test Oracle Advanced Queueing (AQ).
 *   The test version of examples/aqobject.js
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
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

  it('218.1 examples/aqobject.js', async () => {
    try {
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
      should.exist(msg);
      should.strictEqual(msg.payload.NAME, addrData.NAME);
      should.strictEqual(msg.payload.ADDRESS, addrData.ADDRESS);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 218.1

  it.skip('218.2 The read-only property "payloadTypeClass"', async () => {
    try {
      const queue = await conn.getQueue(objQueueName, { payloadType: objType });
      const t = queue.payloadTypeClass;
      should.exist(t);
      queue.payloadTypeClass = {'foo': 'bar'};

      console.log(queue);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 218.2

  it('218.3 Negative - enqueue a raw JavaScript object directly', async () => {
    try {
      const addrData = {
        NAME: "John Smith",
        ADDRESS: "100 Oracle Parkway Redwood City, CA US 94065"
      };

      // Enqueue
      const queue1 = await conn.getQueue(
        objQueueName,
        { payloadType: objType }
      );
      testsUtil.assertThrowsAsync(
        async () => {
          await queue1.enqOne(addrData);
        },
        /NJS-070/
      );
      /* NJS-070: message must be a string, buffer, database object or
      an object containing a payload property which itself is a string,
      buffer or database object */

    } catch (err) {
      should.not.exist(err);
    }
  }); // 218.3

  it('218.4 Negative - getQueue() without options on DB Object data', async () => {
    try {
      const addrData = {
        NAME: "Changjie",
        ADDRESS: "200 Oracle Parkway Redwood City, CA US 94065"
      };
      await assert.rejects(
        async () => {
          const queue1 = await conn.getQueue(objQueueName);
          const objClass = await conn.getDbObjectClass(objType);
          const message = new objClass(addrData);
          await queue1.enqOne(message);
        },
        /DPI-1071/
      );
      // DPI-1071: payload type in message properties must match
      // the payload type of the queue
    } catch (err) {
      should.not.exist(err);
    }
  }); // 218.4

  it('218.5 Enqueue a DB object as payload attribute', async () => {
    try {
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
      should.exist(msg);
      should.strictEqual(msg.payload.NAME, addrData.NAME);
      should.strictEqual(msg.payload.ADDRESS, addrData.ADDRESS);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 218.5

  it('218.6 Enqueue a JavaScript object as payload attribute', async () => {
    try {
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
      should.exist(msg);
      should.strictEqual(msg.payload.NAME, addrData.NAME);
      should.strictEqual(msg.payload.ADDRESS, addrData.ADDRESS);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 218.6

  // A variation of 218.4
  it('218.7 Negative - Set payloadType as oracledb.DB_TYPE_OBJECT', async () => {
    try {
      const addrData = {
        NAME: "Changjie",
        ADDRESS: "200 Oracle Parkway Redwood City, CA US 94065"
      };
      await assert.rejects(
        async () => {
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
    } catch (err) {
      should.not.exist(err);
    }
  }); // 218.7
});

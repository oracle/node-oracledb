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
 *   302. aq10.js
 *
 * DESCRIPTION
 *   Test Oracle Advanced Queueing (AQ) condition attribute.
 *   condition: A String that defines the condition that must be satisfied
 *              in order for a message to be dequeued.
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');
const assert    = require('assert');

describe('302. aq10.js', function() {
  let isRunnable = true;
  let conn;
  const AQ_USER = 'NODB_SCHEMA_AQTEST10';
  const AQ_USER_PWD = testsUtil.generateRandomPassword();

  const objQueueName = "NODB_ADDR_QUEUE";
  const objType = "NODB_ADDR_TYP";
  const objTable = "NODB_TAB_ADDR";

  before(async function() {
    const prerequisites = await testsUtil.checkPrerequisites(2100000000, 2100000000);
    if (!dbConfig.test.DBA_PRIVILEGE || !prerequisites) {
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

  after (async function() {
    if (!isRunnable) return;

    await conn.execute(`
    BEGIN
      DBMS_AQADM.STOP_QUEUE('${AQ_USER}.${objQueueName}');
    END; `);
    await conn.execute(`
    BEGIN
      DBMS_AQADM.DROP_QUEUE_TABLE(
        QUEUE_TABLE         => '${AQ_USER}.${objTable}',
        FORCE               => TRUE);
    END; `);

    await conn.execute(`DROP TYPE ${objType}`);
    await conn.close();
    await testsUtil.dropAQtestUser(AQ_USER);
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

  it('302.1 condition attribute in dequeue', async function() {
    // Enqueue
    const queue = await conn.getQueue(
      objQueueName,
      { payloadType: objType }
    );
    const message1 = new queue.payloadTypeClass(addrData1);
    await queue.enqOne(message1);
    await conn.commit();

    const message2 = new queue.payloadTypeClass(addrData2);
    await queue.enqOne(message2);
    await conn.commit();

    const message3 = new queue.payloadTypeClass(addrData3);
    await queue.enqOne(message3);
    await conn.commit();

    // Dequeue
    const queue2 = await conn.getQueue(
      objQueueName,
      { payloadType: objType }
    );

    queue2.deqOptions.condition = `tab.user_data.NAME = '${addrData2.NAME}'`;
    const msgDeq = await queue2.deqOne();
    assert.strictEqual(msgDeq.payload.NAME, addrData2.NAME);
    assert.strictEqual(msgDeq.payload.ADDRESS, addrData2.ADDRESS);
  }); // 302.1

  it('302.2 Negative - wrong identifier in condition attribute', async function() {
    // Dequeue
    const queue2 = await conn.getQueue(
      objQueueName,
      { payloadType: objType }
    );

    queue2.deqOptions.condition = `someString.NAME = '${addrData2.NAME}'`;
    await assert.rejects(async () =>
      await queue2.deqOne(),
    /ORA-00904:/ //ORA-00904: "SOMESTRING"."NAME": invalid identifier
    );
    assert.strictEqual(queue2.deqOptions.condition, `someString.NAME = '${addrData2.NAME}'`);
  }); // 302.2
});

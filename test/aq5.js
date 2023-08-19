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
 *   283. aq5.js
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


describe('283.aq5.js', function() {

  let isRunnable = true;
  let conn;
  let origEvents;

  const AQ_USER = 'NODB_SCHEMA_AQTEST5';
  const AQ_USER_PWD = testsUtil.generateRandomPassword();

  const objQueueName = "NODB_ADDR_QUEUE";
  const objTable = "NODB_TAB_ADDR";

  before(async function() {
    if (!dbConfig.test.DBA_PRIVILEGE || oracledb.thin) {
      isRunnable = false;
    }

    if (!isRunnable) {
      this.skip();
    } else {
      origEvents = oracledb.events;
      oracledb.events = true;
      await testsUtil.createAQtestUser(AQ_USER, AQ_USER_PWD);

      const credential = {
        user:          AQ_USER,
        password:      AQ_USER_PWD,
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
      await conn.commit ();
    }
  });    //before

  after(async function() {
    if (!isRunnable) {
      return;
    } else {
      oracledb.events = origEvents;
      await conn.close();
      await testsUtil.dropAQtestUser(AQ_USER);
    }
  });

  it('283.1 subscribe dequeue messages', async () => {
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
    await conn.commit ();


    // Dequeue
    const queue2 = await conn.getQueue(objQueueName);
    const msg = await queue2.deqOne ();
    await conn.commit ();
    assert(msg);

    await conn.unsubscribe(objQueueName);
  });

});

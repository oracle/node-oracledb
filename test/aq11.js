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
 *   303. aq11.js
 *
 * DESCRIPTION
 *   Test Oracle Advanced Queueing (AQ) dequeue option Dequeue Mode.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('303. aq11.js', function() {

  let isRunnable = true, g_index = 0;
  let conn, credential;
  const AQ_USER = 'NODB_SCHEMA_AQTEST11';
  const AQ_USER_PWD = testsUtil.generateRandomPassword();

  before(async function() {
    if (!dbConfig.test.DBA_PRIVILEGE) {
      isRunnable = false;
    }

    if (!isRunnable) {
      this.skip();
    } else {
      await testsUtil.createAQtestUser(AQ_USER, AQ_USER_PWD);

      credential = {
        user: AQ_USER,
        password: AQ_USER_PWD,
        connectString: dbConfig.connectString
      };
      const dbaCredential = {...dbConfig, privilege: oracledb.SYSDBA};
      dbaCredential.user = dbConfig.test.DBA_user;
      dbaCredential.password = dbConfig.test.DBA_password;

      const dbaConn = await oracledb.getConnection(dbaCredential);
      await dbaConn.execute(`GRANT EXECUTE ON DBMS_AQ to ${AQ_USER}`);
      await dbaConn.execute(`GRANT EXECUTE ON DBMS_AQADM to ${AQ_USER}`);
      await dbaConn.execute(`GRANT AQ_ADMINISTRATOR_ROLE TO ${AQ_USER}`);
      await dbaConn.execute(`GRANT ADMINISTER DATABASE TRIGGER TO ${AQ_USER}`);
      await dbaConn.release();

      conn = await oracledb.getConnection(credential);
      await conn.execute(`CREATE OR REPLACE TYPE ${AQ_USER}.MESSAGE_TYP AS object(
        attr1 NUMBER,
        attr2 VARCHAR2(30),
        attr3 VARCHAR2(1000))`);

      // Create the queue table
      await conn.execute(`
  BEGIN
    DBMS_AQADM.CREATE_QUEUE_TABLE(
      QUEUE_TABLE        => '${AQ_USER}.OBJ_SINGLE_QUEUE_TABLE',
      QUEUE_PAYLOAD_TYPE => '${AQ_USER}.MESSAGE_TYP',
      COMPATIBLE         => '10.0'
    );
  END;
`);

      // Create the queue
      await conn.execute(`
  BEGIN
    DBMS_AQADM.CREATE_QUEUE(
      QUEUE_NAME  => '${AQ_USER}.OBJECT_SINGLE_QUEUE',
      QUEUE_TABLE => '${AQ_USER}.OBJ_SINGLE_QUEUE_TABLE'
    );
  END;
`);

      // Start the queue
      await conn.execute(`
  BEGIN
    DBMS_AQADM.START_QUEUE('${AQ_USER}.OBJECT_SINGLE_QUEUE');
  END;
`);
    }
  }); // before()

  after(async function() {
    if (!isRunnable) {
      return;
    } else {
      // Stop the queue
      await conn.execute(`
    BEGIN
      DBMS_AQADM.STOP_QUEUE('${AQ_USER}.OBJECT_SINGLE_QUEUE');
    END;
  `);

      // Drop the queue
      await conn.execute(`
    BEGIN
      DBMS_AQADM.DROP_QUEUE('${AQ_USER}.OBJECT_SINGLE_QUEUE');
    END;
  `);

      // Drop the queue table
      await conn.execute(`
    BEGIN
      DBMS_AQADM.DROP_QUEUE_TABLE('${AQ_USER}.OBJ_SINGLE_QUEUE_TABLE');
    END;
  `);

      await conn.execute(`DROP TYPE ${AQ_USER}.MESSAGE_TYP`);
      await conn.close();
      await testsUtil.dropAQtestUser(AQ_USER);
    }
  }); // after()

  /**
 * This test case verifies the behavior of the default dequeue mode (DEQUEUE_REMOVE).
 * The following scenarios are tested:
 * 1. Create a queue and enqueue messages in the sequence A, B, and C.
 * 2. Use connection ONE with auto-commit disabled to dequeue a message with the default option (DEQUEUE_REMOVE).
 * 3. Use connection TWO with auto-commit disabled to dequeue a message with the default option (DEQUEUE_REMOVE).
 * 4. Close both connection ONE and connection TWO.
 * 5. Use connection THREE to dequeue messages starting from the first message with the default option (DEQUEUE_REMOVE).
 *
 * Expected results:
 * - Message A is dequeued by both connection ONE and connection TWO.
 * - Connection THREE dequeues messages B and C in sequence.
 * - Changing the dequeue mode to DEQUEUE_REMOVE explicitly yields the same result.
 */
  it('303.1 enqueue/dequeue with modes', async function() {
    const MESSAGE_TYP  = `${AQ_USER}.MESSAGE_TYP`;
    const SINGLE_QUEUE = `${AQ_USER}.OBJECT_SINGLE_QUEUE`;

    // Step 1: Get the queue object for enqueuing messages
    const queue1 = await conn.getQueue(SINGLE_QUEUE, {payloadType: MESSAGE_TYP});

    // Step 2: Set enqueue options to make the message visible immediately
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;

    // Step 3: Enqueue multiple messages

    const messages = [
      "This is message A",
      "This is message B",
      "This is message C"
    ];

    for (let i = 0; i < messages.length; i++) {
      const messageString = {
        ATTR1: g_index++,
        ATTR2: 'attr1 value',
        ATTR3: messages[i]
      };
      await queue1.enqOne({ payload: messageString });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Step 4: Dequeue with connection ONE
    const connOne = await oracledb.getConnection(credential);
    const queue2 = await connOne.getQueue(SINGLE_QUEUE, {payloadType: MESSAGE_TYP});

    Object.assign(queue2.deqOptions, {
      mode: oracledb.AQ_DEQ_MODE_REMOVE,
      visibility: oracledb.AQ_VISIBILITY_ON_COMMIT,
      navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
      wait: oracledb.AQ_DEQ_NO_WAIT
    });
    assert.strictEqual(queue2.deqOptions.mode, oracledb.AQ_DEQ_MODE_REMOVE);

    let msg = await queue2.deqOne();
    assert.deepStrictEqual(JSON.stringify(msg.payload), '{"ATTR1":0,"ATTR2":"attr1 value","ATTR3":"This is message A"}');
    await connOne.close();

    // Step 5: Dequeue with connection TWO
    const connTwo = await oracledb.getConnection(credential);

    const queue3 = await connTwo.getQueue(SINGLE_QUEUE, {payloadType: MESSAGE_TYP});
    Object.assign(queue3.deqOptions, {
      mode: oracledb.AQ_DEQ_MODE_REMOVE,
      visibility: oracledb.AQ_VISIBILITY_ON_COMMIT,
      navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
    });
    msg = await queue3.deqOne();

    assert.strictEqual(queue3.deqOptions.mode, oracledb.AQ_DEQ_MODE_REMOVE);
    assert.deepStrictEqual(JSON.stringify(msg.payload), '{"ATTR1":0,"ATTR2":"attr1 value","ATTR3":"This is message A"}');

    await connTwo.commit();
    await connTwo.close();

    // Step 6: Dequeue with connection THREE
    const connThr = await oracledb.getConnection(credential);
    const queue4 = await connThr.getQueue(SINGLE_QUEUE, {payloadType: MESSAGE_TYP});
    Object.assign(queue4.deqOptions, {
      mode: oracledb.AQ_DEQ_MODE_REMOVE,
      visibility: oracledb.AQ_VISIBILITY_IMMEDIATE,
      navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
      wait: oracledb.AQ_DEQ_NO_WAIT,
    });
    msg = await queue4.deqOne();

    assert.strictEqual(queue2.deqOptions.mode, oracledb.AQ_DEQ_MODE_REMOVE);
    assert.deepStrictEqual(JSON.stringify(msg.payload), '{"ATTR1":1,"ATTR2":"attr1 value","ATTR3":"This is message B"}');

    msg = await queue4.deqOne();
    assert.deepStrictEqual(JSON.stringify(msg.payload), '{"ATTR1":2,"ATTR2":"attr1 value","ATTR3":"This is message C"}');

    await connThr.close();
  }); // 303.1
});

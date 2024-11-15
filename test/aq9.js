/* Copyright (c) 2024, Oracle and/or its affiliates. */

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
 *   301. aq9.js
 *
 * DESCRIPTION
 *   Test Oracle Advanced Queueing (AQ) transformation attribute.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('301. aq9.js', function() {
  let isRunnable = true;
  let conn;
  const AQ_USER = 'NODB_SCHEMA_AQTEST9';
  const AQ_USER_PWD = testsUtil.generateRandomPassword();
  const MESSAGE_TYP = `${AQ_USER}.MESSAGE_TYP`;
  const ORDER_TYP   = `${AQ_USER}.ORDER_TYP`;

  before(async function() {
    const initConn = await oracledb.getConnection(dbConfig);
    const dbVersion = initConn.oracleServerVersion;
    await initConn.close();

    if (!dbConfig.test.DBA_PRIVILEGE || oracledb.thin || dbVersion < 1900000000
      || testsUtil.getClientVersion() < 2306000000) {
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

      await conn.execute(
        `CREATE OR REPLACE TYPE ${AQ_USER}.MESSAGE_TYP AS object(
            attr1 NUMBER,
            attr2 VARCHAR2(30),
            attr3 VARCHAR2(1000))`
      );

      await conn.execute(`
         CREATE OR REPLACE TYPE ${AQ_USER}.ORDER_TYP AS object(
            sender_id NUMBER,
            subject VARCHAR2(30),
            text VARCHAR2(1000))`
      );

      await conn.execute(`
            BEGIN
               DBMS_TRANSFORM.CREATE_TRANSFORMATION(
                  schema         => '${AQ_USER}',
                  name           => 'message_order_transform',
                  from_schema    => '${AQ_USER}',
                  from_type      => 'MESSAGE_TYP',
                  to_schema      => '${AQ_USER}',
                  to_type        => 'ORDER_TYP',
                  transformation => '${AQ_USER}.ORDER_TYP(
                     source.user_data.attr1,
                     source.user_data.attr2,
                     source.user_data.attr3)');
            END;
            `);

      await conn.execute(`
                BEGIN
                   DBMS_TRANSFORM.CREATE_TRANSFORMATION(
                      schema         => '${AQ_USER}',
                      name           => 'order_message_transform',
                      from_schema    => '${AQ_USER}',
                      from_type      => 'ORDER_TYP',
                      to_schema      => '${AQ_USER}',
                      to_type        => 'MESSAGE_TYP',
                      transformation => '${AQ_USER}.MESSAGE_TYP(
                         source.user_data.sender_id,
                         source.user_data.subject,
                         source.user_data.text)');
                END;
                `);

      // create a single consumer OBJECT queue:
      await conn.execute(`
        BEGIN
        DBMS_AQADM.CREATE_QUEUE_TABLE(
           QUEUE_TABLE        =>  '${AQ_USER}.OBJ_SINGLE_QUEUE_TABLE',
           QUEUE_PAYLOAD_TYPE =>  '${AQ_USER}.ORDER_TYP',
           COMPATIBLE         =>  '10.0');
        END; `);

      await conn.execute(`
        BEGIN
        DBMS_AQADM.CREATE_QUEUE(
            QUEUE_NAME     =>   '${AQ_USER}.OBJECT_SINGLE_QUEUE',
            QUEUE_TABLE    =>   '${AQ_USER}.OBJ_SINGLE_QUEUE_TABLE');
        END;  `);
      await conn.execute(`
        BEGIN
          DBMS_AQADM.START_QUEUE('${AQ_USER}.OBJECT_SINGLE_QUEUE');
        END; `);

      // create a multi consumer OBJECT queue:
      await conn.execute(`
        BEGIN
        DBMS_AQADM.CREATE_QUEUE_TABLE(
           QUEUE_TABLE        =>  '${AQ_USER}.OBJ_MULTIPLE_QUEUE_TABLE',
           QUEUE_PAYLOAD_TYPE =>  '${AQ_USER}.ORDER_TYP',
           MULTIPLE_CONSUMERS =>  TRUE,
           COMPATIBLE         =>  '10.0');
        END; `);

      await conn.execute(`
        BEGIN
        DBMS_AQADM.CREATE_QUEUE(
            QUEUE_NAME     =>   '${AQ_USER}.OBJECT_MULTIPLE_QUEUE',
            QUEUE_TABLE    =>   '${AQ_USER}.OBJ_MULTIPLE_QUEUE_TABLE');
        END;  `);
      await conn.execute(`
        BEGIN
          DBMS_AQADM.START_QUEUE('${AQ_USER}.OBJECT_MULTIPLE_QUEUE');
        END; `);
    }
  }); // before()

  after(async function() {
    if (!isRunnable) {
      return;
    } else {
      await conn.execute(`
            BEGIN
               DBMS_TRANSFORM.DROP_TRANSFORMATION(
                  schema         => '${AQ_USER}',
                  name           => 'message_order_transform');
            END; `);

      await conn.execute(`
            BEGIN
               DBMS_TRANSFORM.DROP_TRANSFORMATION(
                  schema         => '${AQ_USER}',
                  name           => 'order_message_transform');
            END; `);

      await conn.execute(`
            BEGIN
              DBMS_AQADM.STOP_QUEUE('${AQ_USER}.OBJECT_SINGLE_QUEUE');
            END; `);

      await conn.execute(`
            BEGIN
              DBMS_AQADM.DROP_QUEUE_TABLE(
                QUEUE_TABLE         => '${AQ_USER}.OBJ_SINGLE_QUEUE_TABLE',
                FORCE               => TRUE);
            END; `);

      await conn.execute(`
            BEGIN
              DBMS_AQADM.STOP_QUEUE('${AQ_USER}.OBJECT_MULTIPLE_QUEUE');
            END; `);

      await conn.execute(`
            BEGIN
              DBMS_AQADM.DROP_QUEUE_TABLE(
                QUEUE_TABLE         => '${AQ_USER}.OBJ_MULTIPLE_QUEUE_TABLE',
                FORCE               => TRUE);
            END; `);

      await conn.execute(`DROP TYPE ${AQ_USER}.MESSAGE_TYP`);
      await conn.close();
      await testsUtil.dropAQtestUser(AQ_USER);
    }
  }); // after()

  // Test with single consumer queue
  // enqueue with transformation, message_order_transform
  it('301.1 Enqueue messages with transformation single user queue', async () => {
    const queue1 = await conn.getQueue('OBJECT_SINGLE_QUEUE', {payloadType: MESSAGE_TYP});
    const messageString = {
      ATTR1: 1,  // Ensure attribute names and types match MESSAGE_TYP
      ATTR2: 'Some important data',
      ATTR3: 'Some text'
    };
    // Send a message immediately without requiring a commit
    queue1.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    queue1.enqOptions.transformation = 'message_order_transform';
    await queue1.enqOne({
      payload: messageString
    });
    assert.strictEqual(queue1.enqOptions.transformation, 'message_order_transform');

    // Dequeue operation without transformation
    const queue2 = await conn.getQueue(
      'OBJECT_SINGLE_QUEUE',
      { payloadType: ORDER_TYP }
    );
    Object.assign(
      queue2.deqOptions
    );
    assert.strictEqual(queue2.deqOptions.transformation, '');
    const msg = await queue2.deqOne();

    assert.deepStrictEqual(JSON.stringify(msg.payload),
      '{"SENDER_ID":1,"SUBJECT":"Some important data","TEXT":"Some text"}');
  }); // 301.1

  // Test with multi consumer queue
  // enqueue with transformation, message_order_transform
  it('301.2 Enqueue messages with transformation on multiple users', async () => {
    const queue1 = await conn.getQueue('OBJECT_MULTIPLE_QUEUE', {payloadType: MESSAGE_TYP});
    const messageString = {
      ATTR1: 1,  // Ensure attribute names and types match MESSAGE_TYP
      ATTR2: 'Some important data',
      ATTR3: 'Some text'
    };

    queue1.enqOptions.transformation = 'message_order_transform';

    await queue1.enqOne({
      payload: messageString,
      recipients: ["sub1"]
    });

    assert.strictEqual(queue1.enqOptions.transformation, 'message_order_transform');
    await conn.commit();

    // Dequeue operation without transformation
    const queue2 = await conn.getQueue(
      'OBJECT_MULTIPLE_QUEUE',
      { payloadType: ORDER_TYP }
    );
    Object.assign(
      queue2.deqOptions,
      { consumerName: "sub1" }
    );

    assert.strictEqual(queue2.deqOptions.transformation, '');

    const msg = await queue2.deqOne();

    assert.deepStrictEqual(JSON.stringify(msg.payload),
      '{"SENDER_ID":1,"SUBJECT":"Some important data","TEXT":"Some text"}');
  }); // 301.2

  // Test with single consumer queue
  // enqueue with transformation, message_order_transform
  it('301.3 Enqueue and dequeue messages with transformation on single user queue', async () => {
    const queue1 = await conn.getQueue('OBJECT_SINGLE_QUEUE', {payloadType: MESSAGE_TYP});
    const messageString = {
      ATTR1: 1,  // Ensure attribute names and types match MESSAGE_TYP
      ATTR2: 'Some important data',
      ATTR3: 'Some text'
    };

    queue1.enqOptions.transformation = 'message_order_transform';

    await queue1.enqOne({
      payload: messageString
    });
    assert.strictEqual(queue1.enqOptions.transformation, 'message_order_transform');
    await conn.commit();

    // Dequeue operation with transformation
    const queue2 = await conn.getQueue(
      'OBJECT_SINGLE_QUEUE',
      { payloadType: MESSAGE_TYP }
    );
    Object.assign(
      queue2.deqOptions
    );
    queue2.deqOptions.transformation = 'order_message_transform';
    assert.strictEqual(queue2.deqOptions.transformation, 'order_message_transform');
    const msg = await queue2.deqOne();

    assert.deepStrictEqual(JSON.stringify(msg.payload),
      '{"ATTR1":1,"ATTR2":"Some important data","ATTR3":"Some text"}');
  }); 301.3;

  // Test with multi consumer queue
  // enqueue with transformation, message_order_transform
  // dequeue with transformation, order_message_transform
  it('301.4 Enqueue and dequeue messages with transformation on multiple user queue', async () => {
    const queue1 = await conn.getQueue('OBJECT_MULTIPLE_QUEUE', {payloadType: MESSAGE_TYP});
    const messageString = {
      ATTR1: 1,  // Ensure attribute names and types match MESSAGE_TYP
      ATTR2: 'Some important data',
      ATTR3: 'Some text'
    };

    queue1.enqOptions.transformation = 'message_order_transform';

    await queue1.enqOne({
      payload: messageString,
      recipients: ["sub1"]
    });
    assert.strictEqual(queue1.enqOptions.transformation, 'message_order_transform');
    await conn.commit();

    // Dequeue operation with transformation
    const queue2 = await conn.getQueue(
      'OBJECT_MULTIPLE_QUEUE',
      { payloadType: MESSAGE_TYP }
    );
    Object.assign(
      queue2.deqOptions,
      { consumerName: "sub1" }
    );
    queue2.deqOptions.transformation = 'order_message_transform';
    assert.strictEqual(queue2.deqOptions.transformation, 'order_message_transform');
    const msg = await queue2.deqOne();

    assert.deepStrictEqual(JSON.stringify(msg.payload),
      '{"ATTR1":1,"ATTR2":"Some important data","ATTR3":"Some text"}');
  }); 301.4;
});

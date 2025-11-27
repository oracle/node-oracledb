/* Copyright (c) 2025, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   319. teq.js
 *
 * DESCRIPTION
 *   Test Transactional Event Queue (TxEventQ).
 *****************************************************************************/

'use strict';

const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');
const assert    = require('assert');

describe('319. teq.js', function() {

  let conn;
  let isRunnable = false;

  const TEQ_USER     = 'NODB_SCHEMA_TEQTEST';
  const TEQ_USER_PWD = testsUtil.generateRandomPassword();

  const credential = {
    user: TEQ_USER,
    password: TEQ_USER_PWD,
    connectString: dbConfig.connectString
  };

  before(async function() {
    if (!dbConfig.test.DBA_PRIVILEGE) this.skip();

    isRunnable = await testsUtil.checkPrerequisites(2100000000, 2100000000);
    if (!isRunnable) this.skip();

    // create test user and connect
    await testsUtil.createAQtestUser(TEQ_USER, TEQ_USER_PWD);
    conn = await oracledb.getConnection(credential);

    // create ADT type
    await conn.execute(`
      CREATE OR REPLACE TYPE cars_sq AS OBJECT (
        carno NUMBER,
        make  VARCHAR2(1000),
        year  NUMBER,
        price NUMBER,
        color VARCHAR2(10)
      )
    `);

    // create transactional event queue (TEQ)
    const createTeq = async (name, payloadType) => {
      await conn.execute(`
        DECLARE
          qprops DBMS_AQADM.QUEUE_PROPS_T;
        BEGIN
          DBMS_AQADM.CREATE_TRANSACTIONAL_EVENT_QUEUE(
            queue_name         => '${name}',
            multiple_consumers => TRUE,
            queue_payload_type => '${payloadType}',
            queue_properties   => qprops
          );
          DBMS_AQADM.ADD_SUBSCRIBER(
            queue_name  => '${name}',
            subscriber  => sys.aq$_agent('py_sub', NULL, 0)
          );
          DBMS_AQADM.START_QUEUE(queue_name => '${name}');
        END;
      `);
    };

    // create sharded queue (SHQ)
    const createShq = async (name, payloadType) => {
      await conn.execute(`
        DECLARE
          qprops DBMS_AQADM.QUEUE_PROPS_T;
        BEGIN
          DBMS_AQADM.CREATE_SHARDED_QUEUE(
            queue_name => '${name}',
            multiple_consumers => TRUE
            ${payloadType ? `, queue_payload_type => '${payloadType}'` : ''}
          );
          DBMS_AQADM.ADD_SUBSCRIBER(queue_name => '${name}', subscriber => sys.aq$_agent('py_sub', NULL, 0));
          DBMS_AQADM.START_QUEUE(queue_name => '${name}');
        END;
      `);
    };

    await createTeq('RAW_TEQ',  'RAW');
    await createTeq('JSON_TEQ', 'JSON');
    await createTeq('CARS_TEQ', 'CARS_SQ');

    await createTeq('JMS_TEQ', 'JMS');

    // Create sharded queues used in tests under this schema
    await createShq('RAW_SHQ', 'RAW');
    await createShq('JSON_SHQ', 'JSON');
    await createShq('CARS_SHQ', 'CARS_SQ');

    await conn.commit();
  });

  after(async function() {
    if (!dbConfig.test.DBA_PRIVILEGE || !isRunnable) return;

    // Stop and drop all queues under the user
    if (conn) {
      await conn.execute(`
        BEGIN
          FOR r IN (SELECT name FROM user_queues) LOOP
            BEGIN
              DBMS_AQADM.STOP_QUEUE(queue_name => r.name);
              DBMS_AQADM.DROP_QUEUE(queue_name => r.name);
            EXCEPTION
              WHEN OTHERS THEN NULL;
            END;
          END LOOP;
        END;
      `);
      await conn.commit();
      await conn.close();
    }

    // Kill remaining sessions for the user
    const dbaConn = await oracledb.getConnection(dbConfig);
    await dbaConn.execute(`
      BEGIN
        FOR r IN (SELECT sid, serial# FROM v$session WHERE username = '${TEQ_USER.toUpperCase()}') LOOP
          EXECUTE IMMEDIATE 'ALTER SYSTEM KILL SESSION ''' || r.sid || ',' || r.serial# || ''' IMMEDIATE';
        END LOOP;
      END;
    `);
    await dbaConn.close();

    await testsUtil.dropAQtestUser(TEQ_USER);
  });

  it('319.1 Enqueue/Dequeue RAW message', async function() {
    const queue = await conn.getQueue('RAW_TEQ');
    await queue.enqOne({
      payload: Buffer.from('Hello RAW TEQ', 'utf8'),
      recipients: ['py_sub']
    });
    await conn.commit();

    queue.deqOptions.consumerName = 'py_sub';
    const msg = await queue.deqOne();
    assert(msg);
    assert.strictEqual(msg.payload.toString(), 'Hello RAW TEQ');
  }); // 319.1

  it('319.2 Enqueue/Dequeue JSON message', async function() {
    const queue = await conn.getQueue('JSON_TEQ', { payloadType: oracledb.DB_TYPE_JSON });
    const payload = { id: 1, type: 'json', msg: 'Hello JSON TEQ' };

    await queue.enqOne({ payload, recipients: ['py_sub'] });
    await conn.commit();

    queue.deqOptions.consumerName = 'py_sub';
    const msg = await queue.deqOne();
    assert.deepStrictEqual(msg.payload, payload);
  }); // 319.2

  it('319.3 Enqueue/Dequeue ADT', async function() {
    const queue = await conn.getQueue('CARS_TEQ', { payloadType: 'CARS_SQ' });
    const car = { CARNO: 10, MAKE: 'Tesla', YEAR: 2025, PRICE: 55000, COLOR: 'Red' };
    const carObj = new queue.payloadTypeClass(car);

    await queue.enqOne({ payload: carObj, recipients: ['py_sub'] });
    await conn.commit();

    queue.deqOptions.consumerName = 'py_sub';
    const msg = await queue.deqOne();
    assert.strictEqual(msg.payload.MAKE, 'Tesla');
    assert.strictEqual(msg.payload.COLOR, 'Red');
  }); // 319.3

  it('319.4 Enqueue/Dequeue multiple RAW messages', async function() {
    const queue = await conn.getQueue('RAW_TEQ');
    const messages = ['M1', 'M2', 'M3'].map(m => ({
      payload: Buffer.from(m, 'utf8'),
      recipients: ['py_sub']
    }));

    await queue.enqMany(messages);
    await conn.commit();

    queue.deqOptions.consumerName = 'py_sub';
    const deqMsgs = await queue.deqMany(10);
    const texts = deqMsgs.map(m => m.payload.toString());
    assert.deepStrictEqual(texts.sort(), ['M1', 'M2', 'M3']);
  }); // 319.4

  it('319.5 Enqueue/Dequeue multiple JSON messages', async function() {
    // Skipping this test in thick mode due to bug: 38603330
    if (!oracledb.thin) this.skip();
    const queue = await conn.getQueue('JSON_TEQ', { payloadType: oracledb.DB_TYPE_JSON });
    const msgs = [
      { id: 1, msg: 'J1' },
      { id: 2, msg: 'J2' },
      { id: 3, msg: 'J3' }
    ].map(p => ({ payload: p, recipients: ['py_sub'] }));

    await queue.enqMany(msgs);
    await conn.commit();
    queue.deqOptions.consumerName = 'py_sub';
    const received = await queue.deqMany(10);
    assert.strictEqual(received.length, 3);
    const ids = received.map(r => r.payload.id).sort();
    assert.deepStrictEqual(ids, [1, 2, 3]);
  }); // 319.5

  it('319.6 Enqueue/Dequeue multiple ADT messages', async function() {
    const queue = await conn.getQueue('CARS_TEQ', { payloadType: 'CARS_SQ' });
    const cars = [
      { CARNO: 1, MAKE: 'Tesla', YEAR: 2025, PRICE: 55000, COLOR: 'Red' },
      { CARNO: 2, MAKE: 'Audi', YEAR: 2024, PRICE: 45000, COLOR: 'Blue' }
    ].map(c => ({ payload: new queue.payloadTypeClass(c), recipients: ['py_sub'] }));

    await queue.enqMany(cars);
    await conn.commit();

    queue.deqOptions.consumerName = 'py_sub';
    const msgs = await queue.deqMany(10);
    assert.strictEqual(msgs.length, 2);
    const makes = msgs.map(m => m.payload.MAKE);
    assert.deepStrictEqual(makes.sort(), ['Audi', 'Tesla']);
  }); // 319.6

  it('319.7 Enqueue/Dequeue RAW Sharded Queue', async function() {
    const queue = await conn.getQueue('RAW_SHQ');
    await queue.enqOne({ payload: Buffer.from('RAW SHQ', 'utf8'), recipients: ['py_sub'] });
    await conn.commit();

    queue.deqOptions.consumerName = 'py_sub';
    const msg = await queue.deqOne();
    assert.strictEqual(msg.payload.toString(), 'RAW SHQ');
  }); // 319.7

  it('319.8 Enqueue/Dequeue JSON Sharded Queue', async function() {
    const queue = await conn.getQueue('JSON_SHQ', { payloadType: oracledb.DB_TYPE_JSON });
    const payload = { id: 99, msg: 'Hello JSON SHQ' };
    await queue.enqOne({ payload, recipients: ['py_sub'] });
    await conn.commit();

    queue.deqOptions.consumerName = 'py_sub';
    const msg = await queue.deqOne();
    assert.deepStrictEqual(msg.payload, payload);
  }); // 319.8

  it('319.9 Enqueue/Dequeue ADT Sharded Queue', async function() {
    const queue = await conn.getQueue('CARS_SHQ', { payloadType: 'CARS_SQ' });
    const car = { CARNO: 5, MAKE: 'BMW', YEAR: 2023, PRICE: 60000, COLOR: 'Black' };
    const carObj = new queue.payloadTypeClass(car);

    await queue.enqOne({ payload: carObj, recipients: ['py_sub'] });
    await conn.commit();

    queue.deqOptions.consumerName = 'py_sub';
    const msg = await queue.deqOne();
    assert.strictEqual(msg.payload.MAKE, 'BMW');
  }); // 319.9
});

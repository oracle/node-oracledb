/* Copyright (c) 2026, Oracle and/or its affiliates. */

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
 *   331. aq12.js
 *
 * DESCRIPTION
 *   Test AQ notifications with client-initiated subscriptions on sharded
 *   queues / TxEventQ. Thin mode supports AQ notifications only for these
 *   queues; classic AQ notification coverage remains in aq5.js for Thick mode.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');
const assert    = require('assert');

function verifyAqNotification(message) {
  assert.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_AQ);
  assert.strictEqual(message.dbName, undefined);
  assert.strictEqual(message.tables, undefined);
  assert.strictEqual(message.queries, undefined);
  assert(message.msgId.length > 0);
  assert(message.msgId instanceof Buffer);
  if (message.originalMsgId !== undefined)
    assert(message.originalMsgId instanceof Buffer);
  if (message.senderAgentName !== undefined)
    assert.strictEqual(typeof message.senderAgentName, 'string');
  if (message.senderAgentAddress !== undefined)
    assert.strictEqual(typeof message.senderAgentAddress, 'string');
  if (message.senderAgentProtocol !== undefined)
    assert.strictEqual(typeof message.senderAgentProtocol, 'number');
}

describe('331. aq12.js', function() {

  let conn;
  let userCreated = false;
  const AQ_USER = 'NODB_SCHEMA_AQTEST12';
  const AQ_USER_PWD = testsUtil.generateRandomPassword();
  const queueSuffix = `${process.pid}_${Date.now().toString(36)}`;
  const queueName = `NODB_AQ12_${queueSuffix}`;
  const queueName2 = `NODB_AQ12_2_${queueSuffix}`;
  const queueName3 = `NODB_AQ12_3_${queueSuffix}`;

  before(async function() {

    // Client-initiated AQ notifications on sharded/TxEventQ queues require
    // Oracle Database 19.4+. Thick mode also requires Oracle Client 19.4+.
    const hasRequiredVersions =
      await testsUtil.checkPrerequisites(1904000000, 1904000000);
    if (!dbConfig.test.DBA_PRIVILEGE || !hasRequiredVersions) {
      this.skip();
    }

    await testsUtil.createAQtestUser(AQ_USER, AQ_USER_PWD);
    userCreated = true;
    const connectionOptions = {
      user: AQ_USER,
      password: AQ_USER_PWD,
      connectString: dbConfig.connectString
    };
    if (!oracledb.thin) {
      connectionOptions.events = true;
    }
    conn = await oracledb.getConnection(connectionOptions);

    const plsql = `
      BEGIN
        DBMS_AQADM.CREATE_SHARDED_QUEUE(
          QUEUE_NAME         => '${AQ_USER}.${queueName}',
          QUEUE_PAYLOAD_TYPE => 'RAW'
        );
        DBMS_AQADM.CREATE_SHARDED_QUEUE(
          QUEUE_NAME         => '${AQ_USER}.${queueName2}',
          QUEUE_PAYLOAD_TYPE => 'RAW'
        );
        DBMS_AQADM.CREATE_SHARDED_QUEUE(
          QUEUE_NAME         => '${AQ_USER}.${queueName3}',
          QUEUE_PAYLOAD_TYPE => 'RAW'
        );
        DBMS_AQADM.START_QUEUE(
          QUEUE_NAME => '${AQ_USER}.${queueName}'
        );
        DBMS_AQADM.START_QUEUE(
          QUEUE_NAME => '${AQ_USER}.${queueName2}'
        );
        DBMS_AQADM.START_QUEUE(
          QUEUE_NAME => '${AQ_USER}.${queueName3}'
        );
      END;
    `;
    await conn.execute(plsql);
    await conn.commit();
  });

  after(async function() {
    if (conn) {
      await conn.close();
    }
    if (userCreated) {
      await testsUtil.dropAQtestUser(AQ_USER);
    }
  });

  it('331.1 subscribes to AQ notifications on a sharded queue',
    async function() {
      // Keep notification listening separate from AQ enqueue/dequeue work.
      const workConn = await oracledb.getConnection({
        user: AQ_USER,
        password: AQ_USER_PWD,
        connectString: dbConfig.connectString
      });
      let isSubscribed = false;
      let resolveNotification, rejectNotification;
      const notification = new Promise((resolve, reject) => {
        resolveNotification = resolve;
        rejectNotification = reject;
      });
      const timeout = setTimeout(() => {
        rejectNotification(new Error('Timed out waiting for AQ notification'));
      }, 10000);
      const options = {
        namespace: oracledb.SUBSCR_NAMESPACE_AQ,
        clientInitiated: true,
        callback(message) {
          verifyAqNotification(message);
          clearTimeout(timeout);
          resolveNotification(message);
        },
        timeout: 10
      };

      // Start empty so an earlier message cannot satisfy this notification.
      const queue = await workConn.getQueue(queueName);
      queue.deqOptions.wait = oracledb.AQ_DEQ_NO_WAIT;
      while (await queue.deqOne()) {
        // dequeue until empty
      }
      await workConn.commit();

      await conn.subscribe(queueName, options);
      isSubscribed = true;
      const enqMessage = await queue.enqOne('This is my message');
      await workConn.commit();

      const message = await notification;
      assert.deepStrictEqual(message.msgId, enqMessage.msgId);
      clearTimeout(timeout);
      if (isSubscribed)
        await conn.unsubscribe(queueName);
      await workConn.close();
    }); // 331.1

  it('331.2 receives two AQ notifications after one subscribe',
    async function() {
      const workConn = await oracledb.getConnection({
        user: AQ_USER,
        password: AQ_USER_PWD,
        connectString: dbConfig.connectString
      });
      let isSubscribed = false;
      const messages = [];
      let resolveFirst, rejectFirst, resolveAll, rejectAll;
      const firstNotification = new Promise((resolve, reject) => {
        resolveFirst = resolve;
        rejectFirst = reject;
      });
      const allNotifications = new Promise((resolve, reject) => {
        resolveAll = resolve;
        rejectAll = reject;
      });
      const timeout = setTimeout(() => {
        const err = new Error(`Timed out waiting for two AQ notifications; `
          + `received ${messages.length}`);
        rejectFirst(err);
        rejectAll(err);
      }, 10000);
      const options = {
        namespace: oracledb.SUBSCR_NAMESPACE_AQ,
        clientInitiated: true,
        callback(message) {
          verifyAqNotification(message);
          messages.push(message);
          if (messages.length === 1) {
            resolveFirst(message);
          } else if (messages.length === 2) {
            clearTimeout(timeout);
            resolveAll(messages);
          }
        },
        timeout: 10
      };

      const drainQueue = await workConn.getQueue(queueName);
      drainQueue.deqOptions.wait = oracledb.AQ_DEQ_NO_WAIT;
      while (await drainQueue.deqOne()) {
        // dequeue until empty
      }
      await workConn.commit();

      const queue = await workConn.getQueue(queueName);
      await conn.subscribe(queueName, options);
      isSubscribed = true;
      await queue.enqOne('AQ notification lifecycle message 1');
      await workConn.commit();
      await firstNotification;

      // The same subscription must receive the next enqueue without a
      // second subscribe() call; dequeue behavior is tested separately.
      await queue.enqOne('AQ notification lifecycle message 2');
      await workConn.commit();
      await allNotifications;
      clearTimeout(timeout);
      if (isSubscribed)
        await conn.unsubscribe(queueName);
      await workConn.close();
    }); // 331.2

  it('331.3 reuses an AQ subscription name without duplicate delivery',
    async function() {
      let notificationCount = 0;
      let resolveNotification, rejectNotification;
      const notification = new Promise((resolve, reject) => {
        resolveNotification = resolve;
        rejectNotification = reject;
      });
      const timeout = setTimeout(() => {
        rejectNotification(new Error('Timed out waiting for AQ notification'));
      }, 10000);
      const options = {
        namespace: oracledb.SUBSCR_NAMESPACE_AQ,
        clientInitiated: true,
        callback(message) {
          verifyAqNotification(message);
          notificationCount++;
          resolveNotification(message);
        },
        timeout: 300
      };

      await conn.subscribe(queueName2, options);
      await conn.subscribe(queueName2, {
        ...options,
        callback() {
          assert.fail('the original callback must be reused');
        }
      });
      const queue = await conn.getQueue(queueName2);
      await queue.enqOne('One notification only');
      await conn.commit();
      await notification;
      await testsUtil.sleep(500);
      assert.strictEqual(notificationCount, 1);
      clearTimeout(timeout);
      await conn.unsubscribe(queueName2);
    }); // 331.3

  it('331.4 keeps an AQ subscription active after pool release',
    async function() {
      const pool = await oracledb.createPool({
        user: AQ_USER,
        password: AQ_USER_PWD,
        connectString: dbConfig.connectString,
        poolMin: 0,
        poolMax: 2,
        events: !oracledb.thin
      });
      let subscribeConn, isSubscribed = false;
      let resolveNotification, rejectNotification;
      const notification = new Promise((resolve, reject) => {
        resolveNotification = resolve;
        rejectNotification = reject;
      });
      const timeout = setTimeout(() => {
        rejectNotification(new Error('Timed out waiting for AQ notification'));
      }, 10000);
      const options = {
        namespace: oracledb.SUBSCR_NAMESPACE_AQ,
        clientInitiated: true,
        callback(message) {
          verifyAqNotification(message);
          clearTimeout(timeout);
          resolveNotification(message);
        },
        timeout: 300
      };

      subscribeConn = await pool.getConnection();
      await subscribeConn.subscribe(queueName, options);
      isSubscribed = true;
      await subscribeConn.close();
      subscribeConn = null;
      await testsUtil.sleep(500);

      const workConn = await pool.getConnection();
      const queue = await workConn.getQueue(queueName);
      await queue.enqOne('AQ subscription after pool release');
      await workConn.commit();
      await notification;
      await workConn.unsubscribe(queueName);
      isSubscribed = false;
      clearTimeout(timeout);
      if (subscribeConn) {
        await subscribeConn.close();
      }
      if (workConn) {
        if (isSubscribed) {
          await workConn.unsubscribe(queueName);
        }
        await workConn.close();
      }
      await pool.close();
    }); // 331.4

  it('331.5 receives AQ and CQN notifications after pool release',
    async function() {
      const cqnTableName = 'NODB_CQN_AQ_POOL_TAB';

      // Use a dedicated queue to avoid overlap with prior pooled AQ cleanup.
      const cqnSubName = `NODB_CQN_AQ_POOL_${Date.now()}_${process.pid}`;

      const dbaCredential = {
        user: dbConfig.test.DBA_user,
        password: dbConfig.test.DBA_password,
        connectString: dbConfig.connectString,
        privilege: oracledb.SYSDBA
      };
      let subscribeConn;
      let cqnTableCreated = false;
      let aqSubscribed = false;
      let cqnSubscribed = false;
      let resolveAq, rejectAq, resolveCqn, rejectCqn;
      const aqNotification = new Promise((resolve, reject) => {
        resolveAq = resolve;
        rejectAq = reject;
      });
      const cqnNotification = new Promise((resolve, reject) => {
        resolveCqn = resolve;
        rejectCqn = reject;
      });
      const timeout = setTimeout(() => {
        const err = new Error('Timed out waiting for AQ and CQN notifications');
        rejectAq(err);
        rejectCqn(err);
      }, 10000);

      const dbaConn = await oracledb.getConnection(dbaCredential);
      await dbaConn.execute(`GRANT CHANGE NOTIFICATION TO ${AQ_USER}`);
      await dbaConn.close();
      await conn.execute(`CREATE TABLE ${cqnTableName} (id NUMBER)`);
      cqnTableCreated = true;
      await conn.commit();

      const pool = await oracledb.createPool({
        user: AQ_USER,
        password: AQ_USER_PWD,
        connectString: dbConfig.connectString,
        poolMin: 0,
        poolMax: 2,
        events: !oracledb.thin
      });
      subscribeConn = await pool.getConnection();

      // Create the AQ subscription on the original pooled connection.
      await subscribeConn.subscribe(queueName3, {
        namespace: oracledb.SUBSCR_NAMESPACE_AQ,
        clientInitiated: true,
        callback(message) {
          verifyAqNotification(message);
          resolveAq(message);
        },
        timeout: 300
      });
      aqSubscribed = true;

      // Create the CQN subscription on that same pooled connection.
      await subscribeConn.subscribe(cqnSubName, {
        callback(message) {
          assert.strictEqual(message.type,
            oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
          assert.strictEqual(message.registered, true);
          resolveCqn(message);
        },
        clientInitiated: true,
        qos: oracledb.SUBSCR_QOS_QUERY,
        sql: `SELECT * FROM ${cqnTableName}`,
        timeout: 300
      });
      cqnSubscribed = true;

      // Release the original pooled connection. Both subscriptions must
      // remain active after the connection is returned to the pool.
      await subscribeConn.close();
      subscribeConn = null;
      await testsUtil.sleep(1000);

      // Trigger AQ and CQN notifications using a different pool checkout.
      const workConn = await pool.getConnection();
      const queue = await workConn.getQueue(queueName3);
      await queue.enqOne('AQ and CQN after pool release');
      await workConn.execute(`INSERT INTO ${cqnTableName} VALUES (1)`);
      await workConn.commit();
      await Promise.all([aqNotification, cqnNotification]);

      // Explicitly remove both subscriptions before closing the pool.
      await workConn.unsubscribe(queueName3);
      aqSubscribed = false;
      await workConn.unsubscribe(cqnSubName);
      cqnSubscribed = false;
      clearTimeout(timeout);
      if (subscribeConn) {
        await subscribeConn.close();
      }
      if (workConn) {
        if (aqSubscribed) {
          await workConn.unsubscribe(queueName3);
        }
        if (cqnSubscribed) {
          await workConn.unsubscribe(cqnSubName);
        }
        await workConn.close();
      }
      if (pool) {
        await pool.close();
      }
      if (cqnTableCreated) {
        await conn.execute(`DROP TABLE ${cqnTableName} PURGE`);
      }
    }); // 331.5

}); // 331

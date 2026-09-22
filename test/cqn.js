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
 *   330. cqn.js
 *
 * DESCRIPTION
 *   Test Continuous Query Notification (CQN), including client-initiated
 *   notifications when supported.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('330. cqn.js', function() {

  let conn, connAsDBA, subscribeWithDefaults;
  let hasRequiredVersions = true;
  let isRunnable = true;
  const notificationTimeout = 10000;
  const nameSuffix = `${Date.now().toString(36)}${process.pid.toString(36)}`;

  function assertTableName(table, tableName) {
    const expectedName = `${dbConfig.user}.${tableName}`.toUpperCase();
    assert.strictEqual(table.name, expectedName);
  }

  function getSubName(name) {
    return `${name}_${nameSuffix}`;
  }

  function createNotificationTracker(expectedCount, verifyMessage,
    timeoutMs = notificationTimeout) {
    const messages = [];
    let settled = false;
    let resolveWait, rejectWait;
    const wait = new Promise((resolve, reject) => {
      resolveWait = resolve;
      rejectWait = reject;
    });
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        const message = `Timed out waiting for ${expectedCount} CQN `
          + `notification(s); received ${messages.length}`;
        rejectWait(new Error(message));
      }
    }, timeoutMs);

    return {
      callback(message) {
        if (settled) {
          return;
        }
        verifyMessage(message, messages.length);
        messages.push(message);
        if (messages.length === expectedCount) {
          settled = true;
          clearTimeout(timeout);
          resolveWait(messages);
        }
      },
      wait() {
        return wait;
      }
    };
  }

  before(async function() {
    isRunnable = dbConfig.test.DBA_PRIVILEGE &&
      (oracledb.thin || process.platform !== 'darwin');

    hasRequiredVersions = await testsUtil.checkPrerequisites(
      1904000000, 1904000000);
    if (oracledb.thin && !hasRequiredVersions) {
      isRunnable = false;
    }

    if (!isRunnable) {
      this.skip();
    }

    const dbaCredential = {
      user: dbConfig.test.DBA_user,
      password: dbConfig.test.DBA_password,
      connectString: dbConfig.connectString,
      privilege: oracledb.SYSDBA
    };
    connAsDBA = await oracledb.getConnection(dbaCredential);
    await connAsDBA.execute(`GRANT CHANGE NOTIFICATION TO ${dbConfig.user}`);

    const connectOptions = {...dbConfig};
    if (!oracledb.thin) {
      connectOptions.events = true;
    }
    conn = await oracledb.getConnection(connectOptions);

    subscribeWithDefaults = async function(name, options) {
      const supportsClientInitiated = oracledb.thin || hasRequiredVersions;
      if (options.clientInitiated === undefined && supportsClientInitiated) {
        return await conn.subscribe(name, {
          clientInitiated: true,
          ...options
        });
      }
      return await conn.subscribe(name, options);
    };
  });

  after(async function() {
    if (conn) {
      await conn.close();
    }
    if (connAsDBA) {
      await connAsDBA.execute(
        `REVOKE CHANGE NOTIFICATION FROM ${dbConfig.user}`
      );
      await connAsDBA.close();
    }
  });

  it('330.1 receives a basic CQN notification', async function() {
    const tableName = 'nodb_tab_cqn_basic';
    const subName = getSubName('cqn_basic');
    let isSubscribed = false;

    await conn.execute(testsUtil.sqlCreateTable(tableName,
      `CREATE TABLE ${tableName} (k NUMBER)`));
    const notifications = createNotificationTracker(1, function(message) {
      assert.strictEqual(message.type,
        oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
      assert.strictEqual(message.registered, true);
      assert(Buffer.isBuffer(message.txId));
      assert.strictEqual(message.msgId, undefined);
      assert.strictEqual(message.queueName, undefined);
      assert.strictEqual(message.tables, undefined);
      assert.strictEqual(message.queries.length, 1);
      assert.strictEqual(message.queries[0].tables.length, 1);
      const table = message.queries[0].tables[0];
      assertTableName(table, tableName);
      assert(table.operation & oracledb.CQN_OPCODE_INSERT);
    });

    await subscribeWithDefaults(subName, {
      callback: notifications.callback,
      sql: `SELECT * FROM ${tableName}`,
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_QUERY
    });
    isSubscribed = true;
    await testsUtil.sleep(500);

    await conn.execute(`INSERT INTO ${tableName} VALUES (1)`);
    await conn.commit();
    await notifications.wait();
    if (isSubscribed) {
      await conn.unsubscribe(subName);
    }
    await testsUtil.dropTable(conn, tableName);
  }); // 330.1

  it('330.2 returns the registration id for query subscriptions',
    async function() {
      const tableName = 'nodb_tab_cqn_regid';
      const subName = getSubName('cqn_regid');
      let isSubscribed = false;

      await conn.execute(testsUtil.sqlCreateTable(tableName,
        `CREATE TABLE ${tableName} (k NUMBER)`));
      const result = await subscribeWithDefaults(subName, {
        callback: function(message) {
          assert.strictEqual(message.registered, true);
        },
        sql: `SELECT * FROM ${tableName} WHERE k > :bv`,
        binds: { bv: 100 },
        timeout: 20,
        qos: oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS
      });
      isSubscribed = true;
      // subscribe() exposes a CQN registration ID as a JavaScript number.
      assert.strictEqual(typeof result.regId, 'number');

      const fullTableName = `${dbConfig.user}.${tableName}`.toUpperCase();
      const query = `
        SELECT regid
        FROM user_change_notification_regs
        WHERE table_name = :tableName
      `;
      const dbResult = await conn.execute(query, { tableName: fullTableName });
      assert.strictEqual(result.regId, dbResult.rows[0][0]);
      if (isSubscribed) {
        await conn.unsubscribe(subName);
      }
      await testsUtil.dropTable(conn, tableName);
    }); // 330.2

  it('330.3 rejects invalid CQN query registration SQL', async function() {
    const subNameNonQuery = getSubName('cqn_bad_sql');
    const subNameMissingTable = getSubName('cqn_missing_table');

    await assert.rejects(
      async () => await subscribeWithDefaults(subNameNonQuery, {
        callback: function(message) {
          assert(message);
        },
        sql: 'INSERT INTO TestTempTable (IntCol) VALUES (1)',
        timeout: 20,
        qos: oracledb.SUBSCR_QOS_QUERY
      }),
      /(DPI-1087:|NJS-019:)/
    );

    await assert.rejects(
      async () => await subscribeWithDefaults(subNameMissingTable, {
        callback: function(message) {
          assert(message);
        },
        sql: 'SELECT * FROM nodb_missing_cqn_table',
        timeout: 20,
        qos: oracledb.SUBSCR_QOS_QUERY
      }),
      /ORA-00942:/
    );
  }); // 330.3

  it('330.4 rejects invalid and repeated unsubscribe', async function() {
    const tableName = 'nodb_tab_cqn_unsub';
    const subName = getSubName('cqn_unsub');

    await assert.rejects(
      async () => await conn.unsubscribe(getSubName('missing_sub')),
      /NJS-061:/
    );

    await conn.execute(testsUtil.sqlCreateTable(tableName,
      `CREATE TABLE ${tableName} (k NUMBER)`));
    await subscribeWithDefaults(subName, {
      callback: function(message) {
        assert(message);
      },
      sql: `SELECT * FROM ${tableName}`,
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_QUERY
    });

    await conn.unsubscribe(subName);
    await assert.rejects(
      async () => await conn.unsubscribe(subName),
      /(NJS-061:|DPI-1002:)/
    );
    await testsUtil.dropTable(conn, tableName);
  }); // 330.4

  it('330.5 rejects query registration during an active transaction',
    async function() {
      const tableName = 'nodb_tab_cqn_txn';
      const subName = getSubName('cqn_txn');

      await conn.execute(testsUtil.sqlCreateTable(tableName,
        `CREATE TABLE ${tableName} (k NUMBER, v VARCHAR2(50))`));
      await conn.execute(`INSERT INTO ${tableName} VALUES (1, 'test')`);
      await assert.rejects(
        async () => await subscribeWithDefaults(subName, {
          callback: function(message) {
            assert(message);
          },
          sql: `SELECT * FROM ${tableName}`,
          timeout: 20,
          qos: oracledb.SUBSCR_QOS_QUERY
        }),
        /ORA-29975:/
      );
      await conn.rollback();
      await testsUtil.dropTable(conn, tableName);
    }); // 330.5

  it('330.6 SUBSCR_QOS_DEREG_NFY marks notification deregistered',
    async function() {
      const tableName = 'nodb_tab_cqn_dereg';
      const subName = getSubName('cqn_dereg');
      let isSubscribed = false;

      await conn.execute(testsUtil.sqlCreateTable(tableName,
        `CREATE TABLE ${tableName} (k NUMBER)`));
      const notifications = createNotificationTracker(1, function(message) {
        assert.strictEqual(message.registered, false);
      });

      await subscribeWithDefaults(subName, {
        callback: notifications.callback,
        sql: `SELECT * FROM ${tableName}`,
        timeout: 20,
        qos: oracledb.SUBSCR_QOS_DEREG_NFY
      });
      isSubscribed = true;
      await testsUtil.sleep(500);

      await conn.execute(`INSERT INTO ${tableName} VALUES (1)`);
      await conn.commit();
      await notifications.wait();
      if (oracledb.thin) {
        await assert.rejects(
          async () => await conn.unsubscribe(subName),
          /NJS-061:/
        );

        // Server-side deregistration must also remove the driver's public
        // subscription entry so that the name can be registered again.
        await subscribeWithDefaults(subName, {
          callback: function(message) {
            assert(message);
          },
          sql: `SELECT * FROM ${tableName}`,
          timeout: 20,
          qos: oracledb.SUBSCR_QOS_QUERY
        });
        isSubscribed = true;
      } else {
        // Allow OCI to finish terminal-callback cleanup before releasing
        // the native subscription handle used by the next test.
        await testsUtil.sleep(100);
        await conn.unsubscribe(subName).catch(err => {
          // OCI may have already removed the registration.
          assert.match(err.message, /DPI-1002:/);
        });
        isSubscribed = false;
      }
      if (isSubscribed) {
        await conn.unsubscribe(subName);
      }
      await testsUtil.dropTable(conn, tableName);
    }); // 330.6

  it('330.7 reuses a CQN subscription name to register additional queries',
    async function() {
      const tableOne = 'nodb_tab_cqn_same_name_1';
      const tableTwo = 'nodb_tab_cqn_same_name_2';
      const subName = getSubName('cqn_same_name');
      const tableNames = new Set();
      let isSubscribed = false;
      const notifications = createNotificationTracker(2, function(message) {
        assert.strictEqual(message.registered, true);
        assert.strictEqual(message.queries.length, 1);
        tableNames.add(message.queries[0].tables[0].name);
      });

      await conn.execute(testsUtil.sqlCreateTable(tableOne,
        `CREATE TABLE ${tableOne} (k NUMBER)`));
      await conn.execute(testsUtil.sqlCreateTable(tableTwo,
        `CREATE TABLE ${tableTwo} (k NUMBER)`));
      const firstResult = await subscribeWithDefaults(subName, {
        callback: notifications.callback,
        sql: `SELECT * FROM ${tableOne}`,
        timeout: 20,
        qos: oracledb.SUBSCR_QOS_QUERY
      });
      isSubscribed = true;
      const secondResult = await subscribeWithDefaults(subName, {
        callback: function() {
          assert.fail('the original callback must be reused');
        },
        sql: `SELECT * FROM ${tableTwo}`,
        timeout: 1,
        qos: oracledb.SUBSCR_QOS_ROWIDS
      });
      assert.strictEqual(secondResult.regId, firstResult.regId);
      await testsUtil.sleep(500);

      await conn.execute(`INSERT INTO ${tableOne} VALUES (1)`);
      await conn.commit();
      await conn.execute(`INSERT INTO ${tableTwo} VALUES (1)`);
      await conn.commit();
      await notifications.wait();
      assert.deepStrictEqual(tableNames, new Set([
        `${dbConfig.user}.${tableOne}`.toUpperCase(),
        `${dbConfig.user}.${tableTwo}`.toUpperCase()
      ]));
      if (isSubscribed) {
        await conn.unsubscribe(subName);
      }
      await testsUtil.dropTable(conn, tableOne);
      await testsUtil.dropTable(conn, tableTwo);
    }); // 330.7

  it('330.8 requires client-initiated CQN in Thin mode', async function() {
    if (!oracledb.thin) {
      this.skip();
    }

    const subscribeOptions = {
      callback: function(message) {
        assert(message);
      },
      sql: 'SELECT * FROM dual',
      qos: oracledb.SUBSCR_QOS_QUERY,
      timeout: 20
    };

    await assert.rejects(
      async () => await conn.subscribe(getSubName('cqn_no_client_init'),
        subscribeOptions),
      /NJS-089:.*server initiated subscription.*Thin/
    );

    await assert.rejects(
      async () => await conn.subscribe(getSubName('cqn_false_client_init'), {
        ...subscribeOptions,
        clientInitiated: false
      }),
      /NJS-089:.*server initiated subscription.*Thin/
    );
  }); // 330.8

}); // 330

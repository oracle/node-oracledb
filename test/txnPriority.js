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
 *   329. txnPriority.js
 *
 * DESCRIPTION
 *   Test the "connection.txnPriority" property.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('329. txnPriority.js', function() {

  const highPriority = oracledb.TXN_PRIORITY_HIGH;
  const mediumPriority = oracledb.TXN_PRIORITY_MEDIUM;
  const lowPriority = oracledb.TXN_PRIORITY_LOW;
  const resetPriority = oracledb.TXN_PRIORITY_DEFAULT;
  const invalidTxnPriorityRegex = /NJS-538:/;
  const tableName = 'nodb_txn_priority';
  const dbaConfig = dbConfig.test.DBA_PRIVILEGE ? {
    user: dbConfig.test.DBA_user,
    password: dbConfig.test.DBA_password,
    connectString: dbConfig.connectString,
    privilege: oracledb.SYSDBA
  } : null;
  let conn;
  let conn2;
  let dbaConn;
  let pool;
  let tableCreated;
  let waitTargetsSet;

  beforeEach(() => {
    conn = undefined;
    conn2 = undefined;
    dbaConn = undefined;
    pool = undefined;
    tableCreated = false;
    waitTargetsSet = false;
  });

  afterEach(async () => {
    if (conn) {
      await conn.close();
      conn = undefined;
    }
    if (conn2) {
      await conn2.close();
      conn2 = undefined;
    }
    if (pool) {
      await pool.close(0);
      pool = undefined;
    }
    if (waitTargetsSet) {
      if (!dbaConn) {
        dbaConn = await oracledb.getConnection(dbaConfig);
      }
      await dbaConn.execute('ALTER SYSTEM RESET PRIORITY_TXNS_HIGH_WAIT_TARGET');
      await dbaConn.execute('ALTER SYSTEM RESET PRIORITY_TXNS_MEDIUM_WAIT_TARGET');
      waitTargetsSet = false;
    }
    if (dbaConn) {
      await dbaConn.close();
      dbaConn = undefined;
    }
    if (tableCreated) {
      conn = await oracledb.getConnection(dbConfig);
      await testsUtil.dropTable(conn, tableName);
      await releaseConnection();
      tableCreated = false;
    }
  });

  async function createNewSessionPool(txnPriority) {
    return await oracledb.createPool({
      ...dbConfig,
      poolMin: 0,
      poolMax: 1,
      poolIncrement: 1,
      txnPriority
    });
  }

  async function createReusablePool(txnPriority) {
    return await oracledb.createPool({
      ...dbConfig,
      poolMin: 1,
      poolMax: 1,
      poolIncrement: 0,
      poolPingInterval: -1,
      txnPriority
    });
  }

  async function releaseConnection() {
    await conn.close();
    conn = undefined;
  }

  async function setPriorityWaitTargets() {
    // Use short wait targets so a higher-priority transaction rolls back a
    // lower-priority blocker during the locking test.
    dbaConn = await oracledb.getConnection(dbaConfig);
    await dbaConn.execute('ALTER SYSTEM SET PRIORITY_TXNS_HIGH_WAIT_TARGET=1');
    waitTargetsSet = true;
    await dbaConn.execute('ALTER SYSTEM SET PRIORITY_TXNS_MEDIUM_WAIT_TARGET=1');
  }

  async function createLockTestTable() {
    conn = await oracledb.getConnection(dbConfig);
    await testsUtil.createTable(conn, tableName,
      `CREATE TABLE ${tableName} ` +
      `(id NUMBER PRIMARY KEY, col1 NUMBER, col2 NUMBER)`);
    tableCreated = true;
    await conn.execute(
      `INSERT INTO ${tableName} (id, col1, col2) VALUES (1, 10, 100)`,
      [],
      {autoCommit: true}
    );
    await releaseConnection();
  }

  it('329.1 initial value comes from connect piggyback', async () => {
    // The default connection option is sent during authentication without an
    // additional round trip.
    conn = await oracledb.getConnection(dbConfig);
    assert.strictEqual(conn.txnPriority, highPriority);
  }); // 329.1

  it('329.2 standalone getConnection() reflects connect-time value', async () => {
    // A standalone connection receives its requested priority while it is
    // being created.
    conn = await oracledb.getConnection({
      ...dbConfig,
      txnPriority: lowPriority
    });
    assert.strictEqual(conn.txnPriority, lowPriority);
  }); // 329.2

  it('329.3 createPool() reflects pool create-time value', async () => {
    // The pool's auth handle supplies the priority for sessions created by the
    // pool.
    pool = await createNewSessionPool(lowPriority);
    conn = await pool.getConnection();
    assert.strictEqual(conn.txnPriority, lowPriority);
  }); // 329.3

  it('329.4 pooled acquire does not override pool create value', async () => {
    // Acquiring a connection does not change the priority configured when the
    // pool was created, including when an acquire option is supplied.
    pool = await createReusablePool(lowPriority);

    conn = await pool.getConnection();
    assert.strictEqual(conn.txnPriority, lowPriority);
    await releaseConnection();

    conn = await pool.getConnection({
      txnPriority: mediumPriority
    });
    // The existing pooled session retains the priority set by the pool.
    assert.strictEqual(conn.txnPriority, lowPriority);
  }); // 329.4

  it('329.5 reused pooled session keeps changed value until reset', async () => {
    // Verify that a priority changed on a pooled session is retained when the
    // same session is released and acquired again.
    pool = await createReusablePool(lowPriority);

    conn = await pool.getConnection();
    assert.strictEqual(conn.txnPriority, lowPriority);
    conn.txnPriority = mediumPriority;
    // The setter queues the change; the server value is unchanged until a
    // round trip occurs.
    await conn.ping();
    // ping sends the pending value and synchronizes the value from the server.
    assert.strictEqual(conn.txnPriority, mediumPriority);
    await releaseConnection();

    conn = await pool.getConnection();
    assert.strictEqual(conn.txnPriority, mediumPriority);
    conn.txnPriority = resetPriority;
    // The reset constant restores the transaction priority to the database default
    // on the next round trip.
    await conn.ping();
    assert.strictEqual(conn.txnPriority, highPriority);
  }); // 329.5

  it('329.6 setter queues only the last value until a roundtrip', async () => {
    // Multiple assignments before a round trip should send only the final
    // requested value.
    conn = await oracledb.getConnection(dbConfig);
    assert.strictEqual(conn.txnPriority, highPriority);
    conn.txnPriority = lowPriority;
    conn.txnPriority = mediumPriority;
    // The getter still reports the last server-synchronized value.
    assert.strictEqual(conn.txnPriority, highPriority);

    await conn.ping();

    // The round trip applies and synchronizes the final queued value.
    assert.strictEqual(conn.txnPriority, mediumPriority);

    await conn.rollback();
  }); // 329.6

  it('329.7 invalid setter value is rejected immediately', async () => {
    // Public validation rejects unsupported values before they can be queued
    // for a database round trip.
    conn = await oracledb.getConnection(dbConfig);
    assert.strictEqual(conn.txnPriority, highPriority);
    assert.throws(() => {
      conn.txnPriority = 'ABC';
    }, invalidTxnPriorityRegex /* NJS-538: invalid value for parameter txnPriority */);
    assert.strictEqual(conn.txnPriority, highPriority);
  }); // 329.7

  it('329.8 standalone getConnection() rejects invalid connect-time value', async () => {
    // An invalid connect-time value is rejected before authentication.
    await assert.rejects(async () => {
      await oracledb.getConnection({
        ...dbConfig,
        txnPriority: 'ABC'
      });
    }, invalidTxnPriorityRegex /* NJS-538: invalid value for parameter txnPriority */);
  }); // 329.8

  it('329.9 pool rejects invalid pool create-time value', async () => {
    // With poolMin one, the invalid pool value is rejected before session
    // creation.
    await assert.rejects(async () => {
      pool = await createReusablePool('ABC');
      conn = await pool.getConnection();
    }, invalidTxnPriorityRegex /* NJS-538: invalid value for parameter txnPriority */);
  }); // 329.9

  it('329.10 invalid poolMin 0 priority fails at pool creation', async () => {
    // With poolMin zero, validation still occurs before pool creation.
    await assert.rejects(async () => {
      pool = await createNewSessionPool('ABC');
    }, invalidTxnPriorityRegex /* NJS-538: invalid value for parameter txnPriority */);
  }); // 329.10

  it('329.11 public APIs reject invalid txnPriority values', async () => {
    // Public setters and connection or pool creation options reject values
    // that are not supported before a database round trip is required.
    conn = await oracledb.getConnection(dbConfig);

    assert.throws(() => {
      conn.txnPriority = 1;
    }, invalidTxnPriorityRegex /* NJS-538: invalid value for parameter txnPriority */);

    await assert.rejects(async () => {
      await oracledb.getConnection({
        ...dbConfig,
        txnPriority: null
      });
    }, invalidTxnPriorityRegex /* NJS-538: invalid value for parameter txnPriority */);

    await assert.rejects(async () => {
      await createNewSessionPool(1);
    }, invalidTxnPriorityRegex /* NJS-538: invalid value for parameter txnPriority */);
  }); // 329.11

  it('329.12 standalone getConnection() accepts reset constant', async () => {
    // The reset constant restores the database default for a standalone
    // connection and the default for the new session.
    conn = await oracledb.getConnection({
      ...dbConfig,
      txnPriority: resetPriority
    });
    assert.strictEqual(conn.txnPriority, highPriority);
  }); // 329.12

  it('329.13 createPool() accepts reset constant', async () => {
    // The reset constant is passed through the pool auth handle
    // and resets newly created sessions to the database default.
    pool = await createNewSessionPool(resetPriority);
    conn = await pool.getConnection();
    assert.strictEqual(conn.txnPriority, highPriority);
  }); // 329.13

  it('329.14 reset constant restores transaction priority after roundtrip', async () => {
    // Verify both that a setter change is queued and that the reset constant
    // restores the server state on the following round trip.
    conn = await oracledb.getConnection(dbConfig);
    conn.txnPriority = lowPriority;
    await conn.ping();
    assert.strictEqual(conn.txnPriority, lowPriority);

    conn.txnPriority = resetPriority;
    // Before the round trip, the getter still reports the current server
    // value.
    assert.strictEqual(conn.txnPriority, lowPriority);

    await conn.ping();

    // The reset is now synchronized from the server.
    assert.strictEqual(conn.txnPriority, highPriority);
  }); // 329.14

  it('329.15 default HIGH-priority session waits for blocker session', async function() {
    if (!dbConfig.test.DBA_PRIVILEGE) {
      this.skip();
    }

    await setPriorityWaitTargets();
    await createLockTestTable();

    // Case 1: no priority is set on either session. Both use the database
    // default HIGH priority, so session 2 waits for session 1's row lock.
    const session1 = conn = await oracledb.getConnection(dbConfig);
    const session2 = conn2 = await oracledb.getConnection(dbConfig);
    assert.strictEqual(session1.txnPriority, highPriority);
    assert.strictEqual(session2.txnPriority, highPriority);
    session2.callTimeout = 2000;

    await session1.execute(
      `UPDATE ${tableName} SET col1 = col1 + 1 WHERE id = 1`
    );
    await assert.rejects(async () => {
      await session2.execute(
        `UPDATE ${tableName} SET col2 = col2 + 1 WHERE id = 1`
      );
    }, /NJS-123:/ /* NJS-123: call timeout exceeded while waiting for lock */);

    // With a longer timeout, session 2 remains blocked until session 1
    // releases the row lock, then completes its update successfully.
    session2.callTimeout = 5000;
    const updateResultPromise = session2.execute(
      `UPDATE ${tableName} SET col2 = col2 + 1 WHERE id = 1`
    );
    await testsUtil.sleep(100);
    // Commit session 1's normal transaction to release the row lock that
    // session 2 is waiting to acquire.
    await session1.commit();
    const updateResult = await updateResultPromise;
    assert.strictEqual(updateResult.rowsAffected, 1);
    // Commit session 2 so its completed update is durable before verification.
    await session2.commit();

    const selectResult = await session2.execute(
      `SELECT col1, col2 FROM ${tableName} WHERE id = 1`
    );
    assert.deepStrictEqual(selectResult.rows[0], [11, 101]);
  }); // 329.15

  it('329.16 high priority session rolls back low priority blocker session', async function() {
    if (!dbConfig.test.DBA_PRIVILEGE) {
      this.skip();
    }

    // Configure short wait targets so the higher-priority transaction causes
    // the lower-priority blocker to be rolled back instead of waiting.
    await setPriorityWaitTargets();
    await createLockTestTable();

    // Case 2: session 1 is explicitly LOW and keeps the row lock.
    const session1 = conn = await oracledb.getConnection({
      ...dbConfig,
      txnPriority: lowPriority
    });
    // Session 2 starts a HIGH-priority transaction that needs the same row.
    const session2 = conn2 = await oracledb.getConnection({
      ...dbConfig,
      txnPriority: highPriority
    });
    assert.strictEqual(session1.txnPriority, lowPriority);
    assert.strictEqual(session2.txnPriority, highPriority);
    session2.callTimeout = 20000;

    await session1.execute(
      `UPDATE ${tableName} SET col1 = col1 + 1 WHERE id = 1`
    );
    // Session 2 would previously wait for session 1 to release this lock.
    // After the high-priority wait target expires, Oracle rolls back session
    // 1's blocking transaction and lets session 2 complete its update.
    const result = await session2.execute(
      `UPDATE ${tableName} SET col2 = col2 + 1 WHERE id = 1`
    );
    assert.strictEqual(result.rowsAffected, 1);

    // Oracle has automatically rolled back session 1's transaction. The
    // session must acknowledge that rollback before it can continue using it.
    await assert.rejects(async () => {
      await session1.execute(`SELECT col1 FROM ${tableName} WHERE id = 1`);
    }, /ORA-63300:/ /* transaction automatically rolled back */);
    await session1.rollback();

    await session2.commit();

    const selectResult = await session2.execute(
      `SELECT col1, col2 FROM ${tableName} WHERE id = 1`
    );
    // Only the HIGH transaction's update remains committed after the LOW
    // transaction is rolled back.
    assert.deepStrictEqual(selectResult.rows[0], [10, 101]);
  }); // 329.16

  it('329.17 pool getConnection() does not set txnPriority', async () => {
    pool = await createNewSessionPool();

    conn = await pool.getConnection({
      txnPriority: lowPriority
    });
    assert.strictEqual(conn.txnPriority, highPriority);
  }); // 329.17

  it('329.18 public API rejects setting txnPriority on closed connection', async () => {
    conn = await oracledb.getConnection(dbConfig);
    const closedConn = conn;
    await releaseConnection();

    assert.throws(() => {
      closedConn.txnPriority = lowPriority;
    }, /NJS-003:/ /* NJS-003: invalid or closed connection */);
  }); // 329.18

  it('329.19 getter reflects ALTER SESSION txnPriority changes', async () => {
    conn = await oracledb.getConnection(dbConfig);
    assert.strictEqual(conn.txnPriority, highPriority);

    await conn.execute(`ALTER SESSION SET TXN_PRIORITY = ${lowPriority}`);
    assert.strictEqual(conn.txnPriority, lowPriority);

    await conn.execute(`ALTER SESSION SET TXN_PRIORITY = ${mediumPriority}`);
    assert.strictEqual(conn.txnPriority, mediumPriority);

    await conn.execute(`ALTER SESSION SET TXN_PRIORITY = ${highPriority}`);
    assert.strictEqual(conn.txnPriority, highPriority);
  }); // 329.19

  it('329.20 setter is rejected during an active transaction and recovers', async () => {
    conn = await oracledb.getConnection(dbConfig);
    await testsUtil.createTable(conn, tableName,
      `CREATE TABLE ${tableName} ` +
      `(id NUMBER PRIMARY KEY, col1 NUMBER)`);
    tableCreated = true;
    await conn.execute(
      `INSERT INTO ${tableName} (id, col1) VALUES (1, 10)`,
      [],
      {autoCommit: true}
    );

    await conn.execute(`UPDATE ${tableName} SET col1 = col1 + 1 WHERE id = 1`);
    conn.txnPriority = lowPriority;

    await assert.rejects(async () => {
      await conn.ping();
    }, /ORA-02097:/ /* ORA-02097: parameter cannot be modified */);
    assert.strictEqual(conn.txnPriority, highPriority);

    await conn.rollback();

    conn.txnPriority = lowPriority;
    await conn.ping();
    assert.strictEqual(conn.txnPriority, lowPriority);
  }); // 329.20

  it('329.21 setter piggybacks on execute roundtrip', async () => {
    conn = await oracledb.getConnection(dbConfig);
    assert.strictEqual(conn.txnPriority, highPriority);

    conn.txnPriority = lowPriority;
    assert.strictEqual(conn.txnPriority, highPriority);

    await conn.execute(`SELECT 1 FROM DUAL`);
    assert.strictEqual(conn.txnPriority, lowPriority);
  }); // 329.21

  it('329.22 valid pending setter syncs back even when SQL execution fails', async () => {
    conn = await oracledb.getConnection(dbConfig);
    assert.strictEqual(conn.txnPriority, highPriority);

    conn.txnPriority = lowPriority;

    await assert.rejects(async () => {
      await conn.execute(`SELECT * FROM nodb_missing_txn_priority_table`);
    }, /ORA-00942:/ /* ORA-00942: table or view does not exist */);
    assert.strictEqual(conn.txnPriority, lowPriority);
  }); // 329.22

  it('329.23 setter accepts case-insensitive txnPriority values', async () => {
    conn = await oracledb.getConnection(dbConfig);

    const values = [
      ['low', lowPriority],
      ['mEdIuM', mediumPriority],
      ['HIGH', highPriority]
    ];

    for (const [inputPriority, expectedPriority] of values) {
      conn.txnPriority = inputPriority;
      await conn.ping();
      assert.strictEqual(conn.txnPriority.toUpperCase(), expectedPriority);
    }
  }); // 329.23
});

/* Copyright (c) 2025, 2026, Oracle and/or its affiliates. */

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
 *   1. implicitPool1.js
 *
 * DESCRIPTION
 *  Testing Implicit Connection Pooling
 *
 *  Stop and start DRCP Implicit Connection Pool before starting to reset
 *  stats for comparison, change the connection string to use a DRCP pooled
 *  server,and additionally set a POOL_BOUNDARY parameter to the connection
 *  string.The tests are checking the behavior of implicit connection pooling
 *  in Node.js by triggering implicit "get" and "release" callbacks when
 *  connections are used and closed. Each time a new connection is acquired
 *  usingoracledb.getConnection(), the tests trigger the G callback
 *  (implicit "get"). When a connection is closed, the R callback
 *  (implicit "release") is triggered.
 *
 *  Set the env variable : NODE_ORACLEDB_IMPL_CONNECTIONSTRING
 *  NODE_ORACLEDB_IMPL_CONNECTIONSTRING: This env variable should be
 *  set with a DRCP Implicit Connection Pooling connect string.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('../dbconfig.js');
const testsUtil = require('../testsUtil.js');

describe('1. implicitPool1.js', function() {
  let connection, implicitConnString, isRunnable;
  let transactionBoundary = false;
  // Helper function to clear any callbacks from the TestImplicitPoolCallbacks
  // table
  const clearCallbacks = async (conn) => {
    await conn.execute(`TRUNCATE TABLE ${dbConfig.user}.TestImplicitPoolCallbacks`);
    await conn.commit();
  };

  // Helper function to get all callbacks from the TestImplicitPoolCallbacks
  // table
  const getCallbacks = async (conn) => {
    const result = await conn.execute(`SELECT Action
      FROM ${dbConfig.user}.TestImplicitPoolCallbacks ORDER BY SeqNum`);
    return result.rows;
  };

  const createCallbacksPackage = async (conn) => {
    await conn.execute(`
      CREATE OR REPLACE PACKAGE ora_cpool_state AS
        PROCEDURE ora_cpool_state_get_callback(service VARCHAR2,
        connection_class VARCHAR2);
        PROCEDURE ora_cpool_state_rls_callback(service VARCHAR2,
        connection_class VARCHAR2);
      END ora_cpool_state;
    `);
    await conn.execute(`
      CREATE OR REPLACE PACKAGE BODY ora_cpool_state AS
        PROCEDURE ora_cpool_state_get_callback(service VARCHAR2,
        connection_class VARCHAR2) IS
        BEGIN
          INSERT INTO ${dbConfig.user}.TestImplicitPoolCallbacks VALUES (
            (SELECT COUNT(*) + 1 FROM ${dbConfig.user}.TestImplicitPoolCallbacks), 'G'
          );
          COMMIT;
        END;
        PROCEDURE ora_cpool_state_rls_callback(service VARCHAR2,
        connection_class VARCHAR2) IS
        BEGIN
          INSERT INTO ${dbConfig.user}.TestImplicitPoolCallbacks VALUES (
            (SELECT COUNT(*) + 1 FROM ${dbConfig.user}.TestImplicitPoolCallbacks), 'R'
          );
          COMMIT;
        END;
      END ora_cpool_state;
    `);
  };

  if (process.env.NODE_ORACLEDB_IMPL_CONNECTIONSTRING) {
    implicitConnString = process.env.NODE_ORACLEDB_IMPL_CONNECTIONSTRING;
    // Check if using TRANSACTION boundary
    if (implicitConnString.toLowerCase().includes('pool_boundary=transaction')) {
      transactionBoundary = true;
    }
  } else {
    throw new Error(
      'Implicit connection Pooling Database Connect String is not set!\n' +
      'Try setting environment variable NODE_ORACLEDB_IMPL_CONNECTIONSTRING.'
    );
  }

  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites(2300000000, 2300000000);
    if (!isRunnable) this.skip();

    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(testsUtil.sqlDropSource('PACKAGE BODY', 'ora_cpool_state'));
    await connection.execute(testsUtil.sqlDropSource('PACKAGE', 'ora_cpool_state'));

    // Create TestImplicitPoolCallbacks table
    await connection.execute(testsUtil.sqlCreateTable(
      'TestImplicitPoolCallbacks', `
        CREATE TABLE ${dbConfig.user}.TestImplicitPoolCallbacks (
          SeqNum    NUMBER(9) NOT NULL,
          Action    CHAR(1) NOT NULL
        )
      `));

    // Create TestGlobalTempTable
    await connection.execute(`
      CREATE GLOBAL TEMPORARY TABLE TestGlobalTempTable (
        IntCol    NUMBER(9),
        StringCol VARCHAR2(50)
      ) ON COMMIT PRESERVE ROWS
    `);

    await connection.execute(testsUtil.sqlCreateTable('TestTempTable', `
      CREATE TABLE TestTempTable (INTCOL NUMBER(9) NOT NULL,
                                  VALUE VARCHAR2(100))
    `));

    let insertPromises = [];
    for (let i = 1; i <= 100; i++) {
      insertPromises.push(connection.execute(`
        INSERT INTO TestTempTable VALUES (:c1, :c2)
      `, [i, `test_${i}`]));
    }
    await Promise.all(insertPromises);
    await connection.commit();

    await connection.execute(testsUtil.sqlCreateTable('TestNumbers', `
      CREATE TABLE TestNumbers (INTCOL NUMBER(9) NOT NULL)
    `));

    insertPromises = [];
    for (let i = 1; i <= 100; i++) {
      insertPromises.push(connection.execute(`
        INSERT INTO TestNumbers VALUES (:c1)
      `, [i]));
    }
    await Promise.all(insertPromises);
    await connection.commit();

    // Create PL/SQL package for implicit callbacks
    await createCallbacksPackage(connection);
  });

  after(async function() {
    if (!isRunnable) return;
    await connection.execute(testsUtil.sqlDropSource('PACKAGE BODY', 'ora_cpool_state'));
    await connection.execute(testsUtil.sqlDropSource('PACKAGE', 'ora_cpool_state'));
    await connection.execute(testsUtil.sqlDropTable(
      `${dbConfig.user}.TestImplicitPoolCallbacks`));
    await connection.execute(testsUtil.sqlDropTable('TestTempTable'));
    await connection.execute(testsUtil.sqlDropTable('TestGlobalTempTable'));
    await connection.close();
  });

  describe('1. Standalone Tests', function() {
    let conn;

    beforeEach(async function() {
      conn = await oracledb.getConnection({
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: implicitConnString,
        autoCommit: false // Disable autoCommit
      });
    });

    afterEach(async function() {
      if (conn) await conn.close();
    });

    it('1.1 - executing and fetching from a table', async function() {
      await clearCallbacks(connection);
      await conn.execute(`SELECT IntCol FROM TestNumbers`);
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
    }); // 1.1

    it('1.2 insert and commit', async function() {
      await conn.execute(`TRUNCATE TABLE TestTempTable`);
      await clearCallbacks(connection);
      await conn.execute(`INSERT INTO TestTempTable (IntCol) VALUES (100)`);
      assert.deepStrictEqual(await getCallbacks(connection), [['G']]);
      await conn.commit();
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
    }); // 1.2

    it('1.3 ping', async function() {
      await clearCallbacks(connection);
      await conn.ping();
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
    }); // 1.3

    it('1.4 DML and commit', async function() {
      await clearCallbacks(connection);
      await conn.execute(`UPDATE TestTempTable SET IntCol = IntCol + 1`);
      assert.deepStrictEqual(await getCallbacks(connection), [['G']]);
      await conn.commit();
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
    }); // 1.4

    it('1.5 stmt execute and commit', async function() {
      // Execute and fetch from a statement with commit, verifying callbacks
      await clearCallbacks(connection);
      await conn.execute(`SELECT IntCol FROM TestNumbers`);
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);

      await clearCallbacks(connection);
      await conn.commit();
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
    }); // 1.5

    it('1.6 templobs and commit in TXN', async function() {
      // LOB creation, fetch, and commit within a transaction
      await conn.ping();
      await clearCallbacks(connection);
      const lob = await conn.createLob(oracledb.CLOB);
      await conn.commit();

      // Different assertion based on transaction boundary
      if (transactionBoundary) {
        assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
      } else {
        assert.deepStrictEqual(await getCallbacks(connection), [['G']]);
      }

      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.once('close', resolve);
        lob.destroy();
      });

      await conn.execute(` select 1 from dual `);
      if (transactionBoundary) {
        assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R'], ['G'], ['R']]);
      } else {
        assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
      }

      await clearCallbacks(connection);
      await conn.commit();
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
    }); // 1.6

    it('1.7 closing connection', async function() {
      // Verify callbacks when closing a connection
      await clearCallbacks(connection);
      await conn.execute(`SELECT IntCol FROM TestNumbers`);
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);

      // Closing after an implicit release must remain a no-op for the server
      // session from the application's perspective and must not prevent the
      // client connection from being closed. Thick mode may acquire and
      // release a server session while performing the explicit close.
      await conn.close();
      conn = null;
    }); // 1.7

    it('1.8 Fetch And Txn', async function() {
      await clearCallbacks(connection);
      const sql1 = `SELECT IntCol FROM TestNumbers`;
      const sql2 = `INSERT INTO TestTempTable (IntCol) VALUES (102)`;
      await conn.execute(sql1);
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);

      await clearCallbacks(connection);
      await conn.execute(sql2);

      await conn.execute(sql1);

      assert.deepStrictEqual(await getCallbacks(connection), [['G']]);

      await clearCallbacks(connection);
      await conn.commit();
      assert.deepStrictEqual(await getCallbacks(connection), [['R']]);
    }); // 1.8

    it('1.9 Partial Fetch and Complete fetch', async function() {
      // partial and complete fetches, checking callbacks
      await conn.execute(`TRUNCATE TABLE TestTempTable`);
      const data = Array.from({ length: 300 }, (_, i) => [i + 1]);
      await clearCallbacks(connection);
      await conn.executeMany(`INSERT INTO TestTempTable (IntCol) VALUES (:1)`,
        data);
      assert.deepStrictEqual(await getCallbacks(connection), [['G']]);
      await conn.commit();

      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
      await clearCallbacks(connection);

      await conn.execute(`SELECT IntCol FROM TestTempTable`);

      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
    }); // 1.9

    it('1.10 implicit callbacks on tempLob assigment', async function() {
      await conn.ping();
      await clearCallbacks(connection);
      const lob = await conn.createLob(oracledb.DB_TYPE_CLOB);
      assert.deepStrictEqual(await getCallbacks(connection),
        [ ['G'] ]);
      await clearCallbacks(connection);
      await conn.commit();

      // Different assertion based on transaction boundary
      if (transactionBoundary) {
        assert.deepStrictEqual(await getCallbacks(connection), [['R']]);
      } else {
        assert.deepStrictEqual(await getCallbacks(connection), []);
      }
      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.once('close', resolve);
        lob.destroy();
      });
    }); // 1.10

    it('1.11 tempLob without variable assignment', async function() {
      await conn.ping();
      await clearCallbacks(connection);
      const lob = await conn.createLob(oracledb.CLOB);
      assert.deepStrictEqual(await getCallbacks(connection), [ ['G'] ]);
      await clearCallbacks(connection);
      await conn.commit();

      // Different assertion based on transaction boundary
      if (transactionBoundary) {
        assert.deepStrictEqual(await getCallbacks(connection), [['R']]);
      } else {
        assert.deepStrictEqual(await getCallbacks(connection), []);
      }
      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.once('close', resolve);
        lob.destroy();
      });
    }); // 1.11

    it('1.12 LOB assigned to a variable and used', async function() {
      // LOB assignment to a variable and its usage
      await conn.ping();
      await clearCallbacks(connection);
      const someString = 'someString';
      const lob = await conn.createLob(oracledb.CLOB);
      // Write the buffer to the CLOB
      await lob.write(JSON.stringify (someString));
      assert.deepStrictEqual(await getCallbacks(connection), [ ['G'] ]);
      await clearCallbacks(connection);
      await conn.commit();

      // Different assertion based on transaction boundary
      if (transactionBoundary) {
        assert.deepStrictEqual(await getCallbacks(connection), [['R']]);
      } else {
        assert.deepStrictEqual(await getCallbacks(connection), []);
      }
      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.once('close', resolve);
        lob.destroy();
      });
    }); // 1.12

    it('1.13 stmt execute and fetch with lob with standalone connection', async function() {
      const table = 'lobTable';

      const plql = `CREATE TABLE IF NOT EXISTS ${table} (
                      IntCol  NUMBER,
                      lobCol  CLOB
                    )`;
      const plsql = testsUtil.sqlCreateTable(table, plql);
      await conn.execute(plsql);

      let seq = 1;
      const lobData = "some CLOB data";

      const sql = `INSERT INTO ${table} VALUES(:i, :d)`;
      const bindVar = {
        i: { val: seq, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        d: { val: lobData, dir: oracledb.BIND_IN, type: oracledb.STRING }
      };

      let result = await conn.execute(sql, bindVar);
      assert.strictEqual(result.rowsAffected, 1);

      await clearCallbacks(connection);
      await conn.commit();
      assert.deepStrictEqual(await getCallbacks(connection), [['R']]);

      const sql1 = `SELECT lobCol FROM ${table} WHERE INTCOL = :INTCOL`;

      await clearCallbacks(connection);
      result = await conn.execute(sql1, { INTCOL: seq });
      assert.deepStrictEqual(await getCallbacks(connection), [ ['G'], ['R'] ]);

      const lob = result.rows[0][0];

      await clearCallbacks(connection);
      const sql2 = `INSERT INTO ${table} (INTCOL, lobCol) VALUES (:i, :c)`;
      await conn.execute(
        sql2,
        {
          i: ++seq,
          c: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
        },
        { autoCommit: true }
      );
      assert.deepStrictEqual(await getCallbacks(connection), [ ['G'], ['R'] ]);

      await conn.execute(
        sql2,
        {
          i: ++seq,
          c: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
        },
        { autoCommit: false }
      );
      await lob.close();

      await clearCallbacks(connection);
      await conn.commit();
      assert.deepStrictEqual(await getCallbacks(connection), [ ['R'] ]);

      await conn.execute(testsUtil.sqlDropTable('lobTable'));
    }); // 1.13

    it('1.14 test transaction rollback behavior', async function() {
      await clearCallbacks(connection);

      await conn.execute(`INSERT INTO TestTempTable (IntCol, VALUE) VALUES (999, 'test_rollback')`);

      assert.deepStrictEqual(await getCallbacks(connection), [['G']]);

      await conn.rollback();

      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);

      const result = await conn.execute(`SELECT COUNT(*) FROM TestTempTable WHERE IntCol = 999`);
      assert.strictEqual(result.rows[0][0], 0);
    }); // 1.14

    it('1.15 multiple statements within a transaction', async function() {
      await clearCallbacks(connection);

      // Execute first statement
      await conn.execute(`INSERT INTO TestTempTable (IntCol, VALUE)
                        VALUES (501, 'transaction_test_1')`);

      // Check callbacks after first statement
      const callbacksAfterFirstStmt = await getCallbacks(connection);
      assert.deepStrictEqual(callbacksAfterFirstStmt, [['G']]);

      await clearCallbacks(connection);

      await conn.execute(`INSERT INTO TestTempTable (IntCol, VALUE)
                        VALUES (502, 'transaction_test_2')`);

      // Check callbacks after second statement
      const callbacksAfterSecondStmt = await getCallbacks(connection);
      assert.deepStrictEqual(callbacksAfterSecondStmt, []);

      await clearCallbacks(connection);

      await conn.commit();

      // Check callbacks after commit
      const callbacksAfterCommit = await getCallbacks(connection);
      assert.deepStrictEqual(callbacksAfterCommit, [['R']]);

      const result = await conn.execute(
        `SELECT COUNT(*) FROM TestTempTable WHERE IntCol IN (501, 502)`
      );
      assert.strictEqual(result.rows[0][0], 2);
    }); // 1.15

    it('1.16 boundary behavior with DDL statements', async function() {
      await clearCallbacks(connection);

      await conn.execute(`
      CREATE TABLE tb_tx_boundary_test (
        id NUMBER,
        description VARCHAR2(100)
      )
    `);

      // Check callbacks after DDL
      const callbacksAfterDDL = await getCallbacks(connection);
      assert.deepStrictEqual(callbacksAfterDDL, [['G'], ['R']]);

      await clearCallbacks(connection);

      // Execute DML after DDL
      await conn.execute(`
      INSERT INTO tb_tx_boundary_test VALUES (1, 'test data')
    `);

      assert.deepStrictEqual(await getCallbacks(connection), [['G']]);

      await conn.execute(`DROP TABLE tb_tx_boundary_test PURGE`);
    }); // 1.16

    it('1.17 boundary behavior with autocommit', async function() {
      // Set autocommit to true for this test
      await conn.execute(`SELECT 1 FROM DUAL`);

      await clearCallbacks(connection);

      await conn.execute(
        `INSERT INTO TestTempTable (IntCol, VALUE) VALUES (503, 'autocommit_test')`,
        [],
        { autoCommit: true }
      );

      const callbacksAfterAutocommit = await getCallbacks(connection);

      assert.deepStrictEqual(callbacksAfterAutocommit, [['G'], ['R']]);

      const result = await conn.execute(
        `SELECT COUNT(*) FROM TestTempTable WHERE IntCol = 503`
      );

      assert.strictEqual(result.rows[0][0], 1);

      // The following statement needs a new implicit get because auto-commit
      // released the session used for the DML.
      await clearCallbacks(connection);
      await conn.execute(`SELECT IntCol FROM TestNumbers WHERE IntCol = 1`);
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
    }); // 1.17

    it('1.18 boundary behavior with transaction rollback', async function() {
      await clearCallbacks(connection);

      // Start a transaction
      await conn.execute(`
      INSERT INTO TestTempTable (IntCol, VALUE) VALUES (504, 'rollback_test_1')
    `);

      assert.deepStrictEqual(await getCallbacks(connection), [['G']]);

      await clearCallbacks(connection);

      // Add another statement to transaction
      await conn.execute(`
      INSERT INTO TestTempTable (IntCol, VALUE) VALUES (505, 'rollback_test_2')
    `);

      assert.deepStrictEqual(await getCallbacks(connection), []);

      await clearCallbacks(connection);

      await conn.rollback();

      assert.deepStrictEqual(await getCallbacks(connection), [['R']]);

      const result = await conn.execute(
        `SELECT COUNT(*) FROM TestTempTable WHERE IntCol IN (504, 505)`
      );
      assert.strictEqual(result.rows[0][0], 0);

      // A rollback ends the transaction and releases the implicit session;
      // the next statement must acquire and release a session again.
      await clearCallbacks(connection);
      await conn.execute(`SELECT IntCol FROM TestNumbers WHERE IntCol = 1`);
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
    }); // 1.18

    it('1.19 partial ResultSet fetch retains the session until its boundary', async function() {
      await clearCallbacks(connection);
      const result = await conn.execute(
        `SELECT IntCol FROM TestNumbers ORDER BY IntCol`,
        [],
        { resultSet: true, keepInStmtCache: false }
      );

      const rows = await result.resultSet.getRows(1);
      assert.deepStrictEqual(rows, [[1]]);
      // An open cursor makes the implicit session stateful, so it cannot be
      // released at the end of the fetch call.
      assert.deepStrictEqual(await getCallbacks(connection), [['G']]);

      await result.resultSet.close();
      assert.deepStrictEqual(await getCallbacks(connection), [['G']]);
      if (transactionBoundary) await conn.commit();
      else await conn.ping();
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
    }); // 1.19

    it('1.20 complete ResultSet fetch releases the session', async function() {
      await clearCallbacks(connection);
      const result = await conn.execute(
        `SELECT IntCol FROM TestNumbers ORDER BY IntCol`,
        [],
        { resultSet: true }
      );

      const rows = await result.resultSet.getRows(101);
      assert.strictEqual(rows.length, 100);
      assert.strictEqual(rows[0][0], 1);
      assert.strictEqual(rows[99][0], 100);
      // Fetching to end-of-data closes the cursor and allows an implicit
      // release without requiring an explicit connection close.
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
    }); // 1.20

    it('1.21 partial ResultSet fetch retains the session until its boundary while caching enabled', async function() {
      await clearCallbacks(connection);
      const result = await conn.execute(
        `SELECT IntCol FROM TestNumbers ORDER BY IntCol`,
        [],
        { resultSet: true, keepInStmtCache: true }
      );

      const rows = await result.resultSet.getRows(1);
      assert.deepStrictEqual(rows, [[1]]);
      // An open cursor makes the implicit session stateful, so it cannot be
      // released at the end of the fetch call.
      assert.deepStrictEqual(await getCallbacks(connection), [['G']]);

      await result.resultSet.close();
      assert.deepStrictEqual(await getCallbacks(connection), [['G']]);
      if (transactionBoundary) await conn.commit();
      else await conn.ping();
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
    }); // 1.21

    it('1.22 sends both cursor cancel and close piggybacks on the same execute', async function() {
      await clearCallbacks(connection);

      // Create both statements before closing either one, so that no RPC
      // occurs after a cursor has been added to a pending list.
      const cachedResult = await conn.execute(
        `SELECT IntCol FROM TestNumbers ORDER BY IntCol`,
        [],
        { resultSet: true, keepInStmtCache: true }
      );

      const uncachedResult = await conn.execute(
        `SELECT IntCol FROM TestNumbers WHERE IntCol = :1`,
        [2],
        { resultSet: true, keepInStmtCache: false }
      );

      // Partially fetch the cached statement, then abandon it.
      assert.deepStrictEqual(
        await cachedResult.resultSet.getRows(1),
        [[1]]
      );
      await cachedResult.resultSet.close();

      // Abandon the non-cached statement so its cursor is pending close.
      assert.deepStrictEqual(
        await uncachedResult.resultSet.getRows(1),
        [[2]]
      );
      await uncachedResult.resultSet.close();

      // Both cursor operations must now be pending before the next RPC.
      assert.strictEqual(
        conn._impl.statementCache._cursorsToCancel.size,
        1
      );
      assert.strictEqual(
        conn._impl.statementCache._cursorsToClose.size,
        1
      );

      // This is the single RPC that should carry both piggybacks.
      await conn.execute(
        `SELECT IntCol FROM TestNumbers WHERE IntCol = :1`,
        [3],
        { resultSet: false, keepInStmtCache: false }
      );

      // Both piggyback lists should have been consumed.
      assert.strictEqual(
        conn._impl.statementCache._cursorsToCancel.size,
        0
      );
      assert.strictEqual(
        conn._impl.statementCache._cursorsToClose.size,
        0
      );
    }); // 1.22

    it('1.23 invalidates partially fetched cached cursor after DRCP session change', async function() {
      await clearCallbacks(connection);

      const result = await conn.execute(
        `SELECT IntCol FROM TestNumbers ORDER BY IntCol`,
        [],
        { resultSet: true, keepInStmtCache: true }
      );

      assert.deepStrictEqual(
        await result.resultSet.getRows(1),
        [[1]]
      );

      const statement = result.resultSet._impl.statement;
      assert.notStrictEqual(statement.cursorId, 0);

      await result.resultSet.close();

      // The cached statement must remain in _openCursors so that clearCursors()
      // can invalidate its cursorId if the DRCP session changes.
      assert.strictEqual(
        conn._impl.statementCache._openCursors.has(statement),
        true
      );

      if (transactionBoundary) {
        await conn.commit();
      } else {
        await conn.ping();
      }

      // The old cursor ID must be invalidated after the DRCP session change.
      assert.strictEqual(statement.cursorId, 0);

      // The same statement should remain reusable from the statement cache.
      const result2 = await conn.execute(
        `SELECT IntCol FROM TestNumbers ORDER BY IntCol`,
        [],
        { resultSet: true, keepInStmtCache: true }
      );

      assert.strictEqual(result2.resultSet._impl.statement, statement);
      assert.notStrictEqual(result2.resultSet._impl.statement.cursorId, 0);

      await result2.resultSet.close();
    }); // 1.23

    it('1.24 evicted cached statement moves pending cursor cancellation to close', async function() {
      await clearCallbacks(connection);

      const statementCache = conn._impl.statementCache;
      const originalMaxSize = statementCache._maxSize;

      try {
        const result = await conn.execute(
          `SELECT IntCol FROM TestNumbers ORDER BY IntCol`,
          [],
          { resultSet: true, keepInStmtCache: true }
        );

        assert.deepStrictEqual(await result.resultSet.getRows(1), [[1]]);

        const statement = result.resultSet._impl.statement;
        const cursorId = statement.cursorId;

        assert.notStrictEqual(cursorId, 0);

        await result.resultSet.close();

        assert.strictEqual(statementCache._cursorsToCancel.has(cursorId), true);
        assert.strictEqual(statementCache._cursorsToClose.has(cursorId), false);

        // Force this cached statement to be evicted without another RPC.
        statementCache._maxSize = 0;
        statementCache._adjustCache();

        // Eviction should supersede the pending cancellation.
        assert.strictEqual(statementCache._cursorsToCancel.has(cursorId), false);
        assert.strictEqual(statementCache._cursorsToClose.has(cursorId), true);
      } finally {
        statementCache._maxSize = originalMaxSize;
      }
    });
  });

  describe('2. Pool Tests', function() {
    let pool, conn;

    beforeEach(async function() {
      pool = await oracledb.createPool({
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: implicitConnString,
        poolMin: 0,
        poolMax: 10,
        poolIncrement: 1,
        autoCommit: false, // Disable autoCommit
      });
      conn = await pool.getConnection();
    });

    afterEach(async function() {
      if (conn) await conn.close();
      if (pool) await pool.close(0);
      pool = null;
      conn = null;
    });

    it('2.1 stmt execute and fetch from pool', async function() {
      await clearCallbacks(connection);
      // create a new connection
      await conn.execute(`SELECT INTCOL from ${dbConfig.user}.TestTempTable`);
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);

      await clearCallbacks(connection);
      await conn.execute(`UPDATE ${dbConfig.user}.TestTempTable
                          SET VALUE='test_22' WHERE INTCOL=2`);
      await conn.commit();
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
    }); // 2.1

    it('2.2 RELEASE connection from pool', async function() {
      await clearCallbacks(connection);
      // create a new connection
      await conn.execute(`SELECT IntCol FROM TestTempTable`);
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);

      await clearCallbacks(connection);
      await conn.close();
      // 1 way RPC
      await testsUtil.sleep(5000);
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]); // Thick [[]]
      conn = null; // Reset connection after closing
      await clearCallbacks(connection);
      await pool.close();
      await testsUtil.sleep(5000);
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
      pool = null; // Reset pool after closing
    }); // 2.2

    it('2.3 terminate connection from pool', async function() {
      await clearCallbacks(connection);

      // Execute a query and verify callbacks
      await conn.execute(`select IntCol from TestTempTable`);
      assert.deepStrictEqual(await getCallbacks(connection),
        [['G'], ['R']]);

      // Close the connection
      await conn.close(); // G and R here

      await testsUtil.sleep(5000);
      conn = null; // Reset connection after closing
      // Clear callbacks and terminate the pool
      await clearCallbacks(connection);
      await pool.terminate();
      await testsUtil.sleep(2000);
      // Verify that the pool has been terminated
      assert.deepStrictEqual(await getCallbacks(connection),
        [['G'], ['R']]);
      pool = null; // Reset pool after closing
    }); // 2.3

    it('2.4 stmt execute and fetch with lob', async function() {
      const table = 'lobTable';
      const plql = `CREATE TABLE IF NOT EXISTS ${table} (
                      IntCol  NUMBER,
                      lobCol  CLOB
                    )`;
      const plsql = testsUtil.sqlCreateTable(table, plql);
      await conn.execute(plsql);

      let seq = 1;
      const lobData = "some CLOB data";

      const sql = `INSERT INTO ${table} VALUES(:i, :d)`;
      const bindVar = {
        i: { val: seq, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        d: { val: lobData, dir: oracledb.BIND_IN, type: oracledb.STRING }
      };

      let result = await conn.execute(sql, bindVar);
      assert.strictEqual(result.rowsAffected, 1);

      await clearCallbacks(connection);
      await conn.commit();
      assert.deepStrictEqual(await getCallbacks(connection), [ ['R'] ]);

      const sql1 = `SELECT lobCol FROM ${table} WHERE INTCOL = :INTCOL`;

      await clearCallbacks(connection);
      result = await conn.execute(sql1, { INTCOL: seq });
      assert.deepStrictEqual(await getCallbacks(connection), [ ['G'], ['R'] ]);

      const lob = result.rows[0][0];

      await clearCallbacks(connection);
      const sql2 = `INSERT INTO ${table} (INTCOL, lobCol) VALUES (:i, :c)`;
      await conn.execute(
        sql2,
        {
          i: ++seq,
          c: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
        },
        { autoCommit: true }
      );
      assert.deepStrictEqual(await getCallbacks(connection), [ ['G'], ['R'] ]);

      await conn.execute(
        sql2,
        {
          i: ++seq,
          c: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
        },
        { autoCommit: false }
      );
      await lob.close();

      await clearCallbacks(connection);
      await conn.commit();
      assert.deepStrictEqual(await getCallbacks(connection), [ ['R'] ]);

      await conn.execute(testsUtil.sqlDropTable('lobTable'));
    }); // 2.4

    it('2.5 partial ResultSet fetch from a pool retains the session until its boundary', async function() {
      await clearCallbacks(connection);
      const result = await conn.execute(
        `SELECT IntCol FROM TestNumbers ORDER BY IntCol`,
        [],
        { resultSet: true, keepInStmtCache: false }
      );

      const rows = await result.resultSet.getRows(1);
      assert.deepStrictEqual(rows, [[1]]);
      assert.deepStrictEqual(await getCallbacks(connection), [['G']]);

      await result.resultSet.close();
      assert.deepStrictEqual(await getCallbacks(connection), [['G']]);
      if (transactionBoundary) await conn.commit();
      else await conn.ping();
      assert.deepStrictEqual(await getCallbacks(connection), [['G'], ['R']]);
    }); // 2.5
  });

  describe('3. Session State Restore Tests', function() {
    const restorePoolName = process.env.NODE_ORACLEDB_IMPLICIT_RESTORE_POOL ||
      'NJS_IMPLICIT_RESTORE';
    const restoreConnectString = (boundary, restore) => implicitConnString
      .replace(/\(POOL_BOUNDARY=[^)]+\)/i,
        `(POOL_BOUNDARY=${boundary})(POOL_NAME=${restorePoolName})` +
        `(POOL_SESSION_STATE_RESTORE=${restore})`);

    const getState = async (conn) => {
      const result = await conn.execute(`SELECT
        sys_context('userenv', 'sid'),
        sys_context('userenv', 'current_schema'),
        sys_context('userenv', 'client_info'),
        (SELECT value FROM nls_session_parameters
         WHERE parameter = 'NLS_DATE_FORMAT')
        FROM dual`);
      return result.rows[0];
    };

    const releaseAtBoundary = async (conn, boundary) => {
      if (boundary === 'TRANSACTION') await conn.commit();
    };

    const resetAndClose = async (conn, originalNls) => {
      conn.clientInfo = '';
      await conn.execute(
        `ALTER SESSION SET NLS_DATE_FORMAT = '${originalNls}'`);
      await conn.close();
    };

    const openRestoreConnection = async (boundary, restore) =>
      await oracledb.getConnection({
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: restoreConnectString(boundary, restore),
        stmtCacheSize: 0
      });

    const prepareForStateRead = async (conn, boundary) => {
      if (boundary === 'TRANSACTION') {
        await conn.execute(`UPDATE TestTempTable SET VALUE = VALUE
          WHERE IntCol = -1`);
        await conn.commit();
      }
    };

    const assertAlternatingCallbacks = async (boundary) => {
      const pairCount = boundary === 'TRANSACTION' ? 8 : 4;
      const expected = Array.from({ length: pairCount },
        () => [['G'], ['R']]).flat();
      assert.deepStrictEqual(await getCallbacks(connection), expected);
    };

    const testRestoreOn = async (boundary) => {
      const connA = await openRestoreConnection(boundary, 'ON');
      const originalNlsA = (await getState(connA))[3];
      await releaseAtBoundary(connA, boundary);
      const connB = await openRestoreConnection(boundary, 'ON');
      const originalNlsB = (await getState(connB))[3];
      await releaseAtBoundary(connB, boundary);

      connA.clientInfo = `nodb_restore_a_${boundary}`;
      await connA.execute(
        "ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD'");
      await releaseAtBoundary(connA, boundary);
      connB.clientInfo = `nodb_restore_b_${boundary}`;
      await connB.execute(
        "ALTER SESSION SET NLS_DATE_FORMAT = 'DD/MM/YYYY'");
      await releaseAtBoundary(connB, boundary);

      await clearCallbacks(connection);
      const states = [];
      for (const conn of [connA, connB, connA, connB]) {
        await prepareForStateRead(conn, boundary);
        states.push(await getState(conn));
      }

      assert.strictEqual(new Set(states.map((state) => state[0])).size, 1);
      assert.deepStrictEqual(states[0].slice(2),
        [`nodb_restore_a_${boundary}`, 'YYYY-MM-DD']);
      assert.deepStrictEqual(states[1].slice(2),
        [`nodb_restore_b_${boundary}`, 'DD/MM/YYYY']);
      assert.deepStrictEqual(states[2], states[0]);
      assert.deepStrictEqual(states[3], states[1]);
      await assertAlternatingCallbacks(boundary);

      await resetAndClose(connA, originalNlsA);
      await resetAndClose(connB, originalNlsB);
    };

    const testRestoreOff = async (boundary) => {
      const connA = await openRestoreConnection(boundary, 'OFF');
      await getState(connA);
      await releaseAtBoundary(connA, boundary);
      const connB = await openRestoreConnection(boundary, 'OFF');
      await clearCallbacks(connection);
      const states = [];
      for (const conn of [connA, connB, connA, connB]) {
        await prepareForStateRead(conn, boundary);
        states.push(await getState(conn));
      }
      assert.strictEqual(new Set(states.map((state) => state[0])).size, 1);
      for (const state of states) assert.strictEqual(state.length, 4);
      await assertAlternatingCallbacks(boundary);

      await connA.close();
      await connB.close();
    };

    it('3.1 restores state across STATEMENT/ON session reuse', async function() {
      await testRestoreOn('STATEMENT');
    });

    it('3.2 supports alternating STATEMENT/OFF connections', async function() {
      await testRestoreOff('STATEMENT');
    });

    it('3.3 restores state across TRANSACTION/ON session reuse', async function() {
      await testRestoreOn('TRANSACTION');
    });

    it('3.4 supports alternating TRANSACTION/OFF connections', async function() {
      await testRestoreOff('TRANSACTION');
    });

    it('3.5 restores CURRENT_SCHEMA with STATEMENT/ON', async function() {
      await connection.execute(testsUtil.sqlDropSource(
        'PACKAGE', 'ora_cpool_state'));
      const conn = await oracledb.getConnection({
        user: dbConfig.user, password: dbConfig.password,
        connectString: restoreConnectString('STATEMENT', 'ON'), stmtCacheSize: 0
      });
      conn.currentSchema = 'SYS';
      await conn.ping();
      assert.strictEqual((await getState(conn))[1], 'SYS');
      conn.currentSchema = dbConfig.user;
      await conn.close();
      await createCallbacksPackage(connection);
    });

    it('3.6 package state prevents statement-boundary release', async function() {
      await connection.execute(`CREATE OR REPLACE PACKAGE nodb_restore_state AS
        value NUMBER := 0; PROCEDURE set_value; FUNCTION get_value RETURN NUMBER; END;`);
      await connection.execute(`CREATE OR REPLACE PACKAGE BODY nodb_restore_state AS
        PROCEDURE set_value IS BEGIN value := 42; END;
        FUNCTION get_value RETURN NUMBER IS BEGIN RETURN value; END; END;`);
      const conn = await oracledb.getConnection({
        user: dbConfig.user, password: dbConfig.password,
        connectString: restoreConnectString('STATEMENT', 'ON'), stmtCacheSize: 0
      });
      await clearCallbacks(connection);
      await conn.execute('BEGIN nodb_restore_state.set_value; END;');
      await conn.ping();
      const result = await conn.execute('BEGIN :v := nodb_restore_state.get_value; END;',
        { v: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } });
      assert.strictEqual(result.outBinds.v, 42);
      assert.deepStrictEqual(await getCallbacks(connection), [['G']]);
      await conn.close();
      await connection.execute(testsUtil.sqlDropSource(
        'PACKAGE', 'nodb_restore_state'));
    });
  });
});

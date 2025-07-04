/* Copyright (c) 2025, Oracle and/or its affiliates. */

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
 *   316. sessionless.js
 *
 * DESCRIPTION
 *   Tests for sessionless transactions
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('316. sessionless.js', function() {

  describe('316.1 Sessionless Functions', function() {
    let conn = null;
    let conn2 = null;
    const tableName = 'TBL_316';
    // Sql to suspend existing transaction on server
    const srv_unset_transaction_id = `begin dbms_transaction.SUSPEND_TRANSACTION; end;`;
    const tableSql = `CREATE TABLE ${tableName} (INTCOL NUMBER, STRINGCOL VARCHAR2(256))`;
    // const get_transaction_id = `select NVL(dbms_transaction.get_transaction_id, 'NULL transactionId') from dual`;

    // SQL for Procedure to start transaction on server
    const server_start = (transactionId, timeout, mode) => {
      return `declare transactionId raw(64); begin transactionId :=
      dbms_transaction.START_TRANSACTION(UTL_RAW.CAST_TO_RAW('${transactionId}'),
      dbms_transaction.TRANSACTION_TYPE_SESSIONLESS, ${timeout},
      dbms_transaction.TRANSACTION_${mode}); end;`;
    };

    before(async function() {
      conn = await oracledb.getConnection(dbConfig);
      if (testsUtil.getClientVersion() < 2300000000) {
        this.skip();
      }
    });

    beforeEach(async function() {
      conn = await oracledb.getConnection(dbConfig);
      conn2 = await oracledb.getConnection(dbConfig);
      await testsUtil.createTable(conn, tableName, tableSql);
    });

    afterEach(async function() {
      if (conn) {
        await testsUtil.dropTable(conn, tableName);
        await conn.close();
      }
      if (conn2)
        await conn2.close();
    });

    it('316.1.1 Test server procedures', async function() {
      const transactionId = '316.1.1';
      let res;
      // Begin a New Sessionless transaction with our transactionId
      await conn.execute(server_start(transactionId, 5, 'NEW'));

      // Trying to begin another using client API calls
      await assert.rejects(
        async () => await conn.beginSessionlessTransaction(
          {transactionId, timeout: 5}),
        /NJS-170:/
      );

      await conn.execute(`INSERT INTO ${tableName} VALUES(1, 'Testing')`);

      await conn.execute(srv_unset_transaction_id);

      res = await conn.execute(`select * from ${tableName}`);
      assert.strictEqual(res.rows.length, 0);

      await conn2.execute(server_start(transactionId, 5, 'RESUME'));

      await conn2.execute(`INSERT INTO ${tableName} VALUES(1, 'Testing')`);

      // Trying to resume the sessionless transaction on another session
      // (should fail after timeout of 1 second)
      await assert.rejects(
        async () =>
          await conn.execute(server_start(transactionId, 1, 'RESUME')),
        /ORA-25351:/
      );
      await conn2.commit();

      res = await conn.execute(`select * from ${tableName}`);
      assert.strictEqual(res.rows.length, 2);
    });

    it('316.1.2 Test client APIs', async function() {
      const transactionId = '316.1.2';
      let res;

      // Mark Beginning of a New Sessionless transaction with our transactionId
      await conn.beginSessionlessTransaction(
        {transactionId, timeout: 5, deferRoundTrip: true});

      // Trying to start one more sessionless transaction before a round-trip
      await assert.rejects(
        async () => await conn.beginSessionlessTransaction(
          {transactionId: 'temp', timeout: 60}),
        /NJS-171:/
      );

      // Trying to resume one more sessionless transaction before a round-trip
      await assert.rejects(
        async () => await conn.resumeSessionlessTransaction(
          {transactionId: 'temp', timeout: 60}),
        /NJS-171:/
      );

      // Actually start the transaction with an execute call
      await conn.execute(`INSERT INTO ${tableName} VALUES(1, 'Testing')`);

      // Trying to suspend using server procedure calls
      await assert.rejects(
        async () => await conn.execute(srv_unset_transaction_id),
        /NJS-170:/
      );

      await conn.execute(`INSERT INTO ${tableName} VALUES(2, 'Testing')`);
      await conn.suspendSessionlessTransaction();

      res = await conn.execute(`select * from ${tableName}`);
      assert.strictEqual(res.rows.length, 0);

      await conn2.resumeSessionlessTransaction(
        {transactionId, timeout: 5, deferRoundTrip: true});
      await conn2.execute(`INSERT INTO ${tableName} VALUES(3, 'Testing')`,
        {}, {suspendOnSuccess: true});

      await conn.resumeSessionlessTransaction({transactionId});
      await conn.commit();
      res = await conn.execute(`select * from ${tableName}`);
      assert.strictEqual(res.rows.length, 3);
    });

    it('316.1.3 transaction timeout behavior', async function() {

      const transactionId = '316.1.3';

      // Begin a sessionless transaction with a very short timeout(2 seconds)
      await conn.beginSessionlessTransaction({transactionId, timeout: 2});

      // Suspend the transaction
      await conn.suspendSessionlessTransaction();

      await new Promise(resolve => setTimeout(resolve, 6000));

      await assert.rejects(
        async () => await conn2.resumeSessionlessTransaction({transactionId}),
        /ORA-26218:/
        // ORA-26218: sessionless transaction with transactionId 3331362E312E33 does not exist.
      );
    });

    it('316.1.4 error handling during sessionless transaction', async function() {
      const transactionId = '316.1.4';

      // Begin a sessionless transaction
      await conn.beginSessionlessTransaction({transactionId, timeout: 5});

      await conn.execute(`INSERT INTO ${tableName} VALUES(10, 'BEFORE_ERROR')`);

      // Execute invalid SQL
      await assert.rejects(
        async () => await conn.execute("INSERT INTO NON_EXISTENT_TABLE VALUES (1)"),
        /ORA-00942:/ // ORA-00942: table or view does not exist
      );

      // The transaction is active despite the error
      await conn.execute(`INSERT INTO ${tableName} VALUES(11, 'AFTER_ERROR')`);

      // Suspend and resume on another connection
      await conn.suspendSessionlessTransaction();
      await conn2.resumeSessionlessTransaction({transactionId});

      await conn2.commit();

      const res = await conn.execute(`SELECT * FROM ${tableName} WHERE INTCOL IN (10, 11)`);
      assert.strictEqual(res.rows.length, 2);
    });

    it('316.1.5 multiple concurrent sessionless transactions', async function() {
      const transactionId1 = '316.1.5.1';
      const transactionId2 = '316.1.5.2';
      const conn3 = await oracledb.getConnection(dbConfig);

      // Begin first sessionless transaction
      await conn.beginSessionlessTransaction({
        transactionId: transactionId1, timeout: 5});
      await conn.execute(`INSERT INTO ${tableName} VALUES(20, 'TX1')`);
      await conn.suspendSessionlessTransaction();

      // Begin second sessionless transaction
      await conn2.beginSessionlessTransaction(
        {transactionId: transactionId2, timeout: 5});
      await conn2.execute(`INSERT INTO ${tableName} VALUES(21, 'TX2')`);
      await conn2.suspendSessionlessTransaction();

      // Resume and commit first transaction
      await conn3.resumeSessionlessTransaction({transactionId: transactionId1});
      await conn3.commit();

      // Resume and rollback second transaction
      await conn.resumeSessionlessTransaction({transactionId: transactionId2});
      await conn.rollback();

      const res = await conn.execute(`SELECT * FROM ${tableName} WHERE STRINGCOL IN ('TX1', 'TX2')`);
      assert.strictEqual(res.rows.length, 1);
      assert.strictEqual(res.rows[0][1], 'TX1');

      if (conn3)
        await conn3.close();
    });

    it('316.1.6 different transactionId formats', async function() {
      const longTransactionId = 'X'.repeat(64);

      await conn.beginSessionlessTransaction(
        {transactionId: longTransactionId, timeout: 5});
      await conn.execute(`INSERT INTO ${tableName} VALUES(30, 'LONG_TRANSACTION_ID')`);
      await conn.suspendSessionlessTransaction();

      await conn2.resumeSessionlessTransaction(
        {transactionId: longTransactionId});
      await conn2.commit();

      // with special characters in transactionId
      const specialTransactionId = 'SPECIAL@#$%^&*()_+';

      await conn.beginSessionlessTransaction(
        {transactionId: specialTransactionId, timeout: 5});
      await conn.execute(`INSERT INTO ${tableName} VALUES(31, 'SPECIAL_TRANSACTION_ID')`);
      await conn.suspendSessionlessTransaction();

      await conn2.resumeSessionlessTransaction(
        {transactionId: specialTransactionId});
      await conn2.commit();

      // check both transactions committed
      const res = await conn.execute(`SELECT * FROM ${tableName} WHERE INTCOL IN (30, 31)`);
      assert.strictEqual(res.rows.length, 2);
    });

    it('316.1.7 with savepoints', async function() {
      const transactionId = '316.1.7';

      await conn.beginSessionlessTransaction({transactionId, timeout: 5});

      // insert initial data
      await conn.execute(`INSERT INTO ${tableName} VALUES(40, 'BEFORE_SAVEPOINT')`);

      await conn.execute("SAVEPOINT sp1");

      // insert more data
      await conn.execute(`INSERT INTO ${tableName} VALUES(41, 'AFTER_SAVEPOINT')`);

      // rollback to savepoint
      await conn.execute("ROLLBACK TO SAVEPOINT sp1");

      // suspend transaction
      await conn.suspendSessionlessTransaction();

      // resume on another connection
      await conn2.resumeSessionlessTransaction({transactionId});

      await conn2.execute(`INSERT INTO ${tableName} VALUES(42, 'AFTER_RESUME')`);

      await conn2.commit();

      const res = await conn.execute(`SELECT * FROM ${tableName} WHERE INTCOL IN (40, 41, 42) ORDER BY INTCOL`);
      assert.strictEqual(res.rows.length, 2);
      assert.deepStrictEqual(res.rows, [ [ 40, 'BEFORE_SAVEPOINT' ], [ 42, 'AFTER_RESUME' ]]);
    });

    it('316.1.8 sessionless transactions with connection pool', async function() {
      const pool = await oracledb.createPool({
        ...dbConfig,
        poolMin: 2,
        poolMax: 5
      });

      const transactionId = '316.1.8';
      const poolConn1 = await pool.getConnection();
      const poolConn2 = await pool.getConnection();

      await poolConn1.beginSessionlessTransaction({transactionId, timeout: 5});
      await poolConn1.execute(`INSERT INTO ${tableName} VALUES(60, 'POOL_CONN1')`);
      await poolConn1.suspendSessionlessTransaction();

      await poolConn1.close();

      // Resume transaction on second connection
      await poolConn2.resumeSessionlessTransaction({transactionId});
      await poolConn2.execute(`INSERT INTO ${tableName} VALUES(61, 'POOL_CONN2')`);
      await poolConn2.commit();

      // Close the second connection
      await poolConn2.close();

      const verifyConn = await pool.getConnection();
      const res = await verifyConn.execute(`SELECT * FROM ${tableName} WHERE INTCOL IN (60, 61)`);
      await verifyConn.close();

      assert.strictEqual(res.rows.length, 2);
      await pool.close();
    });

    it('316.1.9 mixing server and client methods', async function() {
      const transactionId = '316.1.9';

      // Start transaction using server procedure
      await conn.execute(server_start(transactionId, 5, 'NEW'));

      // suspend using client API
      await assert.rejects(
        async () => await conn.suspendSessionlessTransaction(),
        /NJS-170:/
        // NJS-170: Different ways to start or suspend sessionless transactions are being used(server procedures and client APIs)
      );

      await conn.execute("COMMIT");
    });

    it('316.1.10 resuming without suspending current txn', async function() {
      if (oracledb.thin)
        this.skip();
      const transactionId1 = '316.1.10.1';
      const transactionId2 = '316.1.10.2';

      // Begin first sessionless transaction
      await conn.beginSessionlessTransaction(
        {transactionId: transactionId1, timeout: 5});
      await conn.execute(`INSERT INTO ${tableName} VALUES(200, 'TX_ACTIVE')`);

      // Start another transaction on conn2 and suspend
      await conn2.beginSessionlessTransaction(
        {transactionId: transactionId2, timeout: 5});
      await conn2.execute(`INSERT INTO ${tableName} VALUES(201, 'TX2')`);
      await conn2.suspendSessionlessTransaction();

      // resume the second transaction on conn without suspending the first one
      // (it does an implicit suspend of txn with transactionId1 and resumes a
      // txn with transactionId2)
      await conn.resumeSessionlessTransaction(
        {transactionId: transactionId2, timeout: 2});
      await conn.commit();

      await conn2.resumeSessionlessTransaction(
        {transactionId: transactionId1, timeout: 1});
      await conn2.rollback();
    });

    it('316.1.11 suspendOnSuccess behaviour', async function() {
      const transactionId = '316.1.11';
      // Suspend doesn't throw error for thick but thin throws NJS-172
      if (oracledb.thin)
        await assert.rejects(
          async () => await conn.suspendSessionlessTransaction(),
          /NJS-172:/
        );

      // Begin first sessionless transaction
      await conn.beginSessionlessTransaction({transactionId, timeout: 5});

      // Use suspendOnSuccess to suspend after successful execution
      await conn.execute(`INSERT INTO ${tableName} VALUES(200, 'TX_ACTIVE')`,
        {}, {suspendOnSuccess: true});

      // Start another transaction on conn2 and suspend
      await conn2.execute(server_start(transactionId, 5, "RESUME"));

      await assert.rejects(
        async () => await conn2.execute(`SELECT * FROM DUAL`, {},
          {suspendOnSuccess: true}),
        /NJS-170:/
        // NJS-170: Different ways to start or suspend sessionless transactions are being used(server procedures and client APIs)
      );

      // Suspend sessionless transaction started using server procedure
      await conn2.execute(srv_unset_transaction_id);

      await conn2.resumeSessionlessTransaction({transactionId});
      await conn2.rollback();
    });

    it('316.1.12 sessionless transaction with large operations', async function() {
      const transactionId = '316.1.12';
      const iterations = 500; // Large number of operations

      await conn.beginSessionlessTransaction({transactionId, timeout: 5});

      for (let i = 0; i < iterations; i++) {
        await conn.execute(
          "INSERT INTO TBL_316 VALUES(:id, :text)",
          { id: 500 + i, text: `Large operation ${i}` }
        );
      }

      await conn.suspendSessionlessTransaction();

      // Resume on another connection and commit
      await conn2.resumeSessionlessTransaction({transactionId});
      await conn2.commit();

      const res = await conn.execute("SELECT COUNT(*) FROM TBL_316 WHERE INTCOL >= 500");
      assert.strictEqual(res.rows[0][0], iterations);
    });

    it('316.1.13 transaction behavior with some DDL operation', async function() {
      const transactionId = '316.1.13';
      const tempTableName = 'TBL_316_TEMP';

      await conn.beginSessionlessTransaction({transactionId, timeout: 5});
      const tableSql = `CREATE TABLE ${tempTableName} (id NUMBER, data VARCHAR2(100))`;

      // Performing a DDL operation performs an implicit commit of the whole
      // sessionless transaction
      await conn.execute(`INSERT INTO TBL_316 VALUES(1,'PRE_DDL')`);
      await testsUtil.createTable(conn, tempTableName, tableSql);

      // Suspend doesn't throw error for thick but thin throws NJS-172
      if (oracledb.thin)
        await assert.rejects(
          async () => await conn.suspendSessionlessTransaction(),
          /NJS-172:/
        );

      // Further DML executes are part of a local transaction
      await conn.execute(`INSERT INTO ${tempTableName} VALUES(1,'LOCAL_TRANSACTION')`);

      // But suspends will fail now as a local transaction is active and only
      // sessionless transactions are suspendable
      await assert.rejects(
        async () => await conn.execute(`INSERT INTO ${tempTableName} VALUES(2,'LOCAL_TRANSACTION')`,
          {}, {suspendOnSuccess: true}),
        /NJS-172:/
      );

      // The failed execute will not reflect in the table
      let res = await conn.execute(`SELECT * FROM ${tempTableName}`);
      assert.deepStrictEqual(res.rows, [[1, 'LOCAL_TRANSACTION']]);

      // Checking if sessionless transaction's DMLs and final DDL got comitted
      res = await conn2.execute(`SELECT * FROM TBL_316`);
      assert.strictEqual(res.rows.length, 1);
      res = await conn2.execute(`SELECT * FROM ${tempTableName}`);
      assert.strictEqual(res.rows.length, 0);
      await testsUtil.dropTable(conn, tempTableName);
    });

    it('316.1.14 zero timeout behavior', async function() {
      // Use timeout of 0 with beginSessionlessTransaction
      await assert.rejects(
        async () => await conn.beginSessionlessTransaction({timeout: 0}),
        /NJS-007:/ // NJS-005: invalid value for parameter 2
      );

      const transactionId = await conn.beginSessionlessTransaction({});

      // Using timeout of 0 with resumeSessionlessTransaction is allowed, it
      // implies that the server will not wait for another session to suspend
      // if the transaction is already in use.
      await assert.rejects(
        async () => await conn2.resumeSessionlessTransaction(
          {transactionId, timeout: 0}),
        /ORA-25351:/
      );

      // Suspend transaction on first session, now it's not in use
      await conn.suspendSessionlessTransaction();

      // successful as transaction is not being used by another session
      await conn2.resumeSessionlessTransaction({transactionId, timeout: 0});

    });

    it('316.1.15 retrieve transactionId of active sessionless transaction', async function() {
      const transactionId = '316.1.15';

      await conn.beginSessionlessTransaction({transactionId, timeout: 5});

      const resText = await conn.execute(
        `SELECT UTL_RAW.CAST_TO_VARCHAR2(dbms_transaction.GET_TRANSACTION_ID()) FROM dual`
      );

      const transactionIdOnServer = resText.rows[0][0];
      assert.deepEqual(transactionIdOnServer, transactionId);

      await conn.commit();
    });

    it('316.1.16 Checking behaviour with XA transactions', async function() {
      const xid = {
        formatId: 316116,
        globalTransactionId: "316.1.16",
        branchQualifier: "testBranch"
      };

      await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 5);
      await assert.rejects(
        async () => await conn.beginSessionlessTransaction({}),
        /ORA-24776:/
      );

      await conn.tpcEnd(xid);

      await conn.beginSessionlessTransaction({deferRoundTrip: true});
      await assert.rejects(
        async () => await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 5),
        /NJS-171:/
      );
    });

    it('316.1.17 Behaviour with local transactions', async function() {
      const transactionId = '316.1.17';

      await conn.execute(`INSERT INTO TBL_316 VALUES(1, 'LOCAL')`);
      await assert.rejects(
        async () => await conn.beginSessionlessTransaction({transactionId}),
        /ORA-24776:/
      );
    });

  });
});

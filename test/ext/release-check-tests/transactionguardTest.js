/* Copyright (c) 2024, 2025, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICE22NSE-2.0. You may choose
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
 *   transactionguardTest.js
 *
 * DESCRIPTION
 *   Test cases for Transaction Guard (TG) support.
 *   No special setup is required but the test suite makes use of debugging
 *   packages in Oracle Database that are not intended for normal use. It
 *   also creates and drops a service.
 *   Environment variables to be set:
 *     ORACLEDB_CONNECTSTRING_TG - Connect String for a TG-enabled database
 *     service. This is optional. The default TG value is 'localhost/orcl-tg'.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('../../dbconfig.js');
const testsUtil = require('../../testsUtil.js');

describe('1. transactionguardTest.js', function() {
  let dbaConn, isRunnable;
  const tableName = 'test_temp_tab';
  const svcName = 'orcl-test-tg';

  before(async function() {

    // Transaction Guard requires Oracle Client 12.1 or later and
    // Oracle Database 12.1 or later.
    // It also does not work with CMAN-TDM or DRCP.
    isRunnable = await testsUtil.checkPrerequisites(1200000000, 1200000000);
    if (!isRunnable || !dbConfig.test.DBA_PRIVILEGE ||
      dbConfig.test.drcp || dbConfig.test.isCmanTdm) this.skip();

    dbaConn = await oracledb.getConnection ({
      user: dbConfig.test.DBA_user,
      password: dbConfig.test.DBA_password,
      connectString: dbConfig.connectString,
      privilege: oracledb.SYSDBA
    });

    if (!process.env.ORACLEDB_CONNECTSTRING_TG) {
      await dbaConn.execute(`
        declare
            params dbms_service.svc_parameter_array;
        begin
            params('COMMIT_OUTCOME') := 'true';
            params('RETENTION_TIMEOUT') := 604800;
            dbms_service.create_service('${svcName}',
                                        '${svcName}', params);
            dbms_service.start_service('${svcName}');
        end;
        `);
    }
    await dbaConn.execute(`grant execute on dbms_tg_dbg to ${dbConfig.user}`);
    await dbaConn.execute(`grant execute on dbms_app_cont to ${dbConfig.user}`);

    // Set the connect string to the TG-enabled database service
    dbConfig.connectString = process.env.ORACLEDB_CONNECTSTRING_TG ?? `localhost/${svcName}`;

    // Make the connection to create the demo table for testing TG
    const createTblConn = await oracledb.getConnection(dbConfig);
    const sql =  `CREATE TABLE ${tableName} (IntCol NUMBER(9) NOT NULL,
      StringCol VARCHAR2(400),
      constraint ${tableName}_pk primary key (IntCol))`;
    const plsql = testsUtil.sqlCreateTable(tableName, sql);
    await createTblConn.execute(plsql);

    // close the connection
    await createTblConn.close();
  });

  after(async function() {
    if (!isRunnable) return;

    // Drop the table and the connection
    const dropTblConn = await oracledb.getConnection(dbConfig);
    await dropTblConn.execute(testsUtil.sqlDropTable(tableName));
    await dropTblConn.close();

    // Revoke executes on DBMS procedures for TG for the current user
    await dbaConn.execute(`revoke execute on dbms_tg_dbg from ${dbConfig.user}`);
    await dbaConn.execute(`revoke execute on dbms_app_cont from ${dbConfig.user}`);

    // stop the TG-enabled database service, if it is created in the before()
    // function
    if (!process.env.ORACLEDB_CONNECTSTRING_TG) {
      await dbaConn.execute(
        `BEGIN dbms_service.stop_service(:svcName); END;`,
        { svcName: svcName }
      );
      await dbaConn.execute(
        `BEGIN dbms_service.delete_service(:svcName); END;`,
        { svcName: svcName }
      );
    }
    await dbaConn.close();
  });

  it('1.1 standalone connection with TG', async function() {
    for (const argName of ["pre_commit", "post_commit"]) {
      let conn = await oracledb.getConnection(dbConfig);
      await conn.execute(`TRUNCATE TABLE ${tableName}`);
      await conn.execute(
        `INSERT INTO ${tableName} VALUES (:1, :2)`,
        [1, "String for test 1"]
      );
      const fullArgName = `dbms_tg_dbg.tg_failpoint_${argName}`;
      await conn.execute(
        `begin
            dbms_tg_dbg.set_failpoint(${fullArgName});
        end;`
      );
      const ltxid = conn.ltxid;
      await assert.rejects(
        async () => await conn.commit(),
        /NJS-500:/
      );
      await conn.close();

      conn = await oracledb.getConnection(dbConfig);
      const result = await conn.execute(
        `BEGIN dbms_app_cont.get_ltxid_outcome(:ltxid, :committed, :completed); END;`,
        { ltxid: ltxid,
          committed: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BOOLEAN },
          completed: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BOOLEAN }
        }
      );
      const expectedValue = (argName === "post_commit");
      assert.strictEqual(result.outBinds.committed, expectedValue);
      assert.strictEqual(result.outBinds.completed, expectedValue);
      await conn.close();
    }
  }); // 1.1

  it('1.2 pooled connection with TG', async function() {
    const pool = await oracledb.createPool(dbConfig);
    for (const argName of ["pre_commit", "post_commit"]) {
      let conn = await pool.getConnection();
      await conn.execute(`TRUNCATE TABLE ${tableName}`);
      await conn.execute(
        `INSERT INTO ${tableName} VALUES (:1, :2)`,
        [400, "String for test 400"]
      );
      const fullArgName = `dbms_tg_dbg.tg_failpoint_${argName}`;
      await conn.execute(
        `begin
            dbms_tg_dbg.set_failpoint(${fullArgName});
        end;`
      );
      const ltxid = conn.ltxid;
      await assert.rejects(
        async () => await conn.commit(),
        /NJS-500:/
      );
      await conn.close();
      assert.strictEqual(pool.connectionsInUse, 0);
      conn = await pool.getConnection();
      const result = await conn.execute(
        `BEGIN dbms_app_cont.get_ltxid_outcome(:ltxid, :committed, :completed); END;`,
        { ltxid: ltxid,
          committed: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BOOLEAN },
          completed: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BOOLEAN }
        }
      );
      const expectedValue = (argName === "post_commit");
      assert.strictEqual(result.outBinds.committed, expectedValue);
      assert.strictEqual(result.outBinds.completed, expectedValue);
      await conn.close();
    }
    await pool.close(0);
  }); // 1.2

  it('1.3 TG failpoint with rollback: simulate crash and verify not committed/completed', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    await conn.execute(`TRUNCATE TABLE ${tableName}`);
    await conn.execute(`INSERT INTO ${tableName} VALUES (:1, :2)`, [101, "Rollback Test"]);

    const failpoint = 'dbms_tg_dbg.tg_failpoint_pre_commit';
    await conn.execute(`begin dbms_tg_dbg.set_failpoint(${failpoint}); end;`);

    const ltxid = conn.ltxid;

    // Commit will fail and connection will be invalidated
    await assert.rejects(async () => await conn.commit(), /NJS-500:/);
    // NJS-500: connection to Oracle Database was closed or broken

    await conn.close();

    const verifyConn = await oracledb.getConnection(dbConfig);
    const result = await verifyConn.execute(
      `BEGIN dbms_app_cont.get_ltxid_outcome(:ltxid, :committed, :completed); END;`,
      {
        ltxid,
        committed: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BOOLEAN },
        completed: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BOOLEAN }
      }
    );

    assert.strictEqual(result.outBinds.committed, false);
    assert.strictEqual(result.outBinds.completed, false);
    await verifyConn.close();
  });


  it('1.4 TG should fail when DML is followed by DDL in same txn with failpoint', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    await conn.execute(`TRUNCATE TABLE ${tableName}`);
    await conn.execute(`INSERT INTO ${tableName} VALUES (:1, :2)`, [202, "DDL Failpoint Test"]);

    await conn.execute(`begin dbms_tg_dbg.set_failpoint(dbms_tg_dbg.tg_failpoint_post_commit); end;`);

    // Add DDL
    await conn.execute(`ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD'`);

    await assert.rejects(async () => await conn.commit(), /NJS-500:/);
    // NJS-500: connection to Oracle Database was closed or broken

    await conn.close();
  });

  it('1.5 TG with multiple connections should isolate LTXIDs', async function() {
    const conn1 = await oracledb.getConnection(dbConfig);
    const conn2 = await oracledb.getConnection(dbConfig);

    await conn1.execute(`TRUNCATE TABLE ${tableName}`);
    await conn1.execute(`INSERT INTO ${tableName} VALUES (:1, :2)`, [301, "Conn1"]);
    await conn2.execute(`INSERT INTO ${tableName} VALUES (:1, :2)`, [302, "Conn2"]);

    await conn1.execute(`begin dbms_tg_dbg.set_failpoint(dbms_tg_dbg.tg_failpoint_pre_commit); end;`);

    const ltxid1 = conn1.ltxid;
    await assert.rejects(() => conn1.commit(), /NJS-500:/);
    // NJS-500: connection to Oracle Database was closed or broken

    await conn1.close();

    const result = await conn2.execute(`SELECT COUNT(*) AS COUNT FROM ${tableName}`);
    assert.ok(result.rows[0][0] >= 1); // Conn2 insert is successful and independent

    await conn2.close();

    const connCheck = await oracledb.getConnection(dbConfig);
    const outcome = await connCheck.execute(
      `BEGIN dbms_app_cont.get_ltxid_outcome(:ltxid, :committed, :completed); END;`,
      {
        ltxid: ltxid1,
        committed: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BOOLEAN },
        completed: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BOOLEAN }
      }
    );

    assert.strictEqual(outcome.outBinds.committed, false);
    assert.strictEqual(outcome.outBinds.completed, false);
    await connCheck.close();
  });

  it('1.6 Invalid LTXID', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    await assert.rejects(
      async () => await conn.execute(
        `BEGIN dbms_app_cont.get_ltxid_outcome(:ltxid, :committed, :completed); END;`,
        {
          ltxid: Buffer.from('randomString', 'hex'), // Invalid
          committed: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BOOLEAN },
          completed: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BOOLEAN }
        }
      ),
      /ORA-14903:/ // ORA-14903: Corrupt logical transaction detected.
    );
    await conn.close();
  });

  it('1.7 TG and connection attributes', async function() {
    const conn = await oracledb.getConnection(dbConfig);

    // Verify ltxid is available
    assert(conn.ltxid, "ltxid attribute is available");
    assert(Buffer.isBuffer(conn.ltxid), "Expected ltxid to be a Buffer");
    assert(conn.ltxid.length > 0, "Expected ltxid to have non-zero length");

    // Verify ltxid doesn't change after starting a transaction and it exists and is valid
    await conn.execute(`INSERT INTO ${tableName} VALUES (:1, :2)`, [701, "Conn"]);

    const transactionLtxid = conn.ltxid;
    assert(transactionLtxid, "Expected ltxid to still be available during transaction");
    assert(Buffer.isBuffer(transactionLtxid), "Expected transaction ltxid to be a Buffer");
    assert(transactionLtxid.length > 0, "Expected transaction ltxid to have non-zero length");

    await conn.rollback();
    await conn.close();
  }); // 1.7
});

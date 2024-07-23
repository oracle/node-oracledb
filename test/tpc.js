/* Copyright (c) 2021, 2022, Oracle and/or its affiliates. */

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
 *   259. tpc.js
 *
 * DESCRIPTION
 *   Tests for two-phase commit related APIs
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testUtil  = require('./testsUtil.js');


describe('259. tpc.js', function() {
  describe('259.1 TPC constants', function() {
    it('259.1.1 tpc constant TPC_BEGIN_JOIN', function() {
      assert.strictEqual(oracledb.TPC_BEGIN_JOIN, 2);
    });

    it('259.1.2 tpc constant TPC_BEGIN_NEW', function() {
      assert.strictEqual(oracledb.TPC_BEGIN_NEW, 1);
    });

    it('259.1.3 tpc constant TPC_RESUME', function() {
      assert.strictEqual(oracledb.TPC_BEGIN_RESUME, 4);
    });

    it('259.1.4 tpc constant TPC_PROMOTE', function() {
      assert.strictEqual(oracledb.TPC_BEGIN_PROMOTE, 8);
    });

    it('259.1.5 tpc constant TPC_END_NORMAL', function() {
      assert.strictEqual(oracledb.TPC_END_NORMAL, 0);
    });

    it('259.1.6 tpc constant TPC_END_SUSPEND', function() {
      assert.strictEqual(oracledb.TPC_END_SUSPEND, 0x00100000);
    });

  });

  describe('259.2 TPC Functions', function() {
    let conn = null;
    let dbaConn = null;
    const sql = `BEGIN
        DECLARE
            e_table_missing EXCEPTION;
            PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
            BEGIN
                EXECUTE IMMEDIATE('DROP TABLE TBL_259_2 PURGE');
                EXCEPTION  WHEN e_table_missing THEN NULL;  END;
                EXECUTE IMMEDIATE (
                    'CREATE TABLE TBL_259_2
                     (INTCOL NUMBER, STRINGCOL VARCHAR2(256))');
            END;`;

    before(async function() {
      conn = await oracledb.getConnection(dbConfig);
      await conn.execute(sql);

      if (dbConfig.test.DBA_PRIVILEGE) {
        const dbaCredential = {
          user: dbConfig.test.DBA_user,
          password: dbConfig.test.DBA_password,
          connectString: dbConfig.connectString,
          privilege: oracledb.SYSDBA,
        };
        dbaConn = await oracledb.getConnection(dbaCredential);
      }
    });

    after(async function() {
      if (conn) {
        conn.execute(`DROP TABLE TBL_259_2 PURGE`);
        await conn.close();
      }
      if (dbaConn) {
        await dbaConn.close();
      }
    });

    it('259.2.1 test tpcBegin, tpcPrepare, tpcRollback', async function() {
      const xid = {
        formatId: 3900,
        globalTransactionId: "txn3900",
        branchQualifier: "branchId"
      };
      await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60);
      let commitNeeded = await conn.tpcPrepare(xid);
      assert.strictEqual(commitNeeded, false);

      await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60);
      await conn.execute(`INSERT INTO TBL_259_2 VALUES (101, 'test#1')`);

      commitNeeded = await conn.tpcPrepare(xid);
      assert.strictEqual(commitNeeded, true);
      await conn.tpcRollback(xid);
      const result = await conn.execute(`SELECT * FROM TBL_259_2`);
      assert.strictEqual(result.rows.length, 0);
    });

    it('259.2.2 test tpcBegin, tpcPrepare, tpcCommit', async function() {
      const xid = {
        formatId: 3901,
        globalTransactionId: "txn3901",
        branchQualifier: "branchId"
      };
      await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60);
      await conn.execute(
        `INSERT INTO TBL_259_2 (IntCol, StringCol) values (1, 'testName')`);
      const commitNeeded = await conn.tpcPrepare(xid);
      assert.strictEqual(commitNeeded, true);
      await conn.tpcCommit(xid, false);

      const conn1 = await oracledb.getConnection(dbConfig);
      const result = await conn1.execute(`SELECT INTCOL FROM TBL_259_2`);
      assert.strictEqual(result.rows[0][0], 1);
      await conn1.close();
    });

    it('259.2.3 test multiple global transactions on same connection', async function() {
      const xid1 = {
        formatId: 3902,
        globalTransactionId: "txn3902",
        branchQualifier: "branch1"
      };

      const xid2 = {
        formatId: 3902,
        globalTransactionId: "txn3902",
        branchQualifier: "branch2"
      };

      await conn.tpcBegin(xid1, oracledb.TPC_BEGIN_NEW, 60);
      await conn.execute(
        `INSERT INTO TBL_259_2 (IntCol, StringCol) VALUES (1, 'testName')`);
      await conn.tpcEnd(xid1);

      await conn.tpcBegin(xid2, oracledb.TPC_BEGIN_NEW, 60);
      await conn.execute(
        `INSERT INTO TBL_259_2 (IntCol, StringCol) VALUES (2, 'testName')`);
      await conn.tpcEnd(xid2);

      const commitNeeded1 = await conn.tpcPrepare(xid1);
      const commitNeeded2 = await conn.tpcPrepare(xid2);
      if (commitNeeded1)
        await conn.tpcCommit(xid1);
      if (commitNeeded2)
        await conn.tpcCommit(xid2);
      const result1 = await conn.execute(
        `SELECT INTCOL, STRINGCOL FROM TBL_259_2 WHERE INTCOL = :1`, [1]);
      assert.strictEqual (result1.rows[0][0], 1);
      const result2 = await conn.execute(
        `SELECT INTCOL, STRINGCOL FROM TBL_259_2 WHERE INTCOL = :1`, [2]);
      assert.strictEqual(result2.rows[0][0], 2);
    });

    it('259.2.4 test tpcPrepare with no xid', async function() {
      const xid = {
        formatId: 3904,
        globalTransactionId: "txn3904",
        branchQualifier: "branchId"
      };

      await conn.tpcBegin(xid);
      let commitNeeded = await conn.tpcPrepare();
      assert.strictEqual(commitNeeded, false);

      await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60);
      await conn.execute(`INSERT INTO TBL_259_2 VALUES (101, 'test#1')`);

      commitNeeded = await conn.tpcPrepare();
      assert.strictEqual(commitNeeded, true);
      await conn.tpcRollback();
    });

    it('259.2.5 negative - missing formatId in XID', async function() {
      const xid = {
        globalTransactionId: "txn3900",
        branchQualifier: "branchId"
      };
      await assert.rejects(
        async () => await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60),
        /NJS-005:/
      );
    });

    it('259.2.6 negative missing globalTxnId in XID', async function() {
      const xid = {
        formatId: 3900,
        branchQualifier: "branchId"
      };
      await assert.rejects(
        async () => await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60),
        /NJS-005:/
      );
    });

    it('259.2.7 negative missing branchQualifier in XID', async function() {
      const xid = {
        formatId: 3900,
        globalTransactionId: "txn3900",
      };
      await assert.rejects(
        async () => await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60),
        /NJS-005:/
      );
    });

    it('259.2.8 negative tpcForget after tpcPrepare', async function() {
      if (oracledb.thin) {
        this.skip();
      }
      const xid = {
        formatId: 3998,
        globalTransactionId: "txn3998",
        branchQualifier: "branchId"
      };

      // Begin a new transaction
      await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60);

      // Perform some database operations within the transaction
      await conn.execute(`INSERT INTO TBL_259_2 VALUES (102, 'test#2')`);

      // Prepare the transaction
      await conn.tpcPrepare(xid);

      // Call tpcForget to forget the transaction
      await assert.rejects(
        async () => await conn.tpcForget(xid),
        /ORA-24770:/ //ORA-24770: cannot forget a prepared transaction
      );
      await conn.tpcRollback(xid);
    });

    it('259.2.9 negative tpcForget without tpcPrepare', async function() {
      if (oracledb.thin) {
        this.skip();
      }
      const xid = {
        formatId: 3999,
        globalTransactionId: "txn3999",
        branchQualifier: "branchId"
      };

      // Begin a new transaction
      await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60);

      // Perform some database operations within the transaction
      await conn.execute(`INSERT INTO TBL_259_2 VALUES (102, 'test#2')`);

      // Call tpcForget to forget the transaction
      await assert.rejects(
        async () => await conn.tpcForget(xid),
        /ORA-24769:/ //ORA-24769: cannot forget an active transaction
      );
      await conn.tpcRollback(xid);
    });

    it('259.2.10 tpcRecover', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE)
        this.skip();

      const xid = {
        formatId: 5000,
        globalTransactionId: "txn5000",
        branchQualifier: "branchId"
      };

      await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60);
      await conn.execute(`INSERT INTO TBL_259_2 VALUES (101, 'test#1')`);
      await conn.tpcPrepare(xid);
      const promise =  dbaConn.tpcRecover();
      const res = await Promise.resolve(promise);
      assert.strictEqual(res[0].formatId, 5000);
      assert.strictEqual(res[0].globalTransactionId, "txn5000");
      assert.strictEqual(res[0].branchQualifier, "branchId");
      await conn.tpcCommit(res[0]);
    });
  });

  describe('259.3 TPC Functions with no default values', function() {
    let conn = null;
    const sql = `BEGIN
        DECLARE
            e_table_missing EXCEPTION;
            PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
            BEGIN
                EXECUTE IMMEDIATE('DROP TABLE TBL_259_2 PURGE');
                EXCEPTION  WHEN e_table_missing THEN NULL;  END;
                EXECUTE IMMEDIATE (
                    'CREATE TABLE TBL_259_2
                     (INTCOL NUMBER, STRINGCOL VARCHAR2(256))');
            END;`;

    before(async function() {
      conn = await oracledb.getConnection(dbConfig);
      await conn.execute(sql);
    });

    after(async function() {
      if (conn) {
        conn.execute(`DROP TABLE TBL_259_2 PURGE`);
        await conn.close();
      }
    });

    it('259.3.1 test tpcBegin, tpcPrepare, tpcRollback', async function() {
      const xid = {
        formatId: 3900,
        globalTransactionId: "txn3900",
        branchQualifier: "branchId"
      };
      await conn.tpcBegin(xid);
      let commitNeeded = await conn.tpcPrepare(xid);
      assert.strictEqual(commitNeeded, false);

      await conn.tpcBegin(xid);
      await conn.execute(`INSERT INTO TBL_259_2 VALUES (101, 'test#1')`);

      commitNeeded = await conn.tpcPrepare(xid);
      assert.strictEqual(commitNeeded, true);
      await conn.tpcRollback(xid);
      const result = await conn.execute(`SELECT * FROM TBL_259_2`);
      assert.strictEqual(result.rows.length, 0);
    });

    it('259.3.2 test tpcBegin, tpcPrepare, tpcCommit', async function() {
      const xid = {
        formatId: 3901,
        globalTransactionId: "txn3901",
        branchQualifier: "branchId"
      };
      await conn.tpcBegin(xid);
      await conn.execute(
        `INSERT INTO TBL_259_2 (IntCol, StringCol) values (1, 'testName')`);
      const commitNeeded = await conn.tpcPrepare(xid);
      assert.strictEqual(commitNeeded, true);
      await conn.tpcCommit(xid, false);

      const conn1 = await oracledb.getConnection(dbConfig);
      const result = await conn1.execute(`SELECT INTCOL FROM TBL_259_2`);
      assert.strictEqual(result.rows[0][0], 1);
      await conn1.close();
    });

    it('259.3.3 test multiple global transactions on same connection', async function() {
      const xid1 = {
        formatId: 3902,
        globalTransactionId: "txn3902",
        branchQualifier: "branch1"
      };

      const xid2 = {
        formatId: 3902,
        globalTransactionId: "txn3902",
        branchQualifier: "branch2"
      };

      await conn.tpcBegin(xid1);
      await conn.execute(
        `INSERT INTO TBL_259_2 (IntCol, StringCol) VALUES (1, 'testName')`);
      await conn.tpcEnd(xid1);

      await conn.tpcBegin(xid2);
      await conn.execute(
        `INSERT INTO TBL_259_2 (IntCol, StringCol) VALUES (2, 'testName')`);
      await conn.tpcEnd(xid2);

      const commitNeeded1 = await conn.tpcPrepare(xid1);
      const commitNeeded2 = await conn.tpcPrepare(xid2);
      if (commitNeeded1)
        await conn.tpcCommit(xid1);
      if (commitNeeded2)
        await conn.tpcCommit(xid2);
      const result1 = await conn.execute(
        `SELECT INTCOL, STRINGCOL FROM TBL_259_2 WHERE INTCOL = :1`, [1]);
      assert.strictEqual (result1.rows[0][0], 1);
      const result2 = await conn.execute(
        `SELECT INTCOL, STRINGCOL FROM TBL_259_2 WHERE INTCOL = :1`, [2]);
      assert.strictEqual(result2.rows[0][0], 2);
    });

    it('259.3.4 test tpcPrepare with no xid', async function() {
      const xid = {
        formatId: 3904,
        globalTransactionId: "txn3904",
        branchQualifier: "branchId"
      };

      await conn.tpcBegin(xid);
      let commitNeeded = await conn.tpcPrepare();
      assert.strictEqual(commitNeeded, false);

      await conn.tpcBegin(xid);
      await conn.execute(`INSERT INTO TBL_259_2 VALUES (101, 'test#1')`);

      commitNeeded = await conn.tpcPrepare();
      assert.strictEqual(commitNeeded, true);
      await conn.tpcRollback();
    });

    it('259.3.5 negative - missing formatId in XID', async function() {
      const xid = {
        globalTransactionId: "txn3900",
        branchQualifier: "branchId"
      };
      await assert.rejects(
        async () => await conn.tpcBegin(xid),
        /NJS-005/
      );
    });


    it('259.3.6 negative missing globalTxnId in XID', async function() {
      const xid = {
        formatId: 3900,
        branchQualifier: "branchId"
      };
      await assert.rejects(
        async () => await conn.tpcBegin(xid),
        /NJS-005/
      );
    });

    it('259.3.7 negative missing branchQualifier in XID', async function() {
      const xid = {
        formatId: 3900,
        globalTransactionId: "txn3900",
      };
      await assert.rejects(
        async () => await conn.tpcBegin(xid),
        /NJS-005/
      );
    });

  });

  describe('259.4 TPC Properties', function() {
    let conn = null;

    before(async function() {
      conn = await oracledb.getConnection(dbConfig);
    });

    after(async function() {
      if (conn) {
        await conn.close();
      }
    });

    it('259.4.1 set and get externalName', function() {
      const extName = "testExternalName";

      conn.externalName = extName;
      assert.strictEqual(conn.externalName, extName);
    });

    it('259.4.2 set and get internalName', function() {
      const intName = "testInternalName";

      conn.internalName = intName;
      assert.strictEqual(conn.internalName, intName);
    });

    it('259.4.3 set and query ecid', async function() {
      if (oracledb.thin) {
        this.skip();
      }
      const sql =  `SELECT USERNAME, SID, OSUSER, ECID FROM V$SESSION
          WHERE SID = :1`;

      // obtain the sid
      const sid = await testUtil.getSid(conn);

      let result = await conn.execute(sql, [sid]);
      assert.strictEqual(result.rows[0][3], null);

      conn.ecid = "ecid1";
      result = await conn.execute(sql, [sid]);
      assert.strictEqual(result.rows[0][3], "ecid1");
    });

  });

  describe('259.5 TPC Functions using Buffer type', function() {
    let conn = null;
    const sql = `BEGIN
        DECLARE
            e_table_missing EXCEPTION;
            PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
            BEGIN
                EXECUTE IMMEDIATE('DROP TABLE TBL_259_4 PURGE');
                EXCEPTION  WHEN e_table_missing THEN NULL;  END;
                EXECUTE IMMEDIATE (
                    'CREATE TABLE TBL_259_4
                     (INTCOL NUMBER, STRINGCOL VARCHAR2(256))');
            END;`;

    before(async function() {
      conn = await oracledb.getConnection(dbConfig);
      await conn.execute(sql);
    });

    after(async function() {
      if (conn) {
        conn.execute(`DROP TABLE TBL_259_4 PURGE`);
        await conn.close();
      }
    });

    it('259.5.1 test tpcBegin, tpcPrepare, tpcRollback using Buffer type', async function() {
      const buf = Buffer.from(['t', 'x', 'n', '3', '9', '0', '4'], "utf-8");
      const xid = {
        formatId: 3904,
        globalTransactionId: buf,
        branchQualifier: "branchId"
      };

      await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60);
      let commitNeeded = await conn.tpcPrepare(xid);
      assert.strictEqual(commitNeeded, false);

      await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60);
      await conn.execute(`INSERT INTO TBL_259_4 VALUES (101, 'test#1')`);

      commitNeeded = await conn.tpcPrepare(xid);
      assert.strictEqual(commitNeeded, true);
      await conn.tpcRollback(xid);
      const result = await conn.execute(`SELECT * FROM TBL_259_4`);
      assert.strictEqual(result.rows.length, 0);
    });

    it('259.5.2 test tpcBegin, tpcPrepare, tpcRollback using Buffer type 2', async function() {
      const buf = Buffer.from(['b', 'r', 'a', 'n', 'c', 'h', 'I', 'd'], "utf-8");
      const xid = {
        formatId: 3904,
        globalTransactionId: "txn3904",
        branchQualifier: buf
      };

      await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60);
      let commitNeeded = await conn.tpcPrepare(xid);
      assert.strictEqual(commitNeeded, false);

      await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60);
      await conn.execute(`INSERT INTO TBL_259_4 VALUES (101, 'test#1')`);

      commitNeeded = await conn.tpcPrepare(xid);
      assert.strictEqual(commitNeeded, true);
      await conn.tpcRollback(xid);
      const result = await conn.execute(`SELECT * FROM TBL_259_4`);
      assert.strictEqual(result.rows.length, 0);
    });
  });


  describe('259.6 TPC Functions with invalid # of parameters', function() {
    let conn = null;
    const xid = {
      formatId: 25960,
      globalTransactionId: "txt259.6",
      branchQualifier: "brancId1"
    };

    before(async function() {
      conn = await oracledb.getConnection(dbConfig);
    });

    after (async function() {
      if (conn)
        await conn.close();
    });

    it('259.6.1 tpcBegin invalid number of arguments', async function() {
      await assert.rejects(
        async () => await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60, "abc"),
        /NJS-009/
      );
    });

    it('259.6.2 tpcCommit invalid number of arguments', async function() {
      await assert.rejects(
        async () => await conn.tpcCommit(xid, true, "abc"),
        /NJS-009/
      );
    });

    it('259.6.3 tpcEnd invalid number of arguments', async function() {
      await assert.rejects(
        async () => await conn.tpcEnd(xid, oracledb.TPC_END_SUSPEND, "abc"),
        /NJS-009/
      );
    });

    it('259.6.4 tpcForget invalid number of arguments', async function() {
      await assert.rejects(
        async () => await conn.tpcForget(xid, "abc"),
        /NJS-009/
      );
    });

    it('259.6.5 tpcPrepare invalid number of args', async function() {
      await assert.rejects(
        async () => await conn.tpcPrepare(xid, "abc"),
        /NJS-009/
      );
    });

    it('259.6.6 tpcRecover invalid number of args', async function() {
      await assert.rejects(
        async () => await conn.tpcRecover(xid, "abc"),
        /NJS-009/
      );
    });

    it('259.6.7 tpcRollback invalid number of args', async function() {
      await assert.rejects(
        async () => await conn.tpcRollback(xid, "abc"),
        /NJS-009/
      );
    });
  });

  describe('259.7 XID parameters validation', function() {
    let conn = null;
    before(async function() {
      conn = await oracledb.getConnection(dbConfig);
    });

    after (async function() {
      if (conn)
        await conn.close();
    });

    it('259.6.1 globalTransactionId size greater than 64', async function() {
      const xid = {
        formatId: 979797,
        globalTransactionId: "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq",
        branchQualifier: "brancId1"
      };
      await assert.rejects(
        async () => await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60),
        /NJS-153/
      );
    });

    it('259.6.2 branchQualifier invalid number of arguments', async function() {
      const xid = {
        formatId: 979797,
        globalTransactionId: "txn9999",
        branchQualifier: "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"
      };
      await assert.rejects(
        async () => await conn.tpcBegin(xid, oracledb.TPC_BEGIN_NEW, 60),
        /NJS-154/
      );
    });
  });
});

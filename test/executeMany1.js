/* Copyright (c) 2018, 2025, Oracle and/or its affiliates. */

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
 *   163. executeMany1.js
 *
 * DESCRIPTION
 *   Test connection.executeMany() method.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('163. executeMany1.js', function() {

  let conn;

  before(async function() {
    conn = await oracledb.getConnection(dbConfig);
    const proc = "BEGIN \n" +
               "    DECLARE \n" +
               "        e_table_missing EXCEPTION; \n" +
               "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
               "    BEGIN \n" +
               "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_xmany PURGE'); \n" +
               "    EXCEPTION \n" +
               "        WHEN e_table_missing \n" +
               "        THEN NULL; \n" +
               "    END; \n" +
               "    EXECUTE IMMEDIATE (' \n" +
               "        CREATE TABLE nodb_tab_xmany ( \n" +
               "            id     NUMBER, \n" +
               "            val    VARCHAR2(100) \n" +
               "        ) \n" +
               "    '); \n" +
               "END; ";
    await conn.execute(proc);
  }); // before()

  after(async function() {
    const sql = "DROP TABLE nodb_tab_xmany PURGE";
    await conn.execute(sql);
    await conn.close();
  }); // after

  it('163.1 inserts many rows with bind by name', async function() {

    const binds = [
      { a: 1, b: "Test 1 (One)" },
      { a: 2, b: "Test 2 (Two)" },
      { a: 3, b: "Test 3 (Three)" },
      { a: 4 },
      { a: 5, b: "Test 5 (Five)" }
    ];
    let sql = "INSERT INTO nodb_tab_xmany VALUES (:a, :b)";
    const options = {
      autoCommit: true,
      bindDefs: {
        a: { type: oracledb.NUMBER },
        b: { type: oracledb.STRING, maxSize: 15 }
      }
    };

    let result = await conn.executeMany(sql, binds, options);
    assert.strictEqual(result.rowsAffected, binds.length);
    sql = "SELECT * FROM nodb_tab_xmany ORDER BY ID";
    const expectVal = [
      [ 1, 'Test 1 (One)' ],
      [ 2, 'Test 2 (Two)' ],
      [ 3, 'Test 3 (Three)' ],
      [ 4, null ],
      [ 5, 'Test 5 (Five)' ]
    ];
    result = await conn.execute(sql);
    assert.deepStrictEqual(result.rows, expectVal);
    await dotruncate();
  }); // 163.1

  it('163.2 inserts rows with bind by position', async function() {
    const binds = [
      [1, "Test 1 (One)"],
      [2, "Test 2 (Two)"],
      [3, "Test 3 (Three)"],
      [4, null],
      [5, "Test 5 (Five)"]
    ];
    let sql = "INSERT INTO nodb_tab_xmany VALUES (:1, :2)";
    const options = {
      autoCommit: true,
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.STRING, maxSize: 15 }
      ]
    };
    let result = await conn.executeMany(sql, binds, options);
    assert.strictEqual(result.rowsAffected, binds.length);
    sql = "SELECT * FROM nodb_tab_xmany ORDER BY ID";
    result = await conn.execute(sql);
    assert.deepStrictEqual(result.rows, binds);
    await dotruncate();
  }); // 163.2

  it('163.3 DML RETURNING that returns single value', async function() {
    const sql = "INSERT INTO nodb_tab_xmany VALUES (:1, :2) RETURNING id, val INTO :3, :4";
    const binds = [
      [1, "Test 1 (One)"],
      [2, "Test 2 (Two)"],
      [3, "Test 3 (Three)"],
      [4, null],
      [5, "Test 5 (Five)"]
    ];
    const options = {
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.STRING, maxSize: 20 },
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        { type: oracledb.STRING, maxSize: 25, dir: oracledb.BIND_OUT }
      ]
    };

    const result = await conn.executeMany(sql, binds, options);
    assert.strictEqual(result.rowsAffected, binds.length);
    for (let i = 0; i < result.outBinds.length; i++) {
      assert.strictEqual(result.outBinds[i][0][0], binds[i][0]);
      assert.strictEqual(result.outBinds[i][1][0], binds[i][1]);
    }
    await dotruncate();
  }); // 163.3

  it('163.4 DML RETURNING that returns multiple values', async function() {
    let sql = "INSERT INTO nodb_tab_xmany VALUES(:1, :2)";
    let binds = [
      [1, "Test 1 (One)"],
      [2, "Test 2 (Two)"],
      [3, "Test 3 (Three)"],
      [4, "Test 4 (Four)"],
      [5, "Test 5 (Five)"],
      [6, "Test 6 (Six)"],
      [7, "Test 7 (Seven)"],
      [8, "Test 8 (Eight)"]
    ];
    let options = {
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.STRING, maxSize: 20 }
      ]
    };
    let result = await conn.executeMany(sql, binds, options);
    assert.strictEqual(result.rowsAffected, binds.length);

    sql = "DELETE FROM nodb_tab_xmany WHERE id < :1 RETURNING id, val INTO :2, :3";
    binds = [ [2], [6], [8] ];
    options = {
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        { type: oracledb.STRING, maxSize: 25, dir: oracledb.BIND_OUT }
      ]
    };
    result = await conn.executeMany(sql, binds, options);
    assert.strictEqual(result.rowsAffected, 7);
    assert.strictEqual(result.outBinds.length, 3);
    assert.deepStrictEqual(
      result.outBinds[0],
      [ [ 1 ], [ 'Test 1 (One)' ] ]
    );
    assert.deepStrictEqual(
      result.outBinds[1],
      [ [ 2, 3, 4, 5 ], [ 'Test 2 (Two)', 'Test 3 (Three)', 'Test 4 (Four)', 'Test 5 (Five)' ]]
    );
    assert.deepStrictEqual(
      result.outBinds[2],
      [ [ 6, 7 ], [ 'Test 6 (Six)', 'Test 7 (Seven)' ] ]
    );
    await dotruncate();
  }); // 163.4

  it('163.5 calls PL/SQL', async function() {
    await doCreateProc();
    const plsql = "BEGIN nodb_proc_em(:1, :2, :3); END;";
    const binds = [ [1], [2], [3], [4], [6] ];
    const options = {
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 20 }
      ]
    };
    const result = await conn.executeMany(plsql, binds, options);
    assert.deepStrictEqual(
      result.outBinds,
      [ [ 2, 'X' ], [ 4, 'XX' ], [ 6, 'XXX' ], [ 8, 'XXXX' ], [ 12, 'XXXXXX' ] ]
    );
    await doDropProc();
  }); // 163.5

  it('163.6 shows dmlRowCounts', async function() {

    if ((testsUtil.getClientVersion() < 1201000200)
      || (conn.oracleServerVersion < 1201000200)) {
      return this.skip();
    }

    const childTable = "nodb_tab_child_one";
    const parentTable = "nodb_tab_parent_one";

    await makeParentChildTables(childTable, parentTable);
    const sql = "DELETE FROM " + childTable + " WHERE parentid = :1";
    const binds = [ [20], [30], [50] ];
    const options = { dmlRowCounts: true };
    const result = await conn.executeMany(sql, binds, options);
    assert.strictEqual(result.rowsAffected, 9);
    assert.deepStrictEqual(result.dmlRowCounts, [ 3, 2, 4 ]);
    await dropParentChildTables(childTable, parentTable);
  }); // 163.6

  it('163.7 shows batchErrors behavior', async function() {

    if ((testsUtil.getClientVersion() < 1201000200)
      || (conn.oracleServerVersion < 1201000200)) {
      return this.skip();
    }

    const childTable = "nodb_tab_child_two";
    const parentTable = "nodb_tab_parent_two";

    await makeParentChildTables(childTable, parentTable);
    const sql = "INSERT INTO " + childTable + " VALUES (:1, :2, :3)";
    const binds = [
      [1016, 10, "Child 2 of Parent A"],
      [1017, 10, "Child 3 of Parent A"],
      [1018, 20, "Child 4 of Parent B"],
      [1018, 20, "Child 4 of Parent B"],   // duplicate key
      [1019, 30, "Child 3 of Parent C"],
      [1020, 40, "Child 4 of Parent D"],
      [1021, 75, "Child 1 of Parent F"],   // parent does not exist
      [1022, 40, "Child 6 of Parent D"]
    ];
    const options = {
      autoCommit: true,
      batchErrors: true,
      dmlRowCounts: true,
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.NUMBER },
        { type: oracledb.STRING, maxSize: 20 }
      ]
    };
    const result = await conn.executeMany(sql, binds, options);
    assert.strictEqual(result.rowsAffected, 6);
    assert.deepStrictEqual(result.dmlRowCounts, [ 1, 1, 1, 0, 1, 1, 0, 1 ]);
    assert(result.batchErrors[0].message.startsWith('ORA-00001: '));
    // ORA-00001: unique constraint (HR.CHILDTAB_PK) violated
    assert(result.batchErrors[1].message.startsWith('ORA-02291: '));
    // ORA-02291: integrity constraint (HR.CHILDTAB_FK) violated - parent key not found
    await dropParentChildTables(childTable, parentTable);
  }); // 163.7

  it('163.8 Negative - batchErrors with non-DML statement', async function() {

    if (testsUtil.getClientVersion() < 1201000200) {
      return this.skip();
    }

    await doCreateProc();

    const plsql = "BEGIN nodb_proc_em(:1, :2, :3); END;";
    const binds = [ [1], [2], [3], [4], [6] ];
    const options = {
      batchErrors: true,
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 20 }
      ]
    };

    await assert.rejects(
      async () => await conn.executeMany(plsql, binds, options),
      /NJS-095:/
    );
    await doDropProc();
  }); // 163.8

  it('163.9 if batchErrors is disabled', async function() {

    if (testsUtil.getClientVersion() < 1201000200) {
      return this.skip();
    }

    const childTable = "nodb_tab_child_three";
    const parentTable = "nodb_tab_parent_three";

    await makeParentChildTables(childTable, parentTable);
    const sql = "INSERT INTO " + childTable + " VALUES (:1, :2, :3)";
    const binds = [
      [1016, 10, "Child 2 of Parent A"],
      [1017, 10, "Child 3 of Parent A"],
      [1018, 20, "Child 4 of Parent B"],
      [1018, 20, "Child 4 of Parent B"],   // duplicate key
      [1019, 30, "Child 3 of Parent C"],
      [1020, 40, "Child 4 of Parent D"],
      [1021, 75, "Child 1 of Parent F"],   // parent does not exist
      [1022, 40, "Child 6 of Parent D"]
    ];
    const options = {
      autoCommit: true,
      batchErrors: false,
      dmlRowCounts: true,
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.NUMBER },
        { type: oracledb.STRING, maxSize: 20 }
      ]
    };
    await assert.rejects(
      async () => await conn.executeMany(sql, binds, options),
      /ORA-00001:/
    );
    await dropParentChildTables(childTable, parentTable);
  }); // 163.9

  it('163.10 Negative -  dmlRowCounts with non-DML statement', async function() {
    if (testsUtil.getClientVersion() < 1201000200) {
      return this.skip();
    }

    await doCreateProc();
    const plsql = "BEGIN nodb_proc_em(:1, :2, :3); END;";
    const binds = [ [1], [2], [3], [4], [6] ];
    const options = {
      dmlRowCounts: true,
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 20 }
      ]
    };
    await assert.rejects(
      async () => await conn.executeMany(plsql, binds, options),
      /NJS-095:/
    );
    await doDropProc();
  }); // 163.10

  it('163.11 numIterations - only OUT parameters', async function() {
    const sql =
    `declare
         t_Id          number;
     begin
         select nvl(count(*), 0) + 1 into t_Id
         from nodb_tab_xmany;

         insert into nodb_tab_xmany
         values (t_Id, 'Test String ' || t_Id);

         select sum(Id) into :1
         from nodb_tab_xmany;
    end;`;
    const bindDefs = [
      { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    ];
    const options = { bindDefs: bindDefs };
    const numIterations = 8;
    const result = await conn.executeMany(sql, numIterations, options);
    assert.deepStrictEqual(
      result.outBinds,
      [ [ 1 ], [ 3 ], [ 6 ], [ 10 ], [ 15 ], [ 21 ], [ 28 ], [ 36 ] ]
    );
    await dotruncate();
  }); // 163.11

  it('163.12 numIterations - No parameters', async function() {
    const sql = `
    declare
        t_Id          number;
    begin
        select nvl(count(*), 0) + 1 into t_Id
        from nodb_tab_xmany;

        insert into nodb_tab_xmany
        values (t_Id, 'Test String ' || t_Id);
    end;`;

    const numIterations = 8;
    await conn.executeMany(sql, numIterations);
    await dotruncate();
  }); // 163.12

  it('163.13 numIterations - DML RETURNING', async function() {
    const sql = `
    insert into nodb_tab_xmany (val)
    values (to_char(systimestamp, 'YYYY-MM-DD HH24:MI:SS.FF'))
    returning id, val into :1, :2`;

    const bindDefs = [
      { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 30 }
    ];

    const options = { bindDefs: bindDefs };
    const numIterations = 8;
    const result = await conn.executeMany(sql, numIterations, options);
    assert.strictEqual(result.outBinds.length, numIterations);
    await dotruncate();
  }); // 164.13

  it('163.14 Negative - set numIterations to be negative value', async function() {
    const sql = `
    declare
        t_Id number;
    begin
        select nvl(count(*), 0) + 1 into t_Id
        from nodb_tab_xmany;

        insert into nodb_tab_xmany
        values (t_Id, 'Test String ' || t_Id);
    end;`;

    const numIterations = -8;
    await assert.rejects(
      async () => await conn.executeMany(sql, numIterations),
      /NJS-005:/
    );
    await dotruncate();
  }); // 163.14

  it('163.15 getting dmlrowcounts after executemany with dmlrowcounts=False', async function() {

    const binds = [
      { a: 6, b: "Test 6 (Six)" },
      { a: 7, b: "Test 7 (Seven)" },
      { a: 8, b: "Test 8 (Eight)" },
      { a: 9 },
      { a: 10, b: "Test 10 (Ten)" }
    ];
    let sql = "INSERT INTO nodb_tab_xmany VALUES (:a, :b)";

    let result = await conn.executeMany(sql, binds, { dmlRowCounts: false });
    assert.strictEqual(result.rowsAffected, binds.length);
    sql = "SELECT * FROM nodb_tab_xmany ORDER BY ID";
    const expectVal = [
      [ 6, 'Test 6 (Six)' ],
      [ 7, 'Test 7 (Seven)' ],
      [ 8, 'Test 8 (Eight)' ],
      [ 9, null ],
      [ 10, 'Test 10 (Ten)' ]
    ];
    result = await conn.execute(sql);
    assert.deepStrictEqual(result.rows, expectVal);
    await dotruncate();
  }); // 163.15

  it('163.16 executemany() with an invalid row', async function() {

    const binds = [
      { a: 6, b: "Test 6 (Six)" },
      { a: 7, b: "Test 7 (Seven)" },
      { a: 8, b: 8 }
    ];
    const sql = "INSERT INTO nodb_tab_xmany VALUES (:a, :b)";

    await assert.rejects(
      async () => await conn.executeMany(sql, binds, { dmlRowCounts: true }),
      /NJS-011:/
    );
    await dotruncate();
  }); // 163.16

  it('163.17 calls PL/SQL, with round trip count check', async function() {
    if (!dbConfig.test.DBA_PRIVILEGE || (await testsUtil.cmanTdmCheck())) {
      this.skip();
    }
    await doCreateProc();
    const plsql = "BEGIN nodb_proc_em(:1, :2, :3); END;";
    const binds = [ [1], [2], [3], [4], [6]];
    const options = {
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 20 }
      ]
    };
    const sid = await testsUtil.getSid(conn);
    const rt1 = await testsUtil.getRoundTripCount(sid);
    await conn.executeMany(plsql, binds, options);
    const rt2 = await testsUtil.getRoundTripCount(sid);
    let result = false;
    // thick does OAL8 after each iterations. Round trip count increases
    // with each iteration.
    if (dbConfig.test.mode === 'thick' && rt2 - rt1 === 5) {
      result = true;
    }

    if (dbConfig.test.mode === 'thin' && rt2 - rt1 < 3) {
      result = true;
    }
    assert.deepStrictEqual(result, true);
    await doDropProc();
  }); // 163.17

  it('163.18 Negative - executeMany with SELECT query, positional bind', async function() {

    if (testsUtil.getClientVersion() < 1201000200) {
      return this.skip();
    }

    const sql = "SELECT :1 FROM DUAL";
    const binds = [ [3] ];

    await assert.rejects(
      async () => await conn.executeMany(sql, binds),
      // Thick mode - DPI-1013: not supported
      // Thin mode - NJS-157: executeMany() cannot be used with
      // SELECT statement or WITH SQL clause
      /DPI-1013:|NJS-157:/
    );
  }); // 163.18

  it('163.19 Negative - executeMany with SELECT query, named bind', async function() {

    if (testsUtil.getClientVersion() < 1201000200) {
      return this.skip();
    }

    const sql = "SELECT :num FROM DUAL";
    const binds = [{ num: 3 }];

    await assert.rejects(
      async () => await conn.executeMany(sql, binds),
      // Thick mode - DPI-1013: not supported
      // Thin mode - NJS-157: executeMany() cannot be used with
      // SELECT statement or WITH SQL clause
      /DPI-1013:|NJS-157:/
    );
  }); // 163.19

  it('163.20 Negative - executeMany with WITH SQL clause, positional bind', async function() {

    if (testsUtil.getClientVersion() < 1201000200) {
      return this.skip();
    }

    const sql =  "WITH data as (SELECT 1 as Num1, 2 as Num2 from dual) SELECT :1 from data";
    const binds = [ [1] ];

    await assert.rejects(
      async () => await conn.executeMany(sql, binds),
      // Thick mode - DPI-1013: not supported
      // Thin mode - NJS-157: executeMany() cannot be used with
      // SELECT statement or WITH SQL clause
      /DPI-1013:|NJS-157:/
    );
  }); // 163.20

  it('163.21 Negative - executeMany with WITH SQL clause, named bind', async function() {

    if (testsUtil.getClientVersion() < 1201000200) {
      return this.skip();
    }

    const sql = "WITH data as (SELECT 1 as Num1, 2 as Num2 from dual) SELECT :Num1 from data";
    const binds = [ { Num1: 3 } ];

    await assert.rejects(
      async () => await conn.executeMany(sql, binds),
      // Thick mode - DPI-1013: not supported
      // Thin mode - NJS-157: executeMany() cannot be used with
      // SELECT statement or WITH SQL clause
      /DPI-1013:|NJS-157:/
    );
  }); // 163.21

  it('163.22 Negative - executeMany with SELECT query, multiple positional binds', async function() {

    if (testsUtil.getClientVersion() < 1201000200) {
      return this.skip();
    }

    const sql = "SELECT :1, :2 FROM DUAL";
    const binds = [ [1, 2] ];

    await assert.rejects(
      async () => await conn.executeMany(sql, binds),
      // Thick mode - DPI-1013: not supported
      // Thin mode - NJS-157: executeMany() cannot be used with
      // SELECT statement or WITH SQL clause
      /DPI-1013:|NJS-157:/
    );
  }); // 163.22

  it('163.23 Negative - executeMany with WITH SQL clause and multiple positional binds', async function() {

    if (testsUtil.getClientVersion() < 1201000200) {
      return this.skip();
    }

    const sql = "WITH data as (SELECT 1 as Num1, 2 as Num2 from dual) SELECT :1, :2 FROM data";
    const binds = [ [1, 2] ];

    await assert.rejects(
      async () => await conn.executeMany(sql, binds),
      // Thick mode - DPI-1013: not supported
      // Thin mode - NJS-157: executeMany() cannot be used with
      // SELECT statement or WITH SQL clause
      /DPI-1013:|NJS-157:/
    );
  }); // 163.23

  it('163.24 Negative - executeMany with SELECT query and invalid bind variable', async function() {

    if (testsUtil.getClientVersion() < 1201000200) {
      return this.skip();
    }

    const sql = "SELECT :invalidBind FROM DUAL";
    const binds = [ [3] ];

    await assert.rejects(
      async () => await conn.executeMany(sql, binds),
      // Thick mode - DPI-1013: not supported
      // Thin mode - NJS-157: executeMany() cannot be used with
      // SELECT statement or WITH SQL clause
      /DPI-1013:|NJS-157:/
    );
  }); // 163.24

  it('163.25 Negative - executeMany with DDL - CREATE TABLE', async function() {

    // Does not throw the proper error in Thin mode yet
    if (testsUtil.getClientVersion() < 1201000200 || oracledb.thin) {
      return this.skip();
    }

    const sql = "CREATE TABLE :tblname (:id NUMBER, :name VARCHAR2(30))";
    const binds = [ ["tbl1", "ID", "NAME"] ];

    await assert.rejects(
      async () => await conn.executeMany(sql, binds),
      // Thick mode - DPI-1059: bind variables are not supported in DDL statements
      /DPI-1059:/
    );
  }); // 163.25

  const doCreateProc = async function() {
    const proc = "CREATE OR REPLACE PROCEDURE nodb_proc_em (a_num IN NUMBER, " +
               "    a_outnum OUT NUMBER, a_outstr OUT VARCHAR2) \n" +
               "AS \n" +
               "BEGIN \n" +
               "  a_outnum := a_num * 2; \n" +
               "  FOR i IN 1..a_num LOOP \n" +
               "    a_outstr := a_outstr || 'X'; \n" +
               "  END LOOP; \n" +
               "END nodb_proc_em;";
    await conn.execute(proc);
  }; // doCreateProc()

  const doDropProc = async function() {
    const sql = "DROP PROCEDURE nodb_proc_em";
    await conn.execute(sql);
  }; // doDropProc()

  const dotruncate = async function() {
    await conn.execute("TRUNCATE TABLE nodb_tab_xmany");
  }; // dotruncate()

  const makeParentChildTables = async function(cTab, pTab) {
    let proc = "BEGIN EXECUTE IMMEDIATE 'DROP TABLE " + cTab + "'; " +
               "EXCEPTION WHEN OTHERS THEN IF SQLCODE <> -942 THEN RAISE; END IF; END;";
    await conn.execute(proc);
    proc = "BEGIN EXECUTE IMMEDIATE 'DROP TABLE " + pTab + "'; " +
           "EXCEPTION WHEN OTHERS THEN IF SQLCODE <> -942 THEN RAISE; END IF; END;";
    await conn.execute(proc);
    let sql = "CREATE TABLE " + pTab + " ( \n" +
              "     parentid    NUMBER NOT NULL, \n" +
              "     description VARCHAR2(60) NOT NULL, \n" +
              "     CONSTRAINT " + pTab + "_pk PRIMARY KEY (parentid) \n" +
              ") ";
    await conn.execute(sql);
    sql = "CREATE TABLE " + cTab + " ( \n" +
          "    childid     NUMBER NOT NULL, \n" +
          "    parentid    NUMBER NOT NULL, \n" +
          "    description VARCHAR2(30) NOT NULL, \n" +
          "    CONSTRAINT " + cTab + "_pk PRIMARY KEY (childid), \n" +
          "    CONSTRAINT " + cTab + "_fk FOREIGN KEY (parentid) REFERENCES " + pTab + " \n" +
          ") ";
    await conn.execute(sql);
    sql = "INSERT INTO " + pTab + " VALUES (:1, :2)";
    let binds = [
      [10, "Parent 10"],
      [20, "Parent 20"],
      [30, "Parent 30"],
      [40, "Parent 40"],
      [50, "Parent 50"]
    ];
    let options = {
      autoCommit: true,
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.STRING, maxSize: 15 }
      ]
    };
    let result = await conn.executeMany(sql, binds, options);
    assert.strictEqual(result.rowsAffected, binds.length);
    sql = "INSERT INTO " + cTab + " VALUES (:1, :2, :3)";
    binds = [
      [1001, 10, "Child 1001 of Parent 10"],
      [1002, 20, "Child 1001 of Parent 20"],
      [1003, 20, "Child 1001 of Parent 20"],
      [1004, 20, 'Child 1004 of Parent 20'],
      [1005, 30, 'Child 1005 of Parent 30'],
      [1006, 30, 'Child 1006 of Parent 30'],
      [1007, 40, 'Child 1007 of Parent 40'],
      [1008, 40, 'Child 1008 of Parent 40'],
      [1009, 40, "Child 1009 of Parent 40"],
      [1010, 40, "Child 1010 of Parent 40"],
      [1011, 40, "Child 1011 of Parent 40"],
      [1012, 50, 'Child 1012 of Parent 50'],
      [1013, 50, 'Child 1013 of Parent 50'],
      [1014, 50, 'Child 1014 of Parent 50'],
      [1015, 50, 'Child 1015 of Parent 50'],
    ];
    options = {
      autoCommit: true,
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.NUMBER },
        { type: oracledb.STRING, maxSize: 500 }
      ]
    };
    result = await conn.executeMany(sql, binds, options);
    assert.strictEqual(result.rowsAffected, binds.length);
  }; // makeParentChildTables()

  const dropParentChildTables = async function(cTab, pTab) {
    let sql = "drop table " + cTab + " purge";
    await conn.execute(sql);
    sql = "drop table " + pTab + " purge";
    await conn.execute(sql);
  }; // dropParentChildTables()

});

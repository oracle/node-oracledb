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
 *   450. pipeline.js
 *
 * DESCRIPTION
 *   Testing pipeline functionality.
 *   It is preferred to run this test for a remote database with SDU parameter
 *   set to 512 in the database connect string.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig = require('../../dbconfig.js');
const testsUtil = require('../../testsUtil.js');

describe('450. pipeline.js', function() {

  let isRunnable;
  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites(2303000000, 2303000000);
    if (!oracledb.thin || !isRunnable) this.skip();
  });

  after(() => {
    if (!isRunnable) return;
  });

  describe('450.3 Test stress scenarios ', () => {
    let conn;
    const MAX_ADDR_LEN = 4000;
    const TEST_TAB = 'NODB_TAB_PIPE_TEST';
    const TEST_TAB_1 = 'NODB_TAB_PIPE_TEST_1';
    const TEST_TAB_2 = 'NODB_TAB_PIPE_TEST_2';
    const TEST_TAB_3 = 'NODB_TAB_PIPE_TEST_3';
    const TEST_TAB_4 = 'NODB_TAB_PIPE_TEST_4';
    const createsql1 = `create table if not exists ${TEST_TAB_1} (id NUMBER NOT NULL,
          address VARCHAR2(${MAX_ADDR_LEN}))`;
    const createsql2 = `create table if not exists ${TEST_TAB_2} (id NUMBER NOT NULL,
          address VARCHAR2(${MAX_ADDR_LEN}))`;
    const createsql3 = `create table if not exists ${TEST_TAB_3} (id NUMBER NOT NULL,
          address VARCHAR2(${MAX_ADDR_LEN}))`;
    const createsql4 = `create table if not exists ${TEST_TAB_4} (id NUMBER NOT NULL,
          address VARCHAR2(${MAX_ADDR_LEN}))`;
    const droptab1 = `DROP TABLE if exists ${TEST_TAB_1}`;
    const droptab2 = `DROP TABLE if exists ${TEST_TAB_2}`;
    const droptab3 = `DROP TABLE if exists ${TEST_TAB_3}`;
    const droptab4 = `DROP TABLE if exists ${TEST_TAB_4}`;

    before(async () => {
      conn = await oracledb.getConnection(dbConfig);
      const sql =
        `CREATE TABLE ${TEST_TAB} (
          id NUMBER NOT NULL,
          address VARCHAR2(${MAX_ADDR_LEN})
        )`;
      await testsUtil.createTable(conn, TEST_TAB, sql);
    });

    beforeEach(async () => {
      await conn.execute(`TRUNCATE TABLE ${TEST_TAB}`);
    });

    after(async () => {
      if (conn) {
        await testsUtil.dropTable(conn, TEST_TAB);
        await testsUtil.dropTable(conn, TEST_TAB_1);
        await testsUtil.dropTable(conn, TEST_TAB_2);
        await testsUtil.dropTable(conn, TEST_TAB_3);
        await testsUtil.dropTable(conn, TEST_TAB_4);
        await conn.close();
      }
    });

    function compareRows(rows1, rows2) {
      assert(rows1.length === rows2.length);
      // sort the rows.
      const sortRows1 = rows1.slice().sort();
      const sortRows2 = rows2.slice().sort();
      for (let index = 0; index < rows1.length; index++) {
        assert.deepStrictEqual(sortRows1[index], sortRows2[index]);
      }
    }

    async function withPipeline(size, binds, options, expectedRows) {
      const conn = await oracledb.getConnection(dbConfig);
      const  startTime = performance.now();
      const pipeline = new oracledb.Pipeline();

      pipeline.addFetchOne(`select user from dual`);
      pipeline.addExecuteMany(`INSERT INTO ${TEST_TAB} VALUES (:a, :b)`, binds, options);
      pipeline.addFetchAll(`select * from ${TEST_TAB}`);
      pipeline.addFetchOne(`select 129 from dual`);
      const results = await conn.runPipeline(pipeline);
      const endTime = performance.now();
      console.log(`withPipeline took ${endTime - startTime} milliseconds`);
      assert.deepStrictEqual(results[0].rows[0][0], dbConfig.user.toUpperCase());
      assert(results[1].rowsAffected === size);
      compareRows(results[2].rows, expectedRows);
      assert.strictEqual(results[3].rows[0][0], 129);
      await conn.execute(`TRUNCATE TABLE ${TEST_TAB}`);
      await conn.close();
    }

    async function withOutPipeline(size, binds, options, expectedRows) {
      const conn = await oracledb.getConnection(dbConfig);
      const allRows = new Array(4);
      const startTime = performance.now();
      allRows[0] = await conn.execute(`select user from dual`);
      allRows[1] = await conn.executeMany(`INSERT INTO ${TEST_TAB} VALUES (:a, :b)`, binds, options);
      allRows[2] = await conn.execute(`select * from ${TEST_TAB}`);
      allRows[3] = await conn.execute(`select 129 from dual`);
      const endTime = performance.now();
      console.log(`withOutPipeline took ${endTime - startTime} milliseconds`);
      assert.deepStrictEqual(allRows[0].rows[0][0], dbConfig.user.toUpperCase());
      assert(allRows[1].rowsAffected === size);
      compareRows(allRows[2].rows, expectedRows);
      assert.strictEqual(allRows[3].rows[0][0], 129);
      await conn.close();
    }

    async function withPipelineDMLs(size, binds, options, expectedRows) {
      const conn = await oracledb.getConnection(dbConfig);
      const strinp = 'testing';
      const  startTime = performance.now();
      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`select user from dual`);
      pipeline.addExecute(createsql1);
      pipeline.addExecute(createsql2);
      pipeline.addExecute(createsql3);
      pipeline.addExecute(createsql4);
      pipeline.addExecuteMany(`INSERT INTO ${TEST_TAB_1} VALUES (:a, :b)`, binds, options);
      pipeline.addExecuteMany(`INSERT INTO ${TEST_TAB_2} VALUES (:a, :b)`, binds, options);
      pipeline.addExecuteMany(`INSERT INTO ${TEST_TAB_3} VALUES (:a, :b)`, binds, options);
      pipeline.addExecuteMany(`INSERT INTO ${TEST_TAB_4} VALUES (:a, :b)`, binds, options);
      pipeline.addFetchAll(`select * from ${TEST_TAB_1}`);
      pipeline.addFetchAll(`select * from ${TEST_TAB_2}`);
      pipeline.addFetchAll(`select * from ${TEST_TAB_3}`);
      pipeline.addFetchAll(`select * from ${TEST_TAB_4}`);
      pipeline.addExecute(droptab1);
      pipeline.addExecute(droptab2);
      pipeline.addExecute(droptab3);
      pipeline.addExecute(droptab4);
      pipeline.addFetchOne(`select '${strinp}' from dual`);
      const results = await conn.runPipeline(pipeline);
      const endTime = performance.now();
      console.log(`withPipelineDMLs took ${endTime - startTime} milliseconds`);
      assert.deepStrictEqual(results[0].rows[0][0], dbConfig.user.toUpperCase());
      assert(results[5].rowsAffected === size);
      assert(results[6].rowsAffected === size);
      assert(results[7].rowsAffected === size);
      assert(results[8].rowsAffected === size);
      compareRows(results[9].rows, expectedRows);
      compareRows(results[10].rows, expectedRows);
      compareRows(results[11].rows, expectedRows);
      compareRows(results[12].rows, expectedRows);
      assert.deepStrictEqual(results[17].rows[0][0], strinp);
      await conn.close();
    }

    async function withOutPipelineDMLs(size, binds, options, expectedRows) {
      const conn = await oracledb.getConnection(dbConfig);
      const strinp = 'testing';
      const allRows = new Array(10);
      const startTime = performance.now();
      allRows[0] = await conn.execute(`select user from dual`);
      await conn.execute(createsql1);
      await conn.execute(createsql2);
      await conn.execute(createsql3);
      await conn.execute(createsql4);
      allRows[1] = await conn.executeMany(`INSERT INTO ${TEST_TAB_1} VALUES (:a, :b)`, binds, options);
      allRows[2] = await conn.executeMany(`INSERT INTO ${TEST_TAB_2} VALUES (:a, :b)`, binds, options);
      allRows[3] = await conn.executeMany(`INSERT INTO ${TEST_TAB_3} VALUES (:a, :b)`, binds, options);
      allRows[4] = await conn.executeMany(`INSERT INTO ${TEST_TAB_4} VALUES (:a, :b)`, binds, options);
      allRows[5] = await conn.execute(`select * from ${TEST_TAB_1}`);
      allRows[6] = await conn.execute(`select * from ${TEST_TAB_2}`);
      allRows[7] = await conn.execute(`select * from ${TEST_TAB_3}`);
      allRows[8] = await conn.execute(`select * from ${TEST_TAB_4}`);
      await conn.execute(droptab1);
      await conn.execute(droptab2);
      await conn.execute(droptab3);
      await conn.execute(droptab4);
      allRows[9] = await conn.execute(`select '${strinp}' from dual`);
      const endTime = performance.now();
      console.log(`withOutPipelineDMLs took ${endTime - startTime} milliseconds`);
      assert.deepStrictEqual(allRows[0].rows[0][0], dbConfig.user.toUpperCase());
      assert(allRows[1].rowsAffected === size);
      assert(allRows[2].rowsAffected === size);
      assert(allRows[3].rowsAffected === size);
      assert(allRows[4].rowsAffected === size);
      compareRows(allRows[5].rows, expectedRows);
      compareRows(allRows[6].rows, expectedRows);
      compareRows(allRows[7].rows, expectedRows);
      compareRows(allRows[8].rows, expectedRows);
      assert.deepStrictEqual(allRows[9].rows[0][0], strinp);
      await conn.close();
    }

    it('450.3.1 performace of executeMany with multiple DML operations inside pipeline ', async function() {
      const size =  10000;
      const binds = Array.from({ length: size }, (_, i) => ({
        a: i + 1,
        b: `Test ${i + 1} `
      }));
      const expectedRows = Array.from({ length: size }, (_, i) => ([
        i + 1,
        `Test ${i + 1} `
      ]));
      const options = {
        autoCommit: true,
        bindDefs: {
          a: { type: oracledb.NUMBER },
          b: { type: oracledb.STRING, maxSize: 15 }
        }
      };

      await withPipeline(size, binds, options, expectedRows);
      await withOutPipeline(size, binds, options, expectedRows);
    }); // 450.3.1

    // It basically generates drain events by writing multiple rows.
    // This test needs to be run only with remote DB as drain event comes
    // easily with remote DB where network is slow.
    it('450.3.2 verify large number of rows insertion where drain event appears ', async function() {
      const size =  10000;
      const iterations = 50;
      const binds = Array.from({ length: size }, (_, i) => ({
        a: i + 1,
        b: `Test ${i + 1} `
      }));
      const expectedRows = Array.from({ length: size }, (_, i) => ([
        i + 1,
        `Test ${i + 1} `
      ]));
      const options = {
        autoCommit: true,
        bindDefs: {
          a: { type: oracledb.NUMBER },
          b: { type: oracledb.STRING, maxSize: 15 }
        }
      };

      for (let index = 0; index < iterations; index++) {
        const pipeline = new oracledb.Pipeline();
        pipeline.addFetchOne(`select user from dual`);
        pipeline.addExecuteMany(`INSERT INTO ${TEST_TAB} VALUES (:a, :b)`, binds, options);
        pipeline.addFetchAll(`select * from ${TEST_TAB}`);
        pipeline.addFetchOne(`select 129 from dual`);
        const results = await conn.runPipeline(pipeline);
        assert.deepStrictEqual(results[0].rows[0][0], dbConfig.user.toUpperCase());
        assert(results[1].rowsAffected === size);
        compareRows(results[2].rows, expectedRows);
        assert.strictEqual(results[3].rows[0][0], 129);
        await conn.execute(`TRUNCATE TABLE ${TEST_TAB}`);
      }
    }); // 450.3.2

    it('450.3.3 performance of executeMany with only DML operations inside pipeline ', async function() {
      const size =  10;
      const binds = Array.from({ length: size }, (_, i) => ({
        a: i + 1,
        b: `Test ${i + 1} `
      }));
      const expectedRows = Array.from({ length: size }, (_, i) => ([
        i + 1,
        `Test ${i + 1} `
      ]));
      const options = {
        autoCommit: true,
        bindDefs: {
          a: { type: oracledb.NUMBER },
          b: { type: oracledb.STRING, maxSize: 15 }
        }
      };

      await withPipelineDMLs(size, binds, options, expectedRows);
      await withOutPipelineDMLs(size, binds, options, expectedRows);
    }); // 450.3.3
  }); // 450.3

  describe('450.4 addCommit tests', () => {
    const MAX_ADDR_LEN = 4000;
    const TEST_TAB = 'NODB_TAB_PIPE_COMMIT';
    let conn;

    before(async () => {
      conn = await oracledb.getConnection(dbConfig);
      const sql = `CREATE TABLE ${TEST_TAB} (
                     id      NUMBER NOT NULL,
                     address VARCHAR2(${MAX_ADDR_LEN}))`;
      await testsUtil.createTable(conn, TEST_TAB, sql);
    });

    beforeEach(async () => {
      await conn.execute(`TRUNCATE TABLE ${TEST_TAB}`);
    });

    after(async () => {
      if (conn) {
        await testsUtil.dropTable(conn, TEST_TAB);
        await conn.close();
      }
    });

    it('450.4.1 addCommit with multiple insert operations', async () => {
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(
        `INSERT INTO ${TEST_TAB} VALUES (1, 'addr1')`
      );
      pipeline.addExecute(
        `INSERT INTO ${TEST_TAB} VALUES (2, 'addr2')`
      );
      pipeline.addCommit();

      await conn.runPipeline(pipeline);

      const conn2 = await oracledb.getConnection(dbConfig);
      const result = await conn2.execute(
        `SELECT COUNT(*) FROM ${TEST_TAB}`,
        [],
        { outFormat: oracledb.OUT_FORMAT_ARRAY }
      );
      assert.strictEqual(result.rows[0][0], 2);
      await conn2.close();
    }); // 450.4.1

    it('450.4.2 addCommit in pipeline with preceding fetchOne and following fetchAll', async () => {
      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`SELECT 1 FROM DUAL`);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (10, 'ten')`);
      pipeline.addCommit();
      pipeline.addFetchAll(`SELECT id FROM ${TEST_TAB} ORDER BY id`);

      const results = await conn.runPipeline(pipeline);

      assert.strictEqual(results[0].rows[0][0], 1);
      assert.deepStrictEqual(results[3].rows, [[10]]);
    }); // 450.4.2

    it('450.4.3 multiple addCommits in a single pipeline', async () => {
      const pipeline = new oracledb.Pipeline();
      for (let i = 1; i <= 5; i++) {
        pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (${i}, 'row${i}')`);
        pipeline.addCommit();
      }
      pipeline.addFetchAll(`SELECT id FROM ${TEST_TAB} ORDER BY id`);

      const results = await conn.runPipeline(pipeline);
      const last = results[results.length - 1];
      assert.deepStrictEqual(
        last.rows.map(r => r[0]),
        [1, 2, 3, 4, 5]
      );
    }); // 450.4.3

    it('450.4.4 transaction rollback without explicit addCommit', async () => {
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (99, 'rollback_me')`);
      await conn.runPipeline(pipeline);
      await conn.rollback();

      const result = await conn.execute(`SELECT COUNT(*) FROM ${TEST_TAB}`,
        [], { outFormat: oracledb.OUT_FORMAT_ARRAY });
      assert.strictEqual(result.rows[0][0], 0);
    }); // 450.4.4
  }); // 450.4

  describe('450.5 Transaction management tests', () => {
    const MAX_ADDR_LEN = 4000;
    const TEST_TAB = 'NODB_TAB_PIPE_TXN';
    let conn;

    before(async () => {
      conn = await oracledb.getConnection(dbConfig);
      const sql = `CREATE TABLE ${TEST_TAB} (
                     id      NUMBER NOT NULL,
                     address VARCHAR2(${MAX_ADDR_LEN}))`;
      await testsUtil.createTable(conn, TEST_TAB, sql);
    });

    beforeEach(async () => {
      await conn.execute(`TRUNCATE TABLE ${TEST_TAB}`);
    });

    after(async () => {
      if (conn) {
        await testsUtil.dropTable(conn, TEST_TAB);
        await conn.close();
      }
    });

    it('450.5.1 pipeline inserts without autoCommit', async () => {
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (1, 'uncommitted')`);
      await conn.runPipeline(pipeline);

      const conn2 = await oracledb.getConnection(dbConfig);
      const result = await conn2.execute(
        `SELECT COUNT(*) FROM ${TEST_TAB}`,
        [], { outFormat: oracledb.OUT_FORMAT_ARRAY }
      );
      assert.strictEqual(result.rows[0][0], 0);
      await conn.rollback();
      await conn2.close();
    }); // 450.5.1
    it('450.5.2 interleave pipeline and regular execute in same transaction', async () => {
      await conn.execute(`INSERT INTO ${TEST_TAB} VALUES (1, 'regular')`);

      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (2, 'pipeline')`);
      pipeline.addCommit();
      await conn.runPipeline(pipeline);

      const result = await conn.execute(
        `SELECT id FROM ${TEST_TAB} ORDER BY id`,
        [], { outFormat: oracledb.OUT_FORMAT_ARRAY }
      );
      assert.deepStrictEqual(result.rows.map(r => r[0]), [1, 2]);
    }); // 450.5.2

    it('450.5.3 autoCommit true in executeMany options', async () => {
      const binds = [{ a: 1, b: 'one' }, { a: 2, b: 'two' }];
      const options = {
        autoCommit: true,
        bindDefs: {
          a: { type: oracledb.NUMBER },
          b: { type: oracledb.STRING, maxSize: 10 }
        }
      };

      const pipeline = new oracledb.Pipeline();
      pipeline.addExecuteMany(`INSERT INTO ${TEST_TAB} VALUES (:a, :b)`, binds, options);
      pipeline.addFetchAll(`SELECT id FROM ${TEST_TAB} ORDER BY id`);
      const results = await conn.runPipeline(pipeline);

      assert.strictEqual(results[0].rowsAffected, 2);
      assert.deepStrictEqual(results[1].rows.map(r => r[0]), [1, 2]);
    }); // 450.5.3

    it('450.5.4 rollback transaction after pipeline execution', async () => {
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (7, 'rollback')`);
      pipeline.addFetchAll(`SELECT id FROM ${TEST_TAB}`);
      const results = await conn.runPipeline(pipeline);

      assert.strictEqual(results[1].rows.length, 1);

      await conn.rollback();

      const check = await conn.execute(
        `SELECT COUNT(*) FROM ${TEST_TAB}`,
        [], { outFormat: oracledb.OUT_FORMAT_ARRAY }
      );
      assert.strictEqual(check.rows[0][0], 0);
    }); // 450.5.4
  }); // 450.5

  describe('450.6 NULL values and edge-case data', () => {
    const MAX_ADDR_LEN = 4000;
    const TEST_TAB = 'NODB_TAB_PIPE_NULL';
    let conn;

    before(async () => {
      conn = await oracledb.getConnection(dbConfig);
      const sql = `CREATE TABLE ${TEST_TAB} (
                     id      NUMBER,
                     address VARCHAR2(${MAX_ADDR_LEN}))`;
      await testsUtil.createTable(conn, TEST_TAB, sql);
    });

    beforeEach(async () => {
      await conn.execute(`TRUNCATE TABLE ${TEST_TAB}`);
    });

    after(async () => {
      if (conn) {
        await testsUtil.dropTable(conn, TEST_TAB);
        await conn.close();
      }
    });

    it('450.6.1 insert and fetch rows containing NULL values via pipeline', async () => {
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (1, NULL)`);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (NULL, 'no-id')`);
      pipeline.addCommit();
      pipeline.addFetchAll(`SELECT id, address FROM ${TEST_TAB} ORDER BY id NULLS LAST`);

      const results = await conn.runPipeline(pipeline);
      const rows = results[3].rows;
      assert.strictEqual(rows.length, 2);
      assert.strictEqual(rows[0][0], 1);
      assert.strictEqual(rows[0][1], null);
      assert.strictEqual(rows[1][0], null);
      assert.strictEqual(rows[1][1], 'no-id');
    }); // 450.6.1

    it('450.6.2 addFetchOne operation on empty table', async () => {
      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`SELECT id FROM ${TEST_TAB}`);

      const results = await conn.runPipeline(pipeline);
      const row = results[0].rows;
      assert.ok(!row || row.length === 0 || row[0] === null);
    }); // 450.6.2

    it('450.6.3 insert and retrieve maximum-length VARCHAR2 data', async () => {
      const longStr = 'A'.repeat(MAX_ADDR_LEN);
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(
        `INSERT INTO ${TEST_TAB} VALUES (1, :addr)`,
        { addr: longStr }
      );
      pipeline.addCommit();
      pipeline.addFetchOne(`SELECT address FROM ${TEST_TAB} WHERE id = 1`);

      const results = await conn.runPipeline(pipeline);
      assert.strictEqual(results[2].rows[0][0].length, MAX_ADDR_LEN);
      assert.strictEqual(results[2].rows[0][0], longStr);
    }); // 450.6.3

    it('450.6.4 executeMany with all-NULL bind values', async () => {
      const binds = [
        { a: null, b: null },
        { a: null, b: null },
      ];
      const options = {
        autoCommit: true,
        bindDefs: {
          a: { type: oracledb.NUMBER },
          b: { type: oracledb.STRING, maxSize: 10 }
        }
      };

      const pipeline = new oracledb.Pipeline();
      pipeline.addExecuteMany(`INSERT INTO ${TEST_TAB} VALUES (:a, :b)`, binds, options);
      pipeline.addFetchAll(`SELECT id, address FROM ${TEST_TAB}`);

      const results = await conn.runPipeline(pipeline);
      assert.strictEqual(results[0].rowsAffected, 2);
      results[1].rows.forEach(row => {
        assert.strictEqual(row[0], null);
        assert.strictEqual(row[1], null);
      });
    }); // 450.6.4

    it('450.6.5 special characters in string data with pipeline', async () => {
      const special = `O'Brien & "Co" <test> 日本語`;
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(
        `INSERT INTO ${TEST_TAB} VALUES (1, :addr)`,
        { addr: special }
      );
      pipeline.addCommit();
      pipeline.addFetchOne(`SELECT address FROM ${TEST_TAB} WHERE id = 1`);

      const results = await conn.runPipeline(pipeline);
      assert.strictEqual(results[2].rows[0][0], special);
    }); // 450.6.5
  }); // 450.6

  describe('450.7 Query-only pipeline tests', () => {
    let conn;

    before(async () => {
      conn = await oracledb.getConnection(dbConfig);
    });

    after(async () => {
      if (conn) await conn.close();
    });

    it('450.7.1 pipeline with multiple addFetchOne operations', async () => {
      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`SELECT 1 FROM DUAL`);
      pipeline.addFetchOne(`SELECT 2 FROM DUAL`);
      pipeline.addFetchOne(`SELECT 3 FROM DUAL`);

      const results = await conn.runPipeline(pipeline);
      assert.strictEqual(results.length, 3);
      assert.strictEqual(results[0].rows[0][0], 1);
      assert.strictEqual(results[1].rows[0][0], 2);
      assert.strictEqual(results[2].rows[0][0], 3);
    }); // 450.7.1

    it('450.7.2 pipeline with multiple addFetchAll operations', async () => {
      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchAll(
        `SELECT LEVEL AS n FROM DUAL CONNECT BY LEVEL <= 5`
      );
      pipeline.addFetchAll(
        `SELECT LEVEL AS n FROM DUAL CONNECT BY LEVEL <= 3`
      );

      const results = await conn.runPipeline(pipeline);
      assert.strictEqual(results[0].rows.length, 5);
      assert.strictEqual(results[1].rows.length, 3);
    }); // 450.7.2

    it('450.7.3 large number of addFetchOne operations in one pipeline', async () => {
      const COUNT = 100;
      const pipeline = new oracledb.Pipeline();
      for (let i = 1; i <= COUNT; i++) {
        pipeline.addFetchOne(`SELECT ${i} FROM DUAL`);
      }

      const results = await conn.runPipeline(pipeline);
      assert.strictEqual(results.length, COUNT);
      for (let i = 0; i < COUNT; i++) {
        assert.strictEqual(results[i].rows[0][0], i + 1);
      }
    }); // 450.7.3
  }); // 450.7

  describe('450.8 Advanced Edge Cases', () => {
    it('450.8.1 DB Object binding should fail in pipeline mode (multi-op pipeline)', async function() {
      const conn = await oracledb.getConnection(dbConfig);

      await conn.execute(`
        BEGIN
          BEGIN
            EXECUTE IMMEDIATE 'DROP TABLE PIPE_OBJ_TAB';
          EXCEPTION
            WHEN OTHERS THEN NULL;
          END;

          BEGIN
            EXECUTE IMMEDIATE 'DROP TYPE PIPE_OBJ_TYPE FORCE';
          EXCEPTION
            WHEN OTHERS THEN NULL;
          END;

          -- Create object type
          EXECUTE IMMEDIATE '
            CREATE OR REPLACE TYPE PIPE_OBJ_TYPE AS OBJECT (
              id NUMBER
            )
          ';
        END;
      `);

      const objClass = await conn.getDbObjectClass("PIPE_OBJ_TYPE");
      const obj = new objClass({ id: 1 });

      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`select 1 from dual`); // dummy op to enable pipelining
      pipeline.addExecute(`INSERT INTO PIPE_OBJ_TAB VALUES (:1)`, [obj]);

      await assert.rejects(
        async () => await conn.runPipeline(pipeline),
        /NJS-180:/ // NJS-180: Oracle Database Object types are not supported in pipeline mode
      );
      await conn.close();
    });

    it('450.8.2 Large PL/SQL bind >32K in pipeline mode', async function() {
      const conn = await oracledb.getConnection(dbConfig);

      const largeStr = "A".repeat(40000);

      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`
        DECLARE
          v VARCHAR2(40000);
        BEGIN
          v := :1;
        END;
      `, [largeStr]);

      await assert.rejects(
        async () => await conn.runPipeline(pipeline),
        /ORA-06550:/
        /*
          ORA-06550: PLS-00215: String length constraints must be in range (1 .. 32767)
        */
      );

      await conn.close();
    });

    it('450.8.3 Concurrent runPipeline on same connection', async function() {
      const conn = await oracledb.getConnection(dbConfig);

      const p1 = new oracledb.Pipeline();
      const p2 = new oracledb.Pipeline();

      p1.addFetchOne(`select 1 from dual`);
      p2.addFetchOne(`select 2 from dual`);

      const results = await Promise.allSettled([
        conn.runPipeline(p1),
        conn.runPipeline(p2)
      ]);

      assert(results.length === 2);
      assert(results[0].status === 'fulfilled');
      assert(results[1].status === 'fulfilled');

      await conn.close();
    });

    it('450.8.4 LOB fetchLobs true/false behavior (true pipeline mode)', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const TEST_TAB = 'PIPE_LOB_TAB';

      await testsUtil.createTable(conn, TEST_TAB, `CREATE TABLE ${TEST_TAB} (c CLOB)`);
      await conn.execute(`INSERT INTO ${TEST_TAB} VALUES ('LOB_DATA')`);
      await conn.commit();

      // pipelining with 2 operations
      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`select 1 from dual`); // dummy op
      pipeline.addFetchOne(`SELECT c FROM ${TEST_TAB}`, [], {}, false);

      const results = await conn.runPipeline(pipeline);

      const value = results[1].rows[0][0];

      assert.strictEqual(String(value), "LOB_DATA");

      await conn.execute(`DROP TABLE ${TEST_TAB}`);
      await conn.close();
    });

    it('450.8.5 Large 150 operation pipeline ordering', async function() {
      const conn = await oracledb.getConnection(dbConfig);

      const pipeline = new oracledb.Pipeline();
      const count = 150;

      for (let i = 0; i < count; i++) {
        pipeline.addFetchOne(`select :1 from dual`, [i]);
      }

      const results = await conn.runPipeline(pipeline);

      for (let i = 0; i < count; i++) {
        assert.strictEqual(results[i].rows[0][0], i);
      }

      await conn.close();
    });

    it('450.8.6 continueOnError=false should stop pipeline', async function() {
      const conn = await oracledb.getConnection(dbConfig);

      const TEST_TAB = 'PIPE_LOB_TAB';
      await testsUtil.createTable(conn, TEST_TAB, `CREATE TABLE ${TEST_TAB} (id NUMBER)`);

      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (1)`);
      pipeline.addExecute(`INSERT INTO NON_EXISTENT VALUES (1)`); // error
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (2)`);

      await assert.rejects(
        conn.runPipeline(pipeline, false),
        // ORA-00942: table or view does not exist
        /ORA-00942:/
      );

      // Verify only first insert happened
      const res = await conn.execute(`SELECT COUNT(*) FROM ${TEST_TAB}`);
      assert.strictEqual(res.rows[0][0], 1);

      await conn.execute(`DROP TABLE ${TEST_TAB}`);
      await conn.close();
    });

    it('450.8.7 fetchMany(0) should return empty rows', async function() {
      const conn = await oracledb.getConnection(dbConfig);

      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchMany(`select 1 from dual`, [], {}, 0);

      const results = await conn.runPipeline(pipeline);

      assert.deepStrictEqual(results[0].rows, []);

      await conn.close();
    });

    it('450.8.8 Invalid pipeline argument should fail', async function() {
      const conn = await oracledb.getConnection(dbConfig);

      await assert.rejects(
        conn.runPipeline({}),
        //  NJS-005: invalid value for parameter 3
        /NJS-005:/
      );

      await conn.close();
    });

    it('450.8.9 runPipeline after connection close', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      await conn.close();

      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`select 1 from dual`);

      await assert.rejects(
        conn.runPipeline(pipeline),
        //  NJS-003: invalid or closed connection
        /NJS-003:/
      );
    });

    it('450.8.10 Statement metadata mutation safety', async function() {
      const conn = await oracledb.getConnection(dbConfig);

      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`select :1 from dual`, [1]);
      pipeline.addFetchOne(`select :1 from dual`, ["string"]);
      pipeline.addFetchOne(`select :1 from dual`, [new Date()]);

      const results = await conn.runPipeline(pipeline);

      assert.strictEqual(typeof results[0].rows[0][0], "number");
      assert.strictEqual(typeof results[1].rows[0][0], "string");
      assert(results[2].rows[0][0] instanceof Date);

      await conn.close();
    });
  });
});

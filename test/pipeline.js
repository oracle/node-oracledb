/* Copyright (c) 2026, Oracle and/or its affiliates. */

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
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   324. pipeline.js
 *
 * DESCRIPTION
 *   Testing pipeline functionality.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');
const random   = require('./random.js');
const assist   = require('./dataTypeAssist.js');

describe('324. pipeline.js', function() {

  let supportsPipelining;

  before(async function() {
    supportsPipelining = (oracledb.thin && await testsUtil.checkPrerequisites(2303000000, 2303000000));
  });


  function compareRows(rows1, rows2) {
    assert(rows1.length === rows2.length);
    // sort the rows
    const sortRows1 = rows1.slice().sort();
    const sortRows2 = rows2.slice().sort();
    for (let index = 0; index < rows1.length; index++) {
      assert.deepStrictEqual(sortRows1[index], sortRows2[index]);
    }
  }

  function assertErrorCode(error, expectedThin, expectedThick) {
    if (oracledb.thin) {
      assert.strictEqual(error.code, expectedThin);
    } else {
      assert.strictEqual(error.errorNum, expectedThick);
    }
  }

  describe('324.1 Basic pipeline operations', () => {
    let conn;
    const dt = new Date(2024, 0, 1, 14, 30, 0); //January 1, 2024, at 14:30:00 (2:30 PM)
    const bindval1 = 'test pipeline';
    const bindval2 = 'cache check';
    const expectedData = [
      {
        metaData: [
          {
            name: ":1",
            dbColumnName: ":1",
            nullable: true,
            dbType: oracledb.DB_TYPE_VARCHAR,
            isJson: false,
            isOson: false,
            dbTypeName: "VARCHAR2",
            fetchType: oracledb.DB_TYPE_VARCHAR,
          },
        ],
        rows: [
          [
            "test pipeline",
          ],
        ],
      },
      {
        metaData: [
          {
            name: "USER",
            dbColumnName: "USER",
            nullable: true,
            dbType: oracledb.DB_TYPE_VARCHAR,
            isJson: false,
            isOson: false,
            dbTypeName: "VARCHAR2",
            fetchType: oracledb.DB_TYPE_VARCHAR,
          },
        ],
        rows: [
          [
            dbConfig.user.toUpperCase(),
          ],
        ],
      },
      {
        metaData: [
          {
            name: ":DT",
            dbColumnName: ":DT",
            nullable: true,
            dbType: oracledb.DB_TYPE_TIMESTAMP,
            isJson: false,
            isOson: false,
            precision: 9,
            dbTypeName: "TIMESTAMP",
            fetchType: oracledb.DB_TYPE_TIMESTAMP,
          },
        ],
        rows: [
          [
            dt.toISOString(),
          ],
        ],
      },
      {
        metaData: [
          {
            name: ":1",
            dbColumnName: ":1",
            nullable: true,
            dbType: oracledb.DB_TYPE_VARCHAR,
            isJson: false,
            isOson: false,
            dbTypeName: "VARCHAR2",
            fetchType: oracledb.DB_TYPE_VARCHAR,
          },
        ],
        rows: [
          [
            "cache check",
          ],
        ],
      }
    ];

    const expectedDataThick = [
      {
        metaData: [
          {
            name: ":1",
            dbColumnName: ":1",
            dbType: oracledb.DB_TYPE_VARCHAR,
            nullable: true,
            isJson: false,
            isOson: false,
            dbTypeName: "VARCHAR2",
            fetchType: oracledb.DB_TYPE_VARCHAR,
          },
        ],
        rows: [
          [
            "test pipeline",
          ],
        ],
      },
      {
        metaData: [
          {
            name: "USER",
            dbColumnName: "USER",
            dbType: oracledb.DB_TYPE_VARCHAR,
            nullable: true,
            isJson: false,
            isOson: false,
            dbTypeName: "VARCHAR2",
            fetchType: oracledb.DB_TYPE_VARCHAR,
          },
        ],
        rows: [
          [
            dbConfig.user.toUpperCase(),
          ],
        ],
      },
      {
        metaData: [
          {
            name: ":DT",
            dbColumnName: ":DT",
            dbType: oracledb.DB_TYPE_TIMESTAMP,
            nullable: true,
            isJson: false,
            isOson: false,
            precision: 9,
            dbTypeName: "TIMESTAMP",
            fetchType: oracledb.DB_TYPE_TIMESTAMP,
          },
        ],
        rows: [
          [
            dt.toISOString(),
          ],
        ],
      },
      {
        metaData: [
          {
            name: ":1",
            dbColumnName: ":1",
            dbType: oracledb.DB_TYPE_VARCHAR,
            nullable: true,
            isJson: false,
            isOson: false,
            dbTypeName: "VARCHAR2",
            fetchType: oracledb.DB_TYPE_VARCHAR,
          },
        ],
        rows: [
          [
            "cache check",
          ],
        ],
      }
    ];

    before(async () => {
      conn = await oracledb.getConnection(dbConfig);
    });

    after(async () => {
      if (conn) {
        await conn.close();
      }
    });

    it('324.1.1 basic selects', async function() {
      const numReqs = 4;

      const pipeline = new oracledb.Pipeline();

      pipeline.addFetchOne(`select :1 from dual`, [bindval1]);
      pipeline.addFetchOne(`select user from dual`);
      pipeline.addFetchOne(`select :dt from dual`, [dt]);
      pipeline.addFetchOne(`select :1 from dual`, [bindval2], {});
      let results = await conn.runPipeline(pipeline);

      for (let i = 0 ; i < numReqs; i++) {
        delete results[i].metaData[0].byteSize;
        if (!oracledb.thin)
          assert.deepStrictEqual(JSON.stringify(results[i]), JSON.stringify(expectedDataThick[i]));
        else
          assert.deepStrictEqual(JSON.stringify(results[i]), JSON.stringify(expectedData[i]));
      }

      // // Re-run the same operations to ensure cached stmts work fine.
      pipeline.addFetchOne(`select :1 from dual`, [bindval1]);
      pipeline.addFetchOne(`select user from dual`);
      pipeline.addFetchOne(`select :dt from dual`, [dt]);
      pipeline.addFetchOne(`select :1 from dual`, [bindval2], {});
      results = await conn.runPipeline(pipeline);
      for (let i = 0 ; i < numReqs; i++) {
        delete results[i + 4].metaData[0].byteSize;
        if (!oracledb.thin)
          assert.deepStrictEqual(JSON.stringify(results[i + 4]), JSON.stringify(expectedDataThick[i]));
        else
          assert.deepStrictEqual(JSON.stringify(results[i + 4]), JSON.stringify(expectedData[i]));
      }
    }); // 324.1.1

    it('324.1.2 basic selects without pipeline', async function() {
      const results = [];
      const numReqs = 4;

      results.push(await conn.execute(`select :1 from dual`, [bindval1]));
      results.push(await conn.execute(`select user from dual`));
      results.push(await conn.execute(`select :dt from dual`, [dt]));
      results.push(await conn.execute(`select :1 from dual`, [bindval2]));
      for (let i = 0 ; i < numReqs; i++) {
        delete results[i].metaData[0].byteSize;
        if (!oracledb.thin)
          assert.deepStrictEqual(JSON.stringify(results[i]), JSON.stringify(expectedDataThick[i]));
        else
          assert.deepStrictEqual(JSON.stringify(results[i]), JSON.stringify(expectedData[i]));
      }
    }); // 324.1.2

    it('324.1.3 Test empty pipeline', async function() {
      const pipeline = new oracledb.Pipeline();
      const results = await conn.runPipeline(pipeline);
      assert(results.length === 0);
    }); // 324.1.3

    it('324.1.4 Test pipeline with single operation', async function() {
      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`select user from dual`);
      const results = await conn.runPipeline(pipeline);
      assert(results.length === 1);
      assert.deepStrictEqual(results[0].rows[0][0], dbConfig.user.toUpperCase());
    }); // 324.1.4

    it('324.1.5 result.rows of addExecute() used for sql queries/fetches should return undefined', async function() {
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`select user from dual`);
      pipeline.addFetchOne(`select user from dual`);
      const results = await conn.runPipeline(pipeline);
      assert.deepStrictEqual(results[0].rows, undefined);
      assert.deepStrictEqual(results[1].rows[0][0], dbConfig.user.toUpperCase());
    }); // 324.1.5

    it(`324.1.6 Test pipeline with continue on error where error occurs in a operation
      and message should not be retried`, async function() {
      const sql = 'SELECT :1 FROM DUAL';
      const dt = new Date();
      await conn.execute(sql, [2]);
      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(sql, [dt]); // no retry in second phase
      pipeline.addFetchOne(sql, [1]);
      const results = await conn.runPipeline(pipeline, true);
      if (supportsPipelining)
        assert.deepStrictEqual(results[0].error.code, 'ORA-00932');
      else
        assert.deepStrictEqual(results[0].rows[0][0], dt);
      assert.deepStrictEqual(results[1].rows[0][0], 1);
    }); // 324.1.6

  }); // 324.1

  describe('324.2 Test DML select operations on tables', () => {
    let conn, largeStr;
    let proc;
    const EMP_TAB = 'NODB_TAB_PIPE_EMP_2';
    const DEPT_TAB = 'NODB_TAB_PIPE_DEPTS_2';
    const JOB_TAB = 'NODB_TAB_PIPE_JOBS_2';
    const TEST_TAB = 'NODB_TAB_PIPE_TEST_2';
    const MAX_ADDR_LEN = 4000;
    const MAX_STRING = 3000;
    const MAX_ROWS = 100;

    before(async () => {
      conn = await oracledb.getConnection(dbConfig);
      let sql =
        `CREATE TABLE ${EMP_TAB} (
          id NUMBER NOT NULL,
          address VARCHAR2(${MAX_ADDR_LEN})
        )`;
      await testsUtil.createTable(conn, EMP_TAB, sql);
      sql =
      `CREATE TABLE ${DEPT_TAB} (
        id NUMBER NOT NULL,
        address VARCHAR2(${MAX_ADDR_LEN})
      )`;
      await testsUtil.createTable(conn, DEPT_TAB, sql);
      sql =
      `CREATE TABLE ${JOB_TAB} (
        id1 NUMBER NOT NULL,
        address1 VARCHAR2(${MAX_ADDR_LEN})
      )`;
      await testsUtil.createTable(conn, JOB_TAB, sql);
      sql =
      `CREATE TABLE ${TEST_TAB} (
        id NUMBER NOT NULL,
        address VARCHAR2(${MAX_ADDR_LEN})
      )`;
      await testsUtil.createTable(conn, TEST_TAB, sql);

      const specialStr = "324.2";
      largeStr = random.getRandomString(MAX_STRING, specialStr);
      // TBD add different data in each tables..
      proc =
      `DECLARE
          x NUMBER := 0;
          n VARCHAR2(${MAX_ADDR_LEN});
       BEGIN
        FOR i IN 1..${MAX_ROWS} LOOP
          x := x + 1;
          n := '${largeStr}' || x;
          INSERT INTO ${EMP_TAB} VALUES (x, n);
          INSERT INTO ${DEPT_TAB} VALUES (x, n);
          INSERT INTO ${JOB_TAB} VALUES (x, n);
        END LOOP;
       END; `;
    });

    beforeEach(async () => {
      await conn.execute(`TRUNCATE TABLE ${EMP_TAB}`);
      await conn.execute(`TRUNCATE TABLE ${DEPT_TAB}`);
      await conn.execute(`TRUNCATE TABLE ${JOB_TAB}`);
      await conn.execute(`TRUNCATE TABLE ${TEST_TAB}`);
    });

    after(async () => {
      if (conn) {
        await testsUtil.dropTable(conn, EMP_TAB);
        await testsUtil.dropTable(conn, DEPT_TAB);
        await testsUtil.dropTable(conn, JOB_TAB);
        await testsUtil.dropTable(conn, TEST_TAB);
        await conn.close();
      }
    });

    async function fetchMultipleRowsNonPipeline() {
      const conn = await oracledb.getConnection(dbConfig);
      const numTasks = 3;
      const allRows = new Array(3);
      allRows[0] = await conn.execute(`select * from ${EMP_TAB}`);
      allRows[1] = await conn.execute(`select * from ${DEPT_TAB}`);
      allRows[2] =  await conn.execute(`select * from ${JOB_TAB}`);
      const expectedRow = [];
      for (let i = 1; i <= MAX_ROWS; i++) {
        expectedRow.push([i, largeStr + i]);
      }
      for (let i = 0; i < numTasks; i++) {
        compareRows(expectedRow, allRows[i].rows);
      }
      if (conn) {
        await conn.close();
      }
    }

    async function fetchMultipleRowsPipeline() {
      const numTasks = 3;
      const conn = await oracledb.getConnection(dbConfig);
      const pipeline = new oracledb.Pipeline();

      pipeline.addFetchAll(`select * from ${EMP_TAB}`);
      pipeline.addFetchAll(`select * from ${DEPT_TAB}`);
      pipeline.addFetchAll(`select * from ${JOB_TAB}`);
      const results = await conn.runPipeline(pipeline, true);
      const expectedRow = [];
      for (let i = 1; i <= MAX_ROWS; i++) {
        expectedRow.push([i, largeStr + i]);
      }
      for (let i = 0; i < numTasks; i++) {
        compareRows(expectedRow, results[i].rows);
      }
      if (conn) {
        await conn.close();
      }
    }

    it('324.2.1 test select multiple rows of 3 tables with pipeline ', async function() {
      // populate rows
      await conn.execute(proc);
      await conn.commit();

      // test reading multiple rows in parallel
      await Promise.allSettled([
        fetchMultipleRowsNonPipeline(),
        fetchMultipleRowsPipeline(),
      ]);
    }); // 324.2.1

    it('324.2.2 test insert multiple rows causing multiple packet encode and decode ', async function() {
      const insertSql = `INSERT INTO ${TEST_TAB} VALUES (:1, :2)`;
      const selectSql = `SELECT * FROM ${TEST_TAB}`;
      const specialStr = "324.2.2";
      const largeStr = random.getRandomString(MAX_STRING, specialStr);
      const bindValue = 'BINDV1';

      const pipeline = new oracledb.Pipeline();

      // task1 encode starts first but small operations like task2 reach first
      // to write to network stream but are waiting for task1 to write first as
      // its first in order.
      pipeline.addExecute(insertSql, [1, largeStr]);
      pipeline.addFetchOne(`select user from dual`); // small op
      pipeline.addFetchAll(selectSql);
      pipeline.addFetchOne(`select :1 from dual`, [bindValue]); // small op
      const results = await conn.runPipeline(pipeline, true);
      assert(results[0].rowsAffected === 1);
      assert.deepStrictEqual(results[1].rows[0][0], dbConfig.user.toUpperCase());
      assert.deepStrictEqual(results[2].rows[0][0], 1);
      assert.deepStrictEqual(results[2].rows[0][1], largeStr);
      assert.deepStrictEqual(results[3].rows[0][0], bindValue);

    }); // 324.2.2


    // The smaller sql appearing in first should be able to read the response
    // before even the writes for the next sqls complete and hence longer sqls are prefered
    // to be kept after small sqls.
    it('324.2.3 test multiple operations with smaller operations in front ', async function() {
      const specialStr = "324.2.3";
      const largeStr = random.getRandomString(MAX_STRING, specialStr);
      const numOps = 8;
      const bindValues = [1, largeStr];
      const sqls = [
        `INSERT INTO ${TEST_TAB} VALUES (:1, :2)`,
        `SELECT * FROM ${TEST_TAB}`,
        `INSERT INTO ${EMP_TAB} VALUES (:1, :2)`,
        `SELECT * FROM ${EMP_TAB}`,
        `INSERT INTO ${JOB_TAB} VALUES (:1, :2)`,
        `SELECT * FROM ${JOB_TAB}`,
        `INSERT INTO ${DEPT_TAB} VALUES (:1, :2)`,
        `SELECT * FROM ${DEPT_TAB}`
      ];
      const binds = [
        bindValues,
        [],
        bindValues,
        [],
        bindValues,
        [],
        bindValues,
        []
      ];

      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`select user from dual`);
      for (let index = 0; index < numOps; index++) {
        if (index % 2)
          pipeline.addFetchAll(sqls[index], binds[index]);
        else
          pipeline.addExecute(sqls[index], binds[index]);
      }
      const results = await conn.runPipeline(pipeline, true);
      assert.deepStrictEqual(results[0].rows[0][0], dbConfig.user.toUpperCase());
      assert(results[1].rowsAffected === 1);
      assert.deepStrictEqual(results[2].rows[0][1], largeStr);
      assert(results[3].rowsAffected === 1);
      assert.deepStrictEqual(results[4].rows[0][1], largeStr);
      assert(results[5].rowsAffected === 1);
      assert.deepStrictEqual(results[6].rows[0][1], largeStr);
      assert(results[7].rowsAffected === 1);
      assert.deepStrictEqual(results[8].rows[0][1], largeStr);
    }); // 324.2.3

    it('324.2.4 test with executeMany in pipeline', async function() {
      const binds = [
        { a: 1, b: "Test 1 (One)" },
        { a: 2, b: "Test 2 (Two)" },
        { a: 3, b: "Test 3 (Three)" },
        { a: 4, b: "Test 4 (Four)" },
        { a: 5, b: "Test 5 (Five)" }
      ];
      const expectedRows = [
        [
          1,
          "Test 1 (One)",
        ],
        [
          2,
          "Test 2 (Two)",
        ],
        [
          3,
          "Test 3 (Three)",
        ],
        [
          4,
          "Test 4 (Four)",
        ],
        [
          5,
          "Test 5 (Five)",
        ],
      ];
      const options = {
        autoCommit: true,
        bindDefs: {
          a: { type: oracledb.NUMBER },
          b: { type: oracledb.STRING, maxSize: 15 }
        }
      };

      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`select user from dual`);
      pipeline.addExecuteMany(`INSERT INTO ${TEST_TAB} VALUES (:a, :b)`, binds, options);
      pipeline.addFetchOne(`select 129 from dual`);
      pipeline.addFetchAll(`select * from ${TEST_TAB} `);
      const results = await conn.runPipeline(pipeline, true);
      assert.deepStrictEqual(results[0].rows[0][0], dbConfig.user.toUpperCase());
      assert(results[1].rowsAffected === 5);
      assert.strictEqual(results[2].rows[0][0], 129);
      assert.deepStrictEqual(results[3].rows, expectedRows);
    }); // 324.2.4

    it('324.2.5 test with executeMany with number of iterations', async function() {
      const numIters = 4;
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`delete from ${TEST_TAB}`);
      pipeline.addExecuteMany(`INSERT INTO ${TEST_TAB} VALUES (1, 'Test repeat')`, numIters);
      pipeline.addFetchOne(`select 129 from dual`);
      pipeline.addFetchAll(`select * from ${TEST_TAB}`);
      const results = await conn.runPipeline(pipeline);
      assert(results[1].rowsAffected === numIters);
      assert.strictEqual(results[2].rows[0][0], 129);
      for (let i = 0; i < numIters; i++)
        assert.deepStrictEqual(results[3].rows[i], [1, "Test repeat"]);
    }); // 324.2.5

    it('324.2.6 test operations with out binds inside pipeline  ', async function() {
      const insertSql = `INSERT INTO ${TEST_TAB} VALUES (324, 'TEST ADDR1') RETURNING ID, ADDRESS INTO :rid, :raddr`;
      const binds =
      {
        rid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT},
        raddr: { type: oracledb.STRING, dir: oracledb.BIND_OUT}
      };
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(insertSql, binds);
      pipeline.addFetchOne(`select user from dual`);
      const results = await conn.runPipeline(pipeline, true);
      assert(results[0].rowsAffected === 1);
      assert.strictEqual(results[0].outBinds.rid[0], 324);
      assert.strictEqual(results[0].outBinds.raddr[0], 'TEST ADDR1');
      assert.deepStrictEqual(results[1].rows[0][0], dbConfig.user.toUpperCase());
    }); // 324.2.6

    it('324.2.7 test autocommit', async function() {
      const conn1 = await oracledb.getConnection(dbConfig);
      const conn2 = await oracledb.getConnection(dbConfig);

      const pipeline1 = new oracledb.Pipeline();
      pipeline1.addExecute(`truncate table ${TEST_TAB}`, [], {autoCommit: true});
      pipeline1.addExecute(`insert into ${TEST_TAB} (id, address) values (1, 'test pipeline')`, [], {autoCommit: true});

      const pipeline2 = new oracledb.Pipeline();
      pipeline2.addExecute(`insert into ${TEST_TAB} (id, address) values (2, 'cache check')`);
      pipeline2.addCommit();
      pipeline2.addFetchAll(`select id, address from ${TEST_TAB} order by id`);

      await conn1.runPipeline(pipeline1);
      const results = await conn2.runPipeline(pipeline2, true);
      assert.deepStrictEqual(results[2].rows, [[1, 'test pipeline'], [2, 'cache check']]);

      await conn1.close();
      await conn2.close();
    }); // 324.2.7

    it('324.2.8 test DML returning', async function() {
      const out_value = { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 4000 };
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`truncate table ${TEST_TAB}`);
      pipeline.addExecute(
        `insert into ${TEST_TAB} (id, address) values (1, 'Value for first row')`
      );
      pipeline.addExecute(
        `insert into ${TEST_TAB} (id, address) values (2, 'Value for second row')`
      );
      pipeline.addExecute(
        `update ${TEST_TAB} set address = address || ' (Modified)' returning address into :1`,
        [out_value]
      );
      pipeline.addExecute(`update ${TEST_TAB} set address = 'Fixed'`);
      pipeline.addCommit();
      pipeline.addFetchAll(
        `select id, address from ${TEST_TAB} order by id`
      );
      const results = await conn.runPipeline(pipeline, true);
      const expected_data = [[1, "Fixed"], [2, "Fixed"]];
      assert.deepStrictEqual(results[6].rows, expected_data);
      assert.deepStrictEqual(results[3].outBinds[0], ["Value for first row (Modified)",
        "Value for second row (Modified)"]);
    }); // 324.2.8

    it('324.2.9 test DML returning with error - pipeline error', async function() {
      const out_value = { type: oracledb.BUFFER, dir: oracledb.BIND_OUT };
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`truncate table ${TEST_TAB}`);
      pipeline.addExecute(
        `insert into ${TEST_TAB} (id, address) values (1, 'Value for first row') returning address into :1`,
        [out_value]
      );
      pipeline.addCommit();
      pipeline.addFetchOne(`select user from dual`);

      await assert.rejects(
        async () => await conn.runPipeline(pipeline),
        /ORA-01465/
      );
      const result = await conn.execute(`select * from ${TEST_TAB}`);
      assert(result.rows.length === 0);
    }); // 324.2.9

    it('324.2.10 test DML returning with multiple errors - pipeline error', async function() {
      const out_value = { type: oracledb.BUFFER, dir: oracledb.BIND_OUT };
      const insertSql =
      `insert into ${TEST_TAB} (id, address)
       values (1, 'Value for first row')
       returning address into :1`;

      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`truncate table ${TEST_TAB}`);
      pipeline.addExecute(insertSql, [out_value]);
      pipeline.addCommit();
      pipeline.addExecute(insertSql, [out_value]);
      pipeline.addFetchOne(`select user from dual`);

      await assert.rejects(
        async () => await conn.runPipeline(pipeline),
        /ORA-01465/
      );

      const result = await conn.execute(`select * from ${TEST_TAB}`);
      assert(result.rows.length === 0);
    }); // 324.2.10

    it('324.2.11 test DML returning with error - pipeline continue', async function() {
      const out_value = { type: oracledb.BUFFER, dir: oracledb.BIND_OUT };
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`truncate table ${TEST_TAB}`);
      pipeline.addExecute(
        `insert into ${TEST_TAB} (id, address) values (1, 'Value for first row') returning address into :1`,
        [out_value]
      );
      pipeline.addCommit();
      pipeline.addFetchOne(`select user from dual`);

      const results = await conn.runPipeline(pipeline, true);
      assertErrorCode(results[1].error, 'ORA-01465', 1465);
      assert(results[3].rows[0][0] === dbConfig.user.toUpperCase());

      const result = await conn.execute(`select user from dual`);
      assert(result.rows[0][0] === dbConfig.user.toUpperCase());
    }); // 324.2.11

    it('324.2.12 test DML returning with multiple errors - pipeline continue', async function() {
      const out_value = { type: oracledb.BUFFER, dir: oracledb.BIND_OUT };
      const insertSql = `insert into ${TEST_TAB} (id, address)
       values (1, 'Value for first row')
       returning address into :1`;

      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`truncate table ${TEST_TAB}`);
      pipeline.addExecute(insertSql, [out_value]);
      pipeline.addCommit();
      pipeline.addExecute(insertSql, [out_value]);
      pipeline.addFetchOne("select user from dual");

      const results = await conn.runPipeline(pipeline, true);

      // Pipeline step assertions
      assert.strictEqual(results[0].rowsAffected, 0);
      assertErrorCode(results[1].error, "ORA-01465", 1465);
      assert.strictEqual(results[2], undefined);
      assertErrorCode(results[3].error, "ORA-01465", 1465);
      assert.strictEqual(results[4].rows[0][0], dbConfig.user.toUpperCase());

      // Table should remain empty
      const queryResult = await conn.execute(`select * from ${TEST_TAB}`);
      assert.strictEqual(queryResult.rows.length, 0);
    }); // 324.2.12

  }); // 324.2


  describe('324.3 Test More scenarios ', () => {
    let conn;
    let sysDBAConn;
    let sid;
    const TEST_TAB = 'NODB_TAB_PIPE_TEST_3';
    const TEST_TAB_CLOBS = 'NODB_TAB_PIPE_TEST_CBS';
    const PROC_PIPE = `nodb_proc_pipe_em`;

    const MAX_ADDR_LEN = 4000;
    const MAX_STRING = 3000;
    const TYPE = 'NODB_TAB_PIPE_TEST_T';

    const doCreateProc = async function() {
      const proc = "CREATE OR REPLACE PROCEDURE " + PROC_PIPE + " (a_num IN NUMBER, " +
               "    a_outnum OUT NUMBER, a_outstr OUT VARCHAR2) \n" +
               "AS \n" +
               "BEGIN \n" +
               "  a_outnum := a_num * 2; \n" +
               "  FOR i IN 1..a_num LOOP \n" +
               "    a_outstr := a_outstr || 'X'; \n" +
               "  END LOOP; \n" +
               "END " + PROC_PIPE + ";";
      await conn.execute(proc);
    }; // doCreateProc()

    const doDropProc = async function() {
      const sql = `DROP PROCEDURE ${PROC_PIPE}`;
      await conn.execute(sql);
    }; // doDropProc()

    before(async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) this.skip();
      const dbaConfig = {
        user: dbConfig.test.DBA_user,
        password: dbConfig.test.DBA_password,
        connectionString: dbConfig.connectString,
        privilege: oracledb.SYSDBA
      };
      sysDBAConn = await oracledb.getConnection(dbaConfig);
      conn = await oracledb.getConnection(dbConfig);
      let sql =
        `CREATE TABLE ${TEST_TAB} (
          id NUMBER NOT NULL,
          address VARCHAR2(${MAX_ADDR_LEN})
        )`;
      await testsUtil.createTable(conn, TEST_TAB, sql);
      sid = await testsUtil.getSid(conn);
      sql = `CREATE TABLE ${TEST_TAB_CLOBS} (
        id      NUMBER,
        clob_1  CLOB,
        clob_2  CLOB)`;
      await testsUtil.createTable(conn, TEST_TAB_CLOBS, sql);
      sql =
      `CREATE OR REPLACE TYPE ${TYPE} AS OBJECT (
        id NUMBER,
        name VARCHAR2(30)
      );`;
      await testsUtil.createType(conn, TYPE, sql);
      await doCreateProc();
    });

    beforeEach(async () => {
      await conn.execute(`TRUNCATE TABLE ${TEST_TAB}`);
      await conn.execute(`TRUNCATE TABLE ${TEST_TAB_CLOBS}`);
    });

    afterEach(() => {
      oracledb.fetchAsString = [];
    });

    after(async () => {
      if (conn) {
        await testsUtil.dropTable(conn, TEST_TAB);
        await testsUtil.dropTable(conn, TEST_TAB_CLOBS);
        await testsUtil.dropType(conn, TYPE);
        await doDropProc();
        await conn.close();
      }
      if (sysDBAConn) {
        await sysDBAConn.close();
      }
    });

    it('324.3.1 test with just two operations causing ORA error inside pipeline ', async function() {
      const wrongInsertSql = `INSERT INTO ${TEST_TAB}_1 VALUES (:1, :2)`;
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(wrongInsertSql, [2, 'small']);
      pipeline.addFetchOne(`select user from dual`);
      let results = await conn.runPipeline(pipeline, true);
      assertErrorCode(results[0].error, 'ORA-00942', 942);
      assert.deepStrictEqual(results[1].rows[0][0], dbConfig.user.toUpperCase());

      // check connection is good
      results = await conn.execute(`select 127 from dual`);
      assert.deepStrictEqual(results.rows[0][0], 127);
    }); // 324.3.1

    it('324.3.2 test with one of the wrong operation of multi packet insert inside pipeline ', async function() {
      if (!oracledb.thin) {
        this.skip(); // skipped in thick mode - some existing bug, will be addressed separately.
      }
      const insertSql = `INSERT INTO ${TEST_TAB} VALUES (:1, :2)`;
      const wrongInsertSql = `INSERT INTO ${TEST_TAB}_1 VALUES (:1, :2)`;

      const selectSql = `SELECT * FROM ${TEST_TAB}`;
      const specialStr = "324.3.2";
      const largeStr = random.getRandomString(MAX_STRING, specialStr);

      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(insertSql, [1, largeStr]); // multiple packets insert
      pipeline.addFetchOne(`select user from dual`); // small op
      pipeline.addFetchAll(selectSql);
      pipeline.addExecute(wrongInsertSql, [2, largeStr]);
      pipeline.addExecute(insertSql, [3, largeStr]);

      let results = await conn.runPipeline(pipeline, true);
      assert(results[0].rowsAffected === 1);
      assert.deepStrictEqual(results[1].rows[0][0], dbConfig.user.toUpperCase());
      assert.deepStrictEqual(results[2].rows[0][1], largeStr);
      assertErrorCode(results[3].error, 'ORA-00942', 942);
      assert(results[4].rowsAffected === 1);

      // check connection is good
      results = await conn.execute(`select user from dual`);
      assert.deepStrictEqual(results.rows[0][0], dbConfig.user.toUpperCase());
    }); // 324.3.2

    it('324.3.3 test with single operation causing NJS error inside pipeline - no binds', async function() {
      const wrongInsertSqlNoBindValues = `INSERT INTO ${TEST_TAB} VALUES (:1, :2)`;
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(wrongInsertSqlNoBindValues);
      pipeline.addFetchOne(`select user from dual`);
      const results = await conn.runPipeline(pipeline, true);
      assertErrorCode(results[0].error, 'NJS-098', 1008);
      assert.deepStrictEqual(results[1].rows[0][0], dbConfig.user.toUpperCase());
    }); // 324.3.3

    it('324.3.4 test with one of the operation needs multiple request/response like fetch inside pipeline ', async function() {
      const binds = [
        { a: 1, b: "Test 1 (One)" },
        { a: 2, b: "Test 2 (Two)" },
        { a: 3, b: "Test 3 (Three)" },
        { a: 4, b: "Test 4 (Four)" },
        { a: 5, b: "Test 5 (Five)" }
      ];
      const expectedRows = [
        [
          1,
          "Test 1 (One)",
        ],
        [
          2,
          "Test 2 (Two)",
        ],
        [
          3,
          "Test 3 (Three)",
        ],
        [
          4,
          "Test 4 (Four)",
        ],
        [
          5,
          "Test 5 (Five)",
        ],
      ];
      const options = {
        autoCommit: true,
        bindDefs: {
          a: { type: oracledb.NUMBER },
          b: { type: oracledb.STRING, maxSize: 15 }
        }
      };

      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`select user from dual`);
      pipeline.addExecuteMany(`INSERT INTO ${TEST_TAB} VALUES (:a, :b)`, binds, options);
      pipeline.addFetchAll(`select * from ${TEST_TAB}`);
      pipeline.addFetchOne(`select 129 from dual`);
      const results = await conn.runPipeline(pipeline, true);
      assert.deepStrictEqual(results[0].rows[0][0], dbConfig.user.toUpperCase());
      assert(results[1].rowsAffected === 5);
      compareRows(results[2].rows, expectedRows);
      assert.strictEqual(results[3].rows[0][0], 129);
    }); // 324.3.4

    it('324.3.5 test with reading lob column operation and an error operation inside pipeline ', async function() {
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (23, 'hes')`);
      pipeline.addFetchOne(`select to_clob('test string') from dual`);
      pipeline.addFetchOne(`select sysdate from dual`);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (:1, :2)`, [2]);
      pipeline.addFetchOne(`select sysdate from dual`);
      pipeline.addFetchOne(`select user from dual`);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (24, 'BES')`);
      let results = [];
      results = await conn.runPipeline(pipeline, true);

      assert(results[0].rowsAffected === 1);
      assert(results[1].rows[0][0] instanceof oracledb.Lob);
      assert(results[2].rows[0][0] instanceof Date);
      assertErrorCode(results[3].error, 'NJS-098', 1008);
      assert(results[4].rows[0][0] instanceof Date);
      assert.deepStrictEqual(results[5].rows[0][0], dbConfig.user.toUpperCase());
      assert(results[6].rowsAffected === 1);
    }); // 324.3.5

    it('324.3.6 test just two operations causing ORA error inside pipeline with abort on error mode ', async function() {
      const wrongInsertSql = `INSERT INTO ${TEST_TAB}_1 VALUES (:1, :2)`;
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(wrongInsertSql, [2, 'small']);
      pipeline.addFetchOne(`select user from dual`);
      let results = await conn.runPipeline(pipeline, true);
      assertErrorCode(results[0].error, 'ORA-00942', 942);
      assert.deepStrictEqual(results[1].rows[0][0], dbConfig.user.toUpperCase());

      // check connection is good after removing pipeline mode from connection.
      results = await conn.execute(`select 127 from dual`);
      assert.deepStrictEqual(results.rows[0][0], 127);
    }); // 324.3.6

    it('324.3.7 test operations with invalid out bind conversions inside pipeline  ', async function() {
      const insertSql = `INSERT INTO ${TEST_TAB} VALUES (324, 'TEST ADDR1') RETURNING ID, ADDRESS INTO :rid, :raddr`;
      const binds =
      {
        rid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT},
        raddr: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT}
      };

      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(insertSql, binds);
      pipeline.addFetchOne(`select user from dual`);
      const results = await conn.runPipeline(pipeline, true);
      assertErrorCode(results[0].error, 'ORA-01465', 1465);
      assert.deepStrictEqual(results[1].rows[0][0], dbConfig.user.toUpperCase());
    }); // 324.3.7

    it('324.3.8 test operations with duplicate select sql operations inside pipeline  ', async function() {
      const selectSql = `select :1 from dual`;
      const binds = ['DEMO'];
      const numTasks = 20;
      const openCount = await testsUtil.getOpenCursorCount(sysDBAConn, sid);

      const pipeline = new oracledb.Pipeline();
      for (let i = 0; i < numTasks; i++) {
        pipeline.addFetchOne(selectSql, binds);
      }
      let results = await conn.runPipeline(pipeline, true);
      let newOpenCount = await testsUtil.getOpenCursorCount(sysDBAConn, sid);
      for (let i = 0; i < numTasks; i++) {
        assert.deepStrictEqual(results[i].rows[0][0], 'DEMO');
      }
      // At this point cursors are not closed.
      // We should pipeline prepared statments.
      assert((newOpenCount - openCount) === (supportsPipelining ? (numTasks - 1) : 0));

      // this will run in re-execute using stmt cache and closes all opened
      // duplicate cursors opened above.
      results = await conn.execute(selectSql, binds);
      assert.deepStrictEqual(results.rows[0][0], 'DEMO');
      newOpenCount = await testsUtil.getOpenCursorCount(sysDBAConn, sid);
      assert((newOpenCount - openCount) === 0);
    }); // 324.3.8

    it('324.3.9 test with pl/sql with batch input causing multiple request/response inside pipeline ', async function() {
      const pipeline = new oracledb.Pipeline();
      const plsql = `BEGIN ${PROC_PIPE}(:1, :2, :3); END;`;
      const binds = [ [1], [2], [3], [4], [6] ];
      const options = {
        bindDefs: [
          { type: oracledb.NUMBER },
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 20 }
        ]
      };

      pipeline.addFetchOne(`select user from dual`);
      pipeline.addExecuteMany(plsql, binds, options);
      pipeline.addFetchOne(`select sysdate from dual`); // single request/response at end of pipeline
      const results = await conn.runPipeline(pipeline, true);

      assert.deepStrictEqual(
        results[1].outBinds,
        [ [ 2, 'X' ], [ 4, 'XX' ], [ 6, 'XXX' ], [ 8, 'XXXX' ], [ 12, 'XXXXXX' ] ]
      );
    }); // 324.3.9

    it('324.3.10 test the client protocol error ', async function() {
      const wrongInsertSql = `INSERT INTO ${TEST_TAB}_1 VALUES (:1, :2)`;
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(wrongInsertSql, [2, 'small']);
      pipeline.addFetchOne(`select INTERVAL '10-2' YEAR TO MONTH from dual`);
      pipeline.addFetchOne(`select user from dual`);
      let results = await conn.runPipeline(pipeline, true);
      assertErrorCode(results[0].error, 'ORA-00942', 942);
      assert.deepStrictEqual(results[2].rows[0][0], dbConfig.user.toUpperCase());

      // check connection is good
      results = await conn.execute(`select 127 from dual`);
      assert.deepStrictEqual(results.rows[0][0], 127);
    }); // 324.3.10

    it('324.3.11 pl/sql with batch input causing multiple request/response inside pipeline', async function() {
      const pipeline = new oracledb.Pipeline();
      const plsql = `BEGIN ${PROC_PIPE}(:1, :2, :3); END;`;
      const binds = [ [1], [2], [3], [4], [6] ];
      const options = {
        bindDefs: [
          { type: oracledb.NUMBER },
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 20 }
        ]
      };

      pipeline.addFetchOne(`select user from dual`);
      pipeline.addExecuteMany(plsql, binds, options);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (24, 'plsql')`); // single request/response at end of pipeline
      pipeline.addFetchOne(`select sysdate from dual`); // single request/response at end of pipeline
      let results = await conn.runPipeline(pipeline, true);
      assert.deepStrictEqual(
        results[1].outBinds,
        [ [ 2, 'X' ], [ 4, 'XX' ], [ 6, 'XXX' ], [ 8, 'XXXX' ], [ 12, 'XXXXXX' ] ]
      );

      // re-run same stmts which should be in cache and should run faster.
      results = undefined;
      pipeline.addFetchOne(`select user from dual`);
      pipeline.addExecuteMany(plsql, binds, options);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (24, 'plsql')`); // single request/response at end of pipeline
      pipeline.addFetchOne(`select sysdate from dual`); // single request/response at end of pipeline
      results = await conn.runPipeline(pipeline, true);
      assert.deepStrictEqual(
        results[1].outBinds,
        [ [ 2, 'X' ], [ 4, 'XX' ], [ 6, 'XXX' ], [ 8, 'XXXX' ], [ 12, 'XXXXXX' ] ]
      );
    }); // 324.3.11

    it('324.3.12 test db objects with invalid syntax inside pipeline ', async function() {
      const TABLE = 'nodb_tab_test2432';
      const sql = `
        CREATE TABLE ${TABLE} (
          num NUMBER,
          person ${TYPE}
        )
      `;
      let plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

      const objData1 = {
        ID: 201,
        NAME: 'John Smith'
      };
      const CLS = await conn.getDbObjectClass(TYPE);
      const testObj = new CLS(objData1);

      const seqOne = 1;
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (23, 'hes')`);
      pipeline.addExecute(sql, [seqOne, testObj]);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (24, 'test2')`);
      pipeline.addFetchOne(`select user from dual`);
      const results = await conn.runPipeline(pipeline, true);
      assert(results[0].rowsAffected === 1);
      if (!oracledb.thin) {
        assert(results[1].error.message.includes('DPI-1059'));
      } else {
        assertErrorCode(results[1].error, supportsPipelining ? 'NJS-180' : 'NJS-098');
        // NJS-180: Oracle Database Object types are not supported in pipeline mode
      }
      assert(results[2].rowsAffected === 1);
      assert.deepStrictEqual(results[3].rows[0][0], dbConfig.user.toUpperCase());
      plsql = testsUtil.sqlDropTable(TABLE);
      await conn.execute(plsql);
    }); // 324.3.12

    it('324.3.13 test db objects with valid syntax inside pipeline - should throw NJS-180', async function() {
      const TABLE = 'nodb_tab_test2432';
      let sql = `
        CREATE TABLE ${TABLE} (
          num NUMBER,
          person ${TYPE}
        )
      `;
      let plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

      const objData1 = {
        ID: 201,
        NAME: 'John Smith'
      };
      const CLS = await conn.getDbObjectClass(TYPE);
      const testObj = new CLS(objData1);

      const seqOne = 1;
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (23, 'hes')`);
      sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      pipeline.addExecute(sql, [seqOne, testObj]);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (24, 'test2')`);
      pipeline.addFetchOne(`select user from dual`);
      pipeline.addCommit();
      const results = await conn.runPipeline(pipeline, true);
      assert(results[0].rowsAffected === 1);
      if (supportsPipelining)
        assert(results[1].error.code === 'NJS-180'); // Oracle Database Object types are not supported in pipeline mode
      else
        assert(results[1].rowsAffected === 1);
      assert(results[2].rowsAffected === 1);
      assert.deepStrictEqual(results[3].rows[0][0], dbConfig.user.toUpperCase());
      assert.deepStrictEqual(results[4], undefined);
      plsql = testsUtil.sqlDropTable(TABLE);
      await conn.execute(plsql);
    }); // 324.3.13

    it('324.3.14 Add only single-request pipelined operations', async function() {
      const pipeline = new oracledb.Pipeline();
      // submit operations and run them.
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (23, 'row1')`);
      pipeline.addFetchOne(`select user from dual`);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (24, 'row5')`);
      const results = await conn.runPipeline(pipeline, true);
      assert(results[0].rowsAffected === 1);
      assert.deepStrictEqual(results[1].rows[0][0], dbConfig.user.toUpperCase());
      assert(results[2].rowsAffected === 1);
    }); // 324.3.14

    it('324.3.15 Add only Multi-request pipelined operations', async function() {
      oracledb.fetchAsString = [oracledb.CLOB]; // fetch clob as string.
      const data = ['test string1', 'test string2', 'test string3'];
      const pipeline = new oracledb.Pipeline();
      // submit operations and run them.
      pipeline.addFetchOne(`select to_clob('${data[0]}') from dual`);
      pipeline.addFetchOne(`select to_clob('${data[1]}') from dual`);
      pipeline.addFetchOne(`select to_clob('${data[2]}') from dual`);

      const results = await conn.runPipeline(pipeline, true);
      assert.deepStrictEqual(results[0].rows[0][0], data[0]);
      assert.deepStrictEqual(results[1].rows[0][0], data[1]);
      assert.deepStrictEqual(results[2].rows[0][0], data[2]);
    }); // 324.3.15

    it('324.3.16 Add multi-request and single-request operations ', async function() {
      const plsql = `BEGIN ${PROC_PIPE}(:1, :2, :3); END;`;
      const binds = [ [1], [2], [3], [4], [6] ];
      const options = {
        bindDefs: [
          { type: oracledb.NUMBER },
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 20 }
        ]
      };
      const sequence = 324;
      const specialStr = "324.3.16";
      const proc = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_324_3_16 (lob_id IN NUMBER, lob_in_out IN OUT CLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into " + TEST_TAB_CLOBS + " (id, clob_1) values (lob_id, lob_in_out); \n" +
               "    select clob_1 into lob_in_out from " + TEST_TAB_CLOBS + " where id = lob_id; \n" +
               "END nodb_clob_in_out_324_3_16;";
      const proc_drop = "DROP PROCEDURE nodb_clob_in_out_324_3_16";
      await conn.execute(proc);
      const len = 32750;
      const clobVal = random.getRandomString(len, specialStr);
      const sqlRun = `begin nodb_clob_in_out_324_3_16(:i, :io); end;`;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };

      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (23, 'row1')`);
      pipeline.addFetchOne(`select to_clob('test string') from dual`);
      pipeline.addFetchOne(`select sysdate from dual`);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (:1, :2)`, [2]);
      pipeline.addFetchOne(`select sysdate from dual`);
      pipeline.addFetchOne(`select user from dual`);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (24, 'row2')`);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (25, 'row3')`);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (24, 'row4')`);
      pipeline.addFetchAll(`select * from ${TEST_TAB}`);
      pipeline.addExecuteMany(plsql, binds, options);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (24, 'row5')`);
      pipeline.addExecute(sqlRun, bindVar);

      const results = await conn.runPipeline(pipeline, true);
      assert(results[0].rowsAffected === 1);
      assert(results[1].rows[0][0] instanceof oracledb.Lob);
      assert(results[2].rows[0][0] instanceof Date);
      assertErrorCode(results[3].error, 'NJS-098', 1008);
      assert(results[4].rows[0][0] instanceof Date);
      assert.deepStrictEqual(results[5].rows[0][0], dbConfig.user.toUpperCase());
      assert(results[6].rowsAffected === 1);
      assert(results[7].rowsAffected === 1);
      assert(results[8].rowsAffected === 1);
      assert(results[9].rows.length, 4);
      assert.deepStrictEqual(
        results[10].outBinds,
        [ [ 2, 'X' ], [ 4, 'XX' ], [ 6, 'XXX' ], [ 8, 'XXXX' ], [ 12, 'XXXXXX' ] ]
      );
      assert(results[11].rowsAffected === 1);
      assert.deepStrictEqual(results[12].outBinds.io, clobVal);
      await conn.execute(proc_drop);
    }); // 324.3.16


    it('324.3.17 Add multi-request and single-request with error from one of the Multi-request operation ', async function() {
      const sequence = 314;
      const specialStr = "324.3.17";
      const proc = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_324_3_17 (lob_id IN NUMBER, lob_in_out IN OUT CLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_non_exist (id, clob_1) values (lob_id, lob_in_out); \n" +
               "    select clob_1 into lob_in_out from nodb_tab_non_exist where id = lob_id; \n" +
               "END nodb_clob_in_out_324_3_17;";
      const proc_drop = "DROP PROCEDURE nodb_clob_in_out_324_3_17";
      await conn.execute(proc);
      const len = 32750;
      const clobVal = random.getRandomString(len, specialStr);
      const sqlRun = `begin nodb_clob_in_out_324_3_17(:i, :io); end;`;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };

      oracledb.fetchAsString = [oracledb.CLOB]; // fetch clob as string.
      const pipeline = new oracledb.Pipeline();
      const sql1 = `INSERT INTO ${TEST_TAB} VALUES (23, 'row1')`;
      const sql2 = `select user, to_clob('test string') from dual`;
      const sql3 = `INSERT INTO ${TEST_TAB} VALUES (24, 'row2')`;
      const sql4 = `INSERT INTO ${TEST_TAB} VALUES (24, 'row3')`;
      pipeline.addExecute(sql1);
      pipeline.addFetchOne(sql2);
      pipeline.addExecute(sql3);
      pipeline.addExecute(sqlRun, bindVar);
      pipeline.addExecute(sql4);
      const results = await conn.runPipeline(pipeline, true);
      assert(results[0].rowsAffected === 1);
      assert.deepStrictEqual(results[1].rows[0][0], dbConfig.user.toUpperCase());
      assert.deepStrictEqual(results[1].rows[0][1], 'test string');
      assert(results[2].rowsAffected === 1);
      assertErrorCode(results[3].error, 'ORA-06550', 6550);
      assert(results[4].rowsAffected === 1);
      await conn.execute(proc_drop);
    }); // 324.3.17

    it('324.3.18 Run pipelined operations more than once', async function() {
      oracledb.fetchAsString = [oracledb.CLOB]; // fetch clob as string.
      const pipeline = new oracledb.Pipeline();

      // submit operations and run them.
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (23, 'row1')`);
      pipeline.addFetchOne(`select user, to_clob('test string') from dual`);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (24, 'row5')`);
      let results = await conn.runPipeline(pipeline, true);
      assert(results[0].rowsAffected === 1);
      assert.deepStrictEqual(results[1].rows[0][0], dbConfig.user.toUpperCase());
      assert.deepStrictEqual(results[1].rows[0][1], 'test string');
      assert(results[2].rowsAffected === 1);

      // submit new set of operations and run them.
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (25, 'row1')`);
      pipeline.addFetchOne(`select user, to_clob('test string2') from dual`);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (26, 'row5')`);
      results = await conn.runPipeline(pipeline, true);
      assert(results[0].rowsAffected === 1);
      assert.deepStrictEqual(results[1].rows[0][0], dbConfig.user.toUpperCase());
      assert.deepStrictEqual(results[1].rows[0][1], 'test string');
      assert(results[2].rowsAffected === 1);
      assert(results[3].rowsAffected === 1);
      assert.deepStrictEqual(results[4].rows[0][0], dbConfig.user.toUpperCase());
      assert.deepStrictEqual(results[4].rows[0][1], 'test string2');
      assert(results[5].rowsAffected === 1);
    }); // 324.3.18

    it('324.3.19 Ensure pipeline and Non pipeline on connection at same time gets queued ', async function() {
      oracledb.fetchAsString = [oracledb.CLOB]; // fetch clob as string.
      const pipeline = new oracledb.Pipeline();

      // submit operations and run them.
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (23, 'row1')`);
      pipeline.addFetchOne(`select user, to_clob('test string') from dual`);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (24, 'row5')`);
      const nonPipelineop1 = conn.execute(`select user from dual`);
      const nonPipelineop2 = conn.execute(`select sysdate from dual`);
      let results = await Promise.allSettled([nonPipelineop1, conn.runPipeline(pipeline, true), nonPipelineop2]);
      assert.deepStrictEqual(results[0].value.rows[0][0], dbConfig.user.toUpperCase());
      const pipelineresults = results[1].value;
      assert(pipelineresults[0].rowsAffected === 1);
      assert.deepStrictEqual(pipelineresults[1].rows[0][0], dbConfig.user.toUpperCase());
      assert.deepStrictEqual(pipelineresults[1].rows[0][1], 'test string');
      assert(pipelineresults[2].rowsAffected === 1);
      assert(results[2].value.rows[0][0] instanceof Date);

      // submit new set of operations and run them.
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (25, 'row1')`);
      pipeline.addFetchOne(`select user, to_clob('test string2') from dual`);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (26, 'row5')`);
      results = await conn.runPipeline(pipeline, true);
      assert(results[0].rowsAffected === 1);
      assert.deepStrictEqual(results[1].rows[0][0], dbConfig.user.toUpperCase());
      assert.deepStrictEqual(results[1].rows[0][1], 'test string');
      assert(results[2].rowsAffected === 1);
      assert(results[3].rowsAffected === 1);
      assert.deepStrictEqual(results[4].rows[0][0], dbConfig.user.toUpperCase());
      assert.deepStrictEqual(results[4].rows[0][1], 'test string2');
      assert(results[5].rowsAffected === 1);
    }); // 324.3.19

    it('324.3.20 test with continueOnError Mode ', async function() {
      oracledb.fetchAsString = [oracledb.CLOB]; // fetch clob as string.
      const pipeline = new oracledb.Pipeline();

      // submit operations in continueOnError = true mode.
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (23, 'row1')`);
      pipeline.addFetchOne(`select user, to_clob2('test string') from dual`);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB} VALUES (24, 'row5')`);
      const results = await conn.runPipeline(pipeline, true);
      assert(results[0].rowsAffected === 1);
      assertErrorCode(results[1].error, 'ORA-00904', 904); // TO_CLOB2 invalid identifier
      assert(results[2].rowsAffected === 1);

      // // submit operations in continueOnError = false mode.
      await assert.rejects(
        async () => await conn.runPipeline(pipeline),
        /ORA-00904/
      );
    }); // 324.3.20

    it('324.3.21 wrong operation of multi packet insert and operation with client protocol error ', async function() {
      const insertSql = `INSERT INTO ${TEST_TAB} VALUES (:1, :2)`;
      const wrongInsertSql = `INSERT INTO ${TEST_TAB}_1 VALUES (:1, :2)`;

      const selectSql = `SELECT * FROM ${TEST_TAB}`;
      const specialStr = "324.3.21";
      const largeStr = random.getRandomString(MAX_STRING, specialStr);

      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(insertSql, [1, largeStr]); // multiple packets insert
      pipeline.addFetchOne(`select user from dual`); // small op
      pipeline.addFetchOne(`select INTERVAL '10-2' YEAR TO MONTH from dual`);
      pipeline.addFetchAll(selectSql);
      pipeline.addFetchOne(`select INTERVAL '10-3' YEAR TO MONTH from dual`);
      pipeline.addExecute(wrongInsertSql, [2, largeStr]);
      pipeline.addExecute(insertSql, [3, largeStr]);

      let results = await conn.runPipeline(pipeline, true);
      assert(results[0].rowsAffected === 1);
      assert.deepStrictEqual(results[1].rows[0][0], dbConfig.user.toUpperCase());
      assert.deepStrictEqual(results[3].rows[0][1], largeStr);
      assertErrorCode(results[5].error, 'ORA-00942', 942);
      assert(results[6].rowsAffected === 1);

      // check connection is good
      results = await conn.execute(`select user from dual`);
      assert.deepStrictEqual(results.rows[0][0], dbConfig.user.toUpperCase());
    }); // 324.3.21

    it('324.3.22 executeMany with large number of rows inside pipeline ', async function() {
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

      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`select user from dual`);
      pipeline.addExecuteMany(`INSERT INTO ${TEST_TAB} VALUES (:a, :b)`, binds, options);
      pipeline.addFetchAll(`select * from ${TEST_TAB}`);
      pipeline.addFetchOne(`select 129 from dual`);
      const results = await conn.runPipeline(pipeline, true);
      assert.deepStrictEqual(results[0].rows[0][0], dbConfig.user.toUpperCase());
      assert(results[1].rowsAffected === size);
      compareRows(results[2].rows, expectedRows);
      assert.strictEqual(results[3].rows[0][0], 129);
    }); // 324.3.22

    it('324.3.23 Test commit with transactionInProgress', async function() {
      assert(!conn.transactionInProgress);
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`truncate table ${TEST_TAB}`);
      pipeline.addExecute(`insert into ${TEST_TAB} (id, address) values (5, 'test')`);
      await conn.runPipeline(pipeline);
      assert(conn.transactionInProgress);
      const pipeline2 = new oracledb.Pipeline();
      pipeline2.addCommit();
      await conn.runPipeline(pipeline2);
      assert(!conn.transactionInProgress);
    }); // 324.3.23

    it('324.3.24 test PL/SQL returning LOB data from a function', async function() {
      oracledb.fetchAsString = [oracledb.CLOB]; // fetch clob as string
      const clob_format = "Sample data for test 324.3.24 - {}";
      const num_values = [5, 38, 1549];
      const pipeline = new oracledb.Pipeline();

      // First insert test data
      pipeline.addExecute(`INSERT INTO ${TEST_TAB_CLOBS} (id, clob_1) VALUES (1, 'test data')`);

      // Test PL/SQL function returning LOB
      pipeline.addFetchOne(`select to_clob('${clob_format.replace('{}', '5')}') from dual`);
      pipeline.addFetchOne(`select to_clob('${clob_format.replace('{}', '38')}') from dual`);
      pipeline.addFetchOne(`select to_clob('${clob_format.replace('{}', '1549')}') from dual`);

      const results = await conn.runPipeline(pipeline, true);

      for (let i = 1; i <= num_values.length; i++) { // Start from index 1 since first operation is insert
        const expected_value = clob_format.replace("{}", num_values[i - 1].toString());
        assert(results[i].rows[0][0] === expected_value);
      }

      oracledb.fetchAsString = []; // reset
    }); // 324.3.24

    it('324.3.25 test with single operation causing NJS error inside pipeline - binds data type mismatch', async function() {
      const wrongInsertSqlNoBindValues = `INSERT INTO ${TEST_TAB} VALUES (:1, :2)`;
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(wrongInsertSqlNoBindValues, [
        { val: 'abc', type: oracledb.NUMBER },
        { val: 'x', type: oracledb.STRING }
      ]);

      pipeline.addFetchOne(`select user from dual`);
      const results = await conn.runPipeline(pipeline, true);
      assert.strictEqual(results[0].error.code, 'NJS-011');
      assert.deepStrictEqual(results[1].rows[0][0], dbConfig.user.toUpperCase());
    }); // 324.3.25

    it('324.3.26 test with single operation causing NJS error inside pipeline - conversion error', async function() {
      const wrongInsertSqlNoBindValues = `INSERT INTO ${TEST_TAB} VALUES (:1, :2)`;
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(wrongInsertSqlNoBindValues, ['ac', 'abc']);
      pipeline.addFetchOne(`select user from dual`);
      const results = await conn.runPipeline(pipeline, true);
      assertErrorCode(results[0].error, 'ORA-01722', 1722);
      assert.deepStrictEqual(results[1].rows[0][0], dbConfig.user.toUpperCase());

      // with continueOnError as false
      await assert.rejects(
        async () => await conn.runPipeline(pipeline),
        /ORA-01722/
      );
    }); // 324.3.26

    it('324.3.27 test fetchOne()', async function() {
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`truncate table ${TEST_TAB}`);
      pipeline.addExecute(`insert into ${TEST_TAB} (id, address) values (1, 'test pipeline')`);
      pipeline.addCommit();
      pipeline.addFetchOne(`select id, address from ${TEST_TAB} order by id`);
      pipeline.addFetchOne(`select :1 from dual`, [23]);
      pipeline.addFetchOne(`select :val from dual`, {val: 5});
      const results = await conn.runPipeline(pipeline);
      assert(results[1].rowsAffected === 1);
      assert.deepStrictEqual(results[3].rows[0], [1, 'test pipeline']);
      assert.strictEqual(results[4].rows[0][0], 23);
      assert.deepStrictEqual(results[5].rows[0][0], 5);
    }); // 324.3.27

    it('324.3.28 test fetchLobs with fetchOne()', async function() {
      const clobVal = "CLOB Data 324.3.28";
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`truncate table ${TEST_TAB_CLOBS}`);
      pipeline.addExecute(`INSERT INTO ${TEST_TAB_CLOBS} (id, clob_1) VALUES (1, :1)`, [clobVal]);
      pipeline.addCommit();
      pipeline.addFetchOne(`select id, clob_1 from ${TEST_TAB_CLOBS} order by id`, [], {}, false); // fetchLobs = false
      pipeline.addFetchOne(`select id, clob_1 from ${TEST_TAB_CLOBS} order by id`); // fetchLobs = true (default)
      const results = await conn.runPipeline(pipeline);
      assert(results[1].rowsAffected === 1);
      assert.deepStrictEqual(results[3].rows[0], [1, clobVal]);
      const data = await results[4].rows[0][1].getData(); // get lob data from lob object
      assert.deepStrictEqual(data, clobVal);
    }); // 324.3.28

    it('324.3.29 test fetchMany()', async function() {
      const pipeline = new oracledb.Pipeline();
      const numRows = 3;
      pipeline.addExecute(`truncate table ${TEST_TAB}`);
      for (let i = 0; i < 4; i++) {
        pipeline.addExecute(`insert into ${TEST_TAB} (id, address) values (${i + 1}, 'test pipeline')`);
      }
      pipeline.addCommit();
      pipeline.addFetchMany(`select id, address from ${TEST_TAB} order by id`, [], {}, numRows);
      pipeline.addFetchOne(`select :1 from dual`, [23]);
      pipeline.addFetchOne(`select :val from dual`, {val: 5});
      const results = await conn.runPipeline(pipeline);
      for (let i = 0; i < numRows; i++) {
        assert.deepStrictEqual(results[6].rows[i], [i + 1, 'test pipeline']);
      }
      assert.strictEqual(results[7].rows[0][0], 23);
      assert.deepStrictEqual(results[8].rows[0][0], 5);
    }); // 324.3.29

    it('324.3.30 test fetchLobs with fetchMany()', async function() {
      const pipeline = new oracledb.Pipeline();
      const numRows = 3;
      const clobVal = "CLOB Data 324.3.30";
      pipeline.addExecute(`truncate table ${TEST_TAB_CLOBS}`);
      for (let i = 0; i < 4; i++) {
        pipeline.addExecute(`INSERT INTO ${TEST_TAB_CLOBS} (id, clob_1) VALUES (${i + 1}, :1)`, [`${clobVal}-${i + 1}`]);
      }
      pipeline.addCommit();
      pipeline.addFetchMany(`select id, clob_1 from ${TEST_TAB_CLOBS} order by id`, [], {}, numRows, false); // fetchLobs = false
      pipeline.addFetchMany(`select id, clob_1 from ${TEST_TAB_CLOBS} order by id`, [], {}, numRows); // fetchLobs = true (default)
      const results = await conn.runPipeline(pipeline);
      for (let i = 0; i < numRows; i++) {
        assert.deepStrictEqual(results[6].rows[i], [i + 1, `${clobVal}-${i + 1}`]);
      }
      for (let i = 0; i < numRows; i++) {
        const data = await results[7].rows[i][1].getData();
        assert.deepStrictEqual([results[7].rows[i][0], data], [i + 1, `${clobVal}-${i + 1}`]);
      }
    }); // 324.3.30

    it('324.3.31 test fetchMany() numRows with 0 and negative values', async function() {
      const pipeline = new oracledb.Pipeline();
      const numRows = 4;
      pipeline.addExecute(`truncate table ${TEST_TAB}`);
      for (let i = 0; i < numRows; i++) {
        pipeline.addExecute(`insert into ${TEST_TAB} (id, address) values (${i + 1}, 'test pipeline')`);
      }
      pipeline.addCommit();
      pipeline.addFetchMany(`select id, address from ${TEST_TAB} order by id`, [], {});
      assert.rejects(
        () => pipeline.addFetchMany(`select id, address from ${TEST_TAB} order by id`, [], {}, -1),
        RangeError
      );
      assert.rejects(
        () => pipeline.addFetchMany(`select id, address from ${TEST_TAB} order by id`, [], {}, -10),
        RangeError
      );
      pipeline.addFetchMany(`select id, address from ${TEST_TAB} order by id`, [], {}, 0);
      const results = await conn.runPipeline(pipeline, true);
      assert.strictEqual(results[numRows + 2].rows.length, numRows);
      assert.strictEqual(results[numRows + 3].rows.length, 0);
      for (let i = 0; i < numRows; i++) {
        assert.deepStrictEqual(results[numRows + 2].rows[i], [i + 1, 'test pipeline']);
      }
    }); // 324.3.31

    it('324.3.32 test fetchAll()', async function() {
      const pipeline = new oracledb.Pipeline();
      const numRows = 4;
      let fetchArraySize = 1;
      pipeline.addExecute(`truncate table ${TEST_TAB}`);
      for (let i = 0; i < numRows; i++) {
        pipeline.addExecute(`insert into ${TEST_TAB} (id, address) values (${i + 1}, 'test pipeline')`);
      }
      pipeline.addCommit();
      pipeline.addFetchAll(`select id, address from ${TEST_TAB} order by id`, [], {}, fetchArraySize);
      fetchArraySize = numRows;
      pipeline.addFetchAll(`select id, address from ${TEST_TAB} order by id`, [], {}, fetchArraySize);
      pipeline.addFetchOne(`select :1 from dual`, [23]);
      pipeline.addFetchOne(`select :val from dual`, {val: 5});
      const results = await conn.runPipeline(pipeline);
      for (let i = 0; i < numRows; i++) {
        assert.deepStrictEqual(results[6].rows[i], [i + 1, 'test pipeline']);
      }
      for (let i = 0; i < numRows; i++) {
        assert.deepStrictEqual(results[7].rows[i], [i + 1, 'test pipeline']);
      }
      assert.strictEqual(results[8].rows[0][0], 23);
      assert.deepStrictEqual(results[9].rows[0][0], 5);
    }); // 324.3.32

    it('324.3.33 test fetchAll() fetchArraySize with 0 and negative values', async function() {
      const pipeline = new oracledb.Pipeline();
      const numRows = 4;
      pipeline.addExecute(`truncate table ${TEST_TAB}`);
      for (let i = 0; i < numRows; i++) {
        pipeline.addExecute(`insert into ${TEST_TAB} (id, address) values (${i + 1}, 'test pipeline')`);
      }
      pipeline.addCommit();
      pipeline.addFetchAll(`select id, address from ${TEST_TAB} order by id`, [], {}, 1);
      assert.rejects(
        () => pipeline.addFetchAll(`select id, address from ${TEST_TAB} order by id`, [], {}, 0),
        RangeError
      );
      assert.rejects(
        () => pipeline.addFetchAll(`select id, address from ${TEST_TAB} order by id`, [], {}, -1),
        RangeError
      );
      assert.rejects(
        () => pipeline.addFetchAll(`select id, address from ${TEST_TAB} order by id`, [], {}, -10),
        RangeError
      );
      pipeline.addFetchAll(`select id, address from ${TEST_TAB} order by id`, [], {}, numRows);
      pipeline.addFetchAll(`select id, address from ${TEST_TAB} order by id`, [], {});
      pipeline.addFetchOne(`select :1 from dual`, [23]);
      pipeline.addFetchOne(`select :val from dual`, {val: 5});
      const results = await conn.runPipeline(pipeline);
      for (let i = 0; i < numRows; i++) {
        assert.deepStrictEqual(results[6].rows[i], [i + 1, 'test pipeline']);
      }
      for (let i = 0; i < numRows; i++) {
        assert.deepStrictEqual(results[7].rows[i], [i + 1, 'test pipeline']);
      }
      for (let i = 0; i < numRows; i++) {
        assert.deepStrictEqual(results[8].rows[i], [i + 1, 'test pipeline']);
      }
      assert.strictEqual(results[9].rows[0][0], 23);
      assert.deepStrictEqual(results[10].rows[0][0], 5);
    }); // 324.3.33

    it('324.3.34 test fetchAll() with where id <= :limit & set fetchArraySize <= rowlength', async function() {
      this.retries(0);
      const numRows = 60;
      const fetchArraySize = 2;
      const limit = 5;
      const insertSql = `INSERT INTO ${TEST_TAB} (id, address) VALUES (:id, :addr)`;
      const bulkRows = [];
      for (let i = 1; i <= numRows; i++) {
        bulkRows.push({ id: i, addr: 'test pipeline'});
      }
      await conn.executeMany(insertSql, bulkRows);
      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`select :1 from dual`, [23]);
      pipeline.addFetchAll(`select id, address from ${TEST_TAB} where id <= :limit order by id`,
        { limit },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
        fetchArraySize
      );
      const results = await conn.runPipeline(pipeline);
      assert.strictEqual(results[0].rows[0][0], 23);
      assert.strictEqual(results[1].rows.length, limit);
      for (let i = 0; i < limit; i++) {
        assert.deepStrictEqual(results[1].rows[i].ID, i + 1);
        assert.deepStrictEqual(results[1].rows[i].ADDRESS, 'test pipeline');
      }
    }); // 324.3.34

    it('324.3.35 single operations - test fetchOne(), fetchMany(), fetchAll()', async function() {
      await conn.execute(`truncate table ${TEST_TAB}`);

      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`SELECT id FROM ${TEST_TAB}`);
      const results = await conn.runPipeline(pipeline);
      assert.deepStrictEqual(results[0].rows, []);

      const numRows = 4;
      const numRowsFetchMany = 3;
      for (let i = 0; i < numRows; i++) {
        await conn.execute(`insert into ${TEST_TAB} (id, address) values (${i + 1}, 'test pipeline')`);
      }
      await conn.commit();

      // each opertion will run in non-pipeline mode.
      const pipeline1 = new oracledb.Pipeline();
      pipeline1.addFetchOne(`select id, address from ${TEST_TAB} order by id`);
      const results1 = await conn.runPipeline(pipeline1);

      const pipeline2 = new oracledb.Pipeline();
      pipeline2.addFetchMany(`select id, address from ${TEST_TAB} order by id`, [], {}, numRowsFetchMany);
      const results2 = await conn.runPipeline(pipeline2);

      const pipeline3 = new oracledb.Pipeline();
      pipeline3.addFetchAll(`select id, address from ${TEST_TAB} order by id`, [], {}, 1); // fetchArraySize = 1
      const results3 = await conn.runPipeline(pipeline3);

      assert.deepStrictEqual(results1[0].rows[0], [1, 'test pipeline']);
      for (let i = 0; i < numRowsFetchMany; i++) {
        assert.deepStrictEqual(results2[0].rows[i], [i + 1, 'test pipeline']);
      }
      for (let i = 0; i < numRows; i++) {
        assert.deepStrictEqual(results3[0].rows[i], [i + 1, 'test pipeline']);
      }
    }); // 324.3.35

    it('324.3.36 test PL/SQL bulk inserts with LOBs in pipeline', async function() {
      oracledb.fetchAsString = [oracledb.CLOB];
      const procName = 'nodb_proc_lob_insert_38';
      const procCreate = `CREATE OR REPLACE PROCEDURE ${procName} (p_id IN NUMBER, p_clob IN CLOB) AS
                          BEGIN
                            INSERT INTO ${TEST_TAB_CLOBS} (id, clob_1) VALUES (p_id, p_clob);
                          END;`;
      await conn.execute(procCreate);
      const procDrop = `DROP PROCEDURE ${procName}`;
      const plsql = `BEGIN ${procName}(:1, :2); END;`;
      const binds = [
        [1, 'LOB data 1'],
        [2, 'LOB data 2'],
        [3, 'LOB data 3']
      ];
      const options = {
        bindDefs: [
          { type: oracledb.NUMBER },
          { type: oracledb.STRING, maxSize: 100 }
        ]
      };

      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`select user from dual`);
      pipeline.addExecuteMany(plsql, binds, options);
      pipeline.addFetchOne(`select to_clob('additional lob') from dual`);
      const results = await conn.runPipeline(pipeline);
      assert.deepStrictEqual(results[0].rows[0][0], dbConfig.user.toUpperCase());
      const res = await conn.execute(`select id, clob_1 from ${TEST_TAB_CLOBS} order by id`);
      for (let i = 0; i < 3; i++) {
        assert.deepStrictEqual(res.rows[i], binds[i]);
      }
      assert.deepStrictEqual(results[2].rows[0][0], 'additional lob');
      await conn.execute(procDrop);
    }); // 324.3.36

    it('324.3.37 in PL/SQL, throws error when buffer size is greater than 32767', async function() {
      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`select user from dual`);
      const size = 32800;
      const buf = assist.createBuffer(size);
      const proc =
       "CREATE OR REPLACE PROCEDURE nodb_testraw (p_in IN RAW, p_out OUT RAW) " +
       "AS " +
       "BEGIN " +
       "  p_out := p_in; " +
       "END; ";
      await conn.execute(proc);
      pipeline.addExecute(
        "BEGIN nodb_testraw(:i, :o); END;", {
          i: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: buf },
          o: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 40000}
        });
      await assert.rejects(
        async () => await conn.runPipeline(pipeline),
        supportsPipelining ?
          /NJS-181/ // PL/SQL blocks with string/bytes object size greater than 32k are not supported in pipeline mode
          : /ORA-06502/
      );
      await conn.execute("DROP PROCEDURE nodb_testraw");
    }); // 324.3.37

    it('324.3.38 When an operation with db objects is tried, error is thrown', async function() {
      // create user defined type
      const TYPE_SMALL_PRECISION = 'NODB_TYP_OBJ_1_SPREC';
      const typ1 =
      `create or replace type ${TYPE_SMALL_PRECISION} as object (TESTNUMBER number (12, 0))`;
      await conn.execute(typ1);
      const retVal = 560;
      const sql = `declare myType ${TYPE_SMALL_PRECISION} := :arg; begin myType.TESTNUMBER := ${retVal};
      :arg := myType; end;`;
      const inpVal = 260;
      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`select user from dual`);
      pipeline.addExecute(sql, {
        arg: {
          dir: oracledb.BIND_INOUT,
          type: TYPE_SMALL_PRECISION,
          val: {'TESTNUMBER': inpVal}
        }
      }, {outFormat: oracledb.OUT_FORMAT_OBJECT});

      if (supportsPipelining) {
        await assert.rejects(
          async () => await conn.runPipeline(pipeline),
          /NJS-180/ // Oracle Database Object types are not supported in pipeline mode
        );
      } else {
        const results = await conn.runPipeline(pipeline);
        assert.deepStrictEqual(results[0].rows[0][0], dbConfig.user.toUpperCase());
        assert.deepStrictEqual(results[1].outBinds.arg.TESTNUMBER, 560);
      }
    }); // 324.3.38

    it('324.3.39 error in middle with continueOnError', async function() {
      const pipeline = new oracledb.Pipeline();

      await conn.execute(`truncate table ${TEST_TAB}`);
      await conn.commit();

      pipeline.addExecute(
        `insert into ${TEST_TAB} (id, address) values (5, 'ok')`
      );

      pipeline.addFetchAll(
        `select id from ${TEST_TAB} order by id`
      );

      // intentional error
      pipeline.addExecute(
        `insert into ${TEST_TAB} (id, address, extra) values (9, 'bad', 'x')`
      );

      pipeline.addFetchAll(
        `select id from ${TEST_TAB} order by id`
      );

      const results = await conn.runPipeline(pipeline, true);

      // first fetch
      assert.deepStrictEqual(results[1].rows, [[5]]);

      // error exists
      assert(results[2].error);

      // final fetch still works
      assert.deepStrictEqual(results[3].rows, [[5]]);
    }); // 324.3.39

    it('324.3.40 CLOB handling in pipeline', async function() {
      const pipeline = new oracledb.Pipeline();

      await conn.execute(`truncate table ${TEST_TAB_CLOBS}`);
      await conn.commit();

      const clobData = 'CLOB TEST';

      pipeline.addExecute(
        `insert into ${TEST_TAB_CLOBS} (id, clob_1) values (1, :1)`,
        [clobData]
      );

      pipeline.addFetchAll(
        `select clob_1 from ${TEST_TAB_CLOBS} order by id`
      );

      const results = await conn.runPipeline(pipeline);

      const lob = results[1].rows[0][0];
      const data = await lob.getData();

      assert.strictEqual(data, clobData);
    }); // 324.3.40
  }); // 324.3

  describe('324.4 Negative scenarios', () => {
    let conn;
    const PROC_NAME1 = 'NODB_PIP_WARN';
    const PROC_NAME2 = 'NODB_PIP_WARN2';
    const FUNC_NAME = 'NODB_PIP_FN_WARN';
    const TYP_NAME = 'NODB_PIP_TYP_WARN';

    before(async () => {
      conn = await oracledb.getConnection(dbConfig);
    });

    after(async () => {
      if (conn) {
        await testsUtil.dropProcedure(conn, PROC_NAME1);
        await testsUtil.dropProcedure(conn, PROC_NAME2);
        await testsUtil.dropFunction(conn, FUNC_NAME);
        await testsUtil.dropType(conn, TYP_NAME);
        await conn.close();
      }
    });

    it('324.4.1 runPipeline invalid args', async function() {
      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchOne(`select 1 from dual`);
      pipeline.addFetchOne(`select user from dual`);
      await assert.rejects(
        () => conn.runPipeline('pipeline'),
        /NJS-005:/
        /* NJS005: invalid value for parameter */
      );
    }); // 324.4.1

    it('324.4.2 addOperations with warning ', async function() {
      const num = 324;
      const pipeline = new oracledb.Pipeline();

      // plsql generates warning.
      const plsql = `CREATE OR REPLACE PROCEDURE ${PROC_NAME1} (
        p_id IN NUMBER,
        p_result OUT nodb_t_table
      ) IS
      BEGIN
        -- Initialize the output collection
        p_result := nodb_t_table();
        -- Fetch data into the collection using BULK COLLECT
        SELECT SESSION_DATA(p.person.id, p.person.name)
        BULK COLLECT INTO p_result
        FROM nodb_person_table p
        WHERE p.person.id = p_id;
      END;`;
      const plsql2 = `create or replace procedure ${PROC_NAME2} as
        begin
          bogus;
        end;`;

      pipeline.addFetchOne(`select ${num} from dual`);
      pipeline.addExecute(plsql);
      pipeline.addFetchOne(`select user from dual`);
      pipeline.addExecute(plsql2);
      pipeline.addExecute(`create or replace procedure ${PROC_NAME1} as
        begin
          null;
        end;
          `);
      pipeline.addExecute(`drop procedure ${PROC_NAME1} `);
      pipeline.addExecute(`create or replace function ${FUNC_NAME}
        return number as
          begin
            return null
          end;
          `);
      pipeline.addExecute(`drop function ${FUNC_NAME} `);
      pipeline.addExecute(`create or replace type ${TYP_NAME} as object ()
              x bad_type
            );`
      );
      pipeline.addExecute(`drop type ${TYP_NAME} `);

      const results = await conn.runPipeline(pipeline, true);
      assert.strictEqual(results[0].rows[0][0], num);
      /* NJS-700: creation succeeded with compilation errors */
      assert.deepStrictEqual(results[1].warning.code, 'NJS-700');
      assert.deepStrictEqual(results[2].rows[0][0], dbConfig.user.toUpperCase());
      assert.deepStrictEqual(results[3].warning.code, 'NJS-700');
      assert(results[4].warning === undefined);
      assert(results[5].warning === undefined);
      assert.deepStrictEqual(results[6].warning.code, 'NJS-700');
      assert(results[7].warning === undefined);
      assert.deepStrictEqual(results[8].warning.code, 'NJS-700');
      assert(results[9].warning === undefined);
    }); // 324.4.2

    it('324.4.3 test unsupported execute options', function() {
      const pipeline = new oracledb.Pipeline();
      assert.throws(
        () => pipeline.addExecute(`select user from dual`, [], {resultSet: true}),
        /NJS-182: Execute option 'resultSet' is not supported in pipeline mode/
      );
      assert.throws(
        () => pipeline.addFetchOne(`select user from dual`, [], {resultSet: true}),
        /NJS-182: Execute option 'resultSet' is not supported in pipeline mode/
      );
      assert.throws(
        () => pipeline.addFetchMany(`select user from dual`, [], {resultSet: true}, 1),
        /NJS-182: Execute option 'resultSet' is not supported in pipeline mode/
      );
      assert.throws(
        () => pipeline.addFetchAll(`select user from dual`, [], {resultSet: true}),
        /NJS-182: Execute option 'resultSet' is not supported in pipeline mode/
      );
    }); // 324.4.3

  }); // 324.4

  describe('324.5 concurrent conn.runPipeline() should not throw max open cursors for session exceeded error', () => {
    let conn;
    const TEST_TAB = 'NODB_TAB_PIPE_TEST_2';
    const MAX_ADDR_LEN = 4000;

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
        await conn.close();
      }
    });

    it('324.5.1 pipeline in non-pipeline mode', async function() {
      const pipelines = [];
      const numRows = 4;
      const numRowsFetchMany = 3;
      for (let i = 0; i < numRows; i++) {
        await conn.execute(`insert into ${TEST_TAB} (id, address) values (${i + 1}, 'test pipeline')`);
      }
      await conn.commit();

      for (let p = 0; p < 300; p++) {
        let pipeline = new oracledb.Pipeline();
        pipeline.addFetchOne(`select id, address from ${TEST_TAB} order by id`);
        pipelines.push(pipeline);

        pipeline = new oracledb.Pipeline();
        pipeline.addFetchMany(`select id, address from ${TEST_TAB} order by id`, [], {}, numRowsFetchMany);
        pipelines.push(pipeline);

        pipeline = new oracledb.Pipeline();
        pipeline.addFetchMany(`select id, address from ${TEST_TAB} order by id`, [], {}, 0);
        pipelines.push(pipeline);

        pipeline = new oracledb.Pipeline();
        pipeline.addFetchAll(`select id, address from ${TEST_TAB} order by id`, [], {}, 1); // fetchArraySize = 1
        pipelines.push(pipeline);
      }
      const promises = pipelines.map((pipe) => conn.runPipeline(pipe));
      const results = await Promise.all(promises);
      assert.strictEqual(results.length, 1200);

    }); // 324.5.1

    it('324.5.2 pipeline in pipeline mode', async function() {
      const pipelines = [];
      const numRows = 4;
      const numRowsFetchMany = 3;
      for (let i = 0; i < numRows; i++) {
        await conn.execute(`insert into ${TEST_TAB} (id, address) values (${i + 1}, 'test pipeline')`);
      }
      await conn.commit();

      for (let p = 0; p < 30; p++) {
        const pipeline = new oracledb.Pipeline();
        for (let t = 0; t < 10; t++) {
          pipeline.addFetchOne(`select id, address from ${TEST_TAB} order by id`);
          pipeline.addFetchMany(`select id, address from ${TEST_TAB} order by id`, [], {}, numRowsFetchMany);
          pipeline.addFetchMany(`select id, address from ${TEST_TAB} order by id`, [], {}, 0);
          pipeline.addFetchAll(`select id, address from ${TEST_TAB} order by id`, [], {}, 1); // fetchArraySize = 1
        }
        pipelines.push(pipeline);
      }
      const promises = pipelines.map((pipe) => conn.runPipeline(pipe));
      const results = await Promise.all(promises);
      assert.strictEqual(results.length, 30);

    }); // 324.5.2

  }); // 324.5

  describe('324.6 pipeline implicit results', function() {
    let conn;
    const tableMain = 'TEST_PIPE_IRS_MAIN';
    const tableChild = 'TEST_PIPE_IRS_CHILD';
    const procName = 'NODB_PIPE_IRS_PROC';
    const expectedMain = [ [1, 'row-main-1'], [2, 'row-main-2'] ];
    const expectedChild = [ [1, 'child-1'], [2, 'child-2'] ];

    before(async function() {
      conn = await oracledb.getConnection(dbConfig);
      // drops
      for (const ddl of [
        `BEGIN EXECUTE IMMEDIATE 'DROP PROCEDURE ${procName}'; EXCEPTION WHEN OTHERS THEN IF SQLCODE != -4043 THEN RAISE; END IF; END;`,
        `BEGIN EXECUTE IMMEDIATE 'DROP TABLE ${tableChild}'; EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF; END;`,
        `BEGIN EXECUTE IMMEDIATE 'DROP TABLE ${tableMain}'; EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF; END;`
      ]) {
        await conn.execute(ddl);
      }
      await conn.execute(`CREATE TABLE ${tableMain} (id NUMBER PRIMARY KEY, status VARCHAR2(80))`);
      await conn.execute(`CREATE TABLE ${tableChild} (id NUMBER PRIMARY KEY, child_status VARCHAR2(80))`);
      await conn.execute(`INSERT INTO ${tableMain} (id, status) VALUES (1, 'row-main-1')`);
      await conn.execute(`INSERT INTO ${tableMain} (id, status) VALUES (2, 'row-main-2')`);
      await conn.execute(`INSERT INTO ${tableChild} (id, child_status) VALUES (1, 'child-1')`);
      await conn.execute(`INSERT INTO ${tableChild} (id, child_status) VALUES (2, 'child-2')`);
      const createProc = `CREATE OR REPLACE PROCEDURE ${procName} AS
      BEGIN
          DECLARE
              c_main SYS_REFCURSOR;
              c_child SYS_REFCURSOR;
          BEGIN
              OPEN c_main FOR SELECT id, status FROM ${tableMain} ORDER BY id;
              DBMS_SQL.RETURN_RESULT(c_main);

              OPEN c_child FOR SELECT id, child_status FROM ${tableChild} ORDER BY id;
              DBMS_SQL.RETURN_RESULT(c_child);
          END;
      END;`;
      await conn.execute(createProc);
    });

    after(async function() {
      if (conn) await conn.close();
    });

    it('324.6.1 returns implicit results rows with addExecute() in pipeline', async function() {
      const pipeline = new oracledb.Pipeline();
      pipeline.addExecute(`BEGIN ${procName}; END;`);
      pipeline.addFetchAll(
        `SELECT status FROM ${tableMain} ORDER BY id`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
        2
      );
      pipeline.addFetchAll(
        `SELECT child_status FROM ${tableChild} ORDER BY id`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
        2
      );

      const results = await conn.runPipeline(pipeline, true);

      assert.deepStrictEqual(results[0].implicitResults, [ expectedMain, expectedChild ]);
      assert.deepStrictEqual(results[1].rows, [
        { STATUS: 'row-main-1' },
        { STATUS: 'row-main-2' }
      ]);
      assert.deepStrictEqual(results[2].rows, [
        { CHILD_STATUS: 'child-1' },
        { CHILD_STATUS: 'child-2' }
      ]);
    }); // 324.6.1

    it('324.6.2 does not return implicit results rows with addFetch*() in pipeline', async function() {
      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchAll(`BEGIN ${procName}; END;`, [], {}, 2);
      pipeline.addFetchOne(`BEGIN ${procName}; END;`);
      pipeline.addFetchMany(`BEGIN ${procName}; END;`, [], {}, 1);
      pipeline.addFetchMany(`BEGIN ${procName}; END;`, [], {}, 2);
      pipeline.addFetchMany(`BEGIN ${procName}; END;`, [], {}, 0);
      pipeline.addFetchMany(`BEGIN ${procName}; END;`, [], {}, 1);
      pipeline.addFetchMany(`BEGIN ${procName}; END;`, [], {}, 2);
      pipeline.addFetchAll(
        `SELECT status FROM ${tableMain} ORDER BY id`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
        2
      );
      pipeline.addFetchAll(
        `SELECT child_status FROM ${tableChild} ORDER BY id`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
        2
      );

      const results = await conn.runPipeline(pipeline, true);
      for (let i = 0; i < 7; i++) {
        assert.deepStrictEqual(results[i].implicitResults, undefined);
      }

      assert.deepStrictEqual(results[7].rows, [
        { STATUS: 'row-main-1' },
        { STATUS: 'row-main-2' }
      ]);
      assert.deepStrictEqual(results[8].rows, [
        { CHILD_STATUS: 'child-1' },
        { CHILD_STATUS: 'child-2' }
      ]);
    }); // 324.6.2
  }); // 324.6
});

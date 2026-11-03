/* Copyright (c) 2019, 2026, Oracle and/or its affiliates. */

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
 *   192. implicitResults.js
 *
 * DESCRIPTION
 *   Test the Implicit Results feauture.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('192. implicitResults.js', function() {

  let isRunnable = false;

  const tab1 = 'nodb_tab_impres1';
  const tab2 = 'nodb_tab_impres2';
  const queryImpres = `
        declare
            c1 sys_refcursor;
            c2 sys_refcursor;
        begin
            open c1 for
            select * from ${tab1};

            dbms_sql.return_result(c1);

            open c2 for
            select * from ${tab2};

            dbms_sql.return_result(c2);
        end;`;

  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites();

    if (!isRunnable || dbConfig.test.isCmanTdm) {
      this.skip();
    } else {
      const conn = await oracledb.getConnection(dbConfig);

      let sql =
        `create table ${tab1} (
          id number(9) not null,
          value varchar2(100) not null
        )`;
      let plsql = testsUtil.sqlCreateTable(tab1, sql);
      await conn.execute(plsql);

      let sqlInsertValues =
        `DECLARE \n` +
        `    x NUMBER := 0; \n` +
        `    n VARCHAR2(100); \n` +
        `BEGIN \n` +
        `    FOR i IN 1..23 LOOP \n` +
        `        x := x + 1; \n` +
        `        n := 'Staff ' || x; \n` +
        `        INSERT INTO ${tab1} VALUES (x, n); \n` +
        `    END LOOP; \n` +
        `END; `;
      await conn.execute(sqlInsertValues);

      sql = `create table ${tab2} (
              id    number(9) not null,
              tsval timestamp not null
            )`;
      plsql = testsUtil.sqlCreateTable(tab2, sql);
      await conn.execute(plsql);

      sqlInsertValues =
        `DECLARE \n` +
        `    x NUMBER := 0; \n` +
        `    n TIMESTAMP; \n` +
        `BEGIN \n` +
        `    FOR i IN 1..5 LOOP \n` +
        `        x := x + 1; \n` +
        `        n := systimestamp + (i / 10); \n` +
        `        INSERT INTO ${tab2} VALUES (x, n); \n` +
        `    END LOOP; \n` +
        `END; `;
      await conn.execute(sqlInsertValues);

      await conn.commit();
      await conn.close();
    }

  }); // before()

  after(async function() {

    if (!isRunnable || dbConfig.test.isCmanTdm) {
      return;
    } else {
      const conn = await oracledb.getConnection(dbConfig);

      let sql = `DROP TABLE ${tab1} PURGE`;
      await conn.execute(sql);

      sql = `DROP TABLE ${tab2} PURGE`;
      await conn.execute(sql);

      await conn.close();
    }

  }); // after()

  it('192.1 implicit results with rows fetched', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const results = await conn.execute(queryImpres);

    let rows = results.implicitResults[0];
    for (let j = 0; j < rows.length; j++) {
      assert.strictEqual(rows[j][1], `Staff ${j + 1}`);
    }

    rows = results.implicitResults[1];
    const tab2Len = 5;
    assert.strictEqual(rows.length, tab2Len);

    await conn.close();
  }); // 192.1

  it('192.2 implicit Results with Result Sets', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const results = await conn.execute(queryImpres, [], { resultSet: true });

    // Assert the content of table 1
    let rs = await results.implicitResults[0].getRows(100);
    for (let j = 0; j < rs.length; j++) {
      assert.strictEqual(rs[j][1], `Staff ${j + 1}`);
    }

    // Assert the content of table 2
    rs = await results.implicitResults[1];
    let row, len = 0;
    while ((row = await rs.getRow())) {
      assert(testsUtil.isDate(row[1]));
      len++;
    }
    const tab2Len = 5;
    assert.strictEqual(len, tab2Len);

    await rs.close();
    await conn.close();
  }); // 192.2

  it('192.3 multiple options, outFormat is OUT_FORMAT_OBJECT', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const opts = { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT };
    const results = await conn.execute(queryImpres, [], opts);

    let rs = await results.implicitResults[0].getRows(100);
    for (let j = 0; j < rs.length; j++) {
      assert.strictEqual(rs[j].VALUE, `Staff ${j + 1}`);
    }

    rs = await results.implicitResults[1];
    let row, len = 0;
    while ((row = await rs.getRow())) {
      assert(testsUtil.isDate(row.TSVAL));
      len++;
    }
    const tab2Len = 5;
    assert.strictEqual(len, tab2Len);

    await rs.close();
    await conn.close();
  }); // 192.3

  it('192.4 releases multiple implicit result set entries', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const results = await conn.execute(queryImpres, [], { resultSet: true });

    assert.strictEqual(results.implicitResults.length, 2);
    await results.implicitResults[0].close();
    await results.implicitResults[1].close();
    await conn.close();
  }); // 192.4

  it('192.5 re-executes PL/SQL returning REFCURSORs with DBMS_SQL.RETURN_RESULT after normal query', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const tableMain = 'nodb_irs_rows_main';
    const tableChild = 'nodb_irs_rows_child';
    const procName = 'nodb_irs_rows_proc';

    try {
      await testsUtil.dropProcedure(conn, procName);
      await testsUtil.dropTable(conn, tableChild);
      await testsUtil.dropTable(conn, tableMain);

      await conn.execute(`CREATE TABLE ${tableMain} (id NUMBER PRIMARY KEY, status VARCHAR2(80))`);
      await conn.execute(`CREATE TABLE ${tableChild} (id NUMBER PRIMARY KEY, child_status VARCHAR2(80))`);
      await conn.execute(`INSERT INTO ${tableMain} VALUES (1, 'row-main-1')`);
      await conn.execute(`INSERT INTO ${tableMain} VALUES (2, 'row-main-2')`);
      await conn.execute(`INSERT INTO ${tableChild} VALUES (1, 'child-1')`);
      await conn.execute(`INSERT INTO ${tableChild} VALUES (2, 'child-2')`);

      await conn.execute(`
        CREATE OR REPLACE PROCEDURE ${procName} AS
          c_main SYS_REFCURSOR;
          c_child SYS_REFCURSOR;
        BEGIN
          OPEN c_main FOR SELECT id, status FROM ${tableMain} ORDER BY id;
          DBMS_SQL.RETURN_RESULT(c_main);

          OPEN c_child FOR SELECT id, child_status FROM ${tableChild} ORDER BY id;
          DBMS_SQL.RETURN_RESULT(c_child);
        END;`);

      const plsql = `BEGIN ${procName}; END;`;
      let results = await conn.execute(plsql);
      assert.deepStrictEqual(results.implicitResults, [
        [
          [1, 'row-main-1'],
          [2, 'row-main-2']
        ],
        [
          [1, 'child-1'],
          [2, 'child-2']
        ]
      ]);

      const ping = await conn.execute('SELECT 1 FROM dual');
      assert.deepStrictEqual(ping.rows, [[1]]);

      results = await conn.execute(plsql, [], { resultSet: true });
      assert.strictEqual(results.implicitResults.length, 2);

      let rows = await results.implicitResults[0].getRows();
      assert.deepStrictEqual(rows, [
        [1, 'row-main-1'],
        [2, 'row-main-2']
      ]);
      await results.implicitResults[0].close();

      rows = await results.implicitResults[1].getRows();
      assert.deepStrictEqual(rows, [
        [1, 'child-1'],
        [2, 'child-2']
      ]);
      await results.implicitResults[1].close();
    } finally {
      await testsUtil.dropProcedure(conn, procName);
      await testsUtil.dropTable(conn, tableChild);
      await testsUtil.dropTable(conn, tableMain);
      await conn.close();
    }
  }); // 192.5

  it('192.6 fetches all JSON rows from implicit results in Thin mode', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    try {
      if (!oracledb.thin || conn.oracleServerVersion < 2100000000) {
        this.skip();
      }

      const jsonRows = (numRows) => Array.from({ length: numRows }, (_, i) =>
        [{ n: i + 1 }]);
      const jsonBlock = (numRows) => `
        DECLARE
          c SYS_REFCURSOR;
        BEGIN
          OPEN c FOR
            SELECT JSON_OBJECT('n' VALUE LEVEL RETURNING JSON) AS j
            FROM dual CONNECT BY LEVEL <= ${numRows};
          DBMS_SQL.RETURN_RESULT(c);
        END;`;
      const expected = [jsonRows(3)];

      let result = await conn.execute(jsonBlock(3));
      assert.deepStrictEqual(result.implicitResults, expected);

      result = await conn.execute(jsonBlock(3), [], { prefetchRows: 0 });
      assert.deepStrictEqual(result.implicitResults, expected);

      result = await conn.execute(jsonBlock(1), [], { prefetchRows: 2 });
      assert.deepStrictEqual(result.implicitResults, [jsonRows(1)]);

      result = await conn.execute(jsonBlock(2), [], { prefetchRows: 2 });
      assert.deepStrictEqual(result.implicitResults, [jsonRows(2)]);

      result = await conn.execute(jsonBlock(20), [], { prefetchRows: 2 });
      assert.deepStrictEqual(result.implicitResults, [jsonRows(20)]);

      result = await conn.execute(jsonBlock(3), [], { prefetchRows: 10 });
      assert.deepStrictEqual(result.implicitResults, expected);

      result = await conn.execute(jsonBlock(25), [], { prefetchRows: 10 });
      assert.deepStrictEqual(result.implicitResults, [jsonRows(25)]);

      result = await conn.execute(jsonBlock(3), [], {
        resultSet: true,
        prefetchRows: 0,
        fetchArraySize: 1
      });
      const resultSet = result.implicitResults[0];
      try {
        const rows = [];
        rows.push(...await resultSet.getRows(1));
        rows.push(...await resultSet.getRows(1));
        rows.push(...await resultSet.getRows(1));
        assert.deepStrictEqual(rows, expected[0]);
        assert.deepStrictEqual(await resultSet.getRows(1), []);
      } finally {
        await resultSet.close();
      }

      result = await conn.execute(`
        DECLARE
          c_json SYS_REFCURSOR;
          c_text SYS_REFCURSOR;
        BEGIN
          OPEN c_json FOR
            SELECT JSON_OBJECT('n' VALUE LEVEL RETURNING JSON) AS j
            FROM dual CONNECT BY LEVEL <= 3;
          DBMS_SQL.RETURN_RESULT(c_json);
          OPEN c_text FOR
            SELECT 'text ' || LEVEL AS t
            FROM dual CONNECT BY LEVEL <= 3;
          DBMS_SQL.RETURN_RESULT(c_text);
        END;`);
      assert.deepStrictEqual(result.implicitResults, [
        jsonRows(3),
        [['text 1'], ['text 2'], ['text 3']]
      ]);

      result = await conn.execute(`
        DECLARE
          c SYS_REFCURSOR;
        BEGIN
          OPEN c FOR
            SELECT JSON_OBJECT('n' VALUE LEVEL RETURNING JSON) AS j,
                   'text ' || LEVEL AS t
            FROM dual CONNECT BY LEVEL <= 3;
          DBMS_SQL.RETURN_RESULT(c);
        END;`);
      assert.deepStrictEqual(result.implicitResults, [[
        [{ n: 1 }, 'text 1'],
        [{ n: 2 }, 'text 2'],
        [{ n: 3 }, 'text 3']
      ]]);

      result = await conn.execute(`
        DECLARE
          c SYS_REFCURSOR;
        BEGIN
          OPEN c FOR
            SELECT JSON_OBJECT('n' VALUE 1 RETURNING JSON) AS j
            FROM dual WHERE 1 = 0;
          DBMS_SQL.RETURN_RESULT(c);
        END;`);
      assert.deepStrictEqual(result.implicitResults, [[]]);

      result = await conn.execute(`
        BEGIN
          OPEN :cursor FOR
            SELECT JSON_OBJECT('n' VALUE LEVEL RETURNING JSON) AS j
            FROM dual CONNECT BY LEVEL <= 3;
        END;`, {
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR }
      });
      const cursor = result.outBinds.cursor;
      try {
        assert.deepStrictEqual(await cursor.getRows(), jsonRows(3));
      } finally {
        await cursor.close();
      }
    } finally {
      await conn.close();
    }
  }); // 192.6

  it('192.6.1 fetches all JSON rows as strings from implicit results in Thin mode', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    try {
      if (!oracledb.thin || conn.oracleServerVersion < 2100000000) {
        this.skip();
      }

      const plsql = `
        DECLARE
          c SYS_REFCURSOR;
        BEGIN
          OPEN c FOR
            SELECT JSON_OBJECT('n' VALUE LEVEL RETURNING JSON) AS j
            FROM dual CONNECT BY LEVEL <= 3;
          DBMS_SQL.RETURN_RESULT(c);
        END;`;
      const options = {
        fetchTypeHandler(metadata) {
          if (metadata.dbType === oracledb.DB_TYPE_JSON) {
            return { type: oracledb.STRING };
          }
        }
      };
      const expected = [[['{"n":1}'], ['{"n":2}'], ['{"n":3}']]];

      let result = await conn.execute(plsql, [], options);
      assert.deepStrictEqual(result.implicitResults, expected);

      result = await conn.execute(plsql, [], { ...options, prefetchRows: 0 });
      assert.deepStrictEqual(result.implicitResults, expected);
    } finally {
      await conn.close();
    }
  }); // 192.6.1

  it('192.6.2 fetches all VARCHAR2 rows from implicit results in Thin mode', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    try {
      if (!oracledb.thin || conn.oracleServerVersion < 2100000000) {
        this.skip();
      }

      const plsql = `
        DECLARE
          c SYS_REFCURSOR;
        BEGIN
          OPEN c FOR
            SELECT JSON_OBJECT('n' VALUE LEVEL) AS j
            FROM dual CONNECT BY LEVEL <= 3;
          DBMS_SQL.RETURN_RESULT(c);
        END;`;
      const expected = [[['{"n":1}'], ['{"n":2}'], ['{"n":3}']]];

      let result = await conn.execute(plsql);
      assert.deepStrictEqual(result.implicitResults, expected);

      result = await conn.execute(plsql, [], { prefetchRows: 0 });
      assert.deepStrictEqual(result.implicitResults, expected);
    } finally {
      await conn.close();
    }
  }); // 192.6.2

  it('192.6.3 fetches VARCHAR2 rows from an implicit result set without defines in Thin mode', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    try {
      if (!oracledb.thin || conn.oracleServerVersion < 2100000000) {
        this.skip();
      }

      const plsql = `
        DECLARE
          c SYS_REFCURSOR;
        BEGIN
          OPEN c FOR
            SELECT JSON_OBJECT('n' VALUE LEVEL) AS j
            FROM dual CONNECT BY LEVEL <= 3;
          DBMS_SQL.RETURN_RESULT(c);
        END;`;
      const result = await conn.execute(plsql, [], {
        resultSet: true,
        prefetchRows: 0,
        fetchArraySize: 1
      });
      const resultSet = result.implicitResults[0];
      try {
        assert.deepStrictEqual(await resultSet.getRows(1), [['{"n":1}']]);
        assert.deepStrictEqual(await resultSet.getRows(1), [['{"n":2}']]);
        assert.deepStrictEqual(await resultSet.getRows(1), [['{"n":3}']]);
        assert.deepStrictEqual(await resultSet.getRows(1), []);
      } finally {
        await resultSet.close();
      }
    } finally {
      await conn.close();
    }
  }); // 192.6.3

  it('192.6.4 fetches all CLOB rows from implicit results in Thin mode', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    try {
      if (!oracledb.thin || conn.oracleServerVersion < 2100000000) {
        this.skip();
      }

      const plsql = `
        DECLARE
          c SYS_REFCURSOR;
        BEGIN
          OPEN c FOR
            SELECT JSON_OBJECT('n' VALUE LEVEL RETURNING CLOB) AS j
            FROM dual CONNECT BY LEVEL <= 3;
          DBMS_SQL.RETURN_RESULT(c);
        END;`;
      const options = {
        resultSet: true,
        fetchArraySize: 1,
        fetchTypeHandler(metadata) {
          if (metadata.dbType === oracledb.DB_TYPE_CLOB) {
            return { type: oracledb.CLOB };
          }
        }
      };

      for (const prefetchRows of [0, 10]) {
        const result = await conn.execute(plsql, [], { ...options, prefetchRows });
        const resultSet = result.implicitResults[0];
        try {
          const rows = await resultSet.getRows();
          assert.strictEqual(rows.length, 3);
          for (let i = 1; i <= 3; i++) {
            const lob = rows[i - 1][0];
            try {
              assert.strictEqual(lob.type, oracledb.DB_TYPE_CLOB);
              assert.strictEqual(await lob.getData(), `{"n":${i}}`);
            } finally {
              await lob.close();
            }
          }
        } finally {
          await resultSet.close();
        }
      }
    } finally {
      await conn.close();
    }
  }); // 192.6.4

  it('192.6.5 fetches all CLOB rows as strings from implicit results in Thin mode', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    try {
      if (!oracledb.thin || conn.oracleServerVersion < 2100000000) {
        this.skip();
      }

      const plsql = `
        DECLARE
          c SYS_REFCURSOR;
        BEGIN
          OPEN c FOR
            SELECT JSON_OBJECT('n' VALUE LEVEL RETURNING CLOB) AS j
            FROM dual CONNECT BY LEVEL <= 3;
          DBMS_SQL.RETURN_RESULT(c);
        END;`;
      const options = {
        fetchTypeHandler(metadata) {
          if (metadata.dbType === oracledb.DB_TYPE_CLOB) {
            return { type: oracledb.STRING };
          }
        }
      };
      const expected = [[['{"n":1}'], ['{"n":2}'], ['{"n":3}']]];

      let result = await conn.execute(plsql, [], options);
      assert.deepStrictEqual(result.implicitResults, expected);

      result = await conn.execute(plsql, [], { ...options, prefetchRows: 0 });
      assert.deepStrictEqual(result.implicitResults, expected);
    } finally {
      await conn.close();
    }
  }); // 192.6.5

  it('192.6.6 fetches all VECTOR rows from an OUT REF CURSOR', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    try {
      if (!await testsUtil.checkPrerequisites(2304000000, 2304000000)) {
        this.skip();
      }

      const result = await conn.execute(`
        BEGIN
          OPEN :cursor FOR
            SELECT TO_VECTOR('[1, 2, 3]', 3, FLOAT32) AS v
            FROM dual CONNECT BY LEVEL <= 3;
        END;`, {
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR }
      }, { prefetchRows: 2 });
      const cursor = result.outBinds.cursor;
      try {
        // Two rows can arrive with the define request; the third needs OFETCH.
        const rows = await cursor.getRows(3);
        assert.strictEqual(rows.length, 3);
        for (const row of rows) {
          assert.deepStrictEqual(row[0], new Float32Array([1, 2, 3]));
        }
      } finally {
        await cursor.close();
      }
    } finally {
      await conn.close();
    }
  }); // 192.6.6

});

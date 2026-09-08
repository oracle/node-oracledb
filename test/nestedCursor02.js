/* Copyright (c) 2020, 2026, Oracle and/or its affiliates. */

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
 *   233. nestedCursor02.js
 *
 * DESCRIPTION
 *   Nested Cursor.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');

describe('233. nestedCursor02.js', () => {

  let conn;
  before(async function() {
    conn = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await conn.close();
  });

  it('233.1 example-nested-cursor.js', async () => {
    const simpleSql = `
      select
        'String Val',
        cursor(
          select 1, 'Nested Row 1' from dual
          union all
          select 2, 'Nested Row 2' from dual
          union all
          select 3, 'Nested Row 3' from dual
        ) as nc
      from dual`;

    const complexSql = `
      select
        'Level 1 String',
        cursor(
          select
            'Level 2 String',
            cursor(
              select
                'Level 3 String',
                cursor(
                  select 1, 'Level 4 String A' from dual
                  union all
                  select 2, 'Level 4 String B' from dual
                  union all
                  select 3, 'Level 4 String C' from dual
                ) as nc3
              from dual
            ) as nc2
          from dual
        ) as nc1
      from dual`;

    async function traverse_results(resultSet) {
      const fetchedRows = [];
      while (true) {
        const row = await resultSet.getRow();
        if (!row) {
          await resultSet.close();
          break;
        }
        for (const i in row) {
          if (row[i] instanceof oracledb.ResultSet) {
            row[i] = await traverse_results(row[i]);
          }
        }
        fetchedRows.push(row);
      }
      return fetchedRows;
    } // traverse_results()

    const rowsSimple = [
      [ 1, 'Nested Row 1' ], [ 2, 'Nested Row 2' ], [ 3, 'Nested Row 3' ]
    ];

    const rowsComplex = [
      [ 1, 'Level 4 String A' ],
      [ 2, 'Level 4 String B' ],
      [ 3, 'Level 4 String C' ]
    ];

    // (1) Simple SQL, no result set
    const result1 = await conn.execute(simpleSql);
    const rows1 = result1.rows;
    assert.strictEqual(rows1[0][0], 'String Val');
    assert.deepStrictEqual(rows1[0][1], rowsSimple);

    assert.strictEqual(result1.metaData[0].name, "'STRINGVAL'");
    assert.strictEqual(result1.metaData[1].name, 'NC');
    assert.strictEqual(result1.metaData[1].metaData[0].name, '1');
    assert.strictEqual(result1.metaData[1].metaData[1].name, "'NESTEDROW1'");

    // (2) Simple SQL, result set
    const result2 = await conn.execute(simpleSql, [], { resultSet: true });
    const rows2 = await traverse_results(result2.resultSet);
    assert.strictEqual(rows2[0][0], 'String Val');
    assert.deepStrictEqual(rows2[0][1], rowsSimple);

    assert.strictEqual(result1.metaData[0].name, "'STRINGVAL'");
    assert.strictEqual(result1.metaData[1].name, 'NC');

    // (3) Complex SQL, no result set
    const result3 = await conn.execute(complexSql);
    const rows3 = result3.rows;
    assert.strictEqual(rows3[0][0], 'Level 1 String');
    assert.strictEqual(rows3[0][1][0][0], 'Level 2 String');
    assert.strictEqual(rows3[0][1][0][1][0][0], 'Level 3 String');
    assert.deepStrictEqual(rows3[0][1][0][1][0][1], rowsComplex);

    assert.strictEqual(result3.metaData[0].name, "'LEVEL1STRING'");
    assert.strictEqual(result3.metaData[1].name, 'NC1');

    assert.strictEqual(result3.metaData[1].metaData[0].name, "'LEVEL2STRING'");
    assert.strictEqual(result3.metaData[1].metaData[1].name, 'NC2');

    assert.strictEqual(result3.metaData[1].metaData[1].metaData[0].name, "'LEVEL3STRING'");
    assert.strictEqual(result3.metaData[1].metaData[1].metaData[1].name, 'NC3');

    assert.strictEqual(result3.metaData[1].metaData[1].metaData[1].metaData[0].name, '1');
    assert.strictEqual(result3.metaData[1].metaData[1].metaData[1].metaData[1].name, "'LEVEL4STRINGA'");

    // (4) Complex SQL, result set
    const result4 = await conn.execute(complexSql, [], { resultSet: true });
    const rows4 = await traverse_results(result4.resultSet);
    assert.strictEqual(rows4[0][0], 'Level 1 String');
    assert.strictEqual(rows4[0][1][0][0], 'Level 2 String');
    assert.strictEqual(rows4[0][1][0][1][0][0], 'Level 3 String');
    assert.deepStrictEqual(rows4[0][1][0][1][0][1], rowsComplex);

    assert.strictEqual(result4.metaData[0].name, "'LEVEL1STRING'");
    assert.strictEqual(result4.metaData[1].name, 'NC1');

  });

  it('233.2 initializes DB object types for later nested cursors', async () => {
    const typeName = 'NODB_NESTED_CURSOR_OBJ';

    try {
      await conn.execute(`CREATE OR REPLACE TYPE ${typeName} AS OBJECT (
        id NUMBER
      )`);

      const result = await conn.execute(`
        SELECT id, CURSOR(
          SELECT ${typeName}(id) AS obj FROM dual
        ) AS nc
        FROM (
          SELECT 1 AS id FROM dual
          UNION ALL
          SELECT 2 AS id FROM dual
        )
        ORDER BY id`, [], { resultSet: true, fetchArraySize: 2 });
      const parentRows = await result.resultSet.getRows(2);
      const firstChildRows = await parentRows[0][1].getRows();
      const secondChildRows = await parentRows[1][1].getRows();

      assert.strictEqual(parentRows.length, 2);
      assert.strictEqual(firstChildRows.length, 1);
      assert.strictEqual(firstChildRows[0][0].ID, 1);
      assert.strictEqual(secondChildRows.length, 1);
      assert.strictEqual(secondChildRows[0][0].ID, 2);

      await parentRows[0][1].close();
      await parentRows[1][1].close();
      await result.resultSet.close();
    } finally {
      await conn.execute(`DROP TYPE ${typeName} FORCE`);
    }
  });

  it('233.3 keeps nested cursor DbObjects after parent buffer replacement', async () => {
    const typeName = 'NODB_NESTED_CURSOR_RESIZE_OBJ';

    try {
      await conn.execute(`CREATE OR REPLACE TYPE ${typeName} AS OBJECT (
        id NUMBER
      )`);

      const result = await conn.execute(`
        SELECT id, CURSOR(
          SELECT ${typeName}(id) AS obj FROM dual
          ) AS nc
          FROM (
            SELECT LEVEL AS id FROM dual CONNECT BY LEVEL <= 5
          )
          ORDER BY id`, [], {
        resultSet: true,
        fetchArraySize: 1,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      });
      const firstRows = await result.resultSet.getRows(1);
      const remainingRows = await result.resultSet.getRows(4);
      const parentRows = firstRows.concat(remainingRows);

      await result.resultSet.close();

      // Consume retained children after parent buffer replacement and close.
      for (const index of [4, 1, 3, 0, 2]) {
        const childRows = await parentRows[index].NC.getRows();
        assert.strictEqual(childRows.length, 1);
        assert.strictEqual(childRows[0].OBJ.ID, index + 1);
        await parentRows[index].NC.close();
      }
    } finally {
      await conn.execute(`DROP TYPE ${typeName} FORCE`);
    }
  });

  it('233.4 initializes DbObjects in multi-level nested cursors', async () => {
    const typeName = 'NODB_MULTI_LEVEL_NESTED_OBJ';

    try {
      await conn.execute(`CREATE OR REPLACE TYPE ${typeName} AS OBJECT (
        id NUMBER
      )`);
      const result = await conn.execute(`
        SELECT CURSOR(
          SELECT CURSOR(
            SELECT ${typeName}(1) AS obj FROM dual
          ) AS nc2
          FROM dual
        ) AS nc1
        FROM dual`, [], { resultSet: true });
      const parentRows = await result.resultSet.getRows();
      const middleRows = await parentRows[0][0].getRows();
      const childRows = await middleRows[0][0].getRows();

      assert.strictEqual(childRows.length, 1);
      assert.strictEqual(childRows[0][0].ID, 1);

      await middleRows[0][0].close();
      await parentRows[0][0].close();
      await result.resultSet.close();
    } finally {
      await conn.execute(`DROP TYPE ${typeName} FORCE`);
    }
  });
});

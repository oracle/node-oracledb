/* Copyright (c) 2024, Oracle and/or its affiliates. */

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
 *   298. dataTypeVector4.js
 *
 * DESCRIPTION
 *   Testing Vector Data Type with parallel execution
 *
 *****************************************************************************/
'use strict';

const assert  = require('assert');
const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('298. dataTypeVector4.js', function() {

  let connection = null, isRunnable = false, defaultFetchTypeHandler;
  const tableName = 'nodb_vectorDbTable4';
  const tablecustom = 'nodb_vectorCustomDbTable4';
  before('Get connection', async function() {
    isRunnable = await testsUtil.checkPrerequisites(2304000000, 2304000000);
    if (!isRunnable) this.skip();

    defaultFetchTypeHandler = oracledb.fetchTypeHandler;

    connection = await oracledb.getConnection(dbConfig);

    // Enable Parallel DML
    await connection.execute(`alter session enable parallel dml`);

    let sql = `CREATE TABLE ${tableName} (
                    IntCol     NUMBER,
                    VectorCol  vector
                )`;

    let plsql = testsUtil.sqlCreateTable(tableName, sql);
    await connection.execute(plsql);

    sql = `CREATE TABLE ${tablecustom} (
              IntCol     NUMBER,
              Vector64Col    VECTOR(5, float64),
              VectorInt8Col  VECTOR(5, int8),
              Vector32Col    VECTOR(5, float32)
            )`;

    plsql = testsUtil.sqlCreateTable(tablecustom, sql);
    await connection.execute(plsql);

    // Create a Float64Array
    const float64Array = new Float64Array(
      [-999999.12345, 987654.321, -12345.6789, 56789.0123, -314159.2654]);

    // Create a Int8Arr
    const int8arr = new Int8Array([126, 125, -126, -23, 21]);

    // Create a Float32Array
    const float32Array = new Float32Array(
      [-130, -129, 128, 34, 1]);

    sql = `insert into ${tablecustom} (IntCol, Vector64Col, VectorInt8Col, Vector32Col)
                  values(2, :val1, :val2, :val3)`;
    await connection.execute(sql,
      {   val1: float64Array,
        val2: int8arr,
        val3: float32Array,
      });
  });

  after('Release connection', async function() {
    if (!isRunnable) return;
    await connection.execute(testsUtil.sqlDropTable(tableName));
    await connection.execute(testsUtil.sqlDropTable(tablecustom));

    // disable Parallel DML
    await connection.execute(`alter session disable parallel dml`);
    await connection.close();
  });

  beforeEach(async function() {
    await connection.execute(`truncate table ${tableName}`);
    oracledb.fetchTypeHandler = function(metadata) {
      if (metadata.dbType === oracledb.DB_TYPE_VECTOR) {
        const myConverter = (v) => {
          if (v !== null) {
            return Array.from(v);
          }
          return v;
        };
        return {converter: myConverter};
      }
    };
  });

  afterEach(function() {
    oracledb.fetchTypeHandler = defaultFetchTypeHandler;
  });

  it('298.1 inserting and fetching vector using parallel execution', async function() {
    const arr = Array(2).fill(2.5);
    const FloatArray = new Float32Array(arr);
    await connection.execute(
      `INSERT /*+ parallel */ INTO ${tableName}
       (IntCol, VectorCol) VALUES (:id, :vec64)`,
      { id: 1,
        vec64: FloatArray
      });

    const result = await connection.execute(`select * from ${tableName} parallel`);
    assert.strictEqual(result.rows[0][0], 1);
    assert.deepStrictEqual(result.rows[0][1], [2.5, 2.5]);
  }); // 298.1

  it('298.2 insert data as select all elements', async function() {
    await connection.execute(`insert /*+ parallel */ into ${tableName}
            select intCol, Vector64Col from
            ${tablecustom}
            order by intCol`);

    const result = await connection.execute(`select * from ${tableName} parallel`);
    assert.strictEqual(result.rows[0][0], 2);
    assert.deepStrictEqual(result.rows[0][1], [-999999.12345, 987654.321,
      -12345.6789, 56789.0123, -314159.2654]);
  }); // 298.2

  it('298.3 insert data as select all elements by setting degree of parallelism to 2', async function() {
    await connection.execute(`insert /*+ parallel(2) */ into ${tableName}
            select intCol, Vector64Col from
            ${tablecustom}
            order by intCol`);

    const result = await connection.execute(`select * from ${tableName} parallel`);
    assert.strictEqual(result.rows[0][0], 2);
    assert.deepStrictEqual(result.rows[0][1], [-999999.12345, 987654.321,
      -12345.6789, 56789.0123, -314159.2654]);
  }); // 298.3

  it('298.4 insert and select Min vector distance function', async function() {
    const sampleVector = "VECTOR('[3.1, 4.2, 5.9, 6.5, 7.3, 2.1, 8.4, 9.7, 3.4, 2.2]', 10, FLOAT64)";
    const vectorsToinsert = [
      [8.1, 7.2, 6.3, 5.4, 4.5, 3.6, 2.7, 1.8, 9.9, 0.0],
      [0.1, 1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9.0],
      [1.0, 3.2, 5.4, 7.6, 9.8, 2.1, 4.3, 6.5, 8.7, 0.9],
      [2.2, 8.8, 4.4, 6.6, 0.2, 1.1, 3.3, 5.5, 7.7, 9.9],
    ];

    for (let i = 0; i < vectorsToinsert.length; i++) {
      const vector = vectorsToinsert[i];
      const float64Array = new Float64Array(vector);
      const binds = [
        { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: i + 1 },
        { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array }
      ];
      await connection.execute(`
            INSERT /*+ parallel */ INTO ${tableName} (IntCol, VectorCol) VALUES (:1, :2)
        `, binds);
    }

    const result = await connection.execute(`
                SELECT /*+ parallel(4) */ min(VECTOR_DISTANCE(VectorCol, ${sampleVector}))
                FROM ${tableName}
            `);

    assert.strictEqual(result.rows.length, 1);
    assert.deepStrictEqual(result.rows, [[69.94999999999999]]);
  }); // 298.4

  it('298.5 insert and select Max vector distance function', async function() {
    const sampleVector = "VECTOR('[3.1, 4.2, 5.9, 6.5, 7.3, 2.1, 8.4, 9.7, 3.4, 2.2]', 10, FLOAT64)";
    const vectorsToinsert = [
      [8.1, 7.2, 6.3, 5.4, 4.5, 3.6, 2.7, 1.8, 9.9, 0.0],
      [0.1, 1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9.0],
      [1.0, 3.2, 5.4, 7.6, 9.8, 2.1, 4.3, 6.5, 8.7, 0.9],
      [2.2, 8.8, 4.4, 6.6, 0.2, 1.1, 3.3, 5.5, 7.7, 9.9],
    ];

    for (let i = 0; i < vectorsToinsert.length; i++) {
      const vector = vectorsToinsert[i];
      const float64Array = new Float64Array(vector);
      const binds = [
        { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: i + 1 },
        { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array }
      ];
      await connection.execute(`
            INSERT /*+ parallel */ INTO ${tableName} (IntCol, VectorCol) VALUES (:1, :2)
        `, binds);
    }

    const result = await connection.execute(`
                SELECT /*+ parallel(4) */ max(VECTOR_DISTANCE(VectorCol, ${sampleVector}))
                FROM ${tableName}
            `);

    assert.strictEqual(result.rows.length, 1);
    assert.deepStrictEqual(result.rows, [[197.07]]);
  }); // 298.5

  it('298.6 sum vector distance function vector columns with parallel execution', async function() {
    const sampleVector = "VECTOR('[3.1, 4.2, 5.9, 6.5, 7.3, 2.1, 8.4, 9.7, 3.4, 2.2]', 10, FLOAT64)";
    const vectorsToinsert = [
      [8.1, 7.2, 6.3, 5.4, 4.5, 3.6, 2.7, 1.8, 9.9, 0.0],
      [0.1, 1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9.0],
      [1.0, 3.2, 5.4, 7.6, 9.8, 2.1, 4.3, 6.5, 8.7, 0.9],
      [2.2, 8.8, 4.4, 6.6, 0.2, 1.1, 3.3, 5.5, 7.7, 9.9],
    ];

    for (let i = 0; i < vectorsToinsert.length; i++) {
      const vector = vectorsToinsert[i];
      const float64Array = new Float64Array(vector);
      const binds = [
        { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: i + 1 },
        { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array }
      ];
      await connection.execute(`
              INSERT /*+ parallel */ INTO ${tableName} (IntCol, VectorCol) VALUES (:1, :2)
          `, binds);
    }

    const result = await connection.execute(`
                  SELECT /*+ parallel(4) */ ceil(sum(VECTOR_DISTANCE(VectorCol, ${sampleVector})))
                  FROM ${tableName}
              `);

    assert.strictEqual(result.rows.length, 1);
    assert.deepStrictEqual(result.rows, [[599]]);
  }); // 298.6

  it('298.7 average vector distance function vector columns with parallel execution', async function() {
    const sampleVector = "VECTOR('[3.1, 4.2, 5.9, 6.5, 7.3, 2.1, 8.4, 9.7, 3.4, 2.2]', 10, FLOAT64)";
    const vectorsToinsert = [
      [8.1, 7.2, 6.3, 5.4, 4.5, 3.6, 2.7, 1.8, 9.9, 0.0],
      [0.1, 1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9.0],
      [1.0, 3.2, 5.4, 7.6, 9.8, 2.1, 4.3, 6.5, 8.7, 0.9],
      [2.2, 8.8, 4.4, 6.6, 0.2, 1.1, 3.3, 5.5, 7.7, 9.9],
    ];

    for (let i = 0; i < vectorsToinsert.length; i++) {
      const vector = vectorsToinsert[i];
      const float64Array = new Float64Array(vector);
      const binds = [
        { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: i + 1 },
        { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array }
      ];
      await connection.execute(`
              INSERT /*+ parallel */ INTO ${tableName} (IntCol, VectorCol) VALUES (:1, :2)
          `, binds);
    }

    const result = await connection.execute(`
                  SELECT /*+ parallel(4) */ floor(avg(VECTOR_DISTANCE(VectorCol, ${sampleVector})))
                  FROM ${tableName}
              `);

    assert.strictEqual(result.rows.length, 1);
    assert.deepStrictEqual(result.rows, [[149]]);
  }); // 298.7

  it('298.8 aggregate functions on vector columns vector columns with parallel execution', async function() {
    const vectorsToinsert = [
      [8.1, 7.2, 6.3, 5.4, 4.5, 3.6, 2.7, 1.8, 9.9, 0.0],
      [0.1, 1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9.0],
      [1.0, 3.2, 5.4, 7.6, 9.8, 2.1, 4.3, 6.5, 8.7, 0.9],
      [2.2, 8.8, 4.4, 6.6, 0.2, 1.1, 3.3, 5.5, 7.7, 9.9],
    ];

    for (let i = 0; i < vectorsToinsert.length; i++) {
      const vector = vectorsToinsert[i];
      const float64Array = new Float64Array(vector);
      const binds = [
        { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: i + 1 },
        { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array }
      ];
      await connection.execute(`
              INSERT /*+ parallel */ INTO ${tableName} (IntCol, VectorCol) VALUES (:1, :2)
          `, binds);
    }

    await assert.rejects(
      async () => await connection.execute(`
                  SELECT /*+ parallel(4) */ sum(VectorCol)
                  FROM ${tableName}
              `),
      /ORA-03001:|ORA-00722:/
      /*
                ORA-03001: unimplemented feature
                ORA-00722: Feature "Vector aggregate functions"
              */
    );
  }); // 298.8

  it('298.9 parallel delete operation on vector columns', async function() {
    const sampleVector = "VECTOR('[3.1, 4.2, 5.9, 6.5, 7.3, 2.1, 8.4, 9.7, 3.4, 2.2]', 10, FLOAT64)";
    const vectorsToinsert = [
      [8.1, 7.2, 6.3, 5.4, 4.5, 3.6, 2.7, 1.8, 9.9, 0.0],
      [0.1, 1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9.0],
      [1.0, 3.2, 5.4, 7.6, 9.8, 2.1, 4.3, 6.5, 8.7, 0.9],
      [2.2, 8.8, 4.4, 6.6, 0.2, 1.1, 3.3, 5.5, 7.7, 9.9],
    ];
    const expected = [[1, [8.1, 7.2, 6.3, 5.4, 4.5, 3.6, 2.7, 1.8, 9.9, 0]],
      [2, [0.1, 1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9]],
      [4, [2.2, 8.8, 4.4, 6.6, 0.2, 1.1, 3.3, 5.5, 7.7, 9.9]]];

    for (let i = 0; i < vectorsToinsert.length; i++) {
      const vector = vectorsToinsert[i];
      const float64Array = new Float64Array(vector);
      const binds = [
        { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: i + 1 },
        { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array }
      ];
      await connection.execute(`
              INSERT /*+ parallel */ INTO ${tableName} (IntCol, VectorCol) VALUES (:1, :2)
          `, binds);
    }

    await connection.execute(`delete /*+ parallel(4) */ from ${tableName}
           where vector_distance(VectorCol, ${sampleVector}, euclidean) < 10`);

    const result = await connection.execute(`
                   SELECT /*+ parallel(4) */ * FROM ${tableName}
               `);
    assert.deepStrictEqual(result.rows, expected);
  }); // 298.9

  it('298.10 no parallel delete operation on vector columns', async function() {
    /*
        no_parallel :
        This is a hint instructs the database to disable parallel execution
        for this specific DELETE statement.
    */
    const sampleVector = "VECTOR('[3.1, 4.2, 5.9, 6.5, 7.3, 2.1, 8.4, 9.7, 3.4, 2.2]', 10, FLOAT64)";
    const vectorsToinsert = [
      [8.1, 7.2, 6.3, 5.4, 4.5, 3.6, 2.7, 1.8, 9.9, 0.0],
      [0.1, 1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9.0],
      [1.0, 3.2, 5.4, 7.6, 9.8, 2.1, 4.3, 6.5, 8.7, 0.9],
      [2.2, 8.8, 4.4, 6.6, 0.2, 1.1, 3.3, 5.5, 7.7, 9.9],
    ];
    const expected = [[1, [8.1, 7.2, 6.3, 5.4, 4.5, 3.6, 2.7, 1.8, 9.9, 0]],
      [2, [0.1, 1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9]],
      [4, [2.2, 8.8, 4.4, 6.6, 0.2, 1.1, 3.3, 5.5, 7.7, 9.9]]];

    for (let i = 0; i < vectorsToinsert.length; i++) {
      const vector = vectorsToinsert[i];
      const float64Array = new Float64Array(vector);
      const binds = [
        { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: i + 1 },
        { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array }
      ];
      await connection.execute(`
              INSERT /*+ parallel */ INTO ${tableName} (IntCol, VectorCol) VALUES (:1, :2)
          `, binds);
    }

    await connection.execute(`delete /*+ no_parallel(4) */ from ${tableName}
           where vector_distance(VectorCol, ${sampleVector}, euclidean) < 10`);

    const result = await connection.execute(`
                   SELECT * FROM ${tableName}
               `);
    assert.deepStrictEqual(result.rows, expected);
  }); // 298.10
});

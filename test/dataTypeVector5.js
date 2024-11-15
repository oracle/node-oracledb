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
 *   305. dataTypeVector5.js
 *
 * DESCRIPTION
 *   Testing the vector distance
 *
 *****************************************************************************/
'use strict';

const assert  = require('assert');
const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('305. dataTypeVector5.js', function() {
  let connection = null, isRunnable = false, defaultFetchTypeHandler;

  const tableName = 'nodb_vectorDbTable';

  before('Get connection', async function() {
    isRunnable = await testsUtil.checkPrerequisites(2304000000, 2304000000);
    if (!isRunnable || !(await testsUtil.isVectorBinaryRunnable())) this.skip();

    defaultFetchTypeHandler = oracledb.fetchTypeHandler;
    connection = await oracledb.getConnection(dbConfig);
  });

  after('Release connection', async function() {
    if (!isRunnable || !(await testsUtil.isVectorBinaryRunnable())) return;
    await connection.execute(testsUtil.sqlDropTable(tableName));
    await connection.close();
    oracledb.fetchTypeHandler = defaultFetchTypeHandler;
  });

  describe('305.1 tests with vector distance', function() {

    beforeEach(function() {
      oracledb.fetchTypeHandler = function(metadata) {
        if (metadata.dbType === oracledb.DB_TYPE_VECTOR) {
          const myConverter = (v) => {
            if (v !== null) {
              return Array.from(v);
            }
            return v;
          };
          return { converter: myConverter };
        }
      };
    });

    afterEach(function() {
      oracledb.fetchTypeHandler = defaultFetchTypeHandler;
    });
    before(async function() {
      // Create an Uint8Array
      const uInt8Arr1 = new Uint8Array([3, 4]);
      const uInt8Arr2 = new Uint8Array([30, 40]);
      // Create an Int8Array
      const int8arr1 = new Int8Array([126, 125]);
      const int8arr2 = new Int8Array([45, 63]);
      // Create a Float32Array
      const float32Array1 = new Float32Array([4.3, 6.56]);
      const float32Array2 = new Float32Array([1.23, 4.98]);
      // Create a Float64Array
      const float64Array1 = new Float64Array([-929999.12345, 654.321]);
      const float64Array2 = new Float64Array([-9999.1245, 765.012]);

      const sql = `
        CREATE TABLE ${tableName} (
            VectorBinaryCol1     VECTOR(16, binary),
            VectorBinaryCol2     VECTOR(16, binary),
            VectorInt8Col1       VECTOR(2, int8),
            VectorInt8Col2       VECTOR(2, int8),
            Vector32Col1         VECTOR(2, float32),
            Vector32Col2         VECTOR(2, float32),
            Vector64Col1         VECTOR(2, float64),
            Vector64Col2         VECTOR(2, float64)
        )`;

      const plsql = testsUtil.sqlCreateTable(tableName, sql);
      await connection.execute(plsql);

      // Bind the types using oracledb.DB_TYPE_VECTOR
      const binds = {
        val1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: uInt8Arr1 },
        val2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: uInt8Arr2 },
        val3: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: int8arr1 },
        val4: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: int8arr2 },
        val5: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array1 },
        val6: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array2 },
        val7: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array1 },
        val8: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array2 },
      };

      await connection.execute(`
        INSERT INTO ${tableName}
            ( VectorBinaryCol1, VectorBinaryCol2,
              VectorInt8Col1, VectorInt8Col2,
              Vector32Col1, Vector32Col2,
              Vector64Col1, Vector64Col2)
        VALUES(:val1, :val2, :val3, :val4, :val5, :val6, :val7, :val8)`, binds);
    });

    after(async function() {
      await connection.execute(testsUtil.sqlDropTable(tableName));
    });

    async function checkVectorDistance(queries) {
      for (const [query, expectedValue] of queries) {
        const result = await connection.execute(query);
        assert.strictEqual(result.rows[0][0].toFixed(4), expectedValue, query);
      }
    }

    it('305.1.1 SELECT query with standard vector distance', async function() {
      await checkVectorDistance([
        [`SELECT VECTOR_DISTANCE(VectorBinaryCol1, VectorBinaryCol2) from ${tableName}`, '7.0000'],
        [`SELECT VECTOR_DISTANCE(VectorBinaryCol1, VECTOR('[30, 40]', 16, BINARY)) from ${tableName}`, '7.0000'],
        [`SELECT VECTOR_DISTANCE(VectorInt8Col1, VectorInt8Col2) from ${tableName}`, '0.0143'],
        [`SELECT VECTOR_DISTANCE(VectorInt8Col1, VECTOR('[30, 40]', 2, INT8)) from ${tableName}`, '0.0106'],
        [`SELECT VECTOR_DISTANCE(Vector32Col1, Vector32Col2) from ${tableName}`, '0.0566'],
        [`SELECT VECTOR_DISTANCE(Vector32Col1, VECTOR('[30, 40]', 2, FLOAT32)) from ${tableName}`, '0.0020'],
        [`SELECT VECTOR_DISTANCE(Vector64Col1, Vector64Col2) from ${tableName}`, '0.0029'],
        [`SELECT VECTOR_DISTANCE(Vector64Col1, VECTOR('[30, 40]', 2, FLOAT64)) from ${tableName}`, '1.5994']
      ]);
    }); // 305.1.1

    it('305.1.2 SELECT query with EUCLIDEAN vector distance', async function() {
      await checkVectorDistance([
        [`SELECT VECTOR_DISTANCE(VectorBinaryCol1, VectorBinaryCol2, EUCLIDEAN) from ${tableName}`, '2.6458'],
        [`SELECT VECTOR_DISTANCE(VectorBinaryCol1, VECTOR('[30, 40]', 16, BINARY), EUCLIDEAN) from ${tableName}`, '2.6458'],
        [`SELECT VECTOR_DISTANCE(VectorInt8Col1, VectorInt8Col2, EUCLIDEAN) from ${tableName}`, '102.0049'],
        [`SELECT VECTOR_DISTANCE(VectorInt8Col1, VECTOR('[30, 40]', 2, INT8), EUCLIDEAN) from ${tableName}`, '128.2225'],
        [`SELECT VECTOR_DISTANCE(Vector32Col1, Vector32Col2, EUCLIDEAN) from ${tableName}`, '3.4527'],
        [`SELECT VECTOR_DISTANCE(Vector32Col1, VECTOR('[30, 40]', 2, FLOAT32), EUCLIDEAN) from ${tableName}`, '42.1749'],
        [`SELECT VECTOR_DISTANCE(Vector64Col1, Vector64Col2, EUCLIDEAN) from ${tableName}`, '920000.0056'],
        [`SELECT VECTOR_DISTANCE(Vector64Col1, VECTOR('[30, 40]', 2, FLOAT64), EUCLIDEAN) from ${tableName}`, '930029.3263']
      ]);
    }); // 305.1.2

    it('305.1.3 SELECT query with MANHATTAN vector distance', async function() {
      await checkVectorDistance([
        [`SELECT VECTOR_DISTANCE(VectorBinaryCol1, VectorBinaryCol2, MANHATTAN) from ${tableName}`, '7.0000'],
        [`SELECT VECTOR_DISTANCE(VectorBinaryCol1, VECTOR('[30, 40]', 16, BINARY), MANHATTAN) from ${tableName}`, '7.0000'],
        [`SELECT VECTOR_DISTANCE(VectorInt8Col1, VectorInt8Col2, MANHATTAN) from ${tableName}`, '143.0000'],
        [`SELECT VECTOR_DISTANCE(VectorInt8Col1, VECTOR('[30, 40]', 2, INT8), MANHATTAN) from ${tableName}`, '181.0000'],
        [`SELECT VECTOR_DISTANCE(Vector32Col1, Vector32Col2, MANHATTAN) from ${tableName}`, '4.6500'],
        [`SELECT VECTOR_DISTANCE(Vector32Col1, VECTOR('[30, 40]', 2, FLOAT32), MANHATTAN) from ${tableName}`, '59.1400'],
        [`SELECT VECTOR_DISTANCE(Vector64Col1, Vector64Col2, MANHATTAN) from ${tableName}`, '920110.6899'],
        [`SELECT VECTOR_DISTANCE(Vector64Col1, VECTOR('[30, 40]', 2, FLOAT64), MANHATTAN) from ${tableName}`, '930643.4444']
      ]);
    }); // 305.1.3

    it('305.1.4 SELECT query with COSINE vector distance', async function() {
      await checkVectorDistance([
        [`SELECT VECTOR_DISTANCE(VectorBinaryCol1, VectorBinaryCol2, COSINE) from ${tableName}`, '0.7643'],
        [`SELECT VECTOR_DISTANCE(VectorBinaryCol1, VECTOR('[30, 40]', 16, BINARY), COSINE) from ${tableName}`, '0.7643'],
        [`SELECT VECTOR_DISTANCE(VectorInt8Col1, VectorInt8Col2, COSINE) from ${tableName}`, '0.0143'],
        [`SELECT VECTOR_DISTANCE(VectorInt8Col1, VECTOR('[30, 40]', 2, INT8), COSINE) from ${tableName}`, '0.0106'],
        [`SELECT VECTOR_DISTANCE(Vector32Col1, Vector32Col2, COSINE) from ${tableName}`, '0.0566'],
        [`SELECT VECTOR_DISTANCE(Vector32Col1, VECTOR('[30, 40]', 2, FLOAT32), COSINE) from ${tableName}`, '0.0020'],
        [`SELECT VECTOR_DISTANCE(Vector64Col1, Vector64Col2, COSINE) from ${tableName}`, '0.0029'],
        [`SELECT VECTOR_DISTANCE(Vector64Col1, VECTOR('[30, 40]', 2, FLOAT64), COSINE) from ${tableName}`, '1.5994']
      ]);
    }); // 305.1.4

    it('305.1.5 SELECT query with DOT vector distance', async function() {
      await checkVectorDistance([
        [`SELECT VECTOR_DISTANCE(VectorBinaryCol1, VectorBinaryCol2, DOT) from ${tableName}`, '-1.0000'],
        [`SELECT VECTOR_DISTANCE(VectorBinaryCol1, VECTOR('[30, 40]', 16, BINARY), DOT) from ${tableName}`, '-1.0000'],
        [`SELECT VECTOR_DISTANCE(VectorInt8Col1, VectorInt8Col2, DOT) from ${tableName}`, '-13545.0000'],
        [`SELECT VECTOR_DISTANCE(VectorInt8Col1, VECTOR('[30, 40]', 2, INT8), DOT) from ${tableName}`, '-8780.0000'],
        [`SELECT VECTOR_DISTANCE(Vector32Col1, Vector32Col2, DOT) from ${tableName}`, '-37.9578'],
        [`SELECT VECTOR_DISTANCE(Vector32Col1, VECTOR('[30, 40]', 2, FLOAT32), DOT) from ${tableName}`, '-391.4000'],
        [`SELECT VECTOR_DISTANCE(Vector64Col1, Vector64Col2, DOT) from ${tableName}`, '-9299677583.6843'],
        [`SELECT VECTOR_DISTANCE(Vector64Col1, VECTOR('[30, 40]', 2, FLOAT64), DOT) from ${tableName}`, '27873800.8635']
      ]);
    }); // 305.1.5

    it('305.1.6 SELECT query with HAMMING vector distance', async function() {
      await checkVectorDistance([
        [`SELECT VECTOR_DISTANCE(VectorBinaryCol1, VectorBinaryCol2, HAMMING) from ${tableName}`, '7.0000'],
        [`SELECT VECTOR_DISTANCE(VectorBinaryCol1, VECTOR('[30, 40]', 16, BINARY), HAMMING) from ${tableName}`, '7.0000'],
        [`SELECT VECTOR_DISTANCE(VectorInt8Col1, VectorInt8Col2, HAMMING) from ${tableName}`, '2.0000'],
        [`SELECT VECTOR_DISTANCE(VectorInt8Col1, VECTOR('[30, 40]', 2, INT8), HAMMING) from ${tableName}`, '2.0000'],
        [`SELECT VECTOR_DISTANCE(Vector32Col1, Vector32Col2, HAMMING) from ${tableName}`, '2.0000'],
        [`SELECT VECTOR_DISTANCE(Vector32Col1, VECTOR('[30, 40]', 2, FLOAT32), HAMMING) from ${tableName}`, '2.0000'],
        [`SELECT VECTOR_DISTANCE(Vector64Col1, Vector64Col2, HAMMING) from ${tableName}`, '2.0000'],
        [`SELECT VECTOR_DISTANCE(Vector64Col1, VECTOR('[30, 40]', 2, FLOAT64), HAMMING) from ${tableName}`, '2.0000']
      ]);
    }); // 305.1.6

    it('305.1.7 SELECT query with EUCLIDEAN_SQUARED vector distance', async function() {
      await checkVectorDistance([
        [`SELECT VECTOR_DISTANCE(VectorBinaryCol1, VectorBinaryCol2, EUCLIDEAN_SQUARED) from ${tableName}`, '7.0000'],
        [`SELECT VECTOR_DISTANCE(VectorBinaryCol1, VECTOR('[30, 40]', 16, BINARY), EUCLIDEAN_SQUARED) from ${tableName}`, '7.0000'],
        [`SELECT VECTOR_DISTANCE(VectorInt8Col1, VectorInt8Col2, EUCLIDEAN_SQUARED) from ${tableName}`, '10405.0000'],
        [`SELECT VECTOR_DISTANCE(VectorInt8Col1, VECTOR('[30, 40]', 2, INT8), EUCLIDEAN_SQUARED) from ${tableName}`, '16441.0000'],
        [`SELECT VECTOR_DISTANCE(Vector32Col1, Vector32Col2, EUCLIDEAN_SQUARED) from ${tableName}`, '11.9213'],
        [`SELECT VECTOR_DISTANCE(Vector32Col1, VECTOR('[30, 40]', 2, FLOAT32), EUCLIDEAN_SQUARED) from ${tableName}`, '1778.7236'],
        [`SELECT VECTOR_DISTANCE(Vector64Col1, Vector64Col2, EUCLIDEAN_SQUARED) from ${tableName}`, '846400010320.4973'],
        [`SELECT VECTOR_DISTANCE(Vector64Col1, VECTOR('[30, 40]', 2, FLOAT64), EUCLIDEAN_SQUARED) from ${tableName}`, '864954547855.4663']
      ]);
    }); // 305.1.7

    it('305.1.8 Synonym test for vector distance', async function() {
      let result = await connection.execute(`
              SELECT L1_DISTANCE(VectorBinaryCol1, VectorBinaryCol2),
              L2_DISTANCE(VectorBinaryCol1, VectorBinaryCol2),
              (VectorBinaryCol1 <-> VectorBinaryCol2),
              COSINE_DISTANCE(VectorBinaryCol1, VectorBinaryCol2),
              (VectorBinaryCol1 <#> VectorBinaryCol2),
              INNER_PRODUCT(VectorBinaryCol1, VectorBinaryCol2),
              (VectorBinaryCol1 <=> VectorBinaryCol2) from ${tableName}
              `);
      assert.deepStrictEqual(result.rows[0],
        [7, 2.6457513110645907, 2.6457513110645907, 0.7642977396044841,
          -1, 1, 0.7642977396044841]);

      result = await connection.execute(`
            SELECT L1_DISTANCE(VectorInt8Col1, VectorInt8Col2),
            L2_DISTANCE(VectorInt8Col1, VectorInt8Col2),
            (VectorInt8Col1 <-> VectorInt8Col2),
            COSINE_DISTANCE(VectorInt8Col1, VectorInt8Col2),
            (VectorInt8Col1 <#> VectorInt8Col2),
            INNER_PRODUCT(VectorInt8Col1, VectorInt8Col2),
            (VectorInt8Col1 <=> VectorInt8Col2) from ${tableName}
          `);
      assert.deepStrictEqual(result.rows[0].toString(),
        '143,102.00490184299969,102.00490184299969,0.014268875320571528,-13545,13545,0.014268875320571528');

      result = await connection.execute(`
            SELECT L1_DISTANCE(Vector32Col1, Vector32Col2),
            L2_DISTANCE(Vector32Col1, Vector32Col2),
            (Vector32Col1 <-> Vector32Col2),
            COSINE_DISTANCE(Vector32Col1, Vector32Col2),
            (Vector32Col1 <#> Vector32Col2),
            INNER_PRODUCT(Vector32Col1, Vector32Col2),
            (Vector32Col1 <=> Vector32Col2) from ${tableName}
      `);
      assert.deepStrictEqual(result.rows[0],
        [4.650000095367432, 3.4527236567155133, 3.4527236567155133, 0.056607300796886584,
          -37.95780086517334, 37.95780086517334, 0.056607300796886584]);

      result = await connection.execute(`
            SELECT L1_DISTANCE(Vector64Col1, Vector64Col2),
            L2_DISTANCE(Vector64Col1, Vector64Col2),
            (Vector64Col1 <-> Vector64Col2),
            COSINE_DISTANCE(Vector64Col1, Vector64Col2),
            (Vector64Col1 <#> Vector64Col2),
            INNER_PRODUCT(Vector64Col1, Vector64Col2),
            (Vector64Col1 <=> Vector64Col2) from ${tableName}
      `);
      assert.deepStrictEqual(result.rows[0],
        [920110.6899499999, 920000.0056089659, 920000.0056089659, 0.0028605178529002018,
          -9299677583.684273, 9299677583.684273, 0.0028605178529002018]);
    }); // 305.1.8

    it('305.1.9 Negative test', async function() {
      async function checkRejects(query, errorPattern) {
        await assert.rejects(
          async () => await connection.execute(query),
          errorPattern
        );
      }
      await checkRejects(
        `SELECT VECTOR_DISTANCE(VectorBinaryCol2, VECTOR('[30, 40]', 20, BINARY)) from ${tableName}`,
        /ORA-51813:/ // ORA-51813: Vector of BINARY format should have a dimension count that is a multiple of 8.
      );

      await checkRejects(
        `SELECT VECTOR_DISTANCE(VectorInt8Col2, VECTOR('[30, 40]', 20, INT8)) from ${tableName}`,
        /ORA-51808:/ // ORA-51808: VECTOR_DISTANCE() is not supported for vectors with different dimension counts (2, 20).
      );

      await checkRejects(
        `SELECT VECTOR_DISTANCE(Vector32Col2, VECTOR('[30, 40]', 20, FLOAT32)) from ${tableName}`,
        /ORA-51808:/ // ORA-51808: VECTOR_DISTANCE() is not supported for vectors with different dimension counts (2, 20).
      );

      await checkRejects(
        `SELECT VECTOR_DISTANCE(Vector64Col2, VECTOR('[30, 40]', 20, FLOAT64)) from ${tableName}`,
        /ORA-51808:/ // ORA-51808: VECTOR_DISTANCE() is not supported for vectors with different dimension counts (2, 20).
      );
    }); // 305.1.9
  }); // 305.1
});

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
 *   294. dataTypeVector1.js
 *
 * DESCRIPTION
 *   Testing Vector Data Type
 *
 *****************************************************************************/
'use strict';

const assert  = require('assert');
const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');
const assist = require('./dataTypeAssist.js');

describe('294. dataTypeVector1.js', function() {

  let connection = null, isRunnable = false, defaultFetchTypeHandler;
  const tableName = 'nodb_vectorDbTable';

  before('Get connection', async function() {
    isRunnable = await testsUtil.checkPrerequisites(2304000000, 2304000000);
    if (!isRunnable) this.skip();

    defaultFetchTypeHandler = oracledb.fetchTypeHandler;

    connection = await oracledb.getConnection(dbConfig);

    const sql = `create table ${tableName} (
      IntCol                  number(9) not null,
      VectorCol               vector,
      VectorFixedCol          vector(2),
      Vector32Col             vector(10, float32),
      Vector64Col             vector(10, float64),
      VectorInt8Col           vector(4, int8),
      VectorFlexCol           vector(*, *),
      VectorFlex32Col         vector(*, float32),
      VectorFlex64Col         vector(*, float64),
      VectorFlex8Col          vector(*, int8)
      )`;
    const plsql = testsUtil.sqlCreateTable(tableName, sql);
    await connection.execute(plsql);
  });

  after('Release connection', async function() {
    if (!isRunnable) return;
    await connection.execute(testsUtil.sqlDropTable(tableName));
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

  it('294.1 binding a vector type with various numeric array types', async function() {
    const sql = "select :1 from dual";

    let binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: [1, 2] },
    ];

    let result = await connection.execute(sql, binds);

    assert.deepStrictEqual(result.rows[0][0], [1, 2]);

    // Create a Float32Array
    const float32Array = new Float32Array([1, 2]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array },
    ];

    result = await connection.execute(sql, binds);

    assert.deepStrictEqual(result.rows[0][0], Array.from(float32Array));

    // Create a Float64Array
    const float64Array = new Float64Array([1, 2]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array },
    ];

    result = await connection.execute(sql, binds);

    assert.deepStrictEqual(result.rows[0][0], Array.from(float64Array));
  }); // 294.1

  it('294.2 binding a vector type with unsupported typed arrays', async function() {
    const sql = "select :1 from dual";

    // Create a intArray
    const intArray = new Uint16Array([1, 2]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { type: oracledb.DB_TYPE_VECTOR, val: intArray },
    ];

    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /NJS-011:/ // NJS-011: encountered bind value and type mismatch
    );
  }); // 294.2

  it('294.3 binding a vector type with null vector array types', async function() {
    const sql = "select :1 from dual";

    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: [1.1, null, 2.2] },
    ];

    const result = await connection.execute(sql, binds);

    assert.deepStrictEqual(result.rows[0][0], [1.1, 0, 2.2]);
  }); // 294.3

  it('294.4 binding a vector type with various number typed arrays', async function() {
    let binds = [
      { type: oracledb.DB_TYPE_VECTOR, val: [1, 2] },
    ];

    await connection.execute(`insert into ${tableName} (IntCol, VectorFixedCol)
      values (1, :1)`, binds);
    connection.execute(`select VectorFixedCol from ${tableName}`);
    let result = await connection.execute(`select VectorFixedCol from ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [1, 2]);

    binds = [
      { type: oracledb.DB_TYPE_VECTOR, val: new Float32Array([4.0, 5.0])},
    ];

    await connection.execute(`insert into ${tableName} (IntCol, VectorFixedCol)
      values (2, :1)`, binds);

    result = await connection.execute(`select VectorFixedCol from ${tableName} where IntCol=2`);

    assert.deepStrictEqual(result.rows[0][0], [4.0, 5.0]);
  }); // 294.4

  it('294.5 update vector type into table', async function() {
    let binds = [
      { type: oracledb.DB_TYPE_VECTOR, val: [1, 2] },
    ];

    await connection.execute(`insert into ${tableName} (IntCol, VectorFixedCol)
      values (1, :1)`, binds);
    connection.execute(`select VectorFixedCol from ${tableName}`);
    let result = await connection.execute(`select VectorFixedCol from ${tableName}`);

    assert.deepStrictEqual(result.rows[0][0], [1, 2]);

    binds = [
      { type: oracledb.DB_TYPE_VECTOR, val: new Float32Array([4.0, 5.0])},
    ];

    await connection.execute(`update ${tableName}
                set VectorFixedCol = :1
                where IntCol=1`, binds);
    connection.execute(`select VectorFixedCol from ${tableName}`);
    result = await connection.execute(`select VectorFixedCol from ${tableName} where IntCol=1`);

    assert.deepStrictEqual(result.rows[0][0], [4.0, 5.0]);
  }); // 294.5

  it('294.6 verify different vector constructors', async function() {
    const statements = [
      `select vector('[34.6, 77.8]', 2, float32) from dual`,
      `select vector('[34.6, 77.8, -89.34]', 3, float32) from dual`,
      `select to_vector('[34.6, 77.8]', 2, float32) from dual`,
      `select to_vector('[34.6, 77.8, -89.34]', 3, float32) from dual`
    ];

    /* eslint-disable no-loss-of-precision */

    const expected_vectors = [
      [34.599998474121094, 77.80000305175781],
      [34.599998474121094, 77.80000305175781, -89.33999633789062],
      [34.599998474121094, 77.80000305175781],
      [34.599998474121094, 77.80000305175781, -89.33999633789062]
    ];

    for (let i = 0; i < statements.length; i++) {
      const result = await connection.execute(statements[i]);
      assert.deepStrictEqual(result.rows[0][0], expected_vectors[i]);
    }
  }); // 294.6

  it('294.7 insert 32 bit vector to 32 bit table', async function() {
    // Create a Float32Array
    const float32Array = new Float32Array(
      [1.23, 4.56, -7.89, 10.11, -12.13, 14.15, -16.17, 18.19, -20.21, 9.23]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array },
    ];

    const sql = `insert into ${tableName} (IntCol, Vector32Col)
                values(2, :val)`;
    await connection.execute(sql, binds);
    const result = await connection.execute(`select Vector32Col from ${tableName}`);

    assert.deepStrictEqual(result.rows[0][0], Array.from(float32Array));
  }); // 294.7

  it('294.8 insert Int8 vector to Int8 vector column', async function() {
    // Create a int8Arr
    const int8arr = new Int8Array([126, 125, -126, -23]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: int8arr },
    ];

    const sql = `insert into ${tableName} (IntCol, VectorInt8Col)
                values(2, :val)`;
    await connection.execute(sql, binds);
    const result = await connection.execute(`select VectorInt8Col from ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], Array.from(int8arr));
  }); // 294.8

  it('294.9 insert int8 typed array to float64 vector column', async function() {
    // Create a int8arr
    const int8arr = new Int8Array([126, 125, -126, -23, 11, 12, -11, -12, 10, 10]);

    // Bind the Int8Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: int8arr },
    ];

    const sql = `insert into ${tableName} (IntCol, Vector64Col)
                values(2, :val)`;
    await connection.execute(sql, binds);
    const result = await connection.execute(`select Vector64Col from ${tableName}`);

    assert.deepStrictEqual(result.rows[0][0], Array.from(int8arr));
  }); // 294.9

  it('294.10 insert int8arr typed array to flex vector column', async function() {
    // Create a int8arr
    const int8arr = new Int8Array([126, 125, -126, -23, 11, 12, -11, -12, 10, 10]);

    // Bind the Int8Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: int8arr },
    ];

    const sql = `insert into ${tableName} (IntCol, VectorFlexCol)
                values(2, :val)`;
    await connection.execute(sql, binds);
    const result = await connection.execute(`select VectorFlexCol from ${tableName}`);

    assert.deepStrictEqual(result.rows[0][0], Array.from(int8arr));
  }); // 294.10

  it('294.11 insert int8arr typed array to float32 vector column', async function() {
    // Create a int8arr
    const int8arr = new Int8Array([126, 125, -126, -23, 11, 12, -11, -12, 10, 10]);

    // Bind the Int8Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: int8arr },
    ];

    const sql = `insert into ${tableName} (IntCol, Vector32Col)
                values(2, :val)`;
    await connection.execute(sql, binds);
    const result = await connection.execute(`select Vector32Col from ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [126, 125, -126, -23, 11, 12, -11, -12, 10, 10]);
  }); // 294.11

  it('294.12 insert a float32 typed array into an int8 vector column', async function() {
    // Create a Float32Array
    const float32Array = new Float32Array(
      [-5, 4, -7, 6]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array },
    ];

    const sql = `insert into ${tableName} (IntCol, VectorInt8Col)
    values(2, :val)`;
    await connection.execute(sql, binds);
    const result = await connection.execute(`select VectorInt8Col from ${tableName}`);

    assert.deepStrictEqual(result.rows[0][0], Array.from(float32Array));
  }); // 294.12

  it('294.13 insert a float32 vector into an int8 column (negative)', async function() {
    // Create a Float32Array
    const float32Array = new Float32Array(
      [-130, -129, 128, 1]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array },
    ];

    const sql = `insert into ${tableName} (IntCol, VectorInt8Col)
    values(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51806:/ /*
                  ORA-51806: Vector column is not properly formatted
                  (dimension value 1 is outside the allowed precision range)
                 */
    );
  }); // 294.13

  it('294.14 insert a float64 typed array into an int8 vector column', async function() {
    // Create a Float32Array
    const float64Array = new Float64Array(
      [-5, 4, -7, 6]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array },
    ];

    const sql = `insert into ${tableName} (IntCol, VectorInt8Col)
    values(2, :val)`;
    await connection.execute(sql, binds);
    const result = await connection.execute(`select VectorInt8Col from ${tableName}`);

    assert.deepStrictEqual(result.rows[0][0], Array.from(float64Array));
  }); // 294.14

  it('294.15 insert float32 typed array to float64 vector column', async function() {

    // Create a Float32Array
    const float32Array = new Float32Array(
      [1.23, 4.56, -7.89, 10.11, -12.13, 14.15, -16.17, 18.19, -20.21, 9.23]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array },
    ];

    const sql = `insert into ${tableName} (IntCol, Vector64Col)
                values(2, :val)`;
    await connection.execute(sql, binds);
    const result = await connection.execute(`select Vector64Col from ${tableName}`);

    assert.deepStrictEqual(result.rows[0][0], Array.from(float32Array));
  }); // 294.15

  it('294.16 insert float32 typed array to flex vector column', async function() {

    // Create a Float32Array
    const float32Array = new Float32Array(
      [1.23, 4.56, -7.89, 10.11, -12.13, 14.15, -16.17, 18.19, -20.21, 9.23]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array },
    ];

    const sql = `insert into ${tableName} (IntCol, VectorFlexCol)
                values(2, :val)`;
    await connection.execute(sql, binds);
    const result = await connection.execute(`select VectorFlexCol from ${tableName}`);

    assert.deepStrictEqual(result.rows[0][0], Array.from(float32Array));
  }); // 294.16

  it('294.17 insert float64 typed array to float64 vector column', async function() {
    // Create a Float64Array
    const float64Array = new Float64Array(
      [-999999.12345, 987654.321, -12345.6789, 56789.0123,
        -314159.2654, 291828.1828, -99999.9999, 43210.9876, -87654.321, 65432.1098]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array },
    ];

    const sql = `insert into ${tableName} (IntCol, Vector64Col)
                values(2, :val)`;
    await connection.execute(sql, binds);
    const result = await connection.execute(`select Vector64Col from ${tableName}`);

    assert.deepStrictEqual(result.rows[0][0], Array.from(float64Array));
  }); // 294.17

  it('294.18 insert float64 typed array to float32 vector column', async function() {
    const expectedResult = [-999999.125, -314159.25, -12345.6787109375,
      -100000, -87654.3203125, 43210.98828125, 56789.01171875,
      65432.109375, 291828.1875, 987654.3125];

    // Create a Float64Array
    const float64Array = new Float64Array(assist.vectorValues);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array },
    ];

    const sql = `insert into ${tableName} (IntCol, Vector32Col)
                values(2, :val)`;
    await connection.execute(sql, binds);
    const result = await connection.execute(`select Vector32Col from ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], expectedResult);
  }); // 294.18

  it('294.19 insert float64 typed array to flex vector column', async function() {

    // Create a Float64Array
    const float64Array = new Float64Array(
      [-999999.12345, 987654.321, -12345.6789, 56789.0123,
        -314159.2654, 291828.1828, -99999.9999, 43210.9876, -87654.321, 65432.1098]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array },
    ];

    const sql = `insert into ${tableName} (IntCol, VectorFlexCol)
                values(2, :val)`;
    await connection.execute(sql, binds);
    const result = await connection.execute(`select VectorFlexCol from ${tableName}`);

    assert.deepStrictEqual(result.rows[0][0], Array.from(float64Array));
  }); // 294.19

  it('294.20 insert vector with invalid size', async function() {
    function createVector(numElems) {
      const vectorData = new Float64Array(numElems);
      for (let i = 0; i < numElems; i++) {
        vectorData[i] = i * -1.724657;
      }
      return vectorData;
    }

    async function insertVectorValues(numElems) {
      const sql = `insert into ${tableName} (IntCol, Vector64Col)
                    values(2, :1)`;

      await assert.rejects(
        async () => await connection.execute(
          sql,
          { 1:
          { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
            val: createVector(numElems)
          }
          }
        ),
        /ORA-51803:/
      /*
         ORA-51808: VECTOR_DISTANCE() is not supported
         for vectors with different dimension counts (10, 4)
      */
      );
    }
    const numElemsList = [4, 20];
    for (const numElems of numElemsList) {
      await insertVectorValues(numElems);
    }
  }); // 294.20

  it('294.21 insert double array to float32 vector column', async function() {

    // Create a Float64Array
    const embedding_values = new Float64Array(
      [-999999.12345, 987654.321, -12345.6789, 56789.0123, -314159.2654,
        271828.1828, -99999.9999, 43210.9876, -87654.321, 65432.1098]);

    const expected_vectors = [
      -999999.125, 987654.3125, -12345.6787109375,
      56789.01171875, -314159.25, 271828.1875, -100000,
      43210.98828125, -87654.3203125, 65432.109375];

    await connection.execute(`insert into ${tableName} (IntCol, Vector32Col)
                values(1, :embed_array)`, {embed_array: {type: oracledb.DB_TYPE_VECTOR,
      val: embedding_values}});

    const result = await connection.execute(`select Vector32Col from ${tableName}`);

    assert.deepStrictEqual(result.rows[0][0], expected_vectors);
  }); // 294.21

  it('294.22 inserting vector with invalid values', async function() {

    const sql = `insert into ${tableName} (IntCol, Vector64Col)
                 values(2, :1)`;

    const matrix = [[-6.231, -423.4321], [5.231, 0.42589]];

    // inserting a matrix of 2x2
    await assert.rejects(
      async () => await connection.execute(sql,
        {1:
        { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
          val: matrix
        }
        }
      ),
      /ORA-51805:|OCI-51805:/
      /*
          ORA-51805: Vector is not properly formatted
          (dimension value  is either not a number or infinity)
       */
    );

    // inserting an int array
    await assert.rejects(
      async () => await connection.execute(sql,
        {1:
        { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
          val: [2]
        }
        }
      ),
      /ORA-51803:/
      /*
         ORA-51803: Vector dimension count must match the dimension
         count specified in the column definition (actual: 1, required: 10).
       */
    );

    // inserting a character in an array
    await assert.rejects(
      async () => await connection.execute(sql,
        {1:
        { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
          val: ["s"]
        }
        }
      ),
      /ORA-51805:|OCI-51805:/
      /*
          ORA-51805: Vector is not properly formatted
          (dimension value  is either not a number or infinity)
       */
    );

    // inserting a character
    await assert.rejects(
      async () => await connection.execute(sql,
        {1:
        { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
          val: 's'
        }
        }
      ),
      /NJS-011:/ // NJS-011: encountered bind value and type mismatch
    );
  }); // 294.22

  it('294.23 insert float and double array into vector column of default storage (float32)', async function() {
    // If a vector with -0 is inserted and read, it comes as 0 in thick mode.
    // Refer Bug: 36210055
    if (dbConfig.test.mode === 'thick') this.skip();

    const FloatArray = new Float32Array([0 * -0.23987, 1 * -0.23987, 2 * -0.23987]);

    const DoubleArray = new Float64Array([0 * 2 * -0.23987, 1 * 2 * -0.23987, 2 * 2 * -0.23987]);

    // inserting a float32 array
    await connection.execute(`insert into ${tableName} (IntCol, VectorCol)
                values(1, :2)`, {2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
      val: FloatArray
    }});

    // inserting a double array
    await connection.execute(`insert into ${tableName} (IntCol, VectorCol)
                values(1, :2)`, {2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
      val: DoubleArray
    }});

    const result = await connection.execute(`select VectorCol from ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [-0, -0.23986999690532684, -0.4797399938106537]);
  }); // 294.23

  it('294.24 insert float and double array into vector column of default storage (float32)', async function() {
    const FloatArray = new Float32Array([3 * -0.23987, 1 * -0.23987, 2 * -0.23987]);

    const DoubleArray = new Float64Array([3 * 2 * -0.23987, 1 * 2 * -0.23987, 2 * 2 * -0.23987]);

    // inserting a float32 array
    await connection.execute(`insert into ${tableName} (IntCol, VectorCol)
                values(1, :2)`, {2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
      val: FloatArray
    }});

    let result = await connection.execute(`select VectorCol from ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [-0.7196099758148193, -0.23986999690532684, -0.4797399938106537]);

    // inserting a double array
    await connection.execute(`insert into ${tableName} (IntCol, VectorCol)
                values(1, :2)`, {2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
      val: DoubleArray
    }});

    result = await connection.execute(`select VectorCol from ${tableName}`);
    assert.deepStrictEqual(result.rows[1][0], [-1.43922, -0.47974, -0.95948]);
  }); // 294.24

  it('294.25 insert an array into vector', async function() {
    const arr = [];
    for (let num = 0; num < 3; num++) {
      arr.push(num * -0.23987);
    }

    await connection.execute(`insert into ${tableName} (IntCol, VectorCol)
            values(1, :1)`, {1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
      val: arr}});
  }); // 294.25

  it('294.26 insert float and double array into flex vector column', async function() {
    // If a vector with -0 is inserted and read, it comes as 0 in thick mode.
    // Refer Bug: 36210055
    if (dbConfig.test.mode === 'thick') this.skip();

    const FloatArray = new Float32Array([0 * -0.23987, 1 * -0.23987, 2 * -0.23987]);
    const DoubleArray = new Float64Array([0 * 2 * -0.23987, 1 * 2 * -0.23987, 2 * 2 * -0.23987]);

    await connection.execute(`insert into ${tableName} (IntCol, VectorFlexCol)
                values(1, :2)`, {2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
      val: FloatArray
    }});

    await connection.execute(`insert into ${tableName} (IntCol, VectorFlexCol)
                values(1, :2)`, {2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
      val: DoubleArray
    }});

    const result = await connection.execute(`select VectorFlexCol from ${tableName}`);

    assert.deepStrictEqual(result.rows[0][0], [-0, -0.23986999690532684, -0.4797399938106537]);
    assert.deepStrictEqual(result.rows[1][0], [-0, -0.47974, -0.95948]);
  }); // 294.26

  it('294.27 insert an array into vector', async function() {
    // If a vector with -0 is inserted and read, it comes as 0 in thick mode.
    // Refer Bug: 36210055
    if (dbConfig.test.mode === 'thick') this.skip();
    const arr = [];
    for (let num = 0; num < 3; num++) {
      arr.push(num * -0.23987);
    }

    await connection.execute(`insert into ${tableName} (IntCol, VectorFlexCol)
        values(1, :1)`, {1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
      val: arr}});

    const result = await connection.execute(`select VectorFlexCol from ${tableName}`);

    assert.deepStrictEqual(result.rows[0][0], [-0, -0.23987, -0.47974]);
  }); // 294.27

  it('294.28 returning vector as clob', async function() {
    const statements = ["select from_vector(vector('[0.9, 7.7]', 2) returning clob)",
      "select vector_serialize(vector('[-0.1, 0]', 2) returning clob)"];
    const expected_vectors = ["[8.99999976E-001,7.69999981E+000]",
      "[-1.00000001E-001,0]"];

    for (let i = 0; i < 2; i++) {
      const result = await connection.execute(statements[i]);

      const clob = result.rows[0][0];

      clob.setEncoding('utf8');
      let clobData = '';
      await new Promise((resolve, reject) => {
        clob.on('error', reject);
        clob.on('end', resolve);
        clob.on('data', function(chunk) {
          clobData += chunk;
        });
      });
      assert.deepStrictEqual(clobData, expected_vectors[i]);
    }
  }); // 294.28

  it('294.29 creating vector with clob', async function() {
    const sql = "select to_clob(:1) from dual";

    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: [0.75, 0.375, -0.015625] },
    ];

    const result = await connection.execute(sql, binds);

    const clob = result.rows[0][0];

    clob.setEncoding('utf8');
    let clobData = '';
    await new Promise((resolve, reject) => {
      clob.on('error', reject);
      clob.on('end', resolve);
      clob.on('data', function(chunk) {
        clobData += chunk;
      });
    });
    assert.deepStrictEqual(clobData, '[7.5E-001,3.75E-001,-1.5625E-002]');
  }); // 294.29

  it('294.30 vector_serialize', async function() {
    // Create a Float64Array
    const float64Array = new Float64Array([2.3, 4.5]);
    const result = await connection.execute(`select vector_serialize(:1)
                from dual`, {1:
        { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
          val: float64Array
        }
    });
    assert.deepStrictEqual(result.rows[0][0], "[2.2999999999999998E+000,4.5E+000]");
  }); // 294.30

  it('294.31 create table as select', async function() {
    const sql = `insert into ${tableName} (IntCol, VectorFixedCol) values (1, :1)`;

    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: [1, 2] },
    ];

    await connection.execute(sql, binds);
    await connection.execute(`drop table IF EXISTS TestVector2`);
    await connection.execute(`CREATE TABLE TestVector2 AS SELECT * FROM ${tableName}`);
    const result = await connection.execute(`select VectorFixedCol from TestVector2`);

    assert.deepStrictEqual(result.rows[0][0], [1, 2]);
  }); // 294.31

  it('294.32 insert float64 typed array to float64 vector column', async function() {
    // Create a Float64Array
    const float64Array = new Float64Array(
      [-999999.12345, 987654.321, -12345.6789, 56789.0123,
        -314159.2654, 291828.1828, -99999.9999, 43210.9876, -87654.321, 65432.1098]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array },
    ];

    const sql = `insert into ${tableName} (IntCol, Vector64Col)
                values(2, :val)`;
    await connection.execute(sql, binds);
    const result = await connection.execute(`select Vector64Col from ${tableName}`);

    assert.deepStrictEqual(result.rows[0][0], Array.from(float64Array));
  }); // 294.32

  it('294.33 Fetch Vector Column as string', async function() {
    oracledb.fetchTypeHandler = function() {
      return {type: oracledb.STRING};
    };
    // Create a Float64Array
    const float64Array = new Float64Array(
      [-999999.12345, 987654.321, -12345.6789, 56789.0123,
        -314159.2654, 291828.1828, -99999.9999, 43210.9876, -87654.321, 65432.1098]);

    const expected_vectors = `[-9.9999912344999996E+005,9.87654321E+005,` +
      `-1.2345678900000001E+004,5.6789012300000002E+004,-3.1415926539999997E+005,` +
      `2.9182818280000001E+005,-9.9999999899999995E+004,4.32109876E+004,-8.7654320999999996E+004,6.5432109799999998E+004]`;
    await connection.execute(`insert into ${tableName} (IntCol, Vector64Col) values(:id, :vec64)`,
      { id: 2,
        vec64: float64Array
      });

    /* Setting keepInStmtCache as false as
     * we earlier fetched vector as a clob; the same statement is used for fetching it as a string now.
     */
    const result = await connection.execute(`select Vector64Col from ${tableName}`, [], {keepInStmtCache: false});
    assert.deepStrictEqual(result.rows[0][0], expected_vectors);
  }); // 294.33

  it('294.34 Fetch Vector Column as string using fetchInfo', async function() {
    oracledb.fetchTypeHandler = function() {
      return {type: oracledb.STRING};
    };
    // Create a Float64Array
    const float64Array = new Float64Array(
      [-999999.12345, 987654.321, -12345.6789, 56789.0123,
        -314159.2654, 291828.1828, -99999.9999, 43210.9876, -87654.321, 65432.1098]);
    const expected_vectors = '[-9.9999912344999996E+005,9.87654321E+005,-1.2345678900000001E+004,' +
                '5.6789012300000002E+004,-3.1415926539999997E+005,2.9182818280000001E+005,' +
                '-9.9999999899999995E+004,4.32109876E+004,-8.7654320999999996E+004,6.5432109799999998E+004]';

    let result = await connection.execute(`insert into ${tableName} (IntCol, Vector64Col) values(:id, :vec64)`,
      { id: 2,
        vec64: float64Array
      });

    // Reading vector as string.
    const options = {};
    options.fetchInfo = { "VECTOR64COL": { type: oracledb.STRING } };

    // using fetchInfo
    result = await connection.execute(
      `select Vector64Col from ${tableName}`, [], options);
    assert.deepStrictEqual(result.rows[0][0], expected_vectors);
  }); // 294.34

  it('294.35 add drop rename vector column', async function() {
    // Add column
    const addColumnSql = `ALTER TABLE ${tableName} ADD NewVectorCol VECTOR(2)`;
    await connection.execute(addColumnSql);

    // Check if the column was added
    const resultAdd = await connection.execute(
      `SELECT COLUMN_NAME FROM USER_TAB_COLUMNS WHERE TABLE_NAME = UPPER('${tableName}')`);

    const columnsAdd = resultAdd.rows.map((row) => row[0]);
    assert(columnsAdd.includes('NEWVECTORCOL'));

    // Rename column
    const renameColumnSql = `ALTER TABLE ${tableName} RENAME COLUMN NewVectorCol TO RenamedVectorCol`;
    await connection.execute(renameColumnSql);

    // Check if the column was renamed
    const resultRename = await connection.execute(
      `SELECT COLUMN_NAME FROM USER_TAB_COLUMNS WHERE TABLE_NAME = UPPER('${tableName}')`
    );
    const columnsRename = resultRename.rows.map((row) => row[0]);
    assert(!columnsRename.includes('NewVectorCol'));
    assert(columnsRename.includes('RENAMEDVECTORCOL'));

    // Drop column
    const dropColumnSql = `ALTER TABLE ${tableName} DROP COLUMN RENAMEDVECTORCOL`;
    await connection.execute(dropColumnSql);

    // Check if the column was dropped
    const resultDrop = await connection.execute(
      `SELECT COLUMN_NAME FROM USER_TAB_COLUMNS WHERE TABLE_NAME = UPPER('${tableName}')`
    );
    const columnsDrop = resultDrop.rows.map((row) => row[0]);
    assert(!columnsDrop.includes('RENAMEDVECTORCOL'));
  }); // 294.35

  it('294.36 vector metadata verification', async function() {
    const sql = `SELECT COUNT(*) FROM all_tables WHERE table_name = UPPER('${tableName}')`;
    let result = await connection.execute(sql);
    assert.strictEqual(result.rows[0][0], 1);
    result = await connection.execute(`SELECT COUNT(*)
    FROM USER_TAB_COLUMNS
    WHERE table_name = UPPER('${tableName}')`);
    assert.strictEqual(result.rows[0][0], 10);
    result = await connection.execute(`SELECT DBMS_METADATA.GET_DDL('TABLE', UPPER('${tableName}')) AS table_ddl
    FROM dual`);
    assert.strictEqual(result.metaData[0].name, "TABLE_DDL");
  }); // 294.36

  it('294.37 transactional features on vector', async function() {
    oracledb.autoCommit = false;
    let sql = `insert into ${tableName} (IntCol, VectorFixedCol) values (1, :1)`;

    let binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: [1, 2] },
    ];

    await connection.execute(sql, binds);
    await connection.execute(`SAVEPOINT sp1`);
    sql = `insert into ${tableName} (IntCol, VectorFixedCol) values (2, :1)`;

    binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: [2, 3] },
    ];

    await connection.execute(sql, binds);

    await connection.execute(`ROLLBACK TO sp1`);
    await connection.execute(`COMMIT`);
    const result = await connection.execute(`SELECT COUNT(*) FROM ${tableName}`);
    assert.strictEqual(result.rows[0][0], 1);
    oracledb.autoCommit = true;
  }); // 294.37

  it('294.38 validate assm mssm on vector table', async function() {
    let sql = `SELECT table_name, tablespace_name
    FROM user_tables
    WHERE table_name = UPPER('${tableName}')`;

    let result = await connection.execute(sql);
    assert.strictEqual(result.rows[0][0], tableName.toUpperCase());
    const tablespaceName = result.rows[0][1];

    sql = `SELECT tablespace_name, segment_space_management
    FROM user_tablespaces
    WHERE tablespace_name = '${tablespaceName}'`;
    result = await connection.execute(sql);
    assert.strictEqual(result.rows[0][1], 'AUTO' || result.rows[0][1] === 'MANUAL');
  }); // 294.38

  it('294.39 Test fuzzing of vector datatype', async function() {
    const vector_variations = ["Vector", "vector", "veCtor", "VECTOR"];

    for (const vector_case of vector_variations) {
      const createViewSql = `
            CREATE OR REPLACE VIEW ${vector_case} AS
            SELECT 'Hello' AS message
            FROM DUAL
        `;

      const createTableSql = `
            CREATE TABLE ${vector_case} (
                id NUMBER,
                message vector(10)
            )
        `;

      const createProcedureSql = `
            CREATE OR REPLACE PROCEDURE ${vector_case} AS
            BEGIN
                DBMS_OUTPUT.PUT_LINE('Hello');
            END;
        `;

      await connection.execute(`DROP TABLE IF EXISTS ${vector_case}`);
      await connection.execute(createViewSql);
      await connection.execute(`DROP VIEW IF EXISTS ${vector_case}`);
      await connection.execute(createTableSql);
      await connection.execute(`DROP TABLE IF EXISTS ${vector_case}`);
      await connection.execute(createProcedureSql);
      await connection.execute(`DROP PROCEDURE IF EXISTS ${vector_case}`);
    }
  }); // 294.39

  it('294.40 dml returning vector type', async function() {
    const sql = `insert into ${tableName} (IntCol, VectorFixedCol)
                values (1, :value)
                returning VectorFixedCol into :vector_val`;

    const binds = [
      { type: oracledb.DB_TYPE_VECTOR, dir: oracledb.BIND_IN, val: [1, 2] },
      { type: oracledb.DB_TYPE_VECTOR, dir: oracledb.BIND_OUT }
    ];

    let result = await connection.execute(sql, binds);
    assert.deepStrictEqual(result.outBinds[0][0], new Float64Array([1, 2]));

    result = await connection.execute(`select VectorFixedCol from ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [1, 2]);
  }); // 294.40

  it('294.41 inserting more dimensions than defined in flexible vector column', async function() {
    const embeddingValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
    const binds = [
      { type: oracledb.DB_TYPE_VECTOR, dir: oracledb.BIND_IN, val: embeddingValues }
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorFixedCol)
                       VALUES (2, :embed_array)`;

    await assert.rejects(
      async () => await connection.execute(
        sql,
        binds
      ),
      /ORA-51803:/
      /*
        ORA-51803: VECTOR_DISTANCE() is not supported
        for vectors with different dimension counts (2, 12)
      */
    );
  }); // 294.41

  it('294.42 executemany with positional args', async function() {
    const rows = [
      [1, [1, 2]],
      [2, [3, 4]],
      [3, [5, 6]]
    ];

    const options = {
      autoCommit: true,
      bindDefs: [
        { type: oracledb.NUMBER},
        { type: oracledb.DB_TYPE_VECTOR},
      ]};

    await connection.executeMany(
      `insert into ${tableName} (IntCol, VectorFixedCol) values (:1, :2)`,
      rows,
      options
    );

    const result = await connection.execute(`select * from ${tableName}`);
    assert.strictEqual(result.rows.length, 3);
  }); // 294.42

  it('294.43 handling of NULLs and default values for vector types', async function() {
    // insert with default value
    await connection.execute(`
        INSERT INTO ${tableName} (IntCol) VALUES (1)
    `);

    await connection.commit();

    // Check default value
    let result = await connection.execute(`
        SELECT VectorFixedCol FROM ${tableName} WHERE IntCol = 1
    `);
    assert.strictEqual(result.rows[0][0], null);

    // insert with NULL value
    await connection.execute(`
        INSERT INTO ${tableName} (IntCol, VectorFixedCol) VALUES (2, NULL)
    `);

    await connection.commit();

    // Check NULL value
    result = await connection.execute(`
        SELECT VectorFixedCol FROM ${tableName} WHERE IntCol = 2
    `);
    assert.strictEqual(result.rows[0][0], null);
  }); // 294.43

  it('294.44 ORDER BY and GROUP BY with vector types as negative test', async function() {
    await assert.rejects(
      async () => await connection.execute(`SELECT VectorFixedCol, COUNT(*) as count
          FROM ${tableName}
          GROUP BY VectorFixedCol
      `),
      /ORA-22848:/ // ORA-22848: cannot use VECTOR type as comparison key
    );

    await assert.rejects(
      async () => await connection.execute(`SELECT IntCol, VectorFixedCol
      FROM ${tableName}
      ORDER BY VectorFixedCol
      `),
      /ORA-22848:/ // ORA-22848: cannot use VECTOR type as comparison key
    );
  }); // 294.44

  it('294.45 selection of top vectors by Euclidean distance', async function() {
    const sampleVector = "VECTOR('[3.1, 4.2, 5.9, 6.5, 7.3, 2.1, 8.4, 9.7, 3.4, 2.2]', 10, FLOAT64)";
    const vectorsToinsert = [
      [8.1, 7.2, 6.3, 5.4, 4.5, 3.6, 2.7, 1.8, 9.9, 0.0],
      [0.1, 1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9.0],
      [1.0, 3.2, 5.4, 7.6, 9.8, 2.1, 4.3, 6.5, 8.7, 0.9],
      [2.2, 8.8, 4.4, 6.6, 0.2, 1.1, 3.3, 5.5, 7.7, 9.9],
    ];

    const expected_vectors = [
      [ 3, 69.94999999999999,
        [
          1, 3.2, 5.4, 7.6,
          9.8, 2.1, 4.3, 6.5,
          8.7, 0.9
        ]
      ],
      [ 2, 143.65,
        [
          0.1, 1.2, 2.3, 3.4,
          4.5, 5.6, 6.7, 7.8,
          8.9,   9
        ]
      ],
      [ 1, 187.45,
        [
          8.1, 7.2, 6.3, 5.4,
          4.5, 3.6, 2.7, 1.8,
          9.9,   0
        ]
      ],
      [ 4, 197.07,
        [
          2.2, 8.8, 4.4, 6.6,
          0.2, 1.1, 3.3, 5.5,
          7.7, 9.9
        ]
      ]
    ];

    for (let i = 0; i < vectorsToinsert.length; i++) {
      const vector = vectorsToinsert[i];
      const float64Array = new Float64Array(vector);
      const binds = [
        { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: i + 1 },
        { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array }
      ];
      await connection.execute(`
            INSERT INTO ${tableName} (IntCol, Vector64Col) VALUES (:1, :2)
        `, binds);
    }

    const result = await connection.execute(`
                SELECT IntCol, VECTOR_DISTANCE(Vector64Col, ${sampleVector}) AS distance, Vector64Col
                FROM ${tableName}
                ORDER BY distance ASC
                FETCH FIRST 4 ROWS ONLY
            `);

    assert.strictEqual(result.rows.length, 4);
    assert.deepStrictEqual(result.rows, expected_vectors);
  }); // 294.45

  it('294.46 fetching vector Metadata', async function() {
    const testValues = [
      { name: 'VectorFixedCol', dimensions: 2, format: undefined },
      { name: 'VectorInt8Col', dimensions: 4, format: oracledb.VECTOR_FORMAT_INT8},
      { name: 'Vector32Col', dimensions: 10, format: oracledb.VECTOR_FORMAT_FLOAT32},
      { name: 'Vector64Col', dimensions: 10, format: oracledb.VECTOR_FORMAT_FLOAT64}
    ];

    for (const { name, dimensions, format } of testValues) {
      // inserting data into the table
      await connection.execute(
        `insert into ${tableName} (IntCol, ${name}) values (1, :1)`,
        {
          1: {
            val: Array.from({ length: dimensions }, (_, i) => 0.125 * i),
            type: oracledb.DB_TYPE_VECTOR,
            dir: oracledb.BIND_IN
          }
        }
      );

      // Fetching data from the table
      /* Setting keepInStmtCache as false as
       * we earlier fetched vector as a clob; the same statement is used for fetching it as a string now.
       */
      const result = await connection.execute(`select ${name} from ${tableName}`, [], {keepInStmtCache: false});
      assert.strictEqual(result.metaData[0].vectorDimensions, dimensions);
      assert.strictEqual(result.metaData[0].dbType, oracledb.DB_TYPE_VECTOR);
      assert.strictEqual(result.metaData[0].vectorFormat, format);
      assert.strictEqual(result.metaData[0].isJson, false);
    }
  }); // 294.46

  it('294.47 handling of NULL vector value', async function() {
    const table = 'nodb_vectorDbTable1';
    const sql = `CREATE TABLE ${table} (
        IntCol     NUMBER,
        VectorFlex32Col vector(*, float32)
        )`;
    const plsql = testsUtil.sqlCreateTable(table, sql);
    await connection.execute(plsql);

    await connection.execute(`insert into ${table} (IntCol) values (1)`);
    await connection.commit();

    const result = await connection.execute(`select VectorFlex32Col from ${table}`);

    assert.strictEqual(result.rows[0][0], null);
    await connection.execute(testsUtil.sqlDropTable(table));
  }); // 294.47

  it('294.48 insert a float32 vector with 8127 dimensions into a float32 flex column', async function() {
    const arr = Array(8127).fill(2.5);
    const table = 'nodb_vectorDbTable1';
    await connection.execute(testsUtil.sqlDropTable(table));
    const sql = `CREATE TABLE ${table} (
        IntCol     NUMBER,
        VectorFlex32Col vector(*, float32)
        )`;
    const plsql = testsUtil.sqlCreateTable(table, sql);
    await connection.execute(plsql);
    const float32arr = new Float32Array(arr);
    await connection.execute(
      `INSERT INTO ${table}
       (IntCol, VectorFlex32Col) VALUES (:id, :vec32)`,
      { id: 1,
        vec32: float32arr
      });

    const result = await connection.execute(
      `SELECT IntCol, VectorFlex32Col FROM ${table} ORDER BY IntCol`
    );

    assert.deepStrictEqual(result.rows[0], [1, arr]);
    await connection.execute(testsUtil.sqlDropTable(table));
  }); // 294.48

  it('294.49 insert a float32 vector with 65535 dimensions into a vector column of same dimensions', async function() {
    const arr = Array(65535).fill(2.5);
    const table = 'nodb_vectorDbTable1';
    await connection.execute(testsUtil.sqlDropTable(table));
    const sql = `CREATE TABLE ${table} (
        IntCol     NUMBER,
        Vector32Col VECTOR(65535, FLOAT32)
        )`;
    const plsql = testsUtil.sqlCreateTable(table, sql);
    await connection.execute(plsql);
    const float32arr = new Float32Array(arr);
    await connection.execute(
      `INSERT INTO ${table}
       (IntCol, Vector32Col) VALUES (:id, :vec32)`,
      { id: 1,
        vec32: float32arr
      });

    const result = await connection.execute(
      `SELECT IntCol, Vector32Col FROM ${table} ORDER BY IntCol`
    );

    assert.deepStrictEqual(result.rows[0], [1, arr]);
    await connection.execute(testsUtil.sqlDropTable(table));
  }); // 294.49

  it('294.50 insert a float64 vector with 65535 dimensions into a float64 flex column', async function() {
    const arr = Array(65535).fill(2.5);
    const table = 'nodb_vectorDbTable1';
    await connection.execute(testsUtil.sqlDropTable(table));
    const sql = `CREATE TABLE ${table} (
        IntCol     NUMBER,
        VectorFlex64Col vector(*, float64)
        )`;
    const plsql = testsUtil.sqlCreateTable(table, sql);
    await connection.execute(plsql);
    const float64arr = new Float64Array(arr);
    await connection.execute(
      `INSERT INTO ${table}
       (IntCol, VectorFlex64Col) VALUES (:id, :vec64)`,
      { id: 1,
        vec64: float64arr
      });

    const result = await connection.execute(
      `SELECT IntCol, VectorFlex64Col FROM ${table} ORDER BY IntCol`
    );

    assert.deepStrictEqual(result.rows[0], [1, arr]);
    await connection.execute(testsUtil.sqlDropTable(table));
  }); // 294.50

  it('294.51 insert a float64 vector with 65533 dimensions to float32 vector', async function() {
    const arr = Array(65533).fill(2.5);
    const table = 'nodb_vectorDbTable1';
    await connection.execute(testsUtil.sqlDropTable(table));
    const sql = `CREATE TABLE ${table} (
        IntCol     NUMBER,
        Vector32Col VECTOR(65533, FLOAT32)
        )`;
    const plsql = testsUtil.sqlCreateTable(table, sql);
    await connection.execute(plsql);
    const float64arr = new Float64Array(arr);
    await connection.execute(
      `INSERT INTO ${table}
       (IntCol, Vector32Col) VALUES (:id, :vec64)`,
      { id: 1,
        vec64: float64arr
      });

    const result = await connection.execute(
      `SELECT IntCol, Vector32Col FROM ${table} ORDER BY IntCol`
    );
    assert.deepStrictEqual(result.rows[0], [1, arr]);
    await connection.execute(testsUtil.sqlDropTable(table));
  }); // 294.51

  it('294.52 insert a float64 vector with 65535 dimensions to flex float32 vector', async function() {
    const arr = Array(65535).fill(0.002253931947052479);
    const table = 'nodb_vectorDbTable1';
    const sql = `CREATE TABLE ${table} (
        IntCol     NUMBER,
        Vector32Col VECTOR(65535, FLOAT32)
        )`;
    const plsql = testsUtil.sqlCreateTable(table, sql);
    await connection.execute(plsql);
    const float64arr = new Float64Array(arr);
    await connection.execute(
      `INSERT INTO ${table}
       (IntCol, Vector32Col) VALUES (:id, :vec64)`,
      { id: 1,
        vec64: float64arr
      });

    const result = await connection.execute(
      `SELECT IntCol, Vector32Col FROM ${table} ORDER BY IntCol`
    );
    assert.deepStrictEqual(result.rows[0], [1, arr]);
    await connection.execute(testsUtil.sqlDropTable(table));
  }); // 294.52

  it('294.53 insert a int8 vector with 65533 dimensions to flex int8 coloumn', async function() {
    const arr = Array(65533).fill(2);
    const int8arr = new Int8Array(arr);

    const table = 'nodb_vectorDbTable1';
    const sql = `CREATE TABLE ${table} (
        IntCol     NUMBER,
        VectorFlex8Col VECTOR(*, INT8)
        )`;
    const plsql = testsUtil.sqlCreateTable(table, sql);
    await connection.execute(plsql);

    await connection.execute(
      `INSERT INTO ${table}
       (IntCol, VectorFlex8Col) VALUES (:id, :vec32)`,
      { id: 1,
        vec32: int8arr
      });

    const result = await connection.execute(
      `SELECT IntCol, VectorFlex8Col FROM ${table} ORDER BY IntCol`
    );

    assert.deepStrictEqual(result.rows[0], [1, arr]);
    await connection.execute(testsUtil.sqlDropTable(table));
  }); // 294.53

  it('294.54 insert using executeMany, update, delete and select vectors', async function() {
    const table = 'nodb_vectorDbTable1';
    const sql = `CREATE TABLE ${table} (
        IntCol      NUMBER,
        Vector64Col VECTOR(3, FLOAT64)
        )`;
    const plsql = testsUtil.sqlCreateTable(table, sql);
    await connection.execute(plsql);

    // Setup to insert some vectors
    const rows = [
      [1, [1.1, 2.2, 3.14]],
      [2, [0.72, 4.7, -1.58]],
      [3, [6.3, 0.042, 9.148]]
    ];

    const options = {
      autoCommit: true,
      bindDefs: [
        { type: oracledb.NUMBER},
        { type: oracledb.DB_TYPE_VECTOR},
      ]};

    // insert
    await connection.executeMany(
      `insert into ${table} (IntCol, Vector64Col) values (:1, :2)`,
      rows,
      options
    );

    // Retrieve vectors
    let result = await connection.execute(
      `SELECT IntCol, Vector64Col FROM ${table}  ORDER BY IntCol`
    );
    assert.deepStrictEqual(result.rows, rows);

    // Update the row where IntCol is 2
    await connection.execute(`UPDATE ${table}
                    SET Vector64Col = to_vector('[0.75, 0.375, -0.015625]')
                    WHERE IntCol = 2`);
    result = await connection.execute(
      `SELECT IntCol, Vector64Col FROM ${table}  ORDER BY IntCol`
    );
    assert.deepStrictEqual(result.rows[1], [2, [0.75, 0.375, -0.015625]]);

    // Delete the row where IntCol is 2
    await connection.execute(`DELETE FROM ${table}
    WHERE IntCol = 2`);
    result = await connection.execute(
      `SELECT IntCol, Vector64Col FROM ${table}  ORDER BY IntCol`
    );

    assert.deepStrictEqual(result.rows, [[1, [1.1, 2.2, 3.14]], [3, [6.3, 0.042, 9.148]]]);
    await connection.execute(testsUtil.sqlDropTable(table));
  }); // 294.54

  it('294.55 insert clob with array of 65535 elements to a vector column', async function() {
    const arr = Array(65535).fill(2);
    let lob = await connection.createLob(oracledb.CLOB);
    // Write the buffer to the CLOB
    await lob.write(JSON.stringify (arr));
    const table = 'nodb_vectorDbTable1';
    let sql = `CREATE TABLE ${table} (
        IntCol     NUMBER,
        VectorCol  VECTOR
        )`;
    const plsql = testsUtil.sqlCreateTable(table, sql);
    await connection.execute(plsql);

    await connection.execute(
      `INSERT INTO ${table}
       (IntCol, VectorCol) VALUES (:id, :clob)`,
      { id: 1,
        clob: lob
      });

    lob.destroy();
    await connection.commit();
    // verify
    sql = `select VectorCol from ${table} where IntCol = :i`;
    const result = await connection.execute(sql, { i: 1 });
    lob = result.rows[0][0];

    // Convert the CLOB data to a string directly
    const clobData = await lob.toString('utf8');

    //assert.deepStrictEqual(clobData.map(num => parseFloat(num.toFixed(4))), arr.join(','));
    assert.strictEqual(clobData, arr.toString('utf8'));
    await connection.execute(testsUtil.sqlDropTable(table));
  }); // 294.55

  it('294.56 insert vector as clob to Int8 column', async function() {
    const table = 'nodb_vectorDbTable1';
    let sql = `CREATE TABLE ${table} (
        IntCol      NUMBER,
        VectorInt8Col vector(3, int8)
        )`;
    const plsql = testsUtil.sqlCreateTable(table, sql);
    await connection.execute(plsql);
    const arr = Array(3).fill(2);
    const seq = 1;

    let lob = await connection.createLob(oracledb.CLOB);
    // Write the buffer to the CLOB
    await lob.write(JSON.stringify (arr));
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: seq },
      { dir: oracledb.BIND_IN, type: oracledb.CLOB, val: lob },
    ];
    sql = `insert into ${table} (IntCol, VectorInt8Col) values (:IntCol, to_vector(:bindvar))`;
    let result = await connection.execute(sql, binds);
    assert.strictEqual(result.rowsAffected, 1);

    lob.destroy();
    await connection.commit();
    // verify
    sql = `select VectorInt8Col from ${table} where IntCol = :i`;
    result = await connection.execute(sql, { i: seq });
    lob = result.rows[0][0];

    // Convert the CLOB data to a string directly
    const clobData = await lob.toString('utf8');

    assert.deepStrictEqual(clobData, arr.join(','));
    await connection.execute(testsUtil.sqlDropTable(table));
  }); // 294.56

  it('294.57 insert vector as clob to float64 column', async function() {
    const table = 'nodb_vectorDbTable1';
    let sql = `CREATE TABLE ${table} (
        IntCol      NUMBER,
        Vector64Col VECTOR(3, FLOAT64)
        )`;
    const plsql = testsUtil.sqlCreateTable(table, sql);
    await connection.execute(plsql);

    const arr = Array(3).fill(0.002253931947052479);
    const seq = 1;

    let lob = await connection.createLob(oracledb.CLOB);
    // Write the buffer to the CLOB
    await lob.write(JSON.stringify (arr));
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: seq },
      { dir: oracledb.BIND_IN, type: oracledb.CLOB, val: lob },
    ];
    sql = `insert into ${table} (IntCol, Vector64Col) values (:IntCol, to_vector(:bindvar))`;
    let result = await connection.execute(sql, binds);
    assert.strictEqual(result.rowsAffected, 1);

    lob.destroy();
    await connection.commit();
    // verify
    sql = `select Vector64Col from ${table} where IntCol = :i`;
    result = await connection.execute(sql, { i: seq });
    lob = result.rows[0][0];

    // Convert the CLOB data to a string directly
    const clobData = await lob.toString('utf8');

    assert.deepStrictEqual(clobData, arr.join(','));
    await connection.execute(testsUtil.sqlDropTable(table));
  }); // 294.57

  it('294.58 insert vector as clob to float32 column', async function() {
    const table = 'nodb_vectorDbTable1';
    let sql = `CREATE TABLE ${table} (
        IntCol      NUMBER,
        Vector32Col VECTOR(3, FLOAT32)
        )`;
    const plsql = testsUtil.sqlCreateTable(table, sql);
    await connection.execute(plsql);
    const arr = Array(3).fill(0.002253931947052479);
    const seq = 1;

    let lob = await connection.createLob(oracledb.CLOB);
    // Write the buffer to the CLOB
    await lob.write(JSON.stringify (arr));
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: seq },
      { dir: oracledb.BIND_IN, type: oracledb.CLOB, val: lob },
    ];
    sql = `insert into ${table} (IntCol, Vector32Col) values (:IntCol, to_vector(:bindvar))`;
    let result = await connection.execute(sql, binds);
    assert.strictEqual(result.rowsAffected, 1);

    lob.destroy();
    await connection.commit();
    // verify
    sql = `select Vector32Col from ${table} where IntCol = :i`;
    result = await connection.execute(sql, { i: seq });
    lob = result.rows[0][0];

    // Convert the CLOB data to a string directly
    const clobData = await lob.toString('utf8');

    assert.deepStrictEqual(clobData, arr.join(','));
    await connection.execute(testsUtil.sqlDropTable(table));
  }); // 294.58

  it('294.59 insert a clob with 65535 elements to float64 vector column', async function() {
    const maxval = 65535;
    const arr = Array(maxval).fill(12);

    const table = 'nodb_vectorDbTable1';
    const sql = `CREATE TABLE ${table} (
        IntCol      NUMBER,
        Vector64Col VECTOR(${maxval}, FLOAT64)
        )`;
    const plsql = testsUtil.sqlCreateTable(table, sql);
    await connection.execute(plsql);

    const lob = await connection.createLob(oracledb.CLOB);

    // Write the array to the CLOB
    await lob.write(JSON.stringify(arr));
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: 1 },
      { dir: oracledb.BIND_IN, type: oracledb.CLOB, val: lob },
    ];

    await connection.execute(
      `INSERT INTO ${table}
       (IntCol, Vector64Col) VALUES (:id, :vec32)`, binds);

    oracledb.fetchTypeHandler = function(metadata) {
      if (metadata.dbType === oracledb.DB_TYPE_VECTOR) {
        return {type: oracledb.CLOB};
      }
    };

    const result = await connection.execute(`select * from ${table}`);
    const lob2 = result.rows[0][1];
    const data = await lob2.getData();
    // 12 comes in E notation 1.2E..
    assert.deepStrictEqual(JSON.parse(data), arr);
    await new Promise((resolve) => {
      lob2.once('close', resolve);
      lob2.destroy();
    });
    await connection.execute(testsUtil.sqlDropTable(table));
  }); // 294.59

  it('294.60 insert and update vector as clob', async function() {
    const arr1 = Array(65535).fill(2);
    let lob = await connection.createLob(oracledb.CLOB);
    // Write the buffer to the CLOB
    await lob.write(JSON.stringify (arr1));
    const table = 'nodb_vectorDbTable1';
    let sql = `CREATE TABLE ${table} (
        IntCol     NUMBER,
        VectorCol  VECTOR
        )`;
    const plsql = testsUtil.sqlCreateTable(table, sql);
    await connection.execute(plsql);

    await connection.execute(
      `INSERT INTO ${table}
       (IntCol, VectorCol) VALUES (:id, :clob)`,
      { id: 1,
        clob: lob
      });

    lob.destroy();
    await connection.commit();

    // Update
    const arr2 = Array(65535).fill(2.5);
    lob = await connection.createLob(oracledb.CLOB);

    // Write the buffer to the CLOB
    await lob.write(JSON.stringify (arr2));

    await connection.execute(
      `UPDATE ${table} set VectorCol = :clob where IntCol = :id`,
      { id: 1,
        clob: lob
      });

    lob.destroy();
    await connection.commit();
    // Verify
    sql = `select VectorCol from ${table} where IntCol = :i`;
    const result = await connection.execute(sql, { i: 1 });
    lob = result.rows[0][0];

    // Convert the CLOB data to a string directly
    const clobData = await lob.toString('utf8');
    assert.strictEqual(clobData, arr2.toString('utf8'));
    await connection.execute(testsUtil.sqlDropTable(table));
  }); // 294.60

  it('291.61 insert a Float64 vector array with 65535 dimensions to Float32 vector column', async function() {
    const arr = Array(65535).fill(0.002253931947052479);

    const table = 'nodb_vectorDbTable66';
    const sql = `CREATE TABLE ${table} (
        IntCol     NUMBER,
        Vector32Col VECTOR(65535, FLOAT32)
    )`;

    const plsql = testsUtil.sqlCreateTable(table, sql);
    await connection.execute(plsql);

    const float32arr = new Float64Array(arr);
    await connection.execute(
      `INSERT INTO ${table}
         (IntCol, Vector32Col) VALUES (:id, :vec32)`,
      { id: 1,
        vec32: float32arr
      });

    const result = await connection.execute(
      `SELECT IntCol, Vector32Col FROM ${table} ORDER BY IntCol`
    );

    assert.deepStrictEqual(result.rows[0], [1, arr]);
    await testsUtil.dropTable(connection, table);
  }); // 294.61

  it('291.62 Procedure Call with Vector Type Parameters', async function() {
    await connection.execute(`
      CREATE OR REPLACE PROCEDURE nodb_VectorTest (
        a_InValue       IN  VECTOR,
        a_InOutValue    IN OUT VECTOR,
        a_OutValue      OUT VECTOR
      ) AS
      BEGIN
        a_OutValue := a_InValue;
      END;
    `);

    await connection.commit();

    const inputVector = new Float32Array([2.5, 2.5, 2.5, 2.5, 2.5]);
    const inOutVector = { val: inputVector, dir: oracledb.BIND_INOUT, type: oracledb.DB_TYPE_VECTOR };
    const outVector = { val: inputVector, dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_VECTOR };

    const bindings = [inputVector, inOutVector, outVector];

    const result = await connection.execute(
      `BEGIN nodb_VectorTest(:1, :2, :3); END;`,
      bindings
    );

    assert.deepStrictEqual(inputVector, result.outBinds[1]);
    await connection.execute(`DROP PROCEDURE nodb_VectorTest`);
  }); // 294.62

  it('294.63 binding a vector with inf values (negative)', async function() {
    const value = new Float32Array([-Infinity, -Infinity, -Infinity, -Infinity, -Infinity]);
    await assert.rejects(
      async () => await connection.execute("select :1 from dual", [value]),
      /OCI-51805:|ORA-51805:/
    );
  });  // 294.63

  it('294.64 fetch JSON value with an embedded vector', async function() {
    const value = new Float32Array([1, 2, 3]);
    const result = await connection.execute(
      "select json_object('id' value 6432, 'vector' value to_vector('[1, 2, 3]') returning json) from dual"
    );
    const expectedVal = { id: 6432, vector: value };
    assert.deepStrictEqual(result.rows[0][0], expectedVal);
  }); // 294.64

  it('294.65 bind JSON value with an embedded vector', async function() {
    const table = 'nodb_vector_desc_65';
    const sql = `CREATE TABLE ${table} (
      IntCol number(9) not null,
      JsonCol json not null
    )`;
    const plsql = testsUtil.sqlCreateTable(table, sql);
    await connection.execute(plsql);

    const value = new Float32Array([6433, 6433.25, 6433.5]);
    const bindVariables = [
      { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: 1 },
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: value }
    ];

    await connection.execute(`insert into ${table} values (:1, :2)`, bindVariables);

    await connection.commit();

    const result = await connection.execute(`select JsonCol from ${table}`);
    assert.deepStrictEqual(result.rows[0][0], value);
    await connection.execute(testsUtil.sqlDropTable(table));
  }); // 294.65

  it('294.66 with type Int16Array invalid typed arrays', async function() {
    // Create a intArray
    const intArray = new Uint16Array([1, 2]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: intArray },
    ];

    const sql = `insert into ${tableName} (IntCol, VectorInt8Col)
        values(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /NJS-011:/ // encountered bind value and type mismatch
    );
  }); // 294.66

  it('294.67 typed arrays with strings', async function() {
    // Create a Float32Array with strings
    const float32ArrayWithString = new Float32Array([1, 'invalid', 3, 4]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32ArrayWithString },
    ];

    const sql = `insert into ${tableName} (IntCol, VectorInt8Col)
      values(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51805:/ /*
                    ORA-51805: Vector is not properly formatted
                    (dimension value  is either not a number or infinity)
                  */
    );
  }); // 294.67

  it('294.68 typed arrays with objects', async function() {
  // Create a Float32Array with objects
    const float32ArrayWithObjects = new Float32Array([{ key: 'value' }, 2, 3, 4]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32ArrayWithObjects },
    ];

    const sql = `insert into ${tableName} (IntCol, VectorInt8Col)
      values(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51805:/ /*
                  ORA-51805: Vector is not properly formatted
                  (dimension value  is either not a number or infinity)
                */
    );
  }); // 294.68

  it('294.69 typed arrays with boolean values', async function() {
    // Create a Float32Array with boolean values
    const float32ArrayWithBooleans = new Float32Array([true, false, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32ArrayWithBooleans },
    ];

    const sql = `insert into ${tableName} (IntCol, Vector64Col)
      values(2, :val)`;
    await connection.execute(sql, binds);
    await connection.commit();

    const result = await connection.execute(`select Vector64Col from ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [1, 0, 3, 4, 5, 6, 7, 8, 9, 10]);
  }); // 294.69

  it('294.70 typed arrays with undefined value', async function() {
    // Create a Float32Array with undefined value
    const float32ArrayWithUndefined = new Float32Array([1, undefined, 3, 4, 5, 6, 7, 8, 9, 0]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32ArrayWithUndefined },
    ];

    const sql = `insert into ${tableName} (IntCol, Vector64Col)
      values(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51805:/ /*
                 ORA-51805: Vector is not properly formatted
                 (dimension value is either not a number or infinity)
               */
    );
  }); // 294.70

  it('294.71 typed arrays with null values', async function() {
    // Create a Float32Array with null values
    const float32ArrayInvalidValues = new Float32Array([1, null, 3, 4, 5, 6, 7, 8, 9, 0]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32ArrayInvalidValues },
    ];

    const sql = `insert into ${tableName} (IntCol, Vector64Col)
      values(2, :val)`;

    await connection.execute(sql, binds);
    await connection.commit();

    const result = await connection.execute(`select Vector64Col from ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [1, 0, 3, 4, 5, 6, 7, 8, 9, 0]);
  }); // 294.71

  it('294.72 inserting empty vector in Fixed and Flex vector columns', async function() {
    const emptyVector = [];
    const columns = ['VectorFixedCol', 'VectorFlexCol', 'VectorFlex32Col',
      'VectorFlex64Col',
      'VectorFlex8Col'
    ];

    const binds = [
      { type: oracledb.DB_TYPE_VECTOR, dir: oracledb.BIND_IN, val: emptyVector }
    ];

    for (let i = 0; i < columns.length; i++) {
      const sql = `INSERT INTO ${tableName} (IntCol, ${columns[i]})
                       VALUES (2, :embed_array)`;

      await assert.rejects(
        async () => await connection.execute(
          sql,
          binds
        ),
        /ORA-51803:/
        /*
          ORA-51803: Vector dimension count must match the dimension count
          specified in the column definition (actual: , required: ).
       */
      );
    }
  }); // 294.72
});

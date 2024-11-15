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
  let isVectorBinaryRunnable = false;
  const tableName = 'nodb_vectorDbTable';

  before('Get connection', async function() {
    isRunnable = await testsUtil.checkPrerequisites(2304000000, 2304000000);
    if (!isRunnable) this.skip();
    if (await testsUtil.isVectorBinaryRunnable()) {
      isVectorBinaryRunnable = true;
    }

    defaultFetchTypeHandler = oracledb.fetchTypeHandler;
    connection = await oracledb.getConnection(dbConfig);
    let sql;
    if (isVectorBinaryRunnable) {
      sql = `CREATE TABLE ${tableName} (
          IntCol                  NUMBER(9) NOT NULL,
          VectorCol               VECTOR,
          VectorFixedCol          VECTOR(2),
          Vector32Col             VECTOR(10, float32),
          Vector64Col             VECTOR(10, float64),
          VectorInt8Col           VECTOR(4, int8),
          VectorBinaryCol         VECTOR(16, binary),
          VectorFlexCol           VECTOR(*, *),
          VectorFlex32Col         VECTOR(*, float32),
          VectorFlex64Col         VECTOR(*, float64),
          VectorFlex8Col          VECTOR(*, int8),
          VectorFlexBinaryCol     VECTOR(*, binary)
          )`;
    } else {
      sql = `CREATE TABLE ${tableName} (
          IntCol                  NUMBER(9) NOT NULL,
          VectorCol               VECTOR,
          VectorFixedCol          VECTOR(2),
          Vector32Col             VECTOR(10, float32),
          Vector64Col             VECTOR(10, float64),
          VectorInt8Col           VECTOR(4, int8),
          VectorFlexCol           VECTOR(*, *),
          VectorFlex32Col         VECTOR(*, float32),
          VectorFlex64Col         VECTOR(*, float64),
          VectorFlex8Col          VECTOR(*, int8)
          )`;
    }

    const plsql = testsUtil.sqlCreateTable(tableName, sql);
    await connection.execute(plsql);
  });

  after('Release connection', async function() {
    if (!isRunnable) return;
    await connection.execute(testsUtil.sqlDropTable(tableName));
    await connection.close();
    oracledb.fetchTypeHandler = defaultFetchTypeHandler;
  });

  beforeEach(async function() {
    await connection.execute(`DELETE FROM ${tableName}`);
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

  it('294.1 binding a vector type with various numeric array types', async function() {
    const sql = "SELECT :1 FROM dual";

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
    const sql = "SELECT :1 FROM dual";

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
    const sql = "SELECT :1 FROM dual";

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

    await connection.execute(`INSERT INTO ${tableName} (IntCol, VectorFixedCol)
        VALUES(1, :1)`, binds);
    connection.execute(`SELECT VectorFixedCol FROM ${tableName}`);
    let result = await connection.execute(`SELECT VectorFixedCol FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [1, 2]);

    binds = [
      { type: oracledb.DB_TYPE_VECTOR, val: new Float32Array([4.0, 5.0])},
    ];

    await connection.execute(`INSERT INTO ${tableName} (IntCol, VectorFixedCol)
        VALUES(2, :1)`, binds);

    result = await connection.execute(`SELECT VectorFixedCol FROM ${tableName} WHERE IntCol=2`);
    assert.deepStrictEqual(result.rows[0][0], [4.0, 5.0]);
  }); // 294.4

  it('294.5 binding a binary vector type with various number typed arrays', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    const uInt8Arr1 = new Uint8Array([3, 4]);
    let binds = [
      { type: oracledb.DB_TYPE_VECTOR, val: uInt8Arr1 },
    ];

    await connection.execute(`INSERT INTO ${tableName} (IntCol, VectorBinaryCol)
        VALUES(1, :1)`, binds);
    connection.execute(`SELECT VectorBinaryCol FROM ${tableName}`);
    const result = await connection.execute(`SELECT VectorBinaryCol FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [3, 4]);

    binds = [
      { type: oracledb.DB_TYPE_VECTOR, val: new Float32Array([4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0,
        12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0, ])},
    ];

    await assert.rejects(
      async () => await connection.execute(`INSERT INTO ${tableName} (IntCol, VectorBinaryCol)
        VALUES(2, :1)`, binds),
      /ORA-51814:/
      // ORA-51814:Vector of BINARY format cannot have any operation performed with vector of any other type.
    );
  }); // 294.5

  it('294.6 update binary vector type into table', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    const uInt8Arr1 = new Uint8Array([3, 4]);
    let binds = [
      { type: oracledb.DB_TYPE_VECTOR, val: uInt8Arr1 },
    ];

    await connection.execute(`INSERT INTO ${tableName} (IntCol, VectorBinaryCol)
        VALUES(1, :1)`, binds);
    connection.execute(`SELECT VectorBinaryCol FROM ${tableName}`);
    let result = await connection.execute(`SELECT VectorBinaryCol FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [3, 4]);

    binds = [
      { type: oracledb.DB_TYPE_VECTOR, val: new Uint8Array([30, 40])},
    ];

    await connection.execute(`UPDATE ${tableName}
        SET VectorBinaryCol = :1 WHERE IntCol=1`, binds);

    result = await connection.execute(`SELECT VectorBinaryCol FROM ${tableName} WHERE IntCol=1`);
    assert.deepStrictEqual(result.rows[0][0], [30, 40]);
  }); // 294.6

  it('294.7 verify different vector constructors', async function() {
    const statements = [
      `SELECT VECTOR('[34.6, 77.8]', 2, float32) FROM dual`,
      `SELECT VECTOR('[34.6, 77.8, -89.34]', 3, float32) FROM dual`,
      `SELECT TO_VECTOR('[34.6, 77.8]', 2, float32) FROM dual`,
      `SELECT TO_VECTOR('[34.6, 77.8, -89.34]', 3, float32) FROM dual`
    ];
    if (isVectorBinaryRunnable)
      statements.push(`SELECT TO_VECTOR('[1]', 8, binary) FROM dual`);

    /* eslint-disable no-loss-of-precision */

    const expectedVectors = [
      [34.599998474121094, 77.80000305175781],
      [34.599998474121094, 77.80000305175781, -89.33999633789062],
      [34.599998474121094, 77.80000305175781],
      [34.599998474121094, 77.80000305175781, -89.33999633789062]
    ];
    if (isVectorBinaryRunnable)
      expectedVectors.push([1]);

    for (let i = 0; i < statements.length; i++) {
      const result = await connection.execute(statements[i]);
      assert.deepStrictEqual(result.rows[0][0], expectedVectors[i]);
    }
  }); // 294.7

  it('294.8 update vector type into table', async function() {
    let binds = [
      { type: oracledb.DB_TYPE_VECTOR, val: [1, 2] },
    ];

    await connection.execute(`INSERT INTO ${tableName} (IntCol, VectorFixedCol)
        VALUES(1, :1)`, binds);
    connection.execute(`SELECT VectorFixedCol FROM ${tableName}`);
    let result = await connection.execute(`SELECT VectorFixedCol FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [1, 2]);

    binds = [
      { type: oracledb.DB_TYPE_VECTOR, val: new Float32Array([4.0, 5.0])},
    ];

    await connection.execute(`UPDATE ${tableName}
        SET VectorFixedCol = :1 WHERE IntCol=1`, binds);

    result = await connection.execute(`SELECT VectorFixedCol FROM ${tableName} WHERE IntCol=1`);
    assert.deepStrictEqual(result.rows[0][0], [4.0, 5.0]);
  }); // 294.8

  it('294.9 verify different vector constructors', async function() {
    const statements = [
      `SELECT VECTOR('[34.6, 77.8]', 2, float32) FROM dual`,
      `SELECT VECTOR('[34.6, 77.8, -89.34]', 3, float32) FROM dual`,
      `SELECT TO_VECTOR('[34.6, 77.8]', 2, float32) FROM dual`,
      `SELECT TO_VECTOR('[34.6, 77.8, -89.34]', 3, float32) FROM dual`
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
  }); // 294.9

  it('294.10 insert 32 bit vector to 32 bit table', async function() {
    // Create a Float32Array
    const float32Array = new Float32Array(
      [1.23, 4.56, -7.89, 10.11, -12.13, 14.15, -16.17, 18.19, -20.21, 9.23]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, Vector32Col)
                  VALUES(2, :val)`;
    await connection.execute(sql, binds);

    const result = await connection.execute(`SELECT Vector32Col FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], Array.from(float32Array));
  }); // 294.10

  it('294.11 insert Int8 vector to Int8 vector column', async function() {
    // Create an Int8Array
    const int8arr = new Int8Array([126, 125, -126, -23]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: int8arr },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorInt8Col)
        VALUES(2, :val)`;
    await connection.execute(sql, binds);
    const result = await connection.execute(`SELECT VectorInt8Col FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], Array.from(int8arr));
  }); // 294.11

  it('294.12 insert int8 typed array to float64 vector column', async function() {
    // Create an Int8Array
    const int8arr = new Int8Array([126, 125, -126, -23, 11, 12, -11, -12, 10, 10]);

    // Bind the Int8Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: int8arr },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, Vector64Col)
        VALUES(2, :val)`;
    await connection.execute(sql, binds);

    const result = await connection.execute(`SELECT Vector64Col FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], Array.from(int8arr));
  }); // 294.12

  it('294.13 insert a float32 vector into an Binary column (negative)', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    // Create a Float32Array
    const float32Array = new Float32Array([-5, 4, -7, 6, 2, 3, 4, 5, 6, 7, 7, 10, 11, 12, 13, 16]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorBinaryCol)
      VALUES(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51814:/
      /*
         ORA-51814: Vector of BINARY format cannot have any operation
         performed with vector of any other type.
        */
    );
  }); // 294.13

  it('294.14 insert uint8 typed array to float64 vector column', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    // Create an UInt8Array
    const uInt8Arr = new Uint8Array([3, 2, 3, 4, 5, 6, 3, 4, 5, 5]);
    // Bind the UInt8Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: uInt8Arr },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, Vector64Col)
        VALUES(2, :val)`;

    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51803:/
      /*
          ORA-51803: Vector dimension count must match the dimension count
          specified in the column definition (actual: 1, required: 10).
      */
    );
  }); // 294.14

  it('294.15 insert uint8arr typed array to flex vector column', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    // Create an UInt8Array
    const uInt8Arr = new Uint8Array([126, 125, -126, -23, 11, 12, -11, -12, 10, 10]);

    // Bind the Int8Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: uInt8Arr },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorFlexCol)
        VALUES(2, :val)`;
    await connection.execute(sql, binds);

    const result = await connection.execute(`SELECT VectorFlexCol FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], Array.from(uInt8Arr));
  }); // 294.15

  it('294.16 insert uInt8arr typed array to float32 vector column', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    // Create an UInt8Array
    const Uint8arr = new Uint8Array([3]);

    // Bind the Int8Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: Uint8arr },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, Vector32Col)
        VALUES(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51803:/
      /*
          ORA-51803: Vector dimension count must match the dimension count
          specified in the column definition (actual: 8, required: 10).
      */
    );
  }); // 294.16

  it('294.17 insert a float32 typed array into an binary vector column', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    // Create a Float32Array
    const float32Array = new Float32Array([-5, 4, -7, 6, 2, 3, 4, 5, 6, 7, 7, 10, 11, 12, 13, 16]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorBinaryCol)
        VALUES(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51814:/
      /*
        ORA-51814: Vector of BINARY format cannot have any
        operation performed with vector of any other type.
      */
    );
  }); // 294.17

  it('294.18 insert int8arr typed array to flex vector column', async function() {
    // Create an Int8Array
    const int8arr = new Int8Array([126, 125, -126, -23, 11, 12, -11, -12, 10, 10]);

    // Bind the Int8Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: int8arr },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorFlexCol)
        VALUES(2, :val)`;
    await connection.execute(sql, binds);

    const result = await connection.execute(`SELECT VectorFlexCol FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], Array.from(int8arr));
  }); // 294.18

  it('294.19 insert int8arr typed array to float32 vector column', async function() {
    // Create an Int8Array
    const int8arr = new Int8Array([126, 125, -126, -23, 11, 12, -11, -12, 10, 10]);

    // Bind the Int8Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: int8arr },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, Vector32Col)
        VALUES(2, :val)`;
    await connection.execute(sql, binds);

    const result = await connection.execute(`SELECT Vector32Col FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [126, 125, -126, -23, 11, 12, -11, -12, 10, 10]);
  }); // 294.19

  it('294.20 insert a float32 typed array into an int8 vector column', async function() {
    // Create a Float32Array
    const float32Array = new Float32Array([-5, 4, -7, 6]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorInt8Col)
        VALUES(2, :val)`;
    await connection.execute(sql, binds);

    const result = await connection.execute(`SELECT VectorInt8Col FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], Array.from(float32Array));
  }); // 294.20

  it('294.21 insert a float32 vector into an int8 column (negative)', async function() {
    // Create a Float32Array
    const float32Array = new Float32Array([-130, -129, 128, 1]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorInt8Col)
      VALUES(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51806:/
      /*
        ORA-51806: Vector column is not properly formatted
        (dimension value 1 is outside the allowed precision range)
      */
    );
  }); // 294.21

  it('294.22 insert a float64 typed array into an Binary vector column', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    // Create a Float32Array
    const float64Array = new Float64Array([-5, 4, -7, 6, 2, 3, 4, 5, 6, 7, 7, 10, 11, 12, 13, 16]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorBinaryCol)
      VALUES(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51814:/
      /*
        ORA-51814: Vector of BINARY format cannot have any
        operation performed with vector of any other type.
      */
    );
  }); // 294.22

  it('294.23 insert a float64 typed array into an int8 vector column', async function() {
    // Create a Float32Array
    const float64Array = new Float64Array([-5, 4, -7, 6]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorInt8Col)
      VALUES(2, :val)`;
    await connection.execute(sql, binds);

    const result = await connection.execute(`SELECT VectorInt8Col FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], Array.from(float64Array));
  }); // 294.23

  it('294.24 insert float32 typed array to float64 vector column', async function() {
    // Create a Float32Array
    const float32Array = new Float32Array(
      [1.23, 4.56, -7.89, 10.11, -12.13, 14.15, -16.17, 18.19, -20.21, 9.23]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, Vector64Col)
        VALUES(2, :val)`;
    await connection.execute(sql, binds);

    const result = await connection.execute(`SELECT Vector64Col FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], Array.from(float32Array));
  }); // 294.24

  it('294.25 insert float32 typed array to flex vector column', async function() {
    // Create a Float32Array
    const float32Array = new Float32Array(
      [1.23, 4.56, -7.89, 10.11, -12.13, 14.15, -16.17, 18.19, -20.21, 9.23]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorFlexCol)
        VALUES(2, :val)`;
    await connection.execute(sql, binds);

    const result = await connection.execute(`SELECT VectorFlexCol FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], Array.from(float32Array));
  }); // 294.25

  it('294.26 insert float64 typed array to float64 vector column', async function() {
    // Create a Float64Array
    const float64Array = new Float64Array(
      [-999999.12345, 987654.321, -12345.6789, 56789.0123,
        -314159.2654, 291828.1828, -99999.9999, 43210.9876, -87654.321, 65432.1098]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, Vector64Col)
        VALUES(2, :val)`;
    await connection.execute(sql, binds);

    const result = await connection.execute(`SELECT Vector64Col FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], Array.from(float64Array));
  }); // 294.26

  it('294.27 insert float64 typed array to float32 vector column', async function() {
    const expectedResult = [-999999.125, -314159.25, -12345.6787109375,
      -100000, -87654.3203125, 43210.98828125, 56789.01171875,
      65432.109375, 291828.1875, 987654.3125];

    // Create a Float64Array
    const float64Array = new Float64Array(assist.vectorValues);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, Vector32Col)
        VALUES(2, :val)`;
    await connection.execute(sql, binds);

    const result = await connection.execute(`SELECT Vector32Col FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], expectedResult);
  }); // 294.27

  it('294.28 insert float64 typed array to flex vector column', async function() {

    // Create a Float64Array
    const float64Array = new Float64Array(
      [-999999.12345, 987654.321, -12345.6789, 56789.0123,
        -314159.2654, 291828.1828, -99999.9999, 43210.9876, -87654.321, 65432.1098]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorFlexCol)
        VALUES(2, :val)`;
    await connection.execute(sql, binds);
    const result = await connection.execute(`SELECT VectorFlexCol FROM ${tableName}`);

    assert.deepStrictEqual(result.rows[0][0], Array.from(float64Array));
  }); // 294.28

  it('294.29 insert vector with invalid size', async function() {
    function createVector(numElems) {
      const vectorData = new Float64Array(numElems);
      for (let i = 0; i < numElems; i++) {
        vectorData[i] = i * -1.724657;
      }
      return vectorData;
    }

    async function insertVectorValues(numElems) {
      const sql = `INSERT INTO ${tableName} (IntCol, Vector64Col)
          VALUES(2, :1)`;

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
  }); // 294.29

  it('294.30 insert double array to float32 vector column', async function() {

    // Create a Float64Array
    const embedding_values = new Float64Array(
      [-999999.12345, 987654.321, -12345.6789, 56789.0123, -314159.2654,
        271828.1828, -99999.9999, 43210.9876, -87654.321, 65432.1098]);

    const expected_vectors = [
      -999999.125, 987654.3125, -12345.6787109375,
      56789.01171875, -314159.25, 271828.1875, -100000,
      43210.98828125, -87654.3203125, 65432.109375];

    await connection.execute(`INSERT INTO ${tableName} (IntCol, Vector32Col)
        VALUES(1, :embed_array)`, {embed_array: {type: oracledb.DB_TYPE_VECTOR,
      val: embedding_values}});

    const result = await connection.execute(`SELECT Vector32Col FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], expected_vectors);
  }); // 294.30

  it('294.31 inserting vector binary with invalid values', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    const sql = `INSERT INTO ${tableName} (IntCol, VectorBinaryCol)
        VALUES(2, :1)`;

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
  }); // 294.31

  it('294.32 inserting vector with invalid values', async function() {

    const sql = `INSERT INTO ${tableName} (IntCol, Vector64Col)
        VALUES(2, :1)`;

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
  }); // 294.32

  it('294.33 insert float and double array into vector column of default storage (float32)', async function() {
    // If a vector with -0 is inserted and read, it comes as 0 in thick mode.
    // Refer Bug: 36210055
    if (dbConfig.test.mode === 'thick') this.skip();

    const FloatArray = new Float32Array([0 * -0.23987, 1 * -0.23987, 2 * -0.23987]);

    const DoubleArray = new Float64Array([0 * 2 * -0.23987, 1 * 2 * -0.23987, 2 * 2 * -0.23987]);

    // inserting a float32 array
    await connection.execute(`INSERT INTO ${tableName} (IntCol, VectorCol)
        VALUES(1, :2)`, {2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
      val: FloatArray
    }});

    // inserting a double array
    await connection.execute(`INSERT INTO ${tableName} (IntCol, VectorCol)
        VALUES(1, :2)`, {2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
      val: DoubleArray
    }});

    const result = await connection.execute(`SELECT VectorCol FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [-0, -0.23986999690532684, -0.4797399938106537]);
  }); // 294.33

  it('294.34 insert float and double array into vector column of default storage (float32)', async function() {
    const FloatArray = new Float32Array([3 * -0.23987, 1 * -0.23987, 2 * -0.23987]);

    const DoubleArray = new Float64Array([3 * 2 * -0.23987, 1 * 2 * -0.23987, 2 * 2 * -0.23987]);

    // inserting a float32 array
    await connection.execute(`INSERT INTO ${tableName} (IntCol, VectorCol)
        VALUES(1, :2)`, {2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
      val: FloatArray
    }});

    let result = await connection.execute(`SELECT VectorCol FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [-0.7196099758148193, -0.23986999690532684, -0.4797399938106537]);

    // inserting a double array
    await connection.execute(`INSERT INTO ${tableName} (IntCol, VectorCol)
        VALUES(1, :2)`, {2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
      val: DoubleArray
    }});

    result = await connection.execute(`SELECT VectorCol FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[1][0], [-1.43922, -0.47974, -0.95948]);
  }); // 294.34

  it('294.35 insert an array into vector', async function() {
    const arr = [];
    for (let num = 0; num < 3; num++) {
      arr.push(num * -0.23987);
    }

    await connection.execute(`INSERT INTO ${tableName} (IntCol, VectorCol)
        VALUES(1, :1)`, {1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
      val: arr}});
  }); // 294.35

  it('294.36 insert float and double array into flex vector column', async function() {
    // If a vector with -0 is inserted and read, it comes as 0 in thick mode.
    // Refer Bug: 36210055
    if (dbConfig.test.mode === 'thick') this.skip();

    const FloatArray = new Float32Array([0 * -0.23987, 1 * -0.23987, 2 * -0.23987]);
    const DoubleArray = new Float64Array([0 * 2 * -0.23987, 1 * 2 * -0.23987, 2 * 2 * -0.23987]);

    await connection.execute(`INSERT INTO ${tableName} (IntCol, VectorFlexCol)
        VALUES(1, :2)`, {2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
      val: FloatArray
    }});

    await connection.execute(`INSERT INTO ${tableName} (IntCol, VectorFlexCol)
        VALUES(1, :2)`, {2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
      val: DoubleArray
    }});

    const result = await connection.execute(`SELECT VectorFlexCol FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [-0, -0.23986999690532684, -0.4797399938106537]);
    assert.deepStrictEqual(result.rows[1][0], [-0, -0.47974, -0.95948]);
  }); // 294.36

  it('294.37 insert an array into vector', async function() {
    // If a vector with -0 is inserted and read, it comes as 0 in thick mode.
    // Refer Bug: 36210055
    if (dbConfig.test.mode === 'thick') this.skip();
    const arr = [];
    for (let num = 0; num < 3; num++) {
      arr.push(num * -0.23987);
    }

    await connection.execute(`INSERT INTO ${tableName} (IntCol, VectorFlexCol)
        VALUES(1, :1)`, {1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
      val: arr}});

    const result = await connection.execute(`SELECT VectorFlexCol FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [-0, -0.23987, -0.47974]);
  }); // 294.37

  it('294.38 returning vector as clob', async function() {
    const statements = ["SELECT FROM_VECTOR(vector('[0.9, 7.7]', 2) returning clob)",
      "SELECT vector_serialize(vector('[-0.1, 0]', 2) returning clob)"];
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
  }); // 294.38

  it('294.39 creating vector with clob', async function() {
    const sql = "SELECT to_clob(:1) FROM dual";
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
  }); // 294.39

  it('294.40 vector_serialize', async function() {
    // Create a Float64Array
    const float64Array = new Float64Array([2.3, 4.5]);
    const result = await connection.execute(`SELECT vector_serialize(:1)
        FROM dual`,
    {1:
          { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
            val: float64Array
          }
    });

    // Convert the vector data returned as a string back to Float64Array
    const resultFloat64Array = new Float64Array(JSON.parse(result.rows[0][0]));
    assert.deepStrictEqual(resultFloat64Array, float64Array);
  }); // 294.40

  it('294.41 create table as select', async function() {
    const sql = `INSERT INTO ${tableName} (IntCol, VectorFixedCol) VALUES(1, :1)`;

    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: [1, 2] },
    ];

    await connection.execute(sql, binds);
    await connection.execute(`DROP TABLE IF EXISTS TestVector2`);
    await connection.execute(`CREATE TABLE TestVector2 AS SELECT * FROM ${tableName}`);
    const result = await connection.execute(`SELECT VectorFixedCol FROM TestVector2`);
    assert.deepStrictEqual(result.rows[0][0], [1, 2]);

    await connection.execute(`DROP TABLE IF EXISTS TestVector2`);
  }); // 294.41

  it('294.42 insert float64 typed array to float64 vector column', async function() {
    // Create a Float64Array
    const float64Array = new Float64Array(
      [-999999.12345, 987654.321, -12345.6789, 56789.0123,
        -314159.2654, 291828.1828, -99999.9999, 43210.9876, -87654.321, 65432.1098]);

    // Bind the Float64Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, Vector64Col)
        VALUES(2, :val)`;
    await connection.execute(sql, binds);

    const result = await connection.execute(`SELECT Vector64Col FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], Array.from(float64Array));
  }); // 294.42

  it('294.43 add drop rename vector column', async function() {
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
  }); // 294.43

  it('294.44 vector metadata verification', async function() {
    const sql = `SELECT COUNT(*) FROM all_tables WHERE table_name = UPPER('${tableName}')`;
    let result = await connection.execute(sql);
    assert.strictEqual(result.rows[0][0], 1);
    result = await connection.execute(`SELECT COUNT(*)
        FROM USER_TAB_COLUMNS
        WHERE table_name = UPPER('${tableName}')`);
    if (isVectorBinaryRunnable) {
      assert.strictEqual(result.rows[0][0], 12);
    } else {
      assert.strictEqual(result.rows[0][0], 10);
    }
    result = await connection.execute(`SELECT DBMS_METADATA.GET_DDL('TABLE', UPPER('${tableName}')) AS table_ddl
        FROM dual`);
    assert.strictEqual(result.metaData[0].name, "TABLE_DDL");
  }); // 294.44

  it('294.45 transactional features on vector', async function() {
    oracledb.autoCommit = false;
    let sql = `INSERT INTO ${tableName} (IntCol, VectorFixedCol) VALUES(1, :1)`;

    let binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: [1, 2] },
    ];

    await connection.execute(sql, binds);
    await connection.execute(`SAVEPOINT sp1`);
    sql = `INSERT INTO ${tableName} (IntCol, VectorFixedCol) VALUES(2, :1)`;

    binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: [2, 3] },
    ];

    await connection.execute(sql, binds);

    await connection.execute(`ROLLBACK TO sp1`);
    await connection.execute(`COMMIT`);
    const result = await connection.execute(`SELECT COUNT(*) FROM ${tableName}`);
    assert.strictEqual(result.rows[0][0], 1);
    oracledb.autoCommit = true;
  }); // 294.45

  it('294.46 validate assm mssm on vector table', async function() {
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
  }); // 294.46

  it('294.47 Test fuzzing of vector datatype', async function() {
    const vector_variations = ["Vector", "vector", "veCtor", "VECTOR"];

    for (const vector_case of vector_variations) {
      const createViewSql = `
          CREATE OR REPLACE VIEW ${vector_case} AS
          SELECT 'Hello' AS message
          FROM DUAL
        `;

      const createTableSql = `
          CREATE TABLE IF NOT EXISTS ${vector_case} (
              id NUMBER,
              message VECTOR(10)
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
  }); // 294.47

  it('294.48 dml returning vector type', async function() {
    const sql = `INSERT INTO ${tableName} (IntCol, VectorFixedCol)
        VALUES(1, :value)
        RETURNING VectorFixedCol INTO :vector_val`;

    const binds = [
      { type: oracledb.DB_TYPE_VECTOR, dir: oracledb.BIND_IN, val: [1, 2] },
      { type: oracledb.DB_TYPE_VECTOR, dir: oracledb.BIND_OUT }
    ];

    let result = await connection.execute(sql, binds);
    assert.deepStrictEqual(result.outBinds[0][0], new Float64Array([1, 2]));

    result = await connection.execute(`SELECT VectorFixedCol FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [1, 2]);
  }); // 294.48

  it('294.49 dml returning vector binary type', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    const sql = `INSERT INTO ${tableName} (IntCol, VectorBinaryCol)
        VALUES(1, :value)
        RETURNING VectorBinaryCol INTO :vector_val`;

    const binds = [
      { type: oracledb.DB_TYPE_VECTOR, dir: oracledb.BIND_IN, val: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] },
      { type: oracledb.DB_TYPE_VECTOR, dir: oracledb.BIND_OUT }
    ];

    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51814:/
      /*
        ORA-51814: Vector of BINARY format cannot have any
        operation performed with vector of any other type.
      */
    );
  }); // 294.49

  it('294.50 inserting more dimensions than defined in flexible vector column', async function() {
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
  }); // 294.50

  it('294.51 executeMany with positional args', async function() {
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

    await connection.executeMany(`
        INSERT INTO ${tableName} (IntCol, VectorFixedCol)
        VALUES(:1, :2)`,
    rows,
    options);
  }); // 294.51

  it('294.52 executeMany with positional args in vector binary flex column', async function() {
    const serverVersion = connection.oracleServerVersion;
    if (serverVersion <= 2306000000 || !isVectorBinaryRunnable) this.skip();

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

    await assert.rejects(
      async () => await connection.executeMany(`
          INSERT INTO ${tableName} (IntCol, VectorFlexBinaryCol)
          VALUES(:1, :2)`,
      rows,
      options),
      /ORA-51814:/
      // ORA-51814:Vector of BINARY format cannot have any operation performed with vector of any other type.
    );
  }); // 294.52

  it('294.53 handling of NULLs and default values for vector binary type', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    // insert with default value
    await connection.execute(`
          INSERT INTO ${tableName} (IntCol) VALUES (1)
      `);

    await connection.commit();

    // Check default value
    let result = await connection.execute(`
          SELECT VectorFlexBinaryCol FROM ${tableName} WHERE IntCol = 1
      `);
    assert.strictEqual(result.rows[0][0], null);

    // insert with NULL value
    await connection.execute(`
          INSERT INTO ${tableName} (IntCol, VectorFlexBinaryCol) VALUES (2, NULL)
      `);

    await connection.commit();

    // Check NULL value
    result = await connection.execute(`
          SELECT VectorFlexBinaryCol FROM ${tableName} WHERE IntCol = 2
      `);
    assert.strictEqual(result.rows[0][0], null);
  }); // 294.53

  it('294.54 ORDER BY and GROUP BY with vector binary type as negative test', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    await assert.rejects(
      async () => await connection.execute(`SELECT VectorFlexBinaryCol, COUNT(*) as count
          FROM ${tableName}
          GROUP BY VectorFlexBinaryCol
        `),
      /ORA-22848:/ // ORA-22848: cannot use VECTOR type as comparison key
    );

    await assert.rejects(
      async () => await connection.execute(`SELECT IntCol, VectorFlexBinaryCol
          FROM ${tableName}
          ORDER BY VectorFlexBinaryCol
        `),
      /ORA-22848:/ // ORA-22848: cannot use VECTOR type as comparison key
    );
  }); // 294.54

  it('294.55 handling of NULLs and default values for vector types', async function() {
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
  }); // 294.55

  it('294.56 ORDER BY and GROUP BY with vector types as negative test', async function() {
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
  }); // 294.56

  it('294.57 selection of top vectors by Euclidean distance', async function() {
    const sampleVector = "VECTOR('[3.1, 4.2, 5.9, 6.5, 7.3, 2.1, 8.4, 9.7, 3.4, 2.2]', 10, FLOAT64)";
    const vectorsToinsert = [
      [8.1, 7.2, 6.3, 5.4, 4.5, 3.6, 2.7, 1.8, 9.9, 0.0],
      [0.1, 1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9.0],
      [1.0, 3.2, 5.4, 7.6, 9.8, 2.1, 4.3, 6.5, 8.7, 0.9],
      [2.2, 8.8, 4.4, 6.6, 0.2, 1.1, 3.3, 5.5, 7.7, 9.9],
    ];

    const expected_vectors = [
      [ 3, '0.10298',
        [
          1,
          3.2,
          5.4,
          7.6,
          9.8,
          2.1,
          4.3,
          6.5,
          8.7,
          0.9
        ]
      ],
      [ 2, '0.21154',
        [
          0.1, 1.2, 2.3, 3.4,
          4.5, 5.6, 6.7, 7.8,
          8.9,   9
        ]
      ],
      [ 1, '0.27913',
        [
          8.1, 7.2, 6.3, 5.4,
          4.5, 3.6, 2.7, 1.8,
          9.9,   0
        ]
      ],
      [ 4, '0.28646',
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
    for (let i = 0; i < result.rows.length; i++) {
      assert.strictEqual((result.rows[i][1]).toFixed(5), expected_vectors[i][1]);
      assert.deepStrictEqual(result.rows[i][2], expected_vectors[i][2]);
    }
  }); // 294.57

  it('294.58 with type Int16Array invalid typed arrays', async function() {
    // Create an intArray
    const intArray = new Uint16Array([1, 2]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: intArray },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorFlexBinaryCol)
          VALUES(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /NJS-011:/ // encountered bind value and type mismatch
    );
  }); // 294.58

  it('294.59 typed arrays with strings', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    // Create a Float32Array with strings
    const float32ArrayWithString = new Float32Array([1, 'invalid', 3, 4]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32ArrayWithString },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorFlexBinaryCol)
        VALUES(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51805:/ /*
                      ORA-51805: Vector is not properly formatted
                      (dimension value  is either not a number or infinity)
                    */
    );
  }); // 294.59

  it('294.60 typed arrays with objects', async function() {
    if (!isVectorBinaryRunnable) this.skip();
    // Create a Float32Array with objects
    const float32ArrayWithObjects = new Float32Array([{ key: 'value' }, 2, 3, 4]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32ArrayWithObjects },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorFlexBinaryCol)
        VALUES(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51805:/
      /*
        ORA-51805: Vector is not properly formatted
        (dimension value  is either not a number or infinity)
      */
    );
  }); // 294.60

  it('294.61 typed arrays with boolean values', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    // Create a uint8Arr with boolean values
    const uInt8Arr = new Uint8Array([true, false]);
    // Bind the uint8Arr using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: uInt8Arr },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorFlexBinaryCol)
        VALUES(2, :val)`;
    await connection.execute(sql, binds);
    await connection.commit();

    const result = await connection.execute(`SELECT VectorFlexBinaryCol FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [1, 0]);
  }); // 294.61

  it('294.62 typed arrays with undefined value in vector binary type column', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    // Create a uint8Arr with undefined value
    const uInt8Arr = new Uint8Array([1, undefined]);

    // Bind the uint8Arr using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: uInt8Arr },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorBinaryCol)
        VALUES(2, :val)`;

    await connection.execute(sql, binds);

    const result = await connection.execute(`select VectorFlexBinaryCol from ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], null);
  }); // 294.62

  it('294.63 typed arrays with null values', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    // Create a Float32Array with null values
    const uInt8Arr = new Uint8Array([1, null]);

    // Bind the Uint8Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: uInt8Arr },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorFlexBinaryCol)
        VALUES(2, :val)`;
    await connection.execute(sql, binds);
    await connection.commit();

    const result = await connection.execute(`SELECT VectorFlexBinaryCol FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [1, 0]);
  }); // 294.63

  it('294.64 inserting empty vector in Fixed and Flex vector columns', async function() {
    if (!isVectorBinaryRunnable) this.skip();
    const emptyVector = [];
    const columns = ['VectorFixedCol', 'VectorFlexCol', 'VectorFlex32Col',
      'VectorFlex64Col',
      'VectorFlex8Col', 'VectorFlexBinaryCol'
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
        /ORA-51803:|ORA-21560:/
        /*
            ORA-51803: Vector dimension count must match the dimension count
            specified in the column definition (actual: , required: ).
            ORA-21560: argument at position 4 (vdim) is null, invalid, or out of range'
         */
      );
    }
  }); // 294.64

  it('294.65 with type Int16Array invalid typed arrays', async function() {
    // Create an intArray
    const intArray = new Uint16Array([1, 2]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: intArray },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorInt8Col)
          VALUES(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /NJS-011:/ // encountered bind value and type mismatch
    );
  }); // 294.65

  it('294.66 typed arrays with strings', async function() {
    // Create a Float32Array with strings
    const float32ArrayWithString = new Float32Array([1, 'invalid', 3, 4]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32ArrayWithString },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorInt8Col)
        VALUES(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51805:/
      /*
        ORA-51805: Vector is not properly formatted
        (dimension value  is either not a number or infinity)
      */
    );
  }); // 294.66

  it('294.67 typed arrays with objects', async function() {
    // Create a Float32Array with objects
    const float32ArrayWithObjects = new Float32Array([{ key: 'value' }, 2, 3, 4]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32ArrayWithObjects },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, VectorInt8Col)
        VALUES(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51805:/
      /*
        ORA-51805: Vector is not properly formatted
        (dimension value  is either not a number or infinity)
      */
    );
  }); // 294.67

  it('294.68 typed arrays with boolean values', async function() {
    // Create a Float32Array with boolean values
    const float32ArrayWithBooleans = new Float32Array([true, false, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32ArrayWithBooleans },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, Vector64Col)
        VALUES(2, :val)`;
    await connection.execute(sql, binds);
    await connection.commit();

    const result = await connection.execute(`SELECT Vector64Col FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [1, 0, 3, 4, 5, 6, 7, 8, 9, 10]);
  }); // 294.68

  it('294.69 typed arrays with undefined value', async function() {
    // Create a Float32Array with undefined value
    const float32ArrayWithUndefined = new Float32Array([1, undefined, 3, 4, 5, 6, 7, 8, 9, 0]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32ArrayWithUndefined },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, Vector64Col)
        VALUES(2, :val)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51805:/
      /*
        ORA-51805: Vector is not properly formatted
        (dimension value is either not a number or infinity)
      */
    );
  }); // 294.69

  it('294.70 typed arrays with null values', async function() {
    // Create a Float32Array with null values
    const float32ArrayInvalidValues = new Float32Array([1, null, 3, 4, 5, 6, 7, 8, 9, 0]);

    // Bind the Float32Array using oracledb.DB_TYPE_VECTOR
    const binds = [
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32ArrayInvalidValues },
    ];

    const sql = `INSERT INTO ${tableName} (IntCol, Vector64Col)
        VALUES(2, :val)`;
    await connection.execute(sql, binds);
    await connection.commit();

    const result = await connection.execute(`SELECT Vector64Col FROM ${tableName}`);
    assert.deepStrictEqual(result.rows[0][0], [1, 0, 3, 4, 5, 6, 7, 8, 9, 0]);
  }); // 294.70

  it('294.71 inserting empty vector in Fixed and Flex vector columns', async function() {
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
        /ORA-51803:|ORA-21560:/
        /*
            ORA-51803: Vector dimension count must match the dimension count
            specified in the column definition (actual: , required: ).
            ORA-21560: argument at position 4 (vdim) is null, invalid, or out of range'
         */
      );
    }
  }); // 294.71
}); //294


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
 *   306. dataTypeVector1.js
 *
 * DESCRIPTION
 *   Testing Vector Data Type with Tables with Different Types of Vector Columns
 *
 *****************************************************************************/
'use strict';

const assert = require('assert');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('306. dataTypeVector6.js', function() {
  let connection = null;
  let isRunnable = false;
  let isVectorBinaryRunnable = false;
  let defaultFetchTypeHandler;

  const createTable = async (tableName, sql) => {
    const plsql = testsUtil.sqlCreateTable(tableName, sql);
    await connection.execute(plsql);
  };

  const insertData = async (tableName, bindParams) => {
    const sql = `INSERT INTO ${tableName} VALUES(:id, :vec)`;
    await connection.execute(sql, bindParams);
  };

  const fetchData = async (tableName, columns = '*') => {
    const result = await connection.execute(`SELECT ${columns} FROM ${tableName}`);
    return result.rows[0];
  };

  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites(2304000000, 2304000000);
    if (!isRunnable) this.skip();

    isVectorBinaryRunnable = await testsUtil.isVectorBinaryRunnable();
    defaultFetchTypeHandler = oracledb.fetchTypeHandler;
    connection = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    if (connection) {
      await connection.close();
    }
    oracledb.fetchTypeHandler = defaultFetchTypeHandler;
  });

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

  it('306.1 fetch VECTOR Column as string', async function() {
    const tableName = 'nodb_vectorDbTable6_1';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      Vector64Col VECTOR(10, float64)
    )`;
    await createTable(tableName, sql);

    const float64Array = new Float64Array(
      [-999999.12345, 987654.321, -12345.6789, 56789.0123,
        -314159.2654, 291828.1828, -99999.9999, 43210.9876, -87654.321, 65432.1098]);

    await insertData(tableName, { id: 2, vec: float64Array });

    oracledb.fetchTypeHandler = () => ({ type: oracledb.STRING });

    const result = await fetchData(tableName, 'Vector64Col');
    const resultFloat64Array = new Float64Array(JSON.parse(result[0]));
    assert.deepStrictEqual(resultFloat64Array, float64Array);

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.2 fetch VECTOR Column as string using fetchInfo', async function() {
    const tableName = 'nodb_vectorDbTable6';
    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (
        IntCol       NUMBER,
        Vector64Col  VECTOR(10, float64)
        )`;

    await createTable(tableName, sql);

    oracledb.fetchTypeHandler = function() {
      return { type: oracledb.STRING };
    };

    // Create a Float64Array
    const float64Array = new Float64Array(
      [-999999.12345, 987654.321, -12345.6789, 56789.0123,
        -314159.2654, 291828.1828, -99999.9999, 43210.9876, -87654.321, 65432.1098]);

    await insertData(tableName, { id: 2, vec: float64Array });

    // Reading vector as string.
    const options = {};
    options.fetchInfo = { "VECTOR64COL": { type: oracledb.STRING } };

    // using fetchInfo
    const result = await connection.execute(
      `SELECT Vector64Col FROM ${tableName}`, [], options);
    // Convert the vector data returned as a string back to Float64Array
    const resultFloat64Array = new Float64Array(JSON.parse(result.rows[0][0]));
    assert.deepStrictEqual(resultFloat64Array, float64Array);

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.3 fetching vector metadata', async function() {
    const tableName = 'nodb_vectorDbTable6_3';
    let sql;
    if (isVectorBinaryRunnable) {
      sql = `CREATE TABLE ${tableName} (
        IntCol NUMBER,
        VectorFixedCol VECTOR(2),
        Vector32Col VECTOR(10, float32),
        Vector64Col VECTOR(10, float64),
        VectorInt8Col VECTOR(4, int8),
        VectorBinaryCol VECTOR(16, binary)
      )`;
    } else {
      sql = `CREATE TABLE ${tableName} (
        IntCol NUMBER,
        VectorFixedCol VECTOR(2),
        Vector32Col VECTOR(10, float32),
        Vector64Col VECTOR(10, float64),
        VectorInt8Col VECTOR(4, int8)
      )`;
    }
    await createTable(tableName, sql);

    const testValues = [
      { name: 'VectorFixedCol', dimensions: 2, format: undefined },
      { name: 'VectorInt8Col', dimensions: 4, format: oracledb.VECTOR_FORMAT_INT8 },
      { name: 'Vector32Col', dimensions: 10, format: oracledb.VECTOR_FORMAT_FLOAT32 },
      { name: 'Vector64Col', dimensions: 10, format: oracledb.VECTOR_FORMAT_FLOAT64 },
    ];

    if (isVectorBinaryRunnable)
      testValues.push({ name: 'VectorBinaryCol', dimensions: 16, format: oracledb.VECTOR_FORMAT_BINARY });

    for (const { name, dimensions, format } of testValues) {
      const vectorData = name === 'VectorBinaryCol' ?
        new Uint8Array([3, 4]) : Array.from({ length: dimensions }, (_, i) => 0.125 * i);

      await connection.execute(
        `INSERT INTO ${tableName} (IntCol, ${name}) VALUES(1, :1)`,
        [{
          val: vectorData,
          type: oracledb.DB_TYPE_VECTOR,
          dir: oracledb.BIND_IN
        }]
      );

      const result = await connection.execute(`SELECT ${name} FROM ${tableName}`);
      assert.strictEqual(result.metaData[0].vectorDimensions, dimensions);
      assert.strictEqual(result.metaData[0].dbType, oracledb.DB_TYPE_VECTOR);
      assert.strictEqual(result.metaData[0].vectorFormat, format);
      assert.strictEqual(result.metaData[0].isJson, false);
    }

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.4 handling of NULL vector value', async function() {
    const tableName = 'nodb_vectorDbTable6_4';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      VectorFlex32Col VECTOR(*, float32)
    )`;
    await createTable(tableName, sql);

    await connection.execute(`INSERT INTO ${tableName} (IntCol) VALUES(1)`);
    await connection.commit();

    const result = await fetchData(tableName, 'VectorFlex32Col');
    assert.strictEqual(result[0], null);

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.5 insert a float32 vector with 8127 dimensions into a float32 flex column', async function() {
    const tableName = 'nodb_vectorDbTable6_5';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      VectorFlex32Col VECTOR(*, float32)
    )`;
    await createTable(tableName, sql);

    const arr = Array(8127).fill(2.5);
    const float32arr = new Float32Array(arr);
    await insertData(tableName, { id: 1, vec: float32arr });

    const result = await fetchData(tableName);
    assert.deepStrictEqual(result, [1, arr]);

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.6 insert a float32 vector with 65535 dimensions into a vector column of same dimensions', async function() {
    const tableName = 'nodb_vectorDbTable6_6';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      Vector32Col VECTOR(65535, FLOAT32)
    )`;
    await createTable(tableName, sql);

    const arr = Array(65535).fill(2.5);
    const float32arr = new Float32Array(arr);
    await insertData(tableName, { id: 1, vec: float32arr });

    const result = await fetchData(tableName);
    assert.deepStrictEqual(result, [1, arr]);

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.7 insert a float64 vector with 65535 dimensions into a float64 flex column', async function() {
    const tableName = 'nodb_vectorDbTable6_7';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      VectorFlex64Col VECTOR(*, float64)
    )`;
    await createTable(tableName, sql);

    const arr = Array(65535).fill(2.5);
    const float64arr = new Float64Array(arr);
    await insertData(tableName, { id: 1, vec: float64arr });

    const result = await fetchData(tableName);
    assert.deepStrictEqual(result, [1, arr]);

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.8 insert a float64 vector with 65533 dimensions to float32 vector', async function() {
    const tableName = 'nodb_vectorDbTable6_8';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      Vector32Col VECTOR(65533, FLOAT32)
    )`;
    await createTable(tableName, sql);

    const arr = Array(65533).fill(2.5);
    const float64arr = new Float64Array(arr);
    await insertData(tableName, { id: 1, vec: float64arr });

    const result = await fetchData(tableName);
    assert.deepStrictEqual(result, [1, arr]);

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.9 insert a float64 vector with 65535 dimensions to flex float32 vector', async function() {
    const tableName = 'nodb_vectorDbTable6_9';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      Vector32Col VECTOR(65535, FLOAT32)
    )`;
    await createTable(tableName, sql);

    const arr = Array(65535).fill(0.002253931947052479);
    const float64arr = new Float64Array(arr);
    await insertData(tableName, { id: 1, vec: float64arr });

    const result = await fetchData(tableName);
    assert.deepStrictEqual(result, [1, arr]);

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.10 insert a int8 vector with 65533 dimensions to flex int8 column', async function() {
    const tableName = 'nodb_vectorDbTable6_10';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      VectorFlex8Col VECTOR(*, INT8)
    )`;
    await createTable(tableName, sql);

    const arr = Array(65533).fill(2);
    const int8arr = new Int8Array(arr);
    await insertData(tableName, { id: 1, vec: int8arr });

    const result = await fetchData(tableName);
    assert.deepStrictEqual(result, [1, arr]);

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.11 insert a uint8 vector with 65536 dimensions to flex binary column', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    const tableName = 'nodb_vectorDbTable6_11';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      VectorFlexBinaryCol VECTOR(65536, BINARY)
    )`;

    await assert.rejects(
      async () => await createTable(tableName, sql),
      /ORA-51801:/ // ORA-51801: VECTOR column type specification has an unsupported dimension count ('65536').
    );
  });

  it('306.12 insert a uint8 vector with max 65528 dimensions to flex binary column', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    const tableName = 'nodb_vectorDbTable6_12';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      VectorFlexBinaryCol VECTOR(65528, BINARY)
    )`;
    await createTable(tableName, sql);

    const arr = Array(8191).fill(1);
    const vecUint8 = new Uint8Array(arr);
    await insertData(tableName, { id: 1, vec: vecUint8 });

    const result = await fetchData(tableName);
    assert.deepStrictEqual(result, [1, arr]);

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.13 vector binary column with no multiple of eight dimensions', async function() {
    if (!isVectorBinaryRunnable) this.skip();

    const tableName = 'nodb_vectorDbTable6_13';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      VectorFlexBinaryCol VECTOR(1023, BINARY)
    )`;

    await assert.rejects(
      async () => await createTable(tableName, sql),
      /ORA-51813:/ // ORA-51813: Vector of BINARY format should have a dimension count that is a multiple of 8.
    );
  });

  it('306.14 insert using executeMany, update, delete and select vectors', async function() {
    const tableName = 'nodb_vectorDbTable6_14';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      Vector64Col VECTOR(3, FLOAT64)
    )`;
    await createTable(tableName, sql);

    const rows = [
      [1, [1.1, 2.2, 3.14]],
      [2, [0.72, 4.7, -1.58]],
      [3, [6.3, 0.042, 9.148]]
    ];

    const options = {
      autoCommit: true,
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.DB_TYPE_VECTOR },
      ]
    };

    await connection.executeMany(
      `INSERT INTO ${tableName} (IntCol, Vector64Col) VALUES(:1, :2)`,
      rows,
      options
    );

    let result = await connection.execute(`SELECT * FROM ${tableName} ORDER BY IntCol`);
    assert.deepStrictEqual(result.rows, rows);

    await connection.execute(`UPDATE ${tableName}
      SET Vector64Col = TO_VECTOR('[0.75, 0.375, -0.015625]')
      WHERE IntCol = 2`);

    result = await connection.execute(`SELECT * FROM ${tableName} WHERE IntCol = 2`);
    assert.deepStrictEqual(result.rows[0], [2, [0.75, 0.375, -0.015625]]);

    await connection.execute(`DELETE FROM ${tableName} WHERE IntCol = 2`);
    result = await connection.execute(`SELECT * FROM ${tableName} ORDER BY IntCol`);
    assert.deepStrictEqual(result.rows, [[1, [1.1, 2.2, 3.14]], [3, [6.3, 0.042, 9.148]]]);

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.15 insert clob with array of 65535 elements to a vector column', async function() {
    const tableName = 'nodb_vectorDbTable6_15';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      VectorCol VECTOR
    )`;
    await createTable(tableName, sql);

    const arr = Array(65535).fill(2);
    const lob = await connection.createLob(oracledb.CLOB);
    await lob.write(JSON.stringify(arr));

    await connection.execute(
      `INSERT INTO ${tableName} (IntCol, VectorCol) VALUES (:id, :clob)`,
      { id: 1, clob: lob }
    );

    await lob.close();
    await connection.commit();

    const result = await connection.execute(`SELECT VectorCol FROM ${tableName} WHERE IntCol = :i`, { i: 1 });
    const clobData = await result.rows[0][0].toString('utf8');
    assert.strictEqual(clobData, arr.toString('utf8'));

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.16 insert vector as clob to Int8 column', async function() {
    const tableName = 'nodb_vectorDbTable6_16';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      VectorInt8Col VECTOR(3, int8)
    )`;
    await createTable(tableName, sql);

    const arr = Array(3).fill(2);
    const lob = await connection.createLob(oracledb.CLOB);
    await lob.write(JSON.stringify(arr));

    await connection.execute(
      `INSERT INTO ${tableName} (IntCol, VectorInt8Col) VALUES(:IntCol, TO_VECTOR(:bindvar))`,
      [1, lob]
    );

    await lob.close();
    await connection.commit();

    const result = await connection.execute(`SELECT VectorInt8Col FROM ${tableName} WHERE IntCol = :i`, { i: 1 });
    const clobData = await result.rows[0][0].toString('utf8');
    assert.deepStrictEqual(clobData, arr.join(','));

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.17 insert vector as clob to float64 column', async function() {
    const tableName = 'nodb_vectorDbTable6_17';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      Vector64Col VECTOR(3, FLOAT64)
    )`;
    await createTable(tableName, sql);

    const arr = Array(3).fill(0.002253931947052479);
    const lob = await connection.createLob(oracledb.CLOB);
    await lob.write(JSON.stringify(arr));

    await connection.execute(
      `INSERT INTO ${tableName} (IntCol, Vector64Col) VALUES(:IntCol, TO_VECTOR(:bindvar))`,
      [1, lob]
    );

    await lob.close();
    await connection.commit();

    const result = await connection.execute(`SELECT Vector64Col FROM ${tableName} WHERE IntCol = :i`, { i: 1 });
    const clobData = await result.rows[0][0].toString('utf8');
    assert.deepStrictEqual(clobData, arr.join(','));

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.18 insert vector as clob to float32 column', async function() {
    const tableName = 'nodb_vectorDbTable6_18';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      Vector32Col VECTOR(3, FLOAT32)
    )`;
    await createTable(tableName, sql);

    const arr = Array(3).fill(0.002253931947052479);
    const lob = await connection.createLob(oracledb.CLOB);
    await lob.write(JSON.stringify(arr));

    await connection.execute(
      `INSERT INTO ${tableName} (IntCol, Vector32Col) VALUES(:IntCol, TO_VECTOR(:bindvar))`,
      [1, lob]
    );

    await lob.close();
    await connection.commit();

    const result = await connection.execute(`SELECT Vector32Col FROM ${tableName} WHERE IntCol = :i`, { i: 1 });
    const clobData = await result.rows[0][0].toString('utf8');
    assert.deepStrictEqual(clobData, arr.join(','));

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.19 insert a clob with 65535 elements to float64 vector column', async function() {
    const tableName = 'nodb_vectorDbTable6_19';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      Vector64Col VECTOR(65535, FLOAT64)
    )`;
    await createTable(tableName, sql);

    const arr = Array(65535).fill(12);
    const lob = await connection.createLob(oracledb.CLOB);
    await lob.write(JSON.stringify(arr));

    await connection.execute(
      `INSERT INTO ${tableName} (IntCol, Vector64Col) VALUES (:id, :vec)`,
      { id: 1, vec: lob }
    );

    await lob.close();
    await connection.commit();

    oracledb.fetchTypeHandler = function(metadata) {
      if (metadata.dbType === oracledb.DB_TYPE_VECTOR) {
        return {type: oracledb.CLOB};
      }
    };

    const result = await connection.execute(`SELECT * FROM ${tableName}`);
    const lob2 = result.rows[0][1];
    const data = await lob2.getData();
    assert.deepStrictEqual(JSON.parse(data), arr);
    await lob2.close();

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.20 insert and update vector as clob', async function() {
    const tableName = 'nodb_vectorDbTable6_20';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      VectorCol VECTOR
    )`;
    await createTable(tableName, sql);

    const arr1 = Array(65535).fill(2);
    let lob = await connection.createLob(oracledb.CLOB);
    await lob.write(JSON.stringify(arr1));

    await connection.execute(
      `INSERT INTO ${tableName} (IntCol, VectorCol) VALUES (:id, :clob)`,
      { id: 1, clob: lob }
    );

    await lob.close();
    await connection.commit();

    const arr2 = Array(65535).fill(2.5);
    lob = await connection.createLob(oracledb.CLOB);
    await lob.write(JSON.stringify(arr2));

    await connection.execute(
      `UPDATE ${tableName} SET VectorCol = :clob WHERE IntCol = :id`,
      { id: 1, clob: lob }
    );

    await lob.close();
    await connection.commit();

    const result = await connection.execute(`SELECT VectorCol FROM ${tableName} WHERE IntCol = :i`, { i: 1 });
    const clobData = await result.rows[0][0].toString('utf8');
    assert.strictEqual(clobData, arr2.toString('utf8'));

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.21 insert a Float64 vector array with 65535 dimensions to Float32 vector column', async function() {
    const tableName = 'nodb_vectorDbTable6_21';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      Vector32Col VECTOR(65535, FLOAT32)
    )`;
    await createTable(tableName, sql);

    const arr = Array(65535).fill(0.002253931947052479);
    const float64arr = new Float64Array(arr);
    await insertData(tableName, { id: 1, vec: float64arr });

    const result = await fetchData(tableName);
    assert.deepStrictEqual(result, [1, arr]);

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.22 Procedure Call with Vector Type Parameters', async function() {
    await connection.execute(`
      CREATE OR REPLACE PROCEDURE nodb_VectorTest(
        a_InValue IN VECTOR,
        a_InOutValue IN OUT VECTOR,
        a_OutValue OUT VECTOR
      ) AS
      BEGIN
        a_OutValue := a_InValue;
      END;
    `);

    await connection.commit();

    const inputVector = new Float32Array([2.5, 2.5, 2.5, 2.5, 2.5]);
    const inOutVector = { val: inputVector, dir: oracledb.BIND_INOUT, type: oracledb.DB_TYPE_VECTOR };
    const outVector = { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_VECTOR };

    const bindings = [inputVector, inOutVector, outVector];

    const result = await connection.execute(
      `BEGIN nodb_VectorTest(:1, :2, :3); END;`,
      bindings
    );

    assert.deepStrictEqual(inputVector, result.outBinds[1]);
    await connection.execute(`DROP PROCEDURE nodb_VectorTest`);
  });

  it('306.23 binding a vector with inf values (negative)', async function() {
    const value = new Float32Array([-Infinity, -Infinity, -Infinity, -Infinity, -Infinity]);
    await assert.rejects(
      async () => await connection.execute("SELECT :1 FROM dual", [value]),
      /OCI-51805:|ORA-51805:/
    );
  });

  it('306.24 fetch JSON value with an embedded vector', async function() {
    const value = new Float32Array([1, 2, 3]);
    const result = await connection.execute(
      "SELECT json_object('id' value 6432, 'vector' value TO_VECTOR('[1, 2, 3]') returning json) FROM dual"
    );
    const expectedVal = { id: 6432, vector: value };
    assert.deepStrictEqual(result.rows[0][0], expectedVal);
  });

  it('306.25 bind JSON value with an embedded vector', async function() {
    const tableName = 'nodb_vectorDbTable6_25';
    const sql = `CREATE TABLE ${tableName} (
      IntCol NUMBER(9) NOT NULL,
      JsonCol JSON NOT NULL
    )`;
    await createTable(tableName, sql);

    const value = new Float32Array([6433, 6433.25, 6433.5]);
    const bindVariables = [
      { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: 1 },
      { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: value }
    ];

    await connection.execute(`INSERT INTO ${tableName} VALUES(:1, :2)`, bindVariables);
    await connection.commit();

    const result = await fetchData(tableName, 'JsonCol');
    assert.deepStrictEqual(result[0], value);

    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  it('306.26 fetch VECTOR column as string with table recreate', async function() {
    const tableName = 'nodb_vectorDbTable6_26';
    const sqlCreate = `CREATE TABLE ${tableName} (
      IntCol NUMBER,
      Vector64Col VECTOR(10, float64)
    )`;

    const float64Array = new Float64Array(
      [-999999.12345, 987654.321, -12345.6789, 56789.0123,
        -314159.2654, 291828.1828, -99999.9999, 43210.9876, -87654.321, 65432.1098]);

    const testFetch = async () => {
      await createTable(tableName, sqlCreate);
      await insertData(tableName, { id: 2, vec: float64Array });

      oracledb.fetchTypeHandler = () => ({ type: oracledb.STRING });

      const result = await fetchData(tableName, 'Vector64Col');
      const resultFloat64Array = new Float64Array(JSON.parse(result[0]));
      assert.deepStrictEqual(resultFloat64Array, float64Array);

      await connection.execute(testsUtil.sqlDropTable(tableName));
    };

    // Test twice to check behavior after recreating the table
    await testFetch();
    await testFetch();
  });
});

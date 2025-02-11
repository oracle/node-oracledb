/* Copyright (c) 2025, Oracle and/or its affiliates. */

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
 *   310. dataTypeVector8.js
 *
 * DESCRIPTION
 * Tests the following features of the sparse vector data type:
 *   - Input parsing and vector creation
 *   - Distance calculations between sparse vectors
 *
 *****************************************************************************/
'use strict';

const assert = require('assert');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('310. dataTypeVector8.js', function() {
  let connection = null, isRunnable = false, compatible;
  const tableName = 'nodb_vectorSparseDbTable';

  before('Setup Database Connection and Prerequisites', async function() {
    compatible = testsUtil.versionStringCompare(await testsUtil.getDBCompatibleVersion(), '23.6.0.0.0');
    isRunnable = await testsUtil.checkPrerequisites(2306000000, 2306000000);
    if (!isRunnable || !(compatible >= 0)) this.skip();
    connection = await oracledb.getConnection(dbConfig);
  });

  after('Release Database Connection', async function() {
    if (!isRunnable || !(compatible >= 0)) return;
    await connection.close();
  });

  afterEach('Clean up test table', async function() {
    await connection.execute(testsUtil.sqlDropTable(tableName));
  });

  const createTable = async (columns) => {
    const sql = `CREATE TABLE ${tableName} (${columns})`;
    const plsql = testsUtil.sqlCreateTable(tableName, sql);
    await connection.execute(plsql);
  };

  const insertAndQueryVector = async (insertSql, vector, querySql) => {
    await connection.execute(insertSql, [vector]);
    const result = await connection.execute(querySql);
    return result.rows[0][0];
  };

  describe('310.1 SPARSE Vector Tests', function() {
    it('310.1.1 Insert and Query SPARSE Vector', async function() {
      await createTable('a VECTOR(5, FLOAT64, SPARSE)');
      const sparseVec = new oracledb.SparseVector({ values: [1.0, 2.0], indices: [2, 4], numDimensions: 5 });

      const vector = await insertAndQueryVector(
        `INSERT INTO ${tableName} VALUES (:1)`,
        sparseVec,
        `SELECT * FROM ${tableName}`
      );

      assert.deepStrictEqual(vector.dense(), new Float64Array([0, 0, 1.0, 0, 2.0]));
    }); // 310.1.1

    it('310.1.2 Query SPARSE Vector in Multiple Formats', async function() {
      await createTable('a VECTOR(5, FLOAT64, SPARSE)');
      const sparseVec = new oracledb.SparseVector({ values: [1.0, 2.0], indices: [2, 4], numDimensions: 5 });
      await connection.execute(`INSERT INTO ${tableName} VALUES (:1)`, [sparseVec]);

      const resultSparse = await connection.execute(`SELECT VECTOR(a, 5, FLOAT64, SPARSE) FROM ${tableName}`);
      const sparseVector = resultSparse.rows[0][0];
      assert.deepStrictEqual(sparseVector.dense(), new Float64Array([0, 0, 1, 0, 2]));

      // indices array will be float32 irrepspective of vector column
      assert.deepStrictEqual(sparseVector.indices, new Uint32Array([2, 4]));
      assert.deepStrictEqual(sparseVector.values, new Float64Array([1, 2]));

      const resultDense = await connection.execute(`SELECT VECTOR(a, 5, FLOAT64, DENSE) FROM ${tableName}`);
      const denseVector = resultDense.rows[0][0];
      assert.deepStrictEqual(denseVector, new Float64Array([0, 0, 1.0, 0, 2.0]));
    }); // 310.1.2
  }); // 310.1

  describe('310.2 DENSE Vector Tests', function() {
    it('310.2.1 Insert and Query DENSE Vector', async function() {
      await createTable('a VECTOR(5, FLOAT64, DENSE)');
      const denseVec = new oracledb.SparseVector({ values: [1.0, 2.0], indices: [1, 3], numDimensions: 5, type: 'float64' });

      const vector = await insertAndQueryVector(
        `INSERT INTO ${tableName} VALUES (:1)`,
        denseVec,
        `SELECT * FROM ${tableName}`
      );

      assert.deepStrictEqual(vector, new Float64Array([0, 1.0, 0, 2.0, 0]));
    });
  }); // 310.2.1

  describe('310.3 FROM_VECTOR SPARSE Tests', function() {
    it('310.3.1 Query SPARSE Vector as CLOB and BLOB', async function() {
      await createTable('a VECTOR(5, FLOAT64, SPARSE)');
      const sparseVec = new oracledb.SparseVector({ values: [1.0, 2.0], indices: [2, 4], numDimensions: 5 });
      await connection.execute(`INSERT INTO ${tableName} VALUES (:1)`, [sparseVec]);

      // CLOB format (SPARSE)
      const clobSparseResult = await connection.execute(`SELECT FROM_VECTOR(a RETURNING CLOB FORMAT SPARSE) FROM ${tableName}`);
      const clobSparseData = await clobSparseResult.rows[0][0].getData();
      assert.strictEqual(clobSparseData, '[5,[2,4],[1.0E+000,2.0E+000]]');

      // BLOB format (SPARSE)
      const blobResult = await connection.execute(`SELECT FROM_VECTOR(a RETURNING BLOB FORMAT SPARSE) FROM ${tableName}`);
      const blobData = await blobResult.rows[0][0].getData();
      assert.ok(blobData instanceof Buffer);
    }); // 310.3.1
  }); // // 310.3.1

  describe('310.4 Vector Distance Calculations', function() {
    it('310.4.1 Calculate Distance Between DENSE Vectors', async function() {
      await createTable('a VECTOR(5, FLOAT64, DENSE), b VECTOR(5, FLOAT64, DENSE)');
      const denseVecA = new oracledb.SparseVector({ values: [1.0, 2.0, 3.0], indices: [0, 3, 4], numDimensions: 5 });
      const denseVecB = new oracledb.SparseVector({ values: [3.0, 2.0, 1.0], indices: [1, 3, 4], numDimensions: 5 });

      await connection.execute(`INSERT INTO ${tableName} VALUES (:1, :2)`, [denseVecA, denseVecB]);

      const metrics = ['EUCLIDEAN', 'COSINE', 'HAMMING', 'MANHATTAN'];
      const expectedValues = ['3.7416573867739413', '0.5', '3', '6'];

      for (let i = 0; i < metrics.length; i++) {
        const query = `SELECT VECTOR_DISTANCE(a, b, ${metrics[i]}) FROM ${tableName}`;
        const result = await connection.execute(query);
        assert.strictEqual(result.rows[0][0].toString(), expectedValues[i]);
      }
    }); // 310.4.1
  }); // 310.4
});

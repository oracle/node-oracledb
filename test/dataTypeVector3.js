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
 *   296. dataTypeVector3.js
 *
 * DESCRIPTION
 *   Testing Vector Data Type and verify vector operations
 *
 *****************************************************************************/
'use strict';

const assert  = require('assert');
const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('296. dataTypeVector3.js', function() {

  let connection = null, isRunnable = false, defaultFetchTypeHandler;
  const tableName = 'nodb_vectorDbTable3';

  before('Get connection', async function() {
    const prerequisites = await testsUtil.checkPrerequisites(2304000000, 2304000000);
    isRunnable = prerequisites;
    if (!isRunnable) this.skip();

    defaultFetchTypeHandler = oracledb.fetchTypeHandler;

    connection = await oracledb.getConnection(dbConfig);

    const sql = `
        CREATE TABLE ${tableName} (
          id NUMBER,
          embedding VECTOR(3))
        `;
    const plsql = testsUtil.sqlCreateTable(tableName, sql);
    await connection.execute(plsql);
  });

  after('Release connection', async function() {
    if (!isRunnable) return;
    await connection.execute(testsUtil.sqlDropTable(tableName));
    await connection.close();
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
        return {converter: myConverter};
      }
    };
  });

  afterEach(function() {
    oracledb.fetchTypeHandler = defaultFetchTypeHandler;
  });

  it('296.1 insert rows into the table', async () => {
    const num = 4;
    const expectedArrays = [
      [1, 2, 3],
      [4, 5, 6],
      [42, 52, 613],
      [-1, -2, -3]
    ];

    const binds = [];
    for (let i = 0; i < num; i++) {
      binds.push({ id: i, vec: expectedArrays[i] });
    }

    const options = {
      bindDefs: {
        id: { type: oracledb.DB_TYPE_NUMBER },
        vec: { type: oracledb.DB_TYPE_VECTOR }
      }
    };

    const result = await connection.executeMany(
      `INSERT INTO ${tableName} VALUES (:id, :vec)`,
      binds,
      options
    );

    assert.strictEqual(result.rowsAffected, num);
  });

  it('296.2 retrieve rows from the table and verify values', async () => {
    const num = 4;
    const expectedArrays = [
      [1, 2, 3],
      [4, 5, 6],
      [42, 52, 613],
      [-1, -2, -3]
    ];

    const result = await connection.execute(
      `SELECT id, embedding FROM ${tableName} ORDER BY id`
    );
    assert.deepStrictEqual(result.rows.length, num);

    for (let i = 0; i < num; i++) {
      assert.deepStrictEqual(result.rows[i], [
        i,
        expectedArrays[i]
      ]);
    }
  });

  it('296.3 calculate vector distances to a given embedding', async () => {
    const float64Array = new Float64Array([3, 1, 2]);
    const expectedValues = [6, 33, 377443, 50];

    const result = await connection.execute(
      `SELECT vector_distance(embedding, :1) FROM ${tableName}`,
      [float64Array]
    );

    assert.deepStrictEqual(result.rows.length, expectedValues.length);

    for (let i = 0; i < expectedValues.length; i++) {
      assert.deepStrictEqual(result.rows[i], [expectedValues[i]]);
    }
  });

  it('296.4 perform a top 3 similarity search to a given embedding', async () => {
    const float64Array = new Float64Array([3, 1, 2]);

    const result = await connection.execute(
      `SELECT embedding, vector_distance(embedding, :1) AS distance
        FROM ${tableName} ORDER BY distance FETCH FIRST 3 ROWS ONLY`,
      [float64Array]
    );

    assert.deepStrictEqual(result.rows.length, 3);
    assert.deepStrictEqual(result.rows[0], [[1, 2, 3], 6]);
    assert.deepStrictEqual(result.rows[1], [[4, 5, 6], 33]);
    assert.deepStrictEqual(result.rows[2], [[-1, -2, -3], 50]);
  });

  it('296.5 find nearest neighbors with distance < 34 for a given embedding', async () => {
    const result = await connection.execute(
      `SELECT * FROM ${tableName}
        WHERE vector_distance(embedding, vector('[3,1,2]', 3)) < 34`
    );
    assert.deepStrictEqual(result.rows.length, 2);
    assert.deepStrictEqual(result.rows[0], [0, [1, 2, 3]]);
    assert.deepStrictEqual(result.rows[1], [1, [4, 5, 6]]);
  });

  it('296.6 calculate cosine distances to a given embedding', async () => {
    const expectedValues = [0.2142857142857143, 0.11673988938389968, 0.3914785344302253, 1.7857142857142856];

    const result = await connection.execute(
      `SELECT cosine_distance(embedding, vector('[3,1,2]', 3)) AS cosdistance FROM ${tableName}`
    );

    assert.deepStrictEqual(result.rows.length, expectedValues.length);

    for (let i = 0; i < expectedValues.length; i++) {
      assert.deepStrictEqual(result.rows[i], [expectedValues[i]]);
    }
  });

  it('296.7 calculate inner products with a given embedding', async () => {
    const expectedValues = [11, 29, 1404, -11];

    const result = await connection.execute(
      `SELECT inner_product(embedding, vector('[3,1,2]', 3))
        FROM ${tableName}`
    );

    assert.deepStrictEqual(result.rows.length, expectedValues.length);

    for (let i = 0; i < expectedValues.length; i++) {
      assert.deepStrictEqual(result.rows[i], [expectedValues[i]]);
    }
  });

  it('296.8 should handle negative vector components', async () => {
    //await connection.execute(`truncate table ${tableName}`);
    const num = 3;
    const expectedArrays = [
      [-1, -2, -3],
      [-4, -5, -6],
      [-42, -52, -613]
    ];

    const binds = [];
    for (let i = 0; i < num; i++) {
      binds.push({ id: i, vec: expectedArrays[i] });
    }

    const options = {
      bindDefs: {
        id: { type: oracledb.DB_TYPE_NUMBER },
        vec: { type: oracledb.DB_TYPE_VECTOR }
      }
    };

    const result = await connection.executeMany(
      `INSERT INTO ${tableName} VALUES (:id, :vec)`,
      binds,
      options
    );

    assert.strictEqual(result.rowsAffected, num);
  });

  it('296.9 should handle large vector components', async () => {
    const num = 2;
    const largeVector = Array.from({ length: 3 }, (_, index) => 10 ** 15 * (index + 1));

    const binds = [];
    for (let i = 0; i < num; i++) {
      binds.push({ id: i + 3, vec: largeVector });
    }

    const options = {
      bindDefs: {
        id: { type: oracledb.DB_TYPE_NUMBER },
        vec: { type: oracledb.DB_TYPE_VECTOR }
      }
    };

    const result = await connection.executeMany(
      `INSERT INTO ${tableName} VALUES (:id, :vec)`,
      binds,
      options
    );

    assert.strictEqual(result.rowsAffected, num);
  });

  it('296.10 should handle zero vector components', async () => {
    const num = 1;
    const zeroVector = [0, 0, 0];

    const binds = [{ id: 5, vec: zeroVector }];

    const options = {
      bindDefs: {
        id: { type: oracledb.DB_TYPE_NUMBER },
        vec: { type: oracledb.DB_TYPE_VECTOR }
      }
    };

    const result = await connection.executeMany(
      `INSERT INTO ${tableName} VALUES (:id, :vec)`,
      binds,
      options
    );

    assert.strictEqual(result.rowsAffected, num);
  });
});

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
 *   309. dataTypeVector7.js
 *
 * DESCRIPTION
 *   Testing the VECTOR database type with storage type SPARSE
 *   available in Oracle Database 23.6 and higher.
 *
 *****************************************************************************/
'use strict';

const assert = require('assert');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

const tableName = 'nodb_vectorSparseDbTable';

describe('309. dataTypeVector7.js', function() {
  let connection = null, isRunnable = false, compatible;

  const metaDataFloat64 = {
    name: "SPARSEVECTOR64COL",
    dbType: oracledb.DB_TYPE_VECTOR,
    nullable: true,
    isJson: false,
    isOson: false,
    vectorDimensions: 4,
    isSparseVector: true,
    vectorFormat: 3,
    dbTypeName: "VECTOR",
    fetchType: oracledb.DB_TYPE_VECTOR,
  };

  const metaDataFloat64Flex = {
    name: "SPARSEVECTORFLEX64COL",
    dbType: oracledb.DB_TYPE_VECTOR,
    nullable: true,
    isJson: false,
    isOson: false,
    isSparseVector: true,
    vectorFormat: 3,
    dbTypeName: "VECTOR",
    fetchType: oracledb.DB_TYPE_VECTOR,
  };

  const metaDataFloat32 = {
    name: "SPARSEVECTOR32COL",
    dbType: oracledb.DB_TYPE_VECTOR,
    nullable: true,
    isJson: false,
    isOson: false,
    vectorDimensions: 4,
    isSparseVector: true,
    vectorFormat: 2,
    dbTypeName: "VECTOR",
    fetchType: oracledb.DB_TYPE_VECTOR,
  };

  const metaDataFloat32Flex = {
    name: "SPARSEVECTORFLEX32COL",
    dbType: oracledb.DB_TYPE_VECTOR,
    nullable: true,
    isJson: false,
    isOson: false,
    isSparseVector: true,
    vectorFormat: 2,
    dbTypeName: "VECTOR",
    fetchType: oracledb.DB_TYPE_VECTOR,
  };

  const metaDataInt8Flex = {
    name: "SPARSEVECTORFLEX8COL",
    dbType: oracledb.DB_TYPE_VECTOR,
    nullable: true,
    isJson: false,
    isOson: false,
    isSparseVector: true,
    vectorFormat: 4,
    dbTypeName: "VECTOR",
    fetchType: oracledb.DB_TYPE_VECTOR,
  };

  const metaDataInt8 = {
    name: "SPARSEVECTOR8COL",
    dbType: oracledb.DB_TYPE_VECTOR,
    nullable: true,
    isJson: false,
    isOson: false,
    vectorDimensions: 16,
    isSparseVector: true,
    vectorFormat: 4,
    dbTypeName: "VECTOR",
    fetchType: oracledb.DB_TYPE_VECTOR,
  };

  before('Setup database connection and check prerequisites', async function() {
    compatible = testsUtil.versionStringCompare(await testsUtil.getDBCompatibleVersion(), '23.6.0.0.0');
    isRunnable = await testsUtil.checkPrerequisites(2306000000, 2306000000);
    if (!isRunnable || !(compatible >= 0)) this.skip();

    connection = await oracledb.getConnection(dbConfig);

    const sql = `CREATE TABLE ${tableName} (
                    IntCol                      NUMBER(9) NOT NULL,
                    SparseVector64Col           VECTOR(4, float64, SPARSE),
                    SparseVectorFlex64Col       VECTOR(*, float64, SPARSE),
                    SparseVector32Col           VECTOR(4, float32, SPARSE),
                    SparseVectorFlex32Col       VECTOR(*, float32, SPARSE),
                    SparseVectorFlexAllCol      VECTOR(*, *, sparse),
                    SparseVectorFlexTypeCol     VECTOR(2, *, sparse),
                    SparseVectorFlex8Col        VECTOR(*, int8, sparse),
                    SparseVector8Col            VECTOR(16, int8, sparse)
                  )`;
    const plsql = testsUtil.sqlCreateTable(tableName, sql);
    await connection.execute(plsql);
  });

  after('Cleanup database and close connection', async function() {
    if (!isRunnable || !(compatible >= 0)) return;
    await connection.execute(testsUtil.sqlDropTable(tableName));
    await connection.close();
  });

  beforeEach(async function() {
    await connection.execute(`DELETE FROM ${tableName}`);
  });

  describe('309.1 Verify Sparse Vectors with float64', function() {
    async function insertData(index, dense, sparseVec, metaDataFloat64) {
      try {
        await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col)
        VALUES(1, :1)`, [sparseVec]);
        const result = await connection.execute(`SELECT SparseVectorFlex64Col FROM ${tableName}`);
        const numRows = result.rows.length;
        assert.deepStrictEqual(Array.from(result.rows[numRows - 1][0].dense()), Array.from(sparseVec.dense()));
        assert.deepStrictEqual(result.rows[0][0].indices, new Uint32Array(sparseVec.indices));
        assert.deepStrictEqual(Array.from(result.rows[0][0].values), Array.from(sparseVec.values));
        assert.deepStrictEqual(result.metaData[0], metaDataFloat64);
      } catch (err) {
        const format = dense ? 'DENSE' : 'SPARSE';
        throw `Entry [${index}-${format}] failed with Error ${err}`;
      }
    }

    it('309.1.1 bind and read the sparse data', async function() {
      const binds = [
        { type: oracledb.DB_TYPE_VECTOR, val: new oracledb.SparseVector([1, 0, 3.4, 0]) }
      ];
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector64Col)
            VALUES(1, :1)`, binds);
      const result = await connection.execute(`SELECT SparseVector64Col FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0].dense(), new Float64Array([1, 0, 3.4, 0]));
      assert.deepStrictEqual(result.metaData[0], metaDataFloat64);
    }); // 309.1

    it('309.1.2 Different object format for sparse data', async function() {
      const typedFloat = new Float64Array([1, 3.4]);
      const regFloatArray = [1, 3.4];
      let id = 1;
      let sparsevec = new oracledb.SparseVector({values: typedFloat, indices: [1, 3], numDimensions: 4});

      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector64Col)
            VALUES(${id}, :1)`, [sparsevec]);
      let result = await connection.execute(`SELECT SparseVector64Col FROM ${tableName}`);
      let dense = result.rows[0][0].dense();
      assert.deepStrictEqual(result.rows[0][0].dense(), new Float64Array([0, 1, 0, 3.4]));
      assert.deepStrictEqual(result.metaData[0], metaDataFloat64);

      sparsevec = new oracledb.SparseVector({values: regFloatArray, indices: [1, 3], numDimensions: 4});
      dense = sparsevec.dense();
      assert.deepStrictEqual(dense, new Float64Array([0, 1, 0, 3.4]));

      id = id + 1;
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector64Col)
            VALUES(${id}, :1)`, [sparsevec]);
      result = await connection.execute(`SELECT SparseVector64Col FROM ${tableName} where IntCol = ${id}`);
      dense = result.rows[0][0].dense();
      assert.deepStrictEqual(result.rows[0][0].dense(), new Float64Array([0, 1, 0, 3.4]));
      assert.deepStrictEqual(result.metaData[0], metaDataFloat64);

      // Allow indices and values property as typedArray should work.
      id = id + 1;
      assert.throws(
        () => new oracledb.SparseVector({values: typedFloat, indices: new Float64Array([1, 3]), numDimensions: 4}),
        /NJS-158:/ // NJS-158: SPARSE VECTOR indices is not Uint32Array or an Array
      );

      sparsevec = new oracledb.SparseVector({values: typedFloat, indices: new Uint32Array([1, 3]), numDimensions: 4});
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector64Col)
            VALUES(${id}, :1)`, [sparsevec]);
      result = await connection.execute(`SELECT SparseVector64Col FROM ${tableName} where IntCol = ${id}`);
      dense = result.rows[0][0].dense();
      assert.deepStrictEqual(result.rows[0][0].dense(), new Float64Array([0, 1, 0, 3.4]));
      assert.deepStrictEqual(result.metaData[0], metaDataFloat64);

      // Allow indices property as typedArray and values as regular Array should work.
      id = id + 1;
      assert.throws(
        () => new oracledb.SparseVector({values: regFloatArray, indices: new Float64Array([1, 3]), numDimensions: 4}),
        /NJS-158:/ // NJS-158: SPARSE VECTOR indices is not Uint32Array or an Array
      );

      sparsevec = new oracledb.SparseVector({values: regFloatArray, indices: new Uint32Array([1, 3]), numDimensions: 4});
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector64Col)
            VALUES(${id}, :1)`, [sparsevec]);
      result = await connection.execute(`SELECT SparseVector64Col FROM ${tableName} where IntCol = ${id}`);
      dense = result.rows[0][0].dense();
      assert.deepStrictEqual(result.rows[0][0].dense(), new Float64Array([0, 1, 0, 3.4]));
      assert.deepStrictEqual(result.metaData[0], metaDataFloat64);
    }); // 309.1.2

    it('309.1.3 Different dense arrays format for sparse data', async function() {
      const inpData = [
        new Float64Array([1, 0, 34, 0]),
        new Float64Array([1, 34]),
        new Float32Array([1, 0, 34, 0]),
        new Float32Array([1, 34]),
        new Uint8Array([1, 0, 34, 0]), // It causes float64 sparse image to be written on float64 sparse col.
        new Float32Array([1, 34]),
        new Int8Array([1, 0, 34, 0]),
        new Int8Array([1, 34]),
        [1, 0, 34, 0],
        [1, 34],
      ];

      for (let index = 0; index < inpData.length; index = index + 2) {
        await insertData(index, true, new oracledb.SparseVector(inpData[index]), metaDataFloat64Flex);
        await insertData(index, false, new oracledb.SparseVector({values: inpData[index + 1], indices: [0, 2], numDimensions: 4}), metaDataFloat64Flex);
      }

      const arr = [1, 0, 3.4, 0];
      const i16arr = new Int16Array(arr);
      assert.throws(
        () => new oracledb.SparseVector(i16arr),
        /NJS-164:/ // Error: NJS-164: SPARSE VECTOR Invalid Input Data
      );
      const i16arrSparse = new Int16Array([1, 3.4]);
      assert.throws(
        () => new oracledb.SparseVector({values: i16arrSparse, indices: [0, 2], numDimensions: 4}),
        /NJS-159:/ // Error: NJS-159: SPARSE VECTOR values is not an Array
      );
    }); // 309.1.3

    it('309.1.4 Negative tests for sparse data', async function() {
      let sparseVec = new oracledb.SparseVector(null);
      await assert.rejects(
        async () => await connection.execute(
          `INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col)
            VALUES(1, :1)`, [sparseVec]),
        /ORA-21560:|ORA-51803:/
        /*
           ORA-21560: argument at position 4 (vdim) is null, invalid, or
           out of range'
           ORA-51803: Vector dimension count must match the dimension count
           specified in the column definition (expected  dimensions, specified
           dimensions).
         */
      );
      sparseVec = null;
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col)
            VALUES(1, :1)`, [sparseVec]);
      const result = await connection.execute(`SELECT SparseVectorFlex64Col FROM ${tableName}`);
      const numRows = result.rows.length;
      assert.deepStrictEqual(result.rows[numRows - 1][0], null);
      assert.deepStrictEqual(result.metaData[0], metaDataFloat64Flex);

      //check with negative values in indices array.
      assert.throws(
        () => new oracledb.SparseVector({values: new Float64Array([1, 34]), indices: [0, -2], numDimensions: 4}),
        /NJS-165:/ // NJS-165: SPARSE VECTOR indices element at index 1 is not valid
      );

      assert.throws(
        () => new oracledb.SparseVector({values: new Float64Array([1, 34]), indices: [0, '1'], numDimensions: 4}),
        /NJS-165:/ // NJS-165: SPARSE VECTOR indices element at index 1 is not valid
      );

      assert.throws(
        () => new oracledb.SparseVector(Buffer.from('Invalid Array')),
        /NJS-164:/ //  NJS-164: SPARSE VECTOR Invalid Input Data
      );
    }); // 309.1.4

    it('309.1.5 String type for sparse data', async function() {
      const sparseData = '[4, [0, 1, 3], [1.5, 3.5, 7.7]]';
      const sparsevec = new oracledb.SparseVector(sparseData);
      const id = 1;

      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector64Col)
            VALUES(${id}, :1)`, [sparsevec]);
      const result = await connection.execute(`SELECT SparseVector64Col FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0].dense(),
        new Float64Array([1.5, 3.5, 0, 7.7]));
      assert.deepStrictEqual(result.rows[0][0].indices,
        new Uint32Array([0, 1, 3]));
      assert.deepStrictEqual(result.rows[0][0].values,
        new Float64Array([1.5, 3.5, 7.7]));
      assert.deepStrictEqual(result.metaData[0], metaDataFloat64);

      // some random string
      assert.throws(
        () => new oracledb.SparseVector('Invalid random string'),
        /NJS-162:/
      );

      // re-order numDimensions to end.
      assert.throws(
        () => new oracledb.SparseVector('[[1, 3, 4], [1.5, 3.5, 7.7], 4]'),
        /NJS-159:/
      );
    }); // 309.1.5

    it('309.1.6 bind Uint8Array should work', async function() {
      const binds = [
        { type: oracledb.DB_TYPE_VECTOR, val: new oracledb.SparseVector({values: new Uint8Array([80]), indices: [1, 3], numDimensions: 8}) }
      ];

      await assert.rejects(
        async () => await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col) VALUES(1, :1)`, binds),
        /ORA-51814:|ORA-51804:|ORA-51862:/
        /* ORA-51814: Vector of BINARY format cannot have any operation performed
           with vector of any other type
           serverversion >= 23.7 - ORA-51804: Vector is not in the correct string format ()
           serverVersion >= 26ai - ORA-51862: VECTOR library processing error
        */
      );
    }); // 309.1.6

    it('309.1.7 boundary values for sparse vector dimensions', async function() {
      // Minimum dimensions
      const sparseVecMin = new oracledb.SparseVector({ values: [1.5], indices: [0], numDimensions: 1 });
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col)
          VALUES(1, :1)`, [sparseVecMin]);
      let result = await connection.execute(`SELECT SparseVectorFlex64Col FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0].dense(), new Float64Array([1.5]));

      // Maximum dimensions (example: 1000 dimensions, replace with actual DB max if known)
      const sparseVecMax = new oracledb.SparseVector({ values: [1.5, 2.5], indices: [0, 999], numDimensions: 1000 });
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col)
          VALUES(2, :1)`, [sparseVecMax]);
      result = await connection.execute(`SELECT SparseVectorFlex64Col FROM ${tableName} WHERE IntCol = 2`);
      assert.deepStrictEqual(result.rows[0][0].dense(), (() => {
        const arr = new Float64Array(1000);
        arr[0] = 1.5;
        arr[999] = 2.5;
        return arr;
      })());
    }); // 309.1.7

    it('309.1.8 Empty Vectors', async function() {
      const sparseVecEmpty = new oracledb.SparseVector({ values: [], indices: [], numDimensions: 4 });

      await assert.rejects(
        async () => await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col) VALUES(1, :1)`, [sparseVecEmpty]),
        /ORA-51803:|ORA-21560:/
        /*
            ORA-51803: Vector dimension count must match the dimension count
            specified in the column definition (expected  dimensions, specified  dimensions)
            ORA-21560: argument at position 5 (vecarray) is null, invalid,
            or out of range'
          */
      );
    }); // 309.1.8

    it('309.1.9 Data Type Mismatches', async function() {
      const invalidVec = new oracledb.SparseVector({ values: [1, 'string'], indices: [0, 1], numDimensions: 4 });
      await assert.rejects(
        async () => await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col) VALUES(1, :1)`, [invalidVec]),
        /ORA-51805:|ORA-51831:/
        /*
            ORA-51805: Invalid syntax for VECTOR value. The specified dimension value at position
            could not be converted to a number.
        */
      );
    }); // 309.1.9

    it('309.1.10 Sparse Vector Retrieval in Different Formats', async function() {
      const sparseVec = new oracledb.SparseVector({ values: [1.5, 2.5], indices: [0, 1], numDimensions: 4 });
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector64Col) VALUES(1, :1)`, [sparseVec]);

      //const sparseVec1 = new oracledb.SparseVector('[4,[0,1],[1.5,2.5]]');
      //await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector64Col) VALUES(1, :1)`, [sparseVec1]);

      let result = await connection.execute(`SELECT FROM_VECTOR(SparseVector64Col RETURNING CLOB FORMAT SPARSE) FROM ${tableName}`);
      let lob = result.rows[0][0];
      let clobData = await lob.getData();
      assert.strictEqual(clobData, '[4,[0,1],[1.5E+000,2.5E+000]]');

      result = await connection.execute(`SELECT FROM_VECTOR(SparseVector64Col RETURNING CLOB FORMAT DENSE) FROM ${tableName}`);
      lob = result.rows[0][0];
      clobData = await lob.getData();
      assert.strictEqual(clobData, '[1.5E+000,2.5E+000,0,0]');
    }); // 309.1.10

    it('309.1.11 Update Sparse Vectors', async function() {
      const sparseVec1 = new oracledb.SparseVector({ values: [1.5], indices: [0], numDimensions: 4 });
      const sparseVec2 = new oracledb.SparseVector({ values: [2.5], indices: [3], numDimensions: 4 });

      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector64Col) VALUES(1, :1)`, [sparseVec1]);
      await connection.execute(`UPDATE ${tableName} SET SparseVector64Col = :1 WHERE IntCol = 1`, [sparseVec2]);

      const result = await connection.execute(`SELECT SparseVector64Col FROM ${tableName} WHERE IntCol = 1`);
      assert.deepStrictEqual(result.rows[0][0].dense(), new Float64Array([0, 0, 0, 2.5]));
    }); // 309.1.11

    it('309.1.12 Bulk Inserts and Performance', async function() {
      const sparseVec = new oracledb.SparseVector({ values: [1.5], indices: [0], numDimensions: 4 });

      const binds = Array(100).fill({ IntCol: 1, SparseVector64Col: sparseVec });
      await connection.executeMany(`INSERT INTO ${tableName} (IntCol, SparseVector64Col) VALUES (:IntCol, :SparseVector64Col)`, binds);
      const result = await connection.execute(`SELECT COUNT(*) FROM ${tableName}`);
      assert.strictEqual(result.rows[0][0], 100);
    }); // 309.1.12

    it('309.1.13 Complex Sparse Vector Structures', async function() {
      const sparseVec = new oracledb.SparseVector({ values: [1.5, 3.5], indices: [0, 99], numDimensions: 100 });
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col) VALUES(1, :1)`, [sparseVec]);

      const result = await connection.execute(`SELECT SparseVectorFlex64Col FROM ${tableName}`);
      assert.deepStrictEqual(result.metaData[0], metaDataFloat64Flex);
      const dense = result.rows[0][0].dense();
      const expectedDense = new Float64Array(100);
      expectedDense[0] = 1.5;
      expectedDense[99] = 3.5;
      assert.deepStrictEqual(dense, expectedDense);
    }); // 309.1.13

    it('309.1.14 Index Validation', function() {
      // Bug: 37294428
      // object SparseVector from POJO
      assert.throws(
        () =>  new oracledb.SparseVector({ values: [1.5], indices: [6], numDimensions: 4 }),
        /NJS-165:/ // NJS-165: SPARSE VECTOR indices element at index 0 is not valid
      );

      assert.throws(
        () => new oracledb.SparseVector('[4,[6],[1.5]]'),
        /NJS-165:/
        /*
          NJS-165: SPARSE VECTOR indices element at index 0 is not valid
        */
      );
    }); // 309.1.14

    it('309.1.15 Negative test with SQL Syntax', async function() {
      await assert.rejects(
        async () => await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector64Col) VALUES(1, '[1,2,3]')`),
        /ORA-51833:/
        // ORA-51833: Textual input conversion between sparse and dense vector is not supported.
      );
    }); // 309.1.15

    it('309.1.16 Consistency Across Operations', async function() {
      const sparseVec = new oracledb.SparseVector({ values: [1.5, 2.5], indices: [0, 1], numDimensions: 4 });
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col) VALUES(1, :1)`, [sparseVec]);
      const result = await connection.execute(`SELECT SparseVectorFlex64Col FROM ${tableName}`);
      const roundTripVec = result.rows[0][0];
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col) VALUES(2, :1)`, [roundTripVec]);
      const finalResult = await connection.execute(`SELECT SparseVectorFlex64Col FROM ${tableName} WHERE IntCol = 2`);
      assert.deepStrictEqual(finalResult.rows[0][0].dense(), sparseVec.dense());
    }); // 309.1.16

    it('309.1.17 Floating Point Precision and Edge Cases', async function() {
      // Test extremely small and large float64 values
      const sparseVecSmall = new oracledb.SparseVector({
        values: [Number.MIN_VALUE, -Number.MIN_VALUE],
        indices: [0, 3],
        numDimensions: 4
      });

      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col) VALUES(1, :1)`, [sparseVecSmall]);
      const result = await connection.execute(`SELECT SparseVectorFlex64Col FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0].dense()[0], Number.MIN_VALUE);
      assert.deepStrictEqual(result.rows[0][0].dense()[3], -Number.MIN_VALUE);

      // Test NaN and Infinity handling
      const sparseVecSpecial = new oracledb.SparseVector({
        values: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN],
        indices: [0, 1, 2],
        numDimensions: 4
      });

      await assert.rejects(
        async () => await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col) VALUES(2, :1)`,
          [sparseVecSpecial]),
        /ORA-51805:|ORA-51831:/
        /*
              ORA-51805: Invalid syntax for VECTOR value.
              The specified dimension value at position  could not be converted to a number.
          */
      );
    }); // 309.1.17

    it('309.1.18 Repeated Indices Handling', async function() {
      await assert.rejects(
        async () => await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col)
          VALUES(1, :1)`, [new oracledb.SparseVector({
          values: [1.5, 2.5],
          indices: [0, 0],
          numDimensions: 4
        })]),
        /ORA-51822:/
        /*
          ORA-51822: The index values in sparse vector are not in strictly ascending order.
        */
      );

      // Object SparseVector repeated values in indices
      const invalidVec = new oracledb.SparseVector('[4,[0,0],[1.5,2.5]]');
      await assert.rejects(
        async () => await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col) VALUES(1, :1)`,
          [invalidVec]),
        /ORA-51822:/
        /*
          ORA-51822: The index values in sparse vector are not in strictly ascending order.
        */
      );
    }); // 309.1.18

    it('309.1.19 Large Number of Sparse Entries', async function() {
      // Create a very sparse vector with many non-zero entries
      const largeValues = Array.from({length: 100}, (_, i) => i * 1.5);
      const largeIndices = Array.from({length: 100}, (_, i) => i * 10);

      const largeSparseVec = new oracledb.SparseVector({
        values: largeValues,
        indices: largeIndices,
        numDimensions: 1000
      });

      await connection.execute(
        `INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col)
        VALUES(1, :1)`,
        [largeSparseVec]
      );

      const result = await connection.execute(
        `SELECT SparseVectorFlex64Col FROM ${tableName}`
      );

      const dense = result.rows[0][0].dense();
      largeValues.forEach((val, idx) => {
        assert.strictEqual(dense[largeIndices[idx]], val);
      });
    }); // 309.1.19

    it('309.1.20 Negative Index Range Validation', async function() {
      // Test strict validation of index ranges
      await assert.rejects(
        async () => await connection.execute(
          `INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col)
          VALUES(1, :1)`,
          [new oracledb.SparseVector({
            values: [1.5],
            indices: [-1],
            numDimensions: 4
          })]
        ),
        /NJS-165:|ORA-51836:/ // NJS-165: SPARSE VECTOR indices element at index 0 is not valid
      );
    }); // 309.1.20

    it('309.1.21 Mixed Array Type Conversions', async function() {
      // Test conversion of mixed numeric arrays
      const mixedValues = [1, 2.5, 3, 4.7];
      const sparseVecMixed = new oracledb.SparseVector({
        values: mixedValues,
        indices: [0, 1, 2, 3],
        numDimensions: 4
      });

      await connection.execute(
        `INSERT INTO ${tableName} (IntCol, SparseVectorFlex64Col)
        VALUES(1, :1)`,
        [sparseVecMixed]
      );

      const result = await connection.execute(
        `SELECT SparseVectorFlex64Col FROM ${tableName}`
      );

      assert.deepStrictEqual(
        result.rows[0][0].dense(),
        new Float64Array(mixedValues)
      );
    }); // 309.1.21
  });

  describe('309.2 Verify Sparse Vectors with float32', function() {
    it('309.2.1 Insert and retrieve sparse vector', async function() {
      const sparseVec = new oracledb.SparseVector({ values: [1.5, 2.5], indices: [0, 3], numDimensions: 4 });
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector32Col) VALUES(1, :1)`, [sparseVec]);

      const result = await connection.execute(`SELECT SparseVector32Col FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0].dense(), new Float32Array([1.5, 0, 0, 2.5]));
      assert.deepStrictEqual(result.rows[0][0].indices, new Uint32Array([0, 3]));
      assert.deepStrictEqual(result.rows[0][0].values, new Float32Array([1.5, 2.5]));
      assert.deepStrictEqual(result.metaData[0], metaDataFloat32);
    });

    it('309.2.2 Negative test with invalid vector type', async function() {
      const invalidVec = new oracledb.SparseVector({ values: [1.5, 'string'], indices: [0, 1], numDimensions: 4 });
      await assert.rejects(
        async () => await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector32Col) VALUES(1, :1)`, [invalidVec]),
        /ORA-51805:|ORA-51831:/
        /*
            ORA-51805: Invalid syntax for VECTOR value. The specified dimension value at position
            could not be converted to a number.
        */
      );
    });

    it('309.2.3 Test with boundary values', async function() {
      const sparseVec = new oracledb.SparseVector({ values: [1.5, 2.5, 3, 4.5], indices: [0, 1, 2, 3], numDimensions: 4});
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector32Col) VALUES(1, :1)`, [sparseVec]);

      const result = await connection.execute(`SELECT SparseVector32Col FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0].dense(), new Float32Array([1.5, 2.5, 3, 4.5]));
      assert.deepStrictEqual(result.metaData[0], metaDataFloat32);

      // Different SPARSE VECTOR indices and values
      assert.throws(
        () =>  new oracledb.SparseVector({ values: [1.5, 2.5, 3, 4.5], indices: [1], numDimensions: 4}),
        /NJS-161:/ // NJS-161: SPARSE VECTOR indices and values must be of same length
      );

      // Different SPARSE VECTOR dimensions and column dimensions
      assert.throws(
        () => new oracledb.SparseVector({ values: [1.5, 2.5, 3, 4.5], indices: [0, 1, 2, 3], numDimensions: 1}),
        /NJS-165:/ // NJS-165: SPARSE VECTOR indices element at index 1 is not valid
      );
    });

    it('309.2.4 Bulk insert and validate performance', async function() {
      const sparseVec = new oracledb.SparseVector({ values: [1.5], indices: [0], numDimensions: 4});

      const binds = Array(100).fill({ IntCol: 1, SparseVector32Col: sparseVec });
      await connection.executeMany(`INSERT INTO ${tableName} (IntCol, SparseVector32Col) VALUES (:IntCol, :SparseVector32Col)`, binds);
      const result = await connection.execute(`SELECT COUNT(*) FROM ${tableName}`);
      assert.strictEqual(result.rows[0][0], 100);
    });

    it('309.2.5 Different object formats for sparse float32 data', async function() {
      const typedFloat = new Float32Array([1, 3.4]);
      const regFloatArray = [1, 3.4];
      let id = 1;
      let sparsevec = new oracledb.SparseVector({
        values: typedFloat,
        indices: [1, 3],
        numDimensions: 4
      });

      await connection.execute(
        `INSERT INTO ${tableName} (IntCol, SparseVector32Col)
           VALUES(${id}, :1)`, [sparsevec]);
      let result = await connection.execute(
        `SELECT SparseVector32Col FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0].dense(),
        new Float32Array([0, 1, 0, 3.4]));
      assert.deepStrictEqual(result.metaData[0], metaDataFloat32);

      // Test with regular array values
      sparsevec = new oracledb.SparseVector({
        values: regFloatArray,
        indices: [1, 3],
        numDimensions: 4
      });
      id = id + 1;
      await connection.execute(
        `INSERT INTO ${tableName} (IntCol, SparseVector32Col)
           VALUES(${id}, :1)`, [sparsevec]);
      result = await connection.execute(
        `SELECT SparseVector32Col FROM ${tableName} where IntCol = ${id}`);
      assert.deepStrictEqual(result.rows[0][0].dense(),
        new Float32Array([0, 1, 0, 3.4]));

      // Test with typed indices array
      id = id + 1;
      assert.throws(
        () => new oracledb.SparseVector({
          values: typedFloat,
          indices: new Float32Array([1, 3]),
          numDimensions: 4
        }),
        /NJS-158:/ // NJS-158: SPARSE VECTOR indices is not Uint32Array or an Array
      );

      sparsevec = new oracledb.SparseVector({
        values: typedFloat,
        indices: new Uint32Array([1, 3]),
        numDimensions: 4
      });
      await connection.execute(
        `INSERT INTO ${tableName} (IntCol, SparseVector32Col)
           VALUES(${id}, :1)`, [sparsevec]);
      result = await connection.execute(
        `SELECT SparseVector32Col FROM ${tableName} where IntCol = ${id}`);
      assert.deepStrictEqual(result.rows[0][0].dense(),
        new Float32Array([0, 1, 0, 3.4]));
    });

    it('309.2.6 String type for sparse float32 data', async function() {
      // Bug: 37320900
      const sparseData = '[4, [0, 1, 3], [1.5, 3.5, 7.7]]';
      const sparsevec = new oracledb.SparseVector(sparseData, 'float32');
      const id = 1;

      await connection.execute(
        `INSERT INTO ${tableName} (IntCol, SparseVector32Col)
           VALUES(${id}, :1)`, [sparsevec]);

      const result = await connection.execute(
        `SELECT SparseVector32Col FROM ${tableName}`);

      assert.deepStrictEqual(result.rows[0][0].dense(),
        new Float32Array([1.5, 3.5, 0, 7.7]));

      assert.deepStrictEqual(result.rows[0][0].indices,
        new Uint32Array([0, 1, 3]));
      assert.deepStrictEqual(result.rows[0][0].values,
        new Float32Array([1.5, 3.5, 7.7]));

      assert.deepStrictEqual(result.metaData[0], metaDataFloat32);

      // Test invalid string format
      assert.throws(
        () => new oracledb.SparseVector('Invalid format', 'float32'),
        /NJS-162:/
      );
    });

    it('309.2.7 Update on float32 sparse vectors', async function() {
      const sparseVec1 = new oracledb.SparseVector({
        values: [1.5],
        indices: [0],
        numDimensions: 4
      });
      const sparseVec2 = new oracledb.SparseVector({
        values: [2.5],
        indices: [3],
        numDimensions: 4
      });

      await connection.execute(
        `INSERT INTO ${tableName} (IntCol, SparseVector32Col)
           VALUES(1, :1)`, [sparseVec1]);
      await connection.execute(
        `UPDATE ${tableName}
           SET SparseVector32Col = :1
           WHERE IntCol = 1`, [sparseVec2]);

      const result = await connection.execute(
        `SELECT SparseVector32Col FROM ${tableName} WHERE IntCol = 1`);
      assert.deepStrictEqual(result.rows[0][0].dense(),
        new Float32Array([0, 0, 0, 2.5]));
      assert.deepStrictEqual(result.metaData[0], metaDataFloat32);
    });

    it('309.2.8 Conversion between float32 and float64', async function() {
      const float32Vec = new oracledb.SparseVector({
        values: [1.5, 2.5],
        indices: [0, 3],
        numDimensions: 4
      });

      const float64Vec = new oracledb.SparseVector({
        values: [1.5, 2.5],
        indices: [0, 3],
        numDimensions: 4
      });

      await connection.execute(
        `INSERT INTO ${tableName}
           (IntCol, SparseVector32Col, SparseVector64Col)
           VALUES(1, :1, :2)`, [float32Vec, float64Vec]);

      const result = await connection.execute(
        `SELECT SparseVector32Col, SparseVector64Col
           FROM ${tableName}`);

      assert.deepStrictEqual(result.metaData[0], metaDataFloat32);
      assert.deepStrictEqual(result.metaData[1], metaDataFloat64);

      // Compare the dense representations
      const float32Dense = result.rows[0][0].dense();
      const float64Dense = result.rows[0][1].dense();

      assert.strictEqual(float32Dense.length, float64Dense.length);
      for (let i = 0; i < float32Dense.length; i++) {
        assert.deepStrictEqual(float32Dense[i], float64Dense[i], 0.0001);
      }
    });

    it('309.2.9 Different dense arrays format for sparse float32 data', async function() {
      await connection.execute(`TRUNCATE TABLE ${tableName}`);
      const inpData = [
        new Float32Array([1, 0, 34, 0]),
        new Float32Array([1, 34]),
        new Float32Array([1, 0, 34, 0]),
        new Float32Array([1, 34]),
        new Float32Array([1, 34]),
        new Int8Array([1, 15]),
        [1, 0, 34, 0],
        [1, 34]
      ];
      async function insertData(index, dense, sparseVec, metaData) {
        await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex32Col)
          VALUES(1, :1)`, [sparseVec]);
        const result = await connection.execute(`SELECT SparseVectorFlex32Col FROM ${tableName}`);
        const numRows = result.rows.length;
        assert.deepStrictEqual(Array.from(result.rows[numRows - 1][0].dense()), Array.from(sparseVec.dense()));
        assert.deepStrictEqual(result.rows[numRows - 1][0].indices, new Uint32Array(sparseVec.indices));
        assert.deepStrictEqual(Array.from(result.rows[numRows - 1][0].values), Array.from(sparseVec.values));
        assert.deepStrictEqual(result.metaData[0], metaData);
      }

      for (let index = 0; index < inpData.length; index = index + 2) {
        await insertData(index, true, new oracledb.SparseVector(inpData[index], 'float32'), metaDataFloat32Flex);
        const values = inpData[index + 1];
        const indices = [0, 2];
        const sparseVector = new oracledb.SparseVector({
          values: values,
          indices: indices,
          numDimensions: 16
        });
        await insertData(index, false, sparseVector, metaDataFloat32Flex);
      }

      const arr = [1, 0, 3.4, 0];
      const i16arr = new Int16Array(arr);
      assert.throws(
        () => new oracledb.SparseVector(i16arr, 'float32'),
        /NJS-164:/ // SPARSE VECTOR Invalid Input Data
      );
      const i16arrSparse = new Int16Array([1, 3.4]);
      assert.throws(
        () => new oracledb.SparseVector({values: i16arrSparse, indices: [0, 2], numDimensions: 4}),
        /NJS-159:/ // Error: NJS-159: SPARSE VECTOR values is not an Array
      );
    }); // 309.2.9

    it('309.2.10 Negative tests for sparse float32 data', async function() {
      let sparseVec = new oracledb.SparseVector(null, 'float32');
      await assert.rejects(
        async () => await connection.execute(
          `INSERT INTO ${tableName} (IntCol, SparseVectorFlex32Col)
            VALUES(1, :1)`, [sparseVec]),
        /ORA-51836:|ORA-21560:|ORA-51803:/
        /*
          ORA-51803: Vector dimension count must match the dimension count specified in the column
          definition (expected  dimensions, specified  dimensions).
        */
      );

      sparseVec = null;
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex32Col)
            VALUES(1, :1)`, [sparseVec]);
      const result = await connection.execute(`SELECT SparseVectorFlex32Col FROM ${tableName}`);
      const numRows = result.rows.length;
      assert.deepStrictEqual(result.rows[numRows - 1][0], null);
      assert.deepStrictEqual(result.metaData[0], metaDataFloat32Flex);

      // Check with negative values in indices array
      assert.throws(
        () => new oracledb.SparseVector({values: new Float32Array([1, 34]), indices: [0, -2], numDimensions: 4}),
        /NJS-165:/ // Error: NJS-165: SPARSE VECTOR indices element at index 1 is not valid
      );

      assert.throws(
        () => new oracledb.SparseVector({values: new Float32Array([1, 34]), indices: [0, '1'], numDimensions: 4}),
        /NJS-165:/ // NJS-165: SPARSE VECTOR indices element at index 1 is not valid
      );

      assert.throws(
        () => new oracledb.SparseVector(Buffer.from('Invalid Array'), 'float32'),
        /NJS-164:/ // NJS-164: SPARSE VECTOR Invalid Input Data
      );
    }); // 309.2.10

    it('309.2.11 Boundary values for sparse float32 vector dimensions', async function() {
      // Minimum dimensions
      const sparseVecMin = new oracledb.SparseVector({ values: [1.5], indices: [0], numDimensions: 1});
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex32Col)
          VALUES(1, :1)`, [sparseVecMin]);
      let result = await connection.execute(`SELECT SparseVectorFlex32Col FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0].dense(), new Float32Array([1.5]));

      // Maximum dimensions (1000 dimensions)
      const sparseVecMax = new oracledb.SparseVector({ values: [1.5, 2.5], indices: [0, 999], numDimensions: 1000});
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex32Col)
          VALUES(2, :1)`, [sparseVecMax]);
      result = await connection.execute(`SELECT SparseVectorFlex32Col FROM ${tableName} WHERE IntCol = 2`);
      assert.deepStrictEqual(result.rows[0][0].dense(), (() => {
        const arr = new Float32Array(1000);
        arr[0] = 1.5;
        arr[999] = 2.5;
        return arr;
      })());
    }); // 309.2.11

    it('309.2.12 Empty Vectors for float32', async function() {
      const sparseVecEmpty = new oracledb.SparseVector({ values: [], indices: [], numDimensions: 4});

      await assert.rejects(
        async () => await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex32Col) VALUES(1, :1)`, [sparseVecEmpty]),
        /ORA-51803:|ORA-21560:/
      );
    }); // 309.2.12

    it('309.2.13 Complex Sparse Vector Structures for float32', async function() {
      const sparseVec = new oracledb.SparseVector({ values: [1.5, 3.5], indices: [0, 99], numDimensions: 100});
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex32Col) VALUES(1, :1)`, [sparseVec]);

      const result = await connection.execute(`SELECT SparseVectorFlex32Col FROM ${tableName}`);
      assert.deepStrictEqual(result.metaData[0], metaDataFloat32Flex);
      const dense = result.rows[0][0].dense();
      const expectedDense = new Float32Array(100);
      expectedDense[0] = 1.5;
      expectedDense[99] = 3.5;
      assert.deepStrictEqual(dense, expectedDense);
    }); // 309.2.13

    it('309.2.14 Floating Point Precision and Edge Cases for Float32', async function() {
      // Test extremely small and large float32 values
      const sparseVecSmall = new oracledb.SparseVector({
        values: [Number.MIN_VALUE, -Number.MIN_VALUE],
        indices: [0, 3],
        numDimensions: 4
      });
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex32Col) VALUES(1, :1)`, [sparseVecSmall]);
      const result = await connection.execute(`SELECT SparseVectorFlex32Col FROM ${tableName}`);

      // Float32 has lower precision
      assert.ok(Math.abs(result.rows[0][0].dense()[0] - Number.MIN_VALUE) < Number.EPSILON);
      assert.ok(Math.abs(result.rows[0][0].dense()[3] - (-Number.MIN_VALUE)) < Number.EPSILON);

      // Test NaN and Infinity handling
      const sparseVecSpecial = new oracledb.SparseVector({
        values: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN],
        indices: [0, 1, 2],
        numDimensions: 4
      });

      await assert.rejects(
        async () => await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex32Col) VALUES(2, :1)`,
          [sparseVecSpecial]),
        /ORA-51805:|ORA-51831:/
        /*
              ORA-51805: Invalid syntax for VECTOR value.
              The specified dimension value at position could not be converted to a number.
          */
      );
    }); // 309.2.14

    it('309.2.15 Boundary Values for Float32', async function() {
      // Test minimum dimensions
      const sparseVecMin = new oracledb.SparseVector({
        values: [1.5],
        indices: [0],
        numDimensions: 1
      });
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex32Col) VALUES(4, :1)`, [sparseVecMin]);
      let result = await connection.execute(`SELECT SparseVectorFlex32Col FROM ${tableName} WHERE IntCol = 4`);
      assert.deepStrictEqual(result.rows[0][0].dense(), new Float32Array([1.5]));

      // Test maximum dimensions
      const sparseVecMax = new oracledb.SparseVector({
        values: [1.5, 2.5],
        indices: [0, 999],
        numDimensions: 1000
      });
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex32Col) VALUES(5, :1)`, [sparseVecMax]);
      result = await connection.execute(`SELECT SparseVectorFlex32Col FROM ${tableName} WHERE IntCol = 5`);

      const expectedDense = new Float32Array(1000);
      expectedDense[0] = 1.5;
      expectedDense[999] = 2.5;
      assert.deepStrictEqual(result.rows[0][0].dense(), expectedDense);
    }); // 309.2.15

    it('309.2.16 Mixed Numeric Type Conversions for Float32', async function() {
      // Test conversion of mixed numeric arrays with potential float32 precision issues
      const mixedValues = [1, 2.5, 3, 4.7];
      const sparseVecMixed = new oracledb.SparseVector({
        values: mixedValues,
        indices: [0, 1, 2, 3],
        numDimensions: 4
      });

      await connection.execute(
        `INSERT INTO ${tableName} (IntCol, SparseVectorFlex32Col)
        VALUES(6, :1)`,
        [sparseVecMixed]
      );

      const result = await connection.execute(
        `SELECT SparseVectorFlex32Col FROM ${tableName} WHERE IntCol = 6`
      );

      // Convert to Float32Array to ensure correct type
      const expectedDense = new Float32Array(mixedValues);
      assert.deepStrictEqual(
        result.rows[0][0].dense(),
        expectedDense
      );
    }); // 309.2.16

    it('309.2.17 Negative Scenarios for Float32', async function() {
      // Test invalid input types
      await assert.rejects(
        async () => await connection.execute(
          `INSERT INTO ${tableName} (IntCol, SparseVectorFlex32Col)
          VALUES(7, :1)`,
          [new oracledb.SparseVector({
            values: [1, 'string'],
            indices: [0, 1],
            numDimensions: 4
          })]
        ),
        /ORA-51836:|ORA-51831:|ORA-51805:/
        /*
            ORA-51805: Invalid syntax for VECTOR value. The specified dimension value at position
            could not be converted to a number.
        */
      );

      // Test with indices out of range
      await assert.rejects(
        async () => await connection.execute(
          `INSERT INTO ${tableName} (IntCol, SparseVectorFlex32Col)
          VALUES(8, :1)`,
          [new oracledb.SparseVector({
            values: [1.5],
            indices: [6],
            numDimensions: 4
          })]
        ),
        /NJS-165:|ORA-51836:/ // NJS-165: SPARSE VECTOR indices element at index 0 is not valid
      );
    }); // 309.2.17

    it('309.2.18 Large Number of Sparse Entries for Float32', async function() {
      // Create a very sparse vector with many non-zero entries
      const largeValues = Array.from({length: 100}, (_, i) => i * 1.5);
      const largeIndices = Array.from({length: 100}, (_, i) => i * 10);

      const largeSparseVec = new oracledb.SparseVector({
        values: largeValues,
        indices: largeIndices,
        numDimensions: 1000
      });

      await connection.execute(
        `INSERT INTO ${tableName} (IntCol, SparseVectorFlex32Col)
        VALUES(9, :1)`,
        [largeSparseVec]
      );

      const result = await connection.execute(
        `SELECT SparseVectorFlex32Col FROM ${tableName} WHERE IntCol = 9`
      );

      const dense = result.rows[0][0].dense();
      largeValues.forEach((val, idx) => {
        assert.ok(Math.abs(dense[largeIndices[idx]] - val) < Number.EPSILON);
      });
    }); // 309.2.18

    it('309.2.19 Conversion Between Float32 and Other Types', async function() {
      // Test conversion from different arrays to float32
      const testCases = [
        new Int8Array([1, -2, 3, -4]),
        [1.1, 2.2, 3.3, 4.4]
      ];

      let intColVal = 19;
      for (const testCase of testCases) {
        const sparseVec = new oracledb.SparseVector({
          values: testCase,
          indices: [0, 1, 2, 3],
          numDimensions: 4
        });
        await connection.execute(
          `INSERT INTO ${tableName} (IntCol, SparseVectorFlex32Col)
          VALUES(${intColVal}, :1)`,
          [sparseVec]
        );
        const result = await connection.execute(
          `SELECT SparseVectorFlex32Col FROM ${tableName} WHERE IntCol = ${intColVal}`
        );

        const expectedDense = new Float32Array(testCase);
        assert.deepStrictEqual(
          result.rows[0][0].dense(),
          expectedDense
        );
        ++intColVal;
      }
    }); // 309.2.19

    it('309.2.20 bind and read the sparse data', async function() {
      const binds = [
        { type: oracledb.DB_TYPE_VECTOR, val: new oracledb.SparseVector([1, 0, 3.4, 0]) }
      ];
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector64Col)
            VALUES(1, :1)`, binds);
      const result = await connection.execute(`SELECT SparseVector64Col FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0].dense(), new Float64Array([1, 0, 3.4, 0]));
      assert.deepStrictEqual(result.metaData[0], metaDataFloat64);
    }); // 309.2.20

    it('309.2.21 Different object format for sparse data', async function() {
      const typedFloat = new Float64Array([1, 3.4]);
      const regFloatArray = [1, 3.4];
      let id = 1;
      let sparsevec = new oracledb.SparseVector({values: typedFloat, indices: [1, 3], numDimensions: 4});

      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector64Col)
            VALUES(${id}, :1)`, [sparsevec]);
      let result = await connection.execute(`SELECT SparseVector64Col FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0].dense(), new Float64Array([0, 1, 0, 3.4]));
      assert.deepStrictEqual(result.metaData[0], metaDataFloat64);

      sparsevec = new oracledb.SparseVector({values: regFloatArray, indices: [1, 3], numDimensions: 4});
      const dense = sparsevec.dense();
      assert.deepStrictEqual(dense, new Float64Array([0, 1, 0, 3.4]));

      id += 1;
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector64Col)
            VALUES(${id}, :1)`, [sparsevec]);
      result = await connection.execute(`SELECT SparseVector64Col FROM ${tableName} WHERE IntCol = ${id}`);
      assert.deepStrictEqual(result.rows[0][0].dense(), new Float64Array([0, 1, 0, 3.4]));
      assert.deepStrictEqual(result.metaData[0], metaDataFloat64);
    }); // 309.2.21

    it('309.2.22 insert float64 vector with 65533 dimensions', async function() {
      const value = new oracledb.SparseVector({
        values: new Float64Array([1, 0, 5]),
        indices: [1, 3, 5],
        numDimensions: 65533
      });

      await connection.execute(
        `INSERT INTO ${tableName} (IntCol, SparseVectorFlexAllCol) VALUES (1, :1)`,
        [value]
      );

      const result = await connection.execute(
        `SELECT SparseVectorFlexAllCol FROM ${tableName} WHERE IntCol = 1`
      );
      assert.deepStrictEqual(Array.from(result.rows[0][0].values), Array.from(value.values));
      assert.deepStrictEqual(result.rows[0][0].indices, new Uint32Array(value.indices));
    }); // 309.2.22

    it('309.2.23 insert float32 vector with 65533 dimensions', async function() {
      const value = new oracledb.SparseVector({
        values: new Float32Array([1, 0, 5]),
        indices: [1, 3, 5],
        numDimensions: 65533
      });

      await connection.execute(
        `INSERT INTO ${tableName} (IntCol, SparseVectorFlexAllCol) VALUES (2, :1)`,
        [value]
      );

      const result = await connection.execute(
        `SELECT SparseVectorFlexAllCol FROM ${tableName} WHERE IntCol = 2`
      );
      assert.deepStrictEqual(Array.from(result.rows[0][0].values), Array.from(value.values));
      assert.deepStrictEqual(result.rows[0][0].indices, new Uint32Array(value.indices));
    }); // 309.2.23

    it('309.2.24 insert int8 vector with 65533 dimensions', async function() {
      const value = new oracledb.SparseVector({
        values: new Int8Array([1, 0, 5]),
        indices: [1, 3, 5],
        numDimensions: 65533
      });

      await connection.execute(
        `INSERT INTO ${tableName} (IntCol, SparseVectorFlexAllCol) VALUES (3, :1)`,
        [value]
      );

      const result = await connection.execute(
        `SELECT SparseVectorFlexAllCol FROM ${tableName} WHERE IntCol = 3`
      );
      assert.deepStrictEqual(Array.from(result.rows[0][0].values), Array.from(value.values));
      assert.deepStrictEqual(result.rows[0][0].indices, new Uint32Array(value.indices));
    }); // 309.2.24

    it('309.2.25 insert vectors with different dimensions', async function() {
      const dimensions = [30, 70, 255, 256, 65534, 65535];
      const types = [Float32Array, Float64Array, Int8Array];

      for (let i = 0; i < dimensions.length; i++) {
        for (let j = 0; j < types.length; j++) {
          const dim = dimensions[i];
          const TypedArray = types[j];
          const elementValue = TypedArray === Int8Array ? 3 : 1.5;

          const value = new oracledb.SparseVector({
            values: new TypedArray([elementValue, elementValue, elementValue]),
            indices: [1, 3, 5],
            numDimensions: dim
          });

          await connection.execute(
            `INSERT INTO ${tableName} (IntCol, SparseVectorFlexAllCol) VALUES (:1, :2)`,
            [i * types.length + j + 4, value]
          );

          const result = await connection.execute(
            `SELECT SparseVectorFlexAllCol FROM ${tableName} WHERE IntCol = :1`,
            [i * types.length + j + 4]
          );

          assert.deepStrictEqual(Array.from(result.rows[0][0].values), Array.from(value.values));
          assert.deepStrictEqual(result.rows[0][0].indices, new Uint32Array(value.indices));
        }
      }
    }); // 309.2.25

    it('309.2.26 declare SparseVector with indices and values of different length', function() {
      assert.throws(
        () => new oracledb.SparseVector({
          values: [1.5, 3.5],
          indices: [1],
          numDimensions: 10
        }),
        /NJS-161:/
        // NJS-161: SPARSE VECTOR indices and values must be of same length
      );

      assert.throws(
        () => new oracledb.SparseVector({
          values: [6.75],
          indices: [1, 2, 3, 4],
          numDimensions: 10
        }),
        /NJS-161:/
        // NJS-161: SPARSE VECTOR indices and values must be of same length
      );

      assert.throws(
        () => new oracledb.SparseVector({
          values: [1.5, 2.5],
          indices: [1, 2],
          numDimensions: 0
        }),
        /NJS-160:/
        // NJS-160: SPARSE VECTOR dimensions is not an Positive Integer
      );
    }); // 309.2.26

    it('309.2.27 test select with vector returns expected format and type', async function() {
      const columnNames = [
        'SparseVector32Col',
        'SparseVector64Col',
        'SparseVectorFlex8Col',
        'SparseVectorFlex32Col',
        'SparseVectorFlex64Col',
        'SparseVectorFlexAllCol'
      ];

      const vectors = [
        new Float32Array([1, 2, 3, 4]),
        new oracledb.SparseVector({
          values: new Float32Array([9]),
          indices: [1],
          numDimensions: 4
        })
      ];
      let val = 1000;
      for (const vector of vectors) {
        for (const columnName of columnNames) {
          const value = vector instanceof Float32Array ?
            new oracledb.SparseVector(vector) :
            vector;
          await connection.execute(
            `INSERT INTO ${tableName} (IntCol, ${columnName}) VALUES (:1, :2)`,
            [val, value]
          );
          const result = await connection.execute(
            `SELECT ${columnName} FROM ${tableName} WHERE IntCol = ${val}`
          );
          assert(result.rows[0][0] instanceof oracledb.SparseVector);
          assert.strictEqual(result.rows[0][0].numDimensions, 4);
          ++val;
        }
      }
    }); // 309.2.27
  });

  describe('309.3 Verify Sparse Vectors with int8', function() {
    it('309.3.1 bind and read sparse data with int8', async function() {
      const sparseVec = new oracledb.SparseVector({ values: new Int8Array([1, -3]), indices: [0, 5], numDimensions: 16 });

      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector8Col)
            VALUES(1, :1)`, [sparseVec]);
      const result = await connection.execute(`SELECT SparseVector8Col FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0].dense(), new Int8Array([1, 0, 0, 0, 0, -3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
      assert.deepStrictEqual(result.metaData[0], metaDataInt8);
    }); // 309.3.1

    it('309.3.2 verify flex dimensions with int8', async function() {
      const sparseVecFlex = new oracledb.SparseVector({ values: new Int8Array([2, 4]), indices: [2, 10], numDimensions: 12 });

      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex8Col)
            VALUES(1, :1)`, [sparseVecFlex]);
      const result = await connection.execute(`SELECT SparseVectorFlex8Col FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0].dense(), new Int8Array([0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 4, 0]));
      assert.deepStrictEqual(result.metaData[0], metaDataInt8Flex);
    }); // 309.3.2

    it('309.3.3 handle empty sparse vectors with int8', async function() {
      const sparseVecEmpty = new oracledb.SparseVector({ values: [], indices: [], numDimensions: 8 });

      await assert.rejects(
        async () => await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector8Col) VALUES(1, :1)`, [sparseVecEmpty]),
        /ORA-51803:|ORA-21560:/
      );
    }); // 309.3.3

    it('309.3.4 negative indices with int8', function() {
      assert.throws(
        () => new oracledb.SparseVector({ values: new Int8Array([3, 5]), indices: [1, -2], numDimensions: 8 }),
        /NJS-165:/
        // NJS-165: SPARSE VECTOR indices element at index 1 is not valid
      );
    }); // 309.3.4

    it('309.3.5 retrieve int8 vector as JSON-like string', async function() {
      const sparseVec = new oracledb.SparseVector({ values: new Int8Array([1, 7]), indices: [3, 9], numDimensions: 12 });

      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex8Col) VALUES(1, :1)`, [sparseVec]);
      const result = await connection.execute(`SELECT FROM_VECTOR(SparseVectorFlex8Col RETURNING CLOB FORMAT SPARSE) FROM ${tableName}`);
      const lob = result.rows[0][0];
      const clobData = await lob.getData();
      assert.strictEqual(clobData, '[12,[3,9],[1,7]]');
    }); // 309.3.5

    it('309.3.6 update int8 sparse vectors', async function() {
      const sparseVec1 = new oracledb.SparseVector({ values: new Int8Array([3]), indices: [0], numDimensions: 16 });
      const sparseVec2 = new oracledb.SparseVector({ values: new Int8Array([-1]), indices: [7], numDimensions: 16 });

      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector8Col) VALUES(1, :1)`, [sparseVec1]);
      await connection.execute(`UPDATE ${tableName} SET SparseVector8Col = :1 WHERE IntCol = 1`, [sparseVec2]);

      const result = await connection.execute(`SELECT SparseVector8Col FROM ${tableName} WHERE IntCol = 1`);
      assert.deepStrictEqual(result.rows[0][0].dense(), new Int8Array([0, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0]));
    }); // 309.3.6

    it('309.3.7 test with bulk inserts for int8', async function() {
      const sparseVec = new oracledb.SparseVector({ values: new Int8Array([2]), indices: [1], numDimensions: 16 });

      const binds = Array(50).fill({ IntCol: 1, SparseVector8Col: sparseVec });
      await connection.executeMany(`INSERT INTO ${tableName} (IntCol, SparseVector8Col) VALUES (:IntCol, :SparseVector8Col)`, binds);
      const result = await connection.execute(`SELECT COUNT(*) FROM ${tableName}`);
      assert.strictEqual(result.rows[0][0], 50);
    }); // 309.3.7

    it('309.3.8 Different Object Formats for int8 Sparse Data', async function() {
      const typedInt8 = new Int8Array([1, 34]);
      const regInt8Array = [1, 34];
      let id = 1;
      let sparsevec = new oracledb.SparseVector({
        values: typedInt8,
        indices: [0, 15],
        numDimensions: 16
      });

      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector8Col)
          VALUES(${id}, :1)`, [sparsevec]);
      let result = await connection.execute(`SELECT SparseVector8Col FROM ${tableName}`);
      let dense = result.rows[0][0].dense();
      assert.deepStrictEqual(result.rows[0][0].dense(), new Int8Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 34]));
      assert.deepStrictEqual(result.metaData[0], metaDataInt8);

      sparsevec = new oracledb.SparseVector({
        values: regInt8Array,
        indices: [0, 15],
        numDimensions: 16
      });
      dense = sparsevec.dense();

      // The type remains same. If we read it from DB, we get Int8Array.
      assert.deepStrictEqual(dense, new Float64Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 34]));

      id = id + 1;
      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector8Col)
          VALUES(${id}, :1)`, [sparsevec]);
      result = await connection.execute(`SELECT SparseVector8Col FROM ${tableName} where IntCol = ${id}`);
      dense = result.rows[0][0].dense();
      assert.deepStrictEqual(result.rows[0][0].dense(), new Int8Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 34]));
      assert.deepStrictEqual(result.metaData[0], metaDataInt8);
    }); // 309.3.8

    it('309.3.9 Boundary Values for int8 Sparse Vectors', async function() {
      // Test min and max int8 values
      const minMaxInt8 = new oracledb.SparseVector({
        values: [Int8Array.from([-128]), Int8Array.from([127])],
        indices: [0, 15],
        numDimensions: 16
      });

      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector8Col)
        VALUES(1, :1)`, [minMaxInt8]);
      const result = await connection.execute(`SELECT SparseVector8Col FROM ${tableName}`);

      const dense = result.rows[0][0].dense();
      assert.strictEqual(dense[0], -128);
      assert.strictEqual(dense[15], 127);
    }); // 309.3.9

    it('309.3.10 Invalid int8 Value Handling', async function() {
      // Test values outside int8 range
      await assert.rejects(
        async () => await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector8Col)
          VALUES(1, :1)`,
        [new oracledb.SparseVector({
          values: [129],  // Out of int8 range
          indices: [0],
          numDimensions: 16
        })]
        ),
        /ORA-51806:/
        /*
          ORA-51806: Vector dimension value at position 0 is
          outside the range allowed by the dimension format FLEX.
        */
      );

      await assert.rejects(
        async () => await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector8Col)
          VALUES(1, :1)`,
        [new oracledb.SparseVector({
          values: [-129],  // Out of int8 range
          indices: [0],
          numDimensions: 16
        })]
        ),
        /ORA-51806:/
        /*
          ORA-51806: Vector dimension value at position 0 is
          outside the range allowed by the dimension format FLEX.
        */
      );
    }); // 309.3.10

    it('309.3.11 Repeated Indices and Sparse Entries', async function() {
      // Test sparse vector with multiple entries at different indices
      const multiSparseVec = new oracledb.SparseVector({
        values: [10, 20, 30],
        indices: [0, 5, 15],
        numDimensions: 16
      });

      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVector8Col)
        VALUES(1, :1)`, [multiSparseVec]);
      const result = await connection.execute(`SELECT SparseVector8Col FROM ${tableName}`);

      const dense = result.rows[0][0].dense();
      assert.strictEqual(dense[0], 10);
      assert.strictEqual(dense[5], 20);
      assert.strictEqual(dense[15], 30);
    }); // 309.3.11

    it('309.3.12 Bulk Insert for int8 Sparse Vectors', async function() {
      const sparseVec = new oracledb.SparseVector({
        values: [10],
        indices: [0],
        numDimensions: 16
      });

      const binds = Array(50).fill({ IntCol: 1, SparseVector8Col: sparseVec });
      await connection.executeMany(`INSERT INTO ${tableName} (IntCol, SparseVector8Col) VALUES (:IntCol, :SparseVector8Col)`, binds);
      const result = await connection.execute(`SELECT COUNT(*) FROM ${tableName}`);
      assert.strictEqual(result.rows[0][0], 50);
    }); // 309.3.12

    it('309.3.13 Complex Sparse Vector Structures for int8', async function() {
      const sparseVec = new oracledb.SparseVector({
        values: [1, 3],
        indices: [0, 15],
        numDimensions: 16
      });

      await connection.execute(`INSERT INTO ${tableName} (IntCol, SparseVectorFlex8Col) VALUES(1, :1)`, [sparseVec]);

      const result = await connection.execute(`SELECT SparseVectorFlex8Col FROM ${tableName}`);
      assert.deepStrictEqual(result.metaData[0], metaDataInt8Flex);
      const dense = result.rows[0][0].dense();
      const expectedDense = new Int8Array(16);
      expectedDense[0] = 1;
      expectedDense[15] = 3;
      assert.deepStrictEqual(dense, expectedDense);
    }); // 309.3.13
  }); // 309.3
}); // 309

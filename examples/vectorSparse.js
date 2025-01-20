/* Copyright (c) 2025, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   vectortypesparse.js
 *
 * DESCRIPTION
 *   Insert and query SPARSE VECTOR columns.
 *
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');
const tableName = 'testvectorsparse';

if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {
  let clientOpts = {};
  // On Windows and macOS Intel platforms, set the environment
  // variable NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
  if (process.platform === 'win32' || (process.platform === 'darwin' && process.arch === 'x64')) {
    clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
  }
  oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
}

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function run() {

  const connection = await oracledb.getConnection(dbConfig);

  try {
    let result;
    const serverVersion = connection.oracleServerVersion;
    if (serverVersion < 2306000000) {
      console.log(`DB version ${serverVersion} does not support VECTOR type`);
      return;
    }

    console.log('Creating table');
    await connection.execute(`DROP TABLE if exists ${tableName}`);
    await connection.execute(`CREATE TABLE ${tableName} (id NUMBER GENERATED ALWAYS AS IDENTITY,
      sparseF64 VECTOR(4, float64, SPARSE), sparseFlexF64 VECTOR(*, float64, SPARSE),
      denseF64 VECTOR(2, float64), denseFlexF64 VECTOR(*, float64))`);

    const arr = [39, -65];
    const queryVector = new Float64Array([39, -65]);
    const float64arr1 = new Float64Array(arr);
    const float64arr2 = new Float64Array([-34, 23]);
    const float64arr3 = new Float64Array([-34, 23, 32, 12]);
    const sparseString = '[4, [1, 3], [39, -65]]'; // totalDims, indexArray, valueArray.
    let sparsevec = new oracledb.SparseVector({ values: float64arr1, indices: [1, 3], numDimensions: 4 });

    const binds = {
      sparse: { type: oracledb.DB_TYPE_VECTOR, val: sparsevec },
      dense: { type: oracledb.DB_TYPE_VECTOR, val: float64arr2 }
    };

    const denseArray = sparsevec.dense();
    console.log(' dense vector ', denseArray);

    console.log('Inserting SparseVector instance created from POJO');
    result = await connection.execute(`insert into ${tableName} values(DEFAULT, :1, :2, :3, :4)`,
      [
        sparsevec,
        sparsevec,
        float64arr1,
        float64arr1
      ]);

    console.log('Inserting string data of sparse format');
    result = await connection.execute(`insert into ${tableName} values(DEFAULT, :sparse, :sparse, :dense, :dense)`,
      [sparseString, sparseString, float64arr1, float64arr1]);

    console.log('Inserting SparseVector instance created from string');
    sparsevec = new oracledb.SparseVector(sparseString);
    result = await connection.execute(`insert into ${tableName} values(DEFAULT, :1, :2, :3, :4)`,
      [
        sparsevec,
        sparsevec,
        float64arr1,
        float64arr1
      ]);

    console.log('Inserting SparseVector instance created from dense Array');
    sparsevec = new oracledb.SparseVector(denseArray);
    result = await connection.execute(`insert into ${tableName} values(DEFAULT, :1, :2, :3, :4)`,
      [
        sparsevec,
        sparsevec,
        float64arr1,
        float64arr1
      ]);

    console.log('Inserting Dense vector into Sparse Flex dimensions column');
    let sql = `insert into ${tableName} values(DEFAULT, :sparse, :dense, :dense, :dense)`;
    result = await connection.execute(sql, binds);

    console.log('Inserting Sparse vector into Dense Flex dimensions column');
    sql = `insert into ${tableName} values(DEFAULT, :sparse, :sparse, :dense, :sparse)`;
    result = await connection.execute(sql, binds);

    console.log('Query Results:');
    result = await connection.execute(
      `select * from ${tableName} ORDER BY id`);
    console.log("Query metadata:", result.metaData);
    for (const val of result.rows) {
      console.log("Query rows:", JSON.stringify(val));
    }

    // Inserting Dense vector of different dimensions into Sparse Fixed dimensions column
    sql = `insert into ${tableName} values(DEFAULT, :dense, :sparse, :dense, :dense)`;
    await assert.rejects(
      async () => await connection.execute(sql,
        {
          sparse: { type: oracledb.DB_TYPE_VECTOR, val: sparsevec },
          dense: { type: oracledb.DB_TYPE_VECTOR, val: float64arr2 }
        }
      ),
      /ORA-51803:/
    );

    // Inserting Dense vector of same dimensions into Sparse Fixed dimensions column
    sql = `insert into ${tableName} values(DEFAULT, :dense, :sparse, :dense, :dense)`;
    await assert.rejects(
      async () => await connection.execute(sql,
        {
          sparse: { type: oracledb.DB_TYPE_VECTOR, val: sparsevec },
          dense: { type: oracledb.DB_TYPE_VECTOR, val: float64arr3 }
        }
      ),
      /ORA-51803:/
    );

    // Inserting Sparse vector into Dense Fixed dimensions column
    sql = `insert into ${tableName} values(DEFAULT, :sparse, :sparse, :sparse, :dense)`;
    await assert.rejects(
      async () => await connection.execute(sql, binds),
      /ORA-51803:/
    );

    const sparseQueryVec = new oracledb.SparseVector({ values: queryVector, indices: [2, 4], numDimensions: 4 });
    console.log('vector distance with Query ', queryVector);
    console.log(await connection.execute(`select vector_distance (sparseF64, :1) from ${tableName}`, [sparseQueryVec]));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

run();

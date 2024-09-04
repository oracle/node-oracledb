/* Copyright (c) 2024, Oracle and/or its affiliates. */

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
 *   vectortype2.js
 *
 * DESCRIPTION
 *   Insert data into VECTOR columns and verify vector operations.
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;


const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const tableName = 'testvectornodejs2';
const assert   = require('assert');

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

// By Default typed arrays are returned. output fetch handler like
// below can be used to convert to Array objects.
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

async function run() {

  const connection = await oracledb.getConnection(dbConfig);

  try {
    let result;

    const serverVersion = connection.oracleServerVersion;
    if (serverVersion < 2304000000) {
      console.log(`DB version ${serverVersion} does not support VECTOR type`);
      return;
    }

    console.log('Creating table');
    await connection.execute(`DROP TABLE if exists ${tableName}`);
    await connection.execute(`CREATE TABLE ${tableName} (id NUMBER,
      embedding VECTOR(3))`);

    let i = 0;
    const binds = [], num = 4;
    const expectedArrays = [
      [4, 5, 6],
      [1, 2, 3],
      [42, 52, 613],
      [-1, -2, -3]
    ];
    for (i = 0; i < num; i++) {
      binds.push({id: i, vec: expectedArrays[i]});
    }

    console.log('Inserting Rows ', binds);
    const options = {
      bindDefs: {
        id: { type: oracledb.DB_TYPE_NUMBER },
        vec: { type: oracledb.DB_TYPE_VECTOR }
      }
    };
    result = await connection.executeMany(`insert into ${tableName} values(:id, :vec)`, binds, options);
    console.log('Rows inserted: ' + result.rowsAffected);

    console.log('Query Results and Verify values returned:');
    result = await connection.execute(
      `select id, embedding from ${tableName} ORDER BY id`);
    console.log(result.rows);
    for (i = 0; i < num; i++) {
      assert.deepStrictEqual(result.rows[i], {ID: i, EMBEDDING: expectedArrays[i]});
    }

    // Calculate distance to a given embedding
    const vecQuery = new Float64Array([3, 1, 2]);
    let expectedValues = ['0.1167', '0.2143', '0.3915', '1.7857'];
    result = await connection.execute(
      `select vector_distance (embedding, :1) from ${tableName}`, [vecQuery]);
    console.log(`Distance from Input Embedding `, [3, 1, 2]);
    console.log(result.rows);
    console.log(result.rows[0]['VECTOR_DISTANCE(EMBEDDING,:1)']);
    for (i = 0; i < num; i++) {
      assert.deepStrictEqual(result.rows[i]['VECTOR_DISTANCE(EMBEDDING,:1)'].toFixed(4), expectedValues[i]);
    }

    // Calculate top 3 similarity search to a given embedding
    result = await connection.execute(
      `select embedding, vector_distance (embedding, :1) as distance from ${tableName}
      order by distance FETCH FIRST 3 ROWS ONLY`, [vecQuery]);
    console.log(`Top 3 vectors for Input Embedding `, [3, 1, 2]);
    console.log(result.rows);
    assert.deepStrictEqual(result.rows[0].EMBEDDING, expectedArrays[0]);
    assert.deepStrictEqual(result.rows[1].EMBEDDING, expectedArrays[1]);
    assert.deepStrictEqual(result.rows[2].EMBEDDING, expectedArrays[2]);

    // Nearest Neighbours (distance < 34) for a given embedding [3,1,2]
    // gives [1,2,3] and [4,5,6]
    console.log('Nearest Neighbours with distance < 34:');
    result = await connection.execute(
      `select * from ${tableName} where vector_distance (embedding, vector('[3,1,2]', 3, float64)) < 34 `);
    console.log(result.rows);
    assert.deepStrictEqual(result.rows[0].EMBEDDING, expectedArrays[0]);
    assert.deepStrictEqual(result.rows[1].EMBEDDING, expectedArrays[1]);

    // Cosine Distance
    result = await connection.execute(
      `select cosine_distance (embedding, vector('[3,1,2]', 3, float64)) as cosdistance from ${tableName}`);
    expectedValues = ['0.1167', '0.2143',  '0.3915', '1.7857'];
    for (i = 0; i < num; i++) {
      assert.deepStrictEqual(result.rows[i]['COSDISTANCE'].toFixed(4), expectedValues[i]);
    }
    console.log(`Cosine Distance from Input Embedding `, [3, 1, 2]);
    console.log(result.rows);

    // inner product
    result = await connection.execute(
      `select inner_product (embedding, vector('[3,1,2]', 3, float64)) from ${tableName}`);
    console.log(`Inner product with Input Embedding `, [3, 1, 2]);
    console.log(result.rows);
    expectedValues = [29, 11, 1404, -11];
    for (i = 0; i < num; i++) {
      assert.deepStrictEqual(result.rows[i], {"INNER_PRODUCT(EMBEDDING,VECTOR('[3,1,2]',3,FLOAT64))": expectedValues[i]});
    }
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

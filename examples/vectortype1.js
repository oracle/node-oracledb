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
 *   vectortype1.js
 *
 * DESCRIPTION
 *   Insert and query VECTOR columns.
 *
 *   On binding, typed arrays can be binded directly without providing bind information.
 *   Normal Arrays need to use explicit type, 'DB_TYPE_VECTOR' in bind information.
 *
 *   For queries, VECTOR columns are fetched as JavaScript Arrays and
 *   Typed Arrays, default being typed arrays.
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;


const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const assert   = require('assert');
const tableName = 'testvectornodejs1';

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
        VCOL32 VECTOR(4, float32),
        VCOL64 VECTOR(4, float64),
        VCOL8 VECTOR(4, int8),
        VCOL VECTOR(4),
        VCOLFlexDouble VECTOR(*, *),
        VCOLFlexFloat VECTOR(*, *))`);

    const arr = [2345.67, 12.2, -23.4, -65.2];
    const float64arr = new Float64Array(arr);
    const float32arr = new Float32Array(arr);
    const int8arr = new Int8Array([126, 125, -126, -23]);
    // Add both float32 and float64 range elements
    const arrFlexDouble = [2345.67, 12.666428727762776];
    // Add only float32 range elements
    const arrFlexFloat32 = [2345.67, 12.66, 43.23];

    console.log('Inserting Vector ');
    result = await connection.execute(`insert into ${tableName} values(:id, :vec32, :vec64, :vec8, :vec,
        :vecFlexDouble, :vecFlexFloat)`,
    { id: 1,
      vec32: float32arr,
      vec64: float64arr,
      vec8: int8arr,
      vec: {type: oracledb.DB_TYPE_VECTOR, val: arr},
      vecFlexDouble: {type: oracledb.DB_TYPE_VECTOR, val: arrFlexDouble},
      vecFlexFloat: {type: oracledb.DB_TYPE_VECTOR, val: arrFlexFloat32}
    });
    console.log('Rows inserted: ' + result.rowsAffected);

    console.log('Query Results:');
    result = await connection.execute(
      `select id, VCOL32, VCOL64, VCOL8, VCOL, VCOLFlexDouble, VCOLFlexFloat from ${tableName} ORDER BY id`);
    console.log("Query metadata:", result.metaData);
    console.log("Query rows:", result.rows);
    const vec32 = result.rows[0].VCOL32;
    const vec64 = result.rows[0].VCOL64;
    const vec8 = result.rows[0].VCOL8;
    const vec = result.rows[0].VCOL;
    const vecFlexDouble = result.rows[0].VCOLFLEXDOUBLE;
    const vecFlexFloat = result.rows[0].VCOLFLEXFLOAT;

    assert(vec32.constructor, Array);
    assert(vec64.constructor, Array);
    assert(vec.constructor, Array);
    assert(vecFlexDouble.constructor, Array);
    assert(vecFlexFloat.constructor, Array);
    assert(vec8.constructor, Array);

    // Reading vector as string.
    console.log("Fetch Vector Column as string");
    const options = {};
    options.fetchInfo = { "VCOL64": { type: oracledb.STRING } };

    // Reset fetch type handler for VECTOR Column
    // as we need to fetch VECTOR as string from driver.
    oracledb.fetchTypeHandler = undefined;

    // using fetchInfo
    result = await connection.execute(
      `select VCOL64 from ${tableName}`, [], options);
    console.log("VCOL64 as string :", result.rows[0].VCOL64);

    // using oracledb.fetchAsString
    oracledb.fetchAsString = [oracledb.DB_TYPE_VECTOR];
    result = await connection.execute(
      `select VCOL32 from ${tableName}`);
    console.log("VCOL32 as string :", result.rows[0].VCOL32);
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

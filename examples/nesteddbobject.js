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
 *   nesteddbobject.js
 *
 * DESCRIPTION
 *   Shows binding of nested DbObject types
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

// This example runs in both node-oracledb Thin and Thick modes.
//
// Optionally run in node-oracledb Thick mode
if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {

  // Thick mode requires Oracle Client or Oracle Instant Client libraries.
  // On Windows and macOS Intel you can specify the directory containing the
  // libraries at runtime or before Node.js starts.  On other platforms (where
  // Oracle libraries are available) the system library search path must always
  // include the Oracle library path before Node.js starts.  If the search path
  // is not correct, you will get a DPI-1047 error.  See the node-oracledb
  // installation documentation.
  let clientOpts = {};
  // On Windows and macOS Intel platforms, set the environment
  // variable NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
  if (process.platform === 'win32' || process.platform === 'darwin') {
    clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
  }
  oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
}

console.log(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');

async function run() {

  const conn = await oracledb.getConnection(dbConfig);

  const stmts = [
    `drop table my_shapes purge`,
    `drop type shape_type`,
    `drop type point_type`
  ];
  for (const s of stmts) {
    try {
      await conn.execute(s);
    } catch (e) {
      if (e.errorNum != 942 && e.errorNum != 4043)
        throw (e);
    }
  }

  // CREATE TYPES
  await conn.execute(
    `CREATE TYPE point_type AS OBJECT (
        x NUMBER,
        y NUMBER
    )`
  );

  await conn.execute(
    `CREATE TYPE shape_type AS OBJECT (
        name VARCHAR2(50),
        point point_type
    )`
  );

  // CREATE TABLE
  await conn.execute(
    `CREATE TABLE my_shapes(id NUMBER, shape SHAPE_TYPE)`
  );

  // Define the shape and point objects
  const shapeType = await conn.getDbObjectClass('SHAPE_TYPE');
  const pointType = await conn.getDbObjectClass('POINT_TYPE');
  // The attributes of the DbObject type must always be specified in upper
  // case
  const pointValues = [ {}, { Y: 20 },  { X: 10 }, { X: 10, Y: 20 } ];

  let id = 1, result;
  for (const ptVal of pointValues) {
    const point = new pointType(ptVal);
    const shape = new shapeType({ NAME: 'My Shape', POINT: point });

    // Insert values into the table
    result = await conn.execute(
      `INSERT INTO my_shapes (id, shape) VALUES (:id, :shape)`,
      { id: id, shape: shape }
    );
    await conn.commit();

    console.log('Rows inserted:', result.rowsAffected);

    // Get the shape object
    result = await conn.execute(
      `SELECT shape FROM my_shapes WHERE id = :id`,
      { id: id }
    );

    // Print the value
    console.log(`The shape object #${id} is:`);
    console.log(JSON.stringify(result.rows[0][0]));

    id++;
  }

  // Insert a shape object with no attributes initialized and read it
  result = await conn.execute(
    `INSERT INTO my_shapes (id, shape) VALUES (:id, :shape)`,
    { id: id, shape: new shapeType() }
  );
  await conn.commit();
  console.log('Rows inserted:', result.rowsAffected);
  result = await conn.execute(
    `SELECT shape FROM my_shapes WHERE id = :id`,
    { id: id }
  );

  // Print values
  console.log(`The shape object #${id} is:`);
  console.log(JSON.stringify(result.rows[0][0]));

  await conn.close();
}

run();

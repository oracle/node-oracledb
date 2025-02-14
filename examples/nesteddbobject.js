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
  let result = await conn.execute(
    `CREATE TYPE point_type AS OBJECT (
        x NUMBER,
        y NUMBER
    )`
  );
  conn.commit();

  result = await conn.execute(
    `CREATE TYPE shape_type AS OBJECT (
        name VARCHAR2(50),
        point point_type
    )`
  );
  conn.commit();

  // CREATE TABLE
  result = await conn.execute(
    `CREATE TABLE my_shapes(id NUMBER, shape SHAPE_TYPE)`
  );
  conn.commit();

  // Define the shape type and values
  const shapeType = await conn.getDbObjectClass('SHAPE_TYPE');
  const pointType = await conn.getDbObjectClass('POINT_TYPE');
  // The attributes of the DbObject type must always be specified in upper
  // case
  const point = new pointType({ X: 10, Y: 20 });
  const shape = new shapeType({ NAME: 'My Shape', POINT: point });

  // Insert the value using an IN BIND
  result = await conn.execute(
    `INSERT INTO my_shapes (id, shape) VALUES (:id, :shape)`,
    { id: 1, shape: shape }
  );
  conn.commit();

  console.log('Rows inserted:', result.rowsAffected);

  // Select the value from the table
  result = await conn.execute(
    `SELECT shape FROM my_shapes WHERE id = :id`,
    { id: 1 }
  );

  // Print the value
  console.log('The shape object is:');
  console.log(JSON.stringify(result.rows[0][0]));

  await conn.close();
}

run();

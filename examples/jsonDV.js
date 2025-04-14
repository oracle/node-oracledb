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
 *   jsonDV.js
 *
 * DESCRIPTION
 *   JSON Duality Views with Oracle Database
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const tableName = 'testJsonDv';

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
    const clientVersion = oracledb.oracleClientVersion;
    if (serverVersion < 2307000000 || clientVersion < 2307000000) {
      console.log(`Oracle DB version ${serverVersion} or Oracle Client version ${clientVersion} does not support JSON Duality Views`);
      return;
    }

    console.log('Creating table');
    await connection.execute(`DROP TABLE if exists ${tableName}`);
    await connection.execute(`
        CREATE TABLE ${tableName} (
          employee_id NUMBER(6) PRIMARY KEY,
          first_name VARCHAR2(100),
          last_name VARCHAR2(100),
          department VARCHAR2(100)
        )
      `);
    console.log("Table created");

    // 3. Create JSON Duality View
    await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW emp_ov AS
        SELECT JSON {
          'EMPLOYEE_ID' IS e.employee_id,
          'FIRST_NAME' IS e.first_name,
          'LAST_NAME' IS e.last_name,
          'DEPARTMENT' IS e.department
          RETURNING JSON
        } FROM ${tableName} e WITH (INSERT, UPDATE, DELETE)
      `);
    console.log("JSON Duality View 'emp_ov' created");

    // 4. Insert Data Using JSON View
    await connection.execute(`
        INSERT INTO emp_ov VALUES ('{
          "EMPLOYEE_ID": 101,
          "FIRST_NAME": "Alice",
          "LAST_NAME": "Smith",
          "DEPARTMENT": "Engineering"
        }')
      `);

    await connection.commit();
    console.log("Inserted employee into JSON view");

    // 5. Fetch Data as JSON
    result = await connection.execute(`SELECT * FROM emp_ov`);
    console.log("Fetched Data:", JSON.stringify(result.rows, null, 2));

    // 6. Update Data Using JSON View
    await connection.execute(`
        UPDATE emp_ov 
        SET data = '{
          "EMPLOYEE_ID": 101,
          "FIRST_NAME": "Alice",
          "LAST_NAME": "Brown",
          "DEPARTMENT": "Engineering"
        }' 
        WHERE json_value(data, '$.EMPLOYEE_ID') = 101
      `);

    await connection.commit();
    console.log("Updated employee in JSON view");

    // 7. Fetch Updated Data
    result = await connection.execute(`SELECT * FROM emp_ov`);
    console.log("Updated Data:", JSON.stringify(result.rows, null, 2));

    // 8. Delete Data Using JSON View
    await connection.execute(`
        DELETE FROM emp_ov 
        WHERE json_value(data, '$.EMPLOYEE_ID') = 101
      `);

    await connection.commit();
    console.log("Deleted employee from JSON view");
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

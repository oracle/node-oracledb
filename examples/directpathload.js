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
 * directpathload.js
 *
 * DESCRIPTION
 * This example shows how to use direct path load to insert data into a table.
 *
 * To run this example, you must have the following:
 *   node-oracledb thin mode 7.0 or later
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

// This example runs in node-oracledb Thin mode only.
if (!oracledb.thin) {
  console.log ("This example does not run in Thick mode");
  process.exit(0);
}

async function run() {

  let connection;
  const table = 'NODB_DIRECTPATHLOAD';
  try {
    connection = await oracledb.getConnection(dbConfig);

    const stmts = [
      `DROP TABLE ${table}`,

      `CREATE TABLE ${table}(
        id NUMBER,
        name VARCHAR2(100))`
    ];
    console.log('Created table');

    for (const s of stmts) {
      try {
        await connection.execute(s);
      } catch (e) {
        if (e.errorNum != 942)
          console.error(e);
      }
    }

    // Sample data
    const schema = dbConfig.user.toUpperCase();
    const columns = ['ID', 'NAME'];
    const data = [
      [1, 'John Doe'],
      [2, 'Jane Smith'],
      [3, 'Bob Johnson']
    ];

    // Perform direct path load
    await connection.directPathLoad(schema, table, columns, data);

    // Verify the data
    const verifyResult = await connection.execute(
      `SELECT * FROM ${table} ORDER BY id`
    );
    console.log('Inserted data via direct path load:');
    console.log(verifyResult.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      await connection.execute(`DELETE FROM ${table}`);
      await connection.commit();
      await connection.execute(`DROP TABLE ${table} PURGE`);
      console.log('Dropped table');
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

run();

/* Copyright (c) 2015, 2020, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   insert1.js
 *
 * DESCRIPTION
 *   Creates a table and inserts data.  Shows DDL and DML
 *
 *   To insert many records at a time see em_insert1.js
 *
 *   This example requires node-oracledb 4.2 or later.
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    //
    // Create a table
    //

    const stmts = [
      `DROP TABLE no_tab1`,

      `CREATE TABLE no_tab1 (id NUMBER, name VARCHAR2(20))`
    ];

    for (const s of stmts) {
      try {
        await connection.execute(s);
      } catch(e) {
        if (e.errorNum != 942)
          console.error(e);
      }
    }

    //
    // Show several examples of inserting
    //

    // 'bind by name' syntax
    let result = await connection.execute(
      `INSERT INTO no_tab1 VALUES (:id, :nm)`,
      { id : {val: 1 }, nm : {val: 'Chris'} }
    );
    console.log("Rows inserted: " + result.rowsAffected);  // 1
    console.log("ROWID of new row: " + result.lastRowid);

    // 'bind by position' syntax
    result = await connection.execute(
      `INSERT INTO no_tab1 VALUES (:id, :nm)`,
      [2, 'Alison']
    );
    console.log("Rows inserted: " + result.rowsAffected);  // 1
    console.log("ROWID of new row: " + result.lastRowid);

    result = await connection.execute(
      `UPDATE no_tab1 SET name = :nm`,
      ['Bambi'],
      { autoCommit: true }  // commit once for all DML in the script
    );
    console.log("Rows updated: " + result.rowsAffected); // 2
    console.log("ROWID of final row updated: " + result.lastRowid);  // only gives one

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

/* Copyright (c) 2015, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   insert2.js
 *
 * DESCRIPTION
 *   Show the auto commit behavior.
 *
 *   By default, node-oracledb does not commit on execute.
 *   The driver also has commit() and rollback() methods to explicitly control transactions.
 *
 *   Note: regardless of the auto commit mode, any open transaction
 *   will be rolled back when a connection is closed.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

async function run() {

  let connection1, connection2;

  try {
    connection1 = await oracledb.getConnection(dbConfig);
    connection2 = await oracledb.getConnection(dbConfig);

    let result;

    await connection1.execute(
      `BEGIN
         EXECUTE IMMEDIATE 'DROP TABLE test';
         EXCEPTION WHEN OTHERS THEN
         IF SQLCODE <> -942 THEN
           RAISE;
         END IF;
       END;`);
    console.log("Table dropped");

    await connection1.execute(
      `CREATE TABLE test (id NUMBER, name VARCHAR2(20))`);
    console.log("Table created");

    // Insert with autoCommit enabled
    result = await connection1.execute(
      `INSERT INTO test VALUES (:id, :nm)`,
      [1, 'Chris'],  // Bind values
      { autoCommit: true});  // Override the default, non-autocommit behavior
    console.log("Rows inserted: " + result.rowsAffected);  // 1

    // Insert without committing
    result = await connection1.execute(
      `INSERT INTO test VALUES (:id, :nm)`,
      [2, 'Alison'],  // Bind values
      // { autoCommit: true},  // Since this isn't set, operations using a second connection won't see this row
    );
    console.log("Rows inserted: " + result.rowsAffected);  // 1

    // A query on the second connection will only show 'Chris' because
    // inserting 'Alison' is not commited by default.  Uncomment the
    // autoCommit option above and you will see both rows
    result = await connection2.execute(
      `SELECT * FROM test`);
    console.log(result.rows);

  } catch (err) {
    console.error(err);
  } finally {
    try {
      if (connection1)
        await connection1.close();
      if (connection2)
        await connection2.close();
    } catch (err) {
      console.error(err);
    }
  }
}

run();

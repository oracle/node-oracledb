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
 *   dmlrupd1.js
 *
 * DESCRIPTION
 *   Example of 'DML Returning' with a single row match.
 *   The ROWID of the changed record is returned.  This is how to get
 *   the 'last insert id'.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require( 'oracledb' );
const dbConfig = require('./dbconfig.js');

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    //
    // Setup
    //

    const stmts = [
      `DROP TABLE no_dmlrupdtab`,

      `CREATE TABLE no_dmlrupdtab (id NUMBER, name VARCHAR2(40))`,

      `INSERT INTO no_dmlrupdtab VALUES (1001, 'Venkat')`,

      `INSERT INTO no_dmlrupdtab VALUES (1002, 'Neeharika')`
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
    // Show DML Returning
    //

    // SQL statement.
    // Note bind names cannot be reused in the DML section and the RETURNING section
    const sql =
          `UPDATE no_dmlrupdtab
           SET name = :name
           WHERE id = :id
           RETURNING ROWID INTO :rid`;

    const result = await connection.execute(
      sql,
      {
        id:    1001,
        name:  "Krishna",
        rid:   { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      },
      { autoCommit: true }
    );

    console.log(result.outBinds);

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

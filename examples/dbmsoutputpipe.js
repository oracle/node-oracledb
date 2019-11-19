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
 *   dbmsoutputpipe.js
 *
 * DESCRIPTION
 *   Displays PL/SQL DBMS_OUTPUT using a pipelined table.
 *
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
    // Setup
    //

    const stmts = [
      `CREATE OR REPLACE TYPE no_dorow AS TABLE OF VARCHAR2(32767)`,

      `CREATE OR REPLACE FUNCTION no_dofetch RETURN no_dorow PIPELINED IS
      line VARCHAR2(32767);
      status INTEGER;
      BEGIN LOOP
        DBMS_OUTPUT.GET_LINE(line, status);
        EXIT WHEN status = 1;
        PIPE ROW (line);
      END LOOP;
      END;`

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
    // Show DBMS_OUTPUT
    //

    await connection.execute(
      `BEGIN
         DBMS_OUTPUT.ENABLE(NULL);
       END;`);

    await connection.execute(
      `BEGIN
         DBMS_OUTPUT.PUT_LINE('Hello, Oracle!');
         DBMS_OUTPUT.PUT_LINE('Hello, Node!');
       END;`);

    const result = await connection.execute(
      `SELECT * FROM TABLE(no_dofetch())`);
    console.log(result.rows);

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

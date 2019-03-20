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
 *   Use demo.sql to create the dependencies or do:
 *
 *   CREATE OR REPLACE TYPE dorow AS TABLE OF VARCHAR2(32767);
 *   /
 *   SHOW ERRORS
 *
 *   CREATE OR REPLACE FUNCTION mydofetch RETURN dorow PIPELINED IS
 *   line VARCHAR2(32767);
 *   status INTEGER;
 *   BEGIN LOOP
 *     DBMS_OUTPUT.GET_LINE(line, status);
 *     EXIT WHEN status = 1;
 *     PIPE ROW (line);
 *   END LOOP;
 *   END;
 *   /
 *   SHOW ERRORS
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
      `SELECT * FROM TABLE(mydofetch())`);
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

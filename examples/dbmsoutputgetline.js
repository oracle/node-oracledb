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
 *   dbmsoutputgetline.js
 *
 * DESCRIPTION
 *   Displays PL/SQL DBMS_OUTPUT in node-oracledb, fetching one record at a time.
 *
 *   The alternate method shown in dbmsoutputpipe.js is more efficient.
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

    let result;
    do {
      result = await connection.execute(
        `BEGIN
           DBMS_OUTPUT.GET_LINE(:ln, :st);
         END;`,
        { ln: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 32767 },
          st: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } });
      if (result.outBinds.st === 0)
        console.log(result.outBinds.ln);
    } while (result.outBinds.st === 0);

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

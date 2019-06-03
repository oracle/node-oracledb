/* Copyright (c) 2016, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   refcursortoquerystream.js
 *
 * DESCRIPTION
 *   Converts a refcursor returned from execute() to a query stream.
 *   This is an alternative means of processing instead of using
 *   resultSet.getRows().
 *
 *   Scripts to create the HR schema can be found at:
 *   https://github.com/oracle/db-sample-schemas
 *
 *   This example requires node-oracledb 1.9 or later.
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

    const result = await connection.execute(
      `BEGIN
         OPEN :cursor FOR
           SELECT department_id, department_name
           FROM departments;
       END;`,
      {
        cursor: {
          type: oracledb.CURSOR,
          dir: oracledb.BIND_OUT
        }
      }
    );

    const cursor = result.outBinds.cursor;
    const queryStream = cursor.toQueryStream();

    const consumeStream = new Promise((resolve, reject) => {
      queryStream.on('data', function(row) {
        console.log(row);
      });
      queryStream.on('error', reject);
      queryStream.on('close', resolve);
    });

    await consumeStream;
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

/* Copyright (c) 2016, 2020, Oracle and/or its affiliates. All rights reserved. */

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
 *   resultsettoquerystream.js
 *
 * DESCRIPTION
 *   Converts a ResultSet returned from execute() into a Readable Stream.
 *   This is an alternative to using resultset.getRows().
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

async function run() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupBf(connection);  // create the demo table

    const result = await connection.execute(
      `SELECT id, farmer
       FROM no_banana_farmer
       ORDER BY id`,
      [],
      {
        resultSet: true
      }
    );

    const queryStream = result.resultSet.toQueryStream();

    const consumeStream = new Promise((resolve, reject) => {
      queryStream.on('data', function(row) {
        console.log(row);
      });
      queryStream.on('error', reject);
      queryStream.on('end', function() {
        queryStream.destroy();  // free up resources
      });
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

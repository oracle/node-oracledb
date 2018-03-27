/* Copyright (c) 2016, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   This is an alternative instead of using resultset.getRows().
 *   Note: using connnection.queryStream() is recommended for top level
 *   queries because it avoids having to duplicate error handling in the
 *   callback and event.
 *
 *   Scripts to create the HR schema can be found at:
 *   https://github.com/oracle/db-sample-schemas
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

oracledb.getConnection(
  dbConfig,
  function(err, connection) {
    if (err) { console.error(err.message); return; }
    var sql = "SELECT employee_id, last_name FROM employees WHERE ROWNUM < 25 ORDER BY employee_id";
    connection.execute(
      sql,
      [],
      {
        resultSet: true
      },
      function(err, result) {
        if (err) {
          console.error(err.message);
          doRelease(connection);
          return;
        }
        var queryStream = result.resultSet.toQueryStream();

        queryStream.on('data', function(row) {
          console.log(row);
        });

        queryStream.on('error', function(err) {
          console.error(err.message);
          doRelease(connection);
        });

        queryStream.on('close', function() {
          doRelease(connection);
        });
      }
    );
  }
);

function doRelease(connection) {
  connection.close(
    function(err) {
      if (err) { console.error(err.message); }
    });
}

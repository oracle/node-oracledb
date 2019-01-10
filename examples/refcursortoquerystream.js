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
 *   Converts a refcursor (returned from execute) to a query stream for an
 *   alternative means of processing instead of using resultSet.getRows().
 *
 *   Scripts to create the HR schema can be found at:
 *   https://github.com/oracle/db-sample-schemas
 *
 *   This example requires node-oracledb 1.9 or later.
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

oracledb.getConnection(
  {
    user          : dbConfig.user,
    password      : dbConfig.password,
    connectString : dbConfig.connectString
  },
  function(err, connection) {
    if (err) {
      console.error(err.message);
      return;
    }

    connection.execute(
      `BEGIN
         OPEN :cursor FOR SELECT department_id, department_name FROM departments;
       END;`,
      {
        cursor:  { type: oracledb.CURSOR, dir : oracledb.BIND_OUT }
      },
      function(err, result) {
        var cursor;
        var queryStream;

        if (err) {
          console.error(err.message);
          doRelease(connection);
          return;
        }

        cursor = result.outBinds.cursor;
        queryStream = cursor.toQueryStream();

        queryStream.on('data', function (row) {
          console.log(row);
        });

        queryStream.on('error', function (err) {
          console.error(err.message);
          doRelease(connection);
        });

        queryStream.on('close', function () {
          doRelease(connection);
        });
      }
    );
  }
);

function doRelease(connection) {
  connection.close(
    function(err) {
      if (err) {
        console.error(err.message);
      }
    }
  );
}

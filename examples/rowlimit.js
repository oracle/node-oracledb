/* Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved. */

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
 *   rowlimit.js
 *
 * DESCRIPTION
 *   Shows ways to limit the number of records fetched by queries.
 *   Uses Oracle's sample HR schema.
 *
 *   Scripts to create the HR schema can be found at:
 *   https://github.com/oracle/db-sample-schemas/releases
 *
 *   By default, node-oracledb has a maxRows attribute that limits the
 *   number of records fetched from a query to 100.  Although
 *   adjusting maxRows can be used to control the number of rows
 *   available to the application, it is more efficient for the
 *   database if the SQL query syntax limits the number of rows
 *   returned from the database.  Use maxRows only to prevent badly
 *   coded queries from consuming too many Node.js resources.
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var myoffset     = 2;  // number of rows to skip
var mymaxnumrows = 6;  // number of rows to fetch

// Properties are applicable to all connections and SQL executions.
// They can also be set or overridden at the individual execute() call level
//
// This script sets maxRows in the execute() call but it could be set here instead
// oracledb.maxRows = 150;   // Note the default value is 100 and EMPLOYEES has 107 rows

oracledb.getConnection(
  {
    user          : dbConfig.user,
    password      : dbConfig.password,
    connectString : dbConfig.connectString
  },
  function (err, connection)
  {
    if (err) {
      console.error(err.message);
      return;
    }

    var sql = "SELECT employee_id, last_name FROM employees ORDER BY employee_id";
    if (connection.oracleServerVersion >= 1201000000) {
      // 12c row-limiting syntax
      sql += " OFFSET :offset ROWS FETCH NEXT :maxnumrows ROWS ONLY";
    } else {
      // Pre-12c syntax [could also customize the original query and use row_number()]
      sql = "SELECT * FROM (SELECT A.*, ROWNUM AS MY_RNUM FROM"
          + "(" + sql + ") A "
          + "WHERE ROWNUM <= :maxnumrows + :offset) WHERE MY_RNUM > :offset";
    }

    connection.execute(
      sql,
      {offset: myoffset, maxnumrows: mymaxnumrows},
      {maxRows: 150},
      function(err, result) {
        if (err) {
          console.error(err.message);
        } else {
          console.log("Executed: " + sql);
          console.log("Number of rows returned: " + result.rows.length);
          console.log(result.rows);
        }
      });
  });

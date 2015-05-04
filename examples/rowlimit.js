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
 *   https://github.com/oracle/db-sample-schemas
 *
 *   By default, node-oracledb has a maxRows attribute that limits the
 *   number of records fetched from a query to 100.  Although
 *   adjusting maxRows can be used to control the number of rows
 *   available to the application, it is more efficient for the
 *   database if the SQL query syntax limits the number of rows
 *   queried.  Use maxRows only to prevent badly coded queries from
 *   consuming too many Node.js resources.
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

// Properties are applicable to all connections and SQL executions.
// They can also be set or overridden at the individual execute() call level
//
// This script sets maxRows in the execute() call but it could be set here instead
// oracledb.maxRows = 200;   // Note the default value is 100

oracledb.getConnection(
  {
    user          : dbConfig.user,
    password      : dbConfig.password,
    connectString : dbConfig.connectString
  },
  function(err, connection)
  {
    if (err) {
      console.error(err.message);
      return;
    }

    // Returns 100 records although the table has 107 rows.  Node-oracledb's default maxRows is 100
    connection.execute(
      "SELECT employee_id, last_name "
    + "FROM employees "
    + "ORDER BY employee_id",
      function(err, result)
      {
        if (err) {
          console.error(err.message);
          return;
        }
        console.log("----- Number of employee rows returned with default maxRow limit of 100 --------");
        console.log(result.rows.length);
        //console.log(result.rows);
      });

    // Increasing maxRows from the default returns all 107 rows
    connection.execute(
      "SELECT employee_id, last_name "
    + "FROM employees "
    + "ORDER BY employee_id",
      {}, // A bind variable parameter is needed to disambiguate the following options parameter
          // otherwise you will get Error: ORA-01036: illegal variable name/number
      {maxRows: 150},
      function(err, result)
      {
        if (err) {
          console.error(err.message);
          return;
        }
        console.log("----- Number of employee rows returned with increased maxRow value --------");
        console.log(result.rows.length);
        //console.log(result.rows);
      });

    // Oracle 12c syntax for fetching rows 6-10 from a query (won't work with 11g)
    connection.execute(
      "SELECT employee_id, last_name "
    + "FROM employees "
    + "ORDER BY employee_id "
    + "OFFSET 5 ROWS FETCH NEXT 5 ROWS ONLY",
      function(err, result)
      {
        if (err) {
          console.error(err.message);
          return;
        }
        console.log("----- Five employees (12c query syntax) --------");
        console.log(result.rows);
      });

    // Oracle 11g syntax for fetching rows 6-10 from a query
    connection.execute(
      "SELECT employee_id, last_name "
    + "FROM (SELECT a.*, ROWNUM AS rnum "
    +       "FROM (SELECT employee_id, last_name FROM employees ORDER BY employee_id) a "
    +       "WHERE ROWNUM <= 10) "
    + "WHERE rnum > 5",
      function(err, result)
      {
        if (err) {
          console.error(err.message);
          return;
        }
        console.log("----- Five employees (pre 12c query syntax) --------");
        console.log(result.rows);
      });
  });

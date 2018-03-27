/* Copyright (c) 2015, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   refcursor.js
 *
 * DESCRIPTION
 *   Shows using a ResultSet to fetch rows from a REF CURSOR using getRows().
 *   Streaming is also possible (this is not shown).
 *
 *   Uses Oracle's sample HR schema.
 *   Use demo.sql to create the required procedure or do:
 *
 *  CREATE OR REPLACE PROCEDURE get_emp_rs (p_sal IN NUMBER, p_recordset OUT SYS_REFCURSOR)
 *  AS
 *  BEGIN
 *    OPEN p_recordset FOR
 *      SELECT first_name, salary, hire_date
 *      FROM   employees
 *      WHERE  salary > p_sal;
 *  END;
 *  /
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var numRows = 10;  // number of rows to return from each call to getRows()

oracledb.getConnection(
  {
    user          : dbConfig.user,
    password      : dbConfig.password,
    connectString : dbConfig.connectString
  },
  function(err, connection) {
    if (err) { console.error(err.message); return; }
    var bindvars = {
      sal:  12000,
      cursor:  { type: oracledb.CURSOR, dir : oracledb.BIND_OUT }
    };
    connection.execute(
      "BEGIN get_emp_rs(:sal, :cursor); END;",
      bindvars,
      function(err, result) {
        if (err) {
          console.error(err.message);
          doRelease(connection);
          return;
        }
        console.log(result.outBinds.cursor.metaData);
        fetchRowsFromRS(connection, result.outBinds.cursor, numRows);
      });
  });

function fetchRowsFromRS(connection, resultSet, numRows) {
  resultSet.getRows( // get numRows rows
    numRows,
    function (err, rows) {
      if (err) {
        console.log(err);
        doClose(connection, resultSet); // always close the ResultSet
      } else if (rows.length === 0) {   // no rows, or no more rows
        doClose(connection, resultSet); // always close the ResultSet
      } else if (rows.length > 0) {
        console.log("fetchRowsFromRS(): Got " + rows.length + " rows");
        console.log(rows);
        fetchRowsFromRS(connection, resultSet, numRows);
      }
    });
}

function doRelease(connection) {
  connection.close(
    function(err) {
      if (err) { console.error(err.message); }
    });
}

function doClose(connection, resultSet) {
  resultSet.close(
    function(err) {
      if (err) { console.error(err.message); }
      doRelease(connection);
    });
}

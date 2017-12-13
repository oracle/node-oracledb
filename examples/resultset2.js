/* Copyright (c) 2015, 2017, Oracle and/or its affiliates. All rights reserved. */

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
 *   resultset2.js
 *
 * DESCRIPTION
 *   Executes a query and uses a ResultSet to fetch batches of rows
 *   with getRows().  Also shows setting the fetch array size.
 *   Uses Oracle's sample HR schema.
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');


// Number of rows to return from each call to getRows()
var numRows = 10;

oracledb.getConnection(
  {
    user          : dbConfig.user,
    password      : dbConfig.password,
    connectString : dbConfig.connectString
  },
  function(err, connection)
  {
    if (err) { console.error(err.message); return; }
    connection.execute(
      `SELECT employee_id, last_name
       FROM   employees
       WHERE ROWNUM < 25
       ORDER BY employee_id`,
      [], // no bind variables
      {
        resultSet: true        // return a ResultSet.  Default is false
      },
      function(err, result)
      {
        if (err) {
          console.error(err.message);
          doRelease(connection);
          return;
        }
        // console.log(result);
        fetchRowsFromRS(connection, result.resultSet, numRows);
      });
  });

function fetchRowsFromRS(connection, resultSet, numRows)
{
  resultSet.getRows(
    numRows,  // get this many rows
    function (err, rows)
    {
      if (err) {
        console.error(err);
        doClose(connection, resultSet);   // always close the ResultSet
      } else if (rows.length > 0) {
        console.log("fetchRowsFromRS(): Got " + rows.length + " rows");
        console.log(rows);
        if (rows.length === numRows)      // might be more rows
          fetchRowsFromRS(connection, resultSet, numRows);
        else
          doClose(connection, resultSet); // always close the ResultSet
      } else { // no rows
        doClose(connection, resultSet);   // always close the ResultSet
      }
    });
}

function doRelease(connection)
{
  connection.close(
    function(err)
    {
      if (err) { console.error(err.message); }
    });
}

function doClose(connection, resultSet)
{
  resultSet.close(
    function(err)
    {
      if (err) { console.error(err.message); }
      doRelease(connection);
    });
}

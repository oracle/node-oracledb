/* Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   Executes a query and uses a result set to fetch batches of rows
 *   with getRows().  Also shows setting the prefetch size.
 *   Uses Oracle's sample HR schema.
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

// Prefetching is a tuning feature for optimizing row transfer from
// the Oracle Database to node-oracledb with Result Sets.  The default
// prefetch size is 100.  The prefetch size does not affect how, or
// when, rows are returned by node-oracledb to the application.
// Buffering is handled by the underlying Oracle client libraries.
// Benchmark to choose the optimal size for each application or query.
//
//oracledb.prefetchRows = 100;

var numRows = 10;  // number of rows to return from each call to getRows()

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
      "SELECT employee_id, last_name " +
        "FROM   employees " +
        "WHERE ROWNUM < 25 " +
        "ORDER BY employee_id",
      [], // no bind variables
      {
        resultSet: true, // return a result set.  Default is false
        prefetchRows: 25 // the prefetch size can be set for each query
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
        doClose(connection, resultSet); // always close the result set
      } else if (rows.length > 0) {
        console.log("fetchRowsFromRS(): Got " + rows.length + " rows");
        console.log(rows);
        if (rows.length === numRows) // might be more rows
          fetchRowsFromRS(connection, resultSet, numRows);
        else
          doClose(connection, resultSet); // always close the result set
      } else { // no rows
        doClose(connection, resultSet); // always close the result set
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

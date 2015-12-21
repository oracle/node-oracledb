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
 *   fetchinfo.js
 *
 * DESCRIPTION
 *   Show how numbers and dates can be returned as strings using fetchAsString 
 *   and fetchInfo
 *   Uses Oracle's sample HR schema.
 *
 *   Scripts to create the HR schema can be found at:
 *   https://github.com/oracle/db-sample-schemas
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

oracledb.fetchAsString = [ oracledb.NUMBER ];  // any number queried will be returned as a string
//oracledb.fetchAsString = [ oracledb.NUMBER, oracledb.DATE ]; // both date and number can be used

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
    connection.execute(
      "SELECT last_name, hire_date, salary, commission_pct FROM employees WHERE employee_id = :id",
      [178],
      {
        fetchInfo :
        {
          "HIRE_DATE":      { type : oracledb.STRING },  // return the date as a string
          "COMMISSION_PCT": { type : oracledb.DEFAULT }  // override oracledb.fetchAsString
        }
      },
      function(err, result)
      {
        if (err) {
          console.error(err.message);
          doRelease(connection);
          return;
        }
        console.log(result.rows);
        doRelease(connection);
      });
  });

function doRelease(connection)
{
  connection.release(
    function(err) {
      if (err) {
        console.error(err.message);
      }
    });
}

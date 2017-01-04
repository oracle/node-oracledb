/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   promises.js
 *
 * DESCRIPTION
 *   Executes a basic query using promises instead of the callback pattern.
 *
 *   Scripts to create the HR schema can be found at:
 *   https://github.com/oracle/db-sample-schemas
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

oracledb.getConnection(
  {
    user          : dbConfig.user,
    password      : dbConfig.password,
    connectString : dbConfig.connectString
  })
  .then(function(connection) {
    return connection.execute(
      "SELECT department_id, department_name " +
        "FROM departments " +
        "WHERE department_id = :did",
      [180]
    )
      .then(function(result) {
        console.log(result.metaData);
        console.log(result.rows);

        return connection.close();
      })
      .catch(function(err) {
        console.log(err.message);

        return connection.close();
      });
  })
  .catch(function(err) {
    console.error(err.message);
  });

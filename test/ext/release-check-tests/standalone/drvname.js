/* Copyright (c) 2024, Oracle and/or its affiliates. All rights reserved.
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
 *   drvname.js
 *
 * DESCRIPTION
 *   Executes a basic query to get the CLIENT_DRIVER_NAME from
 *     v$session_connect_info.
 *   Uses Oracle's sample HR schema.
 *   Expected result: Array with the right version in below format.
 *        [ [ 'node-oracledb : 2.0.15' ],
 *          [ 'node-oracledb : 2.0.15' ],
 *          [ 'node-oracledb : 2.0.15' ] ]
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('../../../dbconfig.js');

oracledb.getConnection(
  {
    user: dbConfig.user,
    password: dbConfig.password,
    connectString: dbConfig.connectString
  },
  function(err, connection) {
    if (err) {
      console.error(err.message);
      return;
    }
    connection.execute(
      "SELECT CLIENT_DRIVER FROM V$SESSION_CONNECT_INFO where sid = sys_context('USERENV', 'SID')",
      function(err, result) {
        if (err) {
          console.error(err.message);
          return;
        }
        console.log(result.rows);
      });
  });

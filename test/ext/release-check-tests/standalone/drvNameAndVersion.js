/* Copyright (c) 2024, Oracle and/or its affiliates. All rights reserved. */

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
 *   drvNameandVersion.js
 *
 * DESCRIPTION
 *   Executes a basic query to get the CLIENT_DRIVER_NAME and CLIENT_VERSION
 *     from v$session_connect_info.
 *   Uses Oracle's sample HR schema.
 *   Expected result: Array with the right driver name & version
 *     in  the below format.
 *        [ [ 'node-oracledb : 6.0.0 thn', '6.0.0.0.0' ] ]
 *
 *****************************************************************************/

const oracledb = require('oracledb');

const dbConfig = {
  user: process.env.NODE_ORACLEDB_USER,

  // Get the password from the environment variable
  // NODE_ORACLEDB_PASSWORD.  The password could also be a hard coded
  // string (not recommended), or it could be prompted for.
  // Alternatively use External Authentication so that no password is
  // needed.
  password: process.env.NODE_ORACLEDB_PASSWORD,

  // For information on connection strings see:
  // https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connectionstrings
  connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,

  // Setting externalAuth is optional.  It defaults to false.  See:
  // https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#extauth
  externalAuth: process.env.NODE_ORACLEDB_EXTERNALAUTH ? true : false,

  // The wallet password and wallet location, if required.  These attributes
  // only work in Thin mode.
  walletPassword: process.env.NODE_ORACLEDB_WALLET_PASSWORD,
  walletLocation: process.env.NODE_ORACLEDB_WALLET_LOCATION,
};

const run = async () => {
  const connection = await oracledb.getConnection(dbConfig);
  const result = await connection.execute("SELECT CLIENT_DRIVER, CLIENT_VERSION FROM V$SESSION_CONNECT_INFO where sid = sys_context('USERENV', 'SID')");
  console.log(result.rows);
  connection.close();
};
run();

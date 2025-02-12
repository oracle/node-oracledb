/* Copyright (c) 2025, Oracle and/or its affiliates. */

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
 *   sampleocicloudnativetokenauth.js
 *
 * DESCRIPTION
 *   Shows connection pooling with OAuth 2.0 token based authentication to
 *   Oracle Autonomous Database from OCI-SDK.
 *
 *   For more information refer to
 *   https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html
 *   #iam-token-based-authentication
 *
 * PREREQUISITES
 *   - node-oracledb 6.8 or later.
 *
 *   - While using Thick mode:
 *     Oracle Client libraries 19.14 (or later), or 21.5 (or later).
 *
 *   - The OCI-SDK package. See https://www.npmjs.com/package/oci-sdk
 *
 *   - Set these environment variables:
 *     NODE_ORACLEDB_PROFILE
 *     NODE_ORACLEDB_CONNECTIONSTRING
 *     NODE_ORACLEDB_CONFIG_FILE_LOCATION
 *     NODE_ORACLEDB_DRIVER_MODE
 *     NODE_ORACLEDB_CLIENT_LIB_DIR, PLUGIN_TOKEN_OCI
 *
 *****************************************************************************/

const oracledb = require('oracledb');
// Loading plugin modules.
// eslint-disable-next-line no-unused-vars
const tokenPlugin = require('oracledb/plugins/token/extensionOci');

// This example runs in both node-oracledb Thin and Thick modes.
//
// Optionally run in node-oracledb Thick mode
if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {

  // Thick mode requires Oracle Client or Oracle Instant Client libraries.
  // On Windows and macOS you can specify the directory containing the
  // libraries at runtime or before Node.js starts.  On other platforms (where
  // Oracle libraries are available) the system library search path must always
  // include the Oracle library path before Node.js starts.  If the search path
  // is not correct, you will get a DPI-1047 error.  See the node-oracledb
  // installation documentation.
  let clientOpts = {};
  // On Windows and macOS platforms, set the environment variable
  // NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
  if (process.platform === 'win32' || process.platform === 'darwin') {
    clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
  }
  oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
}

console.log(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');


async function run() {
  // Configuration for token based authentication:
  //   externalAuth:        Must be set to true for token based authentication
  //   homogeneous:         Must be set to true for token based authentication
  //   connectString:       The NODE_ORACLEDB_CONNECTIONSTRING environment
  //                        variable set to the Oracle Net alias or connect
  //                        descriptor of your Oracle Autonomous Database
  // Configuration for tokenAuthConfigOci:
  //   authType:            Must be set to authentication type.
  //                        Types are:
  //                        configFileBasedAuthentication, simpleAuthentication
  //   profile:             optional parameter for config profile name
  //                        default value is 'DEFAULT'
  //   configFileLocation:  optional parameter for config file location
  //                        default value is ~/.oci/config
  const config = {
    tokenAuthConfigOci: {
      profile: process.env.NODE_ORACLEDB_PROFILE,
      configFileLocation: process.env.NODE_ORACLEDB_CONFIG_FILE_LOCATION,
      authType: process.env.NODE_ORACLEDB_AUTHTYPE,
    },
    externalAuth: true,
    homogeneous: true,
    connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,
  };

  try {

    // Create pool using token based authentication
    await oracledb.createPool(config);

    // A real app would call createConnection() multiple times over a long
    // period of time.  During this time the pool may grow.  If the initial
    // token has expired, node-oracledb will automatically call the
    // accessTokenCallback function allowing you to update the token.
    await createConnection();

  } catch (err) {
    console.error(err);
  } finally {
    await closePoolAndExit();
  }
}

async function createConnection() {
  let connection;
  try {
    // Get a connection from the default pool
    connection = await oracledb.getConnection();
    const sql = `SELECT TO_CHAR(current_date, 'DD-Mon-YYYY HH24:MI') AS D
                 FROM DUAL`;
    const result = await connection.execute(sql);
    console.log("Result is:\n", result);
  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      // Put the connection back in the pool
      await connection.close();
    }
  }
}

async function closePoolAndExit() {
  console.log('\nTerminating');
  try {
    // Get the pool from the pool cache and close it
    await oracledb.getPool().close(0);
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

process
  .once('SIGTERM', closePoolAndExit)
  .once('SIGINT', closePoolAndExit);

run();

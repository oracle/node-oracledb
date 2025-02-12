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
 *   sampleazurecloudnativetokenauth.js
 *
 * DESCRIPTION
 *   This script shows connection pooling with token based authentication.
 *
 * PREREQUISITES
 *   - node-oracledb 6.8 or later.
 *
 *   - While using Thick mode:
 *     Oracle Client libraries 19.15 (or later), or 21.7 (or later).
 *
 *   - The @azure/msal-node package.
 *     See https://www.npmjs.com/package/@azure/msal-node
 *
 *   - Set these environment variables (see the code explanation):
 *     NODE_ORACLEDB_CLIENTID, NODE_ORACLEDB_SCOPES,
 *     NODE_ORACLEDB_AUTHORITY, NODE_ORACLEDB_CLIENTSECRET,
 *     NODE_ORACLEDB_CONNECTIONSTRING, NODE_ORACLEDB_AUTHTYPE,
 *     NODE_ORACLEDB_DRIVER_MODE, NODE_ORACLEDB_CLIENT_LIB_DIR,
 *     NODE_ORACLEDB_PROXYURL, PLUGIN_TOKEN_AZURE
********************************************************************************/

const oracledb = require('oracledb');
// Loading plugin modules.
// eslint-disable-next-line no-unused-vars
const tokenPlugin = require('oracledb/plugins/token/extensionAzure');

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

// In case of generating azure tokens behind proxy, use below code.
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const proxyUrl = process.env.NODE_ORACLEDB_PROXYURL;
const proxyAgent = new HttpsProxyAgent(proxyUrl);

async function sendGetRequestAsync(url, options) {
  const response = await fetch(url, { agent: proxyAgent, ...options });
  const json = await response.json();
  const headers = response.headers.raw();
  const obj = {
    headers: Object.create(Object.prototype, headers),
    body: json,
    status: response.status,
  };
  return obj;
}

async function sendPostRequestAsync(url, options) {
  const sendingOptions = options || {};
  sendingOptions.method = 'post';
  const response = await fetch(url, { agent: proxyAgent, ...sendingOptions });
  const json = await response.json();
  const headers = response.headers.raw();
  const obj = {
    headers: Object.create(Object.prototype, headers),
    body: json,
    status: response.status,
  };
  return obj;
}

async function run() {
  // Configuration for token based authentication:
  //   externalAuth:        Must be set to true for token based authentication
  //   homogeneous:         Must be set to true for token based authentication
  //   connectString:       The NODE_ORACLEDB_CONNECTIONSTRING environment
  //                        variable set to the connection string of your Oracle
  //                        Autonomous Database
  //  Configuration for tokenAuthConfigAzure:
  //    authType:           Must be set to authentication type.
  //                        Types are:
  //                        azureServicePrincipal for OAuth 2.0
  //    clientId:           Must be set to app id of Azure's application
  //    authority:          Must be set to a string, in URI format with tenant
  //                        https://{identity provider instance}/{tenantId}
  //                        Common authority URLs:
  //                        https://login.microsoftonline.com/<tenant>/
  //                        https://login.microsoftonline.com/common/
  //                        https://login.microsoftonline.com/organizations/
  //                        https://login.microsoftonline.com/consumers/
  //    scopes:             Must be set https://{uri}/clientID/.default for client
  //                        credential flows
  //    clientSecret:       Can be set only when authType property is set to
  //                        azureServicePrincipal. clientSecret is a string that
  //                        Azure applications use to prove their identity
  //                        when requesting a token.
  //    proxy:              Optional to be set while using token generation behind
  //                        firewall.
  const config = {
    tokenAuthConfigAzure: {
      clientId: process.env.NODE_ORACLEDB_CLIENTID,
      authority: process.env.NODE_ORACLEDB_AUTHORITY,
      scopes: process.env.NODE_ORACLEDB_SCOPES,
      clientSecret: process.env.NODE_ORACLEDB_CLIENTSECRET,
      authType: process.env.NODE_ORACLEDB_AUTHTYPE,
      proxy: {sendGetRequestAsync, sendPostRequestAsync},
    },
    externalAuth: true,
    homogeneous: true,
    connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,
  };

  try {

    // Create a connection pool using token based authentication
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
  // Get a connection from the default pool
  const connection = await oracledb.getConnection();
  try {
    const sql = `SELECT TO_CHAR(current_date, 'DD-Mon-YYYY HH24:MI') AS D
                 FROM DUAL`;
    const result = await connection.execute(sql);
    console.log("Result is:\n", result);
  } finally {
    await connection.close();
  }
}

async function closePoolAndExit() {
  console.log('\nTerminating');
  // Get the pool from the pool cache and close it
  await oracledb.getPool().close(0);
}

run();

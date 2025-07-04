/* Copyright (c) 2025, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   fileProviderTest.js
 *
 * DESCRIPTION
 *   This script requires the following npm modules (Node.js version >=18.0.0):
 *   - '@azure/identity'
 *   - 'oci-secrets'
 *   - 'oci-common'
 *   - '@azure/keyvault-secrets'
 *
 * SETUP
 *   1. Create a json file in the local file system
 *   2. Set connectionString, username and password fields in the json file
 *
 * TESTING
 *   For testing purposes, we have inserted some data in json format.
 *
 *   - connect_descriptor: 'database connect string'
 *   - user: 'username'
 *   - password: 'password'
 *   - password: json format (if stored in vault)
 *    {
 *     type: ocivault/azurevault
 *     authentication:
 *     value:
 *     }
 *
 *   Additionally, add the same set of values under an  alias (e.g., "test") with the same or different values to verify alias functionality.
 *
 * ACCESSING DATA
 *   To access the local Json file config, set the
 *   NODE_ORACLEDB_CONNECTIONSTRING_FILE environment variable in the following format:
 *   config-file://filePath?alias=aliasName&option1=value1&option2=value2...
 *
 * NODE-ORACLEDB USAGE
 *   NODE-ORACLEDB will extract the data from the file and use it
 *   to connect to the database.
 *
 * ENVIRONMENT VARIABLES
 *   Set the following environment variables as per the connection string syntax:
 *   - NODE_ORACLEDB_CONNECTIONSTRING_FILE
 *   - NODE_ORACLEDB_CONNECTIONSTRING_FILE_ALIAS
 *   - NODE_ORACLEDB_CONNECTIONSTRING_FILE_VAULTAZURE
 *   - NODE_ORACLEDB_CONNECTIONSTRING_FILE_OCIVAULT
 *
 *
 * ENV VARIABLE FORMATS
 *   1. NODE_ORACLEDB_CONNECTIONSTRING_FILE:
 *      config-file://{filePath}
 *      Use the filePath which consists of user,password and connectionString parameters in the json file.
 *
 *   2. NODE_ORACLEDB_CONNECTIONSTRING_FILE_VAULTAZURE:
 *      config-azure://{filePath}
 *      Use the filePath such that  password field contains the vault value field as "password": { "type": "vaultazure", "value": "vault_url" }
 *
 *   3. NODE_ORACLEDB_CONNECTIONSTRING_FILE_OCIVAULT:
 *      config-azure://{filePath} // json file path which contains password value in OCIVault
 *      use the filePath such that password field contains "password": { "type": "ocivault", "value": "vault_url" },
 *
 *   4. NODE_ORACLEDB_CONNECTIONSTRING_FILE_ALIAS:
 *      config-azure://{filePath}?key=alias
 *      Use the filePath such that it has one or more aliases.
 */
const oracledb = require('oracledb');
const assert   = require('assert');
require('../../../../lib/configProviders/file.js');
require('../../../../plugins/configProviders/azurevault');
require('../../../../plugins/configProviders/ocivault');
describe('1. OCI Object Storage', function() {
  const config = {};

  // Check for connection string environment variable
  before(function() {
    // This test runs in both node-oracledb Thin and Thick modes.
    // Optionally run in node-oracledb Thick mode
    if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {
      console.log("Running in Thick mode");
      // Thick mode requires Oracle Client or Oracle Instant Client libraries.
      // On Windows and macOS you can specify the directory containing the
      // libraries at runtime or before Node.js starts.  On other platforms (where
      // Oracle libraries are available) the system library search path must always
      // include the Oracle library path before Node.js starts.  If the search path
      // is not correct, you will get a DPI-1047 error.  See the node-oracledb
      // installation documentation.
      let clientOpts = {};
      // On Windows and macOS platforms, set the environment
      // variable NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
      if (process.platform === 'win32' || process.platform === 'darwin') {
        clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
      }
      oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
    } else {
      console.log("Running in Thin mode");
    }

    if (process.env.NODE_ORACLEDB_CONNECTIONSTRING_FILE) {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_FILE;
    } else {
      throw new Error('Connect String is not Set! Try Set Environment Variable NODE_ORACLEDB_CONNECTIONSTRING_FILE.');
    }

    // Check for connection string with alias format
    if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_FILE_ALIAS) {
      throw new Error('Set the connectString with alias format ?alias={aliasName}.Set env variable NODE_ORACLEDB_CONNECTIONSTRING_FILE_ALIAS.For more details see description');
    }

    if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_FILE_OCIVAULT) {
      throw new Error('Set NODE_ORACLEDB_CONNECTIONSTRING_FILE_OCIVAULT. For more Details, See Description');
    }

    if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_FILE_VAULTAZURE) {
      throw new Error('Set NODE_ORACLEDB_CONNECTIONSTRING_FILE_VAULTAZURE. For more Details, See Description');
    }
  });

  describe('1. Local json file configuration Provider', function() {
    it('1.1 Local json file with password as base64', async function() {
      // Connect using basic password in connection string
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_FILE;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.1
    it('1.2 Local Json File with multiple aliases and password type as text ', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_FILE_ALIAS;
      await assert.rejects(
        async () => await oracledb.getConnection(config),
        '', // Failed to retrieve configuration from Centralized Configuration Provider
        // password type text is only allowed in ocivault and azurevault
      );
    }); // 1.2
    it('1.3 Local Json file with password stored in OCIVault ', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_FILE_OCIVAULT;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.3
    it('1.4 Local Json file with password stored in azure vault ', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_FILE_VAULTAZURE;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.4
  });
});

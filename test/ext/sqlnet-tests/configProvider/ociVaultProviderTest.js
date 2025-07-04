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
 *   1. Create an OCI account, Create a vault and set below details as a json object
 *   2. Set connectionString, username and password fields in the json object
 *
 * TESTING
 *   For testing purposes, we have inserted some data in json format.
 *
 *   - connect_descriptor: 'database connect string'
 *   - user: 'username'
 *   - password: 'password'
 *   - password: json format
 *    {
 *     type: ocivault/azurevault
 *     authentication:
 *     value:
 *     }
 *
 *
 *
 * ACCESSING DATA
 *   To access the OCI Vault Config Provider set the
 *   NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULTCONFIG environment variable in the following format:
 *   config-file://ocidvault?&option1=value1&option2=value2...
 *
 * NODE-ORACLEDB USAGE
 *   NODE-ORACLEDB will extract the data from the OCI Vault and use it
 *   to connect to the database.
 *
 * ENVIRONMENT VARIABLES
 *   Set the following environment variables as per the connection string syntax:
 *   - NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULTCONFIG
 *   - NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULT_PLAIN_TEXT
 *   - NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULT_B64
 *   - NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULT_AZUREVAULT
 *
 *
 * ENV VARIABLE FORMATS
 *   1. NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULTCONFIG:
 *      sqlplus /@"config-ocivault://<ocid vault>[?option1=value1&option2=value2...]"
 *      Use the ocidvault such that password field contains "password": { "type": "ocivault", "value": "vault_url" },
 *
 *   2. NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULT_PLAIN_TEXT:
 *      sqlplus /@"config-ocivault://<ocid vault>[?option1=value1&option2=value2...]"
 *      Use the ocidvault such that  password field type is "plain text"
 *
 *   3. NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULT_B64
 *      sqlplus /@"config-ocivault://<ocid vault>[?option1=value1&option2=value2...]" // json file path which contains password value in OCIVault
 *      use the filePath such that password is stored in base64 format.
 *
 *   4. NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULT_AZUREVAULT
 *      sqlplus /@"config-ocivault://<ocid vault>[?option1=value1&option2=value2...]"
 *      Use the ocidvault such that  password field contains the vault value field as "password": { "type": "vaultazure", "value": "vault_url" }
 */
const oracledb = require('oracledb');
const assert   = require('assert');
require('../../../../plugins/configProviders/ocivault');
require('../../../../plugins/configProviders/azurevault');
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
    if (process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULTCONFIG) {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULTCONFIG;
    } else {
      throw new Error('Connect String is not Set! Try Set Environment Variable NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULTCONFIG.');
    }
    if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULT_PLAIN_TEXT)
      throw new Error('Connect String is not Set! Try Set Environment Variable NODE_ORACLEDB_CONNECTIONSTRING_PLAIN_TEXT.');
    if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULT_B64)
      throw new Error('Connect String is not Set! Try Set Environment Variable NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULT_B64.');
    if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULT_AZUREVAULT)
      throw new Error('Connect String is not Set! Try Set Environment Variable NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULT_AZUREVAULT.');
  });

  describe('1. OCI Vault', function() {

    it('1.1 OCI Vault , password stored in OCI Vault ', async function() {
      // Connect using basic password in connection string
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULTCONFIG;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.1
    it('1.2 OCI Vault, password stored in plain text format ', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULT_PLAIN_TEXT;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.2
    it('1.3 OCI Vault, password stored in base64 format ', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULT_B64;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.3
    it('1.4 OCI Vault, password stored in Azure Vault ', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIVAULT_AZUREVAULT;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.4
  });
});

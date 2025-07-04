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
 *   azureVaultProviderTest.js
 *
 * DESCRIPTION
 *   This script requires the following npm modules (Node.js version >=18.0.0):
 *   - '@azure/identity'
 *   - '@azure/keyvault-secrets'
 *
 * SETUP
 * SETUP
 *   1. Create an Azure Configuration Store account and set up key/value pairs
 *      such as key/connect_descriptor, key/user, key/password.
 *   2. Setup secret key values in azure Vault using json.stringify(json)
 *   2. Obtain the necessary credentials to access the data:
 *      (https://learn.microsoft.com/en-us/azure/azure-app-configuration/)
 *      (https://docs.oracle.com/en/database/oracle/oracle-database/23/netag/configuring-naming-methods.html#GUID-DBCA9021-F3E1-4B30-8F17-A98900299D73)
 *
 *
 * TESTING
 *   For testing purposes, we have set some secrets in azureVault.
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
 *   To access the Azure Vault Config Provider set the
 *   NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT environment variable in the following format:
 *   config-azurevault://<azure secret url>?&option1=value1&option2=value2...
 *   <azure secret url> can be in https:// format or without
 *
 * NODE-ORACLEDB USAGE
 *   NODE-ORACLEDB will extract the data from the Azure Vault and use it
 *   to connect to the database.
 *
 * ENVIRONMENT VARIABLES
 *   Set the following environment variables as per the connection string syntax:
 *   - NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT
 *   - NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_ENV
 *   - NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_WITHOUT_HTTPS
 *   - NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_B64
 *
 *
 * ENV VARIABLE FORMATS
 *   1. NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT:
 *      config-azurevault://<azure secret url>[?&option1=value1&option2=value2...]
 *      Use the azure secret url such that password field contains "password": { "type": "azurevault", "value": "vault_url" },
 *
 *   2. NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_ENV:
 *       config-azurevault://<azure secret url>
 *       credentials should be specified in environment variables
 *        export AZURE_TENANT_ID=''
 *        export AZURE_CLIENT_ID=''
 *        export AZURE_CLIENT_SECRET=''
 *
 *   3. NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_WITHOUT_HTTPS:
 *      config-azurevault://<azure secret url>[?&option1=value1&option2=value2...]
 *      Use the azure secret url without https://
 *
 *   4. NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_B64
 *      config-azurevault://<azure secret url>[?&option1=value1&option2=value2...]
 *      Use the azure Secret url such that password is in base64 format.
 */
const oracledb = require('oracledb');
const assert   = require('assert');

require('../../../../plugins/configProviders/azurevault');

describe('1. Azure Vault', function() {
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
    if (process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT) {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT;
    } else {
      throw new Error('Connect String is not Set! Try Set Environment Variable NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT.');
    }
    if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_ENV)
      throw new Error('Connect String is not Set! Try Set Environment Variable NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_ENV.');
    if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_WITHOUT_HTTPS)
      throw new Error('Connect String is not Set! Try Set Environment Variable NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_WITHOUT_HTTPS');
    if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_B64)
      throw new Error('Connect String is not Set! Try Set Environment Variable NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_B64');

    if (!process.env.AZURE_TENANT_ID) {
      throw new Error('Set AZURE_TENANT_ID env variable');
    }

    if (!process.env.AZURE_CLIENT_SECRET) {
      throw new Error('Set AZURE_CLIENT_SECRET env variable');
    }

    if (!process.env.AZURE_CLIENT_ID) {
      throw new Error('Set AZURE_CLIENT_ID env variable');
    }
  });

  describe('1. Azure Vault Vault', function() {

    it('1.1 Azure Vault , password stored in Azure Vault ', async function() {
      // Connect using basic password in connection string
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.1
    it('1.2  Azure Vault with credentials set in environment variables', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_ENV;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.2
    it('1.3  Azure Vault with vault url without https://', async function() {
      // Connect using basic password in connection string
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_WITHOUT_HTTPS;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.3
    it('1.4  Azure Vault with password stored as base64 format', async function() {
      // Connect using basic password in connection string
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_B64;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.4
    it('1.5  Azure Vault with password stored as plain text format', async function() {
      if (process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_PT)
        config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZUREVAULT_PT;
      else
        this.skip();
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.5
  });
});

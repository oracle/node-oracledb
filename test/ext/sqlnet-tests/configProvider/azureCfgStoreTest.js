/* Copyright (c) 2024, Oracle and/or its affiliates. */

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
 *   azureCfgStoreTest.js
 *
 * DESCRIPTION
 *   This script requires the following npm modules (Node.js version >=18.0.0):
 *   - '@azure/app-configuration'
 *   - '@azure/identity'
 *   - '@azure/keyvault-secrets'
 *
 * SETUP
 *   1. Create an Azure Configuration Store account and set up key/value pairs
 *      such as key/connect_descriptor, key/user, key/password.
 *   2. Obtain the necessary credentials to access the data:
 *      (https://learn.microsoft.com/en-us/azure/azure-app-configuration/)
 *      (https://docs.oracle.com/en/database/oracle/oracle-database/23/netag/configuring-naming-methods.html#GUID-DBCA9021-F3E1-4B30-8F17-A98900299D73)
 *
 * TESTING
 *   For testing purposes, we have uploaded some data to the Azure Configuration Store.
 *   The data is in key-value pairs:
 *   - testkey/connect_descriptor: 'database connect string'
 *   - testkey/user: 'username'
 *   - testkey/password: 'password'
 *   - testkey/password: {"uri":"vault_url/secrets/secretkey"} (if stored in vault)
 *
 *   Additionally, add the same set of keys to a label (e.g., "test") with the same or different values to verify label functionality.
 *
 * ACCESSING DATA
 *   To access the Azure Configuration Store, set the
 *   NODE_ORACLEDB_CONNECTIONSTRING_AZURE environment variable in the following format:
 *   config-azure://{appconfig-name}[?key=prefix&label=value&option1=value1&option2=value2...]
 *
 * NODE-ORACLEDB USAGE
 *   NODE-ORACLEDB will extract the uploaded data from the cloud and use it
 *   to connect to the database.
 *
 * ENVIRONMENT VARIABLES
 *   Set the following environment variables as per the connection string syntax:
 *   - NODE_ORACLEDB_CONNECTIONSTRING_AZURE
 *   - NODE_ORACLEDB_CONNECTIONSTRING_VAULTAZURE
 *   - NODE_ORACLEDB_CONNECTIONSTRING_CERT_VAULT
 *   - AZURE_TENANT_ID
 *   - AZURE_CLIENT_ID
 *   - AZURE_CLIENT_SECRET
 *
 * ENV VARIABLE FORMATS
 *   1. NODE_ORACLEDB_CONNECTIONSTRING_AZURE:
 *      config-azure://{appconfig-name}[?key=prefix&azure_client_id=...&azure_client_secret=...&azure_tenant_id=...]
 *
 *   2. NODE_ORACLEDB_CONNECTIONSTRING_VAULTAZURE:
 *      config-azure://{appconfig-name}[?key=prefix&azure_client_id=...&azure_client_secret=...&azure_tenant_id=...]
 *      Use the prefix such that the password field contains the vault URI link (prefix/password={"uri":"https://vault_url/secrets/secretkey"}).
 *
 *   3. NODE_ORACLEDB_CONNECTIONSTRING_CERT_VAULT:
 *      config-azure://{appconfig-name}[?key=prefix&azure_client_id=...&azure_client_certificate_path=...&azure_tenant_id=...]
 *
 *   4. NODE_ORACLEDB_CONNECTIONSTRING_WALLET:
 *      config-azure://{appconfig-name}[?key=prefix&azure_client_id=...&azure_client_secret=...&azure_tenant_id=...]
 *      Use the prefix such that the wallet_location field contains the vault URI link (prefix/wallet_location={"uri":"https://vault_url/secrets/secretkey"}).
 */

const assert   = require('assert');
const oracledb = require('oracledb');
require('../../../../plugins/configProviders/azure');

describe('1. Azure Configuration Store', function() {
  const config = {};

  before(function() {

    // This test runs in both node-oracledb Thin and Thick modes.
    // Optionally run in node-oracledb Thick mode
    if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {
      console.log("Thick mode");
      // Thick mode requires Oracle Client or Oracle Instant Client libraries.
      // On Windows and macOS Intel you can specify the directory containing the
      // libraries at runtime or before Node.js starts.  On other platforms (where
      // Oracle libraries are available) the system library search path must always
      // include the Oracle library path before Node.js starts.  If the search path
      // is not correct, you will get a DPI-1047 error.  See the node-oracledb
      // installation documentation.
      let clientOpts = {};
      // On Windows and macOS Intel platforms, set the environment
      // variable NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
      if (process.platform === 'win32' || (process.platform === 'darwin' && process.arch === 'x64')) {
        clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
      }
      oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
    }
    if (process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZURE) {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZURE;
    } else {
      throw new Error('Connect String is not Set! Set env variable NODE_ORACLEDB_CONNECTIONSTRING_AZURE.');
    }
    if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_VAULTAZURE) {
      throw new Error('Set the connectString with key prefix as such that the password field in the prefix must contain vault_uri details.Set env variable NODE_ORACLEDB_CONNECTIONSTRING_VAULTAZURE.For more details see description');
    }
    if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_CERT_VAULT) {
      throw new Error('Set the connectstring with azure_client_certificate. Set env variable NODE_ORACLEDB_CONNECTIONSTRING_CERT_VAULT. For more Details, See Description');
    }
    if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_WALLET) {
      throw new Error('Set the connectstring with key prefix such that wallet_location field must contain vault_uri details. Set env variable NODE_ORACLEDB_CONNECTIONSTRING_WALLET. For more Details, See Description');
    }
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

  describe('1. Azure Config Store', function() {
    it('1.1 Azure Config Store with password as text', async function() {
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.1

    it('1.2 Azure Config Store with password stored in azure vault ', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_VAULTAZURE;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.2

    it('1.3 Azure Config Store with password stored in azure vault and certificate path given ', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_CERT_VAULT;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.3

    it('1.4 Azure Config Store with credentials set in environment variables', async function() {
      //connectstring is truncated to not use the authentication parameters...
      const url = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZURE;
      const end = url.substring(url.indexOf('?'));
      config.connectString = url.substring(0, url.indexOf('?')) + end.substring(0, end.indexOf('&'));
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.4

    it('1.5 Azure Config Store with password stored in azure vault and OCI PARAMETERS GIVEN', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_CERT_VAULT;
      // Create pool connection and validate the connection using a select query
      const pool = await oracledb.createPool(config);
      const connection = await pool.getConnection();

      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);

      await connection.close();
      await pool.close(0);
    }); // 1.5

    it('1.6 Connection to the database using configuration from Azure Config Store ', async function() {
      config.connecString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZURE;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.6

    it('1.7 Connection to the database using label in the connectstring ', async function() {
      // Labels allow you to create variants of a key tailored
      // for specific use-cases like supporting multiple environments.
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_CERT_VAULT + '&label=test';
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.7

    it('1.8 Connection to the database using wrong label in the connectstring ', async function() {
      // Labels allow you to create variants of a key tailored
      // for specific use-cases like supporting multiple environments.
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_CERT_VAULT + '&label=test1';
      oracledb.getConnection(config);
      await assert.rejects(
        async () => await oracledb.getConnection(config),
        ''
      );
    }); // 1.8

    it('1.9 Azure Config Store with missing key-value pair', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZURE + '&key=nonexistent_key';
      // Config files allow users to obtain the connection.
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.9

    it('1.10 Azure Config Store with invalid client ID', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZURE.replace(process.env.AZURE_CLIENT_ID, 'invalid_client_id');
      // Config files allow users to obtain the connection.
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.10

    it('1.11 Azure Config Store with expired token', async function() {
      // Simulate expired token scenario
      process.env.AZURE_CLIENT_SECRET = 'expired_token';
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZURE;
      // Config files allow users to obtain the connection.
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.11

    it('1.12 Validate connection pool settings from Azure Config Store', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_CERT_VAULT;
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.poolMin, 2);
      assert.strictEqual(pool.poolMax, 5);
      assert.strictEqual(pool.poolIncrement, 2);
      assert.strictEqual(pool.poolTimeout, 40);
      await pool.close(0);
    }); // 1.12

    it('1.13 Validate connection with multiple key-value pairs', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZURE + '&key=connect_descriptor,user,password';
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
      await connection.close();
    }); // 1.13

    it('1.14 Azure Config Store with key and label set through environment variables', async function() {
      process.env.AZURE_KEY = 'testkey';
      process.env.AZURE_LABEL = 'test';
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZURE;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
      await connection.close();
    }); // 1.14

    it('1.15 Connection with pooling', async function() {
      const pool = await oracledb.createPool({
        user: process.env.NODE_ORACLEDB_USER,
        password: process.env.NODE_ORACLEDB_PASSWORD,
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_CERT_VAULT,
        poolMin: 2,
        poolMax: 10,
        poolIncrement: 1
      });
      assert.strictEqual(pool.poolMin, 2);
      assert.strictEqual(pool.poolMax, 5);
      assert.strictEqual(pool.poolIncrement, 2);
      const connection = await pool.getConnection();
      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
      await connection.close();
      await pool.close();
    }); // 1.15

    it('1.16 Azure Config Store with missing client ID', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZURE.replace(/azure_client_id=[^&]+/, '');
      await assert.rejects(
        async () => await oracledb.getConnection(config),
        ''
      );
    }); // 1.16

    it('1.17 Azure Config Store with missing client secret', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZURE.replace(/azure_client_secret=[^&]+/, '');
      process.env.AZURE_CLIENT_SECRET = '';
      await assert.rejects(
        async () => await oracledb.getConnection(config),
        '' // Failed to retrieve configuration from Centralized Configuration Provider
        // Invalid client secret provided
      );
    }); // 1.17

    it('1.18 Azure Config Store with missing tenant ID', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZURE.replace(/azure_tenant_id=[^&]+/, '');
      await assert.rejects(
        async () => await oracledb.getConnection(config),
        '' //Azure Authentication Failed:
      );
    }); // 1.18

    it('1.19 Azure Config Store with incorrect key prefix', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AZURE.replace(/key=[^&]+/, 'key=wrongKey/');
      await assert.rejects(
        async () => await oracledb.getConnection(config),
        '' //Failed to retrieve configuration from Centralized Configuration Provider
      );
    }); // 1.19

    it('1.20 Azure Config Store with certificate path missing', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_CERT_VAULT.replace(/azure_client_certificate_path=[^&]+/, '');
      await assert.rejects(
        async () => await oracledb.getConnection(config),
        '' //Failed to retrieve configuration from Centralized Configuration Provider:
        // EnvironmentCredential authentication failed
      );
    }); // 1.20

    it('1.21 Azure Config Store with an incorrect certificate path', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_CERT_VAULT.replace(/azure_client_certificate_path=[^&]+/, 'azure_client_certificate_path=wrong/path/to/cert.pem');
      await assert.rejects(
        async () => await oracledb.getConnection(config),
        '' //Failed to retrieve configuration from Centralized Configuration Provider
      );
    }); // 1.21
    it('1.22 Azure Config Store with wallet stored in vault ', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_WALLET;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.22
  });
});

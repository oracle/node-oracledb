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
 *   ociObjectStoreTest.js
 *
 * DESCRIPTION
 *   This script requires the following npm modules:
 *   - 'oci-common'
 *   - 'oci-objectstorage'
 *   - 'oci-secrets'
 *
 * SETUP
 *   1. Create an OCI account, a bucket, and upload objects to the cloud.
 *   2. Obtain the necessary credentials to access the data:
 *      (https://docs.oracle.com/en/cloud/saas/account-reconcile-cloud/suarc/setup_object_storage_attachments_config_oci.html)
 *      (https://docs.oracle.com/en/database/oracle/oracle-database/23/netag/configuring-naming-methods.html#GUID-DBCA9021-F3E1-4B30-8F17-A98900299D73)
 *
 * TESTING
 *   We have to upload data to OCI Object Storage for testing purposes. The data should be in JSON format:
 *   {
 *     "connect_descriptor": "database_connect_string",
 *     "user": "userid",
 *     "password": "pwd"
 *   }
 *
 * ACCESSING DATA
 *   To access OCI Object Storage, set the NODE_ORACLEDB_CONNECTIONSTRING_OCI environment variable in the following format:
 *   config-ociobject://<object_store_server_name>/n/{namespace}/b/{bucketname}/o/{filename}[/c/{network_service_name_or_alias}][?option1=value1&option2=value2...]
 *
 * NODE-ORACLEDB USAGE
 *   NODE-ORACLEDB will extract the uploaded data from the cloud and use it to connect to the database.
 *
 * CONFIGURATION FILE
 *   The default config file is located at ~/.oci/config. This can be used to connect to the cloud without setting authentication parameters in each connection string:
 *   vi ~/.oci/config
 *   [DEFAULT]
 *   key_file=path/to/oci_key_file.pem'
 *   user=oci_user
 *   fingerprint=oci_fingerprint
 *   tenancy=tenancy
 *   region=regionid
 *
 *   Add a new profile [TEST] to the default config file:
 *   [TEST]
 *   key_file='path/to/oci_key_file.pem'
 *   user=oci_user
 *   fingerprint=oci_fingerprint
 *   tenancy=tenancy
 *   region=regionid
 *
 * ENVIRONMENT VARIABLES
 *   Set the following environment variables with the correct namespace, bucket name, and credentials as per the connection string syntax:
 *   - NODE_ORACLEDB_CONNECTIONSTRING_OCI
 *   - NODE_ORACLEDB_CONNECTIONSTRING_ALIAS
 *   - NODE_ORACLEDB_CONNECTIONSTRING_OCIPARAMS
 *   - NODE_ORACLEDB_CONNECTIONSTRING_OCI_AZUREVAULT
 *
 * ENV VARIABLE FORMATS
 *   1. NODE_ORACLEDB_CONNECTIONSTRING_OCI:
 *      config-ociobject://<object_store_server_name>/n/{namespace}/b/{bucketname}/o/{filename}[?oci_tenancy=...&oci_user=...&oci_fingerprint=...&oci_key_file=...]
 *
 *   2. NODE_ORACLEDB_CONNECTIONSTRING_OCIPARAMS:
 *      config-ociobject://<object_store_server_name>/n/{namespace}/b/{bucketname}/o/{filename}?
 *      {filename} should contain OCI parameters:
 *      {
 *        "connect_descriptor": "Database Connect String",
 *        "user": "userName",
 *        "password": { "type": "ocivault", "value": "vault_url" },
 *        "node-oracledb": {
 *          "poolMin": 2,
 *          "poolMax": 5,
 *          "poolIncrement": 2,
 *          "poolTimeout": 39,
 *          "poolPingInterval": 15,
 *          "poolPingTimeout": 50,
 *          "stmtCacheSize": 1000,
 *          "prefetchRows": 10
 *        }
 *      }
 *
 *   3. NODE_ORACLEDB_CONNECTIONSTRING_ALIAS:
 *      config-ociobject://<object_store_server_name>/n/{namespace}/b/{bucketname}/o/{filename}[/c/{network_service_name_or_alias}]?
 *      {filename} should have the following structure:
 *      {
 *        "alias": {
 *          "connect_descriptor": "Database Connect String",
 *          "user": "username",
 *          "password": "password"
 *        }
 *      }
 *
 *   4. NODE_ORACLEDB_CONNECTIONSTRING_OCI_AZUREVAULT:
 *      config-ociobject://<object_store_server_name>/n/{namespace}/b/{bucketname}/o/{filename}?
 *      {filename} content should include Azure Vault details:
 *      {
 *        "password": {
 *          "type": "vault-azure",
 *          "value": "https://vault_url/secrets/secretKey",
 *          "authentication": {
 *            "azure_client_secret": "clientsecret_value",
 *            "azure_client_id": "clientid_value",
 *            "azure_tenant_id": "tenantid_value"
 *          }
 *        }
 *      }
 *    5. NODE_ORACLEDB_CONNECTIONSTRING_WALLET:
 *       config-ociobject://<object_store_server_name>/n/{namespace}/b/{bucketname}/o/{filename}?
 *       {filename} should contain wallet_location parameter :
 *       "wallet_location": { "type": "ocivault", "value": "vault_url" },
*/
const oracledb = require('oracledb');
const assert   = require('assert');
const os = require('os');
const fs = require('fs');
const path = require('path');

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
    if (process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCI) {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCI;
    } else {
      throw new Error('Connect String is not Set! Try Set Environment Variable NODE_ORACLEDB_CONNECTIONSTRING_OCI.');
    }

    // Check for connection string with alias format
    if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_ALIAS) {
      throw new Error('Set the connectString with alias format /c{aliasName}.Set env variable NODE_ORACLEDB_CONNECTIONSTRING_ALIAS.For more details see description');
    }

    // Check for connection string with object parameters
    if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIPARAMS) {
      throw new Error('Set the connectstring with objectName as such which has ociparameters in the cloud config. Set NODE_ORACLEDB_CONNECTIONSTRING_OCIPARAMS. For more Details, See Description');
    }

    if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_WALLET) {
      throw new Error('Set the connectstring with objectName as such which has wallet_location in the cloud config and its value is stored in OCI vault. Set NODE_ORACLEDB_CONNECTIONSTRING_WALLET. For more Details, See Description');
    }
  });

  describe('1. OCI Object Store', function() {
    const path1 = path.join(os.homedir(), '.oci/config');
    const path2 = path.join(os.homedir(), '.oci/config1');
    before(function() {
      // Copy config file if necessary before tests
      if (!fs.existsSync(path1))
        fs.copyFileSync(path2, path1);
      fs.copyFileSync(path1, path2);
    });

    after(function() {
      // Restore original config file after tests
      if (!fs.existsSync(path1))
        fs.copyFileSync(path2, path1);
      fs.rmSync(path2);
    });
    it('1.1 OCI Object Store with password in base64 format', async function() {
      // Connect using basic password in connection string
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.1

    it('1.2 OCI Object Store with alias name (key=alias) provided by user ', async function() {
      // Use connection string with alias name
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_ALIAS;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.2

    it('1.3 OCI Object Store, Use connectionString instead of connectString', async function() {
      // Use connectionString property with full connection string
      const connection = await oracledb.getConnection({
        connectionString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCI
      });
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.3

    it('1.4 OCI Object Store with password stored in OCI-Vault', async function() {
      // Use connection string with OCI parameters
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIPARAMS;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.4

    it('1.5 OCI Object Store with no authentication parameters provided ', async function() {
      // Use default config file and profile
      // In this case, parameters will be picked from default
      // configuration File Path(~/.oci/config) and default profile(DEFAULT)
      const url = process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIPARAMS;
      const posQnMarkChar = url.indexOf('?');
      const isAuthParamsPresent = posQnMarkChar != -1 ? true : false;
      if (isAuthParamsPresent) {
        // Skip this test, if the config file is not available in the default
        // location and specified as an auth parameter.
        if (url.includes('oci_profile_path=', url.indexOf('?')))
          this.skip();

        config.connectString = url.substring(0, url.indexOf('?'));
      } else
        config.connectString = url;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.5

    it('1.6 Wrong user in the OCI Object Store', async function() {
      // Test for invalid credentials (user)
      config.user = 'random';
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCI;
      await assert.rejects(
        async () => await oracledb.getConnection(config),
        /ORA-01017:/ // ORA-01017: invalid credential or not authorized; logon denied
      );
    }); // 1.6

    it('1.7 Precedence over cloudConfig wrong user is provided in the input config', async function() {
      config.user = 'test';
      config.connectString =  process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIPARAMS;
      await assert.rejects(
        async () => await oracledb.getConnection(config),
        /ORA-01017:/ // ORA-01017: invalid credential or not authorized; logon denied
      );
    }); // 1.7

    it('1.8 Precedence over cloudConfig when wrong password is provided in the input config ', async function() {
      config.password = 'test'; //intentionally provide wrong password
      await assert.rejects(
        async () => await oracledb.getConnection(config),
        /ORA-01017:/ // ORA-01017: invalid credential or not authorized; logon denied
      );
    }); // 1.8

    it('1.9 OCI Object Store has some oci parameters under node-oracledb', async function() {
      const pool = await oracledb.createPool({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIPARAMS
      });
      assert.strictEqual(pool.stmtCacheSize, 1000);
      assert.strictEqual(pool.poolMin, 2);
      assert.strictEqual(pool.poolMax, 5);
      assert.strictEqual(pool.poolIncrement, 2);
      assert.strictEqual(pool.poolTimeout, 39);
      assert.strictEqual(pool.poolPingInterval, 15);
      assert.strictEqual(pool.poolPingTimeout, 50);
      await pool.close();
    }); // 1.9

    it('1.10 Given Profile not in the configuration File ', async function() {
      await assert.rejects(
        async () => await oracledb.getConnection({
          connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIPARAMS + 'oci_profile=test'
        }),
        /NJS-523:/ // NJS-523: Failed to retrieve configuration from Centralized Configuration Provider:\n No profile named test exists in the configuration file.
      );
    }); // 1.10

    it('1.11 Configuration File does not exist in the given Path.', async function() {
      // Test for missing config file
      await assert.rejects(
        async () => await oracledb.getConnection({
          connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIPARAMS + 'oci_profile_path=' + __dirname + 'nvTest.js'
        }),
        /NJS-523:/ // NJS-523: Failed to retrieve configuration from Centralized Configuration Provider:\n No profile named test exists in the configuration file.
      );
    }); // 1.11

    it('1.12 Parameters Precedence, Cloud Config over given Config', async function() {
      // Test precedence - cloud config over input config
      const options = {
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIPARAMS,
        poolMin: 1, //set as 2 on cloud
        poolMax: 9 // set as 5 on cloud
      };
      const pool = await oracledb.createPool(options);

      assert.strictEqual(pool.poolMin, 2);
      assert.strictEqual(pool.poolMax, 5);
      await pool.close();
    }); // 1.12

    it('1.13 CreatePool, OCI Object Store with basic password ', async function() {
      // Test creating a pool connection
      config.user = process.env.NODE_ORACLEDB_USER;
      config.password = process.env.NODE_ORACLEDB_PASSWORD;
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIPARAMS;
      const pool = await oracledb.createPool(config);
      await pool.close();
    }); // 1.13

    it('1.14 OCI Object Store with different profile(oci_profile)', async function() {
      // Test connection with user given profile (other than DEFAULT)
      const config = {};
      const url = process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIPARAMS;
      const posQnMarkChar = url.indexOf('?');
      const isAuthParamsPresent = posQnMarkChar != -1 ? true : false;
      if (isAuthParamsPresent)
        config.connectString = url + '&oci_profile=TEST';
      else
        config.connectString = url + '?oci_profile=TEST';
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.14

    it('1.15 OCI Object Store with password stored in Azure Vault', async function() {
      // test connection with password stored in azure-vault
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCI_AZUREVAULT;
      if (!config.connectString) this.skip();
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.15

    it('1.16 OCI Object Store with wallet stored in vault', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_WALLET;
      const connection = await oracledb.getConnection(config);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }); // 1.16

    it.only('1.17 OCI Object Store with password stored in text format', async function() {
      config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_ALIAS_TEXT;
      await assert.rejects(
        async () => await oracledb.getConnection(config),
        /NJS-523:/
      );
    }); // 1.17

    describe('1.18 OCI Object Store with default config file removed', function() {
      const config = {};
      beforeEach(function() {
        // Test connection with basic password without default config file
        // Delete the default config file temporarily
        fs.rmSync(path1);
      });

      afterEach(function() {
        // Restore the original config file
        fs.copyFileSync(path2, path1);
      });

      it('1.18.1 OCI Object Store with basic password but no default config file', async function() {
        config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCI;
        const connection = await oracledb.getConnection(config);
        const result = await connection.execute("select 1+1 from dual");
        assert(result.rows[0][0], 2);
        await connection.close();
      }); // 1.18.1

      it('1.18.2 OCI Object Store with custom config file(oci_profile_path)', async function() {
        const url = process.env.NODE_ORACLEDB_CONNECTIONSTRING_OCIPARAMS;
        const posQnMarkChar = url.indexOf('?');
        const isAuthParamsPresent = posQnMarkChar != -1 ? true : false;
        if (isAuthParamsPresent)
          config.connectString = url + '&oci_profile_path=' + path2;
        else
          config.connectString = url + '?oci_profile_path=' + path2;
        const connection = await oracledb.getConnection(config);
        const result = await connection.execute("select 1+1 from dual");
        assert(result.rows[0][0], 2);
        await connection.close();
      }); // 1.18.2
    }); // 1.18
  });
});

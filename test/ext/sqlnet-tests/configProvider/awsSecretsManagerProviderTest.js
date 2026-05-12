/* Copyright (c) 2026, Oracle and/or its affiliates. */

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
 *   awsSecretsManagerProviderTest.js
 *
 * DESCRIPTION
 *   This script requires the following npm modules (Node.js version >=18.0.0):
 *   - '@aws-sdk/client-secrets-manager'
 *   - '@aws-sdk/credential-providers'
 *   - '@smithy/shared-ini-file-loader'
 *   - '@smithy/node-http-handler'
 *   - 'hpagent'
 *
 * SETUP
 *   1. Create an AWS Secrets Manager secret and store configuration values such as:
 *      - Connect descriptor secrets
 *      - User credentials
 *      - Password (plain text or JSON format)
 *   2. Obtain the necessary AWS credentials to access the secrets:
 *      (https://docs.aws.amazon.com/secretsmanager/)
 *   3. Setup AWS credentials in environment or ~/.aws/credentials file
 *
 * TESTING
 *   For testing purposes, set up the following secrets in AWS Secrets Manager:
 *
 *   - connect_descriptor: 'database connect string'
 *   - user: 'username'
 *   - password: 'password'
 *
 *
 * ACCESSING DATA
 *   To access the AWS Secrets Manager Config Provider set the
 *   NODE_ORACLEDB_CONNECTIONSTRING_AWSSM environment variables in the following format:
 *   config-awssecretsmanager://<secret_name>[?aws_region=<region>][&fieldname=<fieldname>]
 *
 * NODE-ORACLEDB USAGE
 *   NODE-ORACLEDB will extract the data from AWS Secrets Manager and use it
 *   to connect to the database.
 *
 * ENVIRONMENT VARIABLES
 *
 *   Required environment variables (must be set for tests to run):
 *   - NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_BASIC
 *     Basic secret with password credentials
 *     Example: config-awssecretsmanager://node-oracledb-basic-secret
 *   - NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_PROFILE
 *     Secret accessed using AWS_PROFILE for credentials
 *     Example: config-awssecretsmanager://node-oracledb-profile-secret?AWS_PROFILE=user
 *   - NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_REGION
 *     Secret with explicit aws_region query parameter
 *     Example: config-awssecretsmanager://node-oracledb-region-secret?aws_region=us-east-1
 *   - NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_FIELDNAME
 *     Secret with fieldname parameter for JSON field extraction
 *     Example: config-awssecretsmanager://node-oracledb-json-secret?aws_region=us-east-1&fieldname=password
 *
 *   Optional environment variables (tests skip if not set):
 *   - NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_B64
 *     Secret with base64 encoded password
 *   - NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_PT
 *     Secret with plain text password
 *   - NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_CONN
 *     Secret containing full connection string
 *   - NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_WALLET
 *     Secret containing wallet location
 *   - NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_PROXY
 *     Secret accessed through HTTPS proxy
 *   - NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_BADJSON
 *     Secret with invalid JSON payload (for error testing)
 *   - NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_BADCREDS
 *     Secret with invalid database credentials (for error testing)
 *
 * AWS SETUP
 *   1. Configure AWS credentials via:
 *      - Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 *      - AWS credentials file: ~/.aws/credentials
 *      - AWS config file: ~/.aws/config
 *      - IAM role (if running on EC2 or ECS)
 *
 *   2. Set AWS region via:
 *      - AWS_REGION environment variable
 *      - AWS_PROFILE environment variable (uses region from profile)
 *      - ~/.aws/config file
 *
 *   3. Ensure IAM permissions for:
 *      - secretsmanager:GetSecretValue
 */
const oracledb = require('oracledb');
const assert   = require('assert');

require('../../../../plugins/configProviders/awssecretsmanager');

describe('2. AWS Secrets Manager Configuration Provider', function() {
  let connection;
  let pool;

  before(function() {
    // This test runs in both node-oracledb Thin and Thick modes.
    if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {
      console.log("Running in Thick mode");
      let clientOpts = {};
      if (process.platform === 'win32' || process.platform === 'darwin') {
        clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
      }
      oracledb.initOracleClient(clientOpts);
    } else {
      console.log("Running in Thin mode");
    }

    const requiredVars = [
      "NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_BASIC",
      "NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_PROFILE",
      "NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_REGION",
      "NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_FIELDNAME",
    ];

    requiredVars.forEach((v) => {
      if (!process.env[v]) {
        throw new Error(`Environment variable ${v} is missing.`);
      }
    });
  });

  afterEach(async function() {
    if (connection) {
      await connection.close();
      connection = null;
    }

    if (pool) {
      await pool.close(0);
      pool = null;
    }
  });

  describe('2.1 Basic connectivity', function() {

    it('2.1.1 Basic AWS Secrets Manager connection', async function() {
      connection = await oracledb.getConnection({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_BASIC,
      });

      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 2.1.1

    it('2.1.2 AWS Secrets Manager with AWS_PROFILE', async function() {
      connection = await oracledb.getConnection({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_PROFILE,
      });

      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 2.1.2

    it('2.1.3 AWS Secrets Manager with explicit region', async function() {
      connection = await oracledb.getConnection({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_REGION,
      });

      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 2.1.3
  }); // 2.1

  describe('2.2 Pool creation', function() {

    it('2.2.1 Connection pool using AWS Secrets Manager configuration', async function() {
      pool = await oracledb.createPool({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_BASIC,
      });

      connection = await pool.getConnection();
      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 2.2.1

    it('2.2.2 Validate pool configuration overrides', async function() {
      pool = await oracledb.createPool({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_BASIC,
        poolMin: 2,
        poolMax: 5,
        poolIncrement: 2,
      });

      assert.strictEqual(pool.poolMin, 2);
      assert.strictEqual(pool.poolMax, 5);
      assert.strictEqual(pool.poolIncrement, 2);
    }); // 2.2.2
  }); // 2.2

  describe('2.3 Invalid configuration', function() {

    it('2.3.1 Invalid secret name', async function() {
      await assert.rejects(
        () => oracledb.getConnection({
          connectString: 'config-awssecretsmanager://invalid-secret-xyz-nonexistent',
        }),
        /NJS-523:/
        // NJS-523: Failed to retrieve configuration from Centralized Configuration Provider
      );
    }); // 2.3.1

    it('2.3.2 Invalid secret payload', async function() {
      if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_BADJSON) {
        this.skip();
      }

      await assert.rejects(
        () => oracledb.getConnection({
          connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_BADJSON,
        }),
        /Failed to retrieve configuration/
      );
    }); // 2.3.2

    it('2.3.3 Bad database credentials in secret', async function() {
      if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_BADCREDS) {
        this.skip();
      }

      await assert.rejects(
        () => oracledb.getConnection({
          connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_BADCREDS,
        }),
        /ORA-01017:/
      );
    }); // 2.3.3
  }); // 2.3

  describe('2.4 Secret format variants', function() {

    it('2.4.1 AWS Secrets Manager with base64 encoded password', async function() {
      if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_B64) {
        this.skip();
      }

      connection = await oracledb.getConnection({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_B64,
      });

      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 2.4.1

    it('2.4.2 AWS Secrets Manager with plain text password', async function() {
      if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_PT) {
        this.skip();
      }

      connection = await oracledb.getConnection({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_PT,
      });

      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 2.4.2

    it('2.4.3 AWS Secrets Manager with connection string from secret', async function() {
      if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_CONN) {
        this.skip();
      }

      connection = await oracledb.getConnection({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_CONN,
      });

      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 2.4.3

    it('2.4.4 AWS Secrets Manager with wallet location from secret', async function() {
      if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_WALLET) {
        this.skip();
      }

      connection = await oracledb.getConnection({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_WALLET,
      });

      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 2.4.4
  }); // 2.4

  describe('2.5 Region and credential handling', function() {

    it('2.5.1 Region resolution precedence', async function() {
      connection = await oracledb.getConnection({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_REGION,
      });

      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 2.5.1

    it('2.5.2 Multiple connections from same secret', async function() {
      const cs = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_BASIC;

      const c1 = await oracledb.getConnection({ connectString: cs });
      const u1 = (await c1.execute("select user from dual")).rows[0][0];
      await c1.close();

      const c2 = await oracledb.getConnection({ connectString: cs });
      const u2 = (await c2.execute("select user from dual")).rows[0][0];
      await c2.close();

      assert.strictEqual(u1, u2);
    }); // 2.5.2
  }); // 2.5

  describe('2.6 HTTPS proxy and advanced scenarios', function() {

    it('2.6.1 AWS Secrets Manager with HTTPS proxy', async function() {
      if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_PROXY) {
        this.skip();
      }

      connection = await oracledb.getConnection({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_PROXY,
      });

      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 2.6.1

    it('2.6.2 Multiple pool instances', async function() {
      const pools = [];

      for (let i = 0; i < 3; i++) {
        const p = await oracledb.createPool({
          connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSSM_BASIC,
          poolMax: 2,
        });

        pools.push(p);
        const c = await p.getConnection();
        const r = await c.execute("select 1+1 from dual");
        assert.strictEqual(r.rows[0][0], 2);
        await c.close();
      }

      for (const p of pools) {
        await p.close(0);
      }
    }); // 2.6.2
  }); // 2.6
});

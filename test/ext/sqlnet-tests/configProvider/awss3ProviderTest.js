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
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 * awsS3ProviderTest.js
 *
 * DESCRIPTION
 * This script requires the following npm modules:
 * - '@aws-sdk/client-s3'
 * - '@aws-sdk/credential-providers'
 * - '@smithy/node-http-handler'
 * - '@smithy/shared-ini-file-loader'
 * - 'hpagent'
 *
 * SETUP
 * 1. Create an AWS S3 Bucket and upload a JSON configuration file.
 * The JSON object should contain key-value pairs for connection, e.g.:
 * {
 * "connectString": "database connect string",
 * "user": "username",
 * "password": "password"
 * }
 * 2. Configure AWS Credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * or ensure a valid profile/role is available in the environment.
 * (https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html)
 *
 * ACCESSING DATA
 * To access the AWS S3 Config Store, set the
 * NODE_ORACLEDB_CONNECTIONSTRING_AWSS3 environment variable in the following format:
 * awss3://{bucket-name}/{key-name}[?aws_region=us-east-1]
 *
 * NODE-ORACLEDB USAGE
 * NODE-ORACLEDB will download the JSON file from the S3 bucket and use it
 * to connect to the database.
 *
 * ENVIRONMENT VARIABLES
 * Set the following environment variables:
 *
 * 1. NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_BASIC
 * Format: config-awss3://s3://bucket-name/key.json
 * Use: Basic connection test (1.1).
 *
 * 2. NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_REGION_ENV
 * Format: config-awss3://s3://bucket-name/key.json
 * Use: Connection test where region is provided via AWS_REGION env var (1.2).
 *
 * 3. NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_QUERY_PARAM
 * Format: config-awss3://s3://bucket-name/key.json?aws_region=us-east-1
 * Use: Connection test where region is provided via query parameter (1.3).
 *
 * 4. AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY (or profile)
 * Use: Credentials for authentication.
 *
 * 5. AWS_ACCESS_KEY_ID (Optional if using profile/IAM)
 *
 * 6. AWS_SECRET_ACCESS_KEY (Optional if using profile/IAM)
 *
 *****************************************************************************/
'use strict';

const assert = require("assert");
const oracledb = require("oracledb");
require("../../../../plugins/configProviders/awss3/index");

describe("1. AWS S3 Configuration Provider", function() {

  let pool;
  let connection;

  before(function() {
    if (process.env.NODE_ORACLEDB_DRIVER_MODE === "thick") {
      oracledb.initOracleClient({
        libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR,
      });
      console.log("Thick mode selected");
    } else {
      console.log("Thin mode selected");
    }

    const requiredVars = [
      "NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_BASIC",
      "NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_REGION_ENV",
      "NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_QUERY_PARAM",
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

  describe("1.1 Basic connectivity", function() {

    it("1.1.1 Basic AWS S3 connection", async function() {
      connection = await oracledb.getConnection({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_BASIC,
      });

      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 1.1.1

    it("1.1.2 AWS S3 connection with AWS_REGION env var", async function() {
      process.env.AWS_REGION ||= "us-east-1";

      connection = await oracledb.getConnection({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_REGION_ENV,
      });

      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 1.1.2

    it("1.1.3 AWS S3 connection with aws_region query parameter", async function() {
      const connectString =
        process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_QUERY_PARAM;

      assert.ok(connectString.includes("aws_region="));

      connection = await oracledb.getConnection({ connectString });
      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 1.1.3
  }); // 1.1

  describe("1.2 Pool creation", function() {

    it("1.2.1 Connection pool using AWS S3 configuration", async function() {
      pool = await oracledb.createPool({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_BASIC,
      });

      connection = await pool.getConnection();
      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 1.2.1

    it("1.2.2 Validate pool overrides", async function() {
      pool = await oracledb.createPool({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_BASIC,
        poolMin: 2,
        poolMax: 5,
        poolIncrement: 2,
      }); // 1.2.2

      assert.strictEqual(pool.poolMin, 2);
      assert.strictEqual(pool.poolMax, 5);
      assert.strictEqual(pool.poolIncrement, 2);
    });
  }); // 1.2

  describe("1.3 Invalid S3 configuration", function() {

    it("1.3.1 Invalid bucket name", async function() {
      const original =
        process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_BASIC;

      const [scheme, rest] = original.split("://");
      const [, ...keyParts] = rest.split("/");

      const invalidBucket =
        `${scheme}://invalid-bucket-xyz/${keyParts.join("/")}`;

      await assert.rejects(
        () => oracledb.getConnection({ connectString: invalidBucket }),
        /NJS-523:/
        // NJS-523: Failed to retrieve configuration from Centralized Configuration Provider
      );
    }); // 1.3.1

    it("1.3.2 Invalid key name", async function() {
      const invalidKey =
        process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_BASIC + "_invalid";

      await assert.rejects(
        () => oracledb.getConnection({ connectString: invalidKey }),
        /NJS-523:/
        // NJS-523: Failed to retrieve configuration from Centralized Configuration Provider
      );
    }); // 1.3.2

    it("1.3.3 Invalid JSON in S3 object", async function() {
      if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_BADJSON) {
        this.skip();
      }

      await assert.rejects(
        () =>
          oracledb.getConnection({
            connectString:
              process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_BADJSON,
          }),
        /Failed to retrieve configuration/
      );
    }); // 1.3.3
  }); // 1.3

  describe("1.4 Region handling and precedence", function() {

    it("1.4.1 Extra fields in config", async function() {
      connection = await oracledb.getConnection({
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_BASIC,
      });

      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 1.4.1

    it("1.4.2 Query param region overrides AWS_REGION", async function() {
      const savedRegion = process.env.AWS_REGION;
      process.env.AWS_REGION = "eu-west-1";

      connection = await oracledb.getConnection({
        connectString:
          process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_QUERY_PARAM,
      });

      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);

      if (savedRegion) {
        process.env.AWS_REGION = savedRegion;
      } else {
        delete process.env.AWS_REGION;
      }
    }); // 1.4.2
  }); // 1.4

  describe("1.5 More scenarios", function() {

    it("1.5.1 Multiple pool instances", async function() {
      const pools = [];

      for (let i = 0; i < 3; i++) {
        const p = await oracledb.createPool({
          connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_BASIC,
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
    }); // 1.5.1

    it("1.5.2 Malformed S3 connection strings", async function() {
      await assert.rejects(
        () => oracledb.getConnection({ connectString: "awss3://" }),
        /NJS-101:|ORA-12261:/
        // NJS-101: invalid connection string format
        // ORA-12261: Cannot connect to database. Syntax error in Easy Connect connection string awss3:/
      );

      await assert.rejects(
        () => oracledb.getConnection({ connectString: "awss3://bucket/" }),
        /NJS-101:|ORA-12262:/
        // NJS-101: no credentials specified
        // ORA-12262: Cannot connect to database. Could not resolve hostname bucket in
        // Easy Connect connection string awss3
      );
    }); // 1.5.2

    it("1.5.3 Configuration persistence across connections", async function() {
      const cs = process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_BASIC;

      const c1 = await oracledb.getConnection({ connectString: cs });
      const u1 = (await c1.execute("select user from dual")).rows[0][0];
      await c1.close();

      const c2 = await oracledb.getConnection({ connectString: cs });
      const u2 = (await c2.execute("select user from dual")).rows[0][0];
      await c2.close();

      assert.strictEqual(u1, u2);
    }); // 1.5.3

    it("1.5.4 Invalid DB credentials in S3 config", async function() {
      if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_BADCREDS) {
        this.skip();
      }

      await assert.rejects(
        () =>
          oracledb.getConnection({
            connectString:
              process.env.NODE_ORACLEDB_CONNECTIONSTRING_AWSS3_BADCREDS,
          }),
        /NJS-523:/
        // NJS-523: Failed to retrieve configuration from Centralized Configuration Provider
      );
    }); // 1.5.4
  }); // 1.5
});

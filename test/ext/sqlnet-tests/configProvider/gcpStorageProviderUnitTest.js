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
 *   gcpStorageProviderUnitTest.js
 *
 * DESCRIPTION
 *   Unit tests for the GCP Storage centralized configuration provider.
 *   These tests validate provider argument parsing, storage option
 *   selection, and mocked GCS retrieval without contacting Google Cloud
 *   Storage.
 *
 * SETUP
 *   This script requires the following npm module:
 *   - '@google-cloud/storage'
 *
 * ACCESSING DATA
 *   To access the GCP Storage Config Store, set the connect string in the
 *   following format:
 *   config-gcpstorage://[project=<project>;]bucket=<bucket>;object=<object>
 *
 * ENVIRONMENT VARIABLES
 *   NODE_ORACLEDB_CONNECTIONSTRING_GCPSTORAGE_BASIC:
 *     Optional live connection string for GCP Storage connectivity tests.
 *     Format:
 *     config-gcpstorage://[project=<project>;]bucket=<bucket>;object=<object>
 *
 *   NODE_ORACLEDB_CONNECTIONSTRING_GCPSTORAGE_BADJSON:
 *     Optional live connection string pointing to a GCS object with invalid
 *     JSON content.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS:
 *     Standard Google SDK ADC environment variable. The provider does not
 *     read or pass this value manually.
 *
 *****************************************************************************/

"use strict";

const assert = require("assert");
const oracledb = require("oracledb");
const GCPStorageProvider = require(
  "../../../../plugins/configProviders/gcpstorage/index.js"
);

const credentialsEnvName = "GOOGLE_APPLICATION_CREDENTIALS";
const connectStringEnvName =
  "NODE_ORACLEDB_CONNECTIONSTRING_GCPSTORAGE_BASIC";
const badJsonConnectStringEnvName =
  "NODE_ORACLEDB_CONNECTIONSTRING_GCPSTORAGE_BADJSON";

function hasEnv(envName) {
  return Object.prototype.hasOwnProperty.call(process.env, envName);
}

function restoreEnv(envName, hadValue, savedValue) {
  if (hadValue) {
    process.env[envName] = savedValue;
  } else {
    delete process.env[envName];
  }
}

function clearCredentialEnv() {
  const savedEnv = {
    hadCredentials: hasEnv(credentialsEnvName),
    credentials: process.env[credentialsEnvName],
  };
  delete process.env[credentialsEnvName];
  return savedEnv;
}

function restoreCredentialEnv(savedEnv) {
  restoreEnv(credentialsEnvName, savedEnv.hadCredentials, savedEnv.credentials);
}

function createProvider(providerArg) {
  return new GCPStorageProvider(
    providerArg || "project=my-project;bucket=my-bucket;object=config.json"
  );
}

function installStorageMock(StorageMock) {
  const storageModulePath = require.resolve("@google-cloud/storage");
  const savedModule = require.cache[storageModulePath];
  require.cache[storageModulePath] = {
    id: storageModulePath,
    filename: storageModulePath,
    loaded: true,
    exports: { Storage: StorageMock },
  };

  return function restoreStorageMock() {
    if (savedModule) {
      require.cache[storageModulePath] = savedModule;
    } else {
      delete require.cache[storageModulePath];
    }
  };
}


describe("1. GCP Storage Configuration Provider", function() {

  let pool;
  let connection;

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
    before(function() {
      if (!process.env[connectStringEnvName]) {
        this.skip();
      }

      if (process.env.NODE_ORACLEDB_DRIVER_MODE === "thick") {
        oracledb.initOracleClient({
          libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR,
        });
        console.log("Thick mode selected");
      } else {
        console.log("Thin mode selected");
      }
    });

    // Verifies end-to-end GCP config resolution with oracledb.getConnection().
    it("1.1.1 Basic GCP Storage connection", async function() {
      connection = await oracledb.getConnection({
        connectString: process.env[connectStringEnvName],
      });

      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 1.1.1

    // Verifies that the live connection string can be reused for another connect.
    it("1.1.2 Configuration persistence across connections", async function() {
      const c1 = await oracledb.getConnection({
        connectString: process.env[connectStringEnvName],
      });
      const u1 = (await c1.execute("select user from dual")).rows[0][0];
      await c1.close();

      const c2 = await oracledb.getConnection({
        connectString: process.env[connectStringEnvName],
      });
      const u2 = (await c2.execute("select user from dual")).rows[0][0];
      await c2.close();

      assert.strictEqual(u1, u2);
    }); // 1.1.2
  }); // 1.1

  describe("1.2 Pool creation", function() {
    before(function() {
      if (!process.env[connectStringEnvName]) {
        this.skip();
      }
    });

    // Verifies that GCP Storage configuration works with createPool().
    it("1.2.1 Connection pool using GCP Storage configuration", async function() {
      pool = await oracledb.createPool({
        connectString: process.env[connectStringEnvName],
      });

      connection = await pool.getConnection();
      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
    }); // 1.2.1

    // Verifies that pool sizing options are preserved with this config provider.
    it("1.2.2 Validate pool overrides", async function() {
      pool = await oracledb.createPool({
        connectString: process.env[connectStringEnvName],
        poolMin: 2,
        poolMax: 5,
        poolIncrement: 2,
      });

      assert.strictEqual(pool.poolMin, 2);
      assert.strictEqual(pool.poolMax, 5);
      assert.strictEqual(pool.poolIncrement, 2);
    }); // 1.2.2
  }); // 1.2

  describe("1.3 Invalid GCP Storage configuration", function() {
    before(function() {
      if (!process.env[connectStringEnvName]) {
        this.skip();
      }
    });

    // Verifies that an invalid object name is reported as provider failure.
    it("1.3.1 Invalid object name", async function() {
      const invalidObject =
        process.env[connectStringEnvName] + "_invalid";

      await assert.rejects(
        () => oracledb.getConnection({ connectString: invalidObject }),
        /NJS-523:/
      );
    }); // 1.3.1

    // Verifies live provider error handling for invalid JSON objects.
    it("1.3.2 Invalid JSON in GCP Storage object", async function() {
      if (!process.env[badJsonConnectStringEnvName]) {
        this.skip();
      }

      await assert.rejects(
        () =>
          oracledb.getConnection({
            connectString: process.env[badJsonConnectStringEnvName],
          }),
        /Failed to retrieve or parse config/
      );
    }); // 1.3.2
  }); // 1.3
  describe("1.4 Provider argument parsing", function() {
    // Verifies that all supported GCP resource identifiers are parsed.
    it("1.4.1 parses provider arguments including optional project", function() {
      const provider = createProvider(
        "project=my-project;bucket=my-bucket;object=config/db.json"
      );

      assert.strictEqual(provider.paramMap.get("project"), "my-project");
      assert.strictEqual(provider.paramMap.get("bucket"), "my-bucket");
      assert.strictEqual(provider.paramMap.get("object"), "config/db.json");
    }); // 1.4.1

    // Verifies that object names can contain unescaped query-like characters.
    it("1.4.2 preserves ampersands and equals signs in object names", function() {
      const provider = createProvider(
        "project=my-project;bucket=my-bucket;object=folder/a&b=file.json"
      );

      assert.strictEqual(
        provider.paramMap.get("object"),
        "folder/a&b=file.json"
      );
    }); // 1.4.2

    // Verifies that escaped semicolons can be used inside object names.
    it("1.4.3 decodes escaped semicolons in object names", function() {
      const provider = createProvider(
        "project=my-project;bucket=my-bucket;object=folder/a%3Bb.json"
      );

      assert.strictEqual(provider.paramMap.get("object"), "folder/a;b.json");
    }); // 1.4.3

    // Verifies that every provider argument is URI-decoded, not only object.
    it("1.4.4 URI-decodes project, bucket, and object values", function() {
      const provider = createProvider(
        "project=my%20project;bucket=my%2Dbucket;object=folder%2Fdb%3Dprod.json"
      );

      assert.strictEqual(provider.paramMap.get("project"), "my project");
      assert.strictEqual(provider.paramMap.get("bucket"), "my-bucket");
      assert.strictEqual(provider.paramMap.get("object"), "folder/db=prod.json");
    }); // 1.4.4

    // Verifies that project can be omitted for object download operations.
    it("1.4.5 accepts provider arguments without project", function() {
      const provider = createProvider("bucket=my-bucket;object=config/db.json");

      assert.strictEqual(provider.paramMap.get("project"), null);
      assert.strictEqual(provider.paramMap.get("bucket"), "my-bucket");
      assert.strictEqual(provider.paramMap.get("object"), "config/db.json");
    }); // 1.4.5

    // Verifies that empty provider argument values are rejected early.
    it("1.4.6 rejects malformed provider arguments", function() {
      assert.throws(
        () => createProvider("project=my-project;bucket=my-bucket;object="),
        /must use bucket=<bucket>;object=<object>/
      );
    }); // 1.4.6

    // Verifies malformed percent escapes are reported instead of being used as
    // an unintended GCS object name.
    it("1.4.7 rejects malformed URI-encoded values", function() {
      assert.throws(
        () =>
          createProvider(
            "project=my-project;bucket=my-bucket;object=config%ZZ.json"
          ),
        URIError
      );
    }); // 1.4.7
  }); // 1.4

  describe("1.5 Storage retrieval", function() {
    let restoreStorageMock;
    let savedCredentialEnv;

    beforeEach(function() {
      savedCredentialEnv = clearCredentialEnv();
    });

    afterEach(function() {
      if (restoreStorageMock) {
        restoreStorageMock();
        restoreStorageMock = null;
      }
      restoreCredentialEnv(savedCredentialEnv);
    });

    // Verifies that the provider downloads and parses JSON from GCS.
    it("1.5.1 downloads and parses GCP Storage configuration JSON", async function() {
      const expectedConfig = {
        connectString: "localhost/orclpdb",
        password: "welcome",
        user: "hr",
      };
      restoreStorageMock = installStorageMock(class {
        constructor(options) {
          assert.deepStrictEqual(options, { projectId: "my-project" });
        }

        bucket(bucketName) {
          assert.strictEqual(bucketName, "my-bucket");
          return {
            file(objectName) {
              assert.strictEqual(objectName, "config.json");
              return {
                download() {
                  return [Buffer.from(JSON.stringify(expectedConfig))];
                },
              };
            },
          };
        }
      });
      const provider = createProvider();

      provider.init();
      assert.deepStrictEqual(await provider.returnConfig(), expectedConfig);
    }); // 1.5.1

    // Verifies GCS object downloads do not require a project argument.
    it("1.5.2 downloads GCP Storage configuration JSON without project", async function() {
      const expectedConfig = {
        connectString: "localhost/orclpdb",
        password: "welcome",
        user: "hr",
      };
      restoreStorageMock = installStorageMock(class {
        constructor(options) {
          assert.deepStrictEqual(options, {});
        }

        bucket(bucketName) {
          assert.strictEqual(bucketName, "my-bucket");
          return {
            file(objectName) {
              assert.strictEqual(objectName, "config.json");
              return {
                download() {
                  return [Buffer.from(JSON.stringify(expectedConfig))];
                },
              };
            },
          };
        }
      });
      const provider = createProvider("bucket=my-bucket;object=config.json");

      provider.init();
      assert.deepStrictEqual(await provider.returnConfig(), expectedConfig);
    }); // 1.5.2

    // Verifies credential discovery remains inside the Google SDK.
    it("1.5.3 does not pass GOOGLE_APPLICATION_CREDENTIALS manually", async function() {
      const expectedConfig = {
        connectString: "localhost/orclpdb",
        password: "welcome",
        user: "hr",
      };
      process.env[credentialsEnvName] = "/tmp/env-service-account.json";
      restoreStorageMock = installStorageMock(class {
        constructor(options) {
          assert.deepStrictEqual(options, { projectId: "my-project" });
        }

        bucket(bucketName) {
          assert.strictEqual(bucketName, "my-bucket");
          return {
            file(objectName) {
              assert.strictEqual(objectName, "config.json");
              return {
                download() {
                  return [Buffer.from(JSON.stringify(expectedConfig))];
                },
              };
            },
          };
        }
      });
      const provider = createProvider();

      provider.init();
      assert.deepStrictEqual(await provider.returnConfig(), expectedConfig);
    }); // 1.5.3

    // Verifies that invalid downloaded JSON is wrapped in the provider error.
    it("1.5.4 wraps invalid GCP Storage JSON errors", async function() {
      restoreStorageMock = installStorageMock(class {
        bucket() {
          return {
            file() {
              return {
                download() {
                  return [Buffer.from("{")];
                },
              };
            },
          };
        }
      });
      const provider = createProvider();

      provider.init();
      await assert.rejects(
        provider.returnConfig(),
        /Failed to retrieve or parse config from GCP Storage/
      );
    }); // 1.5.4

    // Verifies GCS download failures are surfaced as provider failures.
    it("1.5.5 wraps GCP Storage download errors", async function() {
      restoreStorageMock = installStorageMock(class {
        bucket() {
          return {
            file() {
              return {
                download() {
                  throw new Error("object not found");
                },
              };
            },
          };
        }
      });
      const provider = createProvider();

      provider.init();
      await assert.rejects(
        provider.returnConfig(),
        /Failed to retrieve or parse config from GCP Storage: object not found/
      );
    }); // 1.5.5
  }); // 1.5

  describe("1.6 Required arguments", function() {
    for (const [name, providerArg] of [
      ["bucket", "project=my-project;object=config.json"],
      ["object", "project=my-project;bucket=my-bucket"],
    ]) {
      // Verifies that each mandatory URI field is required.
      it(`1.6 rejects a missing ${name}`, function() {
        assert.throws(
          () => createProvider(providerArg),
          new RegExp(`missing required ${name} value`)
        );
      });
    }
  }); // 1.6
});

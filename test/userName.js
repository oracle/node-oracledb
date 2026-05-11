/* Copyright (c) 2021, 2026, Oracle and/or its affiliates. */

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
 *   248. userName.js
 *
 * DESCRIPTION
 *   Testing with username and user.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const crypto    = require('crypto');
const dbConfig  = require('./dbconfig.js');
const assist    = require('./dataTypeAssist.js');
const testsUtil = require('./testsUtil.js');
const encryptDecrypt = require('../lib/thin/protocol/encryptDecrypt.js');

describe('248. userName.js', function() {
  const dbaCredential = {
    username: dbConfig.test.DBA_user,
    password: dbConfig.test.DBA_password,
    walletPassword: dbConfig.walletPassword,
    walletLocation: dbConfig.walletLocation,
    connectString: dbConfig.connectString,
    privilege: oracledb.SYSDBA
  };

  const createUser = async function(userSchema, password) {
    const dbaConn = await oracledb.getConnection(dbaCredential);
    let sql = `create user ${userSchema} identified by ${password}`;
    await dbaConn.execute(sql);

    sql = `grant create session to ${userSchema}`;
    await dbaConn.execute(sql);
    await dbaConn.close();
  };

  const dropUser = async function(userSchema) {
    const dbaConn = await oracledb.getConnection(dbaCredential);

    const sql = `drop user ${userSchema} cascade`;
    await dbaConn.execute(sql);
    await dbaConn.close();
  };

  describe('248.1 test with different size of username', () => {

    it('248.1.1 test with username size 30', async function() {
      if (dbConfig.test.drcp || !dbConfig.test.DBA_PRIVILEGE) this.skip();

      const userSchema = assist.createSchemaString(30);
      const password = testsUtil.generateRandomPassword();
      await createUser(userSchema, password);

      const credential = {
        username: userSchema,
        password: password,
        connectString: dbConfig.connectString
      };

      const conn = await oracledb.getConnection(credential);
      assert(conn);
      await conn.close();

      await dropUser(userSchema);

    }); // 248.1.1

    it('248.1.2 test with username size 100', async function() {
      const runnable = await testsUtil.isLongUserNameRunnable();
      if (dbConfig.test.drcp || !runnable) {
        this.skip();
      }

      const userSchema = assist.createSchemaString(100);
      const password = testsUtil.generateRandomPassword();
      await createUser(userSchema, password);

      const credential = {
        username: userSchema,
        password: password,
        connectString: dbConfig.connectString
      };

      const conn = await oracledb.getConnection(credential);
      assert(conn);
      await conn.close();

      await dropUser(userSchema);

    }); // 248.1.2

    it('248.1.3 test with username size 128', async function() {
      const runnable = await testsUtil.isLongUserNameRunnable();
      if (dbConfig.test.drcp || !runnable) {
        this.skip();
      }

      const userSchema = assist.createSchemaString(128);
      const password = testsUtil.generateRandomPassword();
      await createUser(userSchema, password);

      const credential = {
        username: userSchema,
        password: password,
        connectString: dbConfig.connectString
      };

      const conn = await oracledb.getConnection(credential);
      assert(conn);
      await conn.close();

      await dropUser(userSchema);

    }); // 248.1.3

    it('248.1.4 test with username size 1000', async function() {
      const runnable = await testsUtil.isLongUserNameRunnable();
      if (!runnable) {
        this.skip();
      }

      const dbaConn = await oracledb.getConnection(dbaCredential);
      const userSchema = assist.createSchemaString(1000);
      const sql = `create user ${userSchema} identified by welcome`;

      await assert.rejects(
        async () => await dbaConn.execute(sql),
        /ORA-00972:/
      );
      await dbaConn.close();
    }); // 248.1.4

    it('248.1.5 negative test: username = null', async function() {
      const credential = {
        username: null,
        password: dbConfig.password,
        connectString: dbConfig.connectString
      };
      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /NJS-007:/
      );
    }); // 248.1.5

    it('248.1.6 negative test: username = "null"', async function() {
      const credential = {...dbConfig, username: "null"};
      delete credential.user;
      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /ORA-01017:/
      );
    }); // 248.1.6

    it('248.1.7 negative test: username = undefined', async function() {
      const credential = {...dbConfig};
      delete credential.user;
      credential.username = undefined;

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /ORA-01017:/
      );
    }); // 248.1.7

    it('248.1.8 negative test: username = "undefined"', async function() {
      const credential = {...dbConfig};
      delete credential.user;
      credential.username = "undefined";

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /ORA-01017:/
      );
    }); // 248.1.8

    it('248.1.9 negative test: username = empty string', async function() {
      const credential = {...dbConfig};
      delete credential.user;
      credential.username = '';

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /ORA-01017:/
      );
    }); // 248.1.9

    it('248.1.10 negative test: username = NaN', async function() {
      const credential = {...dbConfig};
      delete credential.user;
      credential.username = NaN;

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /NJS-007:/
      );
    }); // 248.1.10

    it('248.1.11 negative test: username in array', async function() {
      const credential = {...dbConfig};
      delete credential.user;
      credential.username = ["scott", "scott"];

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /NJS-007:/
      );
    }); // 248.1.11

  }); // 248.1

  describe('248.2 test with different size of user', () => {

    it('248.2.1 test with user size 30', async function() {
      if (dbConfig.test.drcp || !dbConfig.test.DBA_PRIVILEGE) this.skip();

      const userSchema = assist.createSchemaString(30);
      const password = testsUtil.generateRandomPassword();
      await createUser(userSchema, password);
      const credential = {...dbConfig};
      delete credential.user;
      credential.username = userSchema;
      credential.password = password;

      const conn = await oracledb.getConnection(credential);
      assert(conn);
      await conn.close();

      await dropUser(userSchema);
    }); // 248.2.1

    it('248.2.2 test with user size 100', async function() {
      const runnable = await testsUtil.isLongUserNameRunnable();
      if (dbConfig.test.drcp || !runnable) {
        this.skip();
      }

      const userSchema = assist.createSchemaString(100);
      const password = testsUtil.generateRandomPassword();
      await createUser(userSchema, password);

      const credential = {
        username: userSchema,
        password: password,
        connectString: dbConfig.connectString
      };

      const conn = await oracledb.getConnection(credential);
      assert(conn);
      await conn.close();

      await dropUser(userSchema);
    }); // 248.2.2

    it('248.2.3 test with user size 128', async function() {
      const runnable = await testsUtil.isLongUserNameRunnable();
      if (dbConfig.test.drcp || !runnable) {
        this.skip();
      }

      const userSchema = assist.createSchemaString(128);
      const password = testsUtil.generateRandomPassword();
      await createUser(userSchema, password);

      const credential = {
        username: userSchema,
        password: password,
        connectString: dbConfig.connectString
      };

      const conn = await oracledb.getConnection(credential);
      assert(conn);
      await conn.close();

      await dropUser(userSchema);

    }); // 248.2.3

    it('248.2.4 test with username size 1000', async function() {
      const runnable = await testsUtil.isLongUserNameRunnable();
      if (!runnable) {
        this.skip();
      }

      const userSchema = assist.createSchemaString(1000);
      const sql = `create user ${userSchema} identified by welcome`;
      const dbaConn = await oracledb.getConnection(dbaCredential);
      await assert.rejects(
        async () => await dbaConn.execute(sql),
        /ORA-00972:/
      );
      await dbaConn.close();
    }); // 248.2.4

    it('248.2.5 negative test: username = null', async function() {
      const credential = {
        user: null,
        password: dbConfig.password,
        connectString: dbConfig.connectString
      };
      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /NJS-007:/
      );
    }); // 248.2.5

    it('248.2.6 negative test: user = "null"', async function() {
      const credential = {...dbConfig};
      credential.user = "null";

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /ORA-01017/
      );
    }); // 248.2.6

    it('248.2.7 negative test: username = undefined', async function() {
      const credential = {...dbConfig};
      credential.user = undefined;

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /ORA-01017:/
      );
    }); // 248.2.7

    it('248.2.8 negative test: username = "undefined"', async function() {
      const credential = {...dbConfig};
      credential.user = "undefined";

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /ORA-01017:/
      );
    }); // 248.2.8

    it('248.2.9 negative test: username = empty string', async function() {
      const credential = {...dbConfig};
      credential.user = "";

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /ORA-01017/
      );
    }); // 248.2.9

    it('248.2.10 negative test: username = NaN', async function() {
      const credential = {
        user: NaN,
        password: dbConfig.password,
        connectString: dbConfig.connectString
      };
      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /NJS-007:/
      );
    }); // 248.2.10

    it('248.2.11 negative test: username in array', async function() {
      const credential = {
        user: ["scott", "scott"],
        password: dbConfig.password,
        connectString: dbConfig.connectString
      };
      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /NJS-007:/
      );
    }); // 248.2.11

  }); // 248.2


  describe('248.3 combo key decryption', function() {
    const plaintext = Buffer.from('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 'hex');
    const iv = Buffer.alloc(16, 0);

    const cases = [
      { name: 'AES-128 combo key', key: Buffer.from(Array.from({ length: 16 }, (_, i) => (i + 1) & 0xFF)), alg: 'aes-128-cbc' },
      { name: 'AES-192 combo key', key: Buffer.from(Array.from({ length: 24 }, (_, i) => (i * 3) & 0xFF)), alg: 'aes-192-cbc' },
      { name: 'AES-256 combo key', key: Buffer.from(Array.from({ length: 32 }, (_, i) => (i * 5) & 0xFF)), alg: 'aes-256-cbc' }
    ];

    cases.forEach((testCase, index) => {
      it(`248.3.${index + 1} decrypts using ${testCase.name}`, function() {
        const cipher = crypto.createCipheriv(testCase.alg, testCase.key, iv);
        cipher.setAutoPadding(false);
        const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        const decrypted = encryptDecrypt.decrypt(testCase.key, ciphertext);
        assert.deepStrictEqual(decrypted, plaintext);
      });
    });

    it('248.3.4 rejects unsupported combo key length', function() {
      const badKey = Buffer.alloc(20, 0xAB);
      const ciphertext = Buffer.alloc(16, 0);
      assert.throws(() => encryptDecrypt.decrypt(badKey, ciphertext), /NJS-188:/);
    });
  });

});

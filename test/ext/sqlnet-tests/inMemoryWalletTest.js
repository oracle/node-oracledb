/* Copyright (c) 2024, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https: *oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http: *www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https: *www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   1. inMemoryWalletTest.js
 *
 * DESCRIPTION
 *   Tests the correctness of the in memory wallet support.
 *   WalletContent is the new parameter to pass in the wallet directly in a string format.
 *
 *   Environment variables used:
 *   NODE_ORACLEDB_USER,
 *   NODE_ORACLEDB_PASSWORD,
 *   NODE_ORACLEDB_CONNECTIONSTRING,
 *   NODE_ORACLEDB_CONNECTIONSTRING_WALLET: Connection string with the wallet_location parameter that points to ewallet.pem
 *   e.g. "tcps://<host>:<port>/<service_name>?
 *        ssl_server_dn_match=off&wallet_location=/path/to/ewallet.pem",
 *   NODE_ORACLEDB_WALLET_LOCATION: Path to ewallet.pem.
 *****************************************************************************/
'use strict';
const oracledb = require("oracledb");
const assert = require('assert');
const fs = require('fs').promises;
const dbConfig = require('../../dbconfig.js');

describe('1. In-memory wallet tests', function() {
  let walletContent, wrongWallet, connectString_wallet, walletPath;
  if (process.env.NODE_ORACLEDB_CONNECTIONSTRING_WALLET) {
    connectString_wallet = process.env.NODE_ORACLEDB_CONNECTIONSTRING_WALLET;
  } else {
    throw new Error('Database Connect String with wallet_location is not Set! Please set the Environment Variable NODE_ORACLEDB_CONNECTIONSTRING_WALLET.');
  }

  if (process.env.NODE_ORACLEDB_WALLET_LOCATION) {
    walletPath = process.env.NODE_ORACLEDB_WALLET_LOCATION;
  } else {
    throw new Error('Wallet Location is not Set! Please set the Environment Variable NODE_ORACLEDB_WALLET_LOCATION.');
  }

  before(async function() {
    if (!oracledb.thin) this.skip();
    walletContent = await fs.readFile(walletPath + 'ewallet.pem', { encoding: "utf8" });
    wrongWallet = await fs.readFile(process.env.ALMCLONE + "test/ext/sqlnet-tests/invalidWallet.pem", { encoding: "utf8" });
  });

  beforeEach(function() {
    dbConfig.walletContent = walletContent;
  });

  async function testConnection(config) {
    const connection = await oracledb.getConnection(config);
    const result = await connection.execute("select 1+1 from dual");
    assert.strictEqual(result.rows[0][0], 2);
    await connection.close();
  }

  it('1.1 correct WalletContent provided in the userConfig', async function() {
    await testConnection(dbConfig);
  }); // 1.1

  it('1.2 wrong WalletContent provided in the userConfig', async function() {
    const wrongConfig = { ...dbConfig, walletContent: wrongWallet };
    await assert.rejects(
      async () => await oracledb.getConnection(wrongConfig),
      /NJS-505:/ // NJS-505: unable to initiate TLS connection. Please check if wallet credentials are valid
    );
  }); // 1.2

  it('1.3 walletContent and walletLocation both provided in the userConfig', async function() {
    const configWithLocation = { ...dbConfig, walletLocation: walletPath };
    await testConnection(configWithLocation);
  }); // 1.3

  it('1.4 walletContent will override wallet_location specified in connect string', async function() {
    const configWithConnectString = { ...dbConfig, connectString: connectString_wallet };
    await testConnection(configWithConnectString);
  }); // 1.4

  it('1.5 empty WalletContent', async function() {
    const emptyConfig = { ...dbConfig, walletContent: '' };
    await testConnection(emptyConfig);
  }); // 1.5

  it('1.6 malformed WalletContent', async function() {
    const malformedConfig = { ...dbConfig, walletContent: 'This is not a valid wallet content' };
    await assert.rejects(
      async () => await oracledb.getConnection(malformedConfig),
      /NJS-505:/ // NJS-505: unable to initiate TLS connection. Please check if wallet credentials are valid
    );
  }); // 1.6

  it('1.7 with connection pooling', async function() {
    const pool = await oracledb.createPool(dbConfig);
    const connection = await pool.getConnection();

    const result = await connection.execute("select 1+1 from dual");
    assert.strictEqual(result.rows[0][0], 2);

    await connection.close();
    await pool.close();
  }); // 1.7

  it('1.8 with different SSL options', async function() {
    const sslConfig = {
      ...dbConfig,
      connectString: connectString_wallet,
      ssl: {
        sslVerify: false,
        sslServerDNMatch: true
      }
    };
    await testConnection(sslConfig);
  }); // 1.8

  it('1.9 WalletContent should take precedence over wallet_location in connectString', async function() {
    const mixedConfig = {
      ...dbConfig,
      connectString: connectString_wallet,
      walletLocation: '/path/to/nonexistent/wallet' // This should be ignored
    };
    await testConnection(mixedConfig);
  }); // 1.9

  it('1.10 with multiple connections using same wallet', async function() {
    const connection1 = await oracledb.getConnection(dbConfig);
    const connection2 = await oracledb.getConnection(dbConfig);

    const result1 = await connection1.execute("select 1+1 from dual");
    const result2 = await connection2.execute("select 1+1 from dual");

    assert.strictEqual(result1.rows[0][0], 2);
    assert.strictEqual(result2.rows[0][0], 2);

    await connection1.close();
    await connection2.close();
  }); // 1.10

  it('1.11 using wallet with different user credentials', async function() {
    const userConfig = {
      ...dbConfig,
      user: 'different_user',
      password: 'different_password'
    };
    await assert.rejects(
      async () => await oracledb.getConnection(userConfig),
      /ORA-01017:/ // ORA-01017: invalid username/password; logon denied
    );
  }); // 1.11

  it('1.12 Case-sensitive wallet content', async function() {
    const wrongCaseContent = walletContent.toUpperCase();
    const wrongCaseConfig = { ...dbConfig, walletContent: wrongCaseContent };
    await assert.rejects(() => oracledb.getConnection(wrongCaseConfig), /NJS-505:/);
  }); // 1.12

  it('1.13 Large wallet content', async function() {
    // Generate a large string to simulate a big wallet content
    const largeContent = 'a'.repeat(10000);
    const largeConfig = { ...dbConfig, walletContent: largeContent };
    await assert.rejects(
      async () => await oracledb.getConnection(largeConfig),
      /NJS-505:/ // NJS-505: unable to initiate TLS connection. Please check if wallet credentials are valid
    );
  }); // 1.13
});

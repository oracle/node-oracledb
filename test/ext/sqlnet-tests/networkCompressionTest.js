/* Copyright (c) 2025, Oracle and/or its affiliates. */

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
 *   1. networkCompressionTest.js
 *
 * DESCRIPTION
    Tests the correct working of networkCompression.
    Add below parameters on server side to enable network
    Compression as the values are negotiated
    between client and server at the time of connection.
    To enable compression, the server's sqlnet.ora file must be configured with:
    sqlnet.compression=on
    sqlnet.compression_levels=(high)

    export NODE_ORACLEDB_HOST = HOSTNAME
    export NODE_ORACLEDB_PORT = PORTNO
    export NODE_ORACLEDB_SERVICENAME = SERVICENAME
    export NODE_ORACLEDB_USER = USERNAME
    export NODE_ORACLEDB_PASSWORD = USERPASSWORD
 *****************************************************************************/
'use strict';
const oracledb = require("oracledb");
const assert   = require('assert');

describe('1. Network Compression', function() {
  let connectString;
  before(function() {
    // This test runs in both node-oracledb Thin and Thick modes.
    // Optionally run in node-oracledb Thick mode
    if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {
      console.log("Thick mode selected");
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
    } else {
      console.log("Thin mode selected");
    }

    // Validate required environment variables
    if (!process.env.NODE_ORACLEDB_HOST ||
      !process.env.NODE_ORACLEDB_SERVICENAME ||
      !process.env.NODE_ORACLEDB_PORT) {
      throw new Error('Please set NODE_ORACLEDB_HOST, NODE_ORACLEDB_PORT, and NODE_ORACLEDB_SERVICENAME');
    }

    connectString = '(DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=' +
     process.env.NODE_ORACLEDB_HOST + ')(PORT=' +
     process.env.NODE_ORACLEDB_PORT + '))' +
     '(CONNECT_DATA=(SERVICE_NAME=' + process.env.NODE_ORACLEDB_SERVICENAME + ')))';
  });

  async function runQuery(dbConfig, expectedCompression) {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute("select 1+1 from dual");
    assert.strictEqual(result.rows[0][0], 2);
    if (oracledb.thin && typeof expectedCompression === 'boolean') {
      assert.strictEqual(connection.isCompressionEnabled(), expectedCompression);
    }
    await connection.close();
  }

  it('1.1 Compression enabled via dbConfig object', async function() {
    if (!oracledb.thin) this.skip();
    const dbConfig = {
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: connectString,
      networkCompression: true,
    };
    await runQuery(dbConfig, true);
  });

  it('1.2 Compression enabled via long TNS string', async function() {
    const dbConfig = {
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: '(DESCRIPTION=(COMPRESSION=ON)(COMPRESSION_LEVELS=(LEVEL=HIGH))' +
                       '(ADDRESS=(PROTOCOL=tcp)(HOST=' + process.env.NODE_ORACLEDB_HOST +
                       ')(PORT=' + process.env.NODE_ORACLEDB_PORT + '))' +
                       '(CONNECT_DATA=(SERVICE_NAME=' + process.env.NODE_ORACLEDB_SERVICENAME + ')))',
    };
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute("select 1+1 from dual");
    assert.strictEqual(result.rows[0][0], 2);
    if (oracledb.thin) {
      assert.strictEqual(connection.isCompressionEnabled(), true);
    }
    await connection.close();
  });

  it('1.3 Compression enabled via EZConnect plus syntax', async function() {
    if (!oracledb.thin) this.skip();
    const dbConfig = {
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: 'tcp://' + process.env.NODE_ORACLEDB_HOST + ':' +
                       process.env.NODE_ORACLEDB_PORT + '/' +
                       process.env.NODE_ORACLEDB_SERVICENAME + '?compression=on'
    };
    await runQuery(dbConfig, true);
  });

  it('1.4 Compression disabled via dbConfig object (explicit false)', async function() {
    if (!oracledb.thin) this.skip();
    const dbConfig = {
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: connectString,
      networkCompression: false,
    };
    await runQuery(dbConfig, false);
  });

  it('1.5 No compression parameter specified (default off)', async function() {
    if (!oracledb.thin) this.skip();
    const dbConfig = {
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: connectString,
    };
    await runQuery(dbConfig, false);
  });

  it('1.6 Compression level low results in compression disabled', async function() {
    const dbConfig = {
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: '(DESCRIPTION=(COMPRESSION=ON)(COMPRESSION_LEVELS=(LEVEL=low))' +
                       '(ADDRESS=(PROTOCOL=tcp)(HOST=' + process.env.NODE_ORACLEDB_HOST +
                       ')(PORT=' + process.env.NODE_ORACLEDB_PORT + '))' +
                       '(CONNECT_DATA=(SERVICE_NAME=' + process.env.NODE_ORACLEDB_SERVICENAME + ')))',
    };
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute("select 1+1 from dual");
    assert.strictEqual(result.rows[0][0], 2);
    if (oracledb.thin) {
      assert.strictEqual(connection.isCompressionEnabled(), false);
    }
    await connection.close();
  });

  it('1.7 Compression persists across multiple queries', async function() {
    if (!oracledb.thin) this.skip();
    const dbConfig = {
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: connectString,
      networkCompression: true,
    };
    const connection = await oracledb.getConnection(dbConfig);

    let result = await connection.execute("select 1+1 from dual");
    assert.strictEqual(result.rows[0][0], 2);
    assert.strictEqual(connection.isCompressionEnabled(), true);

    result = await connection.execute("select sysdate from dual");
    assert.ok(result.rows[0][0]);
    assert.strictEqual(connection.isCompressionEnabled(), true);

    result = await connection.execute("select user from dual");
    assert.ok(result.rows[0][0]);
    assert.strictEqual(connection.isCompressionEnabled(), true);

    await connection.close();
  });

  it('1.8 Connection pool returns connections with compression enabled', async function() {
    if (!oracledb.thin) this.skip();
    const pool = await oracledb.createPool({
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: connectString,
      networkCompression: true,
      poolMin: 2,
      poolMax: 4,
      poolIncrement: 1
    });

    const conn1 = await pool.getConnection();
    const conn2 = await pool.getConnection();
    assert.strictEqual(conn1.isCompressionEnabled(), true);
    assert.strictEqual(conn2.isCompressionEnabled(), true);

    await conn1.close();
    await conn2.close();
    await pool.close();
  });

  it('1.9 Conflicting compression settings (dbConfig vs. connect string)', async function() {
    if (!oracledb.thin) this.skip();
    const dbConfig = {
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      // Connect string explicitly disables compression, overriding dbConfig's true setting
      connectString: '(DESCRIPTION=(COMPRESSION=OFF)' +
                       '(ADDRESS=(PROTOCOL=tcp)(HOST=' + process.env.NODE_ORACLEDB_HOST +
                       ')(PORT=' + process.env.NODE_ORACLEDB_PORT + '))' +
                       '(CONNECT_DATA=(SERVICE_NAME=' + process.env.NODE_ORACLEDB_SERVICENAME + ')))',
      networkCompression: true,
    };
    await runQuery(dbConfig, false);
  });

  it('1.10 Handling invalid compression level parameter', async function() {
    const dbConfig = {
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: '(DESCRIPTION=(COMPRESSION=ON)(COMPRESSION_LEVELS=(LEVEL=INVALID))' +
                       '(ADDRESS=(PROTOCOL=tcp)(HOST=' + process.env.NODE_ORACLEDB_HOST +
                       ')(PORT=' + process.env.NODE_ORACLEDB_PORT + '))' +
                       '(CONNECT_DATA=(SERVICE_NAME=' + process.env.NODE_ORACLEDB_SERVICENAME + ')))',
    };
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute("select 1+1 from dual");
    assert.strictEqual(result.rows[0][0], 2);
    if (oracledb.thin) {
      assert.strictEqual(connection.isCompressionEnabled(), false);
    }
    await connection.close();
  });

  it('1.11 Consistent compression setting on reconnection', async function() {
    if (!oracledb.thin) this.skip();
    const dbConfig = {
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: connectString,
      networkCompression: true,
    };
    let connection = await oracledb.getConnection(dbConfig);
    assert.strictEqual(connection.isCompressionEnabled(), true);
    await connection.close();

    connection = await oracledb.getConnection(dbConfig);
    assert.strictEqual(connection.isCompressionEnabled(), true);
    await connection.close();
  });
});

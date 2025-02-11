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
    Edit sqlnet.ora file :
    sqlnet.compression=on
    sqlnet.compression_levels=(high)

    export NETWORK_COMPRESSION_HOST = HOSTNAME
    export NETWORK_COMPRESSION_PORT = PORTNO
    export NETWORK_COMPRESSION_SVCNAME = SERVICENAME
 *****************************************************************************/
'use strict';
const oracledb = require("oracledb");
const assert   = require('assert');

describe('1. Network Compression', function() {
  let thinMode = 1;
  before(function() {
    // This test runs in both node-oracledb Thin and Thick modes.
    // Optionally run in node-oracledb Thick mode
    if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {
      thinMode = 0;
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
    if (!process.env.NODE_ORACLEDB_HOST)
      throw new Error('Hostname is not Set! Set env variable NODE_ORACLEDB_HOST');
    if (!process.env.NODE_ORACLEDB_SERVICENAME)
      throw new Error('servicename is not Set! Set env variable NODE_ORACLEDB_SERVICENAME');
  });
  const host = process.env.NODE_ORACLEDB_HOST;
  const port = process.env.NODE_ORACLEDB_PORT || '1521';
  const svcName = process.env.NODE_ORACLEDB_SERVICENAME;

  it('1.1 Compression parameters specified in the dbConfig Object', async function() {
    const dbConfig = {
      user: 'scott',
      password: 'tiger',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=' + host + ')(PORT=' + port + '))(CONNECT_DATA=(SERVICE_NAME=' + svcName + ')))',
      networkCompression: true,
    };
    if (!thinMode)
      this.skip();
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute("select 1+1 from dual");
    assert(result.rows[0][0], 2);
    const isCompressed = connection.isCompressionEnabled();
    assert.deepStrictEqual(isCompressed, true);
    await connection.close();
  });

  it('1.2 Compression parameters specified in the connect String which is in long tns format ', async function() {
    const dbConfig = {
      user: 'scott',
      password: 'tiger',
      connectString: '(DESCRIPTION=(COMPRESSION=ON)(COMPRESSION_LEVELS=(LEVEL=HIGH))(ADDRESS=(PROTOCOL=tcp)(HOST=' + host + ')(PORT=' + port + '))(CONNECT_DATA=(SERVICE_NAME=' + svcName + ')))',
    };
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute("select 1+1 from dual");
    assert(result.rows[0][0], 2);
    if (thinMode) {
      const isCompressed = connection.isCompressionEnabled();
      assert.deepStrictEqual(isCompressed, true);
    }
    await connection.close();
  });

  it('1.3 Compression parameters specified in ezconnect plus syntax', async function() {
    const dbConfig = {
      connectString: 'tcp://' + host + ':' + port + '/' + svcName + '?compression=on',
      user: 'scott',
      password: 'tiger',

    };
    if (!thinMode)
      this.skip();
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute("select 1+1 from dual");
    assert(result.rows[0][0], 2);
    const isCompressed = connection.isCompressionEnabled();
    assert.deepStrictEqual(isCompressed, true);
    await connection.close();
  });

  it('1.4 Compression parameters specified in the dbConfig Object, compression set as false', async function() {
    const dbConfig = {
      user: 'scott',
      password: 'tiger',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=' + host + ')(PORT=' + port + '))(CONNECT_DATA=(SERVICE_NAME=' + svcName + ')))',
      networkCompression: false,
    };
    if (!thinMode)
      this.skip();
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute("select 1+1 from dual");
    assert(result.rows[0][0], 2);
    const isCompressed = connection.isCompressionEnabled();
    assert.deepStrictEqual(isCompressed, false);
    await connection.close();
  });

  it('1.5 Compression parameters are not specified in the dbConfig Object', async function() {
    const dbConfig = {
      user: 'scott',
      password: 'tiger',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=' + host + ')(PORT=' + port + '))(CONNECT_DATA=(SERVICE_NAME=' + svcName + ')))',
    };
    if (!thinMode)
      this.skip();
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute("select 1+1 from dual");
    assert(result.rows[0][0], 2);
    const isCompressed = connection.isCompressionEnabled();
    assert.deepStrictEqual(isCompressed, false);
    await connection.close();
  });

  it('1.6 Compression parameters specified in the connect String which is in long tns format, compression level set as low', async function() {
    const dbConfig = {
      user: 'scott',
      password: 'tiger',
      connectString: '(DESCRIPTION=(COMPRESSION=ON)(COMPRESSION_LEVELS=(LEVEL=low))(ADDRESS=(PROTOCOL=tcp)(HOST=' + host + ')(PORT=' + port + '))(CONNECT_DATA=(SERVICE_NAME=' + svcName + ')))',
    };
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute("select 1+1 from dual");
    assert(result.rows[0][0], 2);
    if (thinMode) {
      const isCompressed = connection.isCompressionEnabled();
      assert.deepStrictEqual(isCompressed, false);
    }
    await connection.close();
  });
});

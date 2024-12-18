/* Copyright (c) 2024, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   ociConfigProviderPool.js
 *
 * DESCRIPTION
 *   Sample program using connection pool to connect to the database using
 *   DB connect string, username and password fetched from the OCI
 *   Configuration Providers using the OCI Object Store Connect String URL.
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');

// This example runs in both node-oracledb Thin and Thick modes.
//
// Optionally run in node-oracledb Thick mode
if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {

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

console.log(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');

async function run() {
  // Replace the connect string with correct OCI Config Store URL
  // Replace xxxx in the connect string with the correct authentication parameter values
  let pool, connection;
  const options = {
    connectString: 'config-ociobject://test.region.oraclecloud.com/n/testnamespace/b/testbucket/o/testobject?oci_tenancy=xxxx&oci_user=xxxx&oci_fingerprint=xxxx&oci_key_file=xxxx',
  };
  try {
    // Create a pool and get a connection from the pool
    pool = await oracledb.createPool(options);
    console.log('Pool Created Successfully');

    console.log('pool.stmtCacheSize:', pool.stmtCacheSize);
    console.log('pool.poolMin:', pool.poolMin);
    console.log('pool.poolMax', pool.poolMax);
    console.log('pool.poolIncrement:', pool.poolIncrement);
    console.log('pool.poolTimeout:', pool.poolTimeout);
    console.log('pool.poolPingInterval:', pool.poolPingInterval);
    console.log('pool.poolPingTimeout:', pool.poolPingTimeout);

    connection = await pool.getConnection(options);
    console.log('\nCreated connection from the pool successfully!');

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }

    if (pool) {
      try {
        await pool.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

run();

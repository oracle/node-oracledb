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
 *   soda2.js
 *
 * DESCRIPTION
 *   Simple Oracle Document Access (SODA) example with SodaDocumentCursor
 *   asyncIterators.
 *
 *   Requires Oracle Database and Oracle Client 18.3, or higher.
 *   The user must have been granted the SODA_APP and CREATE TABLE privileges.
 *   https://node-oracledb.readthedocs.io/en/latest/user_guide/soda.html#sodaoverview
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

// This example requires node-oracledb Thick mode.
//
// Thick mode requires Oracle Client or Oracle Instant Client libraries.  On
// Windows and macOS Intel you can specify the directory containing the
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

// The general recommendation for simple SODA usage is to enable autocommit
oracledb.autoCommit = true;

async function run() {
  let connection, collection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    if (oracledb.oracleClientVersion < 1803000000) {
      throw new Error('node-oracledb SODA requires Oracle Client libraries 18.3 or greater');
    }

    if (connection.oracleServerVersion < 1803000000) {
      throw new Error('node-oracledb SODA requires Oracle Database 18.3 or greater');
    }

    const soda = connection.getSodaDatabase();
    collection = await soda.createCollection("Test");
    console.log('Created a SODA collection\n');
    const data = [
      { name: "John", age: 57 },
      { name: "Sally", age: 53 }
    ];
    await collection.insertMany(data);
    const cursor = await collection.find().getCursor();
    console.log('Retrieved SODA document contents as an object using SodaDocumentCursor:');
    // Use the asyncIterator for the sodaDocumentCursor object
    for await (const doc of cursor) {
      console.log(doc.getContent());
    }
    await cursor.close();
  } catch (err) {
    console.error(err);
  } finally {
    if (collection) {
      // Drop the collection
      const res = await collection.drop();
      if (res.dropped) {
        console.log('\nThe collection was dropped');
      }
    }

    if (connection) {
      await connection.close();
    }

  }

}

run();

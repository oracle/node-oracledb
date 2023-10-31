/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

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
 *   selectjson.js
 *
 * DESCRIPTION
 *   Shows some JSON features of Oracle Database 21c.
 *   See https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=ADJSN
 *
 *   For JSON with older databases see selectjsonblob.js
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

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

  let connection;

  try {

    connection = await oracledb.getConnection(dbConfig);

    console.log(connection.oracleServerVersion);
    console.log(connection.thin);

    if (!connection.thin && connection.oracleServerVersion < 2100000000) {
      throw new Error('Running this example in Thick mode requires Oracle Database 21.1 or later. Try selectjsonblob.js.');
    }

    console.log('1. Creating Table');

    try {
      await connection.execute(`DROP TABLE no_purchaseorder`);
    } catch (e) {
      if (e.errorNum != 942)
        console.error(e);
    }

    connection.execute(`CREATE TABLE no_purchaseorder (po_document JSON)`);

    console.log('2. Inserting Data');

    const inssql = `INSERT INTO no_purchaseorder (po_document) VALUES (:bv)`;
    const data = { "userId": 1, "userName": "Anna", "location": "Australia" };
    if (connection.thin || oracledb.oracleClientVersion >= 2100000000) {
      await connection.execute(inssql, { bv: { val: data, type: oracledb.DB_TYPE_JSON } });
    } else {
      // When Thick mode uses older client versions, insert as a JSON string
      const s = JSON.stringify(data);
      const b = Buffer.from(s, 'utf8');
      await connection.execute(inssql, { bv: { val: b } });
    }

    let result, j;

    console.log('3. Selecting JSON stored in a column');

    result = await connection.execute(
      `SELECT po_document
       FROM no_purchaseorder
       WHERE JSON_EXISTS (po_document, '$.location')
       OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY`
    );
    if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
      j = result.rows[0][0];
    } else {
      // Oracle Client libraries < 21 will return a BLOB
      const d = await result.rows[0][0].getData();
      j = await JSON.parse(d);
    }
    console.log('Query results: ', j);

    console.log('4. Using JSON_VALUE to extract a value from a JSON column');

    result = await connection.execute(
      `SELECT JSON_VALUE(po_document, '$.location')
       FROM no_purchaseorder
       OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY`
    );
    console.log('Query results: ', result.rows[0][0]);  // just show first record

    console.log('5. Using dot-notation to extract a value from a JSON column');

    result = await connection.execute(
      `SELECT po.po_document.location
       FROM no_purchaseorder po
       OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY`
    );
    if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
      j = result.rows[0][0];
    } else {
      // Oracle Client libraries < 21 will return a BLOB
      const d = await result.rows[0][0].getData();
      j = await JSON.parse(d);
    }
    console.log('Query results: ', j);

    console.log('6. Using JSON_OBJECT to extract relational data as JSON');

    result = await connection.execute(
      `SELECT JSON_OBJECT('key' IS d.dummy) dummy
       FROM dual d`
    );
    for (const row of result.rows) {
      console.log('Query results: ', row[0]);
    }

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
  }
}

run();

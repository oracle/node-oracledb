/* Copyright (c) 2015, 2021, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   selectjsonblob.js
 *
 * DESCRIPTION
 *   Shows how to use a BLOB as a JSON column store.
 *
 *   Note: with Oracle Database 21c using the new JSON type is recommended
 *   instead, see selectjson.js
 *
 *   Requires Oracle Database 12.1.0.2 or later.
 *   See https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=ADJSN
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const fs = require('fs');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

// On Windows and macOS, you can specify the directory containing the Oracle
// Client Libraries at runtime, or before Node.js starts.  On other platforms
// the system library search path must always be set before Node.js is started.
// See the node-oracledb installation documentation.
// If the search path is not correct, you will get a DPI-1047 error.
let libPath;
if (process.platform === 'win32') {           // Windows
  libPath = 'C:\\oracle\\instantclient_19_12';
} else if (process.platform === 'darwin') {   // macOS
  libPath = process.env.HOME + '/Downloads/instantclient_19_8';
}
if (libPath && fs.existsSync(libPath)) {
  oracledb.initOracleClient({ libDir: libPath });
}

oracledb.extendedMetaData = true;

async function run() {

  let connection;

  try {

    connection = await oracledb.getConnection(dbConfig);

    if (connection.oracleServerVersion < 1201000200) {
      throw new Error('Using JSON requires Oracle Database 12.1.0.2 or later');
    }

    console.log('1. Creating Table');

    try {
      await connection.execute(`DROP TABLE no_purchaseorder_b`);
    } catch (e) {
      if (e.errorNum != 942)
        console.error(e);
    }

    await connection.execute(
      `CREATE TABLE no_purchaseorder_b
           (po_document BLOB CHECK (po_document IS JSON)) LOB (po_document) STORE AS (CACHE)`);

    console.log('2. Inserting Data');

    const inssql = `INSERT INTO no_purchaseorder_b (po_document) VALUES (:bv)`;
    const data = { "userId": 1, "userName": "Anna", "location": "Australia" };

    if (oracledb.oracleClientVersion >= 2100000000 && connection.oracleServerVersion >= 2100000000) {
      // Take advantage of direct binding of JavaScript objects
      await connection.execute(inssql, { bv: { val: data, type: oracledb.DB_TYPE_JSON } });
    } else {
      // Insert the data as a JSON string
      const s = JSON.stringify(data);
      const b = Buffer.from(s, 'utf8');
      await connection.execute(inssql, { bv: { val: b } });
    }

    console.log('3. Selecting JSON stored in a BLOB column');

    let result, j;

    result = await connection.execute(
      `SELECT po_document
       FROM no_purchaseorder_b
       WHERE JSON_EXISTS (po_document, '$.location')
       OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY`
    );
    const d = await result.rows[0][0].getData();
    j = await JSON.parse(d);
    console.log('Query results: ', j);

    console.log('4. Using JSON_VALUE to extract a value from a JSON column');

    result = await connection.execute(
      `SELECT JSON_VALUE(po_document, '$.location')
       FROM no_purchaseorder_b
       OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY`
    );
    console.log('Query results: ', result.rows[0][0]);  // just show first record

    if (connection.oracleServerVersion >= 1202000000) {

      console.log('5. Using dot-notation to extract a value from a JSON column');

      result = await connection.execute(
        `SELECT po.po_document.location
         FROM no_purchaseorder_b po
         OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY`
      );
      console.log('Query results: ', result.rows[0][0]);

      console.log('6. Using JSON_OBJECT to extract relational data as JSON');

      result = await connection.execute(
        `SELECT JSON_OBJECT('key' IS d.dummy) dummy
         FROM dual d`
      );
      for (let row of result.rows) {
        console.log('Query results: ', row[0]);
      }
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

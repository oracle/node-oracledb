/* Copyright (c) 2015, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   Executes sample insert and query statements using a JSON column with BLOB storage.
 *
 *   Requires Oracle Database 12.1.0.2, which has extensive JSON datatype support.
 *   See https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=ADJSN
 *
 *   This example requires node-oracledb 1.13 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

async function run() {

  let connection;

  try {

    connection = await oracledb.getConnection(dbConfig);

    if (connection.oracleServerVersion < 1201000200) {
      throw new Error('This example only works with Oracle Database 12.1.0.2 or greater');
    }

    const stmts = [
      `DROP TABLE no_purchaseorder_b`,

      `CREATE TABLE no_purchaseorder_b (po_document BLOB CHECK (po_document IS JSON)) LOB (po_document) STORE AS (CACHE)`
    ];

    for (const s of stmts) {
      try {
        await connection.execute(s);
      } catch(e) {
        if (e.errorNum != 942)
          console.error(e);
      }
    }

    let result;

    console.log('Inserting Data');
    const data = { "userId": 2, "userName": "Bob", "location": "USA" };
    const s = JSON.stringify(data);
    const b = Buffer.from(s, 'utf8');
    await connection.execute(
      `INSERT INTO no_purchaseorder_b (po_document) VALUES (:lobbv)`,
      { lobbv: b }
    );

    console.log('Selecting JSON stored in a BLOB column:');
    result = await connection.execute(
      `SELECT po_document
       FROM no_purchaseorder_b
       WHERE JSON_EXISTS (po_document, '$.location')`,
      [],
      { fetchInfo: { "PO_DOCUMENT": { type: oracledb.BUFFER } } }  // Fetch as a Buffer instead of a Stream
    );
    if (result.rows.length === 0)
      throw new Error('No results');
    console.log(result.rows[0][0].toString('utf8'));

    console.log('Selecting a JSON value using "dotted" notation:');
    if (connection.oracleServerVersion < 1202000000) {
      throw new Error('This example only works with Oracle Database 12.2 or greater');
    }
    result = await connection.execute(
      `SELECT pob.po_document.location
       FROM no_purchaseorder_b pob`
    );
    if (result.rows.length === 0)
      throw new Error('No results');
    console.log(result.rows[0][0]);

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

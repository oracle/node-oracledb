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
 *   selectjson.js
 *
 * DESCRIPTION
 *   Shows some JSON features of Oracle Database 12c.
 *
 *   Requires at least Oracle Database 12.1.0.2, which has extensive JSON datatype support.
 *   See https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=ADJSN
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
      `DROP TABLE no_purchaseorder`,

      // Note if your applications always insert valid JSON, you may delete
      // the IS JSON check to remove its additional validation overhead.
      `CREATE TABLE no_purchaseorder (po_document VARCHAR2(4000) CHECK (po_document IS JSON))`
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
    const data = { "userId": 1, "userName": "Chris", "location": "Australia" };
    const s = JSON.stringify(data);
    await connection.execute(
      `INSERT INTO no_purchaseorder (po_document) VALUES (:bv)`,
      [s], // bind the JSON string for inserting into the JSON column.
      { autoCommit: true }
    );

    console.log('1. Selecting JSON stored in a VARCHAR2 column');
    result = await connection.execute(
      `SELECT po_document
       FROM no_purchaseorder
       WHERE JSON_EXISTS (po_document, '$.location')`
    );
    const js = JSON.parse(result.rows[0][0]);  // just show first record
    console.log('Query results: ', js);

    console.log('2. Using JSON_VALUE to extract a value from a JSON column');
    result = await connection.execute(
      `SELECT JSON_VALUE(po_document, '$.location')
       FROM no_purchaseorder`
    );
    console.log('Query results: ', result.rows[0][0]);  // just show first record

    if (connection.oracleServerVersion < 1202000000) {
      throw new Error('These examples only work with Oracle Database 12.2 or greater');
    }

    console.log('3. Using dot-notation to extract a value from a JSON column');
    result = await connection.execute(
      `SELECT po.po_document.location
       FROM no_purchaseorder po`
    );
    console.log('Query results: ', result.rows[0][0]);  // just show first record

    console.log('4. Using JSON_OBJECT to extract relational data as JSON');
    result = await connection.execute(
      `SELECT JSON_OBJECT('key' IS d.dummy) dummy
       FROM dual d`
    );
    for (let row of result.rows)
      console.log(row[0]);

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

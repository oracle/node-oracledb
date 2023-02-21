/* Copyright (c) 2015, 2022, Oracle and/or its affiliates. */

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
 *   62. lobProperties1.js
 *
 * DESCRIPTION
 *   Testing getters and setters for LOB class.
 *   This test aims to increase the code coverage rate.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const fs       = require('fs');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('62. lobProperties1.js', function() {

  const tableName = "nodb_tab_mylobprops";
  let connection;
  const sqlSelect = "SELECT * FROM " + tableName + " WHERE id = :i";
  let defaultChunkSize = null;

  before('prepare table and LOB data', async function() {

    const sqlCreateTab =
      " BEGIN "
      + "   DECLARE "
      + "     e_table_missing EXCEPTION; "
      + "     PRAGMA EXCEPTION_INIT(e_table_missing, -00942); "
      + "   BEGIN "
      + "     EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE'); "
      + "   EXCEPTION "
      + "     WHEN e_table_missing "
      + "     THEN NULL; "
      + "   END;  "
      + "   EXECUTE IMMEDIATE (' "
      + "     CREATE TABLE " + tableName + " ( "
      + "       id NUMBER, c CLOB, b BLOB "
      + "     ) "
      + "   '); "
      + " END; ";

    const sqlInsert = "INSERT INTO " + tableName + " VALUES (:i, EMPTY_CLOB(), EMPTY_BLOB()) "
                     + " RETURNING c, b INTO :clob, :blob";

    const bindVar =
      {
        i: 1,
        clob: { type: oracledb.CLOB, dir: oracledb.BIND_OUT },
        blob: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
      };
    const clobFileName = './test/clobexample.txt';
    const blobFileName = './test/fuzzydinosaur.jpg';

    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(sqlCreateTab);
    let result = await connection.execute(sqlInsert, bindVar);
    let clob = result.outBinds.clob[0];
    let blob = result.outBinds.blob[0];
    const clobStream = fs.createReadStream(clobFileName);
    const blobStream = fs.createReadStream(blobFileName);
    clobStream.pipe(clob);
    blobStream.pipe(blob);
    await new Promise((resolve, reject) => {
      clobStream.on('error', reject);
      blobStream.on('error', reject);
      clob.on('error', reject);
      blob.on('error', reject);
      const waitForClob = async function() {
        await new Promise((resolve) => {
          clob.on('finish', resolve);
        });
      };
      const waitForBlob = async function() {
        await new Promise((resolve) => {
          blob.on('finish', resolve);
        });
      };
      Promise.all([waitForClob(), waitForBlob()]).then(resolve);
    });
    result = await connection.execute(sqlSelect, { i: 1 });
    clob = result.rows[0][1];
    blob = result.rows[0][2];
    defaultChunkSize = clob.chunkSize;
    await blob.close();
    await clob.close();
  }); // before

  after(async function() {
    await connection.execute("DROP TABLE " + tableName + " PURGE");
    await connection.close();
  });

  it('62.1 chunkSize (read-only)', async function() {
    const result = await connection.execute(sqlSelect, { i: 1 });
    const clob = result.rows[0][1];
    const blob = result.rows[0][2];
    const t1 = clob.chunkSize;
    const t2 = blob.chunkSize;
    assert.strictEqual(typeof t1, 'number');
    assert.strictEqual(typeof t2, 'number');
    assert.strictEqual(t1, t2);
    defaultChunkSize = clob.chunkSize;
    assert.throws(
      () => clob.chunkSize = t1 + 1,
      /TypeError: Cannot set property/
    );
    assert.throws(
      () => blob.chunkSize = t2 + 1,
      /TypeError: Cannot set property/
    );
    await clob.close();
    await blob.close();
  }); // 62.1

  it('62.2 length (read-only)', async function() {
    const result = await connection.execute(sqlSelect, { i: 1 });
    const clob = result.rows[0][1];
    const blob = result.rows[0][2];
    const t1 = clob.length;
    const t2 = blob.length;
    assert.throws(
      () => clob.length = t1 + 1,
      /TypeError: Cannot set property/
    );
    assert.throws(
      () => blob.length = t2 + 1,
      /TypeError: Cannot set property/
    );
    await clob.close();
    await blob.close();
  }); // 62.2

  it('62.3 pieceSize -default value is chunkSize', async function() {
    const result = await connection.execute(sqlSelect, { i: 1 });
    const clob = result.rows[0][1];
    const blob = result.rows[0][2];
    assert.strictEqual(clob.pieceSize, defaultChunkSize);
    assert.strictEqual(blob.pieceSize, defaultChunkSize);
    await clob.close();
    await blob.close();
  }); // 62.3

  it('62.4 pieceSize - can be increased', async function() {
    const result = await connection.execute(sqlSelect, { i: 1 });
    const clob = result.rows[0][1];
    const blob = result.rows[0][2];
    const newValue = clob.pieceSize * 5;
    clob.pieceSize = clob.pieceSize * 5;
    blob.pieceSize = blob.pieceSize * 5;
    assert.strictEqual(clob.pieceSize, newValue);
    assert.strictEqual(blob.pieceSize, newValue);
    await clob.close();
    await blob.close();
  }); // 62.4

  it('62.5 pieceSize - can be decreased', async function() {
    if (defaultChunkSize <= 500)
      return this.skip();
    const result = await connection.execute(sqlSelect, { i: 1 });
    const clob = result.rows[0][1];
    const blob = result.rows[0][2];
    const newValue = clob.pieceSize - 500;
    clob.pieceSize -= 500;
    blob.pieceSize -= 500;
    assert.strictEqual(clob.pieceSize, newValue);
    assert.strictEqual(blob.pieceSize, newValue);
    await clob.close();
    await blob.close();
  }); // 62.5

  it('62.6 pieceSize - can be zero', async function() {
    const result = await connection.execute(sqlSelect, { i: 1 });
    const clob = result.rows[0][1];
    const blob = result.rows[0][2];
    clob.pieceSize = 0;
    blob.pieceSize = 0;
    assert.strictEqual(clob.pieceSize, 0);
    assert.strictEqual(blob.pieceSize, 0);
    await clob.close();
    await blob.close();
  }); // 62.6

  it('62.7 pieceSize - cannot be less than zero', async function() {
    const result = await connection.execute(sqlSelect, { i: 1 });
    const clob = result.rows[0][1];
    const blob = result.rows[0][2];
    assert.throws(
      () => clob.pieceSize = -100,
      /NJS-004:/
    );
    await clob.close();
    await blob.close();
  }); // 62.7

  it('62.8 pieceSize - cannot be null', async function() {
    const result = await connection.execute(sqlSelect, { i: 1 });
    const clob = result.rows[0][1];
    const blob = result.rows[0][2];
    assert.throws(
      () => clob.pieceSize = null,
      /NJS-004:/
    );
    await clob.close();
    await blob.close();
  }); // 62.8

  it('62.9 pieceSize - must be a number', async function() {
    const result = await connection.execute(sqlSelect, { i: 1 });
    const clob = result.rows[0][1];
    const blob = result.rows[0][2];
    assert.throws(
      () => clob.pieceSize = NaN,
      /NJS-004:/
    );
    await clob.close();
    await blob.close();
  }); // 62.9

  it('62.10 type (read-only)', async function() {
    const result = await connection.execute(sqlSelect, { i: 1 });
    const clob = result.rows[0][1];
    const blob = result.rows[0][2];
    assert.strictEqual(clob.type, oracledb.CLOB);
    assert.strictEqual(blob.type, oracledb.BLOB);
    assert.throws(
      () => clob.type = oracledb.BLOB,
      /TypeError: Cannot set/
    );
    assert.throws(
      () => blob.type = oracledb.CLOB,
      /TypeError: Cannot set/
    );
    await clob.close();
    await blob.close();
  }); // 62.10

});

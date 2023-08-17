/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

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
 *   54. lobClose.js
 *
 * DESCRIPTION
 *   Negative cases against closed LOB object.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const fs       = require('fs');

describe('54. lobClose.js', function() {

  let conn;
  before(async function() {
    conn = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await conn.close();
  });

  it('54.1 can access properties of closed LOB without error', async function() {
    const lob = await conn.createLob(oracledb.CLOB);
    assert.strictEqual(typeof lob.chunkSize, 'number');
    assert.strictEqual(typeof lob.pieceSize, 'number');
    assert.strictEqual(lob.length, 0);
    assert.strictEqual(lob.type, oracledb.CLOB);
    await lob.close();
    assert.strictEqual(typeof lob.chunkSize, 'number');
    assert.strictEqual(typeof lob.pieceSize, 'number');
    assert.strictEqual(lob.length, 0);
    assert.strictEqual(lob.type, oracledb.CLOB);
  }); // 54.1

  it('54.2 can call close() multiple times', async function() {
    const lob = await conn.createLob(oracledb.CLOB);
    await lob.close();
    await lob.close();
  }); // 54.2

  it('54.3 verify closed LOB', async function() {
    const lob = await conn.createLob(oracledb.CLOB);
    await lob.close();
    const inFileName = './test/clobexample.txt';
    const inStream = fs.createReadStream(inFileName);
    inStream.pipe(lob);
    await assert.rejects(
      async () => {
        await new Promise((resolve, reject) => {
          inStream.on("error", reject);
          lob.on("error", reject);
          lob.on('finish', resolve);
        });
      },
      /NJS-022:/
    );
  }); // 54.3

  it('54.4 automatically close result sets and LOBs when the connection is closed', async function() {
    const conn2 = await oracledb.getConnection(dbConfig);
    const lob2 = await conn2.createLob(oracledb.CLOB);
    await conn2.close();

    // Verify that lob2 gets closed automatically
    const inFileName = './test/clobexample.txt';
    const inStream = fs.createReadStream(inFileName);
    inStream.pipe(lob2);
    await assert.rejects(
      async () => {
        await new Promise((resolve, reject) => {
          inStream.on("error", reject);
          lob2.on("error", reject);
          lob2.on('finish', resolve);
        });
      },
      /NJS-108:/
    );
  }); // 54.4

  it('54.5 temp LOBs should be freed in next rpc', async function() {
    const conn2 = await oracledb.getConnection(dbConfig);
    const tempLOBArray = [];
    const numLOBs = 20;
    const query = "select cache_lobs+nocache_lobs from v$temporary_lobs where sid = sys_context('USERENV','SID')";

    // Create multiple temp LOB's
    for (let i = 0; i < numLOBs; i++) {
      tempLOBArray[i] = await conn2.createLob(oracledb.CLOB);
    }

    // Check number of opened temp LOB's
    let result = await conn2.execute(query);
    let numTempLOBs = result.rows[0][0];
    assert.strictEqual(numTempLOBs, numLOBs);

    // Destroy multiple temp LOB's
    for (let i = 0; i < numLOBs; i++) {
      await new Promise((resolve) => {
        tempLOBArray[i].once('close', resolve);
        tempLOBArray[i].destroy();
      });
    }

    // temp LOB's should be freed on roundtrip (like execute) as piggybacks are sent for closing temp LOB's
    result = await conn2.execute(query);
    numTempLOBs = result.rows[0][0];
    assert.strictEqual(numTempLOBs, 0);
    await conn2.close();
  }); // 54.5

});

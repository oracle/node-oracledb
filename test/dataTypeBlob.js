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
 *   41. dataTypeBlob.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - BLOB.
 *    This test corresponds to example files:
 *         blobinsert1.js, blobstream1.js and blobstream2.js
 *    Firstly, Loads an image data and INSERTs it into a BLOB column.
 *    Secondly, SELECTs the BLOB and pipes it to a file, blobstreamout.jpg
 *    Thirdly, SELECTs the BLOB and compares it with the original image
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const fs       = require('fs');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');
const testsUtil = require(`./testsUtil.js`);

const inFileName = 'test/fuzzydinosaur.jpg';  // contains the image to be inserted
const outFileName = 'test/blobstreamout.jpg';

describe('41. dataTypeBlob.js', function() {

  let connection = null;
  const tableName = "nodb_myblobs";

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('41.1 testing BLOB data type', function() {
    before('create table', async function() {
      await connection.execute(assist.sqlCreateTable(tableName));
    });

    after(async function() {
      await connection.execute("DROP table " + tableName + " PURGE");
    });

    it('41.1.1 stores BLOB value correctly', async function() {

      let result = await connection.execute(
        `INSERT INTO nodb_myblobs (num, content) VALUES (:n, EMPTY_BLOB()) RETURNING content INTO :lobbv`,
        { n: 2, lobbv: {type: oracledb.BLOB, dir: oracledb.BIND_OUT} },
        { autoCommit: false });  // a transaction needs to span the INSERT and pipe()

      assert.strictEqual(result.rowsAffected, 1);
      assert.strictEqual(result.outBinds.lobbv.length, 1);

      const inStream = await fs.createReadStream(inFileName);

      let lob = result.outBinds.lobbv[0];
      await new Promise((resolve, reject) => {
        inStream.on('error', reject);
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.pipe(lob);
      });
      await connection.commit();
      result = await connection.execute(
        "SELECT content FROM nodb_myblobs WHERE num = :n",
        { n: 2 });

      lob = result.rows[0][0];

      await new Promise((resolve, reject) => {
        const outStream = fs.createWriteStream(outFileName);
        lob.on('error', reject);
        outStream.on('error', reject);
        outStream.on('finish', resolve);
        lob.pipe(outStream);
      });
      await connection.commit();
      const originalData = await fs.promises.readFile(inFileName);
      const generatedData = await fs.promises.readFile(outFileName);
      assert.deepStrictEqual(originalData, generatedData);
      result = await connection.execute(
        "SELECT content FROM nodb_myblobs WHERE num = :n",
        { n: 2 });
      lob = result.rows[0][0];
      const blob = await lob.getData();
      const data = await fs.promises.readFile(inFileName);
      assert.deepStrictEqual(data, blob);
      fs.unlinkSync(outFileName);
    }); // 41.1.1

    it('41.1.2 BLOB getData()', async function() {

      let result = await connection.execute(
        `INSERT INTO nodb_myblobs (num, content) ` +
        `VALUES (:n, EMPTY_BLOB()) RETURNING content INTO :lobbv`,
        { n: 3, lobbv: {type: oracledb.BLOB, dir: oracledb.BIND_OUT} },
        { autoCommit: false });  // a transaction needs to span the INSERT and pipe()

      assert.strictEqual(result.rowsAffected, 1);
      assert.strictEqual(result.outBinds.lobbv.length, 1);

      const inStream = fs.createReadStream(inFileName);
      let lob = result.outBinds.lobbv[0];

      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        inStream.on('error', reject);
        lob.on('finish', resolve);
        inStream.pipe(lob);  // pipes the data to the BLOB
      });
      await connection.commit();
      result = await connection.execute(
        "SELECT content FROM nodb_myblobs WHERE num = :n",
        { n: 3 });

      lob = result.rows[0][0];

      const data = await fs.promises.readFile(inFileName);
      const blob = await lob.getData();
      assert.deepStrictEqual(data, blob);
    }); // 41.1.2
  }); //41.1

  describe('41.2 stores null value correctly', function() {
    it('41.2.1 testing Null, Empty string and Undefined', async function() {
      await assist.verifyNullValues(connection, tableName);
    });
  });

  describe('41.3 OSON column metadata ', function() {
    let isRunnable = false;
    const TABLE = "nodb_myblobs_oson_col";
    const createTable = (`CREATE TABLE ${TABLE} (
        IntCol number(9) not null,
        OsonCol  blob not null,
        blobCol  blob not null,
        constraint TestOsonCols_ck_1 check (OsonCol is json format oson)
        )`
    );
    const plsql = testsUtil.sqlCreateTable(TABLE, createTable);

    before('create table', async function() {
      oracledb.fetchAsBuffer = [oracledb.BLOB];
      if (testsUtil.getClientVersion() >= 2100000000 &&
        connection.oracleServerVersion >= 2100000000) {
        isRunnable = true;
      }

      if (!isRunnable) {
        this.skip();
      }

      await connection.execute(plsql);
    });

    after(async function() {
      oracledb.fetchAsBuffer = [];
      await connection.execute(testsUtil.sqlDropTable(TABLE));
    });

    it('41.3.1 Verify isOson flag in column metadata', async function() {
      const result = await connection.execute(`select * from ${TABLE}`);
      assert.strictEqual(result.metaData[0].isOson, false);
      assert.strictEqual(result.metaData[1].isOson, true);
      assert.strictEqual(result.metaData[2].isOson, false);
    }); // 41.3.1

    it('41.3.2 Verify Basic encode/decode OSON on OSON format column', async function() {
      const expectedObj1 = {key1: "val1"};
      const expectedObj2 = {key2: "val2"};
      const expectedObj3 = [new Float32Array([1, 2]), [1, 2]];
      const byteBuf = Buffer.from(JSON.stringify((expectedObj1)));

      // Insert Buffer into OSON format column and verify with decode.
      let result = await connection.execute(`insert into ${TABLE}(IntCol, OsonCol, blobCol)
      values (1, :1, :2) `,
      [byteBuf, byteBuf]);
      result = await connection.execute(`select OSONCOL from ${TABLE}`);
      let generatedObj = connection.decodeOSON(result.rows[0][0]);
      assert.deepStrictEqual(expectedObj1, generatedObj);

      // Generate OSON bytes and insert these bytes and verify with decode.
      const osonBytes = connection.encodeOSON(expectedObj2);
      result = await connection.execute(`insert into ${TABLE}(IntCol, OsonCol, blobCol)
      values (2, :1, :2) `,
      [osonBytes, byteBuf]);
      result = await connection.execute(`select OSONCOL from ${TABLE} where IntCol = 2`);
      generatedObj = connection.decodeOSON(result.rows[0][0]);
      assert.deepStrictEqual(expectedObj2, generatedObj);

      // Verify vector inside OSON image for 23.4 server onwards.
      if (connection.oracleServerVersion >= 2304000000) {
        result = await connection.execute(`insert into ${TABLE}(IntCol, OsonCol, blobCol)
      values (3, :1, :2) `,
        [connection.encodeOSON(expectedObj3), byteBuf]);
        result = await connection.execute(`select OSONCOL from ${TABLE} where IntCol = 3`);
        generatedObj = connection.decodeOSON(result.rows[0][0]);
        assert.deepStrictEqual(expectedObj3, generatedObj);
      }

      // Check invalid values to decodeOSON
      assert.rejects(
        () => connection.decodeOSON(Buffer.from('invalid')),
        /NJS-113:/
      );
      assert.rejects(
        () => connection.decodeOSON('invalid'),
        /NJS-005:/
      );
      assert.rejects(
        () => connection.decodeOSON(),
        /NJS-009:/
      );
    }); // 41.3.2

  }); //41.3

});

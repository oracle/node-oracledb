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

let inFileName = 'test/fuzzydinosaur.jpg';  // contains the image to be inserted
let outFileName = 'test/blobstreamout.jpg';

describe('41. dataTypeBlob.js', function() {

  let connection = null;
  let tableName = "nodb_myblobs";

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
        `INSERT INTO nodb_myblobs (num, content) ` +
`VALUES (:n, EMPTY_BLOB()) RETURNING content INTO :lobbv`,
        { n: 2, lobbv: {type: oracledb.BLOB, dir: oracledb.BIND_OUT} },
        { autoCommit: false });  // a transaction needs to span the INSERT and pipe()

      assert.strictEqual(result.rowsAffected, 1);
      assert.strictEqual(result.outBinds.lobbv.length, 1);

      let inStream = await fs.createReadStream(inFileName);

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
        lob.on('error', reject);
        let outStream = fs.createWriteStream(outFileName);
        outStream.on('error', reject);
        lob.pipe(outStream);
        outStream.on('finish', async function() {
          await fs.readFile(inFileName, function(err, originalData) {
            assert.ifError(err);
            fs.readFile(outFileName, function(err, generatedData) {
              assert.ifError(err);
              assert.deepStrictEqual(originalData, generatedData);
            });
          });
          resolve();
        }); // finish event
      });
      await connection.commit();

      result = await connection.execute(
        "SELECT content FROM nodb_myblobs WHERE num = :n",
        { n: 2 });
      let blob = Buffer.alloc(0);
      let blobLength = 0;
      lob = result.rows[0][0];
      await new Promise((resolve, reject) => {
        lob.on("error", reject);

        lob.on('data', async function(chunk) {
          blobLength = blobLength + chunk.length;
          blob = await lob.getData();
        });

        lob.on('end', async function() {
          await fs.readFile(inFileName, function(err, data) {
            assert.ifError(err);
            assert.strictEqual(data.length, blob.length);
            assert.deepStrictEqual(data, blob);
            resolve();
          });
        });  // close event
      });
      await fs.unlinkSync(outFileName);
    }); // 41.1.1

    it('41.1.2 BLOB getData()', async function() {

      let result = await connection.execute(
        `INSERT INTO nodb_myblobs (num, content) ` +
        `VALUES (:n, EMPTY_BLOB()) RETURNING content INTO :lobbv`,
        { n: 3, lobbv: {type: oracledb.BLOB, dir: oracledb.BIND_OUT} },
        { autoCommit: false });  // a transaction needs to span the INSERT and pipe()

      assert.strictEqual(result.rowsAffected, 1);
      assert.strictEqual(result.outBinds.lobbv.length, 1);

      let inStream = fs.createReadStream(inFileName);
      inStream.on('error', function(err) {
        assert.ifError(err, "inStream.on 'end' event");
      });

      let lob = result.outBinds.lobbv[0];
      await new Promise((resolve, reject) => {
        lob.on("error", reject);

        inStream.pipe(lob);  // pipes the data to the BLOB

        lob.on('finish', async function() {
          await connection.commit();
          resolve();
        });
      });
      result = await connection.execute(
        "SELECT content FROM nodb_myblobs WHERE num = :n",
        { n: 3 });

      lob = result.rows[0][0];

      await fs.readFile(inFileName, function(err, data) {
        assert.ifError(err);
        lob.getData(function(err, blob) {
          assert.strictEqual(data.length, blob.length);
          assert.strictEqual(data, blob);
        });
      });
    }); // 41.1.2
  }); //41.1

  describe('41.2 stores null value correctly', function() {
    it('41.2.1 testing Null, Empty string and Undefined', async function() {
      await assist.verifyNullValues(connection, tableName);
    });
  });

});

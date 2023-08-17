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
 *   40. dataTypeClob.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - CLOB.
 *    This test corresponds to example files:
 *         clobinsert1.js, clobstream1.js and clobstream2.js
 *    Firstly, reads text from clobexample.txt and INSERTs it into a CLOB column.
 *    Secondly, SELECTs a CLOB and pipes it to a file, clobstreamout.txt
 *    Thirdly, SELECTs the CLOB and compares it with the content in clobexample.txt.
 *    Fourthly, query the CLOB with Object outFormat.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const fs       = require('fs');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');
const testsUtil = require('./testsUtil.js');

const inFileName = 'test/clobexample.txt';  // the file with text to be inserted into the database
const outFileName = 'test/clobstreamout.txt'; // output file with the stream out data

describe('40. dataTypeClob.js', function() {

  let connection = null;
  const tableName = "nodb_myclobs";

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('40.1 testing CLOB data type', function() {
    before('create table', async function() {
      await connection.execute(assist.sqlCreateTable(tableName));
    });

    after(async function() {
      await connection.execute("DROP table " + tableName + " PURGE");
    });

    it('40.1.1 stores CLOB value correctly', async function() {
      let result = await connection.execute(
        'INSERT INTO nodb_myclobs (num, content) ' +
        'VALUES (:n, EMPTY_CLOB()) RETURNING content INTO :lobbv',
        { n: 1, lobbv: {type: oracledb.CLOB, dir: oracledb.BIND_OUT} },
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
        "SELECT content FROM nodb_myclobs WHERE num = :n",
        { n: 1 });

      lob = result.rows[0][0];
      lob.setEncoding('utf8');
      await new Promise((resolve, reject) => {
        lob.on("error", reject);
        const outStream = fs.createWriteStream(outFileName);
        outStream.on('error', reject);
        outStream.on('finish', resolve);
        lob.pipe(outStream);
      });
      const originalData = fs.readFileSync(inFileName, { encoding: 'utf8' });
      const generatedData = fs.readFileSync(outFileName, { encoding: 'utf8' });
      assert.strictEqual(originalData, generatedData);

      result = await connection.execute(
        "SELECT content FROM nodb_myclobs WHERE num = :n",
        { n: 1 });

      lob = result.rows[0][0];
      let clob = await lob.getData();
      const data = fs.readFileSync(inFileName, { encoding: 'utf8' });
      assert.strictEqual(data, clob);

      result = await connection.execute(
        "SELECT content FROM nodb_myclobs WHERE num = :n",
        { n: 1 },
        { outFormat: oracledb.OUT_FORMAT_OBJECT });

      const row = result.rows[0];
      lob = row['CONTENT'];
      clob = await lob.getData();
      assert.strictEqual(data, clob);
      fs.unlinkSync(outFileName);

    }); // 40.1.1


    it('40.1.2 CLOB getData()', async function() {

      let result = await connection.execute(
        `INSERT INTO nodb_myclobs (num, content) ` +
        `VALUES (:n, EMPTY_CLOB()) RETURNING content INTO :lobbv`,
        { n: 2, lobbv: {type: oracledb.CLOB, dir: oracledb.BIND_OUT} },
        { autoCommit: false }); // a transaction needs to span the INSERT and pipe()

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
        "SELECT content FROM nodb_myclobs WHERE num = :n",
        { n: 2 });

      lob = result.rows[0][0];

      const data = fs.readFileSync(inFileName, { encoding: 'utf8' });
      const clob = await lob.getData();
      assert.strictEqual(data, clob);

    }); // 40.1.2

  }); // 40.1

  describe('40.2 stores null value correctly', function() {
    it('40.2.1 testing Null, Empty string and Undefined', async function() {
      await assist.verifyNullValues(connection, tableName);
    });
  });

  describe('40.3 Read CLOB data on meta data change', function() {
    let connection = null;
    const tableNameCLOB = 'nodb_myclobs_re_create';
    const sqlCreateQuery = `
        CREATE TABLE ${tableNameCLOB} (
            num        NUMBER,
            content    CLOB
        )`;
    const sqlDrop = testsUtil.sqlDropTable(tableNameCLOB);
    const sqlCreate = testsUtil.sqlCreateTable(tableNameCLOB, sqlCreateQuery);
    const insertSql = `INSERT INTO ${tableNameCLOB} (num, content) ` +
      `VALUES (:n, 'CLOB')`;
    const selectSql = `SELECT content FROM ${tableNameCLOB} WHERE num = 1`;

    before(async function() {
      oracledb.fetchAsString = [oracledb.CLOB];
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute(sqlCreate);
      await connection.execute(insertSql, { n: 1 }, { autoCommit: false });
    });

    after(async function() {
      oracledb.fetchAsString = [];
      await connection.execute(sqlDrop);
      await connection.close();
    });

    it('40.3.1 Recreate table after CLOB column is read and statement is in statement cache',
      async function() {
        await connection.execute(selectSql, {}, { keepInStmtCache: true });
        await connection.execute(sqlDrop);
        await connection.execute(sqlCreate);
        await connection.execute(insertSql, { n: 1 }, { autoCommit: false });
        await connection.execute(selectSql);
      });

  });

});

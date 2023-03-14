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
 *   59. lobResultSet.js
 *
 * DESCRIPTION
 *
 *   Inspired by https://github.com/oracle/node-oracledb/issues/210
 *   Testing Lob data and result set.
 *   Create a table contains Lob data. Read the Lob to result set. Get
 *     rows one by one. Read the lob data on each row.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const fs       = require('fs');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');

describe('59. lobResultSet.js', function() {

  let connection = null;

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('59.1 CLOB data', function() {
    let insertID = 1;
    const tableName = "nodb_myclobs";
    const inFileName = './test/clobexample.txt';
    before('create table', async function() {
      await connection.execute(assist.sqlCreateTable(tableName));
    });

    after('drop table', async function() {
      await connection.execute(`DROP table ` + tableName + ` PURGE`);
    });

    async function fetchOneRowFromRS(resultSet, rowsFetched, rowsExpected) {
      const row = await resultSet.getRow();
      if (!row) {
        await resultSet.close();
        assert.strictEqual(rowsFetched, rowsExpected);
      } else {
        rowsFetched++;
        const text = await row[1].getData();
        const originalData = fs.readFileSync(inFileName, { encoding: 'utf8' });
        assert.strictEqual(text, originalData);
        await fetchOneRowFromRS(resultSet, rowsFetched, rowsExpected);
      }
    }

    async function streamIntoClob(id) {
      const result = await connection.execute(
        "INSERT INTO " + tableName + " VALUES (:n, EMPTY_CLOB()) RETURNING content INTO :lobbv",
        { n: id, lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } });

      const lob = result.outBinds.lobbv[0];
      const inStream = await fs.createReadStream(inFileName);
      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob);
      });
      await connection.commit();
    }

    it('59.1.1 reads clob data one by one row from result set', async function() {
      const id_1 = insertID++;
      const id_2 = insertID++;
      const id_3 = insertID++;

      await streamIntoClob(id_1);

      await streamIntoClob(id_2);

      await streamIntoClob(id_3);

      const result = await connection.execute(
        "SELECT num, content FROM " + tableName + " where  num = " + id_1 + " or num = " + id_2 + " or num = " + id_3,
        [],
        { resultSet: true });
      const actualRowsFetched = 0; // actual rows read from resultset
      const rowsExpected = 3; // expected rows read from resultSet
      await fetchOneRowFromRS(result.resultSet, actualRowsFetched, rowsExpected);
    }); // 59.1.1

    it('59.1.2 works with oracledb.maxRows > actual number of rows fetched', async function() {
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      const id_1 = insertID++;
      const id_2 = insertID++;
      const id_3 = insertID++;

      await streamIntoClob(id_1);

      await streamIntoClob(id_2);

      await streamIntoClob(id_3);

      const result = await connection.execute(
        "SELECT num, content FROM " + tableName + " where num = " + id_1 + " or num = " + id_2 + " or num = " + id_3,
        [],
        { resultSet: true });

      const actualRowsFetched = 0; // actual rows read from resultset
      const rowsExpected = 3; // expected rows read from resultSet
      await fetchOneRowFromRS(result.resultSet, actualRowsFetched, rowsExpected);

      oracledb.maxRows = maxRowsBak;
    }); // 59.1.2

    it('59.1.3 works with oracledb.maxRows = actual number of rows fetched', async function() {
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 3;

      const id_1 = insertID++;
      const id_2 = insertID++;
      const id_3 = insertID++;

      await streamIntoClob(id_1);

      await streamIntoClob(id_2);

      await streamIntoClob(id_3);

      const result = await connection.execute(
        `SELECT num, content FROM ` + tableName + ` where  num = ` + id_1 + ` or num = ` + id_2 + ` or num = ` + id_3,
        [],
        { resultSet: true });

      const actualRowsFetched = 0; // actual rows read from resultset
      const rowsExpected = 3; // expected rows read from resultSet
      await fetchOneRowFromRS(result.resultSet, actualRowsFetched, rowsExpected);

      oracledb.maxRows = maxRowsBak;
    }); // 59.1.3

    it('59.1.4 works with oracledb.maxRows < actual number of rows fetched', async function() {
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      const id_1 = insertID++;
      const id_2 = insertID++;
      const id_3 = insertID++;

      await streamIntoClob(id_1);

      await streamIntoClob(id_2);

      await streamIntoClob(id_3);

      const result = await connection.execute(
        "SELECT num, content FROM " + tableName + " where  num = " + id_1 + " or num = " + id_2 + " or num = " + id_3,
        [],
        { resultSet: true });

      const actualRowsFetched = 0; // actual rows read from resultset
      const rowsExpected = 3; // expected rows read from resultSet
      await fetchOneRowFromRS(result.resultSet, actualRowsFetched, rowsExpected);

      oracledb.maxRows = maxRowsBak;
    }); // 59.1.4

  }); // 59.1

  describe('59.2 BLOB data', function() {
    let insertID = 1;
    const tableName = "nodb_myblobs";
    const jpgFileName = "./test/fuzzydinosaur.jpg";
    before('create table', async function() {
      await connection.execute(assist.sqlCreateTable(tableName));
    });

    after('drop table', async function() {
      await connection.execute(`DROP table ` + tableName + ` PURGE`);
    });

    async function fetchOneRowFromRS(resultSet, rowsFetched, rowsExpected) {
      const row = await resultSet.getRow();
      if (!row) {
        await resultSet.close();
        assert.strictEqual(rowsFetched, rowsExpected);
        rowsFetched = 0;
      } else {
        rowsFetched++;
        const blobData = await row[1].getData();
        const originalData = fs.readFileSync(jpgFileName);
        assert.deepEqual(originalData, blobData);
        await fetchOneRowFromRS(resultSet, rowsFetched, rowsExpected);
      }
    }

    async function streamIntoBlob(id) {
      const result = await connection.execute(
        `INSERT INTO ` + tableName + ` VALUES (:n, EMPTY_BLOB()) RETURNING content INTO :lobbv`,
        { n: id, lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } });

      const lob = result.outBinds.lobbv[0];
      const inStream = await fs.createReadStream(jpgFileName);
      await new Promise((resolve, reject) => {
        inStream.on('error', reject);
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.pipe(lob);
      });
      await connection.commit();
    }

    it('59.2.1 reads blob data one by one row from result set', async function() {
      const id_1 = insertID++;
      const id_2 = insertID++;
      const id_3 = insertID++;

      await streamIntoBlob(id_1);

      await streamIntoBlob(id_2);

      await streamIntoBlob(id_3);

      const result = await connection.execute(
        "SELECT num, content FROM " + tableName + " where  num = " + id_1 + " or num = " + id_2 + " or num = " + id_3,
        [],
        { resultSet: true });

      const actualRowsFetched = 0; // actual rows read from resultset
      const rowsExpected = 3; // expected rows read from resultSet
      await fetchOneRowFromRS(result.resultSet, actualRowsFetched, rowsExpected);

    }); // 59.2.1

    it('59.2.2 works with oracledb.maxRows > actual number of rows fetched', async function() {
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      const id_1 = insertID++;
      const id_2 = insertID++;
      const id_3 = insertID++;

      await streamIntoBlob(id_1);

      await streamIntoBlob(id_2);

      await streamIntoBlob(id_3);

      const result = await connection.execute(
        `SELECT num, content FROM ` + tableName + ` where num = ` + id_1 + ` or num = ` + id_2 + ` or num = ` + id_3,
        [],
        { resultSet: true });

      const actualRowsFetched = 0; // actual rows read from resultset
      const rowsExpected = 3; // expected rows read from resultSet
      await fetchOneRowFromRS(result.resultSet, actualRowsFetched, rowsExpected);
      oracledb.maxRows = maxRowsBak;
    }); // 59.2.2

    it('59.2.3 works with oracledb.maxRows = actual number of rows fetched', async function() {
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 3;

      const id_1 = insertID++;
      const id_2 = insertID++;
      const id_3 = insertID++;

      await streamIntoBlob(id_1);

      await streamIntoBlob(id_2);

      await streamIntoBlob(id_3);

      const result = await connection.execute(
        `SELECT num, content FROM ` + tableName + ` where  num = ` + id_1 + ` or num = ` + id_2 + ` or num = ` + id_3,
        [],
        { resultSet: true });

      const actualRowsFetched = 0; // actual rows read from resultset
      const rowsExpected = 3; // expected rows read from resultSet
      await fetchOneRowFromRS(result.resultSet, actualRowsFetched, rowsExpected);
      oracledb.maxRows = maxRowsBak;
    }); // 59.2.3

    it('59.2.4 works with oracledb.maxRows < actual number of rows fetched', async function() {
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      const id_1 = insertID++;
      const id_2 = insertID++;
      const id_3 = insertID++;

      await streamIntoBlob(id_1);

      await streamIntoBlob(id_2);

      await streamIntoBlob(id_3);

      const result = await connection.execute(
        "SELECT num, content FROM " + tableName + " where  num = " + id_1 + " or num = " + id_2 + " or num = " + id_3,
        [],
        { resultSet: true });

      const actualRowsFetched = 0; // actual rows read from resultset
      const rowsExpected = 3; // expected rows read from resultSet
      await fetchOneRowFromRS(result.resultSet, actualRowsFetched, rowsExpected);

      oracledb.maxRows = maxRowsBak;
    }); // 59.2.4

  }); // 59.2

}); // 59

/* Copyright (c) 2017, 2023, Oracle and/or its affiliates. */

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
 *   117. fetchUrowidAsString_indexed.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - UROWID.
 *    To fetch UROWID columns as strings.
 *    Test UROWID greater than 200/500 bytes.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');
const sql      = require('./sql.js');
const testsUtil = require('./testsUtil.js');

describe('117. fetchUrowidAsString_indexed.js', function() {
  let connection = null;
  let insertID = 1;
  let tableName_indexed = "nodb_urowid_fsi";
  let tableName_normal = "nodb_urowid_fsn";
  let table_indexed = "BEGIN \n" +
                      "    DECLARE \n" +
                      "        e_table_missing EXCEPTION; \n" +
                      "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                      "    BEGIN \n" +
                      "        EXECUTE IMMEDIATE ('DROP TABLE " + tableName_indexed + " PURGE' ); \n" +
                      "    EXCEPTION \n" +
                      "        WHEN e_table_missing \n" +
                      "        THEN NULL; \n" +
                      "    END; \n" +
                      "    EXECUTE IMMEDIATE ( ' \n" +
                      "        CREATE TABLE " + tableName_indexed + " ( \n" +
                      "            c1    NUMBER, \n" +
                      "            c2    VARCHAR2(3000), \n" +
                      "            primary key(c1, c2) \n" +
                      "        ) organization index overflow\n" +
                      "      '); \n" +
                      "END;  ";

  let table_normal = "BEGIN \n" +
                     "    DECLARE \n" +
                     "        e_table_missing EXCEPTION; \n" +
                     "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                     "    BEGIN \n" +
                     "        EXECUTE IMMEDIATE ('DROP TABLE " + tableName_normal + " PURGE' ); \n" +
                     "    EXCEPTION \n" +
                     "        WHEN e_table_missing \n" +
                     "        THEN NULL; \n" +
                     "    END; \n" +
                     "    EXECUTE IMMEDIATE ( ' \n" +
                     "        CREATE TABLE " + tableName_normal + " ( \n" +
                     "            id       NUMBER, \n" +
                     "            content  UROWID \n" +
                     "        ) \n" +
                     "      '); \n" +
                     "END;  ";

  let drop_table_indexed = "DROP TABLE " + tableName_indexed + " PURGE";
  let drop_table_normal = "DROP TABLE " + tableName_normal + " PURGE";

  before('get connection and create table', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.release();
  });

  beforeEach(function() {
    insertID++;
  });

  describe('117.1 works with fetchInfo option and urowid length > 200/500', function() {
    let option = { fetchInfo: { "content": { type: oracledb.STRING } } };
    let maxRowBak;

    before('get connection and create table', async function() {

      await sql.executeSql(connection, table_indexed, {}, {});

      await sql.executeSql(connection, table_normal, {}, {});

    });

    after('release connection', async function() {

      await sql.executeSql(connection, drop_table_indexed, {}, {});

      await sql.executeSql(connection, drop_table_normal, {}, {});

    });

    beforeEach(function() {
      maxRowBak = oracledb.maxRows;

    });

    afterEach(function() {
      oracledb.maxRows = maxRowBak;

    });

    it('117.1.1 fetchInfo', async function() {
      await test1(option, false, false);
    });

    it('117.1.2 oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = 1;
      await testMaxRow(option, false);
    });

    it('117.1.3 oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = 2;
      await testMaxRow(option, false);
    });

    it('117.1.4 oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = 10;
      await testMaxRow(option, false);
    });

    it('117.1.5 resultSet = true', async function() {
      let option_rs = {
        resultSet: true,
        fetchInfo: { "content": { type: oracledb.STRING } }
      };
      await test1(option_rs, false, true);
    });

    it('117.1.6 queryStream() and oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = 1;
      await testQueryStream(option, false);
    });

    it('117.1.7 queryStream() and oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = 2;
      await testQueryStream(option, false);
    });

    it('117.1.8 queryStream() and oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = 10;
      await testQueryStream(option, false);
    });

  });

  describe('117.2 works with fetchInfo and outFormat = OBJECT, urowid length > 200/500', function() {
    let option = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      fetchInfo: { "content": { type: oracledb.STRING } }
    };
    let maxRowBak;

    before('get connection and create table', async function() {

      await sql.executeSql(connection, table_indexed, {}, {});

      await sql.executeSql(connection, table_normal, {}, {});

    });

    after('release connection', async function() {

      await sql.executeSql(connection, drop_table_indexed, {}, {});

      await sql.executeSql(connection, drop_table_normal, {}, {});

    });

    beforeEach(function() {
      maxRowBak = oracledb.maxRows;

    });

    afterEach(function() {
      oracledb.maxRows = maxRowBak;

    });

    it('117.2.1 fetchInfo', async function() {
      await test1(option, true, false);
    });

    it('117.2.2 oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = 1;
      await testMaxRow(option, false);
    });

    it('117.2.3 oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = 2;
      await testMaxRow(option, false);
    });

    it('117.2.4 oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = 10;
      await testMaxRow(option, false);
    });

    it('117.2.5 resultSet = true', async function() {
      let option_rs = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        resultSet: true,
        fetchInfo: { "content": { type: oracledb.STRING } }
      };
      await test1(option_rs, true, true);
    });

    it('117.2.6 queryStream() and oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = 1;
      await testQueryStream(option, true);
    });

    it('117.2.7 queryStream() and oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = 2;
      await testQueryStream(option, true);
    });

    it('117.2.8 queryStream() and oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = 10;
      await testQueryStream(option, true);
    });

  });

  describe('117.3 works with fetchInfo and outFormat = ARRAY, urowid length > 200/500', function() {
    let option = {
      outFormat: oracledb.OUT_FORMAT_ARRAY,
      fetchInfo: { "content": { type: oracledb.STRING } }
    };
    let maxRowBak;

    before('get connection and create table', async function() {

      await sql.executeSql(connection, table_indexed, {}, {});

      await sql.executeSql(connection, table_normal, {}, {});

    });

    after('release connection', async function() {

      await sql.executeSql(connection, drop_table_indexed, {}, {});

      await sql.executeSql(connection, drop_table_normal, {}, {});

    });

    beforeEach(function() {
      maxRowBak = oracledb.maxRows;

    });

    afterEach(function() {
      oracledb.maxRows = maxRowBak;

    });

    it('117.3.1 fetchInfo', async function() {
      await test1(option, false, false);
    });

    it('117.3.2 oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = 1;
      await testMaxRow(option, false);
    });

    it('117.3.3 oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = 2;
      await testMaxRow(option, false);
    });

    it('117.3.4 oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = 10;
      await testMaxRow(option, false);
    });

    it('117.3.5 resultSet = true', async function() {
      let option_rs = {
        outFormat: oracledb.OUT_FORMAT_ARRAY,
        resultSet: true,
        fetchInfo: { "content": { type: oracledb.STRING } }
      };
      await test1(option_rs, false, true);
    });

    it('117.3.6 queryStream() and oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = 1;
      await testQueryStream(option, false);
    });

    it('117.3.7 queryStream() and oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = 2;
      await testQueryStream(option, false);
    });

    it('117.3.8 queryStream() and oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = 10;
      await testQueryStream(option, false);
    });

  });

  describe('117.4 fetch as string by default, urowid length > 200/500', function() {
    let option = {};
    let maxRowBak;

    before('get connection and create table', async function() {

      await sql.executeSql(connection, table_indexed, {}, {});

      await sql.executeSql(connection, table_normal, {}, {});

    });

    after('release connection', async function() {

      await sql.executeSql(connection, drop_table_indexed, {}, {});

      await sql.executeSql(connection, drop_table_normal, {}, {});

    });

    beforeEach(function() {
      maxRowBak = oracledb.maxRows;

    });

    afterEach(function() {
      oracledb.maxRows = maxRowBak;

    });

    it('117.4.1 fetchInfo', async function() {
      await test1(option, false, false);
    });

    it('117.4.2 oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = 1;
      await testMaxRow(option, false);
    });

    it('117.4.3 oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = 2;
      await testMaxRow(option, false);
    });

    it('117.4.4 oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = 10;
      await testMaxRow(option, false);
    });

    it('117.4.5 resultSet = true', async function() {
      let option_rs = {
        resultSet: true,
      };
      await test1(option_rs, false, true);
    });

    it('117.4.6 queryStream() and oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = 1;
      await testQueryStream(option, false);
    });

    it('117.4.7 queryStream() and oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = 2;
      await testQueryStream(option, false);
    });

    it('117.4.8 queryStream() and oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = 10;
      await testQueryStream(option, false);
    });

  });

  describe('117.5 fetch as string by default with outFormat = OBJECT, urowid length > 200/500', function() {
    let option = { outFormat: oracledb.OUT_FORMAT_OBJECT };
    let maxRowBak;

    before('get connection and create table', async function() {

      await sql.executeSql(connection, table_indexed, {}, {});

      await sql.executeSql(connection, table_normal, {}, {});

    });

    after('release connection', async function() {

      await sql.executeSql(connection, drop_table_indexed, {}, {});

      await sql.executeSql(connection, drop_table_normal, {}, {});

    });

    beforeEach(function() {
      maxRowBak = oracledb.maxRows;

    });

    afterEach(function() {
      oracledb.maxRows = maxRowBak;

    });

    it('117.5.1 fetchInfo', async function() {
      await test1(option, true, false);
    });

    it('117.5.2 oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = 1;
      await testMaxRow(option, false);
    });

    it('117.5.3 oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = 2;
      await testMaxRow(option, false);
    });

    it('117.5.4 oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = 10;
      await testMaxRow(option, false);
    });

    it('117.5.5 resultSet = true', async function() {
      let option_rs = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      await test1(option_rs, true, true);
    });

    it('117.5.6 queryStream() and oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = 1;
      await testQueryStream(option, true);
    });

    it('117.5.7 queryStream() and oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = 2;
      await testQueryStream(option, true);
    });

    it('117.5.8 queryStream() and oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = 10;
      await testQueryStream(option, true);
    });

  });

  describe('117.6 fetch as string by default with outFormat = ARRAY, urowid length > 200/500', function() {
    let option = { outFormat: oracledb.OUT_FORMAT_ARRAY  };
    let maxRowBak;

    before('get connection and create table', async function() {

      await sql.executeSql(connection, table_indexed, {}, {});

      await sql.executeSql(connection, table_normal, {}, {});

    });

    after('release connection', async function() {

      await sql.executeSql(connection, drop_table_indexed, {}, {});

      await sql.executeSql(connection, drop_table_normal, {}, {});

    });

    beforeEach(function() {
      maxRowBak = oracledb.maxRows;

    });

    afterEach(function() {
      oracledb.maxRows = maxRowBak;

    });

    it('117.6.1 fetchInfo', async function() {
      await test1(option, false, false);
    });

    it('117.6.2 oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = 1;
      await testMaxRow(option, false);
    });

    it('117.6.3 oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = 2;
      await testMaxRow(option, false);
    });

    it('117.6.4 oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = 10;
      await testMaxRow(option, false);
    });

    it('117.6.5 resultSet = true', async function() {
      let option_rs = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_ARRAY
      };
      await test1(option_rs, false, true);
    });

    it('117.6.6 queryStream() and oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = 1;
      await testQueryStream(option, false);
    });

    it('117.6.7 queryStream() and oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = 2;
      await testQueryStream(option, false);
    });

    it('117.6.8 queryStream() and oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = 10;
      await testQueryStream(option, false);
    });

  });

  async function test1(option, object, rsFlag) {

    let strLength = 200;
    let rowidLenExpected = 200;
    let id = insertID++;
    if (rsFlag === true) await fetchRowid_rs(id, strLength, rowidLenExpected, option, object);
    else await fetchRowid(id, strLength, rowidLenExpected, option, object);

    strLength = 500;
    rowidLenExpected = 500;
    id = insertID++;
    if (rsFlag === true) await fetchRowid_rs(id, strLength, rowidLenExpected, option, object);
    else await fetchRowid(id, strLength, rowidLenExpected, option, object);

  }

  async function fetchRowid(id, strLength, rowidLenExpected, option, object) {
    let urowid_1, urowid_2;

    await prepareData(id, strLength, rowidLenExpected);

    let sqlQuery = "select ROWID from " + tableName_indexed + " where c1 = " + id;
    let result = await connection.execute(sqlQuery);
    urowid_1 = result.rows[0][0];
    assert.strictEqual(typeof urowid_1, "string");
    sqlQuery = "select content from " + tableName_normal + " where id = " + id;
    result = await connection.execute(
      sqlQuery,
      [],
      option);
    urowid_2 = result.rows[0][0];
    if (object === true) {
      urowid_2 = result.rows[0].CONTENT;
    }
    assert.strictEqual(typeof urowid_2, "string");

    testsUtil.checkUrowidLength(urowid_1.length, rowidLenExpected);
    testsUtil.checkUrowidLength(urowid_2.length, rowidLenExpected);
    assert.strictEqual(urowid_1, urowid_2);
  }

  async function fetchRowid_rs(id, strLength, rowidLenExpected, option, object) {
    let urowid_1, urowid_2;

    await prepareData(id, strLength, rowidLenExpected);

    let sqlQuery = "select ROWID from " + tableName_indexed + " where c1 = " + id;
    let result = await connection.execute(
      sqlQuery);
    urowid_1 = result.rows[0][0];
    assert.strictEqual(typeof urowid_1, "string");

    sqlQuery = "select content from " + tableName_normal + " where id = " + id;
    result = await connection.execute(
      sqlQuery,
      [],
      option);
    let row = await result.resultSet.getRow();
    urowid_2 = row[0];
    if (object === true) {
      urowid_2 = row.CONTENT;
    }
    assert.strictEqual(typeof urowid_2, "string");
    await result.resultSet.close();
    testsUtil.checkUrowidLength(urowid_1.length, rowidLenExpected);
    testsUtil.checkUrowidLength(urowid_2.length, rowidLenExpected);
    assert.strictEqual(urowid_1, urowid_2);
  }

  async function testMaxRow(option, rsFlag) {
    let id_1 = insertID++;
    let id_2 = insertID++;
    let rowExpected, rowid_1, rowid_2, sqlQuery;

    let strLength = 200;
    let rowidLenExpected = 200;
    await prepareData(id_1, strLength, rowidLenExpected);

    strLength = 500;
    rowidLenExpected = 500;
    await prepareData(id_2, strLength, rowidLenExpected);

    let result = await connection.execute(
      "select * from " + tableName_normal + " where id = " + id_1 + " or id = " + id_2);

    rowExpected = (oracledb.maxRows >= 2) ? 2 : oracledb.maxRows;
    if (rsFlag === true) {
      rowExpected = 2;
    }
    assert.strictEqual(result.rows.length, rowExpected);
    rowid_1 = result.rows[0][1];
    if (rowExpected === 2) {
      rowid_2 = result.rows[1][1];
    }

    sqlQuery = "select ROWID from " + tableName_indexed + " where c1 = " + id_1;
    result = await connection.execute(sqlQuery);
    let resultVal = result.rows[0][0];
    assert.strictEqual(typeof resultVal, "string");
    assert.strictEqual(resultVal, rowid_1);

    if (rowExpected === 2) {
      sqlQuery = "select ROWID from " + tableName_indexed + " where c1 = " + id_2;
      result = await connection.execute(sqlQuery);
      let resultVal = result.rows[0][0];
      assert.strictEqual(typeof resultVal, "string");
      assert.strictEqual(resultVal, rowid_2);
    }
  }

  async function testQueryStream(option, object) {
    let id_1 = insertID++;
    let id_2 = insertID++;
    let rowid_1, rowid_2;

    let strLength = 200;
    let rowidLenExpected = 200;
    await prepareData(id_1, strLength, rowidLenExpected);

    strLength = 500;
    rowidLenExpected = 500;
    await prepareData(id_2, strLength, rowidLenExpected);

    let sqlQuery = "select content from " + tableName_normal + " where id = " + id_1 + " or id = " + id_2;
    let stream = await connection.queryStream(
      sqlQuery,
      [],
      option
    );

    let result = [];
    await new Promise((resolve, reject) => {
      stream.on('data', function(data) {
        assert(data);
        result.push(data);
      });

      stream.on('error', function(error) {
        reject(error);
      });
      stream.on('end',  function() {
        assert.strictEqual(result.length, 2);
        rowid_1 = result[0][0];
        rowid_2 = result[1][0];
        if (object === true) {
          rowid_1 = result[0].CONTENT;
          rowid_2 = result[1].CONTENT;
        }
        stream.destroy();
      });

      stream.on('close',  function() {
        resolve();
      });
    });
    sqlQuery = "select ROWID from " + tableName_indexed + " where c1 = " + id_1;
    result = await connection.execute(
      sqlQuery);
    let resultVal = result.rows[0][0];
    assert.strictEqual(typeof resultVal, "string");
    assert.strictEqual(resultVal, rowid_1);

    sqlQuery = "select ROWID from " + tableName_indexed + " where c1 = " + id_2;
    result = await connection.execute(
      sqlQuery);
    resultVal = result.rows[0][0];
    assert.strictEqual(typeof resultVal, "string");
    assert.strictEqual(resultVal, rowid_2);
  }

  async function prepareData(id, strLength, rowidLenExpected) {
    let str = random.getRandomLengthString(strLength);
    let urowid, urowidLen;

    let sql_insert = "insert into " + tableName_indexed + " values (" + id + ", '" + str + "')";
    await sql.executeInsert(connection, sql_insert, {}, {});

    let result = await connection.execute(
      "select ROWID from " + tableName_indexed + " where c1 = " + id);

    urowid = result.rows[0][0];
    urowidLen = urowid.length;
    testsUtil.checkUrowidLength(urowidLen, rowidLenExpected);

    result = await connection.execute(
      "insert into " + tableName_normal + " (id, content) values (" + id + ", '" + urowid + "')");

    assert.strictEqual(result.rowsAffected, 1);
  }
});

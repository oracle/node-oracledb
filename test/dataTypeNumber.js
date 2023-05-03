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
 *   26. dataTypeNumber.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - NUMBER.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const assist   = require('./dataTypeAssist.js');
const dbConfig = require('./dbconfig.js');

describe('26. dataTypeNumber.js', function() {

  let connection = null;
  let tableName = "nodb_number";
  let numbers = assist.data.numbers;

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('26.1 testing NUMBER data', function() {

    before('create table, insert data', async function() {
      await assist.setUp(connection, tableName, numbers);
    });

    after(async function() {
      oracledb.fetchAsString = [];
      await connection.execute("DROP table " + tableName + " PURGE");
    });

    it('26.1.1 SELECT query', async function() {
      await  assist.dataTypeSupport(connection, tableName, numbers);
    });

    it('26.1.2 resultSet stores NUMBER data correctly', async function() {
      await assist.verifyResultSet(connection, tableName, numbers);
    });

    it('26.1.3 works well with REF Cursor', async function() {
      await assist.verifyRefCursor(connection, tableName, numbers);
    });

    it('26.1.4 columns fetched from REF CURSORS can be mapped by fetchInfo settings', async function() {
      await  assist.verifyRefCursorWithFetchInfo(connection, tableName, numbers);
    });

    it('26.1.5 columns fetched from REF CURSORS can be mapped by oracledb.fetchAsString', async function() {
      oracledb.fetchAsString = [ oracledb.NUMBER ];
      await assist.verifyRefCursorWithFetchAsString(connection, tableName, numbers);
    });

  });

  describe('26.2 stores null value correctly', function() {
    it('26.2.1 testing Null, Empty string and Undefined', async function() {
      await assist.verifyNullValues(connection, tableName);
    });
  });

  // GitHub issue 833
  // https://github.com/oracle/node-oracledb/issues/833
  describe('26.3 large integers that cannot fit inside a 32-bit integer', function() {

    it('26.3.1 original case', async function() {

      let num = 999999999999;

      let proc = `BEGIN \n` +
                     `    DECLARE \n` +
                     `        e_table_missing EXCEPTION; \n` +
                     `        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n` +
                     `    BEGIN \n` +
                     `        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_bignum PURGE'); \n` +
                     `    EXCEPTION \n` +
                     `        WHEN e_table_missing \n` +
                     `        THEN NULL; \n` +
                     `    END; \n` +
                     `    EXECUTE IMMEDIATE (' \n` +
                     `        CREATE TABLE nodb_tab_bignum ( \n` +
                     `            id       NUMBER NOT NULL, \n` +
                     `            content  NUMBER(12, 0) \n` +
                     `        ) \n` +
                     `    '); \n` +
                     `END; `;

      await connection.execute(proc);
      let sql = `insert into nodb_tab_bignum (id, content) values (1, :n)`;
      await connection.execute(
        sql,
        { n: num });
      sql = `select content from nodb_tab_bignum where id = 1`;
      let result = await connection.execute(sql);

      assert.strictEqual(
        result.rows[0][0],
        num
      );
      sql = `DROP TABLE nodb_tab_bignum PURGE`;
      await connection.execute(sql);
    });
  }); // 26.3

  /*
   * The maximum safe integer in JavaScript is (2^53 - 1) i.e. 9007199254740992.
   * The minimum safe integer in JavaScript is (-(2^53 - 1)).
   * Numbers out of above range will be rounded.
   */
  describe('26.4 Large number, edge cases', function() {

    it('26.4.1 maximum safe integer, (2^53 - 1)', async function() {

      let num = 9007199254740992;
      let sql = `select ` + num + ` from dual`;
      let result = await connection.execute(sql);
      assert.strictEqual(
        result.rows[0][0],
        num
      );
    });

    it('26.4.2 Negative - maximum safe integer + 1', async function() {

      let actual = '9007199254740993';
      let expected = 9007199254740992;

      let sql = `SELECT TO_NUMBER( ` + actual + ` ) FROM DUAL`;
      let result = await connection.execute(sql);
      let outNum = result.rows[0][0];
      assert.strictEqual(outNum, expected);
    });

    it('26.4.3 minimum safe integer', async function() {

      let num = -9007199254740992;
      let sql = `select ` + num + ` from dual`;
      let result = await connection.execute(sql);

      assert.strictEqual(
        result.rows[0][0],
        num
      );
    });

    it('26.4.4 Negative - minimum safe integer - 1', async function() {
      let actual = '-9007199254740993';
      let expected = -9007199254740992;

      let sql = `SELECT TO_NUMBER( ` + actual + ` ) FROM DUAL`;
      let result = await connection.execute(sql);

      let outNum = result.rows[0][0];
      assert.strictEqual(outNum, expected);
    });

    it('26.4.5 fetch as string number that cannot be represented as JS Number', async function() {
      const num = '-1234567890123456789012345';
      const sql = `SELECT TO_NUMBER(${num}) AS TS_NUM FROM DUAL`;
      const options = {
        fetchInfo : { "TS_NUM"  : { type : oracledb.STRING } }
      };
      const result = await connection.execute(sql, [], options);
      const fetchedNum = result.rows[0][0];
      assert.strictEqual(fetchedNum, num);
    });

  }); // 26.4

});

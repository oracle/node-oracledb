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
 *   31. dataTypeBinaryDouble.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - BINARY_DOUBLE.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const assist   = require('./dataTypeAssist.js');
const dbConfig = require('./dbconfig.js');

describe('31. dataTypeBinaryDouble.js', function() {

  let connection = null;
  let tableName = "nodb_double";

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('31.1 testing BINARY_DOUBLE data', function() {

    let numbers = assist.data.numbersForBinaryFloat.concat(assist.data.numbersForBinaryDouble);

    before('create table, insert data', async function() {
      await new Promise((resolve) => {
        assist.setUp(connection, tableName, numbers, resolve);
      });
    });

    after(async function() {
      oracledb.fetchAsString = [];
      await connection.execute(`DROP table ` + tableName + ` PURGE`);
    });

    it('31.1.1 works well with SELECT query', async function() {
      await new Promise((resolve) => {
        assist.dataTypeSupport(connection, tableName, numbers, resolve);
      });
    });

    it('31.1.2 works well with result set', async function() {
      await new Promise((resolve) => {
        assist.verifyResultSet(connection, tableName, numbers, resolve);
      });
    });

    it('31.1.3 works well with REF Cursor', async function() {
      await new Promise((resolve) => {
        assist.verifyRefCursor(connection, tableName, numbers, resolve);
      });
    });

    it('31.1.4 columns fetched from REF CURSORS can be mapped by fetchInfo settings', async function() {
      await new Promise((resolve) => {
        assist.verifyRefCursorWithFetchInfo(connection, tableName, numbers, resolve);
      });
    });

    it('31.1.5 columns fetched from REF CURSORS can be mapped by oracledb.fetchAsString', async function() {
      oracledb.fetchAsString = [ oracledb.NUMBER ];
      await new Promise((resolve) => {
        assist.verifyRefCursorWithFetchAsString(connection, tableName, numbers, resolve);
      });
    });

  });

  describe('31.2 stores null value correctly', function() {
    it('31.2.1 testing Null, Empty string and Undefined', async function() {
      await new Promise((resolve) => {
        assist.verifyNullValues(connection, tableName, resolve);
      });
    });
  });

  describe('31.3 testing floating-point numbers which can be precisely represent', function() {
    let nums =
      [
        0.0000000000000000000123,
        98.7654321
      ];

    before('create table, insert data', async function() {
      await new Promise((resolve) => {
        assist.setUp(connection, tableName, nums, resolve);
      });
    });

    after(async function() {
      await connection.execute(`DROP table ` + tableName + ` PURGE`);
    });

    it('31.3.1 testing floating-point numbers', async function() {
      let result = await connection.execute(
        "SELECT * FROM " + tableName,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT });

      for (let i = 0; i < nums.length; i++) {
        assert.strictEqual(result.rows[i].CONTENT, nums[result.rows[i].NUM]);
      }
    });

  }); // 31.3
});

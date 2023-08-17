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
 *   30. dataTypeBinaryFloat.js
 *
 * DESCRIPTION
 *   Testing Oracle data type support - BINARY_FLOAT.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const assist   = require('./dataTypeAssist.js');
const dbConfig = require('./dbconfig.js');

describe('30. dataTypeBinaryFloat.js', function() {

  let connection = null;
  const tableName = "nodb_binary_float";

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('30.1 testing BINARY_FLOAT data', function() {

    const numbers = assist.data.numbersForBinaryFloat;

    before('create table, insert data', async function() {
      await assist.setUp(connection, tableName, numbers);
    });

    after(async function() {
      oracledb.fetchAsString = [];
      await connection.execute(`DROP table ` + tableName + ` PURGE`);
    });

    it('30.1.1 works well with SELECT query', async function() {
      await assist.dataTypeSupport(connection, tableName, numbers);
    });

    it('30.1.2 works well with result set', async function() {
      await assist.verifyResultSet(connection, tableName, numbers);
    });

    it('30.1.3 works well with REF Cursor', async function() {
      await  assist.verifyRefCursor(connection, tableName, numbers);
    });

    it('30.1.4 columns fetched from REF CURSORS can be mapped by fetchInfo settings', async function() {
      await  assist.verifyRefCursorWithFetchInfo(connection, tableName, numbers);
    });

    it('30.1.5 columns fetched from REF CURSORS can be mapped by oracledb.fetchAsString', async function() {
      oracledb.fetchAsString = [ oracledb.NUMBER ];
      await assist.verifyRefCursorWithFetchAsString(connection, tableName, numbers);
    });

  });  // 30.1

  describe('30.2 stores null value correctly', function() {
    it('30.2.1 testing Null, Empty string and Undefined', async function() {
      await assist.verifyNullValues(connection, tableName);
    });
  });

  describe('30.3 testing floating-point numbers which cannot be precisely represent', function() {
    const nums =
      [
        2345.67,
        9876.54321,
        0.01234,
        0.00000123
      ];

    before('create table, insert data', async function() {
      await  assist.setUp(connection, tableName, nums);
    });

    after(async function() {
      await connection.execute(`DROP table ` + tableName + ` PURGE`);
    });

    it('30.3.1 rounding numbers', async function() {
      const result = await connection.execute(
        `SELECT * FROM ` + tableName,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT });

      for (let i = 0; i < nums.length; i++) {
        assert.notStrictEqual(result.rows[i].CONTENT, nums[result.rows[i].NUM]);
        assert(approxeq(result.rows[i].CONTENT, nums[result.rows[i].NUM]));
      }
    });

    function approxeq(v1, v2) {
      const precision = 0.001;
      return Math.abs(v1 - v2) < precision;
    }
  }); // 30.3
});

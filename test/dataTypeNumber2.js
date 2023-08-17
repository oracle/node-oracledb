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
 *   27. dataTypeNumber2.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - NUMBER(p, s).
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const assist   = require('./dataTypeAssist.js');
const dbConfig = require('./dbconfig.js');

describe('27. dataTypeNumber2.js', function() {

  let connection = null;
  const tableName = "nodb_number2";
  const numbers = assist.data.numbers;

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('27.1 testing NUMBER(p, s) data', function() {

    before('create table, insert data', async function() {
      await assist.setUp(connection, tableName, numbers);
    });

    after(async function() {
      await connection.execute(`DROP table ` + tableName + ` PURGE`);
    });

    it('27.1.1 SELECT query', async function() {
      const result = await connection.execute(
        `SELECT * FROM ` + tableName,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT });

      for (let j = 0; j < numbers.length; j++) {
        if (Math.abs(numbers[result.rows[j].NUM]) == 0.00000123)
          assert.strictEqual(result.rows[j].CONTENT, 0);
        else
          assert.strictEqual(result.rows[j].CONTENT, numbers[result.rows[j].NUM]);
      }
    }); // 27.1.1

    it('27.1.2 resultSet stores NUMBER(p, s) data correctly', async function() {
      const numRows = 3; // number of rows to return from each call to getRows()
      const result = await connection.execute(
        `SELECT * FROM ` + tableName,
        [],
        { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT });
      assert.strictEqual((result.resultSet.metaData[0]).name, 'NUM');
      assert.strictEqual((result.resultSet.metaData[1]).name, 'CONTENT');
      await fetchRowsFromRS(result.resultSet);

      async function fetchRowsFromRS(rs) {
        const rows = await rs.getRows(numRows);
        if (rows.length > 0) {
          for (let i = 0; i < rows.length; i++) {
            if (Math.abs(numbers[rows[i].NUM]) == 0.00000123)
              assert.strictEqual(rows[i].CONTENT, 0);
            else
              assert.strictEqual(rows[i].CONTENT, numbers[rows[i].NUM]);
          }
          return fetchRowsFromRS(rs);
        } else if (rows.length == 0) {
          await rs.close();
        } else {
          const lengthLessThanZero = true;
          assert.ifError(lengthLessThanZero);
        }
      }
    });

  }); // 27.1

  describe('27.2 stores null value correctly', function() {
    it('27.2.1 testing Null, Empty string and Undefined', async function() {
      await assist.verifyNullValues(connection, tableName);
    });
  });

});

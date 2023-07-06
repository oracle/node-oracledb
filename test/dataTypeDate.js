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
 *   32. dataTypeDate.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - DATE.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const assist   = require('./dataTypeAssist.js');
const dbConfig = require('./dbconfig.js');

describe('32. dataTypeDate.js', function() {

  let connection = null;
  let tableName = "nodb_date";

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('32.1 Testing JavaScript Date data', function() {
    let dates = assist.data.dates;

    before('create table, insert data', async function() {
      await assist.setUp(connection, tableName, dates);
    });

    after(async function() {
      await connection.execute(`DROP table ` + tableName + ` PURGE`);
    });

    afterEach(function() {
      oracledb.fetchAsString = [];
    });

    it('32.1.1 works well with SELECT query', async function() {
      let arrayLength = dates.length;
      for (let i = 0; i < arrayLength; i++) {
        if (dates[i].getMilliseconds() > 0)
          dates[i].setMilliseconds(0);
      }
      await assist.dataTypeSupport(connection, tableName, dates);

      /*
       * This is to validate SQL reading time related columns have the OS timezone
       * considered correctly before running any other SQL on that connection.
       */
      const newConnection = await oracledb.getConnection(dbConfig);
      await assist.dataTypeSupport(newConnection, tableName, dates);
      await newConnection.close();
    });

    it('32.1.2 works well with result set', async function() {
      await assist.verifyResultSet(connection, tableName, dates);
    });

    it('32.1.3 works well with REF Cursor', async function() {
      await assist.verifyRefCursor(connection, tableName, dates);
    });

    it('32.1.4 columns fetched from REF CURSORS can be mapped by fetchInfo settings', async function() {
      await assist.verifyRefCursorWithFetchInfo(connection, tableName, dates);
    });

    it('32.1.5 columns fetched from REF CURSORS can be mapped by oracledb.fetchAsString', async function() {
      oracledb.fetchAsString = [ oracledb.DATE ];
      await assist.verifyRefCursorWithFetchAsString(connection, tableName, dates);
    });

    it('32.1.6 works well with SELECT query after session TimeZone change', async function() {
      const sql = "select sessiontimezone from dual";
      const result = await connection.execute(sql);
      const savedTZ = result.rows[0][0];
      await connection.execute(`ALTER SESSION SET TIME_ZONE='+05:00'`);  // resets ORA_SDTZ value
      await assist.dataTypeSupport(connection, tableName, dates);
      // restore to original timezone
      await connection.execute(`ALTER SESSION SET TIME_ZONE='${savedTZ}'`);
    });

  }); // 32.1 suite

  describe('32.2 stores null value correctly', function() {
    it('32.2.1 testing Null, Empty string and Undefined', async function() {
      await assist.verifyNullValues(connection, tableName);
    });
  });

  describe('32.3 insert SQL Date data', function() {
    let dates = assist.DATE_STRINGS;

    before(async function() {
      await assist.setUp4sql(connection, tableName, dates);
    });

    after(async function() {
      await connection.execute(`DROP table ` + tableName + ` PURGE`);
    });

    it('32.3.1 SELECT query - original data', async function() {
      await assist.selectOriginalData(connection, tableName, dates);
    });

    it('32.3.2 SELECT query - formatted data for comparison', async function() {
      await Promise.all(dates.map(async function(date) {
        let bv = dates.indexOf(date);
        let result = await connection.execute(
          `SELECT num, TO_CHAR(content, 'DD-MM-YYYY') AS TS_DATA FROM ` + tableName + ` WHERE num = :no`,
          { no: bv },
          { outFormat: oracledb.OUT_FORMAT_OBJECT });

        assert.strictEqual(result.rows[0].TS_DATA, assist.content.dates[bv]);
      }));
    });
  }); // end of 32.3 suite

  describe('32.4 Select invalid dates', function() {

    it('32.4.1 Negative - Invalid Year 0', async function() {
      const invalidYear = 0;
      const sql = `SELECT DATE '${invalidYear}-01-01' FROM DUAL`;

      await assert.rejects(
        async () => {
          await connection.execute(sql);
        },
        /* ORA-01841: (full) year must be between -4713 and +9999, and
           not be 0 */
        /ORA-01841:/
      );
    });

    it('32.4.2 Negative - Invalid Year -4713', async function() {
      const invalidYear = -4713;
      const sql = `SELECT DATE '${invalidYear}-01-01' FROM DUAL`;

      await assert.rejects(
        async () => {
          await connection.execute(sql);
        },
        /* ORA-01841: (full) year must be between -4713 and +9999, and
           not be 0 */
        /ORA-01841:/
      );
    });

    it('32.4.3 Negative - Invalid Year 10000', async function() {
      const invalidYear = 10000;
      const sql = `SELECT DATE '${invalidYear}-01-01' FROM DUAL`;

      await assert.rejects(
        async () => {
          await connection.execute(sql);
        },
        /* ORA-01841: (full) year must be between -4713 and +9999, and
           and not be 0 */
        /ORA-01841:/
      );
    });
  }); // end of 32.4 suite
});

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
 *   37. dataTypeTimestamp5.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - TIMESTAMP WITH LOCAL TIME ZONE.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const assist   = require('./dataTypeAssist.js');
const dbConfig = require('./dbconfig.js');

describe('37. dataTypeTimestamp5.js', function() {

  let connection = null;
  let tableName = "nodb_timestamp5";

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('37.1 Testing JavaScript Date with database TIMESTAMP WITH LOCAL TIME ZONE', function() {
    let dates = assist.data.dates;

    before('create table, insert data', async function() {
      await assist.setUp(connection, tableName, dates);
    });

    after(async function() {
      oracledb.fetchAsString = [];
      await connection.execute(`DROP table ` + tableName + ` PURGE`);
    });

    it('37.1.1 works well with SELECT query', async function() {
      await assist.dataTypeSupport(connection, tableName, dates);
    });

    it('37.1.2 works well with result set', async function() {
      await assist.verifyResultSet(connection, tableName, dates);
    });

    it('37.1.3 works well with REF Cursor', async function() {
      await assist.verifyRefCursor(connection, tableName, dates);
    });

    it('37.1.4 columns fetched from REF CURSORS can be mapped by fetchInfo settings', async function() {
      await assist.verifyRefCursorWithFetchInfo(connection, tableName, dates);
    });

    it('37.1.5 columns fetched from REF CURSORS can be mapped by oracledb.fetchAsString', async function() {
      oracledb.fetchAsString = [ oracledb.DATE ];
      await assist.verifyRefCursorWithFetchAsString(connection, tableName, dates);
    });

  }); // end of 37.1 suite

  describe('37.2 stores null value correctly', function() {
    it('37.2.1 testing Null, Empty string and Undefined', async function() {
      await assist.verifyNullValues(connection, tableName);
    });

    describe('37.3 testing TIMESTAMP WITH LOCAL TIME ZONE', function() {
      let timestamps = assist.TIMESTAMP_TZ_STRINGS_2;

      before(async function() {
        await assist.setUp4sql(connection, tableName, timestamps);
      });

      after(async function() {
        await connection.execute(`DROP table ` + tableName + ` PURGE`);
      }); // after

      it('37.3.1 SELECT query - original data', async function() {
        await assist.selectOriginalData(connection, tableName, timestamps);
      });

      it('37.3.2 SELECT query - formatted data for comparison', async function() {
        let sql = `SELECT num, TO_CHAR(content AT TIME ZONE '-8:00', 'DD-MM-YYYY HH24:MI:SS.FF TZR') AS TS_DATA FROM `
                 + tableName + ` WHERE num = :no`;

        await Promise.all(timestamps.map(async function(timestamp) {
          let bv = timestamps.indexOf(timestamp);
          let result = await connection.execute(
            sql,
            { no: bv },
            {
              outFormat: oracledb.OUT_FORMAT_OBJECT
            });
          assert.strictEqual(result.rows[0].TS_DATA, assist.content.timestamps5[bv]);
        }));
      });
    }); // end of 37.3 suite

  });
});

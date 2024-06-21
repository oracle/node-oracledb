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
 *   33. dataTypeTimestamp1.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - TIMESTAMP.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const assist   = require('./dataTypeAssist.js');
const dbConfig = require('./dbconfig.js');

describe('33. dataTypeTimestamp1.js', function() {

  let connection = null;
  const tableName = "nodb_timestamp1";

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('33.1 Testing JavaScript Date with database TIMESTAMP', function() {
    const dates = assist.data.dates;

    before('create table, insert data', async function() {
      await assist.setUp(connection, tableName, dates);
    });

    after(async function() {
      oracledb.fetchAsString = [];
      await connection.execute(`DROP table ` + tableName + ` PURGE`);
    });

    it('33.1.1 works well with SELECT query', async function() {
      await assist.dataTypeSupport(connection, tableName, dates);
    });

    it('33.1.2 works well with result set', async function() {
      await assist.verifyResultSet(connection, tableName, dates);
    });

    it('33.1.3 works well with REF Cursor', async function() {
      await assist.verifyRefCursor(connection, tableName, dates);
    });

    it('33.1.4 columns fetched from REF CURSORS can be mapped by fetchInfo settings', async function() {
      await assist.verifyRefCursorWithFetchInfo(connection, tableName, dates);
    });

    it('33.1.5 columns fetched from REF CURSORS can be mapped by oracledb.fetchAsString', async function() {
      oracledb.fetchAsString = [ oracledb.DATE ];
      await  assist.verifyRefCursorWithFetchAsString(connection, tableName, dates);
    });

  }); // 33.1

  describe('33.2 stores null value correctly', function() {
    it('33.2.1 testing Null, Empty string and Undefined', async function() {
      await assist.verifyNullValues(connection, tableName);
    });
  }); // 33.2

  describe('33.3 testing TIMESTAMP without TIME ZONE', function() {
    const timestamps = assist.TIMESTAMP_STRINGS;

    before(async function() {
      await assist.setUp4sql(connection, tableName, timestamps);
    });

    after(async function() {
      await connection.execute(`DROP table ` + tableName + ` PURGE`);
    }); // after

    it('33.3.1 SELECT query - original data', async function() {
      await  assist.selectOriginalData(connection, tableName, timestamps);
    });

    it('33.3.2 SELECT query - formatted data for comparison', async function() {
      await Promise.all(timestamps.map(async function(timestamp) {
        const bv = timestamps.indexOf(timestamp);
        const result = await connection.execute(
          `SELECT num, TO_CHAR(content, 'DD-MM-YYYY HH24:MI:SS.FF') AS TS_DATA FROM ` + tableName + ` WHERE num = :no`,
          { no: bv },
          { outFormat: oracledb.OUT_FORMAT_OBJECT });
        assert.strictEqual(result.rows[0].TS_DATA, assist.content.timestamps1[bv]);
      }));
    });

    it('33.3.3 returns scalar types from PL/SQL block', async function() {
      const sql = "BEGIN SELECT systimestamp into :bv from dual; END;";
      const binds = { bv: { dir: oracledb.BIND_OUT, type: oracledb.STRING } };
      const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await connection.execute(sql, binds, options);
      assert(typeof result.outBinds.bv, "string");
    });

  }); // 33.3

  describe('33.4 timestamp with time zone', () => {
    const timezones = ['UTC', 'PST', 'IST', 'EST', 'GMT', 'JST', 'AEDT'];
    const defaultORA_SDTZ = process.env.ORA_SDTZ;

    after(function() {
      if (!defaultORA_SDTZ && process.env.ORA_SDTZ)
        delete process.env.ORA_SDTZ;
      else process.env.ORA_SDTZ = defaultORA_SDTZ;
    });

    // This test checks for a bug when newer TZ files
    // are missing in the IC package used for thick mode.
    it('33.4.1 test with different session time zone', async () => {
      for (const timezone of timezones) {
        process.env.ORA_SDTZ = timezone;
        const sql = `SELECT CURRENT_TIMESTAMP AS CT FROM DUAL`;
        const binds = [];
        const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };

        const result = await connection.execute(sql, binds, options);
        const timestamp = result.rows[0].CT;

        assert(timestamp instanceof Date);
      }
    });
  }); // 33.4
});

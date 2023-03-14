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
 *   19. fetchTimestampAsString.js
 *
 * DESCRIPTION
 *    Fetch Oracle TIMESTAMP types as String data
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');

describe('19. fetchTimestampAsString.js', function() {
  let connection = null;
  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    connection.execute(
      `alter session set nls_timestamp_format = 'YYYY-MM-DD HH24:MI:SS.FF'`);
    connection.execute(
      `alter session set nls_timestamp_tz_format = 'YYYY-MM-DD HH24:MI:SS.FF'`);
  });

  after(function() {
    oracledb.fetchAsString = [];
    connection.close();
  });

  describe('19.1 TIMESTAMP', function() {
    const tableName = `nodb_timestamp1`;
    const inData = assist.TIMESTAMP_STRINGS;

    before(async function() {
      await assist.setUp4sql(connection, tableName, inData);
    });

    after(function() {
      oracledb.fetchAsString = [];
      connection.execute(`DROP table ` + tableName + ` PURGE`);
    }); // after

    afterEach(function() {
      oracledb.fetchAsString = [];
    });

    it('19.1.1 fetchInfo option', async function() {
      const ref = assist.content.timestamp_1_1;
      await test1(tableName, ref);
    });

    it('19.1.2 fetchInfo option, outFormat is OBJECT', async function() {
      const ref = assist.content.timestamp_1_2;
      await test2(tableName, ref);
    });

    it('19.1.3 fetchInfo option, enables resultSet', async function() {
      const ref = assist.content.timestamp_1_1;
      await test3(tableName, ref);
    });

    it('19.1.4 fetchInfo option, resultSet and OBJECT outFormat', async function() {
      const ref = assist.content.timestamp_1_2;
      await test4(tableName, ref);
    });

    it('19.1.5 fetchAsString property', async function() {
      oracledb.fetchAsString = [ oracledb.DATE ];
      const ref = assist.content.timestamp_1_1;
      await test5(tableName, ref);
    });

    it('19.1.6 fetchAsString property and OBJECT outFormat', async function() {
      oracledb.fetchAsString = [ oracledb.DATE ];
      const ref = assist.content.timestamp_1_2;
      await test6(tableName, ref);
    });

    it('19.1.7 fetchAsString property, resultSet', async function() {
      oracledb.fetchAsString = [ oracledb.DATE ];
      const ref = assist.content.timestamp_1_1;
      await test7(tableName, ref);
    });

    it('19.1.8 fetchAsString property, resultSet and OBJECT outFormat', async function() {
      oracledb.fetchAsString = [ oracledb.DATE ];
      const ref = assist.content.timestamp_1_2;
      await test8(tableName, ref);
    });

  }); // 19.1

  describe('19.2 TIMESTAMP WITH TIME ZONE', function() {

    const tableName = "nodb_timestamp3";
    const inData = assist.TIMESTAMP_TZ_STRINGS_1;

    before(async function() {
      await assist.setUp4sql(connection, tableName, inData);
    });

    after(async function() {
      oracledb.fetchAsString = [];
      await connection.execute(`DROP table ` + tableName + ` PURGE`);
    }); // after

    afterEach(function() {
      oracledb.fetchAsString = [];
    });

    it('19.2.1 fetchInfo option', async function() {
      const ref = assist.content.timestamp_3_1;
      await test1(tableName, ref);
    });

    it('19.2.2 fetchInfo option, outFormat is OBJECT', async function() {
      const ref = assist.content.timestamp_3_2;
      await test2(tableName, ref);
    });

    it('19.2.3 fetchInfo option, enables resultSet', async function() {
      const ref = assist.content.timestamp_3_1;
      await test3(tableName, ref);
    });

    it('19.2.4 fetchInfo option, resultSet and OBJECT outFormat', async function() {
      const ref = assist.content.timestamp_3_2;
      await test4(tableName, ref);
    });

    it('19.2.5 fetchAsString property', async function() {
      oracledb.fetchAsString = [ oracledb.DATE ];
      const ref = assist.content.timestamp_3_1;
      await test5(tableName, ref);
    });

    it('19.2.6 fetchAsString property and OBJECT outFormat', async function() {
      oracledb.fetchAsString = [ oracledb.DATE ];
      const ref = assist.content.timestamp_3_2;
      await test6(tableName, ref);
    });

    it('19.2.7 fetchAsString property, resultSet', async function() {
      oracledb.fetchAsString = [ oracledb.DATE ];
      const ref = assist.content.timestamp_3_1;
      await test7(tableName, ref);
    });

    it('19.2.8 fetchAsString property, resultSet and OBJECT outFormat', async function() {
      oracledb.fetchAsString = [ oracledb.DATE ];
      const ref = assist.content.timestamp_3_2;
      await test8(tableName, ref);
    });

  }); // 19.2

  describe('19.3 testing maxRows settings and queryStream() to fetch as string', function() {
    const tableName = "nodb_timestamp3";
    const inData = assist.TIMESTAMP_TZ_STRINGS_1;
    const defaultLimit = oracledb.maxRows;

    before(async function() {
      assert.strictEqual(defaultLimit, 0);
      await assist.setUp4sql(connection, tableName, inData);
    });

    after(async function() {
      oracledb.fetchAsString = [];
      await connection.execute(`DROP table ` + tableName + ` PURGE`);
    }); // after

    beforeEach(function() {
      assert.strictEqual(oracledb.maxRows, defaultLimit);
    });

    afterEach(function() {
      oracledb.maxRows = defaultLimit;
    });

    it('19.3.1 works well when setting oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = inData.length * 2;
      const ref = assist.content.timestamp_3_1;
      await test1(tableName, ref);
    });

    it('19.3.2 maxRows = actual num of rows', async function() {
      oracledb.maxRows = inData.length;
      const ref = assist.content.timestamp_3_1;
      await test1(tableName, ref);
    });

    it('19.3.3 works when oracledb.maxRows < actual number of rows', async function() {
      const half = Math.floor(inData.length / 2);
      oracledb.maxRows = half;
      const ref = assist.content.timestamp_3_1.slice(0, half);
      await test1(tableName, ref);
    });

    it('19.3.4 uses queryStream() and maxRows > actual number of rows', async function() {
      oracledb.maxRows = inData.length * 2;
      const ref = assist.content.timestamp_3_1;
      await test9(tableName, ref);
    });

    it('19.3.5 uses queryStream() and maxRows = actual number of rows', async function() {
      oracledb.maxRows = inData.length;
      const ref = assist.content.timestamp_3_1;
      await test9(tableName, ref);
    });

    it('19.3.6 maxRows < actual rows. maxRows does not restrict queryStream()', async function() {
      const half = Math.floor(inData.length / 2);
      oracledb.maxRows = half;
      const ref = assist.content.timestamp_3_1;
      await test9(tableName, ref);
    });


  }); // 19.3

  // fetchInfo option
  async function test1(table, want) {
    const result = await connection.execute(
      `select content from ` + table + ` order by num`,
      [],
      { fetchInfo: { "CONTENT": { type: oracledb.STRING } } });

    assert.deepEqual(result.rows, want);
  }

  // fetchInfo option, outFormat is OBJECT
  async function test2(table, want) {
    const result = await connection.execute(
      `select content from ` + table + ` order by num`,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: { "CONTENT": { type: oracledb.STRING } }
      });
    assert.deepEqual(result.rows, want);
  }

  // fetchInfo option, resultSet
  async function test3(table, want) {
    const result = await connection.execute(
      `select content from ` + table + ` order by num`,
      [],
      {
        resultSet: true,
        fetchInfo: { "CONTENT": { type: oracledb.STRING } }
      });

    let count = 0;
    await fetchRowFromRS(result.resultSet);

    async function fetchRowFromRS(rs) {
      const row = await rs.getRow();

      if (row) {
        assert.deepEqual(row, want[count]);
        count++;
        return fetchRowFromRS(rs);
      } else {
        await rs.close();
      }
    } // end of fetchRowFromRS
  }

  async function test4(table, want) {
    const result = await connection.execute(
      `select content from ` + table + ` order by num`,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        resultSet: true,
        fetchInfo: { "CONTENT": { type: oracledb.STRING } }
      });

    let count = 0;
    await fetchRowFromRS(result.resultSet);

    async function fetchRowFromRS(rs) {
      const row = await rs.getRow();

      if (row) {
        assert.deepEqual(row, want[count]);
        count++;
        return fetchRowFromRS(rs);
      } else {
        await rs.close();
      }
    } // end of fetchRowFromRS
  }

  async function test5(table, want) {
    const result = await connection.execute(
      `select content from ` + table + ` order by num`);
    assert.deepEqual(result.rows, want);
  }

  async function test6(table, want) {
    const result = await connection.execute(
      `select content from ` + table + ` order by num`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT });
    assert.deepEqual(result.rows, want);
  }

  async function test7(table, want) {
    const result = await connection.execute(
      `select content from ` + table + ` order by num`,
      [],
      {
        resultSet: true
      });

    let count = 0;
    await fetchRowFromRS(result.resultSet);

    async function fetchRowFromRS(rs) {
      const row = await rs.getRow();

      if (row) {
        assert.deepEqual(row, want[count]);
        count++;
        return fetchRowFromRS(rs);
      } else {
        await rs.close();
      }
    } // end of fetchRowFromRS
  }

  async function test8(table, want) {
    const result = await connection.execute(
      `select content from ` + table + ` order by num`,
      [],
      {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      });

    let count = 0;
    await fetchRowFromRS(result.resultSet);

    async function fetchRowFromRS(rs) {
      const row = await rs.getRow();

      if (row) {
        assert.deepEqual(row, want[count]);
        count++;
        return fetchRowFromRS(rs);
      } else {
        await rs.close();
      }
    } // end of fetchRowFromRS
  }

  async function test9(table, want) {
    const sql = `select content from ` + table + ` order by num`;
    const stream = await connection.queryStream(
      sql,
      [],
      { fetchInfo: { "CONTENT": { type: oracledb.STRING } } }
    );

    const result = [];
    await new Promise((resolve, reject) => {

      stream.on('error', function(error) {
        reject(error);
      });

      stream.on('data', function(data) {
        assert(data);
        result.push(data);
      });

      stream.on('end', function() {
        assert.deepEqual(result, want);
        stream.destroy();
      });

      stream.on('close', function() {
        resolve();
      });
    });
  }

});

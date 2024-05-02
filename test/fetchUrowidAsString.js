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
 *   116. fetchUrowidAsString.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - UROWID.
 *    To fetch UROWID columns as strings.
 *    Test insert and fetch ROWID in an UROWID db column.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');

describe('116. fetchUrowidAsString.js', function() {

  let connection = null;
  const tableName = "nodb_rowid";
  const dataArray = random.getRandomNumArray(30);
  const numRows = dataArray.length;  // number of rows to return from each call to getRows()

  const proc_create_table = "BEGIN \n" +
                            "    DECLARE \n" +
                            "        e_table_missing EXCEPTION; \n" +
                            "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                            "        BEGIN \n" +
                            "            EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE' ); \n" +
                            "        EXCEPTION \n" +
                            "            WHEN e_table_missing \n" +
                            "            THEN NULL; \n" +
                            "        END; \n" +
                            "        EXECUTE IMMEDIATE ( ' \n" +
                            "            CREATE TABLE " + tableName + " ( \n" +
                            "                num      NUMBER, \n" +
                            "                content  UROWID \n" +
                            "            ) \n" +
                            "        '); \n" +
                            "END;  ";
  const drop_table = "DROP TABLE " + tableName + " PURGE";

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  const insertData = async function(connection, tableName) {
    for (let index = 0; index < dataArray.length; index++) {
      const sql = "INSERT INTO " + tableName + "(num) VALUES(" + index + ")";
      await connection.execute(sql);
    }
  };

  const updateData = async function(connection, tableName) {
    for (let index = 0; index < dataArray.length; index++) {
      const sql = "UPDATE " + tableName + " T SET content = T.ROWID where num = " + index;
      await connection.execute(sql);
    }
  };

  describe('116.1 works with fetchInfo option', function() {
    const maxRowBak = oracledb.maxRows;
    const option = { fetchInfo: { "CONTENT": { type: oracledb.STRING } } };
    before(async function() {
      await connection.execute(proc_create_table);
      await insertData(connection, tableName);
      await updateData(connection, tableName);
    });

    after(async function() {
      oracledb.maxRows = maxRowBak;
      await connection.execute(drop_table);
    });

    it('116.1.1 fetchInfo', async function() {
      await test1(option, false);
    });

    it('116.1.2 fetchInfo, and oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = numRows - 1;
      await testMaxRow(option);
    });

    it('116.1.3 fetchInfo, and oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = numRows;
      await testMaxRow(option);
    });

    it('116.1.4 fetchInfo, and oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = numRows + 1;
      await testMaxRow(option);
    });

    it('116.1.5 fetchInfo, queryStream() and oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = numRows - 1;
      await testQueryStream(option);
    });

    it('116.1.6 fetchInfo, queryStream() and oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = numRows;
      await testQueryStream(option);
    });

    it('116.1.7 fetchInfo, queryStream() and oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = numRows + 1;
      await testQueryStream(option);
    });

    it('116.1.8 fetchInfo, resultSet = true', async function() {
      const option_rs = {
        resultSet: true,
        fetchInfo: { "CONTENT": { type: oracledb.STRING } }
      };
      await test2(option_rs, false);
    });

  });

  describe('116.2 works with fetchInfo and outFormat = OBJECT', function() {
    const maxRowBak = oracledb.maxRows;
    const option = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      fetchInfo: { "CONTENT": { type: oracledb.STRING } }
    };
    before(async function() {
      await connection.execute(proc_create_table);
      await insertData(connection, tableName);
      await updateData(connection, tableName);
    });

    after(async function() {
      oracledb.maxRows = maxRowBak;
      await connection.execute(drop_table);
    });

    it('116.2.1 fetchInfo with outFormat = OBJECT', async function() {
      await test1(option, true);
    });

    it('116.2.2 fetchInfo, outFormat = OBJECT, and resultSet = true', async function() {
      const option_rs = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: { "CONTENT": { type: oracledb.STRING } }
      };
      await test2(option_rs, true);
    });

    it('116.2.3 fetchInfo, outFormat = OBJECT, and oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = numRows - 1;
      await testMaxRow(option);
    });

    it('116.2.4 fetchInfo, outFormat = OBJECT, and oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = numRows;
      await testMaxRow(option);
    });

    it('116.2.5 fetchInfo, outFormat = OBJECT, and oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = numRows + 1;
      await testMaxRow(option);
    });

    it('116.2.6 fetchInfo, outFormat = OBJECT, queryStream() and oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = numRows - 1;
      await testQueryStream(option);
    });

    it('116.2.7 fetchInfo, outFormat = OBJECT, queryStream() and oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = numRows;
      await testQueryStream(option);
    });

    it('116.2.8 fetchInfo, outFormat = OBJECT, queryStream() and oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = numRows + 1;
      await testQueryStream(option);
    });
  });

  describe('116.3 works with fetchInfo and outFormat = ARRAY', function() {
    const maxRowBak = oracledb.maxRows;
    const option = {
      outFormat: oracledb.OUT_FORMAT_ARRAY,
      fetchInfo: { "CONTENT": { type: oracledb.STRING } }
    };
    before(async function() {
      await connection.execute(proc_create_table);
      await insertData(connection, tableName);
      await updateData(connection, tableName);
    });

    after(async function() {
      oracledb.maxRows = maxRowBak;
      await connection.execute(drop_table);
    });

    it('116.3.1 fetchInfo', async function() {
      await test1(option, false);
    });

    it('116.3.2 fetchInfo, and oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = numRows - 1;
      await testMaxRow(option);
    });

    it('116.3.3 fetchInfo, and oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = numRows;
      await testMaxRow(option);
    });

    it('116.3.4 fetchInfo, and oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = numRows + 1;
      await testMaxRow(option);
    });

    it('116.3.5 fetchInfo, queryStream() and oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = numRows - 1;
      await testQueryStream(option);
    });

    it('116.3.6 fetchInfo, queryStream() and oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = numRows;
      await testQueryStream(option);
    });

    it('116.3.7 fetchInfo, queryStream() and oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = numRows + 1;
      await testQueryStream(option);
    });

    it('116.3.8 fetchInfo, resultSet = true', async function() {
      const option_rs = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_ARRAY,
        fetchInfo: { "CONTENT": { type: oracledb.STRING } }
      };
      await test2(option_rs, false);
    });
  });

  describe('116.4 fetch as string by default', function() {
    const maxRowBak = oracledb.maxRows;
    const option = {};
    before(async function() {
      await connection.execute(proc_create_table);
      await insertData(connection, tableName);
      await updateData(connection, tableName);
    });

    after(async function() {
      oracledb.maxRows = maxRowBak;
      await connection.execute(drop_table);

    });

    it('116.4.1 fetch by default', async function() {
      await test1(option, false);
    });

    it('116.4.2 oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = numRows - 1;
      await testMaxRow(option);
    });

    it('116.4.3 oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = numRows;
      await testMaxRow(option);
    });

    it('116.4.4 oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = numRows + 1;
      await testMaxRow(option);
    });

    it('116.4.5 queryStream() and oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = numRows - 1;
      await testQueryStream(option);
    });

    it('116.4.6 queryStream() and oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = numRows;
      await testQueryStream(option);
    });

    it('116.4.7 queryStream() and oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = numRows + 1;
      await testQueryStream(option);
    });

    it('116.4.8 resultSet = true', async function() {
      const option_rs = {
        resultSet: true,
      };
      await test2(option_rs, false);
    });

  });

  describe('116.5 fetch as string by default with outFormat = OBJECT', function() {
    const maxRowBak = oracledb.maxRows;
    const option = { outFormat: oracledb.OUT_FORMAT_OBJECT };
    before(async function() {
      await connection.execute(proc_create_table);
      await insertData(connection, tableName);
      await updateData(connection, tableName);
    });

    after(async function() {
      oracledb.maxRows = maxRowBak;
      await connection.execute(drop_table);

    });

    it('116.5.1 fetch by default', async function() {
      await test1(option, true);
    });

    it('116.5.2 oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = numRows - 1;
      await testMaxRow(option);
    });

    it('116.5.3 oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = numRows;
      await testMaxRow(option);
    });

    it('116.5.4 oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = numRows + 1;
      await testMaxRow(option);
    });

    it('116.5.5 queryStream() and oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = numRows - 1;
      await testQueryStream(option);
    });

    it('116.5.6 queryStream() and oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = numRows;
      await testQueryStream(option);
    });

    it('116.5.7 queryStream() and oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = numRows + 1;
      await testQueryStream(option);
    });

    it('116.5.8 resultSet = true', async function() {
      const option_rs = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      await test2(option_rs, true);
    });

  });

  describe('116.6 fetch as string by default with outFormat = ARRAY', function() {
    const maxRowBak = oracledb.maxRows;
    const option = { outFormat: oracledb.OUT_FORMAT_ARRAY };
    before(async function() {
      await connection.execute(proc_create_table);
      await insertData(connection, tableName);
      await updateData(connection, tableName);
    });

    after(async function() {
      oracledb.maxRows = maxRowBak;
      await connection.execute(drop_table);
    });

    it('116.6.1 fetch by default', async function() {
      await test1(option, false);
    });

    it('116.6.2 oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = numRows - 1;
      await testMaxRow(option);
    });

    it('116.6.3 oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = numRows;
      await testMaxRow(option);
    });

    it('116.6.4 oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = numRows + 1;
      await testMaxRow(option);
    });

    it('116.6.5 queryStream() and oracledb.maxRows < actual number of rows', async function() {
      oracledb.maxRows = numRows - 1;
      await testQueryStream(option);
    });

    it('116.6.6 queryStream() and oracledb.maxRows = actual number of rows', async function() {
      oracledb.maxRows = numRows;
      await testQueryStream(option);
    });

    it('116.6.7 queryStream() and oracledb.maxRows > actual number of rows', async function() {
      oracledb.maxRows = numRows + 1;
      await testQueryStream(option);
    });

    it('116.6.8 resultSet = true', async function() {
      const option_rs = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_ARRAY,
      };
      await test2(option_rs, false);
    });

  });

  async function test1(option, object) {
    for (let index = 0; index < dataArray.length; index++) {
      const sql = "select content,rowid from " + tableName + " where num = " + index;
      const result = await connection.execute(sql, [], option);
      let resultVal_1 = result.rows[0][0];
      let resultVal_2 = result.rows[0][1];
      if (object === true) {
        resultVal_1 = result.rows[0].CONTENT;
        resultVal_2 = result.rows[0].ROWID;
      }
      assert.strictEqual(typeof resultVal_1, "string");
      assert.strictEqual(resultVal_1, resultVal_2);

    }
  }

  async function test2(option, object) {
    for (let index = 0; index < dataArray.length; index++) {
      const sql = "select content,rowid from " + tableName + " where num = " + index;
      const result = await connection.execute(sql, [], option);
      const row = await result.resultSet.getRow();
      let resultVal_1 = row[0];
      let resultVal_2 = row[1];

      if (object === true) {
        resultVal_1 = row.CONTENT;
        resultVal_2 = row.ROWID;
      }
      assert.strictEqual(typeof resultVal_1, "string");
      assert.strictEqual(resultVal_1, resultVal_2);

      await result.resultSet.close();
    }
  }

  async function testMaxRow(option) {
    const sql = "select CONTENT from " + tableName;
    const result = await connection.execute(sql, [], option);
    const rowExpected = (oracledb.maxRows >= numRows) ? numRows : oracledb.maxRows;
    assert.strictEqual(result.rows.length, rowExpected);
  }

  async function testQueryStream(option) {
    const sql = "select CONTENT from " + tableName;
    const stream = await connection.queryStream(sql, [], option);

    const result = [];
    await new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('end', function() {
        assert.strictEqual(result.length, numRows);
        stream.destroy();
      });
      stream.on('close', resolve);
      stream.on('data', function(data) {
        assert(data);
        result.push(data);
      });
    });

  }
});

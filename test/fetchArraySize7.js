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
 *   154. fetchArraySize7.js
 *
 * DESCRIPTION
 *   Fetching data from database with different execute() option fetchArraySize when resultSet=true
 *   Tests including:
 *     getRow() tests
 *     getRows() tests
 *     interleaved calls to getRow() and getRows() tests
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe("154. fetchArraySize7.js", function() {

  let connection = null;
  const default_maxRows = oracledb.maxRows;
  const tableName = "nodb_fetchArraySize_154";
  const tableSize = 1000;

  const create_table = "BEGIN \n" +
                     "    DECLARE \n" +
                     "        e_table_missing EXCEPTION; \n" +
                     "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                     "    BEGIN \n" +
                     "        EXECUTE IMMEDIATE('DROP TABLE " + tableName + " PURGE'); \n" +
                     "    EXCEPTION \n" +
                     "        WHEN e_table_missing \n" +
                     "        THEN NULL; \n" +
                     "    END; \n" +
                     "    EXECUTE IMMEDIATE (' \n" +
                     "        CREATE TABLE " + tableName + " ( \n" +
                     "            id         NUMBER, \n" +
                     "            content    VARCHAR(2000) \n" +
                     "        ) \n" +
                     "    '); \n" +
                     "    FOR i IN 1.." + tableSize + " LOOP \n" +
                     "         EXECUTE IMMEDIATE (' \n" +
                     "             insert into " + tableName + " values (' || i || ',' || to_char(i) ||') \n" +
                     "        '); \n" +
                     "    END LOOP; \n" +
                     "    commit; \n" +
                     "END; ";

  const drop_table = "DROP TABLE " + tableName + " PURGE";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    assert.strictEqual(default_maxRows, 0);
  });

  after(async function() {
    await connection.close();
  });


  describe("154.1 getRows() of resultSet = true", function() {

    before(async function() {
      await connection.execute(create_table);
    });

    after(async function() {
      await connection.execute(drop_table);
    });

    afterEach(function() {
      oracledb.maxRows = default_maxRows;
    });

    const testGetRow = async function(fetchArraySizeVal, numRowsVal) {

      const result = await connection.execute(
        "select * from " + tableName + " order by id",
        [],
        {
          resultSet: true,
          fetchArraySize: fetchArraySizeVal
        }
      );
      const rowCount = 0;
      fetchRowsFromRS(result.resultSet, numRowsVal, rowCount);
    };

    async function fetchRowsFromRS(rs, numRowsVal, rowCount) {
      const rows = await rs.getRows(numRowsVal);
      assert(rows.length <= numRowsVal);
      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i++) {
          rowCount = rowCount + 1;
          assert.strictEqual(rows[i][0], rowCount);
          assert.strictEqual(rows[i][1], rowCount.toString());
        }
        return await fetchRowsFromRS(rs, numRowsVal, rowCount);
      } else {
        assert.strictEqual(rowCount, tableSize);
        await rs.close();
      }
    }

    it("154.1.1 numRows > table size > fetchArraySize", async function() {
      const fetchArraySizeVal = tableSize - 50;
      const numRowsVal = tableSize + 10000;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("154.1.2 numRows > fetchArraySize > table size", async function() {
      const fetchArraySizeVal = tableSize + 1200;
      const numRowsVal = tableSize + 10000;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("154.1.3 table size > numRows > fetchArraySize", async function() {
      const fetchArraySizeVal = tableSize - 91;
      const numRowsVal = tableSize - 2;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("154.1.4 table size > fetchArraySize > maxRow", async function() {
      const fetchArraySizeVal = tableSize - 90;
      const numRowsVal = tableSize - 150;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("154.1.5 numRows = fetchArraySize < table size", async function() {
      const fetchArraySizeVal = tableSize - 110;
      const numRowsVal = tableSize - 110;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("154.1.6 numRows = fetchArraySize = table size", async function() {
      const fetchArraySizeVal = tableSize;
      const numRowsVal = tableSize;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("154.1.7 numRows = fetchArraySize > table size", async function() {
      const fetchArraySizeVal = tableSize + 9999;
      const numRowsVal = tableSize + 9999;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("154.1.8 numRows = fetchArraySize/10", async function() {
      const fetchArraySizeVal = tableSize / 10 + 1;
      const numRowsVal = tableSize / 10;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("154.1.9 numRows = 10 * fetchArraySize", async function() {
      const fetchArraySizeVal = 90;
      const numRowsVal = 900;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("154.1.10 numRows > fetchArraySize, fetchArraySize = (table size)/10", async function() {
      const fetchArraySizeVal = tableSize / 10;
      const numRowsVal = tableSize / 10 + 1;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("154.1.11 numRows = (table size - 1), fetchArraySize = table size", async function() {
      const fetchArraySizeVal = tableSize;
      const numRowsVal = tableSize - 1;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("154.1.12 fetchArraySize = (table size - 1), numRows = table size", async function() {
      const fetchArraySizeVal = tableSize - 1;
      const numRowsVal = tableSize;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

  });

  describe("154.2 getRow() of resultSet = true", function() {

    before(async function() {
      await connection.execute(create_table);
    });

    after(async function() {
      await connection.execute(drop_table);
    });

    afterEach(function() {
      oracledb.maxRows = default_maxRows;
    });

    const testGetRows = async function(fetchArraySizeVal) {
      const result = await connection.execute(
        "select * from " + tableName + " order by id",
        [],
        {
          resultSet: true,
          fetchArraySize: fetchArraySizeVal
        }
      );
      const rowCount = 0;
      // assert.strictEqual(result.rows.length, default_maxRows);
      await fetchRowFromRS(result.resultSet, rowCount);
    };

    async function fetchRowFromRS(rs, rowCount) {
      const row = await rs.getRow();
      if (row) {
        rowCount = rowCount + 1;
        // console.log(rows[i][0]);
        assert.strictEqual(row[0], rowCount);
        assert.strictEqual(row[1], rowCount.toString());
        return fetchRowFromRS(rs, rowCount);
      } else {
        assert.strictEqual(rowCount, tableSize);
        await rs.close();
      }
    }

    it("154.2.1 fetchArraySize = 1", async function() {
      await testGetRows(1);
    });

    it("154.2.2 fetchArraySize = tableSize/50", async function() {
      await testGetRows(tableSize / 50);
    });

    it("154.2.3 fetchArraySize = tableSize/20", async function() {
      await testGetRows(tableSize / 20);
    });

    it("154.2.4 fetchArraySize = tableSize/10", async function() {
      await testGetRows(tableSize / 10);
    });

    it("154.2.5 fetchArraySize = tableSize/5", async function() {
      await testGetRows(tableSize / 5);
    });

    it("154.2.6 fetchArraySize = tableSize", async function() {
      await testGetRows(tableSize);
    });

    it("154.2.7 fetchArraySize = (table size - 1)", async function() {
      await testGetRows(tableSize - 1);
    });

  });

  describe("154.3 interleaved calls to getRow() and getRows()", function() {
    let numRowsVal_1, numRowsVal_2;

    before(async function() {
      await connection.execute(create_table);
    });

    after(async function() {
      await connection.execute(drop_table);
    });

    afterEach(function() {
      oracledb.maxRows = default_maxRows;
    });

    const testRS = async function(fetchArraySizeVal) {
      const result = await connection.execute(
        "select * from " + tableName + " order by id",
        [],
        {
          resultSet: true,
          fetchArraySize: fetchArraySizeVal
        }
      );
      const rowCount = 0;
      fetchRowFromRS(result.resultSet, rowCount);
    };

    async function fetchRowFromRS(rs, rowCount) {
      const row = await rs.getRow();
      if (row) {
        rowCount = rowCount + 1;
        assert.strictEqual(row[0], rowCount);
        assert.strictEqual(row[1], rowCount.toString());
        return await fetchRowsFromRS_1(rs, rowCount);
      } else {
        assert.strictEqual(rowCount, tableSize);
        await rs.close();
      }
    }

    async function fetchRowsFromRS_1(rs, rowCount, cb) {
      const rows = await rs.getRows(numRowsVal_1);
      assert(rows.length <= numRowsVal_1);
      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i++) {
          rowCount = rowCount + 1;
          assert.strictEqual(rows[i][0], rowCount);
          assert.strictEqual(rows[i][1], rowCount.toString());
        }
        return await fetchRowsFromRS_2(rs, rowCount, cb);
      } else {
        assert.strictEqual(rowCount, tableSize);
        await rs.close();
      }
    }

    async function fetchRowsFromRS_2(rs, rowCount, cb) {
      const rows = await rs.getRows(numRowsVal_2);
      assert(rows.length <= numRowsVal_2);
      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i++) {
          rowCount = rowCount + 1;
          assert.strictEqual(rows[i][0], rowCount);
          assert.strictEqual(rows[i][1], rowCount.toString());
        }
        return await fetchRowFromRS(rs, rowCount, cb);
      } else {
        assert.strictEqual(rowCount, tableSize);
        await rs.close();
      }
    }

    it("154.3.1 fetchArraySize = 1", async function() {
      const fetchArraySizeVal = 1;
      numRowsVal_1 = 2;
      numRowsVal_2 = 10;
      await testRS(fetchArraySizeVal);
    });

    it("154.3.2 fetchArraySize = tableSize/50", async function() {
      const fetchArraySizeVal = tableSize / 50;
      numRowsVal_1 = 5;
      numRowsVal_2 = 88;
      await testRS(fetchArraySizeVal);
    });

    it("154.3.3 fetchArraySize = tableSize/20", async function() {
      const fetchArraySizeVal = tableSize / 20;
      numRowsVal_1 = 50;
      numRowsVal_2 = 100;
      await testRS(fetchArraySizeVal);
    });

    it("154.3.4 fetchArraySize = tableSize/10", async function() {
      const fetchArraySizeVal = tableSize / 10;
      numRowsVal_1 = 30;
      numRowsVal_2 = 99;
      await testRS(fetchArraySizeVal);
    });

    it("154.3.5 fetchArraySize = tableSize/5", async function() {
      const fetchArraySizeVal = tableSize / 5;
      numRowsVal_1 = 5;
      numRowsVal_2 = 88;
      await testRS(fetchArraySizeVal);
    });

    it("154.3.6 fetchArraySize = tableSize", async function() {
      const fetchArraySizeVal = tableSize;
      numRowsVal_1 = 15;
      numRowsVal_2 = tableSize;
      await testRS(fetchArraySizeVal);
    });

    it("154.3.7 fetchArraySize = (tableSize - 1)", async function() {
      const fetchArraySizeVal = tableSize - 1;
      numRowsVal_1 = tableSize - 1;
      numRowsVal_2 = tableSize;
      await testRS(fetchArraySizeVal);
    });

  });

});

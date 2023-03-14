/* Copyright (c) 2021, 2023, Oracle and/or its affiliates. */

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
 *   151. fetchArraySize4.js
 *
 * DESCRIPTION
 *   Fetching data from database with different oracledb.fetchArraySize when resultSet=true
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

describe("151. fetchArraySize4.js", function() {

  let connection = null;
  let default_fetcArraySize = oracledb.fetchArraySize;
  let default_maxRows = oracledb.maxRows;
  const tableName = "nodb_fetchArraySize_151";
  let tableSize = 1000;

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

  let drop_table = "DROP TABLE " + tableName + " PURGE";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    assert.strictEqual(default_fetcArraySize, 100);
    assert.strictEqual(default_maxRows, 0);
  });

  after(async function() {
    await connection.close();
  });


  describe("151.1 getRows() of resultSet = true", function() {

    before(async function() {
      await connection.execute(create_table);
    });

    after(async function() {
      await connection.execute(drop_table);
    });

    afterEach(function() {
      oracledb.fetchArraySize = default_fetcArraySize;
      oracledb.maxRows = default_maxRows;
    });

    const testGetRow = async function(fetchArraySizeVal, numRowsVal) {
      oracledb.fetchArraySize = fetchArraySizeVal;
      let result = await connection.execute(
        "select * from " + tableName + " order by id",
        [],
        { resultSet: true }
      );
      let rowCount = 0;
      fetchRowsFromRS(result.resultSet, numRowsVal, rowCount);
    };

    async function fetchRowsFromRS(rs, numRowsVal, rowCount) {
      let rows = await rs.getRows(numRowsVal);
      assert(rows.length <= numRowsVal);
      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i++) {
          rowCount++;
          assert.strictEqual(rows[i][0], rowCount);
          assert.strictEqual(rows[i][1], rowCount.toString());
        }
        return fetchRowsFromRS(rs, numRowsVal, rowCount);
      } else {
        assert.strictEqual(rowCount, tableSize);
        await rs.close();
      }
    }

    it("151.1.1 numRows > table size > oracledb.fetchArraySize", async function() {
      let fetchArraySizeVal = tableSize - 1;
      let numRowsVal = tableSize + 1;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("151.1.2 numRows > oracledb.fetchArraySize > table size", async function() {
      let fetchArraySizeVal = tableSize + 1200;
      let numRowsVal = tableSize + 10000;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("151.1.3 table size > numRows > oracledb.fetchArraySize", async function() {
      let fetchArraySizeVal = tableSize - 11;
      let numRowsVal = tableSize - 2;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("151.1.4 table size > oracledb.fetchArraySize > maxRow", async function() {
      let fetchArraySizeVal = tableSize - 90;
      let numRowsVal = tableSize - 150;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("151.1.5 numRows = oracledb.fetchArraySize < table size", async function() {
      let fetchArraySizeVal = tableSize - 110;
      let numRowsVal = tableSize - 110;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("151.1.6 numRows = oracledb.fetchArraySize = table size", async function() {
      let fetchArraySizeVal = tableSize;
      let numRowsVal = tableSize;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("151.1.7 numRows = oracledb.fetchArraySize > table size", async function() {
      let fetchArraySizeVal = tableSize + 9999;
      let numRowsVal = tableSize + 9999;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("151.1.8 numRows = oracledb.fetchArraySize/10", async function() {
      let fetchArraySizeVal = tableSize / 10 + 1;
      let numRowsVal = tableSize / 10;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("151.1.9 numRows = 10 * oracledb.fetchArraySize", async function() {
      let fetchArraySizeVal = 90;
      let numRowsVal = 900;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("151.1.10 numRows > fetchArraySize, fetchArraySize = (table size)/10", async function() {
      let fetchArraySizeVal = tableSize / 10;
      let numRowsVal = tableSize / 10 + 1;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("151.1.11 numRows = (table size - 1), fetchArraySize = table size", async function() {
      let fetchArraySizeVal = tableSize;
      let numRowsVal = tableSize - 1;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

    it("151.1.12 fetchArraySize = (table size - 1), numRows = table size", async function() {
      let fetchArraySizeVal = tableSize - 1;
      let numRowsVal = tableSize;
      await testGetRow(fetchArraySizeVal, numRowsVal);
    });

  });

  describe("151.2 getRow() of resultSet = true", function() {

    before(async function() {
      await connection.execute(create_table);
    });

    after(async function() {
      await connection.execute(drop_table);
    });

    afterEach(function() {
      oracledb.fetchArraySize = default_fetcArraySize;
      oracledb.maxRows = default_maxRows;
    });

    const testGetRows = async function(fetchArraySize) {
      oracledb.fetchArraySize = fetchArraySize;
      let result = await connection.execute(
        "select * from " + tableName + " order by id",
        [],
        { resultSet: true }
      );
      let rowCount = 0;
      await fetchRowFromRS(result.resultSet, rowCount);
    };

    async function fetchRowFromRS(rs, rowCount) {
      let row = await rs.getRow();
      if (row) {
        rowCount++;
        assert.strictEqual(row[0], rowCount);
        assert.strictEqual(row[1], rowCount.toString());
        return await fetchRowFromRS(rs, rowCount);
      } else {
        assert.strictEqual(rowCount, tableSize);
        await rs.close();
      }
    }

    it("151.2.1 oracledb.fetchArraySize = 1", async function() {
      await testGetRows(1);
    });

    it("151.2.2 oracledb.fetchArraySize = tableSize/50", async function() {
      await testGetRows(tableSize / 50);
    });

    it("151.2.3 oracledb.fetchArraySize = tableSize/20", async function() {
      await testGetRows(tableSize / 20);
    });

    it("151.2.4 oracledb.fetchArraySize = tableSize/10", async function() {
      await testGetRows(tableSize / 10);
    });

    it("151.2.5 oracledb.fetchArraySize = tableSize/5", async function() {
      await testGetRows(tableSize / 5);
    });

    it("151.2.6 oracledb.fetchArraySize = tableSize", async function() {
      await testGetRows(tableSize);
    });

    it("151.2.7 oracledb.fetchArraySize = (tableSize - 1)", async function() {
      await testGetRows(tableSize - 1);
    });

  });

  describe("151.3 interleaved calls to getRow() and getRows()", function() {
    let numRowsVal_1, numRowsVal_2;

    before(async function() {
      await connection.execute(create_table);
    });

    after(async function() {
      await connection.execute(drop_table);
    });

    afterEach(function() {
      oracledb.fetchArraySize = default_fetcArraySize;
      oracledb.maxRows = default_maxRows;
    });

    const testRS = async function(fetchArraySizeVal) {
      oracledb.fetchArraySize = fetchArraySizeVal;
      let result = await connection.execute(
        "select * from " + tableName + " order by id",
        [],
        { resultSet: true }
      );
      let rowCount = 0;
      await fetchRowFromRS(result.resultSet, rowCount);
    };

    async function fetchRowFromRS(rs, rowCount) {
      let row = await rs.getRow();
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

    async function fetchRowsFromRS_1(rs, rowCount) {
      let rows = await rs.getRows(numRowsVal_1);
      assert(rows.length <= numRowsVal_1);
      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i++) {
          rowCount++;
          assert.strictEqual(rows[i][0], rowCount);
          assert.strictEqual(rows[i][1], rowCount.toString());
        }
        return await fetchRowsFromRS_2(rs, rowCount);
      } else {
        assert.strictEqual(rowCount, tableSize);
        await rs.close();
      }
    }

    async function fetchRowsFromRS_2(rs, rowCount) {
      let rows = await rs.getRows(numRowsVal_2);
      assert(rows.length <= numRowsVal_2);
      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i++) {
          rowCount++;
          assert.strictEqual(rows[i][0], rowCount);
          assert.strictEqual(rows[i][1], rowCount.toString());
        }
        return await fetchRowFromRS(rs, rowCount);
      } else {
        assert.strictEqual(rowCount, tableSize);
        await rs.close();
      }
    }

    it("151.3.1 oracledb.fetchArraySize = 1", async function() {
      let fetchArraySizeVal = 1;
      numRowsVal_1 = 2;
      numRowsVal_2 = 10;
      await testRS(fetchArraySizeVal);
    });

    it("151.3.2 oracledb.fetchArraySize = tableSize/50", async function() {
      let fetchArraySizeVal = tableSize / 50;
      numRowsVal_1 = 5;
      numRowsVal_2 = 88;
      await testRS(fetchArraySizeVal);
    });

    it("151.3.3 oracledb.fetchArraySize = tableSize/20", async function() {
      let fetchArraySizeVal = tableSize / 20;
      numRowsVal_1 = 50;
      numRowsVal_2 = 100;
      await testRS(fetchArraySizeVal);
    });

    it("151.3.4 oracledb.fetchArraySize = tableSize/10", async function() {
      let fetchArraySizeVal = tableSize / 10;
      numRowsVal_1 = 30;
      numRowsVal_2 = 99;
      await testRS(fetchArraySizeVal);
    });

    it("151.3.5 oracledb.fetchArraySize = tableSize/5", async function() {
      let fetchArraySizeVal = tableSize / 5;
      numRowsVal_1 = 5;
      numRowsVal_2 = 88;
      await testRS(fetchArraySizeVal);
    });

    it("151.3.6 oracledb.fetchArraySize = tableSize", async function() {
      let fetchArraySizeVal = tableSize;
      numRowsVal_1 = 15;
      numRowsVal_2 = tableSize;
      await testRS(fetchArraySizeVal);
    });

    it("151.3.6 oracledb.fetchArraySize = (tableSize - 1)", async function() {
      let fetchArraySizeVal = tableSize - 1;
      numRowsVal_1 = tableSize - 1;
      numRowsVal_2 = tableSize;
      await testRS(fetchArraySizeVal);
    });

  });

});

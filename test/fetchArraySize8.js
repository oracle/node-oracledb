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
 *   155. fetchArraySize8.js
 *
 * DESCRIPTION
 *   Direct fetch (non-RS) tests querying CLOBs (for streaming) using different
 *   fetchArraySizes values & tablesizes
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require ('assert');
const dbConfig = require('./dbconfig.js');

describe("155. fetchArraySize8.js", function() {

  let connection = null;
  let default_fetcArraySize = oracledb.fetchArraySize;
  let default_maxRows = oracledb.maxRows;
  const tableName = "nodb_fetchArraySize_155";

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
                     "            content    CLOB \n" +
                     "        ) \n" +
                     "    '); \n" +
                     "END; ";

  const drop_table = "DROP TABLE " + tableName + " PURGE";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    assert.strictEqual(default_fetcArraySize, 100);
    assert.strictEqual(default_maxRows, 0);
  });

  after(async function() {
    await connection.close();
  });

  describe("155.1 Streaming clobs with different oracledb.fetchArraySize", function() {

    afterEach(function() {
      oracledb.fetchArraySize = default_fetcArraySize;
      oracledb.maxRows = default_maxRows;
    });

    const basicFetchWithGlobalOption = async function(tableSize, fetchArraySizeVal, maxRowsVal, affectedID) {
      await connection.execute(create_table);
      await insertData(tableSize);
      oracledb.fetchArraySize = fetchArraySizeVal;
      oracledb.maxRows = maxRowsVal;
      let result = await connection.execute(
        "select * from " + tableName + " where id > " + affectedID + " order by id"
      );
      let resultLenExpected = maxRowsVal > (tableSize - affectedID) ? (tableSize - affectedID) : maxRowsVal;
      if (maxRowsVal === 0) resultLenExpected = tableSize - affectedID;
      assert.strictEqual(result.rows.length, resultLenExpected);
      await verifyResult(result.rows);

      await connection.execute(drop_table);
    };

    it("155.1.1 maxRows > table size > oracledb.fetchArraySize", async function() {
      let tableSize = 100;
      let fetchArraySizeVal = tableSize / 2;
      let maxRowsVal = tableSize * 2;
      let affectedID = 0;
      await basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.1.2 maxRows > oracledb.fetchArraySize > table size", async function() {
      let tableSize = 20;
      let fetchArraySizeVal = tableSize + 10;
      let maxRowsVal = tableSize * 3;
      let affectedID = 0;
      await basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.1.3 table size > maxRows > oracledb.fetchArraySize", async function() {
      let tableSize = 199;
      let fetchArraySizeVal = tableSize - 80;
      let maxRowsVal = tableSize - 50;
      let affectedID = 0;
      await basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.1.4 table size > oracledb.fetchArraySize > maxRow", async function() {
      let tableSize = 290;
      let fetchArraySizeVal = tableSize - 90;
      let maxRowsVal = tableSize - 150;
      let affectedID = 0;
      await basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.1.5 maxRows = oracledb.fetchArraySize < table size", async function() {
      let tableSize = 20;
      let fetchArraySizeVal = tableSize - 3;
      let maxRowsVal = fetchArraySizeVal;
      let affectedID = 0;
      await basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.1.6 maxRows = oracledb.fetchArraySize = table size", async function() {
      let tableSize = 20;
      let fetchArraySizeVal = tableSize;
      let maxRowsVal = tableSize;
      let affectedID = 0;
      await basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.1.7 maxRows = oracledb.fetchArraySize > table size", async function() {
      let tableSize = 10;
      let fetchArraySizeVal = tableSize + 30;
      let maxRowsVal = fetchArraySizeVal;
      let affectedID = 0;
      await basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.1.8 maxRows = oracledb.fetchArraySize/10", async function() {
      let tableSize = 100;
      let fetchArraySizeVal = 30;
      let maxRowsVal = fetchArraySizeVal / 10;
      let affectedID = 0;
      await basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.1.9 maxRows = 10 * oracledb.fetchArraySize", async function() {
      let tableSize = 2;
      let fetchArraySizeVal = 30;
      let maxRowsVal = fetchArraySizeVal * 10;
      let affectedID = 0;
      await basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.1.10 maxRows > fetchArraySize, fetchArraySize = (table size)/10", async function() {
      let tableSize = 200;
      let fetchArraySizeVal = tableSize / 10;
      let maxRowsVal = fetchArraySizeVal + 50;
      let affectedID = 0;
      await basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.1.11 maxRows = 0, fetchArraySize = table size ", async function() {
      let tableSize = 20;
      let fetchArraySizeVal = tableSize;
      let maxRowsVal = 0;
      let affectedID = 0;
      await basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.1.12 maxRows = (table size - 1), fetchArraySize = table size ", async function() {
      let tableSize = 100;
      let fetchArraySizeVal = tableSize;
      let maxRowsVal = tableSize - 1;
      let affectedID = 0;
      await basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.1.13 fetchArraySize = (table size - 1), maxRows = table size ", async function() {
      let tableSize = 20;
      let fetchArraySizeVal = tableSize - 1;
      let maxRowsVal = tableSize;
      let affectedID = 0;
      await basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });
  });

  describe("155.2 Streaming clobs with different execute() option fetchArraySize", function() {

    afterEach(function() {
      oracledb.maxRows = default_maxRows;
    });

    const basicFetchWithExecOption = async function(tableSize, fetchArraySizeVal, maxRowsVal, affectedID) {
      await connection.execute(create_table);
      await insertData(tableSize);

      oracledb.maxRows = maxRowsVal;
      let result = await connection.execute(
        "select * from " + tableName + " where id > " + affectedID + " order by id",
        [],
        {
          fetchArraySize: fetchArraySizeVal
        }
      );
      let resultLenExpected = maxRowsVal > (tableSize - affectedID) ? (tableSize - affectedID) : maxRowsVal;
      if (maxRowsVal === 0) resultLenExpected = tableSize - affectedID;
      assert.strictEqual(result.rows.length, resultLenExpected);
      await verifyResult(result.rows);
    };

    it("155.2.1 maxRows > table size > oracledb.fetchArraySize", async function() {
      let tableSize = 100;
      let fetchArraySizeVal = tableSize - 50;
      let maxRowsVal = tableSize + 200;
      let affectedID = 0;
      await basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.2.2 maxRows > oracledb.fetchArraySize > table size", async function() {
      let tableSize = 20;
      let fetchArraySizeVal = tableSize + 30;
      let maxRowsVal = tableSize + 50;
      let affectedID = 0;
      await basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.2.3 table size > maxRows > oracledb.fetchArraySize", async function() {
      let tableSize = 199;
      let fetchArraySizeVal = tableSize - 130;
      let maxRowsVal = tableSize - 50;
      let affectedID = 0;
      await basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.2.4 table size > oracledb.fetchArraySize > maxRow", async function() {
      let tableSize = 290;
      let fetchArraySizeVal = tableSize - 10;
      let maxRowsVal = tableSize - 50;
      let affectedID = 0;
      await basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.2.5 maxRows = oracledb.fetchArraySize < table size", async function() {
      let tableSize = 20;
      let fetchArraySizeVal = tableSize - 3;
      let maxRowsVal = fetchArraySizeVal;
      let affectedID = 0;
      await basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.2.6 maxRows = oracledb.fetchArraySize = table size", async function() {
      let tableSize = 20;
      let fetchArraySizeVal = tableSize;
      let maxRowsVal = tableSize;
      let affectedID = 0;
      await basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.2.7 maxRows = oracledb.fetchArraySize > table size", async function() {
      let tableSize = 10;
      let fetchArraySizeVal = tableSize + 30;
      let maxRowsVal = fetchArraySizeVal;
      let affectedID = 0;
      await basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.2.8 maxRows = oracledb.fetchArraySize/10", async function() {
      let tableSize = 100;
      let fetchArraySizeVal = 30;
      let maxRowsVal = fetchArraySizeVal / 10;
      let affectedID = 0;
      await basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.2.9 maxRows = 10 * oracledb.fetchArraySize", async function() {
      let tableSize = 2;
      let fetchArraySizeVal = 30;
      let maxRowsVal = fetchArraySizeVal * 10;
      let affectedID = 0;
      await basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.2.10 maxRows > fetchArraySize, fetchArraySize = (table size)/10", async function() {
      let tableSize = 200;
      let fetchArraySizeVal = tableSize / 10;
      let maxRowsVal = fetchArraySizeVal + 50;
      let affectedID = 0;
      await basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.2.11 maxRows = 0, fetchArraySize = table size ", async function() {
      let tableSize = 20;
      let fetchArraySizeVal = tableSize;
      let maxRowsVal = 0;
      let affectedID = 0;
      await basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.2.12 maxRows = (table size - 1), fetchArraySize = table size ", async function() {
      let tableSize = 20;
      let fetchArraySizeVal = tableSize;
      let maxRowsVal = tableSize - 1;
      let affectedID = 0;
      await basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("155.2.13 fetchArraySize = (table size - 1), maxRows = table size ", async function() {
      let tableSize = 20;
      let fetchArraySizeVal = tableSize - 1;
      let maxRowsVal = tableSize;
      let affectedID = 0;
      await basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID);
    });
  });

  let insertData = async function(tableSize) {
    const insert_data = "BEGIN \n" +
                      "    FOR i IN 1.." + tableSize + " LOOP \n" +
                      "         EXECUTE IMMEDIATE (' \n" +
                      "             insert into " + tableName + " values (' || i || ',''CLOB' || to_char(i) || ''') \n" +
                      "        '); \n" +
                      "    END LOOP; \n" +
                      "    commit; \n" +
                      "END; ";

    await connection.execute(insert_data);
    let result = await connection.execute(
      "select id from " + tableName
    );
    assert.strictEqual(result.rows.length, tableSize);
  };

  const verifyResult = async function(rows) {
    for (let row of rows) {
      await verifyEachRow(row);
    }
  };

  const verifyEachRow = async function(row) {
    const id = row[0];
    assert.strictEqual(row[0], id);
    const lob = row[1];
    const clobData = await lob.getData();
    assert.strictEqual(clobData, "CLOB" + String(id));
  };

});

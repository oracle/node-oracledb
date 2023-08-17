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
 *   152. fetchArraySize5.js
 *
 * DESCRIPTION
 *   Basic test of fetching data from database with different execute() option
 *   fetchArraySize, oracledb.maxRows, and numRows.
 *   maxRows specifies maximum number of rows that are fetched by the execute()
 *   call of the Connection object when not using a ResultSet.
 *   Tests including:
 *     basic fetch tests with different fetchArraySize and oracledb.maxRows.
 *     REF CURSORS tests with different fetchArraySize and numRows.
 *     QueryStream() tests with different fetchArraySize and oracledb.maxRows.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe("152. fetchArraySize5.js", function() {

  let connection = null;
  const default_maxRows = oracledb.maxRows;
  const tableName = "nodb_fetchArraySize_152";
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

  describe("152.1 basic fetch with different maxRows and fetchArraySize", function() {

    before(async function() {
      await connection.execute(create_table);
    });

    after(async function() {
      await connection.execute(drop_table);
    });

    afterEach(function() {
      oracledb.maxRows = default_maxRows;
    });

    const basicFetch = async function(fetchArraySizeVal, maxRowsVal, affectedID) {
      oracledb.maxRows = maxRowsVal;
      const result = await connection.execute(
        "select * from " + tableName + " where id > " + affectedID + " order by id",
        [],
        {
          fetchArraySize: fetchArraySizeVal
        }
      );
      let resultLenExpected = maxRowsVal > (tableSize - affectedID) ? (tableSize - affectedID) : maxRowsVal;
      if (maxRowsVal === 0) resultLenExpected = tableSize - affectedID;
      const rows = result.rows;
      assert.strictEqual(rows.length, resultLenExpected);
      for (const element of rows) {
        const index = rows.indexOf(element) + affectedID + 1;
        assert.strictEqual(element[1], String(index));
        assert.strictEqual(element[0], index);
      }
    };

    it("152.1.1 maxRows > table size > fetchArraySize", async function() {
      const fetchArraySizeVal = tableSize - 50;
      const maxRowsVal = tableSize + 10000;
      const affectedID = 20;
      await basicFetch(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.1.2 maxRows > fetchArraySize > table size", async function() {
      const fetchArraySizeVal = tableSize + 1001;
      const maxRowsVal = tableSize + 10000;
      const affectedID = 20;
      await basicFetch(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.1.3 table size > maxRows > fetchArraySize", async function() {
      const fetchArraySizeVal = tableSize - 11;
      const maxRowsVal = tableSize - 2;
      const affectedID = 0;
      await basicFetch(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.1.4 table size > fetchArraySize > maxRow", async function() {
      const fetchArraySizeVal = tableSize - 90;
      const maxRowsVal = tableSize - 150;
      const affectedID = 50;
      await basicFetch(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.1.5 maxRows = fetchArraySize < table size", async function() {
      const fetchArraySizeVal = tableSize - 110;
      const maxRowsVal = tableSize - 110;
      const affectedID = 20;
      await basicFetch(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.1.6 maxRows = fetchArraySize = table size", async function() {
      const fetchArraySizeVal = tableSize;
      const maxRowsVal = tableSize;
      const affectedID = 0;
      await basicFetch(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.1.7 maxRows = fetchArraySize > table size", async function() {
      const fetchArraySizeVal = tableSize + 9999;
      const maxRowsVal = tableSize + 9999;
      const affectedID = 10;
      await basicFetch(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.1.8 maxRows = fetchArraySize/10", async function() {
      const fetchArraySizeVal = tableSize / 10 + 1;
      const maxRowsVal = tableSize / 10;
      const affectedID = 7;
      await basicFetch(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.1.9 maxRows = 10 * fetchArraySize", async function() {
      const fetchArraySizeVal = 90;
      const maxRowsVal = 900;
      const affectedID = 50;
      await basicFetch(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.1.10 maxRows > fetchArraySize, fetchArraySize = (table size)/10", async function() {
      const fetchArraySizeVal = tableSize / 10;
      const maxRowsVal = tableSize / 10 + 1;
      const affectedID = 50;
      await basicFetch(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.1.11 maxRows = 0, fetchArraySize = table size ", async function() {
      const fetchArraySizeVal = tableSize;
      const maxRowsVal = 0;
      const affectedID = 0;
      await basicFetch(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.1.12 maxRows = (table size - 1), fetchArraySize = table size ", async function() {
      const fetchArraySizeVal = tableSize;
      const maxRowsVal = tableSize - 1;
      const affectedID = 0;
      await basicFetch(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.1.13 fetchArraySize = (table size - 1), maxRows = table size ", async function() {
      const fetchArraySizeVal = 999;
      const maxRowsVal = 1000;
      const affectedID = 0;
      await basicFetch(fetchArraySizeVal, maxRowsVal, affectedID);
    });
  });

  describe("152.2 REF CURSORS with different numRows and fetchArraySize", function() {

    before(async function() {
      await connection.execute(create_table);
    });

    after(async function() {
      await connection.execute(drop_table);
    });

    afterEach(function() {
      oracledb.maxRows = default_maxRows;
    });

    const testRefCursor = async function(fetchArraySizeVal, numRowsVal) {
      const create_ref =  "CREATE OR REPLACE PROCEDURE testrefproc (p_out OUT SYS_REFCURSOR) " +
                          "AS " +
                          "BEGIN " +
                          "  OPEN p_out FOR " +
                          "  SELECT * FROM " + tableName  + " order by id;" +
                          "END; ";
      const drop_ref = "drop procedure testrefproc";
      const exec_ref = "BEGIN testrefproc(:o); END;";

      await connection.execute(create_ref);

      const result = await connection.execute(
        exec_ref,
        [
          { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
        ],
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchArraySize: fetchArraySizeVal
        }
      );
      const rowCount = 0;
      await fetchRowsFromRS(result.outBinds[0], numRowsVal, rowCount);

      await connection.execute(drop_ref);
    };

    async function fetchRowsFromRS(rs, numRowsVal, rowCount) {
      const rows = await rs.getRows(numRowsVal);
      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i++) {
          assert(rows.length, numRowsVal);
          rowCount++;
          // console.log(rows[i][0]);
          assert.strictEqual(rows[i].ID, rowCount);
          assert.strictEqual(rows[i].CONTENT, rowCount.toString());
        }
        return await fetchRowsFromRS(rs, numRowsVal, rowCount);
      } else {
        assert.strictEqual(rowCount, tableSize);
        await rs.close();
      }
    }

    it("152.2.1 numRows > table size > fetchArraySize", async function() {
      const fetchArraySizeVal = tableSize - 50;
      const numRowsVal = tableSize + 10000;
      await testRefCursor(fetchArraySizeVal, numRowsVal);
    });

    it("152.2.2 numRows > fetchArraySize > table size", async function() {
      const fetchArraySizeVal = tableSize + 1200;
      const numRowsVal = tableSize + 10000;
      await testRefCursor(fetchArraySizeVal, numRowsVal);
    });

    it("152.2.3 table size > numRows > fetchArraySize", async function() {
      const fetchArraySizeVal = tableSize - 21;
      const numRowsVal = tableSize - 2;
      await testRefCursor(fetchArraySizeVal, numRowsVal);
    });

    it("152.2.4 table size > fetchArraySize > maxRow", async function() {
      const fetchArraySizeVal = tableSize - 90;
      const numRowsVal = tableSize - 150;
      await testRefCursor(fetchArraySizeVal, numRowsVal);
    });

    it("152.2.5 numRows = fetchArraySize < table size", async function() {
      const fetchArraySizeVal = tableSize - 110;
      const numRowsVal = tableSize - 110;
      await testRefCursor(fetchArraySizeVal, numRowsVal);
    });

    it("152.2.6 numRows = fetchArraySize = table size", async function() {
      const fetchArraySizeVal = tableSize;
      const numRowsVal = tableSize;
      await testRefCursor(fetchArraySizeVal, numRowsVal);
    });

    it("152.2.7 numRows = fetchArraySize > table size", async function() {
      const fetchArraySizeVal = tableSize + 9999;
      const numRowsVal = tableSize + 9999;
      await testRefCursor(fetchArraySizeVal, numRowsVal);
    });

    it("152.2.8 numRows = fetchArraySize/10", async function() {
      const fetchArraySizeVal = tableSize / 10 + 1;
      const numRowsVal = tableSize / 10;
      await testRefCursor(fetchArraySizeVal, numRowsVal);
    });

    it("152.2.9 numRows = 10 * fetchArraySize", async function() {
      const fetchArraySizeVal = 90;
      const numRowsVal = 900;
      await testRefCursor(fetchArraySizeVal, numRowsVal);
    });

    it("152.2.10 numRows > fetchArraySize, fetchArraySize = (table size)/10", async function() {
      const fetchArraySizeVal = tableSize / 10;
      const numRowsVal = tableSize / 10 + 1;
      await testRefCursor(fetchArraySizeVal, numRowsVal);
    });

    it("152.2.11 numRows = (table size - 1), fetchArraySize = table size", async function() {
      const fetchArraySizeVal = tableSize;
      const numRowsVal = tableSize - 1;
      await testRefCursor(fetchArraySizeVal, numRowsVal);
    });

    it("152.2.12 fetchArraySize = (table size - 1), numRows = table size", async function() {
      const fetchArraySizeVal = tableSize - 1;
      const numRowsVal = tableSize;
      await testRefCursor(fetchArraySizeVal, numRowsVal);
    });
  });

  describe("152.3 queryStream() with different maxRows and fetchArraySize", function() {

    before(async function() {
      await connection.execute(create_table);
    });

    after(async function() {
      await connection.execute(drop_table);
    });

    afterEach(function() {
      oracledb.maxRows = default_maxRows;
    });

    const testQueryStream = async function(fetchArraySizeVal, maxRowsVal, affectedID) {
      oracledb.maxRows = maxRowsVal;
      const resultLenExpected = tableSize - affectedID;
      const querySql = "select * from " + tableName + " where id > " + affectedID + " order by id";
      const stream = connection.queryStream(querySql, [], {fetchArraySize: fetchArraySizeVal});
      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', function(data) {
          counter++;
          assert.strictEqual(data[0], counter + affectedID);
          assert.strictEqual(data[1], String(counter + affectedID));
        });
        stream.on('end', function() {
          assert.strictEqual(counter, resultLenExpected);
          stream.destroy();
        });
        stream.on('close', resolve);
      });
    };

    it("152.3.1 maxRows > table size > fetchArraySize", async function() {
      const fetchArraySizeVal = tableSize - 50;
      const maxRowsVal = tableSize + 10000;
      const affectedID = 20;
      await testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.3.2 maxRows > fetchArraySize > table size", async function() {
      const fetchArraySizeVal = tableSize + 1001;
      const maxRowsVal = tableSize + 10000;
      const affectedID = 20;
      await testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.3.3 table size > maxRows > fetchArraySize", async function() {
      const fetchArraySizeVal = tableSize - 31;
      const maxRowsVal = tableSize - 2;
      const affectedID = 10;
      await testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.3.4 table size > fetchArraySize > maxRow", async function() {
      const fetchArraySizeVal = tableSize - 90;
      const maxRowsVal = tableSize - 150;
      const affectedID = 50;
      await testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.3.5 maxRows = fetchArraySize < table size", async function() {
      const fetchArraySizeVal = tableSize - 110;
      const maxRowsVal = tableSize - 110;
      const affectedID = 20;
      await testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.3.6 maxRows = fetchArraySize = table size", async function() {
      const fetchArraySizeVal = tableSize;
      const maxRowsVal = tableSize;
      const affectedID = 0;
      await testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.3.7 maxRows = fetchArraySize > table size", async function() {
      const fetchArraySizeVal = tableSize + 9999;
      const maxRowsVal = tableSize + 9999;
      const affectedID = 10;
      await testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.3.8 maxRows = fetchArraySize/10", async function() {
      const fetchArraySizeVal = tableSize / 10 + 1;
      const maxRowsVal = tableSize / 10;
      const affectedID = 0;
      await testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.3.9 maxRows = 10 * fetchArraySize", async function() {
      const fetchArraySizeVal = 90;
      const maxRowsVal = 900;
      const affectedID = 50;
      await testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.3.10 maxRows > fetchArraySize, fetchArraySize = (table size)/10", async function() {
      const fetchArraySizeVal = tableSize / 10;
      const maxRowsVal = tableSize / 10 + 1;
      const affectedID = 0;
      await testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.3.11 maxRows = 0, fetchArraySize = table size", async function() {
      const fetchArraySizeVal = tableSize;
      const maxRowsVal = 0;
      const affectedID = 0;
      await testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.3.12 maxRows = (table size - 1), fetchArraySize = table size", async function() {
      const fetchArraySizeVal = tableSize;
      const maxRowsVal = tableSize - 1;
      const affectedID = 0;
      await testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID);
    });

    it("152.3.13 fetchArraySize = (table size - 1), maxRows = table size", async function() {
      const fetchArraySizeVal = tableSize - 1;
      const maxRowsVal = tableSize;
      const affectedID = 0;
      await testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID);
    });
  });

});

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
 *   157. maxRows.js
 *
 * DESCRIPTION
 *   Test the "maxRows" property.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('157. maxRows.js', function() {

  let connection = null;
  let totalAmount = 107;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    let proc = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_conn_emp2 PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_conn_emp2 ( \n" +
                 "            id       NUMBER NOT NULL, \n" +
                 "            name     VARCHAR2(20) \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";
    await connection.execute(proc);

    proc = "DECLARE \n" +
           "    x NUMBER := 0; \n" +
           "    n VARCHAR2(20); \n" +
           "BEGIN \n" +
           "    FOR i IN 1..107 LOOP \n" +
           "        x := x + 1; \n" +
           "        n := 'staff ' || x; \n" +
           "        INSERT INTO nodb_tab_conn_emp2 VALUES (x, n); \n" +
           "    END LOOP; \n" +
           "END; ";
    await connection.execute(proc);
  }); // before()

  after(async function() {
    await connection.execute("DROP TABLE nodb_tab_conn_emp2 PURGE");
    await connection.close();
  }); // after()

  // restore oracledb.maxRows to its default value
  afterEach(function() {
    let defaultValue = 0;
    oracledb.maxRows = defaultValue;
  });

  let verifyRows = function(rows, amount) {
    for (let i = 0; i < amount; i++) {
      assert.strictEqual(rows[i][0], (i + 1));
      assert.strictEqual(rows[i][1], ("staff " + String(i + 1)));
    }
  };

  let sqlQuery = "SELECT * FROM nodb_tab_conn_emp2 ORDER BY id";

  it('157.1 Default maxRows == 0, which means unlimited', async function() {
    assert.strictEqual(oracledb.maxRows, 0);

    const result = await connection.execute(sqlQuery);
    assert(result);
    assert.strictEqual(result.rows.length, totalAmount);
    verifyRows(result.rows, totalAmount);
  });

  it("157.2 specify the value at execution", async function() {
    let fetchAmount = 25;
    const result = await connection.execute(
      sqlQuery,
      {},
      { maxRows: fetchAmount }
    );
    assert(result);
    assert.strictEqual(result.rows.length, fetchAmount);
    verifyRows(result.rows, fetchAmount);
  });

  it('157.3 equals to the total amount of rows', async function() {
    const result = await connection.execute(
      sqlQuery,
      {},
      { maxRows: totalAmount }
    );
    assert(result);
    assert.strictEqual(result.rows.length, totalAmount);
    verifyRows(result.rows, totalAmount);
  });

  it('157.4 cannot set it to be a negative number', async function() {
    await assert.rejects(
      async () => {
        await connection.execute(sqlQuery, {}, { maxRows: -5 });
      },
      // NJS-007: invalid value for "maxRows" in parameter 3
      /NJS-007:/
    );
  });

  it('157.5 sets it to be large value', async function() {
    const result = await connection.execute(sqlQuery, {}, { maxRows: 500000 });
    assert(result);
    verifyRows(result.rows, totalAmount);
  });

  it('157.6 shows 12c new way to limit the number of records fetched by queries', async function() {

    let myoffset     = 2;  // number of rows to skip
    let mymaxnumrows = 6;  // number of rows to fetch
    let sql = "SELECT * FROM nodb_tab_conn_emp2 ORDER BY id";

    if (connection.oracleServerVersion >= 1201000000) {
      // 12c row-limiting syntax
      sql += " OFFSET :offset ROWS FETCH NEXT :maxnumrows ROWS ONLY";
    } else {
      // Pre-12c syntax [could also customize the original query and use row_number()]
      sql = "SELECT * FROM (SELECT A.*, ROWNUM AS MY_RNUM FROM"
          + "(" + sql + ") A "
          + "WHERE ROWNUM <= :maxnumrows + :offset) WHERE MY_RNUM > :offset";
    }

    const result = await connection.execute(
      sql,
      { offset: myoffset, maxnumrows: mymaxnumrows },
      { maxRows: 150 }
    );
    assert.strictEqual(result.rows.length, mymaxnumrows);
  }); // 157.6

  it('157.7 oracledb.maxRows > 0 && oracledb.maxRows < totalAmount', async function() {

    let testValue = 100;
    oracledb.maxRows = testValue;
    let result = await connection.execute(sqlQuery);
    let expectedAmount = testValue;
    verifyRows(result.rows, expectedAmount);
  }); // 157.7

  it('157.8 oracledb.maxRows > 0, execute() with maxRows=0', async function() {

    oracledb.maxRows = 100;
    let result = await connection.execute(sqlQuery, {}, { maxRows: 0 });
    let expectedAmount = totalAmount;
    verifyRows(result.rows, expectedAmount);
  }); // 157.8

});

/* Copyright (c) 2018, 2023, Oracle and/or its affiliates. */

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
 *   158. insertAll.js
 *
 * DESCRIPTION
 *   Test INSERT ALL statements. It originates from issue 780.
 *   https://github.com/oracle/node-oracledb/issues/780
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('158. insertAll.js', function() {

  let conn;

  before(async function() {
    conn = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await conn.close();
  });

  it('158.1 original case from the issue', async function() {

    const dataLength = 35000;
    //Create the table
    const proc = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_insertall PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_insertall ( \n" +
                 "            code       NUMBER, \n" +
                 "            val        CLOB \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";
    await conn.execute(proc);

    // insert data (including LOB) into the table
    const myval = 'a'.repeat(dataLength);
    let sql = "INSERT ALL INTO nodb_tab_insertall \n" +
              "    WITH nt AS (SELECT 1, :C FROM DUAL) \n" +
              "        SELECT * FROM nt";
    let result = await conn.execute(
      sql,
      { c: { val: myval, type: oracledb.CLOB } }
    );
    assert.strictEqual(result.rowsAffected, 1);

    // Run a select query to get the inserted LOB's length
    sql = "select dbms_lob.getlength(val) from nodb_tab_insertall";
    result = await conn.execute(sql);
    const buf = result.rows[0][0];
    assert.strictEqual(buf, dataLength);

    // Drop the table
    sql = "DROP TABLE nodb_tab_insertall PURGE";
    await conn.execute(sql);

  }); // 158.1

  it('158.2 inserts into one table', async function() {
    await makeTab1();
    let sql = "INSERT ALL \n" +
              "  INTO nodb_tab_ia1 (id, content) VALUES (100, :a) \n" +
              "  INTO nodb_tab_ia1 (id, content) VALUES (200, :b) \n" +
              "  INTO nodb_tab_ia1 (id, content) VALUES (300, :c) \n" +
              "SELECT * FROM DUAL";
    let result = await conn.execute(
      sql,
      ['Changjie', 'Shelly', 'Chris']
    );
    assert.strictEqual(result.rowsAffected, 3);

    sql = "select content from nodb_tab_ia1 order by id";
    result = await conn.execute(sql);
    assert.deepStrictEqual(
      result.rows,
      [ [ 'Changjie' ], [ 'Shelly' ], [ 'Chris' ] ]
    );

    //Drop the table
    sql = "DROP TABLE nodb_tab_ia1 PURGE";
    await conn.execute(sql);
  }); // 158.2

  it('158.3 inserts into multiple tables', async function() {
    await makeTab1();
    await makeTab2();

    let sql = "INSERT ALL \n" +
              "  INTO nodb_tab_ia1 (id, content) VALUES (100, :a) \n" +
              "  INTO nodb_tab_ia1 (id, content) VALUES (200, :b) \n" +
              "  INTO nodb_tab_ia2 (id, content) VALUES (300, :c) \n" +
              "SELECT * FROM DUAL";
    let result = await conn.execute(
      sql,
      ['Redwood city', 'Sydney', 'Shenzhen']
    );
    assert.strictEqual(result.rowsAffected, 3);

    sql = "select content from nodb_tab_ia1 order by id";
    result = await conn.execute(sql);
    assert.deepStrictEqual(
      result.rows,
      [ [ 'Redwood city' ], [ 'Sydney' ]]
    );

    sql = "select content from nodb_tab_ia2 order by id";
    result = await conn.execute(sql);
    assert.deepStrictEqual(
      result.rows,
      [ [ 'Shenzhen' ]]
    );

    //Drop the tables
    sql = "DROP TABLE nodb_tab_ia1 PURGE";
    await conn.execute(sql);
    sql = "DROP TABLE nodb_tab_ia2 PURGE";
    await conn.execute(sql);
  }); // 158.3

  const makeTab1 = async function() {
    const proc = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_ia1 PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_ia1 ( \n" +
                 "            id       NUMBER, \n" +
                 "            content  VARCHAR2(100) \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";
    await conn.execute(proc);
  }; // makeTab1

  const makeTab2 = async function() {
    const proc = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_ia2 PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_ia2 ( \n" +
                 "            id       NUMBER, \n" +
                 "            content  VARCHAR2(50) " +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";
    await conn.execute(proc);
  };

});

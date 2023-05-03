/* Copyright (c) 2019, 2023, Oracle and/or its affiliates. */

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
 *   228. lastRowid.js
 *
 * DESCRIPTION
 *   Test getting rowid of last updated row for DML statements.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('228. lastRowid.js', function() {

  let conn;
  const TABLE = 'nodb_lastrowid';

  before('get connection and create table', async () => {
    conn = await oracledb.getConnection(dbConfig);
    const sql =
      `create table ${TABLE} (
         id number(9) not null,
         value varchar2(100) not null
      )`;
    const plsql = testsUtil.sqlCreateTable(TABLE, sql);
    await conn.execute(plsql);
  });

  after(async () => {
    await conn.close();
    await testsUtil.dropTable(TABLE);
  });

  it('228.1 examples', async () => {
    const row1 = [1, "First"];
    const row2 = [2, "Second"];

    // insert some rows and retain the rowid of each
    let sql = `insert into ${TABLE} values (:1, :2)`;
    const result1 = await conn.execute(sql, row1);
    assert(result1.lastRowid);
    assert.strictEqual(result1.rowsAffected, 1);
    const result2 = await conn.execute(sql, row2);
    assert(result2.lastRowid);
    assert.strictEqual(result2.rowsAffected, 1);
    const rowid2 = result2.lastRowid;

    // the row can be fetched with the rowid that was retained
    sql = `select * from ${TABLE} where rowid = :1`;
    let result = await conn.execute(sql, [result1.lastRowid]);
    assert.deepStrictEqual(result.rows[0], row1);
    result = await conn.execute(sql, [result2.lastRowid]);
    assert.deepStrictEqual(result.rows[0], row2);

    // updating multiple rows only returns the rowid of the last updated row
    sql = `update ${TABLE} set value = value || ' (Modified)'`;
    result = await conn.execute(sql);
    assert.strictEqual(result.lastRowid, rowid2);

    // deleting multiple rows only returns the rowid of the last deleted row
    sql = `delete from ${TABLE}`;
    result = await conn.execute(sql);
    assert.strictEqual(result.lastRowid, rowid2);

    // deleting no rows results in an undefined value
    result = await conn.execute(sql);
    assert(result.lastRowid === undefined);
  }); // 228.1

  it('228.2 MERGE statement', async () => {
    const row1 = [11, "Eleventh"];
    const sqlMerge = `
      merge into ${TABLE} x
      using (select :id as tempId, :value as tempValue from dual) y
      on (x.id = y.tempId)
      when matched then
          update set x.value = y.tempValue
      when not matched then
          insert (x.id, x.value)
          values (y.tempId, y.tempValue)
    `;
    const result1 = await conn.execute(sqlMerge, row1, { autoCommit: true });
    assert.ok(result1.lastRowid);
    assert.strictEqual(result1.rowsAffected, 1);
    const rowID = result1.lastRowid;

    // check it out
    let sql = `select * from ${TABLE} where rowid = :1`;
    let result2 = await conn.execute(sql, [ rowID ]);
    assert.deepStrictEqual(result2.rows[0], row1);
  }); // 228.2

  it('228.3 Negative - not applicable to executeMany()', async () => {
    const rows = [
      { id: 21, value: "Twenty-first" },
      { id: 22, value: "Twenty-second" }
    ];
    const sqlMerge = `
      merge into ${TABLE} x
      using (select :id as tempId, :value as tempValue from dual) y
      on (x.id = y.tempId)
      when matched then
          update set x.value = y.tempValue
      when not matched then
          insert (x.id, x.value)
          values (y.tempId, y.tempValue)
    `;
    const options = {
      autoCommit: true,
      bindDefs: {
        id: { type: oracledb.NUMBER },
        value: { type: oracledb.STRING, maxSize: 2000 }
      }
    };

    const result1 = await conn.executeMany(sqlMerge, rows, options);
    assert(result1.lastRowid === undefined);
    assert.strictEqual(result1.rowsAffected, 2);

    let sql = `select * from ${TABLE} where id >= :1`;
    let result2 = await conn.execute(
      sql,
      [ rows[0].id ],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    assert.strictEqual(result2.rows[0].ID, rows[0].id);
    assert.strictEqual(result2.rows[0].VALUE, rows[0].value);
    assert.strictEqual(result2.rows[1].ID, rows[1].id);
    assert.strictEqual(result2.rows[1].VALUE, rows[1].value);
  }); // 228.3

  it('228.4 INSERT ALL statement', async () => {
    const rows = ['Redwood city', 'Sydney', 'Shenzhen'];
    const sqlInsertAll = `
      insert all
        into ${TABLE} (id, value) values (100, :v1)
        into ${TABLE} (id, value) values (200, :v2)
        into ${TABLE} (id, value) values (300, :v3)
      select * from dual
    `;

    let result = await conn.execute(sqlInsertAll, rows);
    assert(result.lastRowid === undefined);
    assert.strictEqual(result.rowsAffected, 3);

    let sql = `select * from ${TABLE} where id >= 100 order by id asc`;
    result = await conn.execute(sql);

    assert.strictEqual(result.rows[0][1], rows[0]);
    assert.strictEqual(result.rows[1][1], rows[1]);
    assert.strictEqual(result.rows[2][1], rows[2]);
  }); // 228.4
});

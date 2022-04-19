/* Copyright (c) 2019, 2022, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
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
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('228. lastRowid.js', function() {

  let conn;
  const TABLE = 'nodb_lastrowid';

  before('get connection and create table', async () => {
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sql =
        `create table ${TABLE} (
           id number(9) not null,
           value varchar2(100) not null
        )`;
      let plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);
    } catch (err) {
      should.not.exist(err);
    }
  });

  after(async () => {
    try {
      let sql = `drop table ${TABLE} purge`;
      await conn.execute(sql);
      await conn.close();
    } catch (err) {
      should.not.exist(err);
    }
  });

  it('228.1 examples', async () => {
    const row1 = [1, "First"];
    const row2 = [2, "Second"];

    try {
      // insert some rows and retain the rowid of each
      let sql = `insert into ${TABLE} values (:1, :2)`;
      const result1 = await conn.execute(sql, row1);
      should.exist(result1.lastRowid);
      should.strictEqual(result1.rowsAffected, 1);
      const result2 = await conn.execute(sql, row2);
      should.exist(result2.lastRowid);
      should.strictEqual(result2.rowsAffected, 1);
      const rowid2 = result2.lastRowid;

      // the row can be fetched with the rowid that was retained
      sql = `select * from ${TABLE} where rowid = :1`;
      let result = await conn.execute(sql, [result1.lastRowid]);
      should.deepEqual(result.rows[0], row1);
      result = await conn.execute(sql, [result2.lastRowid]);
      should.deepEqual(result.rows[0], row2);

      // updating multiple rows only returns the rowid of the last updated row
      sql = `update ${TABLE} set value = value || ' (Modified)'`;
      result = await conn.execute(sql);
      should.strictEqual(result.lastRowid, rowid2);

      // deleting multiple rows only returns the rowid of the last deleted row
      sql = `delete from ${TABLE}`;
      result = await conn.execute(sql);
      should.strictEqual(result.lastRowid, rowid2);

      // deleting no rows results in an undefined value
      result = await conn.execute(sql);
      should.not.exist(result.lastRowid);
    } catch (err) {
      should.not.exist(err);
    }
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
    try {
      const result1 = await conn.execute(sqlMerge, row1, { autoCommit: true });
      should.exist(result1.lastRowid);
      should.strictEqual(result1.rowsAffected, 1);
      const rowID = result1.lastRowid;

      // check it out
      let sql = `select * from ${TABLE} where rowid = :1`;
      let result2 = await conn.execute(sql, [ rowID ]);
      should.deepEqual(result2.rows[0], row1);

    } catch (err) {
      should.not.exist(err);
    }
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

    try {
      const result1 = await conn.executeMany(sqlMerge, rows, options);
      should.not.exist(result1.lastRowid);
      should.strictEqual(result1.rowsAffected, 2);

      let sql = `select * from ${TABLE} where id >= :1`;
      let result2 = await conn.execute(
        sql,
        [ rows[0].id ],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      should.strictEqual(result2.rows[0].ID, rows[0].id);
      should.strictEqual(result2.rows[0].VALUE, rows[0].value);
      should.strictEqual(result2.rows[1].ID, rows[1].id);
      should.strictEqual(result2.rows[1].VALUE, rows[1].value);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 228.3

  it('228.4 INSERT ALL statement', async () => {
    const rows = ['Redwood city', 'Sydney', 'Shenzhen'];
    const sqlInsertAll = `
      insert all
        into ${TABLE} (id, value) values (100, :v)
        into ${TABLE} (id, value) values (200, :v)
        into ${TABLE} (id, value) values (300, :v)
      select * from dual
    `;

    try {
      let result = await conn.execute(sqlInsertAll, rows);
      should.not.exist(result.lastRowid);
      should.strictEqual(result.rowsAffected, 3);

      let sql = `select * from ${TABLE} where id >= 100 order by id asc`;
      result = await conn.execute(sql);

      should.strictEqual(result.rows[0][1], rows[0]);
      should.strictEqual(result.rows[1][1], rows[1]);
      should.strictEqual(result.rows[2][1], rows[2]);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 228.4
});

/* Copyright (c) 2020, 2023, Oracle and/or its affiliates. */

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
 *   239. plsqlBindCursorsIN.js
 *
 * DESCRIPTION
 *  Test the support for binding Cursors IN to PL/SQL procedures
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('239. plsqlBindCursorsIN.js', () => {

  let conn;
  const DefaultPrefetchRows = oracledb.prefetchRows;
  const tableName = "nodb_tab_bind_cursors_in";
  const procName1 = "nodb_proc_bind_cursors_in";
  const procName2 = "nodb_proc_bind_cursors_out";

  const sqlRefCursor = `
    select 1, 'String 1' from dual
    union all
    select 2, 'String 2' from dual
    union all
    select 3, 'String 3' from dual
    union all
    select 4, 'String 4' from dual
    union all
    select 5, 'String 5' from dual
    order by 1
  `;

  before(async () => {
    conn = await oracledb.getConnection(dbConfig);

    let sql = `
      create table ${tableName} (
          id number(9) not null,
          strval varchar2(100)
      )
    `;
    let plsql = testsUtil.sqlCreateTable(tableName, sql);
    await conn.execute(plsql);

    plsql = `
      create or replace procedure ${procName1} (
        a_Cursor            sys_refcursor
      ) is
          t_Id                number;
          t_StrVal            varchar2(100);
      begin
          delete from ${tableName};
          loop
              fetch a_Cursor
              into t_Id, t_StrVal;
              exit when a_cursor%notfound;
              insert into ${tableName}
              values (t_id, t_StrVal);
          end loop;
          close a_Cursor;
          commit;
      end;
    `;
    await conn.execute(plsql);

    plsql = `
      create or replace procedure ${procName2} (
        a_Cursor OUT        sys_refcursor
      ) is
      begin
          open a_Cursor for select 1, 'String 1' from dual
              union all
              select 2, 'String 2' from dual
              union all
              select 3, 'String 3' from dual
              union all
              select 4, 'String 4' from dual
              union all
              select 5, 'String 5' from dual
              order by 1;
      end;
    `;
    await conn.execute(plsql);

    await conn.commit();
  }); // before()

  after(async () => {
    let sql = `drop table ${tableName} purge`;
    await conn.execute(sql);

    sql = `drop procedure ${procName1}`;
    await conn.execute(sql);

    sql = `drop procedure ${procName2}`;
    await conn.execute(sql);

    await conn.close();

    oracledb.prefetchRows = DefaultPrefetchRows;
  }); // after()

  it('239.1 disable prefetchRows by setting it to be 0', async () => {
    const refCursorOptions = {
      resultSet: true,
      prefetchRows: 0
    };
    let result = await conn.execute(sqlRefCursor, [], refCursorOptions);

    let plsql = `begin ${procName1}(:bv); end;`;
    await conn.execute(
      plsql,
      {
        bv: {val: result.resultSet, type: oracledb.CURSOR, dir: oracledb.BIND_IN }
      }
    );

    const sqlQuery = `select * from ${tableName}`;
    const queryResult = await conn.execute(sqlQuery);

    assert.strictEqual(queryResult.rows.length, 5);
  }); // 239.1

  it('239.2 prefetchRows is enabled with default value', async () => {
    const refCursorOptions = {
      resultSet: true
    };
    let result = await conn.execute(sqlRefCursor, [], refCursorOptions);

    let plsql = `begin ${procName1}(:bv); end;`;
    await conn.execute(
      plsql,
      {
        bv: {val: result.resultSet, type: oracledb.CURSOR, dir: oracledb.BIND_IN }
      }
    );

    const sqlQuery = `select * from ${tableName}`;
    const queryResult = await conn.execute(sqlQuery);

    assert.strictEqual(queryResult.rows.length, 3);
  }); // 239.2

  it('239.3 cursor bind OUT then bind IN', async () => {
    let result = await conn.execute(
      `begin ${procName2}(:bv); end;`,
      {
        bv: {dir: oracledb.BIND_OUT, type: oracledb.CURSOR }
      },
      {
        prefetchRows: 2  // prefetch doesn't impact result
      }
    );

    await conn.execute(
      `begin ${procName1}(:bv); end;`,
      {
        bv: {val:result.outBinds.bv, type: oracledb.CURSOR}
      }
    );

    const sqlQuery = `select * from ${tableName}`;
    const queryResult = await conn.execute(sqlQuery);

    assert.strictEqual(queryResult.rows.length, 5);
  }); // 239.3

  it('239.4 implicit binding type', async () => {
    let result = await conn.execute(
      `begin ${procName2}(:bv); end;`,
      {
        bv: {dir: oracledb.BIND_OUT, type: oracledb.CURSOR }
      },
      {
        prefetchRows: 2  // prefetch doesn't impact result
      }
    );

    await conn.execute(
      `begin ${procName1}(:bv); end;`,
      [result.outBinds.bv]
    );

    const sqlQuery = `select * from ${tableName}`;
    const queryResult = await conn.execute(sqlQuery);

    assert.strictEqual(queryResult.rows.length, 5);
  }); // 239.4

  it('239.5 check REF CURSOR round-trips with no prefetching', async () => {
    if (!dbConfig.test.DBA_PRIVILEGE) {
      it.skip('');
      return;
    }
    const sid = await testsUtil.getSid(conn);
    let rt = await testsUtil.getRoundTripCount(sid);
    let result = await conn.execute(
      `begin ${procName2}(:bv); end;`,
      {
        bv: {dir: oracledb.BIND_OUT, type: oracledb.CURSOR }
      },
      {
        prefetchRows: 0
      }
    );
    const rc = result.outBinds.bv;
    await rc.getRows(2);
    await rc.getRows(2);
    rt = await testsUtil.getRoundTripCount(sid) - rt;

    assert.strictEqual(rt, 3);
  }); // 239.5

  it('239.6 check REF CURSOR round-trips with prefetching', async () => {
    if (!dbConfig.test.DBA_PRIVILEGE) {
      it.skip('');
      return;
    }
    const sid = await testsUtil.getSid(conn);
    let rt = await testsUtil.getRoundTripCount(sid);

    let result = await conn.execute(
      `begin ${procName2}(:bv); end;`,
      {
        bv: {dir: oracledb.BIND_OUT, type: oracledb.CURSOR }
      },
      {
        prefetchRows: 100
      }
    );
    const rc = result.outBinds.bv;
    await rc.getRows(2);
    await rc.getRows(2);
    rt = await testsUtil.getRoundTripCount(sid) - rt;

    ((oracledb.thin) ? assert.strictEqual(rt, 3) : assert.strictEqual(rt, 2));
  }); // 239.6

});

/* Copyright (c) 2022, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, withOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License
 * The node-oracledb test suite uses 'mocha', 'assert' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   262. dbObjectOutBind.js
 *
 * DESCRIPTION
 *   Test cases to check the OUT Binds with DBObject Type not crashing
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');

describe('262. dbObjectOutBind.js', function() {
  let conn = null;
  let proc1 =
    `create or replace procedure nodb_getDataCursor1(p_cur out sys_refcursor) is
      begin
        open p_cur for
          select
            level
          from
            dual
        connect by level < 10;
      end; `;
  let proc2 =
    `create or replace procedure nodb_getDataCursor2(p_cur out sys_refcursor) is
      begin
        open p_cur for
          select
            group_by,
            cast(collect(lvl) as sys.odcinumberlist) group_values
        from (
          select
            mod(level, 3) group_by,
            level lvl
          from
            dual
          connect by level < 10
        )
        group by  group_by;
      end;`;
  let proc3 =
    `create or replace procedure nodb_getDataCursor3(p_cur out sys_refcursor) is
      begin
        open p_cur for
          select
            rownum, substr('randomtext',1,rownum),
            substr('randomtext',rownum)
        from
          dual
        connect by level <= 10;
      end;`;
  let proc4 =
    `create or replace procedure nodb_getDataCursor4(p_cur out sys_refcursor) is
      begin
        open p_cur for
          select
            substr('sometext',level,1)
        from
          dual
        connect by level <= 8;
      end;`;
  let proc5 =
      `create or replace procedure nodb_getDataCursor5(
          p_cur1 out sys_refcursor,
          p_cur2 out sys_refcursor
       ) is
       begin
         nodb_getDataCursor1(p_cur1);
         nodb_getDataCursor2(p_cur2);
       end;`;
  let proc6 =
      `create or replace procedure nodb_getDataCursor6(
          p_cur1 out sys_refcursor,
          p_cur2 out sys_refcursor,
          p_cur3 out sys_refcursor,
          p_cur4 out sys_refcursor
       ) is
       begin
         nodb_getDataCursor1(p_cur1);
         nodb_getDataCursor2(p_cur2);
         nodb_getDataCursor1(p_cur3);
         nodb_getDataCursor2(p_cur4);
       end;`;

  before(async function() {
    try {
      conn = await oracledb.getConnection(dbConfig);
      await conn.execute(proc1);
      await conn.execute(proc2);
      await conn.execute(proc3);
      await conn.execute(proc4);
      await conn.execute(proc5);
      await conn.execute(proc6);
    } catch (e) {
      assert.fail(e);
    }
  });

  after(async function() {
    try {
      await conn.execute(`DROP PROCEDURE nodb_getDataCursor6`);
      await conn.execute(`DROP PROCEDURE nodb_getDataCursor5`);
      await conn.execute(`DROP PROCEDURE nodb_getDataCursor4`);
      await conn.execute(`DROP PROCEDURE nodb_getDataCursor3`);
      await conn.execute(`DROP PROCEDURE nodb_getDataCursor2`);
      await conn.execute(`DROP PROCEDURE nodb_getDataCursor1`);
      await conn.close();
    } catch (e) {
      assert.fail(e);
    }
  });

  it('262.1 call procedure with 2 OUT binds of DbObject', async function() {
    try {
      let result = await conn.execute(
        `BEGIN nodb_getDataCursor5(p_cur1 => :p_cur1,
            p_cur2 => :p_cur2); end;`,
        {
          p_cur1: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT},
          p_cur2: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT}
        }
      );
      result.outBinds.p_cur1.close();
      result.outBinds.p_cur2.close();
    } catch (e) {
      assert.fail(e);
    }
  });

  it('262.2 call procedure with multiple OUT binds of DbObject', async function() {
    try {
      let result = await conn.execute(
        `BEGIN nodb_getDataCursor6(p_cur1 => :p_cur1,
            p_cur2 => :p_cur2, p_cur3 => :p_cur3, p_cur4 => :p_cur4); end;`,
        {
          p_cur1: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT},
          p_cur2: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT},
          p_cur3: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT},
          p_cur4: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT}
        }
      );
      let resultSet = await result.outBinds.p_cur1.getRows();
      assert.equal(resultSet.length, 9);
      result.outBinds.p_cur1.close();

      resultSet = await result.outBinds.p_cur2.getRows();
      assert.equal(resultSet.length, 3);
      result.outBinds.p_cur2.close();

      resultSet = await result.outBinds.p_cur3.getRows();
      assert.equal(resultSet.length, 9);
      result.outBinds.p_cur3.close();

      resultSet = await result.outBinds.p_cur4.getRows();
      assert.equal(resultSet.length, 3);
      result.outBinds.p_cur4.close();
    } catch (e) {
      assert.fail(e);
    }
  });
});


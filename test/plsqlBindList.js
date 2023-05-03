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
 *   187. plsqlBindList.js
 *
 * DESCRIPTION
 *   Test of the behavior when user pass list or object of list to the bind
 *   parameter of conn.execute.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('187. plsqlBindList.js', function() {

  async function bindNumberListByPosition(conn, binds) {
    const callSql = "begin pkg_bind_number_list_test.TestArrays(:1, :2); end;";
    return await conn.execute(callSql, binds);
  }

  async function bindStringListByPosition(conn, binds) {
    const callSql = "begin pkg_bind_string_list_test.TestArrays(:1, :2); end;";
    return await conn.execute(callSql, binds);
  }

  async function bindNumberListByName(conn, binds) {
    const callSql = "begin pkg_bind_number_list_test.TestArrays( :bind_arg1 , :bind_arg2 ); end;";
    return await conn.execute(callSql, binds);
  }

  async function bindStringListByName(conn, binds) {
    const callSql = "begin pkg_bind_string_list_test.TestArrays( :bind_arg1 , :bind_arg2 ); end;";
    return await conn.execute(callSql, binds);
  }

  before(async function() {
    const conn = await oracledb.getConnection(dbConfig);
    let packageSql =
      "create or replace package pkg_bind_number_list_test as \n" +
      "  type udt_NumberList is table of number index by binary_integer; \n" +
      "  procedure TestArrays ( \n" +
      "    a_InArray           udt_NumberList, \n" +
      "    a_Sum               out number \n" +
      "  ); \n" +
      "end;";
    await conn.execute(packageSql);
    packageSql =
      "create or replace package body pkg_bind_number_list_test as \n" +
      "  procedure TestArrays ( \n" +
      "    a_InArray           udt_NumberList,\n" +
      "    a_Sum               out number \n" +
      "  ) is \n" +
      "  begin \n" +
      "    a_Sum := 0; \n" +
      "    for i in 1..a_InArray.count loop \n" +
      "      a_Sum := a_Sum + a_InArray(i); \n" +
      "    end loop; \n" +
      "  end; \n" +
      "end; \n";
    await conn.execute(packageSql);
    packageSql =
      "create or replace package pkg_bind_string_list_test as \n" +
      "  type udt_StringList is table of VARCHAR2(64) index by binary_integer; \n" +
      "  procedure TestArrays ( \n" +
      "    a_InArray           udt_StringList, \n" +
      "    a_Sum               out VARCHAR2 \n" +
      "  ); \n" +
      "end;";
    await conn.execute(packageSql);
    packageSql =
      "create or replace package body pkg_bind_string_list_test as \n" +
      "  procedure TestArrays ( \n" +
      "    a_InArray           udt_StringList,\n" +
      "    a_Sum               out VARCHAR2 \n" +
      "  ) is \n" +
      "  begin \n" +
      "    a_Sum := ''; \n" +
      "    for i in 1..a_InArray.count loop \n" +
      "      a_Sum := a_Sum || a_InArray(i); \n" +
      "    end loop; \n" +
      "  end; \n" +
      "end; \n";
    await conn.execute(packageSql);
    await conn.close();
  });

  after(async function() {
    const conn = await oracledb.getConnection(dbConfig);
    await conn.execute("drop package pkg_bind_number_list_test");
    await conn.execute("drop package pkg_bind_string_list_test");
    await conn.close();
  });

  describe('187.1 Positive Cases', function() {

    it('187.1.1 Bind Object of List by position with type specified', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const res = await bindNumberListByPosition(conn, [
        { type: oracledb.NUMBER, val: [ 1, 2, 3, 4, 5 ] },
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      ]);
      assert.strictEqual(res.outBinds[0], 15);
      await conn.close();
    });

    it('187.1.2 Bind Object of List by name with type specified', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const res = await bindNumberListByName(conn, {
        bind_arg1: { type: oracledb.NUMBER, val: [ 1, 2, 3, 4, 5 ] },
        bind_arg2: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      });
      assert.strictEqual(res.outBinds.bind_arg2, 15);
      await conn.close();
    });

    it('187.1.3 Bind List by position without type specified', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const res = await bindNumberListByPosition(conn, [
        [ 1, 2, 3, 4, 5 ],
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      ]);
      assert.strictEqual(res.outBinds[0], 15);
      await conn.close();
    });

    it('187.1.4 Bind List by name without type specified', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const res = await bindNumberListByName(conn, {
        bind_arg1: [ 1, 2, 3, 4, 5 ],
        bind_arg2: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      });
      assert.strictEqual(res.outBinds.bind_arg2, 15);
      await conn.close();
    });

    it('187.1.5 Bind STRING List by name without type specified', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const res = await bindStringListByName(conn, {
        bind_arg1: [ "1", "2", "3", "4", "5" ],
        bind_arg2: { type: oracledb.STRING, dir: oracledb.BIND_OUT },
      });
      assert.strictEqual(res.outBinds.bind_arg2, "12345");
      await conn.close();
    });

    it('187.1.6 Bind STRING List by position without type specified', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const res = await bindStringListByPosition(conn, [
        [ "1", "2", "3", "4", "5" ],
        { type: oracledb.STRING, dir: oracledb.BIND_OUT },
      ]);
      assert.strictEqual(res.outBinds[0], "12345");
      await conn.close();
    });

  });

  describe('187.2 Negative Cases', function() {

    it('187.2.1 Bind Empty List by position with type specified', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const res = await bindNumberListByPosition(conn, [
        { type: oracledb.NUMBER, val: [] },
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      ]);
      assert.strictEqual(res.outBinds[0], 0);
      await conn.close();
    });

    it('187.2.2 Bind Empty List by position without type specified', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const binds = [
        [],
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      ];
      await assert.rejects(
        async () => await bindNumberListByPosition(conn, binds),
        /PLS-00418:/
      );
      // PLS-00418: array bind type must match PL/SQL table row type
      await conn.close();
    });

    it('187.2.3 Bind Empty List by name with type specified', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const res = await bindNumberListByName(conn, {
        bind_arg1: { type: oracledb.NUMBER, val: [] },
        bind_arg2: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      });
      assert.strictEqual(res.outBinds.bind_arg2, 0);
      await conn.close();
    });

    it('187.2.4 Bind Empty List by name without type specified', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const binds = {
        bind_arg1: [],
        bind_arg2: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      };
      await assert.rejects(
        async () => await bindNumberListByName(conn, binds),
        /PLS-00418:/
      );
      // PLS-00418: array bind type must match PL/SQL table row type
      await conn.close();
    });

    it('187.2.5 Bind NUMBER List by name with STRING as first element', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const binds = {
        bind_arg1: [ "1", 2, 3, 4, 5 ],
        bind_arg2: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      };
      await assert.rejects(
        async () => await bindNumberListByName(conn, binds),
        /NJS-037:/
      );
      // NJS-037: invalid data type at array index 0 for bind ":bind_arg1"
      await conn.close();
    });

    it('187.2.6 Bind NUMBER List by position with STRING as second element', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const binds = [
        [ 1, "2", 3, 4, 5 ],
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      ];
      await assert.rejects(
        async () => await bindNumberListByPosition(conn, binds),
        /NJS-052:/
      );
      // NJS-052: invalid data type at array index 1 for bind position 1
      await conn.close();
    });

    it('187.2.7 Bind STRING List by name while required type is NUMBER', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const binds = {
        bind_arg1: [ "1", "2", "3", "4", "5" ],
        bind_arg2: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      };
      await assert.rejects(
        async () => await bindNumberListByName(conn, binds),
        /PLS-00418:/
      );
      // PLS-00418: array bind type must match PL/SQL table row type"
      await conn.close();
    });

    it('187.2.8 Bind STRING List by position while required type is NUMBER', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const binds = [
        [ "1", "2", "3", "4", "5" ],
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      ];
      await assert.rejects(
        async () => await bindNumberListByPosition(conn, binds),
        /PLS-00418:/
      );
      // PLS-00418: array bind type must match PL/SQL table row type"
      await conn.close();
    });

    it('187.2.9 Bind NUMBER List by name while required type is STRING', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const binds = {
        bind_arg1: [ 1, 2, 3, 4, 5 ],
        bind_arg2: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      };
      await assert.rejects(
        async () => await bindStringListByName(conn, binds),
        /PLS-00418:/
      );
      // PLS-00418: array bind type must match PL/SQL table row type"
      await conn.close();
    });

    it('187.2.10 Bind NUMBER List by position while required type is STRING', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const binds = [
        [ 1, 2, 3, 4, 5 ],
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      ];
      await assert.rejects(
        async () => await bindStringListByPosition(conn, binds),
        /PLS-00418:/
      );
      // PLS-00418: array bind type must match PL/SQL table row type"
      await conn.close();
    });

  });

});

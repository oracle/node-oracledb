/* Copyright (c) 2020, 2022, Oracle and/or its affiliates. */

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
 *   237. indexedTables01.js
 *
 * DESCRIPTION
 *   Multi-level nested cursors.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');

describe('237. indexedTables01.js', () => {

  let conn;
  let pkgName = 'nodb_pkg_indexed_tables';

  before(async () => {
    conn = await oracledb.getConnection(dbconfig);

    let plsql = `
      create or replace package ${pkgName} as

          type udt_ArrVarchar is table of varchar2(100) index by binary_integer;
          type udt_ArrNvarchar is table of nvarchar2(100) index by binary_integer;
          type udt_ArrChar is table of char(100) index by binary_integer;
          type udt_ArrNchar is table of nchar(100) index by binary_integer;
          type udt_ArrNumber is table of number index by binary_integer;
          type udt_ArrBinaryFloat is table of binary_float index by binary_integer;
          type udt_ArrBinaryDouble is table of binary_double index by binary_integer;
          type udt_ArrDate is table of date index by binary_integer;
          type udt_ArrTimestamp is table of timestamp index by binary_integer;
          type udt_ArrTimestampLTZ is table of timestamp with local time zone
                  index by binary_integer;
          type udt_ArrTimestampTZ is table of timestamp with time zone
                  index by binary_integer;
          type udt_ArrRaw is table of raw(100) index by binary_integer;

          function test_varchar (
              a_Array                         udt_ArrVarchar
          ) return number;

          function test_nvarchar (
              a_Array                         udt_ArrNvarchar
          ) return number;

          function test_char (
              a_Array                         udt_ArrChar
          ) return number;

          function test_nchar (
              a_Array                         udt_ArrNchar
          ) return number;

          function test_number (
              a_Array                         udt_ArrNumber
          ) return number;

          function test_binary_float (
              a_Array                         udt_ArrBinaryFloat
          ) return number;

          function test_binary_double (
              a_Array                         udt_ArrBinaryDouble
          ) return number;

          function test_date (
              a_Array                         udt_ArrDate
          ) return number;

          function test_timestamp (
              a_Array                         udt_ArrTimestamp
          ) return number;

          function test_timestamp_ltz (
              a_Array                         udt_ArrTimestampLTZ
          ) return number;

          function test_timestamp_tz (
              a_Array                         udt_ArrTimestampTZ
          ) return number;

          function test_raw (
              a_Array                         udt_ArrRaw
          ) return number;

      end;
    `;
    await conn.execute(plsql);

    plsql = `
      create or replace package body ${pkgName} as

          function test_varchar (
            a_Array                         udt_ArrVarchar
          ) return number is
          begin
              return a_Array.count;
          end;

          function test_nvarchar (
              a_Array                         udt_ArrNvarchar
          ) return number is
          begin
              return a_Array.count;
          end;

          function test_char (
              a_Array                         udt_ArrChar
          ) return number is
          begin
              return a_Array.count;
          end;

          function test_nchar (
              a_Array                         udt_ArrNchar
          ) return number is
          begin
              return a_Array.count;
          end;

          function test_number (
              a_Array                         udt_ArrNumber
          ) return number is
          begin
              return a_Array.count;
          end;

          function test_binary_float (
              a_Array                         udt_ArrBinaryFloat
          ) return number is
          begin
              return a_Array.count;
          end;

          function test_binary_double (
              a_Array                         udt_ArrBinaryDouble
          ) return number is
          begin
              return a_Array.count;
          end;

          function test_date (
              a_Array                         udt_ArrDate
          ) return number is
          begin
              return a_Array.count;
          end;

          function test_timestamp (
              a_Array                         udt_ArrTimestamp
          ) return number is
          begin
              return a_Array.count;
          end;

          function test_timestamp_ltz (
              a_Array                         udt_ArrTimestampLTZ
          ) return number is
          begin
              return a_Array.count;
          end;

          function test_timestamp_tz (
              a_Array                         udt_ArrTimestampTZ
          ) return number is
          begin
              return a_Array.count;
          end;

          function test_raw (
              a_Array                         udt_ArrRaw
          ) return number is
          begin
              return a_Array.count;
          end;

      end;
    `;
    await conn.execute(plsql);
  }); // before()

  after(async () => {
    const sql = `drop package ${pkgName}`;
    await conn.execute(sql);
    await conn.close();
  }); // after

  it('237.1 check VARCHAR2 type support in PL/SQL index-by tables', async () => {
    const arr = [ "Fred", "George", "Sally" ];
    const func = 'test_varchar';
    const binds = {
      retval: { type: oracledb.DB_TYPE_NUMBER, dir: oracledb.BIND_OUT },
      inval: { type: oracledb.DB_TYPE_VARCHAR, val: arr}
    };

    const sql = `begin :retval := ${pkgName}.${func}(:inval); end;`;
    const result = await conn.execute(sql, binds);
    assert.strictEqual(result.outBinds.retval, arr.length);
  }); // 237.1

  it('237.2 DB_TYPE_NVARCHAR', async () => {
    const arr = [ "Fred", "George", "Sally", "Billy" ];
    const func = 'test_nvarchar';
    const binds = {
      retval: { type: oracledb.DB_TYPE_NUMBER, dir: oracledb.BIND_OUT },
      inval: { type: oracledb.DB_TYPE_NVARCHAR, val: arr}
    };

    const sql = `begin :retval := ${pkgName}.${func}(:inval); end;`;
    const result = await conn.execute(sql, binds);
    assert.strictEqual(result.outBinds.retval, arr.length);
  }); // 237.2

  it('237.3 DB_TYPE_CHAR', async () => {
    const arr = [ "Fred", "George", "Sally", "Billy", "Susan" ];
    const func = 'test_char';
    const binds = {
      retval: { type: oracledb.DB_TYPE_NUMBER, dir: oracledb.BIND_OUT },
      inval: { type: oracledb.DB_TYPE_CHAR, val: arr}
    };

    const sql = `begin :retval := ${pkgName}.${func}(:inval); end;`;
    const result = await conn.execute(sql, binds);
    assert.strictEqual(result.outBinds.retval, arr.length);
  }); // 237.3

  it('237.4 DB_TYPE_NCHAR', async () => {
    const arr = [ "Fred", "George", "Sally", "Billy", "Susan", "Jennifer"];
    const func = 'test_nchar';
    const binds = {
      retval: { type: oracledb.DB_TYPE_NUMBER, dir: oracledb.BIND_OUT },
      inval: { type: oracledb.DB_TYPE_NCHAR, val: arr}
    };

    const sql = `begin :retval := ${pkgName}.${func}(:inval); end;`;
    const result = await conn.execute(sql, binds);
    assert.strictEqual(result.outBinds.retval, arr.length);
  }); // 237.4

  it('237.5 DB_TYPE_NUMBER', async () => {
    const arr = [ 1, 2 ];
    const func = 'test_number';
    const binds = {
      retval: { type: oracledb.DB_TYPE_NUMBER, dir: oracledb.BIND_OUT },
      inval: { type: oracledb.DB_TYPE_NUMBER, val: arr}
    };

    const sql = `begin :retval := ${pkgName}.${func}(:inval); end;`;
    const result = await conn.execute(sql, binds);
    assert.strictEqual(result.outBinds.retval, arr.length);
  }); // 237.5

  it('237.6 DB_TYPE_BINARY_FLOAT', async () => {
    const arr = [ 1.5, 3.25, 7.75, 14 ];
    const func = 'test_binary_float';
    const binds = {
      retval: { type: oracledb.DB_TYPE_NUMBER, dir: oracledb.BIND_OUT },
      inval: { type: oracledb.DB_TYPE_BINARY_FLOAT, val: arr}
    };

    const sql = `begin :retval := ${pkgName}.${func}(:inval); end;`;
    const result = await conn.execute(sql, binds);
    assert.strictEqual(result.outBinds.retval, arr.length);
  }); // 237.6

  it('237.7 DB_TYPE_BINARY_DOUBLE', async () => {
    const arr = [ 1.5, 3.25, 7.75, 14, 28.125 ];
    const func = 'test_binary_double';
    const binds = {
      retval: { type: oracledb.DB_TYPE_NUMBER, dir: oracledb.BIND_OUT },
      inval: { type: oracledb.DB_TYPE_BINARY_DOUBLE, val: arr}
    };

    const sql = `begin :retval := ${pkgName}.${func}(:inval); end;`;
    const result = await conn.execute(sql, binds);
    assert.strictEqual(result.outBinds.retval, arr.length);
  }); // 237.7

  it('237.8 DB_TYPE_TIMESTAMP', async function() {
    if (conn.oracleServerVersion < 1200000000) this.skip();
    const arr = [ new Date(), new Date(), new Date() ];
    const func = 'test_timestamp';
    const binds = {
      retval: { type: oracledb.DB_TYPE_NUMBER, dir: oracledb.BIND_OUT },
      inval: { type: oracledb.DB_TYPE_TIMESTAMP, val: arr}
    };

    const sql = `begin :retval := ${pkgName}.${func}(:inval); end;`;
    const result = await conn.execute(sql, binds);
    assert.strictEqual(result.outBinds.retval, arr.length);
  }); // 237.8

  it('237.9 DB_TYPE_TIMESTAMP_LTZ', async function() {
    if (conn.oracleServerVersion < 1200000000) this.skip();
    const arr = [ new Date(), new Date(), new Date(), new Date() ];
    const func = 'test_timestamp_ltz';
    const binds = {
      retval: { type: oracledb.DB_TYPE_NUMBER, dir: oracledb.BIND_OUT },
      inval: { type: oracledb.DB_TYPE_TIMESTAMP_LTZ, val: arr}
    };

    const sql = `begin :retval := ${pkgName}.${func}(:inval); end;`;
    const result = await conn.execute(sql, binds);
    assert.strictEqual(result.outBinds.retval, arr.length);
  }); // 237.9

  it('237.10 DB_TYPE_TIMESTAMP_TZ', async function() {
    if (conn.oracleServerVersion < 1200000000) this.skip();
    const arr = [ new Date(), new Date(), new Date(), new Date(), new Date() ];
    const func = 'test_timestamp_tz';
    const binds = {
      retval: { type: oracledb.DB_TYPE_NUMBER, dir: oracledb.BIND_OUT },
      inval: { type: oracledb.DB_TYPE_TIMESTAMP_TZ, val: arr}
    };

    const sql = `begin :retval := ${pkgName}.${func}(:inval); end;`;
    const result = await conn.execute(sql, binds);
    assert.strictEqual(result.outBinds.retval, arr.length);
  }); // 237.10

  it('237.10 DB_TYPE_RAW', async () => {
    const arr = [ Buffer.from("Raw 1"), Buffer.from("Raw 2") ];
    const func = 'test_raw';
    const binds = {
      retval: { type: oracledb.DB_TYPE_NUMBER, dir: oracledb.BIND_OUT },
      inval: { type: oracledb.DB_TYPE_RAW, val: arr}
    };

    const sql = `begin :retval := ${pkgName}.${func}(:inval); end;`;
    const result = await conn.execute(sql, binds);
    assert.strictEqual(result.outBinds.retval, arr.length);
  }); // 237.10
});

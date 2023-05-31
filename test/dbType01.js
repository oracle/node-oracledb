/* Copyright (c) 2019, 2022, Oracle and/or its affiliates. */

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
 *   226. dbType01.js
 *
 * DESCRIPTION
 *   Test binding data of types DB_TYPE_*.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('226. dbType01.js', function() {

  let conn;
  const default_stmtCacheSize = oracledb.stmtCacheSize;

  before(async () => {
    oracledb.stmtCacheSize = 0;
    conn = await oracledb.getConnection(dbConfig);
  });

  after(async () => {
    await conn.close();
    oracledb.stmtCacheSize = default_stmtCacheSize;
  });

  afterEach(async () => {
    await testsUtil.sleep(100);
  });

  const strInVal = "Node-oracledb";
  const dateInVal = new Date();
  const numInVal = 12;
  const SQL = `SELECT :BIND1, DUMP(:BIND1) FROM dual`;

  it('226.1 DB_TYPE_VARCHAR', async () => {
    const bindVal = { BIND1: {val: strInVal, type: oracledb.DB_TYPE_VARCHAR }};
    const result = await conn.execute(SQL,
      bindVal);
    assert.strictEqual(strInVal, result.rows[0][0]);
    assert.match(result.rows[0][1], /Typ=1 Len=13/);
  }); // 226.1

  it('226.2 DB_TYPE_CHAR', async () => {
    const bindVal = { BIND1: {val: strInVal, type: oracledb.DB_TYPE_CHAR }};
    const result = await conn.execute(SQL,
      bindVal);
    assert.strictEqual(strInVal, result.rows[0][0]);
    assert.match(result.rows[0][1], /Typ=96 Len=13/);
  }); // 226.2

  it('226.3 DB_TYPE_NVARCHAR', async () => {
    const bindVal = { BIND1: {val: strInVal, type: oracledb.DB_TYPE_NVARCHAR }};
    const result = await conn.execute(SQL, bindVal);
    assert.strictEqual(strInVal, result.rows[0][0]);
    assert.match(result.rows[0][1], /Typ=1 Len=26/);
  }); // 226.3

  it('226.4 DB_TYPE_NCHAR', async () => {
    const bindVal = { BIND1: {val: strInVal, type: oracledb.DB_TYPE_NCHAR }};
    const result = await conn.execute(SQL, bindVal);
    assert.strictEqual(strInVal, result.rows[0][0]);
    assert.match(result.rows[0][1], /Typ=96 Len=26/);
  }); // 226.4

  it('226.5 DB_TYPE_DATE', async () => {
    const bindVal = { BIND1: {val: dateInVal, type: oracledb.DB_TYPE_DATE }};
    const result = await conn.execute(SQL, bindVal);
    assert.match(result.rows[0][1], /Typ=12 Len=7/);
  }); // 226.5

  it('226.6 DB_TYPE_TIMESTAMP_LTZ', async () => {
    const bindVal = { BIND1: {val: dateInVal, type: oracledb.DB_TYPE_TIMESTAMP_LTZ}};
    const result = await conn.execute(SQL, bindVal);
    assert.match(result.rows[0][1], /Typ=231 Len=11/);
  }); // 226.6

  it('226.7 DB_TYPE_TIMESTAMP', async () => {
    const bindVal = { BIND1: {val: dateInVal, type: oracledb.DB_TYPE_TIMESTAMP}};
    const result = await conn.execute(SQL, bindVal);
    assert.match(result.rows[0][1], /Typ=180 Len=11/);
  });

  it('226.8 DB_TYPE_TIMESTAMP_TZ', async () => {
    const bindVal = { BIND1: {val: dateInVal, type: oracledb.DB_TYPE_TIMESTAMP_TZ}};
    const result = await conn.execute(SQL, bindVal);
    assert.match(result.rows[0][1], /Typ=181 Len=13/);
  });

  it('226.9 DB_TYPE_NUMBER', async () => {
    const sql = `SELECT DUMP(:1) FROM dual`;
    const result = await conn.execute(sql,
      [{ val: numInVal, type: oracledb.DB_TYPE_NUMBER }]);
    assert.match(result.rows[0][0], /Typ=2 Len=2/);
  });

  (dbConfig.test.isCmanTdm ? it : it.skip)('226.10 DB_TYPE_BINARY_FLOAT', async () => {
    const bindVal = { BIND1: {val: numInVal, type: oracledb.DB_TYPE_BINARY_FLOAT}};
    const result = await conn.execute(SQL, bindVal);
    assert.match(result.rows[0][1], /Typ=100 Len=4/);
  });

  (dbConfig.test.isCmanTdm ? it : it.skip)('226.11 DB_TYPE_BINARY_DOUBLE', async () => {
    const bindVal = { BIND1: {val: numInVal, type: oracledb.DB_TYPE_BINARY_DOUBLE}};
    const result = await conn.execute(SQL, bindVal);
    assert.match(result.rows[0][1], /Typ=101 Len=8/);
  });

  (dbConfig.test.isCmanTdm ? it : it.skip)('226.12 Infinity, DB_TYPE_BINARY_FLOAT', async () => {
    const num = 1 / 0;
    const bindVal = { BIND1: {val: num, type: oracledb.DB_TYPE_BINARY_FLOAT}};
    const result = await conn.execute(SQL, bindVal);
    assert.match(result.rows[0][1], /Typ=100 Len=4/);
  });

  (dbConfig.test.isCmanTdm ? it : it.skip)('226.13 Infinity, DB_TYPE_BINARY_DOUBLE', async () => {
    const num = 1 / 0;
    const bindVal = { BIND1: {val: num, type: oracledb.DB_TYPE_BINARY_DOUBLE}};
    const result = await conn.execute(SQL, bindVal);
    assert.match(result.rows[0][1], /Typ=101 Len=8/);
  });

  it('226.14 DB_TYPE_VARCHAR Repeating using bindByPos', async () => {
    const SQL = `SELECT :1, DUMP(:1) FROM dual`;
    const bindVal = {val: strInVal, type: oracledb.DB_TYPE_VARCHAR};
    const result = await conn.execute(SQL,
      [bindVal, bindVal]);
    assert.strictEqual(strInVal, result.rows[0][0]);
    assert.match(result.rows[0][1], /Typ=1 Len=13/);
  }); // 226.14

});

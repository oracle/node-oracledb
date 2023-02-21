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
 *   229. dbType03.js
 *
 * DESCRIPTION
 *   Test binding data of types DB_TYPE_BINARY_FLOAT and DB_TYPE_BINARY_DOUBLE.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('229. dbType03.js', () => {
  let conn;
  const TABLE = `NODB_TAB_BFBD`;

  before(async () => {
    try {
      conn = await oracledb.getConnection(dbconfig);

      let sql = `create table ${TABLE} (id number,
        bf binary_float, bd binary_double)`;
      let plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);
    } catch (error) {
      assert.fail(error);
    }
  });

  after(async () => {
    try {
      let sql = `drop table ${TABLE} purge`;
      await conn.execute(sql);
      await conn.close();
    } catch (error) {
      assert.fail(error);
    }
  });

  function ApproxEql(v1, v2) {
    const precision = 0.001;
    return Math.abs(v1 - v2) < precision;
  }

  it('229.1 IN binds binary_float and binary_double', async () => {
    const NUM = 1;
    try {
      let sql = `insert into ${TABLE} values (:1, :2, :3)`;
      let binds = [
        NUM,
        { val: 1.23, type: oracledb.DB_TYPE_BINARY_FLOAT },
        { val: 3.45678, type: oracledb.DB_TYPE_BINARY_DOUBLE }
      ];
      let result = await conn.execute(sql, binds);
      assert.strictEqual(1, result.rowsAffected);

      sql = `select * from ${TABLE} where id = ${NUM}`;
      result = await conn.execute(sql);
      assert.strictEqual(binds[0], result.rows[0][0]);

      let nearlyEqual = false;
      nearlyEqual = ApproxEql(binds[1].val, result.rows[0][1]);
      assert.strictEqual(nearlyEqual, true);

      nearlyEqual = ApproxEql(binds[2].val, result.rows[0][2]);
      assert.strictEqual(nearlyEqual, true);

    } catch (error) {
      assert.fail(error);
    }
  }); // 229.1

  it('229.2 OUT binds', async () => {
    const NUM = 2;
    const num1 = 2.345;
    const num2 = 9876.54321;
    try {
      let sql = `insert into ${TABLE} values (:1, :2, :3)
      returning bf, bd into :4, :5`;
      let binds = [
        NUM,
        { val: num1, type: oracledb.DB_TYPE_BINARY_FLOAT },
        { val: num2, type: oracledb.DB_TYPE_BINARY_DOUBLE },
        { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BINARY_FLOAT },
        { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BINARY_DOUBLE }
      ];
      let result = await conn.execute(sql, binds);
      assert.strictEqual(1, result.rowsAffected);

      let nearlyEqual = false;
      nearlyEqual = ApproxEql(num1, result.outBinds[0][0]);
      assert.strictEqual(nearlyEqual, true);

      nearlyEqual = ApproxEql(num2, result.outBinds[1][0]);
      assert.strictEqual(nearlyEqual, true);
    } catch (error) {
      assert.fail(error);
    }
  }); // 229.2

  it('229.3 IN bind Infinity number', async () => {
    const NUM = 3;
    try {
      let sql = `insert into ${TABLE} values (:1, :2, :3)`;
      let binds = [
        NUM,
        { val: Infinity, type: oracledb.DB_TYPE_BINARY_FLOAT },
        { val: -Infinity, type: oracledb.DB_TYPE_BINARY_DOUBLE }
      ];
      let result = await conn.execute(sql, binds);
      assert.strictEqual(1, result.rowsAffected);

      sql = `select * from ${TABLE} where id = ${NUM}`;
      result = await conn.execute(sql);

      assert.strictEqual(Infinity, result.rows[0][1]);
      assert.strictEqual(-Infinity, result.rows[0][2]);

    } catch (error) {
      assert.fail(error);
    }
  }); // 229.3

  it('229.4 OUT bind Infinity number', async () => {
    const NUM = 4;

    try {
      let sql = `insert into ${TABLE} values (:1, :2, :3)
      returning bf, bd into :4, :5`;
      let binds = [
        NUM,
        { val: -Infinity, type: oracledb.DB_TYPE_BINARY_FLOAT },
        { val: Infinity, type: oracledb.DB_TYPE_BINARY_DOUBLE },
        { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BINARY_FLOAT },
        { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BINARY_DOUBLE }
      ];
      let result = await conn.execute(sql, binds);
      assert.strictEqual(1, result.rowsAffected);

      assert.strictEqual(-Infinity, result.outBinds[0][0]);
      assert.strictEqual(Infinity, result.outBinds[1][0]);
    } catch (error) {
      assert.fail(error);
    }
  }); // 229.4

  it('229.5 IN bind NaN', async () => {
    const NUM = 5;
    try {
      let sql = `insert into ${TABLE} values (:1, :2, :3)`;
      let binds = [
        NUM,
        { val: NaN, type: oracledb.DB_TYPE_BINARY_FLOAT },
        { val: NaN, type: oracledb.DB_TYPE_BINARY_DOUBLE }
      ];
      let result = await conn.execute(sql, binds);
      assert.strictEqual(1, result.rowsAffected);

      sql = `select * from ${TABLE} where id = ${NUM}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][1], NaN);
      assert.strictEqual(result.rows[0][2], NaN);
    } catch (error) {
      assert.fail(error);
    }
  }); // 229.5

  it('229.6 OUT bind NaN', async () => {
    const NUM = 6;

    try {
      let sql = `insert into ${TABLE} values (:1, :2, :3)
      returning bf, bd into :4, :5`;
      let binds = [
        NUM,
        { val: NaN, type: oracledb.DB_TYPE_BINARY_FLOAT },
        { val: NaN, type: oracledb.DB_TYPE_BINARY_DOUBLE },
        { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BINARY_FLOAT },
        { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_BINARY_DOUBLE }
      ];
      let result = await conn.execute(sql, binds);
      assert.strictEqual(1, result.rowsAffected);
      assert.strictEqual(result.outBinds[0][0], NaN);
      assert.strictEqual(result.outBinds[1][0], NaN);
    } catch (error) {
      assert.fail(error);
    }
  }); // 229.6

});

/* Copyright (c) 2020, 2025, Oracle and/or its affiliates. */

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
 *   241. dbType04.js
 *
 * DESCRIPTION
 *   Test the type DB_TYPE_JSON.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('241. dbType04.js', function() {

  let conn;
  let isRunnable = false;
  const TABLE = 'nodb_tab_jsontype';
  const default_stmtCacheSize = oracledb.stmtCacheSize;

  before(async function() {

    conn = await oracledb.getConnection(dbConfig);

    if (testsUtil.getClientVersion() >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
      isRunnable = true;
    }
    if (!isRunnable) {
      this.skip();
    }

    const sql = `
      create table ${TABLE} (
        id        number(9) not null,
        jsonval   json not null
      )
    `;
    const plsql = testsUtil.sqlCreateTable(TABLE, sql);
    await conn.execute(plsql);
    oracledb.stmtCacheSize = 0;
  }); // before()

  after(async function() {

    if (!isRunnable) {
      if (conn)
        await conn.close();
      return;
    }

    const sql = `drop table ${TABLE} purge`;
    await conn.execute(sql);
    await conn.close();
    oracledb.stmtCacheSize = default_stmtCacheSize;
  }); // after()

  it('241.1 JSON type check', async () => {
    const SQL = `SELECT :1 FROM dual`;
    const jsonVal = {
      keyA: 8,
      keyB: "A String",
      keyC: Buffer.from("A Raw"),
      keyD: true,
      keyE: false,
      keyF: null,
      keyG: undefined,
      keyH: [ 9, 10, 11 ],
      keyI: new Date()
    };

    oracledb.extendedMetaData = true;
    const result = await conn.execute(SQL,
      [{ val: jsonVal, type: oracledb.DB_TYPE_JSON }]);

    // check to see if the column type is JSON
    assert.strictEqual(result.metaData[0].dbTypeName, "JSON");
    assert.strictEqual(result.metaData[0].dbType, oracledb.DB_TYPE_JSON);
    assert.strictEqual(result.metaData[0].fetchType, oracledb.DB_TYPE_JSON);
  }); // 241.1

  it('241.2 JSON type data binding', async () => {
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const jsonId = 200;
    const jsonVal = {
      keyA: 8,
      keyB: "A String",
      keyC: Buffer.from("A Raw"),
      keyD: true,
      keyE: false,
      keyF: null,
      keyG: undefined,
      keyH: [ 9, 10, 11 ],
      keyI: new Date()
    };
    const binds = [
      jsonId,
      { val: jsonVal, type: oracledb.DB_TYPE_JSON }
    ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    const out = result2.rows[0][1];

    assert.strictEqual(out.keyA, jsonVal.keyA);
    assert.strictEqual(out.keyB, jsonVal.keyB);
    assert.strictEqual(out.keyC.toString(), 'A Raw');
    assert.strictEqual(out.keyD, jsonVal.keyD);
    assert.strictEqual(out.keyE, jsonVal.keyE);
    assert.strictEqual(out.keyF, jsonVal.keyF);
    assert.ifError(out.keyG);
    assert.deepStrictEqual(out.keyH, jsonVal.keyH);
    assert.strictEqual(testsUtil.isDate(out.keyI), true);
  }); // 241.2

  it('241.3 query number type from JSON column', async () => {
    const jsonId = 3;
    const sqlOne = `insert into ${TABLE} values (:1, '5')`;
    const binds = [ jsonId ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    assert.strictEqual(result2.rows[0][1], 5);
  }); // 241.3

  it('241.4 query number type from JSON column', async () => {
    const jsonId = 4;
    const sqlOne = `insert into ${TABLE} values (:1, '8.1234567899')`;
    const binds = [ jsonId ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    const out = result2.rows[0][1];
    assert.strictEqual(out, 8.1234567899);
  }); // 241.4

  it('241.5 query array type', async () => {
    const jsonId = 5;
    const sqlOne = `insert into ${TABLE} values (:1, '[1, 2, 3]')`;
    const binds = [ jsonId ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    assert.deepStrictEqual(result2.rows[0][1], [1, 2, 3]);
  }); // 241.5

  it('241.6 query JSON', async () => {
    const jsonId = 6;
    const sqlOne = `insert into ${TABLE} values (:1, '{"fred": 5, "george": 6}')`;
    const binds = [ jsonId ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    assert.deepStrictEqual(result2.rows[0][1], { fred: 5, george: 6 });
  }); // 241.6

  it('241.7 query json array', async () => {
    const jsonId = 7;
    const sqlOne = `
      insert into ${TABLE} values (:1,
          json_array(
            json_scalar(1),
            json_scalar(-200),
            json_scalar('Fred'),
            json_scalar(utl_raw.cast_to_raw('George')),
            json_scalar(to_clob('A short CLOB')),
            json_scalar(to_blob(utl_raw.cast_to_raw('A short BLOB'))),
            json_scalar(to_date('2020-02-21', 'YYYY-MM-DD')),
            json_scalar(to_timestamp('2020-02-20 08:00:25',
                    'YYYY-MM-DD HH24:MI:SS'))
          returning json))
    `;
    const binds = [ jsonId ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    const out = result2.rows[0][1];

    assert.strictEqual(out[0], 1);
    assert.strictEqual(out[1], -200);
    assert.strictEqual(out[2], 'Fred');

    assert.strictEqual(out[3].toString(), 'George');
    assert.strictEqual(out[4], 'A short CLOB');

    assert.strictEqual(out[5].toString(), 'A short BLOB');
    assert.strictEqual(testsUtil.isDate(out[6]), true);
    assert.strictEqual(testsUtil.isDate(out[7]), true);
  }); // 241.7

  it('241.8 query json object', async () => {
    const jsonId = 8;
    const sqlOne = `
      insert into ${TABLE} values (:1,
          json_object(key 'Fred' value json_scalar(5), key 'George' value json_scalar('A string')
          returning json))
    `;
    const binds = [ jsonId ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    const out = result2.rows[0][1];
    assert.strictEqual(out['Fred'], 5);
    assert.strictEqual(out['George'], 'A string');
  }); // 241.8

  it('241.9 binding Number gets converted to a JSON NUMBER value', async () => {
    const jsonId = 9;
    const jsonVal = 2333;
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const binds = [
      jsonId,
      { val: jsonVal, type: oracledb.DB_TYPE_JSON }
    ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    assert.strictEqual(result2.rows[0][1], jsonVal);
  }); // 241.9

  it('241.10 binding String gets converted to JSON VARCHAR2 value', async () => {
    const jsonId = 10;
    const jsonVal = 'FooBar';
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const binds = [
      jsonId,
      { val: jsonVal, type: oracledb.DB_TYPE_JSON }
    ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    assert.strictEqual(result2.rows[0][1], jsonVal);
  }); // 241.10

  it('241.11 binding Date gets converted to JSON TIMESTAMP value', async () => {
    const jsonId = 11;
    const jsonVal = new Date();
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const binds = [
      jsonId,
      { val: jsonVal, type: oracledb.DB_TYPE_JSON }
    ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    assert.strictEqual(testsUtil.isDate(result2.rows[0][1]), true);
  }); // 241.11

  it('241.12 binding Buffer gets converted to JSON RAW value', async () => {
    const jsonId = 12;
    const jsonVal = Buffer.from("A Raw");
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const binds = [
      jsonId,
      { val: jsonVal, type: oracledb.DB_TYPE_JSON }
    ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    assert.strictEqual(result2.rows[0][1].toString(), "A Raw");
  }); // 241.12

  it('241.13 binding Array gets converted to JSON Array value', async () => {
    const jsonId = 13;
    const jsonVal = [3, 4, 5];
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const binds = [
      jsonId,
      { val: jsonVal, type: oracledb.DB_TYPE_JSON }
    ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    assert.deepStrictEqual(result2.rows[0][1], jsonVal);
  }); // 241.13

  it('241.14 binding simple dbobject with no attributes couldn\'t get converted to JSON Object value, returns an empty object', async function() {
    const sql =
      `CREATE OR REPLACE TYPE NODE_OBJ AS OBJECT (
        id NUMBER,
        name VARCHAR2(30)
      );`;
    await conn.execute(sql);

    const objData = {
      ID: 300,
      NAME: 'Christopher Jones'
    };
    const objClass = await conn.getDbObjectClass("NODE_OBJ");
    const jsonVal = new objClass(objData);

    const jsonId = 14;
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const binds = [
      jsonId,
      { val: jsonVal, type: oracledb.DB_TYPE_JSON }
    ];

    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select id, json_object(jsonval) from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    assert.strictEqual(result2.rows[0][0], jsonId);
    assert.deepStrictEqual(result2.rows[0][1], "{\"jsonval\":{}}");
  }); // 241.14

  it('241.15 null', async () => {
    const jsonId = 15;
    const jsonVal = null;
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const binds = [
      jsonId,
      { val: jsonVal, type: oracledb.DB_TYPE_JSON }
    ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    assert.strictEqual(result2.rows[0][1], jsonVal);
  }); // 241.15

  it('241.16 "undefined" gets converted to a JSON "NULL" value', async () => {
    const jsonId = 16;
    const jsonVal = undefined;
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const binds = [
      jsonId,
      { val: jsonVal, type: oracledb.DB_TYPE_JSON }
    ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    assert.strictEqual(result2.rows[0][1], null);
  }); // 241.16

  it('241.17 true', async () => {
    const jsonId = 17;
    const jsonVal = true;
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const binds = [
      jsonId,
      { val: jsonVal, type: oracledb.DB_TYPE_JSON }
    ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    assert.strictEqual(result2.rows[0][1], jsonVal);
  }); // 241.17

  it('241.18 false', async () => {
    const jsonId = 18;
    const jsonVal = false;
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const binds = [
      jsonId,
      { val: jsonVal, type: oracledb.DB_TYPE_JSON }
    ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    assert.strictEqual(result2.rows[0][1], jsonVal);
  }); // 241.18

  it('241.19 empty string', async () => {
    const jsonId = 19;
    const jsonVal = "";
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const binds = [
      jsonId,
      { val: jsonVal, type: oracledb.DB_TYPE_JSON }
    ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    assert.strictEqual(result2.rows[0][1], jsonVal);
  }); // 241.19

  it('241.20 empty json', async () => {
    const jsonId = 20;
    const jsonVal = {};
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const binds = [
      jsonId,
      { val: jsonVal, type: oracledb.DB_TYPE_JSON }
    ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    assert.deepStrictEqual(result2.rows[0][1], jsonVal);
  }); // 241.20

  it('241.21 NaN', async () => {
    const jsonId = 21;
    const jsonVal = NaN;
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const binds = [
      jsonId,
      { val: jsonVal, type: oracledb.DB_TYPE_JSON }
    ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);
    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result2 = await conn.execute(sqlTwo);
    assert.strictEqual(result2.rows[0][1], jsonVal);
  }); // 241.21

  it('241.22 Negative - implicitly binding JSON', async () => {
    const jsonId = 22;
    const jsonVal = { "fred": 5, "george": 6 };
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const binds = [ jsonId, jsonVal ];

    await assert.rejects(
      async () => {
        await conn.execute(sqlOne, binds);
      },
      /NJS-044/
    );
    // NJS-044: bind object must contain one of the following keys: "dir", "type", "maxSize", or "val"
  }); // 241.22

  it('241.23 Negative - type mismatch', async () => {
    const jsonId = 23;
    const jsonVal = { "fred": 5, "george": 6 };
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const binds = [
      jsonId,
      { val: jsonVal }
    ];

    await assert.rejects(
      async () => {
        await conn.execute(sqlOne, binds);
      },
      /NJS-012/
    );
    // NJS-012: encountered invalid bind data type in parameter 2
  }); // 241.23

  it('241.24 Negative - type mismatch', async () => {
    const jsonId = 24;
    const jsonVal = { "fred": 5, "george": 6 };
    const sqlOne = `insert into ${TABLE} values (:1, :2)`;
    const binds = [
      jsonId,
      { val: jsonVal, type: oracledb.DB_TYPE_NUMBER }
    ];

    await assert.rejects(
      async () => {
        await conn.execute(sqlOne, binds);
      },
      /NJS-011/
    );
    // NJS-011: encountered bind value and type mismatch
  }); // 241.24

  it('241.25 query INTERVAL YEAR TO MONTH', async () => {
    const jsonId = 25;
    const intervalYMBindVar = {
      dir: oracledb.BIND_IN,
      type: oracledb.DB_TYPE_INTERVAL_YM,
      val: new oracledb.IntervalYM({ years: 5, months: 9 })
    };
    const sqlOne = `insert into ${TABLE} values (:1, json_scalar(:2))`;
    const binds = [ jsonId, intervalYMBindVar ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result = await conn.execute(sqlTwo);
    assert.deepStrictEqual(result.rows[0][1], intervalYMBindVar.val);
  }); // 241.25

  it('241.26 query INTERVAL DAY TO SECOND', async () => {
    const jsonId = 26;
    const intervalDSBindVar = {
      dir: oracledb.BIND_IN,
      type: oracledb.DB_TYPE_INTERVAL_DS,
      val: new oracledb.IntervalDS({ days: 5, seconds: 12, fseconds: 123789 })
    };
    const sqlOne = `insert into ${TABLE} values (:1, json_scalar(:2))`;
    const binds = [ jsonId, intervalDSBindVar ];
    const result1 = await conn.execute(sqlOne, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
    const result = await conn.execute(sqlTwo);
    assert.deepStrictEqual(result.rows[0][1], intervalDSBindVar.val);
  }); // 241.26

});

/* Copyright (c) 2020, Oracle and/or its affiliates. All rights reserved. */

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
 *   241. dbType04.js
 *
 * DESCRIPTION
 *   Test the type DB_TYPE_JSON.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('241. dbType04.js', function() {

  let conn;
  let isRunnable = false;
  const TABLE = 'nodb_tab_jsontype';
  const default_stmtCacheSize = oracledb.stmtCacheSize;

  before(async function() {

    try {
      conn = await oracledb.getConnection(dbconfig);
    } catch (err) {
      should.not.exist(err);
    }

    if(oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000){
      isRunnable = true;
    }
    if(!isRunnable) {
      this.skip();
    }

    try {
      let sql = `
        create table ${TABLE} (
          id        number(9) not null,
          jsonval   json not null
        )
      `;
      let plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);
    } catch (err) {
      should.not.exist(err);
    }
    oracledb.stmtCacheSize = 0;
  }); // before()

  after(async function() {

    if(!isRunnable) {
      return;
    }

    try {
      let sql = `drop table ${TABLE} purge`;
      await conn.execute(sql);
      await conn.close();
    } catch (err) {
      should.not.exist(err);
    }
    oracledb.stmtCacheSize = default_stmtCacheSize;
  }); // after()

  it('241.1 JSON type check', async () => {
    const SQL = `SELECT :1, DUMP(:1) FROM dual`;
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

    try {
      const result = await conn.execute(SQL,
        [{ val: jsonVal, type: oracledb.DB_TYPE_JSON }]);
      (result.rows[0][1]).should.startWith('Typ=119');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.1

  it('241.2 JSON type data binding', async () => {
    try {
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
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      const out = result2.rows[0][1];

      should.strictEqual(out.keyA, jsonVal.keyA);
      should.strictEqual(out.keyB, jsonVal.keyB);
      should.strictEqual(out.keyC.toString(), 'A Raw');
      should.strictEqual(out.keyD, jsonVal.keyD);
      should.strictEqual(out.keyE, jsonVal.keyE);
      should.strictEqual(out.keyF, jsonVal.keyF);
      should.not.exist(out.keyG);
      should.deepEqual(out.keyH, jsonVal.keyH);
      (out.keyI).should.be.a.Date();
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.2

  it('241.3 query number type from JSON column', async () => {
    try {
      const jsonId = 3;
      const sqlOne = `insert into ${TABLE} values (:1, '5')`;
      const binds = [ jsonId ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      should.strictEqual(result2.rows[0][1], 5);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.3

  it('241.4 query number type from JSON column', async () => {
    try {
      const jsonId = 4;
      const sqlOne = `insert into ${TABLE} values (:1, '8.1234567899')`;
      const binds = [ jsonId ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      const out = result2.rows[0][1];
      should.strictEqual(out, 8.1234567899);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.4

  it('241.5 query array type', async () => {
    try {
      const jsonId = 5;
      const sqlOne = `insert into ${TABLE} values (:1, '[1, 2, 3]')`;
      const binds = [ jsonId ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      should.deepEqual(result2.rows[0][1], [1, 2, 3]);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.5

  it('241.6 query JSON', async () => {
    try {
      const jsonId = 6;
      const sqlOne = `insert into ${TABLE} values (:1, '{"fred": 5, "george": 6}')`;
      const binds = [ jsonId ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      should.deepEqual(result2.rows[0][1], { fred: 5, george: 6 });
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.6

  it('241.7 query json array', async () => {
    try {
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
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      const out = result2.rows[0][1];

      should.strictEqual(out[0], 1);
      should.strictEqual(out[1], -200);
      should.strictEqual(out[2], 'Fred');

      should.strictEqual(out[3].toString(), 'George');
      should.strictEqual(out[4], 'A short CLOB');

      should.strictEqual(out[5].toString(), 'A short BLOB');
      (out[6]).should.be.a.Date();
      (out[7]).should.be.a.Date();
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.7

  it('241.8 query json object', async () => {
    try {
      const jsonId = 8;
      const sqlOne = `
        insert into ${TABLE} values (:1,
            json_object(key 'Fred' value json_scalar(5), key 'George' value json_scalar('A string')
            returning json))
      `;
      const binds = [ jsonId ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      const out = result2.rows[0][1];
      should.strictEqual(out['Fred'], 5);
      should.strictEqual(out['George'], 'A string');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.8

  it('241.9 binding Number gets converted to a JSON NUMBER value', async () => {
    try {
      const jsonId = 9;
      const jsonVal = 2333;
      const sqlOne = `insert into ${TABLE} values (:1, :2)`;
      const binds = [
        jsonId,
        { val: jsonVal, type: oracledb.DB_TYPE_JSON }
      ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      should.strictEqual(result2.rows[0][1], jsonVal);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.9

  it('241.10 binding String gets converted to JSON VARCHAR2 value', async () => {
    try {
      const jsonId = 10;
      const jsonVal = 'FooBar';
      const sqlOne = `insert into ${TABLE} values (:1, :2)`;
      const binds = [
        jsonId,
        { val: jsonVal, type: oracledb.DB_TYPE_JSON }
      ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      should.strictEqual(result2.rows[0][1], jsonVal);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.10

  it('241.11 binding Date gets converted to JSON TIMESTAMP value', async () => {
    try {
      const jsonId = 11;
      const jsonVal = new Date();
      const sqlOne = `insert into ${TABLE} values (:1, :2)`;
      const binds = [
        jsonId,
        { val: jsonVal, type: oracledb.DB_TYPE_JSON }
      ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      (result2.rows[0][1]).should.be.a.Date();
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.11

  it('241.12 binding Buffer gets converted to JSON RAW value', async () => {
    try {
      const jsonId = 12;
      const jsonVal = Buffer.from("A Raw");
      const sqlOne = `insert into ${TABLE} values (:1, :2)`;
      const binds = [
        jsonId,
        { val: jsonVal, type: oracledb.DB_TYPE_JSON }
      ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      should.strictEqual(result2.rows[0][1].toString(), "A Raw");
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.12

  it('241.13 binding Array gets converted to JSON Array value', async () => {
    try {
      const jsonId = 13;
      const jsonVal = [3, 4, 5];
      const sqlOne = `insert into ${TABLE} values (:1, :2)`;
      const binds = [
        jsonId,
        { val: jsonVal, type: oracledb.DB_TYPE_JSON }
      ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      should.deepEqual(result2.rows[0][1], jsonVal);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.13

  it('241.14 binding simple dbobject with no attributes couldn\'t get converted to JSON Object value, returns an empty object', async () => {

    try {
      let sql =
        `CREATE OR REPLACE TYPE NODE_OBJ AS OBJECT (
          id NUMBER,
          name VARCHAR2(30)
        );`;
      await conn.execute(sql);

      let objData = {
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
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select id, json_object(jsonval) from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      should.strictEqual(result2.rows[0][0], jsonId);
      should.deepEqual(result2.rows[0][1], "{\"jsonval\":{}}");

    } catch(err) {
      should.not.exist(err);
    }
  }); // 241.14

  it('241.15 null', async () => {
    try {
      const jsonId = 15;
      const jsonVal = null;
      const sqlOne = `insert into ${TABLE} values (:1, :2)`;
      const binds = [
        jsonId,
        { val: jsonVal, type: oracledb.DB_TYPE_JSON }
      ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      should.strictEqual(result2.rows[0][1], jsonVal);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.15

  it('241.16 "undefined" gets converted to a JSON "NULL" value', async () => {
    try {
      const jsonId = 16;
      const jsonVal = undefined;
      const sqlOne = `insert into ${TABLE} values (:1, :2)`;
      const binds = [
        jsonId,
        { val: jsonVal, type: oracledb.DB_TYPE_JSON }
      ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      should.strictEqual(result2.rows[0][1], null);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.16

  it('241.17 true', async () => {
    try {
      const jsonId = 17;
      const jsonVal = true;
      const sqlOne = `insert into ${TABLE} values (:1, :2)`;
      const binds = [
        jsonId,
        { val: jsonVal, type: oracledb.DB_TYPE_JSON }
      ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      should.strictEqual(result2.rows[0][1], jsonVal);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.17

  it('241.18 false', async () => {
    try {
      const jsonId = 18;
      const jsonVal = false;
      const sqlOne = `insert into ${TABLE} values (:1, :2)`;
      const binds = [
        jsonId,
        { val: jsonVal, type: oracledb.DB_TYPE_JSON }
      ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      should.strictEqual(result2.rows[0][1], jsonVal);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.18

  it('241.19 empty string', async () => {
    try {
      const jsonId = 19;
      const jsonVal = "";
      const sqlOne = `insert into ${TABLE} values (:1, :2)`;
      const binds = [
        jsonId,
        { val: jsonVal, type: oracledb.DB_TYPE_JSON }
      ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      should.strictEqual(result2.rows[0][1], jsonVal);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.19

  it('241.20 empty json', async () => {
    try {
      const jsonId = 20;
      const jsonVal = {};
      const sqlOne = `insert into ${TABLE} values (:1, :2)`;
      const binds = [
        jsonId,
        { val: jsonVal, type: oracledb.DB_TYPE_JSON }
      ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      const result2 = await conn.execute(sqlTwo);
      should.deepEqual(result2.rows[0][1], jsonVal);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.20

  it.skip('241.21 NaN', async () => {
    try {
      const jsonId = 21;
      const jsonVal = NaN;
      const sqlOne = `insert into ${TABLE} values (:1, :2)`;
      const binds = [
        jsonId,
        { val: jsonVal, type: oracledb.DB_TYPE_JSON }
      ];
      const result1 = await conn.execute(sqlOne, binds);
      //should.strictEqual(result1.rowsAffected, 1);
      console.log(result1);
      // const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      // const result2 = await conn.execute(sqlTwo);
      // console.log(result2.rows[0][1]);
      // should.strictEqual(result2.rows[0][1], jsonVal);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.21

  it('241.22 Negative - implicitly binding JSON', async () => {
    try {
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

    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.22

  it('241.23 Negative - type mismatch', async () => {
    try {
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

    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.23

  it('241.24 Negative - type mismatch', async () => {
    try {
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

    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.24

  it('241.25 Negative - query INTERVAL YEAR TO MONTH', async () => {
    try {
      const jsonId = 25;
      const sqlOne = `insert into ${TABLE} values (:1, json_scalar(to_yminterval('+5-9')))`;
      const binds = [ jsonId ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      await assert.rejects(
        async () => {
          await conn.execute(sqlTwo);
        },
        /NJS-078/
      );
      // NJS-078: unsupported data type 2016 in JSON value

    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.25

  it('241.26 Negative - query INTERVAL DAY TO SECOND', async () => {
    try {
      const jsonId = 26;
      const sqlOne = `insert into ${TABLE} values (:1, json_scalar(to_dsinterval('P25DT8H25M')))`;
      const binds = [ jsonId ];
      const result1 = await conn.execute(sqlOne, binds);
      should.strictEqual(result1.rowsAffected, 1);

      const sqlTwo = `select * from ${TABLE} where id = ${jsonId}`;
      await assert.rejects(
        async () => {
          await conn.execute(sqlTwo);
        },
        /NJS-078/
      );
      // NJS-078: unsupported data type 2016 in JSON value
    } catch (err) {
      should.not.exist(err);
    }
  }); // 241.26

});

/* Copyright (c) 2019, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   203. dbObject4.js
 *
 * DESCRIPTION
 *   Test the Oracle data type Object on TIMESTAMP WITH LOCAL TIME ZONE.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('203. dbObject4.js', () => {
  let conn;
  const TYPE = 'NODB_TYP_OBJ_4';
  const TABLE  = 'NODB_TAB_OBJ4';

  before(async () => {
    try {
      conn = await oracledb.getConnection(dbconfig);

      let sql =
        `CREATE OR REPLACE TYPE ${TYPE} AS OBJECT (
          entry TIMESTAMP WITH LOCAL TIME ZONE,
          exit  TIMESTAMP WITH LOCAL TIME ZONE
        );`;
      await conn.execute(sql);

      sql =
        `CREATE TABLE ${TABLE} (
          num NUMBER,
          person ${TYPE}
        )`;
      let plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

    } catch (err) {
      assert.fail(err);
    }
  }); // before()

  after(async () => {
    try {
      let sql = `DROP TABLE ${TABLE} PURGE`;
      await conn.execute(sql);

      sql = `DROP TYPE ${TYPE}`;
      await conn.execute(sql);

      await conn.close();
    } catch (err) {
      assert.fail(err);
    }
  }); // after()

  it('203.1 insert an object with LTZ type attribute', async () => {
    try {
      const seq = 101;
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;

      const date1 = new Date (1986, 8, 18, 12, 14, 27, 0);
      const date2 = new Date (1989, 3, 4, 10, 27, 16, 201);
      const objData = {
        ENTRY: date1,
        EXIT : date2
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][1]['ENTRY'].getTime(), date1.getTime());
      assert.strictEqual(result.rows[0][1]['EXIT'].getTime(), date2.getTime());
      assert.strictEqual(result.rows[0][0], seq);
    } catch (err) {
      assert.fail(err);
    }
  }); // 203.1

  it('203.2 insert null value for LTZ type attribute', async () => {
    try {
      const seq = 102;
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;

      const objData = {
        ENTRY: null,
        EXIT : null
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][1]['ENTRY'], null);
      assert.strictEqual(result.rows[0][1]['EXIT'], null);
      assert.strictEqual(result.rows[0][0], seq);
    } catch (err) {
      assert.fail(err);
    }
  }); // 203.2

  it('203.3 insert undefined value for LTZ type attribute', async () => {
    try {
      const seq = 103;
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;

      const objData = {
        ENTRY: undefined,
        EXIT : undefined
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][1]['ENTRY'], null);
      assert.strictEqual(result.rows[0][1]['EXIT'], null);
      assert.strictEqual(result.rows[0][0], seq);
    } catch (err) {
      assert.fail(err);
    }
  }); // 203.3

  it('203.4 insert an empty JSON', async () => {
    try {
      const seq = 104;
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;

      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass({});

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][1]['ENTRY'], null);
      assert.strictEqual(result.rows[0][1]['EXIT'], null);
    } catch (err) {
      assert.fail(err);
    }
  }); // 203.4
});

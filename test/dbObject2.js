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
 *   201. dbObject2.js
 *
 * DESCRIPTION
 *   Test the Oracle data type Object on TIMESTAMP.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('201. dbObject2.js', () => {

  let conn;
  const TYPE = 'NODB_TYP_OBJ_2';
  const TABLE  = 'NODB_TAB_OBJ2';

  before(async () => {
    try {
      conn = await oracledb.getConnection(dbconfig);

      let sql =
        `CREATE OR REPLACE TYPE ${TYPE} AS OBJECT (
          entry TIMESTAMP,
          exit  TIMESTAMP
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
      should.not.exist(err);
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
      should.not.exist(err);
    }
  }); // after()

  it.skip('201.1 insert an object with timestamp attributes', async () => {
    try {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;

      let date1 = new Date (1986, 8, 18, 12, 14, 27, 0);
      let date2 = new Date (1989, 3, 4, 10, 27, 16, 201);
      let objData = {
        ENTRY: date1,
        EXIT : date2
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 101;

      let result = await conn.execute(sql, [seq, testObj]);
      should.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      // console.log('Queried data', result.rows[0][1]['ENTRY'].getTime());
      // console.log('Inserted data', date1.getTime());

      //should.strictEqual(result.rows[0][1]['ENTRY'].getTime(), date1.getTime());
      //should.strictEqual(result.rows[0][1]['EXIT'].getTime(), date2.getTime());

    } catch (err) {
      should.not.exist(err);
    }
  }); // 201.1

  it.skip('directly insert timestamp data', async () => {
    try {
      let tabName = 'nodb_tmp';
      let sql =
      `CREATE TABLE ${tabName} (
        num NUMBER,
        content TIMESTAMP
      )`;
      let plsql = testsUtil.sqlCreateTable(tabName, sql);
      await conn.execute(plsql);

      sql = `INSERT INTO ${tabName} VALUES (:1, :2)`;
      let date1 = new Date (1986, 8, 18, 12, 14, 27, 0);
      let result = await conn.execute(sql, [111, date1]);
      should.strictEqual(result.rowsAffected, 1);

      sql = `SELECT * FROM ${tabName}`;
      result = await conn.execute(sql);
      console.log('Queried data', result.rows[0][1].getTime());
      console.log('Inserted data', date1.getTime());


      sql = `DROP TABLE ${tabName} PURGE`;
      await conn.execute(sql);

    } catch (err) {
      should.not.exist(err);
    }
  });

  it('201.2 insert null values for timestamp attribute', async () => {
    try {
      const seq = 102;
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;

      let objData = {
        ENTRY: null,
        EXIT : null
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);

      let result = await conn.execute(sql, [seq, testObj]);
      should.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      should.strictEqual(result.rows[0][1]['ENTRY'], null);
      should.strictEqual(result.rows[0][1]['EXIT'], null);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 201.2

  it('201.3 insert undefined values for timestamp attribute', async () => {
    try {
      const seq = 103;
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;

      let objData = {
        ENTRY: undefined,
        EXIT : undefined
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);

      let result = await conn.execute(sql, [seq, testObj]);
      should.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      should.strictEqual(result.rows[0][1]['ENTRY'], null);
      should.strictEqual(result.rows[0][1]['EXIT'], null);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 201.3

  it('201.4 insert an empty JSON for timestamp attribute', async () => {
    try {
      const seq = 104;
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;

      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass({});

      let result = await conn.execute(sql, [seq, testObj]);
      should.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      should.strictEqual(result.rows[0][1]['ENTRY'], null);
      should.strictEqual(result.rows[0][1]['EXIT'], null);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 201.4
});

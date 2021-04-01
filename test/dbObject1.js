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
 *   200. dbObject1.js
 *
 * DESCRIPTION
 *   Test the Oracle data type Object on VARCHAR2 and NUMBER.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('200. dbObject1.js', () => {

  let conn;
  const TYPE = 'NODB_TYP_OBJ_1';
  const TABLE  = 'NODB_TAB_OBJ1';

  before(async () => {
    try {
      conn = await oracledb.getConnection(dbconfig);

      let sql =
        `CREATE OR REPLACE TYPE ${TYPE} AS OBJECT (
          id NUMBER,
          name VARCHAR2(30)
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

  it('200.1 insert an object with numeric/string values', async () => {
    try {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      let objData = {
        ID: 201,
        NAME: 'Christopher Jones'
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 101;

      let result = await conn.execute(sql, [seq, testObj]);
      should.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      should.strictEqual(result.rows[0][0], seq);
      should.strictEqual(result.rows[0][1]['ID'], objData.ID);
      should.strictEqual(result.rows[0][1]['NAME'], objData.NAME);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 200.1

  it('200.2 insert an object with null numeric values', async () => {
    try {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      let objData = {
        ID: null,
        NAME: 'Christopher Jones'
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 102;

      let result = await conn.execute(sql, [seq, testObj]);
      should.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      should.strictEqual(result.rows[0][0], seq);
      should.strictEqual(result.rows[0][1]['ID'], null);
      should.strictEqual(result.rows[0][1]['NAME'], objData.NAME);

    } catch (err) {
      should.not.exist(err);
    }
  }); // 200.2

  it('200.3 insert an object with null string values', async () => {
    try {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      let objData = {
        ID: 203,
        NAME: null
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 103;

      let result = await conn.execute(sql, [seq, testObj]);
      should.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      should.strictEqual(result.rows[0][0], seq);
      should.strictEqual(result.rows[0][1]['ID'], objData.ID);
      should.strictEqual(result.rows[0][1]['NAME'], null);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 200.3

  it('200.4 insert an object with undefined numeric values', async () => {
    try {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      let objData = {
        ID: undefined,
        NAME: 'Christopher Jones'
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 104;

      let result = await conn.execute(sql, [seq, testObj]);
      should.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      should.strictEqual(result.rows[0][0], seq);
      should.strictEqual(result.rows[0][1]['ID'], null);
      should.strictEqual(result.rows[0][1]['NAME'], objData.NAME);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 200.4

  it('200.5 insert an object with undefined string values', async () => {
    try {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      let objData = {
        ID: 205,
        NAME: undefined
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 105;

      let result = await conn.execute(sql, [seq, testObj]);
      should.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      should.strictEqual(result.rows[0][0], seq);
      should.strictEqual(result.rows[0][1]['ID'], objData.ID);
      should.strictEqual(result.rows[0][1]['NAME'], null);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 200.5

  it('200.6 insert an empty object - no attributes', async () => {
    try {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      let objData = { };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 106;

      let result = await conn.execute(sql, [seq, testObj]);
      should.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      should.strictEqual(result.rows[0][0], seq);
      should.not.exist(result.rows[0][1]['ID']);
      should.not.exist(result.rows[0][1]['NAME']);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 200.6

  it('200.7 insert data via binding by object', async () => {
    try {
      let sql = `INSERT INTO ${TABLE} VALUES (:a, :b)`;
      let objData = {
        ID: 207,
        NAME: 'Christopher Jones'
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 107;

      let result = await conn.execute(sql, { a: seq, b: testObj });
      should.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql, [], { outFormat: oracledb.OBJECT });

      should.strictEqual(result.rows[0].NUM, seq);
      should.strictEqual(result.rows[0].PERSON['ID'], objData.ID);
      should.strictEqual(result.rows[0].PERSON.NAME, objData.NAME);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 200.7

  it('200.8 insert multiple rows using executeMany() with inferred data type', async () => {
    try {
      const objClass = await conn.getDbObjectClass(TYPE);
      let initialID = 208, initialSeq = 108;

      let objDataArray = [
        {
          ID: initialID,
          NAME: 'Christopher Jones'
        },
        {
          ID: initialID++,
          NAME: 'Changjie Lin'
        },
        {
          ID: initialID++,
          NAME: 'Anthony Tuininga'
        }
      ];
      let bindArray = [];
      let seq, objDataObj;
      for (let i = 0; i < objDataArray.length; i++) {
        seq = initialSeq + i;
        objDataObj = new objClass(objDataArray[i]);
        bindArray[i] = { a: seq, b: objDataObj };
      }

      let options = { autoCommit: true };
      let sql = `INSERT INTO ${TABLE} VALUES (:a, :b)`;

      let result = await conn.executeMany(sql, bindArray, options);
      should.strictEqual(result.rowsAffected, objDataArray.length);

      sql = `SELECT * FROM ${TABLE} WHERE num >= ${initialSeq}`;
      result = await conn.execute(sql);

      for (let j = 0; j < objDataArray.length; j++) {
        should.strictEqual(result.rows[j][0], (initialSeq + j));
        should.strictEqual(result.rows[j][1]['ID'], objDataArray[j].ID);
        should.strictEqual(result.rows[j][1].NAME, objDataArray[j].NAME);
      }

    } catch (err) {
      should.not.exist(err);
    }
  }); // 200.8

  it('200.9 insert multiple rows using executeMany() with explicit data type', async () => {
    try {
      const objClass = await conn.getDbObjectClass(TYPE);
      let initialID = 3000, initialSeq = 300;

      let objDataArray = [
        {
          ID: initialID,
          NAME: 'Christopher Jones'
        },
        {
          ID: initialID++,
          NAME: 'Changjie Lin'
        },
        {
          ID: initialID++,
          NAME: 'Anthony Tuininga'
        }
      ];
      let bindArray = [];
      let seq, objDataObj;
      for (let i = 0; i < objDataArray.length; i++) {
        seq = initialSeq + i;
        objDataObj = new objClass(objDataArray[i]);
        bindArray[i] = { a: seq, b: objDataObj };
      }

      let options = {
        autoCommit: true,
        bindDefs: { a: { type: oracledb.NUMBER}, b: { type: objClass }  }
      };
      let sql = `INSERT INTO ${TABLE} VALUES (:a, :b)`;

      let result = await conn.executeMany(sql, bindArray, options);
      should.strictEqual(result.rowsAffected, objDataArray.length);

      sql = `SELECT * FROM ${TABLE} WHERE num >= ${initialSeq}`;
      result = await conn.execute(sql);

      for (let j = 0; j < objDataArray.length; j++) {
        should.strictEqual(result.rows[j][0], (initialSeq + j));
        should.strictEqual(result.rows[j][1]['ID'], objDataArray[j].ID);
        should.strictEqual(result.rows[j][1].NAME, objDataArray[j].NAME);
      }

    } catch (err) {
      should.not.exist(err);
    }
  }); // 200.9

});

/* Copyright (c) 2019, 2023, Oracle and/or its affiliates. */

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
 *   290. dbObject20.js
 *
 * DESCRIPTION
 *   Test the Oracle data type Object on NCHAR, NVARCHAR and RAW.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');
const assist   = require('./dataTypeAssist.js');

describe('290. dbObject20.js', () => {
  let conn;
  const TABLE = 'NODB_TAB_OBJ';

  const proc1 =
    `create or replace procedure nodb_getDataCursor1(p_cur out sys_refcursor) is
      begin
        open p_cur for
          SELECT
            * FROM
            ${TABLE}
        WHERE num >= 108;
      end; `;

  const proc2 =
    `create or replace procedure nodb_getDataCursor2(p_cur out sys_refcursor) is
       begin
         open p_cur for
           SELECT
             * FROM
             ${TABLE}
         WHERE num >= 300;
       end; `;

  const proc3 =
      `create or replace procedure nodb_getDataCursor3(
          p_cur1 out sys_refcursor,
          p_cur2 out sys_refcursor
       ) is
       begin
         nodb_getDataCursor1(p_cur1);
         nodb_getDataCursor2(p_cur2);
       end;`;

  describe('290.1 db Object tests with NCHAR datatype', () => {
    const TYPE = 'NODB_TYP_OBJ_1';
    before(async () => {
      conn = await oracledb.getConnection(dbConfig);
      let sql =
        `CREATE OR REPLACE TYPE ${TYPE} AS OBJECT (
          id NUMBER,
          name NCHAR(30)
        );`;

      await testsUtil.createType(conn, TYPE, sql);

      sql =
        `CREATE TABLE ${TABLE} (
          num NUMBER,
          person ${TYPE}
        )`;
      await testsUtil.createTable(conn, TABLE, sql);

      await conn.execute(proc1);
      await conn.execute(proc2);
      await conn.execute(proc3);
    }); // before()

    after(async () => {
      await testsUtil.dropTable(conn, TABLE);
      await testsUtil.dropType(conn, TYPE);

      await testsUtil.dropSource(conn, 'PROCEDURE', 'nodb_getDataCursor3');
      await testsUtil.dropSource(conn, 'PROCEDURE', 'nodb_getDataCursor2');
      await testsUtil.dropSource(conn, 'PROCEDURE', 'nodb_getDataCursor1');

      await conn.close();
    }); // after()

    it('290.1.1 insert an object with numeric/string values in NCHAR datatype', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = {
        ID: 201,
        NAME: 'ABC'
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 101;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.strictEqual(result.rows[0][1]['ID'], objData.ID);
      assert.strictEqual(result.rows[0][1]['NAME'].trim(), objData.NAME);
    }); // 290.1.1

    it('290.1.2 insert an object with null string values', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = {
        ID: 203,
        NAME: null
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 103;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.strictEqual(result.rows[0][1]['ID'], objData.ID);
      assert.strictEqual(result.rows[0][1]['NAME'], null);
    }); // 290.1.2

    it('290.1.3 insert an object with undefined string values', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = {
        ID: 205,
        NAME: undefined
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 105;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.strictEqual(result.rows[0][1]['ID'], objData.ID);
      assert.strictEqual(result.rows[0][1]['NAME'], null);
    }); // 290.1.3

    it('290.1.4 insert an empty object - no attributes', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = { };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 106;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.ifError(result.rows[0][1]['ID']);
      assert.ifError(result.rows[0][1]['NAME']);
    }); // 290.1.4

    it('290.1.5 insert data via binding by object', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:a, :b)`;
      const objData = {
        ID: 207,
        NAME: 'ABC'
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 107;

      let result = await conn.execute(sql, { a: seq, b: testObj });
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql, [], { outFormat: oracledb.OBJECT });

      assert.strictEqual(result.rows[0].NUM, seq);
      assert.strictEqual(result.rows[0].PERSON['ID'], objData.ID);
      assert.strictEqual(result.rows[0].PERSON.NAME.trim(), objData.NAME);
    }); // 290.1.5

    it('290.1.6 insert multiple rows using executeMany() with inferred data type', async () => {
      const objClass = await conn.getDbObjectClass(TYPE);
      let initialID = 208;
      const initialSeq = 108;

      const objDataArray = [
        {
          ID: initialID,
          NAME: 'ABC'
        },
        {
          ID: initialID++,
          NAME: 'LMN'
        },
        {
          ID: initialID++,
          NAME: 'XYZ'
        }
      ];
      const bindArray = [];
      let seq, objDataObj;
      for (let i = 0; i < objDataArray.length; i++) {
        seq = initialSeq + i;
        objDataObj = new objClass(objDataArray[i]);
        bindArray[i] = { a: seq, b: objDataObj };
      }

      const options = { autoCommit: true };
      let sql = `INSERT INTO ${TABLE} VALUES (:a, :b)`;

      let result = await conn.executeMany(sql, bindArray, options);
      assert.strictEqual(result.rowsAffected, objDataArray.length);

      sql = `SELECT * FROM ${TABLE} WHERE num >= ${initialSeq}`;
      result = await conn.execute(sql);

      for (let j = 0; j < objDataArray.length; j++) {
        assert.strictEqual(result.rows[j][0], (initialSeq + j));
        assert.strictEqual(result.rows[j][1]['ID'], objDataArray[j].ID);
        assert.strictEqual(result.rows[j][1].NAME.trim(), objDataArray[j].NAME);
      }
    }); // 290.1.6

    it('290.1.7 insert multiple rows using executeMany() with explicit data type', async () => {
      const objClass = await conn.getDbObjectClass(TYPE);
      let initialID = 3000;
      const initialSeq = 300;

      const objDataArray = [
        {
          ID: initialID,
          NAME: 'ABC'
        },
        {
          ID: initialID++,
          NAME: 'LMN'
        },
        {
          ID: initialID++,
          NAME: 'XYZ'
        }
      ];
      const bindArray = [];
      let seq, objDataObj;
      for (let i = 0; i < objDataArray.length; i++) {
        seq = initialSeq + i;
        objDataObj = new objClass(objDataArray[i]);
        bindArray[i] = { a: seq, b: objDataObj };
      }

      const options = {
        autoCommit: true,
        bindDefs: { a: { type: oracledb.NUMBER}, b: { type: objClass }  }
      };
      let sql = `INSERT INTO ${TABLE} VALUES (:a, :b)`;

      let result = await conn.executeMany(sql, bindArray, options);
      assert.strictEqual(result.rowsAffected, objDataArray.length);

      sql = `SELECT * FROM ${TABLE} WHERE num >= ${initialSeq}`;
      result = await conn.execute(sql);

      for (let j = 0; j < objDataArray.length; j++) {
        assert.strictEqual(result.rows[j][0], (initialSeq + j));
        assert.strictEqual(result.rows[j][1]['ID'], objDataArray[j].ID);
        assert.strictEqual(result.rows[j][1].NAME.trim(), objDataArray[j].NAME);
      }
    }); // 290.1.7

    it('290.1.8 call procedure with 2 OUT binds of DbObject', async function() {

      const result = await conn.execute(
        `BEGIN nodb_getDataCursor3(p_cur1 => :p_cur1,
            p_cur2 => :p_cur2); end;`,
        {
          p_cur1: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT},
          p_cur2: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT}
        }
      );

      let resultSet = await result.outBinds.p_cur1.getRows();
      assert.equal(resultSet.length, 6);
      result.outBinds.p_cur1.close();

      resultSet = await result.outBinds.p_cur2.getRows();
      assert.equal(resultSet.length, 3);
      result.outBinds.p_cur2.close();
    }); // 290.1.8
  });

  describe('290.2 db Object tests with NVARCHAR2 datatype', () => {
    const TYPE = 'NODB_TYP_OBJ_2';
    before(async () => {

      conn = await oracledb.getConnection(dbConfig);
      let sql =
      `CREATE OR REPLACE TYPE ${TYPE} AS OBJECT (
        id NUMBER,
        name NVARCHAR2(30)
      );`;

      await testsUtil.createType(conn, TYPE, sql);

      sql =
      `CREATE TABLE ${TABLE} (
        num NUMBER,
        person ${TYPE}
      )`;
      await testsUtil.createTable(conn, TABLE, sql);

      await conn.execute(proc1);
      await conn.execute(proc2);
      await conn.execute(proc3);
    }); // before()

    after(async () => {
      await testsUtil.dropTable(conn, TABLE);
      await testsUtil.dropType(conn, TYPE);

      await testsUtil.dropSource(conn, 'PROCEDURE', 'nodb_getDataCursor3');
      await testsUtil.dropSource(conn, 'PROCEDURE', 'nodb_getDataCursor2');
      await testsUtil.dropSource(conn, 'PROCEDURE', 'nodb_getDataCursor1');
      await conn.close();
    }); // after()

    it('290.2.1 insert an object with numeric/string values in NVARCHAR2 datatype', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = {
        ID: 201,
        NAME: 'ABC'
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 101;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.strictEqual(result.rows[0][1]['ID'], objData.ID);
      assert.strictEqual(result.rows[0][1]['NAME'], objData.NAME);
    }); // 290.2.1

    it('290.2.2 insert an object with null string values', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = {
        ID: 203,
        NAME: null
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 103;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.strictEqual(result.rows[0][1]['ID'], objData.ID);
      assert.strictEqual(result.rows[0][1]['NAME'], null);
    }); // 290.2.2

    it('290.2.3 insert an object with undefined string values', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = {
        ID: 205,
        NAME: undefined
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 105;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.strictEqual(result.rows[0][1]['ID'], objData.ID);
      assert.strictEqual(result.rows[0][1]['NAME'], null);
    }); // 290.2.3

    it('290.2.4 insert an empty object - no attributes', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = { };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 106;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.ifError(result.rows[0][1]['ID']);
      assert.ifError(result.rows[0][1]['NAME']);
    }); // 290.2.4

    it('290.2.5 insert data via binding by object', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:a, :b)`;
      const objData = {
        ID: 207,
        NAME: 'ABC'
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 107;

      let result = await conn.execute(sql, { a: seq, b: testObj });
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql, [], { outFormat: oracledb.OBJECT });

      assert.strictEqual(result.rows[0].NUM, seq);
      assert.strictEqual(result.rows[0].PERSON['ID'], objData.ID);
      assert.strictEqual(result.rows[0].PERSON.NAME, objData.NAME);
    }); // 290.2.5

    it('290.2.6 insert multiple rows using executeMany() with inferred data type', async () => {
      const objClass = await conn.getDbObjectClass(TYPE);
      let initialID = 208;
      const initialSeq = 108;

      const objDataArray = [
        {
          ID: initialID,
          NAME: 'ABC'
        },
        {
          ID: initialID++,
          NAME: 'LMN'
        },
        {
          ID: initialID++,
          NAME: 'XYZ'
        }
      ];
      const bindArray = [];
      let seq, objDataObj;
      for (let i = 0; i < objDataArray.length; i++) {
        seq = initialSeq + i;
        objDataObj = new objClass(objDataArray[i]);
        bindArray[i] = { a: seq, b: objDataObj };
      }

      const options = { autoCommit: true };
      let sql = `INSERT INTO ${TABLE} VALUES (:a, :b)`;

      let result = await conn.executeMany(sql, bindArray, options);
      assert.strictEqual(result.rowsAffected, objDataArray.length);

      sql = `SELECT * FROM ${TABLE} WHERE num >= ${initialSeq}`;
      result = await conn.execute(sql);

      for (let j = 0; j < objDataArray.length; j++) {
        assert.strictEqual(result.rows[j][0], (initialSeq + j));
        assert.strictEqual(result.rows[j][1]['ID'], objDataArray[j].ID);
        assert.strictEqual(result.rows[j][1].NAME, objDataArray[j].NAME);
      }
    }); // 290.2.6

    it('290.2.7 insert multiple rows using executeMany() with explicit data type', async () => {
      const objClass = await conn.getDbObjectClass(TYPE);
      let initialID = 3000;
      const initialSeq = 300;

      const objDataArray = [
        {
          ID: initialID,
          NAME: 'ABC'
        },
        {
          ID: initialID++,
          NAME: 'LMN'
        },
        {
          ID: initialID++,
          NAME: 'XYZ'
        }
      ];
      const bindArray = [];
      let seq, objDataObj;
      for (let i = 0; i < objDataArray.length; i++) {
        seq = initialSeq + i;
        objDataObj = new objClass(objDataArray[i]);
        bindArray[i] = { a: seq, b: objDataObj };
      }

      const options = {
        autoCommit: true,
        bindDefs: { a: { type: oracledb.NUMBER}, b: { type: objClass }  }
      };
      let sql = `INSERT INTO ${TABLE} VALUES (:a, :b)`;

      let result = await conn.executeMany(sql, bindArray, options);
      assert.strictEqual(result.rowsAffected, objDataArray.length);

      sql = `SELECT * FROM ${TABLE} WHERE num >= ${initialSeq}`;
      result = await conn.execute(sql);

      for (let j = 0; j < objDataArray.length; j++) {
        assert.strictEqual(result.rows[j][0], (initialSeq + j));
        assert.strictEqual(result.rows[j][1]['ID'], objDataArray[j].ID);
        assert.strictEqual(result.rows[j][1].NAME, objDataArray[j].NAME);
      }
    }); // 290.2.7

    it('290.2.8 call procedure with 2 OUT binds of DbObject', async function() {

      const result = await conn.execute(
        `BEGIN nodb_getDataCursor3(p_cur1 => :p_cur1,
            p_cur2 => :p_cur2); end;`,
        {
          p_cur1: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT},
          p_cur2: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT}
        }
      );

      let resultSet = await result.outBinds.p_cur1.getRows();
      assert.equal(resultSet.length, 6);
      result.outBinds.p_cur1.close();

      resultSet = await result.outBinds.p_cur2.getRows();
      assert.equal(resultSet.length, 3);
      result.outBinds.p_cur2.close();
    }); // 290.2.8
  });

  describe('290.3 db Object tests with RAW datatype', () => {
    const TYPE = 'NODB_TYP_OBJ_3';
    before(async () => {

      conn = await oracledb.getConnection(dbConfig);
      let sql =
      `CREATE OR REPLACE TYPE ${TYPE} AS OBJECT (
        id NUMBER,
        name RAW(30)
      );`;

      await testsUtil.createType(conn, TYPE, sql);

      sql =
      `CREATE TABLE ${TABLE} (
        num NUMBER,
        person ${TYPE}
      )`;

      await testsUtil.createTable(conn, TABLE, sql);

      await conn.execute(proc1);
      await conn.execute(proc2);
      await conn.execute(proc3);
    }); // before()

    after(async () => {
      await testsUtil.dropTable(conn, TABLE);
      await testsUtil.dropType(conn, TYPE);

      await testsUtil.dropSource(conn, 'PROCEDURE', 'nodb_getDataCursor3');
      await testsUtil.dropSource(conn, 'PROCEDURE', 'nodb_getDataCursor2');
      await testsUtil.dropSource(conn, 'PROCEDURE', 'nodb_getDataCursor1');
      await conn.close();
    }); // after()

    it('290.3.1 insert an object with numeric/string values in RAW datatype', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = {
        ID: 201,
        NAME: Buffer.from('ABC')
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 101;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.strictEqual(result.rows[0][1]['ID'], objData.ID);
      assert.deepStrictEqual(result.rows[0][1]['NAME'], objData.NAME);
    }); // 290.3.1

    it('290.3.2 insert an object with null string values', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = {
        ID: 203,
        NAME: null
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 103;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.strictEqual(result.rows[0][1]['ID'], objData.ID);
      assert.strictEqual(result.rows[0][1]['NAME'], null);
    }); // 290.3.2

    it('290.3.3 insert an object with undefined string values', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = {
        ID: 205,
        NAME: undefined
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 105;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.strictEqual(result.rows[0][1]['ID'], objData.ID);
      assert.strictEqual(result.rows[0][1]['NAME'], null);
    }); // 290.3.3

    it('290.3.4 insert an empty object - no attributes', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = { };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 106;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.ifError(result.rows[0][1]['ID']);
      assert.ifError(result.rows[0][1]['NAME']);
    }); // 290.3.4

    it('290.3.5 insert data via binding by object', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:a, :b)`;
      const objData = {
        ID: 207,
        NAME: Buffer.from('ABC')
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 107;

      let result = await conn.execute(sql, { a: seq, b: testObj });
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql, [], { outFormat: oracledb.OBJECT });

      assert.strictEqual(result.rows[0].NUM, seq);
      assert.strictEqual(result.rows[0].PERSON['ID'], objData.ID);
      assert.deepStrictEqual(result.rows[0].PERSON.NAME, objData.NAME);
    }); // 290.3.5

    it('290.3.6 insert multiple rows using executeMany() with inferred data type', async () => {
      const objClass = await conn.getDbObjectClass(TYPE);
      let initialID = 208;
      const initialSeq = 108;

      const objDataArray = [
        {
          ID: initialID,
          NAME: Buffer.from('ABC')
        },
        {
          ID: initialID++,
          NAME: Buffer.from('LMN')
        },
        {
          ID: initialID++,
          NAME: Buffer.from('XYZ')
        }
      ];
      const bindArray = [];
      let seq, objDataObj;
      for (let i = 0; i < objDataArray.length; i++) {
        seq = initialSeq + i;
        objDataObj = new objClass(objDataArray[i]);
        bindArray[i] = { a: seq, b: objDataObj };
      }

      const options = { autoCommit: true };
      let sql = `INSERT INTO ${TABLE} VALUES (:a, :b)`;

      let result = await conn.executeMany(sql, bindArray, options);
      assert.strictEqual(result.rowsAffected, objDataArray.length);

      sql = `SELECT * FROM ${TABLE} WHERE num >= ${initialSeq}`;
      result = await conn.execute(sql);

      for (let j = 0; j < objDataArray.length; j++) {
        assert.strictEqual(result.rows[j][0], (initialSeq + j));
        assert.strictEqual(result.rows[j][1]['ID'], objDataArray[j].ID);
        assert.deepStrictEqual(result.rows[j][1].NAME, objDataArray[j].NAME);
      }
    }); // 290.3.6

    it('290.3.7 insert multiple rows using executeMany() with explicit data type', async () => {
      const objClass = await conn.getDbObjectClass(TYPE);
      let initialID = 3000;
      const initialSeq = 300;

      const objDataArray = [
        {
          ID: initialID,
          NAME: Buffer.from('ABC')
        },
        {
          ID: initialID++,
          NAME: Buffer.from('LMN')
        },
        {
          ID: initialID++,
          NAME: Buffer.from('XYZ')
        }
      ];
      const bindArray = [];
      let seq, objDataObj;
      for (let i = 0; i < objDataArray.length; i++) {
        seq = initialSeq + i;
        objDataObj = new objClass(objDataArray[i]);
        bindArray[i] = { a: seq, b: objDataObj };
      }

      const options = {
        autoCommit: true,
        bindDefs: { a: { type: oracledb.NUMBER}, b: { type: objClass }  }
      };
      let sql = `INSERT INTO ${TABLE} VALUES (:a, :b)`;

      let result = await conn.executeMany(sql, bindArray, options);
      assert.strictEqual(result.rowsAffected, objDataArray.length);

      sql = `SELECT * FROM ${TABLE} WHERE num >= ${initialSeq}`;
      result = await conn.execute(sql);

      for (let j = 0; j < objDataArray.length; j++) {
        assert.strictEqual(result.rows[j][0], (initialSeq + j));
        assert.strictEqual(result.rows[j][1]['ID'], objDataArray[j].ID);
        assert.deepStrictEqual(result.rows[j][1].NAME, objDataArray[j].NAME);
      }
    }); // 290.3.7

    it('290.3.8 call procedure with 2 OUT binds of DbObject', async function() {

      const result = await conn.execute(
        `BEGIN nodb_getDataCursor3(p_cur1 => :p_cur1,
          p_cur2 => :p_cur2); end;`,
        {
          p_cur1: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT},
          p_cur2: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT}
        }
      );

      let resultSet = await result.outBinds.p_cur1.getRows();
      assert.equal(resultSet.length, 6);
      result.outBinds.p_cur1.close();

      resultSet = await result.outBinds.p_cur2.getRows();
      assert.equal(resultSet.length, 3);
      result.outBinds.p_cur2.close();
    }); // 290.3.8

    it('290.3.9 insert an object with buffer value with size 10', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = {
        ID: 210,
        NAME: assist.createBuffer(10)
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 210;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.strictEqual(result.rows[0][1]['ID'], objData.ID);
      assert.deepStrictEqual(result.rows[0][1]['NAME'], objData.NAME);
    }); // 290.3.9

    it('290.3.10 insert an object with buffer value with size 100', async () => {
      const sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = {
        ID: 211,
        NAME: assist.createBuffer(100)
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 211;

      await assert.rejects(
        async () => await conn.execute(sql, [seq, testObj]),
        /ORA-21525:|ORA-00910:/ //ORA-21525: attribute number or (collection element at index) %s violated its constraints
      );
    }); // 290.3.10
  });
});

/* Copyright (c) 2019, 2025, Oracle and/or its affiliates. */

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
 *   200. dbObject1.js
 *
 * DESCRIPTION
 *   Test the Oracle data type Object on VARCHAR2, NUMBER, BINARY_FLOAT.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('200. dbObject1.js', () => {

  let conn;
  const TYPE = 'NODB_TYP_OBJ_1';
  const TABLE  = 'NODB_TAB_OBJ1';

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

  before(async () => {
    conn = await oracledb.getConnection(dbConfig);

    let sql =
      `CREATE OR REPLACE TYPE ${TYPE} AS OBJECT (
        id NUMBER,
        name VARCHAR2(30),
        address VARCHAR2(1024)
      );`;
    await conn.execute(sql);

    sql =
      `CREATE TABLE ${TABLE} (
        num NUMBER,
        person ${TYPE}
      )`;
    const plsql = testsUtil.sqlCreateTable(TABLE, sql);
    await conn.execute(plsql);
  }); // before()

  after(async () => {
    await conn.execute(testsUtil.sqlDropTable(TABLE));
    const sql = `DROP TYPE ${TYPE}`;
    await conn.execute(sql);

    await conn.close();
  }); // after()

  describe('200.1 Object Data Insertion and Retrieval', function() {
    it('200.1.1 insert an object with numeric/string values', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = {
        ID: 201,
        NAME: 'Christopher Jones'
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      assert.equal(testObj.length, undefined);

      // Test if copy object works fine
      const testObjCopy = testObj.copy();
      assert.strictEqual(JSON.stringify(testObj), JSON.stringify(testObjCopy));
      assert.equal(testObj.ID, testObjCopy.ID);
      assert.equal(testObj.NAME, testObjCopy.NAME);

      const seq = 101;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      const options = {};
      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      options.fetchInfo = {"PERSON": { type: oracledb.STRING }};
      await assert.rejects(
        async () => await conn.execute(sql, [], options),
        /NJS-119:/
      );

      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.strictEqual(result.rows[0][1]['ID'], objData.ID);
      assert.strictEqual(result.rows[0][1]['NAME'], objData.NAME);
    }); // 200.1.1

    it('200.1.2 insert an object with null numeric values', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = {
        ID: null,
        NAME: 'Christopher Jones'
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 102;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.strictEqual(result.rows[0][1]['ID'], null);
      assert.strictEqual(result.rows[0][1]['NAME'], objData.NAME);
    }); // 200.1.2

    it('200.1.3 insert an object with null string values', async () => {
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
    }); // 200.1.3

    it('200.1.4 insert an object with undefined numeric values', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const objData = {
        ID: undefined,
        NAME: 'Christopher Jones'
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 104;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);
      await conn.commit();

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.strictEqual(result.rows[0][1]['ID'], null);
      assert.strictEqual(result.rows[0][1]['NAME'], objData.NAME);
    }); // 200.1.4

    it('200.1.5 insert an object with undefined string values', async () => {
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
    }); // 200.1.5

    it('200.1.6 insert an empty object - no attributes', async () => {
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
    }); // 200.1.6

    it('200.1.7 insert data via binding by object', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:a, :b)`;
      const objData = {
        ID: 207,
        NAME: 'Christopher Jones'
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
    }); // 200.1.7

    it('200.1.8 Negative - test collection methods', async () => {
      const objData = {
        ID: 208,
        NAME: 'Christopher Jones'
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);

      assert.throws(
        () => {
          testObj.append(5);
        },
        /NJS-146:/
      );
      assert.throws(
        () => {
          testObj.deleteElement(5);
        },
        /NJS-146:/
      );
      assert.throws(
        () => {
          testObj.getElement(5);
        },
        /NJS-146:/
      );
      assert.throws(
        () => {
          testObj.getKeys();
        },
        /NJS-146:/
      );
      assert.throws(
        () => {
          testObj.getLastIndex();
        },
        /NJS-146:/
      );
      assert.throws(
        () => {
          testObj.getNextIndex(5);
        },
        /NJS-146:/
      );
      assert.throws(
        () => {
          testObj.getPrevIndex(5);
        },
        /NJS-146:/
      );
      assert.throws(
        () => {
          testObj.getValues();
        },
        /NJS-146:/
      );
      assert.throws(
        () => {
          testObj.hasElement(5);
        },
        /NJS-146:/
      );
      assert.throws(
        () => {
          testObj.setElement(5, 'a');
        },
        /NJS-146:/
      );
      assert.throws(
        () => {
          testObj.toMap();
        },
        /NJS-146:/
      );
      assert.throws(
        () => {
          testObj.trim(2);
        },
        /NJS-146:/
      );
    }); // 200.1.8

    it('200.1.9 insert multiple rows using executeMany() with inferred data type', async () => {
      const objClass = await conn.getDbObjectClass(TYPE);
      let initialID = 208;
      const initialSeq = 108;

      const objDataArray = [
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
    }); // 200.1.9

    it('200.1.10 insert multiple rows using executeMany() with explicit data type', async () => {
      const objClass = await conn.getDbObjectClass(TYPE);
      let initialID = 3000;
      const initialSeq = 300;

      const objDataArray = [
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
    }); // 200.1.10

    it('200.1.11 call procedure with 2 OUT binds of DbObject', async function() {
      await conn.execute(proc1);
      await conn.execute(proc2);
      await conn.execute(proc3);

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
      await result.outBinds.p_cur1.close();

      resultSet = await result.outBinds.p_cur2.getRows();
      assert.equal(resultSet.length, 3);
      await result.outBinds.p_cur2.close();

      await conn.execute(`DROP PROCEDURE nodb_getDataCursor3`);
      await conn.execute(`DROP PROCEDURE nodb_getDataCursor2`);
      await conn.execute(`DROP PROCEDURE nodb_getDataCursor1`);
    }); // 200.1.11

    it('200.1.12 insert an object with large string values', async () => {
      let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
      const maxLen = 1024;
      const largeString = 'A'.repeat(maxLen);
      const objData = {
        ADDRESS: largeString
      };
      const objClass = await conn.getDbObjectClass(TYPE);
      const testObj = new objClass(objData);
      const seq = 111;

      let result = await conn.execute(sql, [seq, testObj]);
      assert.strictEqual(result.rowsAffected, 1);

      sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
      result = await conn.execute(sql);

      assert.strictEqual(result.rows[0][0], seq);
      assert.strictEqual(result.rows[0][1]['ADDRESS'], objData.ADDRESS);
    }); // 200.1.12
  });

  describe('200.2 Number property with Precision', function() {
    let conn;
    const TYPE_SMALL_PRECISION = 'NODB_TYP_OBJ_1_SPREC';
    const TYPE_LARGE_PRECISION = 'NODB_TYP_OBJ_1_LPREC';
    const typ1 =
    `create or replace type ${TYPE_SMALL_PRECISION} as object (TESTNUMBER number (12, 0))`;
    const typ2 =
    `create or replace type ${TYPE_LARGE_PRECISION} as object (TESTNUMBER number (22, 0))`;

    before(async () => {
      conn = await oracledb.getConnection(dbConfig);
      await conn.execute(typ1);
      await conn.execute(typ2);
    }); // before()

    after(async () => {
      let sql = `DROP TYPE ${TYPE_SMALL_PRECISION}`;
      await conn.execute(sql);
      sql = `DROP TYPE ${TYPE_LARGE_PRECISION}`;
      await conn.execute(sql);
      await conn.close();
    }); // after()

    async function runPlSQL(sql, typ) {
      const inpVal = 260;
      const result = await conn.execute(sql, {
        arg: {
          dir: oracledb.BIND_INOUT,
          type: typ,
          val: {'TESTNUMBER': inpVal}
        }
      }, {outFormat: oracledb.OUT_FORMAT_OBJECT});
      return result;
    }

    it('200.2.1 using small Precision', async () => {
      const retVal = 560;
      const sql = `declare myType ${TYPE_SMALL_PRECISION} := :arg; begin myType.TESTNUMBER := ${retVal};
      :arg := myType; end;`;

      const result = await runPlSQL(sql, TYPE_SMALL_PRECISION);
      assert.strictEqual(result.outBinds.arg.TESTNUMBER, retVal);
    }); // 200.2.1

    it('200.2.2 using Large Precision', async () => {
      const retVal = 560;
      const sql = `declare myType ${TYPE_LARGE_PRECISION} := :arg; begin myType.TESTNUMBER := ${retVal};
      :arg := myType; end;`;

      const result = await runPlSQL(sql, TYPE_LARGE_PRECISION);
      assert.strictEqual(result.outBinds.arg.TESTNUMBER, retVal);
    }); // 200.2.2
  });

  describe('200.3 Binary Float property', function() {
    let conn;
    const TYPE_BINARY_FLOAT = 'NODB_TYP_OBJ_BINARY_FLOAT';
    const TABLE_BINARY_FLOAT = 'NODB_TAB_OBJ_BINARY_FLOAT';

    const typeSql = `
    CREATE OR REPLACE TYPE ${TYPE_BINARY_FLOAT} AS OBJECT (
      TESTFLOAT BINARY_FLOAT
    )`;

    const tableSql = `
    CREATE TABLE ${TABLE_BINARY_FLOAT} (
      ID NUMBER,
      DATA ${TYPE_BINARY_FLOAT}
    )`;

    before(async () => {
      conn = await oracledb.getConnection(dbConfig);
      await conn.execute(typeSql);
      const plsql = testsUtil.sqlCreateTable(TABLE_BINARY_FLOAT, tableSql);
      await conn.execute(plsql);
    });

    after(async () => {
      await conn.execute(testsUtil.sqlDropTable(TABLE_BINARY_FLOAT));
      const sql = `DROP TYPE ${TYPE_BINARY_FLOAT}`;
      await conn.execute(sql);

      await conn.close();
    });

    it('200.3.1 insert an object with a positive float value', async () => {
      const objClass = await conn.getDbObjectClass(TYPE_BINARY_FLOAT);
      const objData = { TESTFLOAT: 123.45 };
      const testObj = new objClass(objData);

      const sql = `INSERT INTO ${TABLE_BINARY_FLOAT} VALUES (:1, :2)`;
      const id = 301;

      const result = await conn.execute(sql, [id, testObj]);
      assert.strictEqual(result.rowsAffected, 1);

      const query = `SELECT * FROM ${TABLE_BINARY_FLOAT} WHERE ID = :id`;
      const fetchedResult = await conn.execute(query, [id]);
      assert.strictEqual(fetchedResult.rows[0][1].TESTFLOAT, 123.44999694824219);
    }); // 200.3.1

    it('200.3.2 insert an object with a negative float value', async () => {
      const objClass = await conn.getDbObjectClass(TYPE_BINARY_FLOAT);
      const objData = { TESTFLOAT: -987.65 };
      const testObj = new objClass(objData);

      const sql = `INSERT INTO ${TABLE_BINARY_FLOAT} VALUES (:1, :2)`;
      const id = 302;

      const result = await conn.execute(sql, [id, testObj]);
      assert.strictEqual(result.rowsAffected, 1);

      const query = `SELECT * FROM ${TABLE_BINARY_FLOAT} WHERE ID = :id`;
      const fetchedResult = await conn.execute(query, [id]);
      assert.strictEqual(fetchedResult.rows[0][1].TESTFLOAT, -987.6500244140625);
    }); // 200.3.2

    it('200.3.3 insert an object with null float value', async () => {
      const objClass = await conn.getDbObjectClass(TYPE_BINARY_FLOAT);
      const objData = { TESTFLOAT: null };
      const testObj = new objClass(objData);

      const sql = `INSERT INTO ${TABLE_BINARY_FLOAT} VALUES (:1, :2)`;
      const id = 303;

      const result = await conn.execute(sql, [id, testObj]);
      assert.strictEqual(result.rowsAffected, 1);

      const query = `SELECT * FROM ${TABLE_BINARY_FLOAT} WHERE ID = :id`;
      const fetchedResult = await conn.execute(query, [id]);
      assert.strictEqual(fetchedResult.rows[0][1].TESTFLOAT, null);
    }); // 200.3.3

    it('200.3.4 handle extreme float values (Infinity)', async () => {
      const objClass = await conn.getDbObjectClass(TYPE_BINARY_FLOAT);
      const objData = { TESTFLOAT: Number.POSITIVE_INFINITY };
      const testObj = new objClass(objData);

      const sql = `INSERT INTO ${TABLE_BINARY_FLOAT} VALUES (:1, :2)`;
      const id = 304;

      const result = await conn.execute(sql, [id, testObj]);
      assert.strictEqual(result.rowsAffected, 1);

      const query = `SELECT * FROM ${TABLE_BINARY_FLOAT} WHERE ID = :id`;
      const fetchedResult = await conn.execute(query, [id]);
      assert.strictEqual(fetchedResult.rows[0][1].TESTFLOAT, Infinity);
    }); // 200.3.4

    it('200.3.5 handle extreme float values (-Infinity)', async () => {
      const objClass = await conn.getDbObjectClass(TYPE_BINARY_FLOAT);
      const objData = { TESTFLOAT: Number.NEGATIVE_INFINITY };
      const testObj = new objClass(objData);

      const sql = `INSERT INTO ${TABLE_BINARY_FLOAT} VALUES (:1, :2)`;
      const id = 305;

      const result = await conn.execute(sql, [id, testObj]);
      assert.strictEqual(result.rowsAffected, 1);

      const query = `SELECT * FROM ${TABLE_BINARY_FLOAT} WHERE ID = :id`;
      const fetchedResult = await conn.execute(query, [id]);
      assert.strictEqual(fetchedResult.rows[0][1].TESTFLOAT, -Infinity);
    }); // 200.3.5

    it('200.3.6 handle NaN (Not-a-Number)', async () => {
      const objClass = await conn.getDbObjectClass(TYPE_BINARY_FLOAT);
      const objData = { TESTFLOAT: NaN };
      const testObj = new objClass(objData);

      const sql = `INSERT INTO ${TABLE_BINARY_FLOAT} VALUES (:1, :2)`;
      const id = 306;

      const result = await conn.execute(sql, [id, testObj]);
      assert.strictEqual(result.rowsAffected, 1);

      const query = `SELECT * FROM ${TABLE_BINARY_FLOAT} WHERE ID = :id`;
      const fetchedResult = await conn.execute(query, [id]);
      assert.ok(Number.isNaN(fetchedResult.rows[0][1].TESTFLOAT));
    }); // 200.3.6

    it('200.3.7 handle undefined and default values', async () => {
      const objClass = await conn.getDbObjectClass(TYPE_BINARY_FLOAT);

      // Test with undefined value
      const objDataUndefined = { TESTFLOAT: undefined };
      const testObjUndefined = new objClass(objDataUndefined);

      const sqlUndefined = `INSERT INTO ${TABLE_BINARY_FLOAT} VALUES (:1, :2)`;
      const idUndefined = 4090;

      const resultUndefined = await conn.execute(sqlUndefined, [idUndefined, testObjUndefined]);
      assert.strictEqual(resultUndefined.rowsAffected, 1);

      const queryUndefined = `SELECT * FROM ${TABLE_BINARY_FLOAT} WHERE ID = :id`;
      const fetchedResultUndefined = await conn.execute(queryUndefined, [idUndefined]);

      assert.strictEqual(fetchedResultUndefined.rows[0][1].TESTFLOAT, null);

      // Test with empty object
      const objDataEmpty = {};
      const testObjEmpty = new objClass(objDataEmpty);

      const sqlEmpty = `INSERT INTO ${TABLE_BINARY_FLOAT} VALUES (:1, :2)`;
      const idEmpty = 411;

      const resultEmpty = await conn.execute(sqlEmpty, [idEmpty, testObjEmpty]);
      assert.strictEqual(resultEmpty.rowsAffected, 1);

      const queryEmpty = `SELECT * FROM ${TABLE_BINARY_FLOAT} WHERE ID = :id`;
      const fetchedResultEmpty = await conn.execute(queryEmpty, [idEmpty]);

      assert.strictEqual(fetchedResultEmpty.rows[0][1].TESTFLOAT, null);
    }); // 200.3.7
  });

  describe('200.4 Binary Double property', function() {
    let conn;
    const TYPE_BINARY_DOUBLE = 'NODB_TYP_OBJ_BINARY_DOUBLE';
    const TABLE_BINARY_DOUBLE = 'NODB_TAB_OBJ_BINARY_DOUBLE';

    const typeSql = `
    CREATE OR REPLACE TYPE ${TYPE_BINARY_DOUBLE} AS OBJECT (
      TESTDOUBLE BINARY_DOUBLE
    )`;

    const tableSql = `
    CREATE TABLE ${TABLE_BINARY_DOUBLE} (
      ID NUMBER,
      DATA ${TYPE_BINARY_DOUBLE}
    )`;

    before(async () => {
      conn = await oracledb.getConnection(dbConfig);
      await conn.execute(typeSql);
      const plsql = testsUtil.sqlCreateTable(TABLE_BINARY_DOUBLE, tableSql);
      await conn.execute(plsql);
    });

    after(async () => {
      await conn.execute(testsUtil.sqlDropTable(TABLE_BINARY_DOUBLE));
      const sql = `DROP TYPE ${TYPE_BINARY_DOUBLE}`;
      await conn.execute(sql);

      await conn.close();
    });

    it('200.4.1 insert an object with a positive double value', async () => {
      const objClass = await conn.getDbObjectClass(TYPE_BINARY_DOUBLE);
      const objData = { TESTDOUBLE: 123456.7890123 };
      const testObj = new objClass(objData);

      const sql = `INSERT INTO ${TABLE_BINARY_DOUBLE} VALUES (:1, :2)`;
      const id = 401;

      const result = await conn.execute(sql, [id, testObj]);
      assert.strictEqual(result.rowsAffected, 1);

      const query = `SELECT * FROM ${TABLE_BINARY_DOUBLE} WHERE ID = :id`;
      const fetchedResult = await conn.execute(query, [id]);
      assert.strictEqual(fetchedResult.rows[0][1].TESTDOUBLE, 123456.7890123);
    }); // 200.4.1

    it('200.4.2 insert an object with a negative double value', async () => {
      const objClass = await conn.getDbObjectClass(TYPE_BINARY_DOUBLE);
      const objData = { TESTDOUBLE: -987654.321 };
      const testObj = new objClass(objData);

      const sql = `INSERT INTO ${TABLE_BINARY_DOUBLE} VALUES (:1, :2)`;
      const id = 402;

      const result = await conn.execute(sql, [id, testObj]);
      assert.strictEqual(result.rowsAffected, 1);

      const query = `SELECT * FROM ${TABLE_BINARY_DOUBLE} WHERE ID = :id`;
      const fetchedResult = await conn.execute(query, [id]);
      assert.strictEqual(fetchedResult.rows[0][1].TESTDOUBLE, -987654.321);
    }); // 200.4.2

    it('200.4.3 insert an object with null double value', async () => {
      const objClass = await conn.getDbObjectClass(TYPE_BINARY_DOUBLE);
      const objData = { TESTDOUBLE: null };
      const testObj = new objClass(objData);

      const sql = `INSERT INTO ${TABLE_BINARY_DOUBLE} VALUES (:1, :2)`;
      const id = 403;

      const result = await conn.execute(sql, [id, testObj]);
      assert.strictEqual(result.rowsAffected, 1);

      const query = `SELECT * FROM ${TABLE_BINARY_DOUBLE} WHERE ID = :id`;
      const fetchedResult = await conn.execute(query, [id]);
      assert.strictEqual(fetchedResult.rows[0][1].TESTDOUBLE, null);
    }); // 200.4.3

    it('200.4.4 handle extreme double values (Infinity)', async () => {
      const objClass = await conn.getDbObjectClass(TYPE_BINARY_DOUBLE);
      const objData = { TESTDOUBLE: Number.POSITIVE_INFINITY };
      const testObj = new objClass(objData);

      const sql = `INSERT INTO ${TABLE_BINARY_DOUBLE} VALUES (:1, :2)`;
      const id = 404;

      const result = await conn.execute(sql, [id, testObj]);
      assert.strictEqual(result.rowsAffected, 1);

      const query = `SELECT * FROM ${TABLE_BINARY_DOUBLE} WHERE ID = :id`;
      const fetchedResult = await conn.execute(query, [id]);
      assert.strictEqual(fetchedResult.rows[0][1].TESTDOUBLE, Infinity);
    }); // 200.4.4

    it('200.4.5 handle extreme double values (-Infinity)', async () => {
      const objClass = await conn.getDbObjectClass(TYPE_BINARY_DOUBLE);
      const objData = { TESTDOUBLE: Number.NEGATIVE_INFINITY };
      const testObj = new objClass(objData);

      const sql = `INSERT INTO ${TABLE_BINARY_DOUBLE} VALUES (:1, :2)`;
      const id = 405;

      const result = await conn.execute(sql, [id, testObj]);
      assert.strictEqual(result.rowsAffected, 1);

      const query = `SELECT * FROM ${TABLE_BINARY_DOUBLE} WHERE ID = :id`;
      const fetchedResult = await conn.execute(query, [id]);
      assert.strictEqual(fetchedResult.rows[0][1].TESTDOUBLE, -Infinity);
    }); // 200.4.5

    it('200.4.6 handle NaN (Not-a-Number)', async () => {
      const objClass = await conn.getDbObjectClass(TYPE_BINARY_DOUBLE);
      const objData = { TESTDOUBLE: NaN };
      const testObj = new objClass(objData);

      const sql = `INSERT INTO ${TABLE_BINARY_DOUBLE} VALUES (:1, :2)`;
      const id = 406;

      const result = await conn.execute(sql, [id, testObj]);
      assert.strictEqual(result.rowsAffected, 1);

      const query = `SELECT * FROM ${TABLE_BINARY_DOUBLE} WHERE ID = :id`;
      const fetchedResult = await conn.execute(query, [id]);
      assert.ok(Number.isNaN(fetchedResult.rows[0][1].TESTDOUBLE));
    }); // 200.4.6

    it('200.4.7 test very large and very small double values', async () => {
      const objClass = await conn.getDbObjectClass(TYPE_BINARY_DOUBLE);
      const testValues = [
        Number.MAX_VALUE,
        Number.MIN_VALUE,
        1.7976931348623157e+308,  // Max double value
        5e-324                    // Smallest possible double value
      ];

      for (let i = 0; i < testValues.length; i++) {
        const objData = { TESTDOUBLE: testValues[i] };
        const testObj = new objClass(objData);

        const sql = `INSERT INTO ${TABLE_BINARY_DOUBLE} VALUES (:1, :2)`;
        const id = 407 + i;

        const result = await conn.execute(sql, [id, testObj]);
        assert.strictEqual(result.rowsAffected, 1);

        const query = `SELECT * FROM ${TABLE_BINARY_DOUBLE} WHERE ID = :id`;
        const fetchedResult = await conn.execute(query, [id]);
        assert.strictEqual(fetchedResult.rows[0][1].TESTDOUBLE, testValues[i]);
      }
    }); // 200.4.7

    it('200.4.8 create an object with multiple attributes including binary_double', async () => {
      const TYPE_MULTI_DOUBLE = 'NODB_TYP_OBJ_MULTI_DOUBLE';
      const TABLE_MULTI_DOUBLE = 'NODB_TAB_OBJ_MULTI_DOUBLE';

      // Create a object type with multiple attributes
      await conn.execute(`
      CREATE OR REPLACE TYPE ${TYPE_MULTI_DOUBLE} AS OBJECT (
        TEMPERATURE BINARY_DOUBLE,
        PRESSURE BINARY_DOUBLE,
        DESCRIPTION VARCHAR2(100)
      )
    `);

      const sql = `CREATE TABLE ${TABLE_MULTI_DOUBLE} (
                  ID NUMBER,
                  DATA ${TYPE_MULTI_DOUBLE}
                )`;
      const plsql = testsUtil.sqlCreateTable(TABLE_MULTI_DOUBLE, sql);
      await conn.execute(plsql);

      try {
        const objClass = await conn.getDbObjectClass(TYPE_MULTI_DOUBLE);
        const objData = {
          TEMPERATURE: 98.6,
          PRESSURE: 1013.25,
          DESCRIPTION: 'Standard conditions'
        };
        const testObj = new objClass(objData);

        const sql = `INSERT INTO ${TABLE_MULTI_DOUBLE} VALUES (:1, :2)`;
        const id = 4080;

        const result = await conn.execute(sql, [id, testObj]);
        assert.strictEqual(result.rowsAffected, 1);

        const query = `SELECT * FROM ${TABLE_MULTI_DOUBLE} WHERE ID = :id`;
        const fetchedResult = await conn.execute(query, [id]);

        assert.strictEqual(fetchedResult.rows[0][1].TEMPERATURE, 98.6);
        assert.strictEqual(fetchedResult.rows[0][1].PRESSURE, 1013.25);
        assert.strictEqual(fetchedResult.rows[0][1].DESCRIPTION, 'Standard conditions');
      } finally {
      // Clean up
        await conn.execute(testsUtil.sqlDropTable(TABLE_MULTI_DOUBLE));
        await conn.execute(`DROP TYPE ${TYPE_MULTI_DOUBLE}`);
      }
    }); // 200.4.8

    it('200.4.9 handle undefined and default values', async () => {
      const objClass = await conn.getDbObjectClass(TYPE_BINARY_DOUBLE);

      // Test with undefined value
      const objDataUndefined = { TESTDOUBLE: undefined };
      const testObjUndefined = new objClass(objDataUndefined);

      const sqlUndefined = `INSERT INTO ${TABLE_BINARY_DOUBLE} VALUES (:1, :2)`;
      const idUndefined = 4090;

      const resultUndefined = await conn.execute(sqlUndefined, [idUndefined, testObjUndefined]);
      assert.strictEqual(resultUndefined.rowsAffected, 1);

      const queryUndefined = `SELECT * FROM ${TABLE_BINARY_DOUBLE} WHERE ID = :id`;
      const fetchedResultUndefined = await conn.execute(queryUndefined, [idUndefined]);

      assert.strictEqual(fetchedResultUndefined.rows[0][1].TESTDOUBLE, null);

      // Test with empty object
      const objDataEmpty = {};
      const testObjEmpty = new objClass(objDataEmpty);

      const sqlEmpty = `INSERT INTO ${TABLE_BINARY_DOUBLE} VALUES (:1, :2)`;
      const idEmpty = 411;

      const resultEmpty = await conn.execute(sqlEmpty, [idEmpty, testObjEmpty]);
      assert.strictEqual(resultEmpty.rowsAffected, 1);

      const queryEmpty = `SELECT * FROM ${TABLE_BINARY_DOUBLE} WHERE ID = :id`;
      const fetchedResultEmpty = await conn.execute(queryEmpty, [idEmpty]);

      assert.strictEqual(fetchedResultEmpty.rows[0][1].TESTDOUBLE, null);
    }); // 200.4.8
  }); // 200.4
});

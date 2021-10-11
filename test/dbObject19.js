/* Copyright (c) 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   243. dbObject19.js
 *
 * DESCRIPTION
 *   Test fetching database objects as POJOs (Plain Old JavaScript Objects).
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('243. dbObject19.js', () => {
  let conn;
  const TYPE = 'NODB_PERSON_T';

  before(async () => {
    // default value of oracledb.dbObjectAsPojo should be false
    assert.strictEqual(oracledb.dbObjectAsPojo, false);
    // set oracledb.dbObjectAsPojo to true
    oracledb.dbObjectAsPojo = true;

    try {
      conn = await oracledb.getConnection(dbconfig);

      const sql =
        `CREATE OR REPLACE TYPE ${TYPE} AS OBJECT (
          id NUMBER,
          name VARCHAR2(30)
        );`;
      await conn.execute(sql);

    } catch (err) {
      assert.fail(err);
    }
  }); // before()

  after(async () => {
    try {

      const sql = `DROP TYPE ${TYPE} FORCE`;
      await conn.execute(sql);

      await conn.close();
    } catch (err) {
      assert.fail(err);
    }

    // restore dbObjectAsPojo to default value
    oracledb.dbObjectAsPojo = false;
    assert.strictEqual(oracledb.dbObjectAsPojo, false);
  }); // after()

  describe('243.1 set global attribute oracledb.dbObjectAsPojo to true', () => {

    it('243.1.1 OUT bind DB Object ', async () => {
      try {
        const PROC = 'nodb_proc_test2431';
        let plsql = `
          CREATE OR REPLACE PROCEDURE ${PROC}
            (a OUT ${TYPE}) AS
          BEGIN
            a := ${TYPE} (101, 'Test User 1');
          END;
        `;
        await conn.execute(plsql);

        const CLS = await conn.getDbObjectClass(TYPE);
        plsql = `BEGIN ${PROC}( :out ); END;`;
        const bindVar = { out: { type: CLS, dir: oracledb.BIND_OUT } };
        const result = await conn.execute(plsql, bindVar, { outFormat: oracledb.OBJECT  });

        const outData = result.outBinds.out;
        // console.dir(outData);
        assert.deepEqual(outData, { ID: 101, NAME: 'Test User 1' });

        const sql = `DROP PROCEDURE ${PROC}`;
        await conn.execute(sql);

      } catch (err) {
        assert.fail(err);
      }
    }); // 243.1.1

    it('243.1.2 IN OUT bind DB Object', async () => {
      try {
        const TABLE = 'nodb_tab_test2432';
        let sql = `
          CREATE TABLE ${TABLE} (
            num NUMBER,
            person ${TYPE}
          )
        `;
        let plsql = testsUtil.sqlCreateTable(TABLE, sql);
        await conn.execute(plsql);

        sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
        const objData1 = {
          ID: 201,
          NAME: 'John Smith'
        };
        const CLS = await conn.getDbObjectClass(TYPE);
        let testObj = new CLS(objData1);

        const seqOne = 1;
        let result = await conn.execute(sql, [seqOne, testObj]);
        assert.strictEqual(result.rowsAffected, 1);

        const PROC = 'nodb_proc_test2432';
        plsql = `
          CREATE OR REPLACE PROCEDURE ${PROC}
            (i IN NUMBER, a IN OUT ${TYPE}) AS
          BEGIN
             INSERT INTO ${TABLE} (num, person) VALUES (i, a);
             SELECT person INTO a FROM ${TABLE} WHERE num = ${seqOne};
          END;
        `;
        await conn.execute(plsql);

        const objData2 = {
          ID: 101,
          NAME: 'Test User 2'
        };
        testObj = new CLS(objData2);
        const seqTwo = 23;
        plsql = `BEGIN ${PROC} (:i, :a); END;`;
        const bindVar = {
          i: seqTwo,
          a: { type: CLS, dir: oracledb.BIND_INOUT, val: testObj }
        };
        result = await conn.execute(plsql, bindVar, { outFormat: oracledb.OBJECT });
        // Verify the OUT-bind value of the IN-OUT-bind variable
        // console.dir(result.outBinds.a);
        assert.deepEqual(result.outBinds.a, objData1);

        sql = `SELECT * FROM ${TABLE} WHERE NUM = ${seqTwo}`;
        result = await conn.execute(sql, [], { outFormat: oracledb.OBJECT });
        // Verify the IN-bind value of the IN-OUT-bind variable
        // console.dir(result.rows[0]);
        assert.strictEqual(result.rows[0].NUM, seqTwo);
        assert.deepEqual(result.rows[0].PERSON, objData2);

        sql = `DROP PROCEDURE ${PROC}`;
        await conn.execute(sql);

        sql = `DROP TABLE ${TABLE} PURGE`;
        await conn.execute(sql);
      } catch (err) {
        assert.fail(err);
      }
    }); // 243.1.2

  });

  describe('243.2 set dbObjectAsPojo in BIND_OUT and BIND_INOUT options', () => {

    before(function() {
      assert.strictEqual(oracledb.dbObjectAsPojo, true);
      // set oracledb.dbObjectAsPojo to false;
      oracledb.dbObjectAsPojo = false;
    }); // before()

    after(function() {
      // restore dbObjectAsPojo to default value
      oracledb.dbObjectAsPojo = false;
    }); // after()

    it('243.2.1 OUT bind DB Object ', async () => {
      try {
        const PROC = 'nodb_proc_test2431';
        let plsql = `
          CREATE OR REPLACE PROCEDURE ${PROC}
            (a OUT ${TYPE}) AS
          BEGIN
            a := ${TYPE} (101, 'Test User 1');
          END;
        `;
        await conn.execute(plsql);

        const CLS = await conn.getDbObjectClass(TYPE);
        plsql = `BEGIN ${PROC}( :out ); END;`;
        const bindVar = { out: { type: CLS, dir: oracledb.BIND_OUT } };
        const result = await conn.execute(plsql, bindVar, { dbObjectAsPojo: true, outFormat: oracledb.OBJECT  });

        const outData = result.outBinds.out;
        // console.dir(outData);
        assert.deepEqual(outData, { ID: 101, NAME: 'Test User 1' });

        const sql = `DROP PROCEDURE ${PROC}`;
        await conn.execute(sql);

      } catch (err) {
        assert.fail(err);
      }
    }); // 243.2.1

    it('243.2.2 IN OUT bind DB Object', async () => {
      try {
        const TABLE = 'nodb_tab_test2432';
        let sql = `
          CREATE TABLE ${TABLE} (
            num NUMBER,
            person ${TYPE}
          )
        `;
        let plsql = testsUtil.sqlCreateTable(TABLE, sql);
        await conn.execute(plsql);

        sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;
        const objData1 = {
          ID: 201,
          NAME: 'John Smith'
        };
        const CLS = await conn.getDbObjectClass(TYPE);
        let testObj = new CLS(objData1);

        const seqOne = 1;
        let result = await conn.execute(sql, [seqOne, testObj]);
        assert.strictEqual(result.rowsAffected, 1);

        const PROC = 'nodb_proc_test2432';
        plsql = `
          CREATE OR REPLACE PROCEDURE ${PROC}
            (i IN NUMBER, a IN OUT ${TYPE}) AS
          BEGIN
             INSERT INTO ${TABLE} (num, person) VALUES (i, a);
             SELECT person INTO a FROM ${TABLE} WHERE num = ${seqOne};
          END;
        `;
        await conn.execute(plsql);

        const objData2 = {
          ID: 101,
          NAME: 'Test User 2'
        };
        testObj = new CLS(objData2);
        const seqTwo = 23;
        plsql = `BEGIN ${PROC} (:i, :a); END;`;
        const bindVar = {
          i: seqTwo,
          a: { type: CLS, dir: oracledb.BIND_INOUT, val: testObj }
        };
        result = await conn.execute(plsql, bindVar, { dbObjectAsPojo: true, outFormat: oracledb.OBJECT });
        // Verify the OUT-bind value of the IN-OUT-bind variable
        // console.dir(result.outBinds.a);
        assert.deepEqual(result.outBinds.a, objData1);

        sql = `SELECT * FROM ${TABLE} WHERE NUM = ${seqTwo}`;
        result = await conn.execute(sql, [], { dbObjectAsPojo: true, outFormat: oracledb.OBJECT });
        // Verify the IN-bind value of the IN-OUT-bind variable
        // console.dir(result.rows[0]);
        assert.strictEqual(result.rows[0].NUM, seqTwo);
        assert.deepEqual(result.rows[0].PERSON, objData2);

        sql = `DROP PROCEDURE ${PROC}`;
        await conn.execute(sql);

        sql = `DROP TABLE ${TABLE} PURGE`;
        await conn.execute(sql);
      } catch (err) {
        assert.fail(err);
      }
    }); // 243.2.2

  });

  describe('243.3 set dbObjectAsPojo in bind variables doesn\'t work', () => {
    before(function() {
      assert.strictEqual(oracledb.dbObjectAsPojo, false);
      // set oracledb.dbObjectAsPojo to true
      oracledb.dbObjectAsPojo = false;
    }); // before()

    after(function() {
      // restore dbObjectAsPojo to default value
      oracledb.dbObjectAsPojo = false;
      assert.strictEqual(oracledb.dbObjectAsPojo, false);
    }); // after()

    it('243.3.1 OUT bind DB Object ', async () => {
      try {
        const PROC = 'nodb_proc_test2431';
        let plsql = `
          CREATE OR REPLACE PROCEDURE ${PROC}
            (a OUT ${TYPE}) AS
          BEGIN
            a := ${TYPE} (103, 'Test User 2');
          END;
        `;
        await conn.execute(plsql);

        const CLS = await conn.getDbObjectClass(TYPE);
        plsql = `BEGIN ${PROC}( :out ); END;`;
        const bindVar = { out: { type: CLS, dir: oracledb.BIND_OUT, dbObjectAsPojo: true } };
        const result = await conn.execute(plsql, bindVar, { outFormat: oracledb.OBJECT  });

        const outData = result.outBinds.out;
        // console.dir(outData);
        assert.strictEqual(outData['ID'], 103);
        assert.strictEqual(outData['NAME'], 'Test User 2');
        assert.strictEqual(typeof (outData), 'object');

        const sql = `DROP PROCEDURE ${PROC}`;
        await conn.execute(sql);

      } catch (err) {
        assert.fail(err);
      }
    }); // 243.3.1

  });


});

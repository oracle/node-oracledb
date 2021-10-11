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
 *   206. dbObject7.js
 *
 * DESCRIPTION
 *   Test DB Object data bind OUT and IN OUT.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('206. dbObject7.js', () => {
  let conn;
  const TYPE = 'NODB_PERSON_T';

  before(async () => {
    try {
      conn = await oracledb.getConnection(dbconfig);

      let sql =
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

      let sql = `DROP TYPE ${TYPE} FORCE`;
      await conn.execute(sql);

      await conn.close();
    } catch (err) {
      assert.fail(err);
    }
  }); // after()

  it('206.1 OUT bind DB Object', async () => {
    try {
      const PROC = 'nodb_proc_test2061';
      let plsql = `
        CREATE OR REPLACE PROCEDURE ${PROC}
          (a OUT ${TYPE}) AS
        BEGIN
          a := ${TYPE} (101, 'Christopher Jones');
        END;
      `;
      await conn.execute(plsql);

      const CLS = await conn.getDbObjectClass(TYPE);
      plsql = `BEGIN ${PROC}( :out ); END;`;
      const bindVar = { out: { type: CLS, dir: oracledb.BIND_OUT } };
      const result = await conn.execute(plsql, bindVar);
      const outData = result.outBinds.out;
      assert.strictEqual(outData['ID'], 101);
      assert.strictEqual(outData['NAME'], 'Christopher Jones');

      const sql = `DROP PROCEDURE ${PROC}`;
      await conn.execute(sql);

    } catch (err) {
      assert.fail(err);
    }
  }); // 206.1

  it('206.2 IN OUT bind DB Object', async () => {
    try {
      const TABLE = 'nodb_tab_test2062';
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

      const PROC = 'nodb_proc_test2062';
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
        NAME: 'Changjie Lin'
      };
      testObj = new CLS(objData2);
      const seqTwo = 23;
      plsql = `BEGIN ${PROC} (:i, :a); END;`;
      const bindVar = {
        i: seqTwo,
        a: { type: CLS, dir: oracledb.BIND_INOUT, val: testObj }
      };
      result = await conn.execute(plsql, bindVar);
      // Verify the OUT-bind value of the IN-OUT-bind variable
      assert.strictEqual(result.outBinds.a.ID, objData1.ID);
      assert.strictEqual(result.outBinds.a['NAME'], objData1.NAME);

      sql = `SELECT * FROM ${TABLE} WHERE NUM = ${seqTwo}`;
      result = await conn.execute(sql);
      // Verify the IN-bind value of the IN-OUT-bind variable
      assert.strictEqual(result.rows[0][0], seqTwo);
      assert.strictEqual(result.rows[0][1]['ID'], objData2.ID);
      assert.strictEqual(result.rows[0][1]['NAME'], objData2.NAME);

      sql = `DROP PROCEDURE ${PROC}`;
      await conn.execute(sql);

      sql = `DROP TABLE ${TABLE} PURGE`;
      await conn.execute(sql);
    } catch (err) {
      assert.fail(err);
    }
  }); // 206.2
});

/* Copyright (c) 2019, 2022, Oracle and/or its affiliates. */

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
 *   210. dbObject11.js
 *
 * DESCRIPTION
 *   The attribute names of DB Objects contain special characters.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('210. dbObject11.js', () => {

  let conn;
  const TYPE = 'NODB_RV_FIELD_TYP';
  const TABLE = 'NODB_TAB_MYOTAB';

  before(async () => {
    try {
      conn = await oracledb.getConnection(dbconfig);

      let sql = `
        CREATE OR REPLACE TYPE ${TYPE} AS OBJECT (
          field_name     VARCHAR2(20),
          number$$value  NUMBER,
          number##value  NUMBER,
          "hi &coder"     VARCHAR2(20)
        );`;
      await conn.execute(sql);

      sql = `
        CREATE TABLE ${TABLE} (
          c1 ${TYPE}
        )`;
      const plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

      sql = `INSERT INTO ${TABLE} VALUES (:a)`;
      const binds = {
        a: {
          type: TYPE,
          val: {
            FIELD_NAME: 'abc',
            NUMBER$$VALUE: 123,
            'NUMBER##VALUE': 456,
            'hi &coder': 'node-oracledb'
          }
        }
      };
      const result = await conn.execute(sql, binds);
      assert.strictEqual(result.rowsAffected, 1);

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

  it('210.1 Attribute names with embedded "$", "#", "&" and spaces', async () => {
    try {
      const query = `SELECT * FROM ${TABLE}`;
      const opts = { outFormat: oracledb.OBJECT };
      const result = await conn.execute(query, [], opts);

      assert.strictEqual(result.rows[0].C1.NUMBER$$VALUE, 123);
      assert.strictEqual(result.rows[0].C1['NUMBER##VALUE'], 456);
      assert.strictEqual(result.rows[0].C1['hi &coder'], 'node-oracledb');

    } catch (err) {
      assert.fail(err);
    }
  }); // 210.1
});

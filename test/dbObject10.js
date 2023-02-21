/* Copyright (c) 2019, 2022, Oracle and/or its affiliates. */

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
 *   209. dbObject10.js
 *
 * DESCRIPTION
 *   DB Objects contain PL/SQL methods.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('209. dbObject10.js', () => {

  let conn;
  const TYPE = 'NODB_PERSON_TYP';
  const TABLE = 'NODB_TAB_CONTACTS';
  const t_idno = 65;

  before(async () => {
    try {
      conn = await oracledb.getConnection(dbconfig);

      let plsql = `
        CREATE OR REPLACE TYPE ${TYPE} AS OBJECT (
          idno         NUMBER,
          first_name   VARCHAR2(20),
          last_name    VARCHAR2(25),
          email        VARCHAR2(25),
          phone        VARCHAR2(20),
          MAP MEMBER FUNCTION get_idno RETURN NUMBER
        );`;
      await conn.execute(plsql);

      plsql = `
        CREATE OR REPLACE TYPE BODY ${TYPE} AS
          MAP MEMBER FUNCTION get_idno RETURN NUMBER IS
          BEGIN
            RETURN idno;
          END;
        END;
      `;
      await conn.execute(plsql);

      let sql = `
        CREATE TABLE ${TABLE} (
          contact        ${TYPE},
          contact_date   DATE
        )
      `;
      plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

      sql = `
        INSERT INTO ${TABLE} VALUES (
          ${TYPE} (${t_idno}, 'Verna', 'Mills', 'vmills@example.com', '1-650-555-0125'),
          to_date('24 June 2003', 'dd Mon YYYY')
        )
      `;
      await conn.execute(sql);
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

  it('209.1 DB Objects which contain PL/SQL methods', async () => {
    try {
      const sql = `SELECT c.contact.get_idno() FROM ${TABLE} c`;
      const result = await conn.execute(sql);
      assert.strictEqual(result.rows[0][0], t_idno);
    } catch (err) {
      assert.fail(err);
    }
  }); // 209.1

  it('209.2 By default, JavaScript Object toString() returns "[object type]"', async () => {
    try {
      const result = await conn.execute(`SELECT contact FROM ${TABLE}`);
      const dbObj = result.rows[0][0];

      let expect = `[object ${dbconfig.user.toUpperCase()}.${TYPE}]`;
      assert.strictEqual(dbObj.toString(), expect);

      expect = '[object Object]';
      assert.strictEqual(dbObj._toPojo().toString(), expect);
    } catch (err) {
      assert.fail(err);
    }
  }); // 209.2

  it('209.3 The Object literal and JSON.stringify()', async () => {
    try {
      const result = await conn.execute(`SELECT contact FROM ${TABLE}`);
      const dbObj = result.rows[0][0];

      const schema = dbconfig.user.toUpperCase();
      let expect = `x[${schema}.NODB_PERSON_TYP] { IDNO: 65, FIRST_NAME: 'Verna',  LAST_NAME: 'Mills',  EMAIL: 'vmills@example.com', PHONE: '1-650-555-0125' }`;
      expect = expect.trim().replace(/[\s\n\r]/g, '');

      let actual = 'x' + dbObj;
      actual = actual.trim().replace(/[\s\n\r]/g, '');
      assert.strictEqual(actual, expect);

      expect = '{"IDNO":65,"FIRST_NAME":"Verna","LAST_NAME":"Mills","EMAIL":"vmills@example.com","PHONE":"1-650-555-0125"}';
      actual = JSON.stringify(dbObj);
      assert.strictEqual(actual, expect);
    } catch (err) {
      assert.fail(err);
    }
  }); // 209.3
});

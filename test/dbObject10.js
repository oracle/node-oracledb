/* Copyright (c) 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   209. dbObject10.js
 *
 * DESCRIPTION
 *   DB Objects contain PL/SQL methods.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
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

      let plsql =`
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

  it('209.1 DB Objects which contain PL/SQL methods', async () => {
    try {
      let sql = `SELECT c.contact.get_idno() FROM ${TABLE} c`;
      let result = await conn.execute(sql);
      should.strictEqual(result.rows[0][0], t_idno);
    } catch(err) {
      should.not.exist(err);
    }
  }); // 209.1
});

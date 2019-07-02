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
 *   208. dbObject9.js
 *
 * DESCRIPTION
 *   REF Cursors and Implicit Results that fetch DbObjects.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('208. dbObject9.js', () => {

  let conn;
  const TYPE = 'NODB_PERSON_T';
  const TABLE = 'NODB_TAB_EMPLOYEES';
  const PEOPLE = [
    { ID: 123, NAME: 'Alice', GENDER: 'Female' },
    { ID: 234, NAME: 'Bob', GENDER: 'Male' },
    { ID: 345, NAME: 'Charlie', GENDER: 'Male' },
    { ID: 456, NAME: 'Dolores', GENDER: 'Female' }
  ];

  before(async() => {
    try {
      conn = await oracledb.getConnection(dbconfig);

      let sql =
        `CREATE OR REPLACE TYPE ${TYPE} AS OBJECT (
          id     NUMBER,
          name   VARCHAR2(30),
          gender VARCHAR2(20)
        );`;
      await conn.execute(sql);

      sql =
        `CREATE TABLE ${TABLE} (
          empnum NUMBER,
          person ${TYPE}
        )`;
      let plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

      const PersonType = await conn.getDbObjectClass(TYPE);
      let bindArr = [];
      for (let i = 0, num, p; i < PEOPLE.length; i++) {
        num = i + 1;
        p = new PersonType(PEOPLE[i]);
        bindArr[i] = [num, p];
      }
      let opts = {
        autoCommit: true,
        bindDefs: [ { type: oracledb.NUMBER }, { type: PersonType } ]
      };
      let result = await conn.executeMany(
        `INSERT INTO ${TABLE} VALUES (:1, :2)`,
        bindArr,
        opts
      );
      //console.log(result);
      should.strictEqual(result.rowsAffected, PEOPLE.length);

    } catch (err) {
      should.not.exist(err);
    }
  }); // before()

  after(async() => {
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

  it('208.1 REF cursors that fetch object', async () => {
    try {

      const PROC = 'nodb_proc_getemp';
      let plsql = `
        CREATE OR REPLACE PROCEDURE ${PROC} (p_out OUT SYS_REFCURSOR)
        AS
        BEGIN
          OPEN p_out FOR
            SELECT * FROM ${TABLE};
        END;
      `;
      await conn.execute(plsql);

      plsql = `BEGIN ${PROC}(:out); END;`;
      let opts = { out: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_CURSOR } };
      let result = await conn.execute(plsql, opts);

      // Fetch rows from ResultSet
      const RS = result.outBinds.out;
      let rows = await RS.getRows(PEOPLE.length);
      for (let i = 0; i < PEOPLE.length; i++) {
        should.deepEqual(rows[i][1]._toPojo(), PEOPLE[i]);
        should.strictEqual(JSON.stringify(rows[i][1]), JSON.stringify(PEOPLE[i]));
      }
      await RS.close();

      let sql = `DROP PROCEDURE ${PROC}`;
      await conn.execute(sql);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 208.1

  const queryImpres = `
    DECLARE
      c SYS_REFCURSOR;
    BEGIN
      OPEN c FOR
        SELECT * FROM ${TABLE};

      DBMS_SQL.RETURN_RESULT(C);
    END;
  `;

  it('208.2 Implicit results that fetch objects', async () => {
    try {
      const result = await conn.execute(queryImpres);
      let rows = result.implicitResults[0];
      for (let i = 0; i < PEOPLE.length; i++) {
        should.deepEqual(rows[i][1]._toPojo(), PEOPLE[i]);
        should.strictEqual(JSON.stringify(rows[i][1]), JSON.stringify(PEOPLE[i]));
      }
    } catch (err) {
      should.not.exist(err);
    }
  }); // 208.2

  it('208.3 Implicit results that fetch objects with Result Set', async () => {
    try {
      const result = await conn.execute(queryImpres, [], { resultSet: true} );
      let rows = await result.implicitResults[0].getRows(PEOPLE.length);
      for (let i = 0; i < PEOPLE.length; i++) {
        should.deepEqual(rows[i][1]._toPojo(), PEOPLE[i]);
        should.strictEqual(JSON.stringify(rows[i][1]), JSON.stringify(PEOPLE[i]));
      }
    } catch (err) {
      should.not.exist(err);
    }
  }); // 208.3

});
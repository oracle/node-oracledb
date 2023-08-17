/* Copyright (c) 2015, 2022, Oracle and/or its affiliates. */

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
 *   10. nullColumnValues.js
 *
 * DESCRIPTION
 *    Tests to check that a NULL data value in a column is returned as a JavaScript null.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('10. nullColumnValues.js', function() {

  let connection = null;
  beforeEach('get connection & create table', async function() {
    const makeTable =
      "BEGIN \
            DECLARE \
                e_table_missing EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE nodb_nullcol_dept PURGE'); \
            EXCEPTION \
                WHEN e_table_missing \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE nodb_nullcol_dept ( \
                    department_id NUMBER,  \
                    department_name VARCHAR2(20), \
                    manager_id NUMBER, \
                    location_id NUMBER \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_nullcol_dept  \
                   VALUES \
                   (40,''Human Resources'', 203, 2400) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_nullcol_dept  \
                   VALUES \
                   (50,''Shipping'', 121, 1500) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_nullcol_dept  \
                   VALUES \
                   (90, ''Executive'', 100, 1700) \
            '); \
        END; ";

    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(makeTable);
  });

  afterEach('drop table and release connection', async function() {
    await connection.execute("DROP TABLE nodb_nullcol_dept PURGE");
    await connection.close();
  });

  it('10.1 a simple query for null value', async function() {
    assert(connection);
    let result = null;

    result = await connection.execute("SELECT null FROM DUAL");

    assert.deepStrictEqual(result.rows[0], [null]);
  });

  it('10.2 in-bind for null column value', async function() {
    assert(connection);
    let result = null;
    result = await connection.execute(
      "INSERT INTO nodb_nullcol_dept VALUES(:did, :dname, :mid, :mname)",
      {
        did: 101,
        dname: 'Facility',
        mid: '',
        mname: null
      });
    assert.strictEqual(result.rowsAffected, 1);

    result = await connection.execute(
      "SELECT * FROM nodb_nullcol_dept WHERE department_id = :did",
      { did: 101 },
      { outFormat: oracledb.OUT_FORMAT_OBJECT });

    assert.strictEqual(result.rows[0].DEPARTMENT_ID, 101);
    assert.strictEqual(result.rows[0].DEPARTMENT_NAME, 'Facility');
    assert.ifError(result.rows[0].MANAGER_ID); // null
    assert.ifError(result.rows[0].LOCATION_ID); // null
  });

  it('10.3 out-bind for null column value', async function() {
    assert(connection);
    let result = null;
    const proc = "CREATE OR REPLACE PROCEDURE nodb_testproc (p_out OUT VARCHAR2) \
                AS \
                BEGIN \
                  p_out := ''; \
                END;";
    await connection.execute(proc);
    result = await connection.execute(
      "BEGIN nodb_testproc(:o); END;",
      {
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      });
    assert.ifError(result.outBinds.o); // null
    await connection.execute("DROP PROCEDURE nodb_testproc");
  });

  it('10.4 DML Returning for null column value', async function() {
    assert(connection);
    let result = null;

    result = await connection.execute(
      "UPDATE nodb_nullcol_dept SET department_name = :dname, \
        manager_id = :mid WHERE department_id = :did \
        RETURNING department_id, department_name, manager_id INTO \
        :rdid, :rdname, :rmid",
      {
        dname: '',
        mid: null,
        did: 90,
        rdid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        rdname: { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        rmid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      },
      { autoCommit: true });

    assert.deepStrictEqual(result.outBinds, {rdid: [90], rdname: [null], rmid: [null]});
    assert.deepStrictEqual(result.outBinds.rdid, [90]);
    assert.ifError(result.outBinds.rdname[0]); // null
    assert.ifError(result.outBinds.rmid[0]);  // null
  });

  it('10.5 resultSet for null value', async function() {
    assert(connection);
    let result = null;

    await connection.execute(
      "UPDATE nodb_nullcol_dept SET department_name = :dname, \
          manager_id = :mid WHERE department_id = :did ",
      {
        dname: '',
        mid: null,
        did: 50
      },
      { autoCommit: true });
    result = await connection.execute(
      "SELECT * FROM nodb_nullcol_dept WHERE department_id = :1",
      [50],
      { resultSet: true });
    await  fetchRowFromRS(result.resultSet);

    async function fetchRowFromRS(rs) {
      let accessCount = 0;
      while (true) { // eslint-disable-line
        const row = await rs.getRow();
        if (!row)
          break;
        accessCount++;
        assert.deepStrictEqual(row, [50, null, null, 1500]);
      }
      await rs.close();
      assert.strictEqual(accessCount, 1);
    }
  });
});

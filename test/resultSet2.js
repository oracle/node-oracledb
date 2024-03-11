/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

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
 *   55. resultSet2.js
 *
 * DESCRIPTION
 *   Testing driver resultSet feature.
 *
 *****************************************************************************/
"use strict";

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('55. resultSet2.js', function() {

  let connection = null;
  const tableName = "nodb_rs2_emp";
  const rowsAmount = 300;

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('55.1 query a RDBMS function', function() {

    it('55.1.1 LPAD function', async function() {
      const result = await connection.execute(
        "select lpad('a',100,'x') from dual",
        [],
        { resultSet: true });
      const row = await result.resultSet.getRow();
      assert.strictEqual(row[0].length, 100);
      await result.resultSet.close();
    });

  }); // 55.1

  describe('55.2 binding variables', function() {
    before(async function() {
      await setUp(connection, tableName);
    });

    after(async function() {
      await clearUp(connection, tableName);
    });

    it('55.2.1 query with one binding variable', async function() {
      let rowCount = 0;
      const result = await connection.execute(
        "SELECT * FROM nodb_rs2_emp WHERE employees_id > :1",
        [200],
        { resultSet: true });
      while (true) {      // eslint-disable-line
        const row = await result.resultSet.getRow();
        if (!row)
          break;
        rowCount++;
      }
      await result.resultSet.close();
      assert.strictEqual(rowCount, 100);
    });

  }); // 55.2

  describe('55.3 alternating getRow() & getRows() function', function() {
    before(async function() {
      await setUp(connection, tableName);
    });

    after(async function() {
      await clearUp(connection, tableName);
    });

    it('55.3.1 result set', async function() {
      const numRows = 4;
      let accessCount = 0;
      let getRow = true;
      const result = await connection.execute(
        "SELECT * FROM nodb_rs2_emp WHERE employees_id > :1",
        [200],
        { resultSet: true });
      while (true) {      // eslint-disable-line
        if (getRow) {
          const row = await result.resultSet.getRow();
          if (!row)
            break;
          getRow = false;
          accessCount++;
        } else {
          const rows = await result.resultSet.getRows(numRows);
          if (rows.length === 0)
            break;
          getRow = true;
          accessCount++;
        }
      }
      await result.resultSet.close();
      assert.strictEqual(accessCount, (100 / (numRows + 1)) * 2);
    });

    it('55.3.2 REF Cursor', async function() {
      const numRows = 4;
      let accessCount = 0;
      let getRow = true;

      const result = await connection.execute(
        "BEGIN nodb_rs2_get_emp(:in, :out); END;",
        {
          in: 200,
          out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
        });
      const rs = result.outBinds.out;
      while (true) {      // eslint-disable-line
        if (getRow) {
          const row = await rs.getRow();
          if (!row)
            break;
          getRow = false;
          accessCount++;
        } else {
          const rows = await rs.getRows(numRows);
          if (rows.length === 0)
            break;
          getRow = true;
          accessCount++;
        }
      }
      await rs.close();
      assert.strictEqual(accessCount, (100 / (numRows + 1)) * 2);
    });

  }); // 55.3

  describe('55.4 automatically close result sets and LOBs when the connection is closed', function() {
    before(async function() {
      await setUp(connection, tableName);
    });

    after(async function() {
      await clearUp(connection, tableName);
    });

    let testConn = null;
    beforeEach(async function() {
      testConn = await oracledb.getConnection(dbConfig);
    });

    async function fetchRowFromRS(rs) {
      while (true) {      // eslint-disable-line
        const row = await rs.getRow();
        if (!row)
          break;
      }
      await testConn.close();
      await assert.rejects(
        async () => await rs.close(),
        /NJS-018:/
      );
    }

    it('55.4.1 resultSet gets closed automatically', async function() {
      const result = await testConn.execute(
        "SELECT * FROM nodb_rs2_emp ORDER BY employees_id",
        [],
        { resultSet: true });
      await fetchRowFromRS(result.resultSet);
    });

    it('55.4.2 REF Cursor gets closed automatically', async function() {
      const result = await testConn.execute(
        "BEGIN nodb_rs2_get_emp(:in, :out); END;",
        {
          in: 200,
          out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
        });
      await fetchRowFromRS(result.outBinds.out);
    });

  }); // 55.4

  describe('55.5 the content of resultSet should be consistent', function() {
    before(async function() {
      await setUp(connection, tableName);
    });

    after(async function() {
      await clearUp(connection, tableName);
    });

    it('55.5.1 (1) get RS (2) modify data in that table and commit (3) check RS', async function() {
      let rowsCount = 0;
      const result = await connection.execute(
        "SELECT * FROM nodb_rs2_emp ORDER BY employees_id",
        [],
        { resultSet: true });
      const rs = result.resultSet;
      await connection.execute("TRUNCATE TABLE nodb_rs2_emp");
      while (true) {      // eslint-disable-line
        const row = await rs.getRow();
        if (!row)
          break;
        rowsCount++;
      }
      assert.strictEqual(rowsCount, rowsAmount);
      await rs.close();
    });

  }); // 55.5

  describe('55.6 access resultSet simultaneously', function() {
    before(async function() {
      await setUp(connection, tableName);
    });

    after(async function() {
      await clearUp(connection, tableName);
    });

    it('55.6.1 concurrent operations on resultSet are not allowed (using getRows())', async function() {
      const result = await connection.execute(
        "SELECT * FROM nodb_rs2_emp ORDER BY employees_id",
        [],
        { resultSet: true });
      const rs = result.resultSet;
      const promises = [
        rs.getRows(),
        rs.getRows()
      ];
      const values = await Promise.allSettled(promises);
      assert.strictEqual(values[1].status, 'rejected');
      assert.match(values[1].reason.message, /NJS-017:/);
    });

    it('55.6.2 concurrent operation on REF Cursor are not allowed', async function() {
      const result = await connection.execute(
        "BEGIN nodb_rs2_get_emp(:in, :out); END;",
        {
          in: 0,
          out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
        });
      const rs = result.outBinds.out;
      const promises = [
        rs.getRows(),
        rs.getRows()
      ];
      const values = await Promise.allSettled(promises);
      assert.strictEqual(values[1].status, 'rejected');
      assert.match(values[1].reason.message, /NJS-017:/);
    });

    it('55.6.3 concurrent operations on resultSet are not allowed (using getRow())', async function() {
      const result = await connection.execute(
        "SELECT * FROM nodb_rs2_emp ORDER BY employees_id",
        [],
        { resultSet: true });
      const rs = result.resultSet;
      const promises = [
        rs.getRow(),
        rs.getRow()
      ];
      const values = await Promise.allSettled(promises);
      assert.strictEqual(values[1].status, 'rejected');
      assert.match(values[1].reason.message, /NJS-017:/);
    });

    it('55.6.4 concurrently closing resultSet not allowed', async function() {
      const result = await connection.execute(
        "SELECT * FROM nodb_rs2_emp ORDER BY employees_id",
        [],
        { resultSet: true });
      const rs = result.resultSet;
      const promises = [
        rs.close(),
        rs.close()
      ];
      const values = await Promise.allSettled(promises);
      assert.strictEqual(values[1].status, 'rejected');
      assert.match(values[1].reason.message, /NJS-017:/);
    });

  }); // 55.6

  describe('55.7 getting multiple resultSets', function() {
    before(async function() {
      await setUp(connection, tableName);
    });

    after(async function() {
      await clearUp(connection, tableName);
    });

    const numRows = 10;  // number of rows to return from each call to getRows()

    async function doQuery() {
      const result = await connection.execute(
        "SELECT * FROM nodb_rs2_emp ORDER BY employees_id",
        [],
        { resultSet: true });
      const rs = result.resultSet;
      while (true) {      // eslint-disable-line
        const rows = await rs.getRows(numRows);
        if (rows.length == 0)
          break;
      }
      await rs.close();
    }

    async function doRefCursor() {
      const result = await connection.execute(
        "BEGIN nodb_rs2_get_emp(:in, :out); END;",
        {
          in: 200,
          out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
        });
      const rs = result.outBinds.out;
      while (true) {      // eslint-disable-line
        const rows = await rs.getRows(numRows);
        if (rows.length == 0)
          break;
      }
      await rs.close();
    }

    it('55.7.1 can access multiple resultSet on one connection', async function() {
      const promises = [
        doQuery(),
        doQuery(),
      ];
      const values = await Promise.allSettled(promises);
      for (let i = 0; i < promises.length; i++) {
        assert.strictEqual(values[i].status, 'fulfilled');
      }
    });

    it('55.7.2 can access multiple REF Cursor', async function() {
      const promises = [
        doRefCursor(),
        doRefCursor(),
      ];
      const values = await Promise.allSettled(promises);
      for (let i = 0; i < promises.length; i++) {
        assert.strictEqual(values[i].status, 'fulfilled');
      }
    });

  }); // 55.7

  describe('55.8 test querying a PL/SQL function', function() {
    before(async function() {
      await setUp(connection, tableName);
    });

    after(async function() {
      await clearUp(connection, tableName);
    });

    it('55.8.1 ', async function() {
      const proc =
        "CREATE OR REPLACE FUNCTION nodb_rs2_testfunc RETURN VARCHAR2 \
           IS \
             emp_name VARCHAR2(20);   \
           BEGIN \
             SELECT 'Clark Kent' INTO emp_name FROM dual; \
             RETURN emp_name;  \
           END; ";
      await connection.execute(proc);
      const result = await connection.execute(
        "SELECT nodb_rs2_testfunc FROM dual",
        [],
        { resultSet: true });
      assert.strictEqual(result.resultSet.metaData[0].name,
        'NODB_RS2_TESTFUNC');
      const row = await result.resultSet.getRow();
      assert.strictEqual(row[0], 'Clark Kent');
      await result.resultSet.close();
      await connection.execute("DROP FUNCTION nodb_rs2_testfunc");
    });
  }); // 55.8

  describe('55.9 calls getRows() once and then close RS before getting more rows', function() {
    before(async function() {
      await setUp(connection, tableName);
    });

    after(async function() {
      await clearUp(connection, tableName);
    });

    it('55.9.1 ', async function() {
      const numRows = 10;
      const result = await connection.execute(
        "SELECT * FROM nodb_rs2_emp ORDER BY employees_id",
        [],
        { resultSet: true });
      const rs = result.resultSet;
      await rs.getRows(numRows);
      await rs.close();
      await assert.rejects(
        async () => await rs.getRows(numRows),
        /NJS-018:/
      );
    });
  }); // 55.9

  describe('55.10 result set with unsupported data types', function() {
    it('55.10.1 INTERVAL YEAR TO MONTH data type', async function() {
      await assert.rejects(async () => {
        await connection.execute(
          "SELECT dummy, to_yminterval('1-3') FROM dual");
      }, /NJS-010:/);
    });

  }); // 55.10

  describe.skip('55.11 bind a cursor BIND_INOUT', function() {

    before('prepare table nodb_rs2_emp', async function() {
      await setUp(connection, tableName);
    });

    after('drop table', async function() {
      await clearUp(connection, tableName);
    });

    it('55.11.1 has not supported binding a cursor with BIND_INOUT', async function() {
      const proc =
          "CREATE OR REPLACE PROCEDURE nodb_rs2_get_emp_inout (p_in IN NUMBER, p_out IN OUT SYS_REFCURSOR) \
             AS \
             BEGIN \
               OPEN p_out FOR  \
                 SELECT * FROM nodb_rs2_emp \
                 WHERE employees_id > p_in; \
             END; ";
      await connection.execute(proc);
      await assert.rejects(async () => {
        await connection.execute(
          "BEGIN nodb_rs2_get_emp_inout(:in, :out); END;",
          {
            in: 200,
            out: { type: oracledb.CURSOR, dir: oracledb.BIND_INOUT }
          });
      }, /NJS-007:/);
      await connection.execute("DROP PROCEDURE nodb_rs2_get_emp_inout");
    });

  }); // 55.11

  describe('55.12 Invalid Ref Cursor', function() {
    const proc =
      "CREATE OR REPLACE PROCEDURE get_invalid_refcur ( p OUT SYS_REFCURSOR) " +
      "  AS " +
      "  BEGIN " +
      "    NULL; " +
      "  END;";

    before(async function() {
      await setUp(connection, tableName);
      await connection.execute(proc);
    });

    after(async function() {
      await connection.execute("DROP PROCEDURE get_invalid_refcur");
      await clearUp(connection, tableName);
    });

    it('55.12.1 ', async function() {
      await assert.rejects(async () => {
        await connection.execute(
          "BEGIN get_invalid_refcur ( :p ); END; ",
          {
            p: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
          });
      }, /NJS-107:/);

    }); // 55.12.1
  }); // 55.12

});


/********************* Helper functions *************************/
async function setUp(connection, tableName) {
  await createTable(connection, tableName);
  await insertData(connection, tableName);
  await createProc1(connection, tableName);
}

async function clearUp(connection, tableName) {
  await dropProc1(connection);
  await dropTable(connection, tableName);
}

async function createTable(connection, tableName) {
  const sqlCreate =
    "BEGIN " +
    "  DECLARE " +
    "    e_table_missing EXCEPTION; " +
    "    PRAGMA EXCEPTION_INIT(e_table_missing, -00942); " +
    "   BEGIN " +
    "     EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE'); " +
    "   EXCEPTION " +
    "     WHEN e_table_missing " +
    "     THEN NULL; " +
    "   END; " +
    "   EXECUTE IMMEDIATE (' " +
    "     CREATE TABLE " + tableName + " ( " +
    "       employees_id NUMBER(10), " +
    "       employee_name VARCHAR2(20)  " +
    "     )" +
    "   '); " +
    "END; ";

  await connection.execute(sqlCreate);
}

async function dropTable(connection, tableName) {
  await connection.execute('DROP TABLE ' + tableName + ' PURGE');
}

async function insertData(connection, tableName) {
  const sqlInsert =
    "DECLARE " +
    "  x NUMBER := 0; " +
    "  n VARCHAR2(20); " +
    "BEGIN "  +
    "  FOR i IN 1..300 LOOP " +
    "    x := x + 1;  " +
    "    n := 'staff ' || x;  " +
    "    INSERT INTO " + tableName + " VALUES (x, n); " +
    "  END LOOP; " +
    "END; ";

  await connection.execute(sqlInsert, [], { autoCommit: true });
}

async function createProc1(connection, tableName) {
  const sqlProc =
    "CREATE OR REPLACE PROCEDURE nodb_rs2_get_emp (p_in IN NUMBER, p_out OUT SYS_REFCURSOR) " +
    "  AS " +
    "  BEGIN " +
    "    OPEN p_out FOR " +
    "      SELECT * FROM " + tableName + " WHERE employees_id > p_in; " +
    "  END; ";

  await connection.execute(sqlProc);
}

async function dropProc1(connection) {
  await connection.execute('DROP PROCEDURE nodb_rs2_get_emp');
}

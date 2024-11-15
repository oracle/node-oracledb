/* Copyright (c) 2015, 2024, Oracle and/or its affiliates. */

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
 *   9. columnMetadata.js
 *
 * DESCRIPTION
 *   Testing properties of column meta data.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');
const random = require('./random.js');

describe('9. columnMetadata.js', function() {

  let connection = null;
  before('get a connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
    assert(connection);
  });

  after('release the connection', async function() {
    await connection.close();
  });

  describe('9.1 tests with the same table', function() {

    before('create the table', async function() {
      const proc = "BEGIN \n" +
               "    DECLARE \n" +
               "        e_table_missing EXCEPTION; \n" +
               "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
               "    BEGIN \n" +
               "        EXECUTE IMMEDIATE ('DROP TABLE nodb_cmd PURGE'); \n" +
               "    EXCEPTION \n" +
               "        WHEN e_table_missing \n" +
               "        THEN NULL; \n" +
               "    END; \n" +
               "    EXECUTE IMMEDIATE (' \n" +
               "        CREATE TABLE nodb_cmd ( \n" +
               "            department_id NUMBER,  \n" +
               "            department_name VARCHAR2(20), \n" +
               "            manager_id NUMBER, \n" +
               "            location_id NUMBER \n" +
               "        ) \n" +
               "    '); \n" +
               "    EXECUTE IMMEDIATE (' \n" +
               "        INSERT INTO nodb_cmd VALUES \n" +
               "        (40,''Human Resources'', 203, 2400) \n" +
               "    '); \n" +
               "    EXECUTE IMMEDIATE (' \n" +
               "        INSERT INTO nodb_cmd VALUES \n" +
               "        (50,''Shipping'', 121, 1500) \n" +
               "    '); \n" +
               "    EXECUTE IMMEDIATE (' \n" +
               "        INSERT INTO nodb_cmd VALUES \n" +
               "        (90, ''Executive'', 100, 1700) \n" +
               "    '); \n" +
               "END; ";

      await connection.execute(proc);
    }); // before

    after(async function() {
      await connection.execute("DROP TABLE nodb_cmd PURGE");
    }); // after

    it('9.1.1 shows metaData correctly when retrieving 1 column from a 4-column table', async function() {
      const result = await connection.execute("SELECT location_id FROM nodb_cmd WHERE department_id = :did", [50]);
      assert.strictEqual(result.rows[0][0], 1500);
      assert.strictEqual(result.metaData[0].name, 'LOCATION_ID');
    }); // 9.1.1

    it('9.1.2 shows metaData when retrieving 2 columns. MetaData is correct in content and sequence', async function() {
      const result = await connection.execute("SELECT department_id, department_name FROM nodb_cmd WHERE location_id = :lid",
        [1700]);
      assert.deepStrictEqual(result.rows[0], [ 90, 'Executive' ]);
      assert.strictEqual(result.metaData[0].name, 'DEPARTMENT_ID');
      assert.strictEqual(result.metaData[1].name, 'DEPARTMENT_NAME');
    });

    it('9.1.3 shows metaData correctly when retrieve 3 columns', async function() {
      const result = await connection.execute("SELECT department_id, department_name, manager_id FROM nodb_cmd WHERE location_id = :lid",
        [2400]);
      assert.deepStrictEqual(result.rows[0], [ 40, 'Human Resources', 203 ]);
      assert.strictEqual(result.metaData[0].name, 'DEPARTMENT_ID');
      assert.strictEqual(result.metaData[1].name, 'DEPARTMENT_NAME');
      assert.strictEqual(result.metaData[2].name, 'MANAGER_ID');
    });

    it('9.1.4 shows metaData correctly when retrieving all columns with [SELECT * FROM table] statement', async function() {
      const result = await connection.execute("SELECT * FROM nodb_cmd ORDER BY department_id");
      assert.strictEqual(result.rows.length, 3);
      assert.strictEqual(result.metaData.length, 4);
      assert.strictEqual(result.metaData[0].name, 'DEPARTMENT_ID');
      assert.strictEqual(result.metaData[1].name, 'DEPARTMENT_NAME');
      assert.strictEqual(result.metaData[2].name, 'MANAGER_ID');
      assert.strictEqual(result.metaData[3].name, 'LOCATION_ID');
    }); // 9.1.4

    it('9.1.5 works for SELECT count(*)', async function() {
      const result = await connection.execute("SELECT count(*) FROM nodb_cmd");
      assert.strictEqual(result.rows[0][0], 3);
      assert(result.metaData);
      assert.strictEqual(result.metaData[0].name, 'COUNT(*)');
    }); // 9.1.5

    it('9.1.6 works when a query returns no rows', async function() {
      const result = await connection.execute("SELECT * FROM nodb_cmd WHERE department_id = :did", [100]);
      assert.strictEqual(result.rows.length, 0);
      assert.strictEqual(result.metaData[0].name, 'DEPARTMENT_ID');
      assert.strictEqual(result.metaData[1].name, 'DEPARTMENT_NAME');
      assert.strictEqual(result.metaData[2].name, 'MANAGER_ID');
      assert.strictEqual(result.metaData[3].name, 'LOCATION_ID');
    }); // 9.1.6

    it('9.1.7 only works for SELECT statement, does not work for INSERT', async function() {
      let result = await connection.execute("INSERT INTO nodb_cmd VALUES (99, 'FACILITY', 456, 1700)");
      assert.strictEqual(result.rowsAffected, 1);
      assert.ifError(result.metaData);

      result = await connection.execute('SELECT * FROM nodb_cmd WHERE department_id = :1', [99]);
      assert(result.metaData);
      assert.strictEqual(result.metaData.length, 4);
      assert.strictEqual(result.metaData[0].name, 'DEPARTMENT_ID');
      assert.strictEqual(result.metaData[1].name, 'DEPARTMENT_NAME');
      assert.strictEqual(result.metaData[2].name, 'MANAGER_ID');
      assert.strictEqual(result.metaData[3].name, 'LOCATION_ID');
      assert.deepStrictEqual(result.rows[0], [ 99, 'FACILITY', 456, 1700 ]);
    }); // 9.1.7

    it('9.1.8 only works for SELECT statement, does not work for UPDATE', async function() {
      let result = await connection.execute("UPDATE nodb_cmd SET department_name = 'Finance' WHERE department_id = :did", { did: 40 });
      assert.strictEqual(result.rowsAffected, 1);
      assert.ifError(result.metaData);

      result = await connection.execute("SELECT department_name FROM nodb_cmd WHERE department_id = :1", [40]);
      assert(result.metaData);
      assert.strictEqual(result.metaData[0].name, 'DEPARTMENT_NAME');
      assert.strictEqual(result.rows[0][0], 'Finance');
    }); // 9.1.8

    it('9.1.9 works with a SQL WITH statement', async function() {
      const sqlWith = "WITH nodb_dep AS " +
                  "(SELECT * FROM nodb_cmd WHERE location_id < 2000) " +
                  "SELECT * FROM nodb_dep WHERE department_id > 50 ORDER BY department_id";

      const result = await connection.execute(sqlWith);
      assert.deepStrictEqual(result.rows[0], [ 90, 'Executive', 100, 1700 ]);
      assert.strictEqual(result.metaData[0].name, 'DEPARTMENT_ID');
      assert.strictEqual(result.metaData[1].name, 'DEPARTMENT_NAME');
      assert.strictEqual(result.metaData[2].name, 'MANAGER_ID');
      assert.strictEqual(result.metaData[3].name, 'LOCATION_ID');
    }); // 9.1.9

    it('9.1.10 displays metaData correctly with result set', async function() {
      const result = await connection.execute("SELECT * FROM nodb_cmd ORDER BY department_id", [], { resultSet: true });
      assert.strictEqual(result.metaData[0].name, 'DEPARTMENT_ID');
      assert.strictEqual(result.metaData[1].name, 'DEPARTMENT_NAME');
      assert.strictEqual(result.metaData[2].name, 'MANAGER_ID');
      assert.strictEqual(result.metaData[3].name, 'LOCATION_ID');
      await result.resultSet.close();
    });
  }); // 9.1

  describe('9.2 case sensitive', function() {
    it('9.2.1 works for tables whose column names were created case sensitively', async function() {
      const proc = "BEGIN \n" +
                   "    DECLARE \n" +
                   "        e_table_missing EXCEPTION; \n" +
                   "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
                   "    BEGIN \n" +
                   "        EXECUTE IMMEDIATE ('DROP TABLE nodb_casesensitive PURGE'); \n" +
                   "    EXCEPTION \n" +
                   "        WHEN e_table_missing \n" +
                   "        THEN NULL; \n" +
                   "    END; \n" +
                   "    EXECUTE IMMEDIATE (' \n" +
                   "        CREATE TABLE nodb_casesensitive ( \n" +
                   "            id NUMBER,  \n" +
                   '           "nAme" VARCHAR2(20) \n' +
                   "        ) \n" +
                   "    '); \n" +
                   "END; ";

      await connection.execute(proc);
      const result = await connection.execute("SELECT * FROM nodb_casesensitive");
      assert.strictEqual(result.rows.length, 0);
      assert.strictEqual(result.metaData[0].name, 'ID');
      assert.strictEqual(result.metaData[1].name, 'nAme');
      await connection.execute("DROP TABLE nodb_casesensitive PURGE");
    });
  });  // 9.2

  describe('9.3 Large number of columns', function() {
    let columns_string;
    const tableName = "nodb_large_columns";
    const sqlSelect = "SELECT * FROM " + tableName;
    const sqlDrop = testsUtil.sqlDropTable(tableName);

    function genColumns(size, dbType) {
      const  buffer = [];
      for (var  i = 0; i < size; i++) {
        buffer[i] = " column_" + i + dbType;
      }
      return buffer.join();
    }

    function generateCreateSql(cols) {
      return `create table ${tableName}(${cols})`;
    }

    after(async function() {
      oracledb.fetchAsString = [];
      await connection.execute(sqlDrop);
    });

    it('9.3.1 works with a large number of columns', async function() {
      const column_size = 300;
      columns_string = genColumns(column_size, " NUMBER");

      let plsql = testsUtil.sqlCreateTable(tableName, generateCreateSql(columns_string));
      await connection.execute(plsql);

      // check NUMBER type column
      // Dont cache statment as we re-run with different
      // column type with same table.
      let result = await connection.execute(sqlSelect, [],
        { keepInStmtCache: false });
      for (let i = 0; i < column_size; i++) {
        assert.strictEqual(result.metaData[i].name, 'COLUMN_' + i);
      }
      await connection.execute(sqlDrop);

      // check CLOB type (GH Issue 1642)
      columns_string = genColumns(column_size, " CLOB");
      plsql = testsUtil.sqlCreateTable(tableName, generateCreateSql(columns_string));
      await connection.execute(plsql);
      result = await connection.execute(sqlSelect, [], { keepInStmtCache: false });
      for (let i = 0; i < column_size; i++) {
        assert.strictEqual(result.metaData[i].name, 'COLUMN_' + i);
      }
      await connection.execute(sqlDrop);
    });

    it('9.3.2 works with re-executes with multiple packet response', async function() {
      const column_size = 50;
      const numRows = 5;
      oracledb.fetchAsString = [oracledb.CLOB];

      // read table meta data (GH Issue 1684) without inserting any row.
      columns_string = genColumns(column_size, " CLOB");
      const plsql = testsUtil.sqlCreateTable(tableName, generateCreateSql(columns_string));
      await connection.execute(plsql);
      let result = await connection.execute(sqlSelect);
      for (let i = 0; i < column_size; i++) {
        assert.strictEqual(result.metaData[i].name, 'COLUMN_' + i);
      }

      // Insert rows.
      const len = 5 * 1024;
      const specialStr = "9.11";
      const clobStr = random.getRandomString(len, specialStr);
      let bindNames = ':clob,';
      bindNames = bindNames.repeat(column_size - 1);
      bindNames = bindNames + ':clob';
      const binds = new Array(numRows);
      const values = new Array(column_size);
      values.fill(clobStr, 0, column_size);
      binds.fill(values, 0, numRows);
      const sql = `INSERT INTO nodb_large_columns VALUES (${bindNames})`;
      result = await connection.executeMany(sql, binds);

      // Issue second select with rows in table.
      result = await connection.execute(sqlSelect);
      for (let i = 0; i < column_size; i++) {
        assert.strictEqual(result.metaData[i].name, 'COLUMN_' + i);
      }
      for (let i = 0; i < result.rows.length; i++) {
        for (let j = 0; j < column_size; j++) {
          assert.strictEqual(result.rows[i][j], clobStr);
        }
      }

      // subsequent selects should also work fine.
      result = await connection.execute(sqlSelect);
      for (let i = 0; i < column_size; i++) {
        assert.strictEqual(result.metaData[i].name, 'COLUMN_' + i);
      }
      for (let i = 0; i < result.rows.length; i++) {
        for (let j = 0; j < column_size; j++) {
          assert.strictEqual(result.rows[i][j], clobStr);
        }
      }

      await connection.execute(sqlDrop);
    });
  }); // 9.3

  describe('9.4 single character column', function() {

    it('9.4.1 works with column names consisting of single characters', async function() {
      const tableName = "nodb_single_char";
      const sqlCreate =
        "BEGIN \n" +
        "   DECLARE \n" +
        "       e_table_missing EXCEPTION; \n" +
        "       PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
        "   BEGIN \n" +
        "       EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE'); \n" +
        "   EXCEPTION \n" +
        "       WHEN e_table_missing \n" +
        "       THEN NULL; \n" +
        "   END; \n" +
        "   EXECUTE IMMEDIATE (' \n" +
        "       CREATE TABLE " + tableName + " ( \n" +
        "           a VARCHAR2(20),  \n" +
        '           b VARCHAR2(20) \n' +
        "       ) \n" +
        "   '); \n" +
        "END; \n";
      const sqlSelect = "SELECT * FROM " + tableName;
      const sqlDrop = "DROP TABLE " + tableName + " PURGE";

      await connection.execute(sqlCreate);
      const result = await connection.execute(sqlSelect);
      assert.strictEqual(result.metaData[0].name, 'A');
      assert.strictEqual(result.metaData[1].name, 'B');
      await connection.execute(sqlDrop);
    });
  }); // 9.4

  describe('9.5 duplicate column alias', function() {

    it('9.5.1 works when using duplicate column alias', async function() {
      const result = await connection.execute("SELECT 1 a, 'abc' a FROM dual");
      assert.strictEqual(result.metaData[0].name, 'A');
      assert.strictEqual(result.metaData[1].name, 'A_1');
    });
  });
});

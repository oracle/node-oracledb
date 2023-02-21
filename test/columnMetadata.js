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

describe('9. columnMetadata.js', function() {

  var connection = null;
  before('get a connection', async function() {
    try {
      connection = await oracledb.getConnection(dbConfig);
      assert(connection);
    } catch (error) {
      assert.fail(error);
    }
  });

  after('release the connection', async function() {
    try {
      await connection.release();
    } catch (error) {
      assert.fail(error);
    }
  });

  describe('9.1 tests with the same table', function() {

    before('create the table', async function() {
      try {
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
      } catch (error) {
        assert.fail(error);
      }
    }); // before

    after(async function() {
      try {
        await connection.execute("DROP TABLE nodb_cmd PURGE");
      } catch (error) {
        assert.fail(error);
      }
    }); // after

    it('9.1.1 shows metaData correctly when retrieving 1 column from a 4-column table', async function() {
      try {
        const result = await connection.execute("SELECT location_id FROM nodb_cmd WHERE department_id = :did", [50]);
        assert.strictEqual(result.rows[0][0], 1500);
        assert.strictEqual(result.metaData[0].name, 'LOCATION_ID');
      } catch (error) {
        assert.fail(error);
      }
    }); // 9.1.1

    it('9.1.2 shows metaData when retrieving 2 columns. MetaData is correct in content and sequence', async function() {
      try {
        const result = await connection.execute("SELECT department_id, department_name FROM nodb_cmd WHERE location_id = :lid",
          [1700]);
        assert.deepStrictEqual(result.rows[0], [ 90, 'Executive' ]);
        assert.strictEqual(result.metaData[0].name, 'DEPARTMENT_ID');
        assert.strictEqual(result.metaData[1].name, 'DEPARTMENT_NAME');
      } catch (error) {
        assert.fail(error);
      }
    });

    it('9.1.3 shows metaData correctly when retrieve 3 columns', async function() {
      try {
        const result = await connection.execute("SELECT department_id, department_name, manager_id FROM nodb_cmd WHERE location_id = :lid",
          [2400]);
        assert.deepStrictEqual(result.rows[0], [ 40, 'Human Resources', 203 ]);
        assert.strictEqual(result.metaData[0].name, 'DEPARTMENT_ID');
        assert.strictEqual(result.metaData[1].name, 'DEPARTMENT_NAME');
        assert.strictEqual(result.metaData[2].name, 'MANAGER_ID');
      } catch (error) {
        assert.fail(error);
      }
    });

    it('9.1.4 shows metaData correctly when retrieving all columns with [SELECT * FROM table] statement', async function() {
      try {
        const result = await connection.execute("SELECT * FROM nodb_cmd ORDER BY department_id");
        assert.strictEqual(result.rows.length, 3);
        assert.strictEqual(result.metaData.length, 4);
        assert.strictEqual(result.metaData[0].name, 'DEPARTMENT_ID');
        assert.strictEqual(result.metaData[1].name, 'DEPARTMENT_NAME');
        assert.strictEqual(result.metaData[2].name, 'MANAGER_ID');
        assert.strictEqual(result.metaData[3].name, 'LOCATION_ID');
      } catch (error) {
        assert.fail(error);
      }
    }); // 9.1.4

    it('9.1.5 works for SELECT count(*)', async function() {
      try {
        const result = await connection.execute("SELECT count(*) FROM nodb_cmd");
        assert.strictEqual(result.rows[0][0], 3);
        assert(result.metaData);
        assert.strictEqual(result.metaData[0].name, 'COUNT(*)');
      } catch (error) {
        assert.fail(error);
      }
    }); // 9.1.5

    it('9.1.6 works when a query returns no rows', async function() {
      try {
        const result = await connection.execute("SELECT * FROM nodb_cmd WHERE department_id = :did", [100]);
        assert.strictEqual(result.rows.length, 0);
        assert.strictEqual(result.metaData[0].name, 'DEPARTMENT_ID');
        assert.strictEqual(result.metaData[1].name, 'DEPARTMENT_NAME');
        assert.strictEqual(result.metaData[2].name, 'MANAGER_ID');
        assert.strictEqual(result.metaData[3].name, 'LOCATION_ID');
      } catch (error) {
        assert.fail(error);
      }
    }); // 9.1.6

    it('9.1.7 only works for SELECT statement, does not work for INSERT', async function() {
      try {
        var result = await connection.execute("INSERT INTO nodb_cmd VALUES (99, 'FACILITY', 456, 1700)");
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
      } catch (error) {
        assert.fail(error);
      }
    }); // 9.1.7

    it('9.1.8 only works for SELECT statement, does not work for UPDATE', async function() {
      try {
        var result = await connection.execute("UPDATE nodb_cmd SET department_name = 'Finance' WHERE department_id = :did", { did: 40 });
        assert.strictEqual(result.rowsAffected, 1);
        assert.ifError(result.metaData);

        result = await connection.execute("SELECT department_name FROM nodb_cmd WHERE department_id = :1", [40]);
        assert(result.metaData);
        assert.strictEqual(result.metaData[0].name, 'DEPARTMENT_NAME');
        assert.strictEqual(result.rows[0][0], 'Finance');
      } catch (error) {
        assert.fail(error);
      }
    }); // 9.1.8

    it('9.1.9 works with a SQL WITH statement', async function() {
      try {
        const sqlWith = "WITH nodb_dep AS " +
                    "(SELECT * FROM nodb_cmd WHERE location_id < 2000) " +
                    "SELECT * FROM nodb_dep WHERE department_id > 50 ORDER BY department_id";

        const result = await connection.execute(sqlWith);
        assert.deepStrictEqual(result.rows[0], [ 90, 'Executive', 100, 1700 ]);
        assert.strictEqual(result.metaData[0].name, 'DEPARTMENT_ID');
        assert.strictEqual(result.metaData[1].name, 'DEPARTMENT_NAME');
        assert.strictEqual(result.metaData[2].name, 'MANAGER_ID');
        assert.strictEqual(result.metaData[3].name, 'LOCATION_ID');
      } catch (error) {
        assert.fail(error);
      }
    }); // 9.1.9

    it('9.1.10 displays metaData correctly with result set', async function() {
      try {
        const result = await connection.execute("SELECT * FROM nodb_cmd ORDER BY department_id", [], { resultSet: true });
        assert.strictEqual(result.metaData[0].name, 'DEPARTMENT_ID');
        assert.strictEqual(result.metaData[1].name, 'DEPARTMENT_NAME');
        assert.strictEqual(result.metaData[2].name, 'MANAGER_ID');
        assert.strictEqual(result.metaData[3].name, 'LOCATION_ID');
        await result.resultSet.close();
      } catch (error) {
        assert.fail(error);
      }
    });
  }); // 9.1

  describe('9.2 case sensitive', function() {
    it('9.2.1 works for tables whose column names were created case sensitively', async function() {
      try {
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
      } catch (error) {
        assert.fail(error);
      }
    });
  });  // 9.2

  describe('9.3 Large number of columns', function() {
    function genColumns(size) {
      var  buffer = [];
      for (var  i = 0; i < size; i++) {
        buffer[i] = " column_" + i + " NUMBER";
      }
      return buffer.join();
    }

    it('9.10 works with a large number of columns', async function() {
      try {
        const column_size = 100;
        const columns_string = genColumns(column_size);
        const table_name = "nodb_large_columns";
        const sqlSelect = "SELECT * FROM " + table_name;
        const sqlDrop = "DROP TABLE " + table_name + " PURGE";

        const proc = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE ('DROP TABLE nodb_large_columns PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_large_columns ( \n" +
                 columns_string +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";

        await connection.execute(proc);
        const result = await connection.execute(sqlSelect);
        for (var i = 0; i < column_size; i++) {
          assert.strictEqual(result.metaData[i].name, 'COLUMN_' + i);
        }
        await connection.execute(sqlDrop);
      } catch (error) {
        assert.fail(error);
      }
    });
  }); // 9.3

  describe('9.4 single character column', function() {

    it('9.4.1 works with column names consisting of single characters', async function() {
      try {
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
      } catch (error) {
        assert.fail(error);
      }
    });
  }); // 9.4

  describe('9.5 duplicate column alias', function() {

    it('9.5.1 works when using duplicate column alias', async function() {
      try {
        const result = await connection.execute("SELECT 1 a, 'abc' a FROM dual");
        assert.strictEqual(result.metaData[0].name, 'A');
        assert.strictEqual(result.metaData[1].name, 'A');
      } catch (error) {
        assert.fail(error);
      }
    });
  });
});

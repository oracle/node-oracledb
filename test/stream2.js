/* Copyright (c) 2016, 2023, Oracle and/or its affiliates. */

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
 *   14. stream2.js
 *
 * DESCRIPTION
 *   Testing driver query results via stream feature.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('14. stream2.js', function() {

  let connection = null;
  const rowsAmount = 217;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    let proc = "BEGIN \n" +
               "    DECLARE \n" +
               "        e_table_exists EXCEPTION; \n" +
               "        PRAGMA EXCEPTION_INIT(e_table_exists, -00942);\n " +
               "    BEGIN \n" +
               "        EXECUTE IMMEDIATE ('DROP TABLE nodb_stream2 PURGE'); \n" +
               "    EXCEPTION \n" +
               "        WHEN e_table_exists \n" +
               "        THEN NULL; \n" +
               "    END; \n" +
               "    EXECUTE IMMEDIATE (' \n" +
               "        CREATE TABLE nodb_stream2 ( \n" +
               "            employee_id NUMBER, \n" +
               "            employee_name VARCHAR2(20), \n" +
               "            employee_history CLOB \n" +
               "        ) \n" +
               "    '); \n" +
               "END; ";
    await connection.execute(proc);

    proc = "DECLARE \n" +
           "    x NUMBER := 0; \n" +
           "    n VARCHAR2(20); \n" +
           "    clobData CLOB; \n" +
           "BEGIN \n" +
           "    FOR i IN 1..217 LOOP \n" +
           "        x := x + 1; \n" +
           "        n := 'staff ' || x; \n" +
           "        INSERT INTO nodb_stream2 VALUES (x, n, EMPTY_CLOB()) RETURNING employee_history INTO clobData; \n" +
           "        DBMS_LOB.WRITE(clobData, 20, 1, '12345678901234567890'); \n" +
           "    END LOOP; \n" +
           "end; ";
    await connection.execute(proc);
  }); // before

  after(async function() {
    await connection.execute("DROP TABLE nodb_stream2 PURGE");
    await connection.close();
  }); // after

  it('14.1 Bind by position and return an array', async function() {
    const sql = 'SELECT employee_name FROM nodb_stream2 WHERE employee_id = :1';
    const stream = connection.queryStream(sql, [40]);
    await new Promise((resolve, reject) => {
      stream.on('data', function(data) {
        assert(data);
        assert.deepStrictEqual(data, ['staff 40']);
      });
      stream.on('end', stream.destroy);
      stream.on('error', reject);
      stream.on('close', resolve);
    });
  }); // 14.1

  it('14.2 Bind by name and return an array', async function() {
    const sql = 'SELECT employee_name FROM nodb_stream2 WHERE employee_id = :id';
    const stream = connection.queryStream(sql, {id: 40});
    await new Promise((resolve, reject) => {
      stream.on('data', function(data) {
        assert(data);
        assert.deepStrictEqual(data, ['staff 40']);
      });
      stream.on('end', stream.destroy);
      stream.on('error', reject);
      stream.on('close', resolve);
    });
  }); // 14.2

  it('14.3 Bind by position and return an object', async function() {
    const sql = 'SELECT employee_name FROM nodb_stream2 WHERE employee_id = :1';
    const stream = connection.queryStream(sql, [40], {outFormat: oracledb.OUT_FORMAT_OBJECT});
    await new Promise((resolve, reject) => {
      stream.on('data', function(data) {
        assert(data);
        assert.strictEqual(data.EMPLOYEE_NAME, 'staff 40');
      });
      stream.on('end', stream.destroy);
      stream.on('error', reject);
      stream.on('close', resolve);
    });
  }); // 14.3

  it('14.4 Bind by name and return an object', async function() {
    const sql = 'SELECT employee_name FROM nodb_stream2 WHERE employee_id = :id';
    const stream = connection.queryStream(sql, {id: 40}, {outFormat: oracledb.OUT_FORMAT_OBJECT});
    await new Promise((resolve, reject) => {
      stream.on('data', function(data) {
        assert(data);
        assert.strictEqual(data.EMPLOYEE_NAME, 'staff 40');
      });
      stream.on('end', stream.destroy);
      stream.on('error', reject);
      stream.on('close', resolve);
    });
  }); // 14.4

  it('14.5 explicitly setting resultSet option to be false takes no effect', async function() {
    const sql = 'SELECT employee_name FROM nodb_stream2 WHERE employee_id = :1';
    const stream = connection.queryStream(sql, [40], {resultSet: false});
    await new Promise((resolve, reject) => {
      stream.on('data', function(data) {
        assert(data);
        assert.deepStrictEqual(data, ['staff 40']);
      });
      stream.on('end', stream.destroy);
      stream.on('error', reject);
      stream.on('close', resolve);
    });
  }); // 14.5

  it('14.6 maxRows option is ignored as expect', async function() {
    const sql = 'SELECT employee_name FROM nodb_stream2 ORDER BY employee_name';
    const stream = connection.queryStream(sql, [], {maxRows: 40});
    let rowCount = 0;
    await new Promise((resolve, reject) => {
      stream.on('data', function(data) {
        assert(data);
        rowCount++;
      });
      stream.on('end', function() {
        assert.strictEqual(rowCount, rowsAmount);
        stream.destroy();
      });
      stream.on('error', reject);
      stream.on('close', resolve);
    });
  }); // 14.6

  it('14.7 Negative - queryStream() has no parameters', function() {
    assert.throws(
      function() {
        connection.queryStream();
      },
      /NJS-009: invalid number of parameters/
    );
  }); //14.7

  it('14.8 metadata event - single column', async function() {
    const sql = 'SELECT employee_name FROM nodb_stream2 WHERE employee_id = :id';
    const stream = connection.queryStream(sql, { id: 40 });

    let metaDataRead = false;
    await new Promise((resolve, reject) => {
      stream.on('metadata', function(metaData) {
        assert.strictEqual(metaData[0].name, 'EMPLOYEE_NAME');
        metaDataRead = true;
      });
      stream.on('data', function(data) {
        assert(data);
        assert.strictEqual(metaDataRead, true);
      });
      stream.on('end', stream.destroy);
      stream.on('error', reject);
      stream.on('close', resolve);
    });
  }); // 14.8

  it('14.9 metadata event - multiple columns', async function() {
    const sql = 'SELECT employee_name, employee_history FROM nodb_stream2 WHERE employee_id = :id';
    const stream = connection.queryStream(sql, { id: 40 });

    let metaDataRead = false;
    await new Promise((resolve, reject) => {
      stream.on('metadata', function(metaData) {
        assert.strictEqual(metaData[0].name, 'EMPLOYEE_NAME');
        assert.strictEqual(metaData[1].name, 'EMPLOYEE_HISTORY');
        metaDataRead = true;
      });
      stream.on('data', function(data) {
        assert(data);
        data[1].destroy(); // close the CLOB
        assert.strictEqual(metaDataRead, true);
      });
      stream.on('end', stream.destroy);
      stream.on('error', reject);
      stream.on('close', resolve);
    });
  }); // 14.9

  it('14.10 metadata event - all column names occurring', async function() {
    const sql = 'SELECT * FROM nodb_stream2 WHERE employee_id = :id';
    const stream = connection.queryStream(sql, { id: 40 });

    let metaDataRead = false;
    await new Promise((resolve, reject) => {
      stream.on('metadata', function(metaData) {
        assert.strictEqual(metaData[0].name, 'EMPLOYEE_ID');
        assert.strictEqual(metaData[1].name, 'EMPLOYEE_NAME');
        assert.strictEqual(metaData[2].name, 'EMPLOYEE_HISTORY');
        metaDataRead = true;
      });
      stream.on('data', function(data) {
        assert(data);
        data[2].destroy(); // close the CLOB
        assert.strictEqual(metaDataRead, true);
      });
      stream.on('end', stream.destroy);
      stream.on('error', reject);
      stream.on('close', resolve);
    });
  }); // 14.10

  it('14.11 metadata event - no return rows', async function() {
    const sql = 'SELECT employee_name FROM nodb_stream2 WHERE employee_id = :id';
    const stream = connection.queryStream(sql, { id: 400 });

    let metaDataRead = false;
    await new Promise((resolve, reject) => {
      stream.on('metadata', function(metaData) {
        assert.strictEqual(metaData[0].name, 'EMPLOYEE_NAME');
        metaDataRead = true;
      });
      stream.on('data', function(data) {
        assert(data);
        assert.strictEqual(metaDataRead, true);
      });
      stream.on('end', stream.destroy);
      stream.on('error', reject);
      stream.on('close', resolve);
    });
  }); // 14.11

  it('14.12 metadata event - case sensitive columns', async function() {
    const proc = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE ('DROP TABLE nodb_streamcases PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_streamcases ( \n" +
                 "            id NUMBER,  \n" +
                 '           "nAmE" VARCHAR2(20) \n' +
                 "        ) \n" +
                 "    '); \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        INSERT INTO nodb_streamcases VALUES (23, ''Changjie'') \n" +
                 "    '); \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        INSERT INTO nodb_streamcases VALUES (24, ''Nancy'') \n" +
                 "    '); \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        INSERT INTO nodb_streamcases VALUES (25, ''Chris'') \n" +
                 "    '); \n" +
                 "END; ";
    await connection.execute(proc);

    const sql = 'SELECT "nAmE" FROM nodb_streamcases ORDER BY id';
    const stream = connection.queryStream(sql);
    const resultArray = new Array();

    let metaDataRead = false;
    await new Promise((resolve, reject) => {
      stream.on('metadata', function(metaData) {
        assert.strictEqual(metaData[0].name, 'nAmE');
        metaDataRead = true;
      });
      stream.on('error', reject);
      stream.on('data', function(data) {
        assert(data);
        resultArray.push(data);
        assert.strictEqual(metaDataRead, true);
      });
      stream.on('end', function() {
        assert.deepStrictEqual(
          resultArray,
          [ [ 'Changjie' ], [ 'Nancy' ], [ 'Chris' ] ]
        );
        stream.destroy();
      });
      stream.on('close', resolve);
    });

    await connection.execute("DROP TABLE nodb_streamcases PURGE");
  }); // 14.12

  it('14.13 metadata event - large number of columns', async function() {

    const column_size = 10;
    const columns_string = genColumns(column_size);

    function genColumns(size) {
      const buffer = [];
      for (let i = 0; i < size; i++) {
        buffer[i] = " column_" + i + " NUMBER";
      }
      return buffer.join();
    }

    const table_name = "nodb_streamstess";
    const sqlSelect = "SELECT * FROM " + table_name;
    const sqlDrop = "DROP TABLE " + table_name + " PURGE";

    const proc = "BEGIN \n" +
               "    DECLARE \n" +
               "        e_table_missing EXCEPTION; \n" +
               "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
               "    BEGIN \n" +
               "        EXECUTE IMMEDIATE ('DROP TABLE nodb_streamstess PURGE'); \n" +
               "    EXCEPTION \n" +
               "        WHEN e_table_missing \n" +
               "        THEN NULL; \n" +
               "    END; \n" +
               "    EXECUTE IMMEDIATE (' \n" +
               "        CREATE TABLE nodb_streamstess ( \n" +
               columns_string +
               "        ) \n" +
               "    '); \n" +
               "END; ";
    await connection.execute(proc);

    const stream = connection.queryStream(sqlSelect);

    let metaDataRead = false;

    await new Promise((resolve, reject) => {
      stream.on('metadata', function(metaData) {
        for (let i = 0; i < column_size; i++) {
          assert.strictEqual(metaData[i].name, 'COLUMN_' + i);
        }
        metaDataRead = true;
      });
      stream.on('data', function(data) {
        assert(data);
        assert.strictEqual(metaDataRead, true);
      });
      stream.on('error', reject);
      stream.on('end', stream.destroy);
      stream.on('close', resolve);
    });

    await connection.execute(sqlDrop);
  }); // 14.13

  it('14.14 metadata event - single character column', async function() {

    const tableName = "nodb_streamsinglechar";
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

    const stream = connection.queryStream(sqlSelect);

    let metaDataRead = false;

    await new Promise((resolve, reject) => {
      stream.on('metadata', function(metaData) {
        assert.strictEqual(metaData[0].name, 'A');
        assert.strictEqual(metaData[1].name, 'B');
        metaDataRead = true;
      });
      stream.on('error', reject);
      stream.on('data', function() {
        assert.strictEqual(metaDataRead, true);
      });
      stream.on('end', stream.destroy);
      stream.on('close', resolve);
    });

    await connection.execute(sqlDrop);
  }); // 14.14

  it('14.15 metadata event - duplicate column alias', async function() {

    const stream = connection.queryStream("SELECT 1 a, 'abc' a FROM dual");

    let metaDataRead = false;
    await new Promise((resolve, reject) => {
      stream.on('metadata', function(metaData) {
        assert.strictEqual(metaData[0].name, 'A');
        assert.strictEqual(metaData[1].name, 'A_1');
        metaDataRead = true;
      });
      stream.on('error', reject);
      stream.on('data', function(data) {
        assert(data);
        assert.deepStrictEqual(data, [1, 'abc']);
        assert.strictEqual(metaDataRead, true);
      });
      stream.on('end', stream.destroy);
      stream.on('close', resolve);
    });
  }); // 14.15
});

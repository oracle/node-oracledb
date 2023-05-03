/* Copyright (c) 2021, 2023, Oracle and/or its affiliates. */

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
 *   247. dupColNames2.js
 *
 * DESCRIPTION
 *   Test cases to detect duplicate column names and suffix for col names
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('247. dupColNames2.js', function() {
  let connection = null;
  let outFormatBak = oracledb.outFormat;
  const tableNameDept = "nodb_dupDepartment";
  const tableNameEmp = "nodb_dupEmployee";
  const create_table_sql = `
      BEGIN
            DECLARE
                e_table_missing EXCEPTION;
                PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
            BEGIN
                EXECUTE IMMEDIATE ('DROP TABLE nodb_dupDepartment');
            EXCEPTION
                WHEN e_table_missing
                THEN NULL;
            END;
            EXECUTE IMMEDIATE ('
                CREATE TABLE nodb_dupDepartment (
                    department_id NUMBER,
                    department_name VARCHAR2(20)
                )
            ');
        END; `;
  const deptInsert = "INSERT INTO " + tableNameDept + " VALUES( :1, :2)";
  const create_table_emp_sql = `
        BEGIN
             DECLARE
                 e_table_missing EXCEPTION;
                 PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
             BEGIN
                 EXECUTE IMMEDIATE('DROP TABLE nodb_dupEmployee PURGE');
             EXCEPTION
                 WHEN e_table_missing
                 THEN NULL;
             END;
             EXECUTE IMMEDIATE ('
                 CREATE TABLE nodb_dupEmployee (
                     employee_id NUMBER,
                     department_id NUMBER,
                     employee_name VARCHAR2(20),
                     employee_history CLOB
                 )
             ');
         END; `;
  const empInsert = "INSERT INTO " + tableNameEmp + " VALUES ( :1, :2, :3, :4) ";

  before(async function() {
    // set the outformat to object
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

    connection = await oracledb.getConnection (dbConfig);

    await connection.execute(create_table_sql);
    await connection.execute(deptInsert, [101, "R&D"]);
    await connection.execute(deptInsert, [201, "Sales"]);
    await connection.execute(deptInsert, [301, "Marketing"]);

    await connection.execute(create_table_emp_sql);
    await connection.execute(empInsert, [1001, 101, "Krishna Mohan", 'abcdefgh']);
    await connection.execute(empInsert, [1002, 102, "P Venkatraman", 'abcdefgh']);
    await connection.execute(empInsert, [2001, 201, "Chris Jones", 'abcdefgh']);
    await connection.execute(empInsert, [3001, 301, "John Millard", 'abcdefgh']);

    await connection.commit();
  });

  after(async function() {
    await connection.execute("DROP TABLE nodb_dupEmployee PURGE");
    await connection.execute("DROP TABLE nodb_dupDepartment PURGE");
    await connection.commit();
    await connection.close();

    oracledb.outFormat = outFormatBak;
  });

  const empID = [1001, 2001, 3001];
  const depID = [101, 201, 301];
  const depName = ["R&D", "Sales", "Marketing"];

  describe('247.1 Duplicate column names, query with stream', function() {
    it('247.1.1 Two duplicate columns', async function() {
      const sql =
        `SELECT
            A.EMPLOYEE_ID, A.EMPLOYEE_HISTORY, A.DEPARTMENT_ID,
            B.DEPARTMENT_ID, B.DEPARTMENT_NAME
         FROM nodb_dupEmployee A, nodb_dupDepartment B
         WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID`;

      const stream = connection.queryStream(sql);
      let metadataseen = 0;
      const rows = [];

      await new Promise((resolve, reject) => {
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "EMPLOYEE_ID");
          assert.strictEqual(metaData[1].name, "EMPLOYEE_HISTORY");
          assert.strictEqual(metaData[2].name, "DEPARTMENT_ID");
          assert.strictEqual(metaData[3].name, "DEPARTMENT_ID_1");
          assert.strictEqual(metaData[4].name, "DEPARTMENT_NAME");
          metadataseen = 1;
        });

        stream.on('error', reject);

        stream.on('data', function(data) {
          rows.push(data);
        });

        stream.on('end', function() {
          assert.strictEqual(3, rows.length);
          assert.strictEqual(1, metadataseen);
          stream.destroy();
        });

        stream.on('close', resolve);
      });

      for (let index = 0; index < rows.length; index++) {
        const data = rows[index];
        assert.strictEqual(data.EMPLOYEE_ID, empID[index]);
        assert.strictEqual(data.DEPARTMENT_ID, depID[index]);
        assert.strictEqual(data.DEPARTMENT_ID_1, depID[index]);
        assert.strictEqual(data.DEPARTMENT_NAME, depName[index]);
        assert(data.EMPLOYEE_HISTORY);
        assert.strictEqual(data.EMPLOYEE_HISTORY.constructor.name, 'Lob');
        const clobData = await data.EMPLOYEE_HISTORY.getData();
        assert.strictEqual(clobData, 'abcdefgh');
      }
    });

    it('247.1.2 Three duplicate columns', async function() {
      const sql =
        `SELECT
            A.EMPLOYEE_ID, A.EMPLOYEE_HISTORY, A.DEPARTMENT_ID,
            B.DEPARTMENT_ID, B.DEPARTMENT_ID
         FROM nodb_dupEmployee A, nodb_dupDepartment B
         WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID`;

      const stream = connection.queryStream(sql);
      const rows = [];

      await new Promise((resolve, reject) => {
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "EMPLOYEE_ID");
          assert.strictEqual(metaData[1].name, "EMPLOYEE_HISTORY");
          assert.strictEqual(metaData[2].name, "DEPARTMENT_ID");
          assert.strictEqual(metaData[3].name, "DEPARTMENT_ID_1");
          assert.strictEqual(metaData[4].name, "DEPARTMENT_ID_2");
        });

        stream.on('error', reject);

        stream.on('data', function(data) {
          rows.push(data);
        });

        stream.on('end', stream.destroy);

        stream.on('close', resolve);
      });

      for (let index = 0; index < rows.length; index++) {
        const data = rows[index];
        assert.strictEqual(data.EMPLOYEE_ID, empID[index]);
        assert.strictEqual(data.DEPARTMENT_ID, depID[index]);
        assert.strictEqual(data.DEPARTMENT_ID_1, depID[index]);
        assert.strictEqual(data.DEPARTMENT_ID_2, depID[index]);
        assert(data.EMPLOYEE_HISTORY);
        assert.strictEqual(data.EMPLOYEE_HISTORY.constructor.name, 'Lob');
        const clobData = await data.EMPLOYEE_HISTORY.getData();
        assert.strictEqual(clobData, 'abcdefgh');
      }
    });

    it('247.1.3 Duplicate column with conflicting alias name', async function() {
      const sql =
        `SELECT
            A.EMPLOYEE_ID, A.EMPLOYEE_HISTORY, A.DEPARTMENT_ID,
            B.DEPARTMENT_ID, B.DEPARTMENT_ID AS DEPARTMENT_ID_1
         FROM nodb_dupEmployee A, nodb_dupDepartment B
         WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID`;

      const stream = connection.queryStream(sql);
      const rows = [];

      await new Promise((resolve, reject) => {
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "EMPLOYEE_ID");
          assert.strictEqual(metaData[1].name, "EMPLOYEE_HISTORY");
          assert.strictEqual(metaData[2].name, "DEPARTMENT_ID");
          assert.strictEqual(metaData[3].name, "DEPARTMENT_ID_2");
          assert.strictEqual(metaData[4].name, "DEPARTMENT_ID_1");
        });

        stream.on('error', reject);

        stream.on('data', function(data) {
          rows.push(data);
        });

        stream.on('end', stream.destroy);

        stream.on('close', resolve);
      });

      for (let index = 0; index < rows.length; index++) {
        const data = rows[index];
        assert.strictEqual(data.EMPLOYEE_ID, empID[index]);
        assert.strictEqual(data.DEPARTMENT_ID, depID[index]);
        assert.strictEqual(data.DEPARTMENT_ID_1, depID[index]);
        assert.strictEqual(data.DEPARTMENT_ID_2, depID[index]);
        assert(data.EMPLOYEE_HISTORY);
        assert.strictEqual(data.EMPLOYEE_HISTORY.constructor.name, 'Lob');
        const clobData = await data.EMPLOYEE_HISTORY.getData();
        assert.strictEqual(clobData, 'abcdefgh');
      }
    });

    it('247.1.4 Duplicate columns with non-conflicting alias name', async function() {
      const sql =
        `SELECT
            A.EMPLOYEE_ID, A.EMPLOYEE_HISTORY, A.DEPARTMENT_ID,
            B.DEPARTMENT_ID, B.DEPARTMENT_ID AS DEPARTMENT_ID_5
         FROM nodb_dupEmployee A, nodb_dupDepartment B
         WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID`;

      const stream = connection.queryStream(sql);
      const rows = [];

      await new Promise((resolve, reject) => {
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "EMPLOYEE_ID");
          assert.strictEqual(metaData[1].name, "EMPLOYEE_HISTORY");
          assert.strictEqual(metaData[2].name, "DEPARTMENT_ID");
          assert.strictEqual(metaData[3].name, "DEPARTMENT_ID_1");
          assert.strictEqual(metaData[4].name, "DEPARTMENT_ID_5");
        });

        stream.on('error', reject);

        stream.on('data', function(data) {
          rows.push(data);
        });

        stream.on('end', stream.destroy);

        stream.on('close', resolve);
      });

      for (let index = 0; index < rows.length; index++) {
        const data = rows[index];
        assert.strictEqual(data.EMPLOYEE_ID, empID[index]);
        assert.strictEqual(data.DEPARTMENT_ID, depID[index]);
        assert.strictEqual(data.DEPARTMENT_ID_1, depID[index]);
        assert.strictEqual(data.DEPARTMENT_ID_5, depID[index]);
        assert(data.EMPLOYEE_HISTORY);
        assert.strictEqual(data.EMPLOYEE_HISTORY.constructor.name, 'Lob');
        const clobData = await data.EMPLOYEE_HISTORY.getData();
        assert.strictEqual(clobData, 'abcdefgh');
      }
    });

    it('247.1.5 Negative not-case sensitive', async function() {
      const sql =
        `SELECT
            A.EMPLOYEE_ID, A.EMPLOYEE_HISTORY, A.DEPARTMENT_ID,
            B.department_id, B.department_id AS "department_id_1"
         FROM nodb_dupEmployee A, nodb_dupDepartment B
         WHERE A.department_id = B.department_id`;

      const stream = connection.queryStream(sql);
      const rows = [];


      await new Promise((resolve, reject) => {
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "EMPLOYEE_ID");
          assert.strictEqual(metaData[1].name, "EMPLOYEE_HISTORY");
          assert.strictEqual(metaData[2].name, "DEPARTMENT_ID");
          assert.strictEqual(metaData[3].name, "DEPARTMENT_ID_1");
          assert.strictEqual(metaData[4].name, "department_id_1");
        });

        stream.on('error', reject);

        stream.on('data', function(data) {
          rows.push(data);
        });

        stream.on('end', stream.destroy);

        stream.on('close', resolve);
      });

      for (let index = 0; index < rows.length; index++) {
        const data = rows[index];
        assert.strictEqual(data.EMPLOYEE_ID, empID[index]);
        assert.strictEqual(data.DEPARTMENT_ID, depID[index]);
        assert.strictEqual(data.DEPARTMENT_ID_1, depID[index]);
        assert.strictEqual(data.department_id_1, depID[index]);
        assert(data.EMPLOYEE_HISTORY);
        assert.strictEqual(data.EMPLOYEE_HISTORY.constructor.name, 'Lob');
        const clobData = await data.EMPLOYEE_HISTORY.getData();
        assert.strictEqual(clobData, 'abcdefgh');
      }
    });

    it('247.1.6 Two duplicate columns using nested cursor', async function() {
      const sql = `
         SELECT B.DEPARTMENT_NAME , B.DEPARTMENT_ID,
               cursor(SELECT A.EMPLOYEE_NAME , A.DEPARTMENT_ID
                       FROM nodb_dupEmployee A
                       WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID
                       ORDER BY A.EMPLOYEE_NAME
                      ) as NC
                FROM nodb_dupDepartment B
                ORDER BY B.DEPARTMENT_ID
              `;

      const stream = connection.queryStream(sql);
      let index = 0;

      await new Promise((resolve, reject) =>{
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "DEPARTMENT_NAME");
          assert.strictEqual(metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(metaData[2].name, "NC");
        });

        stream.on('error', reject);

        stream.on('data', function(data) {
          assert(data);
          assert.strictEqual(data.NC.metaData[0].name, "EMPLOYEE_NAME");
          assert.strictEqual(data.NC.metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(data.DEPARTMENT_NAME, depName[index]);
          assert.strictEqual(data.DEPARTMENT_ID, depID[index]);
          index++;
        });

        stream.on('end', stream.destroy);

        stream.on('close', resolve);
      });
    });

    it('247.1.7 Three duplicate columns using nested cursor', async function() {
      const sql = `
         SELECT B.DEPARTMENT_NAME , B.DEPARTMENT_ID , B.DEPARTMENT_ID,
               cursor(SELECT A.EMPLOYEE_NAME , A.DEPARTMENT_ID
                       FROM nodb_dupEmployee A
                       WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID
                      ) as NC
                FROM nodb_dupDepartment B
              `;

      const stream = connection.queryStream(sql);
      let index = 0;

      await new Promise((resolve, reject) => {
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "DEPARTMENT_NAME");
          assert.strictEqual(metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(metaData[2].name, "DEPARTMENT_ID_1");
          assert.strictEqual(metaData[3].name, "NC");
        });

        stream.on('error', reject);

        stream.on('data', function(data) {
          assert(data);
          assert.strictEqual(data.NC.metaData[0].name, "EMPLOYEE_NAME");
          assert.strictEqual(data.NC.metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(data.DEPARTMENT_NAME, depName[index]);
          assert.strictEqual(data.DEPARTMENT_ID, depID[index]);
          assert.strictEqual(data.DEPARTMENT_ID_1, depID[index]);
          index++;
        });

        stream.on('end', stream.destroy);

        stream.on('close', resolve);
      });
    });

    it('247.1.8 Three duplicate columns using nested cursor', async function() {
      const sql = `
         SELECT B.DEPARTMENT_NAME , B.DEPARTMENT_ID,
               cursor(SELECT A.EMPLOYEE_NAME , A.DEPARTMENT_ID , A.DEPARTMENT_ID
                       FROM nodb_dupEmployee A
                       WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID
                      ) as NC
                FROM nodb_dupDepartment B
              `;

      const stream = connection.queryStream(sql);
      let index = 0;

      await new Promise((resolve, reject) => {
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "DEPARTMENT_NAME");
          assert.strictEqual(metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(metaData[2].name, "NC");
        });

        stream.on('error', reject);

        stream.on('data', function(data) {
          assert(data);
          assert.strictEqual(data.NC.metaData[0].name, "EMPLOYEE_NAME");
          assert.strictEqual(data.NC.metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(data.NC.metaData[2].name, "DEPARTMENT_ID_1");
          assert.strictEqual(data.DEPARTMENT_NAME, depName[index]);
          assert.strictEqual(data.DEPARTMENT_ID, depID[index]);
          index++;
        });

        stream.on('end', stream.destroy);

        stream.on('close', resolve);
      });
    });

    it('247.1.9 duplicate column with conflicting alias name using nested cursor', async function() {
      const sql = `
         SELECT B.DEPARTMENT_NAME , B.DEPARTMENT_ID,
               cursor(SELECT A.EMPLOYEE_NAME , A.DEPARTMENT_ID , A.DEPARTMENT_ID , A.DEPARTMENT_ID AS DEPARTMENT_ID_1
                       FROM nodb_dupEmployee A
                       WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID
                      ) as NC
                FROM nodb_dupDepartment B
              `;

      const stream = connection.queryStream(sql);
      let index = 0;

      await new Promise((resolve, reject) => {
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "DEPARTMENT_NAME");
          assert.strictEqual(metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(metaData[2].name, "NC");
        });

        stream.on('error', reject);

        stream.on('data', function(data) {
          assert(data);
          assert.strictEqual(data.NC.metaData[0].name, "EMPLOYEE_NAME");
          assert.strictEqual(data.NC.metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(data.NC.metaData[2].name, "DEPARTMENT_ID_2");
          assert.strictEqual(data.NC.metaData[3].name, "DEPARTMENT_ID_1");
          assert.strictEqual(data.DEPARTMENT_NAME, depName[index]);
          assert.strictEqual(data.DEPARTMENT_ID, depID[index]);
          index++;
        });

        stream.on('end', stream.destroy);

        stream.on('close', resolve);
      });
    });

    it('247.1.10 Duplicate column with non-conflicting alias name using nested cursor', async function() {
      const sql = `
         SELECT B.DEPARTMENT_NAME , B.DEPARTMENT_ID,
               cursor(SELECT A.EMPLOYEE_NAME , A.DEPARTMENT_ID , A.DEPARTMENT_ID , A.DEPARTMENT_ID AS DEPARTMENT_ID_5
                       FROM nodb_dupEmployee A
                       WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID
                      ) as NC
                FROM nodb_dupDepartment B
              `;

      const stream = connection.queryStream(sql);
      let index = 0;

      await new Promise((resolve, reject) => {
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "DEPARTMENT_NAME");
          assert.strictEqual(metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(metaData[2].name, "NC");
        });

        stream.on('error', reject);

        stream.on('data', function(data) {
          assert(data);
          assert.strictEqual(data.NC.metaData[0].name, "EMPLOYEE_NAME");
          assert.strictEqual(data.NC.metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(data.NC.metaData[2].name, "DEPARTMENT_ID_1");
          assert.strictEqual(data.NC.metaData[3].name, "DEPARTMENT_ID_5");
          assert.strictEqual(data.DEPARTMENT_NAME, depName[index]);
          assert.strictEqual(data.DEPARTMENT_ID, depID[index]);
          index++;
        });

        stream.on('end', stream.destroy);

        stream.on('close', resolve);
      });
    });

    it('247.1.11 Duplicate column with case sensitive alias name using nested cursor', async function() {
      const sql = `
         SELECT B.DEPARTMENT_NAME , B.DEPARTMENT_ID,
               cursor(SELECT A.EMPLOYEE_NAME , A.DEPARTMENT_ID , A.DEPARTMENT_ID , A.DEPARTMENT_ID AS "department_id_1"
                       FROM nodb_dupEmployee A
                       WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID
                      ) as NC
                FROM nodb_dupDepartment B
              `;

      const stream = connection.queryStream(sql);
      let index = 0;

      await new Promise((resolve, reject) => {
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "DEPARTMENT_NAME");
          assert.strictEqual(metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(metaData[2].name, "NC");
        });

        stream.on('error', reject);

        stream.on('data', function(data) {
          assert(data);
          assert.strictEqual(data.NC.metaData[0].name, "EMPLOYEE_NAME");
          assert.strictEqual(data.NC.metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(data.NC.metaData[2].name, "DEPARTMENT_ID_1");
          assert.strictEqual(data.NC.metaData[3].name, "department_id_1");
          assert.strictEqual(data.DEPARTMENT_NAME, depName[index]);
          assert.strictEqual(data.DEPARTMENT_ID, depID[index]);
          index++;
        });

        stream.on('end', stream.destroy);

        stream.on('close', resolve);
      });
    });


    it('247.1.12 Two duplicate columns using REF cursor', async function() {
      const PROC = 'proc_dupColNames';
      const proc = `
          CREATE OR REPLACE PROCEDURE ${PROC} (p_out OUT SYS_REFCURSOR)
          AS
          BEGIN
            OPEN p_out FOR
              SELECT
            A.EMPLOYEE_ID, A.DEPARTMENT_ID,
            B.DEPARTMENT_ID, B.DEPARTMENT_NAME
         FROM nodb_dupEmployee A, nodb_dupDepartment B
         WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID
         ORDER BY A.DEPARTMENT_ID;
          END;
        `;

      await connection.execute(proc);
      const plsql = `BEGIN ${PROC}(:cursor); END;`;
      const opts = { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } };
      const result = await connection.execute(plsql, opts);
      const stream = result.outBinds.cursor.toQueryStream();
      await new Promise((resolve, reject) => {
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "EMPLOYEE_ID");
          assert.strictEqual(metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(metaData[2].name, "DEPARTMENT_ID_1");
          assert.strictEqual(metaData[3].name, "DEPARTMENT_NAME");
        });

        stream.on('error', reject);

        let index = 0;
        stream.on('data', function(data) {
          assert(data);
          assert.strictEqual(data.EMPLOYEE_ID, empID[index]);
          assert.strictEqual(data.DEPARTMENT_ID, depID[index]);
          assert.strictEqual(data.DEPARTMENT_ID_1, depID[index]);
          assert.strictEqual(data.DEPARTMENT_NAME, depName[index]);
          index++;
        });

        stream.on('end', stream.destroy);

        stream.on('close', resolve);
      });
    });

    it('247.1.13 Three duplicate columns using REF cursor', async function() {
      const PROC = 'proc_dupColNames';
      const proc = `
          CREATE OR REPLACE PROCEDURE ${PROC} (p_out OUT SYS_REFCURSOR)
          AS
          BEGIN
            OPEN p_out FOR
              SELECT
            A.EMPLOYEE_ID, A.DEPARTMENT_ID,
            B.DEPARTMENT_ID, B.DEPARTMENT_ID
         FROM nodb_dupEmployee A, nodb_dupDepartment B
         WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID
         ORDER BY A.DEPARTMENT_ID;
          END;
        `;

      await connection.execute(proc);
      const plsql = `BEGIN ${PROC}(:cursor); END;`;
      const opts = { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } };
      const result = await connection.execute(plsql, opts);
      const stream = result.outBinds.cursor.toQueryStream();
      let index = 0;

      await new Promise((resolve, reject) => {
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "EMPLOYEE_ID");
          assert.strictEqual(metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(metaData[2].name, "DEPARTMENT_ID_1");
          assert.strictEqual(metaData[3].name, "DEPARTMENT_ID_2");
        });

        stream.on('error', reject);

        stream.on('data', function(data) {
          assert(data);
          assert.strictEqual(data.EMPLOYEE_ID, empID[index]);
          assert.strictEqual(data.DEPARTMENT_ID, depID[index]);
          assert.strictEqual(data.DEPARTMENT_ID_1, depID[index]);
          assert.strictEqual(data.DEPARTMENT_ID_2, depID[index]);
          index++;
        });

        stream.on('end', stream.destroy);

        stream.on('close', resolve);
      });
    });

    it('247.1.14 Duplicate column with conflicting alias name using REF cursor', async function() {
      const PROC = 'proc_dupColNames';
      const proc = `
          CREATE OR REPLACE PROCEDURE ${PROC} (p_out OUT SYS_REFCURSOR)
          AS
          BEGIN
            OPEN p_out FOR
              SELECT
            A.EMPLOYEE_ID, A.DEPARTMENT_ID,
            B.DEPARTMENT_ID, B.DEPARTMENT_ID AS DEPARTMENT_ID_1
         FROM nodb_dupEmployee A, nodb_dupDepartment B
         WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID
         ORDER BY A.DEPARTMENT_ID;
          END;
        `;

      await connection.execute(proc);
      const plsql = `BEGIN ${PROC}(:cursor); END;`;
      const opts = { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } };
      const result = await connection.execute(plsql, opts);
      const stream = result.outBinds.cursor.toQueryStream();
      let index = 0;

      await new Promise((resolve, reject) => {
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "EMPLOYEE_ID");
          assert.strictEqual(metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(metaData[2].name, "DEPARTMENT_ID_2");
          assert.strictEqual(metaData[3].name, "DEPARTMENT_ID_1");
        });

        stream.on('error', reject);

        stream.on('data', function(data) {
          assert(data);
          assert.strictEqual(data.EMPLOYEE_ID, empID[index]);
          assert.strictEqual(data.DEPARTMENT_ID, depID[index]);
          assert.strictEqual(data.DEPARTMENT_ID_1, depID[index]);
          assert.strictEqual(data.DEPARTMENT_ID_2, depID[index]);
          index++;
        });

        stream.on('end', function() {
          stream.destroy();
        });

        stream.on('close', function() {
          resolve();
        });
      });
    });

    it('247.1.15 Duplicate column with non-conflicting alias name using REF cursor', async function() {
      const PROC = 'proc_dupColNames';
      const proc = `
          CREATE OR REPLACE PROCEDURE ${PROC} (p_out OUT SYS_REFCURSOR)
          AS
          BEGIN
            OPEN p_out FOR
              SELECT
            A.EMPLOYEE_ID, A.DEPARTMENT_ID,
            B.DEPARTMENT_ID, B.DEPARTMENT_ID AS DEPARTMENT_ID_5
         FROM nodb_dupEmployee A, nodb_dupDepartment B
         WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID
         ORDER BY A.DEPARTMENT_ID;
          END;
        `;

      await connection.execute(proc);
      const plsql = `BEGIN ${PROC}(:cursor); END;`;
      const opts = { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } };
      const result = await connection.execute(plsql, opts);
      const stream = result.outBinds.cursor.toQueryStream();
      let index = 0;

      await new Promise((resolve, reject) => {
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "EMPLOYEE_ID");
          assert.strictEqual(metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(metaData[2].name, "DEPARTMENT_ID_1");
          assert.strictEqual(metaData[3].name, "DEPARTMENT_ID_5");
        });

        stream.on('error', reject);

        stream.on('data', function(data) {
          assert(data);
          assert.strictEqual(data.EMPLOYEE_ID, empID[index]);
          assert.strictEqual(data.DEPARTMENT_ID, depID[index]);
          assert.strictEqual(data.DEPARTMENT_ID_1, depID[index]);
          assert.strictEqual(data.DEPARTMENT_ID_5, depID[index]);
          index++;
        });

        stream.on('end', stream.destroy);

        stream.on('close', resolve);
      });
    });

    it('247.1.16 Duplicate column with case sensitive alias name using REF cursor', async function() {
      const PROC = 'proc_dupColNames';
      const proc = `
          CREATE OR REPLACE PROCEDURE ${PROC} (p_out OUT SYS_REFCURSOR)
          AS
          BEGIN
            OPEN p_out FOR
              SELECT
            A.EMPLOYEE_ID, A.DEPARTMENT_ID,
            B.department_id, B.department_id AS "department_id_1"
         FROM nodb_dupEmployee A, nodb_dupDepartment B
         WHERE A.department_id = B.department_id;
          END;
        `;

      await connection.execute(proc);
      const plsql = `BEGIN ${PROC}(:cursor); END;`;
      const opts = { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } };
      const result = await connection.execute(plsql, opts);
      const stream = result.outBinds.cursor.toQueryStream();
      let index = 0;

      await new Promise((resolve, reject) => {
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "EMPLOYEE_ID");
          assert.strictEqual(metaData[1].name, "DEPARTMENT_ID");
          assert.strictEqual(metaData[2].name, "DEPARTMENT_ID_1");
          assert.strictEqual(metaData[3].name, "department_id_1");
        });

        stream.on('error', reject);

        stream.on('data', function(data) {
          assert(data);
          assert.strictEqual(data.EMPLOYEE_ID, empID[index]);
          assert.strictEqual(data.DEPARTMENT_ID, depID[index]);
          assert.strictEqual(data.DEPARTMENT_ID_1, depID[index]);
          assert.strictEqual(data.department_id_1, depID[index]);
          index++;
        });

        stream.on('end', stream.destroy);

        stream.on('close', resolve);
      });
    });

    it('247.1.17 Duplicate column with case sensitive alias name from dual', async function() {
      const stream = connection.queryStream(`SELECT dummy "abc", dummy "ABC" from dual`);
      await new Promise((resolve, reject) => {
        stream.on('metadata', function(metaData) {
          assert.strictEqual(metaData[0].name, "abc");
          assert.strictEqual(metaData[1].name, "ABC");
        });

        stream.on('error', reject);

        stream.on('data', function(data) {
          assert(data);
          assert.strictEqual(data.abc, "X");
          assert.strictEqual(data.ABC, "X");
        });

        stream.on('end', stream.destroy);

        stream.on('close', resolve);
      });
    });
  });
});

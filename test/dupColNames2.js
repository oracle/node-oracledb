/* Copyright (c) 2021, Oracle and/or its affiliates. All rights reserved. */
/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, withOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
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
const should   = require('should');
const dbconfig = require('./dbconfig.js');

describe('247. dupColNames2.js', function () {
  let connection = null;
  let outFormatBak = oracledb.outFormat;
  const tableNameDept = "nodb_dupDepartment";
  const tableNameEmp = "nodb_dupEmployee";
  const create_table_sql =`
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
  const create_table_emp_sql =`
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
    try {
      // set the outformat to object
      oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

      connection = await oracledb.getConnection (dbconfig);

      await connection.execute(create_table_sql );
      await connection.execute(deptInsert, [101, "R&D"]);
      await connection.execute(deptInsert, [201, "Sales"]);
      await connection.execute(deptInsert, [301, "Marketing"]);

      await connection.execute(create_table_emp_sql);
      await connection.execute(empInsert, [1001, 101, "Krishna Mohan", 'abcdefgh']);
      await connection.execute(empInsert, [1002, 102, "P Venkatraman", 'abcdefgh']);
      await connection.execute(empInsert, [2001, 201, "Chris Jones", 'abcdefgh']);
      await connection.execute(empInsert, [3001, 301, "John Millard", 'abcdefgh']);

      await connection.commit();
    } catch (err) {
      should.not.exist(err);
    }
  });

  after(async function() {
    try {
      await connection.execute("DROP TABLE nodb_dupEmployee PURGE");
      await connection.execute("DROP TABLE nodb_dupDepartment PURGE");
      await connection.commit();
      await connection.close();

      oracledb.outFormat = outFormatBak;
    } catch (err) {
      should.not.exist(err);
    }
  });

  const empID = [1001,2001,3001];
  const depID = [101,201,301];
  const depName = ["R&D", "Sales", "Marketing"];

  describe('247.1 Duplicate column names, query with stream', function(){
    it('247.1.1 Two duplicate columns', async function() {
      let sql =
        `SELECT
            A.EMPLOYEE_ID, A.EMPLOYEE_HISTORY, A.DEPARTMENT_ID,
            B.DEPARTMENT_ID, B.DEPARTMENT_NAME
         FROM nodb_dupEmployee A, nodb_dupDepartment B
         WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID`;

      let stream = await connection.queryStream(sql);
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "EMPLOYEE_ID");
        should.equal(metaData[1].name, "EMPLOYEE_HISTORY");
        should.equal(metaData[2].name, "DEPARTMENT_ID");
        should.equal(metaData[3].name, "DEPARTMENT_ID_1");
        should.equal(metaData[4].name, "DEPARTMENT_NAME");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });
      let index = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.EMPLOYEE_ID, empID[index]);
        should.equal(data.DEPARTMENT_ID, depID[index]);
        should.equal(data.DEPARTMENT_ID_1, depID[index]);
        should.equal(data.DEPARTMENT_NAME, depName[index]);
        should.exist(data.EMPLOYEE_HISTORY);
        should.equal(data.EMPLOYEE_HISTORY.constructor.name, 'Lob');
        data.EMPLOYEE_HISTORY.setEncoding('utf8');
        data.EMPLOYEE_HISTORY.on('data', function (data) {
          should.equal(data, 'abcdefgh');
        });
        index++;
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });

    it('247.1.2 Three duplicate columns', async function () {
      let sql =
        `SELECT
            A.EMPLOYEE_ID, A.EMPLOYEE_HISTORY, A.DEPARTMENT_ID,
            B.DEPARTMENT_ID, B.DEPARTMENT_ID
         FROM nodb_dupEmployee A, nodb_dupDepartment B
         WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID`;

      let stream = await connection.queryStream(sql);
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "EMPLOYEE_ID");
        should.equal(metaData[1].name, "EMPLOYEE_HISTORY");
        should.equal(metaData[2].name, "DEPARTMENT_ID");
        should.equal(metaData[3].name, "DEPARTMENT_ID_1");
        should.equal(metaData[4].name, "DEPARTMENT_ID_2");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });
      let index = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.EMPLOYEE_ID, empID[index]);
        should.equal(data.DEPARTMENT_ID, depID[index]);
        should.equal(data.DEPARTMENT_ID_1, depID[index]);
        should.equal(data.DEPARTMENT_ID_2, depID[index]);
        should.exist(data.EMPLOYEE_HISTORY);
        should.equal(data.EMPLOYEE_HISTORY.constructor.name, 'Lob');
        data.EMPLOYEE_HISTORY.setEncoding('utf8');
        data.EMPLOYEE_HISTORY.on('data', function (data) {
          should.equal(data, 'abcdefgh');
        });
        index++;
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });

    it('247.1.3 Duplicate column with conflicting alias name', async function() {
      let sql =
        `SELECT
            A.EMPLOYEE_ID, A.EMPLOYEE_HISTORY, A.DEPARTMENT_ID,
            B.DEPARTMENT_ID, B.DEPARTMENT_ID AS DEPARTMENT_ID_1
         FROM nodb_dupEmployee A, nodb_dupDepartment B
         WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID`;

      let stream = await connection.queryStream(sql);
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "EMPLOYEE_ID");
        should.equal(metaData[1].name, "EMPLOYEE_HISTORY");
        should.equal(metaData[2].name, "DEPARTMENT_ID");
        should.equal(metaData[3].name, "DEPARTMENT_ID_2");
        should.equal(metaData[4].name, "DEPARTMENT_ID_1");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });
      let index = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.EMPLOYEE_ID, empID[index]);
        should.equal(data.DEPARTMENT_ID, depID[index]);
        should.equal(data.DEPARTMENT_ID_1, depID[index]);
        should.equal(data.DEPARTMENT_ID_2, depID[index]);
        should.exist(data.EMPLOYEE_HISTORY);
        should.equal(data.EMPLOYEE_HISTORY.constructor.name, 'Lob');
        data.EMPLOYEE_HISTORY.setEncoding('utf8');
        data.EMPLOYEE_HISTORY.on('data', function (data) {
          should.equal(data, 'abcdefgh');
        });
        index++;
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });

    it('247.1.4 Duplicate columns with non-conflicting alias name', async function () {
      let sql =
        `SELECT
            A.EMPLOYEE_ID, A.EMPLOYEE_HISTORY, A.DEPARTMENT_ID,
            B.DEPARTMENT_ID, B.DEPARTMENT_ID AS DEPARTMENT_ID_5
         FROM nodb_dupEmployee A, nodb_dupDepartment B
         WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID`;

      let stream = await connection.queryStream(sql);
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "EMPLOYEE_ID");
        should.equal(metaData[1].name, "EMPLOYEE_HISTORY");
        should.equal(metaData[2].name, "DEPARTMENT_ID");
        should.equal(metaData[3].name, "DEPARTMENT_ID_1");
        should.equal(metaData[4].name, "DEPARTMENT_ID_5");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });

      let index = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.EMPLOYEE_ID, empID[index]);
        should.equal(data.DEPARTMENT_ID, depID[index]);
        should.equal(data.DEPARTMENT_ID_1, depID[index]);
        should.equal(data.DEPARTMENT_ID_5, depID[index]);
        should.exist(data.EMPLOYEE_HISTORY);
        should.equal(data.EMPLOYEE_HISTORY.constructor.name, 'Lob');
        data.EMPLOYEE_HISTORY.setEncoding('utf8');
        data.EMPLOYEE_HISTORY.on('data', function (data) {
          should.equal(data, 'abcdefgh');
        });
        index++;
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });

    it('247.1.5 Negative not-case sensitive', async function () {
      let sql =
        `SELECT
            A.EMPLOYEE_ID, A.EMPLOYEE_HISTORY, A.DEPARTMENT_ID,
            B.department_id, B.department_id AS "department_id_1"
         FROM nodb_dupEmployee A, nodb_dupDepartment B
         WHERE A.department_id = B.department_id`;

      let stream = await connection.queryStream(sql);
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "EMPLOYEE_ID");
        should.equal(metaData[1].name, "EMPLOYEE_HISTORY");
        should.equal(metaData[2].name, "DEPARTMENT_ID");
        should.equal(metaData[3].name, "DEPARTMENT_ID_1");
        should.equal(metaData[4].name, "department_id_1");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });

      let index = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.EMPLOYEE_ID, empID[index]);
        should.equal(data.DEPARTMENT_ID, depID[index]);
        should.equal(data.DEPARTMENT_ID_1, depID[index]);
        should.equal(data.department_id_1, depID[index]);
        should.exist(data.EMPLOYEE_HISTORY);
        should.equal(data.EMPLOYEE_HISTORY.constructor.name, 'Lob');
        data.EMPLOYEE_HISTORY.setEncoding('utf8');
        data.EMPLOYEE_HISTORY.on('data', function (data) {
          should.equal(data, 'abcdefgh');
        });
        index++;
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });

    it('247.1.6 Two duplicate columns using nested cursor', async function () {
      let sql =`
         SELECT B.DEPARTMENT_NAME , B.DEPARTMENT_ID,
               cursor(SELECT A.EMPLOYEE_NAME , A.DEPARTMENT_ID
                       FROM nodb_dupEmployee A
                       WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID
                       ORDER BY A.EMPLOYEE_NAME
                      ) as NC
                FROM nodb_dupDepartment B
                ORDER BY B.DEPARTMENT_ID
              `;

      let stream = await connection.queryStream(sql);
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "DEPARTMENT_NAME");
        should.equal(metaData[1].name, "DEPARTMENT_ID");
        should.equal(metaData[2].name, "NC");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });
      let index = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.NC.metaData[0].name, "EMPLOYEE_NAME");
        should.equal(data.NC.metaData[1].name, "DEPARTMENT_ID");
        should.equal(data.DEPARTMENT_NAME, depName[index]);
        should.equal(data.DEPARTMENT_ID, depID[index]);
        index++;
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });

    it('247.1.7 Three duplicate columns using nested cursor', async function () {
      let sql =`
         SELECT B.DEPARTMENT_NAME , B.DEPARTMENT_ID , B.DEPARTMENT_ID,
               cursor(SELECT A.EMPLOYEE_NAME , A.DEPARTMENT_ID
                       FROM nodb_dupEmployee A
                       WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID
                      ) as NC
                FROM nodb_dupDepartment B
              `;

      let stream = await connection.queryStream(sql);
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "DEPARTMENT_NAME");
        should.equal(metaData[1].name, "DEPARTMENT_ID");
        should.equal(metaData[2].name, "DEPARTMENT_ID_1");
        should.equal(metaData[3].name, "NC");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });
      let index = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.NC.metaData[0].name, "EMPLOYEE_NAME");
        should.equal(data.NC.metaData[1].name, "DEPARTMENT_ID");
        should.equal(data.DEPARTMENT_NAME, depName[index]);
        should.equal(data.DEPARTMENT_ID, depID[index]);
        should.equal(data.DEPARTMENT_ID_1, depID[index]);
        index++;
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });

    it('247.1.8 Three duplicate columns using nested cursor', async function () {
      let sql =`
         SELECT B.DEPARTMENT_NAME , B.DEPARTMENT_ID,
               cursor(SELECT A.EMPLOYEE_NAME , A.DEPARTMENT_ID , A.DEPARTMENT_ID
                       FROM nodb_dupEmployee A
                       WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID
                      ) as NC
                FROM nodb_dupDepartment B
              `;

      let stream = await connection.queryStream(sql);
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "DEPARTMENT_NAME");
        should.equal(metaData[1].name, "DEPARTMENT_ID");
        should.equal(metaData[2].name, "NC");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });
      let index = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.NC.metaData[0].name, "EMPLOYEE_NAME");
        should.equal(data.NC.metaData[1].name, "DEPARTMENT_ID");
        should.equal(data.NC.metaData[2].name, "DEPARTMENT_ID_1");
        should.equal(data.DEPARTMENT_NAME, depName[index]);
        should.equal(data.DEPARTMENT_ID, depID[index]);
        index++;
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });

    it('247.1.9 duplicate column with conflicting alias name using nested cursor', async function () {
      let sql =`
         SELECT B.DEPARTMENT_NAME , B.DEPARTMENT_ID,
               cursor(SELECT A.EMPLOYEE_NAME , A.DEPARTMENT_ID , A.DEPARTMENT_ID , A.DEPARTMENT_ID AS DEPARTMENT_ID_1
                       FROM nodb_dupEmployee A
                       WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID
                      ) as NC
                FROM nodb_dupDepartment B
              `;

      let stream = await connection.queryStream(sql);
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "DEPARTMENT_NAME");
        should.equal(metaData[1].name, "DEPARTMENT_ID");
        should.equal(metaData[2].name, "NC");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });
      let index = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.NC.metaData[0].name, "EMPLOYEE_NAME");
        should.equal(data.NC.metaData[1].name, "DEPARTMENT_ID");
        should.equal(data.NC.metaData[2].name, "DEPARTMENT_ID_2");
        should.equal(data.NC.metaData[3].name, "DEPARTMENT_ID_1");
        should.equal(data.DEPARTMENT_NAME, depName[index]);
        should.equal(data.DEPARTMENT_ID, depID[index]);
        index++;
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });

    it('247.1.10 Duplicate column with non-conflicting alias name using nested cursor', async function () {
      let sql =`
         SELECT B.DEPARTMENT_NAME , B.DEPARTMENT_ID,
               cursor(SELECT A.EMPLOYEE_NAME , A.DEPARTMENT_ID , A.DEPARTMENT_ID , A.DEPARTMENT_ID AS DEPARTMENT_ID_5
                       FROM nodb_dupEmployee A
                       WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID
                      ) as NC
                FROM nodb_dupDepartment B
              `;

      let stream = await connection.queryStream(sql);
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "DEPARTMENT_NAME");
        should.equal(metaData[1].name, "DEPARTMENT_ID");
        should.equal(metaData[2].name, "NC");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });
      let index = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.NC.metaData[0].name, "EMPLOYEE_NAME");
        should.equal(data.NC.metaData[1].name, "DEPARTMENT_ID");
        should.equal(data.NC.metaData[2].name, "DEPARTMENT_ID_1");
        should.equal(data.NC.metaData[3].name, "DEPARTMENT_ID_5");
        should.equal(data.DEPARTMENT_NAME, depName[index]);
        should.equal(data.DEPARTMENT_ID, depID[index]);
        index++;
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });

    it('247.1.11 Duplicate column with case sensitive alias name using nested cursor', async function () {
      let sql =`
         SELECT B.DEPARTMENT_NAME , B.DEPARTMENT_ID,
               cursor(SELECT A.EMPLOYEE_NAME , A.DEPARTMENT_ID , A.DEPARTMENT_ID , A.DEPARTMENT_ID AS "department_id_1"
                       FROM nodb_dupEmployee A
                       WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID
                      ) as NC
                FROM nodb_dupDepartment B
              `;

      let stream = await connection.queryStream(sql);
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "DEPARTMENT_NAME");
        should.equal(metaData[1].name, "DEPARTMENT_ID");
        should.equal(metaData[2].name, "NC");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });
      let index = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.NC.metaData[0].name, "EMPLOYEE_NAME");
        should.equal(data.NC.metaData[1].name, "DEPARTMENT_ID");
        should.equal(data.NC.metaData[2].name, "DEPARTMENT_ID_1");
        should.equal(data.NC.metaData[3].name, "department_id_1");
        should.equal(data.DEPARTMENT_NAME, depName[index]);
        should.equal(data.DEPARTMENT_ID, depID[index]);
        index++;
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });


    it('247.1.12 Two duplicate columns using REF cursor', async function () {
      const PROC = 'proc_dupColNames';
      let proc = `
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
      let plsql = `BEGIN ${PROC}(:cursor); END;`;
      let opts = { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } };
      let result = await connection.execute(plsql, opts);
      let stream = await result.outBinds.cursor.toQueryStream();
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "EMPLOYEE_ID");
        should.equal(metaData[1].name, "DEPARTMENT_ID");
        should.equal(metaData[2].name, "DEPARTMENT_ID_1");
        should.equal(metaData[3].name, "DEPARTMENT_NAME");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });
      let index = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.EMPLOYEE_ID, empID[index]);
        should.equal(data.DEPARTMENT_ID, depID[index]);
        should.equal(data.DEPARTMENT_ID_1, depID[index]);
        should.equal(data.DEPARTMENT_NAME, depName[index]);
        index++;
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });

    it('247.1.13 Three duplicate columns using REF cursor', async function () {
      const PROC = 'proc_dupColNames';
      let proc = `
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
      let plsql = `BEGIN ${PROC}(:cursor); END;`;
      let opts = { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } };
      let result = await connection.execute(plsql, opts);
      let stream = await result.outBinds.cursor.toQueryStream();
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "EMPLOYEE_ID");
        should.equal(metaData[1].name, "DEPARTMENT_ID");
        should.equal(metaData[2].name, "DEPARTMENT_ID_1");
        should.equal(metaData[3].name, "DEPARTMENT_ID_2");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });
      let index = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.EMPLOYEE_ID, empID[index]);
        should.equal(data.DEPARTMENT_ID, depID[index]);
        should.equal(data.DEPARTMENT_ID_1, depID[index]);
        should.equal(data.DEPARTMENT_ID_2, depID[index]);
        index++;
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });

    it('247.1.14 Duplicate column with conflicting alias name using REF cursor', async function () {
      const PROC = 'proc_dupColNames';
      let proc = `
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
      let plsql = `BEGIN ${PROC}(:cursor); END;`;
      let opts = { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } };
      let result = await connection.execute(plsql, opts);
      let stream = await result.outBinds.cursor.toQueryStream();
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "EMPLOYEE_ID");
        should.equal(metaData[1].name, "DEPARTMENT_ID");
        should.equal(metaData[2].name, "DEPARTMENT_ID_2");
        should.equal(metaData[3].name, "DEPARTMENT_ID_1");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });
      let index = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.EMPLOYEE_ID, empID[index]);
        should.equal(data.DEPARTMENT_ID, depID[index]);
        should.equal(data.DEPARTMENT_ID_1, depID[index]);
        should.equal(data.DEPARTMENT_ID_2, depID[index]);
        index++;
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });

    it('247.1.15 Duplicate column with non-conflicting alias name using REF cursor', async function () {
      const PROC = 'proc_dupColNames';
      let proc = `
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
      let plsql = `BEGIN ${PROC}(:cursor); END;`;
      let opts = { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } };
      let result = await connection.execute(plsql, opts);
      let stream = await result.outBinds.cursor.toQueryStream();
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "EMPLOYEE_ID");
        should.equal(metaData[1].name, "DEPARTMENT_ID");
        should.equal(metaData[2].name, "DEPARTMENT_ID_1");
        should.equal(metaData[3].name, "DEPARTMENT_ID_5");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });
      let index = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.EMPLOYEE_ID, empID[index]);
        should.equal(data.DEPARTMENT_ID, depID[index]);
        should.equal(data.DEPARTMENT_ID_1, depID[index]);
        should.equal(data.DEPARTMENT_ID_5, depID[index]);
        index++;
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });

    it('247.1.16 Duplicate column with case sensitive alias name using REF cursor', async function () {
      const PROC = 'proc_dupColNames';
      let proc = `
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
      let plsql = `BEGIN ${PROC}(:cursor); END;`;
      let opts = { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } };
      let result = await connection.execute(plsql, opts);
      let stream = await result.outBinds.cursor.toQueryStream();
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "EMPLOYEE_ID");
        should.equal(metaData[1].name, "DEPARTMENT_ID");
        should.equal(metaData[2].name, "DEPARTMENT_ID_1");
        should.equal(metaData[3].name, "department_id_1");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });
      let index = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.EMPLOYEE_ID, empID[index]);
        should.equal(data.DEPARTMENT_ID, depID[index]);
        should.equal(data.DEPARTMENT_ID_1, depID[index]);
        should.equal(data.department_id_1, depID[index]);
        index++;
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });

    it('247.1.17 Duplicate column with case sensitive alias name from dual', async function () {
      let stream = await connection.queryStream(`SELECT dummy "abc", dummy "ABC" from dual`);
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, "abc");
        should.equal(metaData[1].name, "ABC");
      });

      stream.on('error', function(error) {
        should.not.exist(error);
      });

      stream.on('data', function(data) {
        should.exist(data);
        should.equal(data.abc, "X");
        should.equal(data.ABC, "X");
      });

      stream.on('end', function(){
        stream.destroy();
      });
    });
  });
});

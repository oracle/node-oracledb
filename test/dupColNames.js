/* Copyright (c) 2020, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   250. dupColNames.js
 *
 * DESCRIPTION
 *   Testcases to detect duplicate column names and suffix for col names
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');

// set the outformat to object
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;


describe('250. Duplicate Column Names.js', function () {
  let connection = null;
  const tableNameDept = "nodb_dupDepartment";
  const tableNameEmp = "nodb_dupEmployee";
  const create_table_sql =
  "BEGIN \
            DECLARE \
                e_table_missing EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE " + tableNameDept + " '); \
            EXCEPTION \
                WHEN e_table_missing \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE nodb_dupDepartment ( \
                    department_id NUMBER,  \
                    department_name VARCHAR2(20) \
                ) \
            '); \
        END; ";
  const deptInsert = "INSERT INTO " + tableNameDept + " VALUES( :1, :2)";
  const create_table_emp_sql =
    "BEGIN \n" +
    "        DECLARE \n" +
    "            e_table_missing EXCEPTION; \n" +
    "            PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
    "        BEGIN \n" +
    "            EXECUTE IMMEDIATE('DROP TABLE " + tableNameEmp + " PURGE');\n" +
    "        EXCEPTION \n" +
    "            WHEN e_table_missing \n" +
    "            THEN NULL; \n" +
    "        END; \n" +
    "        EXECUTE IMMEDIATE (' \n" +
    "            CREATE TABLE " + tableNameEmp + " ( \n" +
    "                employee_id NUMBER, \n" +
    "                department_id NUMBER,  \n" +
    "                employee_name VARCHAR2(20) \n" +
    "            ) \n" +
    "        '); \n" +
    "    END; ";
  const empInsert = "INSERT INTO " + tableNameEmp + " VALUES ( :1, :2, :3) ";

  before(async function() {
    connection = await oracledb.getConnection (dbconfig);

    await connection.execute(create_table_sql );
    await connection.execute(deptInsert, [101, "R&D"]);
    await connection.execute(deptInsert, [201, "Sales"]);
    await connection.execute(deptInsert, [301, "Marketing"]);

    await connection.execute(create_table_emp_sql);
    await connection.execute(empInsert, [1001, 101, "Krishna Mohan"]);
    await connection.execute(empInsert, [1002, 102, "P Venkatraman"]);
    await connection.execute(empInsert, [2001, 201, "Chris Jones"]);
    await connection.execute(empInsert, [3001, 301, "John Millard"]);

    await connection.commit();
  });

  after(async function() {
    await connection.execute("DROP TABLE nodb_dupEmployee PURGE");
    await connection.execute("DROP TABLE nodb_dupDepartment PURGE");
    await connection.commit();
    await connection.close();
  });

  it('250.1 Two duplicate columns', async function() {
    let sql =
      `SELECT
          A.EMPLOYEE_ID, A.DEPARTMENT_ID,
          B.DEPARTMENT_ID, B.DEPARTMENT_NAME
       FROM nodb_dupEmployee A, nodb_dupDepartment B
       WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID`;

    let result = await connection.execute(sql);
    should.equal(result.metaData[0].name, "EMPLOYEE_ID");
    should.equal(result.metaData[1].name, "DEPARTMENT_ID");
    should.equal(result.metaData[2].name, "DEPARTMENT_ID_1");
    should.equal(result.metaData[3].name, "DEPARTMENT_NAME");
  });

  it('250.2 Three duplicate columns', async function () {
    let sql =
      `SELECT
          A.EMPLOYEE_ID, A.DEPARTMENT_ID,
          B.DEPARTMENT_ID, B.DEPARTMENT_ID
       FROM nodb_dupEmployee A, nodb_dupDepartment B
       WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID`;

    let result = await connection.execute(sql);
    should.equal(result.metaData[0].name, "EMPLOYEE_ID");
    should.equal(result.metaData[1].name, "DEPARTMENT_ID");
    should.equal(result.metaData[2].name, "DEPARTMENT_ID_1");
    should.equal(result.metaData[3].name, "DEPARTMENT_ID_2");
  });

  it('250.3 With conflicting alias name', async function() {
    let sql =
      `SELECT
          A.EMPLOYEE_ID, A.DEPARTMENT_ID,
          B.DEPARTMENT_ID, B.DEPARTMENT_ID AS DEPARTMENT_ID_1
       FROM nodb_dupEmployee A, nodb_dupDepartment B
       WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID`;

    let result = await connection.execute(sql);
    should.equal(result.metaData[0].name, "EMPLOYEE_ID");
    should.equal(result.metaData[1].name, "DEPARTMENT_ID");
    should.equal(result.metaData[2].name, "DEPARTMENT_ID_2");
    should.equal(result.metaData[3].name, "DEPARTMENT_ID_1");
  });

  it('250.4 With non-conflicting alias name', async function () {
    let sql =
      `SELECT
          A.EMPLOYEE_ID, A.DEPARTMENT_ID,
          B.DEPARTMENT_ID, B.DEPARTMENT_ID AS DEPARTMENT_ID_5
       FROM nodb_dupEmployee A, nodb_dupDepartment B
       WHERE A.DEPARTMENT_ID = B.DEPARTMENT_ID`;

    let result = await connection.execute(sql);
    should.equal(result.metaData[0].name, "EMPLOYEE_ID");
    should.equal(result.metaData[1].name, "DEPARTMENT_ID");
    should.equal(result.metaData[2].name, "DEPARTMENT_ID_1");
    should.equal(result.metaData[3].name, "DEPARTMENT_ID_5");
  });

  it('250.5 Negative not-case sensitive', async function () {
    // alias name is within quotes and so does not match any string
    // comparison
    let sql =
      `SELECT
          A.EMPLOYEE_ID, A.DEPARTMENT_ID,
          B.department_id, B.department_id AS "department_id_1"
       FROM nodb_dupEmployee A, nodb_dupDepartment B
       WHERE A.department_id = B.department_id`;

    let result = await connection.execute(sql);
    should.equal(result.metaData[0].name, "EMPLOYEE_ID");
    should.equal(result.metaData[1].name, "DEPARTMENT_ID");
    should.equal(result.metaData[2].name, "DEPARTMENT_ID_1");
    should.equal(result.metaData[3].name, "department_id_1");
  });

});

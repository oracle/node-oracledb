/* Copyright (c) 2023, 2024, Oracle and/or its affiliates. */

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
 * Licensed under the Apache License, Version 2.0 (the `License`);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an `AS IS` BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   272. jsonDualityView1.js
 *
 * DESCRIPTION
 *   Testing JSON Relational Duality View using GraphQL
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('272. jsonDualityView1.js', function() {

  let isRunnable = false, dbaConn, isOracleDB_23_4;
  const dbaCredential = {
    user: dbConfig.test.DBA_user,
    password: dbConfig.test.DBA_password,
    connectString: dbConfig.connectString,
    privilege: oracledb.SYSDBA,
  };
  const pwd = testsUtil.generateRandomPassword();

  before(async function() {
    isRunnable = (!(dbConfig.test.drcp || dbConfig.test.isCmanTdm));
    if (isRunnable) {
      isRunnable = await testsUtil.checkPrerequisites(2100000000, 2300000000);
      isRunnable = isRunnable && dbConfig.test.DBA_PRIVILEGE;
    }
    if (!isRunnable) {
      this.skip();
    }

    // 23.4 requires the _id column for creating JSON Duality Views, which
    // is not added in these tests. So check if the Oracle Database version
    // is 23.4. This condition will be used for some tests to check, if the
    // test should be skipped.
    if (await testsUtil.getMajorDBVersion() === '23.4') {
      isOracleDB_23_4 = true;
    }

    dbaConn = await oracledb.getConnection(dbaCredential);
    await dbaConn.execute(`CREATE USER njs_jsonDv1 IDENTIFIED BY ${pwd}`);
    await dbaConn.execute(`GRANT CREATE SESSION, RESOURCE, CONNECT,
      UNLIMITED TABLESPACE TO njs_jsonDv1`);
  });

  after(async function() {
    if (!isRunnable) return;
    await dbaConn.execute(`DROP USER njs_jsonDv1 CASCADE`);
    await dbaConn.close();
  });

  describe('272.1 JSON Relational Duality View', function() {
    let connection = null;
    const createTableEmp = `CREATE TABLE employees (employee_id NUMBER(6)
                              PRIMARY KEY, first_name VARCHAR2(4000),
                              last_name VARCHAR2(4000), department_id  NUMBER(4))`;

    const createTableDept = `CREATE TABLE departments (department_id NUMBER(5)
                              PRIMARY KEY, department_name VARCHAR2(30),
                              manager_id NUMBER(6))`;

    const alterTableEmp = `ALTER TABLE employees ADD
                            (CONSTRAINT emp_dept_fk FOREIGN KEY (department_id)
                              REFERENCES departments)`;

    const createEmpView = `CREATE or replace JSON relational duality VIEW EMP_OV
                            AS
                              select JSON {
                                'EMPLOYEE_ID' is emp.EMPLOYEE_ID,
                                  'FIRST_NAME'  is emp.FIRST_NAME,
                                  'LAST_NAME' is emp.last_name,
                                  'department_info' is
                                  (
                                  select JSON
                                    {
                                      'DEPARTMENT_ID' is dept.department_id,
                                      'departmentname' is dept.department_name WITH(UPDATE)
                                    }
                                    from departments dept WITH(UPDATE,CHECK ETAG)
                                    where dept.department_id = emp.department_id
                                  )
                                returning JSON}
                                from employees emp WITH(INSERT,UPDATE,DELETE)`;

    const createDeptView = `CREATE OR REPLACE JSON relational duality VIEW dept_ov
                              AS
                              select JSON {
                              'department_id' is dept.DEPARTMENT_ID,
                              'department_name'  is dept.DEPARTMENT_NAME,
                              'EMP_INFO' is
                              ( select
                            json_arrayagg
                              (
                              JSON
                              {
                                'employee_id' is emp.employee_id,
                                'FIRST_NAME'  is emp.FIRST_NAME
                              }
                              )
                                  from employees emp WITH (INSERT,UPDATE,DELETE)
                                where emp.department_id = dept.department_id
                              )
                                returning json
                              }
                              from departments dept WITH (INSERT,UPDATE,DELETE,CHECK ETAG)`;

    before(async function() {
      if (isOracleDB_23_4) this.skip();

      connection = await oracledb.getConnection({user: 'njs_jsonDv1',
        password: pwd,
        connectString: dbConfig.connectString
      });
      await connection.execute(testsUtil.sqlCreateTable('employees', createTableEmp));
      await connection.execute(testsUtil.sqlCreateTable('departments', createTableDept));
      await connection.execute(alterTableEmp);
      await connection.execute(createEmpView);
      await connection.execute(createDeptView);


      await connection.execute(`INSERT INTO departments VALUES
                                 ( 10
                               , 'Administration'
                                 , 100
                                 )`);


      await connection.execute(`INSERT INTO employees VALUES
                                ( 100
                                , 'Steven'
                               , 'King'
                               , 10
                               )`);
    });

    after(async function() {
      if (isOracleDB_23_4) return;

      await testsUtil.dropTable(connection, 'employees');
      await testsUtil.dropTable(connection, 'departments');
      await connection.execute(`DROP VIEW IF EXISTS emp_ov`);
      await connection.execute(`DROP VIEW IF EXISTS dept_ov`);
      await connection.close();
    });

    it('272.1.1 fetch results', async function() {
      const query = `SELECT * from emp_ov ORDER BY 1`;
      const result = await connection.execute(query);
      assert.strictEqual(result.rows[0][0].EMPLOYEE_ID, 100);
      assert.strictEqual(result.rows[0][0].FIRST_NAME, "Steven");
    });

    it('272.1.2 update query', async function() {
      const queryUpdate = `UPDATE emp_ov SET data = '{"EMPLOYEE_ID":100,"FIRST_NAME":"Lex","LAST_NAME":"De Haan",
      "department_info":{"DEPARTMENT_ID":10,"departmentname":"newdept"}}'
                    WHERE json_value(data,'$.EMPLOYEE_ID') = 100`;
      await connection.execute(queryUpdate);
      const query = `SELECT * from emp_ov ORDER BY 1`;
      const result = await connection.execute(query);
      assert.strictEqual(result.rows[0][0].EMPLOYEE_ID, 100);
      assert.strictEqual(result.rows[0][0].FIRST_NAME, "Lex");
      assert.strictEqual(result.rows[0][0].department_info.departmentname, "newdept");
    });

    it('272.1.3 insert query', async function() {
      const queryInsert = `INSERT INTO emp_ov VALUES ('{"EMPLOYEE_ID":105,"FIRST_NAME":"Lex",
      "LAST_NAME":"De Haan","department_info":{"DEPARTMENT_ID":10,"departmentname":"newdept"}}')`;

      await connection.execute(queryInsert);
      const query = `SELECT * from emp_ov ORDER BY 1`;
      const result = await connection.execute(query);
      assert.strictEqual(result.rows[1][0].EMPLOYEE_ID, 105);
      assert.strictEqual(result.rows[1][0].department_info.departmentname, "newdept");
    });

    it('272.1.4 delete query', async function() {
      const queryDelete = `DELETE FROM emp_ov WHERE json_value(data,'$.EMPLOYEE_ID') = 105`;
      await connection.execute(queryDelete);
      const query = `SELECT * from emp_ov ORDER BY 1`;
      const result = await connection.execute(query);
      assert.strictEqual(result.rows.length, 1);
    });

    it('272.1.5 dept view', async function() {

      const query = `SELECT * from dept_ov ORDER BY data`;
      const result = await connection.execute(query);

      assert.strictEqual(result.rows[0][0].department_id, 10);
      assert.strictEqual(result.rows[0][0].EMP_INFO[0].employee_id, 100);
      assert.strictEqual(result.rows[0][0].EMP_INFO[0].FIRST_NAME, "Lex");
    });

    it('272.1.6 insert query', async function() {
      const queryInsert = `INSERT INTO dept_ov  VALUES ('{"department_id":11,"department_name":"Sales",
      "EMP_INFO":[{"employee_id":101,"FIRST_NAME":"Steven"}]}')`;

      await connection.execute(queryInsert);
      const query = `SELECT * from dept_ov ORDER BY data`;
      const result = await connection.execute(query);
      assert.strictEqual(result.rows[1][0].department_id, 11);
      assert.strictEqual(result.rows[1][0].EMP_INFO[0].employee_id, 101);
      assert.strictEqual(result.rows[1][0].EMP_INFO[0].FIRST_NAME, "Steven");
    });

    it('272.1.7 update query', async function() {
      await connection.execute(`UPDATE dept_ov SET data = '{"department_id":11,"department_name":"IT",
        "EMP_INFO":[{"employee_id":101,"FIRST_NAME":"Steven"}]}' WHERE json_value(data,'$.department_id') = 11`);

      const query = `SELECT * from dept_ov WHERE json_value(data,'$.department_id') = 11`;
      const result = await connection.execute(query);
      assert.strictEqual(result.rows[0][0].department_id, 11);
      assert.strictEqual(result.rows[0][0].department_name, "IT");
      assert.strictEqual(result.rows[0][0].EMP_INFO[0].FIRST_NAME, "Steven");
    });


    it('272.1.8 delete query', async function() {
      const queryDelete = `delete dept_ov d WHERE d.data.department_id = 11`;
      await connection.execute(queryDelete);
      const query = `SELECT * from dept_ov ORDER BY 1`;
      const result = await connection.execute(query);
      assert.strictEqual(result.rows.length, 1);
    });

    it('272.1.9 Insert query', async function() {
      await connection.execute(`INSERT INTO dept_ov  VALUES ('{"department_id":11,"department_name":"Sales",
        "EMP_INFO":[{"employee_id":106,"FIRST_NAME":"Steven"}]}')`);
      const query = `SELECT * from dept_ov ORDER BY data`;
      const result = await connection.execute(query);
      assert.strictEqual(result.rows[1][0].department_id, 11);
      assert.strictEqual(result.rows[1][0].EMP_INFO[0].employee_id, 106);
      assert.strictEqual(result.rows[1][0].EMP_INFO[0].FIRST_NAME, "Steven");
    });

    it('272.1.10 update query', async function() {
      await connection.execute(`UPDATE dept_ov SET data = '{"department_id":11,"department_name":"IT",
        "EMP_INFO":[{"employee_id":106,"FIRST_NAME":"Steven"}]}' WHERE json_value(data,'$.department_id') = 11`);
      const query = `SELECT * from dept_ov ORDER BY data`;
      const result = await connection.execute(query);
      assert.strictEqual(result.rows[1][0].department_id, 11);
      assert.strictEqual(result.rows[1][0].department_name, "IT");
      assert.strictEqual(result.rows[1][0].EMP_INFO[0].FIRST_NAME, "Steven");
    });

  });

  describe('272.2 run with DV using GraphQL ', function() {
    let connection = null;
    const createTableDept = `CREATE TABLE departments
    ( department_id    NUMBER(5) PRIMARY KEY,
      department_name  VARCHAR2(30),
      manager_id       NUMBER(6)
    )`;

    const createTableEmp = `CREATE TABLE employees
        ( employee_id NUMBER(6) PRIMARY KEY,
          first_name VARCHAR2(4000),
          last_name  VARCHAR2(4000),
          department_id  NUMBER(4)
        )`;

    const alterTableEmp = `ALTER TABLE employees ADD CONSTRAINT emp_dept_fk
    FOREIGN KEY (department_id) REFERENCES departments(department_id)`;

    const createEmpView = `CREATE or replace JSON relational duality VIEW EMP_OV
                      AS
                   employees @insert @update @delete
                {
                    EMPLOYEE_ID : EMPLOYEE_ID,
                    FIRST_NAME  : FIRST_NAME,
                    LAST_NAME : last_name,
                   department_info: departments  @update @check
                     {
                     DEPARTMENT_ID : department_id ,
                     departmentname : department_name @update
                     }
                }`;
    const createDeptView = `CREATE OR REPLACE JSON relational duality VIEW dept_ov
                             AS
                            departments @insert @update @delete @nocheck {
                            department_id :  DEPARTMENT_ID,
                            department_name : DEPARTMENT_NAME,
                            EMP_INFO : employees @insert @update @delete @nocheck
                            {
                                employee_id : employee_id,
                                FIRST_NAME  : FIRST_NAME
                               }
                            }`;


    before(async function() {
      if (isOracleDB_23_4) this.skip();

      connection = await oracledb.getConnection({user: 'njs_jsonDv1',
        password: pwd,
        connectString: dbConfig.connectString
      });
      await connection.execute(testsUtil.sqlCreateTable('employees', createTableEmp));
      await connection.execute(testsUtil.sqlCreateTable('departments', createTableDept));
      await connection.execute(alterTableEmp);
      await connection.execute(createEmpView);
      await connection.execute(createDeptView);
    });

    after(async function() {
      if (isOracleDB_23_4) return;
      await testsUtil.dropTable(connection, 'employees');
      await testsUtil.dropTable(connection, 'departments');
      await connection.execute(`DROP VIEW IF EXISTS emp_ov`);
      await connection.execute(`DROP VIEW IF EXISTS dept_ov`);
      await connection.close();
    });


    it('272.2.1 insert query', async function() {
      let query, result;
      await connection.execute(`INSERT INTO departments VALUES
            ( 10
            , 'Administration'
            , 100
            )`);

      query = `SELECT * from dept_ov ORDER BY 1`;
      result = await connection.execute(query);
      assert.strictEqual(result.rows[0][0].department_id, 10);
      assert.strictEqual(result.rows[0][0].department_name, "Administration");

      await connection.execute(`INSERT INTO employees VALUES
           ( 100
            , 'Steven'
            , 'King'
            , 10
            )`);
      query = `SELECT * from emp_ov ORDER BY 1`;
      result = await connection.execute(query);
      assert.strictEqual(result.rows[0][0].EMPLOYEE_ID, 100);
      assert.strictEqual(result.rows[0][0].FIRST_NAME, "Steven");

      await connection.execute(`INSERT INTO employees VALUES
            ( 101
            , 'New'
            , 'Name'
            , 10
            )`);
      query = `SELECT * from emp_ov ORDER BY 1`;
      result = await connection.execute(query);
      assert.strictEqual(result.rows[1][0].EMPLOYEE_ID, 101);
      assert.strictEqual(result.rows[1][0].FIRST_NAME, "New");

      await connection.execute(`INSERT INTO employees VALUES
           ( 102
            , 'John'
            , 'Hil'
            , 10
            )`);

      query = `SELECT * from emp_ov ORDER BY 1`;
      result = await connection.execute(query);
      assert.strictEqual(result.rows[2][0].EMPLOYEE_ID, 102);
      assert.strictEqual(result.rows[2][0].FIRST_NAME, "John");
    });

    it('272.2.2 update query', async function() {
      const queryUpdate = `UPDATE emp_ov SET data = '{"EMPLOYEE_ID":100,"FIRST_NAME":"new_name",
        "LAST_NAME":"new_lastname","department_info":{"DEPARTMENT_ID":10,"departmentname":"Administration"}}'
        WHERE json_value(data,'$.EMPLOYEE_ID') = 100`;
      await connection.execute(queryUpdate);
      const query = `SELECT * from emp_ov ORDER BY 1`;
      const result = await connection.execute(query);
      assert.strictEqual(result.rows[0][0].EMPLOYEE_ID, 100);
      assert.strictEqual(result.rows[0][0].FIRST_NAME, "new_name");
      assert.strictEqual(result.rows[0][0].LAST_NAME, "new_lastname");
    });

    it('272.2.3 insert query', async function() {
      const queryInsert = `INSERT INTO emp_ov VALUES ('{"EMPLOYEE_ID":105,"FIRST_NAME":"Lex",
      "LAST_NAME":"De Haan","department_info":{"DEPARTMENT_ID":10,"departmentname":"Administration"}}')`;

      await connection.execute(queryInsert);
      const query = `SELECT * from emp_ov ORDER BY 1`;
      const result = await connection.execute(query);

      assert.strictEqual(result.rows[3][0].EMPLOYEE_ID, 105);
      assert.strictEqual(result.rows[3][0].FIRST_NAME, "Lex");
      assert.strictEqual(result.rows[3][0].LAST_NAME, "De Haan");
    });

    it('272.2.4 delete query', async function() {
      const queryDelete = `DELETE FROM emp_ov WHERE json_value(data,'$.EMPLOYEE_ID') = 105`;
      let query = `SELECT * from emp_ov ORDER BY 1`;
      let result = await connection.execute(query);
      assert.strictEqual(result.rows.length, 4);
      await connection.execute(queryDelete);
      query = `SELECT * from emp_ov ORDER BY 1`;
      result = await connection.execute(query);
      assert.strictEqual(result.rows.length, 3);
    });

    it('272.2.5 Primary key to FOREIGN key', async function() {
      const query = `SELECT * from dept_ov ORDER BY data`;
      const result = await connection.execute(query);

      assert.strictEqual(result.rows[0][0].department_id, 10);
      assert.strictEqual(result.rows[0][0].EMP_INFO[0].employee_id, 100);
    });

    it('272.2.6 Insert query', async function() {
      await connection.execute(`INSERT INTO dept_ov  VALUES ('{"department_id":11,"department_name":"Sales",
        "EMP_INFO":[{"employee_id":106,"FIRST_NAME":"Steven"}]}')`);
      const query = `SELECT * from dept_ov ORDER BY data`;
      const result = await connection.execute(query);
      assert.strictEqual(result.rows[0][0].department_id, 11);
      assert.strictEqual(result.rows[0][0].EMP_INFO[0].employee_id, 106);
      assert.strictEqual(result.rows[0][0].department_name, "Sales");
      assert.strictEqual(result.rows[0][0].EMP_INFO[0].FIRST_NAME, "Steven");
    });

    it('272.2.7 Update query', async function() {
      await connection.execute(`UPDATE dept_ov SET data = '{"department_id":11,"department_name":"IT",
        "EMP_INFO":[{"employee_id":106,"FIRST_NAME":"Steven"}]}' WHERE json_value(data,'$.department_id') = 11`);
      const query = `SELECT * FROM dept_ov ORDER BY data`;
      const result = await connection.execute(query);
      assert.strictEqual(result.rows[0][0].department_id, 11);
      assert.strictEqual(result.rows[0][0].department_name, "IT");
    });

    it('272.2.8 Delete query', async function() {
      let query = `SELECT * FROM dept_ov ORDER BY data`;
      let result = await connection.execute(query);
      assert.strictEqual(result.rows.length, 2);
      await connection.execute(`DELETE dept_ov d WHERE d.data.department_id = 11`);
      query = `SELECT * FROM dept_ov ORDER BY data`;
      result = await connection.execute(query);
      assert.strictEqual(result.rows.length, 1);
    });

  });

  describe('272.3 DDL tests with GRAPHQL for JSON Duality Views ', function() {
    let connection = null;

    const createTableStudent = `CREATE TABLE student(
                                stuid NUMBER,
                                name VARCHAR(128) DEFAULT null,
                                CONSTRAINT pk_student PRIMARY KEY (stuid)
                                )`;
    const createTableClass = `CREATE TABLE class(
                                clsid NUMBER,
                                name VARCHAR2(128),
                                CONSTRAINT pk_class PRIMARY KEY (clsid)
                                )`;

    const createTableStudentClass = `CREATE TABLE student_class (
                                      scid NUMBER,
                                      stuid NUMBER,
                                      clsid NUMBER,
                                      CONSTRAINT pk_student_class PRIMARY KEY (scid),
                                      CONSTRAINT fk_student_class1 FOREIGN KEY (stuid) REFERENCES student(stuid),
                                      CONSTRAINT fk_student_class2 FOREIGN KEY (clsid) REFERENCES class(clsid)
                                    )`;
    before(async function() {
      connection = await oracledb.getConnection({user: 'njs_jsonDv1',
        password: pwd,
        connectString: dbConfig.connectString
      });

      await connection.execute(testsUtil.sqlCreateTable('student', createTableStudent));
      await connection.execute(testsUtil.sqlCreateTable('class', createTableClass));
      await connection.execute(testsUtil.sqlCreateTable('student_class', createTableStudentClass));
    });

    after(async function() {
      await testsUtil.dropTable(connection, 'student_class');
      await testsUtil.dropTable(connection, 'class');
      await testsUtil.dropTable(connection, 'student');
      await connection.close();
    });

    it('272.3.1 Insert query', async function() {
      await connection.execute(`INSERT INTO student VALUES (1, 'ABC')`);
      await connection.execute(`INSERT INTO student VALUES (2, 'LMN')`);
      await connection.execute(`INSERT INTO student VALUES (3, 'XYZ')`);
      await connection.execute(`INSERT INTO class VALUES (1, 'CS101')`);
      await connection.execute(`INSERT INTO class VALUES (2, 'CS403')`);
      await connection.execute(`INSERT INTO class VALUES (3, 'PSYCH223')`);
      await connection.execute(`INSERT INTO student_class VALUES (1, 1, 1)`);
      await connection.execute(`INSERT INTO student_class VALUES (2, 2, 2)`);
      await connection.execute(`INSERT INTO student_class VALUES (3, 2, 3)`);
      await connection.execute(`INSERT INTO student_class VALUES (4, 3, 1)`);
      await connection.execute(`INSERT INTO student_class VALUES (5, 3, 2)`);
    });

    it('272.3.2 View Name as graphql', async function() {
      if (isOracleDB_23_4) this.skip();

      const query = `CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW graphql
                    AS
                    student @INSERT @UPDATE @DELETE
                     {
                     StudentId: stuid,
                     StudentName: name,
                      student_class
                        {StudentClassId : scid,
                          class {ClassId: clsid, Name:name}
                        }
                    }`;
      await connection.execute(query);
    });

    it('272.3.3 Create view with @ directive', async function() {
      if (isOracleDB_23_4) this.skip();

      const query = `CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
                    AS
                    student @INSERT
                     {
                     StudentId: stuid,
                     StudentName: name,
                      student_class @INSERT @UPDATE @DELETE
                        {StudentClassId : scid,
                          class  @CHECK {ClassId: clsid, Name:name}
                        }
                    }`;
      await connection.execute(query);
    });

    it('272.3.4 Create view using @unnest case 1', async function() {
      const query = `CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
                    AS
                    student @INSERT
                     {
                     StudentId: stuid,
                     StudentName: name,
                      student_class @INSERT @UPDATE @DELETE
                         {StudentClassId : scid,
                         @unnest class  @CHECK  {ClassId: clsid, Name:name}
                        }
                    }`;
      await assert.rejects(
        async () => await connection.execute(query),
        /ORA-24558:|ORA-43411:/
        // ORA-24558: syntax error encountered in the input string
        // ORA-43411: Invalid directive 'unnest' for the column 'SCID'

      );
    });

    it('272.3.5 Create view using @unnest case 2', async function() {
      const query = `CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
                       AS
                      student @INSERT
                         {
                         StudentId: stuid,
                         StudentName: name,
                          student_class @INSERT @UPDATE @DELETE
                           {StudentClassId : scid,
                           ClassId:@unnest (path: "{class {clsid}}")
                           }
                        }`;
      await assert.rejects(
        async () => await connection.execute(query),
        /ORA-24558:/ //ORA-24558: syntax error encountered in the input string
      );
    });

    it('272.3.6 Create view Primary key to Foreign key', async function() {
      if (isOracleDB_23_4) this.skip();

      const query = `CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
                      AS
                     Student @INSERT @UPDATE @DELETE
                     {
                     StudentId: stuid, StudentName: name,
                     student_class @INSERT @UPDATE @DELETE
                        {StudentClassId : scid}
                      }`;
      await connection.execute(query);
    });

    it('272.3.7 Create view Foreign key to Primary key', async function() {
      if (isOracleDB_23_4) this.skip();

      const query = `CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW studentclass_ov
                     AS
                     student_class
                     {studentclassid : scid,
                     student {StudentId : stuid,StudentName : name}
                     }`;
      await connection.execute(query);
    });

    describe('272.3.8 Create view with View Name as Mixed Case and Special Case', function() {
      it('272.3.8.1 single quotes for key names are not supported ', async function() {
        if (isOracleDB_23_4) this.skip();

        const query = `CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
                        AS
                        student @INSERT @UPDATE @DELETE
                        {
                        StudentId: stuid,
                        StudentName: name,
                        student_class
                                 {StudentClassId : scid,
                                        class {ClassId: clsid, Names:name}
                                      }
                        }`;

        await connection.execute(query);
      });

      it('272.3.8.2 single quotes for key names are not supported ', async function() {
        const query = `CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
                        AS
                        student @INSERT @UPDATE @DELETE
                        {
                        'StudentId': stuid,
                        StudentName: name,
                          student_class
                                 {StudentClassId : scid,
                                        class {ClassId: clsid, Names:name}
                                      }
                        }`;

        await assert.rejects(
          async () => await connection.execute(query),
          /ORA-24558:/ //ORA-24558: syntax error encountered in the input string
        );
      });

      it('272.3.8.3 Create view with View Name as Special Case ', async function() {
        if (isOracleDB_23_4) this.skip();

        const query = `CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov@
                        AS
                        student @INSERT @UPDATE @DELETE
                        {
                        StudentId: stuid,
                        StudentName: name,
                          student_class
                                 {StudentClassId : scid,
                                        class {ClassId: clsid, Names:name}
                                      }
                        }`;

        await assert.rejects(
          async () => await connection.execute(query),
          /ORA-02000:/ //ORA-02000: missing AS keyword
        );
      });

      it('272.3.8.3 case 3 ', async function() {
        if (isOracleDB_23_4) this.skip();

        const query = `CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
                        AS
                        student @INSERT @UPDATE @DELETE
                        {
                        StudentId: stuid,
                        StudentName: name,
                          student_class
                                 {StudentClassId : scid,
                                        class {ClassId: clsid, Names:name}
                                      }
                        }`;

        await connection.execute(query);
      });

      it('272.3.8.4 single quotes for key names are not supported ', async function() {
        if (isOracleDB_23_4) this.skip();

        const query = `CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
                        AS
                        student @INSERT @UPDATE @DELETE
                        {
                        StudentId: stuid,
                        StudentName: name,
                          student_class
                                 {StudentClassId : scid,
                                        class {ClassId: clsid, Names:name}
                                      }
                        }`;

        await connection.execute(query);
      });
    });

    describe('272.3.9 View Name with Maximum possible string and maximum possible string +1 (128bytes)', function() {
      it('272.3.9.1 case 1 ', async function() {
        if (isOracleDB_23_4) this.skip();

        const viewName = 'n4HHXUjvHxb3RiO0TECKFAhdXx0u7M9kwnh' +
        'J7UT7KOcNwhx0kSHsrc0HaXwS0D154PTdsd4fT3aj7cGXAtAmqEvQvJPoQBqZ09sr1ZBsozd9X5QGHahJqCXX3kgyIgU7';
        const query = `CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW ` + viewName +
                   ` AS
                   student @INSERT @UPDATE @DELETE
                   {
                   StudentId: stuid,
                   StudentName: name,
                    student_class @INSERT @UPDATE @DELETE
                        {StudentClassId : scid,
                            class {ClassId: clsid, Names:name}
                           }
                    }`;

        await connection.execute(query);
        await connection.execute(`DROP VIEW ` + viewName);
      });

      it('272.3.9.2 case 2 ', async function() {
        if (isOracleDB_23_4) this.skip();

        const viewName = 'an4HHXUjvHxb3RiO0TECKFAhdXx0u7M9kwnh' +
        'J7UT7KOcNwhx0kSHsrc0HaXwS0D154PTdsd4fT3aj7cGXAtAmqEvQvJPoQBqZ09sr1ZBsozd9X5QGHahJqCXX3kgyIgU7';
        const query = `CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW ` + viewName +
                   ` AS
                   student @INSERT @UPDATE @DELETE
                   {
                   StudentId: stuid,
                   StudentName: name,
                    student_class @INSERT @UPDATE @DELETE
                        {StudentClassId : scid,
                            class {ClassId: clsid, Names:name}
                           }
                    }`;
        await assert.rejects(
          async () => await connection.execute(query),
          /ORA-00972:/ //ORA-00972: The identifier AN4HHXUJVH...CXX3KGYIGU... exceeds the maximum length of 128 bytes.
        );
      });
    });

    describe('272.3.10 View creation inside a PLSQL Block ', function() {

      it('272.3.10.1 Query with DBMS_SQL', async function() {
        if (isOracleDB_23_4) this.skip();

        const query = `DECLARE
          l_i_cursor_id INTEGER;
          BEGIN
          l_i_cursor_id:=dbms_sql.open_cursor;
            dbms_sql.parse(l_i_cursor_id, 'CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
          AS
          student @INSERT
            {
            StudentId:stuid,
            StudentName:name,
                  student_class @INSERT @UPDATE @DELETE
                      {StudentClassId:scid,
                          class  @CHECK  {ClassId:clsid, Name:name}
                        }
          }'
            , dbms_sql.native);
            dbms_sql.close_cursor(l_i_cursor_id);
            END;
          `;
        await connection.execute(query);

      });

      it('272.3.10.2 Query with EXECUTE IMMEDIATE', async function() {
        if (isOracleDB_23_4) this.skip();

        const query = `BEGIN
           EXECUTE IMMEDIATE 'CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
           AS
           student @INSERT
             {
            StudentId:stuid,
            StudentName:name,
                 student_class @INSERT @UPDATE @DELETE
                          {StudentClassId:scid,
                           class  @CHECK  {ClassId:clsid, Name:name}
                         }
            }';
            END;`;
        await connection.execute(query);
      });
    });

    describe('272.3.11 Create view without privilege ', function() {
      let connection = null;
      let conn = null;
      const user1 = dbConfig.createUser();
      const user2 = dbConfig.createUser();
      const pwd = testsUtil.generateRandomPassword();
      const createUser1 = `CREATE USER ${user1} IDENTIFIED BY ${pwd}`;
      const createUser2 = `CREATE USER ${user2} IDENTIFIED BY ${pwd}`;
      const grantPriv1 = `grant create session, resource, connect, unlimited tablespace to ${user1}`;
      const grantPriv2 = `grant create session to ${user2}`;

      const createTableStudent = `CREATE TABLE student(
                                  stuid NUMBER,
                                  name VARCHAR(128) DEFAULT null,
                                  CONSTRAINT pk_student PRIMARY KEY (stuid)
                                  )`;

      before(async function() {
        if (dbConfig.test.drcp || dbConfig.test.isCmanTdm ||
          !dbConfig.test.DBA_PRIVILEGE || isOracleDB_23_4) {
          this.skip();
        }
        const credential = {
          user: dbConfig.test.DBA_user,
          password: dbConfig.test.DBA_password,
          connectString: dbConfig.connectString,
          privilege: oracledb.SYSDBA,
        };
        connection = await oracledb.getConnection(credential);
        await connection.execute(createUser1);
        await connection.execute(grantPriv1);
        await connection.execute(createUser2);
        await connection.execute(grantPriv2);
        connection.commit();
      });

      after(async function() {
        if (dbConfig.test.drcp || dbConfig.test.isCmanTdm ||
          !dbConfig.test.DBA_PRIVILEGE || isOracleDB_23_4) {
          return;
        }
        await connection.execute(`DROP USER ${user1} CASCADE`);
        await connection.execute(`DROP USER ${user2} CASCADE`);
        await connection.close();
      });

      it('272.3.11.1 Query with test1 user', async function() {

        const studentView =  `CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
                                  AS
                              student @insert @update @delete
                              {StudentId: stuid, StudentName: name}`;
        conn = await oracledb.getConnection({user: user1,
          password: pwd,
          connectString: dbConfig.connectString
        });

        await conn.execute(testsUtil.sqlCreateTable('student', createTableStudent));

        await conn.execute(`INSERT INTO student VALUES (1, 'ABC')`);
        await conn.execute(`INSERT INTO student VALUES (2, 'LMN')`);
        await conn.execute(`INSERT INTO student VALUES (3, 'XYZ')`);
        const query = `SELECT * from student`;
        const result = await conn.execute(query);

        assert(result.rows.length, 3);

        await conn.execute(studentView);

        await conn.close();
      });

      it('272.3.11.2 Query with test2 user', async function() {

        conn = await oracledb.getConnection({user: user2,
          password: pwd,
          connectString: dbConfig.connectString
        });

        await assert.rejects(
          async () => await conn.execute(`SELECT * from ${user1}.student_ov`),
          /ORA-00942:/ //ORA-00942: table or view does not exist
        );
        await conn.close();
      });
    });
  });
});

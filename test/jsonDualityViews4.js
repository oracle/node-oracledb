/* Copyright (c) 2023, Oracle and/or its affiliates. */

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
 *   275. jsonDualityView4.js
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

describe('275. jsonDualityView4.js', function() {

  let connection = null;
  let dbaConn = null;
  let isRunnable = false;

  before(async function() {
    isRunnable = (!dbConfig.test.drcp);
    if (isRunnable) {
      isRunnable = await testsUtil.checkPrerequisites(2100000000, 2300000000);
    }
    if (!isRunnable || dbConfig.test.isCmanTdm) {
      this.skip();
    }

    const dbaCredential = {
      user: dbConfig.test.DBA_user,
      password: dbConfig.test.DBA_password,
      connectString: dbConfig.connectString,
      privilege: oracledb.SYSDBA,
    };
    const pwd = testsUtil.generateRandomPassword();
    dbaConn = await oracledb.getConnection(dbaCredential);

    await dbaConn.execute(`create user njs_jsonDv4 identified by ${pwd}`);
    await dbaConn.execute(`grant create session, resource, connect,
               unlimited tablespace to njs_jsonDv4`);
    connection = await oracledb.getConnection({user: 'njs_jsonDv4',
      password: pwd,
      connectString: dbConfig.connectString
    });

    // create the student table
    await connection.execute(`
      create table student(
        stuid number,
        name varchar(128) default null,
        constraint pk_student primary key (stuid)
      )
    `);
    // create the class table
    await connection.execute(`
      create table class(
        clsid number,
        name varchar2(128),
        constraint pk_class primary key (clsid)
      )
    `);

    // create the student_class table
    await connection.execute(`
      create table student_class (
        scid number,
        stuid number,
        clsid number,
        constraint pk_student_class primary key (scid),
        constraint fk_student_class1 foreign key (stuid) references student(stuid),
        constraint fk_student_class2 foreign key (clsid) references class(clsid)
      )
    `);
  });

  after(async function() {
    if (!isRunnable || dbConfig.test.isCmanTdm) return;

    await connection.execute(`drop table student PURGE`);
    await connection.execute(`drop table class PURGE`);

    await connection.close();
    await dbaConn.execute(`drop user njs_jsonDv4 cascade`);

    await dbaConn.close();
  });

  it('275.1 Test create table, Column defaults', async function() {
    // Create table
    await connection.execute(
      `CREATE TABLE Persons (
        ID int NOT NULL primary key,
        LastName varchar(255) NOT NULL,
        FirstName varchar(255),
        City varchar(255) DEFAULT 'Mum'
      )`
    );

    // Insert data
    await connection.execute(
      `INSERT INTO persons(id,LastName,FirstName) VALUES (123,'Lavingia','Varshil')`
    );

    // Commit transaction
    await connection.commit();

    // Create view
    await connection.execute(
      `CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS persons{ID LastName FirstName City}`
    );

    // Drop table
    await connection.execute('DROP TABLE Persons PURGE');
  });

  it('275.2 Test with Table and column constraints', async function() {
    // CREATE TABLE query
    await connection.execute(`
      CREATE TABLE Persons (
     ID int NOT NULL PRIMARY KEY ,
    LastName varchar(255) NOT NULL,
     FirstName varchar(255),
      CONSTRAINT ID_REL CHECK(ID>12)
     )`);

    // INSERT data into the table
    await connection.execute(`
      insert into persons values (13,'ABC','XYZ')`);

    // COMMIT the transaction
    await connection.execute(`COMMIT`);

    // CREATE JSON RELATIONAL DUALITY VIEW
    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS Persons @insert @update @delete
      {id:id,LastName:LastName,firstname:FirstName
      }`);

    // INSERT data into the view
    await assert.rejects(
      async () => await connection.execute(`
      INSERT INTO student_ov
      VALUES ('{"id":11,"LastName":"ABC","firstname":"XYZ"}')`),
      /ORA-42692:/ // ORA-42692: Cannot insert into JSON Relational Duality View 'STUDENT_OV': Error
      // while inserting into table 'PERSONS'
      // ORA-02290: check constraint (JSONIZE4.ID_REL) violated
    );

    // COMMIT the transaction
    await connection.execute(`COMMIT`);

    const result = await connection.execute(`select * from Persons`);

    assert.deepStrictEqual(result.rows[0], [13, "ABC", "XYZ"]);

    // DROP the tables
    await connection.execute(`DROP TABLE Persons`);
  });

  it('275.3 Test with Virtual columns', async function() {
    // create table t1
    await connection.execute(`
      CREATE TABLE t1 (
        id number PRIMARY KEY,
        product varchar2(50),
        price number(10,2),
        price_with_tax number(10,2) GENERATED ALWAYS AS (round(price*1.2,2)) VIRTUAL
      )
    `);

    // insert some rows into t1
    await connection.execute(`
      INSERT INTO t1 (id, product, price) VALUES (1, 'computer', 1500)
    `);
    await connection.execute(`
      INSERT INTO t1 (id, product, price) VALUES (2, 'bike', 1000)
    `);
    await connection.commit();

    // create JSON relational duality view student_ov
    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS t1{id, product, price, price_with_tax}
    `),
      /ORA-40945:/ // ORA-40945: Column 'PRICE_WITH_TAX' of table 'T1' cannot be selected in JSON
      // relational duality view as it is virtual.
    );

    // drop the table
    await connection.execute(`DROP TABLE t1 PURGE`);
  });

  it('275.4 Test with Column storage clause', async function() {
    // Create table with storage clause
    await connection.execute(`
      CREATE TABLE divisions (
        div_no     NUMBER(2) PRIMARY KEY,
        div_name   VARCHAR2(14),
        location   VARCHAR2(13)
      )
      STORAGE ( INITIAL 8M MAXSIZE 1G )
    `);

    // Insert into table
    await connection.execute(`
      INSERT INTO divisions
      VALUES (12,'abc','mum')
    `);
    await connection.commit();

    // Create JSON Relational Duality View
    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS divisions{div_name div_no location}
    `);

    // In Parallel
    // Drop table and create again with parallel clause
    await connection.execute(`DROP TABLE divisions PURGE`);
    await connection.execute(`
      CREATE TABLE divisions (
        div_no     NUMBER(2) PRIMARY KEY,
        div_name   VARCHAR2(14),
        location   VARCHAR2(13)
      )
    `);

    // Insert into table
    await connection.execute(`
      INSERT INTO divisions
      VALUES (12,'abc','mum')
    `);
    await connection.commit();

    // Create JSON Relational Duality View
    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS divisions{div_no div_name location}
    `);

    // Alter table to add parallel clause
    await connection.execute(`
      ALTER TABLE divisions PARALLEL 4
    `);

    // Explain plan for select query
    await connection.execute(`
      EXPLAIN PLAN FOR
      SELECT /*+ parallel(divisions,4) */
        JSON_VALUE(data, '$.DIV_NO'),
        JSON_VALUE(data, '$.DIV_NAME')
      FROM student_ov
    `);
    await connection.execute(`DROP TABLE divisions PURGE`);
  });

  it('275.5 Test with data dictonary', async function() {
    // create JSON relational duality view
    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS
      SELECT *
      FROM Student
      @INSERT @UPDATE @DELETE {
        StudentId: stuid,
        StudentName: name,
        student_class @INSERT @UPDATE @DELETE {
          StudentClassId : scid,
          class  {ClassId: clsid, Name: name}
        }
      }
    `);

    // display user tables
    const tables = await connection.execute(`
      SELECT table_name
      FROM user_tables
      ORDER BY 1
    `);

    assert.strictEqual(tables.rows.length, 3);
    assert.deepStrictEqual(tables.rows, [["CLASS"], ["STUDENT"], ["STUDENT_CLASS"]]);

    // display user views
    const views = await connection.execute(`
      SELECT view_name, text
      FROM user_views
      ORDER BY 1
    `);

    assert.strictEqual(views.rows.length, 1);

    // check if STUDENT_OV view exists
    const studentOV = await connection.execute(`
      SELECT view_name
      FROM all_views
      WHERE view_name='STUDENT_OV'
      ORDER BY 1
    `);

    assert.deepStrictEqual(studentOV.rows[0], ["STUDENT_OV"]);
  });

  it('275.6 Test with dictionary views', async function() {
    // Query 1: select view_name,view_owner,ROOT_TABLE_NAME from DBA_JSON_DUALITY_VIEWS
    await dbaConn.execute(`
      SELECT view_name, view_owner, ROOT_TABLE_NAME
      FROM DBA_JSON_DUALITY_VIEWS
      ORDER BY view_name`);

    // Query 2: select VIEW_OWNER, VIEW_NAME, RELATIONSHIP from DBA_JSON_DUALITY_VIEW_TABS
    await dbaConn.execute(`
      SELECT VIEW_OWNER, VIEW_NAME, RELATIONSHIP
      FROM DBA_JSON_DUALITY_VIEW_TABS
      ORDER BY VIEW_OWNER`);

    // Query 3: select COLUMN_NAME,DATA_TYPE from DBA_JSON_DUALITY_VIEW_TAB_COLS
    const result = await dbaConn.execute(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM DBA_JSON_DUALITY_VIEW_TAB_COLS
      ORDER BY COLUMN_NAME`);
    assert.strictEqual(result.rows.length, 7);
    assert.deepStrictEqual(result.rows[0], [ 'CLSID', 'NUMBER' ]);
  });

  describe('275.7 Json Duality view with GraphQL', function() {

    it('275.7.1 Create View using GraphQL', async function() {
      // insert data into the student table
      await connection.execute(`
        insert into student values (1, 'ABC')
      `);
      await connection.execute(`
        insert into student values (2, 'XYZ')
      `);
      await connection.execute(`
        insert into student values (3, 'C')
      `);

      // insert data into the class table
      await connection.execute(`
        insert into class values (1, 'CS101')
      `);
      await connection.execute(`
        insert into class values (2, 'CS403')
      `);
      await connection.execute(`
        insert into class values (3, 'PSYCH223')
      `);

      // insert data into the student_class table
      await connection.execute(`
        insert into student_class values (1, 1, 1)
      `);
      await connection.execute(`
        insert into student_class values (2, 2, 2)
      `);
      await connection.execute(`
        insert into student_class values (3, 2, 3)
      `);
      await connection.execute(`
        insert into student_class values (4, 3, 1)
      `);
      await connection.execute(`
        insert into student_class values (5, 3, 2)
      `);

      // commit the transaction
      await connection.commit();

      // create the student_ov view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS select * from
        Student @INSERT @UPDATE @DELETE
        {
          StudentId: stuid, StudentName: name,
          student_class @INSERT @UPDATE @DELETE
            {StudentClassId : scid,
              class   {ClassId: clsid, Name: name}}
        }
      `);

      // commit the transaction
      await connection.commit();
    });
  });

  describe('275.8 Test with different datatypes', function() {
    it('275.8.1 Abstract datatype', async function() {
      // Query to create customer_typ object type
      const createCustomerType = `
        CREATE or REPLACE TYPE customer_typ AS OBJECT
        ( customer_id        NUMBER(6)
        , cust_first_name    VARCHAR2(20)
        , cust_last_name     VARCHAR2(20)
        )
      `;

      // Query to create customer table with customer_typ object type column
      const createCustomerTable = `
        CREATE TABLE customer (
          id NUMBER(20) PRIMARY KEY,
          cust_info customer_typ
        )
      `;

      // Query to create student_ov view using JSON RELATIONAL DUALITY
      const createStudentOvView = `
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS customer { id, cust_info }
      `;

      await connection.execute(createCustomerType);
      await connection.execute(createCustomerTable);
      await assert.rejects(
        async () => await connection.execute(createStudentOvView),
        /ORA-40893:/ //ORA-40893: Unsupported data type used in column
        //'CUST_INFO' of a JSON 189 Relational Duality View 'STUDENT_OV'.
      );
    });

    it('275.8.2 XML datatype', async function() {
      await connection.execute(`create table t(x number(5) primary key, y XMLType)`);
      await assert.rejects(
        async () => await connection.execute(`CREATE OR REPLACE JSON
          RELATIONAL DUALITY VIEW xmltype_ov AS t{x y}`),
        /ORA-40654:/ //ORA-40654: Input to JSON generation function has
        //unsupported data type.
      );

      await connection.execute(`drop table t PURGE`);
    });

    it('275.8.3 JSON datatype', async function() {
      // Query to create customer table with customer_typ object type column
      await connection.execute(`drop table customer`);
      const createCustomerTable = `
        create table customer (id NUMBER(20) PRIMARY KEY,dt json)
      `;

      // Query to create student_ov view using JSON RELATIONAL DUALITY
      const createStudentOvView = `
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
         AS njs_jsonDv4.customer{id abc:customer @nest{dt}}
      `;

      await connection.execute(createCustomerTable);

      //Insert into customer table
      await connection.execute(`insert into customer values(1,'{"PONumber":1600}')`);
      await connection.commit();

      async () => await connection.execute(createStudentOvView);
    });

    it('275.8.4 varray', async function() {
      await connection.execute(`CREATE OR REPLACE TYPE list_v IS VARRAY(2) OF VARCHAR2 (10)`);
      await connection.execute(`create table varray_ov (id NUMBER(20) PRIMARY KEY,names list_v)`);
      await assert.rejects(
        async () => await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW
           student_ov AS varray_ov{id names}`),
        /ORA-40893:/ //ORA-40893: Unsupported data type used in column 'NAMES' of a JSON Relational Duality View 'STUDENT_OV'
      );
      //await connection.execute(`drop table varray_ov`);
    });
  });

  describe('275.9 Test with different types of indexes', function() {
    it('275.9.1 Bitmap join index', async function() {
      // Create the 'emp' table
      await connection.execute(`CREATE TABLE emp(
            deptno NUMBER(5) PRIMARY KEY,
            employee_id NUMBER,
            name VARCHAR(20)
          )`);

      // Create the 'dept' table
      await connection.execute(`CREATE TABLE dept(
        deptno NUMBER(5) PRIMARY KEY,
        dept_id NUMBER,
        dept_name VARCHAR(20),
        CONSTRAINT fk_dept FOREIGN KEY (deptno) REFERENCES emp(deptno)
      )`);

      // Insert data into the 'emp' table
      await connection.execute(`INSERT INTO emp VALUES(1, 10, 'Varshil')`);

      // Insert data into the 'dept' table
      await connection.execute(`INSERT INTO dept VALUES(1, 5, 'JSON_dept')`);

      // Commit the changes
      await connection.execute('COMMIT');

      // Create the bitmap index 'empdept_idx' on the 'emp' table
      await connection.execute(`CREATE BITMAP INDEX empdept_idx ON emp(dept.deptno)
      FROM emp, dept WHERE emp.deptno = dept.deptno`);

      // Create the JSON relational duality view 'student_ov'
      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS emp{deptno employee_id name dept{deptno dept_id dept_name}}`);

      // Drop the 'emp' and 'dept' tables with the PURGE option
      await connection.execute(`drop view student_ov`);
      await connection.execute(`drop table dept PURGE`);
      await connection.execute(`drop table emp PURGE`);
    });

    it('275.9.2 Partitioned index', async function() {
      // Create the 'sales' table with partitions
      await connection.execute(`CREATE TABLE sales
        (prod_id NUMBER(6) PRIMARY KEY
         ,cust_id NUMBER
         ,time_id DATE)
         PARTITION BY RANGE (time_id)
        (PARTITION sales_q1_2006 VALUES LESS THAN (
          TO_DATE('01-APR-2006','dd-MON-yyyy')
        ),
        PARTITION sales_q2_2006 VALUES LESS THAN (
          TO_DATE('01-JUL-2006','dd-MON-yyyy')
        ),
        PARTITION sales_q3_2006 VALUES LESS THAN (
          TO_DATE('01-OCT-2006','dd-MON-yyyy')
        ),
        PARTITION sales_q4_2006 VALUES LESS THAN (
          TO_DATE('01-JAN-2007','dd-MON-yyyy')
        ))`);

      // Insert data into the 'sales' table
      await connection.execute(`INSERT INTO sales VALUES (10, 11, '12-FEB-2006')`);
      await connection.execute(`INSERT INTO sales VALUES (20, 11, '12-JUN-2006')`);
      await connection.execute(`INSERT INTO sales VALUES (30, 11, '12-SEP-2006')`);
      await connection.execute(`INSERT INTO sales VALUES (40, 11, '12-DEC-2006')`);

      // Commit the changes
      await connection.execute('COMMIT');

      // Create the local index 'IDX_LOC' on the 'sales' table
      await connection.execute(`CREATE INDEX IDX_LOC ON sales (time_id)
        LOCAL
        (PARTITION sales_q1_2006,
         PARTITION sales_q2_2006,
         PARTITION sales_q3_2006,
         PARTITION sales_q4_2006)`);

      // Create the JSON relational duality view 'student_ov'
      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS sales{prod_id cust_id time_id}`);

      // Create the Global index 'IDX_LOC' on the 'sales' table
      const createIndex = `
      CREATE INDEX IDX_GLOB ON SALES (time_id)
      GLOBAL PARTITION BY RANGE (time_id) (
        PARTITION sales_q1_2006 VALUES LESS THAN (
          TO_DATE('01-APR-2006','dd-MON-yyyy')
        ),
        PARTITION sales_q2_2006 VALUES LESS THAN (
          TO_DATE('01-JUL-2006','dd-MON-yyyy')
        ),
        PARTITION sales_q3_2006 VALUES LESS THAN (
          TO_DATE('01-OCT-2006','dd-MON-yyyy')
        ),
        PARTITION sales_q4_2006 VALUES LESS THAN (MAXVALUE)
      )`;

      await connection.execute(`drop index idx_loc`);
      await connection.execute(createIndex);

      // create view
      const createView = `
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS sales{prod_id cust_id time_id}
    `;
      await connection.execute(createView);

      await connection.commit();
    });
  });

  describe('275.10 Tests with Attributes like COMPRESS, NOCOMPRESS, PARALLEL', function() {
    it('275.10.1 COMPRESS', async function() {

      // Create table
      await connection.execute(`
      CREATE TABLE unq_idx_demo (
        a NUMBER PRIMARY KEY,
        b NUMBER
      )`);

      // Create unique index
      await connection.execute(`
      CREATE UNIQUE INDEX unq_idx_demo_ab_i
      ON unq_idx_demo(a, b) compress 1`
      );

      // Insert values
      await connection.execute(`INSERT INTO unq_idx_demo(a, b) VALUES(1, 1)`
      );

      // Commit changes
      await connection.commit();

      // Create JSON relational duality view
      await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS unq_idx_demo{a b}`
      );

    });

    it('275.10.2 NOCOMPRESS', async function() {
      await connection.execute(`DROP TABLE unq_idx_demo PURGE`);
      // create table
      await connection.execute(
        `CREATE TABLE unq_idx_demo(
        a NUMBER PRIMARY KEY, b NUMBER
      )`
      );

      // create unique index
      await connection.execute(
        `CREATE UNIQUE INDEX unq_idx_demo_ab_i
      ON unq_idx_demo(a,b) nocompress`
      );

      // insert data
      await connection.execute(
        `INSERT INTO unq_idx_demo(a,b)
      VALUES(1,1)`
      );

      // commit changes
      await connection.commit();

      // create JSON view
      await connection.execute(
        `CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS unq_idx_demo{a b}`
      );

      // drop table
      await connection.execute(`DROP TABLE unq_idx_demo PURGE`);
    });

    it('275.10.3 PARALLEL', async function() {

      await connection.execute(`
      CREATE TABLE a (
        a1 NUMBER primary key
        CONSTRAINT ach CHECK (a1 > 0) ENABLE NOVALIDATE
      )
      PARALLEL
    `);

      await connection.execute(`
      INSERT INTO a values (1)
    `);

      await connection.execute(`
      COMMIT
    `);

      await connection.execute(`
      ALTER TABLE a ENABLE CONSTRAINT ach
    `);

      await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS a{a1}
    `);

      const result = await connection.execute(`
      SELECT s.data
      FROM student_ov s
    `);

      assert.strictEqual(result.rows[0][0].a1, 1);
      await connection.execute('DROP TABLE a PURGE');
    });
  });

  describe('275.11 Tests with Views', function() {
    it('275.11.1 Object view', async function() {
      await assert.rejects(
        async () => await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov of student
                AS
                Student
                {StudentId: stuid, StudentName: name}`),
        /ORA-00902:/ //ORA-00902: invalid datatype
      );

      // drop table student_class
      await connection.execute(`DROP TABLE student_class`);

      // drop table student
      await connection.execute(`DROP TABLE student`);

      // create table student
      await connection.execute(`
      CREATE TABLE student (
        stuid NUMBER,
        name VARCHAR2(128) DEFAULT NULL,
        CONSTRAINT pk_student PRIMARY KEY (stuid)
      )
    `);

      // insert data into student table
      await connection.execute(`INSERT INTO student VALUES (1, 'A')`);
      await connection.execute(`INSERT INTO student VALUES (9, 'B')`);
      await connection.execute(`INSERT INTO student VALUES (81, 'C')`);
      await connection.execute(`INSERT INTO student VALUES (12, 'D')`);
      await connection.execute(`INSERT INTO student VALUES (8, 'E')`);
      await connection.execute(`INSERT INTO student VALUES (4, 'F')`);
      await assert.rejects(
        async () => await connection.execute(`INSERT INTO student VALUES (9, 'G')`),
        /ORA-00001:/ //ORA-00001: unique constraint (JSONDV4.PK_STUDENT) violated
      );
      await connection.execute(`INSERT INTO student VALUES (19, 'H')`);

      // commit the transaction
      await connection.commit();

      // create JSON relational duality view student_ov
      await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS Student {StudentId: stuid, StudentName: name}
    `);

      // select StudentId from student_ov ordered by ascending values
      const result1 = await connection.execute(`
      SELECT json_value(data, '$.StudentId' RETURNING NUMBER)
      FROM student_ov
      ORDER BY 1 ASC
    `);

      assert.deepStrictEqual(result1.rows, [[1], [4], [8], [9], [12], [19], [81]]);

      // select StudentId from student_ov ordered by ascending values
      const result2 = await connection.execute(`
      SELECT s.data.StudentId
      FROM student_ov s
      ORDER BY 1 ASC
    `);
      assert.deepStrictEqual(result2.rows, [[1], [4], [8], [9], [12], [19], [81]]);

      // select StudentId from student_ov ordered by descending values
      const result3 = await connection.execute(`
      SELECT json_value(data, '$.StudentId' RETURNING NUMBER)
      FROM student_ov
      ORDER BY 1 DESC
    `);
      assert.deepStrictEqual(result3.rows, [[81], [19], [12], [9], [8], [4], [1]]);

      // select StudentId from student_ov ordered by descending values
      const result4 = await connection.execute(`
      SELECT s.data.StudentId
      FROM student_ov s
      ORDER BY 1 DESC
    `);
      assert.deepStrictEqual(result4.rows, [[81], [19], [12], [9], [8], [4], [1]]);

      // select StudentName from student_ov ordered by descending values
      const result5 = await connection.execute(`
      SELECT json_value(data, '$.StudentName')
      FROM student_ov
      ORDER BY 1 DESC
    `);
      assert.deepStrictEqual(result5.rows, [['H'], ['F'], ['E'], ['D'], ['C'], ['B'], ['A']]);

      // select StudentName from student_ov ordered by descending values
      const result6 = await connection.execute(`
      SELECT s.data.StudentName
      FROM student_ov s
      ORDER BY 1 DESC
    `);
      assert.deepStrictEqual(result6.rows, [['H'], ['F'], ['E'], ['D'], ['C'], ['B'], ['A']]);

      // select StudentName and StudentId from student_ov ordered by StudentName descending and StudentId ascending
      const result7 = await connection.execute(`
      SELECT json_value(data, '$.StudentName'), json_value(data, '$.StudentId')
      FROM student_ov
      ORDER BY data.StudentName DESC, json_value(data, '$.StudentId') ASC
    `);
      assert.deepStrictEqual(result7.rows, [['H', 19], ['F', 4], ['E', 8], ['D', 12], ['C', 81], ['B', 9], ['A', 1]]);
    });
  });
});

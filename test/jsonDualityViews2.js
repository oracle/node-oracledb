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
 *   273. jsonDualityView2.js
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

(dbConfig.test.isCmanTdm ? describe : describe.skip)('273. jsonDualityView2.js', function() {

  let connection = null;
  let dbaConn = null;
  let isRunnable = false;

  before(async function() {
    isRunnable = (!dbConfig.test.drcp);
    if (isRunnable) {
      isRunnable = await testsUtil.checkPrerequisites(2100000000, 2300000000);
    }
    if (!isRunnable) {
      this.skip();
    }

    const dbaCredential = {
      user          : dbConfig.test.DBA_user,
      password      : dbConfig.test.DBA_password,
      connectString : dbConfig.connectString,
      privilege     : oracledb.SYSDBA,
    };
    const pwd = testsUtil.generateRandomPassword();

    dbaConn = await oracledb.getConnection(dbaCredential);
    await dbaConn.execute(`create user jsonDv2 identified by ${pwd}`);
    await dbaConn.execute(`grant create session, resource, connect,
               unlimited tablespace to jsonDv2`);
    connection = await oracledb.getConnection({user: 'jsonDv2',
      password: pwd,
      connectString: dbConfig.connectString
    });
  });

  after(async function() {
    if (!isRunnable) return;

    await connection.close();
    await dbaConn.execute(`drop user jsonDv2 CASCADE`);
    await dbaConn.close();
  });

  it('273.1 without base table being available (use force option at view creation)', async function() {
    await connection.execute(`CREATE OR REPLACE FORCE JSON RELATIONAL DUALITY VIEW student_ov
                AS student{StudentId: stuid , StudentName: name}`);
    await connection.execute(`create table student(
                    stuid number,
                   name varchar(128) default null,
                    constraint pk_student primary key (stuid)
                   )`);

    // insert data into student table
    await connection.execute(`INSERT INTO student VALUES (1, 'ABC')`);
    await connection.execute(`INSERT INTO student VALUES (2, 'LMN')`);
    await connection.execute(`INSERT INTO student VALUES (3, 'XYZ')`);

    // commit the transaction
    await connection.execute(`COMMIT`);
    let result = await connection.execute(`select * from student order by 1`);

    assert.strictEqual(result.rows.length, 3);
    await connection.execute(`drop table student PURGE`);
  });

  it('273.2 Base table name with various sizes (128)', async function() {
    await connection.execute(`create table hTKFRCNOJyYYvuyUvKsEWhfuObJBjBNnzLVuwqRfaqQA` +
      `dtXBKxOHeheawjKeezZbgmfJJRhovKkhtwTXXnTWYpojdeawBFuAxPNaDAPjxuRzdpzYcHYwYggVCQueeXiv
       (
        stuid number,
         name varchar(128) default null,
         constraint pk_student1 primary key (stuid)
        )`);

    await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
       AS
    select * FROM
       hTKFRCNOJyYYvuyUvKsEWhfuObJBjBNnzLVuwqRfaqQAdtXBKxOHeheawjKeezZbgmfJJRhovKkhtwT` +
         `XXnTWYpojdeawBFuAxPNaDAPjxuRzdpzYcHYwYggVCQueeXiv
      {StudentId: stuid , StudentName: name}`);


    await connection.execute(`drop table hTKFRCNOJyYYvuyUvKsEWhfuObJBjBNnzLVuwqR` +
      `faqQAdtXBKxOHeheawjKeezZbgmfJJRhovKkhtwTXXnTWYpojdeawBFuAxPNaDAPjxuRzdpzYcHYwYggVCQueeXiv PURGE`);
  });

  it('273.3 Perform dbms_metadata.get_ddl() and verify tags were properly added to columns and tables', async function() {
    const result = await connection.execute(`select dbms_metadata.get_ddl( 'VIEW', 'STUDENT_OV', 'JSONDV2' ) from dual`);
    assert.strictEqual(result.metaData[0].name, "DBMS_METADATA.GET_DDL('VIEW','STUDENT_OV','JSONDV2')");
  });

  it('273.4 Base table name maxSize+1', async function() {
    await assert.rejects(
      async () => await connection.execute(`create table ahTKFRCNOJyYYvuyUvKsEWhfuObJBjBNnzLVuwqRfaqQ` +
        `AdtXBKxOHeheawjKeezZbgmfJJRhovKkhtwTXXnTWYpojdeawBFuAxPNaDAPjxuRzdpzYcHYwYggVCQueeXiv
       (
        stuid number,
         name varchar(128) default null,
         constraint pk_student1 primary key (stuid)
        )`),
      /ORA-00972:/ //ORA-00972: The identifier AHTKFRCNOJ...GGVCQUEEXI... exceeds the maximum length of 128 bytes
    );

    await assert.rejects(
      async () => await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
       AS
    select * FROM
       ahTKFRCNOJyYYvuyUvKsEWhfuObJBjBNnzLVuwqRfaqQAdtXBKxOHeheawjKeezZbgmfJJRhovKkhtwT` +
         `XXnTWYpojdeawBFuAxPNaDAPjxuRzdpzYcHYwYggVCQueeXiv
      {StudentId: stuid , StudentName: name}`),
      /ORA-00972:/ //ORA-00972: The identifier AHTKFRCNOJ...GGVCQUEEXI... exceeds the maximum length of 128 bytes
    );
  });

  it('273.5 Create a column name as NOINSERT and add NOINSERT tag to that column', async function() {
    await connection.execute(`create table student(
                    stuid number,
                    NOINSERT varchar(128) default null,
                    constraint pk_student primary key (stuid)
                   )`);

    // insert data into student table
    await connection.execute(`INSERT INTO student VALUES (1, 'ABC')`);
    await connection.execute(`INSERT INTO student VALUES (2, 'LMN')`);
    await connection.execute(`INSERT INTO student VALUES (3, 'XYZ')`);

    // commit the transaction
    await connection.execute(`COMMIT`);
    await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
                              AS
                              student @noupdate
                            {stuid, NOINSERT }`);
    let result = await connection.execute(`select * from student order by 1`);
    assert.strictEqual(result.rows.length, 3);
    await connection.execute(`drop table student PURGE`);
  });

  it('273.6 Specify DELETE, NODELETE both, BUG number : 34657745', async function() {
    await connection.execute(`create table student(
                       stuid number,
                        name varchar(128) default null,
                        constraint pk_student primary key (stuid)
                       )`);

    // insert data into student table
    await connection.execute(`INSERT INTO student VALUES (1, 'ABC')`);
    await connection.execute(`INSERT INTO student VALUES (2, 'LMN')`);
    await connection.execute(`INSERT INTO student VALUES (3, 'XYZ')`);

    // commit the transaction
    await connection.execute(`COMMIT`);
    await assert.rejects(
      async () => await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
                             AS
                               Student
                            {StudentId: stuid @NODELETE, StudentName: name}`),
      /ORA-40934:/ //ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV':
      //Invalid or c onflicting annotations in the WITH clause.
    );
    await assert.rejects(
      async () => await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
                           AS
                            Student @DELETE @nodelete
                           {StudentId: stuid , StudentName: name}`),
      /ORA-40934:/ //ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV':
      //Invalid or c onflicting annotations in the WITH clause.
    );
    await connection.execute(`drop table student PURGE`);
  });

  it('273.7 Repetitive tags', async function() {
    await connection.execute(`create table student(
                            stuid number,
                           name varchar(128) default null,
                             constraint pk_student primary key (stuid)
                           )`);

    // insert data into student table
    await connection.execute(`INSERT INTO student VALUES (1, 'ABC')`);
    await connection.execute(`INSERT INTO student VALUES (2, 'LMN')`);
    await connection.execute(`INSERT INTO student VALUES (3, 'XYZ')`);

    // commit the transaction
    await connection.execute(`COMMIT`);
    await assert.rejects(
      async () => await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
                            AS
                            Student @insert @insert
                            {StudentId: stuid   , StudentName: name @check @check }`),
      /ORA-40947:/ //ORA-40947: A JSON relational duality view is created with duplicate tag 'INSERT'
    );

    await connection.execute(`drop table student PURGE`);
  });

  describe('273.3 Verify view creation on different types of tables', function() {

    const createTableStudent = `create table student( \n` +
                                  `stuid number, \n` +
                                  `name varchar(128) default null, \n` +
                                  `constraint pk_student primary key (stuid) \n` +
                                  `)`;

    before(async function() {
      await connection.execute(createTableStudent);
      //Insert
      await connection.execute(`insert into student values (1, 'ABC')`);
      await connection.execute(`insert into student values (2, 'LMN')`);
      await connection.execute(`insert into student values (3, 'XYZ')`);
      await connection.execute(`commit`);
    });

    after(async function() {
      await connection.execute('drop table student PURGE');
    });

    it('273.3.1 View with Heap', async function() {
      await connection.execute(`CREATE TABLE t1 (c1 NUMBER PRIMARY KEY, c2 VARCHAR2(30)) ORGANIZATION HEAP`);
      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW heap AS t1{c1,c2}`);
      await connection.execute(`drop table t1 PURGE`);
      await connection.execute(`drop view heap`);
    });

    it('273.3.2 View with IOT', async function() {
      await connection.execute(`CREATE TABLE my_iot (id INTEGER PRIMARY KEY, value VARCHAR2(50)) ORGANIZATION INDEX`);
      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW iot AS my_iot{id,value}`);
      await connection.execute(`drop table my_iot PURGE`);
      await connection.execute(`drop view iot`);
    });

    it('273.3.3 View with Partitioned', async function() {
      await connection.execute(`CREATE TABLE sales \n` +
          `( prod_id       NUMBER(6) PRIMARY KEY\n` +
           `, cust_id       NUMBER\n` +
           `, time_id       DATE\n` +
           ` )\n` +
           `PARTITION BY RANGE (time_id)\n` +
          ` ( PARTITION sales_q1_2006 VALUES LESS THAN (TO_DATE('01-APR-2006','dd-MON-yyyy'\n` +
               `))\n` +
           `, PARTITION sales_q2_2006 VALUES LESS THAN (TO_DATE('01-JUL-2006','dd-MON-yyyy'\n` +
             `  ))\n` +
            `, PARTITION sales_q3_2006 VALUES LESS THAN (TO_DATE('01-OCT-2006','dd-MON-yyyy'\n` +
              ` ))\n` +
           `, PARTITION sales_q4_2006 VALUES LESS THAN (TO_DATE('01-JAN-2007','dd-MON-yyyy'\n` +
              ` ))\n` +
          `)`);
      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW partition AS sales{prod_id,cust_id}`);
      await connection.execute(`drop table sales PURGE`);
      await connection.execute(`drop view partition`);
    });

    it('273.3.4 View with cluster', async function() {
      await connection.execute(`CREATE CLUSTER emp_dept (deptno NUMBER(3))\n` +
        `SIZE 600\n` +
         `STORAGE (INITIAL 200K\n` +
            `NEXT 300K\n` +
             `MINEXTENTS 2\n` +
             `PCTINCREASE 33)`);
      await connection.execute(`CREATE TABLE dept (\n` +
           `deptno NUMBER(3) PRIMARY KEY)\n` +
           `CLUSTER emp_dept (deptno)`);

      await assert.rejects(
        async () => await connection.execute(`CREATE OR REPLACE JSON RELATIONAL\n ` +
                                             `DUALITY VIEW clusters AS dept{deptno, emp_dept}`),
        /ORA-00904:/ //ORA-00904: "EMP_DEPT": invalid identifier
      );
      await connection.execute(`DROP CLUSTER emp_dept INCLUDING TABLES`);
    });

    it('273.3.5 View with GTT', async function() {
      await connection.execute(`CREATE GLOBAL TEMPORARY TABLE today_sales(order_id NUMBER primary key)\n` +
                 `ON COMMIT PRESERVE ROWS`);

      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW GTT\n` +
                   `AS today_sales{order_id}`);
      await connection.execute(`drop table today_sales PURGE`);
      await connection.execute(`drop view GTT`);
    });
  });

  describe('273.4 Table and Views', function() {
    let conn1 = null;
    let conn2 = null;
    const pwd = testsUtil.generateRandomPassword();
    const createUser1 = `create user njs_test1 identified by ${pwd}`;
    const createUser2 = `create user njs_test2 identified by ${pwd}`;
    const grantPriv1 = `grant create session, resource, connect, unlimited tablespace to njs_test1`;
    const grantPriv2 = `grant create session, resource, connect, unlimited tablespace to njs_test2`;
    const createTableStudent = `create table student( \n` +
                                  `stuid number, \n` +
                                  `name varchar(128) default null, \n` +
                                  `constraint pk_student primary key (stuid) \n` +
                                  `)`;
    before(async function() {
      if (dbConfig.test.drcp) {
        this.skip();
      }
      await dbaConn.execute(createUser1);
      await dbaConn.execute(grantPriv1);
      await dbaConn.execute(createUser2);
      await dbaConn.execute(grantPriv2);
      conn1 = await oracledb.getConnection({user: 'njs_test1',
        password: pwd,
        connectString: dbConfig.connectString
      });

      conn2 = await oracledb.getConnection({user: 'njs_test2',
        password: pwd,
        connectString: dbConfig.connectString
      });
    });

    after(async function() {
      if (dbConfig.test.drcp) {
        return;
      }
      await conn2.close();
      await conn1.close();
      await dbaConn.execute(`drop user njs_test1 cascade`);
      await dbaConn.execute(`drop user njs_test2 cascade`);
    });

    it('273.4.1 Base table in one schema and View in another schema', async function() {

      await conn1.execute(createTableStudent);
      // insert data into student table
      await conn1.execute(`INSERT INTO student VALUES (1, 'ABC')`);
      await conn1.execute(`INSERT INTO student VALUES (2, 'LMN')`);
      await conn1.execute(`INSERT INTO student VALUES (3, 'XYZ')`);

      // commit the transaction
      await conn1.execute(`COMMIT`);
      // grant select privilege on student table to test2 with grant option
      await conn1.execute(`GRANT SELECT ON student TO njs_test2 WITH GRANT OPTION`);
      await assert.rejects(
        async () => await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW\n ` +
                                             `student_ov as test1__student{stuid,name}`),
        /ORA-00942:/ //ORA-00942: table or view does not exist
      );
    });

    it('273.4.2 Base table as schema_name__table_name', async function() {
      await assert.rejects(
        async () => await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
                        AS
                        jsonize2__student
                        {StudentId: stuid , StudentName: name}`),
        /ORA-00942:/ //ORA-00942: table or view does not exist
      );
    });

    it('273.4.3 Base table with Unique Index on it', async function() {
      await connection.execute(`
        CREATE TABLE unq_idx_demo(
          a NUMBER PRIMARY KEY,
          b NUMBER)
      `);

      await connection.execute(`
        CREATE UNIQUE INDEX unq_idx_demo_ab_i
        ON unq_idx_demo(a, b)
      `);

      await connection.execute(`
        INSERT INTO unq_idx_demo(a, b)
        VALUES (1, 1)
      `);
      await connection.execute('COMMIT');
      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov AS unq_idx_demo{a,b}
      `);

      await connection.execute(`drop table unq_idx_demo PURGE`);
      await connection.execute('drop view student_ov');
    });

    it('273.4.4 Base table with COMPOSITE Index on it', async function() {
      await connection.execute(`
        CREATE TABLE cmp_idx_demo(
         a NUMBER PRIMARY KEY,
         b NUMBER
       )`);

      await connection.execute(`
        CREATE UNIQUE INDEX cmp_idx_demo_ab_i
        ON cmp_idx_demo(a, b)
      `);

      await connection.execute(`
        INSERT INTO cmp_idx_demo(a, b)
        VALUES (1, 1)
      `);
      await connection.execute('COMMIT');
      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov AS cmp_idx_demo{a,b}
      `);

      await connection.execute(`drop table cmp_idx_demo PURGE`);
      await connection.execute('drop view student_ov');
    });

    it('273.4.5 Base table with Function-based index on it', async function() {
      await connection.execute(`
        CREATE TABLE MEMBERS (
          id NUMBER PRIMARY KEY,
            first_name VARCHAR2(20),
          last_name VARCHAR2(20)
          )`);

      await connection.execute(`
        CREATE INDEX members_last_name_fi
         ON members(UPPER(last_name))
      `);

      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov AS members{id,a__b:first_name}
      `);

      await connection.execute(`drop table MEMBERS PURGE`);
      await connection.execute('drop view student_ov');
    });

    it('273.4.6 Base table with bitmap index index on it', async function() {
      await connection.execute(`
        CREATE TABLE bitmap_index_demo(
        id INT GENERATED BY DEFAULT AS IDENTITY,
            active NUMBER NOT NULL,
          PRIMARY KEY(id)
        )`);

      await connection.execute(`
         CREATE BITMAP INDEX bitmap_index_demo_active_i
         ON bitmap_index_demo(active)`);
      await connection.execute(`INSERT INTO bitmap_index_demo(active) VALUES(1)`);

      await connection.execute('COMMIT');

      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov AS bitmap_index_demo{id,active}`);

      await connection.execute(`drop table bitmap_index_demo PURGE`);
      await connection.execute('drop view student_ov');
    });
  });

  describe('273.5 With Redaction on base tables', function() {
    let conn = null;
    const pwd = testsUtil.generateRandomPassword();
    before(async function() {
      if (dbConfig.test.drcp) {
        this.skip();
      }
      await dbaConn.execute(`create user njs_testuser1 identified by ${pwd}`);
      await dbaConn.execute(`grant create session,resource,create table,unlimited tablespace to njs_testuser1`);
      await dbaConn.execute(`grant execute on sys.dbms_redact to njs_testuser1`);
    });

    after(async function() {
      if (dbConfig.test.drcp) {
        return;
      }
      await dbaConn.execute(`drop user njs_testuser1 cascade`);
    });

    it('273.5.1 redaction enabled on a base table', async function() {
      conn = await oracledb.getConnection({user: 'njs_testuser1',
        password: pwd,
        connectString: dbConfig.connectString
      });
      await conn.execute(`create table redact(
          stuid number,
          name varchar(128) default null,
          card_no     number,
          constraint pk_student primary key(stuid))`);
      await conn.execute(`INSERT INTO redact VALUES (1, 'ABC', 1234123412341234)`);
      await conn.execute(`INSERT INTO redact VALUES (2, 'LMN', 2345234523452345)`);
      await conn.execute(`INSERT INTO redact VALUES (3, 'XYZ', 3456345634563456)`);

      // commit the transaction
      await conn.execute(`COMMIT`);
      let result = await conn.execute(`select * from redact order by 1`);
      assert.strictEqual(result.rows.length, 3);
      assert.deepEqual(result.rows[0], [1, "ABC", 1234123412341234]);
      assert.deepEqual(result.rows[1], [2, "LMN", 2345234523452345]);
      assert.deepEqual(result.rows[2], [3, "XYZ", 3456345634563456]);
      await conn.close();

      await dbaConn.execute(`begin
       dbms_redact.add_policy(
        object_schema => 'NJS_TESTUSER1',
          object_name   => 'redact',
          column_name   => 'card_no',
           policy_name   => 'redact_card_info',
          function_type => dbms_redact.full,
           expression    => '1=1'
          );
        end;`);

      conn = await oracledb.getConnection({user: 'njs_testuser1',
        password: pwd,
        connectString: dbConfig.connectString
      });
      result = await conn.execute(`select * from redact order by 1`);

      assert.strictEqual(result.rows.length, 3);
      assert.deepEqual(result.rows[0], [1, "ABC", 0]);
      assert.deepEqual(result.rows[1], [2, "LMN", 0]);
      assert.deepEqual(result.rows[2], [3, "XYZ", 0]);
      await assert.rejects(
        async () => await conn.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov1
            AS redact
          {StudentId: stuid , StudentName: name , cardinfo:card_no}`),
        /ORA-63101:/ //ORA-63101: JSON Duality View Entity Tag (ETAG) column cannot be redacted
      );

      await conn.execute(`drop table redact PURGE`);
      await conn.close();
    });
  });
});

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

describe('273. jsonDualityView2.js', function() {

  let connection = null;
  let dbaConn = null;
  let isRunnable = false;
  const sqlCreateTableStudent = `CREATE TABLE student( \n` +
    `stuid NUMBER, \n` +
    `name VARCHAR(128) DEFAULT null, \n` +
    `CONSTRAINT pk_student PRIMARY KEY(stuid) \n` +
    `)`;

  before(async function() {
    isRunnable = (!(dbConfig.test.drcp || dbConfig.test.isCmanTdm));
    if (isRunnable) {
      isRunnable = await testsUtil.checkPrerequisites(2100000000, 2300000000);
      isRunnable = isRunnable && dbConfig.test.DBA_PRIVILEGE;
    }
    if (!isRunnable) {
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
    await dbaConn.execute(`CREATE USER jsonDv2 IDENTIFIED BY ${pwd}`);
    await dbaConn.execute(`GRANT CREATE SESSION, RESOURCE, CONNECT,
      UNLIMITED TABLESPACE TO jsonDv2`);
    connection = await oracledb.getConnection({user: 'jsonDv2',
      password: pwd,
      connectString: dbConfig.connectString
    });
  });

  after(async function() {
    if (!isRunnable) return;

    await connection.close();
    await dbaConn.execute(`DROP USER jsonDv2 CASCADE`);
    await dbaConn.close();
  });

  it('273.1 without base table being available (use force option at view creation)', async function() {
    await connection.execute(`CREATE OR REPLACE FORCE JSON RELATIONAL DUALITY VIEW student_ov
      AS student{StudentId: stuid , StudentName: name}`);

    await connection.execute(testsUtil.sqlCreateTable('student', sqlCreateTableStudent));

    // insert data into student table
    await connection.execute(`INSERT INTO student VALUES (1, 'ABC')`);
    await connection.execute(`INSERT INTO student VALUES (2, 'LMN')`);
    await connection.execute(`INSERT INTO student VALUES (3, 'XYZ')`);

    // commit the transaction
    await connection.execute(`COMMIT`);
    const result = await connection.execute(`SELECT * FROM student ORDER BY 1`);

    assert.strictEqual(result.rows.length, 3);
    await connection.execute(testsUtil.sqlDropTable(`student`));
  });

  it('273.2 Base table name with various sizes (128)', async function() {
    const table = `hTKFRCNOJyYYvuyUvKsEWhfuObJBjBNnzLVuwqRfaqQA` +
      `dtXBKxOHeheawjKeezZbgmfJJRhovKkhtwTXXnTWYpojdeawBFuAxPNaDAPjxuRzdpzYcHYwYggVCQueeXiv`;
    const sqlCreate = `CREATE TABLE ${table}
      (
        stuid NUMBER,
        name VARCHAR(128) DEFAULT null,
        constraint pk_student1 PRIMARY KEY (stuid)
      )`;
    await connection.execute(testsUtil.sqlCreateTable(table, sqlCreate));

    await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS
      hTKFRCNOJyYYvuyUvKsEWhfuObJBjBNnzLVuwqRfaqQAdtXBKxOHeheawjKeezZbgmfJJRhovKkhtwT` +
      `XXnTWYpojdeawBFuAxPNaDAPjxuRzdpzYcHYwYggVCQueeXiv
        {StudentId: stuid, StudentName: name}`);

    await connection.execute(testsUtil.sqlDropTable(`hTKFRCNOJyYYvuyUvKsEWhfuObJBjBNnzLVuwqR` +
      `faqQAdtXBKxOHeheawjKeezZbgmfJJRhovKkhtwTXXnTWYpojdeawBFuAxPNaDAPjxuRzdpzYcHYwYggVCQueeXiv`));
  });

  it('273.3 Perform dbms_metadata.get_ddl() and verify tags were properly added to columns and tables', async function() {
    const result = await connection.execute(`SELECT dbms_metadata.get_ddl( 'VIEW', 'STUDENT_OV', 'JSONDV2' ) FROM dual`);
    assert.strictEqual(result.metaData[0].name, "DBMS_METADATA.GET_DDL('VIEW','STUDENT_OV','JSONDV2')");
  });

  it('273.4 Base table name maxSize+1', async function() {
    await assert.rejects(
      async () => await connection.execute(`CREATE TABLE ahTKFRCNOJyYYvuyUvKsEWhfuObJBjBNnzLVuwqRfaqQ` +
        `AdtXBKxOHeheawjKeezZbgmfJJRhovKkhtwTXXnTWYpojdeawBFuAxPNaDAPjxuRzdpzYcHYwYggVCQueeXiv
       (
          stuid NUMBER,
          name VARCHAR(128) DEFAULT null,
          CONSTRAINT pk_student1 PRIMARY KEY (stuid)
        )`),
      /ORA-00972:/ //ORA-00972: The identifier AHTKFRCNOJ...GGVCQUEEXI... exceeds the maximum length of 128 bytes
    );

    await assert.rejects(
      async () => await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        select * FROM
          ahTKFRCNOJyYYvuyUvKsEWhfuObJBjBNnzLVuwqRfaqQAdtXBKxOHeheawjKeezZbgmfJJRhovKkhtwT` +
          `XXnTWYpojdeawBFuAxPNaDAPjxuRzdpzYcHYwYggVCQueeXiv
        {StudentId: stuid, StudentName: name}`),
      /ORA-00972:/ //ORA-00972: The identifier AHTKFRCNOJ...GGVCQUEEXI... exceeds the maximum length of 128 bytes
    );
  });

  it('273.5 Create a column name as NOINSERT and add NOINSERT tag to that column', async function() {
    const sqlCreate = `CREATE TABLE student(
      stuid NUMBER,
      NOINSERT VARCHAR(128) DEFAULT null,
      CONSTRAINT pk_student PRIMARY KEY (stuid)
      )`;
    await connection.execute(testsUtil.sqlCreateTable('student', sqlCreate));

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
    const result = await connection.execute(`select * from student order by 1`);
    assert.strictEqual(result.rows.length, 3);
    await connection.execute(testsUtil.sqlDropTable(`student`));
  });

  it('273.6 Specify DELETE, NODELETE both, BUG number : 34657745', async function() {
    await connection.execute(testsUtil.sqlCreateTable('student', sqlCreateTableStudent));

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
      //Invalid or conflicting annotations in the WITH clause.
    );
    await assert.rejects(
      async () => await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
                    AS
                    Student @DELETE @nodelete
                    {StudentId: stuid , StudentName: name}`),
      /ORA-40934:/ //ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV':
      //Invalid or conflicting annotations in the WITH clause.
    );
    await connection.execute(testsUtil.sqlDropTable(`student`));
  });

  it('273.7 Repetitive tags', async function() {
    await connection.execute(testsUtil.sqlCreateTable('student', sqlCreateTableStudent));

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
                            {StudentId: stuid, StudentName: name @check @check }`),
      /ORA-40947:/ //ORA-40947: A JSON relational duality view is created with duplicate tag 'INSERT'
    );

    await connection.execute(testsUtil.sqlDropTable(`student`));
  });

  describe('273.8 Verify view creation on different types of tables', function() {

    before(async function() {
      await connection.execute(testsUtil.sqlCreateTable('student', sqlCreateTableStudent));
      // Insert
      await connection.execute(`INSERT INTO student VALUES (1, 'ABC')`);
      await connection.execute(`INSERT INTO student VALUES (2, 'LMN')`);
      await connection.execute(`INSERT INTO student VALUES (3, 'XYZ')`);
      await connection.execute(`COMMIT`);
    });

    after(async function() {
      await connection.execute(testsUtil.sqlDropTable('student'));
    });

    it('273.8.1 View with Heap', async function() {
      const sqlCreateTable = `CREATE TABLE t1 (c1 NUMBER PRIMARY KEY, c2 VARCHAR2(30)) ORGANIZATION HEAP`;
      await connection.execute(testsUtil.sqlCreateTable('t1', sqlCreateTable));
      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW heap AS t1{c1,c2}`);
      await connection.execute(testsUtil.sqlDropTable(`t1`));
      await connection.execute(`DROP VIEW heap`);
    });

    it('273.8.2 View with IOT', async function() {
      const sqlCreateTable = `CREATE TABLE my_iot (id INTEGER PRIMARY KEY, value VARCHAR2(50)) ORGANIZATION INDEX`;
      await connection.execute(testsUtil.sqlCreateTable('my_iot', sqlCreateTable));
      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW iot AS my_iot{id,value}`);
      await connection.execute(testsUtil.sqlDropTable(`my_iot`));
      await connection.execute(`DROP VIEW iot`);
    });

    it('273.8.3 View with Partitioned Table', async function() {
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
      await connection.execute(testsUtil.sqlDropTable(`sales`));
      await connection.execute(`DROP VIEW partition`);
    });

    it('273.8.4 View with cluster', async function() {
      await connection.execute(`CREATE CLUSTER emp_dept (deptno NUMBER(3))\n` +
        `SIZE 600\n` +
         `STORAGE (INITIAL 200K\n` +
            `NEXT 300K\n` +
            `MINEXTENTS 2\n` +
            `PCTINCREASE 33)`);
      const sqlCreate = `CREATE TABLE dept (\n` +
        `deptno NUMBER(3) PRIMARY KEY)\n` +
        `CLUSTER emp_dept (deptno)`;
      await connection.execute(testsUtil.sqlCreateTable('dept', sqlCreate));

      await assert.rejects(
        async () => await connection.execute(`CREATE OR REPLACE JSON RELATIONAL\n ` +
                                               `DUALITY VIEW clusters AS dept{deptno, emp_dept}`),
        /ORA-00904:/ //ORA-00904: "EMP_DEPT": invalid identifier
      );
      await connection.execute(`DROP CLUSTER emp_dept INCLUDING TABLES`);
    });

    it('273.8.5 View with GTT', async function() {
      await connection.execute(`CREATE GLOBAL TEMPORARY TABLE today_sales(order_id NUMBER primary key)\n` +
                 `ON COMMIT PRESERVE ROWS`);

      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW GTT\n` +
                   `AS today_sales{order_id}`);
      await connection.execute(testsUtil.sqlDropTable(`today_sales`));
      await connection.execute(`DROP VIEW GTT`);
    });
  });

  describe('273.9 Table and Views', function() {
    let conn1 = null;
    let conn2 = null;
    const pwd = testsUtil.generateRandomPassword();
    const createUser1 = `CREATE USER njs_test1 IDENTIFIED BY ${pwd}`;
    const createUser2 = `CREATE USER njs_test2 IDENTIFIED BY ${pwd}`;
    const grantPriv1 = `GRANT CREATE SESSION, RESOURCE, CONNECT, UNLIMITED TABLESPACE TO njs_test1`;
    const grantPriv2 = `GRANT CREATE SESSION, RESOURCE, CONNECT, UNLIMITED TABLESPACE TO njs_test2`;

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
      await dbaConn.execute(`DROP USER njs_test1 CASCADE`);
      await dbaConn.execute(`DROP USER njs_test2 CASCADE`);
    });

    it('273.9.1 Base table in one schema and View in another schema', async function() {
      // create the student table
      await conn1.execute(testsUtil.sqlCreateTable('student', sqlCreateTableStudent));

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

    it('273.9.2 Base table as schema_name__table_name', async function() {
      await assert.rejects(
        async () => await connection.execute(`
          CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
          AS
          jsonize2__student
          {
            StudentId: stuid ,
            StudentName: name
          }
        `),
        /ORA-00942:/ //ORA-00942: table or view does not exist
      );
    });

    it('273.9.3 Base table with Unique Index on it', async function() {
      const sqlCreate = `
        CREATE TABLE unq_idx_demo(
          a NUMBER PRIMARY KEY,
          b NUMBER)
      `;
      await connection.execute(testsUtil.sqlCreateTable('unq_idx_demo', sqlCreate));

      await connection.execute(`
        CREATE UNIQUE INDEX unq_idx_demo_ab_i
        ON unq_idx_demo(a, b)
      `);

      await connection.execute(`
        INSERT INTO unq_idx_demo(a, b) VALUES (1, 1)
      `);
      await connection.execute('COMMIT');
      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov AS unq_idx_demo{a,b}
      `);

      await connection.execute(testsUtil.sqlDropTable(`unq_idx_demo`));
      await connection.execute('DROP VIEW student_ov');
    });

    it('273.9.4 Base table with COMPOSITE Index on it', async function() {
      const sqlCreateTable = `
        CREATE TABLE cmp_idx_demo(
          a NUMBER PRIMARY KEY,
          b NUMBER
        )`;
      await connection.execute(testsUtil.sqlCreateTable('cmp_idx_demo', sqlCreateTable));

      await connection.execute(`
        CREATE UNIQUE INDEX cmp_idx_demo_ab_i
        ON cmp_idx_demo(a, b)
      `);

      await connection.execute(`
        INSERT INTO cmp_idx_demo(a, b) VALUES (1, 1)
      `);
      await connection.execute('COMMIT');
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov AS cmp_idx_demo{a,b}
      `);

      await connection.execute(testsUtil.sqlDropTable(`cmp_idx_demo`));
      await connection.execute('DROP VIEW student_ov');
    });

    it('273.9.5 Base table with Function-based index on it', async function() {
      const sqlCreateTable = `
        CREATE TABLE members (
          id NUMBER PRIMARY KEY,
          first_name VARCHAR2(20),
          last_name VARCHAR2(20)
        )`;
      await connection.execute(testsUtil.sqlCreateTable('members', sqlCreateTable));

      await connection.execute(`
        CREATE INDEX members_last_name_fi
         ON members(UPPER(last_name))
      `);

      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov AS members{id,a__b:first_name}
      `);

      await connection.execute(testsUtil.sqlDropTable(`MEMBERS`));
      await connection.execute('DROP VIEW student_ov');
    });

    it('273.9.6 Base table with bitmap index index on it', async function() {
      const sqlCreateTable = `
        CREATE TABLE bitmap_index_demo (
          id INT GENERATED BY DEFAULT AS IDENTITY,
          active NUMBER NOT NULL,
          PRIMARY KEY(id)
        )`;
      await connection.execute(testsUtil.sqlCreateTable('bitmap_index_demo', sqlCreateTable));

      await connection.execute(`
         CREATE BITMAP INDEX bitmap_index_demo_active_i
         ON bitmap_index_demo(active)`);
      await connection.execute(`
        INSERT INTO bitmap_index_demo(active) VALUES(1)`);

      await connection.execute('COMMIT');

      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov AS bitmap_index_demo{id,active}`);

      await connection.execute(testsUtil.sqlDropTable(`bitmap_index_demo`));
      await connection.execute('DROP VIEW student_ov');
    });
  });

  describe('273.10 With Redaction on base tables', function() {
    let conn = null;
    const pwd = testsUtil.generateRandomPassword();
    before(async function() {
      if (dbConfig.test.drcp) {
        this.skip();
      }
      await dbaConn.execute(`CREATE USER njs_testuser1 IDENTIFIED BY ${pwd}`);
      await dbaConn.execute(`GRANT CREATE SESSION, RESOURCE, CREATE TABLE,
        UNLIMITED TABLESPACE TO njs_testuser1`);
      await dbaConn.execute(`GRANT EXECUTE ON sys.dbms_redact TO njs_testuser1`);
    });

    after(async function() {
      if (dbConfig.test.drcp) {
        return;
      }
      await dbaConn.execute(`DROP USER njs_testuser1 CASCADE`);
    });

    it('273.10.1 redaction enabled on a base table', async function() {
      conn = await oracledb.getConnection({user: 'njs_testuser1',
        password: pwd,
        connectString: dbConfig.connectString
      });
      const sqlCreate = `CREATE TABLE redact(
        stuid NUMBER,
        name VARCHAR(128) DEFAULT null,
        card_no NUMBER,
        CONSTRAINT pk_student PRIMARY KEY (stuid))`;
      await conn.execute(testsUtil.sqlCreateTable('redact', sqlCreate));
      await conn.execute(`INSERT INTO redact VALUES (1, 'ABC', 1234123412341234)`);
      await conn.execute(`INSERT INTO redact VALUES (2, 'LMN', 2345234523452345)`);
      await conn.execute(`INSERT INTO redact VALUES (3, 'XYZ', 3456345634563456)`);

      // commit the transaction
      await conn.execute(`COMMIT`);
      let result = await conn.execute(`SELECT * FROM redact ORDER BY 1`);
      assert.strictEqual(result.rows.length, 3);
      assert.deepStrictEqual(result.rows[0], [1, "ABC", 1234123412341234]);
      assert.deepStrictEqual(result.rows[1], [2, "LMN", 2345234523452345]);
      assert.deepStrictEqual(result.rows[2], [3, "XYZ", 3456345634563456]);
      await conn.close();

      await dbaConn.execute(`
        begin
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
      result = await conn.execute(`SELECT * FROM redact ORDER BY 1`);

      assert.strictEqual(result.rows.length, 3);
      assert.deepStrictEqual(result.rows[0], [1, "ABC", 0]);
      assert.deepStrictEqual(result.rows[1], [2, "LMN", 0]);
      assert.deepStrictEqual(result.rows[2], [3, "XYZ", 0]);
      await assert.rejects(
        async () => await conn.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov1
            AS redact
          {StudentId: stuid , StudentName: name , cardinfo:card_no}`),
        /ORA-63101:/ //ORA-63101: JSON Duality View Entity Tag (ETAG) column cannot be redacted
      );

      await conn.execute(testsUtil.sqlDropTable(`redact`));
      await conn.close();
    });
  });
});

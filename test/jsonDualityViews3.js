/* Copyright (c) 2023, 2025, Oracle and/or its affiliates. */

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
 *   274. jsonDualityView3.js
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

describe('274 jsonDualityView3.js', function() {

  let connection = null;
  let dbaConn = null;
  let isRunnable = false;
  let isOracleDB_23_4;
  const pwd = testsUtil.generateRandomPassword();
  before(async function() {
    isRunnable = (!dbConfig.test.drcp);
    if (isRunnable) {
      isRunnable = await testsUtil.checkPrerequisites(2100000000, 2300000000);
      isRunnable = isRunnable && dbConfig.test.DBA_PRIVILEGE;
    }
    if (!isRunnable || dbConfig.test.isCmanTdm) {
      this.skip();
    }

    // 23.4 requires the _id column for creating JSON Duality Views, which
    // is not added in these tests. So check if the Oracle Database version
    // is 23.4. This condition will be used for some tests to check, if the
    // test should be skipped.
    if (await testsUtil.getMajorDBVersion() === '23.4') {
      isOracleDB_23_4 = true;
    }

    const dbaCredential = {
      user: dbConfig.test.DBA_user,
      password: dbConfig.test.DBA_password,
      connectString: dbConfig.connectString,
      privilege: oracledb.SYSDBA,
    };

    dbaConn = await oracledb.getConnection(dbaCredential);

    await dbaConn.execute(
      `CREATE USER njs_jsonDv3 IDENTIFIED BY ${pwd}`
    );
    await dbaConn.execute(
      `grant create session, resource, connect,
        unlimited tablespace to njs_jsonDv3`
    );
    connection = await oracledb.getConnection({user: 'njs_jsonDv3',
      password: pwd,
      connectString: dbConfig.connectString
    });
  });

  after(async function() {
    if (!isRunnable || dbConfig.test.isCmanTdm) return;

    if (connection) await connection.close();

    if (dbaConn) {
      await dbaConn.execute(`DROP USER njs_jsonDv3 CASCADE`);
      await dbaConn.close();
    }
  });

  it('274.1 Define Columns of View with WITH READ WRITE or WITH READ ONLY annotations', async function() {
    if (isOracleDB_23_4) this.skip();

    // create the student table
    const createTableStudent = `
      CREATE TABLE student(
        stuid NUMBER,
        name VARCHAR(128) DEFAULT null,
        CONSTRAINT pk_student PRIMARY KEY (stuid)
      )`;
    await connection.execute(testsUtil.sqlCreateTable('student', createTableStudent));

    await connection.execute(`
      INSERT INTO student VALUES (1, 'ABC')
    `);

    await connection.execute(`
      INSERT INTO student VALUES (2, 'LMN')
    `);

    await connection.execute(`
      INSERT INTO student VALUES (3, 'XYZ')
    `);

    // commit the transaction
    await connection.commit();

    // make the student table read-only
    await connection.execute(`
      alter table student read only
    `);

    // create a JSON duality view for the student table
    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS
      Student @INSERT @UPDATE @DELETE
      {
        StudentId: stuid, StudentName: name
      }
    `);

    // delete a row from the JSON duality view
    await assert.rejects(
      async () => await connection.execute(`
      delete student_ov where JSON_VALUE(data,'$.StudentId')=1
    `),
      /ORA-12081:/ //ORA-12081: update operation not allowed on table "SCOTT"."STUDENT"
    );

    // make the student table writable again
    await connection.execute(`
      alter table student read write
    `);

    // create the JSON duality view again (with the same name)
    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS
      Student @INSERT @UPDATE @DELETE
      {
        StudentId: stuid, StudentName: name
      }
    `);
    await connection.execute(testsUtil.sqlDropTable(`student`));
    await connection.execute(`DROP VIEW student_ov`);
  });

  it('274.2 Create View on Virtual columns, UNUSED columns', async function() {
    // Virtual columns are supported only from Oracle Database 23.6 onwards
    if (connection.oracleServerVersion < 2306000000) this.skip();

    // create the parts table
    const createTableParts = `
      CREATE TABLE parts(
        part_id INT GENERATED ALWAYS AS IDENTITY,
        part_name VARCHAR2(50) NOT NULL,
        capacity INT NOT NULL,
        cost DEC(15,2) NOT NULL,
        list_price DEC(15,2) NOT NULL,
        gross_margin AS ((list_price - cost) / cost),
        PRIMARY KEY(part_id)
      )`;
    await connection.execute(testsUtil.sqlCreateTable('parts', createTableParts));

    // create a JSON duality view for the parts table
    await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        parts @INSERT @UPDATE @DELETE
        {PartsId: part_id, grossMargin:gross_margin}
      `);
    await connection.execute(testsUtil.sqlDropTable(`parts`));
  });

  it('274.3 Have columns of all scalar types, including FLOAT, TIMESTAMP, TIMESTAMP WITH TIME ZONE', async function() {
    if (isOracleDB_23_4) this.skip();

    //INTERVAL YEAR TO MONTH,INTERVAL DAY TO SECOND,BFILE, LONG, RAW etc in select query

    // create the stores table
    const createTableStores = `
      CREATE TABLE stores (
        store_id          INTEGER generated by default on null as identity,
        store_name        TIMESTAMP WITH TIME ZONE,
        ytm               INTERVAL YEAR TO MONTH,
        dts               INTERVAL DAY TO SECOND,
        latitude          RAW(2),
        longitude         BOOLEAN,
        logo_mime_type    VARCHAR2(50 CHAR),
        logo_filename     BINARY_FLOAT,
        logo_charset      VARCHAR2(50 CHAR),
        logo_last_updated DATE,
        CONSTRAINT        stores_pk PRIMARY KEY(store_id)
      )`;
    await connection.execute(testsUtil.sqlCreateTable('stores', createTableStores));

    // create a JSON duality view for the stores table
    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov as stores {
        store_id, store_name, ytm, dts, latitude,
        longitude, logo_mime_type,
        logo_filename, logo_charset,
        logo_last_updated
      }
    `);

    await connection.execute(testsUtil.sqlDropTable(`stores`));
    await connection.execute(`DROP VIEW student_ov`);
  });

  it('274.4 Create a view with column as schema_name.table_name.column_name', async function() {
    // create the student table
    const createTableStudent = `
      CREATE TABLE student(
        stuid NUMBER,
        name VARCHAR(128) DEFAULT null,
        CONSTRAINT pk_student PRIMARY KEY (stuid)
      )`;
    await connection.execute(testsUtil.sqlCreateTable('student', createTableStudent));

    await assert.rejects(
      async () => await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov \n` +
                            `AS student{StudentId:scotty__student__stuid}`),
      /ORA-00904:/ //ORA-00904: "SCOTTY__STUDENT__STUID": invalid identifier
    );

    await connection.execute(testsUtil.sqlDropTable(`student`));
  });

  it('274.5 Select over Invisible columns', async function() {
    if (isOracleDB_23_4) this.skip();

    // create the student1 table
    const createTableStudent1 = `
      CREATE TABLE student1 (
        stuid NUMBER,
        name VARCHAR(128) DEFAULT null,
        num NUMBER INVISIBLE,
        CONSTRAINT pk_student1 PRIMARY KEY (stuid)
      )`;
    await connection.execute(testsUtil.sqlCreateTable('student1', createTableStudent1));

    await connection.execute("INSERT INTO student1 VALUES (1,'ABC')");
    await connection.execute("INSERT INTO student1 VALUES (2,'LMN')");
    await connection.execute("INSERT INTO student1 VALUES (3,'XYZ')");

    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS Student1{StudentId: stuid,StudentName:name,number:num}
    `);

    // select StudentId from student_ov ordered by ascending values
    const result1 = await connection.execute(`
      SELECT json_value(data, '$.StudentId' RETURNING NUMBER)
      FROM student_ov
      ORDER BY 1 ASC
    `);
    assert.deepStrictEqual(result1.rows, [[1], [2], [3]]);

    // select StudentId from student_ov ordered by ascending values
    const result2 = await connection.execute(`
      SELECT json_value(data, '$.StudentName' RETURNING VARCHAR2)
      FROM student_ov
      ORDER BY 1 ASC
    `);
    assert.deepStrictEqual(result2.rows, [['ABC'], ['LMN'], ['XYZ']]);
    await connection.execute(testsUtil.sqlDropTable(`student1`));
  });

  it('274.6 Add is (Ex: "deptno" IS d.department_id)', async function() {
    if (isOracleDB_23_4) this.skip();

    // create the student table
    const createTableStudent = `
      CREATE TABLE student(
        stuid NUMBER,
        name VARCHAR(128) DEFAULT null,
        CONSTRAINT pk_student PRIMARY KEY (stuid)
      )`;
    await connection.execute(testsUtil.sqlCreateTable('student', createTableStudent));

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS Student{StudentId is stuid, StudentName is name}
    `),
      /ORA-00904:/ //ORA-00904: "IS": invalid identifier
    );

    //key name identical as column name
    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS student{stuid: stuid, StudentName: name}
    `);

    await connection.execute(testsUtil.sqlDropTable(`student`));
    await connection.execute(`DROP VIEW student_ov`);
  });

  it('274.7 Add VISIBLE | INVISIBLE options to define columns in view', async function() {
    // create the student table
    const createTableStudent = `
      CREATE TABLE student(
      stuid NUMBER ,
      name VARCHAR(128) DEFAULT null ,
      num NUMBER INVISIBLE,
      CONSTRAINT pk_student PRIMARY KEY (stuid)
      )`;
    await connection.execute(testsUtil.sqlCreateTable('student', createTableStudent));

    await assert.rejects(
      async () => await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov \n` +
           `AS student{StudentId: stuid ,StudentName:name ,num:num invisible}`),
      /ORA-00904:/ //ORA-00904: "INVISIBLE": invalid identifier
    );

    await connection.execute(testsUtil.sqlDropTable(`student`));
  });

  it('274.8 Create view on NULL columns - empty columns', async function() {
    if (isOracleDB_23_4) this.skip();

    // create the student table
    const createTableStudent = `
      CREATE TABLE student(
      stuid NUMBER,
      name VARCHAR(128) DEFAULT null,
      CONSTRAINT pk_student PRIMARY KEY (stuid)
      )`;
    await connection.execute(testsUtil.sqlCreateTable('student', createTableStudent));

    await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov \n` +
            `AS student{StudentId: stuid,StudentName:name}`);

    await connection.execute("INSERT INTO student VALUES (1, NULL)");
    await connection.execute("INSERT INTO student VALUES (2, NULL)");
    await connection.execute("INSERT INTO student VALUES (3, NULL)");

    await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov \n` +
            `AS student{StudentId: stuid,StudentName:name}`);

    // select StudentId from student_ov ordered by ascending values
    const result = await connection.execute(`
      SELECT json_value(data, '$.StudentId' RETURNING NUMBER)
      FROM student_ov
      ORDER BY 1 ASC
    `);
    assert.deepStrictEqual(result.rows, [[1], [2], [3]]);
    await connection.execute(testsUtil.sqlDropTable(`student`));
    await connection.execute(`DROP VIEW student_ov`);
  });
});

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
 *   277. jsonDualityView6.js
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

(dbConfig.test.isCmanTdm ? describe : describe.skip)('277. jsonDualityView6.js', function() {

  let connection = null;
  let dbaConn = null;
  let isRunnable = false;

  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites(2100000000, 2300000000);
    if (dbConfig.test.drcp || !(isRunnable && dbConfig.test.DBA_PRIVILEGE)) {
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
    await dbaConn.execute(`create user njs_jsonDv6 identified by ${pwd}`);
    await dbaConn.execute(`grant create session, resource, connect, unlimited tablespace to njs_jsonDv6`);
    connection = await oracledb.getConnection({user: 'njs_jsonDv6',
      password: pwd,
      connectString: dbConfig.connectString
    });
  });

  after(async function() {
    if (dbConfig.test.drcp || !isRunnable) return;
    await connection.close();

    await dbaConn.execute(`drop user njs_jsonDv6 cascade`);
    await dbaConn.close();
  });

  describe('277.1 With tables and without constraints relationship', function() {

    before(async function() {
      // create the student table
      await connection.execute(`
      create table student(
        stuid number,
        name varchar(128) default null,
        constraint pk_student primary key (stuid)
      )
    `);

      // create the student_class table
      await connection.execute(`
      create table student_class (
        stuid number primary key,
        scid number,
        clsid number,
        constraint fk_student_class1 foreign key (stuid) references student(stuid)
      )`);
    });

    after(async function() {

      await connection.execute(`drop table student_class PURGE`);
      await connection.execute(`drop table student PURGE`);
    });

    it('277.1.1 Insert data in table and views', async function() {
      await connection.execute(`
      insert into student values (1, 'Ajit')
    `);

      await connection.execute(`
      insert into student values (2, 'Tirthankar')
    `);

      await connection.execute(`
      insert into student values (3, 'Shashank')
    `);

      await connection.execute(`
      insert into student_class values (1, 1, 1)
    `);

      await connection.execute(`
      insert into student_class values (2, 2, 2)
    `);

      await connection.execute(`
      insert into student_class values (3, 3, 3)
    `);

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
      create or replace json relational duality view student_ov
      as
      student @insert@update@delete {
        student_id: stuid,
        student_name: name,
        student_class: student_class @insert@update@delete {
          student_class_id: scid,
          student_id: stuid
        }
      }
    `);

      // Select data from the view
      const result = await connection.execute(`
      select * from student_ov order by 1
    `);

      assert.strictEqual(result.rows.length, 3);
      assert.strictEqual(result.rows[0][0].student_id, 3);
      assert.strictEqual(result.rows[0][0].student_name, "Shashank");
      assert.deepEqual(result.rows[0][0].student_class, [{"student_class_id": 3, "student_id": 3}]);
    });

    it('277.1.2 Sanity DMLs', async function() {
      await connection.execute(`
      insert into student_ov values ('{"student_id":4,"student_name":"Abcd","student_class":[{"student_class_id":1,"student_id":4}]}')
    `);

      await connection.execute(`
      update student_ov s set data = JSON_TRANSFORM(data, SET '$.student_name'='Abcd123') where s.data.student_id = 4
    `);

      await connection.execute(`
      delete student_ov where json_value(data,'$.student_id')=4
    `);

      const result = await connection.execute(`
      select * from student_ov order by 1
    `);

      assert.strictEqual(result.rows.length, 3);
      assert.strictEqual(result.rows[0][0].student_id, 3);
      assert.strictEqual(result.rows[0][0].student_name, "Shashank");
      assert.deepEqual(result.rows[0][0].student_class, [{"student_class_id": 3, "student_id": 3}]);

      await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @INSERT@UPDATE@DELETE
        {
          _id: stuid, StudentName: name,
          StudentClass :
          student_class @INSERT@UPDATE@DELETE
          {
            StudentClassId : scid,
            StudentId:stuid
          }
        }
    `);
    });

    it('277.1.3 With Invalid tags', async function() {
      await assert.rejects(
        async () => await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
          AS
          Student @INSERT@UPDATE@DELETE
        {
          StudentId: stuid @DELETE  , StudentName: name ,
          StudentClass :
          [student_class @INSERT@UPDATE@DELETE
             {StudentClassId : scid,StudentId:stuid }]}
      `),
        /ORA-24558:/ //ORA-24558: syntax error encountered in the input string/
      );

      await assert.rejects(
        async () => await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
          AS
          Student @INSERT@UPDATE@DELETE
        {
          StudentId: stuid @INSERT  , StudentName: name ,
          StudentClass :
          student_class @INSERT@UPDATE@DELETE
             {StudentClassId : scid,StudentId:stuid @INSERT}}
      `),
        /ORA-40934:/ /*ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV': Invalid or
          conflicting annotations in the WITH clause.*/
      );

      await assert.rejects(
        async () => await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
          AS
          Student @INSERT@UPDATE@DELETE
        {
          StudentId: stuid , StudentName: name @DELETE,
          StudentClass :
          student_class @INSERT@UPDATE@DELETE
             {StudentClassId : scid,StudentId:stuid}}
      `),
        /ORA-40934:/ /*ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV': Invalid or
          conflicting annotations in the WITH clause.*/
      );
    });

    describe('277.1.2 Queries(SNT,SNT+where clause)', function() {
      before (async function() {
        await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @INSERT@UPDATE@DELETE
      {
        StudentId: stuid, StudentName: name,
        StudentClass :
        student_class @INSERT@UPDATE@DELETE
           {StudentClassId : scid,StudentId:stuid}}
    `);
      });

      it('277.1.2.1 With SNT', async function() {
        let result = await connection.execute(`select o.data.StudentId as name from student_ov o
      order by o.data.StudentId`);
        assert.deepEqual(result.rows, [[1], [2], [3]]);

        result = await connection.execute(`select o.data.StudentName as name from student_ov o
      order by o.data.StudentName`);
        assert.deepEqual(result.rows, [['Ajit'], ['Shashank'], ['Tirthankar']]);

        result = await connection.execute(`select o.data.StudentClass.StudentClassId from student_ov o
      order by o.data desc
      fetch first 2 rows only`);
        assert.deepEqual(result.rows, [[3], [2]]);

        result = await connection.execute(`select o.data.StudentClass from student_ov o
      order by o.data desc`);
        assert.deepEqual(result.rows[0][0], [{"StudentClassId":3, "StudentId":3}]);
        assert.deepEqual(result.rows[1][0], [{"StudentClassId":2, "StudentId":2}]);
        assert.deepEqual(result.rows[2][0], [{"StudentClassId":1, "StudentId":1}]);

        result = await connection.execute(`select o.data.StudentClass.StudentId,o.data.StudentId from student_ov o
      order by 1`);
        assert.deepEqual(result.rows, [[1, 1], [2, 2], [3, 3]]);
      });

      it('277.1.2.2 SNT+where clause)', async function() {
        let result = await connection.execute(`select o.data.StudentId from student_ov o
      where o.data.StudentId in (1,3) order by 1`);
        assert.deepEqual(result.rows, [[1], [3]]);

        result = await connection.execute(`select distinct o.data.StudentId from student_ov o
      where o.data.StudentId between 1 and 5 order by 1 desc`);
        assert.deepEqual(result.rows, [[3], [2], [1]]);

        result = await connection.execute(`select o.data.StudentId,o.data.StudentName as name from student_ov o
      where o.data.StudentId=2 and o.data.StudentId!=3 order by o.data.StudentName`);
        assert.deepEqual(result.rows, [[2, "Tirthankar"]]);

        result = await connection.execute(`select o.data.StudentId,o.data.StudentClass.StudentId as clsid from student_ov o
      where o.data.StudentId>=2 and o.data.StudentName='Shashank' order by o.data.StudentId`);
        assert.deepEqual(result.rows, [[3, 3]]);

        result = await connection.execute(`select o.data.StudentId from student_ov o
      where o.data.StudentId=1 or o.data.StudentClass.StudentId=3 order by o.data.StudentId desc
      fetch first 2 rows only`);
        assert.deepEqual(result.rows, [[3], [1]]);

        result = await connection.execute(`select o.data.StudentId.number() from student_ov o
      where o.data.StudentId like '%3%' order by o.data.StudentId desc`);
        assert.deepEqual(result.rows, [[3]]);
      });
    });
  });
  describe('277.2 PK-PK-FK', function() {
    before(async function() {
      // create the student table
      await connection.execute(`
        create table student(
        stuid number,
        name varchar(128) default null,
        constraint pk_student primary key (stuid)
      )`);

      // create the student_class table
      await connection.execute(`
        create table student_class (
        scid number,
        stuid number primary key,
        clsid number,
        constraint fk_student_class1 foreign key (stuid) references student(stuid)
      )`);

      await connection.execute(`
        create table class(
        clsid number PRIMARY KEY,
        name varchar2(128),
        constraint fk_class foreign key (clsid) references student_class(stuid)
      )`);
    });

    after(async function() {


      await connection.execute(`drop table class PURGE`);
      await connection.execute(`drop table student_class PURGE`);
      await connection.execute(`drop table student PURGE`);
    });

    it('277.2.1 Insert data in table and views', async function() {
      await connection.execute(`insert into student values (1, 'Ajit')`);
      await connection.execute(`insert into student values (2, 'Tirthankar')`);
      await connection.execute(`insert into student values (3, 'Shashank')`);
      await connection.execute(`insert into student_class values (1, 1, 1)`);
      await connection.execute(`insert into student_class values (2, 2, 2)`);
      await connection.execute(`insert into student_class values (3, 3, 3)`);
      await connection.execute(`insert into class values (1, 'CS101')`);
      await connection.execute(`insert into class values (2, 'CS403')`);
      await connection.execute(`insert into class values (3, 'PSYCH223')`);
      await connection.commit();

      await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
      AS
        Student @INSERT@UPDATE@DELETE
        {
          StudentId: stuid,
          StudentName: name,
          StudentClass :
            student_class @INSERT@UPDATE@DELETE
            {
              StudentClassId : scid,
              StudentId: stuid,
              Class :
                class @INSERT@UPDATE@DELETE
                {
                  ClassId: clsid,
                  Name: name
                }
            }
        }
    `);

      const result = await connection.execute(`select * from student_ov`);
      assert.strictEqual(result.rows.length, 3);
      assert.strictEqual(result.rows[0][0].StudentId, 1);
      assert.strictEqual(result.rows[0][0].StudentName, "Ajit");
      assert.deepEqual(result.rows[0][0].StudentClass, [{"StudentClassId":1,
        "StudentId":1, "Class":[{"ClassId":1, "Name":"CS101"}]}]);
    });

    it('277.2.2 Sanity DMLs', async function() {
      await connection.execute(`
        insert into student_ov values ('{"StudentId":4,
        "StudentName":"Abcd","StudentClass":[{"StudentClassId":1,
        "StudentId":4,"Class":[{"ClassId":4,"Name":"CS102"}]}]}')
      `);
      await connection.execute(`
        update student_ov s set data =JSON_TRANSFORM(data,
        SET '$.StudentName'='Abcd123') where s.data.StudentId=4
      `);
      await connection.execute(`delete student_ov where
        json_value(data,'$.StudentId')=4`);

      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
          AS
          Student @INSERT@UPDATE@DELETE
        {
          _id:student @nest {stuid}, StudentName: name,
          StudentClass :
          student_class @INSERT@UPDATE@DELETE
             {StudentClassId : scid,StudentId: stuid,
              Class : class  {ClassId: clsid, Name: name}}}
      `);

      let result = await connection.execute(`select * from student_ov`);
      assert.strictEqual(result.rows.length, 3);
      assert.deepEqual(result.rows[0][0]._id, {"STUID":1});
      assert.strictEqual(result.rows[0][0].StudentName, "Ajit");
      assert.deepEqual(result.rows[0][0].StudentClass, [{"StudentClassId":1, "StudentId":1,
        "Class":[{"ClassId":1, "Name":"CS101"}]}]);
    });

    it('277.2.3 with different keywords', async function() {
      await connection.execute(`CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
          AS
          Student @INSERT@UPDATE@DELETE
        {
          StudentId: stuid, StudentName: name,
          StudentClass :
          student_class @INSERT@UPDATE@DELETE
             {StudentClassId : scid,StudentId: stuid,
              Class : class @INSERT@UPDATE@DELETE
                {ClassId: clsid, Name: name}}}`);
      await connection.execute(`insert into student values (4,'John')`);
      await connection.execute(`insert into student values (5,'John')`);
      await connection.commit();

      // Group by clause
      await connection.execute(`select count(o.data.StudentId),
                          o.data.StudentName from student_ov o
                          group by o.data.StudentName
                          order by count(o.data.StudentId) desc`);

      await connection.execute(`select count(o.data.StudentId),o.data.StudentName from student_ov o
                          where o.data.StudentId!=3
                          group by o.data.StudentName
                          order by count(o.data.StudentId) desc`);

      // Having clause
      await connection.execute(`select count(o.data.StudentId),o.data.StudentName from student_ov o
                          group by o.data.StudentName
                          having count(o.data.StudentId)>=2
                          order by count(o.data.StudentId)`);

      // "CREATE TABLE AS SELECT"
      await connection.execute(`create table abc1
                          as select *
                          from student_ov o
                          where json_value(data,'$.StudentId')=1`);

      let result = await connection.execute(`select * from abc1`);

      assert.strictEqual(result.rows.length, 1);
      assert.deepEqual(result.rows[0][0].StudentId, 1);
      assert.strictEqual(result.rows[0][0].StudentName, "Ajit");
      assert.deepEqual(result.rows[0][0].StudentClass, [{"StudentClassId":1, "StudentId":1,
        "Class":[{"ClassId":1, "Name":"CS101"}]}]);
      await connection.execute(`create table abc2
                          as select json_value(data,'$.StudentId') col
                          from student_ov o
                          where json_value(data,'$.StudentId')=1`);

      result = await connection.execute(`select * from abc2`);
      assert.strictEqual(result.rows[0][0], "1");
    });
  });
});

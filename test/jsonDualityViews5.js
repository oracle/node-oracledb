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
 *   276. jsonDualityView5.js
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

describe('276. jsonDualityView5.js', function() {

  let connection = null;
  let dbaConn = null;
  let isRunnable = false;

  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites(2100000000, 2300000000);
    if (!(isRunnable && dbConfig.test.DBA_PRIVILEGE)) {
      this.skip();
    }

    const dbaCredential = {
      user          : dbConfig.test.DBA_user,
      password      : dbConfig.test.DBA_password,
      connectString : dbConfig.connectString,
      privilege     : oracledb.SYSDBA,
    };

    dbaConn = await oracledb.getConnection(dbaCredential);
    await dbaConn.execute(`create user jsonDv5 identified by jsonDv5`);
    await dbaConn.execute(`grant ctxapp, connect, resource,create session,create any table,
    create view,CREATE MATERIALIZED VIEW,unlimited tablespace to jsonDv5`);
    connection = await oracledb.getConnection({user: 'jsonDv5',
      password: 'jsonDv5',
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
    if (!isRunnable) return;

    //await connection.execute(`drop table student_class PURGE`);
    await connection.execute(`drop table student_class PURGE`);
    await connection.execute(`drop table class PURGE`);
    await connection.execute(`drop table student PURGE`);
    await connection.close();

    await dbaConn.execute(`drop user jsonDv5 cascade`);
    await dbaConn.close();
  });

  it('276.1 Insert data in table and views', async function() {
    // Insert data into the student table
    await connection.execute(`
      insert into student values (1, 'ABC')
    `);

    await connection.execute(`
      insert into student values (2, 'LMN')
    `);

    await connection.execute(`
      insert into student values (3, 'XYZ')
    `);

    // Insert data into the class table
    await connection.execute(`
      insert into class values (1, 'CS101')
    `);

    await connection.execute(`
      insert into class values (2, 'CS403')
    `);

    await connection.execute(`
      insert into class values (3, 'PSYCH223')
    `);

    // Insert data into the student_class table
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

    // Commit the changes
    await connection.commit();

    // Execute the CREATE VIEW query
    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @INSERT @UPDATE @DELETE
      {
        StudentId: stuid,
        StudentName: name,
        StudentClass :
        student_class @INSERT @UPDATE @DELETE
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name}}}
    `);
  });

  it('276.2 test with Tags in column level', async function() {

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student
      {
        StudentId: stuid,
        StudentName: name @del,
        StudentClass :
        student_class
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name}}}
    `),
      /ORA-40934:/ /*ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV': Invalid or
                    conflicting annotations in the WITH clause */
    );

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @INSERT @UPDATE @DELETE
      {
        StudentId: stuid,
        StudentName: name @ins,
        StudentClass :
        student_class
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name}}}
    `),
      /ORA-40934:/ /*ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV': Invalid or
                    conflicting annotations in the WITH clause */
    );

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student
      {
        StudentId: stuid,
        StudentName: name @UPDATE @NOUPDATE,
        StudentClass :
        student_class @INSERT @UPDATE @DELETE
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name}}}
    `),
      /ORA-40934:/ /*ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV': Invalid or
                    conflicting annotations in the WITH clause */
    );

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @INSERT @UPDATE @DELETE
      {
        StudentId: stuid,
        StudentName: name ,
        StudentClass :
        student_class @INSERT @UPDATE @DELETE
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name @NOUPDATE @NOUPDATE}}}
    `),
      /ORA-40947:/ /*ORA-40947: A JSON relational duality view is created with duplicate tag NOUPDATE' */
    );

    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student
      {
        StudentId: stuid,
        StudentName: name ,
        StudentClass :
        student_class
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name @update }}}
    `);

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student
      {
        StudentId: stuid,
        StudentName: name @DELETE @NODELETE ,
        StudentClass :
        student_class
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name}}}
    `),
      /ORA-40934:/ /*ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV': Invalid or
                    conflicting annotations in the WITH clause */
    );

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student
      {
        StudentId: stuid,
        StudentName: name @NOINSERT,@INSERT ,
        StudentClass :
        student_class
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name}}}
    `),
      /ORA-24558:/ /*ORA-24558: syntax error encountered in the input string */
    );

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student
      {
        StudentId: stuid,
        StudentName: name @CHECK @INSERT  ,
        StudentClass :
        student_class
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name}}}
    `),
      /ORA-40934:/ /*ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV': Invalid or
                    conflicting annotations in the WITH clause */
    );

    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student
      {
        StudentId: stuid,
        StudentName: name @UPDATE@CHECK ,
        StudentClass :
        student_class
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name}}}
    `);

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student
      {
        StudentId: stuid,
        StudentName: name ,
        StudentClass :
        student_class
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name  @CHECK @NOCHECK}}}
    `),
      /ORA-40934:/ /*ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV': Invalid or
                    conflicting annotations in the WITH clause */
    );

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student
      {
        StudentId: stuid,
        StudentName: name ,
        StudentClass :
        student_class
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name  @CHECK@CHECK}}}
    `),
      /ORA-40947:/ /*ORA-40947: A JSON relational duality view is created with duplicate tag 'CHECK'*/
    );

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student
      {
        StudentId: stuid,
        StudentName: name  @NOUPDATE,
        StudentClass :
        student_class
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name @NOUPDATE @UPDATE}}}
    `),
      /ORA-40934:/ /*ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV': Invalid or
                    conflicting annotations in the WITH clause */
    );

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student
      {
        StudentId: stuid,
        StudentName: name  @NOUPDATE @NOUPDATE,
        StudentClass :
        student_class
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name @NOUPDATE @UPDATE}}}
    `),
      /ORA-40947:/ /*ORA-40947: A JSON relational duality view is created with duplicate tag 'CHECK'*/
    );

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student
      {
        StudentId: stuid,
        StudentName: name  @NODELETE @NODELETE,
        StudentClass :
        student_class
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name @NOUPDATE @UPDATE}}}
    `),
      /ORA-40934:/ /*ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV': Invalid or
                    conflicting annotations in the WITH clause */
    );

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student
      {
        StudentId: stuid,
        StudentName: name  @CHECK @CHECK,
        StudentClass :
        student_class
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name}}}
    `),
      /ORA-40947:/ /*ORA-40947: A JSON relational duality view is created with duplicate tag 'CHECK'*/
    );

    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @NOCHECK
      {
        StudentId: stuid,
        StudentName: name  ,
        StudentClass :
        student_class
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name}}}
    `);

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @READONLY
      {
        StudentId: stuid,
        StudentName: name ,
        StudentClass :
        student_class
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name}}}
    `),
      /ORA-40934:/ /*ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV': Invalid or
                    conflicting annotations in the WITH clause */
    );

    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @insert@update@delete
      {
        StudentId: stuid,
        StudentName: name ,
        StudentClass :
        student_class @insert@update@delete
           {StudentClassId : scid,
      Class : class  {ClassId: clsid, Name: name}}}
    `);

    await connection.execute(`
      insert into student_ov values ('
 {"StudentId":5,"StudentName":"ABC",
 "StudentClass":[{"StudentClassId":1,"Class":{"ClassId":1,"Name":"CS101"}}]}')
    `);

    await connection.rollback();

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @insert@update@delete
      {
        StudentId: stuid,
        StudentName: name @READ,
        StudentClass :
        student_class @insert@update@delete
           {StudentClassId : scid,
            Class : class  {ClassId: clsid, Name: name}}}
    `),
      /ORA-40934:/ /*ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV': Invalid or
                    conflicting annotations in the WITH clause */
    );

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @insert@update@delete
      {
        StudentId: stuid,
        StudentName: name @nocheck @nocheck,
        StudentClass :
        student_class @insert@update@delete
           {StudentClassId : scid,
            Class : class  {ClassId: clsid, Name: name}}}
    `),
      /ORA-40947:/ /*ORA-40947: A JSON relational duality view is created with duplicate tag 'CHECK'*/
    );

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student
      {
        StudentId: stuid,
        StudentName: name @ETAG,
        StudentClass :
        student_class @insert@update@delete
           {StudentClassId : scid,
            Class : class  {ClassId: clsid, Name: name}}}
    `),
      /ORA-40934:/ /*ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV': Invalid or
                    conflicting annotations in the WITH clause */
    );

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student
      {
        StudentId: stuid,
        StudentName: name  @CHECKetag @update,
        StudentClass :
        student_class @insert@update@delete
           {StudentClassId : scid,
            Class : class  {ClassId: clsid, Name: name}}}
    `),
      /ORA-40934:/ /*ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV': Invalid or
                    conflicting annotations in the WITH clause */
    );

    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student  @INSERT
      {
        StudentId: stuid
        StudentName: name
        StudentClass :
        student_class @insert@update@delete
           {StudentClassId : scid
            Class : class  {ClassId: clsid Name: name}}}
    `);

    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @insert@update@delete
      {
        StudentId: stuid,
        StudentName: name @NOUPDATE,
        StudentClass :
        student_class @insert@update@delete
           {StudentClassId : scid,
            Class : class  {ClassId: clsid, Name: name}}}
    `);

    await assert.rejects(
      async () => await connection.execute(`
        update student_ov set data=(
  '{"StudentId":1,"StudentName":"Varshil",
  "StudentClass":[{"StudentClassId":1,"Class":{"ClassId":1,"Name":"CS101"}}]}')
  where json_value(data,'$.StudentId')=1
    `),
      /ORA-40940:/ /*ORA-40940: Cannot update field 'StudentName' corresponding to column 'NAME' of
table 'STUDENT' in JSON Relational Duality View 'STUDENT_OV': Missing UPDATE
annotation or NOUPDATE annotation specified.*/
    );

    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @insert@update@delete
      {
        StudentId: stuid,
        StudentName: student @nest {name} ,
        StudentClass :
        student_class @insert@update@delete
           {StudentClassId : scid,
            Class : class  {ClassId: clsid, Name: name}}}
    `);

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @insert@update@delete
      {
        StudentId: stuid,
         StudentName: name ,
         StudentClass : student @nest
         student_class @insert@update@delete
           {StudentClassId : scid,
            Class : class  {ClassId: clsid, Name: name}}}
    `),
      /ORA-40934:/ /*ORA-40934: Cannot create JSON Relational Duality View 'STUDENT_OV': Invalid or
                    conflicting annotations in the WITH clause */
    );

    await assert.rejects(
      async () => await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @insert@update@delete
      {
        StudentId: stuid,
         StudentName: student @nest{Sname:name StudentIds: stuid} ,
         StudentClass :
        student_class @insert@update@delete
           {StudentClassId : scid,
            Class : class  {ClassId: clsid, Name: name}}}
    `),
      /ORA-40895:/ /*ORA-40895: invalid SQL expression in JSON relational duality view (duplicate sub-object)*/
    );

    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @insert@update@delete
      {
        StudentId: stuid,
        StudentName:student @nest {SName:name} ,
        StudentClass :
        student_class @insert@update@delete
           {StudentClassId : scid,
            Class : class  {ClassId: clsid, Name: name}}}
    `);

    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @insert@update@delete
      {
        StudentId: stuid,
        StudentName : student @nest{NULL:name} ,
        StudentClass :
        student_class @insert@update@delete
           {StudentClassId : scid,
            Class : class  {ClassId: clsid, Name: name}}}
    `);

    let result = await connection.execute(`select s.data.StudentName."NULL" from student_ov s`);
    assert.deepEqual(result.rows, [["ABC"], ["LMN"], ["XYZ"]]);
    await connection.execute(`
      CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW student_ov
        AS
        Student @insert@update@delete
      {
        StudentId: stuid,
       StudentName : name ,
         student_class @insert@update@delete
           {StudentClassId : scid,
             class @unnest  {ClassId: clsid, Name: name}}}
    `);
  });
});

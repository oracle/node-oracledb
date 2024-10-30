/* Copyright 2024, Oracle and/or its affiliates. */

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
 *   301. plsqlRowtype.js
 *
 * DESCRIPTION
 *   Test cases using %ROWTYPE in plsql.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const assert = require('assert');
const testsUtil = require('./testsUtil.js');

describe('304. plSqlRowType.js', function() {
  let connection, pool, sysDBAConn;
  const table = 'NODB_ROWTYPE';
  const typeName = `NODB_OBJ`;
  const stmts = [
    `CREATE OR REPLACE PACKAGE  FOO_TEST AS
       TYPE  NODB_ROWTYPE_ARRAY IS TABLE OF NODB_ROWTYPE%ROWTYPE
       INDEX BY BINARY_INTEGER;
       PROCEDURE prGetRecords(out_rec OUT FOO_TEST.NODB_ROWTYPE_ARRAY);
     END FOO_TEST;`,

    `CREATE OR REPLACE PACKAGE BODY FOO_TEST IS
       PROCEDURE prGetRecords(out_rec OUT FOO_TEST.NODB_ROWTYPE_ARRAY)
       IS
         CURSOR c_NODB_ROWTYPE IS
         SELECT *
         FROM NODB_ROWTYPE;
       BEGIN
         OPEN c_NODB_ROWTYPE;
         FETCH c_NODB_ROWTYPE BULK COLLECT INTO out_rec;
         CLOSE c_NODB_ROWTYPE;
       END prGetRecords;
     END FOO_TEST;`
  ];

  const dropPackageSql = `DROP PACKAGE FOO_TEST`;

  const ObjSql = `
    CREATE OR REPLACE TYPE ${typeName} AS OBJECT (
      id NUMBER,
      name NVARCHAR2(30)
      );`;


  const createTableSql = `CREATE TABLE ${table}(
    NUMBERVALUE NUMBER(12),
    STRINGVALUE VARCHAR2(2),
    FIXEDCHARVALUE CHAR(10),
    NSTRINGVALUE NVARCHAR2(60),
    NFIXEDCHARVALUE NCHAR(10),
    RAWVALUE RAW(15),
    INTVALUE INTEGER,
    SMALLINTVALUE SMALLINT,
    REALVALUE REAL,
    DOUBLEPRECISIONVALUE DOUBLE PRECISION,
    FLOATVALUE FLOAT,
    BINARYFLOATVALUE BINARY_FLOAT,
    BINARYDOUBLEVALUE BINARY_DOUBLE,
    DATEVALUE DATE,
    TIMESTAMPVALUE TIMESTAMP,
    TIMESTAMPTZVALUE TIMESTAMP WITH TIME ZONE,
    TIMESTAMPLTZVALUE TIMESTAMP WITH LOCAL TIME ZONE,
    CLOBVALUE CLOB,
    NCLOBVALUE NCLOB,
    BLOBVALUE BLOB,
    OBJECTVALUE NODB_OBJ,
    INVISIBLEVALUE NUMBER INVISIBLE)`;

  let expectedTypes = {
    NUMBERVALUE: { type: oracledb.DB_TYPE_NUMBER, typeName: 'NUMBER' },
    STRINGVALUE: { type: oracledb.DB_TYPE_VARCHAR, typeName: 'VARCHAR2' },
    FIXEDCHARVALUE: { type: oracledb.DB_TYPE_CHAR, typeName: 'CHAR' },
    NSTRINGVALUE: { type: oracledb.DB_TYPE_NVARCHAR, typeName: 'NVARCHAR2' },
    NFIXEDCHARVALUE: { type: oracledb.DB_TYPE_NCHAR, typeName: 'NCHAR' },
    RAWVALUE: { type: oracledb.DB_TYPE_RAW, typeName: 'RAW' },
    INTVALUE: { type: oracledb.DB_TYPE_NUMBER, typeName: 'NUMBER' },
    SMALLINTVALUE: { type: oracledb.DB_TYPE_NUMBER, typeName: 'NUMBER' },
    REALVALUE: { type: oracledb.DB_TYPE_NUMBER, typeName: 'NUMBER' },
    DOUBLEPRECISIONVALUE: {
      type: oracledb.DB_TYPE_NUMBER,
      typeName: 'NUMBER'
    },
    FLOATVALUE: { type: oracledb.DB_TYPE_NUMBER, typeName: 'NUMBER' },
    BINARYFLOATVALUE: {
      type: oracledb.DB_TYPE_BINARY_FLOAT,
      typeName: 'BINARY_FLOAT'
    },
    BINARYDOUBLEVALUE: {
      type: oracledb.DB_TYPE_BINARY_DOUBLE,
      typeName: 'BINARY_DOUBLE'
    },
    DATEVALUE: { type: oracledb.DB_TYPE_DATE, typeName: 'DATE' },
    TIMESTAMPVALUE: {
      type: oracledb.DB_TYPE_TIMESTAMP,
      typeName: 'TIMESTAMP'
    },
    TIMESTAMPTZVALUE: {
      type: oracledb.DB_TYPE_TIMESTAMP_TZ,
      typeName: 'TIMESTAMP WITH TIME ZONE'
    },
    TIMESTAMPLTZVALUE: {
      type: oracledb.DB_TYPE_TIMESTAMP_LTZ,
      typeName: 'TIMESTAMP WITH LOCAL TIME ZONE'
    },
    CLOBVALUE: { type: oracledb.DB_TYPE_CLOB, typeName: 'CLOB' },
    NCLOBVALUE: { type: oracledb.DB_TYPE_NCLOB, typeName: 'NCLOB' },
    BLOBVALUE: { type: oracledb.DB_TYPE_BLOB, typeName: 'BLOB' },
  };

  before(async function() {
    pool = await oracledb.createPool({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString,
      poolMin: 1});
    connection = await oracledb.getConnection(dbConfig);
    await testsUtil.createType(connection, typeName, ObjSql);
    await testsUtil.createTable(connection, table, createTableSql);
    for (const s of stmts) {
      await connection.execute(s);
    }
    const objType = await connection.getDbObjectClass("NODB_OBJ");
    const OBJECTVALUE = {
      type: oracledb.DB_TYPE_OBJECT,
      typeName: objType.prototype.fqn,
      typeClass: objType
    };
    expectedTypes = {...expectedTypes, OBJECTVALUE };
  });

  after(async function() {
    await testsUtil.dropTable(connection, table);
    await testsUtil.dropType(connection, typeName);
    await connection.execute(dropPackageSql);
    await connection.close();
    if (sysDBAConn) {
      await sysDBAConn.close();
    }
    if (pool) {
      await pool.close(0);
    }
  });

  it('304.1 %ROWTYPE', async function() {
    const name = "NODB_ROWTYPE%ROWTYPE";
    const objClass = await connection.getDbObjectClass(name);
    const types = objClass.prototype.attributes;
    assert.deepStrictEqual(expectedTypes, types);
  }); // 304.1

  it('304.2 %ROWTYPE collection', async function() {
    const name = "FOO_TEST.NODB_ROWTYPE_ARRAY";
    const objClass = await connection.getDbObjectClass(name);
    const types = objClass.prototype.elementTypeClass.prototype.attributes;
    assert.deepStrictEqual(expectedTypes, types);
  }); // 304.2

  it('304.3 %ROWTYPE object create and delete in a loop to check cursor leak', async function() {
    if (!dbConfig.test.DBA_PRIVILEGE) this.skip();

    const name = "NODB_ROWTYPE%ROWTYPE";
    const iterations = 100;
    const dbaConfig = {
      user: dbConfig.test.DBA_user,
      password: dbConfig.test.DBA_password,
      connectionString: dbConfig.connectString,
      privilege: oracledb.SYSDBA
    };
    const connection = await pool.getConnection();
    const sid = await testsUtil.getSid(connection);
    await connection.close();
    sysDBAConn = await oracledb.getConnection(dbaConfig);
    const openCount = await testsUtil.getOpenCursorCount(sysDBAConn, sid);
    for (let i = 0; i < iterations; i++) {
      const connection = await pool.getConnection();
      await connection.getDbObjectClass(name);
      await connection.close();
    }
    const newOpenCount = await testsUtil.getOpenCursorCount(sysDBAConn, sid);

    // ensure cursors are not linearly opened as iterations causing leak.
    assert(newOpenCount - openCount < 5);
  }); // 304.3

}); // 304

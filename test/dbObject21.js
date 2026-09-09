/* Copyright 2025, 2026, Oracle and/or its affiliates. */

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
 *   314. dbObject21.js
 *
 * DESCRIPTION
 *   Test different DbObject Attributes.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const assert = require('assert');
const testsUtil = require('./testsUtil.js');

describe('314. dbObject21.js', function() {
  let connection, pool;
  const typeName = `NODB_OBJ`;
  const objAttrName = `NODB_OBJ_ATTR`;

  describe('314.1 check attribute metadata', function() {
    const objAttrSql = `
    CREATE OR REPLACE TYPE ${objAttrName} AS OBJECT (
      id NUMBER,
      name NVARCHAR2(30)
    );`;

    const createTypeSql = `CREATE OR REPLACE TYPE ${typeName} AS OBJECT (
      NUMBERVALUE NUMBER(12),
      NUMBERVALUE2 NUMBER,
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
      FLOATVALUE2 FLOAT(80),
      BINARYFLOATVALUE BINARY_FLOAT,
      BINARYDOUBLEVALUE BINARY_DOUBLE,
      DATEVALUE DATE,
      TIMESTAMPVALUE TIMESTAMP,
      TIMESTAMP0VALUE TIMESTAMP(0),
      TIMESTAMP6VALUE TIMESTAMP(6),
      TIMESTAMP9VALUE TIMESTAMP(9),
      TIMESTAMPTZVALUE TIMESTAMP WITH TIME ZONE,
      TIMESTAMPLTZVALUE TIMESTAMP WITH LOCAL TIME ZONE,
      CLOBVALUE CLOB,
      NCLOBVALUE NCLOB,
      BLOBVALUE BLOB,
      OBJECTVALUE NODB_OBJ_ATTR)`;

    let expectedTypes = {
      NUMBERVALUE: { type: oracledb.DB_TYPE_NUMBER, typeName: 'NUMBER', precision: 12, scale: 0 },
      NUMBERVALUE2: { type: oracledb.DB_TYPE_NUMBER, typeName: 'NUMBER', precision: 0, scale: -127 },
      STRINGVALUE: { type: oracledb.DB_TYPE_VARCHAR, typeName: 'VARCHAR2', maxSize: 2 },
      FIXEDCHARVALUE: { type: oracledb.DB_TYPE_CHAR, typeName: 'CHAR', maxSize: 10 },
      NSTRINGVALUE: { type: oracledb.DB_TYPE_NVARCHAR, typeName: 'NVARCHAR2', maxSize: 60 * 2 },
      NFIXEDCHARVALUE: { type: oracledb.DB_TYPE_NCHAR, typeName: 'NCHAR', maxSize: 10 * 2 },
      RAWVALUE: { type: oracledb.DB_TYPE_RAW, typeName: 'RAW', maxSize: 15 },
      INTVALUE: { type: oracledb.DB_TYPE_NUMBER, typeName: 'NUMBER', precision: 38, scale: 0 },
      SMALLINTVALUE: { type: oracledb.DB_TYPE_NUMBER, typeName: 'NUMBER', precision: 38, scale: 0 },
      REALVALUE: { type: oracledb.DB_TYPE_NUMBER, typeName: 'NUMBER', precision: 63, scale: -127 },
      DOUBLEPRECISIONVALUE: {
        type: oracledb.DB_TYPE_NUMBER,
        typeName: 'NUMBER',
        precision: 126,
        scale: -127
      },
      FLOATVALUE: { type: oracledb.DB_TYPE_NUMBER, typeName: 'NUMBER', precision: 126, scale: -127 },
      FLOATVALUE2: { type: oracledb.DB_TYPE_NUMBER, typeName: 'NUMBER', precision: 80, scale: -127 },
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
        typeName: 'TIMESTAMP',
        precision: 0,
        scale: 6
      },
      TIMESTAMP0VALUE: {
        type: oracledb.DB_TYPE_TIMESTAMP,
        typeName: 'TIMESTAMP',
        precision: 0,
        scale: 0
      },
      TIMESTAMP6VALUE: {
        type: oracledb.DB_TYPE_TIMESTAMP,
        typeName: 'TIMESTAMP',
        precision: 0,
        scale: 6
      },
      TIMESTAMP9VALUE: {
        type: oracledb.DB_TYPE_TIMESTAMP,
        typeName: 'TIMESTAMP',
        precision: 0,
        scale: 9
      },
      TIMESTAMPTZVALUE: {
        type: oracledb.DB_TYPE_TIMESTAMP_TZ,
        typeName: 'TIMESTAMP WITH TIME ZONE',
        precision: 0,
        scale: 6
      },
      TIMESTAMPLTZVALUE: {
        type: oracledb.DB_TYPE_TIMESTAMP_LTZ,
        typeName: 'TIMESTAMP WITH LOCAL TIME ZONE',
        precision: 0,
        scale: 6
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
      await testsUtil.createType(connection, objAttrName, objAttrSql);
      await testsUtil.createType(connection, typeName, createTypeSql);
      const objAttrType = await connection.getDbObjectClass(`${objAttrName}`);
      const OBJECTVALUE = {
        type: oracledb.DB_TYPE_OBJECT,
        typeName: objAttrType.prototype.fqn,
        typeClass: objAttrType
      };
      expectedTypes = { ...expectedTypes, OBJECTVALUE };
    });

    after(async function() {
      await testsUtil.dropType(connection, typeName);
      await testsUtil.dropType(connection, objAttrName);
      await connection.close();
      if (pool) {
        await pool.close(0);
      }
    });

    it('314.1.1 check metadata of DbObject attributes', async function() {
      const objType = await connection.getDbObjectClass(`${typeName}`);
      const types = objType.prototype.attributes;
      assert.deepStrictEqual(types, expectedTypes);
      assert.deepStrictEqual(types.OBJECTVALUE.typeClass.prototype.attributes,
        expectedTypes.OBJECTVALUE.typeClass.prototype.attributes);
    }); // 314.1.1

    describe('314.1.2 check scalar timestamp collection element metadata', function() {
      const collectionTypes = [
        {
          name: 'NODB_TS0_VARRAY',
          sql: 'CREATE OR REPLACE TYPE NODB_TS0_VARRAY AS VARRAY(10) OF TIMESTAMP(0)',
          expected: {
            type: oracledb.DB_TYPE_TIMESTAMP,
            typeName: 'TIMESTAMP'
          }
        },
        {
          name: 'NODB_TS6_TABLE',
          sql: 'CREATE OR REPLACE TYPE NODB_TS6_TABLE AS TABLE OF TIMESTAMP(6)',
          expected: {
            type: oracledb.DB_TYPE_TIMESTAMP,
            typeName: 'TIMESTAMP'
          }
        },
        {
          name: 'NODB_TS9TZ_VARRAY',
          sql: `CREATE OR REPLACE TYPE NODB_TS9TZ_VARRAY AS
            VARRAY(10) OF TIMESTAMP(9) WITH TIME ZONE`,
          expected: {
            type: oracledb.DB_TYPE_TIMESTAMP_TZ,
            typeName: 'TIMESTAMP WITH TIME ZONE'
          }
        },
        {
          name: 'NODB_TSLTZ_TABLE',
          sql: `CREATE OR REPLACE TYPE NODB_TSLTZ_TABLE AS
            TABLE OF TIMESTAMP WITH LOCAL TIME ZONE`,
          expected: {
            type: oracledb.DB_TYPE_TIMESTAMP_LTZ,
            typeName: 'TIMESTAMP WITH LOCAL TIME ZONE',
          }
        }
      ];

      before(async function() {
        for (const collectionType of collectionTypes) {
          await testsUtil.createType(
            connection, collectionType.name, collectionType.sql);
        }
      });

      after(async function() {
        for (const collectionType of collectionTypes) {
          await testsUtil.dropType(connection, collectionType.name);
        }
      });

      it('314.1.2.1 checks scalar collection element metadata', async function() {
        for (const collectionType of collectionTypes) {
          const dbObjectClass = await connection.getDbObjectClass(
            collectionType.name);
          assert.deepStrictEqual(
            dbObjectClass.prototype.elementType,
            collectionType.expected.type);
          assert.deepStrictEqual(
            dbObjectClass.prototype.elementTypeName,
            collectionType.expected.typeName);
        }
      }); // 314.1.2.1
    }); // 314.1.2

  }); // 314.1
});

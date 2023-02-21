/* Copyright (c) 2019, 2022, Oracle and/or its affiliates. */

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
 *   227. dbType02.js
 *
 * DESCRIPTION
 *   Roundtrip tests of binding data of types DB_TYPE_*.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('227. dbType02.js', () => {
  let conn;

  before(async () => {
    conn = await oracledb.getConnection(dbConfig);
  });

  after(async () => {
    await conn.close();
  });

  async function CreateTable(TABLE, TYPE) {
    const sql = `
        CREATE TABLE ${TABLE} (id NUMBER, content ${TYPE})
    `;
    const plsql = testsUtil.sqlCreateTable(TABLE, sql);

    await conn.execute(plsql);
  } // CreateTable()

  async function DropTable(TABLE) {
    const sql = `DROP TABLE ${TABLE} PURGE`;
    await conn.execute(sql);
  } // DropTable

  async function VerifyString(TABLE, TYPE, NODB_TYPE) {
    await CreateTable(TABLE, TYPE);

    let sql = `INSERT INTO ${TABLE} VALUES (:i, :c)`;
    const bindArray = [
      { i: 1, c: 'node-oracledb'},
      { i: 2, c: ''},
      { i: 3, c: null}
    ];
    const opts = {
      autoCommit: true,
      bindDefs: {
        i: { type: oracledb.DB_TYPE_NUMBER },
        c: { type: NODB_TYPE, maxSize: 100 }
      }
    };

    await conn.executeMany(sql, bindArray, opts);

    sql = `SELECT * FROM ${TABLE} ORDER BY ID`;
    const result = await conn.execute(sql);
    const expects = 'node-oracledb';
    assert.strictEqual(result.rows[0][1].trim(), expects);
    assert.strictEqual(result.rows[1][1], null);
    assert.strictEqual(result.rows[1][1], null);

    await DropTable(TABLE);
  } // VerifyString()

  async function VerifyDate(TABLE, TYPE, NODB_TYPE) {
    await CreateTable(TABLE, TYPE);

    let sql = `INSERT INTO ${TABLE} VALUES (:i, :c)`;
    const dateInVal = new Date();
    const bindArray = [
      { i: 1, c: dateInVal },
      { i: 2, c: null }
    ];
    const opts = {
      autoCommit: true,
      bindDefs: {
        i: { type: oracledb.DB_TYPE_NUMBER },
        c: { type: NODB_TYPE, maxSize: 200 }
      }
    };

    await conn.executeMany(sql, bindArray, opts);

    sql = `SELECT * FROM ${TABLE} ORDER BY ID`;
    const result = await conn.execute(sql);
    assert.strictEqual(testsUtil.isDate(result.rows[0][1]), true);
    assert.strictEqual(result.rows[1][1], null);

    await DropTable(TABLE);
  }

  it('227.1 DB_TYPE_VARCHAR', async () => {
    const tableName = 'nodb_type_varchar';
    const type = 'VARCHAR2(50)';
    const dbType = oracledb.DB_TYPE_VARCHAR;
    await VerifyString(tableName, type, dbType);
  }); // 227.1

  it('227.2 DB_TYPE_CHAR', async () => {
    const tableName = 'nodb_type_char';
    const type = 'CHAR(2000)';
    const dbType = oracledb.DB_TYPE_CHAR;
    await VerifyString(tableName, type, dbType);
  }); // 227.2

  it('227.3 DB_TYPE_NVARCHAR', async () => {
    const tableName = 'nodb_type_nvarchar';
    const type = 'NVARCHAR2(2000)';
    const dbType = oracledb.DB_TYPE_NVARCHAR;
    await VerifyString(tableName, type, dbType);
  }); // 227.3

  it('227.4 DB_TYPE_NCHAR', async () => {
    const tableName = 'nodb_type_nchar';
    const type = 'NCHAR(1000)';
    const dbType = oracledb.DB_TYPE_NCHAR;
    await VerifyString(tableName, type, dbType);
  }); // 227.4

  it('227.5 DB_TYPE_DATE', async () => {
    const tableName = 'nodb_type_date';
    const type = 'DATE';
    const dbType = oracledb.DB_TYPE_DATE;
    await VerifyDate(tableName, type, dbType);

  }); // 227.5

  it('227.6 DB_TYPE_TIMESTAMP_LTZ', async () => {
    const tableName = 'nodb_type_date';
    const type = 'TIMESTAMP WITH LOCAL TIME ZONE';
    const dbType = oracledb.DB_TYPE_TIMESTAMP_LTZ;
    await VerifyDate(tableName, type, dbType);

  }); // 227.6
});

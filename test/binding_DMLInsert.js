/* Copyright (c) 2017, 2023, Oracle and/or its affiliates. */

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
 *   92. binding_DMLInsert.js
 *
 * DESCRIPTION
 *   This suite tests the data binding, including:
 *     Test cases insert oracledb type STRING/BUFFER to all db column types
 *     The cases take small/null/large bind values.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const sql      = require('./sql.js');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');
const random   = require('./random.js');

describe('92.binding_DMLInsert.js', function() {

  let connection = null;
  let executeSql = async function(sql) {
    await connection.execute(sql);
  };

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await connection.close();
  });

  let doTest = async function(table_name, content, dbColType, bindType, nullBind, largeVal) {
    let bindVar = { c: { val: content, type: bindType, dir: oracledb.BIND_IN } };
    await dmlInsert(table_name, dbColType, bindVar, bindType, nullBind, largeVal);

    bindVar = [ { val: content, type: bindType, dir: oracledb.BIND_IN } ];
    await dmlInsert(table_name, dbColType, bindVar, bindType, nullBind, largeVal);
  };

  const dmlInsert = async function(table_name, dbColType, bindVar, bindType, nullBind, largeVal) {
    const createTable = sql.createTable(table_name, dbColType);
    const drop_table = "DROP TABLE " + table_name + " PURGE";
    await executeSql(createTable);

    if (largeVal === true) {
      if (bindType === oracledb.STRING) {
        if (dbColType.indexOf("CHAR") > -1) {
          await assert.rejects(
            async () => {
              await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
            },
            // ORA-12899: value too large for column "HR"."TABLE_9250"."CONTENT"
            /ORA-12899:/
          );
        }
        if (dbColType === "NUMBER" || dbColType.indexOf("FLOAT") > -1 || dbColType === "BINARY_DOUBLE") {
          await assert.rejects(
            async () => {
              await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
            },
            // ORA-01722: invalid number
            /ORA-01722:/
          );
        }
        if (dbColType === "DATE") {
          await assert.rejects(
            async () => {
              await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
            },
            // ORA-01858: a non-numeric character was found where a numeric was expected
            /ORA-01858:/
          );
        }
        if (dbColType === "TIMESTAMP") {
          await assert.rejects(
            async () => {
              await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
            },
            // ORA-01877: string is too long for internal buffer
            /ORA-01877:/
          );
        }
        if (dbColType === "BLOB" || dbColType.indexOf("RAW") > -1) {
          await assert.rejects(
            async () => {
              await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
            },
            // ORA-01465: invalid hex number
            /ORA-01465:/
          );
        }
        if (dbColType === "CLOB") {
          await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
        }
      } else {
        if (dbColType === "NUMBER" || dbColType === "DATE" || dbColType === "TIMESTAMP" || dbColType.indexOf("FLOAT") > -1) {
          await assert.rejects(
            async () => {
              await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
            },
            // NUMBER: ORA-00932: inconsistent datatypes: expected NUMBER got BINARY
            // DATE: ORA-00932: inconsistent datatypes: expected DATE got BINARY
            // TIMESTAMP: ORA-00932: inconsistent datatypes: expected TIMESTAMP got BINARY
            // FLOAT: ORA-00932: inconsistent datatypes: expected BINARY_FLOAT got BINARY
            /ORA-00932:/
          );
        }
        if (dbColType.indexOf("CHAR") > -1 || dbColType.indexOf("RAW") > -1) {
          await assert.rejects(
            async () => {
              await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
            },
            // ORA-12899: value too large for column "HR"."TABLE_9250"."CONTENT"
            /ORA-12899:/
          );
        }
        if (dbColType === "BLOB" || dbColType === "CLOB") {
          await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
        }
      }
    } else {
      if (bindType === oracledb.STRING) {
        if (nullBind === true) {
          await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
        } else {
          if (dbColType.indexOf("CHAR") > -1 || dbColType === "CLOB") {
            await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
          }
          if (dbColType === "NUMBER" || dbColType.indexOf("FLOAT") > -1 || dbColType === "BINARY_DOUBLE") {
            await assert.rejects(
              async () => {
                await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
              },
              // ORA-01722: invalid number
              /ORA-01722:/
            );
          }
          if (dbColType === "TIMESTAMP" || dbColType === "DATE") {
            await assert.rejects(
              async () => {
                await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
              },
              // ORA-01858: a non-numeric character was found where a numeric was expected
              /ORA-01858:/
            );
          }
          if (dbColType === "BLOB" || dbColType.indexOf("RAW") > -1) {
            await assert.rejects(
              async () => {
                await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
              },
              // ORA-01465: invalid hex number
              /ORA-01465:/
            );
          }
        }
      } else {
        if (dbColType === "NUMBER" || dbColType === "DATE" || dbColType === "TIMESTAMP" || dbColType.indexOf("FLOAT") > -1) {
          await assert.rejects(
            async () => {
              await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
            },
            // NUMBER: ORA-00932: inconsistent datatypes: expected NUMBER got BINARY
            // DATE: ORA-00932: inconsistent datatypes: expected DATE got BINARY
            // TIMESTAMP: ORA-00932: inconsistent datatypes: expected TIMESTAMP got BINARY
            // FLOAT: ORA-00932: inconsistent datatypes: expected BINARY_FLOAT got BINARY
            /ORA-00932:/
          );
        }

        if (dbColType === "BLOB" || dbColType === "CLOB" || dbColType.indexOf("CHAR") > -1 || dbColType.indexOf("RAW") > -1) {
          await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
        }
      }
    }
    await executeSql(drop_table);
  };

  let tableNamePre = "table_92";
  let index = 0;

  describe('92.1 insert small value of oracledb.STRING/BUFFER', function() {
    it('92.1.1 oracledb.STRING <--> DB: NUMBER', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = "small string";
      let bindType = oracledb.STRING;
      let dbColType = "NUMBER";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.2 oracledb.STRING <--> DB: CHAR', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = "small string";
      let bindType = oracledb.STRING;
      let dbColType = "CHAR";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.3 oracledb.STRING <--> DB: NCHAR', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = "small string";
      let bindType = oracledb.STRING;
      let dbColType = "NCHAR";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = "small string";
      let bindType = oracledb.STRING;
      let dbColType = "VARCHAR2";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.5 oracledb.STRING <--> DB: FLOAT', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = "small string";
      let bindType = oracledb.STRING;
      let dbColType = "FLOAT";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = "small string";
      let bindType = oracledb.STRING;
      let dbColType = "BINARY_FLOAT";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = "small string";
      let bindType = oracledb.STRING;
      let dbColType = "BINARY_DOUBLE";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.8 oracledb.STRING <--> DB: DATE', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = "small string";
      let bindType = oracledb.STRING;
      let dbColType = "DATE";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = "small string";
      let bindType = oracledb.STRING;
      let dbColType = "TIMESTAMP";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.10 oracledb.STRING <--> DB: RAW', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = "small string";
      let bindType = oracledb.STRING;
      let dbColType = "RAW";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.11 oracledb.STRING <--> DB: CLOB', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = "small string";
      let bindType = oracledb.STRING;
      let dbColType = "CLOB";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.12 oracledb.STRING <--> DB: BLOB', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = "small string";
      let bindType = oracledb.STRING;
      let dbColType = "BLOB";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(100);
      let bindType = oracledb.BUFFER;
      let dbColType = "NUMBER";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(100);
      let bindType = oracledb.BUFFER;
      let dbColType = "CHAR";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(100);
      let bindType = oracledb.BUFFER;
      let dbColType = "NCHAR";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(100);
      let bindType = oracledb.BUFFER;
      let dbColType = "VARCHAR2";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(100);
      let bindType = oracledb.BUFFER;
      let dbColType = "FLOAT";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(100);
      let bindType = oracledb.BUFFER;
      let dbColType = "BINARY_FLOAT";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(100);
      let bindType = oracledb.BUFFER;
      let dbColType = "BINARY_DOUBLE";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.20 oracledb.BUFFER <--> DB: DATE', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(100);
      let bindType = oracledb.BUFFER;
      let dbColType = "DATE";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(100);
      let bindType = oracledb.BUFFER;
      let dbColType = "TIMESTAMP";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.22 oracledb.BUFFER <--> DB: RAW', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(100);
      let bindType = oracledb.BUFFER;
      let dbColType = "RAW";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(100);
      let bindType = oracledb.BUFFER;
      let dbColType = "CLOB";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(100);
      let bindType = oracledb.BUFFER;
      let dbColType = "BLOB";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });
  });

  describe('92.2 insert null value of oracledb.STRING/BUFFER', function() {
    it('92.2.1 oracledb.STRING <--> DB: NUMBER', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.STRING;
      let dbColType = "NUMBER";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.2 oracledb.STRING <--> DB: CHAR', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.STRING;
      let dbColType = "CHAR";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.3 oracledb.STRING <--> DB: NCHAR', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.STRING;
      let dbColType = "NCHAR";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.STRING;
      let dbColType = "VARCHAR2";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.5 oracledb.STRING <--> DB: FLOAT', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.STRING;
      let dbColType = "FLOAT";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.STRING;
      let dbColType = "BINARY_FLOAT";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.STRING;
      let dbColType = "BINARY_DOUBLE";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.8 oracledb.STRING <--> DB: DATE', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.STRING;
      let dbColType = "DATE";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.STRING;
      let dbColType = "TIMESTAMP";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.10 oracledb.STRING <--> DB: RAW', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.STRING;
      let dbColType = "RAW";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.11 oracledb.STRING <--> DB: CLOB', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.STRING;
      let dbColType = "CLOB";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.12 oracledb.STRING <--> DB: BLOB', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.STRING;
      let dbColType = "BLOB";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.BUFFER;
      let dbColType = "NUMBER";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.BUFFER;
      let dbColType = "CHAR";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.BUFFER;
      let dbColType = "NCHAR";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.BUFFER;
      let dbColType = "VARCHAR2";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.BUFFER;
      let dbColType = "FLOAT";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.BUFFER;
      let dbColType = "BINARY_FLOAT";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.BUFFER;
      let dbColType = "BINARY_DOUBLE";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.20 oracledb.BUFFER <--> DB: DATE', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.BUFFER;
      let dbColType = "DATE";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.BUFFER;
      let dbColType = "TIMESTAMP";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.22 oracledb.BUFFER <--> DB: RAW', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.BUFFER;
      let dbColType = "RAW";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.BUFFER;
      let dbColType = "CLOB";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = null;
      let bindType = oracledb.BUFFER;
      let dbColType = "BLOB";
      let nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });
  });

  describe('92.3 insert large value of oracledb.STRING/BUFFER', function() {
    it('92.3.1 oracledb.STRING <--> DB: NUMBER', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = random.getRandomLengthString(2000);
      let bindType = oracledb.STRING;
      let dbColType = "NUMBER";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.2 oracledb.STRING <--> DB: CHAR', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = random.getRandomLengthString(2000);
      let bindType = oracledb.STRING;
      let dbColType = "CHAR";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.3 oracledb.STRING <--> DB: NCHAR', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = random.getRandomLengthString(2000);
      let bindType = oracledb.STRING;
      let dbColType = "NCHAR";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = random.getRandomLengthString(2000);
      let bindType = oracledb.STRING;
      let dbColType = "VARCHAR2";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.5 oracledb.STRING <--> DB: FLOAT', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = random.getRandomLengthString(2000);
      let bindType = oracledb.STRING;
      let dbColType = "FLOAT";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = random.getRandomLengthString(2000);
      let bindType = oracledb.STRING;
      let dbColType = "BINARY_FLOAT";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = random.getRandomLengthString(2000);
      let bindType = oracledb.STRING;
      let dbColType = "BINARY_DOUBLE";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.8 oracledb.STRING <--> DB: DATE', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = "abc" + random.getRandomLengthString(1997);
      let bindType = oracledb.STRING;
      let dbColType = "DATE";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = random.getRandomLengthString(2000);
      let bindType = oracledb.STRING;
      let dbColType = "TIMESTAMP";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.10 oracledb.STRING <--> DB: RAW', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = random.getRandomLengthString(2000);
      let bindType = oracledb.STRING;
      let dbColType = "RAW";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.11 oracledb.STRING <--> DB: CLOB', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = random.getRandomLengthString(2000);
      let bindType = oracledb.STRING;
      let dbColType = "CLOB";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.12 oracledb.STRING <--> DB: BLOB', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = random.getRandomLengthString(2000);
      let bindType = oracledb.STRING;
      let dbColType = "BLOB";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(2000);
      let bindType = oracledb.BUFFER;
      let dbColType = "NUMBER";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(2000);
      let bindType = oracledb.BUFFER;
      let dbColType = "CHAR";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(2000);
      let bindType = oracledb.BUFFER;
      let dbColType = "NCHAR";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(2000);
      let bindType = oracledb.BUFFER;
      let dbColType = "VARCHAR2";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(2000);
      let bindType = oracledb.BUFFER;
      let dbColType = "FLOAT";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(2000);
      let bindType = oracledb.BUFFER;
      let dbColType = "BINARY_FLOAT";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(2000);
      let bindType = oracledb.BUFFER;
      let dbColType = "BINARY_DOUBLE";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.20 oracledb.BUFFER <--> DB: DATE', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(2000);
      let bindType = oracledb.BUFFER;
      let dbColType = "DATE";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(2000);
      let bindType = oracledb.BUFFER;
      let dbColType = "TIMESTAMP";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.22 oracledb.BUFFER <--> DB: RAW', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(2000);
      let bindType = oracledb.BUFFER;
      let dbColType = "RAW";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(2000);
      let bindType = oracledb.BUFFER;
      let dbColType = "CLOB";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      index++;
      let table_name = tableNamePre + index;
      let content = assist.createBuffer(2000);
      let bindType = oracledb.BUFFER;
      let dbColType = "BLOB";
      let nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });
  });
});

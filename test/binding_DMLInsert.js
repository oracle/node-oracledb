/* Copyright (c) 2017, 2025, Oracle and/or its affiliates. */

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
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');
const random   = require('./random.js');
const testsUtil = require('./testsUtil.js');

describe('92.binding_DMLInsert.js', function() {

  let connection = null;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await connection.close();
  });

  const getExpectedErrorPattern = function(bindType, dbColType, largeVal, nullBind) {
    if (bindType === oracledb.STRING) {
      // STRING bindings
      if (nullBind === true) {
        return null;
      }

      if (largeVal === true) {
        // Large STRING value tests
        if (dbColType.indexOf("CHAR") > -1) {
          return /ORA-12899:/; // value too large for column "HR"."TABLE_9250"."CONTENT"
        }
        if (dbColType === "NUMBER" || dbColType.indexOf("FLOAT") > -1 || dbColType === "BINARY_DOUBLE") {
          return /ORA-01722:/; // invalid number
        }
        if (dbColType === "DATE") {
          return /ORA-01858:/; // non-numeric character found where numeric expected
        }
        if (dbColType === "TIMESTAMP") {
          return /ORA-01877:|ORA-01866:|ORA-01830:/;
          // ORA-01877: string is too long for internal buffer
          // ORA-01866: the datetime class is invalid
          // ORA-01830: The string being converted to a date is too long to
          // match the date format 'DD-MON-RR HH.MI.SSXFF AM'
        }
        if (dbColType === "BLOB" || dbColType.indexOf("RAW") > -1) {
          return /ORA-01465:/; // invalid hex number
        }
        if (dbColType === "CLOB") {
          return null;
        }
      } else {
        // Small STRING value tests
        if (dbColType.indexOf("CHAR") > -1 || dbColType === "CLOB") {
          return null;
        }
        if (dbColType === "NUMBER" || dbColType.indexOf("FLOAT") > -1 || dbColType === "BINARY_DOUBLE") {
          return /ORA-01722:/; // invalid number
        }
        if (dbColType === "TIMESTAMP" || dbColType === "DATE") {
          return /ORA-01858:/; // non-numeric character found where numeric expected
        }
        if (dbColType === "BLOB" || dbColType.indexOf("RAW") > -1) {
          return /ORA-01465:/; // invalid hex number
        }
      }
    } else {
      // BUFFER bindings
      // BUFFER bindings to incompatible types always fail with ORA-00932, even with null values
      if (dbColType === "NUMBER" || dbColType === "DATE" || dbColType === "TIMESTAMP" ||
          dbColType.indexOf("FLOAT") > -1 || dbColType === "BINARY_DOUBLE") {
        return /ORA-00932:/; // inconsistent datatypes
      }

      if (nullBind === true) {
        // Null BUFFER bindings to compatible types succeed
        if (dbColType === "BLOB" || dbColType === "CLOB" || dbColType.indexOf("CHAR") > -1 || dbColType.indexOf("RAW") > -1) {
          return null;
        }
      } else {
        // Non-null BUFFER bindings
        if (largeVal === true) {
          // Large BUFFER values
          if (dbColType.indexOf("CHAR") > -1 || dbColType.indexOf("RAW") > -1) {
            return /ORA-12899:/; // value too large for column
          }
          if (dbColType === "BLOB" || dbColType === "CLOB") {
            return null;
          }
        } else {
          // Small BUFFER values
          if (dbColType === "BLOB" || dbColType === "CLOB" || dbColType.indexOf("CHAR") > -1 || dbColType.indexOf("RAW") > -1) {
            return null;
          }
        }
      }
    }
    return null;
  };

  const doTest = async function(table_name, content, dbColType, bindType, nullBind, largeVal) {
    let bindVar = { c: { val: content, type: bindType, dir: oracledb.BIND_IN } };
    await dmlInsert(table_name, dbColType, bindVar, bindType, nullBind, largeVal);

    bindVar = [ { val: content, type: bindType, dir: oracledb.BIND_IN } ];
    await dmlInsert(table_name, dbColType, bindVar, bindType, nullBind, largeVal);
  };

  const dmlInsert = async function(table_name, dbColType, bindVar, bindType, nullBind, largeVal) {
    await testsUtil.createBindingTestTable(connection, table_name, dbColType);

    const expectedError = getExpectedErrorPattern(bindType, dbColType, largeVal, nullBind);

    if (expectedError) {
      await assert.rejects(
        async () => {
          await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
        },
        expectedError
      );
    } else {
      await connection.execute("insert into " + table_name + " ( content ) values (:c)", bindVar);
    }

    await testsUtil.dropTable(connection, table_name);
  };

  const tableNamePre = "table_92";
  let index = 0;

  describe('92.1 insert small value of oracledb.STRING/BUFFER', function() {
    it('92.1.1 oracledb.STRING <--> DB: NUMBER', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "NUMBER";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.2 oracledb.STRING <--> DB: CHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "CHAR";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.3 oracledb.STRING <--> DB: NCHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "NCHAR";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "VARCHAR2";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.5 oracledb.STRING <--> DB: FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "FLOAT";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "BINARY_FLOAT";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "BINARY_DOUBLE";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.8 oracledb.STRING <--> DB: DATE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "DATE";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "TIMESTAMP";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.10 oracledb.STRING <--> DB: RAW', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "RAW";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.11 oracledb.STRING <--> DB: CLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "CLOB";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.12 oracledb.STRING <--> DB: BLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "BLOB";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "NUMBER";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "CHAR";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "NCHAR";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "VARCHAR2";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "FLOAT";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "BINARY_FLOAT";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "BINARY_DOUBLE";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.20 oracledb.BUFFER <--> DB: DATE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "DATE";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "TIMESTAMP";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.22 oracledb.BUFFER <--> DB: RAW', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "RAW";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "CLOB";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.1.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "BLOB";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });
  });

  describe('92.2 insert null value of oracledb.STRING/BUFFER', function() {
    it('92.2.1 oracledb.STRING <--> DB: NUMBER', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "NUMBER";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.2 oracledb.STRING <--> DB: CHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "CHAR";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.3 oracledb.STRING <--> DB: NCHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "NCHAR";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "VARCHAR2";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.5 oracledb.STRING <--> DB: FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "FLOAT";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "BINARY_FLOAT";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "BINARY_DOUBLE";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.8 oracledb.STRING <--> DB: DATE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "DATE";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "TIMESTAMP";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.10 oracledb.STRING <--> DB: RAW', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "RAW";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.11 oracledb.STRING <--> DB: CLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "CLOB";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.12 oracledb.STRING <--> DB: BLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "BLOB";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "NUMBER";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "CHAR";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "NCHAR";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "VARCHAR2";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "FLOAT";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "BINARY_FLOAT";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "BINARY_DOUBLE";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.20 oracledb.BUFFER <--> DB: DATE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "DATE";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "TIMESTAMP";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.22 oracledb.BUFFER <--> DB: RAW', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "RAW";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "CLOB";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });

    it('92.2.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "BLOB";
      const nullBind = true;
      await doTest(table_name, content, dbColType, bindType, nullBind, false);
    });
  });

  describe('92.3 insert large value of oracledb.STRING/BUFFER', function() {
    it('92.3.1 oracledb.STRING <--> DB: NUMBER', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = random.getRandomLengthString(2000);
      const bindType = oracledb.STRING;
      const dbColType = "NUMBER";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.2 oracledb.STRING <--> DB: CHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = random.getRandomLengthString(2000);
      const bindType = oracledb.STRING;
      const dbColType = "CHAR";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.3 oracledb.STRING <--> DB: NCHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = random.getRandomLengthString(2000);
      const bindType = oracledb.STRING;
      const dbColType = "NCHAR";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = random.getRandomLengthString(2000);
      const bindType = oracledb.STRING;
      const dbColType = "VARCHAR2";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.5 oracledb.STRING <--> DB: FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = random.getRandomLengthString(2000);
      const bindType = oracledb.STRING;
      const dbColType = "FLOAT";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = random.getRandomLengthString(2000);
      const bindType = oracledb.STRING;
      const dbColType = "BINARY_FLOAT";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = random.getRandomLengthString(2000);
      const bindType = oracledb.STRING;
      const dbColType = "BINARY_DOUBLE";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.8 oracledb.STRING <--> DB: DATE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "abc" + random.getRandomLengthString(1997);
      const bindType = oracledb.STRING;
      const dbColType = "DATE";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = random.getRandomLengthString(2000);
      const bindType = oracledb.STRING;
      const dbColType = "TIMESTAMP";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.10 oracledb.STRING <--> DB: RAW', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = random.getRandomLengthString(2000);
      const bindType = oracledb.STRING;
      const dbColType = "RAW";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.11 oracledb.STRING <--> DB: CLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = random.getRandomLengthString(2000);
      const bindType = oracledb.STRING;
      const dbColType = "CLOB";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.12 oracledb.STRING <--> DB: BLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = random.getRandomLengthString(2000);
      const bindType = oracledb.STRING;
      const dbColType = "BLOB";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(2000);
      const bindType = oracledb.BUFFER;
      const dbColType = "NUMBER";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(2000);
      const bindType = oracledb.BUFFER;
      const dbColType = "CHAR";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(2000);
      const bindType = oracledb.BUFFER;
      const dbColType = "NCHAR";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(2000);
      const bindType = oracledb.BUFFER;
      const dbColType = "VARCHAR2";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(2000);
      const bindType = oracledb.BUFFER;
      const dbColType = "FLOAT";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(2000);
      const bindType = oracledb.BUFFER;
      const dbColType = "BINARY_FLOAT";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(2000);
      const bindType = oracledb.BUFFER;
      const dbColType = "BINARY_DOUBLE";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.20 oracledb.BUFFER <--> DB: DATE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(2000);
      const bindType = oracledb.BUFFER;
      const dbColType = "DATE";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(2000);
      const bindType = oracledb.BUFFER;
      const dbColType = "TIMESTAMP";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.22 oracledb.BUFFER <--> DB: RAW', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(2000);
      const bindType = oracledb.BUFFER;
      const dbColType = "RAW";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(2000);
      const bindType = oracledb.BUFFER;
      const dbColType = "CLOB";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });

    it('92.3.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(2000);
      const bindType = oracledb.BUFFER;
      const dbColType = "BLOB";
      const nullBind = false;
      await doTest(table_name, content, dbColType, bindType, nullBind, true);
    });
  });
});

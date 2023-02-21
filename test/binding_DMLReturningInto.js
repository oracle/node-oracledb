/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 *   98. binding_DMLReturningInto.js
 *
 * DESCRIPTION
 *   This suite tests the data binding, including:
 *     Test cases test returning into oracledb type STRING/BUFFER
 *     The cases take small/null bind values.
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const sql      = require('./sql.js');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');
const testsUtil = require('./testsUtil.js');

describe('98.binding_DMLReturningInto.js', function() {
  let connection;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await connection.close();
  });

  const doTest = async function(table_name, dbColType, content, bindType, nullBind, throwError) {
    const inserted = getInsertVal(dbColType, nullBind);

    let bindVar = {
      c: { val: inserted[0], type: inserted[1], dir: oracledb.BIND_IN },
      output: { type: bindType, dir: oracledb.BIND_OUT, maxSize: 2000 }
    };
    await dmlInsert(table_name, dbColType, bindVar, bindType, nullBind, throwError);

    bindVar = [
      { val: inserted[0], type: inserted[1], dir: oracledb.BIND_IN },
      { type: bindType, dir: oracledb.BIND_OUT, maxSize: 2000 }
    ];
    await dmlInsert(table_name, dbColType, bindVar, bindType, nullBind, throwError);
  };

  const getInsertVal = function(element, nullBind) {
    const insertValue = [];
    if (element.indexOf("CHAR") > -1 || element === "CLOB") {
      insertValue[0] = (nullBind === true) ? null : "abcsca";
      insertValue[1] = oracledb.STRING;
    }
    if (element === "BINARY_DOUBLE" || element.indexOf("FLOAT") > -1 || element === "NUMBER") {
      insertValue[0] = (nullBind === true) ? null :  1;
      insertValue[1] = oracledb.NUMBER;
    }
    if (element === "TIMESTAMP" || element === "DATE") {
      insertValue[0] = (nullBind === true) ? null :  new Date(0);
      insertValue[1] = oracledb.DATE;
    }
    if (element === "BLOB" || element.indexOf("RAW") > -1) {
      insertValue[0] = (nullBind === true) ? null :  assist.createBuffer(100);
      insertValue[1] = oracledb.BUFFER;
    }
    return insertValue;
  };

  const dmlInsert = async function(table_name, dbColType, bindVar, bindType, nullBind, throwError) {
    const createTable = sql.createTable(table_name, dbColType);
    const drop_table = "DROP TABLE " + table_name + " PURGE";
    const sqlToExec = "insert into " + table_name + " ( content ) values (:c) returning content into :output";

    await connection.execute(createTable);
    if (throwError) {
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlToExec, bindVar),
        (err) => {
          if (bindType === oracledb.STRING) {
            compareStrErrMsg(nullBind, dbColType, err);
          } else {
            // oracledb.BUFFER
            compareBufErrMsg(dbColType, err);
          }
          return true;
        }
      );
    } else {
      await connection.execute(sqlToExec, bindVar);
    }
    await connection.execute(drop_table);
  };

  const compareBufErrMsg = function(element, err) {
    switch (element) {
      case "RAW":
      case "BLOB":
        assert(err);
        break;
      case "CHAR":
      case "NCHAR":
      case "VARCHAR2":
        if (err) {
        // ORA-01465: invalid hex number
          assert(err.message.startsWith("ORA-01465:"));
        }
        break;
      default:
        assert(err.message.startsWith("ORA-00932:"));
    }
  };

  const compareStrErrMsg = function(nullBind, element, err) {
    if (nullBind === false && element === "BLOB" && (connection.oracleServerVersion < 1202000100)) {
      // ORA-00932: inconsistent datatypes: expected CHAR got BLOB
      assert(err.message.startsWith("ORA-00932:"));
    } else {
      assert(err);
    }
  };

  const tableNamePre = "table_981";
  let index = 0;

  describe('98.1 bind out small value', function() {
    it('98.1.1 oracledb.STRING <--> DB: NUMBER', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "NUMBER";
      const nullBind = false;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.2 oracledb.STRING <--> DB: CHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "CHAR";
      const nullBind = false;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.3 oracledb.STRING <--> DB: NCHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "NCHAR";
      const nullBind = false;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "VARCHAR2";
      const nullBind = false;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.5 oracledb.STRING <--> DB: FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "FLOAT";
      const nullBind = false;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "BINARY_FLOAT";
      const nullBind = false;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "BINARY_DOUBLE";
      const nullBind = false;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.8 oracledb.STRING <--> DB: DATE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "DATE";
      const nullBind = false;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "TIMESTAMP";
      const nullBind = false;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.10 oracledb.STRING <--> DB: RAW', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "RAW";
      const nullBind = false;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.11 oracledb.STRING <--> DB: CLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "CLOB";
      const nullBind = false;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.12 oracledb.STRING <--> DB: BLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = "small string";
      const bindType = oracledb.STRING;
      const dbColType = "BLOB";
      const nullBind = false;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "NUMBER";
      const nullBind = false;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "CHAR";
      const nullBind = false;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "NCHAR";
      const nullBind = false;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "VARCHAR2";
      const nullBind = false;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "FLOAT";
      const nullBind = false;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "BINARY_FLOAT";
      const nullBind = false;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "BINARY_DOUBLE";
      const nullBind = false;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.20 oracledb.BUFFER <--> DB: DATE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "DATE";
      const nullBind = false;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "TIMESTAMP";
      const nullBind = false;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.22 oracledb.BUFFER <--> DB: RAW', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "RAW";
      const nullBind = false;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "CLOB";
      const nullBind = false;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.1.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = assist.createBuffer(100);
      const bindType = oracledb.BUFFER;
      const dbColType = "BLOB";
      const nullBind = false;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

  });

  describe('98.2 bind out null value', function() {

    it('98.2.1 oracledb.STRING <--> DB: NUMBER', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "NUMBER";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.2 oracledb.STRING <--> DB: CHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "CHAR";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.3 oracledb.STRING <--> DB: NCHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "NCHAR";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "VARCHAR2";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.5 oracledb.STRING <--> DB: FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "FLOAT";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "BINARY_FLOAT";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "BINARY_DOUBLE";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.8 oracledb.STRING <--> DB: DATE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "DATE";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "TIMESTAMP";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.10 oracledb.STRING <--> DB: RAW', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "RAW";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.11 oracledb.STRING <--> DB: CLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "CLOB";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.12 oracledb.STRING <--> DB: BLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.STRING;
      const dbColType = "BLOB";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "NUMBER";
      const nullBind = true;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "CHAR";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "NCHAR";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "VARCHAR2";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "FLOAT";
      const nullBind = true;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "BINARY_FLOAT";
      const nullBind = true;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "BINARY_DOUBLE";
      const nullBind = true;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.20 oracledb.BUFFER <--> DB: DATE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "DATE";
      const nullBind = true;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "TIMESTAMP";
      const nullBind = true;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.22 oracledb.BUFFER <--> DB: RAW', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "RAW";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "CLOB";
      const nullBind = true;
      const throwError = true;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

    it('98.2.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const content = null;
      const bindType = oracledb.BUFFER;
      const dbColType = "BLOB";
      const nullBind = true;
      const throwError = false;
      await doTest(table_name, dbColType, content, bindType, nullBind, throwError);
    });

  });

});

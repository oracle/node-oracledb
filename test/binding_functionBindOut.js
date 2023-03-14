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
 *   97. binding_functionBindOut.js
 *
 * DESCRIPTION
 *   This suite tests the data binding, including:
 *     Test cases get oracledb type STRING/BUFFER from all db column types using plsql function
 *     The cases take small/null bind values.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const sql    = require('./sql.js');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');

describe('97.binding_functionBindOut.js', function() {

  let connection = null;
  const executeSql = async function(sql) {
    await connection.execute(sql);
  };

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await connection.close();
  });

  const doTest = async function(table_name, proc_name, bindType, dbColType, content, sequence, nullBind) {
    let bindVar = {
      i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c: { type: bindType, dir: oracledb.BIND_OUT, maxSize: 1000 },
      output: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT, maxSize: 1000 }
    };
    await inBind(table_name, proc_name, sequence, dbColType, bindVar, bindType, nullBind);
    bindVar = [ { type: oracledb.NUMBER, dir: oracledb.BIND_OUT, maxSize: 1000 }, sequence, { type: bindType, dir: oracledb.BIND_OUT, maxSize: 1000 } ];
    await inBind(table_name, proc_name, sequence, dbColType, bindVar, bindType, nullBind);
  };

  let getInsertVal = function(element, nullBind) {
    let insertValue = [];
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

  const inBind = async function(table_name, fun_name, sequence, dbColType, bindVar, bindType, nullBind) {
    let createTable = await sql.createTable(table_name, dbColType);
    let drop_table = "DROP TABLE " + table_name + " PURGE";
    let proc = "CREATE OR REPLACE FUNCTION " + fun_name + " (ID IN NUMBER, inValue OUT " + dbColType + ") RETURN NUMBER\n" +
               "IS \n" +
               "    tmpvar NUMBER; \n" +
               "BEGIN \n" +
               "    select id, content into tmpvar, inValue from " + table_name + " where id = ID; \n" +
               "    RETURN tmpvar; \n" +
               "END ; ";
    let sqlRun = "BEGIN :output := " + fun_name + " (:i, :c); END;";
    let proc_drop = "DROP FUNCTION " + fun_name;
    let inserted = getInsertVal(dbColType, nullBind);
    let insertSql = "insert into " + table_name + " (id, content) values (:c1, :c2)";
    await executeSql(createTable);
    let bind = {
      c1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c2: { val: inserted[0], type: inserted[1], dir: oracledb.BIND_IN }
    };

    await connection.execute(insertSql, bind);
    await executeSql(proc);

    let err;
    try {
      await connection.execute(sqlRun, bindVar);
    } catch (e) {
      err = e;
    }
    if (bindType === oracledb.STRING) {
      compareErrMsgForString(dbColType, err);
    } else {
      compareErrMsgForRAW(nullBind, dbColType, err);
    }

    await executeSql(proc_drop);
    await executeSql(drop_table);
  };

  var compareErrMsgForString = function(element, err) {
    if (element === "BLOB") {
      // ORA-06550: line 1, column 7:
      // PLS-00306: wrong number or types of arguments in call to 'NODB_INBIND_12'
      // ORA-06550: line 1, column 7:
      // PL/SQL: Statement ignored
      assert.equal(err.message.substring(0, 10), "ORA-06550:");
    }
  };

  var compareErrMsgForRAW = function(nullBind, element, err) {
    if (element === "NUMBER" || element.indexOf("FLOAT") > -1 || element === "BINARY_DOUBLE" || element === "DATE" || element === "TIMESTAMP" || element === "CLOB") {
      // ORA-06550: line 1, column 7:
      // PLS-00306: wrong number or types of arguments in call to 'NODB_INBIND_XX'
      // ORA-06550: line 1, column 7:
      // PL/SQL: Statement ignored
      assert.equal(err.message.substring(0, 10), "ORA-06550:");
    }
    if (element.indexOf("RAW") > -1 || element === "BLOB") {
      assert.ifError(err);
    }
    if (element.indexOf("CHAR") > -1) {
      if (nullBind === true) {
        assert.ifError(err);
      } else {
        // ORA-06502: PL/SQL: numeric or value error: hex to raw conversion error
        assert.equal(err.message.substring(0, 10), "ORA-06502:");
      }
    }
  };

  const tableNamePre = "table_97";
  const procName = "proc_97";
  let index = 1;

  describe('97.1 PLSQL function: bind out small value to oracledb.STRING/BUFFER', function() {

    it('97.1.1 oracledb.STRING <--> DB: NUMBER', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "NUMBER", "small string", index++, false);
    });

    it('97.1.2 oracledb.STRING <--> DB: CHAR', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "CHAR", "small string", index++, false);
    });

    it('97.1.3 oracledb.STRING <--> DB: NCHAR', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "NCHAR", "small string", index++, false);
    });

    it('97.1.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "VARCHAR2", "small string", index++, false);
    });

    it('97.1.5 oracledb.STRING <--> DB: FLOAT', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "FLOAT", "small string", index++, false);
    });

    it('97.1.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BINARY_FLOAT", "small string", index++, false);
    });

    it('97.1.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BINARY_DOUBLE", "small string", index++, false);
    });

    it('97.1.8 oracledb.STRING <--> DB: DATE', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "DATE", "small string", index++, false);
    });

    it('97.1.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "TIMESTAMP", "small string", index++, false);
    });

    it('97.1.10 oracledb.STRING <--> DB: RAW', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "RAW", "small string", index++, false);
    });

    it('97.1.11 oracledb.STRING <--> DB: CLOB', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "CLOB", "small string", index++, false);
    });

    it('97.1.12 oracledb.STRING <--> DB: BLOB', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BLOB", "small string", index++, false);
    });

    it('97.1.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "NUMBER", assist.createBuffer(100), index++, false);
    });

    it('97.1.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "CHAR", assist.createBuffer(100), index++, false);
    });

    it('97.1.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "NCHAR", assist.createBuffer(100), index++, false);
    });

    it('97.1.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "VARCHAR2", assist.createBuffer(100), index++, false);
    });

    it('97.1.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "FLOAT", assist.createBuffer(100), index++, false);
    });

    it('97.1.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BINARY_FLOAT", assist.createBuffer(100), index++, false);
    });

    it('97.1.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BINARY_DOUBLE", assist.createBuffer(100), index++, false);
    });

    it('97.1.20 oracledb.BUFFER <--> DB: DATE', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "DATE", assist.createBuffer(100), index++, false);
    });

    it('97.1.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "TIMESTAMP", assist.createBuffer(100), index++, false);
    });

    it('97.1.22 oracledb.BUFFER <--> DB: RAW', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "RAW", assist.createBuffer(100), index++, false);
    });

    it('97.1.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "CLOB", assist.createBuffer(100), index++, false);
    });

    it('97.1.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BLOB", assist.createBuffer(100), index++, false);
    });
  });

  describe('97.2 PLSQL function: bind out small value to oracledb.STRING/BUFFER', function() {

    it('97.2.1 oracledb.STRING <--> DB: NUMBER', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "NUMBER", null, index++, true);
    });

    it('97.2.2 oracledb.STRING <--> DB: CHAR', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "CHAR", null, index++, true);
    });

    it('97.2.3 oracledb.STRING <--> DB: NCHAR', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "NCHAR", null, index++, true);
    });

    it('97.2.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "VARCHAR2", null, index++, true);
    });

    it('97.2.5 oracledb.STRING <--> DB: FLOAT', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "FLOAT", null, index++, true);
    });

    it('97.2.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BINARY_FLOAT", null, index++, true);
    });

    it('97.2.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BINARY_DOUBLE", null, index++, true);
    });

    it('97.2.8 oracledb.STRING <--> DB: DATE', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "DATE", null, index++, true);
    });

    it('97.2.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "TIMESTAMP", null, index++, true);
    });

    it('97.2.10 oracledb.STRING <--> DB: RAW', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "RAW", null, index++, true);
    });

    it('97.2.11 oracledb.STRING <--> DB: CLOB', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "CLOB", null, index++, true);
    });

    it('97.2.12 oracledb.STRING <--> DB: BLOB', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BLOB", null, index++, true);
    });

    it('97.2.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "NUMBER", null, index++, true);
    });

    it('97.2.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "CHAR", null, index++, true);
    });

    it('97.2.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "NCHAR", null, index++, true);
    });

    it('97.2.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "VARCHAR2", null, index++, true);
    });

    it('97.2.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "FLOAT", null, index++, true);
    });

    it('97.2.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BINARY_FLOAT", null, index++, true);
    });

    it('97.2.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BINARY_DOUBLE", null, index++, true);
    });

    it('97.2.20 oracledb.BUFFER <--> DB: DATE', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "DATE", null, index++, true);
    });

    it('97.2.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "TIMESTAMP", null, index++, true);
    });

    it('97.2.22 oracledb.BUFFER <--> DB: RAW', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "RAW", null, index++, true);
    });

    it('97.2.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "CLOB", null, index++, true);
    });

    it('97.2.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BLOB", null, index++, true);
    });
  });

});

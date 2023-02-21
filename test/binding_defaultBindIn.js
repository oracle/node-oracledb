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
 *   100. binding_defaultBindIn.js
 *
 * DESCRIPTION
 *   This suite tests the data binding, including:
 *     Test cases test bind in oracledb type STRING/BUFFER to all db column types using plsql procedure and function
 *     The cases use default bind type and dir.
 *     The cases take null bind values.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const sql    = require('./sqlClone.js');
const dbConfig = require('./dbconfig.js');

describe('100.binding_defaultBindIn.js', function() {

  let connection = null;
  const executeSql = async function(sql) {
    try {
      await connection.execute(sql);
    } catch (err) {
      assert.ifError(err);
    }
  };

  before(async function() {
    try {
      connection = await oracledb.getConnection(dbConfig);
      assert(connection);
    } catch (err) {
      assert.ifError(err);
    }
  });

  after(async function() {
    try {
      await connection.release();
    } catch (err) {
      assert.ifError(err);
    }
  });

  const doTest1 = async function(table_name, proc_name, dbColType, content) {
    let bindVar = { c: content };
    await inBind1(table_name, proc_name, dbColType, bindVar);
    bindVar = [ content ];
    await inBind1(table_name, proc_name, dbColType, bindVar);
  };

  const doTest2 = async function(table_name, procName, dbColType, content, sequence) {

    let bindVar = {
      i: sequence,
      c: content,
      output: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };

    await inBind2(table_name, procName, dbColType, bindVar);
    bindVar = [ { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }, sequence, content ];
    await inBind2(table_name, procName, dbColType, bindVar);
  };

  const inBind1 = async function(table_name, proc_name, dbColType, bindVar) {
    let createTable = await sql.createTable(table_name, dbColType);
    let drop_table = "DROP TABLE " + table_name + " PURGE";
    let proc = "CREATE OR REPLACE PROCEDURE " + proc_name + " (inValue IN " + dbColType + ")\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into " + table_name + " ( content ) values (inValue); \n" +
               "END " + proc_name + "; ";
    let sqlRun = "BEGIN " + proc_name + " (:c); END;";
    let proc_drop = "DROP PROCEDURE " + proc_name;
    try {
      await executeSql(createTable);
      await executeSql(proc);
    } catch (err) {
      assert.ifError(err);
    }

    try {
      await connection.execute(sqlRun, bindVar);
    } catch (err) {
      await compareErrMsg(dbColType, err);
    }

    try {
      await executeSql(proc_drop);
      await executeSql(drop_table);
    } catch (err) {
      assert.ifError(err);
    }
  };

  const inBind2 = async function(table_name, fun_name, dbColType, bindVar) {
    let createTable = await sql.createTable(table_name, dbColType);
    let drop_table = "DROP TABLE " + table_name + " PURGE";
    let proc = "CREATE OR REPLACE FUNCTION " + fun_name + " (ID IN NUMBER, inValue IN " + dbColType + ") RETURN NUMBER\n" +
               "IS \n" +
               "    tmpvar NUMBER; \n" +
               "BEGIN \n" +
               "    insert into " + table_name + " ( id, content ) values (ID, inValue); \n" +
               "    select id into tmpvar from " + table_name + " where id = ID; \n" +
               "    RETURN tmpvar; \n" +
               "END ; ";
    let sqlRun = "BEGIN :output := " + fun_name + " (:i, :c); END;";
    let proc_drop = "DROP FUNCTION " + fun_name;
    // console.log(proc);

    try {
      await executeSql(createTable);
      await executeSql(proc);
    } catch (err) {
      assert.ifError(err);
    }

    try {
      await connection.execute(sqlRun, bindVar);
    } catch (err) {
      await compareErrMsg(dbColType, err);
    }
    try {
      await executeSql(proc_drop);
      await executeSql(drop_table);
    } catch (err) {
      assert.ifError(err);
    }
  };

  let compareErrMsg = function(element, err) {
    if (element === "BLOB") {
      // ORA-06550: line 1, column 7:
      // PLS-00306: wrong number or types of arguments in call to 'NODB_INBIND_12'
      // ORA-06550: line 1, column 7:
      // PL/SQL: Statement ignored
      assert.equal(err.message.substring(0, 10), "ORA-06550:");
    } else {
      assert.ifError(err);
    }
  };

  const tableNamePre = "table_100";
  const procName = "proc_100";
  let index = 0;

  describe('100.1 PLSQL procedure: bind in null value with default type and dir', function() {

    it('100.1.1 oracledb.STRING <--> DB: NUMBER', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "NUMBER", null);
    });

    it('100.1.2 oracledb.STRING <--> DB: CHAR', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "CHAR", null);

    });

    it('100.1.3 oracledb.STRING <--> DB: NCHAR', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "NCHAR", null);

    });

    it('100.1.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "VARCHAR2", null);

    });

    it('100.1.5 oracledb.STRING <--> DB: FLOAT', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "FLOAT", null);

    });

    it('100.1.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "BINARY_FLOAT", null);

    });

    it('100.1.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "BINARY_DOUBLE", null);

    });

    it('100.1.8 oracledb.STRING <--> DB: DATE', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "DATE", null);

    });

    it('100.1.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "TIMESTAMP", null);

    });

    it('100.1.10 oracledb.STRING <--> DB: RAW', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "RAW", null);

    });

    it('100.1.11 oracledb.STRING <--> DB: CLOB', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "CLOB", null);

    });

    it('100.1.12 oracledb.STRING <--> DB: BLOB', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "BLOB", null);

    });

    it('100.1.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "NUMBER", null);

    });

    it('100.1.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "CHAR", null);

    });

    it('100.1.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "NCHAR", null);

    });

    it('100.1.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "VARCHAR2", null);

    });

    it('100.1.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "FLOAT", null);

    });

    it('100.1.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "BINARY_FLOAT", null);

    });

    it('100.1.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "BINARY_DOUBLE", null);

    });

    it('100.1.20 oracledb.BUFFER <--> DB: DATE', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "DATE", null);

    });

    it('100.1.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "TIMESTAMP", null);

    });

    it('100.1.22 oracledb.BUFFER <--> DB: RAW', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "RAW", null);

    });

    it('100.1.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "CLOB", null);

    });

    it('100.1.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      index++;
      await doTest1(tableNamePre + index, procName + index, "BLOB", null);

    });
  });

  describe('100.2 PLSQL function: bind in null value with default type and dir', function() {

    it('100.2.1 oracledb.STRING <--> DB: NUMBER', async function() {
      await doTest2(tableNamePre + index, procName + index, "NUMBER", null, index++);

    });

    it('100.2.2 oracledb.STRING <--> DB: CHAR', async function() {
      await doTest2(tableNamePre + index, procName + index, "CHAR", null, index++);

    });

    it('100.2.3 oracledb.STRING <--> DB: NCHAR', async function() {
      await doTest2(tableNamePre + index, procName + index, "NCHAR", null, index++);

    });

    it('100.2.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      await doTest2(tableNamePre + index, procName + index, "VARCHAR2", null, index++);

    });

    it('100.2.5 oracledb.STRING <--> DB: FLOAT', async function() {
      await doTest2(tableNamePre + index, procName + index, "FLOAT", null, index++);

    });

    it('100.2.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      await doTest2(tableNamePre + index, procName + index, "BINARY_FLOAT", null, index++);

    });

    it('100.2.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      await doTest2(tableNamePre + index, procName + index, "BINARY_DOUBLE", null, index++);

    });

    it('100.2.8 oracledb.STRING <--> DB: DATE', async function() {
      await doTest2(tableNamePre + index, procName + index, "DATE", null, index++);

    });

    it('100.2.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      await doTest2(tableNamePre + index, procName + index, "TIMESTAMP", null, index++);

    });

    it('100.2.10 oracledb.STRING <--> DB: RAW', async function() {
      await doTest2(tableNamePre + index, procName + index, "RAW", null, index++);

    });

    it('100.2.11 oracledb.STRING <--> DB: CLOB', async function() {
      await doTest2(tableNamePre + index, procName + index, "CLOB", null, index++);

    });

    it('100.2.12 oracledb.STRING <--> DB: BLOB', async function() {
      await doTest2(tableNamePre + index, procName + index, "BLOB", null, index++);

    });

    it('100.2.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      await doTest2(tableNamePre + index, procName + index, "NUMBER", null, index++);

    });

    it('100.2.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      await doTest2(tableNamePre + index, procName + index, "CHAR", null, index++);

    });

    it('100.2.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      await doTest2(tableNamePre + index, procName + index, "NCHAR", null, index++);

    });

    it('100.2.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      await doTest2(tableNamePre + index, procName + index, "VARCHAR2", null, index++);

    });

    it('100.2.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      await doTest2(tableNamePre + index, procName + index, "FLOAT", null, index++);

    });

    it('100.2.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      await doTest2(tableNamePre + index, procName + index, "BINARY_FLOAT", null, index++);

    });

    it('100.2.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      await doTest2(tableNamePre + index, procName + index, "BINARY_DOUBLE", null, index++);

    });

    it('100.2.20 oracledb.BUFFER <--> DB: DATE', async function() {
      await doTest2(tableNamePre + index, procName + index, "DATE", null, index++);

    });

    it('100.2.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      await doTest2(tableNamePre + index, procName + index, "TIMESTAMP", null, index++);

    });

    it('100.2.22 oracledb.BUFFER <--> DB: RAW', async function() {
      await doTest2(tableNamePre + index, procName + index, "RAW", null, index++);

    });

    it('100.2.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      await doTest2(tableNamePre + index, procName + index, "CLOB", null, index++);

    });

    it('100.2.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      await doTest2(tableNamePre + index, procName + index, "BLOB", null, index++);

    });
  });

});

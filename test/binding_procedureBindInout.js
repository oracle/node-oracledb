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
 *   94. binding_procedureBindInout.js
 *
 * DESCRIPTION
 *   This suite tests the data binding, including:
 *     Test cases bind inout oracledb type STRING/BUFFER to all db column types using plsql procedure
 *     The cases take small/null bind values.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');
const testsUtil = require('./testsUtil.js');

describe('94.binding_procedureBindInout.js', function() {

  let connection = null;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await connection.close();
  });

  const getExpectedErrorPattern = function(bindType, dbColType, nullBind) {
    if (bindType === oracledb.STRING) {
      // STRING binding
      if (dbColType === "BLOB") {
        return /ORA-06550:/; // PL/SQL compilation error
      }

      if (nullBind === true) {
        return null; // Should succeed with null values
      }

      if (dbColType.indexOf("CHAR") > -1 || dbColType === "CLOB") {
        return null; // Should succeed
      }

      if (dbColType.indexOf("FLOAT") > -1 || dbColType === "NUMBER" ||
          dbColType.indexOf("RAW") > -1 || dbColType === "BINARY_DOUBLE") {
        return /ORA-06502:/; // Conversion errors
      }

      if (dbColType === "DATE" || dbColType === "TIMESTAMP") {
        return /ORA-01858:/; // Date conversion error
      }
    } else {
      // BUFFER binding
      if (dbColType === "NUMBER" || dbColType.indexOf("FLOAT") > -1 ||
          dbColType === "BINARY_DOUBLE" || dbColType === "DATE" ||
          dbColType === "TIMESTAMP" || dbColType === "CLOB") {
        return /ORA-06550:/; // PL/SQL compilation error
      }

      if (dbColType.indexOf("RAW") > -1 || dbColType === "BLOB" || dbColType === "VARCHAR2") {
        return null; // Should succeed
      }

      if (dbColType === "NCHAR" || dbColType === "CHAR") {
        if (nullBind === true) {
          return null; // Should succeed with null values
        } else {
          return /ORA-06502:/; // Raw variable length too long
        }
      }
    }
    return null; // Default to success
  };

  const doTest = async function(table_name, proc_name, bindType, dbColType, content, sequence, nullBind) {
    let bindVar = {
      i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c: { val: content, type: bindType, dir: oracledb.BIND_INOUT, maxSize: 1000 }
    };
    await inBind(table_name, proc_name, dbColType, bindVar, bindType, nullBind);

    bindVar = [ sequence, { val: content, type: bindType, dir: oracledb.BIND_INOUT, maxSize: 1000 } ];
    await inBind(table_name, proc_name, dbColType, bindVar, bindType, nullBind);
  };

  const inBind = async function(table_name, proc_name, dbColType, bindVar, bindType, nullBind) {
    const proc = "CREATE OR REPLACE PROCEDURE " + proc_name + " (ID IN NUMBER, inValue IN OUT " + dbColType + ")\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into " + table_name + " ( id, content ) values (ID, inValue); \n" +
               "    select content into inValue from " + table_name + " where id = ID; \n" +
               "END " + proc_name + "; ";
    const sqlRun = "BEGIN " + proc_name + " (:i, :c); END;";
    const proc_drop = "DROP PROCEDURE " + proc_name;

    // Create table first
    await testsUtil.createBindingTestTable(connection, table_name, dbColType);

    // Create procedure
    await connection.execute(proc);

    // Execute procedure with expected error handling
    const expectedError = getExpectedErrorPattern(bindType, dbColType, nullBind);

    if (expectedError) {
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        expectedError
      );
    } else {
      await connection.execute(sqlRun, bindVar);
    }

    // Cleanup
    await connection.execute(proc_drop);
    await testsUtil.dropTable(connection, table_name);
  };

  const tableNamePre = "table_94";
  const procName = "proc_94";
  let index = 1;

  describe('94.1 PLSQL procedure: bind inout small value of oracledb.STRING/BUFFER', function() {

    it('94.1.1 oracledb.STRING <--> DB: NUMBER', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "NUMBER", "small string", index++, false);
    });

    it('94.1.2 oracledb.STRING <--> DB: CHAR', async function() {
      if (connection.oracleServerVersion < 1201000200) this.skip();

      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "CHAR", "small string", index++, false);
    });

    it('94.1.3 oracledb.STRING <--> DB: NCHAR', async function() {
      if (connection.oracleServerVersion < 1201000200) this.skip();

      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "NCHAR", "small string", index++, false);
    });

    it('94.1.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "VARCHAR2", "small string", index++, false);
    });

    it('94.1.5 oracledb.STRING <--> DB: FLOAT', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "FLOAT", "small string", index++, false);
    });

    it('94.1.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "BINARY_FLOAT", "small string", index++, false);
    });

    it('94.1.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "BINARY_DOUBLE", "small string", index++, false);
    });

    it('94.1.8 oracledb.STRING <--> DB: DATE', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "DATE", "small string", index++, false);
    });

    it('94.1.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "TIMESTAMP", "small string", index++, false);
    });

    it('94.1.10 oracledb.STRING <--> DB: RAW', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "RAW", "small string", index++, false);
    });

    it('94.1.11 oracledb.STRING <--> DB: CLOB', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "CLOB", "small string", index++, false);
    });

    it('94.1.12 oracledb.STRING <--> DB: BLOB', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "BLOB", "small string", index++, false);
    });

    it('94.1.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "NUMBER", assist.createBuffer(100), index++, false);
    });

    it('94.1.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "CHAR", assist.createBuffer(100), index++, false);
    });

    it('94.1.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "NCHAR", assist.createBuffer(100), index++, false);
    });

    it('94.1.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "VARCHAR2", assist.createBuffer(100), index++, false);
    });

    it('94.1.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "FLOAT", assist.createBuffer(100), index++, false);
    });

    it('94.1.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BINARY_FLOAT", assist.createBuffer(100), index++, false);
    });

    it('94.1.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BINARY_DOUBLE", assist.createBuffer(100), index++, false);
    });

    it('94.1.20 oracledb.BUFFER <--> DB: DATE', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "DATE", assist.createBuffer(100), index++, false);
    });

    it('94.1.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "TIMESTAMP", assist.createBuffer(100), index++, false);
    });

    it('94.1.22 oracledb.BUFFER <--> DB: RAW', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "RAW", assist.createBuffer(100), index++, false);
    });

    it('94.1.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "CLOB", assist.createBuffer(100), index++, false);
    });

    it('94.1.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BLOB", assist.createBuffer(100), index++, false);
    });
  });

  describe('94.2 PLSQL procedure: bind inout null value of oracledb.STRING/BUFFER', function() {

    it('94.2.1 oracledb.STRING <--> DB: NUMBER', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "NUMBER", null, index++, true);
    });

    it('94.2.2 oracledb.STRING <--> DB: CHAR', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "CHAR", null, index++, true);
    });

    it('94.2.3 oracledb.STRING <--> DB: NCHAR', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "NCHAR", null, index++, true);
    });

    it('94.2.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "VARCHAR2", null, index++, true);
    });

    it('94.2.5 oracledb.STRING <--> DB: FLOAT', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "FLOAT", null, index++, true);
    });

    it('94.2.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "BINARY_FLOAT", null, index++, true);
    });

    it('94.2.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "BINARY_DOUBLE", null, index++, true);
    });

    it('94.2.8 oracledb.STRING <--> DB: DATE', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "DATE", null, index++, true);
    });

    it('94.2.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "TIMESTAMP", null, index++, true);
    });

    it('94.2.10 oracledb.STRING <--> DB: RAW', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "RAW", null, index++, true);
    });

    it('94.2.11 oracledb.STRING <--> DB: CLOB', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "CLOB", null, index++, true);
    });

    it('94.2.12 oracledb.STRING <--> DB: BLOB', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.STRING, "BLOB", null, index++, true);
    });

    it('94.2.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "NUMBER", null, index++, true);
    });

    it('94.2.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "CHAR", null, index++, true);
    });

    it('94.2.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "NCHAR", null, index++, true);
    });

    it('94.2.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "VARCHAR2", null, index++, true);
    });

    it('94.2.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "FLOAT", null, index++, true);
    });

    it('94.2.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BINARY_FLOAT", null, index++, true);
    });

    it('94.2.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BINARY_DOUBLE", null, index++, true);
    });

    it('94.2.20 oracledb.BUFFER <--> DB: DATE', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "DATE", null, index++, true);
    });

    it('94.2.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "TIMESTAMP", null, index++, true);
    });

    it('94.2.22 oracledb.BUFFER <--> DB: RAW', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "RAW", null, index++, true);
    });

    it('94.2.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "CLOB", null, index++, true);
    });

    it('94.2.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      await doTest(tableNamePre + index, procName + index, oracledb.BUFFER, "BLOB", null, index++, true);
    });
  });
});

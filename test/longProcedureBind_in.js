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
 *   131. longProcedureBind_in.js
 *
 * DESCRIPTION
 *    Test LONG type PLSQL procedure support.
 *    Long column restrictions: http://docs.oracle.com/cd/B19306_01/server.102/b14200/sql_elements001.htm#SQLRF00201
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');
const testsUtil = require('./testsUtil.js');

describe('131. longProcedureBind_in.js', function() {

  let connection = null;
  const tableName = "nodb_long_128";
  let insertID = 0;

  before(async function() {
    const sqlCreate =  `
        CREATE TABLE ${tableName} (
            id         NUMBER,
            content    LONG
        )`;
    const sqlCreateTbl = testsUtil.sqlCreateTable(tableName, sqlCreate);
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(sqlCreateTbl);

  }); // before

  after(async function() {
    const sqlDropTbl = testsUtil.sqlDropTable(tableName);

    await connection.execute(sqlDropTbl);

    await connection.close();
  }); // after

  beforeEach(function() {
    insertID++;
  });

  describe('131.1 PLSQL PROCEDURE BIND IN AS LONG', function() {
    const proc_bindin_name = "nodb_long_bindin_proc_1";
    const proc_bindin_create = "CREATE OR REPLACE PROCEDURE " + proc_bindin_name + " (ID IN NUMBER, CONTENT IN LONG) \n" +
                             "AS \n" +
                             "BEGIN \n" +
                             "    insert into " + tableName + " values (ID, CONTENT); \n" +
                             "END " + proc_bindin_name + ";";
    const proc_bindin_exec = "BEGIN " + proc_bindin_name + " (:i, :c); END;";
    const proc_bindin_drop = "DROP PROCEDURE " + proc_bindin_name;

    before(async function() {
      await connection.execute(proc_bindin_create);
    });

    after(async function() {
      await connection.execute(proc_bindin_drop);
    });

    it('131.1.1 works with NULL', async function() {
      const insertedStr = null;
      await long_bindin(insertedStr, proc_bindin_exec);
    });

    it('131.1.2 works with undefined', async function() {
      const insertedStr = undefined;
      await long_bindin(insertedStr, proc_bindin_exec);
    });

    it('131.1.3 works with empty string', async function() {
      const insertedStr = "";
      await long_bindin(insertedStr, proc_bindin_exec);
    });

    it('131.1.4 works with data size 4000', async function() {
      const insertedStr = random.getRandomLengthString(4000);
      await long_bindin(insertedStr, proc_bindin_exec);
    });

    it('131.1.5 works with data size (32K - 1)', async function() {
      const insertedStr = random.getRandomLengthString(32767);
      await long_bindin(insertedStr, proc_bindin_exec);
    });

    it('131.1.6 set maxSize to size (32K - 1)', async function() {
      const insertedStr = random.getRandomLengthString(100);
      await long_bindin_maxSize(insertedStr, proc_bindin_exec, 32767);
    });

    it('131.1.7 set maxSize to size 1GB', async function() {
      const insertedStr = random.getRandomLengthString(100);
      const maxsize = 1 * 1024 * 1024 * 1024;
      await long_bindin_maxSize(insertedStr, proc_bindin_exec, maxsize);
    });

  }); // 131.1

  describe('131.2 PLSQL PROCEDURE BIND IN AS STRING', function() {
    const proc_bindin_name = "nodb_long_bindin_proc_2";
    const proc_bindin_create = "CREATE OR REPLACE PROCEDURE " + proc_bindin_name + " (ID IN NUMBER, CONTENT IN VARCHAR2) \n" +
                             "AS \n" +
                             "BEGIN \n" +
                             "    insert into " + tableName + " values (ID, CONTENT); \n" +
                             "END " + proc_bindin_name + ";";
    const proc_bindin_exec = "BEGIN " + proc_bindin_name + " (:i, :c); END;";
    const proc_bindin_drop = "DROP PROCEDURE " + proc_bindin_name;

    before(async function() {
      await connection.execute(proc_bindin_create);
    });

    after(async function() {
      await connection.execute(proc_bindin_drop);
    });

    it('131.2.1 works with NULL', async function() {
      const insertedStr = null;
      await long_bindin(insertedStr, proc_bindin_exec);
    });

    it('131.2.2 works with undefined', async function() {
      const insertedStr = undefined;
      await long_bindin(insertedStr, proc_bindin_exec);
    });

    it('131.2.3 works with empty string', async function() {
      const insertedStr = "";
      await long_bindin(insertedStr, proc_bindin_exec);
    });

    it('131.2.4 works with data size 4000', async function() {
      const insertedStr = random.getRandomLengthString(4000);
      await long_bindin(insertedStr, proc_bindin_exec);
    });

    it('131.2.5 works with data size (32K - 1)', async function() {
      const insertedStr = random.getRandomLengthString(32767);
      await long_bindin(insertedStr, proc_bindin_exec);
    });

    it('131.2.6 set maxSize to size (32K - 1)', async function() {
      const insertedStr = random.getRandomLengthString(100);
      await long_bindin_maxSize(insertedStr, proc_bindin_exec, 32767);
    });

    it('131.2.7 set maxSize to size 1GB', async function() {
      const insertedStr = random.getRandomLengthString(100);
      const maxsize = 1 * 1024 * 1024 * 1024;
      await long_bindin_maxSize(insertedStr, proc_bindin_exec, maxsize);
    });

  }); // 131.2

  const long_bindin = async function(insertContent, proc_bindin_exec) {

    const bind_in_var  = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: insertContent, dir: oracledb.BIND_IN, type: oracledb.STRING }
    };
    await connection.execute(
      proc_bindin_exec,
      bind_in_var);
    let expected = insertContent;
    if (insertContent == "" || insertContent == undefined) {
      expected = null;
    }
    await checkResult(expected);
  };

  const long_bindin_maxSize = async function(insertContent, proc_bindin_exec, maxsize) {

    const bind_in_var  = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: insertContent, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: maxsize }
    };
    await connection.execute(
      proc_bindin_exec,
      bind_in_var);
    let expected = insertContent;
    if (insertContent == "" || insertContent == undefined) {
      expected = null;
    }
    await checkResult(expected);
  };

  const checkResult = async function(expected) {
    const result = await connection.execute("select * from " + tableName + " where id = " + insertID);
    assert.strictEqual(result.rows[0][0], insertID);
    assert.strictEqual(result.rows[0][1], expected);
  };

});

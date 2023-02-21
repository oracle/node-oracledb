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
 *   130. longProcedureBind_out.js
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
const sql      = require('./sqlClone.js');

describe('130. longProcedureBind_out.js', function() {

  let connection = null;
  const tableName = "nodb_long_130";
  let insertID = 0;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    const sqlCreate =  `
        CREATE TABLE ${tableName} (
            id         NUMBER,
            content    LONG
        )`;
    const sqlCreateTbl = testsUtil.sqlCreateTable(tableName, sqlCreate);
    await sql.executeSql(connection, sqlCreateTbl, {}, {});
  }); // before

  after(async function() {
    const sqlDropTbl = testsUtil.sqlDropTable(tableName);
    await sql.executeSql(connection, sqlDropTbl, {}, {});
    await connection.close();
  }); // after

  beforeEach(function() {
    insertID++;
  });

  describe('130.1 PLSQL PROCEDURE BIND OUT AS LONG', function() {
    const proc_bindout_name = "nodb_long_bindout_proc_1";
    const proc_bindout_create = "CREATE OR REPLACE PROCEDURE " + proc_bindout_name + " (num IN NUMBER, C OUT LONG) \n" +
                              "AS \n" +
                              "BEGIN \n" +
                              "    select content into C from " + tableName + " where num = ID; \n" +
                              "END " + proc_bindout_name + ";";
    const proc_bindout_exec = "BEGIN " + proc_bindout_name + " (:i, :c); END;";
    const proc_bindout_drop = "DROP PROCEDURE " + proc_bindout_name;

    before(async function() {
      await sql.executeSql(connection, proc_bindout_create, {}, {});
    });

    after(async function() {
      await sql.executeSql(connection, proc_bindout_drop, {}, {});
    });

    it('130.1.1 works with NULL', async function() {
      await long_bindout(null, proc_bindout_exec, 10);
    });

    it('130.1.2 works with undefined', async function() {
      await long_bindout(undefined, proc_bindout_exec, 10);
    });

    it('130.1.3 works with empty string', async function() {
      await long_bindout("", proc_bindout_exec, 10);
    });

    it('130.1.4 works with data size 4000', async function() {
      await long_bindout(random.getRandomLengthString(4000), proc_bindout_exec, 4000);
    });

    it('130.1.5 works with data size (32K - 1)', async function() {
      await long_bindout(random.getRandomLengthString(32767), proc_bindout_exec, 32767);
    });

    it('130.1.6 set maxSize to size (32K - 1)', async function() {
      await long_bindout(random.getRandomLengthString(100), proc_bindout_exec, 32767);
    });

    it('130.1.7 set maxSize to size 1GB', async function() {
      const maxsize = 1 * 1024 * 1024 * 1024;
      await long_bindout(random.getRandomLengthString(100), proc_bindout_exec, maxsize);
    });

  }); // 130.1

  describe('130.2 PLSQL PROCEDURE BIND OUT AS STRING', function() {
    const proc_bindout_name = "nodb_long_bindout_proc_2";
    const proc_bindout_create = "CREATE OR REPLACE PROCEDURE " + proc_bindout_name + " (num IN NUMBER, C OUT VARCHAR2) \n" +
                              "AS \n" +
                              "BEGIN \n" +
                              "    select content into C from " + tableName + " where num = ID; \n" +
                              "END " + proc_bindout_name + ";";
    const proc_bindout_exec = "BEGIN " + proc_bindout_name + " (:i, :c); END;";
    const proc_bindout_drop = "DROP PROCEDURE " + proc_bindout_name;

    before(async function() {
      await sql.executeSql(connection, proc_bindout_create, {}, {});
    });

    after(async function() {
      await sql.executeSql(connection, proc_bindout_drop, {}, {});
    });

    it('130.2.1 works with NULL', async function() {
      await long_bindout(null, proc_bindout_exec, 10);
    });

    it('130.2.2 works with undefined', async function() {
      await long_bindout(undefined, proc_bindout_exec, 10);
    });

    it('130.2.3 works with empty string', async function() {
      await long_bindout("", proc_bindout_exec, 10);
    });

    it('130.2.4 works with data size 4000', async function() {
      await long_bindout(random.getRandomLengthString(4000), proc_bindout_exec, 4000);
    });

    it('130.2.5 works with data size (32K - 1)', async function() {
      await long_bindout(random.getRandomLengthString(32767), proc_bindout_exec, 32767);
    });

    it('130.2.6 set maxSize to size (32K - 1)', async function() {
      await long_bindout(random.getRandomLengthString(100), proc_bindout_exec, 32767);
    });

    it('130.2.7 set maxSize to size 1GB', async function() {
      const maxsize = 1 * 1024 * 1024 * 1024;
      await long_bindout(random.getRandomLengthString(100), proc_bindout_exec, maxsize);
    });

  }); // 130.2

  const long_bindout = async function(insertContent, proc_bindin_exec, maxsize) {

    await insert(insertContent);
    const bind_in_var  = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: maxsize }
    };
    const result = await connection.execute(proc_bindin_exec, bind_in_var);
    let expected = insertContent;
    if (insertContent == "" || insertContent == undefined) {
      expected = null;
    }
    assert.strictEqual(result.outBinds.c, expected);

  };

  const insert = async function(insertStr) {
    const result = await connection.execute(
      "insert into " + tableName + " values (:i, :c)",
      {
        i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        c: { val: insertStr, type: oracledb.STRING, dir: oracledb.BIND_IN }
      });

    assert(result);
    assert.strictEqual(result.rowsAffected, 1);
  };

});

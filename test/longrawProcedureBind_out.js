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
 *   134. longrawProcedureBind_out.js
 *
 * DESCRIPTION
 *    Test LONG RAW type PLSQL procedure support.
 *    https://docs.oracle.com/cloud/latest/db121/LNPLS/datatypes.htm#LNPLS346
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');
const testsUtil = require('./testsUtil.js');
const assist   = require('./dataTypeAssist.js');

describe('134. longrawProcedureBind_out.js', function() {

  let connection = null;
  const tableName = "nodb_longraw_134";
  let insertID = 0;

  before(async function() {
    const sqlCreate =  `
        CREATE TABLE ${tableName} (
            id         NUMBER,
            content    LONG RAW
        )`;
    const sqlCreateTbl = await testsUtil.sqlCreateTable(tableName, sqlCreate);

    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(sqlCreateTbl);
  }); // before

  after(async function() {
    const sqlDropTbl = await testsUtil.sqlDropTable(tableName);

    await connection.execute(sqlDropTbl);

    await connection.close();
  }); // after

  beforeEach(function() {
    insertID++;
  });

  describe('134.1 PLSQL PROCEDURE BIND OUT AS LONG RAW', function() {
    const proc_bindout_name = "nodb_longraw_bindout_proc_1";
    const proc_bindout_create = "CREATE OR REPLACE PROCEDURE " + proc_bindout_name + " (NUM IN NUMBER, C OUT LONG RAW) \n" +
                              "AS \n" +
                              "BEGIN \n" +
                              "    select content into C from " + tableName + " where id = NUM; \n" +
                              "END " + proc_bindout_name + ";";
    const proc_bindout_exec = "BEGIN " + proc_bindout_name + " (:i, :c); END;";
    const proc_bindout_drop = "DROP PROCEDURE " + proc_bindout_name;

    before(async function() {
      await connection.execute(proc_bindout_create);
    });

    after(async function() {
      await connection.execute(proc_bindout_drop);
    });

    it('134.1.1 works with NULL', async function() {
      const insertedStr = null;
      const maxsize = 10;
      await longraw_bindout(insertedStr, proc_bindout_exec, maxsize);
    });

    it('134.1.2 works with undefined', async function() {
      const insertedStr = undefined;
      const maxsize = 10;
      await longraw_bindout(insertedStr, proc_bindout_exec, maxsize);
    });

    it('134.1.3 works with empty buffer', async function() {
      const insertedBuf = Buffer.from("");
      const maxsize = 10;
      await longraw_bindout(insertedBuf, proc_bindout_exec, maxsize);
    });

    it('134.1.4 works with data size 2000', async function() {
      const insertedStr = random.getRandomLengthString(2000);
      const maxsize = insertedStr.length;
      await longraw_bindout(insertedStr, proc_bindout_exec, maxsize);
    });

    it('134.1.5 works with data size 32760', async function() {
      const insertedStr = random.getRandomLengthString(32760);
      const maxsize = insertedStr.length;
      await longraw_bindout(insertedStr, proc_bindout_exec, maxsize);
    });

    it('134.1.6 set maxSize to size (32K - 1)', async function() {
      const insertedStr = random.getRandomLengthString(100);
      await longraw_bindout(insertedStr, proc_bindout_exec, 32767);
    });

    it('134.1.7 set maxSize to size 1GB', async function() {
      const insertedStr = random.getRandomLengthString(100);
      const maxsize = 1 * 1024 * 1024 * 1024;
      await longraw_bindout(insertedStr, proc_bindout_exec, maxsize);
    });

  }); // 134.1

  describe('134.2 PLSQL PROCEDURE BIND OUT AS RAW', function() {
    const proc_bindout_name = "nodb_longraw_bindout_proc_2";
    const proc_bindout_create = "CREATE OR REPLACE PROCEDURE " + proc_bindout_name + " (NUM IN NUMBER, C OUT RAW) \n" +
                              "AS \n" +
                              "BEGIN \n" +
                              "    select content into C from " + tableName + " where id = NUM; \n" +
                              "END " + proc_bindout_name + ";";
    const proc_bindout_exec = "BEGIN " + proc_bindout_name + " (:i, :c); END;";
    const proc_bindout_drop = "DROP PROCEDURE " + proc_bindout_name;

    before(async function() {
      await connection.execute(proc_bindout_create);
    });

    after(async function() {
      await connection.execute(proc_bindout_drop);
    });

    it('134.2.1 works with NULL', async function() {
      const insertedStr = null;
      const maxsize = 10;
      await longraw_bindout(insertedStr, proc_bindout_exec, maxsize);
    });

    it('134.2.2 works with undefined', async function() {
      const insertedStr = undefined;
      const maxsize = 10;
      await longraw_bindout(insertedStr, proc_bindout_exec, maxsize);
    });

    it('134.2.3 works with empty buffer', async function() {
      const insertedStr = Buffer.from("");
      const maxsize = 10;
      await longraw_bindout(insertedStr, proc_bindout_exec, maxsize);
    });

    it('134.2.4 works with data size 2000', async function() {
      const insertedStr = random.getRandomLengthString(2000);
      const maxsize = insertedStr.length;
      await longraw_bindout(insertedStr, proc_bindout_exec, maxsize);
    });

    it('134.2.5 works with data size 32760', async function() {
      const insertedStr = random.getRandomLengthString(32760);
      const maxsize = insertedStr.length;
      await longraw_bindout(insertedStr, proc_bindout_exec, maxsize);
    });

    it('134.2.6 set maxSize to size (32K - 1)', async function() {
      const insertedStr = random.getRandomLengthString(100);
      await longraw_bindout(insertedStr, proc_bindout_exec, 32767);
    });

    it('134.2.7 set maxSize to size 1GB', async function() {
      const insertedStr = random.getRandomLengthString(100);
      const maxsize = 1 * 1024 * 1024 * 1024;
      await longraw_bindout(insertedStr, proc_bindout_exec, maxsize);
    });

  }); // 134.2

  const longraw_bindout = async function(insertContent, proc_bindout_exec, maxsize) {
    let insertBuf, expectedBuf;
    if (insertContent == null || insertContent == undefined || insertContent.length == 0) {
      insertBuf = insertContent;
      expectedBuf = null;
    } else {
      insertBuf = Buffer.from(insertContent);
      expectedBuf = insertBuf;
    }

    await insert(insertBuf);

    const bind_in_var  = {
      i: { val: insertID, dir: await oracledb.BIND_IN, type: await oracledb.NUMBER },
      c: { type: await oracledb.BUFFER, dir: await oracledb.BIND_OUT, maxSize: maxsize }
    };
    const result = await connection.execute(
      proc_bindout_exec,
      bind_in_var);

    if (expectedBuf == null) {
      assert.strictEqual(result.outBinds.c, expectedBuf);
    } else {
      assist.compare2Buffers(result.outBinds.c, expectedBuf);
    }
  };

  const insert = async function(insertStr) {
    const result = await connection.execute(
      "insert into " + tableName + " values (:i, :c)",
      {
        i: { val: insertID, dir: await oracledb.BIND_IN, type: await oracledb.NUMBER },
        c: { val: insertStr, type: await oracledb.BUFFER, dir: await oracledb.BIND_IN }
      });
    assert.strictEqual(result.rowsAffected, 1);
  };

});

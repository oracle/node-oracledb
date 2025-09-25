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
 *   132. longrawProcedureBind_in.js
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

describe('132. longrawProcedureBind_in.js', function() {

  let connection = null;
  const tableName = "nodb_longraw_132";
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

  describe('132.1 PLSQL PROCEDURE BIND IN AS LONG RAW', function() {
    const proc_bindin_name = "nodb_longraw_bindin_proc_1";
    const proc_bindin_create = "CREATE OR REPLACE PROCEDURE " + proc_bindin_name + " (NUM IN NUMBER, C IN LONG RAW) \n" +
                             "AS \n" +
                             "BEGIN \n" +
                             "    insert into " + tableName + " values (NUM, C); \n" +
                             "END " + proc_bindin_name + ";";
    const proc_bindin_exec = "BEGIN " + proc_bindin_name + " (:i, :c); END;";
    const proc_bindin_drop = "DROP PROCEDURE " + proc_bindin_name;

    before(async function() {
      await connection.execute(proc_bindin_create);
    });

    after(async function() {
      await connection.execute(proc_bindin_drop);
    });

    it('132.1.1 works with NULL', async function() {
      const insertedStr = null;
      await longraw_bindin(insertedStr, proc_bindin_exec);
    });

    it('132.1.2 works with undefined', async function() {
      const insertedStr = undefined;
      await longraw_bindin(insertedStr, proc_bindin_exec);
    });

    it('132.1.3 works with empty buffer', async function() {
      const insertedBuf = Buffer.from("");
      await longraw_bindin(insertedBuf, proc_bindin_exec);
    });

    it('132.1.4 works with data size 2000', async function() {
      const insertedStr = random.getRandomLengthString(2000);
      await longraw_bindin(insertedStr, proc_bindin_exec);
    });

    it('132.1.5 works with data size (32K - 1)', async function() {
      const insertedStr = random.getRandomLengthString(32767);
      await longraw_bindin(insertedStr, proc_bindin_exec);
    });

    it('132.1.6 set maxSize to size (32K - 1)', async function() {
      const insertedStr = random.getRandomLengthString(100);
      await longraw_bindin_maxSize(insertedStr, proc_bindin_exec, 32767);
    });

    it('132.1.7 set maxSize to size 1GB', async function() {
      const insertedStr = random.getRandomLengthString(100);
      const maxsize = 1 * 1024 * 1024 * 1024;
      await longraw_bindin_maxSize(insertedStr, proc_bindin_exec, maxsize);
    });

  }); // 132.1

  describe('132.2 PLSQL PROCEDURE BIND IN AS RAW', function() {
    const proc_bindin_name = "nodb_longraw_bindin_proc_2";
    const proc_bindin_create = "CREATE OR REPLACE PROCEDURE " + proc_bindin_name + " (NUM IN NUMBER, C IN RAW) \n" +
                             "AS \n" +
                             "BEGIN \n" +
                             "    insert into " + tableName + " values (NUM, C); \n" +
                             "END " + proc_bindin_name + ";";
    const proc_bindin_exec = "BEGIN " + proc_bindin_name + " (:i, :c); END;";
    const proc_bindin_drop = "DROP PROCEDURE " + proc_bindin_name;

    before(async function() {
      await connection.execute(proc_bindin_create);
    });

    after(async function() {
      await connection.execute(proc_bindin_drop);
    });

    it('132.2.1 works with NULL', async function() {
      const insertedStr = null;
      await longraw_bindin(insertedStr, proc_bindin_exec);
    });

    it('132.2.2 works with undefined', async function() {
      const insertedStr = undefined;
      await longraw_bindin(insertedStr, proc_bindin_exec);
    });

    it('132.2.3 works with empty buffer', async function() {
      const insertedStr = Buffer.from("");
      await longraw_bindin(insertedStr, proc_bindin_exec);
    });

    it('132.2.4 works with data size 2000', async function() {
      const insertedStr = random.getRandomLengthString(2000);
      await longraw_bindin(insertedStr, proc_bindin_exec);
    });

    it('132.2.5 works with data size 32767', async function() {
      const insertedStr = random.getRandomLengthString(32767);
      await longraw_bindin(insertedStr, proc_bindin_exec);
    });

    it('132.2.6 set maxSize to size (32K - 1)', async function() {
      const insertedStr = random.getRandomLengthString(100);
      await longraw_bindin_maxSize(insertedStr, proc_bindin_exec, 32767);
    });

    it('132.2.7 set maxSize to size 1GB', async function() {
      const insertedStr = random.getRandomLengthString(100);
      const maxsize = 1 * 1024 * 1024 * 1024;
      await longraw_bindin_maxSize(insertedStr, proc_bindin_exec, maxsize);
    });

  }); // 132.2

  const longraw_bindin = async function(insertContent, proc_bindin_exec) {
    let insertBuf, expectedBuf;
    if (insertContent == null || insertContent == undefined || insertContent.length == 0) {
      insertBuf = insertContent;
      expectedBuf = null;
    } else {
      insertBuf = Buffer.from(insertContent);
      expectedBuf = insertBuf;
    }

    const bind_in_var  = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: insertBuf, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
    };
    await connection.execute(
      proc_bindin_exec,
      bind_in_var);
    await checkResult(expectedBuf);
  };

  const longraw_bindin_maxSize = async function(insertContent, proc_bindin_exec, maxsize) {
    let insertBuf, expectedBuf;
    if (insertContent == null || insertContent == undefined) {
      insertBuf = insertContent;
      expectedBuf = null;
    } else {
      insertBuf = Buffer.from(insertContent);
      expectedBuf = insertBuf;
    }

    const bind_in_var = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: insertBuf, dir: oracledb.BIND_IN, type: oracledb.BUFFER, maxSize: maxsize }
    };
    await connection.execute(
      proc_bindin_exec,
      bind_in_var);
    await checkResult(expectedBuf);
  };

  const checkResult = async function(expected) {
    const sql = "select * from " + tableName + " where id = :id";
    const bindVar = { id: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER } };
    const result = await connection.execute(sql, bindVar);

    assert.strictEqual(result.rows[0][0], insertID);
    if (expected == null) {
      assert.strictEqual(result.rows[0][1], expected);
    } else {
      assert.deepStrictEqual(result.rows[0][1], expected);
    }
  };
});

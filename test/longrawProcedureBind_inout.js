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
 *   133. longrawProcedureBind_inout.js
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

describe('133. longrawProcedureBind_inout.js', function() {

  let connection;
  const tableName = "nodb_longraw_133";
  var insertID = 0;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    const sqlCreate =  `
        CREATE TABLE ${tableName} (
            id         NUMBER,
            content    LONG RAW
        )`;
    const sql = testsUtil.sqlCreateTable(tableName, sqlCreate);
    await connection.execute(sql);
  });

  after(async function() {
    const sql = testsUtil.sqlDropTable(tableName);
    await connection.execute(sql);
    await connection.close();
  });

  beforeEach(function() {
    insertID++;
  });

  describe('133.1 PLSQL PROCEDURE BIND IN OUT AS LONG RAW', function() {
    const proc_bindinout_name = "nodb_longraw_bindinout_proc_1";
    const proc_bindinout_create = "CREATE OR REPLACE PROCEDURE " + proc_bindinout_name + " (NUM IN NUMBER, C IN OUT LONG RAW) \n" +
                                "AS \n" +
                                "BEGIN \n" +
                                "    insert into " + tableName + " values (NUM, C); \n" +
                                "    select content into C from " + tableName + " where id = NUM; \n" +
                                "END " + proc_bindinout_name + ";";
    const proc_bindinout_exec = "BEGIN " + proc_bindinout_name + " (:i, :c); END;";
    const proc_bindinout_drop = "DROP PROCEDURE " + proc_bindinout_name;

    before(async function() {
      await connection.execute(proc_bindinout_create);
    });

    after(async function() {
      await connection.execute(proc_bindinout_drop);
    });

    it('133.1.1 works with NULL', async function() {
      await longraw_bindinout(null, proc_bindinout_exec);
    });

    it('133.1.2 works with undefined', async function() {
      await longraw_bindinout(undefined, proc_bindinout_exec);
    });

    it('133.1.3 works with empty buffer', async function() {
      await longraw_bindinout(Buffer.from(""), proc_bindinout_exec);
    });

    it('133.1.4 works with data size 2000', async function() {
      await longraw_bindinout(random.getRandomLengthString(2000), proc_bindinout_exec);
    });

    it('133.1.5 works with data size 32760', async function() {
      await longraw_bindinout(random.getRandomLengthString(32760), proc_bindinout_exec);
    });

    it('133.1.6 set maxSize to size (32K - 1)', async function() {
      await longraw_bindinout_maxSize(random.getRandomLengthString(100), proc_bindinout_exec, 32767);
    });

    it('133.1.7 set maxSize to size 1GB', async function() {
      await longraw_bindinout_maxSize(random.getRandomLengthString(100), proc_bindinout_exec, 1 * 1024 * 1024 * 1024);
    });

  }); // 133.1

  describe('133.2 PLSQL PROCEDURE BIND IN OUT AS RAW', function() {
    const proc_bindinout_name = "nodb_longraw_bindinout_proc_2";
    const proc_bindinout_create = "CREATE OR REPLACE PROCEDURE " + proc_bindinout_name + " (NUM IN NUMBER, C IN OUT RAW) \n" +
                                "AS \n" +
                                "BEGIN \n" +
                                "    insert into " + tableName + " values (NUM, C); \n" +
                                "    select content into C from " + tableName + " where id = NUM; \n" +
                                "END " + proc_bindinout_name + ";";
    const proc_bindinout_exec = "BEGIN " + proc_bindinout_name + " (:i, :c); END;";
    const proc_bindinout_drop = "DROP PROCEDURE " + proc_bindinout_name;

    before(async function() {
      await connection.execute(proc_bindinout_create);
    });

    after(async function() {
      await connection.execute(proc_bindinout_drop);
    });

    it('133.2.1 works with NULL', async function() {
      await longraw_bindinout(null, proc_bindinout_exec);
    });

    it('133.2.2 works with undefined', async function() {
      await longraw_bindinout(undefined, proc_bindinout_exec);
    });

    it('133.2.3 works with empty buffer', async function() {
      await longraw_bindinout(Buffer.from(""), proc_bindinout_exec);
    });

    it('133.2.4 works with data size 2000', async function() {
      await longraw_bindinout(random.getRandomLengthString(2000), proc_bindinout_exec);
    });

    it('133.2.5 works with data size 32760', async function() {
      await longraw_bindinout(random.getRandomLengthString(32760), proc_bindinout_exec);
    });

    it('133.2.6 set maxSize to size (32K - 1)', async function() {
      await longraw_bindinout_maxSize(random.getRandomLengthString(100), proc_bindinout_exec, 32767);
    });

    it('133.2.7 set maxSize to size 1GB', async function() {
      await longraw_bindinout_maxSize(random.getRandomLengthString(100), proc_bindinout_exec, 1 * 1024 * 1024 * 1024);
    });

  }); // 133.2

  const longraw_bindinout = async function(insertContent, proc_bindinout_exec) {
    let insertBuf, expectedBuf;
    if (insertContent == null || insertContent == undefined || insertContent.length == 0) {
      insertBuf = insertContent;
      expectedBuf = null;
    } else {
      insertBuf = Buffer.from(insertContent);
      expectedBuf = insertBuf;
    }
    let bind_in_var  = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: insertBuf, dir: oracledb.BIND_INOUT, type: oracledb.BUFFER, maxSize: 32768  }
    };
    let result = await connection.execute(proc_bindinout_exec, bind_in_var);
    assert(result);
    if (expectedBuf == null) {
      assert.strictEqual(result.outBinds.c, expectedBuf);
    } else {
      assert.deepStrictEqual(result.outBinds.c, expectedBuf);
    }

  };

  const longraw_bindinout_maxSize = async function(insertContent, proc_bindinout_exec, maxsize) {
    let insertBuf, expectedBuf;
    if (insertContent == null || insertContent == undefined || insertContent.length == 0) {
      insertBuf = insertContent;
      expectedBuf = null;
    } else {
      insertBuf = Buffer.from(insertContent);
      expectedBuf = insertBuf;
    }
    let bind_in_var  = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: insertBuf, dir: oracledb.BIND_INOUT, type: oracledb.BUFFER, maxSize: maxsize }
    };
    const result = await connection.execute(proc_bindinout_exec, bind_in_var);
    if (expectedBuf == null) {
      assert.strictEqual(result.outBinds.c, expectedBuf);
    } else {
      assert.deepStrictEqual(result.outBinds.c, expectedBuf);
    }

  };
});

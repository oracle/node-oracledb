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
 *   129. longProcedureBind_inout.js
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

describe('129. longProcedureBind_inout.js', function() {

  let connection;
  const tableName = "nodb_long_129";
  let insertID = 0;
  const table_create = "BEGIN \n" +
                     "    DECLARE \n" +
                     "        e_table_missing EXCEPTION; \n" +
                     "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                     "    BEGIN \n" +
                     "        EXECUTE IMMEDIATE('DROP TABLE " + tableName + " PURGE'); \n" +
                     "    EXCEPTION \n" +
                     "        WHEN e_table_missing \n" +
                     "        THEN NULL; \n" +
                     "    END; \n" +
                     "    EXECUTE IMMEDIATE (' \n" +
                     "        CREATE TABLE " + tableName + " ( \n" +
                     "            id         NUMBER, \n" +
                     "            content    LONG \n" +
                     "        ) \n" +
                     "    '); \n" +
                     "END; ";
  const table_drop = "DROP TABLE " + tableName + " PURGE";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(table_create);
  });

  after(async function() {
    await connection.execute(table_drop);
    await connection.close();
  });

  beforeEach(function() {
    insertID++;
  });

  describe('129.1 PLSQL PROCEDURE BIND IN OUT AS LONG', function() {
    const proc_bindinout_name = "nodb_long_bindinout_proc_1";
    const proc_bindinout_create = "CREATE OR REPLACE PROCEDURE " + proc_bindinout_name + " (num IN NUMBER, C IN OUT LONG) \n" +
                                "AS \n" +
                                "BEGIN \n" +
                                "    insert into " + tableName + " values (num, C); \n" +
                                "    select content into C from " + tableName + " where num = ID; \n" +
                                "END " + proc_bindinout_name + ";";
    const proc_bindinout_exec = "BEGIN " + proc_bindinout_name + " (:i, :c); END;";
    const proc_bindinout_drop = "DROP PROCEDURE " + proc_bindinout_name;

    before(async function() {
      await connection.execute(proc_bindinout_create);
    });

    after(async function() {
      await connection.execute(proc_bindinout_drop);
    });

    it('129.1.1 works with NULL', async function() {
      const insertedStr = null;
      await long_bindinout(insertedStr, proc_bindinout_exec);
    });

    it('129.1.2 works with undefined', async function() {
      const insertedStr = undefined;
      await long_bindinout(insertedStr, proc_bindinout_exec);
    });

    it('129.1.3 works with empty string', async function() {
      const insertedStr = "";
      await long_bindinout(insertedStr, proc_bindinout_exec);
    });

    it('129.1.4 works with data size 4000', async function() {
      const insertedStr = random.getRandomLengthString(4000);
      await long_bindinout(insertedStr, proc_bindinout_exec);
    });

    it('129.1.5 works with data size (32K - 1)', async function() {
      const insertedStr = random.getRandomLengthString(32767);
      await long_bindinout(insertedStr, proc_bindinout_exec);
    });

    it('129.1.6 set maxSize to size (32K - 1)', async function() {
      const insertedStr = random.getRandomLengthString(100);
      await long_bindinout_maxSize(insertedStr, proc_bindinout_exec, 32767);
    });

    it('129.1.7 set maxSize to size 1GB', async function() {
      const insertedStr = random.getRandomLengthString(100);
      const maxsize = 1 * 1024 * 1024 * 1024;
      await long_bindinout_maxSize(insertedStr, proc_bindinout_exec, maxsize);
    });

  }); // 129.1

  describe('129.2 PLSQL PROCEDURE BIND IN OUT AS STRING', function() {
    const proc_bindinout_name = "nodb_long_bindinout_proc_2";
    const proc_bindinout_create = "CREATE OR REPLACE PROCEDURE " + proc_bindinout_name + " (num IN NUMBER, C IN OUT VARCHAR2) \n" +
                                "AS \n" +
                                "BEGIN \n" +
                                "    insert into " + tableName + " values (num, C); \n" +
                                "    select content into C from " + tableName + " where num = ID; \n" +
                                "END " + proc_bindinout_name + ";";
    const proc_bindinout_exec = "BEGIN " + proc_bindinout_name + " (:i, :c); END;";
    const proc_bindinout_drop = "DROP PROCEDURE " + proc_bindinout_name;

    before(async function() {
      await connection.execute(proc_bindinout_create);
    });

    after(async function() {
      await connection.execute(proc_bindinout_drop);
    });

    it('129.2.1 works with NULL', async function() {
      const insertedStr = null;
      await long_bindinout(insertedStr, proc_bindinout_exec);
    });

    it('129.2.2 works with undefined', async function() {
      const insertedStr = undefined;
      await long_bindinout(insertedStr, proc_bindinout_exec);
    });

    it('129.2.3 works with empty string', async function() {
      const insertedStr = "";
      await long_bindinout(insertedStr, proc_bindinout_exec);
    });

    it('129.2.4 works with data size 4000', async function() {
      const insertedStr = random.getRandomLengthString(4000);
      await long_bindinout(insertedStr, proc_bindinout_exec);
    });

    it('129.2.5 works with data size (32K - 1)', async function() {
      const insertedStr = random.getRandomLengthString(32767);
      await long_bindinout(insertedStr, proc_bindinout_exec);
    });

    it('129.2.6 set maxSize to size (32K - 1)', async function() {
      const insertedStr = random.getRandomLengthString(100);
      await long_bindinout_maxSize(insertedStr, proc_bindinout_exec, 32767);
    });

    it('129.2.7 set maxSize to size 1GB', async function() {
      const insertedStr = random.getRandomLengthString(100);
      const maxsize = 1 * 1024 * 1024 * 1024;
      await long_bindinout_maxSize(insertedStr, proc_bindinout_exec, maxsize);
    });

  }); // 129.2

  const long_bindinout = async function(insertContent, proc_bindinout_exec) {
    const bind_in_var  = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: insertContent, dir: oracledb.BIND_INOUT, type: oracledb.STRING }
    };
    const result = await connection.execute(proc_bindinout_exec, bind_in_var);
    let expected = insertContent;
    if (insertContent == "" || insertContent == undefined) {
      expected = null;
    }
    assert.strictEqual(result.outBinds.c, expected);
  };

  const long_bindinout_maxSize = async function(insertContent, proc_bindinout_exec, maxsize) {
    const bind_in_var  = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: insertContent, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: maxsize }
    };
    const result = await connection.execute(proc_bindinout_exec, bind_in_var);
    let expected = insertContent;
    if (insertContent == "" || insertContent == undefined) {
      expected = null;
    }
    assert.strictEqual(result.outBinds.c, expected);
  };

});

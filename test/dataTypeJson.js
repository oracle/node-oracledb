/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

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
 *   244.dataTypeJson.js
 *
 * DESCRIPTION
 *   Testing Oracle data type support - JSON.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const assist    = require('./dataTypeAssist.js');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('244.dataTypeJson.js', function() {

  let connection;
  let isRunnable = false;
  const tableName = "nodb_json";

  const jsonVals = assist.jsonValues;
  const default_stmtCacheSize = oracledb.stmtCacheSize;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);

    if (testsUtil.getClientVersion() >= 2100000000 && connection.oracleServerVersion >= 2100000000) {
      isRunnable = true;
    }

    if (!isRunnable) {
      this.skip();
    }

  }); // before()

  after(async function() {
    await connection.close();
  });  // after()

  describe('244.1 testing JSON data in various lengths', function() {

    before('create table, insert data', async function() {
      if (!isRunnable) {
        this.skip();
      }
      oracledb.stmtCacheSize = 0;
      await assist.setUp(connection, tableName, jsonVals);
    });  // before()

    after(async function() {
      if (!isRunnable) {
        this.skip();
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      await connection.execute("DROP table " + tableName + " PURGE");
    }); // after()

    it('244.1.1 SELECT query', async function() {
      await assist.dataTypeSupport(connection, tableName, jsonVals);
    }); // 244.1.1

    it('244.1.2 resultSet stores JSON data correctly', async function() {
      await assist.verifyResultSet(connection, tableName, jsonVals);
    }); // 244.1.2

    it('244.1.3 works well with REF Cursor', async function() {
      await assist.verifyRefCursor(connection, tableName, jsonVals);
    }); // 244.1.3

    it('244.1.4 columns fetched from REF CURSORS can be mapped by fetchInfo settings', async function() {
      await assist.verifyRefCursorWithFetchInfo(connection, tableName, jsonVals);
    }); // 244.1.4

  }); // 244.1

  describe('244.2 stores null value correctly', function() {

    it('244.2.1 testing Null, Empty string and Undefined', async function() {
      await assist.verifyNullValues(connection, tableName);
    }); // 244.2.1

  }); // 244.2

  describe('244.3 testing JSON with executeMany()', function() {

    before('create table, insert data', async function() {
      if (!isRunnable) {
        this.skip();
        return;
      }

      const proc = "BEGIN \n" +
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
          "            content    JSON \n" +
          "        ) \n" +
          "    '); \n" +
          "END; ";
      await connection.execute(proc);
    }); // before()

    after(async function() {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      await connection.execute("DROP table " + tableName + " PURGE");
    }); // after()

    it('244.3.1 works with executeMany()', async function() {
      const jsonVal1 = [1, 2, 3] ;
      const jsonVal2 = {"fred": 5, "george": 6};
      const jsonVal3 = Buffer.from("A Raw");
      const jsonVal4 = "json_scalar(to_blob(utl_raw.cast_to_raw('A short BLOB')))";
      const jsonVal5 = {
        keyA: 8,
        keyB: "A String",
        keyC: Buffer.from("A Raw"),
        keyD: true,
        keyE: false,
        keyF: null,
        keyG: true,
        keyH: [ 9, 10, 11 ],
        keyI: new Date()
      };
      const jsonVal6 = { "key1" : 1 };
      const jsonVal7 = { "key2" : -3.1415 };
      const jsonVal8 = { "key3" : false };
      const jsonVal9 = { "key4" : null };
      const jsonVal10 = { "key5" : "2018/11/01 18:30:00" };
      const jsonVal11 = { "key6" : [1, 2, 3, 99] };
      const jsonVal12 = { "key7" : ["json array1", "json array2"], "key8" : [true, false] };
      const jsonVal13 = { "key9" : "#$%^&*()@!~`-+=" };
      const jsonVal14 = { "key10" : "_:;?><,.|/" };
      const jsonVal15 = { "key11" : "Math.pow(2, 53) -1" };
      const jsonVal16 = { "key12" : "-Math.pow(2, 53) -1" };
      const jsonVal17 = { "key13" : {"key13-1" : "value13-1", "key13-2" : "value13-2"} };
      const jsonVal18 = { "#$%^&*()@!~`-+=" : "special key14 name" };
      const binds = [
        [1, jsonVal1],
        [2, jsonVal2],
        [3, jsonVal3],
        [4, jsonVal4],
        [5, jsonVal5],
        [6, jsonVal6],
        [7, jsonVal7],
        [8, jsonVal8],
        [9, jsonVal9],
        [10, jsonVal10],
        [11, jsonVal11],
        [12, jsonVal12],
        [13, jsonVal13],
        [14, jsonVal14],
        [15, jsonVal15],
        [16, jsonVal16],
        [17, jsonVal17],
        [18, jsonVal18]
      ];
      let sql = "INSERT INTO " + tableName + " VALUES (:1, :2)";
      const options = {
        autoCommit: true,
        bindDefs: [
          { type: oracledb.NUMBER },
          { type: oracledb.DB_TYPE_JSON }
        ]
      };
      let result = await connection.executeMany(sql, binds, options);
      assert.strictEqual(result.rowsAffected, binds.length);
      sql = "SELECT * FROM " + tableName + " ORDER BY id";
      result = await connection.execute(sql);
      assert.deepStrictEqual(result.rows, binds);
    }); // 244.3.1

  }); // 244.3

  describe('244.4 testing JSON with PL/SQL procedure BIND_IN and BIND_OUT', function() {
    const proc_in_name = "nodb_json_plsql_proc_in";
    const proc_out_name = "nodb_json_plsql_proc_out";
    const proc_in = "CREATE OR REPLACE PROCEDURE " + proc_in_name + " (ID IN NUMBER, inValue IN JSON )\n" +
        "AS \n" +
        "BEGIN \n" +
        "    insert into " + tableName + " ( num, content ) values (ID, inValue); \n" +
        "END " + proc_in_name + "; ";
    const run_proc_in = "BEGIN " + proc_in_name + " (:i, :c); END;";
    const drop_proc_in = "DROP PROCEDURE " + proc_in_name;
    const proc_out = "CREATE OR REPLACE PROCEDURE " + proc_out_name + " (ID IN NUMBER, outValue OUT JSON)\n" +
        "AS \n" +
        "BEGIN \n" +
        "    select content into outValue from " + tableName + " where num = ID; \n" +
        "END " + proc_out_name + "; ";
    const run_proc_out = "BEGIN " + proc_out_name + " (:i, :c); END;";
    const drop_proc_out = "DROP PROCEDURE " + proc_out_name;

    before('create table, insert data', async function() {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = 0;
      await assist.setUp(connection, tableName, jsonVals);
      await connection.execute(proc_in);
      await connection.execute(proc_out);
    }); // before()

    after(async function() {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      await connection.execute(drop_proc_in);
      await connection.execute(drop_proc_out);
      await connection.execute("DROP table " + tableName + " PURGE");
    }); // after()

    it('244.4.1 bind by name', async function() {
      const sequence = 100;
      const jsonVal = {
        keyA: 8,
        keyB: "A String",
        keyC: Buffer.from("A Raw"),
        keyD: true,
        keyE: false,
        keyF: null,
        keyG: true,
        keyH: [ 9, 10, 11 ],
        keyI: new Date()
      };
      let binds = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN, maxSize: 1000 }
      };
      await connection.execute(run_proc_in, binds);
      binds = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT, maxSize: 2000 }
      };
      const result = await connection.execute(run_proc_out, binds);
      assert.deepStrictEqual(result.outBinds.c, jsonVal);
    }); // 244.4.1

    it('244.4.2 bind by position', async function() {
      const sequence = 101;
      const jsonVal = { "key13" : {"key13-1" : "value13-1", "key13-2" : "value13-2"} };
      let binds = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN, maxSize: 10 }
      ];
      await connection.execute(run_proc_in, binds);
      binds = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT, maxSize: 10 }
      ];
      const result = await connection.execute(run_proc_out, binds);
      assert.deepStrictEqual(result.outBinds[0], jsonVal);
    }); // 244.4.2
  });  // 244.4

  describe('244.5 testing JSON with PL/SQL procedure BIND_INOUT', function() {
    const proc_name = "nodb_json_proc_inout";
    const proc = "CREATE OR REPLACE PROCEDURE " + proc_name + " (ID IN NUMBER, inoutValue IN OUT JSON)\n" +
        "AS \n" +
        "BEGIN \n" +
        "    insert into " + tableName + " ( num, content ) values (ID, inoutValue); \n" +
        "    select content into inoutValue from " + tableName + " where num = ID; \n" +
        "END " + proc_name + "; ";
    const sqlRun = "BEGIN " + proc_name + " (:i, :c); END;";
    const proc_drop = "DROP PROCEDURE " + proc_name;

    before('create table, insert data', async function() {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = 0;
      await assist.setUp(connection, tableName, jsonVals);
      await connection.execute(proc);
    }); // before()

    after(async function() {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      await connection.execute(proc_drop);
      await connection.execute("DROP table " + tableName + " PURGE");
    }); // after()

    it('244.5.1 bind by name', async function() {
      const sequence = 100;
      const jsonVal = {
        keyA: 8,
        keyB: "A String",
        keyC: Buffer.from("A Raw"),
        keyD: true,
        keyE: false,
        keyF: null,
        keyG: true,
        keyH: [ 9, 10, 11 ],
        keyI: new Date()
      };
      const binds = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_INOUT, maxSize: 2000 }
      };
      const result = await connection.execute(sqlRun, binds);
      assert.deepStrictEqual(result.outBinds.c, jsonVal);
    }); // 244.5.1

    it('244.5.2 bind by position', async function() {
      const sequence = 101;
      const jsonVal = {"fred": 5, "george": 6};
      const binds = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_INOUT, maxSize: 10 }
      ];
      const result = await connection.execute(sqlRun, binds);
      assert.deepStrictEqual(result.outBinds[0], jsonVal);
    }); // 244.5.2

  }); // 244.5

  describe('244.6 testing JSON with PL/SQL function BIND_IN and BIND_OUT', function() {
    const fun_name_in = "nodb_json_fun_in";
    const fun_name_out = "nodb_json_fun_out";
    const proc_in = "CREATE OR REPLACE FUNCTION " + fun_name_in + " (ID IN NUMBER, inValue IN JSON) RETURN JSON\n" +
        "IS \n" +
        "    tmpvar JSON; \n" +
        "BEGIN \n" +
        "    insert into " + tableName + " ( num, content ) values (ID, inValue); \n" +
        "    select content into tmpvar from " + tableName + " where num = ID; \n" +
        "    RETURN tmpvar; \n" +
        "END ; ";
    const run_proc_in = "BEGIN :output := " + fun_name_in + " (:i, :c); END;";
    const drop_proc_in = "DROP FUNCTION " + fun_name_in;

    const proc_out = "CREATE OR REPLACE FUNCTION " + fun_name_out + " (ID IN NUMBER, outValue OUT JSON) RETURN NUMBER\n" +
        "IS \n" +
        "    tmpvar NUMBER; \n" +
        "BEGIN \n" +
        "    select num, content into tmpvar, outValue from " + tableName + " where num = ID; \n" +
        "    RETURN tmpvar; \n" +
        "END ; ";
    const run_proc_out = "BEGIN :output := " + fun_name_out + " (:i, :c); END;";
    const drop_proc_out = "DROP FUNCTION " + fun_name_out;

    before('create table, insert data', async function() {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = 0;
      await assist.setUp(connection, tableName, jsonVals);
      await connection.execute(proc_in);
      await connection.execute(proc_out);
    }); // before()

    after(async function() {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      await connection.execute(drop_proc_in);
      await connection.execute(drop_proc_out);
      await connection.execute("DROP table " + tableName + " PURGE");
    }); // after()

    it('244.6.1 bind by name', async function() {
      const sequence = 100;
      const jsonVal = {
        keyA: 8,
        keyB: "A String",
        keyC: Buffer.from("A Raw"),
        keyD: true,
        keyE: false,
        keyF: null,
        keyG: true,
        keyH: [ 9, 10, 11 ],
        keyI: new Date()
      };
      let binds = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN, maxSize: 1000 },
        output: { type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT }
      };
      let result = await connection.execute(run_proc_in, binds);
      assert.deepStrictEqual(result.outBinds.output, jsonVal);
      binds = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT, maxSize: 2000 },
        output: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      };
      result = await connection.execute(run_proc_out, binds);
      assert.deepStrictEqual(result.outBinds.c, jsonVal);
      assert.deepStrictEqual(result.outBinds.output, sequence);
    }); // 244.6.1

    it('244.6.2 bind by position', async function() {
      const sequence = 101;
      const jsonVal = { "key13" : {"key13-1" : "value13-1", "key13-2" : "value13-2"} };
      let binds = [
        { type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT },
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN, maxSize: 10 }
      ];
      let result = await connection.execute(run_proc_in, binds);
      assert.deepStrictEqual(result.outBinds[0], jsonVal);
      binds = [
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT, maxSize: 10 }
      ];
      result = await connection.execute(run_proc_out, binds);
      assert.deepStrictEqual(result.outBinds[1], jsonVal);
      assert.deepStrictEqual(result.outBinds[0], sequence);
    }); // 244.6.1

  }); // 244.6

  describe('244.7 testing JSON with PL/SQL function BIND_INOUT', function() {
    const proc_name = "nodb_json_proc_inout";
    const proc = "CREATE OR REPLACE PROCEDURE " + proc_name + " (ID IN NUMBER, inoutValue IN OUT JSON)\n" +
        "AS \n" +
        "BEGIN \n" +
        "    insert into " + tableName + " ( num, content ) values (ID, inoutValue); \n" +
        "    select content into inoutValue from " + tableName + " where num = ID; \n" +
        "END " + proc_name + "; ";
    const sqlRun = "BEGIN " + proc_name + " (:i, :c); END;";
    const proc_drop = "DROP PROCEDURE " + proc_name;

    before('create table, insert data', async function() {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = 0;
      await assist.setUp(connection, tableName, jsonVals);
      await connection.execute(proc);
    }); // before()

    after(async function() {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      await connection.execute(proc_drop);
      await connection.execute("DROP table " + tableName + " PURGE");
    }); // after()

    it('244.7.1 bind by name', async function() {
      const sequence = 100;
      const jsonVal = {
        keyA: 8,
        keyB: "A String",
        keyC: Buffer.from("A Raw"),
        keyD: true,
        keyE: false,
        keyF: null,
        keyG: true,
        keyH: [ 9, 10, 11 ],
        keyI: new Date()
      };
      const binds = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_INOUT, maxSize: 2000 }
      };
      const result = await connection.execute(sqlRun, binds);
      assert.deepStrictEqual(result.outBinds.c, jsonVal);
    }); // 244.7.1

    it('244.7.2 bind by position', async function() {
      const sequence = 101;
      const jsonVal = {"fred": 5, "george": 6};
      const binds = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_INOUT, maxSize: 10 }
      ];
      const result = await connection.execute(sqlRun, binds);
      assert.deepStrictEqual(result.outBinds[0], jsonVal);
    }); // 244.7.2

  }); // 244.7

  describe('244.8 testing JSON with DML returning into', function() {

    before('create table, insert data', async function() {
      if (!isRunnable) {
        this.skip();
        return;
      }
      const proc = "BEGIN \n" +
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
          "            num         NUMBER, \n" +
          "            content    JSON \n" +
          "        ) \n" +
          "    '); \n" +
          "END; ";
      await connection.execute(proc);
    }); // before()

    after(async function() {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      await connection.execute("DROP table " + tableName + " PURGE");
    }); // after()

    it('244.8.1 bind by name', async function() {
      const sequence = 1;
      const jsonVal = {
        keyA: 8,
        keyB: "A String",
        keyC: Buffer.from("A Raw"),
        keyD: true,
        keyE: false,
        keyF: null,
        keyG: true,
        keyH: [ 9, 10, 11 ],
        keyI: new Date()
      };

      const sql = "insert into " + tableName + " ( num, content ) values (:i, :c) returning content into :output";
      const binds = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN },
        output: { type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT, maxSize: 2000 }
      };
      const result = await connection.execute(sql, binds);
      assert.deepStrictEqual(result.outBinds.output[0], jsonVal);
    }); // 244.8.1

    it('244.8.2 bind by position', async function() {
      const sequence = 2;
      const jsonVal = { "key5" : "2018/11/01 18:30:00" };

      const sql = "insert into " + tableName + " ( num, content ) values (:i, :c) returning content into :output";
      const binds = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN },
        { type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT, maxSize: 2000 }
      ];
      const result = await connection.execute(sql, binds);
      assert.deepStrictEqual(result.outBinds[0][0], jsonVal);
    }); // 244.8.2

  }); // 244.8

  describe('244.9 testing JSON with oracledb.fetchAsString and fetchInfo oracledb.STRING', function() {

    before('create table, insert data', async function() {
      if (!isRunnable) {
        this.skip();
        return;
      }
      const proc = "BEGIN \n" +
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
          "            content    JSON \n" +
          "        ) \n" +
          "    '); \n" +
          "END; ";
      await connection.execute(proc);
    }); // before()

    after(async function() {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      oracledb.fetchAsString = [];
      await connection.execute("DROP table " + tableName + " PURGE");
    }); // after()

    it('244.9.1 works with oracledb.fetchAsString', async function() {
      oracledb.fetchAsString = [ oracledb.DB_TYPE_JSON ];
      const sequence = 1;
      const jsonVal = { "key5" : "2018/11/01 18:30:00" };
      const resultStr = "{\"key5\":\"2018/11/01 18:30:00\"}";

      let sql = "insert into " + tableName + " ( id, content ) values (:i, :c)";
      const binds = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN }
      ];

      await connection.execute(sql, binds);
      sql = "select content as C from " + tableName + " where id = " + sequence;
      const result = await connection.execute(sql);
      assert.strictEqual(typeof result.rows[0][0], 'string');
      assert.strictEqual(result.rows[0][0].length, resultStr.length);
      assert.strictEqual(result.rows[0][0], resultStr);
    }); // 244.9.1

    it.skip('244.9.2 doesn\'t work with outFormat: oracledb.DB_TYPE_JSON', async function() {
      oracledb.fetchAsString = [ oracledb.DB_TYPE_JSON ];
      const sequence = 2;
      const jsonVal = { "key5" : "2018/11/01 18:30:00" };
      const resultStr = "{\"key5\":\"2018/11/01 18:30:00\"}";

      let sql = "insert into " + tableName + " ( id, content ) values (:i, :c)";
      const binds = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN }
      ];

      await connection.execute(sql, binds);
      sql = "select content as C from " + tableName + " where id = " + sequence;
      const options = { outFormat : oracledb.DB_TYPE_JSON };
      const result = await connection.execute(sql, [], options);
      assert.strictEqual(typeof result.rows[0][0], 'string');
      assert.strictEqual(result.rows[0][0].length, resultStr.length);
      assert.strictEqual(result.rows[0][0], resultStr);
    }); // 244.9.2

    it('244.9.3 could work with fetchInfo oracledb.STRING', async function() {
      oracledb.fetchAsString = [];
      const sequence = 3;
      const jsonVal = { "key5" : "2018/11/01 18:30:00" };
      const resultStr = "{\"key5\":\"2018/11/01 18:30:00\"}";

      let sql = "insert into " + tableName + " ( id, content ) values (:i, :c)";
      const binds = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN }
      ];
      await connection.execute(sql, binds);
      sql = "select content as C from " + tableName + " where id = " + sequence;
      const options = {
        fetchInfo : { C : { type : oracledb.STRING } }
      };
      const result = await connection.execute(sql, [], options);
      assert.strictEqual(typeof result.rows[0][0], 'string');
      assert.strictEqual(result.rows[0][0].length, resultStr.length);
      assert.strictEqual(result.rows[0][0], resultStr);
    }); // 244.9.3

  }); // 244.9

});

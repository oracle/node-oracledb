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
  let isOracle_23_4 = false;
  const tableName = "nodb_json";

  const jsonVals = assist.jsonValues;
  const default_stmtCacheSize = oracledb.stmtCacheSize;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);

    if (testsUtil.getClientVersion() >= 2100000000 && connection.oracleServerVersion >= 2100000000) {
      isRunnable = true;
    }

    // Check if we are running the latest Oracle Server and Client versions
    // for vector and long field names support
    isOracle_23_4 = connection.oracleServerVersion >= 2304000000
      && (oracledb.thin || oracledb.oracleClientVersion >= 2304000000);

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
      await testsUtil.dropTable(connection, tableName);
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

    it('244.1.5 Negative field name length > 255 bytes - Oracle 21c', async function() {
      if (isOracle_23_4 || !oracledb.thin) {
        this.skip();
      }
      // The server does not throw an error for out-of-bounds field length
      // names as of now.
      const sequence = 1;
      const longFieldName = 'A'.repeat(256);
      const jsonVal = {};
      jsonVal[longFieldName] = "2018/11/01 18:30:00";
      const sql = "insert into " + tableName + " ( id, content ) values (:i, :c)";
      const binds = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN }
      ];
      await assert.rejects(
        async () => await connection.execute(sql, binds),
        // NJS-114: OSON field names may not exceed %d UTF-8 encoded bytes
        /NJS-114:/
      );
    }); // 244.1.5

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
      }

      oracledb.fetchAsBuffer = [oracledb.BLOB];
      const sql = " CREATE TABLE " + tableName +
        " ( \n" +
        " id         NUMBER, \n" +
        " content    JSON, \n" +
        " osonCol    BLOB, \n" +
        " constraint Oson_ck_1 check (OsonCol is json format oson)" +
        " )";
      await testsUtil.createTable(connection, tableName, sql);
    }); // before()

    after(async function() {
      if (!isRunnable) {
        this.skip();
      }
      oracledb.fetchAsBuffer = [];
      oracledb.stmtCacheSize = default_stmtCacheSize;
      await testsUtil.dropTable(connection, tableName);
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
      const jsonVal6 = { "key1": 1 };
      const jsonVal7 = { "key2": -3.1415 };
      const jsonVal8 = { "key3": false };
      const jsonVal9 = { "key4": null };
      const jsonVal10 = { "key5": "2018/11/01 18:30:00" };
      const jsonVal11 = { "key6": [1, 2, 3, 99] };
      const jsonVal12 = { "key7": ["json array1", "json array2"], "key8": [true, false] };
      const jsonVal13 = { "key9": "#$%^&*()@!~`-+=" };
      const jsonVal14 = { "key10": "_:;?><,.|/" };
      const jsonVal15 = { "key11": "Math.pow(2, 53) -1" };
      const jsonVal16 = { "key12": "-Math.pow(2, 53) -1" };
      const jsonVal17 = { "key13": {"key13-1": "value13-1", "key13-2": "value13-2"} };
      const jsonVal18 = { "#$%^&*()@!~`-+=": "special key14 name" };
      const jsonVal19 = [new Float32Array([1.23, 4.43, -12.13]), [1, 2]];
      const jsonVal20 = {
        KeyF32: new Float32Array([1, 2]),
        KeyF64: new Float64Array([-992.1, 994.3]),
        KeyInt8: new Int8Array([-123, 12, 123]),
        keyBuf: Buffer.from("A Raw")
      };
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

      // Inserting TypedArrays is only allowed with Oracle Database 23ai and
      // Oracle Client 23ai versions and above
      if (isOracle_23_4) {
        binds.push([19, jsonVal19]);
        binds.push([20, jsonVal20]);
      }
      binds.forEach((element, index) => {
        binds[index].push(connection.encodeOSON(element[1]));
      });
      let sql = "INSERT INTO " + tableName + " VALUES (:1, :2, :3)";
      const options = {
        autoCommit: true,
        bindDefs: [
          { type: oracledb.NUMBER },
          { type: oracledb.DB_TYPE_JSON },
          { type: oracledb.DB_TYPE_BLOB }
        ]
      };
      let result = await connection.executeMany(sql, binds, options);
      assert.strictEqual(result.rowsAffected, binds.length);
      sql = "SELECT * FROM " + tableName + " ORDER BY id";
      result = await connection.execute(sql);
      const retRows = result.rows;
      retRows.forEach((element, index) => {
        assert.deepStrictEqual(binds[index][1], connection.decodeOSON(element[2]));
        assert.deepStrictEqual(binds[index][0], element[0]);
        assert.deepStrictEqual(binds[index][1], element[1]);
      });
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
      }
      oracledb.stmtCacheSize = 0;
      await assist.setUp(connection, tableName, jsonVals);
      await connection.execute(proc_in);
      await connection.execute(proc_out);
    }); // before()

    after(async function() {
      if (!isRunnable) {
        this.skip();
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      await connection.execute(drop_proc_in);
      await connection.execute(drop_proc_out);
      await testsUtil.dropTable(connection, tableName);
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
      const jsonVal = { "key13": {"key13-1": "value13-1", "key13-2": "value13-2"} };
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
      }
      oracledb.stmtCacheSize = 0;
      await assist.setUp(connection, tableName, jsonVals);
      await connection.execute(proc);
    }); // before()

    after(async function() {
      if (!isRunnable) {
        this.skip();
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      await connection.execute(proc_drop);
      await testsUtil.dropTable(connection, tableName);
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
      }
      oracledb.stmtCacheSize = 0;
      await assist.setUp(connection, tableName, jsonVals);
      await connection.execute(proc_in);
      await connection.execute(proc_out);
    }); // before()

    after(async function() {
      if (!isRunnable) {
        this.skip();
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      await connection.execute(drop_proc_in);
      await connection.execute(drop_proc_out);
      await testsUtil.dropTable(connection, tableName);
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
      const jsonVal = { "key13": {"key13-1": "value13-1", "key13-2": "value13-2"} };
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
      }
      oracledb.stmtCacheSize = 0;
      await assist.setUp(connection, tableName, jsonVals);
      await connection.execute(proc);
    }); // before()

    after(async function() {
      if (!isRunnable) {
        this.skip();
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      await connection.execute(proc_drop);
      await testsUtil.dropTable(connection, tableName);
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
      }
      const sql = " CREATE TABLE " + tableName + " ( \n" +
        "  num        NUMBER, \n" +
        "  content    JSON \n" +
        "  )";
      await testsUtil.createTable(connection, tableName, sql);
    }); // before()

    after(async function() {
      if (!isRunnable) {
        this.skip();
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      await testsUtil.dropTable(connection, tableName);
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
      const jsonVal = { "key5": "2018/11/01 18:30:00" };

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

    let sequence = 1;
    before('create table, insert data', async function() {
      if (!isRunnable) {
        this.skip();
      }
      const sql = " CREATE TABLE " + tableName + " ( \n" +
          " id         NUMBER, \n" +
          " content    JSON \n" +
          " )";
      await testsUtil.createTable(connection, tableName, sql);
    }); // before()

    after(async function() {
      if (!isRunnable) {
        this.skip();
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      oracledb.fetchAsString = [];
      await testsUtil.dropTable(connection, tableName);
    }); // after()

    const testInsertAndFetch = async function(seq, jsonVal, resultStr, selectOpts) {
      let sql = "insert into " + tableName + " ( id, content ) values (:i, :c)";
      const binds = [
        { val: seq, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN }
      ];

      await connection.execute(sql, binds);
      sql = "select content as C from " + tableName + " where id = " + seq;
      const result = await connection.execute(sql, [], selectOpts);
      assert.strictEqual(typeof result.rows[0][0], 'string');
      assert.strictEqual(result.rows[0][0].length, resultStr.length);
      assert.strictEqual(result.rows[0][0], resultStr);
    };

    it('244.9.1 works with oracledb.fetchAsString', async function() {
      oracledb.fetchAsString = [ oracledb.DB_TYPE_JSON ];
      const jsonVals = [{ "key5": "2018/11/01 18:30:00" }];
      const resultStr = ["{\"key5\":\"2018/11/01 18:30:00\"}"];

      // Add the JSON Field with Long Field Name to the JSON Values Array
      // for Oracle DB 23.4 (and Oracle Client 23.4)
      if (isOracle_23_4) {
        const longFieldName = 'A'.repeat(1000);
        const jsonVal = {};
        jsonVal[longFieldName] = "2018/11/01 18:30:00";
        jsonVals.push(jsonVal);
        resultStr.push(`{"${longFieldName}":"2018/11/01 18:30:00"}`);
      }

      for (let i = 1; i <= jsonVals.length; i++) {
        await testInsertAndFetch(sequence, jsonVals[i - 1], resultStr[i - 1], {});
        sequence++;
      }
    }); // 244.9.1

    it('244.9.2 could work with fetchInfo oracledb.STRING', async function() {
      oracledb.fetchAsString = [];
      const jsonVal = { "key5": "2018/11/01 18:30:00" };
      const resultStr = "{\"key5\":\"2018/11/01 18:30:00\"}";

      const options = {
        fetchInfo: { C: { type: oracledb.STRING } }
      };

      // Test Insert and Fetch of JSON Data
      await testInsertAndFetch(sequence, jsonVal, resultStr, options);
      sequence++;

    }); // 244.9.2

  }); // 244.9

  describe('244.10 testing JSON with long field names > 255 bytes', function() {

    const table = 'nodb_json_long';
    let sequence = 1;

    before('create table, insert data', async function() {
      if (!isOracle_23_4) {
        this.skip();
      }
      const sql = " CREATE TABLE " + table + " ( \n" +
        " id         NUMBER, \n" +
        " content    JSON \n" +
        " )";
      await testsUtil.createTable(connection, table, sql);
    }); // before()

    after(async function() {
      if (!isOracle_23_4) {
        return;
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      oracledb.fetchAsString = [];
      await testsUtil.dropTable(connection, table);
    }); // after()

    it('244.10.1 single long JSON field name', async function() {
      oracledb.fetchAsString = [ oracledb.DB_TYPE_JSON ];
      const longFieldName = 'A'.repeat(1000);
      const jsonVal = {};
      jsonVal[longFieldName] = "2018/11/01 18:30:00";
      const resultStr = `{"${longFieldName}":"2018/11/01 18:30:00"}`;

      let sql = "insert into " + table + " ( id, content ) values (:i, :c)";
      const binds = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN }
      ];

      await connection.execute(sql, binds);
      sql = "select content as C from " + table + " where id = " + sequence;
      const result = await connection.execute(sql);
      assert.strictEqual(typeof result.rows[0][0], 'string');
      assert.strictEqual(result.rows[0][0].length, resultStr.length);
      assert.strictEqual(result.rows[0][0], resultStr);
      sequence++;

    }); // 244.10.1

    it('244.10.2 multiple long JSON field names', async function() {
      oracledb.fetchAsString = [];

      const jsonVal = {};
      const NO_OF_ALPHABETS = 26;
      for (let i = 0; i < NO_OF_ALPHABETS; i++) {
        for (let j = 0; j < NO_OF_ALPHABETS; j++) {
          const longFieldName = String.fromCharCode('A'.charCodeAt(0) + i) +
            String.fromCharCode('A'.charCodeAt(0) + j) + 'X'.repeat(500);
          jsonVal[longFieldName] = i + j;
        }
      }

      // Testing multi-byte field names and multi-byte field values
      const multiByteLongFieldName = '𠜎'.repeat(1000);
      jsonVal[multiByteLongFieldName] = '𠜎𠜎𠜎𠜎𠜎';

      let sql = "insert into " + table + " ( id, content ) values (:i, :c)";
      const binds = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN }
      ];

      await connection.execute(sql, binds);
      sql = "select content as C from " + table + " where id = " + sequence;
      const result = await connection.execute(sql);
      assert.deepStrictEqual(result.rows[0][0], jsonVal);
      sequence++;

    }); // 244.10.2

    it('244.10.3 multiple long and short JSON field names', async function() {
      oracledb.fetchAsString = [];

      const jsonVal = {};
      const NO_OF_ALPHABETS = 26;
      for (let i = 0; i < NO_OF_ALPHABETS; i++) {
        for (let j = 0; j < NO_OF_ALPHABETS; j++) {
          const shortFieldName = String.fromCharCode('A'.charCodeAt(0) + i) +
            String.fromCharCode('A'.charCodeAt(0) + j);
          jsonVal[shortFieldName] = 6.75;
          const longFieldName = String.fromCharCode('A'.charCodeAt(0) + i) +
            String.fromCharCode('A'.charCodeAt(0) + j) + 'X'.repeat(254);
          jsonVal[longFieldName] = i + j;
        }
      }

      let sql = "insert into " + table + " ( id, content ) values (:i, :c)";
      const binds = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN }
      ];

      await connection.execute(sql, binds);
      sql = "select content as C from " + table + " where id = " + sequence;
      const result = await connection.execute(sql);
      assert.deepStrictEqual(result.rows[0][0], jsonVal);
      sequence++;

    }); // 244.10.3

    it('244.10.4 negative case for out-of-bounds field length names', async function() {
      // The server does not throw an error for out-of-bounds field length
      // names as of now.
      if (!oracledb.thin)
        this.skip();
      const longFieldName = 'A'.repeat(65536);
      const jsonVal = {};
      jsonVal[longFieldName] = "2018/11/01 18:30:00";
      const sql = "insert into " + table + " ( id, content ) values (:i, :c)";
      const binds = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN }
      ];
      await assert.rejects(
        async () => await connection.execute(sql, binds),
        // NJS-114: OSON field names may not exceed %d UTF-8 encoded bytes
        /NJS-114:/
      );
      sequence++;
    }); // 244.10.4

  }); // 244.10

  describe('244.11 testing compressed JSON with relative offsets', function() {
    // Relative offsets enable the offset values in the OSON format to be
    // much smaller and also allow for repeated values, which lends itself
    // well to compression.

    const table = 'nodb_json_rel_offsets';
    let sequence = 1;

    before('create table, insert data', async function() {
      if (!isOracle_23_4) {
        this.skip();
      }
      const sql = " CREATE TABLE " + table + " ( \n" +
          " id         NUMBER, \n" +
          " content    JSON \n" +
          " ) JSON (content) STORE AS (COMPRESS HIGH)";
      await testsUtil.createTable(connection, table, sql);
    }); // before()

    after(async function() {
      if (!isOracle_23_4) {
        return;
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      oracledb.fetchAsString = [];
      await testsUtil.dropTable(connection, table);
    }); // after()

    it('244.11.1 fetch JSON with relative offsets', async function() {
      const longFieldName = 'A'.repeat(1000);
      const jsonVal = {};
      jsonVal[longFieldName] = "2018/11/01 18:30:00";
      jsonVal['num_list'] = [1.5, 2.25, 3.75, 5.5];
      jsonVal['str_list'] = ["string 1", "string 2"];

      // Send a JSON string, which is converted and stored as compressed JSON
      // by the database
      let sql = "insert into " + table + " ( id, content ) values (:i, :c)";
      const binds = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: JSON.stringify(jsonVal) }
      ];

      await connection.execute(sql, binds);
      sql = "select content as C from " + table + " where id = " + sequence;
      const result = await connection.execute(sql);
      assert.deepStrictEqual(result.rows[0][0], jsonVal);
      sequence++;

    }); // 244.11.1

    it('244.11.2 fetch JSON with relative offsets and shared fields and values', async function() {
      const jsonVal = [];
      for (let i = 0; i < 15; i++) {
        jsonVal.push({a: 6711, b: 'String value'});
      }

      // Send a JSON string, which is converted and stored as compressed JSON
      // by the database
      let sql = "insert into " + table + " ( id, content ) values (:i, :c)";
      const binds = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: JSON.stringify(jsonVal) }
      ];

      await connection.execute(sql, binds);
      sql = "select content as C from " + table + " where id = " + sequence;
      const result = await connection.execute(sql);
      assert.deepStrictEqual(result.rows[0][0], jsonVal);
      sequence++;

    }); // 244.11.2

    it('244.11.3 fetch JSON with relative offsets and shared fields, not values', async function() {
      const jsonVal = [];
      for (let i = 0; i < 15; i++) {
        jsonVal.push({a: 6711 + i, b: 'String value ' + i});
      }

      // Send a JSON string, which is converted and stored as compressed JSON
      // by the database
      let sql = "insert into " + table + " ( id, content ) values (:i, :c)";
      const binds = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: JSON.stringify(jsonVal) }
      ];

      await connection.execute(sql, binds);
      sql = "select content as C from " + table + " where id = " + sequence;
      const result = await connection.execute(sql);
      assert.deepStrictEqual(result.rows[0][0], jsonVal);
      sequence++;

    }); // 244.11.3

  }); // 244.11

  describe('244.12 Verify auto-generated SODA document key', function() {
    const TABLE = 'nodb_244_63soda';
    let supportsJsonId;

    before('create table, insert data', async function() {
      supportsJsonId = (testsUtil.getClientVersion() >= 2304000000) &&
        (connection.oracleServerVersion >= 2304000000);
      if (!supportsJsonId) {
        this.skip();
      }
      const sql = `CREATE JSON COLLECTION TABLE if not exists ${TABLE}`;
      await connection.execute(sql);
    }); // before()

    after(async function() {
      if (!supportsJsonId) {
        return;
      }
      const sql = `DROP TABLE if exists ${TABLE}`;
      await connection.execute(sql);
    }); // after()

    it('244.12.1 Verify Json Id on select', async function() {
      const inpDoc = {"name": "Jenny"};
      let sql = ` insert into ${TABLE} values (:1)`;
      let result = await connection.execute(sql, [{
        type: oracledb.DB_TYPE_JSON,
        val: inpDoc
      }]);

      // Verify _id is generated.
      sql = `select * from ${TABLE}`;
      result = await connection.execute(sql);
      let genDoc = result.rows[0][0];
      assert(("_id" in genDoc));
      const autogenID = genDoc._id;

      // Verify update with new values without passing _id.
      inpDoc.name = "Scott";
      sql = ` update ${TABLE} set DATA = :1`;
      result = await connection.execute(sql, [{
        type: oracledb.DB_TYPE_JSON,
        val: inpDoc
      }]);
      sql = `select * from ${TABLE}`;
      result = await connection.execute(sql);
      genDoc = result.rows[0][0];
      const updatedID = genDoc._id;
      assert.deepStrictEqual(updatedID, autogenID);
      assert.strictEqual(inpDoc.name, genDoc.name);

      // Verify update with new values with passing _id from the generated Doc.
      genDoc.name = "John";
      sql = ` update ${TABLE} set DATA = :1`;
      result = await connection.execute(sql, [{
        type: oracledb.DB_TYPE_JSON,
        val: genDoc
      }]);
      sql = `select * from ${TABLE}`;
      result = await connection.execute(sql);
      const updatedDoc = result.rows[0][0];
      assert.deepStrictEqual(updatedDoc, genDoc);
      const expectedJsonData = genDoc;
      expectedJsonData._id = Buffer.from(autogenID).toString('hex');
      assert.deepStrictEqual(JSON.stringify(expectedJsonData),
        JSON.stringify(updatedDoc));

      // Insert Document with Previously generated JsonId type.
      const jsonId = new oracledb.JsonId(genDoc._id);
      const inpDocWithJsonIdKey = {"_id": jsonId, "name": "Bob"};
      sql = ` insert into ${TABLE} values (:1)`;
      result = await connection.execute(sql, [{
        type: oracledb.DB_TYPE_JSON,
        val: inpDocWithJsonIdKey
      }]);
      sql = `select * from ${TABLE}`;
      result = await connection.execute(sql);
      genDoc = result.rows[1][0];
      assert.deepStrictEqual(genDoc, inpDocWithJsonIdKey);

      // overwrite the auto-generated _id with user key should fail.
      genDoc._id = "RandomId";
      sql = ` update ${TABLE} set DATA = :1`;
      await assert.rejects(
        async () => await connection.execute(sql, [{
          type: oracledb.DB_TYPE_JSON,
          val: genDoc
        }]),
        /ORA-54059:/ // cannot update an immutable column to a different value
      );

      // User provided keys should still work.
      const inpDocWithUserKey = {"_id": 1, "name": "Jenny"};
      sql = ` insert into ${TABLE} values (:1)`;
      result = await connection.execute(sql, [{
        type: oracledb.DB_TYPE_JSON,
        val: inpDocWithUserKey
      }]);
      sql = `select * from ${TABLE}`;
      result = await connection.execute(sql);
      genDoc = result.rows[2][0];
      assert.deepStrictEqual(genDoc, inpDocWithUserKey);
    }); // 244.12.1

  });  // 244.12

  describe('244.13 Read JSON data on meta data change', function() {

    const tableNameJSON = 'nodb_myjson_recreate';
    let sequence = 1;
    const sqlCreate = " CREATE TABLE " + tableNameJSON + " ( \n" +
    " id         NUMBER, \n" +
    " content    JSON \n" +
    " )";

    before('create table, insert data', async function() {
      if (!isRunnable) {
        this.skip();
      }
      await testsUtil.createTable(connection, tableNameJSON, sqlCreate);
    }); // before()

    after(async function() {
      if (!isRunnable) {
        this.skip();
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      oracledb.fetchAsString = [];
      await testsUtil.dropTable(connection, tableNameJSON);
    }); // after()

    async function recreateTable() {
      await testsUtil.dropTable(connection, tableNameJSON);
      await testsUtil.createTable(connection, tableNameJSON, sqlCreate);
    }

    const testInsertAndFetch = async function(seq, jsonVal, resultStr, selectOpts) {
      let sql = "insert into " + tableNameJSON + " ( id, content ) values (:i, :c)";
      const binds = [
        { val: seq, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN }
      ];

      await connection.execute(sql, binds);
      sql = "select content as C from " + tableNameJSON + " where id = " + seq;
      const result = await connection.execute(sql, [], selectOpts);
      assert.strictEqual(result.rows[0][0], resultStr);
    };

    it('244.13.1 table recreate - with oracledb.fetchAsString', async function() {
      oracledb.fetchAsString = [ oracledb.DB_TYPE_JSON ];
      const jsonVals = [{ "key5": "2018/11/01 18:30:00" }];
      const resultStr = ["{\"key5\":\"2018/11/01 18:30:00\"}"];

      // Add the JSON Field with Long Field Name to the JSON Values Array
      // for Oracle DB 23.4 (and Oracle Client 23.4)
      if (isOracle_23_4) {
        const longFieldName = 'A'.repeat(1000);
        const jsonVal = {};
        jsonVal[longFieldName] = "2018/11/01 18:30:00";
        jsonVals.push(jsonVal);
        resultStr.push(`{"${longFieldName}":"2018/11/01 18:30:00"}`);
      }

      for (let i = 0; i < jsonVals.length; i++) {
        await testInsertAndFetch(sequence, jsonVals[i], resultStr[i], {});
        sequence++;
      }

      await recreateTable();
      sequence = 1;

      for (let i = 0; i < jsonVals.length; i++) {
        await testInsertAndFetch(sequence, jsonVals[i], resultStr[i], {});
        sequence++;
      }

    }); // 244.13.1

    it('244.13.2 table recreate - with fetchInfo oracledb.STRING', async function() {
      oracledb.fetchAsString = [];
      const jsonVal = { "key5": "2018/11/01 18:30:00" };
      const resultStr = "{\"key5\":\"2018/11/01 18:30:00\"}";

      const options = {
        fetchInfo: { C: { type: oracledb.STRING } }
      };

      // Test Insert and Fetch of JSON Data
      await testInsertAndFetch(sequence, jsonVal, resultStr, options);
      // Recreate the same table
      await recreateTable();
      // Test Insert and Fetch of JSON Data again
      await testInsertAndFetch(sequence, jsonVal, resultStr, options);
      sequence++;

    }); // 244.13.2

  }); // 244.13

});

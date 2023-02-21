/* Copyright (c) 2015, 2022, Oracle and/or its affiliates. */

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

var oracledb  = require('oracledb');
var should    = require('should');
var assist    = require('./dataTypeAssist.js');
var dbConfig  = require('./dbconfig.js');
var async     = require('async');

describe('244.dataTypeJson.js', function() {

  var connection = null;
  var isRunnable = false;
  var tableName = "nodb_json";

  var jsonVals = assist.jsonValues;
  const default_stmtCacheSize = oracledb.stmtCacheSize;

  before(async function() {

    try {
      connection = await oracledb.getConnection(dbConfig);
    } catch (err) {
      should.not.exist(err);
    }

    if (oracledb.oracleClientVersion >= 2100000000 && connection.oracleServerVersion >= 2100000000) {
      isRunnable = true;
    }

    if (!isRunnable) {
      this.skip();
    }

  }); // before()

  after(async function() {
    try {
      await connection.close();
    } catch (err) {
      should.not.exist(err);
    }
  });  // after()

  describe('244.1 testing JSON data in various lengths', function() {

    before('create table, insert data', function(done) {
      if (!isRunnable) {
        this.skip();
      }
      oracledb.stmtCacheSize = 0;
      assist.setUp(connection, tableName, jsonVals, done);
    });  // before()

    after(function(done) {
      if (!isRunnable) {
        this.skip();
      }
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
      oracledb.stmtCacheSize = default_stmtCacheSize;

    }); // after()

    it('244.1.1 SELECT query', function(done) {
      assist.dataTypeSupport(connection, tableName, jsonVals, done);
    }); // 244.1.1

    it('244.1.2 resultSet stores JSON data correctly', function(done) {
      assist.verifyResultSet(connection, tableName, jsonVals, done);
    }); // 244.1.2

    it('244.1.3 works well with REF Cursor', function(done) {
      assist.verifyRefCursor(connection, tableName, jsonVals, done);
    }); // 244.1.3

    it('244.1.4 columns fetched from REF CURSORS can be mapped by fetchInfo settings', function(done) {
      assist.verifyRefCursorWithFetchInfo(connection, tableName, jsonVals, done);
    }); // 244.1.4

  }); // 244.1

  describe('244.2 stores null value correctly', function() {

    it('244.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    }); // 244.2.1

  }); // 244.2

  describe('244.3 testing JSON with executeMany()', function() {

    before('create table, insert data', function(done) {
      if (!isRunnable) {
        this.skip();
        return;
      }
      async.series([
        function(cb) {
          oracledb.getConnection(
            dbConfig,
            function(err, conn) {
              connection = conn;
              should.not.exist(err);
              cb();
            }
          );
        },
        function createTable(cb) {
          var proc = "BEGIN \n" +
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
          connection.execute(proc, function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }); // before()

    after(function(done) {
      if (!isRunnable) {
        this.skip();
        return;
      }
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
      oracledb.stmtCacheSize = default_stmtCacheSize;

    }); // after()

    it('244.3.1 works with executeMany()', function(done) {
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
      async.series([
        function(cb) {
          var sql = "INSERT INTO " + tableName + " VALUES (:1, :2)";
          var options = {
            autoCommit: true,
            bindDefs: [
              { type: oracledb.NUMBER },
              { type: oracledb.DB_TYPE_JSON }
            ]
          };
          connection.executeMany(sql, binds, options, function(err, result) {
            should.not.exist(err);
            should.strictEqual(result.rowsAffected, binds.length);
            cb();
          });
        },
        function(cb) {
          var sql = "SELECT * FROM " + tableName + " ORDER BY id";
          connection.execute(
            sql,
            function(err, result) {
              should.not.exist(err);
              should.deepEqual(result.rows, binds);
              cb();
            }
          );
        }
      ], done);
    }); // 244.3.1

  }); // 244.3

  describe('244.4 testing JSON with PL/SQL procedure BIND_IN and BIND_OUT', function() {
    var proc_in_name = "nodb_json_plsql_proc_in";
    var proc_out_name = "nodb_json_plsql_proc_out";
    var proc_in = "CREATE OR REPLACE PROCEDURE " + proc_in_name + " (ID IN NUMBER, inValue IN JSON )\n" +
        "AS \n" +
        "BEGIN \n" +
        "    insert into " + tableName + " ( num, content ) values (ID, inValue); \n" +
        "END " + proc_in_name + "; ";
    var run_proc_in = "BEGIN " + proc_in_name + " (:i, :c); END;";
    var drop_proc_in = "DROP PROCEDURE " + proc_in_name;
    var proc_out = "CREATE OR REPLACE PROCEDURE " + proc_out_name + " (ID IN NUMBER, outValue OUT JSON)\n" +
        "AS \n" +
        "BEGIN \n" +
        "    select content into outValue from " + tableName + " where num = ID; \n" +
        "END " + proc_out_name + "; ";
    var run_proc_out = "BEGIN " + proc_out_name + " (:i, :c); END;";
    var drop_proc_out = "DROP PROCEDURE " + proc_out_name;

    before('create table, insert data', function(done) {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = 0;
      async.series([
        function(cb) {
          assist.setUp(connection, tableName, jsonVals, cb);
        },
        function(cb) {
          connection.execute(
            proc_in,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            proc_out,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // before()

    after(function(done) {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      async.series([
        function(cb) {
          connection.execute(
            drop_proc_in,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            drop_proc_out,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "DROP table " + tableName + " PURGE",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // after()

    it('244.4.1 bind by name', function(done) {
      var sequence = 100;
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
      async.series([
        function(cb) {
          var bindVar = {
            i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c: { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN, maxSize: 1000 }
          };
          connection.execute(
            run_proc_in,
            bindVar,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var bindVar = {
            i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c: { type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT, maxSize: 2000 }
          };
          connection.execute(
            run_proc_out,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              should.deepEqual(result.outBinds.c, jsonVal);
              cb();
            }
          );
        }
      ], done);

    }); // 244.4.1

    it('244.4.2 bind by position', function(done) {
      var sequence = 101;
      const jsonVal = { "key13" : {"key13-1" : "value13-1", "key13-2" : "value13-2"} };
      async.series([
        function(cb) {
          var bindVar = [
            { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN, maxSize: 10 }
          ];
          connection.execute(
            run_proc_in,
            bindVar,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var bindVar = [
            { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            { type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT, maxSize: 10 }
          ];
          connection.execute(
            run_proc_out,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              should.deepEqual(result.outBinds[0], jsonVal);
              cb();
            }
          );
        }
      ], done);

    }); // 244.4.2
  });  // 244.4

  describe('244.5 testing JSON with PL/SQL procedure BIND_INOUT', function() {
    var proc_name = "nodb_json_proc_inout";
    var proc = "CREATE OR REPLACE PROCEDURE " + proc_name + " (ID IN NUMBER, inoutValue IN OUT JSON)\n" +
        "AS \n" +
        "BEGIN \n" +
        "    insert into " + tableName + " ( num, content ) values (ID, inoutValue); \n" +
        "    select content into inoutValue from " + tableName + " where num = ID; \n" +
        "END " + proc_name + "; ";
    var sqlRun = "BEGIN " + proc_name + " (:i, :c); END;";
    var proc_drop = "DROP PROCEDURE " + proc_name;

    before('create table, insert data', function(done) {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = 0;
      async.series([
        function(cb) {
          assist.setUp(connection, tableName, jsonVals, cb);
        },
        function(cb) {
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // before()

    after(function(done) {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      async.series([
        function(cb) {
          connection.execute(
            proc_drop,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "DROP table " + tableName + " PURGE",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // after()

    it('244.5.1 bind by name', function(done) {
      var sequence = 100;
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
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_INOUT, maxSize: 2000 }
      };
      connection.execute(
        sqlRun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          should.deepEqual(result.outBinds.c, jsonVal);
          done();
        }
      );

    }); // 244.5.1

    it('244.5.2 bind by position', function(done) {
      var sequence = 101;
      const jsonVal = {"fred": 5, "george": 6};
      var bindVar = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_INOUT, maxSize: 10 }
      ];
      connection.execute(
        sqlRun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          should.deepEqual(result.outBinds[0], jsonVal);
          done();
        }
      );
    }); // 244.5.2
  }); // 244.5

  describe('244.6 testing JSON with PL/SQL function BIND_IN and BIND_OUT', function() {
    var fun_name_in = "nodb_json_fun_in";
    var fun_name_out = "nodb_json_fun_out";
    var proc_in = "CREATE OR REPLACE FUNCTION " + fun_name_in + " (ID IN NUMBER, inValue IN JSON) RETURN JSON\n" +
        "IS \n" +
        "    tmpvar JSON; \n" +
        "BEGIN \n" +
        "    insert into " + tableName + " ( num, content ) values (ID, inValue); \n" +
        "    select content into tmpvar from " + tableName + " where num = ID; \n" +
        "    RETURN tmpvar; \n" +
        "END ; ";
    var run_proc_in = "BEGIN :output := " + fun_name_in + " (:i, :c); END;";
    var drop_proc_in = "DROP FUNCTION " + fun_name_in;

    var proc_out = "CREATE OR REPLACE FUNCTION " + fun_name_out + " (ID IN NUMBER, outValue OUT JSON) RETURN NUMBER\n" +
        "IS \n" +
        "    tmpvar NUMBER; \n" +
        "BEGIN \n" +
        "    select num, content into tmpvar, outValue from " + tableName + " where num = ID; \n" +
        "    RETURN tmpvar; \n" +
        "END ; ";
    var run_proc_out = "BEGIN :output := " + fun_name_out + " (:i, :c); END;";
    var drop_proc_out = "DROP FUNCTION " + fun_name_out;

    before('create table, insert data', function(done) {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = 0;
      async.series([
        function(cb) {
          assist.setUp(connection, tableName, jsonVals, cb);
        },
        function(cb) {
          connection.execute(
            proc_in,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            proc_out,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // before()

    after(function(done) {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      async.series([
        function(cb) {
          connection.execute(
            drop_proc_in,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            drop_proc_out,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "DROP table " + tableName + " PURGE",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // after()

    it('244.6.1 bind by name', function(done) {
      var sequence = 100;
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
      async.series([
        function(cb) {
          var bindVar = {
            i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c: { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN, maxSize: 1000 },
            output: { type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT }
          };
          connection.execute(
            run_proc_in,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              should.deepEqual(result.outBinds.output, jsonVal);
              cb();
            }
          );
        },
        function(cb) {
          var bindVar = {
            i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c: { type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT, maxSize: 2000 },
            output: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
          };
          connection.execute(
            run_proc_out,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              should.deepEqual(result.outBinds.c, jsonVal);
              should.deepEqual(result.outBinds.output, sequence);
              cb();
            }
          );
        }
      ], done);

    }); // 244.6.1

    it('244.6.2 bind by position', function(done) {
      var sequence = 101;
      const jsonVal = { "key13" : {"key13-1" : "value13-1", "key13-2" : "value13-2"} };
      async.series([
        function(cb) {
          var bindVar = [
            { type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT },
            { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN, maxSize: 10 }
          ];
          connection.execute(
            run_proc_in,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              should.deepEqual(result.outBinds[0], jsonVal);
              cb();
            }
          );
        },
        function(cb) {
          var bindVar = [
            { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
            { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            { type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT, maxSize: 10 }
          ];
          connection.execute(
            run_proc_out,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              should.deepEqual(result.outBinds[1], jsonVal);
              should.deepEqual(result.outBinds[0], sequence);
              cb();
            }
          );
        }
      ], done);
    }); // 244.6.1
  }); // 244.6

  describe('244.7 testing JSON with PL/SQL function BIND_INOUT', function() {
    var proc_name = "nodb_json_proc_inout";
    var proc = "CREATE OR REPLACE PROCEDURE " + proc_name + " (ID IN NUMBER, inoutValue IN OUT JSON)\n" +
        "AS \n" +
        "BEGIN \n" +
        "    insert into " + tableName + " ( num, content ) values (ID, inoutValue); \n" +
        "    select content into inoutValue from " + tableName + " where num = ID; \n" +
        "END " + proc_name + "; ";
    var sqlRun = "BEGIN " + proc_name + " (:i, :c); END;";
    var proc_drop = "DROP PROCEDURE " + proc_name;

    before('create table, insert data', function(done) {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = 0;
      async.series([
        function(cb) {
          assist.setUp(connection, tableName, jsonVals, cb);
        },
        function(cb) {
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // before()

    after(function(done) {
      if (!isRunnable) {
        this.skip();
        return;
      }
      oracledb.stmtCacheSize = default_stmtCacheSize;
      async.series([
        function(cb) {
          connection.execute(
            proc_drop,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "DROP table " + tableName + " PURGE",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // after()

    it('244.7.1 bind by name', function(done) {
      var sequence = 100;
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
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_INOUT, maxSize: 2000 }
      };
      connection.execute(
        sqlRun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          should.deepEqual(result.outBinds.c, jsonVal);
          done();
        }
      );

    }); // 244.7.1

    it('244.7.2 bind by position', function(done) {
      var sequence = 101;
      const jsonVal = {"fred": 5, "george": 6};
      var bindVar = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_INOUT, maxSize: 10 }
      ];
      connection.execute(
        sqlRun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          should.deepEqual(result.outBinds[0], jsonVal);
          done();
        }
      );

    }); // 244.7.2
  }); // 244.7

  describe('244.8 testing JSON with DML returning into', function() {

    before('create table, insert data', function(done) {
      if (!isRunnable) {
        this.skip();
        return;
      }
      async.series([
        function(cb) {
          oracledb.getConnection(
            dbConfig,
            function(err, conn) {
              connection = conn;
              should.not.exist(err);
              cb();
            }
          );
        },
        function createTable(cb) {
          var proc = "BEGIN \n" +
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
          connection.execute(proc, function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }); // before()

    after(function(done) {
      if (!isRunnable) {
        this.skip();
        return;
      }
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
      oracledb.stmtCacheSize = default_stmtCacheSize;

    }); // after()

    it('244.8.1 bind by name', function(done) {
      var sequence = 1;
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

      var sql = "insert into " + tableName + " ( num, content ) values (:i, :c) returning content into :output";
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN },
        output: { type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT, maxSize: 2000 }
      };
      connection.execute(
        sql,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result.outBinds.output);
          should.deepEqual(result.outBinds.output[0], jsonVal);
          done();
        }
      );
    }); // 244.8.1

    it('244.8.2 bind by position', function(done) {
      var sequence = 2;
      const jsonVal = { "key5" : "2018/11/01 18:30:00" };

      var sql = "insert into " + tableName + " ( num, content ) values (:i, :c) returning content into :output";
      var bindVar = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN },
        { type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT, maxSize: 2000 }
      ];
      connection.execute(
        sql,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result.outBinds[0][0]);
          should.deepEqual(result.outBinds[0][0], jsonVal);
          done();
        }
      );
    }); // 244.8.2

  }); // 244.8

  describe('244.9 testing JSON with oracledb.fetchAsString and fetchInfo oracledb.STRING', function() {

    before('create table, insert data', function(done) {
      if (!isRunnable) {
        this.skip();
        return;
      }
      async.series([
        function(cb) {
          oracledb.getConnection(
            dbConfig,
            function(err, conn) {
              connection = conn;
              should.not.exist(err);
              cb();
            }
          );
        },
        function createTable(cb) {
          var proc = "BEGIN \n" +
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
          connection.execute(proc, function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }); // before()

    after(function(done) {
      if (!isRunnable) {
        this.skip();
        return;
      }
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
      oracledb.stmtCacheSize = default_stmtCacheSize;
      oracledb.fetchAsString = [];

    }); // after()

    it('244.9.1 works with oracledb.fetchAsString', function(done) {
      oracledb.fetchAsString = [ oracledb.DB_TYPE_JSON ];
      var sequence = 1;
      const jsonVal = { "key5" : "2018/11/01 18:30:00" };
      const resultStr = "{\"key5\":\"2018/11/01 18:30:00\"}";

      var sql = "insert into " + tableName + " ( id, content ) values (:i, :c)";
      var bindVar = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN }
      ];

      async.series([
        function(cb) {
          connection.execute(
            sql,
            bindVar,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function createTable(cb) {
          connection.execute(
            "select content as C from " + tableName + " where id = " + sequence,
            function(err, result) {
              should.not.exist(err);
              result.rows[0][0].should.be.a.String();
              should.strictEqual(result.rows[0][0].length, resultStr.length);
              should.strictEqual(result.rows[0][0], resultStr);
              cb();
            });
        }
      ], done);
    }); // 244.9.1

    it.skip('244.9.2 doesn\'t work with outFormat: oracledb.DB_TYPE_JSON', function(done) {
      oracledb.fetchAsString = [ oracledb.DB_TYPE_JSON ];
      var sequence = 2;
      const jsonVal = { "key5" : "2018/11/01 18:30:00" };
      const resultStr = "{\"key5\":\"2018/11/01 18:30:00\"}";

      var sql = "insert into " + tableName + " ( id, content ) values (:i, :c)";
      var bindVar = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN }
      ];

      async.series([
        function(cb) {
          connection.execute(
            sql,
            bindVar,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function createTable(cb) {
          connection.execute(
            "select content as C from " + tableName + " where id = " + sequence,
            [],
            { outFormat : oracledb.DB_TYPE_JSON },
            function(err, result) {
              should.not.exist(err);
              result.rows[0][0].should.be.a.String();
              should.strictEqual(result.rows[0][0].length, resultStr.length);
              should.strictEqual(result.rows[0][0], resultStr);
              cb();
            });
        }
      ], done);
    }); // 244.9.2

    it('244.9.3 could work with fetchInfo oracledb.STRING', function(done) {
      oracledb.fetchAsString = [];
      var sequence = 3;
      const jsonVal = { "key5" : "2018/11/01 18:30:00" };
      const resultStr = "{\"key5\":\"2018/11/01 18:30:00\"}";

      var sql = "insert into " + tableName + " ( id, content ) values (:i, :c)";
      var bindVar = [
        { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN }
      ];

      async.series([
        function(cb) {
          connection.execute(
            sql,
            bindVar,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function createTable(cb) {
          connection.execute(
            "select content as C from " + tableName + " where id = " + sequence,
            [],
            {
              fetchInfo : { C : { type : oracledb.STRING } }
            },
            function(err, result) {
              should.not.exist(err);
              result.rows[0][0].should.be.a.String();
              should.strictEqual(result.rows[0][0].length, resultStr.length);
              should.strictEqual(result.rows[0][0], resultStr);
              cb();
            });
        }
      ], done);
    }); // 244.9.3
  }); // 244.9

});

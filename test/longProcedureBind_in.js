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

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var random   = require('./random.js');
var sql      = require('./sql.js');

describe('131. longProcedureBind_in.js', function() {

  var connection = null;
  const tableName = "nodb_long_128";
  var insertID = 0;
  // The NOCOMPRESS option for CREATE TABLE ensures that Hybrid Columnar Compression (HCC) is disabled for tables with LONG and LONG RAW Columns
  // in all types of Oracle Databases. (Note: HCC is enabled in Oracle ADB-S and ADB-D by default)
  // When HCC is enabled, Tables with LONG and LONG RAW columns cannot be created.
  var table_create = "BEGIN \n" +
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
                     "        ) NOCOMPRESS \n" +
                     "    '); \n" +
                     "END; ";
  var table_drop = "DROP TABLE " + tableName + " PURGE";

  before(function(done) {
    async.series([
      function(cb) {
        oracledb.getConnection(dbConfig, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          cb();
        });
      },
      function(cb) {
        sql.executeSql(connection, table_create, {}, {}, cb);
      }
    ], done);
  }); // before

  after(function(done) {
    async.series([
      function(cb) {
        sql.executeSql(connection, table_drop, {}, {}, cb);
      },
      function(cb) {
        connection.release(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }); // after

  beforeEach(function(done) {
    insertID++;
    done();
  });

  describe('131.1 PLSQL PROCEDURE BIND IN AS LONG', function() {
    var proc_bindin_name = "nodb_long_bindin_proc_1";
    var proc_bindin_create = "CREATE OR REPLACE PROCEDURE " + proc_bindin_name + " (ID IN NUMBER, CONTENT IN LONG) \n" +
                             "AS \n" +
                             "BEGIN \n" +
                             "    insert into " + tableName + " values (ID, CONTENT); \n" +
                             "END " + proc_bindin_name + ";";
    var proc_bindin_exec = "BEGIN " + proc_bindin_name + " (:i, :c); END;";
    var proc_bindin_drop = "DROP PROCEDURE " + proc_bindin_name;

    before(function(done) {
      sql.executeSql(connection, proc_bindin_create, {}, {}, done);
    });

    after(function(done) {
      sql.executeSql(connection, proc_bindin_drop, {}, {}, done);
    });

    it('131.1.1 works with NULL', function(done) {
      var insertedStr = null;
      long_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('131.1.2 works with undefined', function(done) {
      var insertedStr = undefined;
      long_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('131.1.3 works with empty string', function(done) {
      var insertedStr = "";
      long_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('131.1.4 works with data size 4000', function(done) {
      var insertedStr = random.getRandomLengthString(4000);
      long_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('131.1.5 works with data size (32K - 1)', function(done) {
      var insertedStr = random.getRandomLengthString(32767);
      long_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('131.1.6 set maxSize to size (32K - 1)', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      long_bindin_maxSize(insertedStr, proc_bindin_exec, 32767, done);
    });

    it('131.1.7 set maxSize to size 1GB', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var maxsize = 1 * 1024 * 1024 * 1024;
      long_bindin_maxSize(insertedStr, proc_bindin_exec, maxsize, done);
    });

  }); // 131.1

  describe('131.2 PLSQL PROCEDURE BIND IN AS STRING', function() {
    var proc_bindin_name = "nodb_long_bindin_proc_2";
    var proc_bindin_create = "CREATE OR REPLACE PROCEDURE " + proc_bindin_name + " (ID IN NUMBER, CONTENT IN VARCHAR2) \n" +
                             "AS \n" +
                             "BEGIN \n" +
                             "    insert into " + tableName + " values (ID, CONTENT); \n" +
                             "END " + proc_bindin_name + ";";
    var proc_bindin_exec = "BEGIN " + proc_bindin_name + " (:i, :c); END;";
    var proc_bindin_drop = "DROP PROCEDURE " + proc_bindin_name;

    before(function(done) {
      sql.executeSql(connection, proc_bindin_create, {}, {}, done);
    });

    after(function(done) {
      sql.executeSql(connection, proc_bindin_drop, {}, {}, done);
    });

    it('131.2.1 works with NULL', function(done) {
      var insertedStr = null;
      long_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('131.2.2 works with undefined', function(done) {
      var insertedStr = undefined;
      long_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('131.2.3 works with empty string', function(done) {
      var insertedStr = "";
      long_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('131.2.4 works with data size 4000', function(done) {
      var insertedStr = random.getRandomLengthString(4000);
      long_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('131.2.5 works with data size (32K - 1)', function(done) {
      var insertedStr = random.getRandomLengthString(32767);
      long_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('131.2.6 set maxSize to size (32K - 1)', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      long_bindin_maxSize(insertedStr, proc_bindin_exec, 32767, done);
    });

    it('131.2.7 set maxSize to size 1GB', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var maxsize = 1 * 1024 * 1024 * 1024;
      long_bindin_maxSize(insertedStr, proc_bindin_exec, maxsize, done);
    });

  }); // 131.2

  var long_bindin = function(insertContent, proc_bindin_exec, callback) {
    async.series([
      function(cb) {
        var bind_in_var  = {
          i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
          c: { val: insertContent, dir: oracledb.BIND_IN, type: oracledb.STRING }
        };
        connection.execute(
          proc_bindin_exec,
          bind_in_var,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        var expected = insertContent;
        if (insertContent == "" || insertContent == undefined) {
          expected = null;
        }
        checkResult(expected, cb);
      }
    ], callback);
  };

  var long_bindin_maxSize = function(insertContent, proc_bindin_exec, maxsize, callback) {
    async.series([
      function(cb) {
        var bind_in_var  = {
          i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
          c: { val: insertContent, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: maxsize }
        };
        connection.execute(
          proc_bindin_exec,
          bind_in_var,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        var expected = insertContent;
        if (insertContent == "" || insertContent == undefined) {
          expected = null;
        }
        checkResult(expected, cb);
      }
    ], callback);
  };

  var checkResult = function(expected, callback) {
    connection.execute(
      "select * from " + tableName + " where id = " + insertID,
      function(err, result) {
        should.not.exist(err);
        should.strictEqual(result.rows[0][0], insertID);
        should.strictEqual(result.rows[0][1], expected);
        callback();
      }
    );
  };


});

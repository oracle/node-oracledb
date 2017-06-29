/* Copyright (c) 2017, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   134. longrawProcedureBind_out.js
 *
 * DESCRIPTION
 *    Test LONG RAW type PLSQL procedure support.
 *    https://docs.oracle.com/cloud/latest/db121/LNPLS/datatypes.htm#LNPLS346
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var random   = require('./random.js');
var sql      = require('./sql.js');
var assist   = require('./dataTypeAssist.js');

describe('134. longrawProcedureBind_out.js', function() {
  this.timeout(100000);
  var connection = null;
  var tableName = "nodb_longraw_134";
  var insertID = 0;
  var node6plus = false; // assume node runtime version is lower than 6
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
                     "            content    LONG RAW \n" +
                     "        ) \n" +
                     "    '); \n" +
                     "END; ";
  var table_drop = "DROP TABLE " + tableName + " PURGE";

  before(function(done) {
    async.series([
      function(cb) {
        oracledb.getConnection(dbConfig, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          if (process.versions["node"].substring (0, 1) >= "6") {
            node6plus = true;
          }
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

  describe('134.1 PLSQL PROCEDURE BIND OUT AS LONG RAW', function() {
    var proc_bindout_name = "nodb_longraw_bindout_proc_1";
    var proc_bindout_create = "CREATE OR REPLACE PROCEDURE " + proc_bindout_name + " (NUM IN NUMBER, C OUT LONG RAW) \n" +
                              "AS \n" +
                              "BEGIN \n" +
                              "    select content into C from " + tableName + " where id = NUM; \n" +
                              "END " + proc_bindout_name + ";";
    var proc_bindout_exec = "BEGIN " + proc_bindout_name + " (:i, :c); END;";
    var proc_bindout_drop = "DROP PROCEDURE " + proc_bindout_name;

    before(function(done) {
      sql.executeSql(connection, proc_bindout_create, {}, {}, done);
    });

    after(function(done) {
      sql.executeSql(connection, proc_bindout_drop, {}, {}, done);
    });

    it('134.1.1 works with NULL', function(done) {
      var insertedStr = null;
      var maxsize = 10;
      longraw_bindout(insertedStr, proc_bindout_exec, maxsize, done);
    });

    it('134.1.2 works with undefined', function(done) {
      var insertedStr = undefined;
      var maxsize = 10;
      longraw_bindout(insertedStr, proc_bindout_exec, maxsize, done);
    });

    it('134.1.3 works with empty buffer', function(done) {
      var insertedBuf = node6plus ? Buffer.from("") : new Buffer("");
      var maxsize = 10;
      longraw_bindout(insertedBuf, proc_bindout_exec, maxsize, done);
    });

    it('134.1.4 works with data size 2000', function(done) {
      var insertedStr = random.getRandomLengthString(2000);
      var maxsize = insertedStr.length;
      longraw_bindout(insertedStr, proc_bindout_exec, maxsize, done);
    });

    it('134.1.5 works with data size 32760', function(done) {
      var insertedStr = random.getRandomLengthString(32760);
      var maxsize = insertedStr.length;
      longraw_bindout(insertedStr, proc_bindout_exec, maxsize, done);
    });

    it('134.1.6 set maxSize to size (32K - 1)', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      longraw_bindout(insertedStr, proc_bindout_exec, 32767, done);
    });

    it('134.1.7 set maxSize to size 1GB', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var maxsize = 1 * 1024 * 1024 * 1024;
      longraw_bindout(insertedStr, proc_bindout_exec, maxsize, done);
    });

  }); // 134.1

  describe('134.2 PLSQL PROCEDURE BIND OUT AS RAW', function() {
    var proc_bindout_name = "nodb_longraw_bindout_proc_2";
    var proc_bindout_create = "CREATE OR REPLACE PROCEDURE " + proc_bindout_name + " (NUM IN NUMBER, C OUT RAW) \n" +
                              "AS \n" +
                              "BEGIN \n" +
                              "    select content into C from " + tableName + " where id = NUM; \n" +
                              "END " + proc_bindout_name + ";";
    var proc_bindout_exec = "BEGIN " + proc_bindout_name + " (:i, :c); END;";
    var proc_bindout_drop = "DROP PROCEDURE " + proc_bindout_name;

    before(function(done) {
      sql.executeSql(connection, proc_bindout_create, {}, {}, done);
    });

    after(function(done) {
      sql.executeSql(connection, proc_bindout_drop, {}, {}, done);
    });

    it('134.2.1 works with NULL', function(done) {
      var insertedStr = null;
      var maxsize = 10;
      longraw_bindout(insertedStr, proc_bindout_exec, maxsize, done);
    });

    it('134.2.2 works with undefined', function(done) {
      var insertedStr = undefined;
      var maxsize = 10;
      longraw_bindout(insertedStr, proc_bindout_exec, maxsize, done);
    });

    it('134.2.3 works with empty buffer', function(done) {
      var insertedStr = node6plus ? Buffer.from("") : new Buffer("");
      var maxsize = 10;
      longraw_bindout(insertedStr, proc_bindout_exec, maxsize, done);
    });

    it('134.2.4 works with data size 2000', function(done) {
      var insertedStr = random.getRandomLengthString(2000);
      var maxsize = insertedStr.length;
      longraw_bindout(insertedStr, proc_bindout_exec, maxsize, done);
    });

    it('134.2.5 works with data size 32760', function(done) {
      var insertedStr = random.getRandomLengthString(32760);
      var maxsize = insertedStr.length;
      longraw_bindout(insertedStr, proc_bindout_exec, maxsize, done);
    });

    it('134.2.6 set maxSize to size (32K - 1)', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      longraw_bindout(insertedStr, proc_bindout_exec, 32767, done);
    });

    it('134.2.7 set maxSize to size 1GB', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var maxsize = 1 * 1024 * 1024 * 1024;
      longraw_bindout(insertedStr, proc_bindout_exec, maxsize, done);
    });

  }); // 134.2

  var longraw_bindout = function(insertContent, proc_bindout_exec, maxsize, callback) {
    var insertBuf, expectedBuf;
    if(insertContent == null || insertContent == undefined || insertContent.length == 0) {
      insertBuf = insertContent;
      expectedBuf = null;
    } else {
      insertBuf = node6plus ? Buffer.from(insertContent) : new Buffer(insertContent);
      expectedBuf = insertBuf;
    }
    async.series([
      function(cb) {
        insert(insertBuf, cb);
      },
      function(cb) {
        var bind_in_var  = {
          i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
          c: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: maxsize }
        };
        connection.execute(
          proc_bindout_exec,
          bind_in_var,
          function(err, result) {
            should.not.exist(err);
            if(expectedBuf == null) {
              should.strictEqual(result.outBinds.c, expectedBuf);
            } else {
              assist.compare2Buffers(result.outBinds.c, expectedBuf);
            }
            cb();
          }
        );
      }
    ], callback);
  };

  var insert = function(insertStr, callback) {
    connection.execute(
      "insert into " + tableName + " values (:i, :c)",
      {
        i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        c: { val: insertStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      },
      function(err, result) {
        should.not.exist(err);
        should.strictEqual(result.rowsAffected, 1);
        callback();
      }
    );
  };

});

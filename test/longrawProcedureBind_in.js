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
 *   132. longrawProcedureBind_in.js
 *
 * DESCRIPTION
 *    Test LONG RAW type PLSQL procedure support.
 *    https://docs.oracle.com/cloud/latest/db121/LNPLS/datatypes.htm#LNPLS346
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const async    = require('async');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');
const sql      = require('./sql.js');
const testsUtil = require('./testsUtil.js');
const assist   = require('./dataTypeAssist.js');

describe('132. longrawProcedureBind_in.js', function() {

  var connection = null;
  const tableName = "nodb_longraw_132";
  var insertID = 0;

  before(function(done) {
    const sqlCreate =  `
        CREATE TABLE ${tableName} (
            id         NUMBER,
            content    LONG RAW
        )`;
    const sqlCreateTbl = testsUtil.sqlCreateTable(tableName, sqlCreate);
    async.series([
      function(cb) {
        oracledb.getConnection(dbConfig, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          cb();
        });
      },
      function(cb) {
        sql.executeSql(connection, sqlCreateTbl, {}, {}, cb);
      }
    ], done);
  }); // before

  after(function(done) {
    const sqlDropTbl = testsUtil.sqlDropTable(tableName);
    async.series([
      function(cb) {
        sql.executeSql(connection, sqlDropTbl, {}, {}, cb);
      },
      function(cb) {
        connection.close(function(err) {
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

  describe('132.1 PLSQL PROCEDURE BIND IN AS LONG RAW', function() {
    var proc_bindin_name = "nodb_longraw_bindin_proc_1";
    var proc_bindin_create = "CREATE OR REPLACE PROCEDURE " + proc_bindin_name + " (NUM IN NUMBER, C IN LONG RAW) \n" +
                             "AS \n" +
                             "BEGIN \n" +
                             "    insert into " + tableName + " values (NUM, C); \n" +
                             "END " + proc_bindin_name + ";";
    var proc_bindin_exec = "BEGIN " + proc_bindin_name + " (:i, :c); END;";
    var proc_bindin_drop = "DROP PROCEDURE " + proc_bindin_name;

    before(function(done) {
      sql.executeSql(connection, proc_bindin_create, {}, {}, done);
    });

    after(function(done) {
      sql.executeSql(connection, proc_bindin_drop, {}, {}, done);
    });

    it('132.1.1 works with NULL', function(done) {
      var insertedStr = null;
      longraw_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('132.1.2 works with undefined', function(done) {
      var insertedStr = undefined;
      longraw_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('132.1.3 works with empty buffer', function(done) {
      var insertedBuf = Buffer.from("");
      longraw_bindin(insertedBuf, proc_bindin_exec, done);
    });

    it('132.1.4 works with data size 2000', function(done) {
      var insertedStr = random.getRandomLengthString(2000);
      longraw_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('132.1.5 works with data size (32K - 1)', function(done) {
      var insertedStr = random.getRandomLengthString(32767);
      longraw_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('132.1.6 set maxSize to size (32K - 1)', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      longraw_bindin_maxSize(insertedStr, proc_bindin_exec, 32767, done);
    });

    it('132.1.7 set maxSize to size 1GB', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var maxsize = 1 * 1024 * 1024 * 1024;
      longraw_bindin_maxSize(insertedStr, proc_bindin_exec, maxsize, done);
    });

  }); // 132.1

  describe('132.2 PLSQL PROCEDURE BIND IN AS RAW', function() {
    var proc_bindin_name = "nodb_longraw_bindin_proc_2";
    var proc_bindin_create = "CREATE OR REPLACE PROCEDURE " + proc_bindin_name + " (NUM IN NUMBER, C IN RAW) \n" +
                             "AS \n" +
                             "BEGIN \n" +
                             "    insert into " + tableName + " values (NUM, C); \n" +
                             "END " + proc_bindin_name + ";";
    var proc_bindin_exec = "BEGIN " + proc_bindin_name + " (:i, :c); END;";
    var proc_bindin_drop = "DROP PROCEDURE " + proc_bindin_name;

    before(function(done) {
      sql.executeSql(connection, proc_bindin_create, {}, {}, done);
    });

    after(function(done) {
      sql.executeSql(connection, proc_bindin_drop, {}, {}, done);
    });

    it('132.2.1 works with NULL', function(done) {
      var insertedStr = null;
      longraw_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('132.2.2 works with undefined', function(done) {
      var insertedStr = undefined;
      longraw_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('132.2.3 works with empty buffer', function(done) {
      var insertedStr = Buffer.from("");
      longraw_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('132.2.4 works with data size 2000', function(done) {
      var insertedStr = random.getRandomLengthString(2000);
      longraw_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('132.2.5 works with data size 32767', function(done) {
      var insertedStr = random.getRandomLengthString(32767);
      longraw_bindin(insertedStr, proc_bindin_exec, done);
    });

    it('132.2.6 set maxSize to size (32K - 1)', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      longraw_bindin_maxSize(insertedStr, proc_bindin_exec, 32767, done);
    });

    it('132.2.7 set maxSize to size 1GB', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var maxsize = 1 * 1024 * 1024 * 1024;
      longraw_bindin_maxSize(insertedStr, proc_bindin_exec, maxsize, done);
    });

  }); // 132.2

  var longraw_bindin = function(insertContent, proc_bindin_exec, callback) {
    var insertBuf, expectedBuf;
    if (insertContent == null || insertContent == undefined || insertContent.length == 0) {
      insertBuf = insertContent;
      expectedBuf = null;
    } else {
      insertBuf = Buffer.from(insertContent);
      expectedBuf = insertBuf;
    }
    async.series([
      function(cb) {
        var bind_in_var  = {
          i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
          c: { val: insertBuf, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
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
        checkResult(expectedBuf, cb);
      }
    ], callback);
  };

  var longraw_bindin_maxSize = function(insertContent, proc_bindin_exec, maxsize, callback) {
    var insertBuf, expectedBuf;
    if (insertContent == null || insertContent == undefined) {
      insertBuf = insertContent;
      expectedBuf = null;
    } else {
      insertBuf = Buffer.from(insertContent);
      expectedBuf = insertBuf;
    }
    async.series([
      function(cb) {
        var bind_in_var  = {
          i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
          c: { val: insertBuf, dir: oracledb.BIND_IN, type: oracledb.BUFFER, maxSize: maxsize }
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
        checkResult(expectedBuf, cb);
      }
    ], callback);
  };

  var checkResult = function(expected, callback) {
    connection.execute(
      "select * from " + tableName + " where id = " + insertID,
      function(err, result) {
        should.not.exist(err);
        should.strictEqual(result.rows[0][0], insertID);
        if (expected == null) {
          should.strictEqual(result.rows[0][1], expected);
        } else {
          assist.compare2Buffers(result.rows[0][1], expected);
        }
        callback();
      }
    );
  };


});

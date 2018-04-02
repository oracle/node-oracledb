/* Copyright (c) 2017, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   129. longProcedureBind_inout.js
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

describe('129. longProcedureBind_inout.js', function() {

  var connection = null;
  var tableName = "nodb_long_129";
  var insertID = 0;
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

  describe('129.1 PLSQL PROCEDURE BIND IN OUT AS LONG', function() {
    var proc_bindinout_name = "nodb_long_bindinout_proc_1";
    var proc_bindinout_create = "CREATE OR REPLACE PROCEDURE " + proc_bindinout_name + " (num IN NUMBER, C IN OUT LONG) \n" +
                                "AS \n" +
                                "BEGIN \n" +
                                "    insert into " + tableName + " values (num, C); \n" +
                                "    select content into C from " + tableName + " where num = ID; \n" +
                                "END " + proc_bindinout_name + ";";
    var proc_bindinout_exec = "BEGIN " + proc_bindinout_name + " (:i, :c); END;";
    var proc_bindinout_drop = "DROP PROCEDURE " + proc_bindinout_name;

    before(function(done) {
      sql.executeSql(connection, proc_bindinout_create, {}, {}, done);
    });

    after(function(done) {
      sql.executeSql(connection, proc_bindinout_drop, {}, {}, done);
    });

    it('129.1.1 works with NULL', function(done) {
      var insertedStr = null;
      long_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('129.1.2 works with undefined', function(done) {
      var insertedStr = undefined;
      long_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('129.1.3 works with empty string', function(done) {
      var insertedStr = "";
      long_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('129.1.4 works with data size 4000', function(done) {
      var insertedStr = random.getRandomLengthString(4000);
      long_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('129.1.5 works with data size (32K - 1)', function(done) {
      var insertedStr = random.getRandomLengthString(32767);
      long_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('129.1.6 set maxSize to size (32K - 1)', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      long_bindinout_maxSize(insertedStr, proc_bindinout_exec, 32767, done);
    });

    it('129.1.7 set maxSize to size 1GB', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var maxsize = 1 * 1024 * 1024 * 1024;
      long_bindinout_maxSize(insertedStr, proc_bindinout_exec, maxsize, done);
    });

  }); // 129.1

  describe('129.2 PLSQL PROCEDURE BIND IN OUT AS STRING', function() {
    var proc_bindinout_name = "nodb_long_bindinout_proc_2";
    var proc_bindinout_create = "CREATE OR REPLACE PROCEDURE " + proc_bindinout_name + " (num IN NUMBER, C IN OUT VARCHAR2) \n" +
                                "AS \n" +
                                "BEGIN \n" +
                                "    insert into " + tableName + " values (num, C); \n" +
                                "    select content into C from " + tableName + " where num = ID; \n" +
                                "END " + proc_bindinout_name + ";";
    var proc_bindinout_exec = "BEGIN " + proc_bindinout_name + " (:i, :c); END;";
    var proc_bindinout_drop = "DROP PROCEDURE " + proc_bindinout_name;

    before(function(done) {
      sql.executeSql(connection, proc_bindinout_create, {}, {}, done);
    });

    after(function(done) {
      sql.executeSql(connection, proc_bindinout_drop, {}, {}, done);
    });

    it('129.2.1 works with NULL', function(done) {
      var insertedStr = null;
      long_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('129.2.2 works with undefined', function(done) {
      var insertedStr = undefined;
      long_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('129.2.3 works with empty string', function(done) {
      var insertedStr = "";
      long_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('129.2.4 works with data size 4000', function(done) {
      var insertedStr = random.getRandomLengthString(4000);
      long_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('129.2.5 works with data size (32K - 1)', function(done) {
      var insertedStr = random.getRandomLengthString(32767);
      long_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('129.2.6 set maxSize to size (32K - 1)', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      long_bindinout_maxSize(insertedStr, proc_bindinout_exec, 32767, done);
    });

    it('129.2.7 set maxSize to size 1GB', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var maxsize = 1 * 1024 * 1024 * 1024;
      long_bindinout_maxSize(insertedStr, proc_bindinout_exec, maxsize, done);
    });

  }); // 129.2

  var long_bindinout = function(insertContent, proc_bindinout_exec, callback) {
    var bind_in_var  = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: insertContent, dir: oracledb.BIND_INOUT, type: oracledb.STRING }
    };
    connection.execute(
      proc_bindinout_exec,
      bind_in_var,
      function(err, result) {
        should.not.exist(err);
        var expected = insertContent;
        if(insertContent == "" || insertContent == undefined) {
          expected = null;
        }
        should.strictEqual(result.outBinds.c, expected);
        callback();
      }
    );
  };

  var long_bindinout_maxSize = function(insertContent, proc_bindinout_exec, maxsize, callback) {
    var bind_in_var  = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: insertContent, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: maxsize }
    };
    connection.execute(
      proc_bindinout_exec,
      bind_in_var,
      function(err, result) {
        should.not.exist(err);
        var expected = insertContent;
        if(insertContent == "" || insertContent == undefined) {
          expected = null;
        }
        should.strictEqual(result.outBinds.c, expected);
        callback();
      }
    );
  };

});

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
 *   133. longrawProcedureBind_inout.js
 *
 * DESCRIPTION
 *    Test LONG RAW type PLSQL procedure support.
 *    https://docs.oracle.com/cloud/latest/db121/LNPLS/datatypes.htm#LNPLS346
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

describe('133. longrawProcedureBind_inout.js', function() {
  this.timeout(100000);
  var connection = null;
  var tableName = "nodb_longraw_133";
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

  describe('133.1 PLSQL PROCEDURE BIND IN OUT AS LONG RAW', function() {
    var proc_bindinout_name = "nodb_longraw_bindinout_proc_1";
    var proc_bindinout_create = "CREATE OR REPLACE PROCEDURE " + proc_bindinout_name + " (NUM IN NUMBER, C IN OUT LONG RAW) \n" +
                                "AS \n" +
                                "BEGIN \n" +
                                "    insert into " + tableName + " values (NUM, C); \n" +
                                "    select content into C from " + tableName + " where id = NUM; \n" +
                                "END " + proc_bindinout_name + ";";
    var proc_bindinout_exec = "BEGIN " + proc_bindinout_name + " (:i, :c); END;";
    var proc_bindinout_drop = "DROP PROCEDURE " + proc_bindinout_name;

    before(function(done) {
      sql.executeSql(connection, proc_bindinout_create, {}, {}, done);
    });

    after(function(done) {
      sql.executeSql(connection, proc_bindinout_drop, {}, {}, done);
    });

    it('133.1.1 works with NULL', function(done) {
      var insertedStr = null;
      longraw_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('133.1.2 works with undefined', function(done) {
      var insertedStr = undefined;
      longraw_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('133.1.3 works with empty buffer', function(done) {
      var insertedBuf = node6plus ? Buffer.from("") : new Buffer("");
      longraw_bindinout(insertedBuf, proc_bindinout_exec, done);
    });

    it('133.1.4 works with data size 2000', function(done) {
      var insertedStr = random.getRandomLengthString(2000);
      longraw_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('133.1.5 works with data size 32760', function(done) {
      var insertedStr = random.getRandomLengthString(32760);
      longraw_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('133.1.6 set maxSize to size (32K - 1)', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      longraw_bindinout_maxSize(insertedStr, proc_bindinout_exec, 32767, done);
    });

    it('133.1.7 set maxSize to size 1GB', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var maxsize = 1 * 1024 * 1024 * 1024;
      longraw_bindinout_maxSize(insertedStr, proc_bindinout_exec, maxsize, done);
    });

  }); // 133.1

  describe('133.2 PLSQL PROCEDURE BIND IN OUT AS RAW', function() {
    var proc_bindinout_name = "nodb_longraw_bindinout_proc_2";
    var proc_bindinout_create = "CREATE OR REPLACE PROCEDURE " + proc_bindinout_name + " (NUM IN NUMBER, C IN OUT RAW) \n" +
                                "AS \n" +
                                "BEGIN \n" +
                                "    insert into " + tableName + " values (NUM, C); \n" +
                                "    select content into C from " + tableName + " where id = NUM; \n" +
                                "END " + proc_bindinout_name + ";";
    var proc_bindinout_exec = "BEGIN " + proc_bindinout_name + " (:i, :c); END;";
    var proc_bindinout_drop = "DROP PROCEDURE " + proc_bindinout_name;

    before(function(done) {
      sql.executeSql(connection, proc_bindinout_create, {}, {}, done);
    });

    after(function(done) {
      sql.executeSql(connection, proc_bindinout_drop, {}, {}, done);
    });

    it('133.2.1 works with NULL', function(done) {
      var insertedStr = null;
      longraw_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('133.2.2 works with undefined', function(done) {
      var insertedStr = undefined;
      longraw_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('133.2.3 works with empty buffer', function(done) {
      var insertedStr = node6plus ? Buffer.from("") : new Buffer("");
      longraw_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('133.2.4 works with data size 2000', function(done) {
      var insertedStr = random.getRandomLengthString(2000);
      longraw_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('133.2.5 works with data size 32760', function(done) {
      var insertedStr = random.getRandomLengthString(32760);
      longraw_bindinout(insertedStr, proc_bindinout_exec, done);
    });

    it('133.2.6 set maxSize to size (32K - 1)', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      longraw_bindinout_maxSize(insertedStr, proc_bindinout_exec, 32767, done);
    });

    it('133.2.7 set maxSize to size 1GB', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var maxsize = 1 * 1024 * 1024 * 1024;
      longraw_bindinout_maxSize(insertedStr, proc_bindinout_exec, maxsize, done);
    });

  }); // 133.2

  var longraw_bindinout = function(insertContent, proc_bindinout_exec, callback) {
    var insertBuf, expectedBuf;
    if(insertContent == null || insertContent == undefined || insertContent.length == 0) {
      insertBuf = insertContent;
      expectedBuf = null;
    } else {
      insertBuf = node6plus ? Buffer.from(insertContent) : new Buffer(insertContent);
      expectedBuf = insertBuf;
    }
    var bind_in_var  = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: insertBuf, dir: oracledb.BIND_INOUT, type: oracledb.BUFFER, maxSize: 32768  }
    };
    connection.execute(
      proc_bindinout_exec,
      bind_in_var,
      function(err, result) {
        should.not.exist(err);
        if(expectedBuf == null) {
          should.strictEqual(result.outBinds.c, expectedBuf);
        } else {
          assist.compare2Buffers(result.outBinds.c, expectedBuf);
        }
        callback();
      }
    );
  };

  var longraw_bindinout_maxSize = function(insertContent, proc_bindinout_exec, maxsize, callback) {
    var insertBuf, expectedBuf;
    if(insertContent == null || insertContent == undefined || insertContent.length == 0) {
      insertBuf = insertContent;
      expectedBuf = null;
    } else {
      insertBuf = node6plus ? Buffer.from(insertContent) : new Buffer(insertContent);
      expectedBuf = insertBuf;
    }
    var bind_in_var  = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: insertBuf, dir: oracledb.BIND_INOUT, type: oracledb.BUFFER, maxSize: maxsize }
    };
    connection.execute(
      proc_bindinout_exec,
      bind_in_var,
      function(err, result) {
        should.not.exist(err);
        if(expectedBuf == null) {
          should.strictEqual(result.outBinds.c, expectedBuf);
        } else {
          assist.compare2Buffers(result.outBinds.c, expectedBuf);
        }
        callback();
      }
    );
  };
});

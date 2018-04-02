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
 *   126. longrawDMLBind.js
 *
 * DESCRIPTION
 *    Test LONG RAW type DML support.
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
var assist   = require('./dataTypeAssist.js');

describe('126. longrawDMLBind.js', function() {

  var connection = null;
  var tableName = "nodb_longraw";
  var node6plus = false; // assume node runtime version is lower than 6
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
                     "            content    LONG RAW\n" +
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

  describe('126.1 INSERT and SELECT', function() {

    it('126.1.1 works with data size 64K - 1', function(done) {
      var insertedStr = random.getRandomLengthString(65535);
      var insertedBuf = node6plus ? Buffer.from(insertedStr) : new Buffer(insertedStr);
      var maxsize = 65535;
      test1(insertedBuf, maxsize, done);
    });

    it('126.1.2 works with data size 64K', function(done) {
      var insertedStr = random.getRandomLengthString(65536);
      var insertedBuf = node6plus ? Buffer.from(insertedStr) : new Buffer(insertedStr);
      var maxsize = 65536;
      test1(insertedBuf, maxsize, done);
    });

    it('126.1.3 works with data size 64K + 1', function(done) {
      var insertedStr = random.getRandomLengthString(65537);
      var insertedBuf = node6plus ? Buffer.from(insertedStr) : new Buffer(insertedStr);
      var maxsize = 65537;
      test1(insertedBuf, maxsize, done);
    });

    it('126.1.4 works with data size 1MB + 1', function(done) {
      var size = 1 * 1024 * 1024 + 1;
      var insertedStr = random.getRandomLengthString(size);
      var insertedBuf = node6plus ? Buffer.from(insertedStr) : new Buffer(insertedStr);
      test1(insertedBuf, size, done);
    });

    it('126.1.5 works with data size 100', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var insertedBuf = node6plus ? Buffer.from(insertedStr) : new Buffer(insertedStr);
      test1(insertedBuf, 100, done);
    });

    it('126.1.6 set maxSize to 2000', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var insertedBuf = node6plus ? Buffer.from(insertedStr) : new Buffer(insertedStr);
      var maxsize = 2000;
      test1(insertedBuf, maxsize, done);
    });

    it('126.1.7 set maxSize to 4GB', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var insertedBuf = node6plus ? Buffer.from(insertedStr) : new Buffer(insertedStr);
      var maxsize = 4 * 1024 * 1024 * 1024;
      test1(insertedBuf, maxsize, done);
    });

  }); // 126.1

  describe('126.2 UPDATE', function() {

    it('126.2.1 works with data size 64K - 1', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var updateStr = random.getRandomLengthString(65535);
      var insertedBuf = node6plus ? Buffer.from(insertedStr) : new Buffer(insertedStr);
      var updateBuf = node6plus ? Buffer.from(updateStr) : new Buffer(updateStr);
      test2(insertedBuf, updateBuf, 65535, done);
    });

    it('126.2.2 works with data size 64K', function(done) {
      var insertedStr = random.getRandomLengthString(200);
      var updateStr = random.getRandomLengthString(65536);
      var insertedBuf = node6plus ? Buffer.from(insertedStr) : new Buffer(insertedStr);
      var updateBuf = node6plus ? Buffer.from(updateStr) : new Buffer(updateStr);
      test2(insertedBuf, updateBuf, 65536, done);
    });

    it('126.2.3 works with data size 64K + 1', function(done) {
      var insertedStr = random.getRandomLengthString(10);
      var updateStr = random.getRandomLengthString(65537);
      var insertedBuf = node6plus ? Buffer.from(insertedStr) : new Buffer(insertedStr);
      var updateBuf = node6plus ? Buffer.from(updateStr) : new Buffer(updateStr);
      test2(insertedBuf, updateBuf, 65537, done);
    });

    it('126.2.4 works with data size 1MB + 1', function(done) {
      var size = 1 * 1024 * 1024 + 1;
      var insertedStr = random.getRandomLengthString(65536);
      var updateStr = random.getRandomLengthString(size);
      var insertedBuf = node6plus ? Buffer.from(insertedStr) : new Buffer(insertedStr);
      var updateBuf = node6plus ? Buffer.from(updateStr) : new Buffer(updateStr);
      test2(insertedBuf, updateBuf, size, done);
    });

    it('126.2.5 set maxSize to 2000', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var updateStr = random.getRandomLengthString(500);
      var insertedBuf = node6plus ? Buffer.from(insertedStr) : new Buffer(insertedStr);
      var updateBuf = node6plus ? Buffer.from(updateStr) : new Buffer(updateStr);
      test2(insertedBuf, updateBuf, 2000, done);
    });

    it('126.2.6 set maxSize to 4GB', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var updateStr = random.getRandomLengthString(500);
      var insertedBuf = node6plus ? Buffer.from(insertedStr) : new Buffer(insertedStr);
      var updateBuf = node6plus ? Buffer.from(updateStr) : new Buffer(updateStr);
      var maxsize = 4 * 1024 * 1024 * 1024;
      test2(insertedBuf, updateBuf, maxsize, done);
    });

  }); // 126.2

  describe.skip('126.3 RETURNING INTO', function() {

    it('126.3.1 works with data size 64K - 1', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var updateStr = random.getRandomLengthString(65535);
      var insertedBuf = node6plus ? Buffer.from(insertedStr) : new Buffer(insertedStr);
      var updateBuf = node6plus ? Buffer.from(updateStr) : new Buffer(updateStr);
      test3(insertedBuf, updateBuf, done);
    });

  }); // 126.3

  var test1 = function(content, maxsize, callback) {
    async.series([
      function(cb) {
        insert(content, maxsize, cb);
      },
      function(cb) {
        fetch(content, cb);
      }
    ], callback);
  };

  var test2 = function(insertedStr, updateStr, maxsize, callback) {
    async.series([
      function(cb) {
        insert(insertedStr, insertedStr.length, cb);
      },
      function(cb) {
        update(updateStr, maxsize, cb);
      },
      function(cb) {
        fetch(updateStr, cb);
      }
    ], callback);
  };

  var test3 = function(insertedStr, updateStr, callback) {
    async.series([
      function(cb) {
        insert(insertedStr, insertedStr.length, cb);
      },
      function(cb) {
        returning(updateStr, cb);
      }
    ], callback);
  };

  var insert = function(content, maxsize, callback) {
    var sql = "insert into " + tableName + " (id, content) values (:i, :c)";
    var bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER, maxSize: maxsize }
    };
    connection.execute(
      sql,
      bindVar,
      function(err, result) {
        should.not.exist(err);
        (result.rowsAffected).should.be.exactly(1);
        callback();
      }
    );
  };

  var update = function(content, maxsize, callback) {
    var sql = "update " + tableName + " set content = :c where id = :i";
    var bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER, maxSize: maxsize }
    };
    connection.execute(
      sql,
      bindVar,
      function(err, result) {
        should.not.exist(err);
        (result.rowsAffected).should.be.exactly(1);
        callback();
      }
    );
  };

  var returning = function(content, callback) {
    var sql = "update " + tableName + " set content = :c1 where id = :i returning content into :c2";
    var bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c1: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER },
      c2: { dir: oracledb.BIND_OUT, type: oracledb.BUFFER }
    };
    connection.execute(
      sql,
      bindVar,
      function(err) {
        should.not.exist(err);
        callback();
      }
    );
  };

  var fetch = function(expected, callback) {
    var sql = "select content from " + tableName + " where id = " + insertID;
    connection.execute(
      sql,
      function(err, result) {
        should.not.exist(err);
        assist.compare2Buffers(result.rows[0][0], expected);
        callback();
      }
    );
  };

});

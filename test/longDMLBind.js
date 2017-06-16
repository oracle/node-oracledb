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
 *   125. longDMLBind.js
 *
 * DESCRIPTION
 *    Test LONG type DML support.
 *    Long column restrictions: http://docs.oracle.com/cd/B19306_01/server.102/b14200/sql_elements001.htm#SQLRF00201
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

describe('125. longDMLBind.js', function() {
  this.timeout(100000);
  var connection = null;
  var tableName = "nodb_long";
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

  describe('125.1 INSERT and SELECT', function() {

    it('125.1.1 works with data size 64K - 1', function(done) {
      var insertedStr = random.getRandomLengthString(65535);
      test1(insertedStr, 65535, done);
    });

    it('125.1.2 works with data size 64K', function(done) {
      var insertedStr = random.getRandomLengthString(65536);
      test1(insertedStr, 65536, done);
    });

    it('125.1.3 works with data size 64K + 1', function(done) {
      var insertedStr = random.getRandomLengthString(65537);
      test1(insertedStr, 65537, done);
    });

    it('125.1.4 works with data size 1MB + 1', function(done) {
      var size = 1 * 1024 * 1024 + 1;
      var insertedStr = random.getRandomLengthString(size);
      test1(insertedStr, size, done);
    });

  }); // 125.1

  describe('125.2 UPDATE', function() {

    it('125.2.1 works with data size 64K - 1', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var updateStr = random.getRandomLengthString(65535);
      test2(insertedStr, updateStr, 65535, done);
    });

    it('125.2.2 works with data size 64K', function(done) {
      var insertedStr = random.getRandomLengthString(200);
      var updateStr = random.getRandomLengthString(65536);
      test2(insertedStr, updateStr, 65536, done);
    });

    it('125.2.3 works with data size 64K + 1', function(done) {
      var insertedStr = random.getRandomLengthString(10);
      var updateStr = random.getRandomLengthString(65537);
      test2(insertedStr, updateStr, 65537, done);
    });

    it('125.2.4 works with data size 1MB + 1', function(done) {
      var size = 1 * 1024 * 1024 + 1;
      var insertedStr = random.getRandomLengthString(65536);
      var updateStr = random.getRandomLengthString(size);
      test2(insertedStr, updateStr, size, done);
    });

  }); // 125.3

  describe('125.3 RETURNING INTO', function() {

    it('125.3.1 do not support in returning into', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var updateStr = random.getRandomLengthString(65535);
      test3(insertedStr, updateStr, done);
    });

  }); // 125.3

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
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: maxsize }
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
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: maxsize }
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
      c1: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING },
      c2: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
    };
    connection.execute(
      sql,
      bindVar,
      function(err) {
        should.exist(err);
        // ORA-22816: unsupported feature with RETURNING clause
        (err.message).should.startWith("ORA-22816:");
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
        should.strictEqual(result.rows[0][0], expected);
        callback();
      }
    );
  };

});

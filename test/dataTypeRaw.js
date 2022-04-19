/* Copyright (c) 2015, 2022, Oracle and/or its affiliates. */

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
 * NAME
 *   42. dataTypeRaw.js
 *
 * DESCRIPTION
 *   Testing Oracle data type support - RAW.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var assist   = require('./dataTypeAssist.js');
var dbConfig = require('./dbconfig.js');
var random   = require('./random.js');

describe('42. dataTypeRaw.js', function() {

  var connection = null;
  var tableName = "nodb_raw";
  var insertID = 1;

  var bufLen = [10, 100, 1000, 2000]; // buffer length
  var bufs = [];
  for (var i = 0; i < bufLen.length; i++)
    bufs[i] = assist.createBuffer(bufLen[i]);

  before('get one connection', function(done) {
    oracledb.getConnection(
      {
        user:          dbConfig.user,
        password:      dbConfig.password,
        connectString: dbConfig.connectString
      },
      function(err, conn) {
        should.not.exist(err);
        connection = conn;
        done();
      }
    );
  });

  after('release connection', function(done) {
    connection.release(function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe('42.1 testing RAW data in various lengths', function() {

    before('create table, insert data', function(done) {
      assist.setUp(connection, tableName, bufs, done);
    });

    after(function(done) {
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    it('42.1.1 SELECT query', function(done) {
      assist.dataTypeSupport(connection, tableName, bufs, done);
    });

    it('42.1.2 resultSet stores RAW data correctly', function(done) {
      assist.verifyResultSet(connection, tableName, bufs, done);
    });

    it('42.1.3 works well with REF Cursor', function(done) {
      assist.verifyRefCursor(connection, tableName, bufs, done);
    });

    it('42.1.4 result set getRow() function works well with RAW', function(done) {

      var sql1 = "select dummy, HEXTORAW('0123456789ABCDEF0123456789ABCDEF') from dual";
      connection.execute(
        sql1,
        [],
        { resultSet: true },
        function(err, result) {
          should.not.exist(err);
          fetchOneRowFromRS(result.resultSet, done);
        }
      );

      function fetchOneRowFromRS(rs, cb) {
        rs.getRow(function(err, row) {
          should.not.exist(err);
          if (row) {
            fetchOneRowFromRS(rs, cb);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              cb();
            });
          }
        });
      }
    }); // 42.1.4

    it('42.1.5 a negative case which hits NJS-011 error', function(done) {
      connection.execute(
        "INSERT INTO " + tableName + " (content ) VALUES (:c)",
        { c : { val: 1234, type: oracledb.BUFFER, dir:oracledb.BIND_IN } },
        function(err, result) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch
          (err.message).should.startWith('NJS-011:');
          should.not.exist(result);
          done();
        }
      );
    });

  });

  describe('42.2 stores null value correctly', function() {
    it('42.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    });
  });

  describe('42.3 DML Returning', function() {

    before('create table', function(done) {
      assist.createTable(connection, tableName, done);
    });

    after(function(done) {
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    it('42.3.1 INSERT statement with Object binding', function(done) {
      var seq = 1;
      var size = 10;
      var bindValue = assist.createBuffer(size);

      connection.execute(
        "INSERT INTO " + tableName + " VALUES (:n, :c) RETURNING num, content INTO :rid, :rc",
        {
          n   : seq,
          c   : { type: oracledb.BUFFER, val: bindValue, dir: oracledb.BIND_IN },
          rid : { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rc  : { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 2000 }
        },
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.outBinds.rid[0], seq);
          should.deepEqual(result.outBinds.rc[0], bindValue);
          done();
        }
      );
    });  // 42.3.1

    it('42.3.2 INSERT statement with ARRAY binding', function(done) {
      var seq = 2;
      var size = 10;
      var bindValue = assist.createBuffer(size);

      connection.execute(
        "INSERT INTO " + tableName + " VALUES (:n, :c) RETURNING num, content INTO :rid, :rc",
        [
          seq,
          { type: oracledb.BUFFER, val: bindValue, dir: oracledb.BIND_IN },
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 2000 }
        ],
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.outBinds[0][0], seq);
          should.deepEqual(result.outBinds[1][0], bindValue);
          done();
        }
      );
    }); // 42.3.2

    it('42.3.3 INSERT statement with exact maxSize restriction', function(done) {
      var seq = 3;
      var size = 100;
      var bindValue = assist.createBuffer(size);

      connection.execute(
        "INSERT INTO " + tableName + " VALUES (:n, :c) RETURNING num, content INTO :rid, :rc",
        {
          n   : seq,
          c   : { type: oracledb.BUFFER, val: bindValue, dir: oracledb.BIND_IN },
          rid : { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rc  : { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size}
        },
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.outBinds.rid[0], seq);
          should.deepEqual(result.outBinds.rc[0], bindValue);
          done();
        }
      );
    });

    it('42.3.4 UPDATE statement', function(done) {
      var seq = 2;
      var size = 10;
      var bindValue = assist.createBuffer(size);

      connection.execute(
        "UPDATE " + tableName + " SET content = :c WHERE num = :n RETURNING num, content INTO :rid, :rc",
        {
          n   : seq,
          c   : { type: oracledb.BUFFER, val: bindValue, dir: oracledb.BIND_IN },
          rid : { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rc  : { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 2000 }
        },
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.outBinds.rid[0], seq);
          should.deepEqual(result.outBinds.rc[0], bindValue);
          done();
        }
      );
    }); // 42.3.4

    it('42.3.5 DELETE statement with single row matching', function(done) {
      var seq = 1;

      connection.execute(
        "DELETE FROM " + tableName + " WHERE num = :1 RETURNING num, content INTO :2, :3",
        [
          seq,
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 2000 }
        ],
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.outBinds[0][0], seq);
          done();
        }
      );
    });

    it('42.3.6 DELETE statement with multiple rows matching', function(done) {
      var seq = 1;

      connection.execute(
        "DELETE FROM " + tableName + " WHERE num > :n RETURNING num, content INTO :rid, :rc",
        {
          n   : seq,
          rid : { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rc  : { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 2000 }
        },
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          should.deepEqual(result.outBinds.rid, [2, 3]);
          done();
        }
      );
    });

  }); // 42.3

  describe('42.4 in PL/SQL, the maximum size is 32767', function() {

    var proc =
      "CREATE OR REPLACE PROCEDURE nodb_testraw (p_in IN RAW, p_out OUT RAW) " +
      "AS " +
      "BEGIN " +
      "  p_out := p_in; " +
      "END; ";

    before('create procedure', function(done) {
      connection.execute(
        proc,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    after(function(done) {
      connection.execute(
        "DROP PROCEDURE nodb_testraw",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    it('42.4.1 works well when the length of data is less than maxSize', function(done) {
      var size = 5;
      var buf = assist.createBuffer(size);

      connection.execute(
        "BEGIN nodb_testraw(:i, :o); END;",
        {
          i: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: buf },
          o: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 32800}
        },
        function(err, result) {
          should.not.exist(err);

          (Buffer.isBuffer(result.outBinds.o)).should.equal(true, "Error: the bind out data is not a Buffer");
          (result.outBinds.o.length).should.be.exactly(size);
          done();
        }
      );
    });

    it('42.4.2 works well when the length of data is exactly 32767', function(done) {
      var size = 32767;
      var buf = assist.createBuffer(size);

      connection.execute(
        "BEGIN nodb_testraw(:i, :o); END;",
        {
          i: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: buf },
          o: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 32767}
        },
        function(err, result) {
          should.not.exist(err);

          (Buffer.isBuffer(result.outBinds.o)).should.equal(true, "Error: the bind out data is not a Buffer");
          (result.outBinds.o.length).should.be.exactly(size);
          done();
        }
      );
    });

    it('42.4.3 throws error when the length of data is greater than maxSize', function(done) {
      var size = 32700;
      var buf = assist.createBuffer(size);

      connection.execute(
        "BEGIN nodb_testraw(:i, :o); END;",
        {
          i: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: buf },
          o: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: (size - 100) }
        },
        function(err) {
          should.exist(err);
          // ORA-06502: PL/SQL: numeric or value error\nORA-06512: at line 1
          (err.message).should.startWith('ORA-06502:');
          done();
        }
      );
    });

    it('42.4.4 throws error when both data and maxSize are greater than 32767', function(done) {
      var size = 32800;
      var buf = assist.createBuffer(size);

      connection.execute(
        "BEGIN nodb_testraw(:i, :o); END;",
        {
          i: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: buf },
          o: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 40000}
        },
        function(err) {
          should.exist(err);
          // ORA-06502: PL/SQL: numeric or value error\nORA-06512: at line 1
          (err.message).should.startWith('ORA-06502:');
          done();
        }
      );
    });
  }); // 42.4

  describe('42.5 INSERT and SELECT', function() {
    before(function(done) {
      assist.createTable(connection, tableName, done);
    });

    after(function(done) {
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    beforeEach(function(done) {
      insertID++;
      done();
    });

    it('42.5.1 works with data size 100', function(done) {
      var insertedStr = random.getRandomLengthString(100);
      var insertedBuf = Buffer.from(insertedStr);
      test1(insertedBuf, done);
    });

    it('42.5.2 works with data size 2000', function(done) {
      var insertedStr = random.getRandomLengthString(2000);
      var insertedBuf = Buffer.from(insertedStr);
      test1(insertedBuf, done);
    });

    it('42.5.3 works with default type/dir', function(done) {
      var insertedStr = random.getRandomLengthString(2000);
      var insertedBuf = Buffer.from(insertedStr);
      test1_default(insertedBuf, done);
    });

  }); // 42.5

  describe('42.6 UPDATE', function() {
    before(function(done) {
      assist.createTable(connection, tableName, done);
    });

    after(function(done) {
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    beforeEach(function(done) {
      insertID++;
      done();
    });

    it('42.6.1 works with data size 100', function(done) {
      var insertedStr = random.getRandomLengthString(20);
      var updateStr = random.getRandomLengthString(100);
      var insertedBuf = Buffer.from(insertedStr);
      var updateBuf = Buffer.from(updateStr);
      test2(insertedBuf, updateBuf, done);
    });

    it('42.6.2 works with data size 2000', function(done) {
      var insertedStr = random.getRandomLengthString(30);
      var updateStr = random.getRandomLengthString(2000);
      var insertedBuf = Buffer.from(insertedStr);
      var updateBuf = Buffer.from(updateStr);
      test2(insertedBuf, updateBuf, done);
    });

    it('42.6.3 works with default type/dir', function(done) {
      var insertedStr = random.getRandomLengthString(30);
      var updateStr = random.getRandomLengthString(2000);
      var insertedBuf = Buffer.from(insertedStr);
      var updateBuf = Buffer.from(updateStr);
      test2_default(insertedBuf, updateBuf, done);
    });

  }); // 42.6

  var test1 = function(content, callback) {
    async.series([
      function(cb) {
        insert(content, cb);
      },
      function(cb) {
        fetch(content, cb);
      }
    ], callback);
  };

  var test1_default = function(content, callback) {
    async.series([
      function(cb) {
        insert_default(content, cb);
      },
      function(cb) {
        fetch(content, cb);
      }
    ], callback);
  };

  var test2 = function(insertedStr, updateStr, callback) {
    async.series([
      function(cb) {
        insert(insertedStr, cb);
      },
      function(cb) {
        update(updateStr, cb);
      },
      function(cb) {
        fetch(updateStr, cb);
      }
    ], callback);
  };

  var test2_default = function(insertedStr, updateStr, callback) {
    async.series([
      function(cb) {
        insert(insertedStr, cb);
      },
      function(cb) {
        update_default(updateStr, cb);
      },
      function(cb) {
        fetch(updateStr, cb);
      }
    ], callback);
  };

  var insert = function(content, callback) {
    var sql = "insert into " + tableName + " (num, content) values (:i, :c)";
    var bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
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

  var insert_default = function(content, callback) {
    var sql = "insert into " + tableName + " (num, content) values (:i, :c)";
    var bindVar = {
      i: insertID,
      c: content
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

  var update = function(content, callback) {
    var sql = "update " + tableName + " set content = :c where num = :i";
    var bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
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

  var update_default = function(content, callback) {
    var sql = "update " + tableName + " set content = :c where num = :i";
    var bindVar = {
      i: insertID,
      c: content
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

  var fetch = function(expected, callback) {
    var sql = "select content from " + tableName + " where num = " + insertID;
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

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
 *   124. nclobDMLBindAsString.js
 *
 * DESCRIPTION
 *    Testing NCLOB binding as STRING in DML.
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
var async    = require('async');
var should   = require('should');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');
var random   = require('./random.js');

describe('124. nclobDMLBindAsString.js', function() {
  this.timeout(10000);

  var connection = null;
  var tableName = "nodb_nclob";
  var insertID = 0;

  before('get one connection', function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  });

  after('release connection', function(done) {
    connection.release( function(err) {
      should.not.exist(err);
      done();
    });
  });

  beforeEach(function(done) {
    insertID++;
    done();
  });

  describe('124.1 DML binding', function() {
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

    it('124.1.1 bind in via INSERT', function(done) {
      var insertLength = 100;
      var insertStr = random.getRandomLengthString(insertLength);
      async.series([
        function(cb) {
          bindIn(tableName, insertStr, cb);
        },
        function(cb) {
          streamLob(tableName, insertStr, cb);
        }
      ], done);
    });

    it('124.1.2 bind out via RETURNING INTO', function(done) {
      var insertLength = 3000;
      var insertStr = random.getRandomLengthString(insertLength);
      async.series([
        function(cb) {
          insertData(tableName, insertStr, cb);
        },
        function(cb) {
          bindOut(tableName, insertStr, cb);
        }
      ], done);
    });

    it('124.1.3 bind in via UPDATE', function(done) {
      var insertLength = 100;
      var insertStr = random.getRandomLengthString(insertLength);
      var updateStr = random.getRandomLengthString(200);
      async.series([
        function(cb) {
          insertData(tableName, insertStr, cb);
        },
        function(cb) {
          bind_update(tableName, updateStr, cb);
        },
        function(cb) {
          streamLob(tableName, updateStr, cb);
        }
      ], done);
    });

    it('124.1.3 bind in via WHERE', function(done) {
      var insertLength = 500;
      var insertStr = random.getRandomLengthString(insertLength);
      async.series([
        function(cb) {
          insertData(tableName, insertStr, cb);
        },
        function(cb) {
          bind_where(tableName, insertStr, cb);
        }
      ], done);
    });

  });


  var insertData = function(tableName, insertStr, callback) {
    var sql = "INSERT INTO " + tableName + "(num, content) VALUES(" + insertID + ", TO_NCLOB('" + insertStr + "'))";
    connection.execute(
        sql,
        function(err) {
          should.not.exist(err);
          callback();
        }
      );
  };

  var bindIn = function(tableName, insertStr, callback) {
    var sql = "INSERT INTO " + tableName + "(num, content) VALUES(:i, TO_NCLOB(:c))";
    var bindVar = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN},
      c: { val: insertStr, type: oracledb.STRING, dir: oracledb.BIND_IN},
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

  var bindOut = function(tableName, insertStr, callback) {
    insertID++;
    connection.execute(
      "INSERT INTO " + tableName + " (num, content) VALUES (:i, TO_NCLOB(:c)) RETURNING content INTO :lobbv",
      {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN},
        c: { val: insertStr, type: oracledb.STRING, dir: oracledb.BIND_IN },
        lobbv: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: insertStr.length }
      },
      function(err, result) {
        should.not.exist(err);
        var resultStr = result.outBinds.lobbv[0];
        should.strictEqual(resultStr.length, insertStr.length);
        should.strictEqual(resultStr, insertStr);
        callback();
      });
  };

  var bind_update = function(tableName, insertStr, callback) {
    var sql = "update " + tableName + " set content = TO_NCLOB(:c) where num = :i";
    var bindVar = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN},
      c: { val: insertStr, type: oracledb.STRING, dir: oracledb.BIND_IN}
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

  var bind_where = function(tableName, insertStr, callback) {
    var sql = "select * from " + tableName + " where dbms_lob.compare(content, TO_NCLOB(:c)) = 0";
    var bindVar = {
      c: { val: insertStr, type: oracledb.STRING, dir: oracledb.BIND_IN}
    };
    connection.execute(
      sql,
      bindVar,
      {
        fetchInfo : { CONTENT : { type : oracledb.STRING } }
      },
      function(err, result) {
        should.not.exist(err);
        should.strictEqual(result.rows[0][0], insertID);
        should.strictEqual(result.rows[0][1], insertStr);
        callback();
      }
    );
  };

  var streamLob = function(tableName, originalStr, callback) {
    connection.execute(
      "SELECT TO_CLOB(content) FROM " + tableName + " where num = " + insertID,
      function(err, result) {
        should.not.exist(err);
        var clob = '';
        var lob = result.rows[0][0];

        should.exist(lob);
        lob.setEncoding('utf8'); // set the encoding so we get a 'string' not a 'buffer'

        lob.on('data', function(chunk) {
          clob += chunk;
        });

        lob.on('end', function() {
          should.strictEqual(clob.length, originalStr.length);
          should.strictEqual(clob, originalStr);
          callback();
        });

        lob.on('error', function(err) {
          should.not.exist(err);
        });
      });
  };

});

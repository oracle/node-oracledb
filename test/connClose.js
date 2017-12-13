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
 *   52. connClose.js
 *
 * DESCRIPTION
 *   Negative cases against connection.
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
var assist   = require('./dataTypeAssist.js');

describe('52. connClose.js', function() {

  it('52.1 can not set property value after connection closes', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);
        var defaultSize = 30;
        should.strictEqual(connection.stmtCacheSize, defaultSize);

        connection.release(function(err) {
          should.not.exist(err);
          should.throws(
            function() {
              connection.stmtCacheSize = 10;
            },
            /NJS-014: stmtCacheSize is a read-only property/
          );
          done();
        });
      }
    );
  }); // 52.1

  it('52.2 can not get property value after connection closes', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);
          should.throws(
            function() {
              var newSize;
              newSize = connection.stmtCacheSize;
              should.not.exist(newSize);
            },
            /NJS-003: invalid connection/
          );
          done();
        });
      }
    );
  }); // 52.2

  it('52.3 can not set clientId property value', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);
          should.throws(
            function() {
              connection.clientId = "52.3";
            },
            /NJS-003: invalid connection/
          );
          done();
        });
      }
    );
  }); // 52.3

  it('52.4 can not set module property value', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);
          should.throws(
            function() {
              connection.module = "52.4";
            },
            /NJS-003: invalid connection/
          );
          done();
        });
      }
    );
  }); // 52.4

  it('52.5 can not set action property value', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);
          should.throws(
            function() {
              connection.module = "52.5";
            },
            /NJS-003: invalid connection/
          );
          done();
        });
      }
    );
  }); // 52.5

  it('52.6 can not get oracleServerVersion property value', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);
          should.throws(
            function() {
              var serverVer;
              serverVer = connection.oracleServerVersion;
              should.not.exist(serverVer);
            },
            /NJS-003: invalid connection/
          );
          done();
        });
      }
    );
  }); // 52.6

  it('52.7 can not call execute() method', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);
          connection.execute(
            "select sysdate from dual",
            function(err, result) {
              should.not.exist(result);
              should.exist(err);
              should.strictEqual(
                err.message,
                "NJS-003: invalid connection"
              );
              done();
            }
          );
        });
      }
    );
  }); // 52.7

  it('52.8 can not get metaData property after connection closes', function(done) {
    var tableName = "nodb_number";
    var numbers = assist.data.numbers;
    var connection = null;
    var resultSet = null;

    async.series([
      function getConn(callback) {
        oracledb.getConnection(
          dbConfig,
          function(err, conn) {
            should.not.exist(err);
            connection = conn;
            callback();
          }
        );
      },
      function(callback) {
        assist.setUp(connection, tableName, numbers, callback);
      },
      function getResultSet(callback) {
        connection.execute(
          "SELECT * FROM " + tableName + " ORDER BY num",
          [],
          { resultSet: true, outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            resultSet = result.resultSet;
            callback();
          }
        );
      },
      function verifyMetaData(callback) {
        should.exist(resultSet.metaData);
        var t = resultSet.metaData;
        t.should.eql( [ { name: 'NUM' }, { name: 'CONTENT' } ] );
        resultSet.close(callback);
      },
      function closeConn(callback) {
        connection.release(function(err) {
          should.not.exist(err);
          callback();
        });
      },
      function getMetaData(callback) {
        should.throws(
          function() {
            var mdata;
            mdata = resultSet.metaData;
            should.not.exist(mdata);
          },
          /NJS-018: invalid ResultSet/
        );
        callback();
      },
      function getConn(callback) {
        oracledb.getConnection(
          dbConfig,
          function(err, conn) {
            should.not.exist(err);
            connection = conn;
            callback();
          }
        );
      },
      function dropTable(callback) {
        connection.execute(
          "DROP TABLE " + tableName + " PURGE",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function closeConn(callback) {
        connection.release(function(err) {
          should.not.exist(err);
          callback();
        });
      },
    ], done);
  });

});

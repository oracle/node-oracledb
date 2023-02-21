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
 *   53. resultSetClose.js
 *
 * DESCRIPTION
 *   Negative cases against resulstSet.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const async    = require('async');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');

describe('53. resultSetClose.js', function() {

  let connection = null;
  var resultSet  = null;
  var tableName  = "nodb_number";
  var numbers    = assist.data.numbers;

  before(function(done) {
    async.series([
      function getConn(cb) {
        oracledb.getConnection(
          dbConfig,
          function(err, conn) {
            should.not.exist(err);
            connection = conn;
            cb();
          }
        );
      },
      function(cb) {
        assist.setUp(connection, tableName, numbers, cb);
      },
      function getResultSet(cb) {
        connection.execute(
          "SELECT * FROM " + tableName + " ORDER BY num",
          [],
          { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT },
          function(err, result) {
            should.not.exist(err);
            resultSet = result.resultSet;
            cb();
          }
        );
      },
      function verifyMetaData(cb) {
        should.exist(resultSet.metaData);
        var t = resultSet.metaData;
        should.equal(t[0].name, 'NUM');
        should.equal(t[1].name, 'CONTENT');
        cb();
      },
      function closeRS(cb) {
        resultSet.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }); // before

  after(function(done) {
    async.series([
      function(cb) {
        connection.execute(
          "DROP TABLE " + tableName + " PURGE",
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        connection.release(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }); // after

  it('53.1 can not get metaData property', function() {
    should.strictEqual(resultSet.metaData, undefined);
  }); // 53.1

  it('53.2 can not call close() again', function(done) {
    resultSet.close(function(err) {
      should.exist(err);
      should.strictEqual(
        err.message,
        'NJS-018: invalid ResultSet'
      );
      done();
    });
  }); // 53.2

  it('53.3 can not call getRow()', function(done) {
    resultSet.getRow(function(err, row) {
      should.exist(err);
      should.not.exist(row);
      should.strictEqual(
        err.message,
        'NJS-018: invalid ResultSet'
      );
      done();
    });
  }); // 53.3

  it('53.4 can not call getRows()', function(done) {
    var numRows = 3;
    resultSet.getRows(numRows, function(err, rows) {
      should.exist(err);
      should.not.exist(rows);
      should.strictEqual(
        err.message,
        'NJS-018: invalid ResultSet'
      );
      done();
    });
  }); // 53.4

  it('53.5 can not call toQueryStream()', function() {
    should.throws(
      function() {
        var qstream;
        qstream = resultSet.toQueryStream();
        should.not.exist(qstream);
      },
      /NJS-041: cannot convert ResultSet to QueryStream after invoking methods/
    );
  }); // 53.5

  it('53.6 can call getRow() again in the callback of getRow()', function(done) {

    var rs2   = null;
    var tab   = "nodb_float";

    async.series([
      function(cb) {
        assist.setUp(connection, tab, numbers, cb);
      },
      function getResultSet(cb) {
        connection.execute(
          "SELECT * FROM " + tab + " ORDER BY num",
          [],
          { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT },
          function(err, result) {
            should.not.exist(err);
            rs2 = result.resultSet;
            cb();
          }
        );
      },
      function test(cb) {
        rs2.getRow(function(err, row) {
          should.not.exist(err);
          should.exist(row);

          rs2.getRow(function(err, row2) {
            should.not.exist(err);
            should.exist(row2);
            cb();
          });
        });
      },
      function closeRS(cb) {
        rs2.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function dropTable(callback) {
        connection.execute(
          "DROP TABLE " + tab + " PURGE",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);
  }); // 53.6

});

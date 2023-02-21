/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 *   104. dataTypeLongRaw.js
 *
 * DESCRIPTION
 *    Test LONG RAW type support.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var async    = require('async');
var should   = require('should');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');
var random   = require('./random.js');

describe('104. dataTypeLongRaw.js', function() {

  var connection = null;
  var tableName = "nodb_longraw";

  before('get one connection', function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  });

  after('release connection', function(done) {
    connection.release(function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe('104.1 LONG RAW data type support', function() {

    // Generate test data
    var strLen = [10, 100, 1000];
    var strs = [];
    var specialStr = "104.1";
    for (var i = 0; i < strLen.length; i++)
      strs[i] = random.getRandomString(strLen[i], specialStr);

    before(function(done) {
      async.series([
        function(cb) {
          assist.createTable(connection, tableName, cb);
        },
        function(cb) {
          async.eachSeries(strs, function(element, callback) {
            connection.execute(
              "insert into " + tableName + " values( :no, utl_raw.cast_to_raw(:bv) )",
              { no: strs.indexOf(element), bv: element},
              { autoCommit: true },
              function(err) {
                should.not.exist(err);
                callback();
              }
            );
          }, function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    });

    after(function(done) {
      connection.execute(
        "drop table " + tableName + " purge",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    it('104.1.1 SELECT query', function(done) {
      connection.execute(
        "select * from " + tableName + " order by num",
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rows.length, strs.length);
          for (var i = 0; i < strs.length; i++) {
            (Buffer.isBuffer(result.rows[i].CONTENT)).should.be.ok();
          }
          done();
        }
      );
    });

    it('104.1.2 works well with result set', function(done) {
      connection.execute(
        "select * from " + tableName,
        [],
        { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT },
        function(err, result) {
          should.not.exist(err);
          (result.resultSet.metaData[0]).name.should.eql('NUM');
          (result.resultSet.metaData[1]).name.should.eql('CONTENT');
          fetchRowsFromRS(result.resultSet, strs, done);
        }
      );
    });

    it('104.1.3 works well with REF Cursor', function(done) {
      var createProc = "CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    OPEN p_out FOR \n" +
                       "        SELECT * FROM " + tableName  + "; \n" +
                       "END; ";

      async.series([
        function createProcedure(callback) {
          connection.execute(
            createProc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function verify(callback) {
          connection.execute(
            "BEGIN testproc(:o); END;",
            [
              { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
            ],
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
            function(err, result) {
              should.not.exist(err);
              fetchRowsFromRS(result.outBinds[0], strs, callback);
            }
          );
        },
        function dropProcedure(callback) {
          connection.execute(
            "DROP PROCEDURE testproc",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

    var numRows = 3;
    function fetchRowsFromRS(rs, array, callback) {
      rs.getRows(numRows, function(err, rows) {
        should.not.exist(err);
        if (rows.length > 0) {
          for (var i = 0; i < rows.length; i++) {
            (Buffer.isBuffer(rows[i].CONTENT)).should.be.ok();
          }
          return fetchRowsFromRS(rs, array, callback);
        } else {
          rs.close(function(err) {
            should.not.exist(err);
            callback();
          });
        }
      });
    }

  }); // 104.1

  describe('104.2 stores null values correctly', function() {
    it('104.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    });
  });

});

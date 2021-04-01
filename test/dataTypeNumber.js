/* Copyright (c) 2015, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   26. dataTypeNumber.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - NUMBER.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var assist   = require('./dataTypeAssist.js');
var dbConfig = require('./dbconfig.js');
var async    = require('async');

describe('26. dataTypeNumber.js', function() {

  var connection = null;
  var tableName = "nodb_number";
  var numbers = assist.data.numbers;

  before('get one connection', function(done) {
    oracledb.getConnection(
      dbConfig,
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

  describe('26.1 testing NUMBER data', function() {

    before('create table, insert data', function(done) {
      assist.setUp(connection, tableName, numbers, done);
    });

    after(function(done) {
      oracledb.fetchAsString = [];
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    it('26.1.1 SELECT query', function(done) {
      assist.dataTypeSupport(connection, tableName, numbers, done);
    });

    it('26.1.2 resultSet stores NUMBER data correctly', function(done) {
      assist.verifyResultSet(connection, tableName, numbers, done);
    });

    it('26.1.3 works well with REF Cursor', function(done) {
      assist.verifyRefCursor(connection, tableName, numbers, done);
    });

    it('26.1.4 columns fetched from REF CURSORS can be mapped by fetchInfo settings', function(done) {
      assist.verifyRefCursorWithFetchInfo(connection, tableName, numbers, done);
    });

    it('26.1.5 columns fetched from REF CURSORS can be mapped by oracledb.fetchAsString', function(done) {
      oracledb.fetchAsString = [ oracledb.NUMBER ];
      assist.verifyRefCursorWithFetchAsString(connection, tableName, numbers, done);
    });

  });

  describe('26.2 stores null value correctly', function() {
    it('26.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    });
  });

  // GitHub issue 833
  // https://github.com/oracle/node-oracledb/issues/833
  describe('26.3 large integers that cannot fit inside a 32-bit integer', function() {

    it('26.3.1 original case', function(done) {

      var num = 999999999999;
      async.series([
        function(cb) {
          var proc = "BEGIN \n" +
                     "    DECLARE \n" +
                     "        e_table_missing EXCEPTION; \n" +
                     "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                     "    BEGIN \n" +
                     "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_bignum PURGE'); \n" +
                     "    EXCEPTION \n" +
                     "        WHEN e_table_missing \n" +
                     "        THEN NULL; \n" +
                     "    END; \n" +
                     "    EXECUTE IMMEDIATE (' \n" +
                     "        CREATE TABLE nodb_tab_bignum ( \n" +
                     "            id       NUMBER NOT NULL, \n" +
                     "            content  NUMBER(12, 0) \n" +
                     "        ) \n" +
                     "    '); \n" +
                     "END; ";

          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var sql = "insert into nodb_tab_bignum (id, content) values (1, :n)";
          connection.execute(
            sql,
            { n: num },
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var sql = "select content from nodb_tab_bignum where id = 1";
          connection.execute(
            sql,
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.rows[0][0],
                num
              );
              cb();
            }
          );
        },
        function(cb) {
          var sql = "DROP TABLE nodb_tab_bignum PURGE";
          connection.execute(
            sql,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    });
  }); // 26.3

  /*
   * The maximum safe integer in JavaScript is (2^53 - 1) i.e. 9007199254740992.
   * The minimum safe integer in JavaScript is (-(2^53 - 1)).
   * Numbers out of above range will be rounded.
   */
  describe('26.4 Large number, edge cases', function() {

    it('26.4.1 maximum safe integer, (2^53 - 1)', function(done) {

      var num = 9007199254740992;
      var sql = "select " + num + " from dual";
      connection.execute(
        sql,
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(
            result.rows[0][0],
            num
          );
          done();
        }
      );
    });

    it('26.4.2 Negative - maximum safe integer + 1', function(done) {

      var actual = '9007199254740993';
      var expected = 9007199254740992;

      var sql = "SELECT TO_NUMBER( " + actual + " ) FROM DUAL";
      connection.execute(
        sql,
        function(err, result) {
          should.not.exist(err);
          var outNum = result.rows[0][0];
          should.strictEqual(outNum, expected);
          done();
        }
      );
    });

    it('26.4.3 minimum safe integer', function(done) {

      var num = -9007199254740992;
      var sql = "select " + num + " from dual";
      connection.execute(
        sql,
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(
            result.rows[0][0],
            num
          );
          done();
        }
      );
    });

    it('26.4.4 Negative - minimum safe integer - 1', function(done) {
      var actual = '-9007199254740993';
      var expected = -9007199254740992;

      var sql = "SELECT TO_NUMBER( " + actual + " ) FROM DUAL";
      connection.execute(
        sql,
        function(err, result) {
          should.not.exist(err);
          var outNum = result.rows[0][0];
          should.strictEqual(outNum, expected);
          done();
        }
      );
    });

    it('26.4.5 gets correct number via fetching as string', function(done) {
      var num = '-9007199254740993';

      var sql = "SELECT TO_NUMBER( " + num + " ) AS TS_NUM FROM DUAL";
      connection.execute(
        sql,
        [],
        {
          fetchInfo : { "TS_NUM"  : { type : oracledb.STRING } }
        },
        function(err, result) {
          should.not.exist(err);
          var got = result.rows[0][0];
          should.strictEqual(got, num);
          done();
        }
      );
    });

  }); // 26.4

});

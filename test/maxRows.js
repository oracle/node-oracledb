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
 *   157. maxRows.js
 *
 * DESCRIPTION
 *   Test the "maxRows" property.
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

describe('157. maxRows.js', function() {

  var connection = null;
  var totalAmount = 107;

  before(function(done) {
    async.series([
      function getConn(cb) {
        oracledb.getConnection(dbConfig, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          cb();
        });
      },
      function createTab(cb) {
        var proc = "BEGIN \n" +
                   "    DECLARE \n" +
                   "        e_table_missing EXCEPTION; \n" +
                   "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                   "    BEGIN \n" +
                   "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_conn_emp2 PURGE'); \n" +
                   "    EXCEPTION \n" +
                   "        WHEN e_table_missing \n" +
                   "        THEN NULL; \n" +
                   "    END; \n" +
                   "    EXECUTE IMMEDIATE (' \n" +
                   "        CREATE TABLE nodb_tab_conn_emp2 ( \n" +
                   "            id       NUMBER NOT NULL, \n" +
                   "            name     VARCHAR2(20) \n" +
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
      function insertData(cb) {
        var proc = "DECLARE \n" +
                   "    x NUMBER := 0; \n" +
                   "    n VARCHAR2(20); \n" +
                   "BEGIN \n" +
                   "    FOR i IN 1..107 LOOP \n" +
                   "        x := x + 1; \n" +
                   "        n := 'staff ' || x; \n" +
                   "        INSERT INTO nodb_tab_conn_emp2 VALUES (x, n); \n" +
                   "    END LOOP; \n" +
                   "END; ";

        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      }
    ], done);
  }); // before()

  after(function(done) {
    async.series([
      function(cb) {
        connection.execute(
          "DROP TABLE nodb_tab_conn_emp2 PURGE",
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        connection.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }); // after()

  // restore oracledb.maxRows to its default value
  afterEach(function(done) {
    var defaultValue = 0;
    oracledb.maxRows = defaultValue;
    done();
  });

  var verifyRows = function(rows, amount) {
    for (var i = 0; i < amount; i++) {
      should.strictEqual(rows[i][0], (i + 1));
      should.strictEqual(rows[i][1], ("staff " + String(i + 1)) );
    }
  };

  var sqlQuery = "SELECT * FROM nodb_tab_conn_emp2 ORDER BY id";

  it('157.1 Default maxRows == 0, which means unlimited', function(done){
    should.strictEqual(oracledb.maxRows, 0);

    connection.execute(
      sqlQuery,
      function(err, result){
        should.not.exist(err);
        should.exist(result);
        should.strictEqual(result.rows.length, totalAmount);
        verifyRows(result.rows, totalAmount);
        done();
      }
    );
  });

  it("157.2 specify the value at execution", function(done){
    var fetchAmount = 25;
    connection.execute(
      sqlQuery,
      {},
      { maxRows: fetchAmount },
      function(err, result){
        should.not.exist(err);
        should.exist(result);
        should.strictEqual(result.rows.length, fetchAmount);
        verifyRows(result.rows, fetchAmount);
        done();
      }
    );
  });

  it('157.3 equals to the total amount of rows', function(done){
    connection.execute(
      sqlQuery,
      {},
      { maxRows: totalAmount },
      function(err, result){
        should.not.exist(err);
        should.exist(result);
        should.strictEqual(result.rows.length, totalAmount);
        verifyRows(result.rows, totalAmount);
        done();
      }
    );
  });

  it('157.4 cannot set it to be a negative number', function(done){
    connection.execute(
      sqlQuery,
      {},
      { maxRows: -5 },
      function(err, result){
        should.exist(err);
        should.not.exist(result);
        should.strictEqual(
          err.message,
          'NJS-007: invalid value for "maxRows" in parameter 3'
        );
        done();
      }
    );
  });

  it('157.5 sets it to be large value', function(done) {
    connection.execute(
      sqlQuery,
      {},
      { maxRows: 500000 },
      function(err, result){
        should.not.exist(err);
        should.exist(result);
        verifyRows(result.rows, totalAmount);
        done();
      }
    );
  });

  it('157.6 shows 12c new way to limit the number of records fetched by queries', function(done) {

    var myoffset     = 2;  // number of rows to skip
    var mymaxnumrows = 6;  // number of rows to fetch
    var sql = "SELECT * FROM nodb_tab_conn_emp2 ORDER BY id";

    if (connection.oracleServerVersion >= 1201000000) {
      // 12c row-limiting syntax
      sql += " OFFSET :offset ROWS FETCH NEXT :maxnumrows ROWS ONLY";
    } else {
      // Pre-12c syntax [could also customize the original query and use row_number()]
      sql = "SELECT * FROM (SELECT A.*, ROWNUM AS MY_RNUM FROM"
          + "(" + sql + ") A "
          + "WHERE ROWNUM <= :maxnumrows + :offset) WHERE MY_RNUM > :offset";
    }

    connection.execute(
      sql,
      { offset: myoffset, maxnumrows: mymaxnumrows },
      { maxRows: 150 },
      function(err, result) {
        should.not.exist(err);
        (result.rows.length).should.eql(mymaxnumrows);
        done();
      }
    );
  }); // 157.6

  it('157.7 oracledb.maxRows > 0 && oracledb.maxRows < totalAmount', function(done) {

    var testValue = 100;
    oracledb.maxRows = testValue;
    connection.execute(
      sqlQuery,
      function(err, result) {
        should.not.exist(err);
        var expectedAmount = testValue;
        verifyRows(result.rows, expectedAmount);
        done();
      }
    );
  }); // 157.7

  it('157.8 oracledb.maxRows > 0, execute() with maxRows=0', function(done) {

    oracledb.maxRows = 100;
    connection.execute(
      sqlQuery,
      {},
      { maxRows: 0 },
      function(err, result) {
        should.not.exist(err);
        var expectedAmount = totalAmount;
        verifyRows(result.rows, expectedAmount);
        done();
      }
    );
  }); // 157.8

});
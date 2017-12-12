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
 *   151. fetchArraySize4.js
 *
 * DESCRIPTION
 *   Fetching data from database with different oracledb.fetchArraySize when resultSet=true
 *   Tests including:
 *     getRow() tests
 *     getRows() tests
 *     interleaved calls to getRow() and getRows() tests
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
var dbConfig = require('./dbconfig.js');

describe("151. fetchArraySize4.js", function() {

  var connection = null;
  var default_fetcArraySize = oracledb.fetchArraySize;
  var default_maxRows = oracledb.maxRows;
  var tableName = "nodb_fetchArraySize_149";

  var create_table = "BEGIN \n" +
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
                     "            content    VARCHAR(2000) \n" +
                     "        ) \n" +
                     "    '); \n" +
                     "    FOR i IN 1..1000 LOOP \n" +
                     "         EXECUTE IMMEDIATE (' \n" +
                     "             insert into " + tableName + " values (' || i || ',' || to_char(i) ||') \n" +
                     "        '); \n" +
                     "    END LOOP; \n" +
                     "    commit; \n" +
                     "END; ";

  var drop_table = "DROP TABLE " + tableName + " PURGE";

  before(function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.strictEqual(default_fetcArraySize, 100);
      should.strictEqual(default_maxRows, 0);
      should.not.exist(err);
      connection = conn;
      done();
    });
  });

  after(function(done) {
    connection.close(function(err) {
      should.not.exist(err);
      done();
    });
  });


  describe("151.1 getRows() of resultSet = true", function() {

    before(function(done) {
      connection.execute(
        create_table,
        function(err){
          should.not.exist(err);
          done() ;
        }
      );
    });

    after(function(done) {
      connection.execute(
        drop_table,
        function(err){
          should.not.exist(err);
          done();
        }
      );
    });

    afterEach(function(done) {
      oracledb.fetchArraySize = default_fetcArraySize;
      oracledb.maxRows = default_maxRows;
      done();
    });

    var testGetRow = function(fetchArraySizeVal, numRowsVal, cb) {
      oracledb.fetchArraySize = fetchArraySizeVal;
      connection.execute(
        "select * from " + tableName + " order by id",
        [],
        { resultSet: true },
        function(err, result) {
          should.not.exist(err);
          var rowCount = 0;
          fetchRowsFromRS(result.resultSet, numRowsVal, rowCount, cb);
        }
      );
    };

    function fetchRowsFromRS(rs, numRowsVal, rowCount, cb)
    {
      rs.getRows(numRowsVal, function(err, rows) {
        (rows.length).should.be.belowOrEqual(numRowsVal);
        if(rows.length > 0) {
          for(var i = 0; i < rows.length; i++) {
            rowCount = rowCount + 1;
            should.strictEqual(rows[i][0], rowCount);
            should.strictEqual(rows[i][1], rowCount.toString());
          }
          return fetchRowsFromRS(rs, numRowsVal, rowCount, cb);
        } else {
          should.strictEqual(rowCount, 1000);
          rs.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      });
    }

    it("151.1.1 numRows > table size > oracledb.fetchArraySize", function(done) {
      var fetchArraySizeVal = 50;
      var numRowsVal = 10000;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("151.1.2 numRows > oracledb.fetchArraySize > table size", function(done) {
      var fetchArraySizeVal = 1200;
      var numRowsVal = 10000;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("151.1.3 table size > numRows > oracledb.fetchArraySize", function(done) {
      var fetchArraySizeVal = 1;
      var numRowsVal = 2;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("151.1.4 table size > oracledb.fetchArraySize > maxRow", function(done) {
      var fetchArraySizeVal = 90;
      var numRowsVal = 150;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("151.1.5 numRows = oracledb.fetchArraySize < table size", function(done) {
      var fetchArraySizeVal = 110;
      var numRowsVal = 110;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("151.1.6 numRows = oracledb.fetchArraySize = table size", function(done) {
      var fetchArraySizeVal = 1000;
      var numRowsVal = 1000;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("151.1.7 numRows = oracledb.fetchArraySize > table size", function(done) {
      var fetchArraySizeVal = 9999;
      var numRowsVal = 9999;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("151.1.8 numRows = oracledb.fetchArraySize/10", function(done) {
      var fetchArraySizeVal = 1000;
      var numRowsVal = 100;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("151.1.9 numRows = 10 * oracledb.fetchArraySize", function(done) {
      var fetchArraySizeVal = 90;
      var numRowsVal = 900;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("151.1.10 numRows > fetchArraySize, fetchArraySize = (table size)/10", function(done) {
      var fetchArraySizeVal = 100;
      var numRowsVal = 210;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("151.1.11 numRows = (table size - 1), fetchArraySize = table size", function(done) {
      var fetchArraySizeVal = 1000;
      var numRowsVal = 999;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("151.1.12 fetchArraySize = (table size - 1), numRows = table size", function(done) {
      var fetchArraySizeVal = 999;
      var numRowsVal = 1000;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

  });

  describe("151.2 getRow() of resultSet = true", function() {

    before(function(done) {
      connection.execute(
        create_table,
        function(err){
          should.not.exist(err);
          done() ;
        }
      );
    });

    after(function(done) {
      connection.execute(
        drop_table,
        function(err){
          should.not.exist(err);
          done();
        }
      );
    });

    afterEach(function(done) {
      oracledb.fetchArraySize = default_fetcArraySize;
      oracledb.maxRows = default_maxRows;
      done();
    });

    var testGetRows = function(fetchArraySize, cb) {
      oracledb.fetchArraySize = fetchArraySize;
      connection.execute(
        "select * from " + tableName + " order by id",
        [],
        { resultSet: true },
        function(err, result) {
          should.not.exist(err);
          // should.strictEqual(result.rows.length, default_maxRows);
          var rowCount = 0;
          fetchRowFromRS(result.resultSet, rowCount, cb);
        }
      );
    };

    function fetchRowFromRS(rs, rowCount, cb)
    {
      rs.getRow(function(err, row) {
        if(row) {
          rowCount = rowCount + 1;
          // console.log(rows[i][0]);
          should.strictEqual(row[0], rowCount);
          should.strictEqual(row[1], rowCount.toString());
          return fetchRowFromRS(rs, rowCount, cb);
        } else {
          should.strictEqual(rowCount, 1000);
          rs.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      });
    }

    it("151.2.1 oracledb.fetchArraySize = 1", function(done) {
      testGetRows(1, done);
    });

    it("151.2.2 oracledb.fetchArraySize = 20", function(done) {
      testGetRows(10, done);
    });

    it("151.2.3 oracledb.fetchArraySize = 50", function(done) {
      testGetRows(50, done);
    });

    it("151.2.4 oracledb.fetchArraySize = 100", function(done) {
      testGetRows(100, done);
    });

    it("151.2.5 oracledb.fetchArraySize = 200", function(done) {
      testGetRows(200, done);
    });

    it("151.2.6 oracledb.fetchArraySize = 1000", function(done) {
      testGetRows(1000, done);
    });

    it("151.2.7 oracledb.fetchArraySize = (table size - 1)", function(done) {
      testGetRows(999, done);
    });

  });

  describe("151.3 interleaved calls to getRow() and getRows()", function() {
    var numRowsVal_1, numRowsVal_2;

    before(function(done) {
      connection.execute(
        create_table,
        function(err){
          should.not.exist(err);
          done() ;
        }
      );
    });

    after(function(done) {
      connection.execute(
        drop_table,
        function(err){
          should.not.exist(err);
          done();
        }
      );
    });

    afterEach(function(done) {
      oracledb.fetchArraySize = default_fetcArraySize;
      oracledb.maxRows = default_maxRows;
      done();
    });

    var testRS = function(fetchArraySizeVal, cb) {
      oracledb.fetchArraySize = fetchArraySizeVal;
      connection.execute(
        "select * from " + tableName + " order by id",
        [],
        { resultSet: true },
        function(err, result) {
          should.not.exist(err);
          var rowCount = 0;
          fetchRowFromRS(result.resultSet, rowCount, cb);
        }
      );
    };

    function fetchRowFromRS(rs, rowCount, cb)
    {
      rs.getRow(function(err, row) {
        if(row) {
          rowCount = rowCount + 1;
          should.strictEqual(row[0], rowCount);
          should.strictEqual(row[1], rowCount.toString());
          return fetchRowsFromRS_1(rs, rowCount, cb);
        } else {
          should.strictEqual(rowCount, 1000);
          rs.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      });
    }

    function fetchRowsFromRS_1(rs, rowCount, cb)
    {
      rs.getRows(numRowsVal_1, function(err, rows) {
        (rows.length).should.be.belowOrEqual(numRowsVal_1);
        if(rows.length > 0) {
          for(var i = 0; i < rows.length; i++) {
            rowCount = rowCount + 1;
            should.strictEqual(rows[i][0], rowCount);
            should.strictEqual(rows[i][1], rowCount.toString());
          }
          return fetchRowsFromRS_2(rs, rowCount, cb);
        } else {
          should.strictEqual(rowCount, 1000);
          rs.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      });
    }

    function fetchRowsFromRS_2(rs, rowCount, cb)
    {
      rs.getRows(numRowsVal_2, function(err, rows) {
        (rows.length).should.be.belowOrEqual(numRowsVal_2);
        if(rows.length > 0) {
          for(var i = 0; i < rows.length; i++) {
            rowCount = rowCount + 1;
            should.strictEqual(rows[i][0], rowCount);
            should.strictEqual(rows[i][1], rowCount.toString());
          }
          return fetchRowFromRS(rs, rowCount, cb);
        } else {
          should.strictEqual(rowCount, 1000);
          rs.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      });
    }

    it("151.3.1 oracledb.fetchArraySize = 1", function(done) {
      var fetchArraySizeVal = 1;
      numRowsVal_1 = 2;
      numRowsVal_2 = 10;
      testRS(fetchArraySizeVal, done);
    });

    it("151.3.2 oracledb.fetchArraySize = 20", function(done) {
      var fetchArraySizeVal = 20;
      numRowsVal_1 = 5;
      numRowsVal_2 = 88;
      testRS(fetchArraySizeVal, done);
    });

    it("151.3.3 oracledb.fetchArraySize = 50", function(done) {
      var fetchArraySizeVal = 50;
      numRowsVal_1 = 50;
      numRowsVal_2 = 100;
      testRS(fetchArraySizeVal, done);
    });

    it("151.3.4 oracledb.fetchArraySize = 100", function(done) {
      var fetchArraySizeVal = 100;
      numRowsVal_1 = 30;
      numRowsVal_2 = 99;
      testRS(fetchArraySizeVal, done);
    });

    it("151.3.5 oracledb.fetchArraySize = 200", function(done) {
      var fetchArraySizeVal = 200;
      numRowsVal_1 = 5;
      numRowsVal_2 = 88;
      testRS(fetchArraySizeVal, done);
    });

    it("151.3.6 oracledb.fetchArraySize = 1000", function(done) {
      var fetchArraySizeVal = 1000;
      numRowsVal_1 = 15;
      numRowsVal_2 = 1000;
      testRS(fetchArraySizeVal, done);
    });

    it("151.3.6 oracledb.fetchArraySize = (table size - 1)", function(done) {
      var fetchArraySizeVal = 999;
      numRowsVal_1 = 999;
      numRowsVal_2 = 1000;
      testRS(fetchArraySizeVal, done);
    });

  });

});

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
 *   155. fetchArraySize8.js
 *
 * DESCRIPTION
 *   Direct fetch (non-RS) tests querying CLOBs (for streaming) using different
 *   fetchArraySizes values & tablesizes
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

describe("155. fetchArraySize8.js", function() {

  var connection = null;
  var default_fetcArraySize = oracledb.fetchArraySize;
  var default_maxRows = oracledb.maxRows;
  var tableName = "nodb_fetchArraySize_155";

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
                     "            content    CLOB \n" +
                     "        ) \n" +
                     "    '); \n" +
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

  describe("155.1 Streaming clobs with different oracledb.fetchArraySize", function() {

    afterEach(function(done) {
      oracledb.fetchArraySize = default_fetcArraySize;
      oracledb.maxRows = default_maxRows;
      done();
    });

    var basicFetchWithGlobalOption = function(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, cb) {
      async.series([
        function(callback) {
          connection.execute(
            create_table,
            function(err){
              should.not.exist(err);
              callback() ;
            }
          );
        },
        function(callback) {
          insertData(tableSize, callback);
        },
        function(callback) {
          oracledb.fetchArraySize = fetchArraySizeVal;
          oracledb.maxRows = maxRowsVal;
          connection.execute(
            "select * from " + tableName + " where id > " + affectedID + " order by id",
            function(err, result) {
              should.not.exist(err);
              var resultLenExpected = maxRowsVal > (tableSize-affectedID) ? (tableSize-affectedID) : maxRowsVal;
              if(maxRowsVal === 0) resultLenExpected = tableSize - affectedID;
              should.strictEqual(result.rows.length, resultLenExpected);
              verifyResult(result.rows, callback);
            }
          );
        },
        function(callback) {
          connection.execute(
            drop_table,
            function(err){
              should.not.exist(err);
              callback();
            }
          );
        }
      ],cb);
    };

    it("155.1.1 maxRows > table size > oracledb.fetchArraySize", function(done) {
      var tableSize = 100;
      var fetchArraySizeVal = tableSize/2;
      var maxRowsVal = tableSize * 2;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.1.2 maxRows > oracledb.fetchArraySize > table size", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = tableSize + 10;
      var maxRowsVal = tableSize * 3;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.1.3 table size > maxRows > oracledb.fetchArraySize", function(done) {
      var tableSize = 199;
      var fetchArraySizeVal = tableSize - 80;
      var maxRowsVal = tableSize - 50;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.1.4 table size > oracledb.fetchArraySize > maxRow", function(done) {
      var tableSize = 290;
      var fetchArraySizeVal = tableSize - 90;
      var maxRowsVal = tableSize - 150;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.1.5 maxRows = oracledb.fetchArraySize < table size", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = tableSize - 3;
      var maxRowsVal = fetchArraySizeVal;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.1.6 maxRows = oracledb.fetchArraySize = table size", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = tableSize;
      var maxRowsVal = tableSize;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.1.7 maxRows = oracledb.fetchArraySize > table size", function(done) {
      var tableSize = 10;
      var fetchArraySizeVal = tableSize + 30;
      var maxRowsVal = fetchArraySizeVal;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.1.8 maxRows = oracledb.fetchArraySize/10", function(done) {
      var tableSize = 100;
      var fetchArraySizeVal = 30;
      var maxRowsVal = fetchArraySizeVal/10;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.1.9 maxRows = 10 * oracledb.fetchArraySize", function(done) {
      var tableSize = 2;
      var fetchArraySizeVal = 30;
      var maxRowsVal = fetchArraySizeVal * 10;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.1.10 maxRows > fetchArraySize, fetchArraySize = (table size)/10", function(done) {
      var tableSize = 200;
      var fetchArraySizeVal = tableSize/10;
      var maxRowsVal = fetchArraySizeVal + 50;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.1.11 maxRows = 0, fetchArraySize = table size ", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = tableSize;
      var maxRowsVal = 0;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.1.12 maxRows = (table size - 1), fetchArraySize = table size ", function(done) {
      var tableSize = 100;
      var fetchArraySizeVal = tableSize;
      var maxRowsVal = tableSize - 1;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.1.13 fetchArraySize = (table size - 1), maxRows = table size ", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = tableSize - 1;
      var maxRowsVal = tableSize;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });
  });

  describe("155.2 Streaming clobs with different execute() option fetchArraySize", function() {

    afterEach(function(done) {
      oracledb.maxRows = default_maxRows;
      done();
    });

    var basicFetchWithExecOption = function(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, cb) {
      async.series([
        function(callback) {
          connection.execute(
            create_table,
            function(err){
              should.not.exist(err);
              callback() ;
            }
          );
        },
        function(callback) {
          insertData(tableSize, callback);
        },
        function(callback) {
          oracledb.maxRows = maxRowsVal;
          connection.execute(
            "select * from " + tableName + " where id > " + affectedID + " order by id",
            [],
            {
              fetchArraySize: fetchArraySizeVal
            },
            function(err, result) {
              should.not.exist(err);
              var resultLenExpected = maxRowsVal > (tableSize-affectedID) ? (tableSize-affectedID) : maxRowsVal;
              if(maxRowsVal === 0) resultLenExpected = tableSize - affectedID;
              should.strictEqual(result.rows.length, resultLenExpected);
              verifyResult(result.rows, callback);
            }
          );
        },
        function(callback) {
          connection.execute(
            drop_table,
            function(err){
              should.not.exist(err);
              callback();
            }
          );
        }
      ],cb);
    };

    it("155.2.1 maxRows > table size > oracledb.fetchArraySize", function(done) {
      var tableSize = 100;
      var fetchArraySizeVal = tableSize - 50;
      var maxRowsVal = tableSize + 200;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.2.2 maxRows > oracledb.fetchArraySize > table size", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = tableSize + 30;
      var maxRowsVal = tableSize + 50;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.2.3 table size > maxRows > oracledb.fetchArraySize", function(done) {
      var tableSize = 199;
      var fetchArraySizeVal = tableSize - 130;
      var maxRowsVal = tableSize - 50;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.2.4 table size > oracledb.fetchArraySize > maxRow", function(done) {
      var tableSize = 290;
      var fetchArraySizeVal = tableSize - 10;
      var maxRowsVal = tableSize - 50;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.2.5 maxRows = oracledb.fetchArraySize < table size", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = tableSize - 3;
      var maxRowsVal = fetchArraySizeVal;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.2.6 maxRows = oracledb.fetchArraySize = table size", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = tableSize;
      var maxRowsVal = tableSize;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.2.7 maxRows = oracledb.fetchArraySize > table size", function(done) {
      var tableSize = 10;
      var fetchArraySizeVal = tableSize + 30;
      var maxRowsVal = fetchArraySizeVal;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.2.8 maxRows = oracledb.fetchArraySize/10", function(done) {
      var tableSize = 100;
      var fetchArraySizeVal = 30;
      var maxRowsVal = fetchArraySizeVal/10;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.2.9 maxRows = 10 * oracledb.fetchArraySize", function(done) {
      var tableSize = 2;
      var fetchArraySizeVal = 30;
      var maxRowsVal = fetchArraySizeVal * 10;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.2.10 maxRows > fetchArraySize, fetchArraySize = (table size)/10", function(done) {
      var tableSize = 200;
      var fetchArraySizeVal = tableSize/10;
      var maxRowsVal = fetchArraySizeVal + 50;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.2.11 maxRows = 0, fetchArraySize = table size ", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = tableSize;
      var maxRowsVal = 0;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.2.12 maxRows = (table size - 1), fetchArraySize = table size ", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = tableSize;
      var maxRowsVal = tableSize - 1;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("155.2.13 fetchArraySize = (table size - 1), maxRows = table size ", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = tableSize - 1;
      var maxRowsVal = tableSize;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });
  });

  var insertData = function(tableSize, cb) {
    var insert_data = "BEGIN \n" +
                      "    FOR i IN 1.." + tableSize + " LOOP \n" +
                      "         EXECUTE IMMEDIATE (' \n" +
                      "             insert into " + tableName + " values (' || i || ',''CLOB' || to_char(i) || ''') \n" +
                      "        '); \n" +
                      "    END LOOP; \n" +
                      "    commit; \n" +
                      "END; ";

    async.series([
      function(callback) {
        connection.execute(
          insert_data,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "select id from " + tableName,
          function(err, result) {
            should.not.exist(err);
            should.strictEqual(result.rows.length, tableSize);
            callback();
          }
        );
      }
    ], cb);
  };

  var verifyResult = function(rows, cb) {
    async.eachSeries(
      rows,
      verifyEachRow,
      function(err) {
        should.not.exist(err);
        return cb();
      }
    );
  };

  var verifyEachRow = function(row, cb) {
    var id = row[0];
    should.strictEqual(row[0], id);
    var lob = row[1];
    should.exist(lob);
    lob.setEncoding('utf8');
    var clobData = '';

    lob.on('data', function(chunk) {
      clobData += chunk;
    });

    lob.on('error', function(err) {
      should.not.exist(err);
    });

    lob.on('end', function(err) {
      should.not.exist(err);
      should.strictEqual(clobData, "CLOB"+String(id));
    });

    lob.on('close', function(err) {
      should.not.exist(err);
      cb(err);
    });
  };

});
/* Copyright (c) 2017, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   152. fetchArraySize5.js
 *
 * DESCRIPTION
 *   Basic test of fetching data from database with different execute() option
 *   fetchArraySize, oracledb.maxRows, and numRows.
 *   maxRows specifies maximum number of rows that are fetched by the execute()
 *   call of the Connection object when not using a ResultSet.
 *   Tests including:
 *     basic fetch tests with different fetchArraySize and oracledb.maxRows.
 *     REF CURSORS tests with different fetchArraySize and numRows.
 *     QueryStream() tests with different fetchArraySize and oracledb.maxRows.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe("152. fetchArraySize5.js", function() {

  var connection = null;
  var default_maxRows = oracledb.maxRows;
  var tableName = "nodb_fetchArraySize_152";
  var tableSize = 1000;

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
                     "    FOR i IN 1.." + tableSize + " LOOP \n" +
                     "         EXECUTE IMMEDIATE (' \n" +
                     "             insert into " + tableName + " values (' || i || ',' || to_char(i) ||') \n" +
                     "        '); \n" +
                     "    END LOOP; \n" +
                     "    commit; \n" +
                     "END; ";

  var drop_table = "DROP TABLE " + tableName + " PURGE";

  before(function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
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

  describe("152.1 basic fetch with different maxRows and fetchArraySize", function() {

    before(function(done) {
      connection.execute(
        create_table,
        function(err) {
          should.not.exist(err);
          done() ;
        }
      );
    });

    after(function(done) {
      connection.execute(
        drop_table,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    afterEach(function(done) {
      oracledb.maxRows = default_maxRows;
      done();
    });

    var basicFetch = function(fetchArraySizeVal, maxRowsVal, affectedID, cb) {
      oracledb.maxRows = maxRowsVal;
      connection.execute(
        "select * from " + tableName + " where id > " + affectedID + " order by id",
        [],
        {
          fetchArraySize: fetchArraySizeVal
        },
        function(err, result) {
          should.not.exist(err);
          var resultLenExpected = maxRowsVal > (tableSize - affectedID) ? (tableSize - affectedID) : maxRowsVal;
          if (maxRowsVal === 0) resultLenExpected = tableSize - affectedID;
          should.strictEqual(result.rows.length, resultLenExpected);
          verifyResult(result.rows, affectedID, cb);
        }
      );
    };

    var verifyResult = function(result, affectedID, callback) {
      async.forEach(result, function(element, cb) {
        var index = result.indexOf(element);
        verifyEachRow(index + 1 + affectedID, element);
        cb();
      }, function(err) {
        should.not.exist(err);
        callback();
      });
    };

    var verifyEachRow = function(index, element) {
      should.strictEqual(element[1], String(index));
      should.strictEqual(element[0], index);
    };

    it("152.1.1 maxRows > table size > fetchArraySize", function(done) {
      var fetchArraySizeVal = tableSize - 50;
      var maxRowsVal = tableSize + 10000;
      var affectedID = 20;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.1.2 maxRows > fetchArraySize > table size", function(done) {
      var fetchArraySizeVal = tableSize + 1001;
      var maxRowsVal = tableSize + 10000;
      var affectedID = 20;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.1.3 table size > maxRows > fetchArraySize", function(done) {
      var fetchArraySizeVal = tableSize - 11;
      var maxRowsVal = tableSize - 2;
      var affectedID = 0;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.1.4 table size > fetchArraySize > maxRow", function(done) {
      var fetchArraySizeVal = tableSize - 90;
      var maxRowsVal = tableSize - 150;
      var affectedID = 50;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.1.5 maxRows = fetchArraySize < table size", function(done) {
      var fetchArraySizeVal = tableSize - 110;
      var maxRowsVal = tableSize - 110;
      var affectedID = 20;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.1.6 maxRows = fetchArraySize = table size", function(done) {
      var fetchArraySizeVal = tableSize;
      var maxRowsVal = tableSize;
      var affectedID = 0;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.1.7 maxRows = fetchArraySize > table size", function(done) {
      var fetchArraySizeVal = tableSize + 9999;
      var maxRowsVal = tableSize + 9999;
      var affectedID = 10;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.1.8 maxRows = fetchArraySize/10", function(done) {
      var fetchArraySizeVal = tableSize / 10 + 1;
      var maxRowsVal = tableSize / 10;
      var affectedID = 7;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.1.9 maxRows = 10 * fetchArraySize", function(done) {
      var fetchArraySizeVal = 90;
      var maxRowsVal = 900;
      var affectedID = 50;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.1.10 maxRows > fetchArraySize, fetchArraySize = (table size)/10", function(done) {
      var fetchArraySizeVal = tableSize / 10;
      var maxRowsVal = tableSize / 10 + 1;
      var affectedID = 50;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.1.11 maxRows = 0, fetchArraySize = table size ", function(done) {
      var fetchArraySizeVal = tableSize;
      var maxRowsVal = 0;
      var affectedID = 0;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.1.12 maxRows = (table size - 1), fetchArraySize = table size ", function(done) {
      var fetchArraySizeVal = tableSize;
      var maxRowsVal = tableSize - 1;
      var affectedID = 0;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.1.13 fetchArraySize = (table size - 1), maxRows = table size ", function(done) {
      var fetchArraySizeVal = 999;
      var maxRowsVal = 1000;
      var affectedID = 0;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });
  });

  describe("152.2 REF CURSORS with different numRows and fetchArraySize", function() {

    before(function(done) {
      connection.execute(
        create_table,
        function(err) {
          should.not.exist(err);
          done() ;
        }
      );
    });

    after(function(done) {
      connection.execute(
        drop_table,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    afterEach(function(done) {
      oracledb.maxRows = default_maxRows;
      done();
    });

    var testRefCursor = function(fetchArraySizeVal, numRowsVal, cb) {
      var create_ref =  "CREATE OR REPLACE PROCEDURE testrefproc (p_out OUT SYS_REFCURSOR) " +
                        "AS " +
                        "BEGIN " +
                        "  OPEN p_out FOR " +
                        "  SELECT * FROM " + tableName  + " order by id;" +
                        "END; ";
      var drop_ref = "drop procedure testrefproc";
      var exec_ref = "BEGIN testrefproc(:o); END;";

      async.series([
        function(callback) {
          connection.execute(
            create_ref,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            exec_ref,
            [
              { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
            ],
            {
              outFormat: oracledb.OUT_FORMAT_OBJECT,
              fetchArraySize: fetchArraySizeVal
            },
            function(err, result) {
              should.not.exist(err);
              var rowCount = 0;
              fetchRowsFromRS(result.outBinds[0], numRowsVal, rowCount, callback);
            }
          );
        },
        function(callback) {
          connection.execute(
            drop_ref,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], cb);
    };

    function fetchRowsFromRS(rs, numRowsVal, rowCount, cb) {
      rs.getRows(numRowsVal, function(err, rows) {
        if (rows.length > 0) {
          for (var i = 0; i < rows.length; i++) {
            (rows.length).should.be.belowOrEqual(numRowsVal);
            rowCount = rowCount + 1;
            // console.log(rows[i][0]);
            should.strictEqual(rows[i].ID, rowCount);
            should.strictEqual(rows[i].CONTENT, rowCount.toString());
          }
          return fetchRowsFromRS(rs, numRowsVal, rowCount, cb);
        } else {
          should.strictEqual(rowCount, tableSize);
          rs.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      });
    }

    it("152.2.1 numRows > table size > fetchArraySize", function(done) {
      var fetchArraySizeVal = tableSize - 50;
      var numRowsVal = tableSize + 10000;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("152.2.2 numRows > fetchArraySize > table size", function(done) {
      var fetchArraySizeVal = tableSize + 1200;
      var numRowsVal = tableSize + 10000;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("152.2.3 table size > numRows > fetchArraySize", function(done) {
      var fetchArraySizeVal = tableSize - 21;
      var numRowsVal = tableSize - 2;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("152.2.4 table size > fetchArraySize > maxRow", function(done) {
      var fetchArraySizeVal = tableSize - 90;
      var numRowsVal = tableSize - 150;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("152.2.5 numRows = fetchArraySize < table size", function(done) {
      var fetchArraySizeVal = tableSize - 110;
      var numRowsVal = tableSize - 110;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("152.2.6 numRows = fetchArraySize = table size", function(done) {
      var fetchArraySizeVal = tableSize;
      var numRowsVal = tableSize;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("152.2.7 numRows = fetchArraySize > table size", function(done) {
      var fetchArraySizeVal = tableSize + 9999;
      var numRowsVal = tableSize + 9999;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("152.2.8 numRows = fetchArraySize/10", function(done) {
      var fetchArraySizeVal = tableSize / 10 + 1;
      var numRowsVal = tableSize / 10;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("152.2.9 numRows = 10 * fetchArraySize", function(done) {
      var fetchArraySizeVal = 90;
      var numRowsVal = 900;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("152.2.10 numRows > fetchArraySize, fetchArraySize = (table size)/10", function(done) {
      var fetchArraySizeVal = tableSize / 10;
      var numRowsVal = tableSize / 10 + 1;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("152.2.11 numRows = (table size - 1), fetchArraySize = table size", function(done) {
      var fetchArraySizeVal = tableSize;
      var numRowsVal = tableSize - 1;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("152.2.12 fetchArraySize = (table size - 1), numRows = table size", function(done) {
      var fetchArraySizeVal = tableSize - 1;
      var numRowsVal = tableSize;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });
  });

  describe("152.3 queryStream() with different maxRows and fetchArraySize", function() {

    before(function(done) {
      connection.execute(
        create_table,
        function(err) {
          should.not.exist(err);
          done() ;
        }
      );
    });

    after(function(done) {
      connection.execute(
        drop_table,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    afterEach(function(done) {
      oracledb.maxRows = default_maxRows;
      done();
    });

    var testQueryStream = function(fetchArraySizeVal, maxRowsVal, affectedID, cb) {
      oracledb.maxRows = maxRowsVal;
      var resultLenExpected = tableSize - affectedID;
      var querySql = "select * from " + tableName + " where id > " + affectedID + " order by id";
      var stream = connection.queryStream(querySql, [], {fetchArraySize: fetchArraySizeVal});

      stream.on('error', function(error) {
        should.fail(error, null, 'Error event should not be triggered');
      });

      var counter = 0;
      stream.on('data', function(data) {
        should.exist(data);
        counter = counter + 1;
        verifyResult(data, counter, affectedID);
      });

      stream.on('end', function() {
        should.equal(counter, resultLenExpected);
        stream.destroy();
      });

      stream.on('close', function() {
        cb();
      });
    };

    var verifyResult = function(data, counter, affectedID) {
      should.strictEqual(data[0], counter + affectedID);
      should.strictEqual(data[1], String(counter + affectedID));
    };

    it("152.3.1 maxRows > table size > fetchArraySize", function(done) {
      var fetchArraySizeVal = tableSize - 50;
      var maxRowsVal = tableSize + 10000;
      var affectedID = 20;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.3.2 maxRows > fetchArraySize > table size", function(done) {
      var fetchArraySizeVal = tableSize + 1001;
      var maxRowsVal = tableSize + 10000;
      var affectedID = 20;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.3.3 table size > maxRows > fetchArraySize", function(done) {
      var fetchArraySizeVal = tableSize - 31;
      var maxRowsVal = tableSize - 2;
      var affectedID = 10;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.3.4 table size > fetchArraySize > maxRow", function(done) {
      var fetchArraySizeVal = tableSize - 90;
      var maxRowsVal = tableSize - 150;
      var affectedID = 50;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.3.5 maxRows = fetchArraySize < table size", function(done) {
      var fetchArraySizeVal = tableSize - 110;
      var maxRowsVal = tableSize - 110;
      var affectedID = 20;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.3.6 maxRows = fetchArraySize = table size", function(done) {
      var fetchArraySizeVal = tableSize;
      var maxRowsVal = tableSize;
      var affectedID = 0;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.3.7 maxRows = fetchArraySize > table size", function(done) {
      var fetchArraySizeVal = tableSize + 9999;
      var maxRowsVal = tableSize + 9999;
      var affectedID = 10;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.3.8 maxRows = fetchArraySize/10", function(done) {
      var fetchArraySizeVal = tableSize / 10 + 1;
      var maxRowsVal = tableSize / 10;
      var affectedID = 0;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.3.9 maxRows = 10 * fetchArraySize", function(done) {
      var fetchArraySizeVal = 90;
      var maxRowsVal = 900;
      var affectedID = 50;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.3.10 maxRows > fetchArraySize, fetchArraySize = (table size)/10", function(done) {
      var fetchArraySizeVal = tableSize / 10;
      var maxRowsVal = tableSize / 10 + 1;
      var affectedID = 0;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.3.11 maxRows = 0, fetchArraySize = table size", function(done) {
      var fetchArraySizeVal = tableSize;
      var maxRowsVal = 0;
      var affectedID = 0;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.3.12 maxRows = (table size - 1), fetchArraySize = table size", function(done) {
      var fetchArraySizeVal = tableSize;
      var maxRowsVal = tableSize - 1;
      var affectedID = 0;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("152.3.13 fetchArraySize = (table size - 1), maxRows = table size", function(done) {
      var fetchArraySizeVal = tableSize - 1;
      var maxRowsVal = tableSize;
      var affectedID = 0;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });
  });

});

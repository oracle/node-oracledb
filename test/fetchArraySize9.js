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
 *   156. fetchArraySize9.js
 *
 * DESCRIPTION
 *   Direct fetch (non-RS) tests querying BLOBs (for streaming) using different
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
var assist   = require('./dataTypeAssist.js');

describe("156. fetchArraySize9.js", function() {

  var connection = null;
  var default_fetcArraySize = oracledb.fetchArraySize;
  var default_maxRows = oracledb.maxRows;
  var tableName = "nodb_fetchArraySize_156";
  var node6plus = false; // assume node runtime version is lower than 6

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
                     "            content    BLOB \n" +
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
      if ( process.versions["node"].substring (0, 1) >= "6")
        node6plus = true;
      done();
    });
  });

  after(function(done) {
    connection.close(function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe("156.1 Streaming blobs with different oracledb.fetchArraySize", function() {

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
          async.times(tableSize, insertData, callback);
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

    it("156.1.1 maxRows > table size > oracledb.fetchArraySize", function(done) {
      var tableSize = 100;
      var fetchArraySizeVal = 50;
      var maxRowsVal = 200;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.1.2 maxRows > oracledb.fetchArraySize > table size", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = 30;
      var maxRowsVal = 50;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.1.3 table size > maxRows > oracledb.fetchArraySize", function(done) {
      var tableSize = 199;
      var fetchArraySizeVal = 30;
      var maxRowsVal = 50;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.1.4 table size > oracledb.fetchArraySize > maxRow", function(done) {
      var tableSize = 290;
      var fetchArraySizeVal = 90;
      var maxRowsVal = 50;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.1.5 maxRows = oracledb.fetchArraySize < table size", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = 3;
      var maxRowsVal = 3;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.1.6 maxRows = oracledb.fetchArraySize = table size", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = 20;
      var maxRowsVal = 20;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.1.7 maxRows = oracledb.fetchArraySize > table size", function(done) {
      var tableSize = 10;
      var fetchArraySizeVal = 30;
      var maxRowsVal = 30;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.1.8 maxRows = oracledb.fetchArraySize/10", function(done) {
      var tableSize = 100;
      var fetchArraySizeVal = 30;
      var maxRowsVal = 10;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.1.9 maxRows = 10 * oracledb.fetchArraySize", function(done) {
      var tableSize = 2;
      var fetchArraySizeVal = 30;
      var maxRowsVal = 20;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.1.10 maxRows > fetchArraySize, fetchArraySize = (table size)/10", function(done) {
      var tableSize = 200;
      var fetchArraySizeVal = 20;
      var maxRowsVal = 50;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.1.11 maxRows = 0, fetchArraySize = table size ", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = 20;
      var maxRowsVal = 0;
      var affectedID = 0;
      basicFetchWithGlobalOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });
  });

  describe("156.2 Streaming blobs with different execute() option fetchArraySize", function() {

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
          async.times(tableSize, insertData, callback);
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

    it("156.2.1 maxRows > table size > oracledb.fetchArraySize", function(done) {
      var tableSize = 100;
      var fetchArraySizeVal = 50;
      var maxRowsVal = 200;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.2.2 maxRows > oracledb.fetchArraySize > table size", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = 30;
      var maxRowsVal = 50;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.2.3 table size > maxRows > oracledb.fetchArraySize", function(done) {
      var tableSize = 199;
      var fetchArraySizeVal = 30;
      var maxRowsVal = 50;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.2.4 table size > oracledb.fetchArraySize > maxRow", function(done) {
      var tableSize = 290;
      var fetchArraySizeVal = 90;
      var maxRowsVal = 50;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.2.5 maxRows = oracledb.fetchArraySize < table size", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = 3;
      var maxRowsVal = 3;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.2.6 maxRows = oracledb.fetchArraySize = table size", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = 20;
      var maxRowsVal = 20;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.2.7 maxRows = oracledb.fetchArraySize > table size", function(done) {
      var tableSize = 10;
      var fetchArraySizeVal = 30;
      var maxRowsVal = 30;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.2.8 maxRows = oracledb.fetchArraySize/10", function(done) {
      var tableSize = 100;
      var fetchArraySizeVal = 30;
      var maxRowsVal = 10;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.2.9 maxRows = 10 * oracledb.fetchArraySize", function(done) {
      var tableSize = 2;
      var fetchArraySizeVal = 30;
      var maxRowsVal = 20;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.2.10 maxRows > fetchArraySize, fetchArraySize = (table size)/10", function(done) {
      var tableSize = 200;
      var fetchArraySizeVal = 20;
      var maxRowsVal = 50;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("156.2.11 maxRows = 0, fetchArraySize = table size ", function(done) {
      var tableSize = 20;
      var fetchArraySizeVal = 20;
      var maxRowsVal = 0;
      var affectedID = 0;
      basicFetchWithExecOption(tableSize, fetchArraySizeVal, maxRowsVal, affectedID, done);
    });
  });

  var insertData = function(i, cb) {
    var blob = node6plus ? Buffer.from(("BLOB"+String(i+1)), "utf-8") : new Buffer(("BLOB"+String(i+1)), "utf-8");
    connection.execute(
      "insert into " + tableName + " values (:id, :b)",
      {
        id: {val: i+1, dir: oracledb.BIND_IN, type: oracledb.NUMBER},
        b: {val: blob, dir: oracledb.BIND_IN, type: oracledb.BUFFER}
      },
      function(err, result) {
        should.not.exist(err);
        (result.rowsAffected).should.be.exactly(1);
        cb(err);
      }
    );
  };

  var verifyResult = function(rows, cb) {
    async.each(
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
    var lob = row[1];
    should.exist(lob);
    var blobData = 0;
    var totalLength = 0;
    blobData = node6plus ? Buffer.alloc(0) : new Buffer(0);

    lob.on('data', function(chunk) {
      totalLength = totalLength + chunk.length;
      blobData = Buffer.concat([blobData, chunk], totalLength);
    });

    lob.on('error', function(err) {
      should.not.exist(err, "lob.on 'error' event.");
    });

    lob.on('end', function(err) {
      should.not.exist(err);
      var expected = node6plus ? Buffer.from(("BLOB"+String(id)), "utf-8") : new Buffer(("BLOB"+String(id)), "utf-8");
      should.strictEqual(assist.compare2Buffers(blobData, expected), true);
      cb(err);
    });
  };

});
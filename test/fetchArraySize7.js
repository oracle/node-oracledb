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
 *   154. fetchArraySize7.js
 *
 * DESCRIPTION
 *   Fetching data from database with different execute() option fetchArraySize when resultSet=true
 *   Tests including:
 *     getRow() tests
 *     getRows() tests
 *     interleaved calls to getRow() and getRows() tests
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbConfig = require('./dbconfig.js');

describe("154. fetchArraySize7.js", function() {

  let connection = null;
  var default_maxRows = oracledb.maxRows;
  var tableName = "nodb_fetchArraySize_154";
  var tableSize = 1000;

  const create_table = "BEGIN \n" +
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

  const drop_table = "DROP TABLE " + tableName + " PURGE";

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


  describe("154.1 getRows() of resultSet = true", function() {

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

    var testGetRow = function(fetchArraySizeVal, numRowsVal, cb) {

      connection.execute(
        "select * from " + tableName + " order by id",
        [],
        {
          resultSet: true,
          fetchArraySize: fetchArraySizeVal
        },
        function(err, result) {
          should.not.exist(err);
          var rowCount = 0;
          fetchRowsFromRS(result.resultSet, numRowsVal, rowCount, cb);
        }
      );
    };

    function fetchRowsFromRS(rs, numRowsVal, rowCount, cb) {
      rs.getRows(numRowsVal, function(err, rows) {
        (rows.length).should.be.belowOrEqual(numRowsVal);
        if (rows.length > 0) {
          for (var i = 0; i < rows.length; i++) {
            rowCount = rowCount + 1;
            should.strictEqual(rows[i][0], rowCount);
            should.strictEqual(rows[i][1], rowCount.toString());
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

    it("154.1.1 numRows > table size > fetchArraySize", function(done) {
      var fetchArraySizeVal = tableSize - 50;
      var numRowsVal = tableSize + 10000;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("154.1.2 numRows > fetchArraySize > table size", function(done) {
      var fetchArraySizeVal = tableSize + 1200;
      var numRowsVal = tableSize + 10000;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("154.1.3 table size > numRows > fetchArraySize", function(done) {
      var fetchArraySizeVal = tableSize - 91;
      var numRowsVal = tableSize - 2;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("154.1.4 table size > fetchArraySize > maxRow", function(done) {
      var fetchArraySizeVal = tableSize - 90;
      var numRowsVal = tableSize - 150;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("154.1.5 numRows = fetchArraySize < table size", function(done) {
      var fetchArraySizeVal = tableSize - 110;
      var numRowsVal = tableSize - 110;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("154.1.6 numRows = fetchArraySize = table size", function(done) {
      var fetchArraySizeVal = tableSize;
      var numRowsVal = tableSize;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("154.1.7 numRows = fetchArraySize > table size", function(done) {
      var fetchArraySizeVal = tableSize + 9999;
      var numRowsVal = tableSize + 9999;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("154.1.8 numRows = fetchArraySize/10", function(done) {
      var fetchArraySizeVal = tableSize / 10 + 1;
      var numRowsVal = tableSize / 10;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("154.1.9 numRows = 10 * fetchArraySize", function(done) {
      var fetchArraySizeVal = 90;
      var numRowsVal = 900;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("154.1.10 numRows > fetchArraySize, fetchArraySize = (table size)/10", function(done) {
      var fetchArraySizeVal = tableSize / 10;
      var numRowsVal = tableSize / 10 + 1;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("154.1.11 numRows = (table size - 1), fetchArraySize = table size", function(done) {
      var fetchArraySizeVal = tableSize;
      var numRowsVal = tableSize - 1;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

    it("154.1.12 fetchArraySize = (table size - 1), numRows = table size", function(done) {
      var fetchArraySizeVal = tableSize - 1;
      var numRowsVal = tableSize;
      testGetRow(fetchArraySizeVal, numRowsVal, done);
    });

  });

  describe("154.2 getRow() of resultSet = true", function() {

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

    var testGetRows = function(fetchArraySizeVal, cb) {
      connection.execute(
        "select * from " + tableName + " order by id",
        [],
        {
          resultSet: true,
          fetchArraySize: fetchArraySizeVal
        },
        function(err, result) {
          should.not.exist(err);
          // should.strictEqual(result.rows.length, default_maxRows);
          var rowCount = 0;
          fetchRowFromRS(result.resultSet, rowCount, cb);
        }
      );
    };

    function fetchRowFromRS(rs, rowCount, cb) {
      rs.getRow(function(err, row) {
        if (row) {
          rowCount = rowCount + 1;
          // console.log(rows[i][0]);
          should.strictEqual(row[0], rowCount);
          should.strictEqual(row[1], rowCount.toString());
          return fetchRowFromRS(rs, rowCount, cb);
        } else {
          should.strictEqual(rowCount, tableSize);
          rs.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      });
    }

    it("154.2.1 fetchArraySize = 1", function(done) {
      testGetRows(1, done);
    });

    it("154.2.2 fetchArraySize = tableSize/50", function(done) {
      testGetRows(tableSize / 50, done);
    });

    it("154.2.3 fetchArraySize = tableSize/20", function(done) {
      testGetRows(tableSize / 20, done);
    });

    it("154.2.4 fetchArraySize = tableSize/10", function(done) {
      testGetRows(tableSize / 10, done);
    });

    it("154.2.5 fetchArraySize = tableSize/5", function(done) {
      testGetRows(tableSize / 5, done);
    });

    it("154.2.6 fetchArraySize = tableSize", function(done) {
      testGetRows(tableSize, done);
    });

    it("154.2.7 fetchArraySize = (table size - 1)", function(done) {
      testGetRows(tableSize - 1, done);
    });

  });

  describe("154.3 interleaved calls to getRow() and getRows()", function() {
    var numRowsVal_1, numRowsVal_2;

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

    var testRS = function(fetchArraySizeVal, cb) {
      connection.execute(
        "select * from " + tableName + " order by id",
        [],
        {
          resultSet: true,
          fetchArraySize: fetchArraySizeVal
        },
        function(err, result) {
          should.not.exist(err);
          var rowCount = 0;
          fetchRowFromRS(result.resultSet, rowCount, cb);
        }
      );
    };

    function fetchRowFromRS(rs, rowCount, cb) {
      rs.getRow(function(err, row) {
        if (row) {
          rowCount = rowCount + 1;
          should.strictEqual(row[0], rowCount);
          should.strictEqual(row[1], rowCount.toString());
          return fetchRowsFromRS_1(rs, rowCount, cb);
        } else {
          should.strictEqual(rowCount, tableSize);
          rs.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      });
    }

    function fetchRowsFromRS_1(rs, rowCount, cb) {
      rs.getRows(numRowsVal_1, function(err, rows) {
        (rows.length).should.be.belowOrEqual(numRowsVal_1);
        if (rows.length > 0) {
          for (var i = 0; i < rows.length; i++) {
            rowCount = rowCount + 1;
            should.strictEqual(rows[i][0], rowCount);
            should.strictEqual(rows[i][1], rowCount.toString());
          }
          return fetchRowsFromRS_2(rs, rowCount, cb);
        } else {
          should.strictEqual(rowCount, tableSize);
          rs.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      });
    }

    function fetchRowsFromRS_2(rs, rowCount, cb) {
      rs.getRows(numRowsVal_2, function(err, rows) {
        (rows.length).should.be.belowOrEqual(numRowsVal_2);
        if (rows.length > 0) {
          for (var i = 0; i < rows.length; i++) {
            rowCount = rowCount + 1;
            should.strictEqual(rows[i][0], rowCount);
            should.strictEqual(rows[i][1], rowCount.toString());
          }
          return fetchRowFromRS(rs, rowCount, cb);
        } else {
          should.strictEqual(rowCount, tableSize);
          rs.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      });
    }

    it("154.3.1 fetchArraySize = 1", function(done) {
      var fetchArraySizeVal = 1;
      numRowsVal_1 = 2;
      numRowsVal_2 = 10;
      testRS(fetchArraySizeVal, done);
    });

    it("154.3.2 fetchArraySize = tableSize/50", function(done) {
      var fetchArraySizeVal = tableSize / 50;
      numRowsVal_1 = 5;
      numRowsVal_2 = 88;
      testRS(fetchArraySizeVal, done);
    });

    it("154.3.3 fetchArraySize = tableSize/20", function(done) {
      var fetchArraySizeVal = tableSize / 20;
      numRowsVal_1 = 50;
      numRowsVal_2 = 100;
      testRS(fetchArraySizeVal, done);
    });

    it("154.3.4 fetchArraySize = tableSize/10", function(done) {
      var fetchArraySizeVal = tableSize / 10;
      numRowsVal_1 = 30;
      numRowsVal_2 = 99;
      testRS(fetchArraySizeVal, done);
    });

    it("154.3.5 fetchArraySize = tableSize/5", function(done) {
      var fetchArraySizeVal = tableSize / 5;
      numRowsVal_1 = 5;
      numRowsVal_2 = 88;
      testRS(fetchArraySizeVal, done);
    });

    it("154.3.6 fetchArraySize = tableSize", function(done) {
      var fetchArraySizeVal = tableSize;
      numRowsVal_1 = 15;
      numRowsVal_2 = tableSize;
      testRS(fetchArraySizeVal, done);
    });

    it("154.3.7 fetchArraySize = (tableSize - 1)", function(done) {
      var fetchArraySizeVal = tableSize - 1;
      numRowsVal_1 = tableSize - 1;
      numRowsVal_2 = tableSize;
      testRS(fetchArraySizeVal, done);
    });

  });

});

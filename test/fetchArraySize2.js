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
 *   149. fetchArraySize2.js
 *
 * DESCRIPTION
 *   Basic test of fetching data from database with different oracledb.fetchArraySize, oracledb.maxRows, numRows.
 *   maxRows specifies maximum number of rows that are fetched by the execute() call of the
 *   Connection object when not using a ResultSet.
 *   Tests including:
 *     basic fetch tests with different oracledb.fetchArraySize and oracledb.maxRows.
 *     REF CURSORS tests with different oracledb.fetchArraySize and numRows.
 *     QueryStream() tests with different oracledb.fetchArraySize and oracledb.maxRows.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const async    = require('async');
const dbConfig = require('./dbconfig.js');

describe("149. fetchArraySize2.js", function() {

  let connection = null;
  const default_fetcArraySize = oracledb.fetchArraySize;
  const default_maxRows = oracledb.maxRows;
  const tableName = "nodb_fetchArraySize_149";
  const tableSize = 1000;

  const create_table = `BEGIN
                         DECLARE
                             e_table_missing EXCEPTION;
                             PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
                         BEGIN
                             EXECUTE IMMEDIATE('DROP TABLE ` + tableName + ` PURGE');
                         EXCEPTION
                             WHEN e_table_missing
                             THEN NULL;
                         END;
                         EXECUTE IMMEDIATE ('
                             CREATE TABLE ` + tableName + ` (
                                 id         NUMBER,
                                 content    VARCHAR(2000)
                             )
                         ');
                         FOR i IN 1..` + tableSize + ` LOOP
                              EXECUTE IMMEDIATE ('
                                  INSERT INTO ` + tableName + ` VALUES (' || i || ',' || TO_CHAR(i) ||')
                             ');
                         END LOOP;
                         commit;
                       END;`;

  const drop_table = "DROP TABLE " + tableName + " PURGE";

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

  describe("149.1 basic fetch with different maxRows and oracledb.fetchArraySize", function() {

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
      oracledb.fetchArraySize = default_fetcArraySize;
      oracledb.maxRows = default_maxRows;
      done();
    });

    const basicFetch = function(fetchArraySizeVal, maxRowsVal, affectedID, cb) {
      oracledb.fetchArraySize = fetchArraySizeVal;
      oracledb.maxRows = maxRowsVal;
      connection.execute(
        "SELECT * FROM " + tableName + " WHERE id > " + affectedID + " ORDER BY id",
        function(err, result) {
          should.not.exist(err);
          let resultLenExpected = maxRowsVal > (tableSize - affectedID) ? (tableSize - affectedID) : maxRowsVal;
          if (maxRowsVal === 0) resultLenExpected = tableSize - affectedID;
          should.strictEqual(result.rows.length, resultLenExpected);
          verifyResult(result.rows, affectedID, cb);
        }
      );
    };

    const verifyResult = function(result, affectedID, callback) {
      async.forEach(result, function(element, cb) {
        const index = result.indexOf(element);
        verifyEachRow(index + 1 + affectedID, element);
        cb();
      }, function(err) {
        should.not.exist(err);
        callback();
      });
    };

    const verifyEachRow = function(index, element) {
      should.strictEqual(element[1], String(index));
      should.strictEqual(element[0], index);
    };

    it("149.1.1 maxRows > table size > oracledb.fetchArraySize", function(done) {
      const fetchArraySizeVal = tableSize - 1;
      const maxRowsVal = tableSize + 1;
      const affectedID = 0;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.1.2 maxRows > oracledb.fetchArraySize > table size", function(done) {
      const fetchArraySizeVal = tableSize - 99;
      const maxRowsVal = tableSize - 7;
      const affectedID = 20;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.1.3 table size > maxRows > oracledb.fetchArraySize", function(done) {
      const fetchArraySizeVal = tableSize - 100;
      const maxRowsVal = tableSize - 2;
      const affectedID = 10;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.1.4 table size > oracledb.fetchArraySize > maxRow", function(done) {
      const fetchArraySizeVal = tableSize - 3;
      const maxRowsVal = tableSize - 77;
      const affectedID = 50;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.1.5 maxRows = oracledb.fetchArraySize < table size", function(done) {
      const fetchArraySizeVal = tableSize - 110;
      const maxRowsVal = tableSize - 110;
      const affectedID = 20;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.1.6 maxRows = oracledb.fetchArraySize = table size", function(done) {
      const fetchArraySizeVal = tableSize;
      const maxRowsVal = tableSize;
      const affectedID = 0;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.1.7 maxRows = oracledb.fetchArraySize > table size", function(done) {
      const fetchArraySizeVal = tableSize + 9999;
      const maxRowsVal = tableSize + 9999;
      const affectedID = 10;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.1.8 maxRows = oracledb.fetchArraySize/10", function(done) {
      const fetchArraySizeVal = tableSize / 10 - 1;
      const maxRowsVal = tableSize / 10;
      const affectedID = 0;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.1.9 maxRows = 10 * oracledb.fetchArraySize", function(done) {
      const fetchArraySizeVal = 90;
      const maxRowsVal = 900;
      const affectedID = 50;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.1.10 maxRows > fetchArraySize, fetchArraySize = (table size)/10", function(done) {
      const fetchArraySizeVal = tableSize / 10;
      const maxRowsVal = tableSize / 10 + 1;
      const affectedID = 0;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.1.11 maxRows = 0, fetchArraySize = table size ", function(done) {
      const fetchArraySizeVal = tableSize;
      const maxRowsVal = 0;
      const affectedID = 0;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.1.12 maxRows = 9999999, fetchArraySize = table size ", function(done) {
      const fetchArraySizeVal = tableSize;
      const maxRowsVal = 9999999;
      const affectedID = 0;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.1.13 maxRows = (table size - 1), fetchArraySize = table size ", function(done) {
      const fetchArraySizeVal = tableSize;
      const maxRowsVal = tableSize - 1;
      const affectedID = 0;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.1.14 fetchArraySize = (table size - 1), maxRows = table size ", function(done) {
      const fetchArraySizeVal = tableSize - 1;
      const maxRowsVal = tableSize;
      const affectedID = 0;
      basicFetch(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });
  });

  describe("149.2 REF CURSORS with different numRows and oracledb.fetchArraySize", function() {

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
      oracledb.fetchArraySize = default_fetcArraySize;
      oracledb.maxRows = default_maxRows;
      done();
    });

    const testRefCursor = function(fetchArraySizeVal, numRowsVal, cb) {
      const create_ref = `CREATE OR REPLACE PROCEDURE testrefproc (p_out OUT SYS_REFCURSOR)
                          AS
                          BEGIN
                            OPEN p_out FOR
                            SELECT * FROM ` + tableName  + ` order by id;
                          END;`;
      const drop_ref = "DROP PROCEDURE testrefproc";
      const exec_ref = "BEGIN testrefproc(:o); END;";

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
          oracledb.fetchArraySize = fetchArraySizeVal;
          connection.execute(
            exec_ref,
            [
              { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
            ],
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
            function(err, result) {
              should.not.exist(err);
              const rowCount = 0;
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
          for (let i = 0; i < rows.length; i++) {
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

    it("149.2.1 numRows > table size > oracledb.fetchArraySize", function(done) {
      const fetchArraySizeVal = tableSize - 1;
      const numRowsVal = tableSize + 1;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("149.2.2 numRows > oracledb.fetchArraySize > table size", function(done) {
      const fetchArraySizeVal = tableSize + 7;
      const numRowsVal = tableSize + 77;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("149.2.3 table size > numRows > oracledb.fetchArraySize", function(done) {
      const fetchArraySizeVal = tableSize - 11;
      const numRowsVal = tableSize - 2;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("149.2.4 table size > oracledb.fetchArraySize > maxRow", function(done) {
      const fetchArraySizeVal = tableSize - 90;
      const numRowsVal = tableSize - 150;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("149.2.5 numRows = oracledb.fetchArraySize < table size", function(done) {
      const fetchArraySizeVal = tableSize - 110;
      const numRowsVal = tableSize - 110;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("149.2.6 numRows = oracledb.fetchArraySize = table size", function(done) {
      const fetchArraySizeVal = tableSize;
      const numRowsVal = tableSize;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("149.2.7 numRows = oracledb.fetchArraySize > table size", function(done) {
      const fetchArraySizeVal = tableSize + 9999;
      const numRowsVal = tableSize + 9999;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("149.2.8 numRows = oracledb.fetchArraySize/10", function(done) {
      const fetchArraySizeVal = tableSize / 10 + 1;
      const numRowsVal = tableSize / 10;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("149.2.9 numRows = 10 * oracledb.fetchArraySize", function(done) {
      const fetchArraySizeVal = 90;
      const numRowsVal = 900;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("149.2.10 numRows > fetchArraySize, fetchArraySize = (table size)/10", function(done) {
      const fetchArraySizeVal = tableSize / 10;
      const numRowsVal = tableSize / 10 + 1;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("149.2.11 numRows = (table size - 1), fetchArraySize = table size", function(done) {
      const fetchArraySizeVal = tableSize;
      const numRowsVal = tableSize - 1;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });

    it("149.2.12 fetchArraySize = (table size - 1), numRows = table size", function(done) {
      const fetchArraySizeVal = tableSize - 1;
      const numRowsVal = tableSize;
      testRefCursor(fetchArraySizeVal, numRowsVal, done);
    });
  });

  describe("149.3 queryStream() with different maxRows and oracledb.fetchArraySize", function() {

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
      oracledb.fetchArraySize = default_fetcArraySize;
      oracledb.maxRows = default_maxRows;
      done();
    });

    const testQueryStream = function(fetchArraySizeVal, maxRowsVal, affectedID, cb) {
      oracledb.fetchArraySize = fetchArraySizeVal;
      oracledb.maxRows = maxRowsVal;
      const resultLenExpected = tableSize - affectedID;
      const querySql = "select * from " + tableName + " where id > " + affectedID + " order by id";
      const stream = connection.queryStream(querySql);

      stream.on('error', function(error) {
        should.fail(error, null, 'Error event should not be triggered');
      });

      let counter = 0;
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

    const verifyResult = function(data, counter, affectedID) {
      should.strictEqual(data[0], counter + affectedID);
      should.strictEqual(data[1], String(counter + affectedID));
    };

    it("149.3.1 maxRows > table size > oracledb.fetchArraySize", function(done) {
      const fetchArraySizeVal = tableSize - 1;
      const maxRowsVal = tableSize + 1;
      const affectedID = 0;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.3.2 maxRows > oracledb.fetchArraySize > table size", function(done) {
      const fetchArraySizeVal = tableSize + 101;
      const maxRowsVal = tableSize + 1000;
      const affectedID = 20;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.3.3 table size > maxRows > oracledb.fetchArraySize", function(done) {
      const fetchArraySizeVal = tableSize - 11;
      const maxRowsVal = tableSize - 2;
      const affectedID = 0;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.3.4 table size > oracledb.fetchArraySize > maxRow", function(done) {
      const fetchArraySizeVal = tableSize - 90;
      const maxRowsVal = tableSize - 150;
      const affectedID = 50;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.3.5 maxRows = oracledb.fetchArraySize < table size", function(done) {
      const fetchArraySizeVal = tableSize - 110;
      const maxRowsVal = tableSize - 110;
      const affectedID = 20;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.3.6 maxRows = oracledb.fetchArraySize = table size", function(done) {
      const fetchArraySizeVal = tableSize;
      const maxRowsVal = tableSize;
      const affectedID = 0;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.3.7 maxRows = oracledb.fetchArraySize > table size", function(done) {
      const fetchArraySizeVal = tableSize + 9999;
      const maxRowsVal = tableSize + 9999;
      const affectedID = 10;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.3.8 maxRows = oracledb.fetchArraySize/10", function(done) {
      const fetchArraySizeVal = tableSize / 10 + 1;
      const maxRowsVal = tableSize / 10;
      const affectedID = 0;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.3.9 maxRows = 10 * oracledb.fetchArraySize", function(done) {
      const fetchArraySizeVal = 90;
      const maxRowsVal = 900;
      const affectedID = 50;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.3.10 maxRows > fetchArraySize, fetchArraySize = (table size)/10", function(done) {
      const fetchArraySizeVal = tableSize / 10;
      const maxRowsVal = tableSize / 10 + 1;
      const affectedID = 50;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.3.11 maxRows = 0, fetchArraySize = table size", function(done) {
      const fetchArraySizeVal = tableSize;
      const maxRowsVal = 0;
      const affectedID = 0;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.3.12 maxRows = 9999999, fetchArraySize = table size", function(done) {
      const fetchArraySizeVal = tableSize;
      const maxRowsVal = 9999999;
      const affectedID = 0;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.3.13 maxRows = (table size - 1), fetchArraySize = table size ", function(done) {
      const fetchArraySizeVal = tableSize;
      const maxRowsVal = tableSize - 1;
      const affectedID = 0;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });

    it("149.3.14 fetchArraySize = (table size - 1), maxRows = table size ", function(done) {
      const fetchArraySizeVal = tableSize - 1;
      const maxRowsVal = tableSize;
      const affectedID = 0;
      testQueryStream(fetchArraySizeVal, maxRowsVal, affectedID, done);
    });
  });

});

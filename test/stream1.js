/* Copyright (c) 2016, 2017 Oracle and/or its affiliates. All rights reserved. */

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
 *   13. stream1.js
 *
 * DESCRIPTION
 *   Testing driver query results via stream feature.
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

describe('13. stream1.js', function () {

  this.timeout(100000);

  var connection = null;
  var rowsAmount = 217;

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
      function createTab(cb) {
        var proc = "BEGIN \n" +
                   "    DECLARE \n" +
                   "        e_table_missing EXCEPTION; \n" +
                   "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
                   "    BEGIN \n" +
                   "        EXECUTE IMMEDIATE ('DROP TABLE nodb_stream1 PURGE'); \n" +
                   "    EXCEPTION \n" +
                   "        WHEN e_table_missing \n" +
                   "        THEN NULL; \n" +
                   "    END; \n" +
                   "    EXECUTE IMMEDIATE (' \n" +
                   "        CREATE TABLE nodb_stream1 ( \n" +
                   "            employee_id NUMBER, \n" +
                   "            employee_name VARCHAR2(20), \n" +
                   "            employee_history CLOB \n" +
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
      function insertRows(cb) {
        var proc = "DECLARE \n" +
                   "    x NUMBER := 0; \n" +
                   "    n VARCHAR2(20); \n" +
                   "    clobData CLOB; \n" +
                   "BEGIN \n" +
                   "    FOR i IN 1..217 LOOP \n" +
                   "        x := x + 1; \n" +
                   "        n := 'staff ' || x; \n" +
                   "        INSERT INTO nodb_stream1 VALUES (x, n, EMPTY_CLOB()) RETURNING employee_history INTO clobData; \n" +
                   "        DBMS_LOB.WRITE(clobData, 20, 1, '12345678901234567890'); \n" +
                   "    END LOOP; \n" +
                   "end; ";

        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      }
    ], done);
  }); // before

  after(function(done) {
    async.series([
      function(callback) {
        connection.execute(
          "DROP TABLE nodb_stream1 PURGE",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        connection.release(function(err) {
          should.not.exist(err);
          callback();
        });
      },
    ], done);
  }); // after

  describe('13.1 Testing QueryStream', function () {
    it('13.1.1 stream results for oracle connection', function (done) {
      var stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');

      stream.on('error', function (error) {
        should.fail(error, null, 'Error event should not be triggered');
      });

      var counter = 0;
      stream.on('data', function (data) {
        should.exist(data);
        counter++;
      });

      stream.on('end', function () {
        should.equal(counter, rowsAmount);

        done();
      });
    });

    it('13.1.2 stream results for oracle connection (outFormat: oracledb.OBJECT)', function (done) {
      var stream = connection.queryStream(
        'SELECT employee_name FROM nodb_stream1 ORDER BY employee_name',
        {},
        { outFormat: oracledb.OBJECT }
      );

      stream.on('error', function (error) {
        should.fail(error, null, 'Error event should not be triggered');
      });

      var counter = 0;
      stream.on('data', function (data) {
        should.exist(data);
        counter++;
      });

      stream.on('end', function () {
        should.equal(counter, rowsAmount);
        done();
      });
    });

    it('13.1.3 errors in query', function (done) {
      var stream = connection.queryStream('SELECT no_such_column FROM nodb_stream1');

      stream.on('error', function (err) {
        should.exist(err);
        done();
      });

      stream.on('data', function (data) {
        should.fail(data, null, 'Data event should not be triggered');
      });
    });

    it('13.1.4 no result', function (done) {

      var stream = connection.queryStream('SELECT * FROM nodb_stream1 WHERE employee_name = :name', {
        name: 'TEST_NO_RESULT'
      });

      stream.on('error', function (error) {
        should.fail(error, null, 'Error event should not be triggered: ' + error);
      });

      var counter = 0;
      stream.on('data', function (data) {
        should.fail(data, null, 'Data event should not be triggered');
      });

      stream.on('end', function () {
        should.equal(counter, 0);
        done();
      });
    });

    it('13.1.5 single row', function (done) {

      var stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 WHERE employee_name = :name', {
        name: 'staff 10'
      });

      stream.on('error', function (error) {
        should.fail(error, null, 'Error event should not be triggered: ' + error);
      });

      var counter = 0;
      stream.on('data', function (data) {
        should.exist(data);
        should.deepEqual(data, ['staff 10']);

        counter++;
      });

      stream.on('end', function () {
        should.equal(counter, 1);
        done();
      });
    });

    it('13.1.6 multiple row', function (done) {
      var stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 WHERE employee_id <= :maxId ORDER BY employee_id', {
        maxId: 10
      }, {
        outFormat: oracledb.OBJECT
      });

      stream.on('error', function (error) {
        should.fail(error, null, 'Error event should not be triggered: ' + error);
      });

      var counter = 0;
      stream.on('data', function (data) {
        should.exist(data);
        should.deepEqual(data, {
          EMPLOYEE_NAME: 'staff ' + (counter + 1)
        });
        counter++;
      });

      stream.on('end', function () {
        should.equal(counter, 10);
        done();
      });
    });

    it('13.1.7 invalid SQL', function (done) {
      var stream = connection.queryStream(
        'UPDATE nodb_stream1 SET employee_name = :name WHERE employee_id = :id',
        {
          id: 10,
          name: 'test_update'
        },
        {
          outFormat: oracledb.OBJECT
        }
      );

      stream.on('error', function (error) {
        should.exist(error);
        done();
      });

      stream.on('data', function (data) {
        should.fail(data, null, 'Data event should not be triggered');
      });
    });

    it('13.1.8 Read CLOBs', function (done) {
      connection.should.be.ok();

      var stream = connection.queryStream(
        'SELECT employee_name, employee_history FROM nodb_stream1 where employee_id <= :maxId ORDER BY employee_id',
        { maxId: 10 },
        { outFormat: oracledb.OBJECT }
      );

      stream.on('error', function (error) {
        should.fail(error, null, 'Error event should not be triggered: ' + error);
      });

      var counter = 0;
      var clobs = [];
      var clobsRead = 0;
      stream.on('data', function (data) {
        var rowIndex = counter;

        should.exist(data);
        should.equal(data.EMPLOYEE_NAME, 'staff ' + (rowIndex + 1));

        should.exist(data.EMPLOYEE_HISTORY);
        should.equal(data.EMPLOYEE_HISTORY.constructor.name, 'Lob');

        var clob = [];
        data.EMPLOYEE_HISTORY.setEncoding('utf8');
        data.EMPLOYEE_HISTORY.on('data', function (data) {
          clob.push(data);
        });

        data.EMPLOYEE_HISTORY.on('end', function () {
          clobs[rowIndex] = clob.join('');
          should.equal(clobs[rowIndex], '12345678901234567890');

          clobsRead++;

          if (clobsRead === 10) {
            should.equal(counter, 10);
            done();
          }
        });

        counter++;
      });

      stream.on('end', function () {
        should.equal(counter, 10);
      });
    });

    it('13.1.9 Read CLOBs after stream close', function (done) {

      var stream = connection.queryStream('SELECT employee_name, employee_history FROM nodb_stream1 where employee_id <= :maxId ORDER BY employee_id', {
        maxId: 10
      }, {
        outFormat: oracledb.OBJECT
      });

      stream.on('error', function (error) {
        should.fail(error, null, 'Error event should not be triggered: ' + error);
      });

      var counter = 0;
      var clobs = [];
      var clobsRead = 0;

      stream.on('data', function (data) {
        var rowIndex = counter;

        should.exist(data);
        should.equal(data.EMPLOYEE_NAME, 'staff ' + (rowIndex + 1));

        should.exist(data.EMPLOYEE_HISTORY);
        should.equal(data.EMPLOYEE_HISTORY.constructor.name, 'Lob');

        var clob = [];
        data.EMPLOYEE_HISTORY.setEncoding('utf8');

        setTimeout(function () {
          data.EMPLOYEE_HISTORY.on('data', function (data) {
            clob.push(data);
          });

          data.EMPLOYEE_HISTORY.on('end', function () {
            clobs[rowIndex] = clob.join('');
            should.equal(clobs[rowIndex], '12345678901234567890');

            clobsRead++;

            if (clobsRead === 10) {
              should.equal(counter, 10);
              done();
            }
          });
        }, 50);

        counter++;
      });

      stream.on('end', function () {
        should.equal(counter, 10);
      });
    });

    it('13.1.10 meta data', function (done) {

      var stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 WHERE employee_name = :name', {
        name: 'staff 10'
      });

      var metaDataRead = false;
      stream.on('metadata', function (metaData) {
        should.deepEqual(metaData, [
          {
            name: 'EMPLOYEE_NAME'
          }
        ]);
        metaDataRead = true;
      });

      stream.on('error', function (error) {
        should.fail(error, null, 'Error event should not be triggered: ' + error);
      });

      stream.on('data', function () {
        should.equal(metaDataRead, true);
      });

      stream.on('end', function () {
        should.equal(metaDataRead, true);
        done();
      });
    });

    it('13.1.11 stream stress test', function (done) {

      var stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');

      stream.on('error', function (error) {
        should.fail(error, null, 'Error event should not be triggered');
      });

      var counter = 0;
      var allData = [];
      stream.on('data', function (data) {
        should.exist(data);
        allData.push(data);
        counter++;
      });

      stream.on('end', function () {
        should.equal(counter, rowsAmount);

        var testDone = 0;
        var subTest = function (callback) {
          var query = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');

          query.on('error', function (error) {
            should.fail(error, null, 'Error event should not be triggered');
          });

          var testCounter = 0;
          var testData = [];
          query.on('data', function (data) {
            should.exist(data);
            testData.push(data);
            testCounter++;
          });

          query.on('end', function () {
            should.equal(testCounter, rowsAmount);
            should.deepEqual(testData, allData);

            testDone++;
            callback();
          });
        };
        var tests = [];
        var i;
        for (i = 0; i < 50; i++) {  // larger values can cause 'ORA-01000: maximum open cursors exceeded'
          tests.push(subTest);
        }
        async.parallel(tests, function () {
          should.equal(testDone, tests.length);

          done();
        });
      });
    });
  });

  describe('13.2 Testing QueryStream._close', function () {
    it('13.2.1 should be able to stop the stream early with _close', function (done) {

      var stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');

      stream.on('data', function () {
        stream.pause();
        stream._close();
      });

      stream.on('close', function() {
        done();
      });

      stream.on('end', function () {
        done(new Error('Reached the end of the stream'));
      });

      stream.on('error', function (err) {
        done(err);
      });
    });

    it('13.2.2 should be able to stop the stream before any data', function (done) {

      var stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');

      stream.on('close', function() {
        done();
      });

      // Close is synchronous so it needs to be called after the close listener is added.
      stream._close();

      stream.on('data', function () {
        done(new Error('Received data'));
      });

      stream.on('end', function () {
        done(new Error('Reached the end of the stream'));
      });

      stream.on('error', function (err) {
        done(err);
      });
    });

    it('13.2.3 should invoke an optional callback passed to _close', function (done) {

      var stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');

      stream._close(function() {
        done();
      });

      stream.on('data', function () {
        done(new Error('Received data'));
      });

      stream.on('end', function () {
        done(new Error('Reached the end of the stream'));
      });

      stream.on('error', function (err) {
        done(err);
      });
    });
  });

  describe('13.3 Testing QueryStream\'s maxRows control', function () {
    it('13.3.1 should use oracledb.maxRows for fetching', function (done) {
      var defaultMaxRows;
      var testMaxRows = 9;

      defaultMaxRows = oracledb.maxRows;
      oracledb.maxRows = testMaxRows;
      var stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');

      stream.on('data', function () {
        stream.pause();

        // Using the internal/private caches to validate
        should.equal(stream._fetchedRows.length, testMaxRows - (1 + stream._readableState.buffer.length));
        stream._close();
      });

      stream.on('close', function() {
        oracledb.maxRows = defaultMaxRows;
        done();
      });

      stream.on('end', function () {
        done(new Error('Reached the end of the stream'));
      });

      stream.on('error', function (err) {
        done(err);
      });
    });

    it('13.3.2 Negative - should fail with NJS-026 if oracledb.maxRows is zero', function (done) {
      var defaultMaxRows;
      var testMaxRows = 0;

      defaultMaxRows = oracledb.maxRows;
      should.throws(
        function() {
          oracledb.maxRows = testMaxRows;
        },
        /NJS-026: maxRows must be greater than zero/
      );
      oracledb.maxRows = defaultMaxRows;
      done();
    }); // 13.3.2
  });
});

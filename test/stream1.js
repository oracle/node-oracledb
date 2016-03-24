/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

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
  var connection = false;

  if (dbConfig.externalAuth) {
    var credential = {externalAuth: true, connectString: dbConfig.connectString};
  } else {
    var credential = dbConfig;
  }

  var createTable =
        "BEGIN \
            DECLARE \
                e_table_exists EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_exists, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE nodb_employees'); \
            EXCEPTION \
                WHEN e_table_exists \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE nodb_employees ( \
                    employees_id NUMBER,  \
                    employees_name VARCHAR2(20), \
                    employees_history CLOB \
                ) \
            '); \
        END; ";

  var insertRows =
        "DECLARE \
            x NUMBER := 0; \
            n VARCHAR2(20); \
            clobData CLOB;\
         BEGIN \
            FOR i IN 1..217 LOOP \
               x := x + 1; \
               n := 'staff ' || x; \
               INSERT INTO nodb_employees VALUES (x, n, EMPTY_CLOB()) RETURNING employees_history INTO clobData; \
               \
               DBMS_LOB.WRITE(clobData, 20, 1, '12345678901234567890');\
            END LOOP; \
         END; ";
  var rowsAmount = 217;

  before(function (done) {
    oracledb.getConnection(credential, function (err, conn) {
      if (err) {
        console.error(err);
        return;
      }
      connection = conn;
      connection.execute(createTable, function (err) {
        if (err) {
          console.error(err);
          return;
        }
        connection.execute(insertRows, function (err) {
          if (err) {
            console.error(err);
            return;
          }
          done();
        });
      });
    });
  });

  after(function (done) {
    connection.execute(
      'DROP TABLE nodb_employees',
      function (err) {
        if (err) {
          console.error(err.message);
          return;
        }
        connection.release(function (err) {
          if (err) {
            console.error(err.message);
            return;
          }
          done();
        });
      }
    );
  });

  describe('13.1 Testing ResultSet stream', function () {
    it('13.1.1 stream results for oracle connection', function (done) {
      connection.should.be.ok;

      var stream = connection.queryStream('SELECT employees_name FROM nodb_employees');

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

        setTimeout(done, 500);
      });
    });

    it('13.1.2 stream results for oracle connection (outFormat: oracledb.OBJECT)', function (done) {
      connection.should.be.ok;

      var stream = connection.queryStream('SELECT employees_name FROM nodb_employees', {}, {
        outFormat: oracledb.OBJECT
      });

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

        setTimeout(done, 500);
      });
    });

    it('13.1.3 errors in query', function (done) {
      connection.should.be.ok;

      var stream = connection.queryStream('SELECT no_such_column FROM nodb_employees');

      stream.on('error', function (error) {
        should.exist(error);
        setTimeout(done, 500);
      });

      stream.on('data', function (data) {
        should.fail(data, null, 'Data event should not be triggered');
      });
    });

    it('13.1.4 no result', function (done) {
      connection.should.be.ok;

      var stream = connection.queryStream('SELECT * FROM nodb_employees WHERE employees_name = :name', {
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

        setTimeout(done, 500);
      });
    });

    it('13.1.5 single row', function (done) {
      connection.should.be.ok;

      var stream = connection.queryStream('SELECT employees_name FROM nodb_employees WHERE employees_name = :name', {
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

        setTimeout(done, 500);
      });
    });

    it('13.1.6 multiple row', function (done) {
      connection.should.be.ok;

      var stream = connection.queryStream('SELECT employees_name FROM nodb_employees WHERE employees_id <= :maxId ORDER BY employees_id', {
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
          EMPLOYEES_NAME: 'staff ' + (counter + 1)
        });

        counter++;
      });

      stream.on('end', function () {
        should.equal(counter, 10);

        setTimeout(done, 500);
      });
    });

    it('13.1.7 invalid SQL', function (done) {
      connection.should.be.ok;

      var stream = connection.queryStream('UPDATE nodb_employees SET employees_name = :name WHERE employees_id  :id', {
        id: 10,
        name: 'test_update'
      }, {
        outFormat: oracledb.OBJECT
      });

      stream.on('error', function (error) {
        should.exist(error);

        setTimeout(done, 500);
      });

      stream.on('data', function (data) {
        should.fail(data, null, 'Data event should not be triggered');
      });
    });

    it('13.1.8 Read CLOBs', function (done) {
      connection.should.be.ok;

      var stream = connection.queryStream('SELECT employees_name, employees_history FROM nodb_employees where employees_id <= :maxId ORDER BY employees_id', {
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
        should.equal(data.EMPLOYEES_NAME, 'staff ' + (rowIndex + 1));

        should.exist(data.EMPLOYEES_HISTORY);
        should.equal(data.EMPLOYEES_HISTORY.constructor.name, 'Lob');

        var clob = [];
        data.EMPLOYEES_HISTORY.setEncoding('utf8');
        data.EMPLOYEES_HISTORY.on('data', function (data) {
          clob.push(data);
        });

        data.EMPLOYEES_HISTORY.on('end', function () {
          clobs[rowIndex] = clob.join('');
          should.equal(clobs[rowIndex], '12345678901234567890');

          clobsRead++;

          if (clobsRead === 10) {
            should.equal(counter, 10);

            setTimeout(done, 500);
          }
        });

        counter++;
      });

      stream.on('end', function () {
        should.equal(counter, 10);
      });
    });

    it('13.1.9 Read CLOBs after stream close', function (done) {
      connection.should.be.ok;

      this.timeout(10000);

      var stream = connection.queryStream('SELECT employees_name, employees_history FROM nodb_employees where employees_id <= :maxId ORDER BY employees_id', {
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
        should.equal(data.EMPLOYEES_NAME, 'staff ' + (rowIndex + 1));

        should.exist(data.EMPLOYEES_HISTORY);
        should.equal(data.EMPLOYEES_HISTORY.constructor.name, 'Lob');

        var clob = [];
        data.EMPLOYEES_HISTORY.setEncoding('utf8');

        setTimeout(function () {
          data.EMPLOYEES_HISTORY.on('data', function (data) {
            clob.push(data);
          });

          data.EMPLOYEES_HISTORY.on('end', function () {
            clobs[rowIndex] = clob.join('');
            should.equal(clobs[rowIndex], '12345678901234567890');

            clobsRead++;

            if (clobsRead === 10) {
              should.equal(counter, 10);

              setTimeout(done, 500);
            }
          });
        }, 5000);

        counter++;
      });

      stream.on('end', function () {
        should.equal(counter, 10);
      });
    });

    it('13.1.10 meta data', function (done) {
      connection.should.be.ok;

      var stream = connection.queryStream('SELECT employees_name FROM nodb_employees WHERE employees_name = :name', {
        name: 'staff 10'
      });

      var metaDataRead = false;
      stream.on('metadata', function (metaData) {
        should.deepEqual(metaData, [
          {
            name: 'EMPLOYEES_NAME'
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

        setTimeout(done, 500);
      });
    });

    it('13.1.11 stream stress test', function (done) {
      this.timeout(30000);

      connection.should.be.ok;

      var stream = connection.queryStream('SELECT employees_name FROM nodb_employees');

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
          var query = connection.queryStream('SELECT employees_name FROM nodb_employees');

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
        })
      });
    });
  });
});

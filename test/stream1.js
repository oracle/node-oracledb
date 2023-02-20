/* Copyright (c) 2016, 2022, Oracle and/or its affiliates. */

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
 * NAME
 *   13. stream1.js
 *
 * DESCRIPTION
 *   Testing driver query results via stream feature.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const async    = require('async');
const dbConfig = require('./dbconfig.js');

// Need to skip some tests if Node.js version is < 8
const nodeMajorVersion = Number(process.versions.node.split('.')[0]);

describe('13. stream1.js', function() {

  let connection = null;
  let rowsAmount = 217;

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
        let proc = "BEGIN \n" +
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
        const proc = `DECLARE
                       x NUMBER := 0;
                       n VARCHAR2(20);
                      BEGIN
                          FOR i IN 1..217 LOOP
                              x := x + 1;
                              n := 'staff ' || x;
                              INSERT INTO nodb_stream1 VALUES (x, n, x||'12345678901234567890');
                          END LOOP;
                      END;`;

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

  describe('13.1 Testing QueryStream', function() {

    async function readLob(rowIndex, clobloc) {
      should.equal(clobloc.constructor.name, 'Lob');

      const doLobStreamHelper = new Promise((resolve, reject) => {

        clobloc.setEncoding('utf8');

        clobloc.on('error', (err) => {
          reject(err);
        });

        clobloc.on('data', (data) => {
          should.equal(data, (rowIndex + 1) + '12345678901234567890');
        });

        clobloc.on('end', () => {
          clobloc.destroy();
        });

        clobloc.on('close', () => {
          resolve();
        });
      });

      await doLobStreamHelper;
    }

    it('13.1.1 stream results for oracle connection', function(done) {
      let stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');

      stream.on('error', function(error) {
        should.fail(error, null, 'Error event should not be triggered');
      });

      let counter = 0;
      stream.on('data', function(data) {
        should.exist(data);
        counter++;
      });

      stream.on('end', function() {
        should.equal(counter, rowsAmount);
        stream.destroy();
      });

      stream.on('close', function() {
        done();
      });
    });

    it('13.1.2 stream results for oracle connection (outFormat: oracledb.OUT_FORMAT_OBJECT)', function(done) {
      let stream = connection.queryStream(
        'SELECT employee_name FROM nodb_stream1 ORDER BY employee_name',
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      stream.on('error', function(error) {
        should.fail(error, null, 'Error event should not be triggered');
      });

      let counter = 0;
      stream.on('data', function(data) {
        should.exist(data);
        counter++;
      });

      stream.on('end', function() {
        should.equal(counter, rowsAmount);
        stream.destroy();
      });

      stream.on('close', function() {
        done();
      });
    });

    it('13.1.3 errors in query', function(done) {
      let stream = connection.queryStream('SELECT no_such_column FROM nodb_stream1');

      stream.on('error', function(err) {
        should.exist(err);
      });

      stream.on('data', function(data) {
        should.fail(data, null, 'Data event should not be triggered');
      });

      stream.on('close', function() {
        done();
      });
    });

    it('13.1.4 no result', function(done) {

      let stream = connection.queryStream('SELECT * FROM nodb_stream1 WHERE employee_name = :name', {
        name: 'TEST_NO_RESULT'
      });

      stream.on('error', function(error) {
        should.fail(error, null, 'Error event should not be triggered: ' + error);
      });

      let counter = 0;
      stream.on('data', function(data) {
        should.fail(data, null, 'Data event should not be triggered');
      });

      stream.on('end', function() {
        should.equal(counter, 0);
        stream.destroy();
      });

      stream.on('close', function() {
        done();
      });
    });

    it('13.1.5 single row', function(done) {

      let stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 WHERE employee_name = :name', {
        name: 'staff 10'
      });

      stream.on('error', function(error) {
        should.fail(error, null, 'Error event should not be triggered: ' + error);
      });

      let counter = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.deepEqual(data, ['staff 10']);

        counter++;
      });

      stream.on('end', function() {
        should.equal(counter, 1);
        stream.destroy();
      });

      stream.on('close', function() {
        done();
      });
    });

    it('13.1.6 multiple row', function(done) {
      let stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 WHERE employee_id <= :maxId ORDER BY employee_id', {
        maxId: 10
      }, {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      });

      stream.on('error', function(error) {
        should.fail(error, null, 'Error event should not be triggered: ' + error);
      });

      let counter = 0;
      stream.on('data', function(data) {
        should.exist(data);
        should.deepEqual(data, {
          EMPLOYEE_NAME: 'staff ' + (counter + 1)
        });
        counter++;
      });

      stream.on('end', function() {
        should.equal(counter, 10);
        stream.destroy();
      });

      stream.on('close', function() {
        done();
      });
    });

    it('13.1.7 invalid SQL', function(done) {
      let stream = connection.queryStream(
        'UPDATE nodb_stream1 SET employee_name = :name WHERE rownum < 1',
        {
          name: 'test_update'
        },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT
        }
      );

      stream.on('error', function(error) {
        should.exist(error);
      });

      stream.on('data', function(data) {
        should.fail(data, null, 'Data event should not be triggered');
      });

      stream.on('close', function() {
        done();
      });
    });


    it('13.1.8 Read CLOBs', async function() {
      connection.should.be.ok();

      let stream = connection.queryStream(
        'SELECT employee_name, employee_history FROM nodb_stream1 where employee_id <= :maxId ORDER BY employee_id',
        { maxId: 10 },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const consumeQryStream = new Promise((resolve, reject) => {
        let counter = 0;

        stream.on('data', async function(data) {
          let rowIndex = counter;

          const reading = new Promise((resolve1) => {
            should.exist(data);
            should.equal(data.EMPLOYEE_NAME, 'staff ' + (rowIndex + 1));
            should.exist(data.EMPLOYEE_HISTORY);
            should.equal(data.EMPLOYEE_HISTORY.constructor.name, 'Lob');
            counter++;
            resolve1(data.EMPLOYEE_HISTORY);
          });
          const lob = await reading;
          await readLob(rowIndex, lob);
        });

        stream.on('error', function(error) {
          should.fail(error, null, 'Error event should not be triggered: ' + error);
          reject();
        });
        stream.on('end', function() {
          should.equal(counter, 10);
          stream.destroy();
        });

        stream.on('close', function() {
          resolve();
        });
      });

      await consumeQryStream;
    });

    it('13.1.9 Read CLOBs after stream close', async function() {

      let stream = connection.queryStream('SELECT employee_name, employee_history FROM nodb_stream1 where employee_id <= :maxId ORDER BY employee_id', {
        maxId: 10
      }, {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      });

      const consumeQryStream = new Promise((resolve, reject) => {

        let counter = 0;
        let cloblocs = [];  // the CLOB locators

        stream.on('data', function(data) {
          should.exist(data);
          should.equal(data.EMPLOYEE_NAME, 'staff ' + (++counter));
          should.exist(data.EMPLOYEE_HISTORY);
          should.equal(data.EMPLOYEE_HISTORY.constructor.name, 'Lob');
          cloblocs.push(data.EMPLOYEE_HISTORY);
        });

        stream.on('error', function(error) {
          should.fail(error, null, 'Error event should not be triggered: ' + error);
          reject(error);
        });

        stream.on('end', function() {
          stream.destroy();
        });

        stream.on('close', function() {
          resolve(cloblocs);
        });
      });

      const cloblocs = await consumeQryStream;
      should.equal(cloblocs.length, 10);

      for (let i = 0; i < 10; i++) {
        await readLob(i, cloblocs[i]);
      }

    });

    it('13.1.10 meta data', function(done) {

      let stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 WHERE employee_name = :name', {
        name: 'staff 10'
      });

      let metaDataRead = false;
      stream.on('metadata', function(metaData) {
        should.equal(metaData[0].name, 'EMPLOYEE_NAME');
        metaDataRead = true;
      });

      stream.on('error', function(error) {
        should.fail(error, null, 'Error event should not be triggered: ' + error);
      });

      stream.on('data', function() {
        should.equal(metaDataRead, true);
      });

      stream.on('end', function() {
        should.equal(metaDataRead, true);
        stream.destroy();
      });

      stream.on('close', function() {
        done();
      });
    });

    it('13.1.11 should emit events in the correct order', function(done) {
      let stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 WHERE rownum = 1');
      let events = [];

      stream.on('open', function() {
        events.push('open');
      });

      stream.on('metadata', function() {
        events.push('metadata');
      });

      stream.on('data', function() {
        events.push('data');
      });

      stream.on('end', function() {
        events.push('end');
        stream.destroy();
      });

      stream.on('close', function() {
        events[0].should.equal('open');
        events[1].should.equal('metadata');
        events[2].should.equal('data');
        events[3].should.equal('end');
        // This is close so no need to check

        done();
      });

      stream.on('error', function() {
        done(new Error('Test should not have thrown an error'));
      });
    });

    it('13.1.12 query with logical error should throw error', function(done) {
      const sql = 'select 1 from dual union all select 1 from dual union all select 1/0 from dual';
      let stream = connection.queryStream(sql);

      stream.on('error', function(error) {
        should.exist(error);
        should.strictEqual(error.message, 'ORA-01476: divisor is equal to zero');
      });

      stream.on('data', function(data) {
        should.not.exist(data);
      });

      stream.on('end', function() {
        stream.destroy();
      });

      stream.on('close', done);
    });
  });

  describe('13.2 Testing QueryStream.destroy', function() {
    let it = (nodeMajorVersion >= 8) ? global.it : global.it.skip;

    it('13.2.1 should be able to stop the stream early with destroy', function(done) {
      let stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');
      let err;

      stream.on('data', function() {
        stream.pause();
        stream.destroy();
      });

      stream.on('close', function() {
        done(err);
      });

      stream.on('end', function() {
        err = new Error('Reached the end of the stream');
      });

      stream.on('error', function(err1) {
        err = err1;
      });
    });

    it('13.2.2 should be able to stop the stream before any data', function(done) {
      let stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');
      let err;

      stream.on('close', function() {
        done(err);
      });

      stream.on('open', function() {
        stream.destroy();
      });

      stream.on('data', function() {
        err = new Error('Received data');
      });

      stream.on('end', function() {
        err = new Error('Reached the end of the stream');
      });

      stream.on('error', function(err1) {
        err = err1;
      });
    });

    it('13.2.3 should invoke an optional callback passed to destroy', function(done) {
      let stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');
      let err;

      stream.on('open', function(err1) {
        if (err1) err = err1;
        stream.destroy(null, done(err)); // Not documented, but the second param can be a callback
      });

      stream.on('data', function() {
        err = new Error('Received data');
      });

      stream.on('end', function() {
        err = new Error('Reached the end of the stream');
      });

      stream.on('error', function(err1) {
        err = err1;
      });

    });

    it('13.2.4 should work if querystream is destroyed before resultset is opened', function(done) {
      let stream = connection.queryStream('SELECT employee_name FROM nodb_stream1');
      let err;

      stream.destroy();

      stream.on('data', function() {
        err = new Error('Received a row');
      });

      stream.on('end', function() {
        err = new Error('Reached the end of the stream');
      });

      stream.on('error', function(err1) {
        err = err1;
      });

      stream.on('close', function() {
        done(err);
      });
    });

    it('13.2.5 should work if querystream is destroyed after end event', function(done) {
      let stream = connection.queryStream('SELECT employee_name FROM nodb_stream1');
      let err;

      stream.on('data', function() {});

      stream.on('end', function() {
        stream.destroy();
      });

      stream.on('error', function(err1) {
        err = err1;
      });

      stream.on('close', function() {
        done(err);
      });
    });

    it('13.2.6 should emit the error passed in', function(done) {
      let stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');
      let customError = new Error('Ouch!');
      let err;

      stream.on('open', function() {
        stream.destroy(customError);
      });

      stream.on('data', function() {
        err = new Error('Received data');
      });

      stream.on('end', function() {
        err = new Error('Reached the end of the stream');
      });

      stream.on('error', function(err1) {
        err1.should.be.equal(customError);
      });

      stream.on('close', function() {
        done(err);
      });
    });
  });

  describe('13.3 Testing QueryStream\'s fetchArraySize option', function() {
    it('13.3.1 should use oracledb.fetchArraySize for fetching', function(done) {
      let defaultFetchArraySize;
      let testFetchArraySize = 9;

      defaultFetchArraySize = oracledb.fetchArraySize;
      oracledb.fetchArraySize = testFetchArraySize;
      let stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');
      let err;

      stream.on('data', function() {
        stream.pause();

        // Using the internal/private caches to validate
        should.equal(stream._resultSet._rowCache.length, testFetchArraySize - (1 + stream._readableState.buffer.length));

        stream.destroy();
        oracledb.fetchArraySize = defaultFetchArraySize;
      });

      stream.on('end', function() {
        oracledb.fetchArraySize = defaultFetchArraySize;
        err = new Error('Reached the end of the stream');
      });

      stream.on('error', function(err1) {
        oracledb.fetchArraySize = defaultFetchArraySize;
        err = err1;
      });

      stream.on('close', function() {
        oracledb.fetchArraySize = defaultFetchArraySize;
        done(err);
      });
    });

    it('13.3.2 should use execute options fetchArraySize for fetching', function(done) {
      let testFetchArraySize = 8;
      let stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name', [], {fetchArraySize: testFetchArraySize});
      let err;

      stream.on('data', function() {
        stream.pause();

        // Using the internal/private caches to validate
        should.equal(stream._resultSet._rowCache.length, testFetchArraySize - (1 + stream._readableState.buffer.length));

        stream.destroy();
      });

      stream.on('end', function() {
        err = new Error('Reached the end of the stream');
      });

      stream.on('error', function(err1) {
        err = err1;
      });

      stream.on('close', function() {
        done(err);
      });
    });
  });

  describe('13.4 Testing QueryStream race conditions', function() {
    it('13.4.1 queryStream from toQueryStream should get open event', function(done) {
      connection.execute(
        'SELECT employee_name FROM nodb_stream1',
        [],
        {
          resultSet: true
        },
        function(err, result) {
          if (err) {
            done(err);
            return;
          }

          const stream = result.resultSet.toQueryStream();
          let receivedEvent = false;
          let err1;

          stream.on('open', function() {
            receivedEvent = true;
          });

          stream.on('data', function() {});

          stream.on('error', function(err2) {
            err1 = err2;
          });

          stream.on('end', function() {
            stream.destroy();
          });

          stream.on('close', function() {
            if (receivedEvent) {
              done(err1);
            } else {
              done(new Error('Did not receive event'));
            }
          });
        }
      );
    });

    it('13.4.2 queryStream from toQueryStream should get metadata event', function(done) {
      connection.execute(
        'SELECT employee_name FROM nodb_stream1',
        [],
        {
          resultSet: true
        },
        function(err, result) {
          if (err) {
            done(err);
            return;
          }

          const stream = result.resultSet.toQueryStream();
          let receivedEvent = false;
          let err1;

          stream.on('metadata', function() {
            receivedEvent = true;
          });

          stream.on('data', function() {});

          stream.on('error', function(err2) {
            err1 = err2;
          });

          stream.on('end', function() {
            stream.destroy();
          });

          stream.on('close', function() {
            if (receivedEvent) {
              done(err1);
            } else {
              done(new Error('Did not receive event'));
            }
          });
        }
      );
    });
  });
});

/* Copyright (c) 2016, 2023, Oracle and/or its affiliates. */

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
 *   13. stream1.js
 *
 * DESCRIPTION
 *   Testing driver query results via stream feature.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('13. stream1.js', function() {

  let connection = null;
  const rowsAmount = 217;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
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
    await connection.execute(proc);
    proc = `DECLARE
                x NUMBER := 0;
                n VARCHAR2(20);
            BEGIN
                FOR i IN 1..217 LOOP
                    x := x + 1;
                    n := 'staff ' || x;
                    INSERT INTO nodb_stream1 VALUES (x, n, x||'12345678901234567890');
                END LOOP;
            END;`;
    await connection.execute(proc);
  }); // before

  after(async function() {
    await connection.execute("DROP TABLE nodb_stream1 PURGE");
    await connection.close();
  }); // after

  describe('13.1 Testing QueryStream', function() {

    async function readLob(rowIndex, clobloc) {
      assert.strictEqual(clobloc.constructor.name, 'Lob');

      await new Promise((resolve, reject) => {

        clobloc.setEncoding('utf8');

        clobloc.on('error', reject);
        clobloc.on('data', (data) => {
          assert.strictEqual(data, (rowIndex + 1) + '12345678901234567890');
        });

        clobloc.on('end', () => {
          clobloc.destroy();
        });

        clobloc.on('close', resolve);
      });
    }

    it('13.1.1 stream results for oracle connection', async function() {
      const stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');
      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', function(data) {
          assert(data);
          counter++;
        });
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
      });
      assert.strictEqual(counter, rowsAmount);
    });

    it('13.1.2 stream results for oracle connection (outFormat: oracledb.OUT_FORMAT_OBJECT)', async function() {
      const stream = connection.queryStream(
        'SELECT employee_name FROM nodb_stream1 ORDER BY employee_name',
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', function(data) {
          assert(data);
          counter++;
        });
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
      });
      assert.strictEqual(counter, rowsAmount);
    });

    it('13.1.3 errors in query', async function() {
      const stream = connection.queryStream('SELECT no_such_column FROM nodb_stream1');
      await assert.rejects(
        async () => {
          await new Promise((resolve, reject) => {
            stream.on('error', reject);
            stream.on('end', resolve);
          });
        },
        /ORA-00904:/
      );
    });

    it('13.1.4 no result', async function() {
      const stream = connection.queryStream('SELECT * FROM nodb_stream1 WHERE employee_name = :name', {
        name: 'TEST_NO_RESULT'
      });
      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', () => {
          counter++;
        });
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
      });
      assert.strictEqual(counter, 0);
    });

    it('13.1.5 single row', async function() {
      const stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 WHERE employee_name = :name', {
        name: 'staff 10'
      });
      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', (data) => {
          assert.deepStrictEqual(data, ['staff 10']);
          counter++;
        });
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
      });
      assert.strictEqual(counter, 1);
    });

    it('13.1.6 multiple row', async function() {
      const stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 WHERE employee_id <= :maxId ORDER BY employee_id', {
        maxId: 10
      }, {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      });
      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', (data) => {
          assert.deepStrictEqual(data, {
            EMPLOYEE_NAME: 'staff ' + (counter + 1)
          });
          counter++;
        });
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
      });
      assert.strictEqual(counter, 10);
    });

    it('13.1.7 invalid SQL', async function() {
      const stream = connection.queryStream(
        'UPDATE nodb_stream1 SET employee_name = :name WHERE rownum < 1',
        {
          name: 'test_update'
        },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT
        }
      );
      await assert.rejects(
        async () => {
          await new Promise((resolve, reject) => {
            stream.on('error', reject);
            stream.on('end', resolve);
          });
        },
        /NJS-019:/
      );
    });

    it('13.1.8 Read CLOBs', async function() {
      const stream = connection.queryStream(
        'SELECT employee_name, employee_history FROM nodb_stream1 where employee_id <= :maxId ORDER BY employee_id',
        { maxId: 10 },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', async function(data) {
          const rowIndex = counter;
          const lob = await new Promise((resolve) => {
            assert.strictEqual(data.EMPLOYEE_NAME, 'staff ' + (rowIndex + 1));
            assert.strictEqual(data.EMPLOYEE_HISTORY.constructor.name, 'Lob');
            counter++;
            resolve(data.EMPLOYEE_HISTORY);
          });
          await readLob(rowIndex, lob);
        });
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
      });
      assert.strictEqual(counter, 10);
    });

    it('13.1.9 Read CLOBs after stream close', async function() {
      const stream = connection.queryStream('SELECT employee_name, employee_history FROM nodb_stream1 where employee_id <= :maxId ORDER BY employee_id', {
        maxId: 10
      }, {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      });
      let counter = 0;
      const cloblocs = [];  // the CLOB locators
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', function(data) {
          assert.strictEqual(data.EMPLOYEE_NAME, 'staff ' + (++counter));
          assert.strictEqual(data.EMPLOYEE_HISTORY.constructor.name, 'Lob');
          cloblocs.push(data.EMPLOYEE_HISTORY);
        });
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
      });
      assert.strictEqual(cloblocs.length, 10);

      for (let i = 0; i < cloblocs.length; i++) {
        await readLob(i, cloblocs[i]);
      }

    });

    it('13.1.10 meta data', async function() {
      const stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 WHERE employee_name = :name', {
        name: 'staff 10'
      });
      let metaDataRead = false;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('metadata', (metaData) => {
          assert.strictEqual(metaData[0].name, 'EMPLOYEE_NAME');
          metaDataRead = true;
        });
        stream.on('data', () => {
          assert.strictEqual(metaDataRead, true);
        });
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
      });
      assert.strictEqual(metaDataRead, true);
    });

    it('13.1.11 should emit events in the correct order', async function() {
      const stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 WHERE rownum = 1');
      const events = [];
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('open', () => events.push('open'));
        stream.on('metadata', () => events.push('metadata'));
        stream.on('data', () => events.push('data'));
        stream.on('end', () => {
          events.push('end');
          stream.destroy();
        });
        stream.on('close', resolve);
      });
      assert.strictEqual(events.length, 4);
      assert.strictEqual(events[0], 'open');
      assert.strictEqual(events[1], 'metadata');
      assert.strictEqual(events[2], 'data');
      assert.strictEqual(events[3], 'end');
    });

    it('13.1.12 query with logical error should throw error', async function() {
      const sql = 'select 1 from dual union all select 1 from dual union all select 1/0 from dual';
      const stream = connection.queryStream(sql);
      await assert.rejects(
        async () => {
          await new Promise((resolve, reject) => {
            stream.on('error', reject);
            stream.on('data', resolve);
            stream.on('end', resolve);
          });
        },
        /ORA-01476:/
      );
    });
  });

  describe('13.2 Testing QueryStream.destroy', function() {

    it('13.2.1 should be able to stop the stream early with destroy', async function() {
      const stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', () => {
          stream.pause();
          stream.destroy();
        });
        stream.on('end', () => {
          reject(new Error('Reached the end of the stream!'));
        });
        stream.on('close', resolve);
      });
    });

    it('13.2.2 should be able to stop the stream before any data', async function() {
      const stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');
      await new Promise((resolve, reject) => {
        stream.on('open', stream.destroy);
        stream.on('error', reject);
        stream.on('data', () => {
          reject(new Error('Got data!'));
        });
        stream.on('end', () => {
          reject(new Error('Reached the end of the stream!'));
        });
        stream.on('close', resolve);
      });
    });

    it('13.2.3 should invoke an optional callback passed to destroy', async function() {
      const stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('open', () => {
          // Not documented, but the second param can be a callback
          stream.destroy(null, resolve);
        });
        stream.on('data', () => {
          reject(new Error('Received data'));
        });
      });
    });

    it('13.2.4 should work if querystream is destroyed before resultset is opened', async function() {
      const stream = connection.queryStream('SELECT employee_name FROM nodb_stream1');
      stream.destroy();
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('close', resolve);
        stream.on('data', () => {
          reject(new Error('Received data'));
        });
      });
    });

    it('13.2.5 should work if querystream is destroyed after end event', async function() {
      const stream = connection.queryStream('SELECT employee_name FROM nodb_stream1');
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', () => {});
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
      });
    });

    it('13.2.6 should emit the error passed in', async function() {
      const stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');
      const customError = new Error('Ouch!');
      await assert.rejects(
        async () => {
          await new Promise((resolve, reject) => {
            stream.on('error', reject);
            stream.on('open', () => {
              stream.destroy(customError);
            });
            stream.on('close', resolve);
          });
        },
        /Ouch!/
      );
    });
  });

  describe('13.3 Testing QueryStream\'s fetchArraySize option', function() {

    it('13.3.1 should use oracledb.fetchArraySize for fetching', async function() {
      const defaultFetchArraySize = oracledb.fetchArraySize;
      const testFetchArraySize = 9;

      oracledb.fetchArraySize = testFetchArraySize;
      try {
        const stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name');

        await new Promise((resolve, reject) => {
          stream.on('error', reject);
          stream.on('data', () => {
            stream.pause();
            // Using the internal/private caches to validate
            assert.strictEqual(stream._resultSet._rowCache.length,
              testFetchArraySize - (1 + stream._readableState.buffer.length));
            stream.destroy();
          });
          stream.on('close', resolve);
        });
      } finally {
        oracledb.fetchArraySize = defaultFetchArraySize;
      }
    });

    it('13.3.2 should use execute options fetchArraySize for fetching', async function() {
      const testFetchArraySize = 8;
      const stream = connection.queryStream('SELECT employee_name FROM nodb_stream1 ORDER BY employee_name', [], {fetchArraySize: testFetchArraySize});
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('close', resolve);
        stream.on('data', () => {
          stream.pause();
          // Using the internal/private caches to validate
          assert.strictEqual(stream._resultSet._rowCache.length,
            testFetchArraySize - (1 + stream._readableState.buffer.length));
          stream.destroy();
        });
      });
    });

  });

  describe('13.4 Testing QueryStream race conditions', function() {

    it('13.4.1 queryStream from toQueryStream should get open event', async function() {
      const sql = 'SELECT employee_name FROM nodb_stream1';
      const binds = [];
      const options = {
        resultSet: true
      };
      const result = await connection.execute(sql, binds, options);
      const stream = result.resultSet.toQueryStream();
      let receivedEvent = false;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('close', resolve);
        stream.on('data', () => {});
        stream.on('end', stream.destroy);
        stream.on('open', () => {
          receivedEvent = true;
        });
      });
      assert.strictEqual(receivedEvent, true);
    });

    it('13.4.2 queryStream from toQueryStream should get metadata event', async function() {
      const sql = 'SELECT employee_name FROM nodb_stream1';
      const binds = [];
      const options = {
        resultSet: true
      };
      const result = await connection.execute(sql, binds, options);
      const stream = result.resultSet.toQueryStream();
      let receivedEvent = false;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('close', resolve);
        stream.on('data', () => {});
        stream.on('end', stream.destroy);
        stream.on('metadata', () => {
          receivedEvent = true;
        });
      });
      assert.strictEqual(receivedEvent, true);
    });

  });

});

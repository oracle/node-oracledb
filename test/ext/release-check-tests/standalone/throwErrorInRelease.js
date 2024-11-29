/* Copyright (c) 2024, Oracle and/or its affiliates. All rights reserved. */

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
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   throwErrorInRelease.js
 *
 * DESCRIPTION
 *
 * GitHub issue
 * https://github.com/oracle/node-oracledb/issues/562
 * Uncaught exceptions within the release callback can cause connection pool malfunction in node-oracledb.
 * This can lead to queued connection requests failing due to timeouts.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('../../../dbconfig.js');

describe('throwErrorInRelease.js', function() {
  it('Github issue 562', async function() {
    // Set the number of requests to simulate
    const requests = 20;

    // Initialize counters to track obtained and released connections
    const counters = { obtained: 0, released: 0 };

    // Create a connection pool with your desired configuration
    const pool = await oracledb.createPool(
      {
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: dbConfig.connectString,
        poolMin: 1,
        poolMax: 10,
        poolIncrement: 1,
        _enableStats: true,
        queueTimeout: 1000
      }
    );

    // Simulate multiple requests using a loop
    for (let i = 0; i < requests; i++) {
      // Obtain a connection from the pool
      const conn = await pool.getConnection();

      // Increment the obtained counter
      counters.obtained++;

      // Execute a simple query
      await conn.execute('SELECT 1 FROM DUAL');

      // Release the connection back to the pool
      await conn.close();

      // Increment the released counter
      counters.released++;
    }

    // Log pool statistics and verify results
    await pool._logStats();

    // Assert that the obtained and released counters are equal
    assert.strictEqual(counters.obtained, counters.released);

    // Close the pool
    await pool.close();
  });
});

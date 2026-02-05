/* Copyright (c) 2026, Oracle and/or its affiliates. */

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
 *   322. tracePoolEvents.js
 *
 * DESCRIPTION
 *   Testing pool events functionality.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');

describe('322. tracePoolEvents.js', function() {

  let pool;

  after(() => {
    oracledb.traceHandler.setTraceInstance();
  });

  describe('322.1 Test pool events functionality', () => {
    const traceHandler = oracledb.traceHandler;
    let traceInstance;
    let logs = [];

    class myTraceHandler extends traceHandler.TraceHandlerBase {
      constructor(config) {
        super(config);
      }

      onPoolExpand(pool) {
        logs.push({event: 'onPoolExpand', pool});
      }

      onPoolShrink(pool) {
        logs.push({event: 'onPoolShrink', pool});
      }

      onPoolAcquire(pool) {
        logs.push({event: 'onPoolAcquire', pool});
      }

      onPoolRelease(pool) {
        logs.push({event: 'onPoolRelease', pool});
      }

      onPoolWait(pool) {
        logs.push({event: 'onPoolWait', pool});
      }

      onPoolRequestTimeout(pool) {
        logs.push({event: 'onPoolRequestTimeout', pool});
      }

      onPoolConnectionHit(pool) {
        logs.push({event: 'onPoolConnectionHit', pool});
      }

      onPoolConnectionMiss(pool) {
        logs.push({event: 'onPoolConnectionMiss', pool});
      }

      onPoolClose(pool) {
        logs.push({event: 'onPoolClose', pool});
      }
    }

    async function waitForCreatePool(pool, time) {
      let retryCount = 5; // counter to wait for new connections to appear
      while (pool.connectionsOpen !== pool.poolMin) {
        // Let background thread complete poolMin conns.
        await new Promise(r => setTimeout(r, time));
        retryCount -= 1;
        if (retryCount === 0) {
          console.log('skipping the test on slow networks');
          return false;
        }
      }
      return true;
    }

    beforeEach(() => {
      logs = [];
      pool = undefined;
      traceInstance = new myTraceHandler({enable: true});
    });

    afterEach(async () => {
      oracledb.traceHandler.setTraceInstance();
      if (pool && pool.status !== oracledb.POOL_STATUS_CLOSED) {
        await pool.close(0);
      }
    });

    it('322.1.1 Pool events default behaviour with no instance set', async function() {
      const poolConfig = {
        ...dbConfig,
        poolMin: 1,
        poolMax: 3,
      };
      pool = await oracledb.createPool(poolConfig);
      const conn = await pool.getConnection();
      await conn.close();
      assert((logs.length === 0));
    });

    it('322.1.2 Pool expand and connection acquire/release with traceHandler enabled', async function() {
      if (!oracledb.thin) this.skip(); // This does not work in Thick mode for now
      traceInstance.enable();
      oracledb.traceHandler.setTraceInstance(traceInstance);

      const poolConfig = {
        ...dbConfig,
        poolMin: 2,
        poolMax: 5,
      };
      pool = await oracledb.createPool(poolConfig);
      await waitForCreatePool(pool, 100);
      // Pool creation should trigger onPoolExpand (for initial connections)
      const expandCount = logs.filter(log => log.event === 'onPoolExpand').length;
      assert(expandCount >= 1, `Expected at least 1 onPoolExpand, got ${expandCount}`);

      const conn = await pool.getConnection();

      // Should trigger onPoolAcquire and onPoolConnectionHit
      const acquireCount = logs.filter(log => log.event === 'onPoolAcquire').length;
      const hitCount = logs.filter(log => log.event === 'onPoolConnectionHit').length;
      const missCount = logs.filter(log => log.event === 'onPoolConnectionMiss').length;
      assert(acquireCount === 1, `Expected 1 onPoolAcquire, got ${acquireCount}`);
      assert(hitCount === 1, `Expected 1 connection hit, got ${hitCount}`);
      assert(missCount === 0, `Expected 0 connection miss, got ${missCount}`);

      await conn.close();

      // Should trigger onPoolRelease
      const releaseCount = logs.filter(log => log.event === 'onPoolRelease').length;
      assert(releaseCount === 1, `Expected 1 onPoolRelease, got ${releaseCount}`);
    });

    it('322.1.3 Pool close with traceHandler enabled', async function() {
      traceInstance.enable();
      oracledb.traceHandler.setTraceInstance(traceInstance);

      const poolConfig = {
        ...dbConfig,
        poolMin: 1,
        poolMax: 2,
      };
      pool = await oracledb.createPool(poolConfig);

      // Clear logs from pool creation
      logs = [];

      await pool.close();

      // Should trigger onPoolClose
      const closeCount = logs.filter(log => log.event === 'onPoolClose').length;
      assert(closeCount === 1, `Expected 1 onPoolClose, got ${closeCount}`);
    });

    it.skip('322.1.4 Pool events with traceHandler disabled', async function() {
      traceInstance.disable();
      oracledb.traceHandler.setTraceInstance(traceInstance);

      const poolConfig = {
        ...dbConfig,
        poolMin: 1,
        poolMax: 2,
      };
      pool = await oracledb.createPool(poolConfig);
      const conn = await pool.getConnection();
      await conn.close();

      // No events should be logged when disabled
      assert(logs.length === 0, `Expected 0 events when disabled, got ${logs.length}`);
    });

    it('322.1.5 Pool shrink event when idle connections are destroyed in background', async function() {
      if (!oracledb.thin) this.skip(); // This does not work in Thick mode for now
      traceInstance.enable();
      oracledb.traceHandler.setTraceInstance(traceInstance);

      const poolConfig = {
        ...dbConfig,
        poolMin: 1,
        poolMax: 3,
        poolTimeout: 1  // 1 second timeout for idle connections
      };
      pool = await oracledb.createPool(poolConfig);

      // Get 2 connections
      const conn1 = await pool.getConnection();
      const conn2 = await pool.getConnection();

      // Release them to make them idle
      await conn1.close();
      await conn2.close();

      // Wait for poolTimeout to trigger shrinkage
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should trigger onPoolShrink when idle connections are removed
      const shrinkCount = logs.filter(log => log.event === 'onPoolShrink').length;
      assert(shrinkCount === 1, `Expected 1 onPoolShrink, got ${shrinkCount}`);
    });

    it('322.1.6 onPoolWait event when pool is full and request is queued', async function() {
      // See https://github.com/oracle/node-oracledb/issues/959
      if (!oracledb.thin && oracledb.oracleClientVersion < 1800000000)
        this.skip();

      traceInstance.enable();
      oracledb.traceHandler.setTraceInstance(traceInstance);

      const poolConfig = {
        ...dbConfig,
        poolMin: 1,
        poolMax: 1,  // Only 1 connection allowed
        poolIncrement: 1,
        queueTimeout: 5000  // Long timeout so request doesn't timeout
      };
      pool = await oracledb.createPool(poolConfig);

      const conn1 = await pool.getConnection();

      // Try to get another connection - this should be queued and trigger onPoolWait
      const getConnectionPromise = pool.getConnection();

      // Give it a moment to queue
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should trigger onPoolWait
      const waitCount = logs.filter(log => log.event === 'onPoolWait').length;
      assert(waitCount >= 1, `Expected at least 1 onPoolWait, got ${waitCount}`);

      // Release the first connection so the queued request can proceed
      await conn1.close();

      // The queued request should now succeed
      const conn2 = await getConnectionPromise;
      const acquireCount = logs.filter(log => log.event === 'onPoolAcquire').length;
      assert(acquireCount === 2, `Expected 2 onPoolAcquire, got ${acquireCount}`);
      await conn2.close();
    });

    it('322.1.7 onPoolRequestTimeout event when queued request times out', async function() {
      // See https://github.com/oracle/node-oracledb/issues/959
      if (!oracledb.thin && oracledb.oracleClientVersion < 1800000000)
        this.skip();

      traceInstance.enable();
      oracledb.traceHandler.setTraceInstance(traceInstance);

      const poolConfig = {
        ...dbConfig,
        poolMin: 1,
        poolMax: 1,  // Only 1 connection allowed
        poolIncrement: 1,
        queueTimeout: 1000  // 1 second timeout
      };
      pool = await oracledb.createPool(poolConfig);

      const conn1 = await pool.getConnection();

      // Try to get another connection - this should be queued
      const getConnectionPromise = pool.getConnection();

      try {
        await getConnectionPromise;
        assert.fail('Expected connection request to timeout');
      } catch (err) {
        // Expected timeout error
        assert(err.code === 'NJS-040', `Expected timeout error, got: ${err.message}`);
      }

      // Should trigger onPoolRequestTimeout
      const timeoutCount = logs.filter(log => log.event === 'onPoolRequestTimeout').length;
      assert(timeoutCount === 1, `Expected 1 onPoolRequestTimeout, got ${timeoutCount}`);
      await conn1.close();
    });

  }); // 322.1
});

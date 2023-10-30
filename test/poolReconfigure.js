/* Copyright (c) 2021, 2023, Oracle and/or its affiliates. */

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
 *   255. poolReconfig.js
 *
 * DESCRIPTION
 *   Test cases to pool-reconfigure
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('255. poolReconfigure.js', function() {

  const poolMinOriginalVal = 2;
  const poolMaxOriginalVal = 10;
  const poolIncrementOriginalVal = 2;
  const enableStatisticsOriginalVal = false;

  let poolConfig = {
    ...dbConfig,
    poolMin: poolMinOriginalVal,
    poolMax: poolMaxOriginalVal,
    poolIncrement: poolIncrementOriginalVal,
    enableStatistics: enableStatisticsOriginalVal
  };

  if (dbConfig.test.externalAuth) {
    poolConfig = {
      externalAuth: true,
      connectionString: dbConfig.connectString,
      poolMin: poolMinOriginalVal,
      poolMax: poolMaxOriginalVal,
      poolIncrement: poolIncrementOriginalVal,
      enableStatistics: enableStatisticsOriginalVal
    };
  }

  function checkOriginalPoolConfig(pool) {
    assert.strictEqual(pool.poolMin, poolMinOriginalVal);
    assert.strictEqual(pool.poolMax, poolMaxOriginalVal);
    assert.strictEqual(pool.poolIncrement, poolIncrementOriginalVal);
    assert.strictEqual(pool.enableStatistics, enableStatisticsOriginalVal);
  }

  describe('255.1 poolReconfigure - poolMin/poolMax/poolIncrement properties', function() {
    let pool;

    beforeEach(async function() {
      if (oracledb.thin)
        return this.skip();
      pool = await oracledb.createPool(poolConfig);
      checkOriginalPoolConfig(pool);
    });

    afterEach(async function() {
      if (oracledb.thin)
        return this.skip();
      await pool.close(0);
    });

    it('255.1.1 Change poolMin - increase', async function() {
      const conn1 = await testsUtil.getPoolConnection(pool);
      const conn2 = await testsUtil.getPoolConnection(pool);
      assert.strictEqual(pool.connectionsInUse, 2);
      if (dbConfig.test.externalAuth) {
        assert.strictEqual(pool.connectionsOpen, 2);
      } else {
        assert.strictEqual(pool.connectionsOpen, poolMinOriginalVal);
      }

      const poolMin = pool.poolMin * 2;
      const config = {
        poolMin: poolMin
      };
      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMin, poolMin);
      assert.strictEqual(pool.poolMax, poolMaxOriginalVal);
      assert.strictEqual(pool.poolIncrement, poolIncrementOriginalVal);
      assert.strictEqual(pool.connectionsInUse, 2);

      await conn1.close();
      await conn2.close();

      const conn3 = await testsUtil.getPoolConnection(pool);
      assert.strictEqual(pool.connectionsInUse, 1);
      await conn3.close();
    });

    it('255.1.2 Change poolMin - decrease', async function() {
      if (dbConfig.test.drcp) this.skip();

      const conn = await testsUtil.getPoolConnection(pool);
      assert.strictEqual(pool.connectionsInUse, 1);
      if (dbConfig.test.externalAuth) {
        assert.strictEqual(pool.connectionsOpen, 1);
      } else {
        assert.strictEqual(pool.connectionsOpen, poolMinOriginalVal);
      }

      const poolMin = Math.floor(pool.poolMin / 2);
      const config = {
        poolMin: poolMin
      };

      await pool.reconfigure (config);
      assert.strictEqual(pool.poolMin, poolMin);
      assert.strictEqual(pool.poolMax, poolMaxOriginalVal);
      assert.strictEqual(pool.poolIncrement, poolIncrementOriginalVal);
      assert.strictEqual(pool.connectionsInUse, 1);

      await conn.close();
    });

    it('255.1.3 Change poolMax - increase', async function() {
      if (dbConfig.test.drcp) this.skip();

      const conns = new Array();
      let conIndex;
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool);
        conns.push(conn);
      }

      assert.strictEqual(pool.connectionsInUse, poolMaxOriginalVal);
      assert.strictEqual(pool.connectionsOpen, poolMaxOriginalVal);

      const poolMax = pool.poolMax * 2;
      const config = {
        poolMax: poolMax
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMax, poolMax);
      assert.strictEqual(pool.poolMin, poolMinOriginalVal);
      assert.strictEqual(pool.poolIncrement, poolIncrementOriginalVal);

      const connNew = await testsUtil.getPoolConnection(pool);
      assert.strictEqual(pool.connectionsInUse, poolMaxOriginalVal + 1);
      if (dbConfig.test.externalAuth) {
        assert.strictEqual(pool.connectionsOpen, poolMaxOriginalVal + 1);
      } else {
        assert.strictEqual(pool.connectionsOpen, poolMaxOriginalVal + poolIncrementOriginalVal);
      }

      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = conns[conIndex];
        await conn.close();
      }
      await connNew.close();

    });


    it('255.1.4 Change poolMax - decrease', async function() {
      if (dbConfig.test.drcp) this.skip();

      const conn = await testsUtil.getPoolConnection(pool);
      assert.strictEqual(pool.connectionsInUse, 1);
      if (dbConfig.test.externalAuth) {
        assert.strictEqual(pool.connectionsOpen, 1);
      } else {
        assert.strictEqual(pool.connectionsOpen, poolMinOriginalVal);
      }

      const poolMax = Math.floor (pool.poolMax / 2);
      const config = {
        poolMax: poolMax
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMax, poolMax);
      assert.strictEqual(pool.poolMin, poolMinOriginalVal);
      assert.strictEqual(pool.poolIncrement, poolIncrementOriginalVal);
      assert.strictEqual(pool.connectionsInUse, 1);
      if (dbConfig.test.externalAuth) {
        assert.strictEqual(pool.connectionsOpen, 1);
      } else {
        assert.strictEqual(pool.connectionsOpen, poolMinOriginalVal);
      }

      await conn.close();
    });

    it('255.1.5 Change poolIncrement - increase', async function() {
      if (dbConfig.test.drcp) this.skip();

      const conns = new Array();
      let conIndex;
      for (conIndex = 0; conIndex < poolMinOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool);
        conns.push(conn);
      }
      assert.strictEqual(pool.connectionsInUse, poolMinOriginalVal);
      assert.strictEqual(pool.connectionsOpen, poolMinOriginalVal);

      const poolIncrement = pool.poolIncrement * 2;
      const config = {
        poolIncrement: poolIncrement
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.poolIncrement, poolIncrement);
      assert.strictEqual(pool.poolMin, poolMinOriginalVal);
      assert.strictEqual(pool.poolMax, poolMaxOriginalVal);

      const connNew = await testsUtil.getPoolConnection(pool);
      assert.strictEqual(pool.connectionsInUse, poolMinOriginalVal + 1);
      if (dbConfig.test.externalAuth) {
        assert.strictEqual(pool.connectionsOpen, poolMinOriginalVal + 1);
      } else {
        assert.strictEqual(pool.connectionsOpen, poolMinOriginalVal + poolIncrement);
      }

      for (conIndex = 0; conIndex < poolMinOriginalVal; conIndex++) {
        const conn = conns[conIndex];
        await conn.close();
      }
      await connNew.close();
    });


    it('255.1.6 Change poolIncrement - decrease', async function() {
      const conns = new Array();
      let conIndex;
      for (conIndex = 0; conIndex < poolMinOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool);
        conns.push(conn);
      }
      assert.strictEqual(pool.connectionsInUse, poolMinOriginalVal);
      assert.strictEqual(pool.connectionsOpen, poolMinOriginalVal);

      const poolIncrement = Math.floor(pool.poolIncrement / 2);
      const config = {
        poolIncrement: poolIncrement
      };
      await pool.reconfigure(config);
      assert.strictEqual(pool.poolIncrement, poolIncrement);
      assert.strictEqual(pool.poolMin, poolMinOriginalVal);
      assert.strictEqual(pool.poolMax, poolMaxOriginalVal);

      const connNew = await testsUtil.getPoolConnection(pool);
      assert.strictEqual(pool.connectionsInUse, poolMinOriginalVal + 1);
      if (dbConfig.test.externalAuth) {
        assert.strictEqual(pool.connectionsOpen, poolMinOriginalVal + 1);
      } else {
        assert.strictEqual(pool.connectionsOpen, poolMinOriginalVal + poolIncrement);
      }

      for (conIndex = 0; conIndex < poolMinOriginalVal; conIndex++) {
        const conn = conns[conIndex];
        await conn.close();
      }

      await connNew.close();
    });

    it('255.1.7 increase poolMin & poolMax', async function() {
      const poolMin = 2 * pool.poolMin;
      const poolMax = 2 * pool.poolMax;
      const config =  {
        poolMin: poolMin,
        poolMax: poolMax
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMin, poolMin);
      assert.strictEqual(pool.poolMax, poolMax);
      assert.strictEqual(pool.poolIncrement, poolIncrementOriginalVal);
    });

    it('255.1.8 increase poolMin & poolIncrement', async function() {
      const poolMin = 2 * pool.poolMin;
      const poolIncrement = 2 * pool.poolIncrement;
      const config =  {
        poolMin: poolMin,
        poolIncrement: poolIncrement
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMin, poolMin);
      assert.strictEqual(pool.poolIncrement, poolIncrement);
      assert.strictEqual(pool.poolMax, poolMaxOriginalVal);
    });

    it('255.1.9 increase poolMax & poolIncrement', async function() {
      const poolMax = 2 * pool.poolMax;
      const poolIncrement = 2 * pool.poolIncrement;
      const config =  {
        poolMax: poolMax,
        poolIncrement: poolIncrement
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMax, poolMax);
      assert.strictEqual(pool.poolIncrement, poolIncrement);
      assert.strictEqual(pool.poolMin, poolMinOriginalVal);
    });


    it('255.1.10 increase poolMin/poolMax/poolIncrement', async function() {
      const poolMin = 2 * pool.poolMin;
      const poolMax = 2 * pool.poolMax;
      const poolIncrement = 2 * pool.poolIncrement;
      const config =  {
        poolMin: poolMin,
        poolMax: poolMax,
        poolIncrement: poolIncrement
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMin, poolMin);
      assert.strictEqual(pool.poolMax, poolMax);
      assert.strictEqual(pool.poolIncrement, poolIncrement);
    });

    it('255.1.11 Change enableStatistics to true', async function() {
      const config = {
        enableStatistics: true
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.enableStatistics, true);
      assert.strictEqual(pool.poolIncrement, poolIncrementOriginalVal);
      assert.strictEqual(pool.poolMin, poolMinOriginalVal);
      assert.strictEqual(pool.poolMax, poolMaxOriginalVal);
    });

    it('255.1.12 Change enableStatistics to false', async function() {
      const config = {
        enableStatistics: false
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.enableStatistics, false);
      assert.strictEqual(pool.poolIncrement, poolIncrementOriginalVal);
      assert.strictEqual(pool.poolMin, poolMinOriginalVal);
      assert.strictEqual(pool.poolMax, poolMaxOriginalVal);
    });

    it('255.1.13 Decreasing poolMax when all connection are in use', async function() {
      const conns = new Array();
      let conIndex;
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool);
        conns.push(conn);
      }

      assert.strictEqual(pool.connectionsInUse, poolMaxOriginalVal);
      assert.strictEqual(pool.connectionsOpen, poolMaxOriginalVal);

      const poolMax = Math.floor (pool.poolMax / 2);
      const config = {
        poolMax: poolMax
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMax, poolMax);
      assert.strictEqual(pool.poolMin, poolMinOriginalVal);
      assert.strictEqual(pool.poolIncrement, poolIncrementOriginalVal);
      assert.strictEqual(pool.connectionsInUse, poolMaxOriginalVal);
      assert.strictEqual(pool.connectionsOpen, poolMaxOriginalVal);

      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = conns[conIndex];
        await conn.close();
      }
    });

    it('255.1.14 reconfigure poolMin/poolMax/poolIncrement multiple times', async function() {
      const poolMin = 2 * pool.poolMin;
      const poolMax = 2 * pool.poolMax;
      const poolIncrement = 2 * pool.poolIncrement;
      const config =  {
        poolMin: poolMin,
        poolMax: poolMax,
        poolIncrement: poolIncrement
      };

      await pool.reconfigure(config);
      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMin, poolMin);
      assert.strictEqual(pool.poolMax, poolMax);
      assert.strictEqual(pool.poolIncrement, poolIncrement);

      await pool.reconfigure(config);
      await pool.reconfigure(config);
      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMin, poolMin);
      assert.strictEqual(pool.poolMax, poolMax);
      assert.strictEqual(pool.poolIncrement, poolIncrement);

    });

    it('255.1.15 reconfigure poolMin/poolMax/poolIncrement multiple times', async function() {
      let poolMin = 2 * pool.poolMin;
      let poolMax = 2 * pool.poolMax;
      let poolIncrement = 2 * pool.poolIncrement;
      let config =  {
        poolMin: poolMin,
        poolMax: poolMax,
        poolIncrement: poolIncrement
      };
      await pool.reconfigure(config);

      poolMin = pool.poolMin - 1;
      poolMax = 3 * pool.poolMax;
      poolIncrement = 3 * pool.poolIncrement;
      config =  {
        poolMin: poolMin,
        poolMax: poolMax,
        poolIncrement: poolIncrement
      };
      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMin, poolMin);
      assert.strictEqual(pool.poolMax, poolMax);
      assert.strictEqual(pool.poolIncrement, poolIncrement);

      poolMin = 1;
      poolMax = 3;
      poolIncrement = 1;
      config =  {
        poolMin: poolMin,
        poolMax: poolMax,
        poolIncrement: poolIncrement
      };
      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMin, poolMin);
      assert.strictEqual(pool.poolMax, poolMax);
      assert.strictEqual(pool.poolIncrement, poolIncrement);
    });

    it('255.1.16 Connection queuing after decreasing poolMax', async function() {
      const conns = new Array();
      let conIndex;
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool);
        conns.push(conn);
      }

      const poolMax = poolMaxOriginalVal - 2;
      const config = {
        poolMax: poolMax
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMax, poolMax);
      assert.strictEqual(pool.poolMin, poolMinOriginalVal);
      assert.strictEqual(pool.poolIncrement, poolIncrementOriginalVal);
      assert.strictEqual(pool.connectionsInUse, poolMaxOriginalVal);

      // Execute a query using the existing connections
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        await conns[conIndex].execute(`select user from dual`);
      }

      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool),
        /NJS-040:/
      );
      // NJS-040: connection request timeout. Request exceeded queueTimeout of 5

      // release two connections
      await conns[poolMaxOriginalVal - 1].close();
      await conns[poolMaxOriginalVal - 2].close();

      // Get a new connection
      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool),
        /NJS-040/
      );
      // NJS-040: connection request timeout. Request exceeded queueTimeout of 5

      // release a third connection
      await conns[poolMaxOriginalVal - 3].close();
      // Get a new connection
      conns[poolMaxOriginalVal - 3] = await testsUtil.getPoolConnection(pool);
      // Get a new connection
      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool),
        /NJS-040/
      );
      // NJS-040: connection request timeout. Request exceeded queueTimeout of 5

      for (let i = 0; i < poolMax; i++) {
        await conns[i].close();
      }

    });

    it('255.1.17 Connection queuing after increasing poolMax', async function() {
      const conns = new Array();
      let conIndex;
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool);
        conns.push(conn);
      }

      assert.strictEqual(pool.connectionsInUse, poolMaxOriginalVal);
      assert.strictEqual(pool.connectionsOpen, poolMaxOriginalVal);

      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool),
        /NJS-040/
      );
      // NJS-040: connection request timeout. Request exceeded queueTimeout of 5

      const poolMax = pool.poolMax + 10;
      const config = {
        poolMax: poolMax
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMax, poolMax);
      assert.strictEqual(pool.poolMin, poolMinOriginalVal);
      assert.strictEqual(pool.poolIncrement, poolIncrementOriginalVal);

      for (conIndex = poolMaxOriginalVal; conIndex < poolMax; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool);
        conns.push(conn);
      }

      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool),
        /NJS-040/
      );
      // NJS-040: connection request timeout. Request exceeded queueTimeout of 5

      for (conIndex = 0; conIndex < poolMax; conIndex++) {
        // Execute a query using the existing connections
        await conns[conIndex].execute(`select user from dual`);
        await conns[conIndex].close();
      }
    });

  });

  // Other properties: pingInterval/Timeout/maxPerShard/stmtCacheSize/
  //  resetStatistics/queueMax/queueTimeout/maxSessionsPerShard/
  //  sodaMetaDataCache
  describe('255.2 poolReconfigure - other properties', function() {
    let pool;

    poolConfig = {
      ...dbConfig,
      poolMin: poolMinOriginalVal,
      poolMax: poolMaxOriginalVal,
      poolIncrement: poolIncrementOriginalVal,
      enableStatistics: enableStatisticsOriginalVal,
      queueTimeout: 5
    };

    if (dbConfig.test.externalAuth) {
      poolConfig = {
        externalAuth: true,
        connectionString: dbConfig.connectString,
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        enableStatistics: enableStatisticsOriginalVal,
        queueTimeout: 5
      };
    }

    beforeEach(async function() {
      if (oracledb.thin)
        return this.skip();
      pool = await oracledb.createPool(poolConfig);
      checkOriginalPoolConfig(pool);
    });

    afterEach(async function() {
      if (oracledb.thin)
        return this.skip();
      await pool.close(0);
    });

    it('255.2.1 change poolPingInterval', async function() {
      const poolPingInterval = 2 * pool.poolPingInterval;
      const config = {
        poolPingInterval: poolPingInterval
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.poolPingInterval, poolPingInterval);
      checkOriginalPoolConfig(pool);
    });

    it('255.2.2 change poolTimeout', async function() {
      const poolTimeout = 2 * pool.poolTimeout;
      const config = {
        poolTimeout: poolTimeout
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.poolTimeout, poolTimeout);
      checkOriginalPoolConfig(pool);
    });

    it('255.2.3 change maxPerShard', async function() {
      const poolMaxPerShard = 2 * pool.poolMaxPerShard;
      const config = {
        poolMaxPerShard: poolMaxPerShard
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMaxPerShard, poolMaxPerShard);
      checkOriginalPoolConfig(pool);
    });

    it('255.2.4 change stmtCacheSize', async function() {
      const stmtCacheSize = 2 * pool.stmtCacheSize;
      const config = {
        stmtCacheSize: stmtCacheSize
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.stmtCacheSize, stmtCacheSize);
      checkOriginalPoolConfig(pool);
    });

    it('255.2.5 change resetStatistics with enableStatistics', async function() {
      let conns = new Array();
      let conIndex;
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool);
        conns.push(conn);
      }
      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool),
        /NJS-040/
      );
      // NJS-040: connection request timeout. Request exceeded queueTimeout of 5

      const totalConnectionRequestsOriginalVal = pool._totalConnectionRequests;
      const totalRequestsDequeuedOriginalVal = pool._totalConnectionRequests;
      const totalRequestsEnqueuedOriginalVal = pool._totalRequestsEnqueued;
      const totalFailedRequestsOriginalVal = pool._totalFailedRequests;
      const totalRequestsRejectedOriginalVal = pool._totalRequestsRejected;
      const timeOfLastResetOriginalVal = pool._timeOfReset;
      assert.strictEqual(totalConnectionRequestsOriginalVal, 0);
      assert.strictEqual(totalRequestsDequeuedOriginalVal, 0);
      assert.strictEqual(totalRequestsEnqueuedOriginalVal, 0);
      assert.strictEqual(totalFailedRequestsOriginalVal, 0);
      assert.strictEqual(totalRequestsRejectedOriginalVal, 0);

      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = conns[conIndex];
        await conn.close();
      }

      const config = {
        resetStatistics: true,
        enableStatistics: true
      };
      await pool.reconfigure(config);

      conns = new Array();
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool);
        conns.push(conn);
      }
      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool),
        /NJS-040/
      );
      // NJS-040: connection request timeout. Request exceeded queueTimeout of 5

      assert.strictEqual(pool._totalConnectionRequests, poolMaxOriginalVal + 1);
      assert.strictEqual(pool._totalRequestsDequeued, 0);
      assert.strictEqual(pool._totalRequestsEnqueued, 1);
      assert.strictEqual(pool._totalFailedRequests, 0);
      assert.strictEqual(pool._totalRequestsRejected, 0);
      assert(pool._timeOfReset > timeOfLastResetOriginalVal);

      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = conns[conIndex];
        await conn.close();
      }

    });

    it('255.2.6 change resetStatistics', async function() {
      const config = {
        resetStatistics: true
      };
      await pool.reconfigure(config);
      assert.strictEqual(pool.enableStatistics, enableStatisticsOriginalVal);
    });

    it('255.2.7 getStatistics', async function() {
      await pool.close(0);

      poolConfig = {
        ...dbConfig,
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        enableStatistics: enableStatisticsOriginalVal,
        queueTimeout: 5,
        poolAlias: "255.2.7"
      };
      pool = await oracledb.createPool(poolConfig);

      let conns = new Array();
      let conIndex;
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool);
        conns.push(conn);
      }
      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool),
        /NJS-040/
      );
      // NJS-040: connection request timeout. Request exceeded queueTimeout of 5

      let poolStatistics = pool.getStatistics();
      assert.strictEqual(poolStatistics, null);
      const timeOfLastResetOriginalVal = pool._timeOfReset;

      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = conns[conIndex];
        await conn.close();
      }

      const config = {
        resetStatistics: true,
        enableStatistics: true
      };
      await pool.reconfigure(config);

      conns = new Array();
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool);
        conns.push(conn);
      }
      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool),
        /NJS-040/
      );
      // NJS-040: connection request timeout. Request exceeded queueTimeout of 5

      poolStatistics = pool.getStatistics();

      assert(poolStatistics.upTime > 0);
      assert(poolStatistics.upTimeSinceReset > 0);
      assert(pool._timeOfReset > timeOfLastResetOriginalVal);
      assert.strictEqual(poolStatistics.connectionRequests, poolMaxOriginalVal + 1);
      assert.strictEqual(poolStatistics.requestsEnqueued, 1);
      assert.strictEqual(poolStatistics.requestsDequeued, 0);
      assert.strictEqual(poolStatistics.failedRequests, 0);
      assert.strictEqual(poolStatistics.rejectedRequests, 0);
      assert.strictEqual(poolStatistics.requestTimeouts, 1);
      assert.strictEqual(poolStatistics.currentQueueLength, 0);
      assert.strictEqual(poolStatistics.maximumQueueLength, 1);
      assert(poolStatistics.minimumTimeInQueue > 0);
      assert(poolStatistics.maximumTimeInQueue > 0);
      assert(poolStatistics.timeInQueue >= 5,
        `timeInQueue should be >= 5 but is ${poolStatistics.timeInQueue}`);
      assert(poolStatistics.averageTimeInQueue >= 5);
      assert.strictEqual(poolStatistics.connectionsInUse, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.connectionsOpen, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.poolAlias, "255.2.7");
      assert.strictEqual(poolStatistics.queueMax, 500);
      assert.strictEqual(poolStatistics.queueTimeout, 5);
      assert.strictEqual(poolStatistics.poolMin, poolMinOriginalVal);
      assert.strictEqual(poolStatistics.poolMax, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.poolIncrement, poolIncrementOriginalVal);
      assert.strictEqual(poolStatistics.poolPingInterval, 60);
      assert.strictEqual(poolStatistics.poolTimeout, 60);
      assert.strictEqual(poolStatistics.poolMaxPerShard, 0);
      assert.strictEqual(poolStatistics.sessionCallback, undefined);
      assert.strictEqual(poolStatistics.stmtCacheSize, 30);
      assert.strictEqual(poolStatistics.sodaMetaDataCache, false);
      assert.strictEqual(poolStatistics.threadPoolSize, undefined);

      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = conns[conIndex];
        await conn.close();
      }

    });

    it('255.2.8 getStatistics - noneditable properties', async function() {
      await pool.close(0);

      poolConfig = {
        ...dbConfig,
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        enableStatistics: enableStatisticsOriginalVal,
        queueTimeout: 5,
        poolAlias: "255.2.8"
      };
      pool = await oracledb.createPool(poolConfig);
      await pool.reconfigure ({
        resetStatistics: true,
        enableStatistics: true
      });

      const poolStatistics = pool.getStatistics();
      assert(poolStatistics instanceof oracledb.PoolStatistics);

      assert.strictEqual(poolStatistics.user, dbConfig.user);
      assert.strictEqual(poolStatistics.edition, "");
      assert.strictEqual(poolStatistics.events, false);
      assert.strictEqual(poolStatistics.externalAuth, false);
      assert.strictEqual(poolStatistics.homogeneous, true);
      assert.strictEqual(poolStatistics.connectString, dbConfig.connectString);

      // reconfigure for later use
      await pool.reconfigure({enableStatistics: false});
    });

  });

  describe('255.3 poolReconfigure JS layer properties', function() {
    let pool;

    beforeEach(async function() {
      if (oracledb.thin)
        return this.skip();
      pool = await oracledb.createPool(poolConfig);
      checkOriginalPoolConfig(pool);
    });

    afterEach(async function() {
      if (oracledb.thin)
        return this.skip();
      await pool.close(0);
    });

    it('255.3.1 change queueMax', async function() {
      const queueMax = pool.queueMax + 10;
      const config = {
        queueMax: queueMax
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.queueMax, queueMax);
      checkOriginalPoolConfig(pool);
    });

    it('255.3.2 change queueTimeout', async function() {
      const queueTimeout = pool.queueTimeout + 10;
      const config = {
        queueTimeout: queueTimeout
      };

      await pool.reconfigure(config);

      assert.strictEqual(pool.queueTimeout, queueTimeout);
      checkOriginalPoolConfig(pool);
    });

    it('255.3.3 change maxPerShard', async function() {
      // maxPerShard is supported only >= 18.3
      if (testsUtil.getClientVersion() < 1803000000) {
        this.skip();
      }

      const maxPerShard = 10;
      const config = {
        poolMaxPerShard: maxPerShard
      };

      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMaxPerShard, maxPerShard);
      checkOriginalPoolConfig(pool);
    });

    it('255.3.4 sodaMetaDataCache set to true', async function() {
      const config = {
        sodaMetaDataCache: true
      };
      // The SODA metadata cache is available with Oracle Client 21.3 and
      // in 19 from 19.11
      const clientVersion = testsUtil.getClientVersion();
      if (clientVersion < 2103000000) {
        if (clientVersion < 1911000000 || clientVersion >= 2000000000) {
          this.skip();
        }
      }
      await pool.reconfigure(config);
      assert.strictEqual(pool.sodaMetaDataCache, config.sodaMetaDataCache);
    });

    it('255.3.5 sodaMetaDataCache set to false', async function() {
      const config = {
        sodaMetaDataCache: false
      };
      // The SODA metadata cache is available with Oracle Client 21.3 and
      // in 19 from 19.11
      const clientVersion = testsUtil.getClientVersion();
      if (clientVersion < 2103000000) {
        if (clientVersion < 1911000000 || clientVersion >= 2000000000) {
          this.skip();
        }
      }
      await pool.reconfigure(config);
      assert.strictEqual(pool.sodaMetaDataCache, config.sodaMetaDataCache);
      checkOriginalPoolConfig(pool);
    });

  });

  describe('255.4 Pool properties NOT dynamically configurable, they will be ignored', function() {
    let pool;

    beforeEach(async function() {
      if (oracledb.thin)
        return this.skip();
      pool = await oracledb.createPool(poolConfig);
      checkOriginalPoolConfig(pool);
    });

    afterEach(async function() {
      if (oracledb.thin)
        return this.skip();
      await pool.close(0);
    });

    it('255.4.1 connectionsInUse', async function() {
      const conn = await testsUtil.getPoolConnection(pool);
      await pool.reconfigure({connectionsInUse: 3});
      assert.strictEqual(pool.connectionsInUse, 1);
      await conn.close();
      assert.strictEqual(pool.connectionsInUse, 0);
    });

    it('255.4.2 connectionsOpen', async function() {
      if (dbConfig.test.drcp) this.skip();

      if (dbConfig.test.externalAuth) {
        assert.strictEqual(pool.connectionsOpen, 0);
      } else {
        assert.strictEqual(pool.connectionsOpen, poolMinOriginalVal);
      }

      await pool.reconfigure({connectionsOpen: 2});

      if (dbConfig.test.externalAuth) {
        assert.strictEqual(pool.connectionsOpen, 0);
      } else {
        assert.strictEqual(pool.connectionsOpen, poolMinOriginalVal);
      }

    });

    it('255.4.3 connectString', async function() {
      await pool.reconfigure({connectString: 'invalid_connection_string'});
      const conn = await testsUtil.getPoolConnection(pool);
      await conn.close();
    });

    it('255.4.4 connectionString', async function() {
      await pool.reconfigure({connectionString: 'invalid_connection_string'});
      const conn = await testsUtil.getPoolConnection(pool);
      await conn.close();
    });

    it('255.4.5 edition', async function() {
      const editionBak = oracledb.edition;
      await pool.reconfigure({edition: 'e2'});
      assert.strictEqual(oracledb.edition, editionBak);
    });

    it('255.4.6 events', async function() {
      const eventsBak = oracledb.events;
      await pool.reconfigure({events: true});
      assert.strictEqual(oracledb.events, eventsBak);
    });

    it('255.4.7 homogeneous', async function() {
      const homogeneousBak = pool.homogeneous;
      await pool.reconfigure ({homogeneous: false});
      assert.strictEqual(pool.homogeneous, homogeneousBak);
    });

    it('255.4.8 externalAuth', async function() {
      const externalAuthBak = oracledb.externalAuth;
      await pool.reconfigure({externalAuth: true});
      assert.strictEqual(oracledb.externalAuth, externalAuthBak);
    });

    it('255.4.9 password', async function() {
      await pool.reconfigure({password: 'testing'});
      assert.strictEqual(oracledb.password, undefined);
    });

    it('255.4.10 poolAlias', async function() {
      const poolAliasBak = pool.poolAlias;
      await pool.reconfigure({poolAlias: 'poolalias1'});
      assert.strictEqual(pool.poolAlias, poolAliasBak);
    });

    it('255.4.11 status', async function() {
      const statusBak = pool.status;
      await pool.reconfigure({status: oracledb.POOL_STATUS_DRAINING});
      assert.strictEqual(pool.status, statusBak);
    });

    it('255.4.12 username', async function() {
      await pool.reconfigure({username: 'testinguser'});
      assert.strictEqual(pool.username, undefined);
    });

    it('255.4.13 user', async function() {
      await pool.reconfigure({user: 'testinguser'});
      assert.strictEqual(pool.user, dbConfig.user);
    });

    it('255.4.14 _enableStats', async function() {
      await pool.close(0);

      pool = await oracledb.createPool(dbConfig);

      const config1 = {
        resetStatistics: true,
        _enableStats: true
      };
      await pool.reconfigure(config1);
      const poolStatistics1 = pool.getStatistics();
      assert.strictEqual(pool._enableStats, false);
      assert.strictEqual(pool.enableStatistics, false);
      assert.strictEqual(poolStatistics1, null);

      const config2 = {
        _enableStats: true
      };
      await pool.reconfigure(config2);
      const poolStatistics2 = pool.getStatistics();
      assert.strictEqual(pool._enableStats, false);
      assert.strictEqual(pool.enableStatistics, false);
      assert.strictEqual(poolStatistics2, null);

      const config3 = {
        resetStatistics: false,
        _enableStats: true
      };
      await pool.reconfigure(config3);
      const poolStatistics3 = pool.getStatistics();
      assert.strictEqual(pool._enableStats, false);
      assert.strictEqual(pool.enableStatistics, false);
      assert.strictEqual(poolStatistics3, null);

    });

  });

  describe('255.5 Negative cases', function() {
    let pool;
    let poolMin = 2;
    let poolMax = 50;
    let poolIncrement = 2;
    let enableStatistics = true;
    let poolPingInterval = 10;
    let poolTimeout = 20;
    let poolMaxPerShard = 2;
    let queueMax = 10;
    let queueTimeout = 5;
    let stmtCacheSize = 10;
    let sodaMetaDataCache = true;
    let resetStatistics = true;

    let config =  {
      poolMin: poolMin,
      poolMax: poolMax,
      poolIncrement: poolIncrement,
      enableStatistics: enableStatistics,
      poolPingInterval: poolPingInterval,
      poolTimeout: poolTimeout,
      poolMaxPerShard: poolMaxPerShard,
      queueMax: queueMax,
      queueTimeout: queueTimeout,
      stmtCacheSize: stmtCacheSize,
      sodaMetaDataCache: sodaMetaDataCache,
      resetStatistics: resetStatistics
    };

    beforeEach(async function() {
      if (oracledb.thin)
        return this.skip();
      pool = await oracledb.createPool(poolConfig);
      checkOriginalPoolConfig(pool);
    });

    afterEach(async function() {
      if (oracledb.thin)
        return this.skip();
      await pool.close(0);
    });

    it('255.5.1 passing empty config to pool.reconfigure', async function() {
      const config = {};

      await pool.reconfigure(config);
      checkOriginalPoolConfig(pool);
    });

    it('255.5.2 passing invalid poolMin to pool.reconfigure', async function() {
      await assert.rejects(
        async () => await pool.reconfigure({poolMin: -1}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolMin: NaN}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolMin: null}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolMin: '10'}),
        /NJS-007:/
      );
    });

    it('255.5.3 passing invalid poolMax to pool.reconfigure', async function() {
      await assert.rejects(
        async () => await pool.reconfigure ({ poolMax: -1 }),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolMax: NaN}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolMax: null}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolMax: 0}),
        /ORA-24413:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolMax: "10"}),
        /NJS-007:/
      );

    });

    it('255.5.4 passing invalid poolIncrement to pool.reconfigure', async function() {
      await assert.rejects(
        async () => await pool.reconfigure ({poolIncrement: -1 }),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({ poolIncrement: NaN}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolIncrement: null}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolIncrement: "100"}),
        /NJS-007:/
      );

    });

    it('255.5.5 passing invalid enableStatistics to pool.reconfigure', async function() {
      await assert.rejects(
        async () => await pool.reconfigure({enableStatistics: null}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({enableStatistics: -100}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({enableStatistics: NaN}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({enableStatistics: "true"}),
        /NJS-007:/
      );
    });

    it('255.5.6 passing invalid poolPingInterval to pool.reconfigure', async function() {
      await assert.rejects(
        async () => await pool.reconfigure({poolPingInterval: null}),
        /NJS-007/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolPingInterval: NaN}),
        /NJS-007/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolPingInterval: "10"}),
        /NJS-007/
      );

    });

    it('255.5.7 passing invalid poolTimeout to pool.reconfigure', async function() {
      await assert.rejects(
        async () => await pool.reconfigure({poolTimeout: null}),
        /NJS-007/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolTimeout: -100}),
        /NJS-007/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolTimeout: NaN}),
        /NJS-007/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolTimeout: "10"}),
        /NJS-007/
      );
    });

    it('255.5.8 passing invalid poolMaxPerShard to pool.reconfigure', async function() {
      await assert.rejects(
        async () => await pool.reconfigure({poolMaxPerShard: null}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolMaxPerShard: -100}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolMaxPerShard: NaN}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({poolMaxPerShard: "10"}),
        /NJS-007:/
      );
    });

    it('255.5.9 passing invalid queueMax to pool.reconfigure', async function() {
      await assert.rejects(
        async () => await pool.reconfigure({queueMax: null}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({queueMax: -100}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({queueMax: NaN}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({queueMax: "10"}),
        /NJS-007:/
      );

    });

    it('255.5.10 passing invalid queueTimeout to pool.reconfigure', async function() {
      await assert.rejects(
        async () => await pool.reconfigure ({queueTimeout: null}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({queueTimeout: -100}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({queueTimeout: NaN}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure ({queueTimeout: "10"}),
        /NJS-007:/
      );

    });

    it('255.5.11 passing invalid stmtCacheSize to pool.reconfigure', async function() {
      await assert.rejects(
        async () => await pool.reconfigure({stmtCacheSize: null}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({stmtCacheSize: -100}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({stmtCacheSize: NaN}),
        /NJS-007:/
      );

      await assert.rejects(
        async () => await pool.reconfigure({stmtCacheSize: "10"}),
        /NJS-007:/
      );
    });

    it('255.5.12 calling pool.reconfigure multiple times with empty config', async function() {
      const config = {};
      await pool.reconfigure(config);
      await pool.reconfigure(config);
      await pool.reconfigure(config);
      await pool.reconfigure(config);
      await pool.reconfigure(config);
      await pool.reconfigure(config);
      await pool.reconfigure(config);
      await pool.reconfigure(config);
      await pool.reconfigure(config);
      await pool.reconfigure(config);
      checkOriginalPoolConfig(pool);
      await pool.reconfigure(config);
      await pool.reconfigure(config);
      await pool.reconfigure(config);
      checkOriginalPoolConfig(pool);
    });

    it('255.5.13 calling pool.reconfigure multiple times', async function() {
      const clientVersion = testsUtil.getClientVersion();
      if (clientVersion < 2103000000) {
        if (clientVersion < 1911000000 || clientVersion >= 2000000000) {
          this.skip();
        }
      }
      await pool.reconfigure(config);
      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMin, poolMin);
      assert.strictEqual(pool.poolMax, poolMax);
      assert.strictEqual(pool.poolIncrement, poolIncrement);
      assert.strictEqual(pool.poolPingInterval, poolPingInterval);
      assert.strictEqual(pool.poolTimeout, poolTimeout);
      assert.strictEqual(pool.poolMaxPerShard, poolMaxPerShard);
      assert.strictEqual(pool.queueMax, queueMax);
      assert.strictEqual(pool.queueTimeout, queueTimeout);
      assert.strictEqual(pool.stmtCacheSize, stmtCacheSize);

      poolMin = 5;
      poolMax = 10;
      poolIncrement = 1;
      enableStatistics = false;
      poolPingInterval = 10;
      poolTimeout = 2;
      poolMaxPerShard = 4;
      queueMax = 1;
      queueTimeout = 9;
      stmtCacheSize = 2;
      sodaMetaDataCache = false;
      resetStatistics = false;

      config =  {
        poolMin: poolMin,
        poolMax: poolMax,
        poolIncrement: poolIncrement,
        enableStatistics: enableStatistics,
        poolPingInterval: poolPingInterval,
        poolTimeout: poolTimeout,
        poolMaxPerShard: poolMaxPerShard,
        queueMax: queueMax,
        queueTimeout: queueTimeout,
        stmtCacheSize: stmtCacheSize,
        sodaMetaDataCache: sodaMetaDataCache,
        resetStatistics: resetStatistics
      };

      await pool.reconfigure(config);
      await pool.reconfigure(config);
      await pool.reconfigure(config);
      assert.strictEqual(pool.poolMin, poolMin);
      assert.strictEqual(pool.poolMax, poolMax);
      assert.strictEqual(pool.poolIncrement, poolIncrement);
      assert.strictEqual(pool.poolPingInterval, poolPingInterval);
      assert.strictEqual(pool.poolTimeout, poolTimeout);
      assert.strictEqual(pool.poolMaxPerShard, poolMaxPerShard);
      assert.strictEqual(pool.queueMax, queueMax);
      assert.strictEqual(pool.queueTimeout, queueTimeout);
      assert.strictEqual(pool.stmtCacheSize, stmtCacheSize);
    });

    it('255.5.14 reconfigure closed pool', async function() {
      await pool.close(0);
      const config =  {
        poolMin: poolMin,
        poolMax: poolMax,
        poolIncrement: poolIncrement,
        enableStatistics: enableStatistics,
        poolPingInterval: poolPingInterval,
        poolTimeout: poolTimeout,
        poolMaxPerShard: poolMaxPerShard,
        queueMax: queueMax,
        queueTimeout: queueTimeout,
        stmtCacheSize: stmtCacheSize,
        sodaMetaDataCache: sodaMetaDataCache,
        resetStatistics: resetStatistics
      };

      await assert.rejects(
        async () => await pool.reconfigure(config),
        /NJS-065:/
      );
      await assert.rejects(
        async () => await pool.reconfigure(config),
        /NJS-065:/
      );
      pool = await oracledb.createPool(poolConfig);

    });

    it('255.5.15 get statistics of a closed pool', async function() {
      const config = {
        resetStatistics: true,
        enableStatistics: true
      };
      await pool.reconfigure(config);
      await pool.close(0);

      assert.throws(
        () => pool.getStatistics(),
        /NJS-065/
      );

      pool = await oracledb.createPool(poolConfig);

    });

  });

  describe('255.6 Pool statistics', function() {
    beforeEach(function() {
      if (oracledb.thin)
        return this.skip();
    });

    afterEach(function() {
      if (oracledb.thin)
        return this.skip();
    });

    it('255.6.1 get pool statistics by setting _enableStats', async function() {
      let poolConfig = {
        ...dbConfig,
        poolAlias: "255.6.1.1",
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        _enableStats: false
      };
      let pool = await oracledb.createPool(poolConfig);
      assert.strictEqual(pool.poolAlias, "255.6.1.1");

      let conns = new Array();
      let conIndex;
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool);
        conns.push(conn);
      }
      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool),
        /NJS-040:/
      );

      let poolStatistics = pool.getStatistics();
      assert.strictEqual(poolStatistics, null);
      const timeOfLastResetOriginalVal = pool._timeOfReset;

      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = conns[conIndex];
        await conn.close();
      }

      // Close the existing pool
      await pool.close(0);

      poolConfig = {
        ...dbConfig,
        poolAlias: "255.6.1.2",
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        _enableStats: true
      };

      pool = await oracledb.createPool(poolConfig);

      conns = new Array();
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool);
        conns.push(conn);
      }
      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool),
        /NJS-040:/
      );

      poolStatistics = pool.getStatistics();

      assert(poolStatistics.upTime > 0);
      assert(poolStatistics.upTimeSinceReset > 0);
      assert(pool._timeOfReset > timeOfLastResetOriginalVal);
      assert.strictEqual(poolStatistics.connectionRequests, poolMaxOriginalVal + 1);
      assert.strictEqual(poolStatistics.requestsEnqueued, 1);
      assert.strictEqual(poolStatistics.requestsDequeued, 0);
      assert.strictEqual(poolStatistics.failedRequests, 0);
      assert.strictEqual(poolStatistics.rejectedRequests, 0);
      assert.strictEqual(poolStatistics.requestTimeouts, 1);
      assert.strictEqual(poolStatistics.currentQueueLength, 0);
      assert.strictEqual(poolStatistics.maximumQueueLength, 1);
      assert(poolStatistics.minimumTimeInQueue > 0);
      assert(poolStatistics.maximumTimeInQueue > 0);
      assert(poolStatistics.timeInQueue >= 4);  // can be just less than 5
      assert(poolStatistics.averageTimeInQueue >= 4);  // can be just less than 5
      assert.strictEqual(poolStatistics.connectionsInUse, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.connectionsOpen, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.poolAlias, "255.6.1.2");
      assert.strictEqual(poolStatistics.queueMax, 500);
      assert.strictEqual(poolStatistics.queueTimeout, 5);
      assert.strictEqual(poolStatistics.poolMin, poolMinOriginalVal);
      assert.strictEqual(poolStatistics.poolMax, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.poolIncrement, poolIncrementOriginalVal);
      assert.strictEqual(poolStatistics.poolPingInterval, 60);
      assert.strictEqual(poolStatistics.poolTimeout, 60);
      assert.strictEqual(poolStatistics.poolMaxPerShard, 0);
      assert.strictEqual(poolStatistics.sessionCallback, undefined);
      assert.strictEqual(poolStatistics.stmtCacheSize, 30);
      assert.strictEqual(poolStatistics.sodaMetaDataCache, false);
      assert.strictEqual(poolStatistics.threadPoolSize, undefined);

      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = conns[conIndex];
        await conn.close();
      }
      await pool.close(0);
    });

    it('255.6.2 get pool statistics by setting _enableStats', async function() {
      let poolConfig = {
        ...dbConfig,
        poolAlias: "255.6.2.1",
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        _enableStats: false
      };
      const pool1 = await oracledb.createPool(poolConfig);
      assert.strictEqual(pool1.poolAlias, "255.6.2.1");

      let conns = [];
      for (let i = 0; i < poolMaxOriginalVal; i++) {
        const conn = await testsUtil.getPoolConnection(pool1);
        conns.push(conn);
      }
      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool1),
        /NJS-040/ // NJS-040: connection request timeout. Request exceeded queueTimeout of 5
      );

      let poolStatistics = pool1.getStatistics();
      assert.strictEqual(poolStatistics, null);
      const timeOfLastResetOriginalVal = pool1._timeOfReset;

      for (let i = 0; i < poolMaxOriginalVal; i++) {
        await conns[i].close();
      }
      // NOT close the existing pool

      poolConfig = {
        ...dbConfig,
        poolAlias: "255.6.2.2",
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        _enableStats: true
      };

      const pool2 = await oracledb.createPool(poolConfig);

      conns = new Array();
      for (let i = 0; i < poolMaxOriginalVal; i++) {
        const conn = await testsUtil.getPoolConnection(pool2);
        conns.push(conn);
      }
      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool2),
        /NJS-040/
      );
      // NJS-040: connection request timeout. Request exceeded queueTimeout of 5

      poolStatistics = pool2.getStatistics();

      assert(poolStatistics.gatheredDate > 0);
      assert(poolStatistics.upTime > 0);
      assert(poolStatistics.upTimeSinceReset > 0);
      assert(pool2._timeOfReset > timeOfLastResetOriginalVal);
      assert.strictEqual(poolStatistics.connectionRequests, poolMaxOriginalVal + 1);
      assert.strictEqual(poolStatistics.requestsEnqueued, 1);
      assert.strictEqual(poolStatistics.requestsDequeued, 0);
      assert.strictEqual(poolStatistics.failedRequests, 0);
      assert.strictEqual(poolStatistics.rejectedRequests, 0);
      assert.strictEqual(poolStatistics.requestTimeouts, 1);
      assert.strictEqual(poolStatistics.currentQueueLength, 0);
      assert.strictEqual(poolStatistics.maximumQueueLength, 1);
      assert(poolStatistics.minimumTimeInQueue > 0);
      assert(poolStatistics.maximumTimeInQueue > 0);
      assert(poolStatistics.timeInQueue >= 5);
      assert(poolStatistics.averageTimeInQueue >= 5);
      assert.strictEqual(poolStatistics.connectionsInUse, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.connectionsOpen, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.poolAlias, '255.6.2.2');
      assert.strictEqual(poolStatistics.queueMax, 500);
      assert.strictEqual(poolStatistics.queueTimeout, 5);
      assert.strictEqual(poolStatistics.poolMin, poolMinOriginalVal);
      assert.strictEqual(poolStatistics.poolMax, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.poolIncrement, poolIncrementOriginalVal);
      assert.strictEqual(poolStatistics.poolPingInterval, 60);
      assert.strictEqual(poolStatistics.poolTimeout, 60);
      assert.strictEqual(poolStatistics.poolMaxPerShard, 0);
      assert.strictEqual(poolStatistics.sessionCallback, undefined);
      assert.strictEqual(poolStatistics.stmtCacheSize, 30);
      assert.strictEqual(poolStatistics.sodaMetaDataCache, false);
      assert.strictEqual(poolStatistics.threadPoolSize, undefined);

      for (let i = 0; i < poolMaxOriginalVal; i++) {
        await conns[i].close();
      }
      await pool1.close(0);
      await pool2.close(0);
    });

    it('255.6.3 set enableStatistics to true, _enableStats will be ignored', async function() {
      const poolConfig = {
        ...dbConfig,
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        _enableStats: false,
        enableStatistics: true
      };

      const pool1 = await oracledb.createPool(poolConfig);

      const poolStatistics1 = pool1.getStatistics();
      assert.strictEqual(pool1._enableStats, true);
      assert.strictEqual(pool1.enableStatistics, true);
      assert(poolStatistics1.gatheredDate > 0);
      await pool1.close(0);

      const poolConfig2 = {
        ...dbConfig,
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        _enableStats: true,
        enableStatistics: true
      };

      const pool2 = await oracledb.createPool(poolConfig2);
      const poolStatistics2 = pool2.getStatistics();
      assert.strictEqual(pool2._enableStats, true);
      assert.strictEqual(pool2.enableStatistics, true);
      assert(poolStatistics2.gatheredDate > 0);
      await pool2.close(0);

    });

    it('255.6.4 set enableStatistics to false, _enableStats will be used', async function() {
      const poolConfig = {
        ...dbConfig,
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        enableStatistics: false,
        _enableStats: false
      };

      const pool1 = await oracledb.createPool(poolConfig);

      const poolStatistics1 = pool1.getStatistics();
      assert.strictEqual(pool1._enableStats, false);
      assert.strictEqual(pool1.enableStatistics, false);
      assert.strictEqual(poolStatistics1, null);
      await pool1.close(0);

      const poolConfig2 = {
        ...dbConfig,
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        enableStatistics: false,
        _enableStats: true
      };

      const pool2 = await oracledb.createPool(poolConfig2);
      const poolStatistics2 = pool2.getStatistics();
      assert.strictEqual(pool2._enableStats, true);
      assert.strictEqual(pool2.enableStatistics, true);
      assert(poolStatistics2.gatheredDate > 0);
      await pool2.close(0);

    });

    it('255.6.5 set multiple enableStatistics', async function() {
      const poolConfig = {
        ...dbConfig,
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        enableStatistics: false,
        enableStatistics : true //eslint-disable-line
      };

      const pool1 = await oracledb.createPool(poolConfig);

      const poolStatistics1 = pool1.getStatistics();
      assert.strictEqual(pool1._enableStats, true);
      assert.strictEqual(pool1.enableStatistics, true);
      assert(poolStatistics1.gatheredDate > 0);
      await pool1.close(0);

      const poolConfig2 = {
        ...dbConfig,
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        enableStatistics: true,
        enableStatistics : false //eslint-disable-line
      };

      const pool2 = await oracledb.createPool(poolConfig2);
      const poolStatistics2 = pool2.getStatistics();
      assert.strictEqual(pool2._enableStats, false);
      assert.strictEqual(pool2.enableStatistics, false);
      assert.strictEqual(poolStatistics2, null);
      await pool2.close(0);

      const poolConfig3 = {
        ...dbConfig,
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        enableStatistics: true,
        enableStatistics : false, //eslint-disable-line
        enableStatistics : false //eslint-disable-line
      };

      const pool3 = await oracledb.createPool(poolConfig3);
      const poolStatistics3 = pool3.getStatistics();
      assert.strictEqual(pool3._enableStats, false);
      assert.strictEqual(pool3.enableStatistics, false);
      assert.strictEqual(poolStatistics3, null);
      await pool3.close(3);

    });

    it('255.6.6 set multiple _enableStats', async function() {
      const poolConfig = {
        ...dbConfig,
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        _enableStats: false,
        _enableStats     : true //eslint-disable-line
      };

      const pool1 = await oracledb.createPool(poolConfig);

      const poolStatistics1 = pool1.getStatistics();
      assert.strictEqual(pool1._enableStats, true);
      assert.strictEqual(pool1.enableStatistics, true);
      assert(poolStatistics1.gatheredDate > 0);
      await pool1.close(0);

      const poolConfig2 = {
        ...dbConfig,
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        _enableStats: true,
        _enableStats     : false //eslint-disable-line
      };

      const pool2 = await oracledb.createPool(poolConfig2);
      const poolStatistics2 = pool2.getStatistics();
      assert.strictEqual(pool2._enableStats, false);
      assert.strictEqual(pool2.enableStatistics, false);
      assert.strictEqual(poolStatistics2, null);
      await pool2.close(0);

      const poolConfig3 = {
        ...dbConfig,
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        enableStatistics: true,
        enableStatistics : false, //eslint-disable-line
        enableStatistics : false //eslint-disable-line
      };

      const pool3 = await oracledb.createPool(poolConfig3);
      const poolStatistics3 = pool3.getStatistics();
      assert.strictEqual(pool3._enableStats, false);
      assert.strictEqual(pool3.enableStatistics, false);
      assert.strictEqual(poolStatistics3, null);
      await pool3.close(0);

    });

    it('255.6.7 get pool statistics by setting enableStatistics', async function() {
      let poolConfig = {
        ...dbConfig,
        poolAlias: "255.6.7.1",
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        enableStatistics: false
      };
      let pool = await oracledb.createPool(poolConfig);
      assert.strictEqual(pool.poolAlias, "255.6.7.1");

      let conns = new Array();
      let conIndex;
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool);
        conns.push(conn);
      }
      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool),
        /NJS-040:/
      );

      let poolStatistics = pool.getStatistics();
      assert.strictEqual(poolStatistics, null);
      const timeOfLastResetOriginalVal = pool._timeOfReset;

      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = conns[conIndex];
        await conn.close();
      }

      // Close the existing pool
      await pool.close(0);

      poolConfig = {
        ...dbConfig,
        poolAlias: "255.6.7.2",
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        enableStatistics: true
      };

      pool = await oracledb.createPool(poolConfig);

      conns = new Array();
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool);
        conns.push(conn);
      }
      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool),
        /NJS-040:/
      );

      poolStatistics = pool.getStatistics();

      assert(poolStatistics.upTime > 0);
      assert(poolStatistics.upTimeSinceReset > 0);
      assert(pool._timeOfReset > timeOfLastResetOriginalVal);
      assert.strictEqual(poolStatistics.connectionRequests, poolMaxOriginalVal + 1);
      assert.strictEqual(poolStatistics.requestsEnqueued, 1);
      assert.strictEqual(poolStatistics.requestsDequeued, 0);
      assert.strictEqual(poolStatistics.failedRequests, 0);
      assert.strictEqual(poolStatistics.rejectedRequests, 0);
      assert.strictEqual(poolStatistics.requestTimeouts, 1);
      assert.strictEqual(poolStatistics.currentQueueLength, 0);
      assert.strictEqual(poolStatistics.maximumQueueLength, 1);
      assert(poolStatistics.minimumTimeInQueue > 0);
      assert(poolStatistics.maximumTimeInQueue > 0);
      assert(poolStatistics.timeInQueue >= 4); // can be just less than 5
      assert(poolStatistics.averageTimeInQueue >= 4);  // can be just less than 5
      assert.strictEqual(poolStatistics.connectionsInUse, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.connectionsOpen, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.poolAlias, "255.6.7.2");
      assert.strictEqual(poolStatistics.queueMax, 500);
      assert.strictEqual(poolStatistics.queueTimeout, 5);
      assert.strictEqual(poolStatistics.poolMin, poolMinOriginalVal);
      assert.strictEqual(poolStatistics.poolMax, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.poolIncrement, poolIncrementOriginalVal);
      assert.strictEqual(poolStatistics.poolPingInterval, 60);
      assert.strictEqual(poolStatistics.poolTimeout, 60);
      assert.strictEqual(poolStatistics.poolMaxPerShard, 0);
      assert.strictEqual(poolStatistics.sessionCallback, undefined);
      assert.strictEqual(poolStatistics.stmtCacheSize, 30);
      assert.strictEqual(poolStatistics.sodaMetaDataCache, false);
      assert.strictEqual(poolStatistics.threadPoolSize, undefined);

      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = conns[conIndex];
        await conn.close();
      }
      await pool.close(0);
    });

    it('255.6.8 get pool statistics by setting enableStatistics', async function() {
      let poolConfig = {
        ...dbConfig,
        poolAlias: "255.6.8.1",
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        enableStatistics: false
      };
      const pool1 = await oracledb.createPool(poolConfig);
      assert.strictEqual(pool1.poolAlias, "255.6.8.1");

      let conns = new Array();
      let conIndex;
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool1);
        conns.push(conn);
      }
      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool1),
        /NJS-040:/
      );

      let poolStatistics = pool1.getStatistics();
      assert.strictEqual(poolStatistics, null);
      const timeOfLastResetOriginalVal = pool1._timeOfReset;

      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = conns[conIndex];
        await conn.close();
      }
      // NOT close the existing pool

      poolConfig = {
        ...dbConfig,
        poolAlias: "255.6.8.2",
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        enableStatistics: true
      };

      const pool2 = await oracledb.createPool(poolConfig);

      conns = new Array();
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool2);
        conns.push(conn);
      }
      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool2),
        /NJS-040:/
      );

      poolStatistics = pool2.getStatistics();

      assert(poolStatistics.gatheredDate > 0);
      assert(poolStatistics.upTime > 0);
      assert(poolStatistics.upTimeSinceReset > 0);
      assert(pool2._timeOfReset > timeOfLastResetOriginalVal);
      assert.strictEqual(poolStatistics.connectionRequests, poolMaxOriginalVal + 1);
      assert.strictEqual(poolStatistics.requestsEnqueued, 1);
      assert.strictEqual(poolStatistics.requestsDequeued, 0);
      assert.strictEqual(poolStatistics.failedRequests, 0);
      assert.strictEqual(poolStatistics.rejectedRequests, 0);
      assert.strictEqual(poolStatistics.requestTimeouts, 1);
      assert.strictEqual(poolStatistics.currentQueueLength, 0);
      assert.strictEqual(poolStatistics.maximumQueueLength, 1);
      assert(poolStatistics.minimumTimeInQueue > 0);
      assert(poolStatistics.maximumTimeInQueue > 0);
      assert(poolStatistics.timeInQueue >= 5,
        `timeInQueue should be >= 5 but is ${poolStatistics.timeInQueue}`);
      assert(poolStatistics.averageTimeInQueue >= 5);
      assert.strictEqual(poolStatistics.connectionsInUse, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.connectionsOpen, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.poolAlias, "255.6.8.2");
      assert.strictEqual(poolStatistics.queueMax, 500);
      assert.strictEqual(poolStatistics.queueTimeout, 5);
      assert.strictEqual(poolStatistics.poolMin, poolMinOriginalVal);
      assert.strictEqual(poolStatistics.poolMax, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.poolIncrement, poolIncrementOriginalVal);
      assert.strictEqual(poolStatistics.poolPingInterval, 60);
      assert.strictEqual(poolStatistics.poolTimeout, 60);
      assert.strictEqual(poolStatistics.poolMaxPerShard, 0);
      assert.strictEqual(poolStatistics.sessionCallback, undefined);
      assert.strictEqual(poolStatistics.stmtCacheSize, 30);
      assert.strictEqual(poolStatistics.sodaMetaDataCache, false);
      assert.strictEqual(poolStatistics.threadPoolSize, undefined);

      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = conns[conIndex];
        await conn.close();
      }
      await pool1.close(0);
      await pool2.close(0);
    });

    it('255.6.9 get pool statistics by setting enableStatistics and _enableStats', async function() {
      let poolConfig = {
        ...dbConfig,
        poolAlias: "255.6.9.1",
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        enableStatistics: false
      };
      const pool1 = await oracledb.createPool(poolConfig);
      let conns = new Array();
      let conIndex;
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool1);
        conns.push(conn);
      }
      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool1),
        /NJS-040:/
      );

      let poolStatistics = pool1.getStatistics();
      assert.strictEqual(poolStatistics, null);
      const timeOfLastResetOriginalVal = pool1._timeOfReset;

      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = conns[conIndex];
        await conn.close();
      }
      // NOT close the existing pool

      poolConfig = {
        ...dbConfig,
        poolAlias: "255.6.9.2",
        poolMin: poolMinOriginalVal,
        poolMax: poolMaxOriginalVal,
        poolIncrement: poolIncrementOriginalVal,
        queueTimeout: 5,
        _enableStats: true
      };

      const pool2 = await oracledb.createPool(poolConfig);

      conns = new Array();
      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = await testsUtil.getPoolConnection(pool2);
        conns.push(conn);
      }
      await assert.rejects(
        async () => await testsUtil.getPoolConnection(pool2),
        /NJS-040:/
      );

      poolStatistics = pool2.getStatistics();

      assert(poolStatistics.gatheredDate > 0);
      assert(poolStatistics.upTime > 0);
      assert(poolStatistics.upTimeSinceReset > 0);
      assert(pool2._timeOfReset > timeOfLastResetOriginalVal);
      assert.strictEqual(poolStatistics.connectionRequests, poolMaxOriginalVal + 1);
      assert.strictEqual(poolStatistics.requestsEnqueued, 1);
      assert.strictEqual(poolStatistics.requestsDequeued, 0);
      assert.strictEqual(poolStatistics.failedRequests, 0);
      assert.strictEqual(poolStatistics.rejectedRequests, 0);
      assert.strictEqual(poolStatistics.requestTimeouts, 1);
      assert.strictEqual(poolStatistics.currentQueueLength, 0);
      assert.strictEqual(poolStatistics.maximumQueueLength, 1);
      assert(poolStatistics.minimumTimeInQueue > 0);
      assert(poolStatistics.maximumTimeInQueue > 0);
      assert(poolStatistics.timeInQueue >= 5);
      assert(poolStatistics.averageTimeInQueue >= 5);
      assert.strictEqual(poolStatistics.connectionsInUse, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.connectionsOpen, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.poolAlias, "255.6.9.2");
      assert.strictEqual(poolStatistics.queueMax, 500);
      assert.strictEqual(poolStatistics.queueTimeout, 5);
      assert.strictEqual(poolStatistics.poolMin, poolMinOriginalVal);
      assert.strictEqual(poolStatistics.poolMax, poolMaxOriginalVal);
      assert.strictEqual(poolStatistics.poolIncrement, poolIncrementOriginalVal);
      assert.strictEqual(poolStatistics.poolPingInterval, 60);
      assert.strictEqual(poolStatistics.poolTimeout, 60);
      assert.strictEqual(poolStatistics.poolMaxPerShard, 0);
      assert.strictEqual(poolStatistics.sessionCallback, undefined);
      assert.strictEqual(poolStatistics.stmtCacheSize, 30);
      assert.strictEqual(poolStatistics.sodaMetaDataCache, false);
      assert.strictEqual(poolStatistics.threadPoolSize, undefined);

      for (conIndex = 0; conIndex < poolMaxOriginalVal; conIndex++) {
        const conn = conns[conIndex];
        await conn.close();
      }
      await pool1.close(0);
      await pool2.close(0);
    });

    it('255.6.10 logStatistics without enableStatistics', async function() {
      const pool = await oracledb.createPool(dbConfig);

      assert.throws(
        () => pool.logStatistics(),
        /NJS-083:/
      );

      await pool.close(0);
    });

  });

});

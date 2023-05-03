/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https: *oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http: *www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https: *www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   269. poolTimeout.js
 *
 * DESCRIPTION
 *   Testing poolTimeout feature of pool.
 *
 ******************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');

describe('269. Pool Timeout', function() {

  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  it('269.1 poolTimeout as 0, no idle connection removals', async () => {
    let pool, conn1, conn2, conn3;
    try {
      pool = await oracledb.createPool({
        ...dbConfig,
        poolMin           : 0,
        poolMax           : 10,
        poolIncrement     : 1,
        poolTimeout       : 0,
        homogeneous       : true
      });
      assert.ok(pool);
      conn1 = await pool.getConnection();
      assert.deepStrictEqual(pool.connectionsOpen, 1);
      assert.deepStrictEqual(pool.connectionsInUse, 1);
      conn2 = await pool.getConnection();
      assert.deepStrictEqual(pool.connectionsOpen, 2);
      assert.deepStrictEqual(pool.connectionsInUse, 2);
      if (conn1)
        await conn1.close();
      if (conn2)
        await conn2.close();
      await sleep(5000);
      conn3 = await pool.getConnection();
      assert.deepStrictEqual(pool.connectionsOpen, 2);
      assert.deepStrictEqual(pool.connectionsInUse, 1);
      if (conn3)
        await conn3.close();
    } catch (err) {
      assert.deepStrictEqual(err, {});
    } finally {
      try {
        if (pool)
          await pool.close(0);
      } catch (err) {
        assert.deepStrictEqual(err, {});
      }
    }
  });

  it('269.2 poolTimeout as 1sec, idle connection will get removed', async () => {
    let pool, conn1, conn2, conn3;
    try {
      pool = await oracledb.createPool({
        ...dbConfig,
        poolMin           : 0,
        poolMax           : 10,
        poolIncrement     : 1,
        poolTimeout       : 1,
        homogeneous       : true
      });
      assert.ok(pool);
      conn1 = await pool.getConnection();
      assert.deepStrictEqual(pool.connectionsOpen, 1);
      assert.deepStrictEqual(pool.connectionsInUse, 1);
      conn2 = await pool.getConnection();
      assert.deepStrictEqual(pool.connectionsOpen, 2);
      assert.deepStrictEqual(pool.connectionsInUse, 2);
      if (conn1)
        await conn1.close();
      if (conn2)
        await conn2.close();
      await sleep(5000);
      conn3 = await pool.getConnection();
      assert.deepStrictEqual(pool.connectionsOpen, 1);
      assert.deepStrictEqual(pool.connectionsInUse, 1);
      if (conn3)
        await conn3.close();
    } catch (err) {
      assert.deepStrictEqual(err, {});
    } finally {
      try {
        if (pool)
          await pool.close(0);
      } catch (err) {
        assert.deepStrictEqual(err, {});
      }
    }
  });

  it('269.3 poolTimeout as 1sec and min connection defined, idle connection will be removed', async () => {
    let pool, conn1, conn2, conn3;
    try {
      pool = await oracledb.createPool({
        ...dbConfig,
        poolMin           : 1,
        poolMax           : 10,
        poolIncrement     : 1,
        poolTimeout       : 1,
        homogeneous       : true
      });
      assert.ok(pool);
      conn1 = await pool.getConnection();
      assert.deepStrictEqual(pool.connectionsOpen, 1);
      assert.deepStrictEqual(pool.connectionsInUse, 1);
      conn2 = await pool.getConnection();
      assert.deepStrictEqual(pool.connectionsOpen, 2);
      assert.deepStrictEqual(pool.connectionsInUse, 2);
      if (conn1)
        await conn1.close();
      if (conn2)
        await conn2.close();
      await sleep(5000);
      conn3 = await pool.getConnection();
      assert.deepStrictEqual(pool.connectionsOpen, 1);
      assert.deepStrictEqual(pool.connectionsInUse, 1);
      if (conn3)
        await conn3.close();
    } catch (err) {
      assert.deepStrictEqual(err, {});
    } finally {
      try {
        if (pool)
          await pool.close(0);
      } catch (err) {
        assert.deepStrictEqual(err, {});
      }
    }
  });
  it('269.4 check default poolTimeout as 60sec', async () => {
    let pool, conn1, conn2, conn3;
    try {
      pool = await oracledb.createPool({
        ...dbConfig,
        poolMin           : 0,
        poolMax           : 10,
        poolIncrement     : 1,
        poolPingInterval  : 90,
        homogeneous       : true
      });
      assert.ok(pool);

      conn1 = await pool.getConnection();
      assert.deepStrictEqual(pool.connectionsOpen, 1);
      assert.deepStrictEqual(pool.connectionsInUse, 1);

      conn2 = await pool.getConnection();
      assert.deepStrictEqual(pool.connectionsOpen, 2);
      assert.deepStrictEqual(pool.connectionsInUse, 2);
      if (conn1)
        await conn1.close();
      if (conn2)
        await conn2.close();
      await sleep(70000);
      conn3 = await pool.getConnection();
      assert.deepStrictEqual(pool.connectionsOpen, 1);
      assert.deepStrictEqual(pool.connectionsInUse, 1);
      if (conn3)
        await conn3.close();
    } catch (err) {
      assert.deepStrictEqual(err, {});
    } finally {
      try {
        if (pool)
          await pool.close(0);
      } catch (err) {
        assert.deepStrictEqual(err, {});
      }
    }
  });
});

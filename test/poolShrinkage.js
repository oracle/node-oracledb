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
 *   279. poolShrinkage.js
 *
 * DESCRIPTION
 *   Testing pool shrinkage feature of pool.
 *
*******************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('../test/testsUtil.js');

describe('279. Pool Shrinkage', function() {
  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  it('279.1 pool shrinkage during connection acquire always maintain min connection in pool', async function() {
    if (!oracledb.thin) this.skip();

    const pool = await oracledb.createPool({
      ...dbConfig,
      poolMin: 2,
      poolMax: 10,
      poolTimeout: 1,
      homogeneous: true
    });
    assert.ok(pool);
    await testsUtil.checkAndWait(100, 50, () => pool.connectionsOpen === 2);
    await sleep(1100);
    const conn = await pool.getConnection();
    assert.strictEqual(pool.connectionsInUse, 1);
    await testsUtil.checkAndWait(100, 50, () => pool.connectionsOpen === 2);
    await conn.close();
    await pool.close(0);
  });

  it('279.2 pool shrinkage during connection acquire when poolTimeout greater than 0', async function() {
    if (!oracledb.thin) this.skip();

    const pool = await oracledb.createPool({
      ...dbConfig,
      poolMin: 0,
      poolMax: 10,
      poolTimeout: 1,
      poolIncrement: 1,
      homogeneous: true
    });
    assert.ok(pool);
    const conn1 = await pool.getConnection();
    assert.strictEqual(pool.connectionsInUse, 1);
    assert.strictEqual(pool.connectionsOpen, 1);
    await conn1.close();
    await sleep(1100);
    assert.strictEqual(pool.connectionsOpen, 0);
    assert.strictEqual(pool.connectionsInUse, 0);
    await pool.close(0);
  });

  it('279.3 pool shrinkage during connection release when poolTimeout greater than 0', async function() {
    if (!oracledb.thin) this.skip();

    const pool = await oracledb.createPool({
      ...dbConfig,
      poolMin: 0,
      poolMax: 10,
      poolIncrement: 2,
      poolTimeout: 1,
      homogeneous: true
    });
    assert.ok(pool);
    const conn = await pool.getConnection();
    await testsUtil.checkAndWait(100, 50, () => pool.connectionsOpen === 2);
    assert.strictEqual(pool.connectionsOpen, 2);
    assert.strictEqual(pool.connectionsInUse, 1);
    await conn.close();
    assert.strictEqual(pool.connectionsOpen, 2);
    assert.strictEqual(pool.connectionsInUse, 0);
    await sleep(2000);
    assert.strictEqual(pool.connectionsOpen, 0);
    assert.strictEqual(pool.connectionsInUse, 0);
    await pool.close(0);
  });

  it('279.4 pool shrinkage during connection release will wait for pool timeout time before emitting events', async function() {
    if (!oracledb.thin) this.skip();
    const pool = await oracledb.createPool({
      ...dbConfig,
      poolMin: 0,
      poolMax: 10,
      poolIncrement: 1,
      poolTimeout: 1,
      homogeneous: true
    });
    assert.ok(pool);
    const conn = await pool.getConnection();
    const conn1 = await pool.getConnection();
    const conn2 = await pool.getConnection();
    assert.strictEqual(pool.connectionsOpen, 3);
    assert.strictEqual(pool.connectionsInUse, 3);
    await conn.close();
    await conn1.close();
    assert.strictEqual(pool.connectionsOpen, 3);
    assert.strictEqual(pool.connectionsInUse, 1);
    await sleep(2000);
    await conn2.close();
    assert.strictEqual(pool.connectionsOpen, 1);
    assert.strictEqual(pool.connectionsInUse, 0);
    await pool.close(0);
  });

  it('279.5 pool shrinkage during connection release will wait for pool timeout time before emitting events while maintaining min connection', async function() {
    if (!oracledb.thin) this.skip();
    const pool = await oracledb.createPool({
      ...dbConfig,
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1,
      poolTimeout: 1,
      homogeneous: true
    });
    assert.ok(pool);
    const conn = await pool.getConnection();
    const conn1 = await pool.getConnection();
    const conn2 = await pool.getConnection();
    assert.strictEqual(pool.connectionsOpen, 3);
    assert.strictEqual(pool.connectionsInUse, 3);
    await conn.close();
    await conn1.close();
    assert.strictEqual(pool.connectionsOpen, 3);
    assert.strictEqual(pool.connectionsInUse, 1);
    await conn2.close();
    await sleep(2000);
    assert.strictEqual(pool.connectionsOpen, 1);
    assert.strictEqual(pool.connectionsInUse, 0);
    await pool.close(0);
  });

  it('279.6 pool shrinkage during connection release will not happen when poolTimeout equals to 0', async function() {
    if (!oracledb.thin) this.skip();

    const pool = await oracledb.createPool({
      ...dbConfig,
      poolMin: 0,
      poolMax: 10,
      poolIncrement: 3,
      poolTimeout: 0,
      homogeneous: true
    });
    assert.ok(pool);
    const conn = await pool.getConnection();
    await testsUtil.checkAndWait(100, 50, () => pool.connectionsOpen === 3);
    assert.strictEqual(pool.connectionsOpen, 3);
    assert.strictEqual(pool.connectionsInUse, 1);
    await conn.close();
    await sleep(1100);
    assert.strictEqual(pool.connectionsOpen, 3);
    assert.strictEqual(pool.connectionsInUse, 0);
    await pool.close(0);
  });

  it('279.7 pool shrinkage will not happen when poolTimeout is 0', async function() {
    if (!oracledb.thin) this.skip();

    const pool = await oracledb.createPool({
      ...dbConfig,
      poolMin: 0,
      poolMax: 10,
      poolTimeout: 0,
      poolIncrement: 3,
      homogeneous: true
    });
    assert.ok(pool);
    const conn = await pool.getConnection();
    await testsUtil.checkAndWait(100, 50, () => pool.connectionsOpen === 3);
    assert.strictEqual(pool.connectionsOpen, 3);
    assert.strictEqual(pool.connectionsInUse, 1);
    await sleep(1100);
    assert.strictEqual(pool.connectionsOpen, 3);
    assert.strictEqual(pool.connectionsInUse, 1);
    await conn.close();
    await pool.close(0);
  });

});

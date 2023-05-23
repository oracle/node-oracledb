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

((oracledb.thin) ? describe : describe.skip)('279. Pool Shrinkage', function() {

  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  it('279.1 pool shrinkage during connection acquire always maintain min connection in pool', async () => {
    let pool, conn;
    pool = await oracledb.createPool({
      ...dbConfig,
      poolMin           : 4,
      poolMax           : 10,
      poolTimeout       : 1,
      homogeneous       : true
    });
    assert.ok(pool);
    await sleep(1100);
    conn = await pool.getConnection();
    await conn.execute('SELECT 1 FROM DUAL');
    assert.deepStrictEqual(pool.connectionsOpen, 4);
    assert.deepStrictEqual(pool.connectionsInUse, 1);
    await conn.close();
    await pool.close(0);
  });

  it('279.2 pool shrinkage during connection acquire when poolTimeout greater than 0', async () => {
    let pool, conn1;
    pool = await oracledb.createPool({
      ...dbConfig,
      poolMin           : 0,
      poolMax           : 10,
      poolTimeout       : 1,
      poolIncrement     : 1,
      homogeneous       : true
    });
    assert.ok(pool);
    conn1 = await pool.getConnection();
    assert.deepStrictEqual(pool.connectionsOpen, 1);
    assert.deepStrictEqual(pool.connectionsInUse, 1);
    await conn1.close();
    await sleep(1100);
    assert.deepStrictEqual(pool.connectionsOpen, 0);
    assert.deepStrictEqual(pool.connectionsInUse, 0);
    await pool.close(0);
  });

  it('279.3 pool shrinkage during connection release when poolTimeout greater than 0', async () => {
    let pool, conn;
    pool = await oracledb.createPool({
      ...dbConfig,
      poolMin           : 0,
      poolMax           : 10,
      poolIncrement     : 3,
      poolTimeout       : 1,
      homogeneous       : true
    });
    assert.ok(pool);
    conn = await pool.getConnection();
    assert.deepStrictEqual(pool.connectionsOpen, 3);
    assert.deepStrictEqual(pool.connectionsInUse, 1);
    await conn.close();
    await sleep(1100);
    assert.deepStrictEqual(pool.connectionsOpen, 0);
    assert.deepStrictEqual(pool.connectionsInUse, 0);
    await pool.close(0);
  });

  it('279.4 pool shrinkage during connection release will wait for pool timeout time before emitting events', async () => {
    let pool, conn, conn1, conn2;
    pool = await oracledb.createPool({
      ...dbConfig,
      poolMin           : 0,
      poolMax           : 10,
      poolIncrement     : 1,
      poolTimeout       : 1,
      homogeneous       : true
    });
    assert.ok(pool);
    conn = await pool.getConnection();
    conn1 = await pool.getConnection();
    conn2 = await pool.getConnection();
    assert.deepStrictEqual(pool.connectionsOpen, 3);
    assert.deepStrictEqual(pool.connectionsInUse, 3);
    await conn.close();
    await conn1.close();
    assert.deepStrictEqual(pool.connectionsOpen, 3);
    assert.deepStrictEqual(pool.connectionsInUse, 1);
    await conn2.close();
    await sleep(2000);
    assert.deepStrictEqual(pool.connectionsOpen, 0);
    assert.deepStrictEqual(pool.connectionsInUse, 0);
    await pool.close(0);
  });

  it('279.5 pool shrinkage during connection release will wait for pool timeout time before emitting events while maintaining min connection', async () => {
    let pool, conn, conn1, conn2;
    pool = await oracledb.createPool({
      ...dbConfig,
      poolMin           : 1,
      poolMax           : 10,
      poolIncrement     : 1,
      poolTimeout       : 1,
      homogeneous       : true
    });
    assert.ok(pool);
    conn = await pool.getConnection();
    conn1 = await pool.getConnection();
    conn2 = await pool.getConnection();
    assert.deepStrictEqual(pool.connectionsOpen, 3);
    assert.deepStrictEqual(pool.connectionsInUse, 3);
    await conn.close();
    await conn1.close();
    assert.deepStrictEqual(pool.connectionsOpen, 3);
    assert.deepStrictEqual(pool.connectionsInUse, 1);
    await conn2.close();
    await sleep(2000);
    assert.deepStrictEqual(pool.connectionsOpen, 1);
    assert.deepStrictEqual(pool.connectionsInUse, 0);
    await pool.close(0);
  });

  it('279.6 pool shrinkage during connection release will not happen when poolTimeout equals to 0', async () => {
    let pool, conn;
    pool = await oracledb.createPool({
      ...dbConfig,
      poolMin           : 0,
      poolMax           : 10,
      poolIncrement     : 3,
      poolTimeout       : 0,
      homogeneous       : true
    });
    assert.ok(pool);
    conn = await pool.getConnection();
    assert.deepStrictEqual(pool.connectionsOpen, 3);
    assert.deepStrictEqual(pool.connectionsInUse, 1);
    await conn.close();
    await sleep(1100);
    assert.deepStrictEqual(pool.connectionsOpen, 3);
    assert.deepStrictEqual(pool.connectionsInUse, 0);
    await pool.close(0);
  });

  it('279.7 pool shrinkage will not happen when poolTimeout is 0', async () => {
    let pool, conn;
    pool = await oracledb.createPool({
      ...dbConfig,
      poolMin           : 0,
      poolMax           : 10,
      poolTimeout       : 0,
      poolIncrement     : 3,
      homogeneous       : true
    });
    assert.ok(pool);
    conn = await pool.getConnection();
    assert.deepStrictEqual(pool.connectionsOpen, 3);
    assert.deepStrictEqual(pool.connectionsInUse, 1);
    await sleep(1100);
    assert.deepStrictEqual(pool.connectionsOpen, 3);
    assert.deepStrictEqual(pool.connectionsInUse, 1);
    await conn.close();
    await pool.close(0);
  });

});

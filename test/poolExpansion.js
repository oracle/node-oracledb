/* Copyright (c) 2023, Oracle and/or its affiliates. */

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
 *   278. poolExpansion.js
 *
 * DESCRIPTION
 *   Testing pool expansion feature of pool.
 *
******************************************************************************/

'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');
const testUtil = require('../test/testsUtil.js');

describe('278. Pool expansion', function() {

  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  it('278.1 pool expansion when new connection created and within pool max limit', async function() {
    if (!oracledb.thin || dbConfig.test.drcp) this.skip();
    // thick driver is creating total connections exceeding poolMax

    const pool = await oracledb.createPool({
      ...dbConfig,
      poolMin: 0,
      poolMax: 2,
      poolIncrement: 4,
      homogeneous: true
    });
    const conn = await pool.getConnection();
    assert.strictEqual(pool.connectionsInUse, 1);

    await testUtil.checkAndWait(100, 50, () => pool.connectionsOpen === 2);
    // total connections created won't exceed pool max limit.
    assert.strictEqual(pool.connectionsOpen, 2);
    assert.strictEqual(pool.connectionsInUse, 1);
    await conn.close();
    await pool.close(0);
  });

  it('278.2 pool expansion not done on creating minimum connection', async function() {
    if (dbConfig.test.drcp) this.skip();

    const pool = await oracledb.createPool({
      ...dbConfig,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 4,
      homogeneous: true
    });

    await testUtil.checkAndWait(100, 50, () => pool.connectionsOpen === 2);
    assert.strictEqual(pool.connectionsOpen, 2);
    assert.strictEqual(pool.connectionsInUse, 0);
    await testUtil.checkAndWait(100, 50, () => pool.connectionsOpen === 2);
    await sleep(1000);
    assert.strictEqual(pool.connectionsOpen, 2);
    assert.strictEqual(pool.connectionsInUse, 0);
    await pool.close(0);
  });

  it('278.3 no pool expansion while acquiring connection already present in pool', async function() {
    if (dbConfig.test.drcp) this.skip();

    const pool = await oracledb.createPool({
      ...dbConfig,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 3,
      homogeneous: true
    });
    const conn = await pool.getConnection();
    assert.strictEqual(pool.connectionsInUse, 1);
    await testUtil.checkAndWait(100, 50, () => pool.connectionsOpen === 2);
    await sleep(1000);
    assert.strictEqual(pool.connectionsOpen, 2);
    assert.strictEqual(pool.connectionsInUse, 1);
    await conn.close();
    await pool.close(0);
  });

  it('278.4 pool connection count not crossing pool max limit on parallel execution', async function() {
    if (dbConfig.test.drcp) this.skip();

    const pool = await oracledb.createPool({
      ...dbConfig,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 2,
      homogeneous: true
    });
    let conn1, conn2, conn3;
    const routine1 = async function() {
      conn1 =  await pool.getConnection();
    };

    const routine3 = async function() {
      conn3 =  await pool.getConnection();
    };

    const routine2 = async function() {
      conn2 =  await pool.getConnection();
    };
    await Promise.all([routine1(), routine2(), routine3()]);
    assert.strictEqual(pool.connectionsInUse, 3);
    await testUtil.checkAndWait(100, 50, () => pool.connectionsOpen === 4);
    await conn1.close();
    await conn3.close();
    await conn2.close();
    await pool.close(0);
  });
});

/* Copyright (c) 2025, Oracle and/or its affiliates. */

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
 *   315. maxLifetimeSession.js
 *
 * DESCRIPTION
 *   Testing maxLifetimeSession feature of pool.
 *
 ******************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');
const testUtil = require('./testsUtil.js');

describe('315. poolMaxLifeTimeSession.js', function() {
  let pool;

  before(function() {
    if (!oracledb.thin) this.skip();
  });

  after(function() {
    if (!oracledb.thin) return;
  });

  afterEach(async function() {
    await pool?.close(0);
  });

  it('315.1 Testing maxLifetimeSession on conn release', async () => {
    const conns = [];
    pool = await oracledb.createPool({
      ...dbConfig,
      poolMin: 4,
      poolMax: 10,
      poolIncrement: 4,
      maxLifetimeSession: 2,
    });
    for (let i = 0;i < 5;i += 1)
      conns.push(await pool.getConnection());
    assert.strictEqual(pool.connectionsOpen, 5);

    // bgThreadFunc will create more connections based on poolIncrement
    await testUtil.sleep(2000);
    assert.strictEqual(pool.connectionsOpen, 8);

    // These connections will be dropped as they exceed maxLifetimeSession
    for (const conn of conns)
      await conn.close();

    // poolMin is ensured even though connections are dropped
    await testUtil.sleep(1000);
    assert.strictEqual(pool.connectionsOpen, 4);
  });

  it('315.2 Testing maxLifetimeSession on conn acquire', async () => {
    const conns = [];
    pool = await oracledb.createPool({
      ...dbConfig,
      poolMin: 4,
      poolMax: 10,
      poolIncrement: 4,
      maxLifetimeSession: 4,
    });
    for (let i = 0;i < 5;i += 1)
      conns.push(await pool.getConnection());
    assert.strictEqual(pool.connectionsOpen, 5);

    // bgThreadFunc will create more connections based on poolIncrement
    await testUtil.sleep(2000);
    assert.strictEqual(pool.connectionsOpen, 8);

    for (const conn of conns)
      await conn.close();

    // Crossing the maxLifetimeSession for initial conns
    await testUtil.sleep(2000);

    // acquire will drop all the connections that exceed maxLifeTimeSession
    conns.push(await pool.getConnection());
    await conns.pop().close();

    // poolMin is ensured by bgThreadFunc
    await testUtil.sleep(1000);
    assert.strictEqual(pool.connectionsOpen, 4);
  });
});

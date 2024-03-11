/* Copyright (c) 2018, 2023, Oracle and/or its affiliates. */

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
 *   170. poolDrain.js
 *
 * DESCRIPTION
 *   The poolDrain feature:
 *   `pool.close()` should iterate open connections and close them.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('170. poolDrain.js', () => {
  before(function() {
    if (process.versions.modules < 57) this.skip();
  });

  const settings = {
    ...dbConfig,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1
  };

  it('170.1 close pool with force flag, and prevent new connection', async () => {
    const pool = await oracledb.createPool(settings);
    await pool.getConnection();
    const drainTime = 5;
    const p = pool.close(drainTime);
    await assert.rejects(
      async () => await pool.getConnection(),
      /NJS-064:/
    );
    await p;
  }); // 170.1

  it('170.2 close pool without force flag (will give out an error ), and prevent new connections', async () => {
    const pool = await oracledb.createPool(settings);
    await pool.getConnection();
    await assert.rejects(
      async () => await pool.close(),
      /NJS-104:/
    );
    await pool.close(0);
  }); // 170.2

  it('170.3 pool.status OPEN and DRAINING', async () => {
    const pool = await oracledb.createPool(settings);
    await pool.getConnection();
    assert.strictEqual(pool.status, oracledb.POOL_STATUS_OPEN);
    const drainTime = 2;
    const p = pool.close(drainTime);
    assert.strictEqual(pool.status, oracledb.POOL_STATUS_DRAINING);
    await p;
  }); // 170.3

  it('170.4 pool.status CLOSED', async () => {
    const pool = await oracledb.createPool(settings);
    await pool.getConnection();
    assert.strictEqual(pool.status, oracledb.POOL_STATUS_OPEN);
    const drainTime = 2;
    await pool.close(drainTime);
    assert.strictEqual(pool.status, oracledb.POOL_STATUS_CLOSED);
  }); // 170.4

  it('170.5 basic case - iterate open connections and close them', async () => {
    const pool = await oracledb.createPool(settings);

    await pool.getConnection();
    const conn = await pool.getConnection();
    await pool.getConnection();
    assert.strictEqual(pool.connectionsInUse, 3);

    const drainTime = 2;
    await pool.close(drainTime);

    await assert.rejects(
      async () => await conn.execute('select (7+8) from dual'),
      /NJS-003:/
    );
  }); // 170.5

  it('170.6 pool is closed after drainTime', async () => {
    const pool = await oracledb.createPool(settings);

    await pool.getConnection();
    await pool.getConnection();
    await pool.getConnection();
    assert.strictEqual(pool.connectionsInUse, 3);

    const drainTime = 2;
    await pool.close(drainTime);

    await assert.rejects(
      async () => await pool.close(),
      /NJS-065:/
    );
  }); // 170.6

  it('170.7 closes pool if no connection', async () => {
    const pool = await oracledb.createPool(settings);
    const drainTime = 2;
    await pool.close(drainTime);
  }); // 170.7

  it('170.8 works with poolAlias', async () => {
    const cred = {
      ...dbConfig,
      poolAlias: 'nodb_pool_alias'
    };
    const pool = await oracledb.createPool(cred);
    const drainTime = 2;
    await pool.close(drainTime);
  }); // 170.8

  it('170.9 works with and without poolAlias', async () => {
    const cred = {
      ...dbConfig,
      poolAlias: 'nodb_pool_alias'
    };
    const pool_1 = await oracledb.createPool(cred);
    const pool_2 = await oracledb.createPool(settings);
    const drainTime = 2;
    await Promise.all([
      pool_1.close(drainTime),
      pool_2.close(drainTime)
    ]);
  }); // 170.9

  it('170.10 Negative - try to modify read-only property pool.status', async () => {
    const pool = await oracledb.createPool(settings);
    assert.strictEqual(pool.status, oracledb.POOL_STATUS_OPEN);
    const random_num = 789;
    assert.throws(
      () => pool.status = random_num,
      /Cannot set property status of #<Pool> which has only a getter/
    );
    await pool.close();
  }); // 170.10

  it('170.11 drainTime = 0', async () => {
    const pool = await oracledb.createPool(settings);

    await pool.getConnection();
    await pool.getConnection();
    await pool.getConnection();
    assert.strictEqual(pool.connectionsInUse, 3);

    const drainTime = 0;
    await pool.close(drainTime);
  });

  it('170.12 drainTime = -3', async () => {
    const pool = await oracledb.createPool(settings);

    await pool.getConnection();
    await pool.getConnection();
    await pool.getConnection();
    assert.strictEqual(pool.connectionsInUse, 3);

    const drainTime = -3;
    await assert.rejects(
      async () => await pool.close(drainTime),
      /NJS-005:/
    );
    await pool.close(0);
  });

  it('170.13 drainTime = NaN', async () => {
    const pool = await oracledb.createPool(settings);

    await pool.getConnection();
    await pool.getConnection();
    await pool.getConnection();
    assert.strictEqual(pool.connectionsInUse, 3);

    const drainTime = NaN;
    await assert.rejects(
      async () => await pool.close(drainTime),
      /NJS-005:/
    );
    await pool.close(0);
  });

  it('170.14 draining a pool will not block the other pool', async () => {
    const pool_1 = await oracledb.createPool(settings);
    const pool_2 = await oracledb.createPool(settings);

    await pool_1.getConnection();
    await pool_1.getConnection();
    await pool_1.getConnection();

    await pool_2.getConnection();
    const conn = await pool_2.getConnection();

    const drainTime = 3;
    const p = pool_1.close(drainTime);

    const result = await conn.execute('select (3+5) from dual');
    assert.strictEqual(result.rows[0][0], 8);
    await pool_2.close(1);
    await p;
  });

  it('170.15 draining a pool will not block another aliased pool', async () => {
    const pool_1 = await oracledb.createPool(settings);
    const cred = {
      ...dbConfig,
      poolAlias: 'nodb_pool_15'
    };
    const pool_2 = await oracledb.createPool(cred);

    await pool_1.getConnection();
    await pool_1.getConnection();
    await pool_1.getConnection();

    await pool_2.getConnection();
    const conn = await pool_2.getConnection();

    const drainTime = 3;
    const p = pool_1.close(drainTime);

    const result = await conn.execute('select (3+5) from dual');
    assert.strictEqual(result.rows[0][0], 8);
    await pool_2.close(1);
    await p;
  });

});

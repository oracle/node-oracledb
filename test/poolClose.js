/* Copyright (c) 2015, 2022, Oracle and/or its affiliates. */

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
 *   51. poolClose.js
 *
 * DESCRIPTION
 *   Negative cases about pool.terminate().
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('51. poolClose.js', function() {

  it('51.1 can not get connections from the terminated pool', async function() {
    const pool = await oracledb.createPool(dbConfig);
    await pool.close();
    await assert.rejects(
      async () => await pool.getConnection(),
      /NJS-065:/
    );
  }); // 51.1

  it('51.2 can not terminate the same pool multiple times', async function() {
    const pool = await oracledb.createPool(dbConfig);
    await pool.terminate();
    await assert.rejects(
      async () => await pool.terminate(),
      /NJS-065:/
    );
  }); // 51.2

  it('51.3 can not close the same pool multiple times', async function() {
    const pool = await oracledb.createPool(dbConfig);
    await pool.close();
    await assert.rejects(
      async () => await pool.close(),
      /NJS-065:/
    );
  }); // 51.3

  it('51.4 pool is still available after the failing close', async function() {
    const pool = await oracledb.createPool(dbConfig);
    const conn = await pool.getConnection();
    await assert.rejects(
      async () => await pool.close(),
      /NJS-104:/
    );
    await conn.close();
    await pool.close();
  }); // 51.4

  it('51.5 can not close the same connection multiple times', async function() {
    const pool = await oracledb.createPool(dbConfig);
    const conn = await pool.getConnection();
    await conn.close();
    await assert.rejects(
      async () => await conn.close(),
      /NJS-003:/
    );
    await pool.close();
  }); // 51.5

  it('51.6 can not get connection from a terminated pool', async function() {
    const pool = await oracledb.createPool(dbConfig);
    await pool.close();
    await assert.rejects(
      async () => await pool.getConnection(),
      /NJS-065:/
    );
  }); // 51.6

  it('51.7 can not set the attributes after pool created', async function() {
    const config = {
      ...dbConfig,
      poolMin         : 2,
      poolMax         : 10
    };
    const pool = await oracledb.createPool(config);
    assert.throws(
      () => pool.poolMin = 20,
      /TypeError: Cannot set/
    );
    await pool.close();
    assert.throws(
      () => pool.poolMin = 20,
      /TypeError: Cannot set/
    );
    await assert.rejects(
      async () => await pool.close(),
      /NJS-065:/
    );
  }); // 51.7

  it('51.8 can access the attributes of closed pool without error', async function() {
    const config = {
      ...dbConfig,
      poolMin         : 2,
      poolMax         : 10,
      poolAlias       : "foobar",
      poolIncrement   : 2
    };
    const pool = await oracledb.createPool(config);
    await pool.close();

    // configured values
    assert.strictEqual(pool.poolMin, config.poolMin);
    assert.strictEqual(pool.poolMax, config.poolMax);
    assert.strictEqual(pool.poolAlias, config.poolAlias);
    assert.strictEqual(pool.poolIncrement, config.poolIncrement);

    // default values
    assert.strictEqual(pool.poolPingInterval, oracledb.poolPingInterval);
    assert.strictEqual(pool.poolTimeout, oracledb.poolTimeout);
    assert.strictEqual(pool.queueMax, 500);
    assert.strictEqual(pool.queueTimeout, 60000);
    assert.strictEqual(pool.stmtCacheSize, oracledb.stmtCacheSize);
  }); // 51.8

});

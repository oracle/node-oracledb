/* Copyright (c) 2016, 2023, Oracle and/or its affiliates. */

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
 *   67. poolCache.js
 *
 * DESCRIPTION
 *   Testing properties of connection pool.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('67. poolCache.js', function() {

  describe('67.1 basic functional tests', function() {

    it('67.1.1 caches pool as default if pool is created when cache is empty', async function() {
      const pool = await oracledb.createPool(dbConfig);
      const defaultPool = oracledb.getPool();
      assert.strictEqual(pool, defaultPool);
      assert.strictEqual(pool.poolAlias, "default");
      await pool.close(0);
    });

    it('67.1.2 removes the pool from the cache on terminate', async function() {
      const pool = await oracledb.createPool(dbConfig);
      await pool.close(0);
      assert.throws(
        () => oracledb.getPool(),
        /NJS-047:/
      );
    });

    it('67.1.3 can cache and retrieve an aliased pool', async function() {
      const config = {...dbConfig, poolAlias: 'random-pool-alias'};
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.poolAlias, config.poolAlias);
      const aliasedPool = oracledb.getPool(config.poolAlias);
      assert.strictEqual(pool, aliasedPool);
      await pool.close(0);
    });

    it('67.1.4 throws an error if the poolAlias already exists in the cache', async function() {
      const config = {...dbConfig, poolAlias: 'pool1'};
      const pool = await oracledb.createPool(config);
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-046:/
      );
      await pool.close(0);
    });

    it('67.1.5 does not throw an error if multiple pools are created without a poolAlias', async function() {
      const pool1 = await oracledb.createPool(dbConfig);
      const pool2 = await oracledb.createPool(dbConfig);
      await pool1.close();
      await pool2.close();
    });

    it('67.1.6 throws an error if poolAttrs.poolAlias is not a string', async function() {
      // Setting poolAlias to something other than a string. Could be
      // boolean, object, array, etc.
      const config = {...dbConfig, poolAlias: {}};
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('67.1.7 makes poolAttrs.poolAlias a read-only attribute on the pool named poolAlias', async function() {
      const config = {...dbConfig, poolAlias: "my-pool"};
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.poolAlias, config.poolAlias);
      assert.throws(
        () => pool.poolAlias = "some-new-value",
        /TypeError: Cannot set/
      );
      assert.strictEqual(pool.poolAlias, config.poolAlias);
      await pool.close(0);
    });

    it('67.1.8 retrieves the default pool, even after an aliased pool is created', async function() {
      const pool1 = await oracledb.createPool(dbConfig);
      const config = {...dbConfig, poolAlias: 'random-pool-alias'};
      const pool2 = await oracledb.createPool(config);
      // Not specifying a name, default will be used
      const defaultPool = oracledb.getPool();
      assert.strictEqual(pool1, defaultPool);
      assert.strictEqual(pool1.poolAlias, "default");
      await pool1.close();
      await pool2.close();
    });

    it('67.1.9 retrieves the right pool, even after multiple pools are created', async function() {
      const config1 = {...dbConfig, poolAlias: 'random-pool-alias-1'};
      const config2 = {...dbConfig, poolAlias: 'random-pool-alias-2'};
      const config3 = {...dbConfig, poolAlias: 'random-pool-alias-3'};
      const pool1 = await oracledb.createPool(config1);
      const pool2 = await oracledb.createPool(config2);
      const pool3 = await oracledb.createPool(config3);
      assert.strictEqual(pool1, oracledb.getPool(config1.poolAlias));
      assert.strictEqual(pool2, oracledb.getPool(config2.poolAlias));
      assert.strictEqual(pool3, oracledb.getPool(config3.poolAlias));
      await pool1.close();
      await pool2.close();
      await pool3.close();
    });

    it('67.1.10 throws an error if the pool specified in getPool doesn\'t exist', function() {
      assert.throws(
        () => oracledb.getPool(),
        /NJS-047:/
      );
      assert.throws(
        () => oracledb.getPool("some-random-alias"),
        /NJS-047:/
      );
    });

    it('67.1.11 does not throw an error if multiple pools are created without a poolAlias in the same call stack', async function() {
      let pool1, pool2;
      const routine1 = async function() {
        pool1 = await oracledb.createPool(dbConfig);
      };
      const routine2 = async function() {
        pool2 = await oracledb.createPool(dbConfig);
      };
      await Promise.all([routine1(), routine2()]);
      await pool1.close();
      await pool2.close();
    });

  });

  describe('67.2 oracledb.getConnection functional tests', function() {

    it('67.2.1 gets a connection from the default pool when no alias is specified', async function() {
      const pool = await oracledb.createPool(dbConfig);
      const conn = await oracledb.getConnection();
      await conn.close();
      await pool.close(0);
    });

    it('67.2.2 gets a connection from the pool with the specified poolAlias', async function() {
      const config = {...dbConfig, poolAlias: 'random-pool-alias'};
      const pool = await oracledb.createPool(config);
      const conn = await oracledb.getConnection(config.poolAlias);
      await conn.close();
      await pool.close(0);
    });

    it('67.2.3 throws an error if an attempt is made to use the default pool when it does not exist', async function() {
      const config = {...dbConfig, poolAlias: 'random-pool-alias'};
      const pool = await oracledb.createPool(config);
      await assert.rejects(
        async () => await oracledb.getConnection(),
        /NJS-047:/
      );
      await pool.close(0);
    });

    it('67.2.4 throws an error if an attempt is made to use a poolAlias for a pool that is not in the cache', async function() {
      const config = {...dbConfig, poolAlias: 'random-pool-alias'};
      const pool = await oracledb.createPool(config);
      await assert.rejects(
        async () => await oracledb.getConnection("pool-alias-that-does-not-exist"),
        /NJS-047:/
      );
      await pool.close(0);
    });

    it('67.2.5 gets a connection from the default pool, even after an aliased pool is created', async function() {
      const config = {...dbConfig, poolAlias: 'random-pool-alias'};
      const pool1 = await oracledb.createPool(dbConfig);
      const pool2 = await oracledb.createPool(config);
      const conn = await oracledb.getConnection();
      // Using the hidden pool property to check where the connection came from
      assert.strictEqual(pool1, conn._pool);
      await conn.close();
      await pool1.close();
      await pool2.close();
    });

    it('67.2.6 uses the right pool, even after multiple pools are created', async function() {
      const config1 = {...dbConfig, poolAlias: 'random-pool-alias-1'};
      const config2 = {...dbConfig, poolAlias: 'random-pool-alias-2'};
      const config3 = {...dbConfig, poolAlias: 'random-pool-alias-3'};
      const pool1 = await oracledb.createPool(config1);
      const pool2 = await oracledb.createPool(config2);
      const pool3 = await oracledb.createPool(config3);
      const conn = await oracledb.getConnection(config2.poolAlias);
      assert.strictEqual(pool2, conn._pool);
      await conn.close();
      await pool1.close();
      await pool2.close();
      await pool3.close();
    });

    it('67.2.7 gets a connection from the default pool', async function() {
      const config = {
        ...dbConfig,
        poolMax: 4,
        poolMin: 1,
        poolIncrement: 1,
        poolTimeout: 0 // never terminate unused connections
      };
      const pool = await oracledb.createPool(config);
      const conn = await pool.getConnection();
      await conn.close();
      await pool.close(0);
    });

  }); // 67.2

  // This suite extends 67.1.6 case with various types
  describe('67.3 poolAlias attribute', function() {

    it('67.3.1 throws an error if poolAttrs.poolAlias is an object', async function() {
      const config = {...dbConfig, poolAlias: {'foo': 'bar'}};
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('67.3.2 throws an error if poolAttrs.poolAlias is an array', async function() {
      const config = {...dbConfig, poolAlias: []};
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('67.3.3 throws an error if poolAttrs.poolAlias is a number', async function() {
      const config = {...dbConfig, poolAlias: 123};
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('67.3.4 throws an error if poolAttrs.poolAlias is a boolean', async function() {
      const config = {...dbConfig, poolAlias: false};
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('67.3.5 throws an error if poolAttrs.poolAlias is null', async function() {
      const config = {...dbConfig, poolAlias: null};
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('67.3.6 throws an error if poolAttrs.poolAlias is an empty string', async function() {
      const config = {...dbConfig, poolAlias: null};
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('67.3.7 throws an error if poolAttrs.poolAlias is NaN', async function() {
      const config = {...dbConfig, poolAlias: NaN};
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('67.3.8 works if poolAttrs.poolAlias is undefined', async function() {
      const config = {...dbConfig, poolAlias: undefined};
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.poolAlias, "default");
      await pool.close(0);
    });

  }); // 67.3

});

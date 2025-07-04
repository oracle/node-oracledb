/* Copyright (c) 2025, Oracle and/or its affiliates. All rights reserved. */
/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   4. sharding4.js
 *
 * DESCRIPTION
 *   Test sharding keys of String type.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const { shardingConfig } = require('./shardingSetup.js');
const ShardingSetup = require('./shardingSetup.js');

describe('4. String Sharding Keys', () => {
  let shardingSetup;
  const tableName = 'nodeShdTable';

  before(async function() {
    if (oracledb.thin) this.skip();

    // Set timeout for setup operations
    this.timeout(300000); // 5 minutes
    shardingSetup = new ShardingSetup();
    await shardingSetup.setupSharding('STRING');

  });

  after(async function() {
    if (shardingSetup) {
      await shardingSetup.cleanup();
    }
  });

  it('4.1 retrieves data with string sharding key', async () => {
    const config = {
      ...shardingConfig,
      shardingKey: ["Allen"]
    };

    const conn = await oracledb.getConnection(config);

    const sql = `SELECT cust_id, cust_name FROM ${tableName} WHERE cust_name = :1`;
    const binds = ['Allen'];
    const result = await conn.execute(sql, binds);

    assert.deepStrictEqual(result.rows[0], [100, 'Allen']);
    await conn.close();
  });

  it('4.2 retrieves data from the correct shard', async () => {
    const config = {
      ...shardingConfig,
      shardingKey: ["Allen"]
    };

    const conn = await oracledb.getConnection(config);

    const sql = `SELECT cust_id, cust_name FROM ${tableName} WHERE cust_name = :1`;
    const binds = ['Allen'];
    const result = await conn.execute(sql, binds);

    assert.deepStrictEqual(result.rows[0], [100, 'Allen']);
    await conn.close();
  });

  it('4.3 returns empty dataset with empty string sharding key', async () => {
    const config = {
      ...shardingConfig,
      shardingKey: ['']
    };

    const conn = await oracledb.getConnection(config);

    const sql = `SELECT cust_id, cust_name FROM ${tableName} WHERE cust_name = :1`;
    const binds = ['NotARealName'];
    const result = await conn.execute(sql, binds);

    assert.deepStrictEqual(result.rows, []);
    await conn.close();
  });

  it('4.4 retrieves data with different string sharding keys', async () => {
    const config = {
      ...shardingConfig,
      shardingKey: ["Thomas"]
    };

    const conn = await oracledb.getConnection(config);

    const sql = `SELECT cust_id, cust_name FROM ${tableName} WHERE cust_name = :1`;
    const binds = ['Thomas'];
    const result = await conn.execute(sql, binds);

    assert.deepStrictEqual(result.rows[0], [16, 'Thomas']);
    await conn.close();
  });

  it('4.5 works with heterogeneous connection pool', async () => {
    const poolConfig = {
      connectString: shardingConfig.connectString,
      homogeneous: false
    };
    console.log("Before pool creation");

    const pool = await oracledb.createPool(poolConfig);

    console.log("After pool creation");

    const connConfig = {
      user: shardingConfig.user,
      password: shardingConfig.password,
      shardingKey: ["Steve"]
    };

    console.log("Before get Connection");
    const conn = await pool.getConnection(connConfig);

    console.log("After get Connection");
    const sql = `SELECT cust_id, cust_name FROM ${tableName} WHERE cust_name = :1`;
    const binds = ['Steve'];
    const result = await conn.execute(sql, binds);

    assert.deepStrictEqual(result.rows[0], [20, 'Steve']);

    await conn.close();
    await pool.close();
  });
});

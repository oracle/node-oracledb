/* Copyright (c) 2025, 2026, Oracle and/or its affiliates. All rights reserved. */
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
 *   13. sharding13.js
 *
 * DESCRIPTION
 *   Test UUID (RAW) sharding keys
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const { shardingConfig } = require('./shardingSetup.js');
const ShardingSetup = require('./shardingSetup.js');

describe('13. UUID (RAW) Sharding Keys', () => {
  let shardingSetup;
  const tableName = 'nodeShdTable';

  before(async function() {
    if (oracledb.thin) this.skip();
    this.timeout(300000);

    shardingSetup = new ShardingSetup();
    await shardingSetup.setupSharding('RAW');
  });

  after(async function() {
    if (shardingSetup) {
      await shardingSetup.cleanup();
    }
  });

  it('13.1 routes using UUID RAW(16)', async () => {
    const key = Buffer.from('010408', 'hex'); // Davis

    const conn = await oracledb.getConnection({
      ...shardingConfig,
      shardingKey: [key]
    });

    const result = await conn.execute(
      `SELECT cust_code FROM ${tableName} WHERE cust_code = :1`,
      [key]
    );

    assert.strictEqual(result.rows.length, 1);
    assert.strictEqual(
      Buffer.compare(result.rows[0][0], key),
      0
    );

    await conn.close();
  });
});

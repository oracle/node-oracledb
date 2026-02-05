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
 *   11. sharding11.js
 *
 * DESCRIPTION
 *   Test TIMESTAMP sharding keys
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const ShardingSetup = require('./shardingSetup');

describe('11. TIMESTAMP Sharding Keys', () => {
  let setup;

  before(async function() {
    if (oracledb.thin) this.skip();
    this.timeout(300000);
    setup = new ShardingSetup();
    await setup.setupSharding('TIMESTAMP');
  });

  after(() => setup.cleanup());

  async function query(ts) {
    const c = await oracledb.getConnection({
      ...require('./shardingSetup').shardingConfig,
      shardingKey: [ts]
    });

    const r = await c.execute(
      'SELECT COUNT(*) FROM nodeShdTable WHERE signup_ts = :1',
      [ts]
    );
    await c.close();
    assert.strictEqual(r.rows[0][0], 1);
  }

  it('11.1 routes using TIMESTAMP with milliseconds', async () => {
    await query(new Date('2014-07-02T10:15:30.123Z'));
  });

  it('11.2 routes using different TIMESTAMP value', async () => {
    await query(new Date('2013-10-21T05:45:00.999Z'));
  });
});

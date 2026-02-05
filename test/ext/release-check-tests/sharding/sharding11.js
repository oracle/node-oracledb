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

const assert = require('assert');
const ShardingSetup = require('./shardingSetup.js');

describe('11. TIMESTAMP Sharding Keys', function() {
  this.timeout(0);

  const setup = new ShardingSetup('sharding11');

  before(async () => {
    await setup.setupBaseObjects();

    await setup.createShardedTable(
      'signup_ts',
      'signup_ts TIMESTAMP NOT NULL'
    );

    await setup.insertRow(
      {
        cust_id: 1,
        cust_name: 'Alice',
        signup_ts: new Date('2024-01-01T10:15:30.123Z')
      },
      [new Date('2024-01-01T10:15:30.123Z')]
    );

    await setup.insertRow(
      {
        cust_id: 2,
        cust_name: 'Bob',
        signup_ts: new Date('2024-02-10T05:00:00.999Z')
      },
      [new Date('2024-02-10T05:00:00.999Z')]
    );
  });

  after(async () => {
    await setup.cleanup();
  });

  async function queryByTimestamp(ts) {
    const result = await setup.query(
      `SELECT cust_id, cust_name FROM ${setup.tableName} WHERE signup_ts = :ts`,
      { ts },
      [ts]
    );
    return result.rows[0];
  }

  it('11.1 routes using TIMESTAMP with milliseconds', async () => {
    const row = await queryByTimestamp(
      new Date('2024-01-01T10:15:30.123Z')
    );
    assert.deepStrictEqual(row, [1, 'Alice']);
  });

  it('11.2 routes using different TIMESTAMP value', async () => {
    const row = await queryByTimestamp(
      new Date('2024-02-10T05:00:00.999Z')
    );
    assert.deepStrictEqual(row, [2, 'Bob']);
  });
});


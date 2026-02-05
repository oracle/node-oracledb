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

const assert = require('assert');
const ShardingSetup = require('./shardingSetup.js');

describe('13. RAW (UUID-style) Sharding Keys', function() {
  this.timeout(0);

  const setup = new ShardingSetup('sharding13');

  before(async () => {
    await setup.setupBaseObjects();

    await setup.createShardedTable(
      'cust_uuid',
      'cust_uuid RAW(16) NOT NULL'
    );

    const uuid1 = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
    const uuid2 = Buffer.from('ffeeddccbbaa99887766554433221100', 'hex');

    await setup.insertRow(
      {
        cust_id: 1,
        cust_name: 'UUIDUser1',
        cust_uuid: uuid1
      },
      [uuid1]
    );

    await setup.insertRow(
      {
        cust_id: 2,
        cust_name: 'UUIDUser2',
        cust_uuid: uuid2
      },
      [uuid2]
    );
  });

  after(async () => {
    await setup.cleanup();
  });

  async function queryByUUID(buf) {
    const result = await setup.query(
      `SELECT cust_id, cust_name FROM ${setup.tableName} WHERE cust_uuid = :u`,
      { u: buf },
      [buf]
    );
    return result.rows[0];
  }

  it('13.1 routes using RAW UUID value', async () => {
    const uuid = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
    const row = await queryByUUID(uuid);
    assert.deepStrictEqual(row, [1, 'UUIDUser1']);
  });

  it('13.2 routes using another RAW UUID value', async () => {
    const uuid = Buffer.from('ffeeddccbbaa99887766554433221100', 'hex');
    const row = await queryByUUID(uuid);
    assert.deepStrictEqual(row, [2, 'UUIDUser2']);
  });
});


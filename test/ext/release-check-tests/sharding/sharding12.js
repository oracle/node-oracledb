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
 *   12. sharding12.js
 *
 * DESCRIPTION
 *   Test NVARCHAR2 / Unicode sharding key
 *
 *****************************************************************************/
'use strict';

const assert = require('assert');
const oracledb = require('oracledb');
const ShardingSetup = require('./shardingSetup.js');

describe('12. NVARCHAR2 (Unicode) Sharding Keys', function() {
  this.timeout(0);

  const setup = new ShardingSetup('sharding12');
  const NV_TYPE = oracledb.DB_TYPE_NVARCHAR || oracledb.DB_TYPE_NCHAR;

  before(async () => {
    await setup.setupBaseObjects();

    await setup.createShardedTable(
      'cust_name_n',
      'cust_name_n NVARCHAR2(50) NOT NULL'
    );

    await setup.insertRow(
      {
        cust_id: 10,
        cust_name: 'TokyoUser',
        cust_name_n: '東京'
      },
      ['東京']
    );

    await setup.insertRow(
      {
        cust_id: 20,
        cust_name: 'EmojiUser',
        cust_name_n: '😀'
      },
      ['😀']
    );

    await setup.insertRow(
      {
        cust_id: 30,
        cust_name: 'MixedUser',
        cust_name_n: 'User-测试'
      },
      ['User-测试']
    );
  });

  after(async () => {
    await setup.cleanup();
  });

  async function queryByName(val) {
    const result = await setup.query(
      `SELECT cust_id, cust_name_n FROM ${setup.tableName} WHERE cust_name_n = :n`,
      { n: { val, type: NV_TYPE } },
      [val]
    );
    return result.rows[0];
  }

  it('12.1 routes Unicode (CJK)', async () => {
    const row = await queryByName('東京');
    assert.deepStrictEqual(row, [10, '東京']);
  });

  it('12.2 routes Unicode (emoji)', async () => {
    const row = await queryByName('😀');
    assert.deepStrictEqual(row, [20, '😀']);
  });

  it('12.3 routes mixed Unicode + ASCII', async () => {
    const row = await queryByName('User-测试');
    assert.deepStrictEqual(row, [30, 'User-测试']);
  });
});


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

const oracledb = require('oracledb');
const assert = require('assert');
const ShardingSetup = require('./shardingSetup');

describe('12. NVARCHAR2 (Unicode) Sharding Keys', () => {
  let setup;

  before(async function() {
    if (oracledb.thin) this.skip();
    this.timeout(300000);
    setup = new ShardingSetup();
    await setup.setupSharding('NVARCHAR');
  });

  after(() => setup.cleanup());

  async function query(val, expectedId) {
    const conn = await oracledb.getConnection({
      ...require('./shardingSetup').shardingConfig,
      shardingKey: [val]
    });

    const result = await conn.execute(
      `
    SELECT cust_id, cust_name_n
    FROM nodeShdTable
    WHERE cust_name_n = :val
    `,
      {
        val: {
          val,
          type: oracledb.DB_TYPE_NVARCHAR,
          maxSize: 100
        }
      }
    );

    await conn.close();

    assert.ok(result.rows.length === 1, 'Expected exactly one row');
    assert.deepStrictEqual(result.rows[0], [expectedId, val]);
  }

  it('12.1 routes Unicode (CJK)', async () => {
    await query('東京', 10);
  });

  it('12.2 routes Unicode (emoji)', async () => {
    await query('😀', 100);
  });

  it('12.3 routes mixed Unicode + ASCII', async () => {
    await query('User-测试', 16);
  });
});

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
 *   4. sharding4.js
 *
 * DESCRIPTION
 *   Test sharding keys of String type.
 *
 *****************************************************************************/
'use strict';

const assert = require('assert');
const oracledb = require('oracledb');
const ShardingSetup = require('./shardingSetup.js');

describe('4. String Sharding Keys', function() {

  this.timeout(0);

  if (oracledb.thin) {
    before(function() {
      this.skip();
    });
  }

  const setup = new ShardingSetup('sharding4');

  before(async () => {
    await setup.setupBaseObjects();

    await setup.createShardedTable(
      'cust_name',
      'cust_col NUMBER'
    );

    const rows = [
      { id: 10, name: 'Henry' },
      { id: 100, name: 'Allen' },
      { id: 16, name: 'Thomas' },
      { id: 20, name: 'Steve' }
    ];

    for (const r of rows) {
      await setup.insertRow(
        { cust_id: r.id, cust_name: r.name, cust_col: 1 },
        [r.name]
      );
    }
  });

  after(async () => {
    await setup.cleanup();
  });

  async function query(name, key) {
    const result = await setup.query(
      `SELECT cust_id, cust_name FROM ${setup.tableName} WHERE cust_name = :n`,
      { n: name },
      key
    );
    return result.rows;
  }

  it('4.1 retrieves data with string sharding key', async () => {
    const rows = await query('Allen', ['Allen']);
    assert.deepStrictEqual(rows[0], [100, 'Allen']);
  });

  it('4.2 retrieves data from correct shard', async () => {
    const rows = await query('Thomas', ['Thomas']);
    assert.deepStrictEqual(rows[0], [16, 'Thomas']);
  });

  it('4.3 returns empty dataset for non-existent key', async () => {
    const rows = await query('Nobody', ['Nobody']);
    assert.deepStrictEqual(rows, []);
  });

  it('4.4 retrieves data with different string key', async () => {
    const rows = await query('Steve', ['Steve']);
    assert.deepStrictEqual(rows[0], [20, 'Steve']);
  });

  it('4.5 route identical STRING sharding keys to the same shard', async () => {
    const key = 'Allen';

    // First query
    const result1 = await setup.query(
      `SELECT cust_id FROM ${setup.tableName} WHERE cust_name = :n`,
      { n: key },
      [key]
    );

    // Second query (new connection)
    const result2 = await setup.query(
      `SELECT cust_id FROM ${setup.tableName} WHERE cust_name = :n`,
      { n: key },
      [key]
    );

    assert.deepStrictEqual(result1.rows, result2.rows);
  });

  it('4.6 treats STRING sharding keys as case-sensitive', async () => {
    const upper = await setup.query(
      `SELECT cust_id FROM ${setup.tableName} WHERE cust_name = :n`,
      { n: 'Allen' },
      ['Allen']
    );

    const lower = await setup.query(
      `SELECT cust_id FROM ${setup.tableName} WHERE cust_name = :n`,
      { n: 'allen' },
      ['allen']
    );

    assert.notDeepStrictEqual(upper.rows, lower.rows);
  });

  it('4.7 string sharding keys with spaces', async () => {
    const trimmed = await setup.query(
      `SELECT cust_id FROM ${setup.tableName} WHERE cust_name = :n`,
      { n: 'Allen' },
      ['Allen']
    );

    const spaced = await setup.query(
      `SELECT cust_id FROM ${setup.tableName} WHERE cust_name = :n`,
      { n: ' Allen ' },
      [' Allen ']
    );

    assert.notDeepStrictEqual(trimmed.rows, spaced.rows);
  });

});

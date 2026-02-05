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
 *   shardingSetup.js
 *
 * DESCRIPTION
 *   Utility to set up sharding environment and test data for Oracle Database sharding tests.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const testsUtil = require('../../../testsUtil.js');

const shardingConfig = {
  user: process.env.NODE_ORACLEDB_USER || 'testuser1',
  password: process.env.NODE_ORACLEDB_PASSWORD || 'testuser1',
  connectString: process.env.NODE_ORACLEDB_CATALOG_CONNECTSTRING
};

class ShardingSetup {

  constructor(testName) {
    if (!testName) {
      throw new Error('testName is required');
    }

    this.testName = testName.toUpperCase();
    this.tableName = `NODESHD_${this.testName}`;
    this.tablespaceSet = `TS_${this.testName}`;
  }

  async setupBaseObjects() {
    const conn = await oracledb.getConnection(shardingConfig);
    await conn.execute('ALTER SESSION ENABLE SHARD DDL');

    await conn.execute(`
      BEGIN
        EXECUTE IMMEDIATE 'CREATE TABLESPACE SET ${this.tablespaceSet} IN SHARDSPACE shd1';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLCODE != -1543 THEN RAISE; END IF;
      END;
    `);

    await conn.commit();
    await conn.close();
  }

  async createShardedTable(shardingColumn, columnDDL) {
    const conn = await oracledb.getConnection(shardingConfig);
    await conn.execute('ALTER SESSION ENABLE SHARD DDL');

    await conn.execute(testsUtil.sqlDropTable(this.tableName));

    const sql = `
      CREATE SHARDED TABLE ${this.tableName} (
        cust_id      NUMBER,
        cust_name    VARCHAR2(50),
        cust_code    RAW(20),
        ${columnDDL},
        CONSTRAINT pk_${this.tableName} PRIMARY KEY (${shardingColumn})
      )
      PARTITION BY CONSISTENT HASH (${shardingColumn})
      PARTITIONS AUTO
      TABLESPACE SET ${this.tablespaceSet}
    `;

    await conn.execute(sql);
    await conn.commit();
    await conn.close();

    await testsUtil.sleep(30000);
  }

  async insertRow(row, shardingKey) {
    const conn = await oracledb.getConnection(shardingConfig);

    const cols = Object.keys(row).join(',');
    const binds = Object.keys(row).map(k => `:${k}`).join(',');

    const sql = `INSERT INTO ${this.tableName} (${cols}) VALUES (${binds})`;

    await conn.execute(sql, row, { shardingKey });
    await conn.commit();
    await conn.close();
  }

  async query(sql, binds, shardingKey) {
    const conn = await oracledb.getConnection({
      ...shardingConfig,
      shardingKey
    });

    const result = await conn.execute(sql, binds);
    await conn.close();
    return result;
  }

  async cleanup() {
    const conn = await oracledb.getConnection(shardingConfig);
    await conn.execute('ALTER SESSION ENABLE SHARD DDL');

    await conn.execute(testsUtil.sqlDropTable(this.tableName));

    await conn.execute(`
      BEGIN
        EXECUTE IMMEDIATE 'DROP TABLESPACE SET ${this.tablespaceSet} INCLUDING CONTENTS';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLCODE != -959 THEN RAISE; END IF;
      END;
    `);

    await conn.commit();
    await conn.close();
  }
}

module.exports = ShardingSetup;
module.exports.shardingConfig = shardingConfig;

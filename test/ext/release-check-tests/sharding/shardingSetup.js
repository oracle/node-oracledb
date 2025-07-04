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
 *   shardingSetup.js
 *
 * DESCRIPTION
 *   Utility to set up sharding environment and test data for Oracle Database sharding tests.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const testsUtil = require('../../../testsUtil.js');

// Centralized configuration for sharding tests
const shardingConfig = {
  user: process.env.NODE_ORACLEDB_USER || 'testuser1',
  password: process.env.NODE_ORACLEDB_PASSWORD || 'testuser1',
  connectString: process.env.NODE_ORACLEDB_CATALOG_CONNECTSTRING
};

const tableName = 'nodeShdTable';

class ShardingSetup {
  constructor() {
    // Environment variables for shard connections
    this.shard1ConnectString = process.env.NODE_ORACLEDB_SHARD1_CONNECTSTRING;
    this.shard2ConnectString = process.env.NODE_ORACLEDB_SHARD2_CONNECTSTRING;
    this.catalogConnectString = process.env.NODE_ORACLEDB_CATALOG_CONNECTSTRING;

    if (!this.shard1ConnectString || !this.shard2ConnectString) {
      throw new Error('Environment variables NODE_ORACLEDB_SHARD1_CONNECTSTRING and NODE_ORACLEDB_SHARD2_CONNECTSTRING must be set');
    }

    if (!this.catalogConnectString) {
      throw new Error('Environment variable NODE_ORACLEDB_CATALOG_CONNECTSTRING must be set');
    }

    this.testData = [
      { cust_id: 10, cust_name: 'Henry', fvalue: 100.00, class: 'gold', signup_date: '02-JUL-2014', dob: '1964-JAN-01 03:59:59', cust_code: '0001' },
      { cust_id: 100, cust_name: 'Allen', fvalue: 200.00, class: 'gold', signup_date: '03-JUL-2014', dob: '1952-AUG-12 02:59:59', cust_code: '0102' },
      { cust_id: 16, cust_name: 'Thomas', fvalue: 300.00, class: 'silver', signup_date: '21-OCT-2013', dob: '1987-NOV-17 04:59:59', cust_code: '0203' },
      { cust_id: 20, cust_name: 'Steve', fvalue: 400.00, class: 'gold', signup_date: '12-JAN-2014', dob: '1970-MAY-23 13:59:59', cust_code: '0304' },
      { cust_id: 50, cust_name: 'Nolan', fvalue: 450.00, class: 'silver', signup_date: '26-JUN-2012', dob: '1960-DEC-02 09:34:21', cust_code: '0607' },
      { cust_id: 60, cust_name: 'Samuel', fvalue: 500.00, class: 'silver', signup_date: '22-AUG-2014', dob: '1988-JUL-16 01:59:59', cust_code: '0708' },
      { cust_id: 70, cust_name: 'Leo', fvalue: 600.00, class: 'gold', signup_date: '14-SEP-2014', dob: '1978-MAR-20 06:59:59', cust_code: '000102' },
      { cust_id: 140, cust_name: 'Luis', fvalue: 700.00, class: 'silver', signup_date: '02-MAR-2011', dob: '1942-FEB-06 01:50:19', cust_code: '02030405' },
      { cust_id: 150, cust_name: 'Wayne', fvalue: 800.00, class: 'silver', signup_date: '04-OCT-2010', dob: '1958-JAN-29 02:59:59', cust_code: '05060708' },
      { cust_id: 167, cust_name: 'Ron', fvalue: 900.00, class: 'gold', signup_date: '10-DEC-2011', dob: '1959-OCT-11 09:59:11', cust_code: '070809' },
      { cust_id: 198, cust_name: 'Davis', fvalue: 1000.00, class: 'silver', signup_date: '06-APR-2013', dob: '1941-SEP-22 05:59:59', cust_code: '010408' }
    ];
  }

  async createShardedTable(shardingKeyType) {
    const conn = await oracledb.getConnection(shardingConfig);

    // Enable shard DDL
    await conn.execute('ALTER SESSION ENABLE SHARD DDL');

    await conn.execute('CREATE TABLESPACE SET ts1 IN SHARDSPACE shd1');

    // Create sharded table based on sharding key type
    let createTableSQL;
    if (shardingKeyType === 'STRING') {
      createTableSQL = `
          CREATE SHARDED TABLE ${tableName} (
            cust_id int,
            cust_name varchar2(30),
            fvalue float,
            class varchar2(10),
            signup_date DATE,
            dob timestamp,
            cust_code raw(20),
            CONSTRAINT cust_name_pk PRIMARY KEY(cust_name)
          ) PARTITION BY CONSISTENT HASH (cust_name) PARTITIONS AUTO TABLESPACE SET ts1
        `;
    } else if (shardingKeyType === 'NUMBER') {
      createTableSQL = `
          CREATE SHARDED TABLE ${tableName} (
            cust_id int,
            cust_name varchar2(30),
            fvalue float,
            class varchar2(10),
            signup_date DATE,
            dob timestamp,
            cust_code raw(20),
            CONSTRAINT cust_id_pk PRIMARY KEY(cust_id)
          ) PARTITION BY CONSISTENT HASH (cust_id) PARTITIONS AUTO TABLESPACE SET ts1
        `;
    } else if (shardingKeyType === 'DATE') {
      createTableSQL = `
          CREATE SHARDED TABLE ${tableName} (
            cust_id int,
            cust_name varchar2(30),
            fvalue float,
            class varchar2(10),
            signup_date DATE,
            dob timestamp,
            cust_code raw(20),
            CONSTRAINT signup_date_pk PRIMARY KEY(signup_date)
          ) PARTITION BY CONSISTENT HASH (signup_date) PARTITIONS AUTO TABLESPACE SET ts1
        `;
    } else if (shardingKeyType === 'FLOAT') {
      createTableSQL = `
          CREATE SHARDED TABLE ${tableName} (
            cust_id int,
            cust_name varchar2(30),
            fvalue float,
            class varchar2(10),
            signup_date DATE,
            dob timestamp,
            cust_code raw(20),
            CONSTRAINT fvalue_pk PRIMARY KEY(fvalue)
          ) PARTITION BY CONSISTENT HASH (fvalue) PARTITIONS AUTO TABLESPACE SET ts1
        `;
    } else if (shardingKeyType === 'RAW') {
      createTableSQL = `
          CREATE SHARDED TABLE ${tableName} (
            cust_id int,
            cust_name varchar2(30),
            fvalue float,
            class varchar2(10),
            signup_date DATE,
            dob timestamp,
            cust_code raw(20),
            CONSTRAINT cust_code_pk PRIMARY KEY(cust_code)
          ) PARTITION BY CONSISTENT HASH (cust_code) PARTITIONS AUTO TABLESPACE SET ts1
        `;
    } else {
      throw new Error('Invalid sharding key type. Must be STRING, NUMBER, DATE, FLOAT, or RAW');
    }

    const plsql = testsUtil.sqlCreateTable(tableName, createTableSQL);
    await conn.execute(plsql);

    await conn.commit();
    await conn.close();

    // Wait for table to be created in all shards
    await testsUtil.sleep(60000);
  }

  async insertTestData() {
    const shardConfigs = [
      {
        user: shardingConfig.user,
        password: shardingConfig.password,
        connectString: this.shard1ConnectString
      },
      {
        user: shardingConfig.user,
        password: shardingConfig.password,
        connectString: this.shard2ConnectString
      }
    ];

    for (let i = 0; i < shardConfigs.length; i++) {
      const shardConfig = shardConfigs[i];

      const conn = await oracledb.getConnection(shardConfig);

      const insertSQL = `
          INSERT INTO ${tableName} (cust_id, cust_name, fvalue, class, signup_date, dob, cust_code)
          VALUES (:cust_id, :cust_name, :fvalue, :class,
                  TO_DATE(:signup_date, 'DD-MON-YYYY'),
                  TO_TIMESTAMP(:dob, 'YYYY-MON-DD HH24:MI:SS'),
                  :cust_code)
        `;

      // Insert all test data
      for (const row of this.testData) {
        try {
          await conn.execute(insertSQL, {
            cust_id: row.cust_id,
            cust_name: row.cust_name,
            fvalue: row.fvalue,
            class: row.class,
            signup_date: row.signup_date,
            dob: row.dob,
            cust_code: row.cust_code
          });
        } catch (err) {
          // Some rows might not belong to this shard, ignore constraint violations
          if (!err.message.includes('ORA-00001')) {
            console.log(`Warning: Failed to insert ${row.cust_name} into shard ${i + 1}: ${err.message}`);
          }
        }
      }
      await conn.commit();
      await conn.close();
    }
  }

  async setupSharding(shardingKeyType) {
    await this.createShardedTable(shardingKeyType);
    await this.insertTestData();
  }

  async cleanup() {
    const conn = await oracledb.getConnection(shardingConfig);

    await conn.execute('DROP TABLESPACE SET ts1 INCLUDING CONTENTS');
    await conn.execute('ALTER SESSION ENABLE SHARD DDL');
    await conn.execute(testsUtil.sqlDropTable(tableName));

    await conn.commit();
    await conn.close();
  }
}

module.exports = ShardingSetup;
module.exports.shardingConfig = shardingConfig;

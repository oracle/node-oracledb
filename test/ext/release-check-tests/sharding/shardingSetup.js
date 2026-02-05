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

const tableName = 'nodeShdTable';

function parseDDMONYYYYToUTC(dstr) {
  const monthMap = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
  };
  if (!dstr) return null;
  const parts = dstr.split('-');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const mon = (parts[1] || '').toUpperCase();
  const year = parseInt(parts[2], 10);
  const m = monthMap[mon];
  if (Number.isNaN(day) || m === undefined || Number.isNaN(year)) return null;
  return new Date(Date.UTC(year, m, day, 0, 0, 0, 0));
}

class ShardingSetup {
  constructor() {
    if (!shardingConfig.connectString) {
      throw new Error('NODE_ORACLEDB_CATALOG_CONNECTSTRING must be set');
    }

    this.testData = [
      { cust_id: 10,  cust_name: 'Henry',  fvalue: 100.00,  class: 'gold',   signup_date: '02-JUL-2014', dob: '1964-JAN-01 03:59:59', cust_code: '0001' },
      { cust_id: 100, cust_name: 'Allen',  fvalue: 200.00,  class: 'gold',   signup_date: '03-JUL-2014', dob: '1952-AUG-12 02:59:59', cust_code: '0102' },
      { cust_id: 16,  cust_name: 'Thomas', fvalue: 300.00,  class: 'silver', signup_date: '21-OCT-2013', dob: '1987-NOV-17 04:59:59', cust_code: '0203' },
      { cust_id: 20,  cust_name: 'Steve',  fvalue: 400.00,  class: 'gold',   signup_date: '12-JAN-2014', dob: '1970-MAY-23 13:59:59', cust_code: '0304' },
      { cust_id: 50,  cust_name: 'Nolan',  fvalue: 450.00,  class: 'silver', signup_date: '26-JUN-2012', dob: '1960-DEC-02 09:34:21', cust_code: '0607' },
      { cust_id: 60,  cust_name: 'Samuel', fvalue: 500.00,  class: 'silver', signup_date: '22-AUG-2014', dob: '1988-JUL-16 01:59:59', cust_code: '0708' },
      { cust_id: 70,  cust_name: 'Leo',    fvalue: 600.00,  class: 'gold',   signup_date: '14-SEP-2014', dob: '1978-MAR-20 06:59:59', cust_code: '000102' },
      { cust_id: 140, cust_name: 'Luis',   fvalue: 700.00,  class: 'silver', signup_date: '02-MAR-2011', dob: '1942-FEB-06 01:50:19', cust_code: '02030405' },
      { cust_id: 150, cust_name: 'Wayne',  fvalue: 800.00,  class: 'silver', signup_date: '04-OCT-2010', dob: '1958-JAN-29 02:59:59', cust_code: '05060708' },
      { cust_id: 167, cust_name: 'Ron',    fvalue: 900.00,  class: 'gold',   signup_date: '10-DEC-2011', dob: '1959-OCT-11 09:59:11', cust_code: '070809' },
      { cust_id: 198, cust_name: 'Davis',  fvalue: 1000.00, class: 'silver', signup_date: '06-APR-2013', dob: '1941-SEP-22 05:59:59', cust_code: '010408' }
    ];

    this.explicitTimestampMap = {
      10: new Date('2014-07-02T10:15:30.123Z'),
      100: new Date('2013-10-21T05:45:00.999Z')
    };

    this.unicodeMap = {
      10: '東京',
      100: '😀',
      16: 'User-测试'
    };
  }

  async createShardedTable(shardingKeyType) {
    const conn = await oracledb.getConnection(shardingConfig);

    await conn.execute('ALTER SESSION ENABLE SHARD DDL');
    await conn.execute('CREATE TABLESPACE SET ts1 IN SHARDSPACE shd1');

    const keyColumnMap = {
      STRING: 'cust_name',
      NVARCHAR: 'cust_name_n',
      NUMBER: 'cust_id',
      DATE: 'signup_date',
      TIMESTAMP: 'signup_ts',
      FLOAT: 'fvalue',
      RAW: 'cust_code'
    };

    const keyCol = keyColumnMap[shardingKeyType];
    if (!keyCol) {
      throw new Error('Invalid sharding key type');
    }

    const createSQL = `
      CREATE SHARDED TABLE ${tableName} (
        cust_id INT,
        cust_name VARCHAR2(30),
        cust_name_n NVARCHAR2(30),
        fvalue FLOAT,
        class VARCHAR2(10),
        signup_ts TIMESTAMP,
        signup_date DATE,
        dob TIMESTAMP,
        cust_code RAW(20),
        CONSTRAINT pk_${keyCol} PRIMARY KEY (${keyCol})
      ) PARTITION BY CONSISTENT HASH (${keyCol}) PARTITIONS AUTO TABLESPACE SET ts1
    `;

    await conn.execute(testsUtil.sqlCreateTable(tableName, createSQL));
    await conn.commit();
    await conn.close();

    // Wait for sharded DDL propagation
    await testsUtil.sleep(60000);
  }

  async insertTestData(shardingKeyType) {
    const conn = await oracledb.getConnection(shardingConfig);

    const insertSQL = `
      INSERT INTO ${tableName}
        (cust_id, cust_name, cust_name_n, fvalue, class, signup_ts, signup_date, dob, cust_code)
      VALUES
        (:cust_id, :cust_name, :cust_name_n, :fvalue, :class,
         :signup_ts,
         TO_DATE(:signup_date,'DD-MON-YYYY'),
         TO_TIMESTAMP(:dob,'YYYY-MON-DD HH24:MI:SS'),
         :cust_code)
    `;

    const NVARCHAR_TYPE = oracledb.DB_TYPE_NVARCHAR || oracledb.DB_TYPE_NCHAR;

    for (const row of this.testData) {
      const bindRow = {
        cust_id: row.cust_id,
        cust_name: row.cust_name,
        cust_name_n: this.unicodeMap[row.cust_id] || row.cust_name,
        fvalue: row.fvalue,
        class: row.class,
        signup_date: row.signup_date,
        dob: row.dob,
        cust_code: row.cust_code
      };

      let shardingKey;

      switch (shardingKeyType) {
        case 'STRING':
          bindRow.signup_ts = parseDDMONYYYYToUTC(row.signup_date);
          shardingKey = [bindRow.cust_name];
          break;

        case 'NVARCHAR':
          bindRow.signup_ts = parseDDMONYYYYToUTC(row.signup_date);
          shardingKey = [bindRow.cust_name_n];
          break;

        case 'NUMBER':
          bindRow.signup_ts = parseDDMONYYYYToUTC(row.signup_date);
          shardingKey = [bindRow.cust_id];
          break;

        case 'DATE':
          bindRow.signup_ts = parseDDMONYYYYToUTC(row.signup_date);
          shardingKey = [parseDDMONYYYYToUTC(row.signup_date)];
          break;

        case 'TIMESTAMP':
          bindRow.signup_ts =
            this.explicitTimestampMap[row.cust_id] ||
            new Date(parseDDMONYYYYToUTC(row.signup_date).getTime() + row.cust_id);
          shardingKey = [bindRow.signup_ts];
          break;

        case 'FLOAT':
          bindRow.signup_ts = parseDDMONYYYYToUTC(row.signup_date);
          shardingKey = [bindRow.fvalue];
          break;

        case 'RAW':
          bindRow.signup_ts = parseDDMONYYYYToUTC(row.signup_date);
          bindRow.cust_code = Buffer.from(row.cust_code, 'hex');
          shardingKey = [bindRow.cust_code];
          break;

        default:
          throw new Error('Invalid sharding key type');
      }

      const binds = {
        cust_id: bindRow.cust_id,
        cust_name: bindRow.cust_name,
        cust_name_n:
          shardingKeyType === 'NVARCHAR'
            ? { val: bindRow.cust_name_n, type: NVARCHAR_TYPE, maxSize: 200 }
            : bindRow.cust_name_n,
        fvalue: bindRow.fvalue,
        class: bindRow.class,
        signup_ts: bindRow.signup_ts,
        signup_date: bindRow.signup_date,
        dob: bindRow.dob,
        cust_code: bindRow.cust_code
      };

      await conn.execute(insertSQL, binds, { shardingKey });
    }

    await conn.commit();
    await conn.close();
  }

  async setupSharding(shardingKeyType) {
    await this.createShardedTable(shardingKeyType);
    await this.insertTestData(shardingKeyType);
  }

  async cleanup() {
    const conn = await oracledb.getConnection(shardingConfig);
    await conn.execute('ALTER SESSION ENABLE SHARD DDL');
    await conn.execute('DROP TABLESPACE SET ts1 INCLUDING CONTENTS');
    await conn.execute(testsUtil.sqlDropTable(tableName));
    await conn.commit();
    await conn.close();
  }
}

module.exports = ShardingSetup;
module.exports.shardingConfig = shardingConfig;

/* Copyright (c) 2019, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   226. dbType01.js
 *
 * DESCRIPTION
 *   Test binding data of types DB_TYPE_*.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('226. dbType01.js', function() {

  let conn;
  const default_stmtCacheSize = oracledb.stmtCacheSize;

  before(async () => {
    oracledb.stmtCacheSize = 0;
    try {
      conn = await oracledb.getConnection(dbconfig);
    } catch (err) {
      should.not.exist(err);
    }
  });

  after(async () => {
    try {
      await conn.close();
    } catch (err) {
      should.not.exist(err);
    }
    oracledb.stmtCacheSize = default_stmtCacheSize;
  });

  afterEach(async () => {
    await testsUtil.sleep(100);
  });

  const strInVal = "Node-oracledb";
  const dateInVal = new Date();
  const numInVal = 12;
  const SQL = `SELECT :1, DUMP(:1) FROM dual`;

  it('226.1 DB_TYPE_VARCHAR', async () => {
    try {
      const result = await conn.execute(SQL,
        [{ val: strInVal, type: oracledb.DB_TYPE_VARCHAR }]);
      should.strictEqual(strInVal, result.rows[0][0]);
      (result.rows[0][1]).should.startWith('Typ=1 Len=13');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 226.1

  it('226.2 DB_TYPE_CHAR', async () => {
    try {
      const result = await conn.execute(SQL,
        [{ val: strInVal, type: oracledb.DB_TYPE_CHAR }]);
      should.strictEqual(strInVal, result.rows[0][0]);
      (result.rows[0][1]).should.startWith('Typ=96 Len=13');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 226.2

  it('226.3 DB_TYPE_NVARCHAR', async () => {
    try {
      const result = await conn.execute(SQL,
        [{ val: strInVal, type: oracledb.DB_TYPE_NVARCHAR }]);
      should.strictEqual(strInVal, result.rows[0][0]);
      (result.rows[0][1]).should.startWith('Typ=1 Len=26');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 226.3

  it('226.4 DB_TYPE_NCHAR', async () => {
    try {
      const result = await conn.execute(SQL,
        [{ val: strInVal, type: oracledb.DB_TYPE_NCHAR }]);
      should.strictEqual(strInVal, result.rows[0][0]);
      (result.rows[0][1]).should.startWith('Typ=96 Len=26');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 226.4

  it('226.5 DB_TYPE_DATE', async () => {
    try {
      const result = await conn.execute(SQL,
        [{ val: dateInVal, type: oracledb.DB_TYPE_DATE }]);
      (result.rows[0][1]).should.startWith('Typ=12 Len=7');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 226.5

  it('226.6 DB_TYPE_TIMESTAMP_LTZ', async () => {
    try {
      const result = await conn.execute(SQL,
        [{ val: dateInVal, type: oracledb.DB_TYPE_TIMESTAMP_LTZ }]);
      (result.rows[0][1]).should.startWith('Typ=231 Len=11');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 226.6

  it('226.7 DB_TYPE_TIMESTAMP', async () => {
    try {
      const result = await conn.execute(SQL,
        [{ val: dateInVal, type: oracledb.DB_TYPE_TIMESTAMP }]);
      (result.rows[0][1]).should.startWith('Typ=180 Len=11');
    } catch (err) {
      should.not.exist(err);
    }
  });

  it('226.8 DB_TYPE_TIMESTAMP_TZ', async () => {
    try {
      const result = await conn.execute(SQL,
        [{ val: dateInVal, type: oracledb.DB_TYPE_TIMESTAMP_TZ }]);
      (result.rows[0][1]).should.startWith('Typ=181 Len=13');
    } catch (err) {
      should.not.exist(err);
    }
  });

  it('226.9 DB_TYPE_NUMBER', async () => {
    try {
      const sql = `SELECT DUMP(:1) FROM dual`;
      const result = await conn.execute(sql,
        [{ val: numInVal, type: oracledb.DB_TYPE_NUMBER }]);
      (result.rows[0][0]).should.startWith('Typ=2 Len=2');
    } catch (err) {
      should.not.exist(err);
    }
  });

  it('226.10 DB_TYPE_BINARY_FLOAT', async () => {
    try {
      const result = await conn.execute(SQL,
        [{ val: numInVal, type: oracledb.DB_TYPE_BINARY_FLOAT }]);
      (result.rows[0][1]).should.startWith('Typ=100 Len=4');
    } catch (err) {
      should.not.exist(err);
    }
  });

  it('226.11 DB_TYPE_BINARY_DOUBLE', async () => {
    try {
      const result = await conn.execute(SQL,
        [{ val: numInVal, type: oracledb.DB_TYPE_BINARY_DOUBLE }]);
      (result.rows[0][1]).should.startWith('Typ=101 Len=8');
    } catch (err) {
      should.not.exist(err);
    }
  });

  it('226.12 Infinity, DB_TYPE_BINARY_FLOAT', async () => {
    try {
      const num = 1 / 0;
      const result = await conn.execute(SQL,
        [{ val: num, type: oracledb.DB_TYPE_BINARY_FLOAT }]);
      (result.rows[0][1]).should.startWith('Typ=100 Len=4');
    } catch (err) {
      should.not.exist(err);
    }
  });

  it('226.13 Infinity, DB_TYPE_BINARY_DOUBLE', async () => {
    try {
      const num = 1 / 0;
      const result = await conn.execute(SQL,
        [{ val: num, type: oracledb.DB_TYPE_BINARY_DOUBLE }]);
      (result.rows[0][1]).should.startWith('Typ=101 Len=8');
    } catch (err) {
      should.not.exist(err);
    }
  });
});

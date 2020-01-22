/* Copyright (c) 2019, 2020, Oracle and/or its affiliates. All rights reserved. */

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
 *   Test binding data of types DB_TYPE_CHAR, DB_TYPE_NCHAR,
 *   DB_TYPE_NVARCHAR, DB_TYPE_DATE and DB_TYPE_TIMESTAMP_LTZ.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');

describe('226. dbType01.js', function() {

  let conn;

  before(async () => {
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
  });

  const strInVal = "Node-oracledb";
  const dateInVal = new Date();
  const SQL = `SELECT DUMP(:1) FROM dual`;

  it('226.1 DB_TYPE_VARCHAR', async () => {
    try {
      const result = await conn.execute(SQL,
        [{ val: strInVal, type: oracledb.DB_TYPE_VARCHAR }]);
      (result.rows[0][0]).should.startWith('Typ=1 Len=13');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 226.1

  it('226.2 DB_TYPE_CHAR', async () => {
    try {
      const result = await conn.execute(SQL,
        [{ val: strInVal, type: oracledb.DB_TYPE_CHAR }]);
      (result.rows[0][0]).should.startWith('Typ=96 Len=13');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 226.2

  it('226.3 DB_TYPE_NVARCHAR', async () => {
    try {
      const result = await conn.execute(SQL,
        [{ val: strInVal, type: oracledb.DB_TYPE_NVARCHAR }]);
      (result.rows[0][0]).should.startWith('Typ=1 Len=26');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 226.3

  it('226.4 DB_TYPE_NCHAR', async () => {
    try {
      const result = await conn.execute(SQL,
        [{ val: strInVal, type: oracledb.DB_TYPE_NCHAR }]);
      (result.rows[0][0]).should.startWith('Typ=96 Len=26');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 226.4

  it('226.5 DB_TYPE_DATE', async () => {
    try {
      const result = await conn.execute(SQL,
        [{ val: dateInVal, type: oracledb.DB_TYPE_DATE }]);
      (result.rows[0][0]).should.startWith('Typ=12 Len=7');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 226.5

  it('226.6 DB_TYPE_TIMESTAMP_LTZ', async () => {
    try {
      const result = await conn.execute(SQL,
        [{ val: dateInVal, type: oracledb.DB_TYPE_TIMESTAMP_LTZ }]);
      (result.rows[0][0]).should.startWith('Typ=231 Len=11');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 226.6

});

/* Copyright (c) 2024, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the `License`);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an `AS IS` BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   299. invalidNumber.js
 *
 * DESCRIPTION
 *   Testing insertion of invalid numbers to the database
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('299. invalidNumber.js', function() {
  let conn;
  const tableName = 'nodb_num';

  before(async function() {
    conn = await oracledb.getConnection(dbConfig);
    const sql = `CREATE TABLE ${tableName}(id NUMBER)`;
    await testsUtil.createTable(conn, tableName, sql);
  });

  after(async function() {
    await testsUtil.dropTable(conn, tableName);
    await conn.close();
  });

  it('299.1 throws error for invalid numbers(largest exponent + 1)', async () => {
    const idv = 1e+126;
    const sql = 'INSERT INTO nodb_num VALUES(:cid)';
    const binds = { cid: { val: idv, type: oracledb.NUMBER}};
    await assert.rejects(
      async () => await conn.execute(sql, binds),
      /NJS-115:/
    );
  }); // 299.1

  it('299.2 throws error for invalid numbers(smallest exponent - 1)', async () => {
    const idv = 1e-131;
    const sql = 'INSERT INTO nodb_num VALUES(:cid)';
    const binds = { cid: { val: idv, type: oracledb.NUMBER}};
    await assert.rejects(
      async () => await conn.execute(sql, binds),
      /NJS-115:/
    );
  }); // 299.2

});

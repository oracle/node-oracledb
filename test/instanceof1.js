/* Copyright (c) 2016, 2023, Oracle and/or its affiliates. */

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
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   45. instanceof1.js
 *
 * DESCRIPTION
 *   Testing JS instanceof.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('45. instanceof1.js', function() {

  it('45.1 instanceof works for pool instances', async function() {
    const config = {
      ...dbConfig,
      poolMin: 0,
      poolMax: 1,
      poolIncrement: 1
    };
    const pool = await oracledb.createPool(config);
    assert(pool instanceof oracledb.Pool);
    await pool.close(0);
  }); // 45.1

  it('45.2 instanceof works for connection instances', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    assert(conn instanceof oracledb.Connection);
    await conn.close();
  }); // 45.2

  it('45.3 instanceof works for resultset instances', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    const sql = 'select 1 from dual union select 2 from dual';
    const binds = [];
    const options = {
      resultSet: true
    }; // 45.3
    const result = await conn.execute(sql, binds, options);
    assert(result.resultSet instanceof oracledb.ResultSet);
    await result.resultSet.close();
    await conn.close();
  });

  it('45.4 instanceof works for lob instances', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute('select to_clob(dummy) from dual');
    const lob = result.rows[0][0];
    assert(lob instanceof oracledb.Lob);
    await new Promise((resolve, reject) => {
      lob.on('error', reject);
      lob.on('close', resolve);
      lob.destroy();
    });
    await conn.close();
  }); // 45.4

});

/* Copyright (c) 2016, 2022, Oracle and/or its affiliates. */

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
 **
 * NAME
 *   66. writableProperties1.js
 *
 * DESCRIPTION
 *   Testing writable properties.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

describe('66. writableProperties1.js', function() {

  const checkOverwrite = function(obj, excludeKeys) {
    if (excludeKeys === undefined)
      excludeKeys = [];
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (excludeKeys.includes(key))
        continue;
      const value = obj[key];
      if (typeof value === 'function') {
        obj[key] = function() {};
        obj[key] = value;
      }
    }
  };

  it('66.1 allows overwriting of public methods on pool instances', async function() {
    const pool = await oracledb.createPool(dbConfig);
    checkOverwrite(pool);
    await pool.close();
  });

  it('66.2 allows overwriting of public methods on connection instances', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    checkOverwrite(conn);
    await conn.close();
  });

  it('66.3 allows overwriting of public methods on resultset instances', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(
      'select 1 from dual union select 2 from dual',
      [], // no binds
      {
        resultSet: true
      });
    const rs = result.resultSet;
    checkOverwrite(rs);
    await rs.close();
    await conn.close();
  });

  it('66.4 allows overwriting of public methods on lob instances', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute('select to_clob(dummy) from dual');
    const lob = result.rows[0][0];
    checkOverwrite(lob);
    await lob.close();
    await conn.close();
  }); // 66.4

  it('66.5 allows overwriting of public methods on oracledb instances', function() {
    const excludeNames = [
      "initOracleClient",
      "oracleClientVersion",
      "oracleClientVersionString"
    ];
    checkOverwrite(oracledb, excludeNames);
  }); // 66.5

});

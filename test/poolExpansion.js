/* Copyright (c) 2023, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https: *oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http: *www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https: *www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   278. poolExpansion.js
 *
 * DESCRIPTION
 *   Testing pool expansion feature of pool.
 *
******************************************************************************/

'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');

describe('278. Pool expansion', function() {

  it('278.1 pool expansion when new connection created and within pool max limit', async () => {
    const pool = await oracledb.createPool({
      ...dbConfig,
      poolMin           : 0,
      poolMax           : 10,
      poolIncrement     : 4,
      homogeneous       : true
    });
    const conn = await pool.getConnection();
    assert.deepStrictEqual(pool.connectionsOpen, 4);
    assert.deepStrictEqual(pool.connectionsInUse, 1);
    await conn.close();
    await pool.close(0);
  });

  (oracledb.thin ? it : it.skip)('278.2 pool expansion when new connection created and exceeding pool max limit', async () => {
    const pool = await oracledb.createPool({
      ...dbConfig,
      poolMin           : 0,
      poolMax           : 4,
      poolIncrement     : 7,
      homogeneous       : true
    });
    const conn = await pool.getConnection();
    assert.deepStrictEqual(pool.connectionsOpen, 4);
    assert.deepStrictEqual(pool.connectionsInUse, 1);
    await conn.close();
    await pool.close(0);
  });

  it('278.3 pool expansion not done on creating minimum connection', async () => {
    const pool = await oracledb.createPool({
      ...dbConfig,
      poolMin           : 5,
      poolMax           : 10,
      poolIncrement     : 2,
      homogeneous       : true
    });
    assert.deepStrictEqual(pool.connectionsOpen, 5);
    assert.deepStrictEqual(pool.connectionsInUse, 0);
    await pool.close(0);
  });

  it('278.4 no pool expansion while acquiring connection already present in pool', async () => {
    const pool = await oracledb.createPool({
      ...dbConfig,
      poolMin           : 3,
      poolMax           : 10,
      poolIncrement     : 3,
      homogeneous       : true
    });
    const conn = await pool.getConnection();
    assert.deepStrictEqual(pool.connectionsOpen, 3);
    assert.deepStrictEqual(pool.connectionsInUse, 1);
    await conn.close();
    await pool.close(0);
  });

});

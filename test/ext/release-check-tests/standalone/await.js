/* Copyright (c) 2024, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   22. await.js
 *
 * DESCRIPTION
 *   await tests.
 *   This test does not add into mocha.opts, because it will cause build error when run with Node.js version under v7.6.0
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('../../../dbconfig.js');

describe('22. await.js', function() {

  it('22.1 works with connection', async () =>  {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute('select 1 from dual');
    assert.strictEqual(result.rows[0][0], 1);
    await connection.commit();
    await connection.release();
  });

  it('22.2 works with connection.rollback', async () =>  {
    const connection = await oracledb.getConnection(dbConfig);
    await connection.rollback();
    await connection.commit();
    await connection.release();
  });

  it('22.3 works with Pool', async () =>  {
    const pool = await oracledb.createPool(dbConfig);
    const conn = await pool.getConnection();
    await conn.release();
    await pool.terminate();
  });

  it('22.4 works with resultSet - 1', async () =>  {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await  connection.execute('select 1 from dual', [], {resultSet: true});
    const rows = await result.resultSet.getRow();
    assert.strictEqual(rows[0], 1);
    await result.resultSet.close();
    await connection.release();
  });

  it('22.5 works with resultSet - 2', async () =>  {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await  connection.execute('select 1 from dual union select 2 from dual', [], {resultSet: true});
    const rows = await result.resultSet.getRows(2);
    assert.strictEqual(rows[0][0], 1);
    assert.strictEqual(rows[1][0], 2);
    await result.resultSet.close();
    await connection.release();
  });

  it('22.6 works with promise', async () =>  {
    const conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute('select 1 from dual');
    assert.equal(result.rows[0][0], 1);
    await conn.release();
  });
});

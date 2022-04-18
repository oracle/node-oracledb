/* Copyright (c) 2022, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, withOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * The node-oracledb test suite uses 'mocha'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   261. connHealthy.js
 *
 * DESCRIPTION
 *   Test cases for connecton.isHealthy()
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbconfig = require('./dbconfig.js');

describe('261. connHealthy.js', function() {

  describe('261.1 connection health on stand alone connections', function() {
    it('261.1.1 connection health on good connection', async function() {
      const conn = await oracledb.getConnection(dbconfig);
      const isHealthy = conn.isHealthy();
      assert.strictEqual(isHealthy, true);
      await conn.close();
    });

    it('261.1.2 connection health on closed connection', async function() {
      const conn = await oracledb.getConnection(dbconfig);
      await conn.close();
      const isHealthy = conn.isHealthy();
      assert.strictEqual(isHealthy, false);
    });

    it('261.1.3 connection health on closed connection from a pool', async function() {
      const pool = await oracledb.createPool(
        {
          user              : dbconfig.user,
          password          : dbconfig.password,
          connectString     : dbconfig.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          poolTimeout       : 28,
          stmtCacheSize     : 23
        });
      assert.strictEqual(pool.connectionsInUse, 0);
      const conn = await pool.getConnection();
      var isHealthy = conn.isHealthy();
      assert.strictEqual(isHealthy, true);
      await conn.close();
      isHealthy = conn.isHealthy();
      assert.strictEqual(isHealthy, false);
    });


  });

});

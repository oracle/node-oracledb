/* Copyright (c) 2016, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   69. driverName.js
 *
 * DESCRIPTION
 *   Testing external authentication functionality.
 *
 *   Note that enabling the externalAuth feature requires configuration on the
 *   database besides setting "externalAuth" attribute to be true. Please refer
 *   to api doc about the configuration.
 *   https://oracle.github.io/node-oracledb/doc/api.html#extauth
 *
 *****************************************************************************/

'use strict';

var oracledb = require('oracledb');
var assert   = require('assert');
var dbConfig = require('./dbconfig.js');

describe('69. driverName.js', function() {

  it("69.1 checks the driver name", async function() {
    try {
      const pool = await oracledb.createPool(dbConfig);
      assert(pool);
      const connection = await pool.getConnection();
      assert(connection);
      const sql = "select distinct client_driver from v$session_connect_info where sid = sys_context('USERENV', 'SID')";
      const result = await connection.execute(sql);
      const serverVer = await connection.oracleServerVersion;
      // Since 12.1.0.2, OCI_ATTR_DRIVER_NAME with 30 characters has been supported
      // Database server can then return the full driver name, e.g. 'node-oracledb 1.11'
      if (serverVer >= 1201000200) {
        assert.strictEqual(result.rows[0][0].trim(), "node-oracledb : " + oracledb.versionString);
      } else {
        // previous databases only returns the first 8 characters of the driver name
        assert.strictEqual(result.rows[0][0], "node-ora");
      }
      await connection.close();
      await pool.close();
    } catch (err) {
      assert.fail(err);
    }
  });
});

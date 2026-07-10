/* Copyright (c) 2026, Oracle and/or its affiliates. */

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
 *   329. verifier10G.js
 *
 * DESCRIPTION
 *   Test connecting in Thin mode to an account whose password only carries the
 *   legacy 10G (case-insensitive, DES) password verifier.
 *
 *   The 10G verifier cannot be created on a default modern database instance
 *   (it requires SEC_CASE_SENSITIVE_LOGON=FALSE), so this test is gated on a
 *   dedicated account provided through environment variables and is skipped
 *   when that account is not configured:
 *
 *     NODE_ORACLEDB_USER_10G      user whose password only has the 10G verifier
 *     NODE_ORACLEDB_PASSWORD_10G  its password
 *     NODE_ORACLEDB_CONNECTIONSTRING (reused from the standard test config)
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');

describe('329. verifier10G.js', function() {

  const user = process.env.NODE_ORACLEDB_USER_10G;
  const password = process.env.NODE_ORACLEDB_PASSWORD_10G;

  before(function() {
    // Thick mode already supports the 10G verifier; this test targets the Thin
    // mode O5LOGON path.
    if (!oracledb.thin) {
      this.skip();
    }
    // Skip unless a 10G-verifier account is configured.
    if (!user || !password) {
      this.skip();
    }
  });

  it('329.1 connects in Thin mode to a 10G-only password verifier account', async function() {
    const connection = await oracledb.getConnection({
      user: user,
      password: password,
      connectString: dbConfig.connectString
    });
    const result = await connection.execute('SELECT 1 FROM dual');
    assert.strictEqual(result.rows[0][0], 1);
    await connection.close();
  });

});

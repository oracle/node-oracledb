/* Copyright (c) 2023, Oracle and/or its affiliates. */

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
 *   284. errorUrl.js
 *
 * DESCRIPTION
 *   This test verifies enhancement to expose error portal URL in error message
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('284. errorUrl.js', function() {

  let conn;
  before(async function() {
    conn = await oracledb.getConnection(dbConfig);
    if (testsUtil.getClientVersion() < 2301000000) {
      this.skip();
    }
  });

  after(async () => {
    await conn.close();
  });

  it('284.1 checks for error URL in ORA error message', async () => {
    const url = /https:\/\/docs.oracle.com\/error-help\/db\/ora-01476\//;
    await assert.rejects(
      async () => await conn.execute(`SELECT 1/0 FROM DUAL`),
      (err) => {
        assert.match(err.message, url);
        return true;
      }
    );
  }); // 284.1

});

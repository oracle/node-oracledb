/* Copyright (c) 2020, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   240. errorOffset.js
 *
 * DESCRIPTION
 *   This test verifies a ODPI-C bug fix.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');

describe('240. errorOffset.js', async () => {

  it('240.1 checks the offset value of the error', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
    } catch (error) {
      should.not.exist(error);
    }

    try {
      await conn.execute("begin t_Missing := 5; end;");
    } catch (error) {
      should.exist(error);
      should.strictEqual(error.offset, 6);
      should.strictEqual(error.errorNum, 6550);
    }

    try {
      await conn.close();
    } catch (error) {
      should.not.exist(error);
    }
  });
});
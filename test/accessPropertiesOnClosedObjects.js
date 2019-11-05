/* Copyright (c) 2018, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   223. accessPropertiesOnClosedObjects.js
 *
 * DESCRIPTION
 *   Test accessing the properties on closed objects.
 *
 *****************************************************************************/
'use strict';


const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');

describe('223. accessPropertiesOnClosedObjects.js', () => {

  it('223.1 access properties of closed Connection object', async () => {
    try {
      const conn = await oracledb.getConnection(dbconfig);
      await conn.close();

      let closedObjProp = conn.oracleServerVersion;
      should.not.exist(closedObjProp);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 223.1

  it('223.2 access properties of closed Lob object', async () => {
    try {
      const conn = await oracledb.getConnection(dbconfig);

      const Lob = await conn.createLob(oracledb.DB_TYPE_BLOB);

      await Lob.close();
      should.strictEqual(Lob.type, oracledb.DB_TYPE_BLOB);
      should.strictEqual(Lob.length, 0)

      await conn.close();
      should.strictEqual(Lob.type, oracledb.DB_TYPE_BLOB);
      should.strictEqual(Lob.length, 0)
    } catch (err) {
      should.not.exist(err);
    }
  }); // 223.2
});
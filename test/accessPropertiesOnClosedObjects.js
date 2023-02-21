/* Copyright (c) 2018, 2022, Oracle and/or its affiliates. */

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
 *   223. accessPropertiesOnClosedObjects.js
 *
 * DESCRIPTION
 *   Test accessing the properties on closed objects.
 *
 *****************************************************************************/
'use strict';


const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');

describe('223. accessPropertiesOnClosedObjects.js', () => {

  it('223.1 access properties of closed Connection object', async () => {
    const conn = await oracledb.getConnection(dbconfig);
    assert(conn);
    await conn.close();

    const closedObjProp = conn.oracleServerVersion;
    assert.ifError(closedObjProp);
  }); // 223.1

  it('223.2 access properties of closed Lob object', async () => {
    const conn = await oracledb.getConnection(dbconfig);

    const Lob = await conn.createLob(oracledb.DB_TYPE_BLOB);

    await Lob.close();
    assert.strictEqual(Lob.type, oracledb.DB_TYPE_BLOB);
    assert.strictEqual(Lob.length, 0);

    await conn.close();
    assert.strictEqual(Lob.type, oracledb.DB_TYPE_BLOB);
    assert.strictEqual(Lob.length, 0);
  }); // 223.2
});

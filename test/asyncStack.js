/* Copyright (c) 2022, 2023, Oracle and/or its affiliates. */

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
 *   263. asyncStack.js
 *
 * DESCRIPTION
 *   Test keeping a stacktrace in asynchronous methods.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');

const asyncMiddleware = async () => {
  await oracledb.getConnection({connectString: 'doesnotexist.oracle.com'});
};

describe('263. asyncStack.js', () => {

  it('263.1 stack on error in getConnection', async () => {
    await assert.rejects(
      async () => await asyncMiddleware(),
      (e) => {
        assert.ok(e.stack.includes('asyncStack.js:38:'), e.stack);
        assert.ok(e.stack.includes('asyncStack.js:45:'), e.stack);
        return true;
      }
    );
  });

  it('263.2 stack on error in createPool', async () => {
    const config = {
      user          : "asterix",
      password      : "oblix",
      connectString : 'doesnotexist.oracle.com',
      poolMin       : 1,
      poolMax       : 50,
      poolIncrement : 5
    };
    await assert.rejects(
      async () => await oracledb.createPool(config),
      (e) => {
        assert.ok(e.stack.includes('asyncStack.js:64:'), e.stack);
        return true;
      }
    );
  });

  it('263.3 stack on error in execute', async () => {
    const config = {
      user          : process.env.NODE_ORACLEDB_USER,
      password      : process.env.NODE_ORACLEDB_PASSWORD,
      connectString : process.env.NODE_ORACLEDB_CONNECTIONSTRING
    };
    const conn = await oracledb.getConnection(config);
    await assert.rejects(
      async () => await conn.execute("SELECT * FROM NON_EXISTENT_TABLE"),
      (e) => {
        assert.ok(e.stack.includes('asyncStack.js:80:'), e.stack);
        return true;
      }
    );
    await conn.close();
  });

});

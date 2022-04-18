/* Copyright (c) 2022, Oracle and/or its affiliates. */

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
    try {
      await asyncMiddleware();
    } catch (e) {
      assert.strictEqual(e.errorNum, 12154); // TNS:could not resolve the connect identifier specified
      assert.ok(e.stack.includes('asyncStack.js:33:'), e.stack);
      assert.ok(e.stack.includes('asyncStack.js:40:'), e.stack);
    }
  });

  it('263.2 stack on error in createPool', async () => {
    let pool = null;
    const dbconfig =  {
      user          : "asterix",
      password      : "oblix",
      connectString : 'doesnotexist.oracle.com',
      poolMin       : 1,
      poolMax       : 50,
      poolIncrement :  5
    };

    try {
      pool = await oracledb.createPool(dbconfig);
    } catch (e) {
      assert.strictEqual(e.errorNum, 12154);
      assert.ok(e.stack.includes('asyncStack.js:60:'), e.stack);
    } finally {
      if (pool) {
        await pool.close ();
      }
    }

  });

  it('263.3 stack on error in execute', async () => {
    const dbconfig = {
      user          : process.env.NODE_ORACLEDB_USER,
      password      : process.env.NODE_ORACLEDB_PASSWORD,
      connectString : process.env.NODE_ORACLEDB_CONNECTIONSTRING
    };

    try {
      const conn = await oracledb.getConnection(dbconfig);
      await conn.execute("SELECT * FROM NON_EXISTENT_TABLE");
    } catch (e)  {
      assert.strictEqual(e.errorNum, 942);
      assert.ok(e.stack.includes('asyncStack.js:81:'), e.stack);
    }

  });

});

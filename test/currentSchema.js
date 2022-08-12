/* Copyright (c) 2019, 2022, Oracle and/or its affiliates. */

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
 *   191. currentSchema.js
 *
 * DESCRIPTION
 *   Test the "connection.currentSchema" property.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('191. currentSchema.js', function() {

  let isRunnable = false;

  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites();

    if (!isRunnable) {
      this.skip();
      return;
    }
  });

  it('191.1 the value will be empty until it has been explicitly set', async () => {

    try {
      const conn = await oracledb.getConnection(dbconfig);
      assert.strictEqual(conn.currentSchema, '');

      let schema = dbconfig.user;
      conn.currentSchema = schema;
      assert.strictEqual(conn.currentSchema, schema);

      await conn.close();
    } catch (err) {
      assert.ifError(err);
    }

  }); // 191.1

  it('191.2 SQL alternative', async () => {

    try {
      const conn = await oracledb.getConnection(dbconfig);

      let schema = dbconfig.user.toUpperCase();
      let query = "ALTER SESSION SET CURRENT_SCHEMA = " + schema;
      await conn.execute(query);
      assert.strictEqual(conn.currentSchema, schema);

      await conn.close();
    } catch (err) {
      assert.ifError(err);
    }

  }); // 191.2

  it('191.3 Negative - can not set inexistent schema', async () => {

    async function setInvalidSchema() {
      const conn = await oracledb.getConnection(dbconfig);

      let schema = "foo";
      conn.currentSchema = schema;

      await conn.close();
    }

    await testsUtil.assertThrowsAsync(
      async () => await setInvalidSchema(),
      /ORA-01435|ORA-28726/
    );
    // ORA-01435: user does not exist
    // ORA-28726: set current schema operation failed

  }); // 191.3

});

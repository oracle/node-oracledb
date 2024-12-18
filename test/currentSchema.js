/* Copyright (c) 2019, 2024, Oracle and/or its affiliates. */

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
 *   191. currentSchema.js
 *
 * DESCRIPTION
 *   Test the "connection.currentSchema" property.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('191. currentSchema.js', function() {

  let isRunnable = false;

  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites();

    if (!isRunnable) {
      this.skip();
    }
  });

  it('191.1 the value will be empty until it has been explicitly set', async () => {

    try {
      const conn = await oracledb.getConnection(dbConfig);
      assert.strictEqual(conn.currentSchema, '');

      const schema = await testsUtil.getUser(conn);
      conn.currentSchema = schema;
      assert.strictEqual(conn.currentSchema, schema);

      await conn.close();
    } catch (err) {
      assert.ifError(err);
    }

  }); // 191.1

  it('191.2 SQL alternative', async () => {

    try {
      const conn = await oracledb.getConnection(dbConfig);

      const schema = await testsUtil.getUser(conn);
      const query = "ALTER SESSION SET CURRENT_SCHEMA = " + schema;
      await conn.execute(query);
      assert.strictEqual(conn.currentSchema, schema);

      await conn.close();
    } catch (err) {
      assert.ifError(err);
    }

  }); // 191.2

  it('191.3 Negative - can not set non-existent schema', async () => {
    let conn;
    async function setInvalidSchema() {
      conn = await oracledb.getConnection(dbConfig);

      const schema = "foo";
      conn.currentSchema = schema;
      await conn.execute('SELECT 1 FROM DUAL');
    }

    await assert.rejects(
      async () => await setInvalidSchema(),
      /ORA-01435|ORA-28726/
    );
    // ORA-01435: user does not exist
    // ORA-28726: set current schema operation failed

    await conn.close();
  }); // 191.3
});

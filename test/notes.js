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
 *   notes.js
 *
 * DESCRIPTION
 *   The prerequiste checks of test suite.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');

/****************** Verify the "user/password" provided by user **********************/

async function testConnection(description, additionalOptions = {}) {
  console.log(description);

  const credential = {...dbConfig, ...additionalOptions};
  const connection = await oracledb.getConnection(credential);
  const result = await connection.execute(
    "select * from dual", [], { outFormat: oracledb.OUT_FORMAT_ARRAY });
  assert.strictEqual(result.rows[0][0], "X");
  await connection.close();
}

before(async function() {
  await testConnection("Regular connection");
  if (dbConfig.test.DBA_PRIVILEGE) {
    await testConnection("DBA connection", {user: dbConfig.test.DBA_user, password: dbConfig.test.DBA_password, privilege: oracledb.SYSDBA});
  }
  if (dbConfig.test.externalAuth) {
    await testConnection("External auth", {externalAuth: true});
  }
  if (dbConfig.test.proxySessionUser) {
    await testConnection("Proxy Session User", {user: `${dbConfig.user}[${dbConfig.test.proxySessionUser}]`});
  }
});

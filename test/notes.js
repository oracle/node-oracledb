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
const dbconfig = require('./dbconfig.js');

/****************** Verify the "user/password" provided by user **********************/
const LOGTAG = "Global before-all Hook:\n";

const configList = [
  {
    user: dbconfig.user,
    password: dbconfig.password,
    connectString: dbconfig.connectString,
    errMsg: LOGTAG +
      "\tGetting connection using default schema user failed.\n" +
      "\tPlease ensure you set the following environment variables correctly:\n" +
      "\t* NODE_ORACLEDB_USER\n" +
      "\t* NODE_ORACLEDB_PASSWORD\n" +
      "\t* NODE_ORACLEDB_CONNECTIONSTRING\n",
  }
];

if (dbconfig.test.DBA_PRIVILEGE) {
  configList.push({
    user: dbconfig.test.DBA_user,
    password: dbconfig.test.DBA_password,
    connectString: dbconfig.connectString,
    privilege: oracledb.SYSDBA,
    errMsg: LOGTAG +
      "\tGetting connection using DBA user failed.\n" +
      "\tPlease ensure you set the following environment variables correctly:\n" +
      "\t* NODE_ORACLEDB_DBA_USER\n" +
      "\t* NODE_ORACLEDB_DBA_PASSWORD\n" +
      "\tOr skip tests that requires DBA privilege using:\n" +
      "\tunset NODE_ORACLEDB_DBA_PRIVILEGE\n",
  });
}

if (dbconfig.test.externalAuth) {
  configList.push({
    externalAuth:  true,
    connectString: dbconfig.connectString,
    errMsg: LOGTAG +
      "\tGetting connection using external authentication failed.\n" +
      "\tPlease ensure you set the external authentication environment correctly.\n" +
      "\tOr skip tests that requires external authentication using:\n" +
      "\tunset NODE_ORACLEDB_EXTERNALAUTH\n",
  });
}

if (dbconfig.test.proxySessionUser) {
  configList.push({
    user: `${dbconfig.user}[${dbconfig.test.proxySessionUser}]`,
    password: dbconfig.password,
    connectString: dbconfig.connectString,
    errMsg: LOGTAG +
      "\tGetting connection using proxy authentication failed.\n" +
      "\tPlease ensure you set the proxy authentication environment correctly.\n" +
      "\tOr skip tests that requires proxy authentication using:\n" +
      "\tunset NODE_ORACLEDB_PROXY_SESSION_USER\n"
  });
}

before(async function() {
  let connection = null;
  await Promise.all(configList.map(async function(conf) {
    connection = await oracledb.getConnection(conf);

    let result = await connection.execute(
      "select * from dual", [], { outFormat: oracledb.OUT_FORMAT_ARRAY });
    assert(result);
    assert.strictEqual(result.rows[0][0], "X");
    await connection.close();
  }));
});

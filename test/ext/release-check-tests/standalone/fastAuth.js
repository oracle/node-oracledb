/* Copyright (c) 2024, Oracle and/or its affiliates. */

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
 *   1. fastAuth.js
 *
 * DESCRIPTION
 *   Testing fast authentication.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const dbConfig = require('../../../dbconfig.js');
const testsUtil = require('../../../testsUtil.js');

describe('1. fastauth.js', function() {

  describe('1.1 Fast Authentication configuration', function() {
    let sysDbaConn, conn;
    let isRunnable, fastAuth;

    before('Fast Authentication', async function() {
      isRunnable = await testsUtil.checkPrerequisites(2304000000, 2304000000);
      if (!isRunnable) this.skip();
      const credential = {...dbConfig, privilege: oracledb.SYSDBA};
      credential.user = dbConfig.test.DBA_user;
      credential.password = dbConfig.test.DBA_password;
      sysDbaConn = await oracledb.getConnection(credential);
      await sysDbaConn.execute(`ALTER SESSION SET CONTAINER=cdb$root`);
      const result = await sysDbaConn.execute(`select name, value from V$PARAMETER where name='_fast_connection_version'`);
      fastAuth = result.rows[0][1];
    });

    after(async function() {
      if (!isRunnable) return;
      if (sysDbaConn) {
        // restore fashAuth setting.
        await sysDbaConn.execute(`alter system set "_fast_connection_version" = ${fastAuth}`);
        await sysDbaConn.close();
      }
      if (conn) {
        await conn.close();
      }
    });

    it('1.1.1 configure fastAuth parameter on 23ai', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) this.skip();

      // connection should be established after disabling _fast_connection_version
      await sysDbaConn.execute(`alter system set "_fast_connection_version" = 0`);
      conn = await oracledb.getConnection(dbConfig);
      await conn.close();

      // connection should be established after enabling _fast_connection_version
      await sysDbaConn.execute(`alter system set "_fast_connection_version" = 1`);
      conn = await oracledb.getConnection(dbConfig);
    });
  }); //1.1
});

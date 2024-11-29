/* Copyright (c) 2024, Oracle and/or its affiliates. All rights reserved. */
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
 *   1. simple-api-01.js
 *
 * DESCRIPTION
 *   The simple API of oracledb.shutdown().
 *   Note: if it is a container DB, the connection string must be the one of CDB.
 *
 * Environment Variables:
 *    NODE_ORACLEDB_PFILE: Configuration file pointing to initialization parameters for an Oracle database instance.
 *    For testing: Run these tests within a view and set the environment variable NODE_ORACLEDB_PFILE
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('../../dbconfig.js');
const testsUtil = require('../../testsUtil.js');

const dbaConfig = {
  user: dbconfig.test.DBA_user,
  password: dbconfig.test.DBA_password,
  connectString: dbconfig.connectString,
  privilege: oracledb.SYSDBA
};

describe('1. simple-api-01.js', () => {

  before(async function() {
    if (oracledb.thin) {
      this.skip();
    }

    if (!process.env.NODE_ORACLEDB_PFILE) {
      throw new Error("pFile for startup is not set! Set the Environment Variable NODE_ORACLEDB_PFILE.");
    }

    // Check if the connect string points to the CDB root
    const conn = await oracledb.getConnection(dbaConfig);

    // Query to confirm the session is connected to the CDB root
    const result = await conn.execute("SELECT SYS_CONTEXT('USERENV', 'CON_NAME') AS CON_NAME FROM DUAL");
    const containerName = result.rows[0][0];

    if (containerName !== 'CDB$ROOT') {
      console.log(`Skipping test. The connect string does not point to CDB$ROOT but to ${containerName}`);
      await conn.close();
      this.skip();
    }
    await conn.close();
  });

  it('1.1 shutdown and then startup the DB instance with the simple API', async () => {
    const conn = await oracledb.getConnection(dbaConfig);
    await conn.execute("ALTER SESSION SET CONTAINER=CDB$ROOT");
    await conn.close();

    // (1) Shutdown
    const shutdownMode = oracledb.SHUTDOWN_MODE_IMMEDIATE;
    await oracledb.shutdown (dbaConfig, shutdownMode);

    // (2) Verify the DB instance is down
    await assert.rejects(
      async () => {
        await oracledb.getConnection(dbaConfig);
      }
    );
    // Error ORA-01034: ORACLE not available

    await testsUtil.sleep();

    // (3) Startup
    const startupAttr = {
      force: false,
      restrict: false,
      pfile: process.env.NODE_ORACLEDB_PFILE
    };
    await oracledb.startup (dbaConfig, startupAttr);

    // (4) Verify the DB instance is up
    const conn2  = await oracledb.getConnection(dbaConfig);
    const result = await conn2.execute('select (1+2) from dual');
    assert.strictEqual(result.rows[0][0], 3);
    await conn2.close();
  });
});

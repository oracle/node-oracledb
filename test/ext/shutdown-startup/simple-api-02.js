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
 *   3. simple-api-02.js
 *
 * DESCRIPTION
 *   The simple API of oracledb.shutdown(). Test the various shutdown modes.
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

describe('3. simple-api-02.js', () => {

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

  it('3.1 call oracledb.shutdown() with mode not specified. DEFAULT assumed', async () => {
    // (1) Shutdown
    await oracledb.shutdown (dbaConfig);

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
  }); // 3.1

  it('3.2 call oracledb.shutdown() with mode set to SHUTDOWN_MODE_DEFAULT', async () => {
    // (1) Shutdown
    const shutdownMode = oracledb.SHUTDOWN_MODE_DEFAULT;
    await oracledb.shutdown (dbaConfig, shutdownMode);

    // (2) Verify the DB instance is down
    await assert.rejects(
      async () => {
        await oracledb.getConnection(dbaConfig);
      }
    );

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
  }); // 3.2

  it('3.3 SHUTDOWN_MODE_TRANSACTIONAL', async () => {
    // (1) Shutdown
    const shutdownMode = oracledb.SHUTDOWN_MODE_TRANSACTIONAL;
    await oracledb.shutdown (dbaConfig, shutdownMode);

    // (2) Verify the DB instance is down
    await assert.rejects(
      async () => {
        await oracledb.getConnection(dbaConfig);
      }
    );

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
  }); // 3.3

  it('3.4 SHUTDOWN_MODE_TRANSACTIONAL_LOCAL', async () => {
    // (1) Shutdown
    const shutdownMode = oracledb.SHUTDOWN_MODE_TRANSACTIONAL_LOCAL;
    await oracledb.shutdown (dbaConfig, shutdownMode);

    // (2) Verify the DB instance is down
    await assert.rejects(
      async () => {
        await oracledb.getConnection(dbaConfig);
      }
    );

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
  }); // 3.4

  it('3.5 SHUTDOWN_MODE_ABORT mode, the next startup may require instance recovery', async () => {
    // (1) Shutdown
    const shutdownMode = oracledb.SHUTDOWN_MODE_ABORT;
    await oracledb.shutdown (dbaConfig, shutdownMode);

    // (2) Verify the DB instance is down
    await assert.rejects(
      async () => {
        await oracledb.getConnection(dbaConfig);
      }
    );

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
  }); // 3.5
});

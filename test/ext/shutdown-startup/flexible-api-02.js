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
 *   4. flexible-api-02.js
 *
 * DESCRIPTION
 *   Test the various shutdown modes.
 *
 * Environment Variables:
 *    NODE_ORACLEDB_PFILE: Configuration file pointing to initialization parameters for an Oracle database instance.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('../../dbconfig.js');
const testsUtil = require('../../testsUtil.js');

describe('4. flexible-api-02.js', () => {

  const connAttr = {
    user: dbconfig.test.DBA_user,
    password: dbconfig.test.DBA_password,
    connectString: dbconfig.connectString,
    privilege: oracledb.SYSOPER
  };

  const connAttr1 = {
    user: dbconfig.test.DBA_user,
    password: dbconfig.test.DBA_password,
    connectionString: dbconfig.connectString,
    privilege: oracledb.SYSOPER | oracledb.SYSPRELIM
  };

  const startupAttr = {
    force: false,
    restrict: false,
    pfile: process.env.NODE_ORACLEDB_PFILE
  };

  before(async function() {
    if (oracledb.thin) {
      this.skip();
    }

    if (!process.env.NODE_ORACLEDB_PFILE) {
      throw new Error("Startup pfile is not set! Set the Environment Variable NODE_ORACLEDB_PFILE.");
    }

    // Check if the connect string points to the CDB root
    const conn = await oracledb.getConnection(connAttr);

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

  it('4.1 call connection.shutdown() with mode not specified. DEFAULT assumed', async () => {

    // (1) Shutdown
    let conn = await oracledb.getConnection(connAttr);

    await conn.shutdown();
    await conn.execute('ALTER DATABASE CLOSE');
    await conn.execute ('ALTER DATABASE DISMOUNT');
    await conn.shutdown (oracledb.SHUTDOWN_MODE_FINAL);

    await conn.close();

    // (2) Verify the DB instance is down
    await assert.rejects(
      async () => {
        await oracledb.getConnection(connAttr);
      }
    );

    await testsUtil.sleep();

    // (3) Startup
    conn = await oracledb.getConnection(connAttr1);
    await conn.startup(startupAttr);
    await conn.close();

    conn = await oracledb.getConnection(connAttr);
    await conn.execute("ALTER DATABASE MOUNT") ;
    await conn.execute("ALTER DATABASE OPEN");
    await conn.close();

    // (4) Verify the DB instance is up
    conn  = await oracledb.getConnection(connAttr);
    const result = await conn.execute('select (1+2) from dual');
    assert.strictEqual(result.rows[0][0], 3);
    await conn.close();
  }); // 4.1

  it('4.2 call connection.shutdown() with mode set to SHUTDOWN_MODE_DEFAULT', async () => {

    const shutdownMode = oracledb.SHUTDOWN_MODE_DEFAULT;

    // (1) Shutdown
    let conn = await oracledb.getConnection(connAttr);

    await conn.shutdown(shutdownMode);
    await conn.execute('ALTER DATABASE CLOSE');
    await conn.execute ('ALTER DATABASE DISMOUNT');
    await conn.shutdown (oracledb.SHUTDOWN_MODE_FINAL);

    await conn.close();

    // (2) Verify the DB instance is down
    await assert.rejects(
      async () => {
        await oracledb.getConnection(connAttr);
      }
    );

    await testsUtil.sleep();

    // (3) Startup
    conn = await oracledb.getConnection(connAttr1);
    await conn.startup(startupAttr);
    await conn.close();

    conn = await oracledb.getConnection(connAttr);
    await conn.execute("ALTER DATABASE MOUNT") ;
    await conn.execute("ALTER DATABASE OPEN");
    await conn.close();

    // (4) Verify the DB instance is up
    conn  = await oracledb.getConnection(connAttr);
    const result = await conn.execute('select (1+2) from dual');
    assert.strictEqual(result.rows[0][0], 3);
    await conn.close();
  }); // 4.2

  it('4.3 SHUTDOWN_MODE_TRANSACTIONAL', async () => {

    const shutdownMode = oracledb.SHUTDOWN_MODE_TRANSACTIONAL;

    // (1) Shutdown
    let conn = await oracledb.getConnection(connAttr);

    await conn.shutdown(shutdownMode);
    await conn.execute('ALTER DATABASE CLOSE');
    await conn.execute ('ALTER DATABASE DISMOUNT');
    await conn.shutdown (oracledb.SHUTDOWN_MODE_FINAL);

    await conn.close();

    // (2) Verify the DB instance is down
    await assert.rejects(
      async () => {
        await oracledb.getConnection(connAttr);
      }
    );

    await testsUtil.sleep();

    // (3) Startup
    conn = await oracledb.getConnection(connAttr1);
    await conn.startup(startupAttr);
    await conn.close();

    conn = await oracledb.getConnection(connAttr);
    await conn.execute("ALTER DATABASE MOUNT") ;
    await conn.execute("ALTER DATABASE OPEN");
    await conn.close();

    // (4) Verify the DB instance is up
    conn  = await oracledb.getConnection(connAttr);
    const result = await conn.execute('select (1+2) from dual');
    assert.strictEqual(result.rows[0][0], 3);
    await conn.close();
  }); // 4.3

  it('4.4 SHUTDOWN_MODE_TRANSACTIONAL_LOCAL', async () => {

    const shutdownMode = oracledb.SHUTDOWN_MODE_TRANSACTIONAL_LOCAL;

    // (1) Shutdown
    let conn = await oracledb.getConnection(connAttr);

    await conn.shutdown(shutdownMode);
    await conn.execute('ALTER DATABASE CLOSE');
    await conn.execute ('ALTER DATABASE DISMOUNT');
    await conn.shutdown (oracledb.SHUTDOWN_MODE_FINAL);

    await conn.close();

    // (2) Verify the DB instance is down
    await assert.rejects(
      async () => {
        await oracledb.getConnection(connAttr);
      }
    );

    await testsUtil.sleep();

    // (3) Startup
    conn = await oracledb.getConnection(connAttr1);
    await conn.startup(startupAttr);
    await conn.close();

    conn = await oracledb.getConnection(connAttr);
    await conn.execute("ALTER DATABASE MOUNT") ;
    await conn.execute("ALTER DATABASE OPEN");
    await conn.close();

    // (4) Verify the DB instance is up
    conn  = await oracledb.getConnection(connAttr);
    const result = await conn.execute('select (1+2) from dual');
    assert.strictEqual(result.rows[0][0], 3);
    await conn.close();
  }); // 4.4

  it('4.5 SHUTDOWN_MODE_ABORT mode, the next startup may require instance recovery', async () => {

    const shutdownMode = oracledb.SHUTDOWN_MODE_ABORT;

    // (1) Shutdown
    let conn = await oracledb.getConnection(connAttr);

    await conn.shutdown(shutdownMode);

    await conn.close();

    // (2) Verify the DB instance is down
    await assert.rejects(
      async () => {
        await oracledb.getConnection(connAttr);
      }
    );

    await testsUtil.sleep();

    // (3) Startup
    conn = await oracledb.getConnection(connAttr1);
    await conn.startup(startupAttr);
    await conn.close();

    conn = await oracledb.getConnection(connAttr);
    await conn.execute("ALTER DATABASE MOUNT") ;
    await conn.execute("ALTER DATABASE OPEN");
    await conn.close();

    // (4) Verify the DB instance is up
    conn  = await oracledb.getConnection(connAttr);
    const result = await conn.execute('select (1+2) from dual');
    assert.strictEqual(result.rows[0][0], 3);
    await conn.close();

  }); // 4.5
});

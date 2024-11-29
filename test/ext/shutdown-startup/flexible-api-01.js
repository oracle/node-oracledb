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
 *   2. flexible-api-01.js
 *
 * DESCRIPTION
 *   The flexible API of oracledb.shutdown().
 *
 * Environment Variables:
 *    NODE_ORACLEDB_PFILE: Configuration file pointing to initialization parameters for an Oracle database instance.
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbconfig = require('../../dbconfig.js');
const testsUtil = require('../../testsUtil.js');

describe('2. flexible-api-01.js', () => {

  before(async function() {
    if (oracledb.thin) {
      this.skip();
    }

    if (!process.env.NODE_ORACLEDB_PFILE) {
      throw new Error("Startup pfile is not set! Set the Environment Variable NODE_ORACLEDB_PFILE.");
    }

    // Check if the connect string points to the CDB root
    const dbaConfig = {
      user: dbconfig.test.DBA_user,
      password: dbconfig.test.DBA_password,
      connectString: dbconfig.connectString,
      privilege: oracledb.SYSDBA
    };

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

  it('2.1 shutdown and then startup the DB instance with the flexible API', async () => {
    // Connection attributes for SYSDBA operations
    const dbaConfig = {
      user: dbconfig.test.DBA_user,
      password: dbconfig.test.DBA_password,
      connectString: dbconfig.connectString, // CDB Root connection string
      privilege: oracledb.SYSDBA
    };

    const shutdownMode = oracledb.SHUTDOWN_MODE_IMMEDIATE;

    // (1) Shutdown
    let conn = await oracledb.getConnection(dbaConfig);
    await conn.execute("ALTER SESSION SET CONTAINER=CDB$ROOT"); // Ensure operations target the CDB root
    await conn.shutdown(shutdownMode); // Immediate shutdown
    await conn.execute("ALTER DATABASE CLOSE");
    await conn.execute("ALTER DATABASE DISMOUNT");
    await conn.shutdown(oracledb.SHUTDOWN_MODE_FINAL); // Final shutdown
    await conn.close();

    // (2) Verify the DB instance is down
    await assert.rejects(
      async () => {
        await oracledb.getConnection(dbaConfig); // Attempting connection to a down DB
      }
    );
    // Expecting ORA-01034: ORACLE not available

    await testsUtil.sleep(5000); // Allow DB processes to settle after shutdown

    // (3) Startup
    const prelimdbaConfig = {
      user: dbconfig.test.DBA_user,
      password: dbconfig.test.DBA_password,
      connectString: dbconfig.connectString, // CDB Root connection string
      privilege: oracledb.SYSDBA | oracledb.SYSPRELIM // Prelim connection for startup
    };

    const startupAttr = {
      force: true, // Force startup to bypass residual shutdown state
      restrict: false, // Open the DB in unrestricted mode
      pfile: process.env.NODE_ORACLEDB_PFILE
    };

    // Prelim connection to start the instance
    conn = await oracledb.getConnection(prelimdbaConfig);
    await conn.startup(startupAttr);
    await conn.close();

    // (4) Establish a SYSDBA connection for subsequent operations
    conn = await oracledb.getConnection(dbaConfig);
    await conn.execute("ALTER DATABASE MOUNT"); // Mount the database
    await conn.execute("ALTER DATABASE OPEN"); // Open the database
    await conn.close();

    // (5) Verify the DB instance is up
    conn = await oracledb.getConnection(dbaConfig);
    const result = await conn.execute("SELECT (1+2) FROM dual");
    assert.strictEqual(result.rows[0][0], 3);
    await conn.close();
  });
});

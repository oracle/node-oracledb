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
 *   6. flexible-api-03.js
 *
   * DESCRIPTION
 *   The flexible API of oracledb.shutdown(). Requires Oracle Database 12.1
 *   or later and node-oracledb Thick mode. Ensure that your connect string
 *   points to the CDB$ROOT database instance.
 *
 * Environment Variables:
 *    NODE_ORACLEDB_PFILE: Configuration file pointing to initialization
 *    parameters for an Oracle Database instance.
 *
 * Note: Default pfile location is $ORACLE_HOME/dbs/init<SID>.ora
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('../../dbconfig.js');
const testsUtil = require('../../testsUtil.js');

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

const shutdownMode = oracledb.SHUTDOWN_MODE_IMMEDIATE;

describe('6. flexible-api-03.js', () => {

  before(async function() {
    if (oracledb.thin) {
      this.skip();
    }

    if (!process.env.NODE_ORACLEDB_PFILE) {
      throw new Error("Startup pfile is not set! Set the Environment Variable NODE_ORACLEDB_PFILE.");
    }

    // Check if the connect string points to the CDB root
    const conn = await oracledb.getConnection(connAttr);
    if (conn.oracleServerVersion < 1201020000) {
      await conn.close();
      this.skip();
    }

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

  it('6.1 Default value for option "pfile"', async () => {
    /*
      The default parameter file (PFILE) is typically found in the following locations:
      Linux: /oracle/product/oracle_home/dbs/init<DB_SID>.ora
      Windows: C:\oracle\product\oracle_home\database\init<DB_SID>.ora.
      The filename is init<DB_SID>.ora.
    */
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
    // Error ORA-01034: ORACLE not available

    await testsUtil.sleep();

    // (3) Startup
    const startupAttr = {
      force: false,
      restrict: false
    };
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
  }); // 6.1

  it('6.2 not provide any options', async () => {
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
    // Error ORA-01034: ORACLE not available

    await testsUtil.sleep();

    // (3) Startup
    conn = await oracledb.getConnection(connAttr1);
    await conn.startup();
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
  }); // 6.2

  it('6.3 "restrict" option is true', async () => {
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
    // Error ORA-01034: ORACLE not available

    await testsUtil.sleep();

    // (3) Startup
    const startupAttr = {
      force: false,
      restrict: true,
      pfile: process.env.NODE_ORACLEDB_PFILE
    };
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
  }); // 6.3

  it('6.4 "force" option is true', async () => {
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
    // Error ORA-01034: ORACLE not available

    await testsUtil.sleep();

    // (3) Startup
    const startupAttr = {
      force: true,
      restrict: false,
      pfile: process.env.NODE_ORACLEDB_PFILE
    };
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
  }); // 6.4

  it('6.5 both "restrict" and "force" options are true', async () => {
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
    // Error ORA-01034: ORACLE not available

    await testsUtil.sleep();

    // (3) Startup
    const startupAttr = {
      force: true,
      restrict: true,
      pfile: process.env.NODE_ORACLEDB_PFILE
    };
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
  }); // 6.5
});

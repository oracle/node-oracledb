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
 *  308. inBandNotification.js
 *  No special setup is required but the test makes use of debugging packages
 *  that are not intended for normal use.
 *  dbms_tg_dbg.set_session_drainable, here debug package (dbms_tg_dbg) is used to simulate an inband notification.
 */

'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('308. Inband Notification', function() {
  let isRunnable = false;
  const DBA_config = dbConfig.test.DBA_PRIVILEGE ? {
    user: dbConfig.test.DBA_user,
    password: dbConfig.test.DBA_password,
    connectString: dbConfig.connectString,
    privilege: oracledb.SYSDBA
  } : null;

  let dbaConn;

  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites(1800000000, 1800000000);
    if (!dbConfig.test.DBA_PRIVILEGE || !isRunnable) this.skip();
    dbaConn = await oracledb.getConnection(DBA_config);
    await dbaConn.execute(`GRANT EXECUTE ON dbms_tg_dbg TO ${dbConfig.user}`);
    await dbaConn.execute(`GRANT SELECT ON v_$session TO ${dbConfig.user}`);
  });

  after(async function() {
    if (dbConfig.test.DBA_PRIVILEGE && isRunnable) {
      await dbaConn.execute(`REVOKE EXECUTE ON dbms_tg_dbg FROM ${dbConfig.user}`);
      await dbaConn.execute(`REVOKE SELECT ON v_$session FROM ${dbConfig.user}`);
      await dbaConn.close();
    }
  });

  describe('308.1 Standalone Connection', function() {
    let conn;

    beforeEach(async function() {
      conn = await oracledb.getConnection(dbConfig);
    });

    afterEach(async function() {
      await conn.close();
    });

    it('308.1.1 test standalone connection is marked unhealthy', async function() {
      assert.strictEqual(conn.isHealthy(), true);

      await conn.execute("BEGIN dbms_tg_dbg.set_session_drainable; END;");
      const result = await conn.execute("SELECT user FROM dual");
      assert.strictEqual(result.rows[0][0], dbConfig.user.toUpperCase());

      assert.strictEqual(conn.isHealthy(), false);
    }); // 308.1.1

    it('308.1.2 test connection health after executing a long-running query', async function() {
      assert.strictEqual(conn.isHealthy(), true);

      const majorDBVersion = await testsUtil.getMajorDBVersion();

      // Appropriate sleep procedure based on the database version
      const sleepProc = (majorDBVersion >= 18) ? 'dbms_session.sleep' : 'dbms_lock.sleep';

      await conn.execute(`
          BEGIN
              ${sleepProc}(5);
          END;
      `);

      assert.strictEqual(conn.isHealthy(), true);

      await conn.execute("BEGIN dbms_tg_dbg.set_session_drainable; END;");
      assert.strictEqual(conn.isHealthy(), false);
    }); // 308.1.2

    it('308.1.3 test connection health after a PL/SQL error', async function() {
      assert.strictEqual(conn.isHealthy(), true);

      await assert.rejects(
        async () => await conn.execute(`
              BEGIN
                  RAISE_APPLICATION_ERROR(-20001, 'Test error');
              END;
          `),
        /ORA-20001/ // Test error
      );

      assert.strictEqual(conn.isHealthy(), true);

      await conn.execute("BEGIN dbms_tg_dbg.set_session_drainable; END;");
      assert.strictEqual(conn.isHealthy(), false);
    }); // 308.1.3

    it('308.1.4 test connection health after setting session drainable multiple times', async function() {
      assert.strictEqual(conn.isHealthy(), true);

      await conn.execute("BEGIN dbms_tg_dbg.set_session_drainable; END;");
      assert.strictEqual(conn.isHealthy(), false);

      await conn.execute("BEGIN dbms_tg_dbg.set_session_drainable; END;");
      assert.strictEqual(conn.isHealthy(), false);
    }); // 308.1.4

    it('308.1.5 test connection health after ORA-00001 unique constraint error', async function() {
      const tableName = 'emp';
      const sql = `CREATE TABLE ${tableName} (
                    id NUMBER primary key,
                    VALUE varchar(30)
                )`;
      await conn.execute(testsUtil.sqlCreateTable(tableName, sql));

      await assert.rejects(
        async () => await conn.execute(`
          BEGIN
            INSERT INTO ${tableName} (id, value) VALUES (1, 'test');
            INSERT INTO ${tableName} (id, value) VALUES (1, 'test'); -- Will cause ORA-00001
          END;
        `),
        /ORA-00001/
      );

      assert.strictEqual(conn.isHealthy(), true);

      await conn.execute("BEGIN dbms_tg_dbg.set_session_drainable; END;");
      assert.strictEqual(conn.isHealthy(), false);
    }); // 308.1.5

    it('308.1.6 test connection health after multiple drainable sessions in quick succession', async function() {
      assert.strictEqual(conn.isHealthy(), true);

      for (let i = 0; i < 5; i++) {
        await conn.execute("BEGIN dbms_tg_dbg.set_session_drainable; END;");
        assert.strictEqual(conn.isHealthy(), false);
      }
    }); // 308.1.6
  });

  describe('308.2 Pooled Connection', function() {
    let pool;

    before(async function() {
      pool = await oracledb.createPool({
        ...dbConfig,
        poolMin: 1,
        poolMax: 2,
        poolIncrement: 1
      });
    });

    after(async function() {
      await pool.close(0);
    });

    it('308.2.1 test pooled connection that is marked unhealthy', async function() {
      /* Skip this test for clients before 23.1 due to inconsistent behavior
         of OCI_ATTR_SERVER_STATUS on subsequent calls.
      */
      if (!oracledb.thin && testsUtil.getClientVersion() < 2301000000)
        this.skip();
      const conn1 = await pool.getConnection();
      assert.strictEqual(conn1.isHealthy(), true);

      await conn1.execute("BEGIN dbms_tg_dbg.set_session_drainable; END;");
      const info = await getSidSerial(conn1);
      assert.strictEqual(conn1.isHealthy(), false);
      await conn1.close();

      const conn2 = await pool.getConnection();
      assert.strictEqual(conn2.isHealthy(), true);
      const newInfo = await getSidSerial(conn2);
      assert.notStrictEqual(newInfo, info);
      await conn2.close();
    }); // 308.2.1

    it('308.2.2 test multiple connections in a pool with inband notifications', async function() {
      const conn1 = await pool.getConnection();
      const conn2 = await pool.getConnection();

      assert.strictEqual(conn1.isHealthy(), true);
      assert.strictEqual(conn2.isHealthy(), true);

      await conn1.execute("BEGIN dbms_tg_dbg.set_session_drainable; END;");
      assert.strictEqual(conn1.isHealthy(), false);
      assert.strictEqual(conn2.isHealthy(), true);

      await conn1.close();
      await conn2.close();
    }); // 308.2.2

    it('308.2.3 test connection reuse after marking unhealthy', async function() {
      const conn1 = await pool.getConnection();
      assert.strictEqual(conn1.isHealthy(), true);

      await conn1.execute("BEGIN dbms_tg_dbg.set_session_drainable; END;");
      assert.strictEqual(conn1.isHealthy(), false);
      await conn1.close();

      const conn2 = await pool.getConnection();
      assert.strictEqual(conn2.isHealthy(), true);
      await conn2.close();
    }); // 308.2.3

    it('308.2.4 test pool draining with multiple sessions', async function() {
      const conn1 = await pool.getConnection();
      const conn2 = await pool.getConnection();

      assert.strictEqual(conn1.isHealthy(), true);
      assert.strictEqual(conn2.isHealthy(), true);

      await conn1.execute("BEGIN dbms_tg_dbg.set_session_drainable; END;");
      assert.strictEqual(conn1.isHealthy(), false);

      await conn2.execute("BEGIN dbms_tg_dbg.set_session_drainable; END;");
      assert.strictEqual(conn2.isHealthy(), false);

      await conn1.close();
      await conn2.close();

      const conn3 = await pool.getConnection();
      assert.strictEqual(conn3.isHealthy(), true);
      await conn3.close();
    }); // 308.2.4
  });

  async function getSidSerial(conn) {
    const result = await conn.execute(
      "SELECT sid || ',' || serial# AS info FROM v$session WHERE audsid = SYS_CONTEXT('USERENV', 'SESSIONID')"
    );
    return result.rows[0][0];
  }
});

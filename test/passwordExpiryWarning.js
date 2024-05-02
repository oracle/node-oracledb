/* Copyright (c) 2023, 2024, Oracle and/or its affiliates. */

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
 *   292. passwordExpiryWarning.js
 *
 * DESCRIPTION
 *   Test cases related to handling of SUCCESS_WITH_INFO warnings when
 *   user password is about to expire.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const assert    = require('assert');
const testsUtil = require('./testsUtil.js');


describe('292. passwordExpiryWarning.js', function() {
  const userName = 'testUser292';
  const password = 'testUser292';
  const newPassword = 'testnew292';

  const plsql = `
    BEGIN
      DECLARE
        e_user_missing EXCEPTION;
        PRAGMA EXCEPTION_INIT(e_user_missing, -01918);
      BEGIN
        EXECUTE IMMEDIATE('DROP USER ${userName} CASCADE');
      EXCEPTION
        WHEN e_user_missing
          THEN NULL;
      END;
      EXECUTE IMMEDIATE('CREATE USER ${userName} IDENTIFIED BY ${password}');
      EXECUTE IMMEDIATE('GRANT CONNECT, RESOURCE, UNLIMITED TABLESPACE \n
          TO ${userName}');
      EXECUTE IMMEDIATE('CREATE PROFILE SHORT_LIFE_PROFILE1 LIMIT \n
          PASSWORD_LIFE_TIME 1/24/60/60 PASSWORD_GRACE_TIME 1/24/60');
      EXECUTE IMMEDIATE('ALTER USER ${userName} profile SHORT_LIFE_PROFILE1');
    END;
   `;

  const dbaCredential = {
    user: dbConfig.test.DBA_user,
    password: dbConfig.test.DBA_password,
    connectString: dbConfig.connectString,
    privilege: oracledb.SYSDBA
  };

  before(async function() {
    if (!dbConfig.test.DBA_PRIVILEGE || dbConfig.test.drcp) this.skip();

    const connAsDBA = await oracledb.getConnection(dbaCredential);
    await connAsDBA.execute(plsql);
    await testsUtil.sleep(2000);
    await connAsDBA.close();
  });

  after(async function() {
    if (!dbConfig.test.DBA_PRIVILEGE || dbConfig.test.drcp) return;

    const connAsDBA = await oracledb.getConnection(dbaCredential);
    await connAsDBA.execute (`ALTER USER ${userName} PROFILE DEFAULT`);
    await connAsDBA.execute (`DROP PROFILE SHORT_LIFE_PROFILE1`);
    await connAsDBA.execute(`DROP USER ${userName} CASCADE`);
    await connAsDBA.close();
  });


  it('292.1 password expiry warning', async () => {
    const credentials = {
      user: userName,
      password: password,
      connectString: dbConfig.connectString
    };

    const isDB23ai = await testsUtil.checkPrerequisites(undefined, 2300000000);
    const conn = await oracledb.getConnection(credentials);
    if (isDB23ai) {
      assert.strictEqual(conn.warning.code, 'ORA-28098');
      assert.strictEqual(conn.warning.errorNum, 28098);
    } else {
      assert.strictEqual(conn.warning.code, 'ORA-28002');
      assert.strictEqual(conn.warning.errorNum, 28002);
    }
    await conn.close();
  }); // 292.1

  it('292.2 password expiry warning on a homogeneous pool', async () => {
    const credentials = {
      user: userName,
      password: password,
      connectString: dbConfig.connectString,
      poolMin: 10,
      poolMax: 50,
      poolIncrement: 10,
      poolTimeout: 60,
      homogeneous: true
    };
    const isDB23ai = await testsUtil.checkPrerequisites(undefined, 2300000000);
    const pool = await oracledb.createPool(credentials);
    const conn = await pool.getConnection();
    await testsUtil.sleep(1000);
    if (isDB23ai) {
      assert.strictEqual(conn.warning.message.startsWith("ORA-28098:"), true);
    } else {
      assert.strictEqual(conn.warning.message.startsWith("ORA-28002:"), true);
    }
    await conn.close();
    await pool.close(0);
  }); // 292.2

  it('292.3 password expiry warning on a heterogeneous pool', async function() {
    if (oracledb.thin) {
      this.skip();
    }
    const credentials = {
      user: userName,
      password: password,
      connectString: dbConfig.connectString,
      poolMin: 10,
      poolMax: 50,
      poolIncrement: 10,
      poolTimeout: 60,
      homogeneous: false
    };
    const isDB23ai = await testsUtil.checkPrerequisites(undefined, 2300000000);
    const pool = await oracledb.createPool(credentials);
    const conn = await pool.getConnection({
      user: userName,
      password: password
    });
    if (isDB23ai) {
      assert.strictEqual(conn.warning.message.startsWith("ORA-28098:"), true);
    } else {
      assert.strictEqual(conn.warning.message.startsWith("ORA-28002:"), true);
    }
    await conn.close();
    await pool.close(0);
  }); // 292.3

  it('292.4 with poolMin=0 with regular user and password', async function() {
    const credentials = {
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString,
      poolMin: 0,
      poolMax: 50,
      poolIncrement: 10,
      poolTimeout: 60,
      homogeneous: true
    };

    const pool = await oracledb.createPool(credentials);
    const conn = await pool.getConnection();
    assert.strictEqual(conn.warning, undefined);

    await conn.close();
    await pool.close();
  }); //292.4


  it('292.5 with poolMin=0 with password in grace time', async function() {
    const credentials = {
      user: userName,
      password: password,
      connectString: dbConfig.connectString,
      poolMin: 0,
      poolMax: 5,
      poolIncrement: 1,
      poolTimeout: 60,
      homogeneous: true
    };

    const isDB23ai = await testsUtil.checkPrerequisites(undefined, 2300000000);
    const pool = await oracledb.createPool(credentials);
    const conn = await pool.getConnection();
    if (isDB23ai) {
      assert.strictEqual(conn.warning.code, 'ORA-28098');
    } else {
      assert.strictEqual(conn.warning.code, 'ORA-28002');
    }

    await conn.close();

    // Check that the warning is cleared on the next connection
    const conn2 = await pool.getConnection();
    assert.strictEqual(conn2.warning, undefined);
    await conn2.close();

    await pool.close();
  }); // 292.5

  it('292.6 with poolMin=1 with password in grace time', async function() {
    const credentials = {
      user: userName,
      password: password,
      connectString: dbConfig.connectString,
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1,
      poolTimeout: 60,
      homogeneous: true
    };

    const isDB23ai = await testsUtil.checkPrerequisites(undefined, 2300000000);
    const pool = await oracledb.createPool(credentials);
    const conn = await pool.getConnection();
    if (isDB23ai) {
      assert.strictEqual(conn.warning.code, 'ORA-28098');
    } else {
      assert.strictEqual(conn.warning.code, 'ORA-28002');
    }

    await conn.close();

    // Check that the warning is cleared on the next connection
    const conn2 = await pool.getConnection();
    assert.strictEqual(conn2.warning, undefined);
    await conn2.close();

    await pool.close();
  }); // 292.6

  it('292.7 no warning after password change on new connection', async () => {
    const credentials = {
      user: userName,
      password: password,
      connectString: dbConfig.connectString
    };
    const newCredentials = {
      user: userName,
      password: newPassword,
      connectString: dbConfig.connectString
    };

    const isDB23ai = await testsUtil.checkPrerequisites(undefined, 2300000000);
    const conn = await oracledb.getConnection(credentials);
    if (isDB23ai) {
      assert.strictEqual(conn.warning.code, 'ORA-28098');
      assert.strictEqual(conn.warning.errorNum, 28098);
    } else {
      assert.strictEqual(conn.warning.code, 'ORA-28002');
      assert.strictEqual(conn.warning.errorNum, 28002);
    }
    await conn.changePassword(userName, password, newPassword);
    const conn1 = await oracledb.getConnection(newCredentials);
    assert.strictEqual(conn1.warning, undefined);
    await conn.close();
    await conn1.close();
  }); // 292.7

});

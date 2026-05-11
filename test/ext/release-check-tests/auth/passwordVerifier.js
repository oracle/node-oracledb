/* Copyright (c) 2015, 2026, Oracle and/or its affiliates. */

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
 *   2. passwordVerifier.js
 *
 * DESCRIPTION
 *   Tests password verifier authentication behavior for both Thick and Thin
 *   modes, including mixed 11g and 12c verifier concurrency.
 *   The driver has the following implementation for user authentication for
 *   both login and changing passwords:
 *     • 11g MR verifier (SHA1)
 *     • 12c MR verifier (SHA512)
 *   This test verifies that the driver can authenticate users with 11g and
 *   12c verifiers, and that password changes and concurrent authentication
 *   work as expected.
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const dbconfig  = require('../../../dbconfig.js');
const assert    = require('assert');


describe('2. passwordVerifier.js', function() {
  // The following verifier strings correspond to the value "tiger"
  const VERIFIER_11G = "'S:68A909B9A7F3B2023ED6B19DF949918036C577897D07006C28C3AFCE9BF5'";
  const INVALID_VERIFIER_11G = "'S:68A909B9A7F3B2023ED6B19DF949918036C577897D07006C28C3AFCE9BF4'";
  const VERIFIER_12C = "'T:62DA75AB61D4390240ED8EB4E31550C2FB8293EB264D22C1A9998B8C9A9A5BF7BD06D2197C2A4578A0F1E8D4D17FB2EE0FAC94D2A80E0037A7B335A58A69C0A932F92CA093EC70DC62DE04349E3DC24A'";
  const INVALID_VERIFIER_12C = "'T:62DA75AB61D4390240ED8EB4E31550C2FB8293EB264D22C1A9998B8C9A9A5BF7BD06D2197C2A4578A0F1E8D4D17FB2EE0FAC94D2A80E0037A7B335A58A69C0A932F92CA093EC70DC62DE04349E3DC24B'";
  let DBA_config;
  let dbaConn;
  let sql;
  let trackedPools = [];
  let trackedConnections = [];
  const myUser = dbconfig.user + "_cpw";
  const verifierUser11G = dbconfig.user + "_v11";
  const verifierUser12C = dbconfig.user + "_v12";
  const myPwd = "tiger";
  const newPwd = "tiger2";
  if (dbconfig.test.DBA_PRIVILEGE == true) {
    DBA_config = {
      user: dbconfig.test.DBA_user,
      password: dbconfig.test.DBA_password,
      connectString: dbconfig.connectString,
      privilege: oracledb.SYSDBA
    };
  }

  function getCredential(userName) {
    return {
      user: userName,
      password: myPwd,
      connectString: dbconfig.connectString
    };
  }

  async function setVerifierUsers() {
    dbaConn = await oracledb.getConnection(DBA_config);
    assert(dbaConn);
    await dbaConn.execute("alter user " + verifierUser11G + " identified by values " + VERIFIER_11G);
    await dbaConn.execute("alter user " + verifierUser12C + " identified by values " + VERIFIER_12C);

    const result = await dbaConn.execute(
      `select username, password_versions
       from dba_users
       where username in (upper(:user11g), upper(:user12c))`,
      {
        user11g: verifierUser11G,
        user12c: verifierUser12C
      }
    );

    const passwordVersions = new Map(
      result.rows.map(([username, versions]) => [
        username,
        versions ? versions.trim().split(/\s+/) : []
      ])
    );

    assert.deepStrictEqual(passwordVersions.get(verifierUser11G.toUpperCase()), ['11G']);
    assert.deepStrictEqual(passwordVersions.get(verifierUser12C.toUpperCase()), ['12C']);
    await dbaConn.close();
    dbaConn = null;
    dbaConn = null;
  }

  async function runParallelPoolAuth(firstCredential, secondCredential, reverseOrder = false) {
    const firstPool = await oracledb.createPool({
      ...firstCredential,
      poolMin: 0,
      poolMax: 1,
      poolIncrement: 1
    });

    const secondPool = await oracledb.createPool({
      ...secondCredential,
      poolMin: 0,
      poolMax: 1,
      poolIncrement: 1
    });

    trackedPools.push(firstPool, secondPool);

    const firstPromise = firstPool.getConnection();
    const secondPromise = secondPool.getConnection();
    let firstConn;
    let secondConn;
    if (reverseOrder) {
      [secondConn, firstConn] = await Promise.all([secondPromise, firstPromise]);
    } else {
      [firstConn, secondConn] = await Promise.all([firstPromise, secondPromise]);
    }

    trackedConnections.push(firstConn, secondConn);
    assert(firstConn);
    assert(secondConn);
  }

  async function runParallelDirectAuth(firstCredential, secondCredential, reverseOrder = false) {
    const firstPromise = oracledb.getConnection(firstCredential);
    const secondPromise = oracledb.getConnection(secondCredential);
    let firstConn;
    let secondConn;
    if (reverseOrder) {
      [secondConn, firstConn] = await Promise.all([secondPromise, firstPromise]);
    } else {
      [firstConn, secondConn] = await Promise.all([firstPromise, secondPromise]);
    }

    trackedConnections.push(firstConn, secondConn);
    assert(firstConn);
    assert(secondConn);
  }

  before (async function() {
    if (!dbconfig.test.DBA_PRIVILEGE) this.skip();
    dbaConn = await oracledb.getConnection(DBA_config);
    assert(dbaConn);
    for (const userName of [myUser, verifierUser11G, verifierUser12C]) {
      sql = "BEGIN \n" +
                        "    DECLARE \n" +
                        "        e_user_missing EXCEPTION; \n" +
                        "        PRAGMA EXCEPTION_INIT(e_user_missing, -01918); \n" +
                        "    BEGIN \n" +
                        "        EXECUTE IMMEDIATE('DROP USER " + userName + " CASCADE'); \n" +
                        "    EXCEPTION \n" +
                        "        WHEN e_user_missing \n" +
                        "        THEN NULL; \n" +
                        "    END; \n" +
                        "    EXECUTE IMMEDIATE (' \n" +
                        "        CREATE USER " + userName + " IDENTIFIED BY " + myPwd + "\n" +
                        "    '); \n" +
                        "END; ";
      await dbaConn.execute(sql);

      sql = "GRANT CREATE SESSION to " + userName;
      await dbaConn.execute(sql);
    }
    await dbaConn.close();
    dbaConn = null;
  }); // before

  after(async function() {
    if (dbconfig.test.DBA_PRIVILEGE) {
      dbaConn = await oracledb.getConnection(DBA_config);
      assert(dbaConn);
      for (const userName of [myUser, verifierUser11G, verifierUser12C]) {
        sql = "BEGIN \n" +
                          "    DECLARE \n" +
                          "        e_user_missing EXCEPTION; \n" +
                          "        PRAGMA EXCEPTION_INIT(e_user_missing, -01918); \n" +
                          "    BEGIN \n" +
                          "        EXECUTE IMMEDIATE('DROP USER " + userName + " CASCADE'); \n" +
                          "    EXCEPTION \n" +
                          "        WHEN e_user_missing \n" +
                          "        THEN NULL; \n" +
                          "    END; \n" +
                          "END; ";
        await dbaConn.execute(sql);
      }
      await dbaConn.close();
      dbaConn = null;
    }
  }); // after

  afterEach(async function() {
    for (const conn of trackedConnections) {
      if (conn) {
        await conn.close();
      }
    }
    trackedConnections = [];

    for (const pool of trackedPools) {
      if (pool) {
        await pool.close(0);
      }
    }
    trackedPools = [];

    if (dbaConn) {
      await dbaConn.close();
      dbaConn = null;
    }
  });

  it('2.1 11g MR valid verifier (SHA1)', async function() {
    dbaConn = await oracledb.getConnection(DBA_config);
    assert(dbaConn);

    // Alter a user to use an 11g verifier
    const sqlQuery = "alter user " + myUser + " identified by values " + VERIFIER_11G;
    await dbaConn.execute(sqlQuery);
    await dbaConn.close();
    dbaConn = null;

    let credential = {
      user: myUser,
      password: myPwd,
      connectString: dbconfig.connectString
    };

    // Connect to database using user= myUser, password=myPwd
    dbaConn = await oracledb.getConnection(credential);
    assert(dbaConn);

    // Change password
    await dbaConn.changePassword(myUser, myPwd, newPwd);
    assert(dbaConn);
    await dbaConn.close();
    dbaConn = null;

    credential = {
      user: myUser,
      password: newPwd,
      connectString: dbconfig.connectString,
    };

    // Connect to database using user=myUser, password=NEWPASSWORD
    dbaConn = await oracledb.getConnection(credential);
    assert(dbaConn);
    await dbaConn.close();
    dbaConn = null;
  });

  it('2.2 11g MR invalid verifier (SHA1)', async function() {
    dbaConn = await oracledb.getConnection(DBA_config);
    assert(dbaConn);
    const sqlQuery = "alter user " + myUser + " identified by values " + INVALID_VERIFIER_11G;

    await dbaConn.execute(sqlQuery);
    await dbaConn.close();
    dbaConn = null;

    const credential = {
      user: myUser,
      password: myPwd,
      connectString: dbconfig.connectString,
      privilege: oracledb.SYSDBA
    };

    await assert.rejects (
      async () => {
        await oracledb.getConnection(credential);
      },
      // ORA-01017: invalid username/password; logon denied
      /ORA-01017:/
    );
  });

  it('2.3 12c MR valid verifier (SHA512)', async function() {
    dbaConn = await oracledb.getConnection(DBA_config);
    assert(dbaConn);
    const sqlQuery = "alter user " + myUser + " identified by values " + VERIFIER_12C;
    await dbaConn.execute(sqlQuery);
    await dbaConn.close();
    dbaConn = null;

    let credential = {
      user: myUser,
      password: myPwd,
      connectString: dbconfig.connectString
    };
    dbaConn = await oracledb.getConnection(credential);
    assert(dbaConn);

    await dbaConn.changePassword(myUser, myPwd, newPwd);
    assert(dbaConn);
    await dbaConn.close();
    dbaConn = null;

    credential = {
      user: myUser,
      password: newPwd,
      connectString: dbconfig.connectString
    };
    dbaConn = await oracledb.getConnection(credential);
    assert(dbaConn);
    await dbaConn.close();
    dbaConn = null;
  });

  it('2.4 12c MR invalid verifier (SHA512)', async function() {
    dbaConn = await oracledb.getConnection(DBA_config);
    assert(dbaConn);
    const sqlQuery = "alter user " + myUser + " identified by values " + INVALID_VERIFIER_12C;

    await dbaConn.execute(sqlQuery);
    await dbaConn.close();
    dbaConn = null;

    const credential = {
      user: myUser,
      password: myPwd,
      connectString: dbconfig.connectString
    };

    await assert.rejects (
      async () => {
        await oracledb.getConnection(credential);
      },
      // ORA-01017: invalid username/password; logon denied'
      /ORA-01017:/
    );
  });

  it('2.5 parallel pool authentication with 11g and 12c verifiers', async function() {
    for (let iteration = 0; iteration < 5; iteration++) {
      await setVerifierUsers();
      await runParallelPoolAuth(getCredential(verifierUser12C), getCredential(verifierUser11G));
    }
  });

  it('2.6 parallel pool authentication with 12c and 11g verifiers in reverse order', async function() {
    await setVerifierUsers();
    await runParallelPoolAuth(getCredential(verifierUser11G), getCredential(verifierUser12C), true);
  });

  it('2.7 parallel direct authentication with 11g and 12c verifiers', async function() {
    await setVerifierUsers();
    await runParallelDirectAuth(getCredential(verifierUser12C), getCredential(verifierUser11G));
  });

  it('2.8 parallel pool authentication with two 11g verifier logins', async function() {
    await setVerifierUsers();
    await runParallelPoolAuth(getCredential(verifierUser11G), getCredential(verifierUser11G));
  });

  it('2.9 parallel pool authentication with two 12c verifier logins', async function() {
    await setVerifierUsers();
    await runParallelPoolAuth(getCredential(verifierUser12C), getCredential(verifierUser12C));
  });

  it('2.10 repeated parallel direct authentication remains stable with mixed verifiers', async function() {
    for (let iteration = 0; iteration < 5; iteration++) {
      await setVerifierUsers();
      await runParallelDirectAuth(getCredential(verifierUser11G), getCredential(verifierUser12C), true);
    }
  });
});

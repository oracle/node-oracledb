/* Copyright (c) 2018, 2023, Oracle and/or its affiliates. */

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
 *   161. changePassword.js
 *
 * DESCRIPTION
 *   Test changing passwords feature and connecting with an expired password.
 *   Test longer passwords feature. Increase in the maximum length of the
 *   database user passwords from the current 30 bytes to 1024 bytes.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('161. changePassword.js', function() {
  let DBA_config;
  let dbaConn;
  let sql;
  const myUser = dbConfig.createUser();
  if (dbConfig.test.DBA_PRIVILEGE == true) {
    DBA_config = {
      user:          dbConfig.test.DBA_user,
      password:      dbConfig.test.DBA_password,
      connectString: dbConfig.connectString,
      privilege:     oracledb.SYSDBA
    };
  }

  before (async function() {
    if (dbConfig.test.drcp || !dbConfig.test.DBA_PRIVILEGE) this.skip();
    sql = "BEGIN \n" +
                      "    DECLARE \n" +
                      "        e_user_missing EXCEPTION; \n" +
                      "        PRAGMA EXCEPTION_INIT(e_user_missing, -01918); \n" +
                      "    BEGIN \n" +
                      "        EXECUTE IMMEDIATE('DROP USER " + myUser + " CASCADE'); \n" +
                      "    EXCEPTION \n" +
                      "        WHEN e_user_missing \n" +
                      "        THEN NULL; \n" +
                      "    END; \n" +
                      "    EXECUTE IMMEDIATE (' \n" +
                      "        CREATE USER " + myUser + " IDENTIFIED BY " + myUser + "\n" +
                      "    '); \n" +
                      "END; ";

    dbaConn = await oracledb.getConnection(DBA_config);
    await dbaConn.execute(sql);

    sql = "GRANT CREATE SESSION to " + myUser;
    await dbaConn.execute(sql);
    await dbaConn.close();
  }); // before

  after(async function() {
    if (dbConfig.test.DBA_PRIVILEGE && !dbConfig.test.drcp) {
      sql = "DROP USER " + myUser + " CASCADE";
      dbaConn = await oracledb.getConnection(DBA_config);
      await dbaConn.execute(sql);
      await dbaConn.close();
    }
  }); // after

  it('161.1 basic case', async function() {
    let conn;
    const tpass = testsUtil.generateRandomPassword();
    let credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbConfig.connectString
    };
    conn = await oracledb.getConnection(credential);
    // change password
    await conn.changePassword(myUser, myUser, tpass);
    await conn.close();

    // verify with new password
    credential = {
      user:             myUser,
      password:         tpass,
      connectionString: dbConfig.connectString
    };
    conn = await oracledb.getConnection(credential);

    // restore password
    await conn.changePassword(myUser, tpass, myUser);
    await conn.close();
  }); // 161.1

  it('161.2 pooled connection', async function() {
    let pool, conn;
    const tpass = testsUtil.generateRandomPassword();
    let credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbConfig.connectString
    };
    pool = await oracledb.createPool(credential);
    conn = await pool.getConnection();
    await conn.changePassword(myUser, myUser, tpass);
    await conn.close();
    // Still able to get connections
    conn = await pool.getConnection();
    await conn.close();
    await pool.close(0);
    // verify with old password
    pool = await oracledb.createPool(credential);

    await assert.rejects(
      async () => await pool.getConnection(),
      /ORA-01017:/
    );

    await pool.close(0);

    // verify with new password
    credential = {
      user:             myUser,
      password:         tpass,
      connectionString: dbConfig.connectString
    };
    pool = await oracledb.createPool(credential);
    conn = await pool.getConnection();
    await conn.close();
    await pool.close(0);
  }); // 161.2

  it('161.3 DBA changes password', async function() {
    const tpass = testsUtil.generateRandomPassword();
    const dbaConn = await oracledb.getConnection(DBA_config);
    await dbaConn.changePassword(myUser, '', tpass);
    let credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbConfig.connectString
    };

    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      /ORA-01017:/
    );

    // verify with changed password
    credential = {
      user:             myUser,
      password:         tpass,
      connectionString: dbConfig.connectString
    };
    const conn = await oracledb.getConnection(credential);
    await conn.close();

    // restore password
    await dbaConn.changePassword(myUser, '', myUser);
    await dbaConn.close();
  }); // 161.3

  it('161.4 connects with an expired password', async function() {
    const tpass = testsUtil.generateRandomPassword();
    const dbaConn = await oracledb.getConnection(DBA_config);
    const sql = "alter user " + myUser + " password expire";
    await dbaConn.execute(sql);

    let credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbConfig.connectString
    };

    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      /ORA-28001:/
    );

    credential = {
      user:             myUser,
      password:         myUser,
      newPassword:      tpass,
      connectionString: dbConfig.connectString
    };
    let conn = await oracledb.getConnection(credential);
    await conn.close();

    // restore password
    await dbaConn.changePassword(myUser, '', myUser);

    credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbConfig.connectString
    };

    conn = await oracledb.getConnection(credential);
    await conn.close();
    await dbaConn.close();
  }); // 161.4

  it('161.5 for DBA, the original password is ignored', async function() {
    const tpass = testsUtil.generateRandomPassword();

    const dbaConn = await oracledb.getConnection(DBA_config);
    await dbaConn.changePassword(myUser, 'foobar', tpass);

    let credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbConfig.connectString
    };

    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      /ORA-01017:/
    );

    // verify with new password
    credential = {
      user:             myUser,
      password:         tpass,
      connectionString: dbConfig.connectString
    };

    const conn = await oracledb.getConnection(credential);
    await conn.close();
    await dbaConn.changePassword(myUser, '', myUser);
    await dbaConn.close();

  }); // 161.5

  it('161.6 Negative: basic case, wrong original password', async function() {
    const tpass = testsUtil.generateRandomPassword();
    let credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbConfig.connectString
    };
    const conn = await oracledb.getConnection(credential);
    const wrongOne = 'foobar';

    await assert.rejects(
      async () => await conn.changePassword(myUser, wrongOne, tpass),
      /ORA-28008:/
    );

    await conn.close();

    credential = {
      user:             myUser,
      password:         tpass,
      connectionString: dbConfig.connectString
    };

    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      /ORA-01017:/
    );

  }); // 161.6

  it.skip('161.7 Negative: basic case. invalid parameter', async function() {
    const tpass = 123;
    const credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbConfig.connectString
    };

    const conn = await oracledb.getConnection(credential);

    await assert.rejects(
      async () => await conn.changePassword(myUser, myUser, tpass),
      /NJS-005:/
    );

    await conn.close();
  }); // 161.7

  it('161.8 Negative: non-DBA tries to change the password', async function() {
    const tUser = dbConfig.user + "_st";
    const tpass = testsUtil.generateRandomPassword();

    const dbaConn = await oracledb.getConnection(DBA_config);
    try {
      await dbaConn.execute(`drop user ${tUser} cascade`);
    } catch (err) {
      if (!err.message.startsWith('ORA-01918:'))
        throw err;
    }

    await dbaConn.execute(`create user ${tUser} identified by ${tUser}`);
    await dbaConn.execute(`grant create session to ${tUser}`);

    let credential = {
      user:             tUser,
      password:         tUser,
      connectionString: dbConfig.connectString
    };

    const tConn = await oracledb.getConnection(credential);

    await assert.rejects(
      async () => await tConn.changePassword(myUser, myUser, tpass),
      /ORA-01031:/
    );

    credential = {
      user:             myUser,
      password:         tpass,
      connectionString: dbConfig.connectString
    };

    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      /ORA-01017:/
    );

    await tConn.close();
    await dbaConn.execute(`drop user ${tUser} cascade`);
    await dbaConn.close();
  }); // 161.8

  it("161.9 Negative: invalid type of 'newPassword'", async function() {
    const wrongOne = 123;
    const credential = {
      user:             myUser,
      password:         myUser,
      newPassword:      wrongOne,
      connectionString: dbConfig.connectString
    };
    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      /NJS-007:/
    );
  }); // 161.9

  it('161.10 sets "newPassword" to be an empty string. password unchanged', async function() {
    const dbaConn = await oracledb.getConnection(DBA_config);
    await dbaConn.execute(`alter user ${myUser} password expire`);

    let credential = {
      user:             myUser,
      password:         myUser,
      newPassword:      '',
      connectionString: dbConfig.connectString
    };

    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      /ORA-28001:/
    );

    credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbConfig.connectString
    };

    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      /ORA-28001:/
    );
    await dbaConn.close();
  }); // 161.10

  it('161.11 connects with password that is expiring soon', async function() {
    const tUser = dbConfig.user + "_st_expiring";
    const shortProfile = `NJS_ShortPwd_st_expiring`;

    const dbaConn = await oracledb.getConnection(DBA_config);
    try {
      await dbaConn.execute(`drop user ${tUser} cascade`);
      await dbaConn.execute(`drop profile ${shortProfile} cascade`);
    } catch (err) {
      if (!(/ORA-01918:|ORA-02380:/.test(err.message)))
        throw err;
    }

    await dbaConn.execute(`create user ${tUser} identified by ${tUser}`);
    await dbaConn.execute(`grant create session to ${tUser}`);

    const credential = {
      user:             tUser,
      password:         tUser,
      connectionString: dbConfig.connectString
    };

    const sql = `create profile ${shortProfile} LIMIT password_life_time 1/86400 PASSWORD_GRACE_TIME 1`;
    await dbaConn.execute(sql);
    await dbaConn.execute(`alter user ${tUser} PROFILE ${shortProfile}`);
    const SLEEP_TIME = 2; // sleep to let the profile get updated.
    await new Promise(r => setTimeout(r, SLEEP_TIME));

    const tConn = await oracledb.getConnection(credential);
    await tConn.execute(`SELECT UNIQUE CLIENT_DRIVER FROM V$SESSION_CONNECT_INFO WHERE SID = SYS_CONTEXT('USERENV', 'SID')`);

    await tConn.close();
    await dbaConn.execute(`drop user ${tUser} cascade`);
    await dbaConn.execute(`drop profile ${shortProfile} cascade`);
    await dbaConn.close();
  }); // 161.11

  describe('161.12 longer Password tests', function() {

    let DBA_config;
    let isRunnable = false;
    const myUser = dbConfig.user + "_pwd";
    const longPwd = "a".repeat(1024);
    if (dbConfig.test.DBA_PRIVILEGE == true) {
      DBA_config = {
        user:          dbConfig.test.DBA_user,
        password:      dbConfig.test.DBA_password,
        connectString: dbConfig.connectString,
        privilege:     oracledb.SYSDBA
      };
    }

    before (async function() {
      isRunnable = (!dbConfig.test.drcp && dbConfig.test.DBA_PRIVILEGE);
      if (isRunnable) {
        isRunnable = await testsUtil.checkPrerequisites(2300000000, 2300000000);
      }
      if (!isRunnable) {
        this.skip();
      }
    }); // before

    after(async function() {
      if (!isRunnable) return;

      if (dbConfig.test.DBA_PRIVILEGE) {
        const sql = "DROP USER IF EXISTS " + myUser + " CASCADE";
        const dbaConn = await oracledb.getConnection(DBA_config);

        await dbaConn.execute(sql);
        await dbaConn.close();
      }
    }); // after

    it('161.12.1 basic case with password length 1024 Bytes', async function() {
      let result = null;
      let sql = "BEGIN \n" +
                      "    DECLARE \n" +
                      "        e_user_missing EXCEPTION; \n" +
                      "        PRAGMA EXCEPTION_INIT(e_user_missing, -01918); \n" +
                      "    BEGIN \n" +
                      "        EXECUTE IMMEDIATE('DROP USER " + myUser + " CASCADE'); \n" +
                      "    EXCEPTION \n" +
                      "        WHEN e_user_missing \n" +
                      "        THEN NULL; \n" +
                      "    END; \n" +
                      "    EXECUTE IMMEDIATE (' \n" +
                      "        CREATE USER " + myUser + " IDENTIFIED BY " + longPwd + "\n" +
                      "    '); \n" +
                      "END; ";
      const dbaConn = await oracledb.getConnection(DBA_config);
      await dbaConn.execute(sql);

      sql = "GRANT CREATE SESSION to " + myUser;
      await dbaConn.execute(sql);
      await dbaConn.close();
      // login with the same username and long password
      const credential = {
        user:             myUser,
        password:         longPwd,
        connectionString: dbConfig.connectString
      };
      const conn = await oracledb.getConnection(credential);
      assert(conn);

      result = await conn.execute("select sysdate as ts_date from dual");
      assert((result.rows[0][0]) instanceof Date);
      await conn.close();
    }); // 161.12.1

    it('161.12.2 pooled connection', async function() {
      let pool;
      let conn;

      const dbaConn = await oracledb.getConnection(DBA_config);

      let sql = "DROP USER IF EXISTS " + myUser + " CASCADE";
      await dbaConn.execute(sql);

      sql = "CREATE USER " + myUser + " IDENTIFIED BY " + longPwd;
      await dbaConn.execute(sql);

      sql = "GRANT CONNECT, CREATE SESSION to " + myUser;
      await dbaConn.execute(sql);
      const lpass = 'secret';
      var credential = {
        user:             myUser,
        password:         longPwd,
        connectionString: dbConfig.connectString
      };
      pool = await oracledb.createPool(credential);
      assert(pool);

      conn = await pool.getConnection();
      assert(conn);

      await conn.changePassword(myUser, longPwd, lpass);
      await conn.close();

      // Still able to get connections
      conn = await pool.getConnection();
      assert(conn);
      await conn.close();
      await pool.close();

      // verify with old password
      pool = await oracledb.createPool(credential);

      await assert.rejects(
        async () =>
          await pool.getConnection(),
        // ORA-01017: invalid username/password
        /ORA-01017:/
      );

      await pool.close();

      // verify with new password
      credential = {
        user:             myUser,
        password:         lpass,
        connectionString: dbConfig.connectString
      };
      pool = await oracledb.createPool(credential);
      conn = await pool.getConnection();
      assert(conn);
      await conn.close();
      await pool.close();
      await dbaConn.close();
    }); // 161.12.2

    it('161.12.3 DBA changes longer password', async function() {
      const newlongPwd = "b".repeat(1024);

      const dbaConn = await oracledb.getConnection(DBA_config);

      let sql = "DROP USER IF EXISTS " + myUser + " CASCADE";
      await dbaConn.execute(sql);

      sql = "CREATE USER " + myUser + " IDENTIFIED BY " + longPwd;
      await dbaConn.execute(sql);

      sql = "GRANT CONNECT, CREATE SESSION to " + myUser;
      await dbaConn.execute(sql);

      await dbaConn.changePassword(myUser, longPwd, newlongPwd);
      let credential = {
        user:             myUser,
        password:         myUser,
        connectionString: dbConfig.connectString
      };

      await assert.rejects(
        async () =>
          await oracledb.getConnection(credential),
        // ORA-01017: invalid username/password
        /ORA-01017:/
      );

      // verify with changed password
      credential = {
        user:             myUser,
        password:         newlongPwd,
        connectionString: dbConfig.connectString
      };
      const conn = await oracledb.getConnection(credential);
      assert(conn);
      await conn.close();

      // restore password
      await dbaConn.changePassword(myUser, '', myUser);
      await dbaConn.close();
    }); // 161.12.3

    it('161.12.4 connects with an expired password', async function() {
      const newlongPwd = "b".repeat(1024);
      const dbaConn = await oracledb.getConnection(DBA_config);

      let sql = "DROP USER IF EXISTS " + myUser + " CASCADE";
      await dbaConn.execute(sql);

      sql = "CREATE USER " + myUser + " IDENTIFIED BY " + longPwd;
      await dbaConn.execute(sql);

      sql = "GRANT CONNECT, CREATE SESSION to " + myUser;
      await dbaConn.execute(sql);

      sql = "alter user " + myUser + " password expire";
      await dbaConn.execute(sql);

      let credential = {
        user:             myUser,
        password:         longPwd,
        connectionString: dbConfig.connectString
      };

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        // ORA-28001: the password has expired
        /ORA-28001:/
      );

      credential = {
        user:             myUser,
        password:         longPwd,
        newPassword:      newlongPwd,
        connectionString: dbConfig.connectString
      };

      let conn = await oracledb.getConnection(credential);
      await conn.close();

      // restore password
      await dbaConn.changePassword(myUser, '', longPwd);

      credential = {
        user:             myUser,
        password:         longPwd,
        connectionString: dbConfig.connectString
      };

      conn = await oracledb.getConnection(credential);
      await conn.close();
      await dbaConn.close();
    }); // 161.12.4

    it('161.12.5 for DBA, the original password is ignored', async function() {
      const newlongPwd = "b".repeat(1024);

      const dbaConn = await oracledb.getConnection(DBA_config);
      await dbaConn.changePassword(myUser, 'foobar', newlongPwd);

      let credential = {
        user:             myUser,
        password:         longPwd,
        connectionString: dbConfig.connectString
      };

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        // ORA-01017: invalid username/password
        /ORA-01017:/
      );

      // verify with new password
      credential = {
        user:             myUser,
        password:         newlongPwd,
        connectionString: dbConfig.connectString
      };

      const conn = await oracledb.getConnection(credential);
      assert(conn);
      await conn.close();
      await dbaConn.changePassword(myUser, '', longPwd);
      await dbaConn.close();

    }); // 161.12.5

    it('161.12.6 Negative: basic case, wrong original password', async function() {
      const newlongPwd = "b".repeat(1024);
      let credential = {
        user:             myUser,
        password:         longPwd,
        connectionString: dbConfig.connectString
      };
      const conn = await oracledb.getConnection(credential);
      assert(conn);
      const wrongOne = 'foobar';

      await assert.rejects(
        async () => await conn.changePassword(myUser, wrongOne, newlongPwd),
        // ORA-28008: invalid old password
        /ORA-28008:/
      );

      await conn.close();

      credential = {
        user:             myUser,
        password:         newlongPwd,
        connectionString: dbConfig.connectString
      };

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        /ORA-01017/
      );// ORA-01017: invalid username/password

    }); // 161.12.6

    it('161.12.7 Negative: basic case. invalid parameter', async function() {
      const lpass = 123;
      const credential = {
        user:             myUser,
        password:         longPwd,
        connectionString: dbConfig.connectString
      };

      const conn = await oracledb.getConnection(credential);

      await assert.rejects(
        async () => await conn.changePassword(myUser, longPwd, lpass),
        /NJS-005: invalid value for parameter 3/
      );

      await conn.close();
    }); // 161.12.7

    it('161.12.8 Negative: basic case. invalid parameter with 1025 bytes', async function() {
      const newlongPwd = "a".repeat(1025);
      const credential = {
        user:             myUser,
        password:         longPwd,
        connectionString: dbConfig.connectString
      };

      const conn = await oracledb.getConnection(credential);

      await assert.rejects(
        async () => await conn.changePassword(myUser, longPwd, newlongPwd),
        // Error: ORA-28218: password length more than 1024 bytes'
        /ORA-28218:/
      );

      await conn.close();
    }); // 161.12.8

    it('161.12.9 Negative: non-DBA tries to change the password', async function() {
      try {
        const tUser = dbConfig.user + "_st";
        const newlongPwd = "b".repeat(1024);

        const dbaConn = await oracledb.getConnection(DBA_config);
        assert(dbaConn);
        let sql = "CREATE USER " + tUser + " IDENTIFIED BY " + longPwd;
        await dbaConn.execute(sql);
        sql = "GRANT CONNECT, CREATE SESSION to " + tUser;
        await dbaConn.execute(sql);

        let credential = {
          user:             tUser,
          password:         longPwd,
          connectionString: dbConfig.connectString
        };

        const tConn = await oracledb.getConnection(credential);

        await assert.rejects(
          async () => await tConn.changePassword(myUser, longPwd, newlongPwd),
          /ORA-01031:/
        );

        credential = {
          user:             myUser,
          password:         newlongPwd,
          connectionString: dbConfig.connectString
        };

        await assert.rejects(
          async () => await oracledb.getConnection(credential),
          // ORA-01017: invalid username/password
          /ORA-01017:/
        );

        await tConn.close();
        sql = "DROP USER " + tUser + " CASCADE";
        await dbaConn.execute(sql);
        await dbaConn.close();
      } catch (error) {
        assert.fail(error);
      }
    }); // 161.12.9

    it("161.12.10 Negative: invalid type of 'newPassword'", async function() {
      const wrongOne = 123;
      const credential = {
        user:             myUser,
        password:         longPwd,
        newPassword:      wrongOne,
        connectionString: dbConfig.connectString
      };

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        /NJS-007: invalid value for "newPassword" in parameter 1/
      );
    }); // 161.12.10

    it('161.12.11 sets "newPassword" to be an empty string. longer password unchanged', async function() {
      const dbaConn = await oracledb.getConnection(DBA_config);
      const sql = "alter user " + myUser + " password expire";
      await dbaConn.execute(sql);

      let credential = {
        user:             myUser,
        password:         longPwd,
        newPassword:      '',
        connectionString: dbConfig.connectString
      };

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        // ORA-28001: the password has expired
        /ORA-28001:/
      );

      credential = {
        user:             myUser,
        password:         longPwd,
        connectionString: dbConfig.connectString
      };

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        // ORA-28001: the password has expired
        /ORA-28001:/
      );
      await dbaConn.close();
    }); // 161.12.11
  });
});

/* Copyright (c) 2018, 2022, Oracle and/or its affiliates. */

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
 *   Test changing passords feature and connecting with an expired password.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbconfig = require('./dbconfig.js');

describe('161. changePassword.js', function() {

  var DBA_config;
  var dbaConn;
  var sql;
  const myUser = dbconfig.user + "_cpw";
  if (dbconfig.test.DBA_PRIVILEGE == true) {
    DBA_config = {
      user:          dbconfig.test.DBA_user,
      password:      dbconfig.test.DBA_password,
      connectString: dbconfig.connectString,
      privilege:     oracledb.SYSDBA
    };
  }

  before (async function() {
    if (!dbconfig.test.DBA_PRIVILEGE) this.skip();
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
    assert(dbaConn);
    await dbaConn.execute(sql);

    sql = "GRANT CREATE SESSION to " + myUser;
    await dbaConn.execute(sql);
    await dbaConn.close();
  }); // before

  after(async function() {
    if (dbconfig.test.DBA_PRIVILEGE) {
      sql = "DROP USER " + myUser + " CASCADE";
      dbaConn = await oracledb.getConnection(DBA_config);
      assert(dbaConn);
      await dbaConn.execute(sql);
      await dbaConn.close();
    }
  }); // after

  it('161.1 basic case', async function() {
    var conn;
    const tpass = 'secret';
    var credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbconfig.connectString
    };
    conn = await oracledb.getConnection(credential);
    assert(conn);
    // change password
    await conn.changePassword(myUser, myUser, tpass);
    await conn.close();

    // verify with new password
    credential = {
      user:             myUser,
      password:         tpass,
      connectionString: dbconfig.connectString
    };
    conn = await oracledb.getConnection(credential);
    assert(conn);

    // restore password
    await conn.changePassword(myUser, tpass, myUser);
    await conn.close();
  }); // 161.1

  it('161.2 pooled connection', async function() {
    var pool, conn;
    const tpass = 'secret';
    var credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbconfig.connectString
    };
    pool = await oracledb.createPool(credential);
    assert(pool);
    conn = await pool.getConnection();
    assert(conn);
    await conn.changePassword(myUser, myUser, tpass);
    await conn.close();
    // Still able to get connections
    conn = await pool.getConnection();
    assert(conn);
    await conn.close();
    await pool.close();
    // verify with old password
    pool = await oracledb.createPool(credential);

    await assert.rejects(
      async () => {
        await pool.getConnection();
      },
      /ORA-01017/
    );// ORA-01017: invalid username/password

    await pool.close();

    // verify with new password
    credential = {
      user:             myUser,
      password:         tpass,
      connectionString: dbconfig.connectString
    };
    pool = await oracledb.createPool(credential);
    conn = await pool.getConnection();
    assert(conn);
    await conn.close();
    await pool.close();
  }); // 161.2

  it('161.3 DBA changes password', async function() {
    var dbaConn, conn;
    const tpass = 'secret';

    dbaConn = await oracledb.getConnection(DBA_config);
    assert(dbaConn);
    await dbaConn.changePassword(myUser, '', tpass);
    var credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbconfig.connectString
    };

    await assert.rejects(
      async () => {
        await oracledb.getConnection(credential);
      },
      /ORA-01017/
    );// ORA-01017: invalid username/password

    // verify with changed password
    credential = {
      user:             myUser,
      password:         tpass,
      connectionString: dbconfig.connectString
    };
    conn = await oracledb.getConnection(credential);
    assert(conn);
    await conn.close();

    // restore password
    await dbaConn.changePassword(myUser, '', myUser);
    await dbaConn.close();
  }); // 161.3

  it('161.4 connects with an expired password', async function() {
    var dbaConn, conn;
    const tpass = 'secret';
    dbaConn = await oracledb.getConnection(DBA_config);
    assert(dbaConn);
    const sql = "alter user " + myUser + " password expire";
    await dbaConn.execute(sql);

    var credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbconfig.connectString
    };

    await assert.rejects(
      async () => {
        await oracledb.getConnection(credential);
      },
      /ORA-28001/
    );// ORA-28001: the password has expired

    credential = {
      user:             myUser,
      password:         myUser,
      newPassword:      tpass,
      connectionString: dbconfig.connectString
    };
    conn = await oracledb.getConnection(credential);
    await conn.close();

    // restore password
    await dbaConn.changePassword(myUser, '', myUser);

    credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbconfig.connectString
    };

    conn = await oracledb.getConnection(credential);
    await conn.close();
    await dbaConn.close();
  }); // 161.4

  it('161.5 for DBA, the original password is ignored', async function() {
    var dbaConn, conn;
    const tpass = 'secret';

    dbaConn = await oracledb.getConnection(DBA_config);
    assert(dbaConn);
    await dbaConn.changePassword(myUser, 'foobar', tpass);

    var credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbconfig.connectString
    };

    await assert.rejects(
      async () => {
        await oracledb.getConnection(credential);
      },
      /ORA-01017/
    );// ORA-01017: invalid username/password

    // verify with new password
    credential = {
      user:             myUser,
      password:         tpass,
      connectionString: dbconfig.connectString
    };

    conn = await oracledb.getConnection(credential);
    assert(conn);
    await conn.close();
    await dbaConn.changePassword(myUser, '', myUser);
    await dbaConn.close();

  }); // 161.5

  it('161.6 Negative: basic case, wrong original password', async function() {
    const tpass = 'secret';
    var credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbconfig.connectString
    };
    const conn = await oracledb.getConnection(credential);
    assert(conn);
    const wrongOne = 'foobar';

    await assert.rejects(
      async () => {
        await conn.changePassword(myUser, wrongOne, tpass);
      },
      /ORA-28008/
    );// ORA-28008: invalid old password

    await conn.close();

    credential = {
      user:             myUser,
      password:         tpass,
      connectionString: dbconfig.connectString
    };

    await assert.rejects(
      async () => {
        await oracledb.getConnection(credential);
      },
      /ORA-01017/
    );// ORA-01017: invalid username/password

  }); // 161.6

  it.skip('161.7 Negative: basic case. invalid parameter', async function() {
    var conn;
    const tpass = 123;
    const credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbconfig.connectString
    };

    conn = await oracledb.getConnection(credential);

    await assert.rejects(
      async () => {
        await conn.changePassword(myUser, myUser, tpass);
      },
      /NJS-005: invalid value for parameter 3/
    );

    await conn.close();
  }); // 161.7

  it('161.8 Negative: non-DBA tries to change the password', async function() {
    try {
      const tUser = dbconfig.user + "_st";
      var dbaConn, tConn;
      const tpass = 'secret';

      dbaConn = await oracledb.getConnection(DBA_config);
      assert(dbaConn);
      sql = "CREATE USER " + tUser + " IDENTIFIED BY " + tUser;
      await dbaConn.execute(sql);
      sql = "GRANT CREATE SESSION to " + tUser;
      await dbaConn.execute(sql);

      var credential = {
        user:             tUser,
        password:         tUser,
        connectionString: dbconfig.connectString
      };

      tConn = await oracledb.getConnection(credential);

      await assert.rejects(
        async () => {
          await tConn.changePassword(myUser, myUser, tpass);
        },
        /ORA-01031/
      );

      credential = {
        user:             myUser,
        password:         tpass,
        connectionString: dbconfig.connectString
      };

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /ORA-01017/
      );// ORA-01017: invalid username/password

      await tConn.close();
      sql = "DROP USER " + tUser + " CASCADE";
      await dbaConn.execute(sql);
      await dbaConn.close();
    } catch (error) {
      assert.fail(error);
    }
  }); // 161.8

  it("161.9 Negative: invalid type of 'newPassword'", async function() {
    const wrongOne = 123;
    const credential = {
      user:             myUser,
      password:         myUser,
      newPassword:      wrongOne,
      connectionString: dbconfig.connectString
    };

    await assert.rejects(
      async () => {
        await oracledb.getConnection(credential);
      },
      /NJS-007: invalid value for "newPassword" in parameter 1/
    );
  }); // 161.9

  it('161.10 sets "newPassword" to be an empty string. password unchanged', async function() {
    const dbaConn = await oracledb.getConnection(DBA_config);
    assert(dbaConn);
    sql = "alter user " + myUser + " password expire";
    await dbaConn.execute(sql);

    var credential = {
      user:             myUser,
      password:         myUser,
      newPassword:      '',
      connectionString: dbconfig.connectString
    };

    await assert.rejects(
      async () => {
        await oracledb.getConnection(credential);
      },
      /ORA-28001/
    );// ORA-28001: the password has expired

    credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbconfig.connectString
    };

    await assert.rejects(
      async () => {
        await oracledb.getConnection(credential);
      },
      /ORA-28001/
    );// ORA-28001: the password has expired
  }); // 161.10

});

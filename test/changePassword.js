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

  let DBA_config;
  let dbaConn;
  let sql;
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
    await dbaConn.execute(sql);

    sql = "GRANT CREATE SESSION to " + myUser;
    await dbaConn.execute(sql);
    await dbaConn.close();
  }); // before

  after(async function() {
    if (dbconfig.test.DBA_PRIVILEGE) {
      sql = "DROP USER " + myUser + " CASCADE";
      dbaConn = await oracledb.getConnection(DBA_config);
      await dbaConn.execute(sql);
      await dbaConn.close();
    }
  }); // after

  it('161.1 basic case', async function() {
    let conn;
    const tpass = 'secret';
    let credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbconfig.connectString
    };
    conn = await oracledb.getConnection(credential);
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

    // restore password
    await conn.changePassword(myUser, tpass, myUser);
    await conn.close();
  }); // 161.1

  it('161.2 pooled connection', async function() {
    let pool, conn;
    const tpass = 'secret';
    let credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbconfig.connectString
    };
    pool = await oracledb.createPool(credential);
    conn = await pool.getConnection();
    await conn.changePassword(myUser, myUser, tpass);
    await conn.close();
    // Still able to get connections
    conn = await pool.getConnection();
    await conn.close();
    await pool.close();
    // verify with old password
    pool = await oracledb.createPool(credential);

    await assert.rejects(
      async () => await pool.getConnection(),
      /ORA-01017:/
    );

    await pool.close();

    // verify with new password
    credential = {
      user:             myUser,
      password:         tpass,
      connectionString: dbconfig.connectString
    };
    pool = await oracledb.createPool(credential);
    conn = await pool.getConnection();
    await conn.close();
    await pool.close();
  }); // 161.2

  it('161.3 DBA changes password', async function() {
    const tpass = 'secret';
    const dbaConn = await oracledb.getConnection(DBA_config);
    await dbaConn.changePassword(myUser, '', tpass);
    let credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbconfig.connectString
    };

    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      /ORA-01017:/
    );

    // verify with changed password
    credential = {
      user:             myUser,
      password:         tpass,
      connectionString: dbconfig.connectString
    };
    const conn = await oracledb.getConnection(credential);
    await conn.close();

    // restore password
    await dbaConn.changePassword(myUser, '', myUser);
    await dbaConn.close();
  }); // 161.3

  it('161.4 connects with an expired password', async function() {
    const tpass = 'secret';
    const dbaConn = await oracledb.getConnection(DBA_config);
    const sql = "alter user " + myUser + " password expire";
    await dbaConn.execute(sql);

    let credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbconfig.connectString
    };

    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      /ORA-28001:/
    );

    credential = {
      user:             myUser,
      password:         myUser,
      newPassword:      tpass,
      connectionString: dbconfig.connectString
    };
    let conn = await oracledb.getConnection(credential);
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
    const tpass = 'secret';

    const dbaConn = await oracledb.getConnection(DBA_config);
    await dbaConn.changePassword(myUser, 'foobar', tpass);

    let credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbconfig.connectString
    };

    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      /ORA-01017:/
    );

    // verify with new password
    credential = {
      user:             myUser,
      password:         tpass,
      connectionString: dbconfig.connectString
    };

    const conn = await oracledb.getConnection(credential);
    await conn.close();
    await dbaConn.changePassword(myUser, '', myUser);
    await dbaConn.close();

  }); // 161.5

  it('161.6 Negative: basic case, wrong original password', async function() {
    const tpass = 'secret';
    let credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbconfig.connectString
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
      connectionString: dbconfig.connectString
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
      connectionString: dbconfig.connectString
    };

    const conn = await oracledb.getConnection(credential);

    await assert.rejects(
      async () => await conn.changePassword(myUser, myUser, tpass),
      /NJS-005:/
    );

    await conn.close();
  }); // 161.7

  it('161.8 Negative: non-DBA tries to change the password', async function() {
    const tUser = dbconfig.user + "_st";
    const tpass = 'secret';

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
      connectionString: dbconfig.connectString
    };

    const tConn = await oracledb.getConnection(credential);

    await assert.rejects(
      async () => await tConn.changePassword(myUser, myUser, tpass),
      /ORA-01031:/
    );

    credential = {
      user:             myUser,
      password:         tpass,
      connectionString: dbconfig.connectString
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
      connectionString: dbconfig.connectString
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
      connectionString: dbconfig.connectString
    };

    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      /ORA-28001:/
    );

    credential = {
      user:             myUser,
      password:         myUser,
      connectionString: dbconfig.connectString
    };

    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      /ORA-28001:/
    );
  }); // 161.10

});

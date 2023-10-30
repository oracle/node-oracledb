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
 *   160. editionTest.js
 *
 * DESCRIPTION
 *   Test Edition Based Redefinition.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

const timestamp = +new Date();
const edition1 = "edition_1_" + timestamp;
const edition2 = "edition_2_" + timestamp;
const schemaEdition = "schema_" + timestamp;

function generateRandomPassword(length) {
  let result = "";
  const choices = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < length; i++) {
    result += choices.charAt(Math.floor(Math.random() * choices.length));
  }
  return result;
}

describe('160. editionTest.js', function() {

  let dbaConn;
  const nodbSchemaEditionPassword = generateRandomPassword(6);
  const editionList = [];

  const getEdition = async function(connection) {
    const sql = "begin nodb_proc_edition(:out); end;";
    const binds = { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } };
    const result = await connection.execute(sql, binds);
    return result.outBinds.out;
  };

  before(async function() {

    let isRunnable = Boolean(!oracledb.thin && dbConfig.test.DBA_PRIVILEGE);
    if (isRunnable) {
      const connection = await oracledb.getConnection(dbConfig);
      if (connection.oracleServerVersion < 1202000100) {
        isRunnable = false;
      }
      await connection.close();
    }

    if (!isRunnable) {
      this.skip();
    }

    //SYSDBA connection
    let credential = {
      user: dbConfig.test.DBA_user,
      password: dbConfig.test.DBA_password,
      connectionString: dbConfig.connectString,
      privilege: oracledb.SYSDBA
    };
    dbaConn = await oracledb.getConnection(credential);

    //Create the editions
    let sql = "BEGIN \n" +
              "    DECLARE \n" +
              "        e_edition_missing EXCEPTION; \n" +
              "        PRAGMA EXCEPTION_INIT(e_edition_missing, -38802); \n" +
              "    BEGIN \n" +
              `        EXECUTE IMMEDIATE('DROP EDITION ${edition1} CASCADE'); \n` +
              "    EXCEPTION \n" +
              "        WHEN e_edition_missing \n" +
              "        THEN NULL; \n" +
              "    END; \n" +
              "    EXECUTE IMMEDIATE (' \n" +
              `        CREATE EDITION ${edition1}\n` +
              "    '); \n" +
              "END; ";
    await dbaConn.execute(sql);
    sql = "BEGIN \n" +
          "    DECLARE \n" +
          "        e_edition_missing EXCEPTION; \n" +
          "        PRAGMA EXCEPTION_INIT(e_edition_missing, -38802); \n" +
          "    BEGIN \n" +
          `        EXECUTE IMMEDIATE('DROP EDITION ${edition2} CASCADE'); \n` +
          "    EXCEPTION \n" +
          "        WHEN e_edition_missing \n" +
          "        THEN NULL; \n" +
          "    END; \n" +
          "    EXECUTE IMMEDIATE (' \n" +
          `        CREATE EDITION ${edition2}\n` +
          "    '); \n" +
          "END; ";
    await dbaConn.execute(sql);

    sql = `SELECT EDITION_NAME, PARENT_EDITION_NAME FROM ALL_EDITIONS`;
    const result = await dbaConn.execute(sql);
    if (result && result.rows) {
      let parentEdition = "ORA$BASE";
      for (let i = 1; i < result.rows.length; i++) {
        for (let j = 0; j < result.rows.length; j++) {
          if (result.rows[j][1] === parentEdition) {
            editionList.push(result.rows[j][0]);
            parentEdition = result.rows[j][0];
            break;
          }
        }
      }
    }

    // Create user
    sql = "BEGIN \n" +
          "    DECLARE \n" +
          "        e_user_missing EXCEPTION; \n" +
          "        PRAGMA EXCEPTION_INIT(e_user_missing, -01918); \n" +
          "    BEGIN \n" +
          `        EXECUTE IMMEDIATE('DROP USER ${schemaEdition} CASCADE'); \n` +
          "    EXCEPTION \n" +
          "        WHEN e_user_missing \n" +
          "        THEN NULL; \n" +
          "    END; \n" +
          "    EXECUTE IMMEDIATE (' \n" +
          `        CREATE USER ${schemaEdition} IDENTIFIED BY ${nodbSchemaEditionPassword}\n` +
          "    '); \n" +
          "END; ";
    await dbaConn.execute(sql);
    sql = `GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, \
                  CREATE VIEW, CREATE PROCEDURE, CREATE TRIGGER to ${schemaEdition}`;
    await dbaConn.execute(sql);

    // Allow editions for user
    sql = `alter user ${schemaEdition} enable editions`;
    await dbaConn.execute(sql);
    sql = `grant use on edition ${edition1} to ${schemaEdition}`;
    await dbaConn.execute(sql);
    sql = `grant use on edition ${edition2} to ${schemaEdition}`;
    await dbaConn.execute(sql);

    // Get user connection
    credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString
    };
    const conn = await oracledb.getConnection(credential);

    // Create procedure (without any editions)
    let proc = "CREATE OR REPLACE PROCEDURE nodb_proc_edition (str OUT STRING) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    str := 'E0'; \n" +
               "END nodb_proc_edition;";
    await conn.execute(proc);

    // Change to Edition e1
    sql = `alter session set edition = ${edition1}`;
    await conn.execute(sql);

    // Create procedure in context of Edition E1
    proc = "CREATE OR REPLACE PROCEDURE nodb_proc_edition (str OUT STRING) \n" +
           "AS \n" +
           "BEGIN \n" +
           "    str := 'E1'; \n" +
           "END nodb_proc_edition;";
    await conn.execute(proc);

    // Change to Edition e2
    sql = `alter session set edition = ${edition2}`;
    await conn.execute(sql);

    // Create procedure in context of Edition E2
    proc = "CREATE OR REPLACE PROCEDURE nodb_proc_edition (str OUT STRING) \n" +
           "AS \n" +
           "BEGIN \n" +
           "    str := 'E2'; \n" +
           "END nodb_proc_edition;";
    await conn.execute(proc);

    //Close the connection
    await conn.close();

  }); // before()

  after(async function() {
    if (dbaConn) {
      try {
        for (let i = editionList.length - 1; i >= 0 ; i--) {
          await dbaConn.execute(`DROP EDITION ${editionList[i]} CASCADE`);
        }
      } catch (err) {
        // ORA-38810: Implementation restriction: cannot drop edition that has a parent and a child
        assert.match(err.message, /^ORA-38810/);
      } finally {
        await dbaConn.execute(`DROP USER ${schemaEdition} CASCADE`);
        await dbaConn.close();
      }
    }

  }); // after()

  it('160.1 Default. No edition. Direct connection.', async function() {
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString
    };
    const connection = await oracledb.getConnection(credential);
    assert.strictEqual(await getEdition(connection), 'E0');
    await connection.close();
  }); // 160.1

  it('160.2 Default. No edition. Pooled connection.', async function() {
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString
    };
    const pool = await oracledb.createPool(credential);
    const connection = await pool.getConnection();
    assert.strictEqual(await getEdition(connection), 'E0');
    await connection.close();
    await pool.close();
  }); // 160.2

  it('160.3 Direct connection. Set edition at getting connection.', async function() {
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString,
      edition: edition2
    };
    const connection = await oracledb.getConnection(credential);
    assert.strictEqual(await getEdition(connection), 'E2');
    await connection.close();
  }); // 160.3

  it('160.4 Pooled connection. Set edition at creating pool.', async function() {
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString,
      edition: edition1
    };
    const pool = await oracledb.createPool(credential);
    const connection = await pool.getConnection();
    assert.strictEqual(await getEdition(connection), 'E1');
    await connection.close();
    await pool.close();
  }); // 160.4

  it('160.5 Direct connection. Change session edition.', async function() {
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString,
      edition: edition2
    };
    const connection = await oracledb.getConnection(credential);

    // Change to Edition e1
    const sql = `alter session set edition = ${edition1}`;
    await connection.execute(sql);
    assert.strictEqual(await getEdition(connection), 'E1');
    await connection.close();
  }); // 160.5

  it('160.6 Pooled connection. Change session edition.', async function() {
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString,
      edition: edition1
    };
    const pool = await oracledb.createPool(credential);
    const connection = await pool.getConnection();

    // Change to Edition default
    const sql = "alter session set edition = ora$base";
    await connection.execute(sql);

    assert.strictEqual(await getEdition(connection), 'E0');

    await connection.close();
    await pool.close();
  }); // 160.6

  it('160.7 sets edition globally. Direct connection.', async function() {
    oracledb.edition = edition2;
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString
    };
    const connection = await oracledb.getConnection(credential);

    assert.strictEqual(await getEdition(connection), 'E2');

    oracledb.edition = '';

    // This global property only takes effect at connection creation.
    assert.strictEqual(await getEdition(connection), 'E2');

    await connection.close();
  }); // 160.7

  it('160.8 sets edition globally. Pooled connection.', async function() {
    oracledb.edition = edition2;
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString
    };
    const pool = await oracledb.createPool(credential);
    const connection = await pool.getConnection();

    assert.strictEqual(await getEdition(connection), 'E2');

    oracledb.edition = '';
    assert.strictEqual(await getEdition(connection), 'E2');

    const conn2 = await pool.getConnection();
    assert.strictEqual(await getEdition(conn2), 'E2');
    await conn2.close();

    await connection.close();
    await pool.close();
  }); // 160.8

  it('160.9 Negative - sets nonexistent edition globally', async function() {
    oracledb.edition = 'nonexistence';
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString
    };
    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      // ORA-38802: edition does not exist
      /ORA-38802:/
    );
    oracledb.edition = '';
  }); // 160.9

  it('160.10 Direct connection. Set nonexistent edition.', async function() {
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString,
      edition: "nonexistence"
    };
    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      // ORA-38802: edition does not exist
      /ORA-38802:/
    );
  }); // 160.10

  it('160.11 Pooled connection. Set nonexistent edition.', async function() {
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString,
      edition: "nonexistence"
    };
    const pool = await oracledb.createPool(credential);
    await assert.rejects(
      async () => await pool.getConnection(),
      // ORA-38802: edition does not exist
      /ORA-38802:/
    );
    await pool.close();
  }); // 160.11

  it('160.12 sets to ora$base with direct connection', async function() {
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString,
      edition: "ora$base"
    };
    const connection = await oracledb.getConnection(credential);
    assert.strictEqual(await getEdition(connection), 'E0');
    await connection.close();
  }); // 160.12

  it('160.13 resets to ora$base in direct connection', async function() {
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString,
      edition: edition2
    };
    const connection = await oracledb.getConnection(credential);

    // Change to Edition e0
    const sql = "alter session set edition = ora$base";
    await connection.execute(sql);

    assert.strictEqual(await getEdition(connection), 'E0');
    await connection.close();
  }); // 160.13

  it('160.14 sets to ora$base with pooled connection', async function() {
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString,
      edition: "ora$base"
    };
    const pool = await oracledb.createPool(credential);
    const connection = await pool.getConnection();
    assert.strictEqual(await getEdition(connection), 'E0');

    await connection.close();
    await pool.close();

  }); // 160.14

  it('160.15 sets to ora$base globally', async function() {
    oracledb.edition = 'ora$base';
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString
    };
    const connection = await oracledb.getConnection(credential);
    assert.strictEqual(await getEdition(connection), 'E0');

    // This global property only takes effect at connection creation.
    oracledb.edition = edition2;
    assert.strictEqual(await getEdition(connection), 'E0');

    await connection.close();

  }); // 160.15

  it('160.16 overrides the global setting. Direct connection', async function() {
    oracledb.edition = edition1;
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString,
      edition: edition2
    };
    const connection = await oracledb.getConnection(credential);
    assert.strictEqual(await getEdition(connection), 'E2');
    oracledb.edition = '';
    await connection.close();
  }); // 160.16

  it('160.17 sets to empty string. Direct connection.', async function() {
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString,
      edition: ""
    };
    const connection = await oracledb.getConnection(credential);
    assert.strictEqual(await getEdition(connection), 'E0');
    await connection.close();
  }); // 160.17

  it('160.18 Negative - invalid type. Direct connection.', async function() {
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString,
      edition: 123
    };
    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      /NJS-007:/
    );
  }); // 160.18

  it('160.19 Negative - invalid type. Pooled connection.', async function() {
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString,
      edition: 123
    };
    await assert.rejects(
      async () => await oracledb.createPool(credential),
      /NJS-007:/
    );
  }); // 160.19

  it('160.20 sets ORA_EDITION. Direct connection.', async function() {
    process.env.ORA_EDITION = edition1;
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString
    };
    const connection = await oracledb.getConnection(credential);
    assert.strictEqual(await getEdition(connection), 'E1');
    await connection.close();
    delete process.env.ORA_EDITION;
  }); // 160.20

  it('160.21 sets ORA_EDITION. Pooled connection.', async function() {
    process.env.ORA_EDITION = edition2;
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString
    };
    const pool = await oracledb.createPool(credential);
    const connection = await pool.getConnection();
    assert.strictEqual(await getEdition(connection), 'E2');
    await connection.close();
    await pool.close();
    delete process.env.ORA_EDITION;
  }); // 160.21

  it('160.22 sets ORA_EDITION. Direct connection. Set edition at getting connection.', async function() {
    process.env.ORA_EDITION = edition1;
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString,
      edition: edition2
    };
    const connection = await oracledb.getConnection(credential);
    assert.strictEqual(await getEdition(connection), 'E2');
    await connection.close();
    delete process.env.ORA_EDITION;
  }); // 160.22

  it('160.23 sets ORA_EDITION. Pooled connection. Set edition at creating pool.', async function() {
    process.env.ORA_EDITION = edition2;
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString,
      edition: edition1
    };
    const pool = await oracledb.createPool(credential);
    const connection = await pool.getConnection();
    assert.strictEqual(await getEdition(connection), 'E1');
    await connection.close();
    await pool.close();
    delete process.env.ORA_EDITION;
  }); // 160.23

  it('160.24 Negative - Sets ORA_EDITION with nonexistent value. Direct connection.', async function() {
    process.env.ORA_EDITION = 'nonexistence';
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString
    };
    await assert.rejects(
      async () => await oracledb.getConnection(credential),
      // ORA-38802: edition does not exist
      /ORA-38802:/
    );
    delete process.env.ORA_EDITION;
  }); // 160.24

  it('160.25 Negative - Sets ORA_EDITION with nonexistent value. Pooled connection.', async function() {
    process.env.ORA_EDITION = 'nonexistence';
    const credential = {
      user: schemaEdition,
      password: nodbSchemaEditionPassword,
      connectionString: dbConfig.connectString
    };
    const pool = await oracledb.createPool(credential);
    await assert.rejects(
      async () => await pool.getConnection(),
      // ORA-38802: edition does not exist
      /ORA-38802:/
    );
    await pool.close();
    delete process.env.ORA_EDITION;
  }); // 160.25

});

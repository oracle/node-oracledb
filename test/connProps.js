/* Copyright (c) 2019, 2025, Oracle and/or its affiliates. */

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
 *   193. connProps.js
 *
 * DESCRIPTION
 *   Test the "connection.clientInfo" and "connection.dbOp" properties.
 *   These tests requires DBA privilege.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

async function getGlobalName(connection) {
  const globalNameQuery = "SELECT * FROM global_name";
  const globalNameResult = await connection.execute(globalNameQuery);
  return globalNameResult.rows[0][0];
}

describe('193. connProps.js', function() {

  let isRunnable = false;
  let dbaConnection;

  before(async function() {
    if (dbConfig.test.DBA_PRIVILEGE) {
      isRunnable = true;
    }

    if (!isRunnable) {
      this.skip();
    } else {
      const dbaConfig = {
        user: dbConfig.test.DBA_user,
        password: dbConfig.test.DBA_password,
        connectString: dbConfig.connectString,
        privilege: oracledb.SYSDBA,
      };
      dbaConnection = await oracledb.getConnection(dbaConfig);
      const conn = await oracledb.getConnection(dbConfig);

      const user = await testsUtil.getUser(conn);
      const sql = `GRANT SELECT ANY DICTIONARY TO ${user}`;
      await dbaConnection.execute(sql);

      await conn.close();

    }
  }); // before()

  after (async function() {
    if (dbaConnection) {
      await dbaConnection.close();
    }
  });

  it('193.1 the default values of clientInfo and dbOp are null', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    assert.strictEqual(conn.clientInfo, null);
    assert.strictEqual(conn.dbOp, null);
    await conn.close();
  }); // 193.1

  it('193.2 clientInfo and dbOp are write-only properties', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    conn.clientInfo = 'nodb_193_2';
    conn.dbOp = 'nodb_193_2';
    assert.strictEqual(conn.clientInfo, null);
    assert.strictEqual(conn.dbOp, null);
    await conn.close();
  }); // 193.2

  it('193.3 check the results of setter()', async () => {
    const conn = await oracledb.getConnection(dbConfig);

    const t_clientInfo = "My demo application";
    const t_dbOp       = "Billing";

    conn.clientInfo = t_clientInfo;
    conn.dbOp       = t_dbOp;

    const sqlOne = `SELECT sys_context('userenv', 'client_info') FROM dual`;
    let result = await conn.execute(sqlOne);
    assert.strictEqual(result.rows[0][0], t_clientInfo);

    const sqlTwo = `SELECT dbop_name FROM v$sql_monitor \
           WHERE sid = sys_context('userenv', 'sid') \
           AND status = 'EXECUTING'`;
    result = await conn.execute(sqlTwo);
    assert.strictEqual(result.rows[0][0], t_dbOp);

    // Change the values and check quried results again
    const k_clientInfo = "Demo Two";
    const k_dbOp       = "Billing Two";

    conn.clientInfo = k_clientInfo;
    conn.dbOp       = k_dbOp;

    result = await conn.execute(sqlOne);
    assert.strictEqual(result.rows[0][0], k_clientInfo);

    result = await conn.execute(sqlTwo);
    assert.strictEqual(result.rows[0][0], k_dbOp);

    await conn.close();
  }); // 193.3

  it('193.4 Negative - invalid values', async () => {
    const conn = await oracledb.getConnection(dbConfig);

    // Numeric values
    assert.throws(
      () => {
        conn.clientInfo = 3;
      },
      /NJS-004:/
    );

    assert.throws(
      () => {
        conn.dbOp = 4;
      },
      /NJS-004:/
    );

    // NaN
    assert.throws(
      () => {
        conn.clientInfo = NaN;
      },
      /NJS-004:/
    );

    assert.throws(
      () => {
        conn.dbOp = NaN;
      },
      /NJS-004:/
    );

    // undefined
    assert.throws(
      () => {
        conn.clientInfo = undefined;
      },
      /NJS-004:/
    );

    assert.throws(
      () => {
        conn.dbOp = undefined;
      },
      /NJS-004:/
    );

    await conn.close();
  }); // 193.4

  it('193.5 Oracle Database service name associated with the connection', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const query = "SELECT upper(sys_context('userenv', 'service_name')) FROM DUAL";
    const result = await conn.execute(query);
    assert.deepStrictEqual(result.rows[0][0], conn.serviceName.toUpperCase());
    await conn.close();
  }); // 193.5

  it('193.6 Oracle Database dbname associated with the connection', async () => {
    const query = "SELECT upper(NAME) FROM v$database";

    const conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(query);
    assert.deepStrictEqual(result.rows[0][0], conn.dbName.toUpperCase());
    await conn.close();
  }); // 193.6

  it('193.7 Oracle Database db domain associated with the connection', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const query = "SELECT upper(VALUE) FROM v$parameter WHERE name='db_domain'";
    const result = await conn.execute(query);
    if (result.rows[0][0]) {
      assert.deepStrictEqual(result.rows[0][0], conn.dbDomain.toUpperCase());
    } else  {
      assert.deepStrictEqual(conn.dbDomain, '');
    }
    await conn.close();
  }); // 193.7

  it('193.8 maximum cursors that can be opened on a connection', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const query = "SELECT value FROM v$parameter WHERE name='open_cursors'";
    const result = await conn.execute(query);
    assert.deepStrictEqual(Number(result.rows[0][0]), conn.maxOpenCursors);
    await conn.close();
  }); // 193.8

  it('193.9 transactionInProgress = false on a connection for query', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const query = "SELECT * FROM DUAL";
    await conn.execute(query);
    assert.strictEqual(conn.transactionInProgress, false);
    await conn.close();
  }); // 193.9

  it('193.10 transactionInProgress = true on a connection', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const TABLE = 'nodb_emp';
    const createSql = `CREATE TABLE ${TABLE} (id number)`;
    assert.strictEqual(conn.transactionInProgress, false);
    await testsUtil.createTable(conn, TABLE, createSql);
    assert.strictEqual(conn.transactionInProgress, false);
    const sql = `INSERT INTO ${TABLE} VALUES(1)`;
    await conn.execute(sql);
    assert.strictEqual(conn.transactionInProgress, true);
    await conn.commit();
    assert.strictEqual(conn.transactionInProgress, false);
    await conn.execute(`DROP TABLE ${TABLE} PURGE`);
    await conn.close();
  }); // 193.10

  it('193.11 maximum identifier length', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    if (conn.maxIdentifierLength)
      assert.strictEqual(typeof conn.maxIdentifierLength, "number");
    await conn.close();
  }); // 193.11

  it('193.12 Oracle Database pdbname associated with the connection', async function() {
    const conn = await oracledb.getConnection(dbConfig);

    if (conn.oracleServerVersion < 1202000000) {
      await conn.close();
      this.skip();
    }

    let expectedPdbName;
    let actualPdbName = conn.pdbName;

    if (!await testsUtil.isMultiTenantConfig(conn)) {
      expectedPdbName = await getGlobalName(conn);
    } else {
      const conNameQuery = "SELECT SYS_CONTEXT('USERENV', 'CON_NAME') FROM dual";
      const conNameResult = await conn.execute(conNameQuery);
      expectedPdbName = conNameResult.rows[0][0];
      actualPdbName = actualPdbName.split('.')[0];
    }

    assert.deepStrictEqual(expectedPdbName.toUpperCase(), actualPdbName.toUpperCase());
    await conn.close();
  }); // 193.12

  it('193.13 Oracle Database DB_UNIQUE_NAME associated with the connection', async function() {
    if (dbConfig.test.mode === 'thick') this.skip();

    if (!await testsUtil.checkPrerequisites()) {
      this.skip();
    }

    const conn = await oracledb.getConnection(dbConfig);
    const query = `SELECT upper(value) FROM v$parameter WHERE name = 'db_unique_name'`;
    const result = await conn.execute(query);

    // Remove domain name from the pdbName returned.
    assert.deepStrictEqual(result.rows[0][0], conn.dbUniqueName.toUpperCase());
    await conn.close();
  }); // 193.13

  it('193.14 Oracle Database pdbname changed dynamically for a connection', async function() {
    const conn = await oracledb.getConnection(dbConfig);

    if (!await testsUtil.isMultiTenantConfig(conn) || conn.oracleServerVersion < 1202000000) {
      // skip test for DB versions 12.1 and non-CDB based.
      await conn.close();
      this.skip();
    }

    // check PDBName with DBA connection.
    let query = "SELECT SYS_CONTEXT('USERENV', 'CON_NAME') FROM dual";
    let result = await dbaConnection.execute(query);
    let actualPdbName = dbaConnection.pdbName.split('.')[0].toUpperCase();
    assert.deepStrictEqual(result.rows[0][0], actualPdbName);

    // change to root container
    query = "ALTER SESSION SET CONTAINER = CDB$ROOT;";
    result = await dbaConnection.execute(query);
    if (oracledb.thin) {
      query = "SELECT SYS_CONTEXT('USERENV', 'CON_NAME') FROM dual";
      result = await dbaConnection.execute(query);
      actualPdbName = dbaConnection.pdbName.split(".")[0].toUpperCase();
      assert.deepStrictEqual(result.rows[0][0], actualPdbName);
    } else {
      // For CDB$ROOT, pdbname is coming from the database property GLOBAL_NAME,
      // which is stored in the data dictionary.
      const expectedPdbName = await getGlobalName(dbaConnection);
      assert.deepStrictEqual(dbaConnection.pdbName, expectedPdbName);
    }

    // change to container pdb1
    if (dbConfig.test.NODE_ORACLEDB_PDB1) {
      // change the container
      query = `ALTER SESSION SET CONTAINER = ${dbConfig.test.NODE_ORACLEDB_PDB1}`;
      await dbaConnection.execute(query);
      query = "SELECT SYS_CONTEXT('USERENV', 'CON_NAME') FROM dual";
      result = await dbaConnection.execute(query);
      actualPdbName = dbaConnection.pdbName.split(".")[0].toUpperCase();
      assert.deepStrictEqual(result.rows[0][0], actualPdbName);
    }

    // change to container pdb2
    if (dbConfig.test.NODE_ORACLEDB_PDB2) {
      query = `ALTER SESSION SET CONTAINER = ${dbConfig.test.NODE_ORACLEDB_PDB2}`;
      await dbaConnection.execute(query);
      query = "SELECT SYS_CONTEXT('USERENV', 'CON_NAME') FROM dual";
      result = await dbaConnection.execute(query);
      actualPdbName = dbaConnection.pdbName.split(".")[0].toUpperCase();
      assert.deepStrictEqual(result.rows[0][0], actualPdbName);
    }

    await conn.close();
  }); // 193.14

});

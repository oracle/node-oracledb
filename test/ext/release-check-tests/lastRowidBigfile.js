/* Copyright (c) 2026, Oracle and/or its affiliates. */

/*****************************************************************************/
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0.
//
/*****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('../../dbconfig.js');

describe('lastRowid BIGFILE tablespace', function() {
  let conn;
  let dbaConn;
  let tableCreated = false;
  let tablespaceCreated = false;
  const suffix = String(process.pid).slice(-6);
  const tableName = `NODB_LASTROWID_1787_${suffix}`;
  const tablespaceName = `NODB_LRID_TS_1787_${suffix}`;

  function dbaConfig() {
    return {
      user: dbConfig.test.DBA_user,
      password: dbConfig.test.DBA_password,
      connectString: dbConfig.connectString,
      privilege: oracledb.SYSDBA
    };
  }

  before(async function() {
    if (!dbConfig.test.DBA_PRIVILEGE) this.skip();

    conn = await oracledb.getConnection(dbConfig);
    dbaConn = await oracledb.getConnection(dbaConfig());

    const parameterResult = await dbaConn.execute(
      `SELECT value FROM v$parameter WHERE name = 'db_create_file_dest'`
    );
    let datafileClause;
    if (parameterResult.rows[0][0]) {
      datafileClause = 'DATAFILE SIZE 10M AUTOEXTEND OFF';
    } else {
      const fileResult = await dbaConn.execute(
        `SELECT file_name FROM dba_data_files WHERE rownum = 1`
      );
      const fileName = fileResult.rows[0]?.[0];
      const separator = fileName?.lastIndexOf('/');
      if (!fileName || separator < 0) {
        throw new Error(
          'Set DB_CREATE_FILE_DEST or use a database with filesystem datafiles'
        );
      }
      const datafileName = `${fileName.slice(0, separator + 1)}${tablespaceName}.dbf`;
      datafileClause = `DATAFILE '${datafileName.replace(/'/g, "''")}' SIZE 10M AUTOEXTEND OFF`;
    }

    await dbaConn.execute(
      `CREATE BIGFILE TABLESPACE ${tablespaceName} ${datafileClause}`
    );
    tablespaceCreated = true;

    await dbaConn.execute(
      `ALTER USER ${dbConfig.user.toUpperCase()}
       QUOTA UNLIMITED ON ${tablespaceName}`
    );
    await conn.execute(`CREATE TABLE ${tableName} (
      id NUMBER(9) NOT NULL,
      value VARCHAR2(100) NOT NULL
    ) TABLESPACE ${tablespaceName}`);
    tableCreated = true;
  });

  after(async function() {
    if (conn && tableCreated) {
      await conn.execute(`DROP TABLE ${tableName} PURGE`);
    }
    if (dbaConn && tablespaceCreated) {
      await dbaConn.execute(
        `DROP TABLESPACE ${tablespaceName} INCLUDING CONTENTS AND DATAFILES`
      );
    }
    if (conn) await conn.close();
    if (dbaConn) await dbaConn.close();
  });

  it('returns a usable ROWID for DML in a BIGFILE tablespace', async function() {
    const row1 = [1, 'First'];
    const row2 = [2, 'Second'];

    let sql = `INSERT INTO ${tableName} VALUES (:1, :2)`;
    let result = await conn.execute(sql, row1);
    assert(result.lastRowid);
    assert.strictEqual(result.rowsAffected, 1);
    const rowid1 = result.lastRowid;

    result = await conn.execute(sql, row2);
    assert(result.lastRowid);
    assert.strictEqual(result.rowsAffected, 1);
    const rowid2 = result.lastRowid;

    // verify both returned ROWIDs are usable
    sql = `SELECT * FROM ${tableName} WHERE rowid = :1`;
    result = await conn.execute(sql, [rowid1]);
    assert.deepStrictEqual(result.rows[0], row1);
    result = await conn.execute(sql, [rowid2]);
    assert.deepStrictEqual(result.rows[0], row2);

    result = await conn.execute(
      `UPDATE ${tableName} SET value = value || ' (Modified)'`
    );

    result = await conn.execute(sql, [result.lastRowid]);
    assert.deepStrictEqual(result.rows[0], [2, 'Second (Modified)']);

    result = await conn.execute(`DELETE FROM ${tableName}`);
    assert(result.lastRowid);
    assert.strictEqual(result.rowsAffected, 2);

    result = await conn.execute(`DELETE FROM ${tableName}`);
    assert.strictEqual(result.lastRowid, undefined);
  });
});

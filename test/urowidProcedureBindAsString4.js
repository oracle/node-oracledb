/* Copyright (c) 2017, 2023, Oracle and/or its affiliates. */

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
 *   144. urowidProcedureBindAsString4.js
 *
 * DESCRIPTION
 *   Testing UROWID(> 200 bytes) plsql procedure bind in as String.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const sql      = require('./sqlClone.js');
const random   = require('./random.js');
const testsUtil = require('./testsUtil.js');

describe('144. urowidProcedureBindAsString4.js', function() {
  let connection = null;
  const tableName_indexed = "nodb_urowid_indexed_proc";
  const tableName_normal = "nodb_urowid_normal_proc";
  let insertID = 1;

  const table_indexed = "BEGIN \n" +
                      "    DECLARE \n" +
                      "        e_table_missing EXCEPTION; \n" +
                      "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                      "    BEGIN \n" +
                      "        EXECUTE IMMEDIATE ('DROP TABLE " + tableName_indexed + " PURGE' ); \n" +
                      "    EXCEPTION \n" +
                      "        WHEN e_table_missing \n" +
                      "        THEN NULL; \n" +
                      "    END; \n" +
                      "    EXECUTE IMMEDIATE ( ' \n" +
                      "        CREATE TABLE " + tableName_indexed + " ( \n" +
                      "            c1    NUMBER, \n" +
                      "            c2    VARCHAR2(3125), \n" +
                      "            primary key(c1, c2) \n" +
                      "        ) organization index \n" +
                      "    '); \n" +
                      "END;  ";

  const table_normal = "BEGIN \n" +
                     "    DECLARE \n" +
                     "        e_table_missing EXCEPTION; \n" +
                     "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                     "    BEGIN \n" +
                     "        EXECUTE IMMEDIATE ('DROP TABLE " + tableName_normal + " PURGE' ); \n" +
                     "    EXCEPTION \n" +
                     "        WHEN e_table_missing \n" +
                     "        THEN NULL; \n" +
                     "    END; \n" +
                     "    EXECUTE IMMEDIATE ( ' \n" +
                     "        CREATE TABLE " + tableName_normal + " ( \n" +
                     "            ID       NUMBER, \n" +
                     "            content  UROWID(4000) \n" +
                     "        ) \n" +
                     "    '); \n" +
                     "END;  ";

  const drop_table_indexed = "DROP TABLE " + tableName_indexed + " PURGE";
  const drop_table_normal = "DROP TABLE " + tableName_normal + " PURGE";

  before('get connection and create table', async function() {
    connection = await oracledb.getConnection(dbConfig);
    await sql.executeSql(connection, table_indexed, {}, {});
    await sql.executeSql(connection, table_normal, {}, {});
  });

  after('release connection', async function() {
    await sql.executeSql(connection, drop_table_indexed, {}, {});
    await sql.executeSql(connection, drop_table_normal, {}, {});
    await connection.close();
  });

  beforeEach(function() {
    insertID++;
  });

  describe('144.1 PROCEDURE BIND_IN as UROWID', function() {
    const proc_create = "CREATE OR REPLACE PROCEDURE nodb_urowid_bind_in_1441 (id IN NUMBER, content IN UROWID)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName_normal + " (id, content) values (id, content); \n" +
                      "END nodb_urowid_bind_in_1441; ";
    const proc_execute = "BEGIN nodb_urowid_bind_in_1441 (:i, :c); END;";
    const proc_drop = "DROP PROCEDURE nodb_urowid_bind_in_1441";

    before('create procedure', async function() {
      await sql.executeSql(connection, proc_create, {}, {});
    });

    after('drop procedure', async function() {
      await sql.executeSql(connection, proc_drop, {}, {});
    });

    it('144.1.1 urowid length > 500', async function() {
      await procedureBindIn(proc_execute, 500);
    });

    it('144.1.2 urowid length > 1000', async function() {
      await procedureBindIn(proc_execute, 1000);
    });

    it('144.1.3 urowid length > 2000', async function() {
      await procedureBindIn(proc_execute, 2000);
    });

  });

  describe('144.2 PROCEDURE BIND_IN as string', function() {
    const proc_create = "CREATE OR REPLACE PROCEDURE nodb_urowid_bind_in_1442 (id IN NUMBER, content IN VARCHAR2)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName_normal + " (id, content) values (id, content); \n" +
                      "END nodb_urowid_bind_in_1442; ";
    const proc_execute = "BEGIN nodb_urowid_bind_in_1442 (:i, :c); END;";
    const proc_drop = "DROP PROCEDURE nodb_urowid_bind_in_1442";

    before('create procedure', async function() {
      await sql.executeSql(connection, proc_create, {}, {});
    });

    after('drop procedure', async function() {
      await sql.executeSql(connection, proc_drop, {}, {});
    });

    it('144.2.1 urowid length > 500', async function() {
      await procedureBindIn(proc_execute, 500);
    });

    it('144.2.2 urowid length > 1000', async function() {
      await procedureBindIn(proc_execute, 1000);
    });

    it('144.2.3 urowid length > 2000', async function() {
      await procedureBindIn(proc_execute, 2000);
    });

  });

  describe('144.3 PROCEDURE BIND_IN, UPDATE', function() {
    const proc_create = "CREATE OR REPLACE PROCEDURE nodb_urowid_bind_in_1443 (id IN NUMBER, content_1 IN VARCHAR2, content_2 IN UROWID)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName_normal + " (id, content) values (id, content_1); \n" +
                      "    update " + tableName_normal + " set content = content_2 where id = id; \n" +
                      "END nodb_urowid_bind_in_1443; ";
    const proc_execute = "BEGIN nodb_urowid_bind_in_1443 (:i, :c1, :c2); END;";
    const proc_drop = "DROP PROCEDURE nodb_urowid_bind_in_1443";

    before('create procedure', async function() {
      await sql.executeSql(connection, proc_create, {}, {});
    });

    after('drop procedure', async function() {
      await sql.executeSql(connection, proc_drop, {}, {});
    });

    it('144.3.1 update with urowid length > 500', async function() {
      await procedureBindIn_update(proc_execute, 20, 500);
    });

    it('144.3.2 update with urowid length > 1000', async function() {
      await procedureBindIn_update(proc_execute, 20, 1000);
    });

    it('144.3.3 update with urowid length > 2000', async function() {
      await procedureBindIn_update(proc_execute, 20, 2000);
    });

  });

  const procedureBindIn = async function(proc_execute, expectedLength) {
    const str = random.getRandomLengthString(expectedLength);
    let urowid, urowidLen;
    const sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
    await sql.executeInsert(connection, sql_insert, {}, {});

    let result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + insertID);
    assert(result);
    urowid = result.rows[0][0];
    urowidLen = urowid.length;
    testsUtil.checkUrowidLength(urowidLen, expectedLength);

    const bindVar_in = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c: { val: urowid, type: oracledb.STRING, dir: oracledb.BIND_IN }
    };
    const option_in = { autoCommit: true };
    await sql.executeSql(connection, proc_execute, bindVar_in, option_in);

    const sql_query = "select * from " + tableName_normal + " where id = " + insertID;
    result = await connection.execute(sql_query);
    assert(result);
    const resultVal = result.rows[0][1];
    assert.strictEqual(resultVal, urowid);
  };

  const procedureBindIn_update = async function(proc_execute, contentLen_1, contentLen_2) {
    const str_1 = random.getRandomLengthString(contentLen_1);
    const str_2 = random.getRandomLengthString(contentLen_2);
    let urowid_1, urowid_2, urowidLen_1, urowidLen_2, id_1, id_2;

    id_1 = insertID;
    let sql_insert = "insert into " + tableName_indexed + " values (" + id_1 + ", '" + str_1 + "')";
    await sql.executeInsert(connection, sql_insert, {}, {});

    let result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + id_1);
    assert(result);
    urowid_1 = result.rows[0][0];
    urowidLen_1 = urowid_1.length;
    testsUtil.checkUrowidLength(urowidLen_1, contentLen_1);
    id_2 = insertID + 1;
    sql_insert = "insert into " + tableName_indexed + " values (" + id_2 + ", '" + str_2 + "')";
    result = await connection.execute(sql_insert);
    result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + id_2);
    assert(result);
    urowid_2 = result.rows[0][0];
    urowidLen_2 = urowid_2.length;
    testsUtil.checkUrowidLength(urowidLen_2, contentLen_2);

    const bindVar_in = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c1: { val: urowid_1, type: oracledb.STRING, dir: oracledb.BIND_IN },
      c2: { val: urowid_2, type: oracledb.STRING, dir: oracledb.BIND_IN }
    };
    const option_in = { autoCommit: true };
    await sql.executeSql(connection, proc_execute, bindVar_in, option_in);

    sql_insert = "select * from " + tableName_normal + " where id = " + insertID;
    result = await connection.execute(sql_insert);

    const resultVal = result.rows[0][1];
    assert.strictEqual(resultVal, urowid_2);
    insertID = insertID + 10;

  };

});

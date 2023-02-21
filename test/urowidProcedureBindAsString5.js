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
 *   145. urowidProcedureBindAsString5.js
 *
 * DESCRIPTION
 *   Testing UROWID(> 200 bytes) plsql procedure bind out as String.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const sql      = require('./sqlClone.js');
const random   = require('./random.js');
const testsUtil = require('./testsUtil.js');

describe('145. urowidProcedureBindAsString5.js', function() {
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
    await connection.release();
  });

  beforeEach(function() {
    insertID++;
  });

  describe('145.1 PROCEDURE BIND_OUT as UROWID', function() {
    const proc_create = "CREATE OR REPLACE PROCEDURE nodb_rowid_bind_out_1451 (id_in IN NUMBER, content_in IN UROWID, content_out OUT UROWID)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName_normal + " (id, content) values (id_in, content_in); \n" +
                      "    select content into content_out from " + tableName_normal + " where id = id_in; \n" +
                      "END nodb_rowid_bind_out_1451; ";
    const proc_execute = "BEGIN nodb_rowid_bind_out_1451 (:i, :c, :o); END;";
    const proc_drop = "DROP PROCEDURE nodb_rowid_bind_out_1451";

    before('create procedure', async function() {
      await sql.executeSql(connection, proc_create, {}, {});
    });

    after('drop procedure', async function() {
      await sql.executeSql(connection, proc_drop, {}, {});
    });

    it('145.1.1 urowid length > 500', async function() {
      await procedureBindOut(proc_execute, 500);
    });

    it('145.1.2 urowid length > 1000', async function() {
      await procedureBindOut(proc_execute, 1000);
    });

    it('145.1.3 urowid length > 2000', async function() {
      await procedureBindOut(proc_execute, 2000);
    });

  });

  describe('145.2 PROCEDURE BIND_OUT as STRING', function() {
    const proc_create = "CREATE OR REPLACE PROCEDURE nodb_rowid_bind_out_1452 (id_in IN NUMBER, content_in IN UROWID, content_out OUT VARCHAR2)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName_normal + " (id, content) values (id_in, content_in); \n" +
                      "    select content into content_out from " + tableName_normal + " where id = id_in; \n" +
                      "END nodb_rowid_bind_out_1452; ";
    const proc_execute = "BEGIN nodb_rowid_bind_out_1452 (:i, :c, :o); END;";
    const proc_drop = "DROP PROCEDURE nodb_rowid_bind_out_1452";

    before('create procedure', async function() {
      await sql.executeSql(connection, proc_create, {}, {});
    });

    after('drop procedure', async function() {
      await sql.executeSql(connection, proc_drop, {}, {});
    });

    it('145.2.1 urowid length > 500', async function() {
      await procedureBindOut(proc_execute, 500);
    });

    it('145.2.2 urowid length > 1000', async function() {
      await procedureBindOut(proc_execute, 1000);
    });

    it('145.2.3 urowid length > 2000', async function() {
      await procedureBindOut(proc_execute, 2000);
    });

  });

  const procedureBindOut = async function(proc_execute, expectedLength) {
    const str = random.getRandomLengthString(expectedLength);
    let urowid, urowidLen;
    const sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
    await sql.executeInsert(connection, sql_insert, {}, {});
    let result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + insertID);
    assert(result);
    urowid = result.rows[0][0];
    urowidLen = urowid.length;
    testsUtil.checkUrowidLength(urowidLen, expectedLength);
    const bindVar_out = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c: { val: urowid, type: oracledb.STRING, dir: oracledb.BIND_IN },
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 5000 }
    };
    result = await connection.execute(proc_execute, bindVar_out);
    assert(result);
    const resultVal = result.outBinds.o;
    assert.strictEqual(resultVal, urowid);
  };
});

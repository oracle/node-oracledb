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
 *   142. urowidFunctionBindAsString3.js
 *
 * DESCRIPTION
 *   Testing UROWID(> 200 bytes) plsql function bind in/out as String.
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');
const testsUtil = require('./testsUtil.js');

describe('142. urowidFunctionBindAsString3.js', function() {
  let connection = null;
  const tableName_indexed = "nodb_urowid_indexed";
  const tableName_normal = "nodb_urowid_normal";
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
                      "            c2    VARCHAR2(3189), \n" +
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
    await connection.execute(table_indexed);
    await connection.execute(table_normal);
  });

  after('release connection', async function() {
    await connection.execute(drop_table_indexed);
    await connection.execute(drop_table_normal);
    await connection.close();
  });

  beforeEach(function() {
    insertID++;
  });

  describe('142.1 FUNCTION BIND_IN/OUT as UROWID', function() {
    const fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind (ID_in IN NUMBER, content_in IN UROWID) RETURN UROWID\n" +
                     "IS \n" +
                     "    tmp UROWID(4000); \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName_normal + " (id, content) values (ID_in, content_in); \n" +
                     "    select content into tmp from " + tableName_normal + " where id = ID_in; \n" +
                     "    return tmp; \n" +
                     "END; ";
    const fun_execute = "BEGIN :o := nodb_rowid_bind (:i, :c); END;";
    const fun_drop = "DROP FUNCTION nodb_rowid_bind";

    before('create procedure', async function() {
      await connection.execute(fun_create);
    });

    after('drop procedure', async function() {
      await connection.execute(fun_drop);
    });

    it('142.1.1 urowid length > 200', async function() {
      await funBindOut(fun_execute, 200);
    });

    it('142.1.2 urowid length > 500', async function() {
      await funBindOut(fun_execute, 500);
    });

    it('142.1.3 urowid length > 2000', async function() {
      await funBindOut(fun_execute, 2000);
    });

  });

  describe('142.2 FUNCTION BIND_IN/OUT as string', function() {
    const fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind (id_in IN NUMBER, content_in IN UROWID) RETURN VARCHAR2\n" +
                     "IS \n" +
                     "    tmp UROWID; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName_normal + " (id, content) values (id_in, content_in); \n" +
                     "    select content into tmp from " + tableName_normal + " where id = id_in; \n" +
                     "    return tmp; \n" +
                     "END; ";
    const fun_execute = "BEGIN :o := nodb_rowid_bind (:i, :c); END;";
    const fun_drop = "DROP FUNCTION nodb_rowid_bind";

    before('create procedure', async function() {
      await connection.execute(fun_create);
    });

    after('drop procedure', async function() {
      await connection.execute(fun_drop);
    });

    it('142.2.1 urowid length > 200', async function() {
      await funBindOut(fun_execute, 200);
    });

    it('142.2.2 urowid length > 500', async function() {
      await funBindOut(fun_execute, 500);
    });

    it('142.2.3 urowid length > 2000', async function() {
      await funBindOut(fun_execute, 2000);
    });

  });

  describe('142.3 FUNCTION BIND_IN, UPDATE', function() {
    const fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind_1083 (id_in IN NUMBER, content_1 IN VARCHAR2, content_2 IN UROWID) RETURN UROWID\n" +
                     "IS \n" +
                     "    tmp UROWID; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName_normal + " (id, content) values (id_in, content_1); \n" +
                     "    update " + tableName_normal + " set content = content_2 where id = id_in; \n" +
                     "    select content into tmp from " + tableName_normal + " where id = id_in; \n" +
                     "    return tmp; \n" +
                     "END; ";
    const fun_exec = "BEGIN :o := nodb_rowid_bind_1083 (:i, :c1, :c2); END;";
    const fun_drop = "DROP FUNCTION nodb_rowid_bind_1083";

    before('create procedure', async function() {
      await connection.execute(fun_create);
    });

    after('drop procedure', async function() {
      await connection.execute(fun_drop);
    });

    it('142.3.1 update with UROWID > 200', async function() {
      await funBindOut_update(fun_exec, 10, 200);
    });

    it('142.3.2 update with UROWID > 500', async function() {
      await funBindOut_update(fun_exec, 50, 500);
    });

    it('142.3.3 update with UROWID > 2000', async function() {
      await funBindOut_update(fun_exec, 50, 2000);
    });

  });

  const funBindOut = async function(fun_exec, expectedLength) {
    const str = random.getRandomLengthString(expectedLength);
    const sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
    await connection.execute(sql_insert);
    let result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + insertID);
    assert(result);
    const urowid = result.rows[0][0];
    const urowidLen = urowid.length;
    testsUtil.checkUrowidLength(urowidLen, expectedLength);
    const bindVar_in = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c: { val: urowid, type: oracledb.STRING, dir: oracledb.BIND_IN },
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 5000 }
    };
    result = await connection.execute(fun_exec, bindVar_in);
    assert(result);
    const resultVal = result.outBinds.o;
    assert.strictEqual(resultVal.length, urowidLen);
    assert.strictEqual(resultVal, urowid);

  };

  const funBindOut_update = async function(fun_exec, contentLen_1, contentLen_2) {
    const str_1 = random.getRandomLengthString(contentLen_1);
    const str_2 = random.getRandomLengthString(contentLen_2);
    const id_1 = insertID;
    let sql_insert = "insert into " + tableName_indexed + " values (" + id_1 + ", '" + str_1 + "')";
    await connection.execute(sql_insert);
    let result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + id_1);
    assert(result);
    const urowid_1 = result.rows[0][0];
    const urowidLen_1 = urowid_1.length;
    testsUtil.checkUrowidLength(urowidLen_1, contentLen_1);
    const id_2 = insertID + 1;
    sql_insert = "insert into " + tableName_indexed + " values (" + id_2 + ", '" + str_2 + "')";
    await connection.execute(sql_insert);
    result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + id_2);
    assert(result);
    const urowid_2 = result.rows[0][0];
    const urowidLen_2 = urowid_2.length;
    testsUtil.checkUrowidLength(urowidLen_2, contentLen_2);
    const bindVar_in = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c1: { val: urowid_1, type: oracledb.STRING, dir: oracledb.BIND_IN },
      c2: { val: urowid_2, type: oracledb.STRING, dir: oracledb.BIND_IN },
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 5000 }
    };
    result = await connection.execute(fun_exec, bindVar_in);
    const resultVal = result.outBinds.o;
    assert.strictEqual(resultVal.length, urowidLen_2);
    assert.strictEqual(resultVal, urowid_2);
    insertID = insertID + 10;
  };

});

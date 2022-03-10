/* Copyright (c) 2017, 2021, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   143. urowidFunctionBindAsString4.js
 *
 * DESCRIPTION
 *   Testing UROWID(> 200 bytes) plsql function bind inout as String.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var assert   = require('assert');
var dbConfig = require('./dbconfig.js');
var sql      = require('./sql.js');
var random   = require('./random.js');

describe('143. urowidFunctionBindAsString4.js', function() {
  var connection = null;
  var tableName_indexed = "nodb_urowid_indexed";
  var tableName_normal = "nodb_urowid_normal";
  var insertID = 1;

  var table_indexed = "BEGIN \n" +
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

  var table_normal = "BEGIN \n" +
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

  var drop_table_indexed = "DROP TABLE " + tableName_indexed + " PURGE";
  var drop_table_normal = "DROP TABLE " + tableName_normal + " PURGE";

  before('get connection and create table', async function() {
    try {
      connection = await oracledb.getConnection(dbConfig);
      await sql.executeSql(connection, table_indexed, {}, {});
      await sql.executeSql(connection, table_normal, {}, {});
    } catch (err) {
      assert.ifError(err);
    }
  });

  after('release connection', async function() {
    try {
      await sql.executeSql(connection, drop_table_indexed, {}, {});
      await sql.executeSql(connection, drop_table_normal, {}, {});
      await connection.release();
    } catch (err) {
      assert.ifError(err);
    }

  });

  beforeEach(function(done) {
    insertID++;
    done();
  });

  describe('143.1 FUNCTION BIND_INOUT as UROWID', function() {
    var fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind_inout_1121 (id_in IN NUMBER, content_inout IN OUT UROWID) RETURN UROWID\n" +
                     "IS \n" +
                     "    tmp UROWID; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName_normal + " (id, content) values (id_in, content_inout); \n" +
                     "    select content into content_inout from " + tableName_normal + " where id = id_in; \n" +
                     "    select content into tmp from " + tableName_normal + " where id = id_in; \n" +
                     "    return tmp; \n" +
                     "END; ";
    var fun_execute = "BEGIN :o := nodb_rowid_bind_inout_1121 (:i, :c); END;";
    var fun_drop = "DROP FUNCTION nodb_rowid_bind_inout_1121";

    before('create procedure', async function() {
      try {
        await sql.executeSql(connection, fun_create, {}, {});
      } catch (err) {
        assert.ifError(err);
      }
    });

    after('drop procedure', async function() {
      try {
        await sql.executeSql(connection, fun_drop, {}, {});
      } catch (err) {
        assert.ifError(err);
      }
    });

    it('143.1.1 urowid length > 200', async function() {
      await funBindInOut(fun_execute, 200);
    });

    it('143.1.2 urowid length > 500', async function() {
      await funBindInOut(fun_execute, 500);
    });

    it('143.1.3 urowid length > 2000', async function() {
      await funBindInOut(fun_execute, 2000);
    });

  });

  describe('143.2 FUNCTION BIND_INOUT as string', function() {
    var fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind_inout_1121 (id_in IN NUMBER, content_inout IN OUT VARCHAR2) RETURN UROWID\n" +
                     "IS \n" +
                     "    tmp UROWID; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName_normal + " (id, content) values (id_in, content_inout); \n" +
                     "    select content into tmp from " + tableName_normal + " where id = id_in; \n" +
                     "    select content into tmp from " + tableName_normal + " where id = id_in; \n" +
                     "    return tmp; \n" +
                     "END; ";
    var fun_execute = "BEGIN :o := nodb_rowid_bind_inout_1121 (:i, :c); END;";
    var fun_drop = "DROP FUNCTION nodb_rowid_bind_inout_1121";

    before('create procedure', async function() {
      try {
        await sql.executeSql(connection, fun_create, {}, {});
      } catch (err) {
        assert.ifError(err);
      }
    });

    after('drop procedure', async function() {
      try {
        await sql.executeSql(connection, fun_drop, {}, {});
      } catch (err) {
        assert.ifError(err);
      }
    });

    it('143.2.1 urowid length > 200', async function() {
      await funBindInOut(fun_execute, 200);
    });

    it('143.2.2 urowid length > 500', async function() {
      await funBindInOut(fun_execute, 500);
    });

    it('143.2.3 urowid length > 2000', async function() {
      await funBindInOut(fun_execute, 2000);
    });

  });

  describe('143.3 FUNCTION BIND_INOUT, UPDATE', function() {
    var fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind_1443 (id_in IN NUMBER, content_1 IN OUT VARCHAR2, content_2 IN OUT UROWID) RETURN UROWID\n" +
                     "IS \n" +
                     "    tmp UROWID; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName_normal + " (id, content) values (id_in, content_1); \n" +
                     "    update " + tableName_normal + " set content = content_2 where id = id_in; \n" +
                     "    select content into tmp from " + tableName_normal + " where id = id_in; \n" +
                     "    select content into content_1 from " + tableName_normal + " where id = id_in; \n" +
                     "    select content into content_2 from " + tableName_normal + " where id = id_in; \n" +
                     "    return tmp; \n" +
                     "END; ";
    var fun_execute = "BEGIN :o := nodb_rowid_bind_1443 (:i, :c1, :c2); END;";
    var fun_drop = "DROP FUNCTION nodb_rowid_bind_1443";

    before('create procedure', async function() {
      try {
        await sql.executeSql(connection, fun_create, {}, {});
      } catch (err) {
        assert.ifError(err);
      }
    });

    after('drop procedure', async function() {
      try {
        await sql.executeSql(connection, fun_drop, {}, {});
      } catch (err) {
        assert.ifError(err);
      }

    });

    it('143.3.1 update with UROWID > 200', async function() {
      await funBindOut_update(fun_execute, 10, 200);
    });

    it('143.3.2 update with UROWID > 500', async function() {
      await funBindOut_update(fun_execute, 50, 500);
    });

    it('143.3.3 update with UROWID > 2000', async function() {
      await funBindOut_update(fun_execute, 50, 2000);
    });

  });

  var funBindInOut = async function(fun_execute, expectedLength) {
    const str = random.getRandomLengthString(expectedLength);
    var urowid, urowidLen;
    const sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
    await sql.executeInsert(connection, sql_insert, {}, {});
    var result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + insertID);
    assert(result);
    urowid = result.rows[0][0];
    urowidLen = urowid.length;
    assert(urowidLen > expectedLength);
    const bindVar_in = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c: { val: urowid, type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxSize: 5000 },
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 5000 }
    };
    result = await connection.execute(fun_execute, bindVar_in);
    assert(result);
    const resultVal_1 = result.outBinds.c;
    const resultVal_2 = result.outBinds.o;
    assert.strictEqual(resultVal_1.length, urowidLen);
    assert.strictEqual(resultVal_2.length, urowidLen);
    assert.strictEqual(resultVal_1, urowid);
    assert.strictEqual(resultVal_2, urowid);
  };

  var funBindOut_update = async function(fun_exec, contentLen_1, contentLen_2) {
    const str_1 = random.getRandomLengthString(contentLen_1);
    const str_2 = random.getRandomLengthString(contentLen_2);
    var urowid_1, urowid_2, urowidLen_1, urowidLen_2, id_1, id_2;
    id_1 = insertID;
    var sql_insert = "insert into " + tableName_indexed + " values (" + id_1 + ", '" + str_1 + "')";
    await sql.executeInsert(connection, sql_insert, {}, {});

    var result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + id_1);
    assert(result);
    urowid_1 = result.rows[0][0];
    urowidLen_1 = urowid_1.length;
    assert(urowidLen_1 > contentLen_1);
    id_2 = insertID + 1;
    sql_insert = "insert into " + tableName_indexed + " values (" + id_2 + ", '" + str_2 + "')";
    await sql.executeInsert(connection, sql_insert, {}, {});
    result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + id_2);
    assert(result);
    urowid_2 = result.rows[0][0];
    urowidLen_2 = urowid_2.length;
    assert(urowidLen_2 > contentLen_2);
    const bindVar_in = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c1: { val: urowid_1, type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxSize: 5000 },
      c2: { val: urowid_2, type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxSize: 5000 },
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 5000 }
    };
    result =  await connection.execute(fun_exec, bindVar_in);
    assert(result);
    const resultVal_1 = result.outBinds.c1;
    const resultVal_2 = result.outBinds.c2;
    const resultVal_3 = result.outBinds.o;
    assert.strictEqual(resultVal_1.length, urowidLen_2);
    assert.strictEqual(resultVal_2.length, urowidLen_2);
    assert.strictEqual(resultVal_3.length, urowidLen_2);
    assert.strictEqual(resultVal_2, urowid_2);
    assert.strictEqual(resultVal_1, urowid_2);
    assert.strictEqual(resultVal_3, urowid_2);
    insertID = insertID + 10;
  };

});

/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 *   112. rowidFunctionBindAsString_bindinout.js
 *
 * DESCRIPTION
 *   Testing rowid plsql bind as String.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const sql      = require('./sqlClone.js');

describe('112. rowidFunctionBindAsString_bindinout.js', function() {
  let connection = null;
  const tableName = "nodb_rowid_plsql_inout";
  let insertID = 1;

  const fun_create_table = "BEGIN \n" +
                         "    DECLARE \n" +
                         "        e_table_missing EXCEPTION; \n" +
                         "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                         "    BEGIN \n" +
                         "        EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE' ); \n" +
                         "    EXCEPTION \n" +
                         "        WHEN e_table_missing \n" +
                         "        THEN NULL; \n" +
                         "    END; \n" +
                         "    EXECUTE IMMEDIATE ( ' \n" +
                         "        CREATE TABLE " + tableName + " ( \n" +
                         "            ID       NUMBER, \n" +
                         "            content  ROWID \n" +
                         "        ) \n" +
                         "    '); \n" +
                          "END;  ";
  const drop_table = "DROP TABLE " + tableName + " PURGE";

  before('get connection and create table', async function() {
    connection = await oracledb.getConnection(dbConfig);
    await sql.executeSql(connection, fun_create_table, {}, {});
  });

  after('release connection', async function() {
    await sql.executeSql(connection, drop_table, {}, {});
    await connection.close();
  });

  beforeEach(function(done) {
    insertID++;
    done();
  });

  describe('112.1 FUNCTION BIND_INOUT as rowid', function() {
    const fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind_inout_1121 (id_in IN NUMBER, content_inout IN OUT ROWID) RETURN ROWID\n" +
                     "IS \n" +
                     "    tmp rowid; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName + " (id, content) values (id_in, CHARTOROWID(content_inout)); \n" +
                     "    select content into tmp from " + tableName + " where id = id_in; \n" +
                     "    select CHARTOROWID('AAACiZAAFAAAAJEAAA') into content_inout from dual; \n" +
                     "    return tmp; \n" +
                     "END; ";
    const fun_execute = "BEGIN :o := nodb_rowid_bind_inout_1121 (:i, :c); END;";
    const fun_drop = "DROP FUNCTION nodb_rowid_bind_inout_1121";

    before('create procedure', async function() {
      await sql.executeSql(connection, fun_create, {}, {});
    });

    after('drop procedure', async function() {
      await sql.executeSql(connection, fun_drop, {}, {});
    });

    it('112.1.1 works with null', async function() {
      await funBindInOut(fun_execute, null, null);
    });

    it('112.1.2 works with empty string', async function() {
      await funBindInOut(fun_execute, "", null);
    });

    it('112.1.3 works with undefined', async function() {
      await funBindInOut(fun_execute, undefined, null);
    });

    it('112.1.4 works with NaN', async function() {
      const content = NaN;
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_INOUT },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      try {
        await sql.executeSqlWithErr(connection, fun_create, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-011: encountered bind value and type mismatch');
      }
    });

    it('112.1.5 works with extended rowid', async function() {
      await funBindInOut(fun_execute, "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('112.1.6 works with restricted rowid', async function() {
      await funBindInOut(fun_execute, "00000DD5.0000.0101", "00000DD5.0000.0101");
    });

    it('112.1.7 works with string 0', async function() {
      await funBindInOut(fun_execute, "0", "00000000.0000.0000");
    });

    it('112.1.8 works with number 0', async function() {
      const content = 0;
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_INOUT },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      try {
        await sql.executeSqlWithErr(connection, fun_execute, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-011: encountered bind value and type mismatch');
      }
    });

    it('112.1.9 works with default bind type/dir - extended rowid', async function() {
      await funBindInOut_default(fun_execute, "AAAB1+AADAAAAwPAAA", "AAAB1+AADAAAAwPAAA");
    });

    it('112.1.10 works with default bind type/dir - null value', async function() {
      await funBindInOut_default(fun_execute, null, null);
    });

    it('112.1.11 works with default bind type/dir - empty string', async function() {
      await funBindInOut_default(fun_execute, "", null);
    });

    it('112.1.12 works with default bind type/dir - undefined', async function() {
      await funBindInOut_default(fun_execute, undefined, null);
    });

    it('112.1.13 bind error: NJS-037', async function() {
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: [0], type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxArraySize: 1000 },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      try {
        await sql.executeSqlWithErr(connection, fun_create, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-037: invalid data type at array index 0 for bind ":c"');
      }
    });

    it('112.1.14 bind error: NJS-052', async function() {
      const bindVar = [ { type: oracledb.STRING, dir: oracledb.BIND_OUT }, insertID, { val: [0], type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxArraySize: 1000 } ];
      try {
        await sql.executeSqlWithErr(connection, fun_create, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-052: invalid data type at array index 0 for bind position 3');
      }
    });

  });

  describe('112.2 FUNCTION BIND_INOUT as string', function() {
    const fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind_inout_1121 (id_in IN NUMBER, content_inout IN OUT VARCHAR2) RETURN ROWID\n" +
                     "IS \n" +
                     "    tmp rowid; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName + " (id, content) values (id_in, CHARTOROWID(content_inout)); \n" +
                     "    select content into tmp from " + tableName + " where id = id_in; \n" +
                     "    select CHARTOROWID('AAACiZAAFAAAAJEAAA') into content_inout from dual; \n" +
                     "    return tmp; \n" +
                     "END; ";
    const fun_execute = "BEGIN :o := nodb_rowid_bind_inout_1121 (:i, :c); END;";
    const fun_drop = "DROP FUNCTION nodb_rowid_bind_inout_1121";

    before('create procedure', async function() {
      await sql.executeSql(connection, fun_create, {}, {});
    });

    after('drop procedure', async function() {
      await sql.executeSql(connection, fun_drop, {}, {});
    });

    it('112.2.1 works with null', async function() {
      await funBindInOut(fun_execute, null, null);
    });

    it('112.2.2 works with empty string', async function() {
      await funBindInOut(fun_execute, "", null);
    });

    it('112.2.3 works with undefined', async function() {
      await funBindInOut(fun_execute, undefined, null);
    });

    it('112.2.4 works with NaN', async function() {
      const content = NaN;
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_INOUT },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      try {
        await sql.executeSqlWithErr(connection, fun_create, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-011: encountered bind value and type mismatch');
      }
    });

    it('112.2.5 works with extended rowid', async function() {
      await funBindInOut(fun_execute, "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('112.2.6 works with restricted rowid', async function() {
      await funBindInOut(fun_execute, "00000DD5.0000.0101", "00000DD5.0000.0101");
    });

    it('112.2.7 works with string 0', async function() {
      await funBindInOut(fun_execute, "0", "00000000.0000.0000");
    });

    it('112.2.8 works with number 0', async function() {
      const content = 0;
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_INOUT },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      try {
        await sql.executeSqlWithErr(connection, fun_create, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-011: encountered bind value and type mismatch');
      }
    });

    it('112.2.9 works with default bind type/dir - extended rowid', async function() {
      await funBindInOut_default(fun_execute, "AAAB1+AADAAAAwPAAA", "AAAB1+AADAAAAwPAAA");
    });

    it('112.2.10 works with default bind type/dir - null value', async function() {
      await funBindInOut_default(fun_execute, null, null);
    });

    it('112.2.11 works with default bind type/dir - empty string', async function() {
      await funBindInOut_default(fun_execute, "", null);
    });

    it('112.2.12 works with default bind type/dir - undefined', async function() {
      await funBindInOut_default(fun_execute, undefined, null);
    });

    it('112.2.13 bind error: NJS-037', async function() {
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: [0], type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxArraySize: 1000 },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      try {
        await sql.executeSqlWithErr(connection, fun_create, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-037: invalid data type at array index 0 for bind ":c"');
      }
    });

    it('112.2.14 bind error: NJS-052', async function() {
      const bindVar = [ { type: oracledb.STRING, dir: oracledb.BIND_OUT }, insertID, { val: [0], type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxArraySize: 1000 } ];
      try {
        await sql.executeSqlWithErr(connection, fun_execute, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-052: invalid data type at array index 0 for bind position 3');
      }
    });

  });

  describe('112.3 FUNCTION BIND_INOUT, UPDATE', function() {
    const fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind_1083 (id_in IN NUMBER, content_1 IN OUT VARCHAR2, content_2 IN OUT ROWID) RETURN ROWID\n" +
                     "IS \n" +
                     "    tmp rowid; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName + " (id, content) values (id_in, CHARTOROWID(content_1)); \n" +
                     "    update " + tableName + " set content = content_2 where id = id_in; \n" +
                     "    select content into tmp from " + tableName + " where id = id_in; \n" +
                     "    select CHARTOROWID('AAACiZAAFAAAAJEAAA') into content_1 from dual; \n" +
                     "    return tmp; \n" +
                     "END; ";
    const fun_execute = "BEGIN :o := nodb_rowid_bind_1083 (:i, :c1, :c2); END;";
    const fun_drop = "DROP FUNCTION nodb_rowid_bind_1083";

    before('create procedure', async function() {
      await sql.executeSql(connection, fun_create, {}, {});
    });

    after('drop procedure', async function() {
      await sql.executeSql(connection, fun_drop, {}, {});
    });

    it('112.3.1 update null with rowid', async function() {
      await funBindInOut_update(fun_execute, null, "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('112.3.2 update empty string with rowid', async function() {
      await funBindInOut_update(fun_execute, "", "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('112.3.3 update undefined with rowid', async function() {
      await funBindInOut_update(fun_execute, undefined, "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('112.3.4 works with default bind type/dir', async function() {
      await funBindInOut_update(fun_execute, "AAAB1+AADAAAAwPAAA", "0", "00000000.0000.0000");
    });

    it('112.3.5 works with default bind type/dir - null value', async function() {
      await funBindInOut_update_default(fun_execute, "AAAB12AADAAAAwPAAA", null, null);
    });

    it('112.3.6 works with default bind type/dir - empty string', async function() {
      await funBindInOut_update_default(fun_execute, "AAAB12AADAAAAwPAAA", "", null);
    });

    it('112.3.7 works with default bind type/dir - undefined', async function() {
      await funBindInOut_update_default(fun_execute, "AAAB12AADAAAAwPAAA", undefined, null);
    });

  });

  const funBindInOut = async function(fun_exec, content_in, expected) {
    const bindVar_in = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c: { val: content_in, type: oracledb.STRING, dir: oracledb.BIND_INOUT },
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
    };
    const result = await connection.execute(fun_exec, bindVar_in);
    assert(result);
    const resultVal_1 = result.outBinds.c;
    const resultVal_2 = result.outBinds.o;
    assert.strictEqual(resultVal_2, expected);
    assert.strictEqual(resultVal_1, "AAACiZAAFAAAAJEAAA");
  };

  const funBindInOut_default = async function(fun_exec, content_in, expected) {
    const bindVar_in = {
      i: insertID,
      c: { val: content_in, type: oracledb.STRING, dir: oracledb.BIND_INOUT },
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
    };
    const result = await connection.execute(fun_exec, bindVar_in);
    const resultVal_1 = result.outBinds.c;
    const resultVal_2 = result.outBinds.o;
    assert.strictEqual(resultVal_2, expected);
    assert.strictEqual(resultVal_1, "AAACiZAAFAAAAJEAAA");
  };

  const funBindInOut_update = async function(fun_exec, content_1, content_2, expected) {
    const bindVar_in = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c1: { val: content_1, type: oracledb.STRING, dir: oracledb.BIND_INOUT },
      c2: { val: content_2, type: oracledb.STRING, dir: oracledb.BIND_INOUT },
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
    };
    const result = await connection.execute(fun_exec, bindVar_in);
    assert(result);
    const resultVal_1 = result.outBinds.c1;
    const resultVal_2 = result.outBinds.o;
    assert.strictEqual(resultVal_2, expected);
    assert.strictEqual(resultVal_1, "AAACiZAAFAAAAJEAAA");
  };

  const funBindInOut_update_default = async function(fun_exec, content_1, content_2, expected) {
    const bindVar_in = {
      i: insertID,
      c1: { val: content_1, type: oracledb.STRING, dir: oracledb.BIND_INOUT },
      c2: { val: content_2, type: oracledb.STRING, dir: oracledb.BIND_INOUT },
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
    };
    const result = await connection.execute(fun_exec, bindVar_in);
    assert(result);
    const resultVal_1 = result.outBinds.c1;
    const resultVal_2 = result.outBinds.o;
    assert.strictEqual(resultVal_2, expected);
    assert.strictEqual(resultVal_1, "AAACiZAAFAAAAJEAAA");

  };

});

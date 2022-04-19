/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 * NAME
 *   109. rowidFunctionBindAsString_bind.js
 *
 * DESCRIPTION
 *   Testing rowid plsql bind as String.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var assert   = require('assert');
var dbConfig = require('./dbconfig.js');
var sql      = require('./sqlClone.js');

describe('109. rowidFunctionBindAsString_bind.js', function() {
  var connection = null;
  var tableName = "nodb_rowid_plsql_in";
  var insertID = 1;

  var fun_create_table = "BEGIN \n" +
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
  var drop_table = "DROP TABLE " + tableName + " PURGE";

  before('get connection and create table', async function() {
    try {
      connection = await oracledb.getConnection(dbConfig);
      await sql.executeSql(connection, fun_create_table, {}, {});
    } catch (err) {
      assert.ifError(err);
    }
  });

  after('release connection', async function() {

    try {
      await sql.executeSql(connection, drop_table, {}, {});
      await connection.release();
    } catch (err) {
      assert.ifError(err);
    }

  });

  beforeEach(function(done) {
    insertID++;
    done();
  });

  describe('109.1 FUNCTION BIND_IN/OUT as rowid', function() {
    var fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind (ID_in IN NUMBER, content_in IN ROWID) RETURN ROWID\n" +
                     "IS \n" +
                     "    tmp rowid; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName + " (id, content) values (ID_in, CHARTOROWID(content_in)); \n" +
                     "    select content into tmp from " + tableName + " where id = ID_in; \n" +
                     "    return tmp; \n" +
                     "END; ";
    var fun_execute = "BEGIN :o := nodb_rowid_bind (:i, :c); END;";
    var fun_drop = "DROP FUNCTION nodb_rowid_bind";

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

    it('109.1.1 works with null', async function() {
      await funBindOut(fun_execute, null, null);
    });

    it('109.1.2 works with empty string', async function() {
      await funBindOut(fun_execute, "", null);
    });

    it('109.1.3 works with undefined', async function() {
      await funBindOut(fun_execute, undefined, null);
    });

    it('109.1.4 works with NaN', async function() {
      const content = NaN;
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      try {
        await sql.executeSqlWithErr(connection, fun_create, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-011: encountered bind value and type mismatch');
      }

    });

    it('109.1.5 works with extended rowid', async function() {
      await funBindOut(fun_execute, "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('109.1.6 works with restricted rowid', async function() {
      await funBindOut(fun_execute, "00000DD5.0000.0101", "00000DD5.0000.0101");
    });

    it('109.1.7 works with string 0', async function() {
      await funBindOut(fun_execute, "0", "00000000.0000.0000");
    });

    it('109.1.8 works with number 0', async function() {
      var content = 0;
      var bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      try {
        await sql.executeSqlWithErr(connection, fun_create, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-011: encountered bind value and type mismatch');
      }
    });

    it('109.1.9 works with default bind type/dir - extended rowid', async function() {
      await funBindOut_default(fun_execute, "AAAB1+AADAAAAwPAAA", "AAAB1+AADAAAAwPAAA");
    });

    it('109.1.10 works with default bind type/dir - null value', async function() {
      await funBindOut_default(fun_execute, null, null);
    });

    it('109.1.11 works with default bind type/dir - empty string', async function() {
      await funBindOut_default(fun_execute, "", null);
    });

    it('109.1.12 works with default bind type/dir - undefined', async function() {
      await funBindOut_default(fun_execute, undefined, null, undefined);
    });

    it('109.1.13 bind error: NJS-037', async function() {
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      try {
        await sql.executeSqlWithErr(connection, fun_create, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-037: invalid data type at array index 0 for bind ":c"');
      }
    });

    it('109.1.14 bind error: NJS-052', async function() {
      const bindVar = [ { type: oracledb.STRING, dir: oracledb.BIND_OUT }, insertID, { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN } ];
      try {
        await sql.executeSqlWithErr(connection, fun_create, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-052: invalid data type at array index 0 for bind position 3');
      }
    });

  });

  describe('109.2 FUNCTION BIND_IN/OUT as string', function() {
    var fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind (id_in IN NUMBER, content_in IN ROWID) RETURN VARCHAR2\n" +
                     "IS \n" +
                     "    tmp rowid; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName + " (id, content) values (id_in, CHARTOROWID(content_in)); \n" +
                     "    select content into tmp from " + tableName + " where id = id_in; \n" +
                     "    return tmp; \n" +
                     "END; ";
    var fun_execute = "BEGIN :o := nodb_rowid_bind (:i, :c); END;";
    var fun_drop = "DROP FUNCTION nodb_rowid_bind";

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

    it('109.2.1 works with null', async function() {
      await funBindOut(fun_execute, null, null);
    });

    it('109.2.2 works with empty string', async function() {
      await funBindOut(fun_execute, "", null);
    });

    it('109.2.3 works with undefined', async function() {
      await funBindOut(fun_execute, undefined, null);
    });

    it('109.2.4 works with NaN', async function() {
      const content = NaN;
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      try {
        await sql.executeSqlWithErr(connection, fun_create, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-011: encountered bind value and type mismatch');
      }
    });

    it('109.2.5 works with extended rowid', async function() {
      await funBindOut(fun_execute, "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('109.2.6 works with restricted rowid', async function() {
      await funBindOut(fun_execute, "00000DD5.0000.0101", "00000DD5.0000.0101");
    });

    it('109.2.7 works with string 0', async function() {
      await funBindOut(fun_execute, "0", "00000000.0000.0000");
    });

    it('109.2.8 works with number 0', async function() {
      const content = 0;
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      try {
        await sql.executeSqlWithErr(connection, fun_create, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-011: encountered bind value and type mismatch');
      }
    });

    it('109.2.9 works with default bind type/dir - extended rowid', async function() {
      await funBindOut_default(fun_execute, "AAAB1+AADAAAAwPAAA", "AAAB1+AADAAAAwPAAA");
    });

    it('109.2.10 works with default bind type/dir - null value', async function() {
      await funBindOut_default(fun_execute, null, null);
    });

    it('109.2.11 works with default bind type/dir - empty string', async function() {
      await funBindOut_default(fun_execute, "", null);
    });

    it('109.2.12 works with default bind type/dir - undefined', async function() {
      await funBindOut_default(fun_execute, undefined, null);
    });

    it('109.2.13 bind error: NJS-037', async function() {
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      try {
        await sql.executeSqlWithErr(connection, fun_create, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-037: invalid data type at array index 0 for bind ":c"');
      }
    });

    it('109.2.14 bind error: NJS-052', async function() {
      const bindVar = [ { type: oracledb.STRING, dir: oracledb.BIND_OUT }, insertID, { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN } ];
      try {
        await sql.executeSqlWithErr(connection, fun_create, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-052: invalid data type at array index 0 for bind position 3');
      }
    });

  });

  describe('109.3 FUNCTION BIND_IN, UPDATE', function() {
    var fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind_1083 (id_in IN NUMBER, content_1 IN STRING, content_2 IN ROWID) RETURN ROWID\n" +
                     "IS \n" +
                     "    tmp rowid; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName + " (id, content) values (id_in, CHARTOROWID(content_1)); \n" +
                     "    update " + tableName + " set content = content_2 where id = id_in; \n" +
                     "    select content into tmp from " + tableName + " where id = id_in; \n" +
                     "    return tmp; \n" +
                     "END; ";
    var fun_exec = "BEGIN :o := nodb_rowid_bind_1083 (:i, :c1, :c2); END;";
    var fun_drop = "DROP FUNCTION nodb_rowid_bind_1083";

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

    it('109.3.1 update null with rowid', async function() {
      await funBindOut_update(fun_exec, null, "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('109.3.2 update empty string with rowid', async function() {
      await funBindOut_update(fun_exec, "", "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('109.3.3 update undefined with rowid', async function() {
      await funBindOut_update(fun_exec, undefined, "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('109.3.4 works with default bind type/dir', async function() {
      await funBindOut_update(fun_exec, "AAAB1+AADAAAAwPAAA", "0", "00000000.0000.0000");
    });

    it('109.3.5 works with default bind type/dir - null value', async function() {
      await funBindOut_update_default(fun_exec, "AAAB12AADAAAAwPAAA", null, null);
    });

    it('109.3.6 works with default bind type/dir - empty string', async function() {
      await funBindOut_update_default(fun_exec, "AAAB12AADAAAAwPAAA", "", null);
    });

    it('109.3.7 works with default bind type/dir - undefined', async function() {
      await funBindOut_update_default(fun_exec, "AAAB12AADAAAAwPAAA", undefined, null);
    });

  });

  var funBindOut = async function(fun_exec, content_in, expected) {
    const bindVar_in = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c: { val: content_in, type: oracledb.STRING, dir: oracledb.BIND_IN },
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
    };
    const result = await connection.execute(fun_exec, bindVar_in);
    assert(result);
    const resultVal = result.outBinds.o;
    assert.strictEqual(resultVal, expected);
  };

  var funBindOut_default = async function(fun_exec, content_in, expected) {
    const bindVar_in = {
      i: insertID,
      c: content_in,
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
    };
    const result = await connection.execute(fun_exec, bindVar_in);
    assert(result);
    const resultVal = result.outBinds.o;
    assert.strictEqual(resultVal, expected);
  };

  var funBindOut_update = async function(fun_exec, content_1, content_2, expected) {
    const bindVar_in = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c1: { val: content_1, type: oracledb.STRING, dir: oracledb.BIND_IN },
      c2: { val: content_2, type: oracledb.STRING, dir: oracledb.BIND_IN },
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
    };
    const result = await connection.execute(fun_exec, bindVar_in);
    assert(result);
    const resultVal = result.outBinds.o;
    assert.strictEqual(resultVal, expected);
  };

  var funBindOut_update_default = async function(fun_exec, content_1, content_2, expected) {
    const bindVar_in = {
      i: insertID,
      c1: content_1,
      c2: content_2,
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
    };
    const result = await connection.execute(fun_exec, bindVar_in);
    assert(result);
    const resultVal = result.outBinds.o;
    assert.strictEqual(resultVal, expected);

  };

});

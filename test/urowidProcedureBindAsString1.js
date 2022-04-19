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
 *   118. urowidProcedureBindAsString1.js
 *
 * DESCRIPTION
 *   Testing UROWID(< 200 bytes) plsql procedure bind in as String.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');
const sql      = require('./sqlClone.js');
describe('118. urowidProcedureBindAsString1.js', function() {
  var connection = null;
  var tableName = "nodb_urowid_plsql_in";
  var insertID = 1;

  var proc_create_table = "BEGIN \n" +
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
                          "            content  UROWID \n" +
                          "        ) \n" +
                          "    '); \n" +
                          "END;  ";
  const drop_table = "DROP TABLE " + tableName + " PURGE";

  before('get connection and create table', async function() {
    try {
      connection = await oracledb.getConnection(dbConfig);
      assert(connection);
      await sql.executeSql(connection, proc_create_table, {}, {});
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

  beforeEach(function() {
    insertID++;
  });

  describe('118.1 PROCEDURE BIND_IN as UROWID', function() {
    var proc_create = "CREATE OR REPLACE PROCEDURE nodb_urowid_bind_in_1081 (id IN NUMBER, content IN UROWID)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName + " (id, content) values (id, CHARTOROWID(content)); \n" +
                      "END nodb_urowid_bind_in_1081; ";
    var proc_execute = "BEGIN nodb_urowid_bind_in_1081 (:i, :c); END;";
    var proc_drop = "DROP PROCEDURE nodb_urowid_bind_in_1081";

    before('create procedure', async function() {
      try {
        await sql.executeSql(connection, proc_create, {}, {});
      } catch (err) {
        assert.fail(err);
      }
    });

    after('drop procedure', async function() {
      try {
        await sql.executeSql(connection, proc_drop, {}, {});
      } catch (err) {
        assert.fail(err);
      }

    });

    it('118.1.1 works with null', async function() {
      await procedureBindIn(proc_execute, null, null);
    });

    it('118.1.2 works with empty string', async function() {
      await procedureBindIn(proc_execute, "", null);
    });

    it('118.1.3 works with undefined', async function() {
      await procedureBindIn(proc_execute, undefined, null);
    });

    it('118.1.4 works with NaN', async function() {
      const content = NaN;
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      try {
        await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-011: encountered bind value and type mismatch');
      }

    });

    it('118.1.5 works with extended ROWID', async function() {
      await procedureBindIn(proc_execute, "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('118.1.6 works with restricted ROWID', async function() {
      await procedureBindIn(proc_execute, "00000DD5.0000.0101", "00000DD5.0000.0101");
    });

    it('118.1.7 works with string 0', async function() {
      const content = "0";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      try {
        await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
      } catch (err) {
        assert.equal(err.message.substring(0, 10), "ORA-01410:");
      }
      // ORA-01410: invalid ROWID
    });

    it('118.1.8 works with number 0', async function() {
      const content = 0;
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      try {
        await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-011: encountered bind value and type mismatch');
      }

    });

    it('118.1.9 works with default bind type/dir - extended ROWID', async function() {
      await procedureBindIn_default(proc_execute, "AAAB1+AADAAAAwPAAA", "AAAB1+AADAAAAwPAAA");
    });

    it('118.1.10 works with default bind type/dir - null value', async function() {
      await procedureBindIn_default(proc_execute, null, null);
    });

    it('118.1.11 works with default bind type/dir - empty string', async function() {
      await procedureBindIn_default(proc_execute, "", null);
    });

    it('118.1.12 works with default bind type/dir - undefined', async function() {
      await procedureBindIn_default(proc_execute, undefined, null);
    });

    it('118.1.13 bind error: NJS-037', async function() {
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      try {
        await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-037: invalid data type at array index 0 for bind ":c"');
      }
    });

    it('118.1.14 bind error: NJS-052', async function() {
      const bindVar = [ insertID, { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN } ];
      try {
        await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-052: invalid data type at array index 0 for bind position 2');
      }
    });

  });

  describe('118.2 PROCEDURE BIND_IN as string', function() {
    var proc_create = "CREATE OR REPLACE PROCEDURE nodb_urowid_bind_in_1082 (id IN NUMBER, content IN VARCHAR2)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName + " (id, content) values (id, CHARTOROWID(content)); \n" +
                      "END nodb_urowid_bind_in_1082; ";
    var proc_execute = "BEGIN nodb_urowid_bind_in_1082 (:i, :c); END;";
    var proc_drop = "DROP PROCEDURE nodb_urowid_bind_in_1082";

    before('create procedure', async function() {
      try {
        await sql.executeSql(connection, proc_create, {}, {});
      } catch (err) {
        assert.ifError(err);
      }
    });

    after('drop procedure', async function() {
      try {
        await sql.executeSql(connection, proc_drop, {}, {});
      } catch (err) {
        assert.ifError(err);
      }
    });

    it('118.2.1 works with null', async function() {
      await procedureBindIn(proc_execute, null, null);
    });

    it('118.2.2 works with empty string', async function() {
      await procedureBindIn(proc_execute, "", null);
    });

    it('118.2.3 works with undefined', async function() {
      await procedureBindIn(proc_execute, undefined, null);
    });

    it('118.2.4 works with NaN', async function() {
      const content = NaN;
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      try {
        await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-011: encountered bind value and type mismatch');
      }
    });

    it('118.2.5 works with extended ROWID', async function() {
      await procedureBindIn(proc_execute, "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('118.2.6 works with restricted ROWID', async function() {
      await procedureBindIn(proc_execute, "00000DD5.0000.0101", "00000DD5.0000.0101");
    });

    it('118.2.7 works with string 0', async function() {
      await procedureBindIn(proc_execute, "0", "00000000.0000.0000");
    });

    it('118.2.8 works with number 0', async function() {
      const content = 0;
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      try {
        await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-011: encountered bind value and type mismatch');
      }
    });

    it('118.2.9 works with default bind type/dir - extended ROWID', async function() {
      await procedureBindIn_default(proc_execute, "AAAB1+AADAAAAwPAAA", "AAAB1+AADAAAAwPAAA");
    });

    it('118.2.10 works with default bind type/dir - null value', async function() {
      await procedureBindIn_default(proc_execute, null, null);
    });

    it('118.2.11 works with default bind type/dir - empty string', async function() {
      await procedureBindIn_default(proc_execute, "", null);
    });

    it('118.2.12 works with default bind type/dir - undefined', async function() {
      await procedureBindIn_default(proc_execute, undefined, null);
    });

    it('118.2.13 bind error: NJS-037', async function() {
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      try {
        await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-037: invalid data type at array index 0 for bind ":c"');
      }
    });

    it('118.2.14 bind error: NJS-052', async function() {
      const bindVar = [ insertID, { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN } ];
      try {
        await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
      } catch (err) {
        assert.strictEqual(err.message, 'NJS-052: invalid data type at array index 0 for bind position 2');
      }

    });
  });
  describe('118.3 PROCEDURE BIND_IN, UPDATE', function() {
    var proc_create = "CREATE OR REPLACE PROCEDURE nodb_urowid_bind_in_1083 (id IN NUMBER, content_1 IN VARCHAR2, content_2 IN UROWID)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName + " (id, content) values (id, CHARTOROWID(content_1)); \n" +
                      "    update " + tableName + " set content = content_2 where id = id; \n" +
                      "END nodb_urowid_bind_in_1083; ";
    var proc_execute = "BEGIN nodb_urowid_bind_in_1083 (:i, :c1, :c2); END;";
    var proc_drop = "DROP PROCEDURE nodb_urowid_bind_in_1083";

    before('create procedure', async function() {
      try {
        await sql.executeSql(connection, proc_create, {}, {});
      } catch (err) {
        assert.fail(err);
      }
    });

    after('drop procedure', async function() {
      try {
        await sql.executeSql(connection, proc_drop, {}, {});
      } catch (err) {
        assert.fail(err);
      }
    });

    it('118.3.1 update null with UROWID', async function() {
      await procedureBindIn_update(proc_execute, null, "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('118.3.2 update empty string with UROWID', async function() {
      await procedureBindIn_update(proc_execute, "", "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('118.3.3 update undefined with UROWID', async function() {
      await procedureBindIn_update(proc_execute, undefined, "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('118.3.4 works with default bind type/dir', async function() {
      const content_1 = "AAAB1+AADAAAAwPAAA";
      const content_2 = "0";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: content_1, type: oracledb.STRING, dir: oracledb.BIND_IN },
        c2: { val: content_2, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      try {
        await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
      } catch (err) {
        assert.equal(err.message.substring(0, 10), "ORA-01410:");
      }
      // ORA-01410: invalid ROWID
    });

    it('118.3.5 works with default bind type/dir - null value', async function() {
      await procedureBindIn_update_default(proc_execute, "AAAB12AADAAAAwPAAA", null, null);
    });

    it('118.3.6 works with default bind type/dir - empty string', async function() {
      await procedureBindIn_update_default(proc_execute, "AAAB12AADAAAAwPAAA", "", null);
    });

    it('118.3.7 works with default bind type/dir - undefined', function() {
      procedureBindIn_update_default(proc_execute, "AAAB12AADAAAAwPAAA", undefined, null);
    });

  });

  var procedureBindIn = async function(proc_execute, content_in, expected) {
    const bindVar_in = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c: { val: content_in, type: oracledb.STRING, dir: oracledb.BIND_IN }
    };
    var option_in = { autoCommit: true };
    try {
      await sql.executeSql(connection, proc_execute, bindVar_in, option_in);
    } catch (err) {
      assert.fail(err);
    }

    const sql_query = "select * from " + tableName + " where id = " + insertID;
    const result = await connection.execute(sql_query);
    assert(result);
    const resultVal = result.rows[0][1];
    assert.strictEqual(resultVal, expected);

  };

  var procedureBindIn_default = async function(proc_execute, content_in, expected) {
    try {
      const option_in = { autoCommit: true };
      var bindVar_in = {
        i: insertID,
        c: content_in
      };
      await sql.executeSql(connection, proc_execute, bindVar_in, option_in);

      var sql_query = "select * from " + tableName + " where id = " + insertID;
      var result = await connection.execute(sql_query);
      var resultVal = result.rows[0][1];
      assert.strictEqual(resultVal, expected);
      insertID++;
      bindVar_in = [ insertID, content_in ];
      await sql.executeSql(connection, proc_execute, bindVar_in, option_in);
      sql_query = "select * from " + tableName + " where id = " + insertID;
      result = await connection.execute(sql_query);
      resultVal = result.rows[0][1];
      assert.strictEqual(resultVal, expected);
    } catch (err) {
      assert.fail(err);
    }
  };

  var procedureBindIn_update = async function(proc_execute, content_1, content_2, expected) {
    try {
      const bindVar_in = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: content_1, type: oracledb.STRING, dir: oracledb.BIND_IN },
        c2: { val: content_2, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      const option_in = { autoCommit: true };

      await sql.executeSql(connection, proc_execute, bindVar_in, option_in);

      const sql_query = "select * from " + tableName + " where id = " + insertID;
      const result = await connection.execute(sql_query);
      assert(result);
      const resultVal = result.rows[0][1];
      assert.strictEqual(resultVal, expected);
    } catch (err) {
      assert.fail(err);
    }
  };

  var procedureBindIn_update_default = async function(proc_execute, content_1, content_2, expected) {
    try {
      const option_in = { autoCommit: true };
      var bindVar_in = {
        i: insertID,
        c1: content_1,
        c2: content_2
      };
      await sql.executeSql(connection, proc_execute, bindVar_in, option_in);
      var sql_query = "select * from " + tableName + " where id = " + insertID;
      var result = await connection.execute(sql_query);
      var resultVal = result.rows[0][1];
      assert.strictEqual(resultVal, expected);
      insertID++;

      bindVar_in = [ insertID, content_1, content_2 ];
      await sql.executeSql(connection, proc_execute, bindVar_in, option_in);
      sql_query = "select * from " + tableName + " where id = " + insertID;
      result = await  connection.execute(sql_query);

      resultVal = result.rows[0][1];
      assert.strictEqual(resultVal, expected);
    } catch (err) {
      assert.fail(err);
    }
  };

});

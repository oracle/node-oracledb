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
 *   110. rowidProcedureBindAsString_bindout.js
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
const testsUtil = require('./testsUtil.js');

describe('110. rowidProcedureBindAsString_bindout.js', function() {
  let connection = null;
  let tableName = "nodb_rowid_plsql_out";
  let insertID = 1;

  let proc_create_table = "BEGIN \n" +
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
  let drop_table = "DROP TABLE " + tableName + " PURGE";

  before('get connection and create table', async function() {

    connection = await oracledb.getConnection(dbConfig);
    assert(connection);
    await sql.executeSql(connection, proc_create_table, {}, {});
  });

  after('release connection', async function() {

    await sql.executeSql(connection, drop_table, {}, {});
    await connection.release();
  });

  beforeEach(function() {
    insertID++;

  });

  describe('110.1 PROCEDURE BIND_OUT as rowid', function() {
    let proc_create = "CREATE OR REPLACE PROCEDURE nodb_rowid_bind_out (id_in IN NUMBER, content_in IN ROWID, content_out OUT ROWID)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName + " (id, content) values (id_in, CHARTOROWID(content_in)); \n" +
                      "    select content into content_out from " + tableName + " where id = id_in; \n" +
                      "END nodb_rowid_bind_out; ";
    let proc_execute = "BEGIN nodb_rowid_bind_out (:i, :c, :o); END;";
    let proc_drop = "DROP PROCEDURE nodb_rowid_bind_out";

    before('create procedure', async function() {
      await sql.executeSql(connection, proc_create, {}, {});
    });

    after('drop procedure', async function() {
      await sql.executeSql(connection, proc_drop, {}, {});
    });

    it('110.1.1 works with null', async function() {
      await procedureBindOut(proc_execute, null, null);
    });

    it('110.1.2 works with empty string', async function() {
      await procedureBindOut(proc_execute, "", null);
    });

    it('110.1.3 works with undefined', async function() {
      await procedureBindOut(proc_execute, undefined, null);
    });

    it('110.1.4 works with NaN', async function() {
      let content = NaN;
      let bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      await testsUtil.assertThrowsAsync(
        async () => {
          await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
        },
        /NJS-011:/
      );
    });

    it('110.1.5 works with extended rowid', async function() {
      await procedureBindOut(proc_execute, "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('110.1.6 works with restricted rowid', async function() {
      await procedureBindOut(proc_execute, "00000DD5.0000.0101", "00000DD5.0000.0101");
    });

    it('110.1.7 works with string 0', async function() {
      await procedureBindOut(proc_execute, "0", "00000000.0000.0000");
    });

    it('110.1.8 works with number 0', async function() {
      let content = 0;
      let bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      await testsUtil.assertThrowsAsync(
        async () => {
          await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
        },
        /NJS-011:/
      );
    });

    it('110.1.9 works with default bind type/dir - extended rowid', async function() {
      await procedureBindOut_default(proc_execute, "AAAB1+AADAAAAwPAAA", "AAAB1+AADAAAAwPAAA");
    });

    it('110.1.10 works with default bind type/dir - null value', async function() {
      await procedureBindOut_default(proc_execute, null, null);
    });

    it('110.1.11 works with default bind type/dir - empty string', async function() {
      await procedureBindOut_default(proc_execute, "", null);
    });

    it('110.1.12 works with default bind type/dir - undefined', async function() {
      await procedureBindOut_default(proc_execute, undefined, null);
    });

    it('110.1.13 bind error: NJS-037', async function() {
      let bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      await testsUtil.assertThrowsAsync(
        async () => {
          await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
        },
        /NJS-037:/
      );
    });

    it('110.1.14 bind error: NJS-052', async function() {
      let bindVar = [ insertID, { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN }, { type: oracledb.STRING, dir: oracledb.BIND_OUT } ];
      await testsUtil.assertThrowsAsync(
        async () => {
          await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
        },
        /NJS-052:/
      );
    });

  });

  describe('110.2 PROCEDURE BIND_OUT as string', function() {
    let proc_create = "CREATE OR REPLACE PROCEDURE nodb_rowid_bind_out (id_in IN NUMBER, content_in IN ROWID, content_out OUT VARCHAR2)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName + " (id, content) values (id_in, CHARTOROWID(content_in)); \n" +
                      "    select content into content_out from " + tableName + " where id = id_in; \n" +
                      "END nodb_rowid_bind_out; ";
    let proc_execute = "BEGIN nodb_rowid_bind_out (:i, :c, :o); END;";
    let proc_drop = "DROP PROCEDURE nodb_rowid_bind_out";

    before('create procedure', async function() {
      await sql.executeSql(connection, proc_create, {}, {});
    });

    after('drop procedure', async function() {
      await sql.executeSql(connection, proc_drop, {}, {});
    });

    it('110.2.1 works with null', async function() {
      await procedureBindOut(proc_execute, null, null);
    });

    it('110.2.2 works with empty string', async function() {
      await procedureBindOut(proc_execute, "", null);
    });

    it('110.2.3 works with undefined', async function() {
      await procedureBindOut(proc_execute, undefined, null);
    });

    it('110.2.4 works with NaN', async function() {
      let content = NaN;
      let bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      await testsUtil.assertThrowsAsync(
        async () => {
          await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
        },
        /NJS-011:/
      );
    });

    it('110.2.5 works with extended rowid', async function() {
      await procedureBindOut(proc_execute, "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('110.2.6 works with restricted rowid', async function() {
      await procedureBindOut(proc_execute, "00000DD5.0000.0101", "00000DD5.0000.0101");
    });

    it('110.2.7 works with string 0', async function() {
      await procedureBindOut(proc_execute, "0", "00000000.0000.0000");
    });

    it('110.2.8 works with number 0', async function() {
      let content = 0;
      let bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      await testsUtil.assertThrowsAsync(
        async () => {
          await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
        },
        /NJS-011:/
      );
    });

    it('110.2.9 works with default bind type/dir - extended rowid', async function() {
      await procedureBindOut_default(proc_execute, "AAAB1+AADAAAAwPAAA", "AAAB1+AADAAAAwPAAA");
    });

    it('110.2.10 works with default bind type/dir - null value', async function() {
      await procedureBindOut_default(proc_execute, null, null);
    });

    it('110.2.11 works with default bind type/dir - empty string', async function() {
      await procedureBindOut_default(proc_execute, "", null);
    });

    it('110.2.12 works with default bind type/dir - undefined', async function() {
      await procedureBindOut_default(proc_execute, undefined, null);
    });

    it('110.2.13 bind error: NJS-037', async function() {
      let bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      await testsUtil.assertThrowsAsync(
        async () => {
          await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
        },
        /NJS-037:/
      );
    });

    it('110.2.14 bind error: NJS-052', async function() {
      let bindVar = [ insertID, { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN }, { type: oracledb.STRING, dir: oracledb.BIND_OUT } ];
      await testsUtil.assertThrowsAsync(
        async () => {
          await sql.executeSqlWithErr(connection, proc_execute, bindVar, {});
        },
        /NJS-052:/
      );
    });

  });

  describe('110.3 PROCEDURE BIND_IN, UPDATE', function() {
    let proc_create = "CREATE OR REPLACE PROCEDURE nodb_rowid_bind_1083 (id_in IN NUMBER, content_1 IN STRING, content_2 IN ROWID, content_out OUT ROWID)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName + " (id, content) values (id_in, CHARTOROWID(content_1)); \n" +
                      "    update " + tableName + " set content = content_2 where id = id_in; \n" +
                      "    select content into content_out from " + tableName + " where id = id_in; \n" +
                      "END nodb_rowid_bind_1083; ";
    let proc_execute = "BEGIN nodb_rowid_bind_1083 (:i, :c1, :c2, :o); END;";
    let proc_drop = "DROP PROCEDURE nodb_rowid_bind_1083";

    before('create procedure', async function() {
      await sql.executeSql(connection, proc_create, {}, {});
    });

    after('drop procedure', async function() {
      await sql.executeSql(connection, proc_drop, {}, {});
    });

    it('110.3.1 update null with rowid', async function() {
      await procedureBindOut_update(proc_execute, null, "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('110.3.2 update empty string with rowid', async function() {
      await procedureBindOut_update(proc_execute, "", "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('110.3.3 update undefined with rowid', async function() {
      await procedureBindOut_update(proc_execute, undefined, "AAAB12AADAAAAwPAAA", "AAAB12AADAAAAwPAAA");
    });

    it('110.3.4 works with default bind type/dir', async function() {
      await procedureBindOut_update(proc_execute, "AAAB1+AADAAAAwPAAA", "0", "00000000.0000.0000");
    });

    it('110.3.5 works with default bind type/dir - null value', async function() {
      await procedureBindOut_update_default(proc_execute, "AAAB12AADAAAAwPAAA", null, null);
    });

    it('110.3.6 works with default bind type/dir - empty string', async function() {
      await procedureBindOut_update_default(proc_execute, "AAAB12AADAAAAwPAAA", "", null);
    });

    it('110.3.7 works with default bind type/dir - undefined', async function() {
      await procedureBindOut_update_default(proc_execute, "AAAB12AADAAAAwPAAA", undefined, null);
    });

  });

  let procedureBindOut = async function(proc_execute, content_in, expected) {
    let bindVar_out = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c: { val: content_in, type: oracledb.STRING, dir: oracledb.BIND_IN },
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
    };
    let result = await connection.execute(proc_execute, bindVar_out);
    assert(result);
    assert.strictEqual(result.outBinds.o, expected);
  };

  let procedureBindOut_default = async function(proc_execute, content_in, expected) {
    let bindVar_out = {
      i: insertID,
      c: content_in,
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
    };
    let result = await connection.execute(proc_execute, bindVar_out);
    assert(result);
    assert.strictEqual(result.outBinds.o, expected);
  };

  let procedureBindOut_update = async function(proc_execute, content_1, content_2, expected) {
    let bindVar_in = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c1: { val: content_1, type: oracledb.STRING, dir: oracledb.BIND_IN },
      c2: { val: content_2, type: oracledb.STRING, dir: oracledb.BIND_IN },
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
    };
    let result = await connection.execute(proc_execute, bindVar_in);
    assert(result);
    assert.strictEqual(result.outBinds.o, expected);
  };

  let procedureBindOut_update_default = async function(proc_execute, content_1, content_2, expected) {
    let bindVar_in = {
      i: insertID,
      c1: content_1,
      c2: content_2,
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
    };
    let result = await connection.execute(proc_execute, bindVar_in);
    assert(result);
    assert.strictEqual(result.outBinds.o, expected);

  };
});

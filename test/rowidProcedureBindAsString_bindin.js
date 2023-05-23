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
 *   108. rowidProcedureBindAsString_bindin.js
 *
 * DESCRIPTION
 *   Testing rowid plsql bind as String.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('108. rowidProcedureBindAsString_bindin.js', function() {
  let connection;
  const tableName = "nodb_rowid_plsql_in";
  let insertID = 1;

  const proc_create_table = "BEGIN \n" +
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
    await connection.execute(proc_create_table);
  });

  after('release connection', async function() {
    await connection.execute(drop_table);
    await connection.close();
  });

  beforeEach(function() {
    insertID++;
  });

  describe('108.1 PROCEDURE BIND_IN as rowid', function() {
    const proc_create = "CREATE OR REPLACE PROCEDURE nodb_rowid_bind_in_1081 (id IN NUMBER, content IN ROWID)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName + " (id, content) values (id, CHARTOROWID(content)); \n" +
                      "END nodb_rowid_bind_in_1081; ";
    const proc_execute = "BEGIN nodb_rowid_bind_in_1081 (:i, :c); END;";
    const proc_drop = "DROP PROCEDURE nodb_rowid_bind_in_1081";

    before('create procedure', async function() {
      await connection.execute(proc_create);
    });

    after('drop procedure', async function() {
      await connection.execute(proc_drop);
    });

    it('108.1.1 works with null', async function() {
      const content = null;
      await procedureBindIn(proc_execute, content, content);
    });

    it('108.1.2 works with empty string', async function() {
      const content = "";
      await procedureBindIn(proc_execute, content, null);
    });

    it('108.1.3 works with undefined', async function() {
      const content = undefined;
      await procedureBindIn(proc_execute, content, null);
    });

    it('108.1.4 works with NaN', async function() {
      const content = NaN;
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      await assert.rejects(
        async () => await connection.execute(proc_execute, bindVar),
        /NJS-011:/
      );
    });

    it('108.1.5 works with extended rowid', async function() {
      const content = "AAAB12AADAAAAwPAAA";
      await procedureBindIn(proc_execute, content, content);
    });

    it('108.1.6 works with restricted rowid', async function() {
      if (oracledb.thin)
        return this.skip();
      const content = "00000DD5.0000.0101";
      await procedureBindIn(proc_execute, content, content);
    });

    it('108.1.7 works with string 0', async function() {
      if (oracledb.thin)
        return this.skip();
      const content = "0";
      await procedureBindIn(proc_execute, content, "00000000.0000.0000");
    });

    it('108.1.8 works with number 0', async function() {
      const content = 0;
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      await assert.rejects(
        async () => await connection.execute(proc_execute, bindVar),
        /NJS-011:/
      );
    });

    it('108.1.9 works with default bind type/dir - extended rowid', async function() {
      const content = "AAAB1+AADAAAAwPAAA";
      await procedureBindIn_default(proc_execute, content, content);
    });

    it('108.1.10 works with default bind type/dir - null value', async function() {
      const content = null;
      await procedureBindIn_default(proc_execute, content, content);
    });

    it('108.1.11 works with default bind type/dir - empty string', async function() {
      const content = "";
      await procedureBindIn_default(proc_execute, content, null);
    });

    it('108.1.12 works with default bind type/dir - undefined', async function() {
      const content = undefined;
      await procedureBindIn_default(proc_execute, content, null);
    });

    it('108.1.13 bind error: NJS-037', async function() {
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      await assert.rejects(
        async () => await connection.execute(proc_execute, bindVar),
        /NJS-037:/
      );
    });

    it('108.1.14 bind error: NJS-052', async function() {
      const bindVar = [ insertID, { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN } ];
      await assert.rejects(
        async () => await connection.execute(proc_execute, bindVar),
        /NJS-052:/
      );
    });

  });

  describe('108.2 PROCEDURE BIND_IN as string', function() {
    const proc_create = "CREATE OR REPLACE PROCEDURE nodb_rowid_bind_in_1082 (id IN NUMBER, content IN VARCHAR2)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName + " (id, content) values (id, CHARTOROWID(content)); \n" +
                      "END nodb_rowid_bind_in_1082; ";
    const proc_execute = "BEGIN nodb_rowid_bind_in_1082 (:i, :c); END;";
    const proc_drop = "DROP PROCEDURE nodb_rowid_bind_in_1082";

    before('create procedure', async function() {
      await connection.execute(proc_create);
    });

    after('drop procedure', async function() {
      await connection.execute(proc_drop);
    });

    it('108.2.1 works with null', async function() {
      const content = null;
      await procedureBindIn(proc_execute, content, content);
    });

    it('108.2.2 works with empty string', async function() {
      const content = "";
      await procedureBindIn(proc_execute, content, null);
    });

    it('108.2.3 works with undefined', async function() {
      const content = undefined;
      await procedureBindIn(proc_execute, content, null);
    });

    it('108.2.4 works with NaN', async function() {
      const content = NaN;
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      await assert.rejects(
        async () => await connection.execute(proc_execute, bindVar),
        /NJS-011:/
      );
    });

    it('108.2.5 works with extended rowid', async function() {
      const content = "AAAB12AADAAAAwPAAA";
      await procedureBindIn(proc_execute, content, content);
    });

    it('108.2.6 works with restricted rowid', async function() {
      if (oracledb.thin)
        return this.skip();
      const content = "00000DD5.0000.0101";
      await procedureBindIn(proc_execute, content, content);
    });

    it('108.2.7 works with string 0', async function() {
      if (oracledb.thin)
        return this.skip();
      const content = "0";
      await procedureBindIn(proc_execute, content, "00000000.0000.0000");
    });

    it('108.2.8 works with number 0', async function() {
      const content = 0;
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      await assert.rejects(
        async () => await connection.execute(proc_execute, bindVar),
        /NJS-011:/
      );
    });

    it('108.2.9 works with default bind type/dir - extended rowid', async function() {
      const content = "AAAB1+AADAAAAwPAAA";
      await procedureBindIn_default(proc_execute, content, content);
    });

    it('108.2.10 works with default bind type/dir - null value', async function() {
      const content = null;
      await procedureBindIn_default(proc_execute, content, content);
    });

    it('108.2.11 works with default bind type/dir - empty string', async function() {
      const content = "";
      await procedureBindIn_default(proc_execute, content, null);
    });

    it('108.2.12 works with default bind type/dir - undefined', async function() {
      const content = undefined;
      await procedureBindIn_default(proc_execute, content, null);
    });

    it('108.2.13 bind error: NJS-037', async function() {
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      await assert.rejects(
        async () => await connection.execute(proc_execute, bindVar),
        /NJS-037:/
      );
    });

    it('108.2.14 bind error: NJS-052', async function() {
      const bindVar = [ insertID, { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN } ];
      await assert.rejects(
        async () => await connection.execute(proc_execute, bindVar),
        /NJS-052:/
      );
    });

  });

  describe('108.3 PROCEDURE BIND_IN, UPDATE', function() {
    const proc_create = "CREATE OR REPLACE PROCEDURE nodb_rowid_bind_in_1083 (id IN NUMBER, content_1 IN VARCHAR2, content_2 IN ROWID)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName + " (id, content) values (id, CHARTOROWID(content_1)); \n" +
                      "    update " + tableName + " set content = content_2 where id = id; \n" +
                      "END nodb_rowid_bind_in_1083; ";
    const proc_execute = "BEGIN nodb_rowid_bind_in_1083 (:i, :c1, :c2); END;";
    const proc_drop = "DROP PROCEDURE nodb_rowid_bind_in_1083";

    before('create procedure', async function() {
      await connection.execute(proc_create);
    });

    after('drop procedure', async function() {
      await connection.execute(proc_drop);
    });

    it('108.3.1 update null with rowid', async function() {
      const content_1 = null;
      const content_2 = "AAAB12AADAAAAwPAAA";
      await procedureBindIn_update(proc_execute, content_1, content_2, content_2);
    });

    it('108.3.2 update empty string with rowid', async function() {
      const content_1 = "";
      const content_2 = "AAAB12AADAAAAwPAAA";
      await procedureBindIn_update(proc_execute, content_1, content_2, content_2);
    });

    it('108.3.3 update undefined with rowid', async function() {
      const content_1 = undefined;
      const content_2 = "AAAB12AADAAAAwPAAA";
      await procedureBindIn_update(proc_execute, content_1, content_2, content_2);
    });

    it('108.3.4 works with default bind type/dir', async function() {
      if (oracledb.thin)
        return this.skip();
      const content_1 = "AAAB1+AADAAAAwPAAA";
      const content_2 = "0";
      await procedureBindIn_update(proc_execute, content_1, content_2, "00000000.0000.0000");
    });

    it('108.3.5 works with default bind type/dir - null value', async function() {
      const content_1 = "AAAB12AADAAAAwPAAA";
      const content_2 = null;
      await procedureBindIn_update_default(proc_execute, content_1, content_2, null);
    });

    it('108.3.6 works with default bind type/dir - empty string', async function() {
      const content_1 = "AAAB12AADAAAAwPAAA";
      const content_2 = "";
      await procedureBindIn_update_default(proc_execute, content_1, content_2, null);
    });

    it('108.3.7 works with default bind type/dir - undefined', async function() {
      const content_1 = "AAAB12AADAAAAwPAAA";
      const content_2 = undefined;
      await procedureBindIn_update_default(proc_execute, content_1, content_2, null);
    });

  });

  const procedureBindIn = async function(proc_execute, content_in, expected) {
    const bindVar_in = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c: { val: content_in, type: oracledb.STRING, dir: oracledb.BIND_IN }
    };
    const option_in = { autoCommit: true };
    await connection.execute(proc_execute, bindVar_in, option_in);
    const sql = "select * from " + tableName + " where id = " + insertID;
    const result = await connection.execute(sql);
    const resultVal = result.rows[0][1];
    assert.strictEqual(resultVal, expected);
  };

  const procedureBindIn_default = async function(proc_execute, content_in, expected) {
    const option_in = { autoCommit: true };
    let bindVar_in = {
      i: insertID,
      c: content_in
    };
    await connection.execute(proc_execute, bindVar_in, option_in);
    let sql = "select * from " + tableName + " where id = " + insertID;
    let result = await connection.execute(sql);
    let resultVal = result.rows[0][1];
    assert.strictEqual(resultVal, expected);
    insertID++;
    bindVar_in = [ insertID, content_in ];
    await connection.execute(proc_execute, bindVar_in, option_in);
    sql = "select * from " + tableName + " where id = " + insertID;
    result = await connection.execute(sql);
    resultVal = result.rows[0][1];
    assert.strictEqual(resultVal, expected);
  };

  const procedureBindIn_update = async function(proc_execute, content_1, content_2, expected) {
    const bindVar_in = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c1: { val: content_1, type: oracledb.STRING, dir: oracledb.BIND_IN },
      c2: { val: content_2, type: oracledb.STRING, dir: oracledb.BIND_IN }
    };
    const option_in = { autoCommit: true };
    await connection.execute(proc_execute, bindVar_in, option_in);
    const sql = "select * from " + tableName + " where id = " + insertID;
    const result = await connection.execute(sql);
    const resultVal = result.rows[0][1];
    assert.strictEqual(resultVal, expected);
  };

  const procedureBindIn_update_default = async function(proc_execute, content_1, content_2, expected) {
    const option_in = { autoCommit: true };
    let bindVar_in = {
      i: insertID,
      c1: content_1,
      c2: content_2
    };
    await connection.execute(proc_execute, bindVar_in, option_in);
    let sql = "select * from " + tableName + " where id = " + insertID;
    let result = await connection.execute(sql);
    let resultVal = result.rows[0][1];
    assert.strictEqual(resultVal, expected);
    insertID++;
    bindVar_in = [ insertID, content_1, content_2 ];
    await connection.execute(proc_execute, bindVar_in, option_in);
    sql = "select * from " + tableName + " where id = " + insertID;
    result = await connection.execute(sql);
    resultVal = result.rows[0][1];
    assert.strictEqual(resultVal, expected);
  };

});

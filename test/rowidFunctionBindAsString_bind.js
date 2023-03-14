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
 *   109. rowidFunctionBindAsString_bind.js
 *
 * DESCRIPTION
 *   Testing rowid plsql bind as String.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('109. rowidFunctionBindAsString_bind.js', function() {
  let connection = null;
  const tableName = "nodb_rowid_plsql_in";
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
    await connection.execute(fun_create_table);
  });

  after('release connection', async function() {
    await connection.execute(drop_table);
    await connection.close();
  });

  beforeEach(function() {
    insertID++;
  });

  describe('109.1 FUNCTION BIND_IN/OUT as rowid', function() {
    const fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind (ID_in IN NUMBER, content_in IN ROWID) RETURN ROWID\n" +
                     "IS \n" +
                     "    tmp rowid; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName + " (id, content) values (ID_in, CHARTOROWID(content_in)); \n" +
                     "    select content into tmp from " + tableName + " where id = ID_in; \n" +
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
      await assert.rejects(
        async () => await connection.execute(fun_create, bindVar),
        /NJS-011:/ // 'NJS-011: encountered bind value and type mismatch'
      );
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
      const content = 0;
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      await assert.rejects(
        async () => await connection.execute(fun_create, bindVar),
        /NJS-011:/ // 'NJS-011: encountered bind value and type mismatch'
      );
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
      await assert.rejects(
        async () => await connection.execute(fun_create, bindVar),
        /NJS-037:/ // 'NJS-037: invalid data type at array index 0 for bind ":c"'
      );
    });

    it('109.1.14 bind error: NJS-052', async function() {
      const bindVar = [ { type: oracledb.STRING, dir: oracledb.BIND_OUT }, insertID, { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN } ];
      await assert.rejects(
        async () => await connection.execute(fun_create, bindVar),
        /NJS-052:/ // 'NJS-052: invalid data type at array index 0 for bind position 3'
      );
    });

  });

  describe('109.2 FUNCTION BIND_IN/OUT as string', function() {
    const fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind (id_in IN NUMBER, content_in IN ROWID) RETURN VARCHAR2\n" +
                     "IS \n" +
                     "    tmp rowid; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName + " (id, content) values (id_in, CHARTOROWID(content_in)); \n" +
                     "    select content into tmp from " + tableName + " where id = id_in; \n" +
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
      await assert.rejects(
        async () => await connection.execute(fun_create, bindVar),
        /NJS-011:/ // 'NJS-011: encountered bind value and type mismatch'
      );
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
      await assert.rejects(
        async () => await connection.execute(fun_create, bindVar),
        /NJS-011:/ // 'NJS-011: encountered bind value and type mismatch'
      );
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
      await assert.rejects(
        async () => await connection.execute(fun_create, bindVar),
        /NJS-037:/ // 'NJS-037: invalid data type at array index 0 for bind ":c"'
      );
    });

    it('109.2.14 bind error: NJS-052', async function() {
      const bindVar = [ { type: oracledb.STRING, dir: oracledb.BIND_OUT }, insertID, { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN } ];
      await assert.rejects(
        async () => await connection.execute(fun_create, bindVar),
        /NJS-052:/ // 'NJS-052: invalid data type at array index 0 for bind position 3'
      );
    });

  });

  describe('109.3 FUNCTION BIND_IN, UPDATE', function() {
    const fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind_1083 (id_in IN NUMBER, content_1 IN STRING, content_2 IN ROWID) RETURN ROWID\n" +
                     "IS \n" +
                     "    tmp rowid; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName + " (id, content) values (id_in, CHARTOROWID(content_1)); \n" +
                     "    update " + tableName + " set content = content_2 where id = id_in; \n" +
                     "    select content into tmp from " + tableName + " where id = id_in; \n" +
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

  const funBindOut = async function(fun_exec, content_in, expected) {
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

  const funBindOut_default = async function(fun_exec, content_in, expected) {
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

  const funBindOut_update = async function(fun_exec, content_1, content_2, expected) {
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

  const funBindOut_update_default = async function(fun_exec, content_1, content_2, expected) {
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

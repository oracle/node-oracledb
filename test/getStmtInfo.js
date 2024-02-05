/* Copyright (c) 2018, 2023, Oracle and/or its affiliates. */

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
 *   162. getStmtInfo.js
 *
 * DESCRIPTION
 *   Test parsing a statement and returns information about it.
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');
const testsUtil = require('./testsUtil.js');

describe('162. getStmtInfo.js', function() {

  let conn;
  const tableName = "nodb_number";
  const numbers = assist.data.numbers;

  before(async function() {
    conn = await oracledb.getConnection(dbConfig);
    await assist.setUp(conn, tableName, numbers);
  });

  after(async function() {
    await testsUtil.dropTable(conn, tableName);
    await conn.close();
  });

  it('162.1 SELECT', async function() {
    const sql = "select 1 as col from dual";
    const info = await conn.getStatementInfo(sql);
    delete info.metaData[0].converter;
    assert.deepStrictEqual(info,
      { bindNames: [], statementType: oracledb.STMT_TYPE_SELECT,
        metaData: [
          {
            dbType: oracledb.DB_TYPE_NUMBER,
            dbTypeName: "NUMBER",
            fetchType: oracledb.DB_TYPE_NUMBER,
            name: "COL",
            nullable: true,
            precision: 0,
            scale: -127,
            isJson: false,
            isOson: false
          }
        ]
      }
    );
  }); // 162.1

  it('162.2 SELECT with data bind', async function() {
    const sql = "select 1 from dual where :b > 99";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ['B']);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_SELECT);
  }); // 162.2

  it('162.3 unknown statement', async function() {
    const sql = "purge recyclebin";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, []);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_UNKNOWN);
  }); // 162.3

  it('162.4 Negative - unknown statement, invalid SQL', async function() {
    const sql = "purge recyclebinx";
    await assert.rejects(
      async () => await conn.getStatementInfo(sql),
      /ORA-38302:/
    );
    // ORA-38302: invalid PURGE option
  }); // 162.4

  it('162.5 UPDATE with data bind', async function() {
    const sql = "UPDATE nodb_number SET content = :c WHERE num = :n RETURNING num INTO :rn";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ['C', 'N', 'RN']);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_UPDATE);
  }); // 162.5

  it('162.6 UPDATE and verify changes do not happen', async function() {
    const sql = "UPDATE nodb_number SET content = content + 1";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, []);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_UPDATE);
    await assist.dataTypeSupport(conn, tableName, numbers);
  }); // 162.6

  it('162.7 DELETE with data bind', async function() {
    const sql = "DELETE FROM nodb_number WHERE num = :n";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ['N']);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_DELETE);
  }); // 162.7

  it('162.8 DELETE and verify changes do not happen', async function() {
    const sql = "DELETE FROM nodb_number";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, []);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_DELETE);
    await assist.dataTypeSupport(conn, tableName, numbers);
  }); // 162.8

  it('162.9 DELETE with subquery', async function() {
    const sql = "delete from (select * from nodb_number) where num > :n";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ['N']);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_DELETE);
  }); // 162.9

  it('162.10 INSERT with data bind', async function() {
    const sql = "insert into nodb_number (num, content) values (999, 999999) returning num into :n";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ['N']);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_INSERT);
  }); // 162.10

  it('162.11 INSERT and verify', async function() {
    let sql = "insert into nodb_number values (666, 1234)";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, []);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_INSERT);
    sql = "select content from nodb_number where num = 666";
    const result = await conn.execute(sql);
    assert.deepStrictEqual(result.rows, []);
  }); // 162.11

  it('162.12 Negative - insert nonexistent table', async function() {

    const sql = "insert into nonexistence values (:xxx) returning dummy into :kk";
    await assert.rejects(
      async () => await conn.getStatementInfo(sql),
      /ORA-00942:/
    );
    // ORA-00942: table or view does not exist
  }); // 162.12

  it('162.13 Negative - INSERT with invalid SQL', async function() {

    const sql = "insert into nodb_number values (:x, :y, :z) returning num into :n";
    await assert.rejects(
      async () => await conn.getStatementInfo(sql),
      /ORA-00913:/
    );
    // ORA-00913: too many values
  }); // 162.13

  it('162.14 CREATE and verify the data does not get created', async function() {
    await testsUtil.dropTable(conn, "nodb_test_162_14");
    let sql = "create table nodb_test_162_14 (a number)";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, []);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_CREATE);
    sql = "insert into nodb_test_162_14 values (89)";
    await assert.rejects(
      async () => await conn.execute(sql),
      /ORA-00942:/
    );
  }); // 162.14

  it('162.15 CREATE procedure', async function() {
    await testsUtil.dropSource(conn, "procedure", "nodb_proc_162_15");
    let proc = "CREATE OR REPLACE PROCEDURE nodb_proc_162_15 (str OUT STRING) \n" +
                   "AS \n" +
                   "BEGIN \n" +
                   "    str := 'E2'; \n" +
                   "END;";
    const info = await conn.getStatementInfo(proc);
    assert.deepStrictEqual(info.bindNames, []);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_CREATE);
    proc = "begin nodb_proc_162_15(:out); end;";
    const binds = { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } };
    await assert.rejects(
      async () => await conn.execute(proc, binds),
      /ORA-06550:/
    );
  }); // 162.15

  it('162.16 CREATE, DDL statements are not parsed, so syntax errors in them will not be reported.', async function() {
    const sql = "create table nodb_foo (:b number)";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, []);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_CREATE);
  }); // 162.16

  it('162.17 DROP', async function() {
    const tab = "nodb_date";
    const sql = "drop table " + tab + " purge";
    await assist.createTable(conn, tab);
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, []);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_DROP);
    await conn.execute(sql);
  }); // 162.17

  it('162.18 ALTER', async function() {
    const sql = "alter session set nls_date_format = 'YYYY-MM-DD'";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, []);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_ALTER);
  }); // 162.18

  it('162.19 ALTER with data bind', async function() {
    const sql = "ALTER SESSION SET TIME_ZONE=':B'";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, []);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_ALTER);
  }); // 162.19

  it('162.20 ALTER, invalid statement', async function() {
    const sql = "ALTER SESSION SET :B = 'UTC'";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, []);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_ALTER);
  });

  it('162.21 BEGIN', async function() {
    const sql = "BEGIN NULL; END;";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, []);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_BEGIN);
  });

  it('162.22 BEGIN with data bind', async function() {
    const sql = "BEGIN :out := lpad('A', 200, 'x'); END;";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, [ "OUT" ]);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_BEGIN);
  });

  it('162.23 DECLARE', async function() {
    const sql = "declare var_tem number(6); begin null; end;";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, []);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_DECLARE);
  });

  it('162.24 COMMIT', async function() {
    const info = await conn.getStatementInfo("commit");
    assert.deepStrictEqual(info.bindNames, []);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_COMMIT);
  });

  it('162.25 ROLLBACK', async function() {
    const info = await conn.getStatementInfo("rollback");
    assert.deepStrictEqual(info.bindNames, []);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_ROLLBACK);
  });

  it('162.26 TRUNCATE', async function() {
    const sql = "truncate table nodb_number";
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, []);
    assert.strictEqual(info.statementType, oracledb.STMT_TYPE_UNKNOWN);
  });

  it('162.27 test various quoted bind names', async function() {

    const in_values = ["percent%", "q?marks", "percent%(ens)yah", "per % cent", "per cent", "par(ens)", "more/slashes", "%percent", "/slashes/", "1col:on", "col:ons", "more :: %colons%", "more/slashes", "spaces % more spaces"];
    await Promise.all(in_values.map(async function(element) {
      const sql = "select :\"" + element + "\" from dual";
      const info = await conn.getStatementInfo(sql);
      assert.deepStrictEqual(info.bindNames, [element]);
    }));
  }); // 162.27

  it('162.28 PL/SQL block bindname following newline character', async function() {
    const sql = `
    -- COMMENTS
    select :Öobject_name_in as object_name,
          'COMMENT' as object_type,
          :schema_name_in as schema_name
      from dual
    union all

    -- REF CONSTRAINTS
    select constraint_name,
          'REF_CONSTRAINT',
          owner
      from all_constraints
    where owner = :schema_name_in
      and table_name = :Öobject_name_in
      and constraint_type = 'R'
    union all

    -- RLS CONTEXTS
    select :Öobject_name_in as object_name,
          'RLS_CONTEXT' as object_type,
          :schema_name_in as schema_name
      from dual
    union all

    -- RLS GROUP
    select :Öobject_name_in as object_name,
          'RLS_GROUP' as object_type,
          :schema_name_in as schema_name
      from dual
    union all

    -- RLS POLICY
    select :Öobject_name_in as object_name,
          'RLS_POLICY' as object_type,
          :schema_name_in as schema_name
      from dual
    union all

    -- CONSTRAINTS
    select constraint_name,
          'CONSTRAINT',
          owner
      from all_constraints
    where owner = :schema_name_in
      and table_name = :Öobject_name_in
      and constraint_type != 'R'
    union all

    -- INDEXES
    select index_name,
          'INDEX',
          owner
      from all_indexes
    where table_owner = :schema_name_in
      and table_name = :Öobject_name_in
    union all

    -- TRIGGERS
    select trigger_name,
          'TRIGGER',
          owner
      from all_triggers
    where table_owner = :schema_name_in
      and table_name = :Öobject_name_in
      and base_object_type = 'TABLE'
    union all

    -- OBJECTS GRANTS AS GRANTOR
    select :Öobject_name_in,
          'OBJECT_GRANT_AS_GRANTOR',
          :schema_name_in
      from dual`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ['ÖOBJECT_NAME_IN', 'SCHEMA_NAME_IN']);
  }); // 162.28

  it('162.29 Ignore multiple single line comments having : in sql', async function() {
    // Issue 1561
    const sql = `select
                      1
                    from
                      -- :
                      dual
                    where
                      -- :
                      1=1`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, []);
    const result = await conn.execute(sql);
    assert.deepStrictEqual(result.rows[0], [1]);
  });

  it('162.30 Ignore multiple single and multi line comments having : in sql', async function() {
    const sql = `select
                        1
                      from
                        -- :
                        /* adding
                        multi line comments :1 */
                        dual
                      where
                      /* adding :bind */
                      -- :
                        1=1`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, []);
    const result = await conn.execute(sql);
    assert.deepStrictEqual(result.rows[0], [1]);
  });

  it('162.31 Multiple single line comments with binds before the comment in sql', async function() {
    const sql = `select
                        -- :
                        :1 -- :
                        -- :
                      from
                        -- :
                        dual
                      where
                        -- :
                        1=1`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ['1']);
    const result = await conn.execute(sql, [1]);
    assert.deepStrictEqual(result.rows[0], [1]);
  });

  it('162.32 Multiple single line comments with binds after the comment in sql', async function() {
    const sql = `select
                        -- :
                        -- :
                        :1
                        -- :
                      from
                        -- :
                        dual
                      where
                        -- :
                        1=1`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ['1']);
    const result = await conn.execute(sql, [1]);
    assert.deepStrictEqual(result.rows[0], [1]);
  });

  it('162.33 Bind Variable before, inbetween and after comments in sql', async function() {
    const sql = `select
                        :1,
                        -- :
                        :2
                        -- :
                      from
                        -- :
                        dual
                      where
                        -- :
                        :3=1`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ['1', '2', '3']);
    const result = await conn.execute(sql, [1, 1, 1]);
    assert.deepStrictEqual(result.rows[0], [1, 1]);
  });

  it('162.34 ignore literals only during bind processing', async function() {
    const sql = `select 'HELLO' from
                          -- :
                          /* adding
                          multi line comments :1 */
                          dual
                        where
                        /* adding :bind */
                          1=1`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, []);
    const result = await conn.execute(sql);
    assert.deepStrictEqual(result.rows[0], ['HELLO']);
  });

  it('162.35 Parse and Execute twice ', async function() {
    const sql = "insert into nodb_number (num, content) values (:num, :val)";
    let key = 555;
    for (let i = 0; i < 2; i++) {
      await conn.getStatementInfo(sql);
      await conn.execute(sql, {num: key, val: 1234});
      key = key + 1;
    }
  });

  it('162.36 Multiple line and Multiple Asterisks', async function() {
    const sql = `/****--select * from :a where :a = 1
    select * from table_names where :a = 1****/
    select :table_name, :value from dual`;
    const expectedRes = ['TAB', 'VAL'];

    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ['TABLE_NAME', 'VALUE']);
    const result = await conn.execute(sql, expectedRes);
    assert.deepStrictEqual(result.rows[0], expectedRes);
  });
});

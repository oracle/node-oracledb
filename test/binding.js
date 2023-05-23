/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

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
 *   4. binding.js
 *
 * DESCRIPTION
 *   This suite tests the data binding, including:
 *     The cases uses PL/SQL to test in-bind, out-bind and in-out-bind.
 *     The cases take bind value in OBJECT and ARRAY formats.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');

describe('4. binding.js', function() {

  describe('4.1 test STRING, NUMBER, ARRAY & JSON format', function() {

    let connection = null;
    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
    });

    after(async function() {
      await connection.close();
    });

    it('4.1.1 VARCHAR2 binding, Object & Array formats', async function() {
      let proc = "CREATE OR REPLACE PROCEDURE nodb_bindproc1 (p_out OUT VARCHAR2) \
                      AS \
                      BEGIN \
                        p_out := 'abcdef'; \
                      END;";
      await connection.execute(proc);
      let result = await connection.execute("BEGIN nodb_bindproc1(:o); END;",
        {
          o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        });
      assert.strictEqual(result.outBinds.o, "abcdef");


      result = await connection.execute(
        "BEGIN nodb_bindproc1(:o); END;",
        [
          { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        ]);

      // console.log(result);

      assert.deepStrictEqual(result.outBinds, ['abcdef']);
      await connection.execute("DROP PROCEDURE nodb_bindproc1");

    });

    it('4.1.2 NUMBER binding, Object & Array formats', async function() {
      let proc = "CREATE OR REPLACE PROCEDURE nodb_bindproc2 (p_out OUT NUMBER) \
                      AS \
                      BEGIN \
                        p_out := 10010; \
                      END;";
      await connection.execute(proc);
      let result = await connection.execute(
        "BEGIN nodb_bindproc2(:o); END;",
        {
          o: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        });

      assert.strictEqual(result.outBinds.o, 10010);
      result = await connection.execute(
        "BEGIN nodb_bindproc2(:o); END;",
        [
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        ]);
      assert.deepStrictEqual(result.outBinds, [10010]);
      await connection.execute("DROP PROCEDURE nodb_bindproc2");

    }); // 4.1.2

    it('4.1.3 Multiple binding values, Object & Array formats', async function() {

      let proc = "CREATE OR REPLACE PROCEDURE nodb_bindproc3 (p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT NUMBER) \
                        AS \
                      BEGIN \
                        p_inout := p_in || ' ' || p_inout; \
                        p_out := 101; \
                      END; ";
      await connection.execute(proc);
      let result = await connection.execute(
        "BEGIN nodb_bindproc3(:i, :io, :o); END;",
        {
          i:  'Alan',  // bind type is determined from the data type
          io: { val: 'Turing', dir : oracledb.BIND_INOUT },
          o:  { type: oracledb.NUMBER, dir : oracledb.BIND_OUT }
        });

      assert.strictEqual(result.outBinds.io, 'Alan Turing');

      result = await connection.execute(
        "BEGIN nodb_bindproc3(:i, :io, :o); END;",
        [
          'Alan',  // bind type is determined from the data type
          { val: 'Turing', dir : oracledb.BIND_INOUT },
          { type: oracledb.NUMBER, dir : oracledb.BIND_OUT }
        ]);
      assert.deepStrictEqual(result.outBinds, [ 'Alan Turing', 101 ]);
      await connection.execute("DROP PROCEDURE nodb_bindproc3");

    });

    it('4.1.4 Multiple binding values, Change binding order', async function() {

      let proc = "CREATE OR REPLACE PROCEDURE nodb_bindproc4 (p_inout IN OUT VARCHAR2, p_out OUT NUMBER, p_in IN VARCHAR2) \
                        AS \
                      BEGIN \
                        p_inout := p_in || ' ' || p_inout; \
                        p_out := 101; \
                      END; ";
      await connection.execute(proc);
      let result = await connection.execute(
        "BEGIN nodb_bindproc4(:io, :o, :i); END;",
        {
          i:  'Alan',  // bind type is determined from the data type
          io: { val: 'Turing', dir : oracledb.BIND_INOUT },
          o:  { type: oracledb.NUMBER, dir : oracledb.BIND_OUT }
        });

      assert.strictEqual(result.outBinds.io, 'Alan Turing');
      result = await connection.execute(
        "BEGIN nodb_bindproc4(:io, :o, :i); END;",
        [
          { val: 'Turing', dir : oracledb.BIND_INOUT },
          { type: oracledb.NUMBER, dir : oracledb.BIND_OUT },
          'Alan',  // bind type is determined from the data type
        ]);
      assert.deepStrictEqual(result.outBinds, [ 'Alan Turing', 101 ]);
      await connection.execute("DROP PROCEDURE nodb_bindproc4");

    });

    it('4.1.5 default bind type - STRING', async function() {
      const sql = "begin :n := 1001; end;";
      const bindVar = { n : { dir: oracledb.BIND_OUT } };
      let options = { };
      let result = await connection.execute(sql, bindVar, options);
      assert.strictEqual(typeof (result.outBinds.n), "string");
      assert.strictEqual(result.outBinds.n, '1001');
    });

  });

  describe('4.2 mixing named with positional binding', function() {
    let connection = null;
    let createTable =
      "BEGIN \
          DECLARE \
              e_table_missing EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE nodb_binding1 PURGE'); \
          EXCEPTION \
              WHEN e_table_missing \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE nodb_binding1 ( \
                  id NUMBER(4),  \
                  name VARCHAR2(32) \
              ) \
          '); \
      END; ";
    let insert = 'insert into nodb_binding1 (id, name) values (:0, :1) returning id into :2';
    let param1 = [ 1, 'changjie', { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } ];
    let param2 = [ 2, 'changjie', { ignored_name: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } } ];
    let options = { autoCommit: true, outFormat: oracledb.OUT_FORMAT_OBJECT };

    beforeEach(async function() {
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute(createTable);
    });

    afterEach(async function() {
      await connection.execute("DROP TABLE nodb_binding1 PURGE");
      await connection.close();
    });

    it('4.2.1 array binding is ok', async function() {
      let result = await connection.execute(insert, param1, options);
      assert.strictEqual(result.rowsAffected, 1);
      assert.deepStrictEqual(result.outBinds[0], [1]);
      // console.log(result);
      result = await connection.execute("SELECT * FROM nodb_binding1 ORDER BY id", [], options);
      assert.strictEqual(result.rows[0].ID, 1);
      assert.strictEqual(result.rows[0].NAME, 'changjie');

    });

    it('4.2.2 array binding with mixing JSON should throw an error', async function() {
      await assert.rejects(
        async () => {
          await connection.execute(insert, param2, options);
        },
        /NJS-044:/
      );

      let res = await connection.execute("SELECT * FROM nodb_binding1 ORDER BY id", [], options);
      assert.deepStrictEqual(res.rows, []);

    });

    it('4.2.3 returning_clause expression multiple combinations', async function() {
      const bindsOutNumber = [
        1,
        'Test',
        {type: oracledb.DB_TYPE_NUMBER, dir: oracledb.BIND_OUT}
      ];
      const bindsOutChar = [
        1,
        'Test',
        {type: oracledb.DB_TYPE_VARCHAR, dir: oracledb.BIND_OUT}
      ];
      const bindsOutNumberChar = [
        1,
        'Test',
        {type: oracledb.DB_TYPE_NUMBER, dir: oracledb.BIND_OUT},
        {type: oracledb.DB_TYPE_VARCHAR, dir: oracledb.BIND_OUT}
      ];
      const bindsMultipleInOutNumberChar = [
        1,
        'Test',
        2,
        'Test2',
        {type: oracledb.DB_TYPE_NUMBER, dir: oracledb.BIND_OUT},
        {type: oracledb.DB_TYPE_VARCHAR, dir: oracledb.BIND_OUT}
      ];
      const bindsOutDate = [
        1,
        'Test',
        {type: oracledb.DB_TYPE_DATE, dir: oracledb.BIND_OUT}
      ];

      // possible sql valid combinations
      const sqlStrings = [{sql: 'insert into nodb_binding1 (id, name) values (:1, :2) returning(id)into :3', rowsAffected:1, resultVal: [[1]] },
        {sql: 'insert into nodb_binding1 (id, name) values (:1, :2) return(id)into :3', rowsAffected: 1, resultVal: [[1]]},
        {sql: 'insert into nodb_binding1 (id, name) values (:1, :2) returning(id)into:3', rowsAffected: 1, resultVal: [[1]]},
        {sql: 'insert into nodb_binding1 (id, name) values (:1, :2) returning (id)into :3', rowsAffected: 1, resultVal:[[1]] },
        {sql: 'insert into nodb_binding1 (id, name) values (:1, :2)     returning     id    into   :3', rowsAffected: 1, resultVal:[[1]]},
        {sql: 'insert into nodb_binding1 (id, name) values (:1, :2)  return id   into   :3', rowsAffected: 1, resultVal:[[1]]},
        {sql: 'insert into nodb_binding1 (id, name) values (:1, :2) retURning ( id )intO :3', rowsAffected: 1, resultVal:[[1]]},
        {sql: 'insert into nodb_binding1 (id, name) values (:1, :2) returning ( id + 2 )into :3', rowsAffected: 1, resultVal:[[3]]},
        {sql: 'insert into nodb_binding1 (id, name) values (:1, :2) returning ( id + 2 + 5)into :3', rowsAffected: 1, resultVal:[[8]]},
        {sql: 'insert into nodb_binding1 (id, name) values (:1, :2) returning ( id * 2 )into :3', rowsAffected: 1, resultVal:[[2]]},
        {sql: 'insert into nodb_binding1 (id, name) values (:1, :2)returning ( id * 2 )into :3', rowsAffected: 1, resultVal:[[2]]}
      ];
      for (const sqlObj of sqlStrings) {
        let result = await connection.execute(sqlObj.sql, bindsOutNumber);
        assert.strictEqual(result.rowsAffected, sqlObj.rowsAffected);
        for (let i = 0; i < sqlObj.resultVal.length; i++) {
          assert.deepStrictEqual(result.outBinds[i], sqlObj.resultVal[i]);
        }
      }

      // returning const string
      let sql = "insert into nodb_binding1 (id, name) values (:1, :2) returning ( 'returning' )into :3";
      let result = await connection.execute(sql, bindsOutChar);
      assert.strictEqual(result.rowsAffected, 1);
      assert.deepStrictEqual(result.outBinds[0], ['returning']);

      // returning const date
      sql = "insert into nodb_binding1 (id, name) values (:1, :2) returning to_date('24 June 2003', 'dd Mon YYYY') into :3";
      result = await connection.execute(sql, bindsOutDate);
      assert.strictEqual(result.rowsAffected, 1);

      // returning const string
      sql = "insert into nodb_binding1 (id, name) values (:1, :2) returning ( 'returning a,b into :3,:4' )into :3";
      result = await connection.execute(sql, bindsOutChar);
      assert.strictEqual(result.rowsAffected, 1);
      assert.deepStrictEqual(result.outBinds[0], ['returning a,b into :3,:4']);

      sql = 'insert into nodb_binding1 (id, name) values (:1, :2) returning id,name into :3, :4';
      result = await connection.execute(sql, bindsOutNumberChar);
      assert.strictEqual(result.rowsAffected, 1);
      assert.deepStrictEqual(result.outBinds[0], [1]);
      assert.deepStrictEqual(result.outBinds[1], ['Test']);

      sql = 'insert into nodb_binding1 (id, name) values(:1, :2) returning :3,:4 into :5, :6';
      result = await connection.execute(sql, bindsMultipleInOutNumberChar);
      assert.strictEqual(result.rowsAffected, 1);
      assert.deepStrictEqual(result.outBinds[0], [2]);
      assert.deepStrictEqual(result.outBinds[1], ['Test2']);

      // returning literals
      sql = "insert into nodb_binding1 (id, name) values (:1, :2) returning 1 ,'into'  into :3, :4";
      result = await connection.execute(sql, bindsOutNumberChar);
      assert.strictEqual(result.rowsAffected, 1);
      assert.deepStrictEqual(result.outBinds[0], [1]);
      assert.deepStrictEqual(result.outBinds[1], ['into']);

      sql = 'insert into nodb_binding1 (id, name) values (:1, :2) returning id into :3, name into :4';
      await assert.rejects(
        async () => await connection.execute(sql, bindsOutNumberChar),
        // ORA-00933 - SQL command not properly ended
        /ORA-00933:/
      );

      sql = "insert into nodb_binding1 (id, name) values (:1, :2) returning (id()into :3";
      await assert.rejects(
        async () => await connection.execute(sql, bindsOutNumber),
        // ORA-00907 - missing right parenthesis
        /ORA-00907:/
      );

      // invalid return value syntax in expression with comma
      sql = 'insert into nodb_binding1 (id, name) values (:1, :2) returning (id,) into :3';
      await assert.rejects(
        async () => await connection.execute(sql, bindsOutNumber),
        // ORA-00907 - missing right parenthesis
        /ORA-00907:/
      );

      // enclosing multiple return values in paranthesis instead of a single expression
      sql = "insert into nodb_binding1 (id, name) values (:1, :2) returning (id,name) into :3, :4";
      await assert.rejects(
        async () => await connection.execute(sql, bindsOutNumberChar),
        // ORA-00907 - missing right parenthesis
        /ORA-00907:/
      );

      // mismatch in returning into parameters
      sql = "insert into nodb_binding1 (id, name) values (:1, :2) returning ('he','hi','by' into :3";
      await assert.rejects(
        async () => await connection.execute(sql, bindsOutChar),
        // ORA-00907 - missing right parenthesis
        /ORA-00907:/
      );

      // empty expr/variable
      sql = "insert into nodb_binding1 (id, name) values (:1, :2) returning into :3";
      await assert.rejects(
        async () => await connection.execute(sql, bindsOutChar),
        // ORA-00936 - missing expression
        /ORA-00936:/
      );

      // without into keyword
      sql = "insert into nodb_binding1 (id, name) values (:1, :2) returning ('he'" ;
      await assert.rejects(
        async () => await connection.execute(sql, bindsOutChar),
        // ORA-01036 - illegal variable name/number
        /ORA-01036:|NJS-098:/
      );
    });
  });

  describe('4.3 insert with DATE column and DML returning', function() {
    let connection = null;
    const createTable =
      "BEGIN \
          DECLARE \
              e_table_missing EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE nodb_binding2 PURGE'); \
          EXCEPTION \
              WHEN e_table_missing \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE nodb_binding2 ( \
                  num NUMBER(4),  \
                  str VARCHAR2(32), \
                  dt DATE \
              ) \
          '); \
      END; ";

    beforeEach(async function() {
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute(createTable);
    });

    afterEach(async function() {
      await connection.execute("DROP TABLE nodb_binding2 PURGE");
      await connection.close();
    });

    let insert1 = 'insert into nodb_binding2 (num, str, dt) values (:0, :1, :2)';
    let insert2 = 'insert into nodb_binding2 (num, str, dt) values (:0, :1, :2) returning num into :3';
    let param1 = { 0: 123, 1: 'str', 2: new Date() };
    let param2 = { 0: 123, 1: 'str', 2: new Date(), 3: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } };
    let param3 = [ 123, 'str', new Date() ];
    let param4 = [ 123, 'str', new Date(), { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } ];

    let options = { autoCommit: true };

    it('4.3.1 passes in object syntax without returning into', async function() {
      let result = await connection.execute(insert1, param1, options);
      assert.strictEqual(result.rowsAffected, 1);
      await connection.execute("SELECT * FROM nodb_binding2 ORDER BY num", [], options);
    });

    it('4.3.2 passes in object syntax with returning into', async function() {

      let result = await connection.execute(insert2, param2, options);
      assert.strictEqual(result.rowsAffected, 1);
      //console.log(result);
      assert.deepStrictEqual(result.outBinds, { '3': [123] });
      await connection.execute("SELECT * FROM nodb_binding2 ORDER BY num", [], options);

    });

    it('4.3.3 passes in array syntax without returning into', async function() {
      let result = await connection.execute(insert1, param3, options);
      assert.strictEqual(result.rowsAffected, 1);
      await connection.execute("SELECT * FROM nodb_binding2 ORDER BY num", [], options);

    });

    it('4.3.4 should pass but fail in array syntax with returning into', async function() {
      let result = await connection.execute(insert2, param4, options);
      assert.strictEqual(result.rowsAffected, 1);
      // console.log(result);
      assert.deepStrictEqual(result.outBinds[0], [123]);
      await connection.execute("SELECT * FROM nodb_binding2 ORDER BY num", [], options);
    });

  });

  describe('4.4 test maxSize option', function() {
    let connection = null;

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
    });

    after(async function() {
      await connection.close();
    });

    it('4.4.1 outBind & maxSize restriction', async function() {

      let proc = "CREATE OR REPLACE PROCEDURE nodb_bindproc4 (p_out OUT VARCHAR2) \
                      AS \
                      BEGIN \
                        p_out := 'ABCDEF GHIJK LMNOP QRSTU'; \
                      END;";
      await connection.execute(proc);
      await assert.rejects(
        async () => {
          await connection.execute(
            "BEGIN nodb_bindproc4(:o); END;",
            {
              o: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize:2 }
            });
        },
        /ORA-06502:/
      );
      await connection.execute("DROP PROCEDURE nodb_bindproc4");
    });

    it('4.4.2 default value is 200', async function() {
      let result = await connection.execute(
        "BEGIN :o := lpad('A', 200, 'x'); END;",
        { o: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
      );
      assert.strictEqual(result.outBinds.o.length, 200);
    });

    it('4.4.3 Negative - bind out data exceeds default length', async function() {
      await assert.rejects(
        async () => {
          await connection.execute(
            "BEGIN :o := lpad('A',201,'x'); END;",
            { o: { type: oracledb.STRING, dir : oracledb.BIND_OUT } });
        },
        /ORA-06502:/
      );

    });

    it('4.4.4 maximum value of maxSize option is 32767', async function() {
      const sql = `
        DECLARE
          t_OutVal varchar2(32767);
        BEGIN
          t_OutVal := lpad('A', 32767, 'x');
          :o := t_OutVal;
        END;`;
      const binds = {
        o: { type: oracledb.STRING, dir : oracledb.BIND_OUT, maxSize:50000 }
      };
      const result = await connection.execute(sql, binds);
      assert.strictEqual(result.outBinds.o.length, 32767);
    });

  }); // 4.4

  describe('4.5 The default direction for binding is BIND_IN', function() {
    let connection = null;
    let tableName = "nodb_raw";

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute(assist.sqlCreateTable(tableName));
    });

    after(async function() {
      await connection.execute("DROP TABLE " + tableName + " PURGE");
      await connection.close();
    });

    it('4.5.1 DML default bind', async function() {
      await connection.execute(
        "insert into nodb_raw (num) values (:id)",
        { id: { val: 1, type: oracledb.NUMBER } }
      );
    });


    it('4.5.2 negative - DML invalid bind direction', async function() {
      await assert.rejects(
        async () => await connection.execute("insert into nodb_raw (num) values (:id)", { id: { val: 1, type: oracledb.NUMBER, dir : 0 } }),
        /NJS-013:/
      );
    });



  }); // 4.5

  describe('4.6 PL/SQL block with empty outBinds', function() {

    it('4.6.1 ', async function() {

      const sql = "begin execute immediate 'drop table does_not_exist purge'; "
        + "exception when others then "
        + "if sqlcode <> -942 then "
        + "raise; "
        + "end if; end;";
      const connection = await oracledb.getConnection(dbConfig);
      const result = await connection.execute(sql);
      assert.deepStrictEqual(result, {});
      await connection.close();
    });
  });

  // Test cases involving JSON value as input
  describe ('4.7 Value as JSON named/unamed test cases', function() {
    let connection;

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
    });

    after(async function() {
      await connection.close();
    });

    it('4.7.1 valid case when numeric values are passed as it is',
      async function() {
        const sql = "SELECT SYSDATE FROM DUAL WHERE :b = 1 and :c = 456 ";
        const binds = [ 1, 456 ];
        const result = await connection.execute(sql, binds);
        assert((result.rows[0][0]) instanceof Date);
      });

    it('4.7.2 Valid values when one of the value is passed as JSON ',
      async function() {
        const sql = "SELECT SYSDATE FROM DUAL WHERE :b = 1 and :c = 456 ";
        const binds = [ 1, { val : 456 } ];
        const result = await connection.execute (sql, binds);
        assert((result.rows[0][0]) instanceof Date);
      });

    it('4.7.3 Valid test case when one of the value is passed as JSON ',
      async function() {
        const sql = "SELECT SYSDATE FROM DUAL WHERE :b = 1 and :c = 456 ";
        const binds = [ {val :  1}, 456 ];
        const result = await connection.execute(sql, binds);
        assert((result.rows[0][0]) instanceof Date);
      });

    it ('4.7.4 Valid Test case when both values are passed as JSON',
      async function() {
        const sql = "SELECT SYSDATE FROM DUAL WHERE :b = 1 and :c = 456 ";
        const binds = [ {val : 1}, {val : 456 } ];
        const result = await connection.execute(sql, binds);
        assert((result.rows[0][0]) instanceof Date);
      });

    it('4.7.5 Invalid Test case when value is passed as named JSON',
      async function() {
        const sql = "SELECT SYSDATE FROM DUAL WHERE :b = 1 and :c = 456 ";
        const binds = [ {val : 1}, { c: {val : 456 } } ];
        await assert.rejects(
          async () => await connection.execute(sql, binds),
          /NJS-044:/
        );
      });

    it('4.7.6 Invalid Test case when other-value is passed as named JSON',
      async function() {
        const sql = "SELECT SYSDATE FROM DUAL WHERE :b = 1 and :c = 456 ";
        const binds = [ { b: {val : 1} }, {val : 456 } ];
        await assert.rejects(
          async () => await connection.execute(sql, binds),
          /NJS-044:/
        );
      });

    it('4.7.7 Invalid Test case when all values is passed as named JSON',
      async function() {
        const sql = "SELECT SYSDATE FROM DUAL WHERE :b = 1 and :c = 456 ";
        const binds = [ { b: {val : 1} }, { c: {val : 456 } } ];
        await assert.rejects(
          async () => await connection.execute(sql, binds),
          /NJS-044:/
        );
      }); // 4.7.7

  }); // 4.7

  describe('4.8 bind DATE', function() {

    let connection = null;
    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute("alter session set time_zone='UTC'");
    }); // before

    after(async function() {
      await connection.close();
    }); // after

    it('4.8.1 binding out in Object & Array formats', async function() {


      let proc = "CREATE OR REPLACE PROCEDURE nodb_binddate1 ( \n" +
                     "    p_out1 OUT DATE, \n" +
                     "    p_out2 OUT DATE \n" +
                     ") \n" +
                     "AS \n" +
                     "BEGIN \n" +
                     "    p_out1 := SYSDATE + 10; \n" +
                     "    p_out2 := TO_DATE('2016-08-05', 'YYYY-MM-DD'); \n" +
                     "END;";
      await connection.execute(proc);


      let result = await connection.execute(
        "BEGIN nodb_binddate1(:o1, :o2); END;",
        {
          o1: { type: oracledb.DATE, dir: oracledb.BIND_OUT },
          o2: { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        });

      // console.log(result);
      assert((result.outBinds.o1) instanceof Date);

      let vdate = new Date("2016-08-05T00:00:00.000Z");
      assert.deepStrictEqual(result.outBinds.o2, vdate);

      result = await connection.execute(
        "BEGIN nodb_binddate1(:o1, :o2); END;",
        [
          { type: oracledb.DATE, dir: oracledb.BIND_OUT },
          { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        ]);
      assert((result.outBinds[0]) instanceof Date);

      vdate = new Date("2016-08-05T00:00:00.000Z");
      assert.deepStrictEqual(result.outBinds[1], vdate);
      await connection.execute("DROP PROCEDURE nodb_binddate1");

    }); // 4.8.1

    it('4.8.2 BIND_IN', async function() {

      let proc = "CREATE OR REPLACE PROCEDURE nodb_binddate2 ( \n" +
                     "    p_in IN DATE, \n" +
                     "    p_out OUT DATE \n" +
                     ") \n" +
                     "AS \n" +
                     "BEGIN \n" +
                     "    p_out := p_in; \n" +
                     "END;";
      await connection.execute(proc);

      let vdate = new Date(Date.UTC(2016, 7, 5));
      const result = await connection.execute(
        "BEGIN nodb_binddate2(:i, :o); END;",
        {
          i: { type: oracledb.DATE, dir: oracledb.BIND_IN, val: vdate },
          o: { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        });
      vdate = new Date("2016-08-05T00:00:00.000Z");
      assert.deepStrictEqual(result.outBinds.o, vdate);

      await connection.execute("DROP PROCEDURE nodb_binddate2");
    }); // 4.8.2

    it('4.8.3 BIND_INOUT', async function() {

      let proc = "CREATE OR REPLACE PROCEDURE nodb_binddate3 ( \n" +
                     "    p_inout IN OUT DATE \n" +
                     ") \n" +
                     "AS \n" +
                     "BEGIN \n" +
                     "    p_inout := p_inout; \n" +
                     "END;";
      await connection.execute(proc);

      let vdate = new Date(Date.UTC(2016, 7, 5));
      const result = await connection.execute(
        "BEGIN nodb_binddate3(:io); END;",
        {
          io: { val: vdate, dir : oracledb.BIND_INOUT, type: oracledb.DATE }
        });

      vdate = new Date("2016-08-05T00:00:00.000Z");
      assert.deepStrictEqual(result.outBinds.io, vdate);
      connection.execute("DROP PROCEDURE nodb_binddate3");
    }); // 4.8.3

  }); // 4.8

  describe('4.9 different placeholders for bind name', function() {
    let connection;

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
    });

    after(async function() {
      await connection.close();
    });

    it('4.9.1 test case sensitivity of quoted bind names', async function() {
      const sql = 'select :"test" from dual';
      const binds = {'"test"': 1};
      const result = await connection.execute(sql, binds);
      assert((result.rows[0][0]), 1);
    });

    it('4.9.2 using a reserved keyword as a bind name', async function() {
      const sql = 'select :ROWID from dual';
      await assert.rejects(
        async () => {
          await connection.execute(sql, {ROWID:1});
        },
        //NJS-098: 1 positional bind values are required but 0 were provided
        /ORA-01745:|NJS-098:/
      );
    });

    it('4.9.3 not using a bind name in execute statement', async function() {
      const sql = 'select :val from dual';
      await assert.rejects(
        async () => {
          await connection.execute(sql);
        },
        //ORA-01008: not all variables bound
        //NJS-098: 1 positional bind values are required but 0 were provided
        /ORA-01008:|NJS-098:/
      );
    });
  }); // 4.9

  describe('4.10 various quoted binds', function() {

    it('4.10.1 various quoted bind names', async function() {
      const sql = 'SELECT :"percent%" FROM DUAL';
      const binds = {percent : "percent%" };

      const connection = await oracledb.getConnection(dbConfig);
      await assert.rejects(
        async () => {
          await connection.execute(sql, binds);
        },
        //ORA-01036: illegal variable name/number
        //NJS-097: no bind placeholder named: :PERCENT was found in the SQL text
        /ORA-01036:|NJS-097:/
      );
      await connection.release();
    });
  });

  describe('4.11 PL/SQL block with null Binds', function() {

    let connection = null;
    let createTable =
      "BEGIN \n"
         + "DECLARE \n"
         +    " e_table_missing EXCEPTION; \n"
         +    " PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n"
         + " BEGIN \n"
         + "    EXECUTE IMMEDIATE ('DROP TABLE nodb_empty PURGE'); \n"
         + "EXCEPTION \n"
         +  "   WHEN e_table_missing \n"
         +   "  THEN NULL; \n"
         + "END; \n"
         + " EXECUTE IMMEDIATE (' \n"
         + "    CREATE TABLE nodb_empty ( \n"
         + "        id NUMBER(4),  \n"
         + "        name VARCHAR2(32) \n"
         + "    ) \n"
         + "'); \n"
     + "END; ";

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute(createTable);
    });

    after(async function() {
      await connection.execute("DROP TABLE nodb_empty PURGE");
      await connection.close();
    });

    it('4.11.1 executing a null with bind values', async function() {
      await connection.execute(
        "insert into nodb_empty (ID, NAME) VALUES (:id, :name)",
        { id: 1, name: null }, // binds object
        { autoCommit: true }   // options object
      );
    });
  });

  describe('4.12 binding in a cursor', function() {
    let connection = null;
    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
    });

    after(async function() {
      await connection.close();
    });

    it('4.12.1 test binding in a cursor', async function() {
      const sql = `begin
                      open :cursor for select 'X' StringValue from dual;
                    end;`;
      const bindVars = { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } };
      const result = await connection.execute(sql, bindVars);
      const cursor = result.outBinds.cursor;
      const expectedBind = {
        name: "STRINGVALUE",
        fetchType: oracledb.DB_TYPE_CHAR,
        dbType: oracledb.DB_TYPE_CHAR,
        dbTypeName: "CHAR",
        nullable: true,
        byteSize: 1
      };
      assert.deepStrictEqual(cursor.metaData, [expectedBind]);

      const rows = await cursor.getRows();
      assert.deepStrictEqual(rows, [ [ 'X' ] ]);
    });
  });
});

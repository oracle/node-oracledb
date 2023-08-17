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
 *   6. dmlReturning.js
 *
 * DESCRIPTION
 *   Testing driver DML Returning feature.
 *
 *   When DML affects multiple rows we can still use the RETURING INTO,
 *   but now we must return the values into a collection using the
 *   BULK COLLECT clause.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');

describe('6. dmlReturning.js', function() {

  describe('6.1 NUMBER & STRING driver data type', function() {

    let connection;
    beforeEach('get connection and prepare table', async function() {
      const makeTable =
      "BEGIN \
            DECLARE \
                e_table_missing EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE nodb_dmlreturn PURGE'); \
            EXCEPTION \
                WHEN e_table_missing \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE nodb_dmlreturn ( \
                    id NUMBER,  \
                    name VARCHAR2(4000) \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_dmlreturn  \
                   VALUES \
                   (1001,''Chris Jones'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_dmlreturn  \
                   VALUES \
                   (1002,''Tom Kyte'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_dmlreturn  \
                   VALUES \
                   (2001, ''Karen Morton'') \
            '); \
        END; ";
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute(makeTable);
    });

    afterEach('drop table and release connection', async function() {
      await connection.execute("DROP TABLE nodb_dmlreturn PURGE");
      await connection.close();
    });

    it('6.1.1 INSERT statement with Object binding', async function() {
      const result = await connection.execute(
        "INSERT INTO nodb_dmlreturn VALUES (1003, 'Robyn Sands') RETURNING id, name INTO :rid, :rname",
        {
          rid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT},
          rname: { type: oracledb.STRING, dir: oracledb.BIND_OUT}
        });
      assert.strictEqual(result.rowsAffected, 1);
      assert.strictEqual(result.outBinds.rid[0], 1003);
      assert.strictEqual(result.outBinds.rname[0], 'Robyn Sands');
    });

    it('6.1.2 INSERT statement with Array binding', async function() {
      const result = await connection.execute(
        "INSERT INTO nodb_dmlreturn VALUES (1003, 'Robyn Sands') RETURNING id, name INTO :rid, :rname",
        [
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        ]);
      assert.strictEqual(result.rowsAffected, 1);
      assert.strictEqual(result.outBinds[0][0], 1003);
      assert.strictEqual(result.outBinds[1][0], 'Robyn Sands');
    });

    it('6.1.3 INSERT statement with small maxSize restriction', async function() {

      const sql = "INSERT INTO nodb_dmlreturn VALUES (1003, 'Robyn Sands Delaware') RETURNING id, name INTO :rid, :rname";
      const binds = {
        rid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        rname: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 2 }
      };
      const options = {
        autoCommit: true
      };
      await assert.rejects(
        async () => await connection.execute(sql, binds, options),
        /NJS-016:/
      );
    });

    it('6.1.4 UPDATE statement with single row matched', async function() {
      const result = await connection.execute(
        "UPDATE nodb_dmlreturn SET name = :n WHERE id = :i RETURNING id, name INTO :rid, :rname",
        {
          n: "Kerry Osborne",
          i: 2001,
          rid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rname: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        },
        { autoCommit: true });
      assert.strictEqual(result.rowsAffected, 1);
      assert.strictEqual(result.outBinds.rid[0], 2001);
      assert.strictEqual(result.outBinds.rname[0], 'Kerry Osborne');
    });

    it('6.1.5 UPDATE statement with single row matched & Array binding', async function() {
      const result = await connection.execute(
        "UPDATE nodb_dmlreturn SET name = :n WHERE id = :i RETURNING id, name INTO :rid, :rname",
        [
          "Kerry Osborne",
          2001,
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        ],
        { autoCommit: true });
      assert.strictEqual(result.rowsAffected, 1);
      assert.strictEqual(result.outBinds[0][0], 2001);
      assert.strictEqual(result.outBinds[1][0], 'Kerry Osborne');
    });

    it('6.1.6 UPDATE statements with multiple rows matched', async function() {
      const result = await connection.execute(
        "UPDATE nodb_dmlreturn SET id = :i RETURNING id, name INTO :rid, :rname",
        {
          i: 999,
          rid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rname: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        },
        { autoCommit: true });
      assert.strictEqual(result.rowsAffected, 3);
      assert.deepStrictEqual(result.outBinds.rid, [999, 999, 999]);
      assert.deepStrictEqual(result.outBinds.rname, [ 'Chris Jones', 'Tom Kyte', 'Karen Morton' ]);
    });

    it('6.1.7 UPDATE statements with multiple rows matched & Array binding', async function() {
      const result = await connection.execute(
        "UPDATE nodb_dmlreturn SET id = :i RETURNING id, name INTO :rid, :rname",
        [
          999,
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        ],
        { autoCommit: true });
      assert.strictEqual(result.rowsAffected, 3);
      assert.deepStrictEqual(result.outBinds[0], [999, 999, 999]);
      assert.deepStrictEqual(result.outBinds[1], [ 'Chris Jones', 'Tom Kyte', 'Karen Morton' ]);
    });

    it('6.1.8 DELETE statement with Object binding', async function() {
      const result = await connection.execute(
        "DELETE FROM nodb_dmlreturn WHERE name like '%Chris%' RETURNING id, name INTO :rid, :rname",
        {
          rid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rname: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        },
        { autoCommit: true });
      assert.strictEqual(result.rowsAffected, 1);
      assert.deepStrictEqual(result.outBinds.rid, [1001]);
      assert.deepStrictEqual(result.outBinds.rname, ['Chris Jones']);
    });

    it('6.1.9 DELETE statement with Array binding', async function() {
      const result = await connection.execute(
        "DELETE FROM nodb_dmlreturn WHERE name like '%Chris%' RETURNING id, name INTO :rid, :rname",
        [
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        ],
        { autoCommit: true });
      assert.strictEqual(result.rowsAffected, 1);
      assert.deepStrictEqual(result.outBinds[0], [1001]);
      assert.deepStrictEqual(result.outBinds[1], ['Chris Jones']);
    });

    // it currently fails with 11.2 database
    it('6.1.10 Stress test - support 4k varchars', async function() {

      /*** Helper functions ***/
      const makeString = function(size) {
        const buffer = new StringBuffer();
        for (let i = 0; i < size; i++)
          buffer.append('A');
        return buffer.toString();
      };

      const StringBuffer = function() {
        this.buffer = [];
        this.index = 0;
      };

      StringBuffer.prototype = {
        append: function(s) {
          this.buffer[this.index] = s;
          this.index += 1;
          return this;
        },

        toString: function() {
          return this.buffer.join("");
        }
      };
      /*** string length **/
      const size = 4000;

      const result = await connection.execute(
        "INSERT INTO nodb_dmlreturn VALUES (:i, :n) RETURNING id, name INTO :rid, :rname",
        {
          i: size,
          n: makeString(size),
          rid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT},
          rname: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 4000}
        },
        { autoCommit: true });
      assert.deepStrictEqual(result.outBinds.rid, [size]);
      assert.strictEqual(result.outBinds.rname[0].length, size);
    });

    it('6.1.11 Negative test - wrong SQL got correct error thrown', async function() {
      const wrongSQL = "UPDATE nodb_dmlreturn SET doesnotexist = 'X' WHERE id = :id RETURNING name INTO :rn";
      const binds = {
        id: 2001,
        rn: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };

      await assert.rejects(
        async () => await connection.execute(wrongSQL, binds),
        /ORA-00904:/
      );
    });

    it('6.1.12 INSERT DML returning into too small a variable', async function() {

      const sql = "INSERT INTO nodb_dmlreturn (id, name) VALUES (:int_val, :str_val) RETURNING id, name into :rid, :rname";
      const binds = {
        int_val : 6,
        str_val : "A different test string",
        rid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        rname: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 2 }
      };
      const options = {
        autoCommit: true
      };
      await assert.rejects(
        async () => await connection.execute(sql, binds, options),
        /NJS-016:/
      );
    });

    it('6.1.13 INSERT statement with NaN', async function() {

      const sql = "INSERT INTO nodb_dmlreturn (id, name) VALUES (:int_val, :str_val) RETURNING id, name into :rid, :rname";
      const binds = {
        int_val : 7,
        str_val : "A" * 401,
        rid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        rname: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      const options = {
        autoCommit: true
      };
      await assert.rejects(
        async () => await connection.execute(sql, binds, options),
        /NJS-105:/
      );
    });

    it('6.1.14 INSERT statement with an invalid bind name (reserved namespace keyword)', async function() {

      const sql = "INSERT INTO nodb_dmlreturn (id) VALUES (:int_val) RETURNING id, name INTO :ROWID";
      const binds = {
        int_val: 9,
        ROWID: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      };
      const options = {
        autoCommit: true
      };
      await assert.rejects(
        async () => await connection.execute(sql, binds, options),
        /ORA-01745:/
      );
    });

    it('6.1.15 INSERT statement parse non ascii returning bind', async function() {

      const sql = "UPDATE nodb_dmlreturn SET id = :i RETURNING id, name INTO :rid, :méil";
      const info = await connection.getStatementInfo(sql);
      assert.deepStrictEqual(info.bindNames, ["I", "RID", "MÉIL"]);
    });

  }); // 6.1

  describe('6.2 DATE and TIMESTAMP data', function() {

    let connection;
    const tableName = "nodb_date";
    const dates = assist.DATE_STRINGS;

    beforeEach('get connection, prepare table', async function() {
      connection = await oracledb.getConnection(dbConfig);
      await assist.setUp4sql(connection, tableName, dates);
    }); // before

    afterEach('drop table, release connection', async function() {
      await connection.execute("DROP table " + tableName + " PURGE");
      await connection.close();
    });

    async function runSQL(sql, bindVar, isSingleMatch) {
      const beAffectedRows = (isSingleMatch ? 1 : dates.length);
      const result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.rowsAffected, beAffectedRows);
    }

    it('6.2.1 INSERT statement, single row matched, Object binding, no bind in data', async function() {
      const sql = "INSERT INTO " + tableName + " VALUES (50, TO_DATE('2015-01-11','YYYY-DD-MM')) RETURNING num, content INTO :rnum, :rcontent";
      const bindVar =
        {
          rnum: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rcontent: { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        };
      const isSingleMatch = true;
      await runSQL(sql, bindVar, isSingleMatch);
    });

    it('6.2.2 INSERT statement with JavaScript date bind in ', async function() {
      const sql = "INSERT INTO " + tableName + " VALUES (:no, :c) RETURNING num, content INTO :rnum, :rcontent";
      const ndate = new Date(2003, 9, 23, 11, 50, 30, 12);

      const bindVar =
        {
          no: 51,
          c: ndate,
          rnum: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rcontent: { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        };
      const isSingleMatch = true;

      await runSQL(sql, bindVar, isSingleMatch);

    });

    it('6.2.3 INSERT statement with Array binding', async function() {
      const sql = "INSERT INTO " + tableName + " VALUES (50, TO_TIMESTAMP_TZ('1999-12-01 11:00:00.123456 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')) RETURNING num, content INTO :rnum, :rcontent";
      const bindVar =
        [
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        ];
      const isSingleMatch = true;

      await runSQL(sql, bindVar, isSingleMatch);

    });

    it('6.2.4 UPDATE statement with single row matched', async function() {
      const sql = "UPDATE " + tableName + " SET content = :c WHERE num = :n RETURNING num, content INTO :rnum, :rcontent";
      const bindVar =
        {
          c: { type: oracledb.DATE, dir: oracledb.BIND_IN, val: new Date(2003, 9, 23, 11, 50, 30, 123) },
          n: 0,
          rnum: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rcontent: { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        };
      const isSingleMatch = true;

      await runSQL(sql, bindVar, isSingleMatch);

    });

    it('6.2.5 UPDATE statements with multiple rows matched, ARRAY binding format', async function() {
      const sql = "UPDATE " + tableName + " SET content = :c WHERE num < :n RETURNING num, content INTO :rnum, :rcontent";
      const bindVar =
        [
          { type: oracledb.DATE, dir: oracledb.BIND_IN, val: new Date(2003, 9, 23, 11, 50, 30, 123) },
          100,
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        ];
      const isSingleMatch = false;

      await runSQL(sql, bindVar, isSingleMatch);

    });

    it('6.2.6 UPDATE statements, multiple rows, TIMESTAMP data', async function() {
      const sql = "UPDATE " + tableName + " SET content = TO_TIMESTAMP_TZ('1999-12-01 11:00:00.123456 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM') " +
        " WHERE num < :n RETURNING num, content INTO :rnum, :rcontent";
      const bindVar =
        {
          n: 100,
          rnum: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rcontent: { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        };
      const isSingleMatch = false;

      await runSQL(sql, bindVar, isSingleMatch);

    });

    it('6.2.7 DELETE statement, single row matched, Object binding format', async function() {
      const sql = "DELETE FROM " + tableName + " WHERE num = :n RETURNING num, content INTO :rnum, :rcontent";
      const bindVar =
        {
          n: 0,
          rnum: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rcontent: { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        };
      const isSingleMatch = true;

      await runSQL(sql, bindVar, isSingleMatch);

    });

    it('6.2.8 DELETE statement, multiple rows matched, Array binding format', async function() {
      const sql = "DELETE FROM " + tableName + " WHERE num >= :n RETURNING num, content INTO :rnum, :rcontent";
      const bindVar =
        [
          0,
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        ];
      const isSingleMatch = false;

      await runSQL(sql, bindVar, isSingleMatch);
    });

    it('6.2.9 Negative test - bind value and type mismatch', async function() {
      const wrongSQL = "UPDATE " + tableName + " SET content = :c WHERE num = :n RETURNING num, content INTO :rnum, :rcontent";
      const bindVar =
        {
          n: 0,
          c: { type: oracledb.STRING, dir: oracledb.BIND_IN, val: new Date(2003, 9, 23, 11, 50, 30, 123) },
          rnum: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rcontent: { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        };

      await assert.rejects(
        async () => await connection.execute(wrongSQL, bindVar),
        /NJS-011:/
      );
      // NJS-011: encountered bind value and type mismatch
    });

  }); // 6.2
});

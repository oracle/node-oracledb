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
 *   102. bindTimestamp.js
 *
 * DESCRIPTION
 *    Testing DML and PL/SQL binding of TIMESTAMP types.
 *
 *****************************************************************************/
'use strict';

const  oracledb = require('oracledb');
const  assert   = require('assert');
const  dbConfig = require('./dbconfig.js');

describe('102. bindTimestamp.js', function() {
  let  connection = null;
  let  caseIndex = 1;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    let sql = "alter session set nls_timestamp_format = 'YYYY-MM-DD HH24:MI:SS.FF'";
    await runSQL(sql);
    sql = "alter session set nls_timestamp_tz_format = 'YYYY-MM-DD HH24:MI:SS.FF'";
    await runSQL(sql);

    const  proc = "BEGIN \n" +
                   "    DECLARE \n" +
                   "        e_table_missing EXCEPTION; \n" +
                   "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                   "    BEGIN \n" +
                   "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_tsbind PURGE'); \n" +
                   "    EXCEPTION \n" +
                   "        WHEN e_table_missing \n" +
                   "        THEN NULL; \n" +
                   "    END; \n" +
                   "    EXECUTE IMMEDIATE (' \n" +
                   "        CREATE TABLE nodb_tab_tsbind ( \n" +
                   "            id       NUMBER NOT NULL, \n" +
                   "            ts       TIMESTAMP, \n" +
                   "            tstz     TIMESTAMP WITH TIME ZONE \n" +
                   "        ) \n" +
                   "    '); \n" +
                   "END; ";

    await runSQL(proc);
  });

  after(async function() {
    const  sql = "drop table nodb_tab_tsbind purge";
    await runSQL(sql);
    await connection.close();
  });

  async function runSQL(sql) {
    await connection.execute(sql);
  }

  it('102.1 DML, IN bind, bind by name', async function() {
    const  bv = new Date(2003, 9, 23, 11, 50, 30, 123);
    const  id = caseIndex++;
    await connection.execute(
      "insert into nodb_tab_tsbind values (:i, :ts, :tz)",
      {
        i: id,
        ts: bv,
        tz: bv
      },
      {
        autoCommit: true
      });
    const result = await connection.execute(
      "select * from nodb_tab_tsbind where id = :i",
      { i: id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT });
    assert(result);
    assert.deepStrictEqual(result.rows[0].TS, bv);
    assert.deepStrictEqual(result.rows[0].TSTZ, bv);
  });

  it('102.2 DML, IN bind, bind by position', async function() {
    const  bv = new Date(0);
    const  id = caseIndex++;

    const binds = [
      id,
      {type: oracledb.DB_TYPE_TIMESTAMP, val: bv},
      {type: oracledb.DB_TYPE_TIMESTAMP_TZ, val: bv}
    ];
    await connection.execute(
      "insert into nodb_tab_tsbind values (:1, :2, :3)", binds,
      { autoCommit: true });

    const result = await connection.execute(
      "select * from nodb_tab_tsbind where id = :i",
      { i: id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT });
    assert.deepStrictEqual(result.rows[0].TS, bv);
    assert.deepStrictEqual(result.rows[0].TSTZ, bv);
  });

  it('102.3 DML, IN bind, Null', async function() {
    const  id = caseIndex++;
    const  bv = null;

    await connection.execute(
      "insert into nodb_tab_tsbind values (:i, :ts, :tz)",
      {
        i: id,
        ts: bv,
        tz: bv
      },
      {
        autoCommit: true
      });
    const result = await connection.execute("select * from nodb_tab_tsbind where id = :i",
      { i: id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT });
    assert(result);
    assert.strictEqual(result.rows[0].TS, null);
    assert.strictEqual(result.rows[0].TSTZ, null);
  });

  it('102.4 Negative - IN bind, value and type mismatch', async function() {
    const  id = caseIndex++;
    const  bv = new Date(2003, 9, 23, 11, 50, 30, 123);
    const  foo = { type: oracledb.NUMBER, val: bv};
    await assert.rejects(
      async () => {
        await connection.execute(
          "insert into nodb_tab_tsbind values (:i, :ts, :tz)",
          {
            i: id,
            ts: bv,
            tz: foo
          },
          {
            autoCommit: true
          });
      },
      /NJS-011: encountered bind value and type mismatch/
    );

    const result = await connection.execute(
      "select * from nodb_tab_tsbind where id = :i",
      { i: id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT });
    assert(result);
    assert.deepStrictEqual(result.rows, []);
  });

  it('102.5 DML, OUT bind, bind by position', async function() {
    const  id = caseIndex++;
    const  bv = new Date(0);

    let result = await connection.execute(
      "insert into nodb_tab_tsbind values (:1, :2, :3) returning id, tstz into :4, :5",
      [id, bv,
        { type: oracledb.DB_TYPE_TIMESTAMP_TZ, val: bv},
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT},
        { type: oracledb.DB_TYPE_TIMESTAMP_TZ, dir: oracledb.BIND_OUT} ],
      { autoCommit: true});
    assert(result);
    assert.strictEqual(result.outBinds[0][0], id);
    assert.deepStrictEqual(result.outBinds[1][0], bv);

    result = await connection.execute(
      "select * from nodb_tab_tsbind where id = :i",
      { i: id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT });
    assert.deepStrictEqual(result.rows[0].TS, bv);
    assert.deepStrictEqual(result.rows[0].TSTZ, bv);
  });

  it('102.6 DML, OUT bind, bind by name', async function() {
    const  id = caseIndex++;
    const  bv = new Date(2003, 9, 23, 11, 50, 30, 123);

    let result = await connection.execute(
      "insert into nodb_tab_tsbind values (:i, :ts, :tz) returning id, tstz into :oid, :otz",
      {
        i: id,
        ts: bv,
        tz: bv,
        oid: {dir: oracledb.BIND_OUT, type: oracledb.NUMBER},
        otz: {dir: oracledb.BIND_OUT, type: oracledb.DATE}
      },
      { autoCommit: true});
    assert(result);
    assert.strictEqual(result.outBinds.oid[0], id);
    assert.deepStrictEqual(result.outBinds.otz[0], bv);

    result = await connection.execute(
      "select * from nodb_tab_tsbind where id = :i",
      { i: id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT });
    assert.deepStrictEqual(result.rows[0].TS, bv);
    assert.deepStrictEqual(result.rows[0].TSTZ, bv);
  });

  it('102.7 Negative - OUB bind, value and type mismatch', async function() {
    const  id = caseIndex++;
    const  bv = new Date(10000000);

    await assert.rejects(
      async () => {
        await connection.execute(
          "insert into nodb_tab_tsbind values (:1, :2, :3) returning id, tstz into :4, :5",
          [id, bv, bv, { type: oracledb.NUMBER, dir: oracledb.BIND_OUT},
            { type: oracledb.NUMBER, dir: oracledb.BIND_OUT} ],
          { autoCommit: true});
      },
      /ORA-00932/
    ); // 'ORA-00932: inconsistent datatypes: expected NUMBER got TIMESTAMP WITH TIME ZONE'

    const result = await connection.execute(
      "select * from nodb_tab_tsbind where id = :i",
      { i: id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT });
    assert(result);
    assert.deepStrictEqual(result.rows, []);
  });

  it('102.8 DML, INOUT bind, bind by position', async function() {
    const  id = caseIndex++;
    const  bv = new Date(-1000000);

    let result = await connection.execute(
      "insert into nodb_tab_tsbind values (:1, :2, :3) returning id, tstz into :4, :5",
      [ { val: id, type: oracledb.NUMBER, dir: oracledb.BIND_IN }, bv,
        { val: bv, type: oracledb.DB_TYPE_TIMESTAMP_TZ, dir: oracledb.BIND_IN},
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT},
        { type: oracledb.DB_TYPE_TIMESTAMP_TZ, dir: oracledb.BIND_OUT} ],
      { autoCommit: true});

    assert.equal(result.outBinds[0][0], id);
    assert.deepStrictEqual(result.outBinds[1][0], bv);

    result = await connection.execute(
      "select * from nodb_tab_tsbind where id = :i",
      { i: id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT });

    assert.deepStrictEqual(result.rows[0].TS, bv);
    assert.deepStrictEqual(result.rows[0].TSTZ, bv);
  });

  it('102.9 DML, INOUT bind, bind by name', async function() {
    const  id = caseIndex++;
    const  bv = new Date('2015-07-23 22:00:00');

    let result = await connection.execute(
      "insert into nodb_tab_tsbind values (:i, :ts, :tz) returning ts, tstz into :ts1, :tz1",
      {
        i: id,
        ts: { val: bv, dir: oracledb.BIND_IN, type: oracledb.DATE },
        tz: { val: bv, dir: oracledb.BIND_IN, type: oracledb.DATE },
        ts1: { dir: oracledb.BIND_OUT, type: oracledb.DATE },
        tz1: { dir: oracledb.BIND_OUT, type: oracledb.DATE }
      },
      { autoCommit: true});

    assert(result);
    assert.deepStrictEqual(result.outBinds.ts1[0], bv);
    assert.deepStrictEqual(result.outBinds.tz1[0], bv);

    result = await connection.execute(
      "select * from nodb_tab_tsbind where id = :i",
      { i: id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT });

    assert.deepStrictEqual(result.rows[0].TS, bv);
    assert.deepStrictEqual(result.rows[0].TSTZ, bv);

  });

  it('102.10 Negative - INOUT bind, in bind value and type mismatch', async function() {
    const  id = caseIndex++;
    const  bv = new Date(1995, 11, 17);
    const sql = "insert into nodb_tab_tsbind values (:i, :ts, :tz) returning ts, tstz into :ts1, :tz1";
    const binds = {
      i: id,
      ts: { val: bv, dir: oracledb.BIND_IN, type: oracledb.DATE },
      tz: { val: bv, dir: oracledb.BIND_IN, type: oracledb.BUFFER },
      ts1: { dir: oracledb.BIND_OUT, type: oracledb.DATE },
      tz1: { dir: oracledb.BIND_OUT, type: oracledb.DATE }
    };
    const options = { autoCommit: true};

    await assert.rejects(
      async () => await connection.execute(sql, binds, options),
      /NJS-011:/
    );

    const result = await connection.execute(
      "select * from nodb_tab_tsbind where id = :i",
      { i: id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT });

    assert(result);
    assert.deepStrictEqual(result.rows, []);
  });

  it('102.11 Negative - INOUT bind, out bind value and type mismatch', async function() {
    const  id = caseIndex++;
    const  bv = new Date(1995, 11, 17);

    await assert.rejects(
      async () => {
        await connection.execute(
          "insert into nodb_tab_tsbind values (:i, :ts, :tz) returning ts, id into :ts1, :tz1",
          {
            i: id,
            ts: { val: bv, dir: oracledb.BIND_IN, type: oracledb.DATE },
            tz: { val: bv, dir: oracledb.BIND_IN, type: oracledb.DATE },
            ts1: { dir: oracledb.BIND_OUT, type: oracledb.DATE },
            tz1: { dir: oracledb.BIND_OUT, type: oracledb.DATE }
          },
          { autoCommit: true});
      },
      /ORA-00932/
    ); // 'ORA-00932: inconsistent datatypes: expected TIMESTAMP WITH LOCAL TIME ZONE got NUMBER'

    const result = await connection.execute(
      "select * from nodb_tab_tsbind where id = :i",
      { i: id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT });

    assert(result);
    assert.deepStrictEqual(result.rows, []);
  });

  it('102.12 DML, INOUT bind, Null values', async function() {
    const  id = caseIndex++;
    const  bv1 = new Date(1995, 11, 17);
    const  bv2 = null;

    let result = await connection.execute(
      "insert into nodb_tab_tsbind values (:i, :ts, :tz) returning ts, tstz into :ts1, :tz1",
      {
        i: id,
        ts: { val: bv1, dir: oracledb.BIND_IN, type: oracledb.DATE },
        tz: { val: bv2, dir: oracledb.BIND_IN, type: oracledb.DATE },
        ts1: { dir: oracledb.BIND_OUT, type: oracledb.DATE },
        tz1: { dir: oracledb.BIND_OUT, type: oracledb.DATE }
      },
      { autoCommit: true });

    assert(result);
    assert.deepStrictEqual(result.outBinds.ts1[0], bv1);
    assert.strictEqual(result.outBinds.tz1[0], null);

    result = await connection.execute(
      "select * from nodb_tab_tsbind where id = :i",
      { i: id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT });

    assert.deepStrictEqual(result.rows[0].TS, bv1);
    assert.strictEqual(result.rows[0].TSTZ, bv2);
  });

  describe('PL/SQL, IN bind', function() {
    before(async function() {
      const  proc = "CREATE OR REPLACE PROCEDURE nodb_proc_tstz_bindin (p_id IN NUMBER, " +
                   "    p_ts IN TIMESTAMP, p_tstz TIMESTAMP WITH TIME ZONE) \n" +
                   "AS \n" +
                   "BEGIN \n" +
                   "    insert into nodb_tab_tsbind (id, ts, tstz) values " +
                   "      (p_id, p_ts, p_tstz); \n" +
                   "END nodb_proc_tstz_bindin;";
      await runSQL(proc);
    });

    after(async function() {
      const  sql = "drop procedure nodb_proc_tstz_bindin";
      await runSQL(sql);
    });

    it('102.13 PL/SQL, IN bind, bind by name', async function() {
      const  id = caseIndex++;
      const  bv1 = new Date(2003, 9, 23, 11, 50, 30, 123);
      const  bv2 = new Date(10000000);

      await connection.execute(
        "begin nodb_proc_tstz_bindin (:i, :ts, :tz); end;",
        {
          i: id,
          ts: { val: bv1, dir: oracledb.BIND_IN, type: oracledb.DATE },
          tz: { val: bv2, dir: oracledb.BIND_IN,
            type: oracledb.DB_TYPE_TIMESTAMP_TZ }
        },
        { autoCommit: true });

      const result = await connection.execute(
        "select * from nodb_tab_tsbind where id = :i",
        { i: id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT });

      assert.deepStrictEqual(result.rows[0].TS, bv1);
      assert.deepStrictEqual(result.rows[0].TSTZ, bv2);
    });

    it('102.14 PL/SQL, IN bind, bind by position', async function() {
      const  id = caseIndex++;
      const  bv1 = new Date(2003, 9, 23, 11, 50, 30, 123);
      const  bv2 = new Date(10000000);

      await connection.execute(
        "begin nodb_proc_tstz_bindin (:1, :2, :3); end;",
        [
          id,
          { val: bv1, dir: oracledb.BIND_IN, type: oracledb.DATE },
          { val: bv2, dir: oracledb.BIND_IN,
            type: oracledb.DB_TYPE_TIMESTAMP_TZ }
        ],
        { autoCommit: true });

      const result = await connection.execute(
        "select * from nodb_tab_tsbind where id = :i",
        { i: id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT });

      assert(result);
      assert.deepStrictEqual(result.rows[0].TS, bv1);
      assert.deepStrictEqual(result.rows[0].TSTZ, bv2);
    });

    it('102.15 PL/SQL, IN bind, Null', async function() {
      const  id = caseIndex++;
      const  bv1 = null;
      const  bv2 = undefined;

      await connection.execute(
        "begin nodb_proc_tstz_bindin (:1, :2, :3); end;",
        [
          id,
          { val: bv1, dir: oracledb.BIND_IN, type: oracledb.DATE },
          { val: bv2, dir: oracledb.BIND_IN, type: oracledb.DATE }
        ],
        { autoCommit: true });

      const result = await connection.execute(
        "select * from nodb_tab_tsbind where id = :i",
        { i: id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT });

      assert(result);
      assert.strictEqual(result.rows[0].TS, null);
      assert.strictEqual(result.rows[0].TSTZ, null);
    });

    it('102.16 Negative - PL/SQL, IN bind, value and type mismatch', async function() {
      const  id = caseIndex++;
      const  bv1 = new Date(2003, 9, 23, 11, 50, 30, 123);
      const  bv2 = 0;

      await assert.rejects(
        async () => {
          await connection.execute(
            "begin nodb_proc_tstz_bindin (:1, :2, :3); end;",
            [
              id,
              { val: bv1, dir: oracledb.BIND_IN, type: oracledb.DATE },
              { val: bv2, dir: oracledb.BIND_IN, type: oracledb.DATE }
            ],
            { autoCommit: true });
        },
        /NJS-011: encountered bind value and type mismatch/
      );

      const result = await connection.execute(
        "select * from nodb_tab_tsbind where id = :i",
        { i: id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT });

      assert(result);
      assert.deepStrictEqual(result.rows, []);
    });

    const  negBindIn = async function(sequence, inType) {
      const  bv1 = new Date(2003, 9, 23, 11, 50, 30, 123);
      const  bv2 = new Date(10000000);

      await assert.rejects(
        async () => {
          await connection.execute(
            "begin nodb_proc_tstz_bindin (:1, :2, :3); end;",
            [
              sequence,
              { val: bv1, dir: oracledb.BIND_IN, type: oracledb.DATE },
              { val: bv2, dir: oracledb.BIND_IN, type: inType }
            ],
            { autoCommit: true });
        },
        /NJS-011: encountered bind value and type mismatch/
      );

      const result = await connection.execute(
        "select * from nodb_tab_tsbind where id = :i",
        { i: sequence },
        { outFormat: oracledb.OUT_FORMAT_OBJECT });
      assert(result);
      assert.deepStrictEqual(result.rows, []);

    };

    it('102.17 Negative - type and value mismatch, BLOB', async function() {
      const  id = caseIndex++;
      await negBindIn(id, oracledb.BLOB);
    });

    it('102.18 Negative - type and value mismatch, BUFFER', async function() {
      const  id = caseIndex++;
      await negBindIn(id, oracledb.BUFFER);
    });

    it('102.19 Negative - type and value mismatch, CLOB', async function() {
      const  id = caseIndex++;
      await negBindIn(id, oracledb.CLOB);
    });

    it('102.20 Negative - type and value mismatch, CURSOR', async function() {
      const  id = caseIndex++;
      await negBindIn(id, oracledb.CURSOR);
    });

    it.skip('102.21 Negative - type and value mismatch, DEFAULT', async function() {
      const  id = caseIndex++;
      await negBindIn(id, oracledb.DEFAULT);
    });

    it('102.22 Negative - type and value mismatch, NUMBER', async function() {
      const  id = caseIndex++;
      await negBindIn(id, oracledb.NUMBER);
    });

    it('102.23 Negative - type and value mismatch, STRING', async function() {
      const  id = caseIndex++;
      await negBindIn(id, oracledb.STRING);
    });

    it.skip('102.24 Negative - type and value mismatch, NOTEXIST', async function() {
      const  id = caseIndex++;
      await negBindIn(id, oracledb.NOTEXIST);
    });
  }); // PL/SQL, IN bind

  describe('PL/SQL, OUT bind', function() {

    before(async function() {
      const  proc = "CREATE OR REPLACE PROCEDURE nodb_proc_tstz_bind_out (p_id IN NUMBER, " +
                 "    p_ts OUT TIMESTAMP, p_tstz OUT TIMESTAMP WITH TIME ZONE) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    select ts, tstz into p_ts, p_tstz from nodb_tab_tsbind where id = p_id; \n" +
                 "END nodb_proc_tstz_bind_out; ";
      await runSQL(proc);
    });

    after(async function() {
      const  sql = "drop procedure nodb_proc_tstz_bind_out";
      await runSQL(sql);
    });

    it('102.25 PL/SQL, OUT bind, bind by position', async function() {
      const  id = caseIndex++;
      const  in_ts = new Date(1995, 11, 17);
      const  in_tz = new Date(2003, 9, 23, 11, 50, 30, 123);

      await connection.execute(
        "insert into nodb_tab_tsbind values(:i, :ts, :tz)",
        {
          i: id,
          ts: in_ts,
          tz: in_tz
        },
        { autoCommit: true });

      const result = await connection.execute(
        "begin nodb_proc_tstz_bind_out (:1, :2, :3); end;",
        [
          id,
          {dir: oracledb.BIND_OUT, type: oracledb.DATE},
          {dir: oracledb.BIND_OUT, type: oracledb.DATE}
        ]);

      assert(result);
      assert.deepStrictEqual(result.outBinds[0], in_ts);
      assert.deepStrictEqual(result.outBinds[1], in_tz);
    });

    it('102.26 PL/SQL, OUT bind, bind by name', async function() {
      const  id = caseIndex++;
      const  in_ts = null;
      const  in_tz = new Date(1995, 11, 17);

      await connection.execute(
        "insert into nodb_tab_tsbind values(:1, :2, :3)",
        [id, in_ts, in_tz],
        {autoCommit: true});

      const result = await connection.execute(
        "begin nodb_proc_tstz_bind_out (:i, :s, :z); end;",
        {
          i: id,
          s: {dir: oracledb.BIND_OUT, type: oracledb.DATE},
          z: {dir: oracledb.BIND_OUT, type: oracledb.DATE}
        });
      assert(result);
      assert.deepStrictEqual(result.outBinds.s, in_ts);
      assert.deepStrictEqual(result.outBinds.z, in_tz);
    });

    it('102.27 PL/SQL, OUT bind, Null', async function() {
      const  id = caseIndex++;
      const  in_ts = null;
      const  in_tz = undefined;

      await connection.execute(
        "insert into nodb_tab_tsbind values(:1, :2, :3)",
        [id, in_ts, in_tz],
        {autoCommit: true});

      const result = await connection.execute(
        "begin nodb_proc_tstz_bind_out (:i, :s, :z); end;",
        {
          i: id,
          s: {dir: oracledb.BIND_OUT, type: oracledb.DATE},
          z: {dir: oracledb.BIND_OUT, type: oracledb.DATE}
        });

      assert(result);
      assert.strictEqual(result.outBinds.s, null);
      assert.strictEqual(result.outBinds.z, null);
    });

    it('102.28 Negative - PL/SQL, OUT bind, value and type mismatch', async function() {
      const  id = caseIndex++;
      const  in_ts = new Date(1995, 11, 17);
      const  in_tz = 23;

      await assert.rejects(
        async () => {
          await connection.execute(
            "insert into nodb_tab_tsbind values(:1, :2, :3)",
            [id, in_ts, in_tz],
            {autoCommit: true});
        },
        /ORA-00932/
      ); // ORA-00932: inconsistent datatypes...

      await assert.rejects(
        async () => {
          await connection.execute(
            "begin nodb_proc_tstz_bind_out (:i, :s, :z); end;",
            {
              i: id,
              s: {dir: oracledb.BIND_OUT, type: oracledb.DATE},
              z: {dir: oracledb.BIND_OUT, type: oracledb.DATE}
            });
        },
        /ORA-01403/
      ); // 'ORA-01403: no data found
    });

    const  negBindOut = async function(sequence, outType) {
      const  in_ts = new Date(1995, 11, 17);
      const  in_tz = new Date(2003, 9, 23, 11, 50, 30, 123);

      await connection.execute(
        "insert into nodb_tab_tsbind values(:1, :2, :3)",
        [sequence, in_ts, in_tz],
        {autoCommit: true});

      await assert.rejects(
        async () => {
          await connection.execute(
            "begin nodb_proc_tstz_bind_out (:i, :s, :z); end;",
            {
              i: sequence,
              s: {dir: oracledb.BIND_OUT, type: oracledb.DATE},
              z: {dir: oracledb.BIND_OUT, type: outType}
            });
        },
        /ORA-06550/
      );
    };

    it('102.29 Negative - type and value mismatch, BLOB', async function() {
      const  id = caseIndex++;
      await negBindOut(id, oracledb.BLOB);
    });

    it.skip('102.30 Negative - type and value mismatch, BUFFER', async function() {
      const  id = caseIndex++;
      await negBindOut(id, oracledb.DEFAULT);
    });

    it('102.31 Negative - type and value mismatch, CLOB', async function() {
      const  id = caseIndex++;
      await negBindOut(id, oracledb.CLOB);
    });

    it('102.32 Negative - type and value mismatch, CURSOR', async function() {
      const  id = caseIndex++;
      await negBindOut(id, oracledb.CURSOR);
    });

    it.skip('102.33 Negative - type and value mismatch, DEFAULT', async function() {
      const  id = caseIndex++;
      await negBindOut(id, oracledb.DEFAULT);
    });

    it('102.34 Negative - type and value mismatch, NUMBER', async function() {
      const  id = caseIndex++;
      await negBindOut(id, oracledb.NUMBER);
    });

    it.skip('102.35 Negative - type and value mismatch, STRING', async function() {
      const  id = caseIndex++;
      await negBindOut(id, oracledb.STRING);
    });

    it.skip('102.36 Negative - type and value mismatch, NOTEXIST', async function() {
      const  id = caseIndex++;
      await negBindOut(id, oracledb.NOTEXIST);
    });

  }); // PL/SQL, OUT bind

  describe('PL/SQL, IN OUT bind', function() {
    before(async function() {
      const  proc = "CREATE OR REPLACE PROCEDURE nodb_proc_tstz_bind_in_out (p_id IN NUMBER, " +
                 "    p_ts IN OUT TIMESTAMP, p_tstz IN OUT TIMESTAMP WITH TIME ZONE) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_tsbind (id, ts, tstz) values (p_id, p_ts, p_tstz); \n" +
                 "    select ts, tstz into p_ts, p_tstz from nodb_tab_tsbind where id = p_id; \n" +
                 "END nodb_proc_tstz_bind_in_out; ";
      await runSQL(proc);
    });

    after(async function() {
      const  sql = "drop procedure nodb_proc_tstz_bind_in_out";
      await runSQL(sql);
    });

    it('102.37 PL/SQL, IN OUT bind, bind by name', async function() {
      const  id = caseIndex++;
      const  in_ts = new Date(1995, 11, 17);
      const  in_tz = new Date(2003, 9, 23, 11, 50, 30, 123);
      const  sql = "begin nodb_proc_tstz_bind_in_out(:i, :io_ts, :io_tz); end;";

      const result = await connection.execute(
        sql,
        {
          i: id,
          io_ts: { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_ts },
          io_tz: { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_tz }
        },
        { autoCommit: true });
      assert(result);
      assert.deepStrictEqual(result.outBinds.io_ts, in_ts);
      assert.deepStrictEqual(result.outBinds.io_tz, in_tz);
    });

    it('102.38 PL/SQL, IN OUT bind, bind by position', async function() {
      const  id = caseIndex++;
      const  in_ts = new Date(1995, 11, 17);
      const  in_tz = new Date(2003, 9, 23, 11, 50, 30, 123);
      const  sql = "begin nodb_proc_tstz_bind_in_out(:1, :2, :3); end;";

      const result = await connection.execute(
        sql,
        [
          id,
          { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_ts },
          { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_tz }
        ],
        { autoCommit: true });

      assert(result);
      assert.deepStrictEqual(result.outBinds[0], in_ts);
      assert.deepStrictEqual(result.outBinds[1], in_tz);
    });

    it('102.39 PL/SQL, IN OUT bind, Null', async function() {
      const  id = caseIndex++;
      const  in_ts = undefined;
      const  in_tz = null;
      const  sql = "begin nodb_proc_tstz_bind_in_out(:1, :2, :3); end;";

      const result = await connection.execute(
        sql,
        [
          id,
          { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_ts },
          { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_tz }
        ],
        { autoCommit: true });

      assert(result);
      assert.strictEqual(result.outBinds[0], null);
      assert.strictEqual(result.outBinds[1], null);
    });

    it('102.40 Negative - value and type mismatch', async function() {
      const  id = caseIndex++;
      const  in_ts = new Date(1995, 11, 17);
      const  in_tz = "new Date(2003, 9, 23, 11, 50, 30, 123)";
      const  sql = "begin nodb_proc_tstz_bind_in_out(:1, :2, :3); end;";

      await assert.rejects(
        async () => {
          await connection.execute(
            sql,
            [
              id,
              { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_ts },
              { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_tz }
            ],
            { autoCommit: true });
        },
        /NJS-011: encountered bind value and type mismatch/
      );
    });

    const  negBindInOut = async function(sequence, inoutType) {
      const  in_ts = new Date(1995, 11, 17);
      const  in_tz = new Date(2003, 9, 23, 11, 50, 30, 123);
      const  sql = "begin nodb_proc_tstz_bind_in_out(:1, :2, :3); end;";

      await assert.rejects(
        async () => {
          await connection.execute(
            sql,
            [
              sequence,
              { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_ts },
              { dir: oracledb.BIND_INOUT, type: inoutType, val: in_tz }
            ],
            { autoCommit: true });
        },
        /NJS-011: encountered bind value and type mismatch/
      );
    };

    it('102.41 Negative - type and value mismatch, BLOB', async function() {
      const  id = caseIndex++;
      await negBindInOut(id, oracledb.BLOB);
    });

    it('102.42 Negative - type and value mismatch, BUFFER', async function() {
      const  id = caseIndex++;
      await negBindInOut(id, oracledb.BUFFER);
    });

    it('102.43 Negative - type and value mismatch, CLOB', async function() {
      const  id = caseIndex++;
      await negBindInOut(id, oracledb.CLOB);
    });

    it('102.44 Negative - type and value mismatch, CURSOR', async function() {
      const  id = caseIndex++;
      await negBindInOut(id, oracledb.CURSOR);
    });

    it.skip('102.45 Negative - type and value mismatch, DEFAULT', async function() {
      const  id = caseIndex++;
      await negBindInOut(id, oracledb.DEFAULT);
    });

    it('102.46 Negative - type and value mismatch, NUMBER', async function() {
      const  id = caseIndex++;
      await negBindInOut(id, oracledb.NUMBER);
    });

    it('102.47 Negative - type and value mismatch, STRING', async function() {
      const  id = caseIndex++;
      await negBindInOut(id, oracledb.STRING);
    });
  }); // PL/SQL, BIND IN OUT

});

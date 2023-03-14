/* Copyright (c) 2016, 2023, Oracle and/or its affiliates. */

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
 *   71. lobBind1.js
 *
 * DESCRIPTION
 *   Testing binding LOB data.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const fs       = require('fs');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');

describe('71. lobBind1.js', function() {

  let connection = null;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
  }); // before

  after(async function() {
    await connection.close();
  }); // after

  describe('71.1 persistent CLOB', function() {

    before('create the tables', async function() {

      const proc1 = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_clob1 PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_clob1 ( \n" +
                 "            id       NUMBER, \n" +
                 "            content  CLOB \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";

      const proc2 = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_clob2 PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_clob2 ( \n" +
                 "            id       NUMBER, \n" +
                 "            content  CLOB \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";

      await connection.execute(proc1);
      await connection.execute(proc2);

    }); // before

    after(async function() {
      await connection.execute("DROP TABLE nodb_tab_clob1 PURGE");
      await connection.execute("DROP TABLE nodb_tab_clob2 PURGE");
    }); // after

    const inFileName = './test/clobexample.txt';

    const prepareTableWithClob = async function(sequence) {

      const sql = "INSERT INTO nodb_tab_clob1 (id, content) " +
                "VALUES (:i, EMPTY_CLOB()) RETURNING content " +
                "INTO :lobbv";
      const bindVar = { i: sequence, lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } };

      // a transaction needs to span the INSERT and pipe()
      const result = await connection.execute(sql, bindVar, { autoCommit: false });
      assert.strictEqual(result.rowsAffected, 1);
      assert.strictEqual(result.outBinds.lobbv.length, 1);

      const inStream = fs.createReadStream(inFileName);
      const lob = result.outBinds.lobbv[0];
      await new Promise((resolve, reject) => {
        inStream.on('error', reject);
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.pipe(lob); // copies the text to the CLOB
      });
      await connection.commit();
    };

    const verifyClobValue = async function(sequence) {

      const sql = "SELECT content FROM nodb_tab_clob2 WHERE id = :id";
      const result = await connection.execute(sql, { id: sequence });
      if (sequence === 2) {
        assert.deepStrictEqual(result.rows, [[null]]);
        return;
      }

      const lob = result.rows[0][0];
      const clobData = await lob.getData();
      if (sequence === 1) {
        assert.strictEqual(clobData, 'some CLOB data');
      } else {
        const originalData = await fs.promises.readFile(inFileName, { encoding: 'utf8' });
        assert.strictEqual(clobData, originalData);
      }
    }; // verifyClobValue

    it('71.1.1 BIND_IN, DML, a String variable', async function() {

      const seq = 1;
      const lobData = "some CLOB data";

      const sql = "INSERT INTO nodb_tab_clob1 VALUES(:i, :d)";
      const bindVar = {
        i: { val: seq, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        d: { val: lobData, dir: oracledb.BIND_IN, type: oracledb.STRING }
      };
      let result = await connection.execute(sql, bindVar, { autoCommit: true });
      assert.strictEqual(result.rowsAffected, 1);

      const sql1 = "SELECT content FROM nodb_tab_clob1 WHERE id = :id";
      const sql2 = "INSERT INTO nodb_tab_clob2 (id, content) VALUES (:i, :c)";
      result = await connection.execute(sql1, { id: seq });
      assert.notStrictEqual(result.rows.length, 0);

      const lob = result.rows[0][0];
      await connection.execute(
        sql2,
        {
          i: seq,
          c: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
        },
        { autoCommit: true }
      );
      await lob.close();
      await verifyClobValue(seq);
    }); // 71.1.1

    it('71.1.2 BIND_IN, DML, null', async function() {

      const seq = 2;
      const lobData = null;

      const sql = "INSERT INTO nodb_tab_clob1 VALUES(:i, :d)";
      const bindVar = {
        i: { val: seq, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        d: { val: lobData, dir: oracledb.BIND_IN, type: oracledb.STRING }
      };
      let result = await connection.execute(sql, bindVar, { autoCommit: true });
      assert.strictEqual(result.rowsAffected, 1);

      const sql1 = "SELECT content FROM nodb_tab_clob1 WHERE id = :id";
      const sql2 = "INSERT INTO nodb_tab_clob2 (id, content) VALUES (:i, :c)";
      result = await connection.execute(sql1, { id: seq });
      assert.notStrictEqual(result.rows.length, 0);

      const lob = result.rows[0][0];
      await connection.execute(
        sql2,
        {
          i: seq,
          c: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
        },
        { autoCommit: true }
      );
      await verifyClobValue(seq);
    }); // 71.1.2

    it('71.1.3 BIND_IN, DML, a txt file', async function() {

      const seq = 3;

      await prepareTableWithClob(seq);
      const sql1 = "SELECT content FROM nodb_tab_clob1 WHERE id = :id";
      const sql2 = "INSERT INTO nodb_tab_clob2 (id, content) VALUES (:i, :c)";
      const result = await connection.execute(sql1, { id: seq });
      assert.notStrictEqual(result.rows.length, 0);

      const lob = result.rows[0][0];
      await connection.execute(
        sql2,
        {
          i: seq,
          c: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
        },
        { autoCommit: true }
      );
      await lob.close();
      await verifyClobValue(seq);
    }); // 71.1.3

    it('71.1.4 BIND_IN, PL/SQL, a txt file', async function() {

      const seq = 4;
      const proc = "CREATE OR REPLACE PROCEDURE nodb_clobinproc1 (p_num IN NUMBER, p_lob IN CLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_clob2 (id, content) VALUES (p_num, p_lob); \n" +
                 "END nodb_clobinproc1;";

      await connection.execute(proc);
      await prepareTableWithClob(seq);

      const sql1 = "SELECT content FROM nodb_tab_clob1 WHERE id = :id";
      const sql2 = "begin nodb_clobinproc1(:1, :2); end;";
      let result = await connection.execute(sql1, { id: seq });
      assert.notStrictEqual(result.rows.length, 0);

      const lob = result.rows[0][0];
      result = await connection.execute(
        sql2,
        [
          { val: seq, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
        ],
        { autoCommit: true }
      );
      await lob.close();
      await verifyClobValue(seq);

      const sql = "DROP PROCEDURE nodb_clobinproc1";
      await connection.execute(sql);
    }); // 71.1.4

    it('71.1.5 BIND_OUT, PL/SQL, a string', async function() {

      const proc = "CREATE OR REPLACE PROCEDURE nodb_cloboutproc_str(p_lob OUT CLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    select to_clob('I love the sunshine today.') into p_lob from dual; \n" +
                 "END nodb_cloboutproc_str;";

      const sql = "begin nodb_cloboutproc_str(:c); end;";

      await connection.execute(proc);
      const result = await connection.execute(
        sql,
        { c: { dir: oracledb.BIND_OUT, type: oracledb.CLOB } }
      );
      const lob = result.outBinds.c;
      const clobData = await lob.getData();
      assert.strictEqual(clobData, "I love the sunshine today.");

      const sqlDrop =  "DROP PROCEDURE nodb_cloboutproc_str";
      await connection.execute(sqlDrop);
    }); // 71.1.5

    it('71.1.6 BIND_OUT, PL/SQL, a txt file', async function() {

      const seq = 6;
      const proc = "CREATE OR REPLACE PROCEDURE nodb_cloboutproc1(p_num IN NUMBER, p_lob OUT CLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    select content into p_lob from nodb_tab_clob1 WHERE id = p_num; \n" +
                 "END nodb_cloboutproc1;";
      await connection.execute(proc);
      await prepareTableWithClob(seq);

      const sql = "begin nodb_cloboutproc1(:id, :c); end;";
      const result = await connection.execute(
        sql,
        {
          id: { val: seq, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c:  { dir: oracledb.BIND_OUT, type: oracledb.CLOB }
        }
      );
      const lob = result.outBinds.c;
      const clobData = await lob.getData();
      const originalData = await fs.promises.readFile(inFileName, { encoding: 'utf8' });
      assert.strictEqual(clobData, originalData);

      const sqlDrop =  "DROP PROCEDURE nodb_cloboutproc1";
      await connection.execute(sqlDrop);
    }); // 71.1.6

    it('71.1.7 BIND_INOUT, PL/SQL, A String. IN LOB gets closed automatically.', async function() {

      const seq = 7;
      const inStr  = "I love the sunshine today!";
      const outStr = "A new day has come.";

      const proc = "CREATE OR REPLACE PROCEDURE nodb_proc_clob_inout1 \n" +
                 "  (p_num IN NUMBER, p_inout IN OUT CLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_clob2 (id, content) values (p_num, p_inout); \n" +
                 "    select to_clob('" + outStr + "') into p_inout from dual; \n" +
                 "END nodb_proc_clob_inout1;";
      await connection.execute(proc);
      let sql = "INSERT INTO nodb_tab_clob1 (id, content) VALUES \n" +
                    " (:i, '" + inStr + "')";
      await connection.execute(
        sql,
        { i: seq }
      );

      const sql1 = "SELECT content FROM nodb_tab_clob1 WHERE id = :id";
      const sql2 = "begin nodb_proc_clob_inout1(:id, :io); end;";
      let result = await connection.execute(
        sql1,
        { id: seq }
      );
      assert.notStrictEqual(result.rows.length, 0);

      let lobin = result.rows[0][0];

      result = await connection.execute(
        sql2,
        {
          id: seq,
          io: { val: lobin, type: oracledb.CLOB, dir: oracledb.BIND_INOUT }
        },
        { autoCommit: true }
      );

      const lobout = result.outBinds.io;
      let clobData = await lobout.getData();
      assert.strictEqual(clobData, outStr);
      // Verify BindIn value
      sql = "SELECT content FROM nodb_tab_clob2 WHERE id = :1";
      result = await connection.execute(sql, [ seq ]);
      lobin = result.rows[0][0];
      clobData = await lobin.getData();
      assert.strictEqual(clobData, inStr);

      await connection.execute("DROP PROCEDURE nodb_proc_clob_inout1");
    });

    it('71.1.8 BIND_INOUT, PL/SQL, a txt file', async function() {

      const seq = 8;
      const outStr = "It binds IN a txt file, and binds OUT a String.";

      const proc = "CREATE OR REPLACE PROCEDURE nodb_proc_clob_inout2 \n" +
                 "  (p_num IN NUMBER, p_inout IN OUT CLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_clob2 (id, content) values (p_num, p_inout); \n" +
                 "    select to_clob('" + outStr + "') into p_inout from dual; \n" +
                 "END nodb_proc_clob_inout2;";
      await connection.execute(proc);
      await prepareTableWithClob(seq);

      const sql1 = "SELECT content FROM nodb_tab_clob1 WHERE id = :id";
      const sql2 = "begin nodb_proc_clob_inout2(:id, :io); end;";

      let result = await connection.execute(sql1, { id: seq });
      assert.notStrictEqual(result.rows.length, 0);

      const lob = result.rows[0][0];
      result = await connection.execute(
        sql2,
        {
          id: seq,
          io: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_INOUT }
        },
        { autoCommit: true }
      );
      const lobout = result.outBinds.io;
      const clobData = await lobout.getData();
      assert.strictEqual(clobData, outStr);

      await verifyClobValue(seq);
      const sql = "DROP PROCEDURE nodb_proc_clob_inout2";
      await connection.execute(sql);
    }); // 71.1.8

    it('71.1.9 BIND_INOUT, PL/SQL, a String as the bind IN Value', async function() {

      const seq = 9;
      const inStr = "I love the sunshine today!";
      const outStr = "A new day has come.";

      const proc = "CREATE OR REPLACE PROCEDURE nodb_proc_clob_inout3 \n" +
                 "  (p_num IN NUMBER, p_inout IN OUT CLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_clob2 (id, content) values (p_num, p_inout); \n" +
                 "    select to_clob('" + outStr + "') into p_inout from dual; \n" +
                 "END nodb_proc_clob_inout3;";
      await connection.execute(proc);

      const sql = "begin nodb_proc_clob_inout3(:id, :io); end;";
      const result = await connection.execute(
        sql,
        {
          id: seq,
          io: { val: inStr, type: oracledb.CLOB, dir: oracledb.BIND_INOUT }
        },
        { autoCommit: true }
      );
      const lobout = result.outBinds.io;
      const clobData = await lobout.getData();
      assert.strictEqual(clobData, outStr);

      await connection.execute("DROP PROCEDURE nodb_proc_clob_inout3");
    }); // 71.1.9

  }); // 71.1

  describe("71.2 persistent BLOB", function() {

    before('create the tables', async function() {

      const proc1 = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_blob1 PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_blob1 ( \n" +
                 "            id       NUMBER, \n" +
                 "            content  BLOB \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";

      const proc2 = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_blob2 PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_blob2 ( \n" +
                 "            id       NUMBER, \n" +
                 "            content  BLOB \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";

      await connection.execute(proc1);
      await connection.execute(proc2);
    }); // before

    after(async function() {
      await connection.execute("DROP TABLE nodb_tab_blob1 PURGE");
      await connection.execute("DROP TABLE nodb_tab_blob2 PURGE");
    }); // after

    const jpgFileName = './test/fuzzydinosaur.jpg';
    const treeAnotherJPG = './test/tree.jpg';

    const prepareTableWithBlob = async function(sequence, filepath) {

      const sql = "INSERT INTO nodb_tab_blob1 (id, content) " +
                "VALUES (:i, EMPTY_BLOB()) RETURNING content " +
                "INTO :lobbv";
      const bindVar = { i: sequence, lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } };
      // a transaction needs to span the INSERT and pipe()
      const result = await connection.execute(
        sql,
        bindVar,
        { autoCommit: false }
      );
      assert.strictEqual(result.rowsAffected, 1);
      assert.strictEqual(result.outBinds.lobbv.length, 1);

      const inStream = fs.createReadStream(filepath);
      const lob = result.outBinds.lobbv[0];
      await new Promise((resolve, reject) => {
        inStream.on('error', reject);
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.pipe(lob); // copies the text to the CLOB
      });
      await connection.commit();
    }; // prepareTableWithBlob()

    const bindBlob = async function(sequence) {

      const sql1 = "SELECT content FROM nodb_tab_blob1 WHERE id = :id",
        sql2 = "INSERT INTO nodb_tab_blob2 (id, content) VALUES (:1, :2)";

      const result = await connection.execute(sql1, { id: sequence });
      assert.notStrictEqual(result.rows.length, 0);

      const lob = result.rows[0][0];

      await connection.execute(
        sql2,
        [
          sequence,
          { val: lob, type: oracledb.BLOB, dir: oracledb.BIND_IN }
        ],
        { autoCommit: true }
      );

      if (lob) return await lob.close();
    }; // bindBlob()

    const verifyBlobValue = async function(sequence, inlob) {

      const sql = "SELECT content FROM nodb_tab_blob2 WHERE id = :id";

      const result = await connection.execute(sql, { id: sequence });
      const lob = result.rows[0][0];
      const blobData = await lob.getData();

      if ((sequence === 1) || (sequence === 7)) {
        assert.deepStrictEqual(blobData, inlob);
      } else {
        const originalData = await fs.promises.readFile(inlob);
        assert.strictEqual(blobData.length, originalData.length);
        assert.deepStrictEqual(originalData, blobData);
      }
    }; // verifyBlobValue()

    it('71.2.1 BIND_IN, DML, a Buffer value', async function() {

      const seq = 1;
      const bufSize = 10000;
      const buf = assist.createBuffer(bufSize);

      const sql = "INSERT INTO nodb_tab_blob1 VALUES (:1, :2)";
      const bindVar = [
        { val: seq, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        { val: buf, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
      ];
      const result = await connection.execute(sql, bindVar,  { autoCommit: true });
      assert.strictEqual(result.rowsAffected, 1);

      await bindBlob(seq);
      await verifyBlobValue(seq, buf);
    }); // 71.2.1

    it('71.2.2 BIND_IN, DML, null', async function() {

      const seq = 2;
      const lobData = Buffer.alloc(0);

      let sql = "insert into nodb_tab_blob1 values (:i, :d)";
      const bindVar = {
        i: { val: seq, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        d: { val: lobData, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
      };
      await connection.execute(sql, bindVar,  { autoCommit: true });
      await bindBlob(seq);

      sql = "SELECT content FROM nodb_tab_blob2 WHERE id = :id";
      const result = await connection.execute(sql, { id: seq });
      assert.deepStrictEqual(result.rows, [ [ null ] ]);
    }); // 71.2.2

    it('71.2.3 BIND_IN, DML, a jpg file', async function() {
      const seq = 3;
      await prepareTableWithBlob(seq, jpgFileName);
      await bindBlob(seq);
      await verifyBlobValue(seq, jpgFileName);
    }); // 71.2.3

    it('71.2.4 BIND_IN, PL/SQL, a jpg file', async function() {
      const seq = 4;
      const proc = "CREATE OR REPLACE PROCEDURE nodb_proc_blob_in (p_num IN NUMBER, p_lob IN BLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_blob2 (id, content) VALUES (p_num, p_lob); \n" +
                 "END nodb_proc_blob_in;";

      await connection.execute(proc);
      await prepareTableWithBlob(seq, jpgFileName);

      const sql1 = "SELECT content FROM nodb_tab_blob1 WHERE id = :id",
        sql2 = "begin nodb_proc_blob_in(:1, :2); end;";

      const result = await connection.execute(sql1, { id: seq });
      assert.notStrictEqual(result.rows.length, 0);

      const lob = result.rows[0][0];
      await connection.execute(
        sql2,
        [
          seq,
          { val: lob, type: oracledb.BLOB, dir: oracledb.BIND_IN }
        ],
        { autoCommit: true }
      );
      await lob.close();

      await verifyBlobValue(seq, jpgFileName);

      await connection.execute("DROP PROCEDURE nodb_proc_blob_in");
    }); // 71.2.4

    it('71.2.5 BIND_OUT, PL/SQL, a Buffer value', async function() {

      const seq = 5;
      const bufSize = 1000;
      const buf = assist.createBuffer(bufSize);

      const proc = "CREATE OR REPLACE PROCEDURE nodb_proc_blob_out1 (p_num IN NUMBER, p_lob OUT BLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    select content into p_lob from nodb_tab_blob2 where id = p_num; \n" +
                 "END nodb_proc_blob_out1;";

      await connection.execute(proc);
      let sql = "insert into nodb_tab_blob2 values (:1, :2)";
      let bindVar = [
        seq,
        { val: buf, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
      ];

      await connection.execute(sql, bindVar, { autoCommit: true });

      sql = "begin nodb_proc_blob_out1(:i, :b); end;";
      bindVar = {
        i: seq,
        b: { dir: oracledb.BIND_OUT, type: oracledb.BLOB }
      };
      const result = await connection.execute(sql, bindVar);
      const lob = result.outBinds.b;
      const blobData = await lob.getData();

      assert.strictEqual(blobData.length, buf.length);
      assert.deepStrictEqual(blobData, buf);

      await connection.execute("DROP PROCEDURE nodb_proc_blob_out1");
    }); // 71.2.5

    it('71.2.6 BIND_OUT, PL/SQL, a jpg file', async function() {

      const seq = 6;
      const proc = "CREATE OR REPLACE PROCEDURE nodb_proc_blob_out2 (p_num IN NUMBER, p_lob OUT BLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    select content into p_lob from nodb_tab_blob1 where id = p_num; \n" +
                 "END nodb_proc_blob_out2;";

      await connection.execute(proc);
      await prepareTableWithBlob(seq, jpgFileName);

      const sql = "begin nodb_proc_blob_out2(:1, :2); end;";
      const bindVar = [
        seq,
        { dir: oracledb.BIND_OUT, type: oracledb.BLOB }
      ];
      const result = await connection.execute(sql, bindVar);
      const lob = result.outBinds[0];

      const blobData = await lob.getData();
      const originalData = await fs.promises.readFile(jpgFileName);
      assert.strictEqual(blobData.length, originalData.length);
      assert.deepStrictEqual(originalData, blobData);

      await connection.execute("DROP PROCEDURE nodb_proc_blob_out2");
    }); // 71.2.6

    it('71.2.7 BIND_INOUT, PL/SQL, a Buffer value', async function() {

      const seq = 7;
      const outBufID = 70;
      const inBuf  = assist.createBuffer(10);
      const outBuf = assist.createBuffer(100);

      const proc = "CREATE OR REPLACE PROCEDURE nodb_proc_blob_inout1 \n" +
                 "  (p_in IN NUMBER, p_outbufid IN NUMBER, p_inout IN OUT BLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_blob2 (id, content) values (p_in, p_inout); \n" +
                 "    select content into p_inout from nodb_tab_blob1 where id = p_outbufid; \n" +
                 "END nodb_proc_blob_inout1;";

      await connection.execute(proc);
      const sql = "insert into nodb_tab_blob1 values (:1, :2)";
      const bindVar = [
        seq,
        { val: inBuf, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
      ];

      await connection.execute(sql, bindVar, { autoCommit: true });

      await connection.execute(
        "insert into nodb_tab_blob1 values (:i, :b)",
        {
          i: outBufID,
          b: { val: outBuf, dir:oracledb.BIND_IN, type: oracledb.BUFFER }
        },
        { autoCommit: true });

      const result1 = await connection.execute(
        "select content from nodb_tab_blob1 where id = :1",
        [ seq ]
      );
      const lobin = result1.rows[0][0];

      const result2 = await connection.execute(
        "begin nodb_proc_blob_inout1 (:in, :oid, :io); end;",
        {
          in: seq,
          oid: outBufID,
          io: { val: lobin, type: oracledb.BLOB, dir: oracledb.BIND_INOUT }
        },
        { autoCommit: true }
      );

      const lobout = result2.outBinds.io;
      const blobData = await lobout.getData();
      assert.deepStrictEqual(blobData, outBuf);

      await verifyBlobValue(seq, inBuf);

      await connection.execute("DROP PROCEDURE nodb_proc_blob_inout1");
    }); // 71.2.7

    it('71.2.8 BIND_INOUT, PL/SQL, a jpg file', async function() {

      const seq = 8;
      const treeID = 100;

      const proc = "CREATE OR REPLACE PROCEDURE nodb_proc_blob_inout2 \n" +
                 "  (p_in_seq IN NUMBER, p_in_tree IN NUMBER, p_inout IN OUT BLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_blob2 (id, content) values (p_in_seq, p_inout); \n" +
                 "    select content into p_inout from nodb_tab_blob1 where id = p_in_tree; \n" +
                 "END nodb_proc_blob_inout2;";

      await connection.execute(proc);
      await prepareTableWithBlob(seq, jpgFileName);
      await prepareTableWithBlob(treeID, treeAnotherJPG);

      const sql1 = "select content from nodb_tab_blob1 where id = :id";
      const sql2 = "begin nodb_proc_blob_inout2(:i, :tree, :io); end;";

      let result = await connection.execute(sql1, { id: seq });
      assert.notStrictEqual(result.rows.length, 0);
      // bindin lob is the tree.jpg
      const inlob = result.rows[0][0];
      result = await connection.execute(
        sql2,
        {
          i: seq,
          tree: treeID,
          io: { val: inlob, dir: oracledb.BIND_INOUT, type: oracledb.BLOB }
        },
        { autoCommit: true }
      );
      const lob = result.outBinds.io;

      const blobData = await lob.getData();
      const treeData = await fs.promises.readFile(treeAnotherJPG);
      assert.deepStrictEqual(treeData, blobData);

      await verifyBlobValue(seq, jpgFileName);

      await connection.execute("DROP PROCEDURE nodb_proc_blob_inout2");

    }); // 71.2.8

    it('71.2.9 BIND_INOUT, PL/SQL, a Buffer as the bind IN value', async function() {

      const seq = 9;
      const inBuf  = assist.createBuffer(10);

      const proc = "CREATE OR REPLACE PROCEDURE nodb_proc_blob_inout3 \n" +
                 "  (p_in IN NUMBER, p_inout IN OUT BLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_blob2 (id, content) values (p_in, p_inout); \n" +
                 "    select content into p_inout from nodb_tab_blob1 where id = p_in; \n" +
                 "END nodb_proc_blob_inout3;";

      await connection.execute(proc);
      await prepareTableWithBlob(seq, jpgFileName);
      const sql = "begin nodb_proc_blob_inout3 (:i, :io); end;";
      const bindVar = {
        i:  seq,
        io: { val: inBuf, type: oracledb.BLOB, dir: oracledb.BIND_INOUT }
      };
      const result = await connection.execute(sql, bindVar, { autoCommit: true });
      const lob = result.outBinds.io;
      const blobData = await lob.getData();
      const originalData = await fs.promises.readFile(jpgFileName);
      assert.deepStrictEqual(blobData, originalData);

      await connection.execute("DROP PROCEDURE nodb_proc_blob_inout3");
    }); // 71.2.9

  }); // 71.2

});

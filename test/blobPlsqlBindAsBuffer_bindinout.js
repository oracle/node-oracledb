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
 *   79. blobPlsqlBindAsBuffer_bindinout.js
 *
 * DESCRIPTION
 *   Testing BLOB binding inout as Buffer.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const fs       = require('fs');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');

describe('79. blobPlsqlBindAsBuffer_bindinout.js', function() {

  let connection = null;
  let insertID = 1; // assume id for insert into db starts from 1

  const proc_blob_in_tab = "BEGIN \n" +
                         "    DECLARE \n" +
                         "        e_table_missing EXCEPTION; \n" +
                         "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                         "    BEGIN \n" +
                         "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_blob_in PURGE'); \n" +
                         "    EXCEPTION \n" +
                         "        WHEN e_table_missing \n" +
                         "        THEN NULL; \n" +
                         "    END; \n" +
                         "    EXECUTE IMMEDIATE (' \n" +
                         "        CREATE TABLE nodb_tab_blob_in ( \n" +
                         "            id      NUMBER, \n" +
                         "            blob_1  BLOB, \n" +
                         "            blob_2  BLOB \n" +
                         "        ) \n" +
                         "    '); \n" +
                         "END; ";

  const proc_lobs_in_tab = "BEGIN \n" +
                         "    DECLARE \n" +
                         "        e_table_missing EXCEPTION; \n" +
                         "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                         "    BEGIN \n" +
                         "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_lobs_in PURGE'); \n" +
                         "    EXCEPTION \n" +
                         "        WHEN e_table_missing \n" +
                         "        THEN NULL; \n" +
                         "    END; \n" +
                         "    EXECUTE IMMEDIATE (' \n" +
                         "        CREATE TABLE nodb_tab_lobs_in ( \n" +
                         "            id    NUMBER, \n" +
                         "            blob  BLOB \n" +
                         "        ) \n" +
                         "    '); \n" +
                         "END; ";

  before(async function() {

    connection = await oracledb.getConnection(dbConfig);
    await setupAllTable();
  }); // before

  after(async function() {

    await dropAllTable();
    await connection.close();

  }); // after

  const setupAllTable = async function() {

    await connection.execute(proc_blob_in_tab);
    await connection.execute(proc_lobs_in_tab);
  };

  const dropAllTable = async function() {

    await connection.execute("DROP TABLE nodb_tab_blob_in PURGE");
    await connection.execute("DROP TABLE nodb_tab_lobs_in PURGE");
  };

  const executeSQL = async function(sql) {
    await connection.execute(sql);
  };

  const jpgFileName = './test/fuzzydinosaur.jpg';

  const prepareTableWithBlob = async function(sql, id) {
    const bindVar = { i: id, lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } };
    let result = null;

    result = await connection.execute(
      sql,
      bindVar,
      { autoCommit: false }); // a transaction needs to span the INSERT and pipe()

    assert.strictEqual(result.rowsAffected, 1);
    assert.strictEqual(result.outBinds.lobbv.length, 1);

    const inStream = fs.createReadStream(jpgFileName);
    const lob = result.outBinds.lobbv[0];
    await new Promise((resolve, reject) => {
      lob.on('error', reject);
      inStream.on('error', reject);
      lob.on('finish', resolve);
      inStream.pipe(lob);
    });
    await connection.commit();
  };

  // compare the result buffer with the original inserted buffer
  const compareResultBufAndOriginal = function(resultVal, originalBuffer, specialStr) {
    if (originalBuffer.length > 0) {
      const resultLength = resultVal.length;
      const specStrLength = specialStr.length;
      assert.strictEqual(resultLength, originalBuffer.length);
      assert.strictEqual(resultVal.toString('utf8', 0, specStrLength), specialStr);
      assert.strictEqual(resultVal.toString('utf8', (resultLength - specStrLength), resultLength), specialStr);
    }
    assert.deepStrictEqual(resultVal, originalBuffer);
  };

  // execute plsql bind in out procedure, and verify the plsql bind out buffer
  const plsqlBindInOut = async function(sqlRun, bindVar, originalBuf, specialStr) {
    let result = null;

    result = await connection.execute(
      sqlRun,
      bindVar);

    const resultVal = result.outBinds.io;
    if (originalBuf == 'EMPTY_BLOB' || originalBuf == null || originalBuf == undefined || originalBuf == "") {
      assert.strictEqual(resultVal, null);
    } else {
      compareResultBufAndOriginal(resultVal, originalBuf, specialStr);
    }
  };

  describe('79.1 BLOB, PLSQL, BIND_INOUT', function() {
    const blob_proc_inout = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_791 (lob_id IN NUMBER, lob_in_out IN OUT BLOB) \n" +
                          "AS \n" +
                          "BEGIN \n" +
                          "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, lob_in_out); \n" +
                          "    select blob_1 into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                          "END nodb_blob_in_out_791;";
    const sqlRun = "begin nodb_blob_in_out_791(:i, :io); end;";
    const proc_drop = "DROP PROCEDURE nodb_blob_in_out_791";
    const blob_proc_inout_7911 = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_7911 (lob_id IN NUMBER, lob_in_out IN OUT BLOB) \n" +
                               "AS \n" +
                               "BEGIN \n" +
                               "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, EMPTY_BLOB()); \n" +
                               "    select blob_1 into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                               "END nodb_blob_in_out_7911;";
    const sqlRun_7911 = "begin nodb_blob_in_out_7911(:i, :io); end;";
    const proc_drop_7911 = "DROP PROCEDURE nodb_blob_in_out_7911";

    before(async function() {
      await executeSQL(blob_proc_inout);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    it('79.1.1 works with EMPTY_BLOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      await executeSQL(blob_proc_inout_7911);

      await plsqlBindInOut(sqlRun_7911, bindVar, "EMPTY_BLOB", null);

      await executeSQL(proc_drop_7911);
    }); // 79.1.1

    it('79.1.2 works with EMPTY_BLOB and maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      await executeSQL(blob_proc_inout_7911);

      await plsqlBindInOut(sqlRun_7911, bindVar, "EMPTY_BLOB", null);

      await executeSQL(proc_drop_7911);
    }); // 79.1.2

    it('79.1.3 works with EMPTY_BLOB and maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      await executeSQL(blob_proc_inout_7911);

      await plsqlBindInOut(sqlRun_7911, bindVar, "EMPTY_BLOB", null);

      await executeSQL(proc_drop_7911);
    }); // 79.1.3

    it('79.1.4 works with null', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      await plsqlBindInOut(sqlRun, bindVar, null, null);
    }); // 79.1.4

    it('79.1.5 works with null and maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      await plsqlBindInOut(sqlRun, bindVar, null, null);
    }); // 79.1.5

    it('79.1.6 works with null and maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      await plsqlBindInOut(sqlRun, bindVar, null, null);
    }); // 79.1.6

    it('79.1.7 works with empty buffer', async function() {
      const sequence = insertID++;
      const bufferStr = Buffer.from('', "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      await plsqlBindInOut(sqlRun, bindVar, bufferStr, null);
    }); // 79.1.7

    it('79.1.8 works with empty buffer and maxSize set to 1', async function() {
      const sequence = insertID++;
      const bufferStr = Buffer.from('', "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      await plsqlBindInOut(sqlRun, bindVar, bufferStr, null);
    }); // 79.1.8

    it('79.1.9 works with empty buffer and maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bufferStr = Buffer.from('', "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      await plsqlBindInOut(sqlRun, bindVar, bufferStr, null);
    }); // 79.1.9

    it('79.1.10 works with undefined', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      await plsqlBindInOut(sqlRun, bindVar, undefined, null);
    }); // 79.1.7

    it('79.1.11 works with undefined and maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      await plsqlBindInOut(sqlRun, bindVar, undefined, null);
    }); // 79.1.11

    it('79.1.12 works with undefined and maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      await plsqlBindInOut(sqlRun, bindVar, undefined, null);
    }); // 79.1.12

    it('79.1.13 works with NaN', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: NaN, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // NJS-011: encountered bind value and type mismatch in parameter 2
        /NJS-011:/
      );
    }); // 79.1.13

    it('79.1.14 works with 0', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: 0, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // NJS-011: encountered bind value and type mismatch in parameter 2
        /NJS-011:/
      );
    }); // 79.1.14

    it('79.1.15 works with buffer size 32K', async function() {
      const sequence = insertID++;
      const size = 32768;
      const specialStr = "79.1.15";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size }
      };

      await plsqlBindInOut(sqlRun, bindVar, bufferStr, specialStr);
    }); // 79.1.15

    it('79.1.16 works with buffer size (64K - 1)', async function() {
      const sequence = insertID++;
      const size = 65535;
      const specialStr = "79.1.16";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size }
      };

      await plsqlBindInOut(sqlRun, bindVar, bufferStr, specialStr);
    }); // 79.1.16

    it('79.1.17 works with buffer size (64K + 1)', async function() {
      const sequence = insertID++;
      const size = 65537;
      const specialStr = "79.1.16";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size }
      };

      await plsqlBindInOut(sqlRun, bindVar, bufferStr, specialStr);
    }); // 79.1.17

    it('79.1.18 works with buffer size (1MB + 1)', async function() {
      const sequence = insertID++;
      const size = 1048577; // 1 * 1024 * 1024 + 1
      const specialStr = "79.1.18";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size }
      };

      await plsqlBindInOut(sqlRun, bindVar, bufferStr, specialStr);
    }); // 79.1.18

    it('79.1.19 works with bind value and type mismatch', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: 200, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // NJS-011: encountered bind value and type mismatch in parameter 2
        /NJS-011:/
      );
    }); // 79.1.19

    it('79.1.20 mixing named with positional binding', async function() {
      const sequence = insertID++;
      const size = 50000;
      const specialStr = "79.1.20";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = [ sequence, { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size } ];
      let result = null;
      result = await connection.execute(
        sqlRun,
        bindVar);
      const resultVal = result.outBinds[0];
      compareResultBufAndOriginal(resultVal, bufferStr, specialStr);
    }); // 79.1.20

    it('79.1.21 works with invalid BLOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: {}, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 50000 }
      };

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // NJS-011: encountered bind value and type mismatch
        /NJS-011:/
      );
    }); // 79.1.21

    it('79.1.22 works with substr', async function() {
      const specialStr = "79.1.22";
      const proc_79125 = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_79125 (lob_id IN NUMBER, lob_in_out IN OUT BLOB) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, lob_in_out); \n" +
                       "    select dbms_lob.substr(blob_1, " + specialStr.length + ", 1) into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                       "END nodb_blob_in_out_79125;";
      const sqlRun_79125 = "begin nodb_blob_in_out_79125(:i, :io); end;";
      const proc_drop_79125 = "DROP PROCEDURE nodb_blob_in_out_79125";
      const sequence = insertID++;
      const size = 50000;
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size }
      };

      await executeSQL(proc_79125);

      const comparedBuf = Buffer.from(specialStr, "utf-8");
      await plsqlBindInOut(sqlRun_79125, bindVar, comparedBuf, specialStr);

      await executeSQL(proc_drop_79125);
    }); // 79.1.22

    it('79.1.23 works with UPDATE', async function() {
      const proc_79125 = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_79125 (lob_id IN NUMBER, lob_in IN BLOB, lob_in_out IN OUT BLOB) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, lob_in_out); \n" +
                       "    update nodb_tab_blob_in set blob_1 = lob_in where id = lob_id; \n" +
                       "    select blob_1 into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                       "END nodb_blob_in_out_79125;";
      const sqlRun_79125 = "begin nodb_blob_in_out_79125(:i, :in, :io); end;";
      const proc_drop_79125 = "DROP PROCEDURE nodb_blob_in_out_79125";
      const sequence = insertID++;
      const size_1 = 40000;
      const specialStr_1 = "79.1.23_1";
      const bigStr_1 = random.getRandomString(size_1, specialStr_1);
      const bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      const size_2 = 50000;
      const specialStr_2 = "79.1.23_2";
      const bigStr_2 = random.getRandomString(size_2, specialStr_2);
      const bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        in: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 },
        io: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      await executeSQL(proc_79125);

      await plsqlBindInOut(sqlRun_79125, bindVar, bufferStr_1, specialStr_1);

      await executeSQL(proc_drop_79125);
    }); // 79.1.23

    it.skip('79.1.24 named binding: maxSize smaller than buffer size ( < 32K )', async function() {
      const sequence = insertID++;
      const size = 5000;
      const specialStr = "79.1.24";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size - 1 }
      };

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // ORA-01460: unimplemented or unreasonable conversion requested
        /ORA-01460:/
      );
    }); // 79.1.24

    it('79.1.25 named binding: maxSize smaller than buffer size ( > 32K )', async function() {
      const sequence = insertID++;
      const size = 50000;
      const specialStr = "79.1.25";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size - 1 }
      };

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        /NJS-058:/
      );
    }); // 79.1.25

    it('79.1.26 named binding: maxSize smaller than buffer size ( > 64K )', async function() {
      const sequence = insertID++;
      const size = 65539;
      const specialStr = "79.1.26";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size - 1 }
      };

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        /NJS-058:/
      );
    }); // 79.1.26

    it.skip('79.1.27 positional binding: maxSize smaller than buffer size ( < 32K )', async function() {
      const sequence = insertID++;
      const size = 500;
      const specialStr = "79.1.27";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = [ sequence, { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size - 1 } ];

      await assert.rejects(
        async () => {
          await connection.execute(
            "begin nodb_blob_in_out_791(:1, :2); end;",
            bindVar);
        },
        // ORA-01460: unimplemented or unreasonable conversion requested
        /ORA-01460:/
      );
    }); // 79.1.27

    it('79.1.28 positional binding: maxSize smaller than buffer size ( > 32K )', async function() {
      const sequence = insertID++;
      const size = 50000;
      const specialStr = "79.1.28";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = [ sequence, { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size - 1 } ];

      await assert.rejects(
        async () => {
          await connection.execute(
            "begin nodb_blob_in_out_791(:1, :2); end;",
            bindVar);
        },
        /NJS-058:/
      );
    }); // 79.1.28

    it('79.1.29 positional binding: maxSize smaller than buffer size ( > 64K )', async function() {
      const sequence = insertID++;
      const size = 65539;
      const specialStr = "79.1.29";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = [ sequence, { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size - 1 } ];

      await assert.rejects(
        async () => {
          await connection.execute(
            "begin nodb_blob_in_out_791(:1, :2); end;",
            bindVar);
        },
        /NJS-058:/
      );
    }); // 79.1.29

    it('79.1.30 bind without maxSize', async function() {
      const sequence = insertID++;
      const size = 50000;
      const specialStr = "79.1.30";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      await connection.execute(sqlRun, bindVar);
    }); // 79.1.30

  }); // 79.1

  describe('79.2 BLOB, PLSQL, BIND_INOUT to RAW', function() {
    const blob_proc_inout = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_792 (lob_id IN NUMBER, lob_in_out IN OUT RAW) \n" +
                               "AS \n" +
                               "BEGIN \n" +
                               "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, lob_in_out); \n" +
                               "    select blob_1 into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                               "END nodb_blob_in_out_792;";
    const sqlRun = "begin nodb_blob_in_out_792(:i, :io); end;";
    const proc_drop = "DROP PROCEDURE nodb_blob_in_out_792";
    const blob_proc_inout_7921 = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_7921 (lob_id IN NUMBER, lob_in_out IN OUT RAW) \n" +
                               "AS \n" +
                               "BEGIN \n" +
                               "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, EMPTY_BLOB()); \n" +
                               "    select blob_1 into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                               "END nodb_blob_in_out_7921;";
    const sqlRun_7921 = "begin nodb_blob_in_out_7921(:i, :io); end;";
    const proc_drop_7921 = "DROP PROCEDURE nodb_blob_in_out_7921";

    before(async function() {
      await executeSQL(blob_proc_inout);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    it('79.2.1 works with EMPTY_BLOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      await executeSQL(blob_proc_inout_7921);

      await plsqlBindInOut(sqlRun_7921, bindVar, "EMPTY_BLOB", null);

      await executeSQL(proc_drop_7921);
    }); // 79.2.1

    it('79.2.2 works with EMPTY_BLOB and maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      await executeSQL(blob_proc_inout_7921);

      await plsqlBindInOut(sqlRun_7921, bindVar, "EMPTY_BLOB", null);

      await executeSQL(proc_drop_7921);
    }); // 79.2.2

    it('79.2.3 works with EMPTY_BLOB and maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      await executeSQL(blob_proc_inout_7921);

      await plsqlBindInOut(sqlRun_7921, bindVar, "EMPTY_BLOB", null);

      await executeSQL(proc_drop_7921);
    }); // 79.2.3

    it('79.2.4 works with null', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      await plsqlBindInOut(sqlRun, bindVar, null, null);
    }); // 79.2.4

    it('79.2.5 works with null and maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      await plsqlBindInOut(sqlRun, bindVar, null, null);
    }); // 79.2.5

    it('79.2.6 works with null and maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      await plsqlBindInOut(sqlRun, bindVar, null, null);
    }); // 79.2.6

    it('79.2.7 works with empty buffer', async function() {
      const sequence = insertID++;
      const bufferStr = Buffer.from('', "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      await plsqlBindInOut(sqlRun, bindVar, bufferStr, null);
    }); // 79.2.7

    it('79.2.8 works with empty buffer and maxSize set to 1', async function() {
      const sequence = insertID++;
      const bufferStr = Buffer.from('', "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      await plsqlBindInOut(sqlRun, bindVar, bufferStr, null);
    }); // 79.2.8

    it('79.2.9 works with empty buffer and maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bufferStr = Buffer.from('', "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      await plsqlBindInOut(sqlRun, bindVar, bufferStr, null);
    }); // 79.2.9

    it('79.2.10 works with undefined', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      await plsqlBindInOut(sqlRun, bindVar, undefined, null);
    }); // 79.2.7

    it('79.2.11 works with undefined and maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      await plsqlBindInOut(sqlRun, bindVar, undefined, null);
    }); // 79.2.11

    it('79.2.12 works with undefined and maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      await plsqlBindInOut(sqlRun, bindVar, undefined, null);
    }); // 79.2.12

    it('79.2.13 works with NaN', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: NaN, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // NJS-011: encountered bind value and type mismatch in parameter 2
        /NJS-011:/
      );
    }); // 79.2.13

    it('79.2.14 works with 0', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: 0, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // NJS-011: encountered bind value and type mismatch in parameter 2
        /NJS-011:/
      );
    }); // 79.2.14

    it('79.2.15 works with buffer size (32K - 1)', async function() {
      const sequence = insertID++;
      const size = 32767;
      const specialStr = "79.2.15";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size }
      };

      await plsqlBindInOut(sqlRun, bindVar, bufferStr, specialStr);
    }); // 79.2.15

    it('79.2.16 works with buffer size 32K', async function() {
      const sequence = insertID++;
      const size = 32768;
      const specialStr = "79.2.16";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size }
      };

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // ORA-06502: PL/SQL: numeric or value error
        /ORA-06502:/
      );
    }); // 79.2.16

    it('79.2.17 works with buffer size > maxSize', async function() {
      const sequence = insertID++;
      const size = 300;
      const specialStr = "79.2.17";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size - 1 }
      };

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        /NJS-058:/
      );
    }); // 79.2.17

    it('79.2.18 works with invalid BLOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: {}, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 50000 }
      };

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // NJS-011: encountered bind value and type mismatch
        /NJS-011:/
      );
    }); // 79.2.18

    it('79.2.19 works with substr', async function() {
      const specialStr = "79.2.19";
      const proc_79219 = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_79219 (lob_id IN NUMBER, lob_in_out IN OUT RAW) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, lob_in_out); \n" +
                       "    select dbms_lob.substr(blob_1, " + specialStr.length + ", 1) into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                       "END nodb_blob_in_out_79219;";
      const sqlRun_79219 = "begin nodb_blob_in_out_79219(:i, :io); end;";
      const proc_drop_79219 = "DROP PROCEDURE nodb_blob_in_out_79219";
      const sequence = insertID++;
      const size = 3000;
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size }
      };

      await executeSQL(proc_79219);

      const comparedBuf = Buffer.from(specialStr, "utf-8");
      await plsqlBindInOut(sqlRun_79219, bindVar, comparedBuf, specialStr);

      await executeSQL(proc_drop_79219);
    }); // 79.2.19

    it('79.2.20 works with UPDATE', async function() {
      const proc_79220 = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_79220 (lob_id IN NUMBER, lob_in IN RAW, lob_in_out IN OUT RAW) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, lob_in_out); \n" +
                       "    update nodb_tab_blob_in set blob_1 = lob_in where id = lob_id; \n" +
                       "    select blob_1 into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                       "END nodb_blob_in_out_79220;";
      const sqlRun_79220 = "begin nodb_blob_in_out_79220(:i, :in, :io); end;";
      const proc_drop_79220 = "DROP PROCEDURE nodb_blob_in_out_79220";
      const sequence = insertID++;
      const size_1 = 2000;
      const specialStr_1 = "79.2.10_1";
      const bigStr_1 = random.getRandomString(size_1, specialStr_1);
      const bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      const size_2 = 500;
      const specialStr_2 = "79.2.10_2";
      const bigStr_2 = random.getRandomString(size_2, specialStr_2);
      const bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        in: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 },
        io: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      await executeSQL(proc_79220);

      await plsqlBindInOut(sqlRun_79220, bindVar, bufferStr_1, specialStr_1);

      await executeSQL(proc_drop_79220);
    }); // 79.2.20

    it('79.2.21 works without maxSize', async function() {
      const sequence = insertID++;
      const size = 500;
      const specialStr = "79.2.21";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      await connection.execute(
        sqlRun,
        bindVar);
    }); // 79.2.21

  }); // 79.2

  describe('79.3 Multiple BLOBs, BIND_INOUT', function() {
    const lobs_proc_inout = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_out_793 (lob_id IN NUMBER, blob_1 IN OUT BLOB, blob_2 IN OUT BLOB) \n" +
                          "AS \n" +
                          "BEGIN \n" +
                          "    insert into nodb_tab_blob_in (id, blob_1, blob_2) values (lob_id, blob_1, blob_2); \n" +
                          "    select blob_1, blob_2 into blob_1, blob_2 from nodb_tab_blob_in where id = lob_id; \n" +
                          "END nodb_lobs_in_out_793;";
    const sqlRun = "begin nodb_lobs_in_out_793(:i, :lob_1, :lob_2); end;";
    const proc_drop = "DROP PROCEDURE nodb_lobs_in_out_793";

    before(async function() {
      await executeSQL(lobs_proc_inout);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    // execute plsql bind in out procedure, and verify the plsql bind out buffer
    const plsqlBindInOut = async function(sqlRun, bindVar, originalBuf1, specialStr1, originalBuf2, specialStr2) {
      let result = null;

      result = await connection.execute(sqlRun, bindVar);
      let resultVal = result.outBinds.lob_1;
      compareResultBufAndOriginal(resultVal, originalBuf1, specialStr1);
      resultVal = result.outBinds.lob_2;
      compareResultBufAndOriginal(resultVal, originalBuf2, specialStr2);
    };

    it('79.3.1 bind a JPG and a 32K buffer', async function() {
      const preparedCLOBID = 500;
      const sequence = insertID++;
      const size_1 = 32768;
      const specialStr = "79.3.1";
      const bigStr_1 = random.getRandomString(size_1, specialStr);
      const bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      let result = null;

      const sql = "INSERT INTO nodb_tab_lobs_in (id, blob) VALUES (:i, EMPTY_BLOB()) RETURNING blob INTO :lobbv";
      await prepareTableWithBlob(sql, preparedCLOBID);

      result = await connection.execute(
        "select blob from nodb_tab_lobs_in where id = :id",
        { id: preparedCLOBID });
      assert.notEqual(result.rows.length, 0);
      const blob = result.rows[0][0];
      result = await connection.execute(
        sqlRun,
        {
          i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          lob_1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size_1 },
          lob_2: { val: blob, type: oracledb.BLOB, dir: oracledb.BIND_INOUT }
        },
        { autoCommit: true });

      const resultVal = result.outBinds.lob_1;
      compareResultBufAndOriginal(resultVal, bufferStr_1, specialStr);
      const lob = result.outBinds.lob_2;
      const blobData = await lob.getData();
      const originalData = fs.readFileSync(jpgFileName);
      assert.strictEqual(blobData.length, originalData.length);
      assert.deepStrictEqual(blobData, originalData);
      lob.destroy();
    }); // 79.3.1

    it('79.3.2 bind two buffers', async function() {
      const sequence = insertID++;
      const size_1 = 30000;
      const specialStr_1 = "79.3.2_1";
      const bigStr_1 = random.getRandomString(size_1, specialStr_1);
      const bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      const size_2 = 40000;
      const specialStr_2 = "79.3.2_2";
      const bigStr_2 = random.getRandomString(size_2, specialStr_2);
      const bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        lob_1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size_1 },
        lob_2: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size_2 }
      };

      await plsqlBindInOut(sqlRun, bindVar, bufferStr_1, specialStr_1, bufferStr_2, specialStr_2);
    }); // 79.3.2

    it('79.3.3 bind two buffers, one > (64K - 1)', async function() {
      const sequence = insertID++;
      const size_1 = 30000;
      const specialStr_1 = "79.3.2_1";
      const bigStr_1 = random.getRandomString(size_1, specialStr_1);
      const bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      const size_2 = 65537;
      const specialStr_2 = "79.3.2_2";
      const bigStr_2 = random.getRandomString(size_2, specialStr_2);
      const bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        lob_1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size_1 },
        lob_2: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size_2 }
      };

      await plsqlBindInOut(sqlRun, bindVar, bufferStr_1, specialStr_1, bufferStr_2, specialStr_2);
    }); // 79.3.3

  }); // 79.3

});

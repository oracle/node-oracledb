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
 *   78. blobPlsqlBindAsBuffer_bindout.js
 *
 * DESCRIPTION
 *   Testing BLOB binding out as Buffer.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const fs       = require('fs');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');

describe('78. blobPlsqlBindAsBuffer_bindout.js', function() {

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
    await connection.execute(
      sql,
      function(err) {
        assert(err);
      }
    );
  };

  const insertBlobWithbuffer = async function(id, insertBuffer) {
    let sql = "INSERT INTO nodb_tab_blob_in (id, blob_1) VALUES (:i, :b)";
    let bindVar = {
      i: { val: id, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      b: { val: insertBuffer, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
    };

    if (insertBuffer === 'EMPTY_LOB') {
      sql = "INSERT INTO nodb_tab_blob_in (id, blob_1) VALUES (:i, EMPTY_BLOB())";
      bindVar = {
        i: { val: id, dir: oracledb.BIND_IN, type: oracledb.NUMBER }
      };
    }
    const result = await connection.execute(sql, bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  const jpgFileName = './test/fuzzydinosaur.jpg';

  const prepareTableWithBlob = async function(sql, id) {
    const binds = {
      i: id,
      lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
    };
    // a transaction needs to span the INSERT and pipe()
    const options = {
      autoCommit: false
    };
    const result = await connection.execute(sql, binds, options);
    assert.strictEqual(result.rowsAffected, 1);
    assert.strictEqual(result.outBinds.lobbv.length, 1);
    const inStream = fs.createReadStream(jpgFileName);
    const lob = result.outBinds.lobbv[0];
    await new Promise((resolve, reject) => {
      inStream.on('error', reject);
      lob.on('error', reject);
      lob.on('finish', resolve);
      inStream.pipe(lob);
    });
    await connection.commit();
  };

  const verifyBlobValueWithFileData = async function(selectSql) {
    const result = await connection.execute(selectSql);
    const lob = result.rows[0][0];
    const blobData = await lob.getData();
    lob.destroy();
    const originalData = await fs.promises.readFile(jpgFileName);
    assert.deepStrictEqual(originalData, blobData);
  };

  const verifyBlobValueWithBuffer = async function(selectSql, originalBuffer, specialStr) {
    const result = await connection.execute(selectSql);
    const lob = result.rows[0][0];
    if (originalBuffer == null | originalBuffer == '' || originalBuffer == undefined) {
      assert(lob);
    } else {
      const blobData = await lob.getData();
      const specStrLength = specialStr.length;
      assert.strictEqual(blobData.toString('utf8', 0, specStrLength), specialStr);
      assert.strictEqual(blobData.toString('utf8', (blobData.length - specStrLength), blobData.length), specialStr);
    }
    lob.destroy();
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

  const verifyBindOutResult = async function(sqlRun, bindVar, originalBuf, specialStr) {
    const result = await connection.execute(sqlRun, bindVar);
    if (originalBuf === "EMPTY_LOB" || originalBuf == undefined || originalBuf == null || originalBuf == "") {
      assert.strictEqual(result.outBinds.b, null);
    } else {
      const resultVal = result.outBinds.b;
      compareResultBufAndOriginal(resultVal, originalBuf, specialStr);
    }
  };

  describe('78.1 BLOB, PLSQL, BIND_OUT', function() {
    const proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_782 (blob_id IN NUMBER, blob_out OUT BLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select blob_1 into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
               "END nodb_blobs_out_782; ";
    const sqlRun = "BEGIN nodb_blobs_out_782 (:i, :b); END;";
    const proc_drop = "DROP PROCEDURE nodb_blobs_out_782";

    before(async function() {
      await executeSQL(proc);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    it('78.1.1 works with EMPTY_BLOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };
      await insertBlobWithbuffer(sequence, "EMPTY_LOB");
      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 78.1.1

    it('78.1.2 works with EMPTY_BLOB and bind out maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };
      await insertBlobWithbuffer(sequence, "EMPTY_LOB");
      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 78.1.2

    it('78.1.3 works with EMPTY_BLOB and bind out maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      await insertBlobWithbuffer(sequence, "EMPTY_LOB");
      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 78.1.3

    it('78.1.4 works with null', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };
      await insertBlobWithbuffer(sequence, null);
      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 78.1.4

    it('78.1.5 works with null and bind out maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };
      await insertBlobWithbuffer(sequence, null);
      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 78.1.5

    it('78.1.6 works with null and bind out maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      await insertBlobWithbuffer(sequence, null);
      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 78.1.6

    it('78.1.7 works with empty buffer', async function() {
      const sequence = insertID++;
      const bufferStr = Buffer.from('', "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };
      await insertBlobWithbuffer(sequence, bufferStr);
      await verifyBindOutResult(sqlRun, bindVar, bufferStr, null);
    }); // 78.1.7

    it('78.1.8 works with empty buffer and bind out maxSize set to 1', async function() {
      const sequence = insertID++;
      const bufferStr = Buffer.from('', "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };
      await insertBlobWithbuffer(sequence, bufferStr);
      await verifyBindOutResult(sqlRun, bindVar, bufferStr, null);
    }); // 78.1.8

    it('78.1.9 works with empty buffer and bind out maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      const bufferStr = Buffer.from('', "utf-8");
      await insertBlobWithbuffer(sequence, bufferStr);
      await verifyBindOutResult(sqlRun, bindVar, bufferStr, null);
    }); // 78.1.9

    it('78.1.10 works with undefined', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };
      await insertBlobWithbuffer(sequence, undefined);
      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 78.1.10

    it('78.1.11 works with undefined and bind out maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };
      await insertBlobWithbuffer(sequence, undefined);
      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 78.1.11

    it('78.1.12 works with undefined and bind out maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      await insertBlobWithbuffer(sequence, undefined);
      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 78.1.12

    it('78.1.13 works with Buffer size 32K', async function() {
      // Driver already supports CLOB AS STRING and BLOB AS BUFFER for PLSQL BIND if the data size less than or equal to 32767.
      // As part of this enhancement, driver allows even if data size more than 32767 for both column types
      const size = 32768;
      const sequence = insertID++;
      const specialStr = "78.1.13";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await insertBlobWithbuffer(sequence, bufferStr);
      const sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr, specialStr);
      await verifyBindOutResult(sqlRun, bindVar, bufferStr, specialStr);
    }); // 78.1.13

    it('78.1.14 works with Buffer size (64K - 1)', async function() {
      const size = 65535;
      const sequence = insertID++;
      const specialStr = "78.1.14";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await insertBlobWithbuffer(sequence, bufferStr);
      const sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr, specialStr);
      await verifyBindOutResult(sqlRun, bindVar, bufferStr, specialStr);
    }); // 78.1.14

    it('78.1.15 works with Buffer size (64K + 1)', async function() {
      const size = 65537;
      const sequence = insertID++;
      const specialStr = "78.1.15";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await insertBlobWithbuffer(sequence, bufferStr);
      await verifyBindOutResult(sqlRun, bindVar, bufferStr, specialStr);
    }); // 78.1.15

    it('78.1.16 works with Buffer size (1MB + 1)', async function() {
      const size = 1048577; // 1 * 1024 * 1024 + 1
      const sequence = insertID++;
      const specialStr = "78.1.16";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await insertBlobWithbuffer(sequence, bufferStr);
      await verifyBindOutResult(sqlRun, bindVar, bufferStr, specialStr);
    }); // 78.1.16

    it('78.1.17 mixing named with positional binding', async function() {
      const size = 50000;
      const sequence = insertID++;
      const specialStr = "78.1.17";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size } ];
      await insertBlobWithbuffer(sequence, bufferStr);
      const result = await connection.execute(sqlRun, bindVar);
      const resultVal = result.outBinds[0];
      compareResultBufAndOriginal(resultVal, bufferStr, specialStr);
    }); // 78.1.17

    it('78.1.18 works with UPDATE', async function() {
      const proc_7821 = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_7821 (blob_id IN NUMBER, blob_in IN BLOB, blob_out OUT BLOB) \n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    update nodb_tab_blob_in set blob_1 = blob_in where id = blob_id; \n" +
                      "    select blob_1 into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
                      "END nodb_blobs_out_7821; ";
      const sqlRun_7821 = "BEGIN nodb_blobs_out_7821 (:i, :bi, :bo); END;";
      const proc_drop_7821 = "DROP PROCEDURE nodb_blobs_out_7821";
      const size_1 = 50000;
      const sequence = insertID++;
      const specialStr_1 = "78.1.18_1";
      const bigStr_1 = random.getRandomString(size_1, specialStr_1);
      const bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      const size_2 = 40000;
      const specialStr_2 = "78.1.18_2";
      const bigStr_2 = random.getRandomString(size_2, specialStr_2);
      const bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        bi: { val:bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_2 },
        bo: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_2 }
      };
      await insertBlobWithbuffer(sequence, bufferStr_1);
      await executeSQL(proc_7821);
      const result = await connection.execute(sqlRun_7821, bindVar);
      const resultVal = result.outBinds.bo;
      compareResultBufAndOriginal(resultVal, bufferStr_2, specialStr_2);
      await executeSQL(proc_drop_7821);
    }); // 78.1.18

    it('78.1.19 works with dbms_lob.substr()', async function() {
      const size = 50000;
      const sequence = insertID++;
      const specialStr = "78.1.19";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const proc_78123 = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_78123 (blob_id IN NUMBER, blob_out OUT BLOB) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    select dbms_lob.substr(blob_1, " + specialStr.length + ", 1) into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
                       "END nodb_blobs_out_78123; ";
      const sqlRun_78123 = "BEGIN nodb_blobs_out_78123 (:i, :b); END;";
      const proc_drop_78123 = "DROP PROCEDURE nodb_blobs_out_78123";
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await insertBlobWithbuffer(sequence, bufferStr);
      await executeSQL(proc_78123);
      const result = await connection.execute(sqlRun_78123, bindVar);
      const resultVal = result.outBinds.b;
      const comparedBuf = Buffer.from(specialStr, "utf-8");
      compareResultBufAndOriginal(resultVal, comparedBuf, specialStr);
      await executeSQL(proc_drop_78123);
    }); // 78.1.19

    it('78.1.20 named binding: bind out maxSize smaller than buffer size( < 32K )', async function() {
      const size = 3000;
      const sequence = insertID++;
      const specialStr = "78.1.20";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 }
      };
      await insertBlobWithbuffer(sequence, bufferStr);
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        // ORA-06502: PL/SQL: numeric or value error: raw variable length too long
        /ORA-06502:/
      );
    }); // 78.1.20

    it('78.1.21 named binding: bind out maxSize smaller than buffer size( > 32K )', async function() {
      const size = 50000;
      const sequence = insertID++;
      const specialStr = "78.1.21";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 }
      };
      await insertBlobWithbuffer(sequence, bufferStr);
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        // NJS-016: buffer is too small for OUT binds
        /NJS-016:/
      );
    }); // 78.1.21

    it('78.1.22 named binding: bind out maxSize smaller than buffer size( > 64K )', async function() {
      const size = 65540;
      const sequence = insertID++;
      const specialStr = "78.1.22";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 }
      };
      await insertBlobWithbuffer(sequence, bufferStr);
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        // NJS-016: buffer is too small for OUT binds
        /NJS-016:/
      );
    }); // 78.1.22

    it('78.1.23 positional binding: bind out maxSize smaller than buffer size( < 32K )', async function() {
      const size = 3000;
      const sequence = insertID++;
      const specialStr = "78.1.23";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const sql = "BEGIN nodb_blobs_out_782 (:1, :2); END;";
      const bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 } ];
      await insertBlobWithbuffer(sequence, bufferStr);
      await assert.rejects(
        async () => await connection.execute(sql, bindVar),
        // ORA-06502: PL/SQL: numeric or value error: raw variable length too long
        /ORA-06502:/
      );
    }); // 78.1.23

    it('78.1.24 positional binding: bind out maxSize smaller than buffer size( > 32K )', async function() {
      const size = 32769;
      const sequence = insertID++;
      const specialStr = "78.1.24";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const sql = "BEGIN nodb_blobs_out_782 (:1, :2); END;";
      const bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 } ];
      await insertBlobWithbuffer(sequence, bufferStr);
      await assert.rejects(
        async () => await connection.execute(sql, bindVar),
        // NJS-016: buffer is too small for OUT binds
        /NJS-016:/
      );
    }); // 78.1.24

    it('78.1.25 positional binding: bind out maxSize smaller than buffer size( > 64K )', async function() {
      const size = 65538;
      const sequence = insertID++;
      const specialStr = "78.1.25";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const sql = "BEGIN nodb_blobs_out_782 (:1, :2); END;";
      const bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 } ];
      await insertBlobWithbuffer(sequence, bufferStr);
      await assert.rejects(
        async () => await connection.execute(sql, bindVar),
        // NJS-016: buffer is too small for OUT binds
        /NJS-016:/
      );
    }); // 78.1.25

    it('78.1.26 bind out without maxSize', async function() {
      const size = 50000;
      const sequence = insertID++;
      const specialStr = "78.1.26";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT } ];
      await insertBlobWithbuffer(sequence, bufferStr);
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        // ORA-06502: PL/SQL: numeric or value error
        /ORA-06502:/
      );
    }); // 78.1.26

  }); // 78.1

  describe('78.2 BLOB, PLSQL, BIND_OUT to RAW', function() {
    const proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_772 (blob_id IN NUMBER, blob_out OUT RAW) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select blob_1 into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
               "END nodb_blobs_out_772; ";
    const sqlRun = "BEGIN nodb_blobs_out_772 (:i, :b); END;";
    const proc_drop = "DROP PROCEDURE nodb_blobs_out_772";

    before(async function() {
      await executeSQL(proc);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    it('78.2.1 works with EMPTY_BLOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };
      await insertBlobWithbuffer(sequence, "EMPTY_LOB");
      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 78.2.1

    it('78.2.2 works with EMPTY_BLOB and bind out maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };
      await insertBlobWithbuffer(sequence, "EMPTY_LOB");
      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 78.2.2

    it('78.2.3 works with EMPTY_BLOB and bind out maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      await insertBlobWithbuffer(sequence, "EMPTY_LOB");
      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 78.2.3

    it('78.2.4 works with null', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };
      await insertBlobWithbuffer(sequence, null);
      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 78.2.4

    it('78.2.5 works with null and bind out maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };
      await insertBlobWithbuffer(sequence, null);
      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 78.2.5

    it('78.2.6 works with null and bind out maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      await insertBlobWithbuffer(sequence, null);
      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 78.2.6

    it('78.2.7 works with empty buffer', async function() {
      const sequence = insertID++;
      const bufferStr = Buffer.from('', "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };
      await insertBlobWithbuffer(sequence, bufferStr);
      await verifyBindOutResult(sqlRun, bindVar, bufferStr, null);
    }); // 78.2.7

    it('78.2.8 works with empty buffer and bind out maxSize set to 1', async function() {
      const sequence = insertID++;
      const bufferStr = Buffer.from('', "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };
      await insertBlobWithbuffer(sequence, bufferStr);
      await verifyBindOutResult(sqlRun, bindVar, bufferStr, null);
    }); // 78.2.8

    it('78.2.9 works with empty buffer and bind out maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      const bufferStr = Buffer.from('', "utf-8");
      await insertBlobWithbuffer(sequence, bufferStr);
      await verifyBindOutResult(sqlRun, bindVar, bufferStr, null);
    }); // 78.2.9

    it('78.2.10 works with undefined', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };
      await insertBlobWithbuffer(sequence, undefined);
      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 78.2.10

    it('78.2.11 works with undefined and bind out maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };
      await insertBlobWithbuffer(sequence, undefined);
      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 78.2.11

    it('78.2.12 works with undefined and bind out maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      await insertBlobWithbuffer(sequence, undefined);
      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 78.2.12

    it('78.2.13 works with Buffer size (32K - 1)', async function() {
      const size = 32767;
      const sequence = insertID++;
      const specialStr = "78.2.13";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await insertBlobWithbuffer(sequence, bufferStr);
      const sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr, specialStr);
      await verifyBindOutResult(sqlRun, bindVar, bufferStr, specialStr);
    }); // 78.2.13

    it('78.2.14 works with Buffer size 32K', async function() {
      const size = 32768;
      const sequence = insertID++;
      const specialStr = "78.2.14";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await insertBlobWithbuffer(sequence, bufferStr);
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        // ORA-06502: PL/SQL: numeric or value error
        /ORA-06502:/
      );
    }); // 78.2.14

    it('78.2.15 works with bind out maxSize smaller than buffer size', async function() {
      const size = 200;
      const sequence = insertID++;
      const specialStr = "78.2.15";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 }
      };
      await insertBlobWithbuffer(sequence, bufferStr);
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        // ORA-06502: PL/SQL: numeric or value error
        /ORA-06502:/
      );
    }); // 78.2.15

    it('78.2.16 bind out without maxSize', async function() {
      const size = 500;
      const sequence = insertID++;
      const specialStr = "78.2.16";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT } ];
      await insertBlobWithbuffer(sequence, bufferStr);
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        // ORA-06502: PL/SQL: numeric or value error
        /ORA-06502:/
      );
    }); // 78.2.16

    it('78.2.17 works with UPDATE', async function() {
      const proc_7821 = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_7821 (blob_id IN NUMBER, blob_in IN RAW, blob_out OUT RAW) \n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    update nodb_tab_blob_in set blob_1 = blob_in where id = blob_id; \n" +
                      "    select blob_1 into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
                      "END nodb_blobs_out_7821; ";
      const sqlRun_7821 = "BEGIN nodb_blobs_out_7821 (:i, :bi, :bo); END;";
      const proc_drop_7821 = "DROP PROCEDURE nodb_blobs_out_7821";
      const size_1 = 200;
      const sequence = insertID++;
      const specialStr_1 = "78.2.17_1";
      const bigStr_1 = random.getRandomString(size_1, specialStr_1);
      const bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      const size_2 = 300;
      const specialStr_2 = "78.2.17_2";
      const bigStr_2 = random.getRandomString(size_2, specialStr_2);
      const bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        bi: { val:bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_2 },
        bo: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_2 }
      };
      await insertBlobWithbuffer(sequence, bufferStr_1);
      await executeSQL(proc_7821);
      const result = await connection.execute(sqlRun_7821, bindVar);
      const resultVal = result.outBinds.bo;
      compareResultBufAndOriginal(resultVal, bufferStr_2, specialStr_2);
      await executeSQL(proc_drop_7821);
    }); // 78.2.17

    it('78.2.18 works with dbms_lob.substr()', async function() {
      const size = 3000;
      const sequence = insertID++;
      const specialStr = "78.2.18";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const proc_78223 = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_78223 (blob_id IN NUMBER, blob_out OUT RAW) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    select dbms_lob.substr(blob_1, " + specialStr.length + ", 1) into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
                       "END nodb_blobs_out_78223; ";
      const sqlRun_78223 = "BEGIN nodb_blobs_out_78223 (:i, :b); END;";
      const proc_drop_78223 = "DROP PROCEDURE nodb_blobs_out_78223";
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await insertBlobWithbuffer(sequence, bufferStr);
      await executeSQL(proc_78223);
      const result = await connection.execute(sqlRun_78223, bindVar);
      const resultVal = result.outBinds.b;
      const comparedBuf = Buffer.from(specialStr, "utf-8");
      compareResultBufAndOriginal(resultVal, comparedBuf, specialStr);
      await executeSQL(proc_drop_78223);
    }); // 78.2.18

  }); // 78.2

  describe('78.3 Multiple BLOBs, BIND_OUT', function() {
    const proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_out_775 (blob_id IN NUMBER, blob_1 OUT BLOB, blob_2 OUT BLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select blob_1, blob_2 into blob_1, blob_2 from nodb_tab_blob_in where id = blob_id; \n" +
               "END nodb_lobs_out_775; ";
    const sqlRun = "BEGIN nodb_lobs_out_775 (:i, :b1, :b2); END;";
    const proc_drop = "DROP PROCEDURE nodb_lobs_out_775";

    before(async function() {
      await executeSQL(proc);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    const insertTwoBlobWithbuffer = async function(id, insertBuffer1, insertBuffer2) {
      const sql = "INSERT INTO nodb_tab_blob_in (id, blob_1, blob_2) VALUES (:i, :b1, :b2)";
      const bindVar = {
        i: { val: id, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        b1: { val: insertBuffer1, dir: oracledb.BIND_IN, type: oracledb.BUFFER },
        b2: { val: insertBuffer2, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
      };
      const result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.rowsAffected, 1);
    };

    it('78.3.1 bind two buffer', async function() {
      const specialStr_1 = "78.3.1_1";
      const specialStr_2 = "78.3.1_2";
      const size_1 = 32768;
      const size_2 = 50000;
      const sequence = insertID++;
      const bigStr_1 = random.getRandomString(size_1, specialStr_1);
      const bigStr_2 = random.getRandomString(size_2, specialStr_2);
      const bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      const bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_1 },
        b2: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_2 }
      };
      insertTwoBlobWithbuffer(sequence, bufferStr_1, bufferStr_2);
      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr_1, specialStr_1);

      sql = "select blob_2 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr_2, specialStr_2);

      const result = await connection.execute(sqlRun, bindVar);
      let resultVal = result.outBinds.b1;
      compareResultBufAndOriginal(resultVal, bufferStr_1, specialStr_1);
      resultVal = result.outBinds.b2;
      compareResultBufAndOriginal(resultVal, bufferStr_2, specialStr_2);
    }); // 78.3.1

    it('78.3.2 PLSQL, BIND_OUT, bind a JPG file and a Buffer', async function() {
      const specialStr = "78.3.2";
      const size_1 = 32768;
      const bigStr_1 = random.getRandomString(size_1, specialStr);
      const bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_1 },
        b2: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
      };
      let sql = "INSERT INTO nodb_tab_blob_in (id, blob_2) VALUES (:i, EMPTY_BLOB()) RETURNING blob_2 INTO :lobbv";
      await prepareTableWithBlob(sql, sequence);
      sql = "select blob_2 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithFileData(sql);
      sql = "UPDATE nodb_tab_blob_in set blob_1 = :b1 where id = :i";
      const bindVar_1 = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 }
      };
      let result = await connection.execute(sql, bindVar_1);
      assert.strictEqual(result.rowsAffected, 1);
      sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr_1, specialStr);
      result = await connection.execute(sqlRun, bindVar);
      const resultVal = result.outBinds.b1;
      compareResultBufAndOriginal(resultVal, bufferStr_1, specialStr);
      const lob = result.outBinds.b2;
      const blobData = await lob.getData();
      lob.destroy();
      const originalData = await fs.promises.readFile(jpgFileName);
      assert.deepStrictEqual(originalData, blobData);
    }); // 78.3.2

    it('78.3.3 bind two buffer, one > (64K - 1)', async function() {
      const specialStr_1 = "78.3.3_1";
      const specialStr_2 = "78.3.3_2";
      const size_1 = 65538;
      const size_2 = 50000;
      const sequence = insertID++;
      const bigStr_1 = random.getRandomString(size_1, specialStr_1);
      const bigStr_2 = random.getRandomString(size_2, specialStr_2);
      const bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      const bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_1 },
        b2: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_2 }
      };
      await insertTwoBlobWithbuffer(sequence, bufferStr_1, bufferStr_2);
      const result = await connection.execute(sqlRun, bindVar);
      let resultVal = result.outBinds.b1;
      compareResultBufAndOriginal(resultVal, bufferStr_1, specialStr_1);
      resultVal = result.outBinds.b2;
      compareResultBufAndOriginal(resultVal, bufferStr_2, specialStr_2);
    }); // 78.3.3

  }); // 78.3

});

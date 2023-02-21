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
const file     = require('./file.js');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');
const assist   = require('./dataTypeAssist.js');

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

  let setupAllTable = async function() {

    await connection.execute(proc_blob_in_tab);
    await connection.execute(proc_lobs_in_tab);
  };

  let dropAllTable = async function() {

    await connection.execute("DROP TABLE nodb_tab_blob_in PURGE");
    await connection.execute("DROP TABLE nodb_tab_lobs_in PURGE");
  };

  let executeSQL = async function(sql) {
    await connection.execute(
      sql,
      function(err) {
        assert(err);
      }
    );
  };

  let insertBlobWithbuffer = async function(id, insertBuffer) {
    let sql = "INSERT INTO nodb_tab_blob_in (id, blob_1) VALUES (:i, :b)";
    let bindVar = {
      i: { val: id, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      b: { val: insertBuffer, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
    };

    if (insertBuffer == 'EMPTY_LOB') {
      sql = "INSERT INTO nodb_tab_blob_in (id, blob_1) VALUES (:i, EMPTY_BLOB())";
      bindVar = {
        i: { val: id, dir: oracledb.BIND_IN, type: oracledb.NUMBER }
      };
    }
    let result = null;
    result = await connection.execute(
      sql,
      bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  let inFileStreamed = './test/blobTmpFile.txt';

  let jpgFileName = './test/fuzzydinosaur.jpg';

  let prepareTableWithBlob = async function(sql, id) {
    let bindVar = { i: id, lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } };
    let result = null;

    result = await connection.execute(
      sql,
      bindVar,
      { autoCommit: false }); // a transaction needs to span the INSERT and pipe()

    assert.strictEqual(result.rowsAffected, 1);
    assert.strictEqual(result.outBinds.lobbv.length, 1);

    let inStream = fs.createReadStream(jpgFileName);
    let lob = result.outBinds.lobbv[0];

    lob.on('error', function(err) {
      assert(err, "lob.on 'error' event");
    });

    inStream.on('error', function(err) {
      assert(err, "inStream.on 'error' event");
    });

    lob.on('finish', function() {
      connection.commit(function(err) {
        assert(err);
      });
    });

    inStream.pipe(lob);
  };

  let verifyBlobValueWithFileData = async function(selectSql) {
    let result = null;
    result = await connection.execute(selectSql);

    let lob = result.rows[0][0];
    assert(lob);

    let blobData = 0;
    let totalLength = 0;
    blobData = Buffer.alloc(0);

    lob.on('data', function(chunk) {
      totalLength = totalLength + chunk.length;
      blobData = Buffer.concat([blobData, chunk], totalLength);
    });

    lob.on('error', function(err) {
      assert(err, "lob.on 'error' event.");
    });

    lob.on('end', function() {
      fs.readFile(jpgFileName, function(err, originalData) {
        assert.ifError(err);
        assert.strictEqual(totalLength, originalData.length);
        assert.strictEqual(originalData, blobData);
      });
    });
    lob.destroy();
  };

  let verifyBlobValueWithBuffer = async function(selectSql, oraginalBuffer, specialStr) {
    let result = null;
    result = await connection.execute(selectSql);
    let lob = result.rows[0][0];
    if (oraginalBuffer == null | oraginalBuffer == '' || oraginalBuffer == undefined) {
      assert(lob);
    } else {
      assert(lob);
      let blobData = Buffer.alloc(0);
      let totalLength = 0;

      lob.on('data', function(chunk) {
        totalLength = totalLength + chunk.length;
        blobData = Buffer.concat([blobData, chunk], totalLength);
      });

      lob.on('error', function(err) {
        assert(err, "lob.on 'error' event.");
      });

      lob.on('end', function() {
        assert.strictEqual(totalLength, oraginalBuffer.length);
        let specStrLength = specialStr.length;
        assert.strictEqual(blobData.toString('utf8', 0, specStrLength), specialStr);
        assert.strictEqual(blobData.toString('utf8', (totalLength - specStrLength), totalLength), specialStr);
      });
    }
    lob.destroy();
  };

  // compare the result buffer with the original inserted buffer
  let compareResultBufAndOriginal = function(resultVal, originalBuffer, specialStr) {
    if (originalBuffer.length > 0) {
      let resultLength = resultVal.length;
      let specStrLength = specialStr.length;
      assert.strictEqual(resultLength, originalBuffer.length);
      assert.strictEqual(resultVal.toString('utf8', 0, specStrLength), specialStr);
      assert.strictEqual(resultVal.toString('utf8', (resultLength - specStrLength), resultLength), specialStr);
    }
    assert.strictEqual(assist.compare2Buffers(resultVal, originalBuffer), true);
  };

  let verifyBindOutResult = async function(sqlRun, bindVar, originalBuf, specialStr) {
    let result = null;
    result = await connection.execute(
      sqlRun,
      bindVar);
    if (originalBuf == "EMPTY_LOB" || originalBuf == undefined || originalBuf == null || originalBuf == "") {
      assert.strictEqual(result.outBinds.b, null);
    } else {
      let resultVal = result.outBinds.b;
      compareResultBufAndOriginal(resultVal, originalBuf, specialStr);
    }
  };

  describe('78.1 BLOB, PLSQL, BIND_OUT', function() {
    let proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_782 (blob_id IN NUMBER, blob_out OUT BLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select blob_1 into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
               "END nodb_blobs_out_782; ";
    let sqlRun = "BEGIN nodb_blobs_out_782 (:i, :b); END;";
    let proc_drop = "DROP PROCEDURE nodb_blobs_out_782";

    before(async function() {
      await executeSQL(proc);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    it('78.1.1 works with EMPTY_BLOB', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      await insertBlobWithbuffer(sequence, "EMPTY_LOB");

      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 78.1.1

    it('78.1.2 works with EMPTY_BLOB and bind out maxSize set to 1', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      await insertBlobWithbuffer(sequence, "EMPTY_LOB");

      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 78.1.2

    it('78.1.3 works with EMPTY_BLOB and bind out maxSize set to (64K - 1)', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      await insertBlobWithbuffer(sequence, "EMPTY_LOB");

      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 78.1.3

    it('78.1.4 works with null', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      await insertBlobWithbuffer(sequence, null);

      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 78.1.4

    it('78.1.5 works with null and bind out maxSize set to 1', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      await insertBlobWithbuffer(sequence, null);
      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 78.1.5

    it('78.1.6 works with null and bind out maxSize set to (64K - 1)', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      await insertBlobWithbuffer(sequence, null);

      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 78.1.6

    it('78.1.7 works with empty buffer', async function() {
      let sequence = insertID++;
      let bufferStr = Buffer.from('', "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      await insertBlobWithbuffer(sequence, bufferStr);

      await verifyBindOutResult(sqlRun, bindVar, bufferStr, null);
    }); // 78.1.7

    it('78.1.8 works with empty buffer and bind out maxSize set to 1', async function() {
      let sequence = insertID++;
      let bufferStr = Buffer.from('', "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      await insertBlobWithbuffer(sequence, bufferStr);

      await verifyBindOutResult(sqlRun, bindVar, bufferStr, null);
    }); // 78.1.8

    it('78.1.9 works with empty buffer and bind out maxSize set to (64K - 1)', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      let bufferStr = Buffer.from('', "utf-8");

      await insertBlobWithbuffer(sequence, bufferStr);

      await verifyBindOutResult(sqlRun, bindVar, bufferStr, null);
    }); // 78.1.9

    it('78.1.10 works with undefined', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      await insertBlobWithbuffer(sequence, undefined);

      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 78.1.10

    it('78.1.11 works with undefined and bind out maxSize set to 1', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      await insertBlobWithbuffer(sequence, undefined);

      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 78.1.11

    it('78.1.12 works with undefined and bind out maxSize set to (64K - 1)', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      await insertBlobWithbuffer(sequence, undefined);

      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 78.1.12

    it('78.1.13 works with Buffer size 32K', async function() {
      // Driver already supports CLOB AS STRING and BLOB AS BUFFER for PLSQL BIND if the data size less than or equal to 32767.
      // As part of this enhancement, driver allows even if data size more than 32767 for both column types
      let size = 32768;
      let sequence = insertID++;
      let specialStr = "78.1.13";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };

      await insertBlobWithbuffer(sequence, bufferStr);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr, specialStr);

      await verifyBindOutResult(sqlRun, bindVar, bufferStr, specialStr);
    }); // 78.1.13

    it('78.1.14 works with Buffer size (64K - 1)', async function() {
      let size = 65535;
      let sequence = insertID++;
      let specialStr = "78.1.14";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };

      await insertBlobWithbuffer(sequence, bufferStr);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr, specialStr);

      await verifyBindOutResult(sqlRun, bindVar, bufferStr, specialStr);
    }); // 78.1.14

    it('78.1.15 works with Buffer size (64K + 1)', async function() {
      let size = 65537;
      let sequence = insertID++;
      let specialStr = "78.1.15";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };

      await insertBlobWithbuffer(sequence, bufferStr);

      await verifyBindOutResult(sqlRun, bindVar, bufferStr, specialStr);

      file.delete(inFileStreamed);
    }); // 78.1.15

    it('78.1.16 works with Buffer size (1MB + 1)', async function() {
      let size = 1048577; // 1 * 1024 * 1024 + 1
      let sequence = insertID++;
      let specialStr = "78.1.16";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };

      await insertBlobWithbuffer(sequence, bufferStr);

      await verifyBindOutResult(sqlRun, bindVar, bufferStr, specialStr);

      file.delete(inFileStreamed);

    }); // 78.1.16

    it('78.1.17 mixing named with positional binding', async function() {
      let size = 50000;
      let sequence = insertID++;
      let specialStr = "78.1.17";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size } ];
      let result = null;

      await insertBlobWithbuffer(sequence, bufferStr);

      result = await connection.execute(
        sqlRun,
        bindVar);

      let resultVal = result.outBinds[0];
      compareResultBufAndOriginal(resultVal, bufferStr, specialStr);
    }); // 78.1.17

    it('78.1.18 works with UPDATE', async function() {
      let proc_7821 = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_7821 (blob_id IN NUMBER, blob_in IN BLOB, blob_out OUT BLOB) \n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    update nodb_tab_blob_in set blob_1 = blob_in where id = blob_id; \n" +
                      "    select blob_1 into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
                      "END nodb_blobs_out_7821; ";
      let sqlRun_7821 = "BEGIN nodb_blobs_out_7821 (:i, :bi, :bo); END;";
      let proc_drop_7821 = "DROP PROCEDURE nodb_blobs_out_7821";
      let size_1 = 50000;
      let sequence = insertID++;
      let specialStr_1 = "78.1.18_1";
      let bigStr_1 = random.getRandomString(size_1, specialStr_1);
      let bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      let size_2 = 40000;
      let specialStr_2 = "78.1.18_2";
      let bigStr_2 = random.getRandomString(size_2, specialStr_2);
      let bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        bi: { val:bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_2 },
        bo: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_2 }
      };
      let result = null;

      await insertBlobWithbuffer(sequence, bufferStr_1);

      await executeSQL(proc_7821);

      result = await connection.execute(
        sqlRun_7821,
        bindVar);

      let resultVal = result.outBinds.bo;
      compareResultBufAndOriginal(resultVal, bufferStr_2, specialStr_2);

      await executeSQL(proc_drop_7821);
    }); // 78.1.18

    it('78.1.19 works with dbms_lob.substr()', async function() {
      let size = 50000;
      let sequence = insertID++;
      let specialStr = "78.1.19";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let proc_78123 = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_78123 (blob_id IN NUMBER, blob_out OUT BLOB) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    select dbms_lob.substr(blob_1, " + specialStr.length + ", 1) into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
                       "END nodb_blobs_out_78123; ";
      let sqlRun_78123 = "BEGIN nodb_blobs_out_78123 (:i, :b); END;";
      let proc_drop_78123 = "DROP PROCEDURE nodb_blobs_out_78123";
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      let result = null;

      await insertBlobWithbuffer(sequence, bufferStr);

      await executeSQL(proc_78123);

      result = await connection.execute(
        sqlRun_78123,
        bindVar);
      let resultVal = result.outBinds.b;
      let comparedBuf = Buffer.from(specialStr, "utf-8");
      compareResultBufAndOriginal(resultVal, comparedBuf, specialStr);

      await executeSQL(proc_drop_78123);
    }); // 78.1.19

    it('78.1.20 named binding: bind out maxSize smaller than buffer size( < 32K )', async function() {
      let size = 3000;
      let sequence = insertID++;
      let specialStr = "78.1.20";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 }
      };

      await insertBlobWithbuffer(sequence, bufferStr);

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // ORA-06502: PL/SQL: numeric or value error: raw variable length too long
        /ORA-06502:/
      );
    }); // 78.1.20

    it('78.1.21 named binding: bind out maxSize smaller than buffer size( > 32K )', async function() {
      let size = 50000;
      let sequence = insertID++;
      let specialStr = "78.1.21";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 }
      };

      await insertBlobWithbuffer(sequence, bufferStr);

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // NJS-016: buffer is too small for OUT binds
        /NJS-016:/
      );
    }); // 78.1.21

    it('78.1.22 named binding: bind out maxSize smaller than buffer size( > 64K )', async function() {
      let size = 65540;
      let sequence = insertID++;
      let specialStr = "78.1.22";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 }
      };

      await insertBlobWithbuffer(sequence, bufferStr);

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // NJS-016: buffer is too small for OUT binds
        /NJS-016:/
      );
    }); // 78.1.22

    it('78.1.23 positional binding: bind out maxSize smaller than buffer size( < 32K )', async function() {
      let size = 3000;
      let sequence = insertID++;
      let specialStr = "78.1.23";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      sqlRun = "BEGIN nodb_blobs_out_782 (:1, :2); END;";
      let bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 } ];

      await insertBlobWithbuffer(sequence, bufferStr);

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // ORA-06502: PL/SQL: numeric or value error: raw variable length too long
        /ORA-06502:/
      );
    }); // 78.1.23

    it('78.1.24 positional binding: bind out maxSize smaller than buffer size( > 32K )', async function() {
      let size = 32769;
      let sequence = insertID++;
      let specialStr = "78.1.24";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      sqlRun = "BEGIN nodb_blobs_out_782 (:1, :2); END;";
      let bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 } ];

      await insertBlobWithbuffer(sequence, bufferStr);

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // NJS-016: buffer is too small for OUT binds
        /NJS-016:/
      );
    }); // 78.1.24

    it('78.1.25 positional binding: bind out maxSize smaller than buffer size( > 64K )', async function() {
      let size = 65538;
      let sequence = insertID++;
      let specialStr = "78.1.25";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      sqlRun = "BEGIN nodb_blobs_out_782 (:1, :2); END;";
      let bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 } ];

      await insertBlobWithbuffer(sequence, bufferStr);

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // NJS-016: buffer is too small for OUT binds
        /NJS-016:/
      );
    }); // 78.1.25

    it('78.1.26 bind out without maxSize', async function() {
      let size = 50000;
      let sequence = insertID++;
      let specialStr = "78.1.26";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT } ];


      await insertBlobWithbuffer(sequence, bufferStr);

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // ORA-06502: PL/SQL: numeric or value error
        /ORA-06502:/
      );
    }); // 78.1.26

  }); // 78.1

  describe('78.2 BLOB, PLSQL, BIND_OUT to RAW', function() {
    let proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_772 (blob_id IN NUMBER, blob_out OUT RAW) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select blob_1 into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
               "END nodb_blobs_out_772; ";
    let sqlRun = "BEGIN nodb_blobs_out_772 (:i, :b); END;";
    let proc_drop = "DROP PROCEDURE nodb_blobs_out_772";

    before(async function() {
      await executeSQL(proc);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    it('78.2.1 works with EMPTY_BLOB', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      await insertBlobWithbuffer(sequence, "EMPTY_LOB");

      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 78.2.1

    it('78.2.2 works with EMPTY_BLOB and bind out maxSize set to 1', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      await insertBlobWithbuffer(sequence, "EMPTY_LOB");

      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 78.2.2

    it('78.2.3 works with EMPTY_BLOB and bind out maxSize set to (64K - 1)', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      await insertBlobWithbuffer(sequence, "EMPTY_LOB");

      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 78.2.3

    it('78.2.4 works with null', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      await insertBlobWithbuffer(sequence, null);

      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 78.2.4

    it('78.2.5 works with null and bind out maxSize set to 1', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      await insertBlobWithbuffer(sequence, null);

      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 78.2.5

    it('78.2.6 works with null and bind out maxSize set to (64K - 1)', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      await insertBlobWithbuffer(sequence, null);

      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 78.2.6

    it('78.2.7 works with empty buffer', async function() {
      let sequence = insertID++;
      let bufferStr = Buffer.from('', "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      await insertBlobWithbuffer(sequence, bufferStr);

      await verifyBindOutResult(sqlRun, bindVar, bufferStr, null);
    }); // 78.2.7

    it('78.2.8 works with empty buffer and bind out maxSize set to 1', async function() {
      let sequence = insertID++;
      let bufferStr = Buffer.from('', "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      await insertBlobWithbuffer(sequence, bufferStr);

      await verifyBindOutResult(sqlRun, bindVar, bufferStr, null);
    }); // 78.2.8

    it('78.2.9 works with empty buffer and bind out maxSize set to (64K - 1)', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      let bufferStr = Buffer.from('', "utf-8");

      await insertBlobWithbuffer(sequence, bufferStr);

      await verifyBindOutResult(sqlRun, bindVar, bufferStr, null);
    }); // 78.2.9

    it('78.2.10 works with undefined', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      await insertBlobWithbuffer(sequence, undefined);

      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 78.2.10

    it('78.2.11 works with undefined and bind out maxSize set to 1', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      await insertBlobWithbuffer(sequence, undefined);

      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 78.2.11

    it('78.2.12 works with undefined and bind out maxSize set to (64K - 1)', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      await insertBlobWithbuffer(sequence, undefined);

      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 78.2.12

    it('78.2.13 works with Buffer size (32K - 1)', async function() {
      let size = 32767;
      let sequence = insertID++;
      let specialStr = "78.2.13";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };

      await insertBlobWithbuffer(sequence, bufferStr);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr, specialStr);

      await verifyBindOutResult(sqlRun, bindVar, bufferStr, specialStr);
    }); // 78.2.13

    it('78.2.14 works with Buffer size 32K', async function() {
      let size = 32768;
      let sequence = insertID++;
      let specialStr = "78.2.14";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };

      await insertBlobWithbuffer(sequence, bufferStr);

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // ORA-06502: PL/SQL: numeric or value error
        /ORA-06502:/
      );
    }); // 78.2.14

    it('78.2.15 works with bind out maxSize smaller than buffer size', async function() {
      let size = 200;
      let sequence = insertID++;
      let specialStr = "78.2.15";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 }
      };

      await insertBlobWithbuffer(sequence, bufferStr);

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // ORA-06502: PL/SQL: numeric or value error
        /ORA-06502:/
      );
    }); // 78.2.15

    it('78.2.16 bind out without maxSize', async function() {
      let size = 500;
      let sequence = insertID++;
      let specialStr = "78.2.16";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT } ];


      await insertBlobWithbuffer(sequence, bufferStr);

      await assert.rejects(
        async () => {
          await connection.execute(
            sqlRun,
            bindVar);
        },
        // ORA-06502: PL/SQL: numeric or value error
        /ORA-06502:/
      );
    }); // 78.2.16

    it('78.2.17 works with UPDATE', async function() {
      let proc_7821 = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_7821 (blob_id IN NUMBER, blob_in IN RAW, blob_out OUT RAW) \n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    update nodb_tab_blob_in set blob_1 = blob_in where id = blob_id; \n" +
                      "    select blob_1 into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
                      "END nodb_blobs_out_7821; ";
      let sqlRun_7821 = "BEGIN nodb_blobs_out_7821 (:i, :bi, :bo); END;";
      let proc_drop_7821 = "DROP PROCEDURE nodb_blobs_out_7821";
      let size_1 = 200;
      let sequence = insertID++;
      let specialStr_1 = "78.2.17_1";
      let bigStr_1 = random.getRandomString(size_1, specialStr_1);
      let bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      let size_2 = 300;
      let specialStr_2 = "78.2.17_2";
      let bigStr_2 = random.getRandomString(size_2, specialStr_2);
      let bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        bi: { val:bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_2 },
        bo: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_2 }
      };
      let result = null;

      await insertBlobWithbuffer(sequence, bufferStr_1);

      await executeSQL(proc_7821);

      result = await connection.execute(
        sqlRun_7821,
        bindVar);
      let resultVal = result.outBinds.bo;
      compareResultBufAndOriginal(resultVal, bufferStr_2, specialStr_2);
      await executeSQL(proc_drop_7821);
    }); // 78.2.17

    it('78.2.18 works with dbms_lob.substr()', async function() {
      let size = 3000;
      let sequence = insertID++;
      let specialStr = "78.2.18";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let proc_78223 = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_78223 (blob_id IN NUMBER, blob_out OUT RAW) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    select dbms_lob.substr(blob_1, " + specialStr.length + ", 1) into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
                       "END nodb_blobs_out_78223; ";
      let sqlRun_78223 = "BEGIN nodb_blobs_out_78223 (:i, :b); END;";
      let proc_drop_78223 = "DROP PROCEDURE nodb_blobs_out_78223";
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      let result = null;
      await insertBlobWithbuffer(sequence, bufferStr);

      await executeSQL(proc_78223);

      result = await connection.execute(
        sqlRun_78223,
        bindVar);
      let resultVal = result.outBinds.b;
      let comparedBuf = Buffer.from(specialStr, "utf-8");
      compareResultBufAndOriginal(resultVal, comparedBuf, specialStr);
      await executeSQL(proc_drop_78223);
    }); // 78.2.18

  }); // 78.2

  describe('78.3 Multiple BLOBs, BIND_OUT', function() {
    let proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_out_775 (blob_id IN NUMBER, blob_1 OUT BLOB, blob_2 OUT BLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select blob_1, blob_2 into blob_1, blob_2 from nodb_tab_blob_in where id = blob_id; \n" +
               "END nodb_lobs_out_775; ";
    let sqlRun = "BEGIN nodb_lobs_out_775 (:i, :b1, :b2); END;";
    let proc_drop = "DROP PROCEDURE nodb_lobs_out_775";

    before(async function() {
      await executeSQL(proc);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    let insertTwoBlobWithbuffer = async function(id, insertBuffer1, insertBuffer2) {
      let sql = "INSERT INTO nodb_tab_blob_in (id, blob_1, blob_2) VALUES (:i, :b1, :b2)";
      let bindVar = {
        i: { val: id, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        b1: { val: insertBuffer1, dir: oracledb.BIND_IN, type: oracledb.BUFFER },
        b2: { val: insertBuffer2, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
      };

      let result = null;
      result = await connection.execute(
        sql,
        bindVar);
      assert.strictEqual(result.rowsAffected, 1);
    };

    it('78.3.1 bind two buffer', async function() {
      let specialStr_1 = "78.3.1_1";
      let specialStr_2 = "78.3.1_2";
      let size_1 = 32768;
      let size_2 = 50000;
      let sequence = insertID++;
      let bigStr_1 = random.getRandomString(size_1, specialStr_1);
      let bigStr_2 = random.getRandomString(size_2, specialStr_2);
      let bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      let bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_1 },
        b2: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_2 }
      };
      let result = null;

      insertTwoBlobWithbuffer(sequence, bufferStr_1, bufferStr_2);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr_1, specialStr_1);

      sql = "select blob_2 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr_2, specialStr_2);

      result = await connection.execute(
        sqlRun,
        bindVar);

      let resultVal = result.outBinds.b1;
      compareResultBufAndOriginal(resultVal, bufferStr_1, specialStr_1);
      resultVal = result.outBinds.b2;
      compareResultBufAndOriginal(resultVal, bufferStr_2, specialStr_2);
    }); // 78.3.1

    it('78.3.2 PLSQL, BIND_OUT, bind a JPG file and a Buffer', async function() {
      let specialStr = "78.3.2";
      let size_1 = 32768;
      let bigStr_1 = random.getRandomString(size_1, specialStr);
      let bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_1 },
        b2: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
      };
      let result = null;
      let sql = "INSERT INTO nodb_tab_blob_in (id, blob_2) VALUES (:i, EMPTY_BLOB()) RETURNING blob_2 INTO :lobbv";
      await prepareTableWithBlob(sql, sequence);
      sql = "select blob_2 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithFileData(sql);
      sql = "UPDATE nodb_tab_blob_in set blob_1 = :b1 where id = :i";
      let bindVar_1 = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 }
      };
      result = await connection.execute(
        sql,
        bindVar_1);
      assert.strictEqual(result.rowsAffected, 1);
      sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr_1, specialStr);
      result = await connection.execute(
        sqlRun,
        bindVar);
      let resultVal = result.outBinds.b1;
      compareResultBufAndOriginal(resultVal, bufferStr_1, specialStr);
      let lob = result.outBinds.b2;
      let blobData = Buffer.alloc(0);
      let totalLength = 0;
      lob.on('data', function(chunk) {
        totalLength = totalLength + chunk.length;
        blobData = Buffer.concat([blobData, chunk], totalLength);
      });
      lob.on('error', function(err) {
        assert(err, "lob.on 'error' event.");
      });
      lob.on('end', function() {
        fs.readFile(jpgFileName, function(err, originalData) {
          assert(err);
          assert.strictEqual(totalLength, originalData.length);
          assert.strictEqual(originalData, blobData);
        });
      });
      lob.destroy();
    }); // 78.3.2

    it('78.3.3 bind two buffer, one > (64K - 1)', async function() {
      let specialStr_1 = "78.3.3_1";
      let specialStr_2 = "78.3.3_2";
      let size_1 = 65538;
      let size_2 = 50000;
      let sequence = insertID++;
      let bigStr_1 = random.getRandomString(size_1, specialStr_1);
      let bigStr_2 = random.getRandomString(size_2, specialStr_2);
      let bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      let bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_1 },
        b2: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_2 }
      };
      let result = null;

      await insertTwoBlobWithbuffer(sequence, bufferStr_1, bufferStr_2);

      result = await connection.execute(
        sqlRun,
        bindVar);
      let resultVal = result.outBinds.b1;
      compareResultBufAndOriginal(resultVal, bufferStr_1, specialStr_1);
      resultVal = result.outBinds.b2;
      compareResultBufAndOriginal(resultVal, bufferStr_2, specialStr_2);
    }); // 78.3.3

  }); // 78.3

});

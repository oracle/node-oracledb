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
 *   77. blobPlsqlBindAsBuffer_bindin.js
 *
 * DESCRIPTION
 *   Testing BLOB binding in as Buffer.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const fs       = require('fs');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');
const assist   = require('./dataTypeAssist.js');

describe('77. blobPlsqlBindAsBuffer_bindin.js', function() {

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
    await connection.execute(sql);
  };

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
        assert.equal(originalData, blobData);
      });
    });
    lob.destroy();
  };

  let verifyBlobValueWithBuffer = async function(selectSql, originalBuffer, specialStr) {
    let result = null;
    result = await connection.execute(selectSql);
    let lob = result.rows[0][0];
    if (originalBuffer == null || originalBuffer == undefined) {
      assert.ifError(lob);
    } else {
      assert(lob);
      let blobData =  Buffer.alloc(0);
      let totalLength = 0;

      lob.on('data', function(chunk) {
        totalLength = totalLength + chunk.length;
        blobData = Buffer.concat([blobData, chunk], totalLength);
      });

      lob.on('error', function(err) {
        assert.ifError(err, "lob.on 'error' event.");
      });

      lob.on('end', function() {
        assert.strictEqual(totalLength, originalBuffer.length);
        compareResultBufAndOriginal(blobData, totalLength, originalBuffer, specialStr);
      });
      lob.destroy();
    }
  };

  // compare the result buffer with the original inserted buffer
  let compareResultBufAndOriginal = function(resultVal, totalLength, originalBuffer, specialStr) {
    if (originalBuffer.length > 0) {
      let specStrLength = specialStr.length;
      assert.strictEqual(resultVal.toString('utf8', 0, specStrLength), specialStr);
      assert.strictEqual(resultVal.toString('utf8', (totalLength - specStrLength), totalLength), specialStr);
    }
    assert.strictEqual(assist.compare2Buffers(resultVal, originalBuffer), true);
  };

  // execute the bind in plsql procedure
  let plsqlBindIn = async function(sqlRun, bindVar, option) {
    await connection.execute(
      sqlRun,
      bindVar,
      option);
  };

  describe('77.1 BLOB, PLSQL, BIND_IN', function() {
    let proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_in_771 (blob_id IN NUMBER, blob_in IN BLOB)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_blob_in (id, blob_1) values (blob_id, blob_in); \n" +
               "END nodb_blobs_in_771; ";
    let sqlRun = "BEGIN nodb_blobs_in_771 (:i, :b); END;";
    let proc_drop = "DROP PROCEDURE nodb_blobs_in_771";

    let proc_7711 = "CREATE OR REPLACE PROCEDURE nodb_blobs_in_7711 (blob_id IN NUMBER, blob_in IN BLOB)\n" +
                    "AS \n" +
                    "BEGIN \n" +
                    "    insert into nodb_tab_blob_in (id, blob_1) values (blob_id, EMPTY_BLOB()); \n" +
                    "END nodb_blobs_in_7711; ";
    let sqlRun_7711 = "BEGIN nodb_blobs_in_7711 (:i, :b); END;";
    let proc_drop_7711 = "DROP PROCEDURE nodb_blobs_in_7711";

    before(async function() {
      await executeSQL(proc);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    it('77.1.1 works with EMPTY_BLOB', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      let option = { autoCommit: true };

      await executeSQL(proc_7711);

      await plsqlBindIn(sqlRun_7711, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      let emptyBuffer =  Buffer.from("", "utf-8");
      await verifyBlobValueWithBuffer(sql, emptyBuffer, null);

      await executeSQL(proc_drop_7711);
    }); // 77.1.1

    it('77.1.2 works with EMPTY_BLOB and bind in maxSize set to 1', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      let option = { autoCommit: true };

      await executeSQL(proc_7711);

      await plsqlBindIn(sqlRun_7711, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      let emptyBuffer =  Buffer.from("", "utf-8");
      await verifyBlobValueWithBuffer(sql, emptyBuffer, null);

      await executeSQL(proc_drop_7711);
    }); // 77.1.2

    it('77.1.3 works with EMPTY_BLOB and bind in maxSize set to (64K - 1)', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      let option = { autoCommit: true };

      await executeSQL(proc_7711);

      await plsqlBindIn(sqlRun_7711, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      let emptyBuffer =  Buffer.from("", "utf-8");
      await verifyBlobValueWithBuffer(sql, emptyBuffer, null);

      await executeSQL(proc_drop_7711);
    }); // 77.1.3

    it('77.1.4 works with null', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.1.4

    it('77.1.5 works with null and bind in maxSize set to 1', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.1.5

    it('77.1.6 works with null and bind in maxSize set to (64K - 1)', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      let option = { autoCommit: true };


      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.1.6

    it('77.1.7 works with empty buffer', async function() {
      let sequence = insertID++;
      let bufferStr =  Buffer.from('', "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.1.7

    it('77.1.8 works with empty buffer and bind in maxSize set to 1', async function() {
      let sequence = insertID++;
      let bufferStr = Buffer.from('', "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      let option = { autoCommit: true };


      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.1.8

    it('77.1.9 works with empty buffer and bind in maxSize set to (64K - 1)', async function() {
      let sequence = insertID++;
      let bufferStr = Buffer.from('', "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      let option = { autoCommit: true };


      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.1.9

    it('77.1.10 works with undefined', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.1.10

    it('77.1.11 works with undefined and bind in maxSize set to 1', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.1.11

    it('77.1.12 works with undefined and bind in maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      const option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.1.12

    it('77.1.13 works with NaN', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: NaN, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-011:/
      );
    }); // 77.1.13

    it('77.1.14 works with 0', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: 0, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-011:/
      );
    }); // 77.1.14

    it('77.1.15 works with Buffer size 32K', async function() {
      // Driver already supports CLOB AS STRING and BLOB AS BUFFER for PLSQL BIND if the data size less than or equal to 32767.
      // As part of this enhancement, driver allows even if data size more than 32767 for both column types
      let sequence = insertID++;
      let size = 32768;
      let specialStr = "77.1.15";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr, specialStr);
    }); // 77.1.15

    it('77.1.16 works with Buffer size (64K - 1)', async function() {
      let size = 65535;
      let sequence = insertID++;
      let specialStr = "77.1.16";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr, specialStr);
    }); // 77.1.16

    it('77.1.17 works with Buffer size (64K + 1)', async function() {
      let size = 65537;
      let sequence = insertID++;
      let specialStr = "77.1.17";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr, specialStr);
    }); // 77.1.17

    it('77.1.18 works with Buffer size (1MB + 1)', async function() {
      let size = 1048577; // 1 * 1024 * 1024 + 1
      let sequence = insertID++;
      let specialStr = "77.1.18";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr, specialStr);
    }); // 77.1.18

    it('77.1.19 works with bind value and type mismatch', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: 200, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 50000 }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-011:/
      );
    }); // 77.1.19

    it('77.1.20 mixing named with positional binding', async function() {
      const size = 50000;
      const sequence = insertID++;
      const specialStr = "77.1.20";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = [ sequence, { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size } ];
      const option = { autoCommit: true };

      const sqlRun_77122 = "BEGIN nodb_blobs_in_771 (:1, :2); END;";
      await plsqlBindIn(sqlRun_77122, bindVar, option);

      const sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr, specialStr);
    }); // 77.1.20

    it('77.1.21 works with invalid BLOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: {}, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 50000 }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-011:/
      );
    }); // 77.1.21

    it('77.1.22 works without maxSize', async function() {
      let size = 65535;
      let sequence = insertID++;
      let specialStr = "77.1.22";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr, specialStr);
    }); // 77.1.22

    it('77.1.23 works with bind in maxSize smaller than buffer size', async function() {
      let size = 65535;
      let sequence = insertID++;
      let specialStr = "77.1.23";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size - 1 }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr, specialStr);
    }); // 77.1.23

    it('77.1.24 works with UPDATE', async function() {
      let proc_7726 = "CREATE OR REPLACE PROCEDURE nodb_blobs_in_7726 (blob_id IN NUMBER, blob_in IN BLOB, blob_update IN BLOB)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into nodb_tab_blob_in (id, blob_1) values (blob_id, blob_in); \n" +
                      "    update nodb_tab_blob_in set blob_1 = blob_update where id = blob_id; \n" +
                      "END nodb_blobs_in_7726; ";
      let sqlRun_7726 = "BEGIN nodb_blobs_in_7726 (:i, :b1, :b2); END;";
      let proc_drop_7726 = "DROP PROCEDURE nodb_blobs_in_7726";
      let sequence = insertID++;
      let size_1 = 65535;
      let specialStr_1 = "77.1.24_1";
      let bigStr_1 = random.getRandomString(size_1, specialStr_1);
      let bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      let size_2 = 30000;
      let specialStr_2 = "77.1.24_2";
      let bigStr_2 = random.getRandomString(size_2, specialStr_2);
      let bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 },
        b2: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_2 }
      };
      let option = { autoCommit: true };

      await executeSQL(proc_7726);

      await connection.execute(
        sqlRun_7726,
        bindVar,
        option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr_2, specialStr_2);

      await executeSQL(proc_drop_7726);
    }); // 77.1.24
  }); // 77.1

  describe('77.2 BLOB, PLSQL, BIND_IN to RAW', function() {
    let proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_in_771 (blob_id IN NUMBER, blob_in IN RAW)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_blob_in (id, blob_1) values (blob_id, blob_in); \n" +
               "END nodb_blobs_in_771; ";
    let sqlRun = "BEGIN nodb_blobs_in_771 (:i, :b); END;";
    let proc_drop = "DROP PROCEDURE nodb_blobs_in_771";

    let proc_7721 = "CREATE OR REPLACE PROCEDURE nodb_blobs_in_7721 (blob_id IN NUMBER, blob_in IN RAW)\n" +
                    "AS \n" +
                    "BEGIN \n" +
                    "    insert into nodb_tab_blob_in (id, blob_1) values (blob_id, EMPTY_BLOB()); \n" +
                    "END nodb_blobs_in_7721; ";
    let sqlRun_7721 = "BEGIN nodb_blobs_in_7721 (:i, :b); END;";
    let proc_drop_7721 = "DROP PROCEDURE nodb_blobs_in_7721";

    before(async function() {
      await executeSQL(proc);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    it('77.2.1 works with EMPTY_BLOB', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      let option = { autoCommit: true };

      await executeSQL(proc_7721);

      await plsqlBindIn(sqlRun_7721, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      let emptyBuffer = Buffer.from("", "utf-8");
      await verifyBlobValueWithBuffer(sql, emptyBuffer, null);

      await executeSQL(proc_drop_7721);
    }); // 77.2.1

    it('77.2.2 works with EMPTY_BLOB and bind in maxSize set to 1', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      let option = { autoCommit: true };

      await executeSQL(proc_7721);

      await plsqlBindIn(sqlRun_7721, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      let emptyBuffer = Buffer.from("", "utf-8");
      await verifyBlobValueWithBuffer(sql, emptyBuffer, null);

      await executeSQL(proc_drop_7721);
    }); // 77.2.2

    it('77.2.3 works with EMPTY_BLOB and bind in maxSize set to (64K - 1)', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      let option = { autoCommit: true };

      await executeSQL(proc_7721);

      await plsqlBindIn(sqlRun_7721, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      let emptyBuffer = Buffer.from("", "utf-8");
      await verifyBlobValueWithBuffer(sql, emptyBuffer, null);

      await executeSQL(proc_drop_7721);
    }); // 77.2.3

    it('77.2.4 works with null', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.2.4

    it('77.2.5 works with null and bind in maxSize set to 1', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.2.5

    it('77.2.6 works with null and bind in maxSize set to (64K - 1)', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.2.6

    it('77.2.7 works with empty buffer', async function() {
      let sequence = insertID++;
      let bufferStr = Buffer.from('', "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.2.7

    it('77.2.8 works with empty buffer and bind in maxSize set to 1', async function() {
      let sequence = insertID++;
      let bufferStr = Buffer.from('', "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.2.8

    it('77.2.9 works with empty buffer and bind in maxSize set to (64K - 1)', async function() {
      let sequence = insertID++;
      let bufferStr = Buffer.from('', "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.2.9

    it('77.2.10 works with undefined', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.2.10

    it('77.2.11 works with undefined and bind in maxSize set to 1', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.2.11

    it('77.2.12 works with undefined and bind in maxSize set to (64K - 1)', async function() {
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, null, null);
    }); // 77.2.12

    it('77.2.13 works with NaN', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: NaN, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-011:/
      );
    }); // 77.2.13

    it('77.2.14 works with 0', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: 0, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-011:/
      );
    }); // 77.2.14

    it('77.2.15 works with Buffer size (32K - 1)', async function() {
      let sequence = insertID++;
      let size = 32767;
      let specialStr = "77.2.15";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr, specialStr);
    }); // 77.2.15

    it('77.2.16 works with Buffer size 32K', async function() {
      const size = 32768;
      const sequence = insertID++;
      const specialStr = "77.2.16";
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size }
      };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        /ORA-06502:/
      );
    }); // 77.2.16

    it('77.2.17 works with invalid BLOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: {}, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 50000 }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-011:/
      );
    }); // 77.2.17

    it('77.2.18 works without maxSize', async function() {
      let size = 3000;
      let sequence = insertID++;
      let specialStr = "77.2.18";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr, specialStr);
    }); // 77.2.18

    it('77.2.19 works with bind in maxSize smaller than buffer size', async function() {
      let size = 400;
      let sequence = insertID++;
      let specialStr = "77.2.19";
      let bigStr = random.getRandomString(size, specialStr);
      let bufferStr = Buffer.from(bigStr, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size - 1 }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr, specialStr);
    }); // 77.2.19

    it('77.2.20 works with UPDATE', async function() {
      let proc_7720 = "CREATE OR REPLACE PROCEDURE nodb_blobs_in_7720 (blob_id IN NUMBER, blob_in IN RAW, blob_update IN RAW)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into nodb_tab_blob_in (id, blob_1) values (blob_id, blob_in); \n" +
                      "    update nodb_tab_blob_in set blob_1 = blob_update where id = blob_id; \n" +
                      "END nodb_blobs_in_7720; ";
      let sqlRun_7720 = "BEGIN nodb_blobs_in_7720 (:i, :b1, :b2); END;";
      let proc_drop_7720 = "DROP PROCEDURE nodb_blobs_in_7720";
      let sequence = insertID++;
      let size_1 = 3000;
      let specialStr_1 = "77.2.20_1";
      let bigStr_1 = random.getRandomString(size_1, specialStr_1);
      let bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      let size_2 = 2000;
      let specialStr_2 = "77.2.20_2";
      let bigStr_2 = random.getRandomString(size_2, specialStr_2);
      let bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 },
        b2: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_2 }
      };
      let option = { autoCommit: true };

      await executeSQL(proc_7720);

      await connection.execute(
        sqlRun_7720,
        bindVar,
        option);

      let sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bufferStr_2, specialStr_2);

      await executeSQL(proc_drop_7720);
    }); // 77.2.20

  }); // 77.2

  describe('77.3 Multiple BLOBs, BIND_IN', function() {
    let proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_in_774 (blob_id IN NUMBER, blob_1 IN BLOB, blob_2 IN BLOB)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_blob_in (id, blob_1, blob_2) values (blob_id, blob_1, blob_2); \n" +
               "END nodb_blobs_in_774; ";
    let sqlRun = "BEGIN nodb_blobs_in_774 (:i, :b1, :b2); END;";
    let proc_drop = "DROP PROCEDURE nodb_blobs_in_774";

    before(async function() {
      await executeSQL(proc);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    it('77.3.1 bind two Buffer', async function() {
      let size_1 = 32768;
      let size_2 = 50000;
      let specialStr_1 = "77.3.1_1";
      let specialStr_2 = "77.3.1_2";
      let bigStr_1 = random.getRandomString(size_1, specialStr_1);
      let bigStr_2 = random.getRandomString(size_2, specialStr_2);
      let bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      let bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 },
        b2: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_2 }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql_1 = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql_1, bufferStr_1, specialStr_1);

      let sql_2 = "select blob_2 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql_2, bufferStr_2, specialStr_2);
    }); // 77.3.1

    it('77.3.2 bind a JPG file and a Buffer', async function() {
      let specialStr = "77.3.2";
      let preparedCLOBID = 301;
      let sequence = insertID++;
      let size_1 = 32768;
      let bigStr_1 = random.getRandomString(size_1, specialStr);
      let bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      let result = null;

      let sql = "INSERT INTO nodb_tab_lobs_in (id, blob) VALUES (:i, EMPTY_BLOB()) RETURNING blob INTO :lobbv";
      await prepareTableWithBlob(sql, preparedCLOBID);

      result = await connection.execute(
        "select blob from nodb_tab_lobs_in where id = :id",
        { id: preparedCLOBID });

      assert.notEqual(result.rows.length, 0);

      const blob = result.rows[0][0];
      await connection.execute(
        sqlRun,
        {
          i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          b1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 },
          b2: { val: blob, type: oracledb.BLOB, dir: oracledb.BIND_IN }
        },
        { autoCommit: true });
      blob.destroy();

      let sql_1 = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql_1, bufferStr_1, specialStr);

      let sql_2 = "select blob_2 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithFileData(sql_2);
    }); // 77.3.2

    it('77.3.3 bind two Buffer, one > (64K - 1)', async function() {
      let size_1 = 65538;
      let size_2 = 50000;
      let specialStr_1 = "77.3.3_1";
      let specialStr_2 = "77.3.3_2";
      let bigStr_1 = random.getRandomString(size_1, specialStr_1);
      let bigStr_2 = random.getRandomString(size_2, specialStr_2);
      let bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      let bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      let sequence = insertID++;
      let bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 },
        b2: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_2 }
      };
      let option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);

      let sql_1 = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql_1, bufferStr_1, specialStr_1);

      let sql_2 = "select blob_2 from nodb_tab_blob_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql_2, bufferStr_2, specialStr_2);
    }); // 77.3.3

  }); // 77.3

});

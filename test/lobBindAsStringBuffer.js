/* Copyright (c) 2016, 2022, Oracle and/or its affiliates. */

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
 *   80. lobBindAsStringBuffer.js
 *
 * DESCRIPTION
 *   Testing CLOB/BLOB binding as String/Buffer.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const fs = require('fs');
const fsPromises = require('node:fs/promises');
const random = require('./random.js');

describe('80. lobBindAsStringBuffer.js', function() {
  let connection;

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
                         "            clob  CLOB, \n" +
                         "            blob  BLOB \n" +
                         "        ) \n" +
                         "    '); \n" +
                         "END; ";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(proc_lobs_in_tab);
  });

  after(async function() {
    await connection.execute("DROP TABLE nodb_tab_lobs_in PURGE");
    await connection.close();
  });

  const inFileName = './test/clobexample.txt';

  const prepareTableWithClob = async function(sql, id) {
    const bindVar = { i: id, lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } };
    const result = await connection.execute(sql, bindVar,
      { autoCommit: false }); // a transaction needs to span the INSERT and pipe()
    assert.strictEqual(result.rowsAffected, 1);
    assert.strictEqual(result.outBinds.lobbv.length, 1);
    const inStream = fs.createReadStream(inFileName);
    const lob = result.outBinds.lobbv[0];
    await new Promise((resolve, reject) => {
      inStream.on('error', reject);
      lob.on('error', reject);
      lob.on('finish', resolve);
      inStream.pipe(lob);
    });
    await connection.commit();
  };

  const jpgFileName = './test/fuzzydinosaur.jpg';

  const prepareTableWithBlob = async function(sql, id) {
    const bindVar = { i: id, lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } };
    const result = await connection.execute(sql, bindVar);
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

  const verifyClobValueWithFileData = async function(selectSql) {
    const result = await connection.execute(selectSql);
    const lob = result.rows[0][0];
    lob.setEncoding('utf8');
    let clobData = '';
    await new Promise((resolve, reject) => {
      lob.on('error', reject);
      lob.on('end', resolve);
      lob.on('data', function(chunk) {
        clobData += chunk;
      });
    });
    const data = await fsPromises.readFile(inFileName, {encoding: "utf8"});
    assert.strictEqual(clobData, data);
  };

  const verifyClobValueWithString = async function(selectSql, originalString, specialStr) {
    const result = await connection.execute(selectSql);
    const lob = result.rows[0][0];
    if (originalString == null || originalString == undefined) {
      assert.strictEqual(lob, undefined);
    } else {
      lob.setEncoding('utf8');
      let clobData = '';
      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('end', resolve);
        lob.on('data', function(chunk) {
          clobData += chunk;
        });
      });
      const resultLength = clobData.length;
      const specStrLength = specialStr.length;
      assert.strictEqual(resultLength, originalString.length);
      assert.strictEqual(clobData.substring(0, specStrLength), specialStr);
      assert.strictEqual(clobData.substring(resultLength - specStrLength, resultLength), specialStr);
    }
  };

  const verifyBlobValueWithFileData = async function(selectSql) {
    const result = await connection.execute(selectSql);
    const lob = result.rows[0][0];
    let blobData = Buffer.alloc(0);
    let totalLength = 0;
    await new Promise((resolve, reject) => {
      lob.on('error', reject);
      lob.on('end', resolve);
      lob.on('data', function(chunk) {
        totalLength = totalLength + chunk.length;
        blobData = Buffer.concat([blobData, chunk]);
      });
    });
    const data = await fsPromises.readFile(jpgFileName);
    assert.strictEqual(totalLength, data.length);
    assert.deepEqual(blobData, data);
  };

  const verifyBlobValueWithBuffer = async function(selectSql, oraginalBuffer, specialStr) {
    const result = await connection.execute(selectSql);
    const lob = result.rows[0][0];
    if (oraginalBuffer == null | oraginalBuffer == '' || oraginalBuffer == undefined) {
      assert.strictEqual(lob, undefined);
    } else {
      let blobData = Buffer.alloc(0);
      let totalLength = 0;
      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('end', resolve);
        lob.on('data', function(chunk) {
          totalLength = totalLength + chunk.length;
          blobData = Buffer.concat([blobData, chunk]);
        });
      });
      assert.strictEqual(totalLength, oraginalBuffer.length);
      const specStrLength = specialStr.length;
      assert.strictEqual(blobData.toString('utf8', 0, specStrLength), specialStr);
      assert.strictEqual(blobData.toString('utf8', (totalLength - specStrLength), totalLength), specialStr);
    }
  };

  describe('80.1 Multiple LOBs, BIND_IN', function() {

    const proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_781 (id IN NUMBER, clob_in IN CLOB, blob_in IN BLOB)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_lobs_in (id, clob, blob) values (id, clob_in, blob_in); \n" +
               "END nodb_lobs_in_781; ";
    const sqlRun = "BEGIN nodb_lobs_in_781 (:i, :c, :b); END;";
    const proc_drop = "DROP PROCEDURE nodb_lobs_in_781";

    before(async function() {
      await connection.execute(proc);
    });

    after(async function() {
      await connection.execute(proc_drop);
    });

    it('80.1.1 PLSQL, CLOB&BLOB, bind a string and a buffer', async function() {
      const specialStr = "80.1.1";
      const length = 50000;
      const bigStr = random.getRandomString(length, specialStr);
      const bigBuffer = Buffer.from(bigStr, "utf-8");
      const sequence = 700;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: bigStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: length },
        b: { val: bigBuffer, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: length }
      };
      await connection.execute(sqlRun, bindVar, { autoCommit: true });
      const sql_1 = "select clob from nodb_tab_lobs_in where id = " + sequence;
      await verifyClobValueWithString(sql_1, bigStr, specialStr);
      const sql_2 = "select blob from nodb_tab_lobs_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql_2, bigBuffer, specialStr);
    }); // 80.1.1

    it('80.1.2 PLSQL, CLOB&BLOB, bind a string and a JPG file', async function() {
      const preparedCLOBID = 701;
      const sequence = 2;
      const size = 40000;
      const specialStr = "80.1.2";
      const bigStr = random.getRandomString(size, specialStr);
      const sql = "INSERT INTO nodb_tab_lobs_in (id, blob) VALUES (:i, EMPTY_BLOB()) RETURNING blob INTO :lobbv";
      await prepareTableWithBlob(sql, preparedCLOBID);
      const result = await connection.execute(
        "select blob from nodb_tab_lobs_in where id = :id",
        { id: preparedCLOBID });
      assert.strictEqual(result.rows.length, 1);
      const blob = result.rows[0][0];
      const binds = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: bigStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: size },
        b: { val: blob, type: oracledb.BLOB, dir: oracledb.BIND_IN }
      };
      await connection.execute(sqlRun, binds, { autoCommit: true });
      await blob.close();
      const sql_1 = "select clob from nodb_tab_lobs_in where id = " + sequence;
      await verifyClobValueWithString(sql_1, bigStr, specialStr);
      const sql_2 = "select blob from nodb_tab_lobs_in where id = " + sequence;
      await verifyBlobValueWithFileData(sql_2);
    }); // 80.1.2

    it('80.1.3 PLSQL, CLOB&BLOB, bind a txt file and a Buffer', async function() {
      const preparedCLOBID = 200;
      const sequence = 303;
      const size = 40000;
      const specialStr = "80.1.3";
      const bigStr = random.getRandomString(size, specialStr);
      const bigBuffer = Buffer.from(bigStr, "utf-8");
      const sql = "INSERT INTO nodb_tab_lobs_in (id, clob) VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv";
      await prepareTableWithClob(sql, preparedCLOBID);
      const result = await connection.execute(
        "select clob from nodb_tab_lobs_in where id = :id",
        { id: preparedCLOBID });
      assert.strictEqual(result.rows.length, 1);
      const clob = result.rows[0][0];
      const binds = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clob, type: oracledb.CLOB, dir: oracledb.BIND_IN },
        b: { val: bigBuffer, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      await connection.execute(sqlRun, binds, { autoCommit: true });
      await clob.close();
      const sql_1 = "select clob from nodb_tab_lobs_in where id = " + sequence;
      await verifyClobValueWithFileData(sql_1);
      const sql_2 = "select blob from nodb_tab_lobs_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql_2, bigBuffer, specialStr);
    }); // 80.1.3

  }); // 80.1

  describe('80.2 Multiple LOBs, BIND_OUT', function() {
    const proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_out_782 (lob_id IN NUMBER, clob OUT CLOB, blob OUT BLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select clob, blob into clob, blob from nodb_tab_lobs_in where id = lob_id; \n" +
               "END nodb_lobs_out_782; ";
    const sqlRun = "BEGIN nodb_lobs_out_782 (:i, :c, :b); END;";
    const proc_drop = "DROP PROCEDURE nodb_lobs_out_782";

    before(async function() {
      await connection.execute(proc);
    });

    after(async function() {
      await connection.execute(proc_drop);
    });

    const insertLobs = async function(id, insertStr1, insertStr2) {
      const sql = "INSERT INTO nodb_tab_lobs_in (id, clob, blob) VALUES (:i, :c, :b)";
      const bindVar = {
        i: { val: id, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        c: { val: insertStr1, dir: oracledb.BIND_IN, type: oracledb.STRING },
        b: { val: insertStr2, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
      };
      const result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.rowsAffected, 1);
    };

    it('80.2.1 PLSQL, CLOB&BLOB, bind a string and a buffer', async function() {
      const length = 50000;
      const specialStr = "80.2.1";
      const sequence = 311;
      const bigStr = random.getRandomString(length, specialStr);
      const bigBuffer = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: length },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: length }
      };
      await insertLobs(sequence, bigStr, bigBuffer);
      let sql = "select clob from nodb_tab_lobs_in where id = " + sequence;
      await verifyClobValueWithString(sql, bigStr, specialStr);
      sql = "select blob from nodb_tab_lobs_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bigBuffer, specialStr);
      const result = await connection.execute(sqlRun, bindVar);
      const specStrLength = specialStr.length;
      const resultLength1 = result.outBinds.c.length;
      assert.strictEqual(resultLength1, length);
      assert.strictEqual(result.outBinds.c.substring(0, specStrLength), specialStr);
      assert.strictEqual(result.outBinds.c.substring(resultLength1 - specStrLength, resultLength1), specialStr);
      const resultLength2 = result.outBinds.b.length;
      assert.strictEqual(resultLength2, length);
      assert.strictEqual(result.outBinds.b.toString('utf8', 0, specStrLength), specialStr);
      assert.strictEqual(result.outBinds.b.toString('utf8', (resultLength2 - specStrLength), resultLength2), specialStr);
    }); // 80.2.1

    it('80.2.2 PLSQL, CLOB&BLOB, bind a string and a JPG file', async function() {
      const size = 40000;
      const specialStr = "80.2.2";
      const bigStr = random.getRandomString(size, specialStr);
      const sequence = 312;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: size },
        b: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
      };
      let sql = "INSERT INTO nodb_tab_lobs_in (id, blob) VALUES (:i, EMPTY_BLOB()) RETURNING blob INTO :lobbv";
      await prepareTableWithBlob(sql, sequence);
      sql = "select blob from nodb_tab_lobs_in where id = " + sequence;
      await verifyBlobValueWithFileData(sql);
      sql = "update nodb_tab_lobs_in set clob = :c where id = :i";
      const bindVar_1 = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: bigStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: size }
      };
      let result = await connection.execute(sql, bindVar_1);
      assert.strictEqual(result.rowsAffected, 1);
      sql = "select clob from nodb_tab_lobs_in where id = " + sequence;
      await verifyClobValueWithString(sql, bigStr, specialStr);
      result = await connection.execute(sqlRun, bindVar);
      const resultLength = result.outBinds.c.length;
      const specStrLength = specialStr.length;
      assert.strictEqual(resultLength, size);
      assert.strictEqual(result.outBinds.c.substring(0, specStrLength), specialStr);
      assert.strictEqual(result.outBinds.c.substring(resultLength - specStrLength, resultLength), specialStr);

      const lob = result.outBinds.b;
      let blobData = Buffer.alloc(0);
      let totalLength = 0;
      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('end', resolve);
        lob.on('data', function(chunk) {
          totalLength = totalLength + chunk.length;
          blobData = Buffer.concat([blobData, chunk]);
        });
      });
      const data = await fsPromises.readFile(jpgFileName);
      assert.strictEqual(totalLength, data.length);
      assert.deepEqual(blobData, data);
    }); // 80.2.2

    it('80.2.3 PLSQL, CLOB&BLOB, bind a txt file and a buffer', async function() {
      const size = 40000;
      const specialStr = "80.2.3";
      const bigStr = random.getRandomString(size, specialStr);
      const bigBuffer = Buffer.from(bigStr, "utf-8");
      const sequence = 313;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.CLOB, dir: oracledb.BIND_OUT },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      let sql = "INSERT INTO nodb_tab_lobs_in (id, clob) VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv";
      await prepareTableWithClob(sql, sequence);
      sql = "select clob from nodb_tab_lobs_in where id = " + sequence;
      await verifyClobValueWithFileData(sql);
      sql = "UPDATE nodb_tab_lobs_in set blob = :b where id = :i";
      const bindVar_1 = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bigBuffer, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size }
      };
      let result = await connection.execute(sql, bindVar_1);
      assert.strictEqual(result.rowsAffected, 1);
      sql = "select blob from nodb_tab_lobs_in where id = " + sequence;
      await verifyBlobValueWithBuffer(sql, bigBuffer, specialStr);
      result = await connection.execute(sqlRun, bindVar);
      const specStrLength = specialStr.length;
      const resultLength1 = result.outBinds.b.length;
      assert.strictEqual(resultLength1, size);
      assert.strictEqual(result.outBinds.b.toString('utf8', 0, specStrLength), specialStr);
      assert.strictEqual(result.outBinds.b.toString('utf8', (resultLength1 - specStrLength), resultLength1), specialStr);
      const lob = result.outBinds.c;
      lob.setEncoding("utf8");
      let clobData = '';
      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('end', resolve);
        lob.on('data', function(chunk) {
          clobData += chunk;
        });
      });
      const data = await fsPromises.readFile(inFileName, {encoding: "utf8"});
      assert.strictEqual(clobData, data);
    }); // 80.2.3

  }); // 80.2

  describe('80.3 Multiple LOBs, BIND_INOUT', function() {
    const lobs_proc_inout = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_out_783 (clob IN OUT CLOB, blob IN OUT BLOB) \n" +
                          "AS \n" +
                          "BEGIN \n" +
                          "    clob := clob; \n" +
                          "    blob := blob; \n" +
                          "END nodb_lobs_in_out_783;";
    const sqlRun = "begin nodb_lobs_in_out_783(:clob, :blob); end;";
    const proc_drop = "DROP PROCEDURE nodb_lobs_in_out_783";

    before(async function() {
      await connection.execute(lobs_proc_inout);
    });

    after(async function() {
      await connection.execute(proc_drop);
    });

    it('80.3.1 PLSQL, BIND_INOUT, bind a 32K string and a 32K buffer', async function() {
      const specialStr = "80.3.1";
      const size = 32768;
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        clob: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, val: bigStr, maxSize: size },
        blob: { dir: oracledb.BIND_INOUT, type: oracledb.BUFFER, val: bufferStr, maxSize: size }
      };
      const result = await connection.execute(sqlRun, bindVar);
      const specStrLength = specialStr.length;
      const resultLength1 = result.outBinds.clob.length;
      assert.strictEqual(resultLength1, size);
      assert.strictEqual(result.outBinds.clob.substring(0, specStrLength), specialStr);
      assert.strictEqual(result.outBinds.clob.substring(resultLength1 - specStrLength, resultLength1), specialStr);
      const resultLength2 = result.outBinds.blob.length;
      assert.strictEqual(resultLength2, size);
      assert.strictEqual(result.outBinds.blob.toString('utf8', 0, specStrLength), specialStr);
      assert.strictEqual(result.outBinds.blob.toString('utf8', (resultLength2 - specStrLength), resultLength2), specialStr);
    }); // 80.3.1

    it('80.3.2 PLSQL, BIND_INOUT, bind a (64K - 1) string and a (64K - 1) buffer', async function() {
      const specialStr = "80.3.2";
      const size = 65535;
      const bigStr = random.getRandomString(size, specialStr);
      const bufferStr = Buffer.from(bigStr, "utf-8");
      const bindVar = {
        clob: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, val: bigStr, maxSize: size },
        blob: { dir: oracledb.BIND_INOUT, type: oracledb.BUFFER, val: bufferStr, maxSize: size }
      };
      const result = await connection.execute(sqlRun, bindVar);
      const specStrLength = specialStr.length;
      const resultLength1 = result.outBinds.clob.length;
      assert.strictEqual(resultLength1, size);
      assert.strictEqual(result.outBinds.clob.substring(0, specStrLength), specialStr);
      assert.strictEqual(result.outBinds.clob.substring(resultLength1 - specStrLength, resultLength1), specialStr);
      const resultLength2 = result.outBinds.blob.length;
      assert.strictEqual(resultLength2, size);
      assert.strictEqual(result.outBinds.blob.toString('utf8', 0, specStrLength), specialStr);
      assert.strictEqual(result.outBinds.blob.toString('utf8', (resultLength2 - specStrLength), resultLength2), specialStr);
    }); // 80.3.2

  }); // 80.3

});

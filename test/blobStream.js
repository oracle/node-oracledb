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
 *   127. blobStream.js
 *
 * DESCRIPTION
 *   Testing stream txt file into BLOB.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const fs        = require('fs');
const dbConfig  = require('./dbconfig.js');
const random = require('./random.js');

describe('127.blobStream.js', function() {
  let connection = null;
  const fileRoot = ".";
  let insertID = 1;

  const proc_blob_prepare_tab = "BEGIN \n" +
                              "    DECLARE \n" +
                              "        e_table_missing EXCEPTION; \n" +
                              "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                              "    BEGIN \n" +
                              "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_lobs_pre PURGE'); \n" +
                              "    EXCEPTION \n" +
                              "        WHEN e_table_missing \n" +
                              "        THEN NULL; \n" +
                              "    END; \n" +
                              "    EXECUTE IMMEDIATE (' \n" +
                              "        CREATE TABLE nodb_tab_lobs_pre ( \n" +
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

  beforeEach(function() {
    insertID++;
  });

  describe('127.1 stream txt file into BLOB column', function() {
    it('127.1.1 works with 64K txt file', async function() {
      const fileName = fileRoot + '/smallString.txt';
      const selectID = insertID + 100;
      const fileSize = 64 * 1024;
      const specialStr = '127.1.1';
      await bindSmallFile(fileName, fileSize, selectID, insertID, specialStr);
    });

    it('127.1.2 works with 64K+1 txt file', async function() {
      const fileName = fileRoot + '/smallString.txt';
      const selectID = insertID + 100;
      const fileSize = 64 * 1024 + 1;
      const specialStr = '127.1.2';
      await bindSmallFile(fileName, fileSize, selectID, insertID, specialStr);
    });

    it('127.1.3 works with 1MB+1 txt file', async function() {
      const fileName = fileRoot + '/smallString.txt';
      const selectID = insertID + 100;
      const fileSize = 1 * 1024 * 1024 + 1;
      const specialStr = '127.1.3';
      await bindSmallFile(fileName, fileSize, selectID, insertID, specialStr);
    });

  }); // 1.1

  const bindSmallFile = async function(fileName, fileSize, selectID, insertID, specialStr) {
    const bigStr = random.getRandomString(fileSize, specialStr);
    await fs.promises.writeFile(fileName, bigStr);
    await insetTableWithBlob(selectID, fileName);
    await verifyBlob(selectID, insertID, fileSize);
    await fs.promises.unlink(fileName);
  };

  const setupAllTable = async function() {
    await connection.execute(proc_blob_prepare_tab);
  };

  const dropAllTable = async function() {
    await connection.execute("DROP TABLE nodb_tab_lobs_pre PURGE");
  };

  const insetTableWithBlob = async function(id, fileName) {
    const sql = `INSERT INTO nodb_tab_lobs_pre (id, blob) VALUES (:i, EMPTY_BLOB())
      RETURNING blob INTO :lobbv`;
    const bindVar = { i: id, lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } };

    const result = await connection.execute(sql, bindVar, { autoCommit: false });
    assert.strictEqual(result.rowsAffected, 1);
    assert.strictEqual(result.outBinds.lobbv.length, 1);
    const inStream = fs.createReadStream(fileName);
    const lob = result.outBinds.lobbv[0];
    await new Promise((resolve, reject)=>{
      inStream.on('error', reject);
      lob.on('error', reject);
      lob.on('finish', resolve);
      inStream.pipe(lob);
    });
    await connection.commit();
  };

  const verifyBlob =  async function(selectID, insertID, lenExpected) {
    const selectSql = "select blob from nodb_tab_lobs_pre where id = " + selectID;
    const insetSql = "INSERT INTO nodb_tab_lobs_pre (id, blob) VALUES (:i, :c)";
    const proc_compare_blob = "CREATE OR REPLACE PROCEDURE nodb_blob_compare(result OUT NUMBER, len OUT NUMBER) \n" +
                            "IS \n" +
                            "    blob1 BLOB; \n" +
                            "    blob2 BLOB; \n" +
                            "BEGIN \n" +
                            "    select blob into blob1 from nodb_tab_lobs_pre where id = " + selectID + "; \n" +
                            "    select blob into blob2 from nodb_tab_lobs_pre where id = " + insertID + "; \n" +
                            "    result := DBMS_LOB.COMPARE(blob1, blob2); \n" + // Zero if the comparison succeeds, nonzero if not.
                            "    len := length(blob1); \n" +
                            "END nodb_blob_compare;";
    const sqlRunCompareProc = "begin nodb_blob_compare(:r, :l); end;";
    const sqlDropCompareProc = "DROP PROCEDURE nodb_blob_compare";

    let result = await connection.execute(selectSql);
    const lob = result.rows[0][0];
    assert(lob);
    let bindVar = { i: insertID, c: { val: lob, type: oracledb.BLOB, dir: oracledb.BIND_IN } };
    await connection.execute(insetSql, bindVar, { autoCommit: true });
    await lob.close();
    await connection.execute(proc_compare_blob);
    bindVar = {
      r: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      l: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };
    result = await connection.execute(sqlRunCompareProc, bindVar);
    assert.strictEqual(result.outBinds.r, 0);
    assert.strictEqual(result.outBinds.l, lenExpected);
    await connection.execute(sqlDropCompareProc);
  };

});

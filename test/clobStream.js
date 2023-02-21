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
 *   128. clobStream.js
 *
 * DESCRIPTION
 *   Testing stream txt file into CLOB.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const fs        = require('fs');
const fsPromises = require('fs/promises');
const random    = require('./random.js');

describe('128.clobStream.js', function() {
  let connection;
  const fileRoot = ".";
  let insertID = 1;

  const proc_clob_prepare_tab = "BEGIN \n" +
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
                              "            clob  CLOB \n" +
                              "        ) \n" +
                              "    '); \n" +
                              "END; ";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(proc_clob_prepare_tab);
  });

  after(async function() {
    await connection.execute("DROP TABLE nodb_tab_lobs_pre PURGE");
    await connection.close();
  });

  beforeEach(function() {
    insertID++;
  });

  describe('128.1 stream txt file into CLOB column', function() {
    it('128.1.1 works with 64KB txt file', async function() {
      const inFileName = fileRoot + '/smallString.txt';
      const selectID = insertID + 200;
      const specialStr = '128.1.1';
      const fileSize = 65536;
      await bindIn_small(inFileName, fileSize, selectID, insertID, specialStr);
    });

    it('128.1.2 works with 64KB+1 txt file', async function() {
      const inFileName = fileRoot + '/smallString.txt';
      const selectID = insertID + 200;
      const specialStr = '128.1.2';
      const fileSize = 655376;
      await bindIn_small(inFileName, fileSize, selectID, insertID, specialStr);
    });

    it('128.1.3 works with 1MB+1 txt file', async function() {
      const inFileName = fileRoot + '/smallString.txt';
      const selectID = insertID + 200;
      const specialStr = '128.1.3';
      const fileSize = 1 * 1024 * 1024;
      await bindIn_small(inFileName, fileSize, selectID, insertID, specialStr);
    });

  }); // 4.1

  const bindIn_small = async function(fileName, fileSize, selectID, insertID, specialStr) {
    const bigStr = random.getRandomString(fileSize, specialStr);
    await fsPromises.writeFile(fileName, bigStr);
    await insertTableWithClob(selectID, fileName);
    await verifyClob(selectID, insertID, fileSize);
    await fsPromises.unlink(fileName);
  };

  const insertTableWithClob = async function(id, fileName) {
    const sql = "INSERT INTO nodb_tab_lobs_pre (id, clob) VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv";
    const binds = {
      i: id,
      lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
    };
    // a transaction needs to span the INSERT and pipe()
    const options = { autoCommit: false };
    const result = await connection.execute(sql, binds, options);
    assert.strictEqual(result.rowsAffected, 1);
    assert.strictEqual(result.outBinds.lobbv.length, 1);
    const inStream = fs.createReadStream(fileName);
    const lob = result.outBinds.lobbv[0];
    await new Promise((resolve, reject) => {
      lob.on('error', reject);
      inStream.on('error', reject);
      lob.on('finish', resolve);
      inStream.pipe(lob);
    });
    await connection.commit();
  };

  const verifyClob = async function(selectID, insertID, lenExpected) {
    const selectSql = "select clob from nodb_tab_lobs_pre where id = " + selectID;
    const insertSql = "INSERT INTO nodb_tab_lobs_pre (id, clob) VALUES (:i, :c)";
    const proc_compare_clob = "CREATE OR REPLACE PROCEDURE nodb_clob_compare(result OUT NUMBER, len OUT NUMBER) \n" +
                            "IS \n" +
                            "    clob1 CLOB; \n" +
                            "    clob2 CLOB; \n" +
                            "BEGIN \n" +
                            "    select clob into clob1 from nodb_tab_lobs_pre where id = " + selectID + "; \n" +
                            "    select clob into clob2 from nodb_tab_lobs_pre where id = " + insertID + "; \n" +
                            "    result := DBMS_LOB.COMPARE(clob1, clob2); \n" + // Zero if the comparison succeeds, nonzero if not.
                            "    len := length(clob1); \n" +
                            "END nodb_clob_compare;";
    const sqlRunCompareProc = "begin nodb_clob_compare(:r, :l); end;";
    const sqlDropCompareProc = "DROP PROCEDURE nodb_clob_compare";

    let result = await connection.execute(selectSql);
    const lob = result.rows[0][0];
    let binds = {
      i: insertID,
      c: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
    };
    const options = { autoCommit: true };
    await connection.execute(insertSql, binds, options);
    await lob.close();
    await connection.execute(proc_compare_clob);
    binds = {
      r: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      l: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };
    result = await connection.execute(sqlRunCompareProc, binds);
    assert.strictEqual(result.outBinds.r, 0);
    assert.strictEqual(result.outBinds.l, lenExpected);
    await connection.execute(sqlDropCompareProc);
  };

});

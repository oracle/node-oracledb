/* Copyright (c) 2017, 2024, Oracle and/or its affiliates. */

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
 *   81. clobDMLBindAsString.js
 *
 * DESCRIPTION
 *   Testing CLOB binding as String with DML.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');

describe('81. clobDMLBindAsString.js', function() {

  let connection;
  let insertID = 1; // assume id for insert into db starts from 1

  const proc_clob_1 = "BEGIN \n" +
                    "    DECLARE \n" +
                    "        e_table_missing EXCEPTION; \n" +
                    "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                    "    BEGIN \n" +
                    "        EXECUTE IMMEDIATE('DROP TABLE nodb_dml_clob_1 PURGE'); \n" +
                    "    EXCEPTION \n" +
                    "        WHEN e_table_missing \n" +
                    "        THEN NULL; \n" +
                    "    END; \n" +
                    "    EXECUTE IMMEDIATE (' \n" +
                    "        CREATE TABLE nodb_dml_clob_1 ( \n" +
                    "            id      NUMBER, \n" +
                    "            clob    CLOB \n" +
                    "        ) \n" +
                    "    '); \n" +
                    "END; ";
  const sql2DropTable1 = "DROP TABLE nodb_dml_clob_1 PURGE";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
  }); // before

  after(async function() {
    await connection.close();
  }); // after

  const executeSQL = async function(sql) {
    await connection.execute(sql);
  };

  const insertIntoClobTable1 = async function(id, content) {
    let result = null;
    if (content == "EMPTY_CLOB") {
      result = await connection.execute(
        "INSERT INTO nodb_dml_clob_1 VALUES (:ID, EMPTY_CLOB())",
        [ id ]);
      assert.strictEqual(result.rowsAffected, 1);
    } else {
      result = await connection.execute(
        "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
        {
          ID: { val: id },
          C: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING }
        });
      assert.strictEqual(result.rowsAffected, 1);
    }
  };

  const updateClobTable1 = async function(id, content) {
    let result = null;
    if (content == "EMPTY_CLOB") {
      result = await connection.execute(
        "UPDATE nodb_dml_clob_1 set clob = EMPTY_CLOB() where id = :ID",
        { ID: id });
      assert.strictEqual(result.rowsAffected, 1);
    } else {
      result = await connection.execute(
        "UPDATE nodb_dml_clob_1 set clob = :C where id = :ID",
        { ID: id, C: content });
      assert.strictEqual(result.rowsAffected, 1);
    }
  };

  // compare the inserted clob with orginal content
  const verifyClobValueWithString = async function(selectSql, originalString, specialStr) {
    let result = null;
    result = await connection.execute(selectSql);
    const lob = result.rows[0][0];

    if (originalString == '' || originalString == undefined || originalString == null) {
      assert.ifError(lob);
    } else {
      assert(lob);
      // set the encoding so we get a 'string' not a 'buffer'
      lob.setEncoding('utf8');
      await new Promise((resolve, reject) => {
        let clobData = '';

        lob.on('data', function(chunk) {
          clobData += chunk;
        });

        lob.on('error', function(err) {
          assert.ifError(err, "lob.on 'error' event.");
          reject(err);
        });

        lob.on('end', function(err) {
          assert.ifError(err);
          if (originalString == "EMPTY_CLOB") {
            assert.strictEqual(clobData, "");
          } else {
            const resultLength = clobData.length;
            const specStrLength = specialStr.length;
            assert.strictEqual(resultLength, originalString.length);
            assert.strictEqual(clobData.substring(0, specStrLength), specialStr);
            assert.strictEqual(clobData.substring(resultLength - specStrLength, resultLength), specialStr);
          }
          resolve();
        });

      });
    }
  };

  const checkInsertResult = async function(id, content, specialStr) {
    const sql = "select clob from nodb_dml_clob_1 where id = " + id;
    await verifyClobValueWithString(sql, content, specialStr);
  };

  describe('81.1 CLOB, INSERT', function() {
    before(async function() {
      await executeSQL(proc_clob_1);
    });  // before

    after(async function() {
      await executeSQL(sql2DropTable1);
    }); // after

    it('81.1.1 works with EMPTY_CLOB', async function() {
      const id = insertID++;
      const content = "EMPTY_CLOB";
      await insertIntoClobTable1(id, content);
      await checkInsertResult(id, content, null);
    }); // 81.1.1

    it('81.1.2 works with empty string', async function() {
      const id = insertID++;
      const content = '';
      await insertIntoClobTable1(id, content);
      await checkInsertResult(id, content, null);
    }); // 81.1.2

    it('81.1.3 works with empty string and bind in maxSize set to 32767', async function() {
      const id = insertID++;
      const content = "";
      const result = await connection.execute(
        "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
        {
          ID: { val: id },
          C: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: 32767 }
        });
      assert.strictEqual(result.rowsAffected, 1);
      await checkInsertResult(id, content, null);
    }); // 81.1.3

    it('81.1.4 works with empty string and bind in maxSize set to 50000', async function() {
      const id = insertID++;
      const content = "";
      const result = await connection.execute(
        "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
        {
          ID: { val: id },
          C: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: 50000 }
        });
      assert.strictEqual(result.rowsAffected, 1);
      await checkInsertResult(id, content, null);
    }); // 81.1.4

    it('81.1.5 works with undefined', async function() {
      const id = insertID++;
      const content = undefined;
      await insertIntoClobTable1(id, content);
      await checkInsertResult(id, content, null);
    }); // 81.1.5

    it('81.1.6 works with null', async function() {
      const id = insertID++;
      const content = null;
      await insertIntoClobTable1(id, content);
      await checkInsertResult(id, content, null);
    }); // 81.1.6

    it('81.1.7 works with null and bind in maxSize set to 32767', async function() {
      const id = insertID++;
      const content = null;
      const result = await connection.execute(
        "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
        {
          ID: { val: id },
          C: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: 32767 }
        });
      assert.strictEqual(result.rowsAffected, 1);

      await checkInsertResult(id, content, null);
    }); // 81.1.7

    it('81.1.8 works with null and bind in maxSize set to 50000', async function() {
      const id = insertID++;
      const content = null;
      const result = await connection.execute(
        "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
        {
          ID: { val: id },
          C: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: 50000 }
        });
      assert.strictEqual(result.rowsAffected, 1);
      await checkInsertResult(id, content, null);
    }); // 81.1.8

    it('81.1.9 works with NaN', async function() {
      const id = insertID++;
      const content = NaN;
      await assert.rejects(
        async () => {
          await connection.execute(
            "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
            {
              ID: { val: id },
              C: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING }
            });
        },
        // NJS-011: encountered bind value and type mismatch in parameter 2
        /NJS-011:/
      );
    }); // 81.1.9

    it('81.1.10 works with 0', async function() {
      const id = insertID++;
      const content = 0;
      await assert.rejects(
        async () => {
          await connection.execute(
            "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
            {
              ID: { val: id },
              C: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING }
            });
        },
        // NJS-011: encountered bind value and type mismatch in parameter 2
        /NJS-011:/
      );
    }); // 81.1.10

    it('81.1.11 works with String length 32K', async function() {
      const id = insertID++;
      const contentLength = 32768;
      const specialStr = "81.1.11";
      const content = random.getRandomString(contentLength, specialStr);
      await insertIntoClobTable1(id, content);
      await checkInsertResult(id, content, specialStr);
    }); // 81.1.11

    it('81.1.12 works with String length (64K - 1)', async function() {
      const id = insertID++;
      const contentLength = 65535;
      const specialStr = "81.1.12";
      const content = random.getRandomString(contentLength, specialStr);
      await insertIntoClobTable1(id, content);
      await checkInsertResult(id, content, specialStr);
    }); // 81.1.12

    it('81.1.13 works with String length (64K + 1)', async function() {
      const id = insertID++;
      const contentLength = 65537;
      const specialStr = "81.1.13";
      const content = random.getRandomString(contentLength, specialStr);
      await insertIntoClobTable1(id, content);
      await checkInsertResult(id, content, specialStr);
    }); // 81.1.13

    it('81.1.14 works with String length (1MB + 1)', async function() {
      const id = insertID++;
      const contentLength = 1048577; // 1 * 1024 * 1024 + 1;
      const specialStr = "81.1.14";
      const content = random.getRandomString(contentLength, specialStr);
      await insertIntoClobTable1(id, content);
      await checkInsertResult(id, content, specialStr);
    }); // 81.1.14

    it('81.1.15 bind value and type mismatch', async function() {
      const id = insertID++;
      const content = 100;
      const sql = "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)";
      const binds = {
        ID: { val: id },
        C: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING }
      };
      await assert.rejects(
        async () => await connection.execute(sql, binds),
        // NJS-011: encountered bind value and type mismatch in parameter 2
        /NJS-011:/
      );
    }); // 81.1.15

    it('81.1.16 mixing named with positional binding', async function() {
      const id = insertID++;
      const contentLength = 40000;
      const specialStr = "81.1.16";
      const content = random.getRandomString(contentLength, specialStr);
      const result = await connection.execute(
        "INSERT INTO nodb_dml_clob_1 VALUES (:1, :2)",
        [
          id, { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING }
        ]);
      assert.strictEqual(result.rowsAffected, 1);
      await checkInsertResult(id, content, specialStr);
    }); // 81.1.16

    it('81.1.17 bind with invalid CLOB', async function() {
      const id = insertID++;
      await assert.rejects(
        async () => {
          await connection.execute(
            "INSERT INTO nodb_dml_clob_1 VALUES (:1, :2)",
            [
              id, { val: {}, dir: oracledb.BIND_IN, type: oracledb.STRING }
            ]);
        },
        // NJS-011: encountered bind value and type mismatch
        /NJS-011:/
      );
    }); // 81.1.17

    it('81.1.18 RETURNING INTO with bind type STRING', async function() {
      const id = insertID++;
      const contentLength = 400;
      const specialStr = "81.1.18";
      const content = random.getRandomString(contentLength, specialStr);
      const sql = "INSERT INTO nodb_dml_clob_1 (id, clob) VALUES (:i, :c) RETURNING clob INTO :lobbv";
      const result = await connection.execute(
        sql,
        {
          i: id,
          c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
          lobbv: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: contentLength }
        },
        { autoCommit: false });
      assert.strictEqual(result.rowsAffected, 1);
      assert.strictEqual(result.outBinds.lobbv.length, 1);
      await checkInsertResult(id, content, specialStr);
    }); // 81.1.18

    it('81.1.19 works with bind in maxSize smaller than string length', async function() {
      const id = insertID++;
      const contentLength = 32768;
      const specialStr = "81.1.20";
      const content = random.getRandomString(contentLength, specialStr);
      const result = await connection.execute(
        "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
        {
          ID: { val: id },
          C: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: 1 }
        });
      assert.strictEqual(result.rowsAffected, 1);
      await checkInsertResult(id, content, specialStr);
    }); // 81.1.19

  }); // 81.1

  describe('81.2 CLOB, UPDATE', function() {
    insertID = 0;

    before(async function() {
      await executeSQL(proc_clob_1);
    });  // before

    after(async function() {
      await executeSQL(sql2DropTable1);
    }); // after

    it('81.2.1 update EMPTY_CLOB column', async function() {
      const id = insertID++;
      const content_1 = "EMPTY_CLOB";
      const contentLength_2 = 32768;
      const specialStr_2 = "81.2.1";
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      await insertIntoClobTable1(id, content_1);
      await checkInsertResult(id, content_1, null);
      await updateClobTable1(id, content_2);
      await checkInsertResult(id, content_2, specialStr_2);
    }); // 81.2.1

    it('81.2.2 update a column with EMPTY_CLOB', async function() {
      const id = insertID++;
      const contentLength_1 = 50000;
      const specialStr_1 = "81.2.2";
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_2 = "EMPTY_CLOB";
      await insertIntoClobTable1(id, content_1);
      await checkInsertResult(id, content_1, specialStr_1);
      await updateClobTable1(id, content_2);
      await checkInsertResult(id, content_2, null);
    }); // 81.2.2

    it('81.2.3 update EMPTY_CLOB column with empty string', async function() {
      const id = insertID++;
      const content_1 = "EMPTY_CLOB";
      const content_2 = "";
      await insertIntoClobTable1(id, content_1);
      await checkInsertResult(id, content_1, null);
      await updateClobTable1(id, content_2);
      await checkInsertResult(id, content_2, null);
    }); // 81.2.3

    it('81.2.4 update empty string column', async function() {
      const id = insertID++;
      const content_1 = "";
      const contentLength_2 = 54321;
      const specialStr_2 = "81.2.4";
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      await insertIntoClobTable1(id, content_1);
      await checkInsertResult(id, content_1, null);
      await updateClobTable1(id, content_2);
      await checkInsertResult(id, content_2, specialStr_2);
    }); // 81.2.4

    it('81.2.5 update a column with empty string', async function() {
      const id = insertID++;
      const contentLength_1 = 50000;
      const specialStr_1 = "81.2.2";
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_2 = "";
      await insertIntoClobTable1(id, content_1);
      await checkInsertResult(id, content_1, specialStr_1);
      await updateClobTable1(id, content_2);
      await checkInsertResult(id, content_2, null);
    }); // 81.2.5

  }); // 81.2

});

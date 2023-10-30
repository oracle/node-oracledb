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
 *   82. blobDMLBindAsBuffer.js
 *
 * DESCRIPTION
 *   Testing BLOB binding as Buffer with DML.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');

describe('82.blobDMLBindAsBuffer.js', function() {

  let connection = null;
  let insertID = 1; // assume id for insert into db starts from 1

  const proc_blob_1 = "BEGIN \n" +
                    "    DECLARE \n" +
                    "        e_table_missing EXCEPTION; \n" +
                    "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                    "    BEGIN \n" +
                    "        EXECUTE IMMEDIATE('DROP TABLE nodb_dml_blob_1 PURGE'); \n" +
                    "    EXCEPTION \n" +
                    "        WHEN e_table_missing \n" +
                    "        THEN NULL; \n" +
                    "    END; \n" +
                    "    EXECUTE IMMEDIATE (' \n" +
                    "        CREATE TABLE nodb_dml_blob_1 ( \n" +
                    "            id      NUMBER, \n" +
                    "            blob    BLOB \n" +
                    "        ) \n" +
                    "    '); \n" +
                    "END; ";
  const sql2DropTable1 = "DROP TABLE nodb_dml_blob_1 PURGE";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
  }); // before

  after(async function() {
    await connection.close();
  }); // after

  const executeSQL = async function(sql) {
    await connection.execute(sql);
  };

  const insertIntoBlobTable1 = async function(id, content) {
    let result = null;
    if (content === "EMPTY_BLOB") {
      result = await connection.execute(
        "INSERT INTO nodb_dml_blob_1 VALUES (:ID, EMPTY_BLOB())",
        [ id ]);
      assert.strictEqual(result.rowsAffected, 1);
    } else {
      result = await connection.execute(
        "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
        {
          ID: { val: id },
          C: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
        });
      assert.strictEqual(result.rowsAffected, 1);
    }
  };

  const updateBlobTable1 = async function(id, content) {
    let result = null;
    if (content === "EMPTY_BLOB") {
      result = await connection.execute(
        "UPDATE nodb_dml_blob_1 set blob = EMPTY_BLOB() where id = :ID",
        { ID: id });
      assert.strictEqual(result.rowsAffected, 1);
    } else {
      result = await connection.execute(
        "UPDATE nodb_dml_blob_1 set blob = :C where id = :ID",
        { ID: id, C: content });
      assert.strictEqual(result.rowsAffected, 1);
    }
  };

  // compare the inserted blob with orginal content
  const verifyBlobValueWithBuffer = async function(selectSql, originalBuffer) {
    const result = await connection.execute(selectSql);
    const lob = result.rows[0][0];
    if (originalBuffer == '' || originalBuffer == undefined) {
      assert.strictEqual(lob, null);
    } else {
      const blobData = await lob.getData();
      if (originalBuffer == "EMPTY_BLOB") {
        assert.strictEqual(blobData, null);
      } else {
        assert.deepStrictEqual(blobData, originalBuffer);
      }
    }
  };

  const checkInsertResult = async function(id, content) {
    const sql = "select blob from nodb_dml_blob_1 where id = " + id;
    await verifyBlobValueWithBuffer(sql, content);
  };

  describe('82.1 BLOB, INSERT', function() {
    before(async function() {
      await executeSQL(proc_blob_1);
    });  // before

    after(async function() {
      await executeSQL(sql2DropTable1);
    }); // after

    it('82.1.1 works with EMPTY_BLOB', async function() {
      const id = insertID++;
      const content = "EMPTY_BLOB";

      await insertIntoBlobTable1(id, content);

      await checkInsertResult(id, content, null);

    }); // 82.1.1

    it('82.1.2 works with empty buffer', async function() {
      const id = insertID++;
      const bigStr = '';
      const content = Buffer.from(bigStr, "utf-8");

      await insertIntoBlobTable1(id, content);

      await checkInsertResult(id, content, null);
    }); // 82.1.2

    it('82.1.3 works with empty buffer and bind in maxSize set to 32767', async function() {
      const id = insertID++;
      const bigStr = '';
      const content = Buffer.from(bigStr, "utf-8");
      let result = null;
      result = await connection.execute(
        "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
        {
          ID: { val: id },
          C: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER, maxSize: 32767 }
        });
      assert.strictEqual(result.rowsAffected, 1);
      await checkInsertResult(id, content, null);
    }); // 82.1.3

    it('82.1.4 works with empty buffer and bind in maxSize set to 50000', async function() {
      const id = insertID++;
      const bigStr = '';
      const content = Buffer.from(bigStr, "utf-8");
      let result = null;
      result = await connection.execute(
        "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
        {
          ID: { val: id },
          C: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER, maxSize: 50000 }
        });

      assert.strictEqual(result.rowsAffected, 1);
      await checkInsertResult(id, content, null);
    }); // 82.1.4

    it('82.1.5 works with undefined', async function() {
      const id = insertID++;
      const content = undefined;

      await insertIntoBlobTable1(id, content);

      await checkInsertResult(id, content, null);
    }); // 82.1.5

    it('82.1.6 works with null', async function() {
      const id = insertID++;
      const content = null;

      await insertIntoBlobTable1(id, content);

      await checkInsertResult(id, content, null);
    }); // 82.1.6

    it('82.1.7 works with null and bind in maxSize set to 32767', async function() {
      const id = insertID++;
      const content = null;
      let result = null;
      result = await connection.execute(
        "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
        {
          ID: { val: id },
          C: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER, maxSize: 32767 }
        });
      assert.strictEqual(result.rowsAffected, 1);
      await checkInsertResult(id, content, null);
    }); // 82.1.7

    it('82.1.8 works with null and bind in maxSize set to 50000', async function() {
      const id = insertID++;
      const content = null;
      let result = null;

      result = await connection.execute(
        "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
        {
          ID: { val: id },
          C: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER, maxSize: 50000 }
        });
      assert.strictEqual(result.rowsAffected, 1);
      await checkInsertResult(id, content, null);
    }); // 82.1.8

    it('82.1.9 works with NaN', async function() {
      const id = insertID++;
      const content = NaN;
      await assert.rejects(
        async () => {
          await connection.execute(
            "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
            {
              ID: { val: id },
              C: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
            });
        },
        // NJS-011: encountered bind value and type mismatch in parameter 2
        /NJS-011:/
      );
    }); // 82.1.9

    it('82.1.10 works with 0', async function() {
      const id = insertID++;
      const content = 0;
      await assert.rejects(
        async () => {
          await connection.execute(
            "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
            {
              ID: { val: id },
              C: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
            });
        },
        // NJS-011: encountered bind value and type mismatch in parameter 2
        /NJS-011:/
      );
    }); // 82.1.10

    it('82.1.11 works with Buffer length 32K', async function() {
      const id = insertID++;
      const contentLength = 32768;
      const specialStr = "82.1.11";
      const bigStr = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(bigStr, "utf-8");
      await insertIntoBlobTable1(id, content);

      await checkInsertResult(id, content);
    }); // 82.1.11

    it('82.1.12 works with Buffer length (64K - 1)', async function() {
      const id = insertID++;
      const contentLength = 65535;
      const specialStr = "82.1.12";
      const bigStr = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(bigStr, "utf-8");

      await insertIntoBlobTable1(id, content);
      await checkInsertResult(id, content);
    }); // 82.1.12

    it('82.1.13 works with Buffer length (64K + 1)', async function() {
      const id = insertID++;
      const contentLength = 65537;
      const specialStr = "82.1.13";
      const bigStr = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(bigStr, "utf-8");

      await insertIntoBlobTable1(id, content);
      await checkInsertResult(id, content);
    }); // 82.1.13

    it('82.1.14 works with Buffer length (1MB + 1)', async function() {
      const id = insertID++;
      const contentLength = 1048577; // 1 * 1024 * 1024 + 1;
      const specialStr = "82.1.14";
      const bigStr = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(bigStr, "utf-8");

      await insertIntoBlobTable1(id, content);
      await checkInsertResult(id, content);
    }); // 82.1.14

    it('82.1.15 bind value and type mismatch', async function() {
      const id = insertID++;
      const content = 100;
      await assert.rejects(
        async () => {
          await connection.execute(
            "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
            {
              ID: { val: id },
              C: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
            });
        },
        // NJS-011: encountered bind value and type mismatch in parameter 2
        /NJS-011:/
      );
    }); // 82.1.15

    it('82.1.16 mixing named with positional binding', async function() {
      const id = insertID++;
      const contentLength = 40000;
      const specialStr = "82.1.16";
      const bigStr = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(bigStr, "utf-8");
      let result = null;

      result = await connection.execute(
        "INSERT INTO nodb_dml_blob_1 VALUES (:1, :2)",
        [
          id, { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
        ]);
      assert.strictEqual(result.rowsAffected, 1);
      await checkInsertResult(id, content);
    }); // 82.1.16

    it('82.1.17 bind with invalid BLOB', async function() {
      const id = insertID++;
      await assert.rejects(
        async () => {
          await connection.execute(
            "INSERT INTO nodb_dml_blob_1 VALUES (:1, :2)",
            [
              id, { val: {}, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
            ]);
        },
        // NJS-011: encountered bind value and type mismatch in parameter 2
        /NJS-011:/
      );
    }); // 82.1.17

    it('82.1.18 RETURNING INTO with bind type BUFFER', async function() {
      const id = insertID++;
      const contentLength = 400;
      const specialStr = "82.1.18";
      const bigStr = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(bigStr, "utf-8");
      const sql = "INSERT INTO nodb_dml_blob_1 (id, blob) VALUES (:i, :c) RETURNING blob INTO :lobbv";
      let result = null;

      result = await connection.execute(sql,
        {
          i: id,
          c: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN },
          lobbv: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: contentLength }
        });
      assert.strictEqual(result.rowsAffected, 1);

      await checkInsertResult(id, content);
    }); // 82.1.18

    it('82.1.19 works with bind in maxSize smaller than buffer size', async function() {
      const id = insertID++;
      const contentLength = 32768;
      const specialStr = "82.1.20";
      const bigStr = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(bigStr, "utf-8");
      let result = null;

      result = await connection.execute(
        "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
        {
          ID: { val: id },
          C: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER, maxSize: 1 }
        });
      assert.strictEqual(result.rowsAffected, 1);

      await checkInsertResult(id, content);
    }); // 82.1.19

  }); // 82.1

  describe('82.2 BLOB, UPDATE', function() {
    insertID = 0;

    before(async function() {
      await executeSQL(proc_blob_1);
    });  // before

    after(async function() {
      await executeSQL(sql2DropTable1);
    }); // after

    it('82.2.1 update EMPTY_BLOB column', async function() {
      const id = insertID++;
      const content_1 = "EMPTY_BLOB";
      const contentLength_2 = 32768;
      const specialStr_2 = "82.2.1";
      const bigStr_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(bigStr_2, "utf-8");

      await insertIntoBlobTable1(id, content_1);

      await checkInsertResult(id, content_1);

      await updateBlobTable1(id, content_2);

      await checkInsertResult(id, content_2);
    }); // 82.2.1

    it('82.2.2 update a cloumn with EMPTY_BLOB', async function() {
      const id = insertID++;
      const contentLength_1 = 50000;
      const specialStr_1 = "82.2.2";
      const bigStr_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(bigStr_1, "utf-8");
      const content_2 = "EMPTY_BLOB";

      await insertIntoBlobTable1(id, content_1);

      await checkInsertResult(id, content_1);

      await updateBlobTable1(id, content_2);

      await checkInsertResult(id, content_2);
    }); // 82.2.2

    it('82.2.3 update EMPTY_BLOB column with empty buffer', async function() {
      const id = insertID++;
      const content_1 = "EMPTY_BLOB";
      const content_2 = "";

      await insertIntoBlobTable1(id, content_1);

      await checkInsertResult(id, content_1, null);

      await updateBlobTable1(id, content_2);

      await checkInsertResult(id, content_2, null);
    }); // 82.2.3

    it('82.2.4 update empty buffer column', async function() {
      const id = insertID++;
      const bigStr_1 = "";
      const content_1 = Buffer.from(bigStr_1, "utf-8");
      const contentLength_2 = 54321;
      const specialStr_2 = "82.2.4";
      const bigStr_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(bigStr_2, "utf-8");

      await insertIntoBlobTable1(id, content_1);

      await checkInsertResult(id, content_1);

      await updateBlobTable1(id, content_2);

      await checkInsertResult(id, content_2);
    }); // 82.2.4

    it('82.2.5 update a column with empty buffer', async function() {
      const id = insertID++;
      const contentLength_1 = 50000;
      const specialStr_1 = "82.2.2";
      const bigStr_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(bigStr_1, "utf-8");
      const content_2 = "";

      await insertIntoBlobTable1(id, content_1);

      await checkInsertResult(id, content_1);

      await updateBlobTable1(id, content_2);

      await checkInsertResult(id, content_2);
    }); // 82.2.5
  }); // 82.2
});

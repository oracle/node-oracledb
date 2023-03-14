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
 *   87. fetchBlobAsBuffer1.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - BLOB.
 *    To fetch BLOB columns as buffer by setting oracledb.fetchAsBuffer.
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const fs       = require('fs');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');

describe('87. fetchBlobAsBuffer1.js', function() {

  let connection = null;
  let insertID = 1; // assume id for insert into db starts from 1
  const inFileName = './test/blobTmpFile.txt';
  const defaultStmtCache = oracledb.stmtCacheSize;

  const proc_create_table1 = "BEGIN \n" +
                           "  DECLARE \n" +
                           "    e_table_missing EXCEPTION; \n" +
                           "    PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                           "    BEGIN \n" +
                           "      EXECUTE IMMEDIATE ('DROP TABLE nodb_blob1 PURGE' ); \n" +
                           "    EXCEPTION \n" +
                           "      WHEN e_table_missing \n" +
                           "      THEN NULL; \n" +
                           "    END; \n" +
                           "    EXECUTE IMMEDIATE ( ' \n" +
                           "      CREATE TABLE nodb_blob1 ( \n" +
                           "        ID NUMBER, \n" +
                           "        B  BLOB \n" +
                           "      ) \n" +
                           "    '); \n" +
                           "END;  ";
  const drop_table1 = "DROP TABLE nodb_blob1 PURGE";

  before('get one connection', async function() {
    oracledb.stmtCacheSize = 0;
    connection = await oracledb.getConnection(dbConfig);
    await fs.promises.writeFile(inFileName, '');
  }); // before

  after('release connection', async function() {
    oracledb.stmtCacheSize = defaultStmtCache;
    await connection.close();
    await fs.promises.unlink(inFileName);
  });  // after

  // Generic function to insert a single row given ID, and data
  const insertIntoBlobTable1 = async function(id, content) {
    let result;
    if (content == "EMPTY_BLOB") {
      result = await connection.execute(
        "INSERT INTO nodb_blob1 VALUES (:ID, EMPTY_BLOB())",
        [ id ]);
      assert.strictEqual(result.rowsAffected, 1);
    } else {
      result = await connection.execute(
        "INSERT INTO nodb_blob1 VALUES (:ID, :B)",
        {
          ID : { val : id },
          B : { val : content, dir : oracledb.BIND_IN, type : oracledb.BUFFER }
        });
      assert.strictEqual(result.rowsAffected, 1);
    }
  };

  const updateBlobTable1 = async function(id, content) {
    const result = await connection.execute(
      "UPDATE nodb_blob1 set B = :B where ID = :ID",
      { ID: id, B: content });
    assert.strictEqual(result.rowsAffected, 1);
  };

  describe('87.1 fetch BLOB columns by setting oracledb.fetchAsBuffer', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    }); // before

    after('drop table', async function() {
      await connection.execute(drop_table1);
    }); // after

    const insertAndFetch = async function(id, specialStr, insertContent) {
      await insertIntoBlobTable1(id, insertContent);
      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = :id",
        { id : id });
      const resultVal = result.rows[0][1];
      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        assert.deepStrictEqual(resultVal, insertContent);
      }
    };

    beforeEach('set oracledb.fetchAsBuffer', function() {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
    }); // beforeEach

    afterEach('clear the by-type specification', function() {
      oracledb.fetchAsBuffer = [];
    }); // afterEach

    it('87.1.1 works with NULL value', async function() {
      const id = insertID++;
      const content = null;
      await insertAndFetch(id, null, content);
    }); // 87.1.1

    it('87.1.2 works with empty Buffer', async function() {
      const id = insertID++;
      const content = Buffer.from("", "utf-8");
      await insertAndFetch(id, null, content);
    }); // 87.1.2

    it('87.1.3 works with small value', async function() {
      const id = insertID++;
      const specialStr = '87.1.3';
      const contentLength = 20;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content);
    }); // 87.1.3

    it('87.1.4 works with (64K - 1) value', async function() {
      const id = insertID++;
      const specialStr = '87.1.4';
      const contentLength = 65535;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content);
    }); // 87.1.4

    it('87.1.5 works with (64K + 1) value', async function() {
      const id = insertID++;
      const specialStr = '87.1.5';
      const contentLength = 65537;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content);
    }); // 87.1.5

    it('87.1.6 works with (1MB + 1) data', async function() {
      const id = insertID++;
      const specialStr = '87.1.6';
      const contentLength = 1048577; // 1MB + 1
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content);
    }); // 87.1.6

    it('87.1.7 works with dbms_lob.substr()', async function() {
      const id = insertID++;
      const specialStr = '87.1.7';
      const contentLength = 200;
      const specialStrLength = specialStr.length;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertIntoBlobTable1(id, content);
      const result = await connection.execute(
        "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) from nodb_blob1 WHERE ID = :id",
        { id : id });
      const resultVal = result.rows[0][0];
      const buffer2Compare = Buffer.from(specialStr, "utf-8");
      assert.deepStrictEqual(resultVal, buffer2Compare);
    }); // 87.1.7

    it('87.1.8 works with EMPTY_BLOB()', async function() {
      const id = insertID++;
      const content = "EMPTY_BLOB";
      await insertAndFetch(id, null, content);
    }); // 87.1.8

    it('87.1.9 fetch multiple BLOB rows as Buffer', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '87.1.9_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '87.1.9_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);
      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2);

      assert.deepStrictEqual(result.rows[0][1], content_1);
      assert.deepStrictEqual(result.rows[1][1], content_2);
    }); // 87.1.9

    it('87.1.10 fetch the same BLOB column multiple times', async function() {
      const id = insertID++;
      const specialStr = '87.1.10';
      const contentLength = 200;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertIntoBlobTable1(id, content);
      const result = await connection.execute(
        "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id);
      assert.deepStrictEqual(result.rows[0][1], content);
      assert.deepStrictEqual(result.rows[0][2], content);
    }); // 87.1.10

    it('87.1.11 works with update statement', async function() {
      const id = insertID++;
      const specialStr_1 = '87.1.11_1';
      const contentLength_1 = 208;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const specialStr_2 = '87.1.11_2';
      const contentLength_2 = 200;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      await insertAndFetch(id, specialStr_1, content_1);
      await updateBlobTable1(id, content_2);
      const result = await connection.execute("SELECT ID, B from nodb_blob1 WHERE ID = " + id);
      assert.deepStrictEqual(result.rows[0][1], content_2);
    }); // 87.1.11

    it('87.1.12 works with REF CURSOR', async function() {
      const id = insertID++;
      const specialStr = '87.1.12';
      const contentLength = 100;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertIntoBlobTable1(id, content);
      const ref_proc = "CREATE OR REPLACE PROCEDURE nodb_ref(blob_cursor OUT SYS_REFCURSOR)\n" +
                     "AS \n" +
                     "BEGIN \n" +
                     "    OPEN blob_cursor FOR \n" +
                     "        SELECT B from nodb_blob1 WHERE ID = " + id + "; \n" +
                     "END;";
      await connection.execute(ref_proc);
      const sql = "BEGIN nodb_ref(:b); END;";
      const bindVar = {
        b: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute(sql, bindVar);
      const rows = await result.outBinds.b.getRows(3);
      assert.deepStrictEqual(rows[0][0], content);
      await result.outBinds.b.close();
      const ref_proc_drop = "DROP PROCEDURE nodb_ref";
      await connection.execute(ref_proc_drop);
    }); // 87.1.12

    it('87.1.13 fetch BLOB with stream', async function() {
      const id = insertID++;
      const specialStr = '87.1.13';
      const contentLength = 200;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertIntoBlobTable1(id, content);
      oracledb.fetchAsBuffer = [];
      const result = await connection.execute(
        "SELECT B from nodb_blob1 WHERE ID = " + id);
      const lob = result.rows[0][0];
      let blobData = Buffer.alloc(0);
      await new Promise((resolve, reject) => {
        lob.on('data', function(chunk) {
          blobData = Buffer.concat([blobData, chunk]);
        });
        lob.on('error', reject);
        lob.on('end', lob.destroy);
        lob.on('close', resolve);
      });
      assert.deepStrictEqual(blobData, content);
    }); // 87.1.13

    it('87.1.14 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '87.1.14_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '87.1.14_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);
      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2);
      assert.strictEqual(result.rows.length, 1);
      assert.deepStrictEqual(result.rows[0][1], content_1);
      oracledb.maxRows = maxRowsBak;
    }); // 87.1.14

    it('87.1.15 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '87.1.15_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '87.1.15_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;
      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);
      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2);
      assert.strictEqual(result.rows.length, 2);
      assert.deepStrictEqual(result.rows[0][1], content_1);
      assert.deepStrictEqual(result.rows[1][1], content_2);
      oracledb.maxRows = maxRowsBak;
    }); // 87.1.15

    it('87.1.16 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', async function() {
      const id = insertID++;
      const specialStr = '87.1.16';
      const contentLength = 20;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertIntoBlobTable1(id, content);
      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          fetchInfo : { B : { type : oracledb.DEFAULT } }
        });

      const lob = result.rows[0][1];
      const blobData = await lob.getData();
      assert.deepStrictEqual(blobData, content);
      lob.destroy();
    }); // 87.1.16

    it('87.1.17 works with await connection.queryStream()', async function() {
      const id = insertID++;
      const specialStr = '87.1.17';
      const contentLength = 200;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);
      const sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id;
      const stream = await connection.queryStream(sql);
      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
        stream.on('data', function(data) {
          assert.deepStrictEqual(data[1], content);
          counter++;
        });
      });
      assert.strictEqual(counter, 1);
    }); // 87.1.17

    it('87.1.18 works with await connection.queryStream() and oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '87.1.18_1';
      const contentLength_1 = 26;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '87.1.18_2';
      const contentLength_2 = 30;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 20;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);
      const sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2;
      const stream = await connection.queryStream(sql);
      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
        stream.on('data', function(data) {
          const result = data[1];
          counter++;
          if (counter == 1) {
            assert.deepStrictEqual(result, content_1);
          } else {
            assert.deepStrictEqual(result, content_2);
          }
        });
      });
      oracledb.maxRows = maxRowsBak;
      assert.strictEqual(counter, 2);
    }); // 87.1.18

    it('87.1.19 works with await connection.queryStream() and oracledb.maxRows = actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '87.1.19_1';
      const contentLength_1 = 26;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '87.1.19_2';
      const contentLength_2 = 30;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 2;

      await insertIntoBlobTable1(id_1, content_1);

      await insertIntoBlobTable1(id_2, content_2);

      const sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2;
      const stream = await connection.queryStream(sql);
      await new Promise((resolve, reject) => {
        stream.on('error', function(error) {
          assert.ifError(error, null, 'Error event should not be triggered');
          reject();
        });

        let counter = 0;
        stream.on('data', function(data) {
          assert(data);
          const result = data[1];
          counter++;
          if (counter == 1) {
            assert.deepStrictEqual(result, content_1);
          } else {
            assert.deepStrictEqual(result, content_2);
          }
        });

        stream.on('end', function() {
          assert.strictEqual(counter, 2);
          oracledb.maxRows = maxRowsBak;
          stream.destroy();
        });

        stream.on('close', function() {
          resolve();
        });
      });
    }); // 87.1.19

    it('87.1.20 works with await connection.queryStream() and oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '87.1.20_1';
      const contentLength_1 = 26;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '87.1.19_2';
      const contentLength_2 = 30;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;


      await insertIntoBlobTable1(id_1, content_1);

      await insertIntoBlobTable1(id_2, content_2);

      const sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2;
      const stream = await connection.queryStream(sql);
      await new Promise((resolve, reject) => {
        stream.on('error', function(error) {
          assert.ifError(error, null, 'Error event should not be triggered');
          reject();
        });

        let counter = 0;
        stream.on('data', function(data) {
          assert(data);
          const result = data[1];
          counter++;
          if (counter == 1) {
            assert.deepStrictEqual(result, content_1);
          } else {
            assert.deepStrictEqual(result, content_2);
          }
        });

        stream.on('end', function() {
          assert.strictEqual(counter, 2);
          oracledb.maxRows = maxRowsBak;
          stream.destroy();
        });

        stream.on('close', function() {
          resolve();
        });
      });
    }); // 87.1.20

  }); // 87.1

  describe('87.2 fetch BLOB columns by setting oracledb.fetchAsBuffer and outFormat = oracledb.OUT_FORMAT_OBJECT', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    }); // before

    after('drop table', async function() {
      await connection.execute(drop_table1);
    }); // after

    beforeEach('set oracledb.fetchAsBuffer', function() {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
    }); // beforeEach

    afterEach('clear the by-type specification', function() {
      oracledb.fetchAsBuffer = [];
    }); // afterEach

    const insertAndFetch = async function(id, specialStr, insertContent) {
      await insertIntoBlobTable1(id, insertContent);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = :id",
        { id : id },
        { outFormat : oracledb.OUT_FORMAT_OBJECT });
      let resultVal = result.rows[0].B;
      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        assert.deepStrictEqual(resultVal, insertContent);
      }
    };

    it('87.2.1 works with NULL value', async function() {
      let id = insertID++;
      let content = null;

      await insertAndFetch(id, null, content);
    }); // 87.2.1

    it('87.2.2 works with empty Buffer', async function() {
      let id = insertID++;
      let content = Buffer.from("", "utf-8");

      await insertAndFetch(id, null, content);
    }); // 87.2.2

    it('87.2.3 works with small value', async function() {
      let id = insertID++;
      let specialStr = '87.2.3';
      let contentLength = 20;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertAndFetch(id, specialStr, content);
    }); // 87.2.3

    it('87.2.4 works with (64K - 1) value', async function() {
      let id = insertID++;
      let specialStr = '87.2.4';
      let contentLength = 65535;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertAndFetch(id, specialStr, content);
    }); // 87.2.4

    it('87.2.5 works with (64K + 1) value', async function() {
      let id = insertID++;
      let specialStr = '87.2.5';
      let contentLength = 65537;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertAndFetch(id, specialStr, content);
    }); // 87.2.5

    it('87.2.6 works with (1MB + 1) data', async function() {
      let id = insertID++;
      let specialStr = '87.2.6';
      let contentLength = 1048577; // 1MB + 1
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertAndFetch(id, specialStr, content);
    }); // 87.2.6

    it('87.2.7 works with dbms_lob.substr()', async function() {
      let id = insertID++;
      let specialStr = '87.2.7';
      let contentLength = 200;
      let specialStrLength = specialStr.length;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");
      let result = null;

      await insertIntoBlobTable1(id, content);

      result = await connection.execute(
        "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) AS B1 from nodb_blob1 WHERE ID = :id",
        { id : id },
        { outFormat : oracledb.OUT_FORMAT_OBJECT });

      let resultVal = result.rows[0].B1;
      let buffer2Compare = Buffer.from(specialStr, "utf-8");
      assert.deepStrictEqual(resultVal, buffer2Compare);
    }); // 87.2.7

    it('87.2.8 works with EMPTY_BLOB()', async function() {
      let id = insertID++;
      let content = "EMPTY_BLOB";

      await insertAndFetch(id, null, content);
    }); // 87.2.8

    it('87.2.9 fetch multiple BLOB rows as Buffer', async function() {
      let id_1 = insertID++;
      let specialStr_1 = '87.2.9_1';
      let contentLength_1 = 200;
      let strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      let content_1 = Buffer.from(strBuf_1, "utf-8");
      let id_2 = insertID++;
      let specialStr_2 = '87.2.9_2';
      let contentLength_2 = 100;
      let strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      let content_2 = Buffer.from(strBuf_2, "utf-8");
      let result = null;
      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);
      result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
        { },
        { outFormat : oracledb.OUT_FORMAT_OBJECT });
      assert.deepStrictEqual(result.rows[0].B, content_1);
      assert.deepStrictEqual(result.rows[1].B, content_2);
    }); // 87.2.9

    it('87.2.10 fetch the same BLOB column multiple times', async function() {
      let id = insertID++;
      let specialStr = '87.2.10';
      let contentLength = 200;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");
      let result = null;

      await insertIntoBlobTable1(id, content);

      result = await connection.execute(
        "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
        { },
        { outFormat : oracledb.OUT_FORMAT_OBJECT });

      assert.deepStrictEqual(result.rows[0].B1, content);
      assert.deepStrictEqual(result.rows[0].B2, content);
    }); // 87.2.10

    it('87.2.11 works with update statement', async function() {
      let id = insertID++;
      let specialStr_1 = '87.2.11_1';
      let contentLength_1 = 201;
      let strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      let content_1 = Buffer.from(strBuf_1, "utf-8");
      let specialStr_2 = '87.2.11_2';
      let contentLength_2 = 208;
      let strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      let content_2 = Buffer.from(strBuf_2, "utf-8");
      let result = null;

      await insertAndFetch(id, specialStr_1, content_1);

      await updateBlobTable1(id, content_2);

      result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
        { },
        { outFormat : oracledb.OUT_FORMAT_OBJECT });
      assert.deepStrictEqual(result.rows[0].B, content_2);
    }); // 87.2.11

    it('87.2.12 works with REF CURSOR', async function() {
      let id = insertID++;
      let specialStr = '87.2.12';
      let contentLength = 100;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");
      await insertIntoBlobTable1(id, content);
      let ref_proc = "CREATE OR REPLACE PROCEDURE nodb_ref(blob_cursor OUT SYS_REFCURSOR)\n" +
                         "AS \n" +
                         "BEGIN \n" +
                         "    OPEN blob_cursor FOR \n" +
                         "        SELECT B from nodb_blob1 WHERE ID = " + id + "; \n" +
                         "END;";
      await connection.execute(ref_proc);

      let sql = "BEGIN nodb_ref(:b); END;";
      let bindVar = {
        b: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute(sql, bindVar);
      const rows = await result.outBinds.b.getRows(3);
      assert.deepStrictEqual(rows[0][0], content);
      await result.outBinds.b.close();
      const ref_proc_drop = "DROP PROCEDURE nodb_ref";
      await connection.execute(ref_proc_drop);
    }); // 87.2.12

    it('87.2.13 fetch BLOB with stream', async function() {
      let id = insertID++;
      let specialStr = '87.2.13';
      let contentLength = 200;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");
      let result = null;

      await insertIntoBlobTable1(id, content);
      oracledb.fetchAsBuffer = [];
      result = await connection.execute("SELECT B from nodb_blob1 WHERE ID = " + id);

      let lob = result.rows[0][0];
      let blobData = Buffer.alloc(0);
      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('end', lob.destroy);
        lob.on('close', resolve);
        lob.on('data', function(chunk) {
          blobData = Buffer.concat([blobData, chunk]);
        });
      });
      assert.deepStrictEqual(blobData, content);
    }); // 87.2.13

    it('87.2.14 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      let id_1 = insertID++;
      let specialStr_1 = '87.2.14_1';
      let contentLength_1 = 200;
      let strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      let content_1 = Buffer.from(strBuf_1, "utf-8");
      let id_2 = insertID++;
      let specialStr_2 = '87.2.14_2';
      let contentLength_2 = 100;
      let strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      let content_2 = Buffer.from(strBuf_2, "utf-8");
      let maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;
      let result = null;

      await insertIntoBlobTable1(id_1, content_1);

      await insertIntoBlobTable1(id_2, content_2);

      result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        { outFormat : oracledb.OUT_FORMAT_OBJECT });

      assert.strictEqual(result.rows.length, 1);
      assert.deepStrictEqual(result.rows[0].B, content_1);
      oracledb.maxRows = maxRowsBak;
    }); // 87.2.14

    it('87.2.15 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      let id_1 = insertID++;
      let specialStr_1 = '87.2.15_1';
      let contentLength_1 = 200;
      let strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      let content_1 = Buffer.from(strBuf_1, "utf-8");
      let id_2 = insertID++;
      let specialStr_2 = '87.2.15_2';
      let contentLength_2 = 100;
      let strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      let content_2 = Buffer.from(strBuf_2, "utf-8");
      let maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;
      let result = null;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);
      result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        { outFormat : oracledb.OUT_FORMAT_OBJECT });

      assert.strictEqual(result.rows.length, 2);
      assert.deepStrictEqual(result.rows[0].B, content_1);
      assert.deepStrictEqual(result.rows[1].B, content_2);
      oracledb.maxRows = maxRowsBak;
    }); // 87.2.15

    it('87.2.16 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', async function() {
      let id = insertID++;
      let specialStr = '87.2.16';
      let contentLength = 20;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          fetchInfo : { B : { type : oracledb.DEFAULT } }
        });
      const lob = result.rows[0][1];
      const blobData = await lob.getData();
      await lob.close();
      assert.deepStrictEqual(blobData, content);
    }); // 87.2.16

  }); // 87.2

  describe('87.3 fetch BLOB columns by setting oracledb.fetchAsBuffer, outFormat = oracledb.OUT_FORMAT_OBJECT and resultSet = true', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    }); // before

    after('drop table', async function() {
      await connection.execute(drop_table1);
    }); // after

    beforeEach('set oracledb.fetchAsBuffer', function() {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];

    }); // beforeEach

    afterEach('clear the by-type specification', function() {
      oracledb.fetchAsBuffer = [];

    }); // afterEach

    const insertAndFetch = async function(id, specialStr, insertContent) {
      await insertIntoBlobTable1(id, insertContent);
      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          resultSet : true
        });
      let row = await result.resultSet.getRow();
      let resultVal;
      resultVal = row.B;
      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        assert.deepStrictEqual(resultVal, insertContent);
      }
      await result.resultSet.close();
    };

    it('87.3.1 works with NULL value', async function() {
      let id = insertID++;
      let content = null;

      await insertAndFetch(id, null, content);
    }); // 87.3.1

    it('87.3.2 works with empty Buffer', async function() {
      let id = insertID++;
      let content = Buffer.from("", "utf-8");

      await insertAndFetch(id, null, content);
    }); // 87.3.2

    it('87.3.3 works with small value', async function() {
      let id = insertID++;
      let specialStr = '87.3.3';
      let contentLength = 20;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertAndFetch(id, specialStr, content);
    }); // 87.3.3

    it('87.3.4 works with (64K - 1) value', async function() {
      let id = insertID++;
      let specialStr = '87.3.4';
      let contentLength = 65535;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertAndFetch(id, specialStr, content);
    }); // 87.3.4

    it('87.3.5 works with (64K + 1) value', async function() {
      let id = insertID++;
      let specialStr = '87.3.5';
      let contentLength = 65537;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertAndFetch(id, specialStr, content);
    }); // 87.3.5

    it('87.3.6 works with (1MB + 1) data', async function() {
      let id = insertID++;
      let specialStr = '87.3.6';
      let contentLength = 1048577; // 1MB + 1
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertAndFetch(id, specialStr, content);
    }); // 87.3.6

    it('87.3.7 works with dbms_lob.substr()', async function() {
      let id = insertID++;
      let specialStr = '87.3.7';
      let contentLength = 200;
      let specialStrLength = specialStr.length;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);

      const result = await connection.execute(
        "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) AS B1 from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          resultSet : true
        });
      const row = await result.resultSet.getRow();
      const buffer2Compare = Buffer.from(specialStr, "utf-8");
      assert.deepStrictEqual(row.B1, buffer2Compare);
      await result.resultSet.close();
    }); // 87.3.7

    it('87.3.8 works with EMPTY_BLOB()', async function() {
      let id = insertID++;
      let content = "EMPTY_BLOB";

      await insertAndFetch(id, null, content);
    }); // 87.3.8

    it('87.3.9 fetch multiple BLOB rows as Buffer', async function() {
      let id_1 = insertID++;
      let specialStr_1 = '87.3.9_1';
      let contentLength_1 = 200;
      let strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      let content_1 = Buffer.from(strBuf_1, "utf-8");
      let id_2 = insertID++;
      let specialStr_2 = '87.3.9_2';
      let contentLength_2 = 100;
      let strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      let content_2 = Buffer.from(strBuf_2, "utf-8");
      let result = null;

      await insertIntoBlobTable1(id_1, content_1);

      await insertIntoBlobTable1(id_2, content_2);

      let rowNumFetched = 2;
      result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          resultSet : true
        });

      let row = await result.resultSet.getRows(
        rowNumFetched);
      assert.deepStrictEqual(row[0].B, content_1);
      assert.deepStrictEqual(row[1].B, content_2);
      await result.resultSet.close();
    }); // 87.3.9

    it('87.3.10 fetch the same BLOB column multiple times', async function() {
      let id = insertID++;
      let specialStr = '87.3.10';
      let contentLength = 200;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      let result = null;
      await insertIntoBlobTable1(id, content);

      result = await connection.execute(
        "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          resultSet : true
        });

      const row = await result.resultSet.getRow();
      assert.deepStrictEqual(row.B1, content);
      assert.deepStrictEqual(row.B2, content);
      await result.resultSet.close();
    }); // 87.3.10

    it('87.3.11 works with update statement', async function() {
      let id = insertID++;
      let specialStr_1 = '87.3.11_1';
      let contentLength_1 = 200;
      let strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      let content_1 = Buffer.from(strBuf_1, "utf-8");
      let specialStr_2 = '87.3.11_2';
      let contentLength_2 = 208;
      let strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      let content_2 = Buffer.from(strBuf_2, "utf-8");

      await insertAndFetch(id, specialStr_1, content_1);

      await updateBlobTable1(id, content_2);
      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          resultSet : true
        });
      const row = await result.resultSet.getRow();
      assert.deepStrictEqual(row.B, content_2);
      await result.resultSet.close();
    }); // 87.3.11

    it('87.3.12 works with REF CURSOR', async function() {
      let id = insertID++;
      let specialStr = '87.3.12';
      let contentLength = 100;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);

      let ref_proc = "CREATE OR REPLACE PROCEDURE nodb_ref(blob_cursor OUT SYS_REFCURSOR)\n" +
                         "AS \n" +
                         "BEGIN \n" +
                         "    OPEN blob_cursor FOR \n" +
                         "        SELECT B from nodb_blob1 WHERE ID = " + id + "; \n" +
                         "END;";
      await connection.execute(ref_proc);

      const sql = "BEGIN nodb_ref(:b); END;";
      const bindVar = {
        b: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute(sql, bindVar);
      const rows = await result.outBinds.b.getRows(3);

      assert.deepStrictEqual(rows[0][0], content);
      await result.outBinds.b.close();
      let ref_proc_drop = "DROP PROCEDURE nodb_ref";
      await connection.execute(ref_proc_drop);
    }); // 87.3.12

    it('87.3.13 fetch BLOB with stream', async function() {
      let id = insertID++;
      let specialStr = '87.3.13';
      let contentLength = 200;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);
      oracledb.fetchAsBuffer = [];
      const result = await connection.execute(
        "SELECT B from nodb_blob1 WHERE ID = " + id);

      const lob = result.rows[0][0];
      let blobData = Buffer.alloc(0);
      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('end', lob.destroy);
        lob.on('close', resolve);
        lob.on('data', function(chunk) {
          blobData = Buffer.concat([blobData, chunk]);
        });
      });
      assert.deepStrictEqual(blobData, content);
    }); // 87.3.13

    it('87.3.14 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      let id_1 = insertID++;
      let specialStr_1 = '87.3.14_1';
      let contentLength_1 = 200;
      let strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      let content_1 = Buffer.from(strBuf_1, "utf-8");
      let id_2 = insertID++;
      let specialStr_2 = '87.3.14_2';
      let contentLength_2 = 100;
      let strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      let content_2 = Buffer.from(strBuf_2, "utf-8");
      let maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoBlobTable1(id_1, content_1);

      await insertIntoBlobTable1(id_2, content_2);

      let rowNumFetched = 2;
      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          resultSet : true
        });

      const row = await result.resultSet.getRows(rowNumFetched);
      assert.strictEqual(row.length, 2);
      assert.deepStrictEqual(row[0].B, content_1);
      assert.deepStrictEqual(row[1].B, content_2);
      oracledb.maxRows = maxRowsBak;
      await result.resultSet.close();
    }); // 87.3.14

    it('87.3.15 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      let id_1 = insertID++;
      let specialStr_1 = '87.3.15_1';
      let contentLength_1 = 200;
      let strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      let content_1 = Buffer.from(strBuf_1, "utf-8");
      let id_2 = insertID++;
      let specialStr_2 = '87.3.15_2';
      let contentLength_2 = 100;
      let strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      let content_2 = Buffer.from(strBuf_2, "utf-8");
      let maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);
      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          resultSet : true
        });

      const rows = await result.resultSet.getRows(2);
      assert.strictEqual(rows.length, 2);
      assert.deepStrictEqual(rows[0].B, content_1);
      assert.deepStrictEqual(rows[1].B, content_2);
      oracledb.maxRows = maxRowsBak;
      await result.resultSet.close();
    }); // 87.3.15

    it('87.3.16 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', async function() {
      let id = insertID++;
      let specialStr = '87.3.16';
      let contentLength = 20;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");
      let result = null;

      await insertIntoBlobTable1(id, content);

      result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          fetchInfo : { B : { type : oracledb.DEFAULT } }
        });

      const lob = result.rows[0][1];
      const blobData = await lob.getData();
      await lob.close();
      assert.deepStrictEqual(blobData, content);
    }); // 87.3.16

  }); // 87.3

  describe('87.4 fetch BLOB columns by setting oracledb.fetchAsBuffer and outFormat = oracledb.OUT_FORMAT_ARRAY', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    }); // before

    after('drop table', async function() {
      await connection.execute(
        drop_table1);
    }); // after

    beforeEach('set oracledb.fetchAsBuffer', function() {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];

    }); // beforeEach

    afterEach('clear the by-type specification', function() {
      oracledb.fetchAsBuffer = [];

    }); // afterEach

    let insertAndFetch = async function(id, specialStr, insertContent) {
      let result = null;
      await insertIntoBlobTable1(id, insertContent);

      result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = :id",
        { id : id },
        { outFormat : oracledb.OUT_FORMAT_ARRAY });

      let resultVal = result.rows[0][1];
      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        assert.deepStrictEqual(resultVal, insertContent);
      }
    };

    it('87.4.1 works with NULL value', async function() {
      let id = insertID++;
      let content = null;

      await insertAndFetch(id, null, content);
    }); // 87.4.1

    it('87.4.2 works with empty Buffer', async function() {
      let id = insertID++;
      let content = Buffer.from("", "utf-8");

      await insertAndFetch(id, null, content);
    }); // 87.4.2

    it('87.4.3 works with small value', async function() {
      let id = insertID++;
      let specialStr = '87.4.3';
      let contentLength = 20;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertAndFetch(id, specialStr, content);
    }); // 87.4.3

    it('87.4.4 works with (64K - 1) value', async function() {
      let id = insertID++;
      let specialStr = '87.4.4';
      let contentLength = 65535;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertAndFetch(id, specialStr, content);
    }); // 87.4.4

    it('87.4.5 works with (64K + 1) value', async function() {
      let id = insertID++;
      let specialStr = '87.4.5';
      let contentLength = 65537;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertAndFetch(id, specialStr, content);
    }); // 87.4.5

    it('87.4.6 works with (1MB + 1) data', async function() {
      let id = insertID++;
      let specialStr = '87.4.6';
      let contentLength = 1048577; // 1MB + 1
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertAndFetch(id, specialStr, content);
    }); // 87.4.6

    it('87.4.7 works with dbms_lob.substr()', async function() {
      let id = insertID++;
      let specialStr = '87.4.7';
      let contentLength = 200;
      let specialStrLength = specialStr.length;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");
      let result = null;

      await insertIntoBlobTable1(id, content);
      result = await connection.execute(
        "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) from nodb_blob1 WHERE ID = :id",
        { id : id },
        { outFormat : oracledb.OUT_FORMAT_ARRAY });
      let resultVal = result.rows[0][0];
      let buffer2Compare = Buffer.from(specialStr, "utf-8");
      assert.deepStrictEqual(resultVal, buffer2Compare);
    }); // 87.4.7

    it('87.4.8 works with EMPTY_BLOB()', async function() {
      let id = insertID++;
      let content = "EMPTY_BLOB";

      await insertAndFetch(id, null, content);
    }); // 87.4.8

    it('87.4.9 fetch multiple BLOB rows as Buffer', async function() {
      let id_1 = insertID++;
      let specialStr_1 = '87.4.9_1';
      let contentLength_1 = 200;
      let strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      let content_1 = Buffer.from(strBuf_1, "utf-8");
      let id_2 = insertID++;
      let specialStr_2 = '87.4.9_2';
      let contentLength_2 = 100;
      let strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      let content_2 = Buffer.from(strBuf_2, "utf-8");

      let result = null;
      await insertIntoBlobTable1(id_1, content_1);

      await insertIntoBlobTable1(id_2, content_2);

      result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
        { },
        { outFormat : oracledb.OUT_FORMAT_ARRAY });

      assert.deepStrictEqual(result.rows[0][1], content_1);
      assert.deepStrictEqual(result.rows[1][1], content_2);
    }); // 87.4.9

    it('87.4.10 fetch the same BLOB column multiple times', async function() {
      let id = insertID++;
      let specialStr = '87.4.10';
      let contentLength = 200;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");
      let result = null;
      await insertIntoBlobTable1(id, content);

      result = await connection.execute(
        "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
        { },
        { outFormat : oracledb.OUT_FORMAT_ARRAY });
      assert.deepStrictEqual(result.rows[0][1], content);
      assert.deepStrictEqual(result.rows[0][2], content);
    }); // 87.4.10

    it('87.4.11 works with update statement', async function() {
      let id = insertID++;
      let specialStr_1 = '87.4.11_1';
      let contentLength_1 = 200;
      let strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      let content_1 = Buffer.from(strBuf_1, "utf-8");
      let specialStr_2 = '87.4.11_2';
      let contentLength_2 = 208;
      let strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      let content_2 = Buffer.from(strBuf_2, "utf-8");

      await insertAndFetch(id, specialStr_1, content_1);

      await updateBlobTable1(id, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
        { },
        { outFormat : oracledb.OUT_FORMAT_ARRAY });

      assert.deepStrictEqual(result.rows[0][1], content_2);
    }); // 87.4.11

    it('87.4.12 works with REF CURSOR', async function() {
      let id = insertID++;
      let specialStr = '87.4.12';
      let contentLength = 100;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");
      await insertIntoBlobTable1(id, content);

      let ref_proc = "CREATE OR REPLACE PROCEDURE nodb_ref(blob_cursor OUT SYS_REFCURSOR)\n" +
                     "AS \n" +
                     "BEGIN \n" +
                     "    OPEN blob_cursor FOR \n" +
                     "        SELECT B from nodb_blob1 WHERE ID = " + id + "; \n" +
                     "END;";
      await connection.execute(ref_proc);

      let sql = "BEGIN nodb_ref(:b); END;";
      let bindVar = {
        b: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };

      const result = await connection.execute(sql, bindVar);

      const rows = await result.outBinds.b.getRows(3);
      assert.deepStrictEqual(rows[0][0], content);
      await result.outBinds.b.close();
      let ref_proc_drop = "DROP PROCEDURE nodb_ref";
      await connection.execute(ref_proc_drop);
    }); // 87.4.12

    it('87.4.13 fetch BLOB with stream', async function() {
      let id = insertID++;
      let specialStr = '87.4.13';
      let contentLength = 200;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");
      let result = null;
      await insertIntoBlobTable1(id, content);

      oracledb.fetchAsBuffer = [];
      result = await connection.execute(
        "SELECT B from nodb_blob1 WHERE ID = " + id);

      const lob = result.rows[0][0];
      let blobData = Buffer.alloc(0);
      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('end', lob.destroy);
        lob.on('close', resolve);
        lob.on('data', function(chunk) {
          blobData = Buffer.concat([blobData, chunk]);
        });
      });
      assert.deepStrictEqual(blobData, content);
    }); // 87.4.13

    it('87.4.14 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      let id_1 = insertID++;
      let specialStr_1 = '87.4.14_1';
      let contentLength_1 = 200;
      let strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      let content_1 = Buffer.from(strBuf_1, "utf-8");
      let id_2 = insertID++;
      let specialStr_2 = '87.4.14_2';
      let contentLength_2 = 100;
      let strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      let content_2 = Buffer.from(strBuf_2, "utf-8");
      let maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoBlobTable1(id_1, content_1);

      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        { outFormat : oracledb.OUT_FORMAT_ARRAY });

      assert.strictEqual(result.rows.length, 1);
      assert.deepStrictEqual(result.rows[0][1], content_1);
      oracledb.maxRows = maxRowsBak;
    }); // 87.4.14

    it('87.4.15 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      let id_1 = insertID++;
      let specialStr_1 = '87.4.15_1';
      let contentLength_1 = 200;
      let strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      let content_1 = Buffer.from(strBuf_1, "utf-8");
      let id_2 = insertID++;
      let specialStr_2 = '87.4.15_2';
      let contentLength_2 = 100;
      let strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      let content_2 = Buffer.from(strBuf_2, "utf-8");
      let maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoBlobTable1(id_1, content_1);

      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        { outFormat : oracledb.OUT_FORMAT_ARRAY });

      assert.strictEqual(result.rows.length, 2);
      assert.deepStrictEqual(result.rows[0][1], content_1);
      assert.deepStrictEqual(result.rows[1][1], content_2);
      oracledb.maxRows = maxRowsBak;
    }); // 87.4.15

    it('87.4.16 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', async function() {
      let id = insertID++;
      let specialStr = '87.4.16';
      let contentLength = 20;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");
      let result = null;

      await insertIntoBlobTable1(id, content);

      result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          fetchInfo : { B : { type : oracledb.DEFAULT } }
        });

      const lob = result.rows[0][1];
      const blobData = await lob.getData();
      await lob.close();
      assert.deepStrictEqual(blobData, content);
    }); // 87.4.16

  }); // 87.4

  describe('87.5 fetch BLOB columns by setting oracledb.fetchAsBuffer, outFormat = oracledb.OUT_FORMAT_ARRAY and resultSet = true', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    }); // before

    after('drop table', async function() {
      await connection.execute(drop_table1);
    }); // after

    beforeEach('set oracledb.fetchAsBuffer', function() {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];

    }); // beforeEach

    afterEach('clear the by-type specification', function() {
      oracledb.fetchAsBuffer = [];

    }); // afterEach

    const insertAndFetch = async function(id, specialStr, insertContent) {
      let result = null;
      await insertIntoBlobTable1(id, insertContent);

      result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          resultSet : true
        });

      let row = await result.resultSet.getRow();
      let resultVal;
      resultVal = row[1];
      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        assert.deepStrictEqual(resultVal, insertContent);
      }
      await result.resultSet.close();
    };

    it('87.5.1 works with NULL value', async function() {
      let id = insertID++;
      let content = null;

      await insertAndFetch(id, null, content);
    }); // 87.5.1

    it('87.5.2 works with empty Buffer', async function() {
      let id = insertID++;
      let content = Buffer.from("", "utf-8");

      await insertAndFetch(id, null, content);
    }); // 87.5.2

    it('87.5.3 works with small value', async function() {
      let id = insertID++;
      let specialStr = '87.5.3';
      let contentLength = 20;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertAndFetch(id, specialStr, content);
    }); // 87.5.3

    it('87.5.4 works with (64K - 1) value', async function() {
      let id = insertID++;
      let specialStr = '87.5.4';
      let contentLength = 65535;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertAndFetch(id, specialStr, content);
    }); // 87.5.4

    it('87.5.5 works with (64K + 1) value', async function() {
      let id = insertID++;
      let specialStr = '87.5.5';
      let contentLength = 65537;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertAndFetch(id, specialStr, content);
    }); // 87.5.5

    it('87.5.6 works with (1MB + 1) data', async function() {
      let id = insertID++;
      let specialStr = '87.5.6';
      let contentLength = 1048577; // 1MB + 1
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertAndFetch(id, specialStr, content);
    }); // 87.5.6

    it('87.5.7 works with dbms_lob.substr()', async function() {
      let id = insertID++;
      let specialStr = '87.5.7';
      let contentLength = 200;
      let specialStrLength = specialStr.length;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");
      let result = null;

      await insertIntoBlobTable1(id, content);
      result = await connection.execute(
        "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) AS B1 from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          resultSet : true
        });
      let row = await result.resultSet.getRow();
      let resultVal = row[0];
      let buffer2Compare = Buffer.from(specialStr, "utf-8");
      assert.deepStrictEqual(resultVal, buffer2Compare);
      await result.resultSet.close();
    }); // 87.5.7

    it('87.5.8 works with EMPTY_BLOB()', async function() {
      let id = insertID++;
      let content = "EMPTY_BLOB";

      await insertAndFetch(id, null, content);
    }); // 87.5.8

    it('87.5.9 fetch multiple BLOB rows as Buffer', async function() {
      let id_1 = insertID++;
      let specialStr_1 = '87.5.9_1';
      let contentLength_1 = 200;
      let strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      let content_1 = Buffer.from(strBuf_1, "utf-8");
      let id_2 = insertID++;
      let specialStr_2 = '87.5.9_2';
      let contentLength_2 = 100;
      let strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      let content_2 = Buffer.from(strBuf_2, "utf-8");

      await insertIntoBlobTable1(id_1, content_1);

      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          resultSet : true
        });

      const rows = await result.resultSet.getRows(2);
      assert.deepStrictEqual(rows[0][1], content_1);
      assert.deepStrictEqual(rows[1][1], content_2);
      await result.resultSet.close();
    }); // 87.5.9

    it('87.5.10 fetch the same BLOB column multiple times', async function() {
      let id = insertID++;
      let specialStr = '87.5.10';
      let contentLength = 200;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);

      const result = await connection.execute(
        "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          resultSet : true
        });

      const row = await result.resultSet.getRow();
      assert.deepStrictEqual(row[1], content);
      assert.deepStrictEqual(row[2], content);
      await result.resultSet.close();
    }); // 87.5.10

    it('87.5.11 works with update statement', async function() {
      let id = insertID++;
      let specialStr_1 = '87.5.11_1';
      let contentLength_1 = 208;
      let strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      let content_1 = Buffer.from(strBuf_1, "utf-8");
      let specialStr_2 = '87.5.11_2';
      let contentLength_2 = 208;
      let strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      let content_2 = Buffer.from(strBuf_2, "utf-8");

      await insertAndFetch(id, specialStr_1, content_1);

      await updateBlobTable1(id, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          resultSet : true
        });

      const row = await result.resultSet.getRow();

      assert.deepStrictEqual(row[1], content_2);
      await result.resultSet.close();
    }); // 87.5.11

    it('87.5.12 works with REF CURSOR', async function() {
      let id = insertID++;
      let specialStr = '87.5.12';
      let contentLength = 100;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      let result = null;
      await insertIntoBlobTable1(id, content);

      let ref_proc = "CREATE OR REPLACE PROCEDURE nodb_ref(blob_cursor OUT SYS_REFCURSOR)\n" +
                         "AS \n" +
                         "BEGIN \n" +
                         "    OPEN blob_cursor FOR \n" +
                         "        SELECT B from nodb_blob1 WHERE ID = " + id + "; \n" +
                         "END;";
      await connection.execute(ref_proc);
      let sql = "BEGIN nodb_ref(:b); END;";
      let bindVar = {
        b: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      result = await connection.execute(
        sql,
        bindVar);
      const rows = await result.outBinds.b.getRows(3);
      assert.deepStrictEqual(rows[0][0], content);
      await result.outBinds.b.close();

      let ref_proc_drop = "DROP PROCEDURE nodb_ref";
      await connection.execute(ref_proc_drop);
    }); // 87.5.12

    it('87.5.13 fetch BLOB with stream', async function() {
      let id = insertID++;
      let specialStr = '87.5.13';
      let contentLength = 200;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);

      oracledb.fetchAsBuffer = [];
      const result = await connection.execute(
        "SELECT B from nodb_blob1 WHERE ID = " + id);

      const lob = result.rows[0][0];
      const blobData = await lob.getData();
      await lob.close();
      assert.deepStrictEqual(blobData, content);
    }); // 87.5.13

    it('87.5.14 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      let id_1 = insertID++;
      let specialStr_1 = '87.5.14_1';
      let contentLength_1 = 200;
      let strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      let content_1 = Buffer.from(strBuf_1, "utf-8");
      let id_2 = insertID++;
      let specialStr_2 = '87.5.14_2';
      let contentLength_2 = 100;
      let strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      let content_2 = Buffer.from(strBuf_2, "utf-8");
      let maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoBlobTable1(id_1, content_1);

      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          resultSet : true
        });

      const rows = await result.resultSet.getRows(2);
      assert.strictEqual(rows.length, 2);
      assert.deepStrictEqual(rows[0][1], content_1);
      assert.deepStrictEqual(rows[1][1], content_2);
      oracledb.maxRows = maxRowsBak;
      await result.resultSet.close();
    }); // 87.5.14

    it('87.5.15 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      let id_1 = insertID++;
      let specialStr_1 = '87.5.15_1';
      let contentLength_1 = 200;
      let strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      let content_1 = Buffer.from(strBuf_1, "utf-8");
      let id_2 = insertID++;
      let specialStr_2 = '87.5.15_2';
      let contentLength_2 = 100;
      let strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      let content_2 = Buffer.from(strBuf_2, "utf-8");
      let maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoBlobTable1(id_1, content_1);

      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          resultSet : true
        });

      const rows = await result.resultSet.getRows(2);
      assert.strictEqual(rows.length, 2);
      assert.deepStrictEqual(rows[0][1], content_1);
      assert.deepStrictEqual(rows[1][1], content_2);
      oracledb.maxRows = maxRowsBak;
      await result.resultSet.close();
    }); // 87.5.15

    it('87.5.16 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', async function() {
      let id = insertID++;
      let specialStr = '87.5.16';
      let contentLength = 20;
      let strBuf = random.getRandomString(contentLength, specialStr);
      let content = Buffer.from(strBuf, "utf-8");
      await insertIntoBlobTable1(id, content);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          fetchInfo : { B : { type : oracledb.DEFAULT } }
        });

      const lob = result.rows[0][1];
      const blobData = await lob.getData();
      await lob.close();
      assert.deepStrictEqual(blobData, content);
    }); // 87.5.16

  }); // 87.5

});

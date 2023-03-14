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
 *   88. fetchBlobAsBuffer2.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - BLOB.
 *    To fetch BLOB columns as buffer by setting fetchInfo option.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');
const assist   = require('./dataTypeAssist.js');

describe('88. fetchBlobAsBuffer2.js', function() {

  let connection = null;
  let insertID = 1; // assume id for insert into db starts from 1

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
  const defaultStmtCache = oracledb.stmtCacheSize;

  before('get one connection', async function() {
    oracledb.stmtCacheSize = 0;
    connection = await oracledb.getConnection(dbConfig);
  }); // before

  after('release connection', async function() {
    oracledb.stmtCacheSize = defaultStmtCache;
    await connection.close();
  });  // after

  // Generic function to insert a single row given ID, and data
  const insertIntoBlobTable1 = async function(id, content) {
    if (content === "EMPTY_BLOB") {
      const result = await connection.execute(
        "INSERT INTO nodb_blob1 VALUES (:ID, EMPTY_BLOB())",
        [ id ]
      );
      assert.strictEqual(result.rowsAffected, 1);
    } else {
      const result = await connection.execute(
        "INSERT INTO nodb_blob1 VALUES (:ID, :B)",
        {
          ID : { val : id },
          B : { val : content, dir : oracledb.BIND_IN, type : oracledb.BUFFER }
        }
      );
      assert.strictEqual(result.rowsAffected, 1);
    }
  };

  const updateBlobTable1 = async function(id, content) {
    const result = await connection.execute(
      "UPDATE nodb_blob1 set B = :B where ID = :ID",
      { ID: id, B: content }
    );
    assert.strictEqual(result.rowsAffected, 1);
  };

  // compare fetch result
  const compareClientFetchResult = function(resultVal, specialStr, content, contentLength) {
    assert.strictEqual(resultVal.length, contentLength);
    const compareBuffer = assist.compare2Buffers(resultVal, content);
    assert.strictEqual(compareBuffer, true);
  };

  describe('88.1 fetch BLOB columns by setting fetchInfo option', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    }); // before

    after('drop table', async function() {
      await connection.execute(drop_table1);
    }); // after

    insertID = 0;
    const insertAndFetch = async function(id, specialStr, insertContent, insertContentLength) {
      await insertIntoBlobTable1(id, insertContent);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          fetchInfo : { B : { type : oracledb.BUFFER } }
        }
      );
      const resultVal = result.rows[0][1];
      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        compareClientFetchResult(resultVal, specialStr, insertContent, insertContentLength);
      }
    };

    it('88.1.1 works with NULL value', async function() {
      const id = insertID++;
      const content = null;
      await insertAndFetch(id, null, content, null);
    }); // 88.1.1

    it('88.1.2 works with empty Buffer', async function() {
      const id = insertID++;
      const content = Buffer.from("", "utf-8");
      await insertAndFetch(id, null, content, null);
    }); // 88.1.2

    it('88.1.3 works with small value', async function() {
      const id = insertID++;
      const specialStr = '88.1.3';
      const contentLength = 20;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.1.3

    it('88.1.4 works with (64K - 1) value', async function() {
      const id = insertID++;
      const specialStr = '88.1.4';
      const contentLength = 65535;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.1.4

    it('88.1.5 works with (64K + 1) value', async function() {
      const id = insertID++;
      const specialStr = '88.1.5';
      const contentLength = 65537;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.1.5

    it('88.1.6 works with (1MB + 1) value', async function() {
      const id = insertID++;
      const specialStr = '88.1.6';
      const contentLength = 1048577; // 1MB + 1
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.1.6

    it('88.1.7 works with dbms_lob.substr()', async function() {
      const id = insertID++;
      const specialStr = '88.1.7';
      const contentLength = 200;
      const specialStrLength = specialStr.length;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);
      const result = await connection.execute(
        "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) AS B1 from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          fetchInfo : { B1 : { type : oracledb.BUFFER } }
        }
      );
      const resultVal = result.rows[0][0];
      const buffer2Compare = Buffer.from(specialStr, "utf-8");

      compareClientFetchResult(resultVal, specialStr, buffer2Compare, specialStrLength);
    }); // 88.1.7

    it('88.1.8 works with EMPTY_BLOB()', async function() {
      const id = insertID++;
      const content = "EMPTY_BLOB";
      await insertAndFetch(id, null, content, null);
    }); // 88.1.8

    it('88.1.9 fetch multiple BLOB rows as Buffer', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.1.9_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.1.9_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);
      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
        { },
        {
          fetchInfo : { B : { type : oracledb.BUFFER } }
        }
      );
      let resultVal = result.rows[0][1];
      compareClientFetchResult(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = result.rows[1][1];
      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
    }); // 88.1.9

    it('88.1.10 fetch the same BLOB column multiple times', async function() {
      const id = insertID++;
      const specialStr = '88.1.10';
      const contentLength = 200;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);
      const result = await connection.execute(
        "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
        { },
        {
          fetchInfo : {
            B1 : { type : oracledb.BUFFER },
            B2 : { type : oracledb.BUFFER } }
        }
      );
      let resultVal = result.rows[0][1];
      compareClientFetchResult(resultVal, specialStr, content, contentLength);
      resultVal = result.rows[0][2];
      compareClientFetchResult(resultVal, specialStr, content, contentLength);
    }); // 88.1.10

    it('88.1.11 works with update statement', async function() {
      const id = insertID++;
      const specialStr_1 = '88.1.11_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const specialStr_2 = '88.1.11_2';
      const contentLength_2 = 208;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");

      await insertAndFetch(id, specialStr_1, content_1, contentLength_1);
      await updateBlobTable1(id, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
        { },
        {
          fetchInfo : { B : { type : oracledb.BUFFER } }
        }
      );
      const resultVal = result.rows[0][1];

      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
    }); // 88.1.11

    it('88.1.12 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.1.12_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.1.12_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          fetchInfo : { B : { type : oracledb.BUFFER } }
        }
      );
      assert.strictEqual(result.rows.length, 1);
      const resultVal = result.rows[0][1];
      compareClientFetchResult(resultVal, specialStr_1, content_1, contentLength_1);
      oracledb.maxRows = maxRowsBak;
    }); // 88.1.12

    it('88.1.13 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.1.13_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.1.13_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          fetchInfo : { B : { type : oracledb.BUFFER } }
        }
      );
      assert.strictEqual(result.rows.length, 2);

      let resultVal = result.rows[0][1];
      compareClientFetchResult(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = result.rows[1][1];
      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
    }); // 88.1.13

    it('88.1.14 works with connection.queryStream()', async function() {
      const id = insertID++;
      const specialStr = '88.1.14';
      const contentLength = 200;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);

      const sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id;
      const stream = connection.queryStream(sql, {}, { fetchInfo : { B : { type : oracledb.BUFFER } } });

      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('data', function(data) {
          assert(data);
          const result = data[1];
          compareClientFetchResult(result, specialStr, content, contentLength);
          counter++;
        });

        stream.on('error', function(err) {
          assert.ifError(err, "Error event should not be triggered");
          reject();
        });

        stream.on('end', function() {
          assert.strictEqual(counter, 1);
          stream.destroy();
        });

        stream.on('close', function() {
          resolve();
        });
      });
    }); // 88.1.14

    it('88.1.15 works with connection.queryStream() and oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.1.15_1';
      const contentLength_1 = 26;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.1.15_2';
      const contentLength_2 = 30;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 20;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2;
      const stream = connection.queryStream(sql, {}, { fetchInfo : { B : { type : oracledb.BUFFER } } });

      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('data', function(data) {
          assert(data);
          const result = data[1];
          counter++;
          if (counter == 1) {
            compareClientFetchResult(result, specialStr_1, content_1, contentLength_1);
          } else {
            compareClientFetchResult(result, specialStr_2, content_2, contentLength_2);
          }
        });

        stream.on('error', function(err) {
          assert.ifError(err, "Error event should not be triggered");
          reject();
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
    }); // 88.1.15

    it('88.1.16 works with connection.queryStream() and oracledb.maxRows = actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.1.16_1';
      const contentLength_1 = 26;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.1.16_2';
      const contentLength_2 = 30;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 2;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2;
      const stream = connection.queryStream(sql, {}, { fetchInfo : { B : { type : oracledb.BUFFER } } });

      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('data', function(data) {
          assert(data);
          const result = data[1];
          counter++;
          if (counter == 1) {
            compareClientFetchResult(result, specialStr_1, content_1, contentLength_1);
          } else {
            compareClientFetchResult(result, specialStr_2, content_2, contentLength_2);
          }
        });

        stream.on('error', function(err) {
          assert.ifError(err, "Error event should not be triggered");
          reject();
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
    }); // 88.1.16

    it('88.1.17 works with connection.queryStream() and oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.1.17_1';
      const contentLength_1 = 26;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.1.17_2';
      const contentLength_2 = 30;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2;
      const stream = connection.queryStream(sql, {}, { fetchInfo : { B : { type : oracledb.BUFFER } } });

      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('data', function(data) {
          assert(data);
          const result = data[1];
          counter++;
          if (counter == 1) {
            compareClientFetchResult(result, specialStr_1, content_1, contentLength_1);
          } else {
            compareClientFetchResult(result, specialStr_2, content_2, contentLength_2);
          }
        });

        stream.on('error', function(err) {
          assert.ifError(err, "Error event should not be triggered");
          reject();
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
    }); // 88.1.17

  }); // 88.1

  describe('88.2 fetch BLOB columns by setting fetchInfo option and outFormat = oracledb.OUT_FORMAT_OBJECT', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    }); // before

    after('drop table', async function() {
      await connection.execute(drop_table1);
    }); // after

    insertID = 0;
    const insertAndFetch = async function(id, specialStr, insertContent, insertContentLength) {
      await insertIntoBlobTable1(id, insertContent);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          fetchInfo : { B : { type : oracledb.BUFFER } }
        }
      );
      const resultVal = result.rows[0].B;

      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        compareClientFetchResult(resultVal, specialStr, insertContent, insertContentLength);
      }
    };

    it('88.2.1 works with NULL value', async function() {
      const id = insertID++;
      const content = null;
      await insertAndFetch(id, null, content, null);
    }); // 88.2.1

    it('88.2.2 works with empty buffer', async function() {
      const id = insertID++;
      const content = Buffer.from("", "utf-8");
      await insertAndFetch(id, null, content, null);
    }); // 88.2.2

    it('88.2.3 works with small value', async function() {
      const id = insertID++;
      const specialStr = '88.2.3';
      const contentLength = 20;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.2.3

    it('88.2.4 works with (64K - 1) value', async function() {
      const id = insertID++;
      const specialStr = '88.2.4';
      const contentLength = 65535;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.2.4

    it('88.2.5 works with (64K + 1) value', async function() {
      const id = insertID++;
      const specialStr = '88.2.5';
      const contentLength = 65537;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.2.5

    it('88.2.6 works with (1MB + 1) value', async function() {
      const id = insertID++;
      const specialStr = '88.2.6';
      const contentLength = 1048577; // 1MB + 1
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.2.6

    it('88.2.7 works with dbms_lob.substr()', async function() {
      const id = insertID++;
      const specialStr = '88.2.7';
      const contentLength = 200;
      const specialStrLength = specialStr.length;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);
      const result = await connection.execute(
        "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) AS B1 from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          fetchInfo : { B1 : { type : oracledb.BUFFER } }
        }
      );
      const resultVal = result.rows[0].B1;
      const buffer2Compare = Buffer.from(specialStr, "utf-8");
      compareClientFetchResult(resultVal, specialStr, buffer2Compare, specialStrLength);
    }); // 88.2.7

    it('88.2.8 works with EMPTY_BLOB()', async function() {
      const id = insertID++;
      const content = "EMPTY_BLOB";
      await insertAndFetch(id, null, content, null);
    }); // 88.2.8

    it('88.2.9 fetch multiple BLOB rows as Buffer', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.2.9_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.2.9_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          fetchInfo : { B : { type : oracledb.BUFFER } }
        }
      );
      let resultVal = result.rows[0].B;
      compareClientFetchResult(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = result.rows[1].B;
      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
    }); // 88.2.9

    it('88.2.10 fetch the same BLOB column multiple times', async function() {
      const id = insertID++;
      const specialStr = '88.2.10';
      const contentLength = 200;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);

      const result = await connection.execute(
        "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          fetchInfo : {
            B1 : { type : oracledb.BUFFER },
            B2 : { type : oracledb.BUFFER } }
        }
      );
      let resultVal = result.rows[0].B1;
      compareClientFetchResult(resultVal, specialStr, content, contentLength);
      resultVal = result.rows[0].B2;
      compareClientFetchResult(resultVal, specialStr, content, contentLength);
    }); // 88.2.10

    it('88.2.11 works with update statement', async function() {
      const id = insertID++;
      const specialStr_1 = '88.2.11_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const specialStr_2 = '88.2.11_2';
      const contentLength_2 = 202;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");

      await insertAndFetch(id, specialStr_1, content_1, contentLength_1);
      await updateBlobTable1(id, content_2);
      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          fetchInfo : { B : { type : oracledb.BUFFER } }
        }
      );
      const resultVal = result.rows[0].B;
      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
    }); // 88.2.11

    it('88.2.12 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.2.12_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.2.12_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          fetchInfo : { B : { type : oracledb.BUFFER } }
        }
      );
      assert.strictEqual(result.rows.length, 1);
      const resultVal = result.rows[0].B;
      compareClientFetchResult(resultVal, specialStr_1, content_1, contentLength_1);

      oracledb.maxRows = maxRowsBak;
    }); // 88.2.12

    it('88.2.13 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.2.13_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.2.13_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          fetchInfo : { B : { type : oracledb.BUFFER } }
        }
      );
      let resultVal = result.rows[0].B;
      compareClientFetchResult(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = result.rows[1].B;
      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
      assert.strictEqual(result.rows.length, 2);

      oracledb.maxRows = maxRowsBak;
    }); // 88.2.13

  }); // 88.2

  describe('88.3 fetch BLOB columns by setting fetchInfo option, outFormat = oracledb.OUT_FORMAT_OBJECT and resultSet = true', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    }); // before

    after('drop table', async function() {
      await connection.execute(drop_table1);
    }); // after

    insertID = 0;
    const insertAndFetch = async function(id, specialStr, insertContent, insertContentLength) {
      await insertIntoBlobTable1(id, insertContent);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          fetchInfo : { B : { type : oracledb.BUFFER } },
          resultSet : true
        }
      );
      const row =  await result.resultSet.getRow();
      const resultVal = row.B;

      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        compareClientFetchResult(resultVal, specialStr, insertContent, insertContentLength);
      }

      await result.resultSet.close();
    };

    it('88.3.1 works with NULL value', async function() {
      const id = insertID++;
      const content = null;
      await insertAndFetch(id, null, content, null);
    }); // 88.3.1

    it('88.3.2 works with empty buffer', async function() {
      const id = insertID++;
      const content = Buffer.from("", "utf-8");
      await insertAndFetch(id, null, content, null);
    }); // 88.3.2

    it('88.3.3 works with small value', async function() {
      const id = insertID++;
      const specialStr = '88.3.3';
      const contentLength = 20;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.3.3

    it('88.3.4 works with (64K - 1) value', async function() {
      const id = insertID++;
      const specialStr = '88.3.4';
      const contentLength = 65535;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.3.4

    it('88.3.5 works with (64K + 1) value', async function() {
      const id = insertID++;
      const specialStr = '88.3.4';
      const contentLength = 65537;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.3.5

    it('88.3.6 works with (1MB + 1) value', async function() {
      const id = insertID++;
      const specialStr = '88.3.6';
      const contentLength = 1048577; // 1MB + 1
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.3.6

    it('88.3.7 works with dbms_lob.substr()', async function() {
      const id = insertID++;
      const specialStr = '88.3.7';
      const contentLength = 200;
      const specialStrLength = specialStr.length;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);

      const result = await connection.execute(
        "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) AS B1 from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          fetchInfo : { B1 : { type : oracledb.BUFFER } },
          resultSet : true
        }
      );
      const row = await result.resultSet.getRow();
      const resultVal = row.B1;
      const buffer2Compare = Buffer.from(specialStr, "utf-8");
      compareClientFetchResult(resultVal, specialStr, buffer2Compare, specialStrLength);
      await result.resultSet.close();
    }); // 88.3.7

    it('88.3.8 works with EMPTY_BLOB()', async function() {
      const id = insertID++;
      const content = "EMPTY_BLOB";
      await insertAndFetch(id, null, content, null);
    }); // 88.3.8

    it('88.3.9 fetch multiple BLOB rows as Buffer', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.3.9_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.3.9_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          fetchInfo : { B : { type : oracledb.BUFFER } },
          resultSet : true
        }
      );

      const rowNumFetched = 2;
      const row = await result.resultSet.getRows(rowNumFetched);
      let resultVal = row[0].B;
      compareClientFetchResult(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = row[1].B;
      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
      await result.resultSet.close();
    }); // 88.3.9

    it('88.3.10 fetch the same BLOB column multiple times', async function() {
      const id = insertID++;
      const specialStr = '88.3.10';
      const contentLength = 200;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);

      const result = await connection.execute(
        "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          fetchInfo : {
            B1 : { type : oracledb.BUFFER },
            B2 : { type : oracledb.BUFFER } },
          resultSet : true
        }
      );
      const row = await result.resultSet.getRow();
      let resultVal = row.B1;
      compareClientFetchResult(resultVal, specialStr, content, contentLength);
      resultVal = row.B2;
      compareClientFetchResult(resultVal, specialStr, content, contentLength);
      await result.resultSet.close();
    }); // 88.3.10

    it('88.3.11 works with update statement', async function() {
      const id = insertID++;
      const specialStr_1 = '88.3.11_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const specialStr_2 = '88.3.11_2';
      const contentLength_2 = 202;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");

      await insertAndFetch(id, specialStr_1, content_1, contentLength_1);
      await updateBlobTable1(id, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          fetchInfo : { B : { type : oracledb.BUFFER } },
          resultSet : true
        }
      );
      const row = await result.resultSet.getRow();
      const resultVal = row.B;
      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
      await result.resultSet.close();
    }); // 88.3.11

    it('88.3.12 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.3.12_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.3.12_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          fetchInfo : { B : { type : oracledb.BUFFER } },
          resultSet : true
        }
      );
      const rowNumFetched = 2;
      const row = await result.resultSet.getRows(rowNumFetched);
      assert.strictEqual(row.length, 2);
      let resultVal = row[0].B;
      compareClientFetchResult(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = row[1].B;
      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
      await result.resultSet.close();
    }); // 88.3.12

    it('88.3.13 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.3.13_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.3.13_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          fetchInfo : { B : { type : oracledb.BUFFER } },
          resultSet : true
        }
      );
      const rowNumFetched = 2;
      const row = await result.resultSet.getRows(rowNumFetched);
      assert.strictEqual(row.length, 2);
      let resultVal = row[0].B;
      compareClientFetchResult(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = row[1].B;
      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
      await result.resultSet.close();
    }); // 88.3.13

  }); // 88.3

  describe('88.4 fetch BLOB columns by setting fetchInfo option and outFormat = oracledb.OUT_FORMAT_ARRAY', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    }); // before

    after('drop table', async function() {
      await connection.execute(drop_table1);
    }); // after

    insertID = 0;
    const insertAndFetch = async function(id, specialStr, insertContent, insertContentLength) {
      await insertIntoBlobTable1(id, insertContent);
      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          fetchInfo : { B : { type : oracledb.BUFFER } }
        }
      );
      const resultVal = result.rows[0][1];
      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        compareClientFetchResult(resultVal, specialStr, insertContent, insertContentLength);
      }
    };

    it('88.4.1 works with NULL value', async function() {
      const id = insertID++;
      const content = null;
      await insertAndFetch(id, null, content, null);
    }); // 88.4.1

    it('88.4.2 works with empty Buffer', async function() {
      const id = insertID++;
      const content = Buffer.from("", "utf-8");
      await insertAndFetch(id, null, content, null);
    }); // 88.4.2

    it('88.4.3 works with small value', async function() {
      const id = insertID++;
      const specialStr = '88.4.3';
      const contentLength = 20;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.4.3

    it('88.4.4 works with (64K - 1) value', async function() {
      const id = insertID++;
      const specialStr = '88.4.4';
      const contentLength = 65535;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.4.4

    it('88.4.5 works with (64K + 1) value', async function() {
      const id = insertID++;
      const specialStr = '88.4.5';
      const contentLength = 65537;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.4.5

    it('88.4.6 works with (1MB + 1) value', async function() {
      const id = insertID++;
      const specialStr = '88.4.6';
      const contentLength = 1048577; // 1MB + 1
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.4.6

    it('88.4.7 works with dbms_lob.substr()', async function() {
      const id = insertID++;
      const specialStr = '88.4.7';
      const contentLength = 200;
      const specialStrLength = specialStr.length;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);

      const result = await connection.execute(
        "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) AS B1 from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          fetchInfo : { B1 : { type : oracledb.BUFFER } }
        }
      );
      const resultVal = result.rows[0][0];
      const buffer2Compare = Buffer.from(specialStr, "utf-8");
      compareClientFetchResult(resultVal, specialStr, buffer2Compare, specialStrLength);
    }); // 88.4.7

    it('88.4.8 works with EMPTY_BLOB()', async function() {
      const id = insertID++;
      const content = "EMPTY_BLOB";
      await insertAndFetch(id, null, content, null);
    }); // 88.4.8

    it('88.4.9 fetch multiple BLOB rows as Buffer', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.4.9_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.4.9_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          fetchInfo : { B : { type : oracledb.BUFFER } }
        }
      );
      let resultVal = result.rows[0][1];
      compareClientFetchResult(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = result.rows[1][1];
      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
    }); // 88.4.9

    it('88.4.10 fetch the same BLOB column multiple times', async function() {
      const id = insertID++;
      const specialStr = '88.4.10';
      const contentLength = 200;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);
      const result = await connection.execute(
        "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
        { },
        {
          fetchInfo : {
            B1 : { type : oracledb.BUFFER },
            B2 : { type : oracledb.BUFFER } }
        }
      );
      let resultVal = result.rows[0][1];
      compareClientFetchResult(resultVal, specialStr, content, contentLength);
      resultVal = result.rows[0][2];
      compareClientFetchResult(resultVal, specialStr, content, contentLength);
    }); // 88.4.10

    it('88.4.11 works with update statement', async function() {
      const id = insertID++;
      const specialStr_1 = '88.4.11_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const specialStr_2 = '88.4.11_2';
      const contentLength_2 = 208;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");

      await insertAndFetch(id, specialStr_1, content_1, contentLength_1);
      await updateBlobTable1(id, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          fetchInfo : { B : { type : oracledb.BUFFER } }
        }
      );
      const resultVal = result.rows[0][1];
      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
    }); // 88.4.11

    it('88.4.12 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.4.12_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.4.12_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          fetchInfo : { B : { type : oracledb.BUFFER } }
        }
      );
      assert.strictEqual(result.rows.length, 1);
      const resultVal = result.rows[0][1];
      compareClientFetchResult(resultVal, specialStr_1, content_1, contentLength_1);
      oracledb.maxRows = maxRowsBak;
    }); // 88.4.12

    it('88.4.13 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.4.13_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.4.13_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          fetchInfo : { B : { type : oracledb.BUFFER } }
        }
      );
      assert.strictEqual(result.rows.length, 2);
      let resultVal = result.rows[0][1];
      compareClientFetchResult(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = result.rows[1][1];
      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
    }); // 88.4.13

  }); // 88.4

  describe('88.5 fetch BLOB columns by setting fetchInfo option, outFormat = oracledb.OUT_FORMAT_ARRAY and resultSet = true', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    }); // before

    after('drop table', async function() {
      await connection.execute(drop_table1);
    }); // after

    insertID = 0;
    const insertAndFetch = async function(id, specialStr, insertContent, insertContentLength) {
      await insertIntoBlobTable1(id, insertContent);
      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          fetchInfo : { B : { type : oracledb.BUFFER } },
          resultSet : true
        }
      );
      const row = await result.resultSet.getRow();
      const resultVal = row[1];

      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        compareClientFetchResult(resultVal, specialStr, insertContent, insertContentLength);
      }
      await result.resultSet.close();
    };

    it('88.5.1 works with NULL value', async function() {
      const id = insertID++;
      const content = null;
      await insertAndFetch(id, null, content, null);
    }); // 88.5.1

    it('88.5.2 works with empty Buffer', async function() {
      const id = insertID++;
      const content = Buffer.from("", "utf-8");
      await insertAndFetch(id, null, content, null);
    }); // 88.5.2

    it('88.5.3 works with small value', async function() {
      const id = insertID++;
      const specialStr = '88.5.3';
      const contentLength = 20;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.5.3

    it('88.5.4 works with (64K - 1) value', async function() {
      const id = insertID++;
      const specialStr = '88.5.4';
      const contentLength = 65535;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.5.4

    it('88.5.5 works with (64K + 1) value', async function() {
      const id = insertID++;
      const specialStr = '88.5.5';
      const contentLength = 65537;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.5.5

    it('88.5.6 works with (1MB + 1) value', async function() {
      const id = insertID++;
      const specialStr = '88.5.6';
      const contentLength = 1048577; // 1MB + 1
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 88.5.6

    it('88.5.7 works with dbms_lob.substr()', async function() {
      const id = insertID++;
      const specialStr = '88.5.7';
      const contentLength = 200;
      const specialStrLength = specialStr.length;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");

      await insertIntoBlobTable1(id, content);
      const result = await connection.execute(
        "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) AS B1 from nodb_blob1 WHERE ID = :id",
        { id : id },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          fetchInfo : { B1 : { type : oracledb.BUFFER } },
          resultSet : true
        }
      );
      const row = await result.resultSet.getRow();
      const resultVal = row[0];
      const buffer2Compare = Buffer.from(specialStr, "utf-8");
      compareClientFetchResult(resultVal, specialStr, buffer2Compare, specialStrLength);
      await result.resultSet.close();
    }); // 88.5.7

    it('88.5.8 works with EMPTY_BLOB()', async function() {
      const id = insertID++;
      const content = "EMPTY_BLOB";

      await insertAndFetch(id, null, content, null);
    }); // 88.5.8

    it('88.5.9 fetch multiple BLOB rows as Buffer', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.5.9_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.5.9_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          fetchInfo : { B : { type : oracledb.BUFFER } },
          resultSet : true
        }
      );
      const rowNumFetched = 2;
      const row = await result.resultSet.getRows(rowNumFetched);
      assert.strictEqual(row.length, 2);
      let resultVal = row[0][1];
      compareClientFetchResult(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = row[1][1];
      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
      await result.resultSet.close();
    }); // 88.5.9

    it('88.5.10 fetch the same BLOB column multiple times', async function() {
      const id = insertID++;
      const specialStr = '88.5.10';
      const contentLength = 200;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");

      insertIntoBlobTable1(id, content);
      const result = await connection.execute(
        "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          fetchInfo : {
            B1 : { type : oracledb.BUFFER },
            B2 : { type : oracledb.BUFFER } },
          resultSet : true
        }
      );
      const row = await result.resultSet.getRow();
      let resultVal = row[1];
      compareClientFetchResult(resultVal, specialStr, content, contentLength);
      resultVal = row[2];
      compareClientFetchResult(resultVal, specialStr, content, contentLength);
      await result.resultSet.close();
    }); // 88.5.10

    it('88.5.11 works with update statement', async function() {
      const id = insertID++;
      const specialStr_1 = '88.5.11_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const specialStr_2 = '88.5.11_2';
      const contentLength_2 = 208;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");

      await insertAndFetch(id, specialStr_1, content_1, contentLength_1);
      await updateBlobTable1(id, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          fetchInfo : { B : { type : oracledb.BUFFER } },
          resultSet : true
        }
      );
      const row = await result.resultSet.getRow();
      const resultVal = row[1];
      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
      await  result.resultSet.close();
    }); // 88.5.11

    it('88.5.12 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.5.12_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.5.12_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          fetchInfo : { B : { type : oracledb.BUFFER } },
          resultSet : true
        }
      );

      const rowNumFetched = 2;
      const row = await result.resultSet.getRows(rowNumFetched);
      assert.strictEqual(row.length, 2);

      let resultVal = row[0][1];
      compareClientFetchResult(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = row[1][1];
      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
      await result.resultSet.close();
    }); // 88.5.12

    it('88.5.13 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '88.5.13_1';
      const contentLength_1 = 200;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '88.5.13_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoBlobTable1(id_1, content_1);
      await insertIntoBlobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat : oracledb.OUT_FORMAT_ARRAY,
          fetchInfo : { B : { type : oracledb.BUFFER } },
          resultSet : true
        }
      );

      const rowNumFetched = 2;
      const row = await result.resultSet.getRows(rowNumFetched);
      assert.strictEqual(row.length, 2);

      let resultVal = row[0][1];
      compareClientFetchResult(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = row[1][1];
      compareClientFetchResult(resultVal, specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
      await result.resultSet.close();
    }); // 88.5.13

  }); // 88.5

});

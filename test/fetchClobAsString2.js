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
 *   85. fetchClobAsString2.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - CLOB.
 *    To fetch CLOB columns as strings by setting fetchInfo option
 *    This could be very useful for smaller CLOB size as it can be fetched as string and processed in memory itself.
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const fsPromises = require('fs/promises');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');

describe('85. fetchClobAsString2.js', function() {

  let connection = null;
  let insertID = 1; // assume id for insert into db starts from 1
  const inFileName = './test/clobTmpFile.txt';
  const proc_create_table1 = "BEGIN \n" +
                          "    DECLARE \n" +
                          "        e_table_missing EXCEPTION; \n" +
                          "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                          "    BEGIN \n" +
                          "        EXECUTE IMMEDIATE('DROP TABLE nodb_clob1 PURGE'); \n" +
                          "    EXCEPTION \n" +
                          "        WHEN e_table_missing \n" +
                          "        THEN NULL; \n" +
                          "    END; \n" +
                          "    EXECUTE IMMEDIATE (' \n" +
                          "        CREATE TABLE nodb_clob1 ( \n" +
                          "            ID   NUMBER, \n" +
                          "            C    CLOB \n" +
                          "        ) \n" +
                          "    '); \n" +
                          "END; ";
  const drop_table1 = "DROP TABLE nodb_clob1 PURGE";
  const defaultStmtCache = oracledb.stmtCacheSize;

  before('get one connection', async function() {
    oracledb.stmtCacheSize = 0;
    connection = await oracledb.getConnection(dbConfig);
    await fsPromises.writeFile(inFileName, '');
  }); // before

  after('release connection', async function() {
    oracledb.stmtCacheSize = defaultStmtCache;
    await connection.close();
    await fsPromises.unlink(inFileName);
  }); // after

  const insertIntoClobTable1 = async function(id, content) {
    let result;
    if (content === "EMPTY_CLOB") {
      result = await connection.execute(
        "INSERT INTO nodb_clob1 VALUES (:ID, EMPTY_CLOB())",
        [ id ]
      );
      assert.strictEqual(result.rowsAffected, 1);
    } else {
      result = await connection.execute(
        "INSERT INTO nodb_clob1 VALUES (:ID, :C)",
        {
          ID: { val: id },
          C: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING }
        }
      );
      assert.strictEqual(result.rowsAffected, 1);
    }
  };

  const updateClobTable1 = async function(id, content) {
    const result = await connection.execute(
      "UPDATE nodb_clob1 set C = :C where ID = :ID",
      { ID: id, C: content }
    );
    assert.strictEqual(result.rowsAffected, 1);
  };

  // compare fetch result (two strings)
  const compareStrings = function(resultVal, specialStr, content, contentLength) {
    const specialStrLen = specialStr.length;
    const resultLen = resultVal.length;
    assert.strictEqual(resultLen, contentLength);
    assert.strictEqual(resultVal.substring(0, specialStrLen), specialStr);
    assert.strictEqual(resultVal.substring(resultLen - specialStrLen, resultLen), specialStr);
  };

  describe('85.1 fetch CLOB columns by setting fetchInfo option', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    }); // before

    after('drop table', async function() {
      await connection.execute(drop_table1);
    }); // after

    insertID = 0;
    const insertAndFetch = async function(id, specialStr, insertContent, insertContentLength) {
      await insertIntoClobTable1(id, insertContent);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE ID = :id",
        { id: id },
        {
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      const resultVal = result.rows[0][1];
      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        compareStrings(resultVal, specialStr, insertContent, insertContentLength);
      }
    };

    it('85.1.1 works with NULL value', async function() {
      const id = insertID++;
      const content = null;

      await insertAndFetch(id, null, content, null);
    }); // 85.1.1

    it('85.1.2 works with empty String', async function() {
      const id = insertID++;
      const content = "";

      await insertAndFetch(id, null, content, null);
    }); // 85.1.2

    it('85.1.3 works with small value', async function() {
      const id = insertID++;
      const specialStr = '85.1.3';
      const contentLength = 20;
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.1.3

    it('85.1.4 works with (64K - 1) value', async function() {
      const id = insertID++;
      const specialStr = '85.1.4';
      const contentLength = 65535;
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.1.4

    it('85.1.5 works with (64K + 1) value', async function() {
      const id = insertID++;
      const specialStr = '85.1.5';
      const contentLength = 65537;
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.1.5

    it('85.1.6 works with (1MB + 1) value', async function() {
      const id = insertID++;
      const specialStr = '85.1.6';
      const contentLength = 1048577; // 1MB + 1
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.1.6

    it('85.1.7 works with dbms_lob.substr()', async function() {
      const id = insertID++;
      const specialStr = '85.1.7';
      const contentLength = 200;
      const specialStrLength = specialStr.length;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);

      const result = await connection.execute(
        "SELECT dbms_lob.substr(C, " + specialStrLength + ", 1) AS C1 from nodb_clob1 WHERE ID = :id",
        { id: id },
        {
          fetchInfo: { C1: { type: oracledb.STRING } }
        }
      );
      const resultVal = result.rows[0][0];
      compareStrings(resultVal, specialStr, content, specialStrLength);
    }); // 85.1.7

    it('85.1.8 works with EMPTY_CLOB()', async function() {
      const id = insertID++;
      const content = "EMPTY_CLOB";

      await insertAndFetch(id, null, content, null);
    }); // 85.1.8

    it('85.1.9 fetch multiple CLOB rows as String', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.1.9_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.1.9_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2,
        { },
        {
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      let resultVal = result.rows[0][1];
      compareStrings(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = result.rows[1][1];
      compareStrings(resultVal, specialStr_2, content_2, contentLength_2);
    }); // 85.1.9

    it('85.1.10 fetch the same CLOB column multiple times', async function() {
      const id = insertID++;
      const specialStr = '85.1.10';
      const contentLength = 200;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);

      const result = await connection.execute(
        "SELECT ID, C AS C1, C AS C2 from nodb_clob1 WHERE ID = " + id,
        { },
        {
          fetchInfo: {
            C1: { type: oracledb.STRING },
            C2: { type: oracledb.STRING } }
        }
      );
      let resultVal = result.rows[0][1];
      compareStrings(resultVal, specialStr, content, contentLength);
      resultVal = result.rows[0][2];
      compareStrings(resultVal, specialStr, content, contentLength);
    }); // 85.1.10

    it('85.1.11 works with update statement', async function() {
      const id = insertID++;
      const specialStr_1 = '85.1.11_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const specialStr_2 = '85.1.11_2';
      const contentLength_2 = 208;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertAndFetch(id, specialStr_1, content_1, contentLength_1);
      await updateClobTable1(id, content_2);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE ID = " + id,
        { },
        {
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      const resultVal = result.rows[0][1];
      compareStrings(resultVal, specialStr_2, content_2, contentLength_2);
    }); // 85.1.11

    it('85.1.12 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.1.12_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.1.12_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      assert.strictEqual(result.rows.length, 1);
      const resultVal = result.rows[0][1];
      compareStrings(resultVal, specialStr_1, content_1, contentLength_1);
      oracledb.maxRows = maxRowsBak;
    }); // 85.1.12

    it('85.1.13 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.1.13_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.1.13_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      assert.strictEqual(result.rows.length, 2);
      let resultVal = result.rows[0][1];
      compareStrings(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = result.rows[1][1];
      compareStrings(resultVal, specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
    }); // 85.1.13

    it('85.1.14 works with connection.queryStream()', async function() {
      const id = insertID++;
      const specialStr = '85.1.14';
      const contentLength = 200;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);

      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id;
      const stream = connection.queryStream(sql, {}, { fetchInfo: { C: { type: oracledb.STRING } } });
      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', (data) => {
          const result = data[1];
          assert.strictEqual(typeof result, "string");
          compareStrings(result, specialStr, content, contentLength);
          counter++;
        });
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
      });
      assert.strictEqual(counter, 1);
    }); // 85.1.14

    it('85.1.15 works with connection.queryStream() and oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.1.15_1';
      const contentLength_1 = 26;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.1.15_2';
      const contentLength_2 = 30;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 20;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2;
      const stream = connection.queryStream(sql, {}, { fetchInfo: { C: { type: oracledb.STRING } } });
      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', (data) => {
          const result = data[1];
          assert.strictEqual(typeof result, "string");
          counter++;
          if (counter === 1) {
            compareStrings(result, specialStr_1, content_1, contentLength_1);
          } else {
            compareStrings(result, specialStr_2, content_2, contentLength_2);
          }
        });
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
      });
      assert.strictEqual(counter, 2);
      oracledb.maxRows = maxRowsBak;
    }); // 85.1.15

    it('85.1.16 works with connection.queryStream() and oracledb.maxRows = actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.1.16_1';
      const contentLength_1 = 26;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.1.16_2';
      const contentLength_2 = 30;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 2;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);

      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2;
      const stream = connection.queryStream(sql, {}, { fetchInfo: { C: { type: oracledb.STRING } } });
      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', (data) => {
          const result = data[1];
          assert.strictEqual(typeof result, "string");
          counter++;
          if (counter === 1) {
            compareStrings(result, specialStr_1, content_1, contentLength_1);
          } else {
            compareStrings(result, specialStr_2, content_2, contentLength_2);
          }
        });
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
      });
      assert.strictEqual(counter, 2);
      oracledb.maxRows = maxRowsBak;
    }); // 85.1.16

    it('85.1.17 works with connection.queryStream() and oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.1.17_1';
      const contentLength_1 = 26;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.1.17_2';
      const contentLength_2 = 30;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2;
      const stream = connection.queryStream(sql, {}, { fetchInfo: { C: { type: oracledb.STRING } } });
      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', (data) => {
          const result = data[1];
          assert.strictEqual(typeof result, "string");
          counter++;
          if (counter === 1) {
            compareStrings(result, specialStr_1, content_1, contentLength_1);
          } else {
            compareStrings(result, specialStr_2, content_2, contentLength_2);
          }
        });
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
      });
      assert.strictEqual(counter, 2);
      oracledb.maxRows = maxRowsBak;
    }); // 85.1.17

    it('85.1.18 works with REF CURSOR', async function() {
      const id = insertID++;
      const specialStr = '85.1.18';
      const contentLength = 26;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);

      const ref_proc = "CREATE OR REPLACE PROCEDURE nodb_ref(clob_cursor OUT SYS_REFCURSOR)\n" +
                         "AS \n" +
                         "BEGIN \n" +
                         "    OPEN clob_cursor FOR \n" +
                         "        SELECT C from nodb_clob1 WHERE ID = " + id + "; \n" +
                         "END;";
      await connection.execute(ref_proc);
      const sql = "BEGIN nodb_ref(:c); END;";
      const bindVar = {
        c: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute(
        sql,
        bindVar,
        { fetchInfo: { C: { type: oracledb.STRING } } }
      );
      const rows = await result.outBinds.c.getRows(3);
      const resultVal = rows[0][0];
      assert.strictEqual(typeof resultVal, 'string');
      compareStrings(resultVal, specialStr, content, contentLength);
      await result.outBinds.c.close();

      const ref_proc_drop = "DROP PROCEDURE nodb_ref";
      await connection.execute(ref_proc_drop);
    }); // 85.1.18

  }); // 85.1

  describe('85.2 fetch CLOB columns by setting fetchInfo option and outFormat = oracledb.OUT_FORMAT_OBJECT', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    }); // before

    after('drop table', async function() {
      await connection.execute(drop_table1);
    }); // after

    insertID = 0;
    const insertAndFetch = async function(id, specialStr, insertContent, insertContentLength) {
      await insertIntoClobTable1(id, insertContent);
      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE ID = :id",
        { id: id },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      const resultVal = result.rows[0].C;
      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        compareStrings(resultVal, specialStr, insertContent, insertContentLength);
      }
    };

    it('85.2.1 works with NULL value', async function() {
      const id = insertID++;
      const content = null;

      await insertAndFetch(id, null, content, null);
    }); // 85.2.1

    it('85.2.2 works with empty buffer', async function() {
      const id = insertID++;
      const content = "";

      await insertAndFetch(id, null, content, null);
    }); // 85.2.2

    it('85.2.3 works with small value', async function() {
      const id = insertID++;
      const specialStr = '85.2.3';
      const contentLength = 20;
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.2.3

    it('85.2.4 works with (64K - 1) value', async function() {
      const id = insertID++;
      const specialStr = '85.2.4';
      const contentLength = 65535;
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.2.4

    it('85.2.5 works with (64K + 1) value', async function() {
      const id = insertID++;
      const specialStr = '85.2.5';
      const contentLength = 65537;
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.2.5

    it('85.2.6 works with (1MB + 1) value', async function() {
      const id = insertID++;
      const specialStr = '85.2.6';
      const contentLength = 1048577; // 1MB + 1
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.2.6

    it('85.2.7 works with dbms_lob.substr()', async function() {
      const id = insertID++;
      const specialStr = '85.2.7';
      const contentLength = 200;
      const specialStrLength = specialStr.length;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);

      const result = await connection.execute(
        "SELECT dbms_lob.substr(C, " + specialStrLength + ", 1) AS C1 from nodb_clob1 WHERE ID = :id",
        { id: id },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { C1: { type: oracledb.STRING } }
        }
      );
      const resultVal = result.rows[0].C1;
      compareStrings(resultVal, specialStr, specialStr, specialStrLength);
    }); // 85.2.7

    it('85.2.8 works with EMPTY_CLOB()', async function() {
      const id = insertID++;
      const content = "EMPTY_CLOB";

      await insertAndFetch(id, null, content, null);
    }); // 85.2.8

    it('85.2.9 fetch multiple CLOB rows as String', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.2.9_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.2.9_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      let resultVal = result.rows[0].C;
      compareStrings(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = result.rows[1].C;
      compareStrings(resultVal, specialStr_2, content_2, contentLength_2);
    }); // 85.2.9

    it('85.2.10 fetch the same CLOB column multiple times', async function() {
      const id = insertID++;
      const specialStr = '85.2.10';
      const contentLength = 200;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);

      const result = await connection.execute(
        "SELECT ID, C AS C1, C AS C2 from nodb_clob1 WHERE ID = " + id,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: {
            C1: { type: oracledb.STRING },
            C2: { type: oracledb.STRING } }
        }
      );
      let resultVal = result.rows[0].C1;
      compareStrings(resultVal, specialStr, content, contentLength);
      resultVal = result.rows[0].C2;
      compareStrings(resultVal, specialStr, content, contentLength);
    }); // 85.2.10

    it('85.2.11 works with update statement', async function() {
      const id = insertID++;
      const specialStr_1 = '85.2.11_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const specialStr_2 = '85.2.11_2';
      const contentLength_2 = 202;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertAndFetch(id, specialStr_1, content_1, contentLength_1);
      await updateClobTable1(id, content_2);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE ID = " + id,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      const resultVal = result.rows[0].C;
      compareStrings(resultVal, specialStr_2, content_2, contentLength_2);
    }); // 85.2.11

    it('85.2.12 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.2.12_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.2.12_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      assert.strictEqual(result.rows.length, 1);
      const resultVal = result.rows[0].C;
      compareStrings(resultVal, specialStr_1, content_1, contentLength_1);
      oracledb.maxRows = maxRowsBak;
    }); // 85.2.12

    it('85.2.13 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.2.13_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.2.13_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      let resultVal = result.rows[0].C;
      compareStrings(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = result.rows[1].C;
      compareStrings(resultVal, specialStr_2, content_2, contentLength_2);
      assert.strictEqual(result.rows.length, 2);
      oracledb.maxRows = maxRowsBak;
    }); // 85.2.13

    it('85.2.14 works with REF CURSOR', async function() {
      const id = insertID++;
      const specialStr = '85.2.14';
      const contentLength = 26;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const ref_proc = "CREATE OR REPLACE PROCEDURE nodb_ref(clob_cursor OUT SYS_REFCURSOR)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    OPEN clob_cursor FOR \n" +
                      "        SELECT C from nodb_clob1 WHERE ID = " + id + "; \n" +
                      "END;";
      await connection.execute(ref_proc);

      const sql = "BEGIN nodb_ref(:c); END;";
      const bindVar = {
        c: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute(
        sql,
        bindVar,
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      const rows = await result.outBinds.c.getRows(3);
      const resultVal = rows[0].C;
      assert.strictEqual(typeof resultVal, 'string');
      compareStrings(resultVal, specialStr, content, contentLength);
      await result.outBinds.c.close();
    }); //85.2.14

  }); // 85.2

  describe('85.3 fetch CLOB columns by setting fetchInfo option, outFormat = oracledb.OUT_FORMAT_OBJECT and resultSet = true', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    }); // before

    after('drop table', async function() {
      await connection.execute(drop_table1);
    }); // after

    insertID = 0;
    const insertAndFetch = async function(id, specialStr, insertContent, insertContentLength) {
      await insertIntoClobTable1(id, insertContent);
      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE ID = :id",
        { id: id },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { C: { type: oracledb.STRING } },
          resultSet: true
        }
      );
      const row = await result.resultSet.getRow();
      const resultVal = row.C;

      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        compareStrings(resultVal, specialStr, insertContent, insertContentLength);
      }
      await result.resultSet.close();
    };

    it('85.3.1 works with NULL value', async function() {
      const id = insertID++;
      const content = null;

      await insertAndFetch(id, null, content, null);
    }); // 85.3.1

    it('85.3.2 works with empty buffer', async function() {
      const id = insertID++;
      const content = "";

      await insertAndFetch(id, null, content, null);
    }); // 85.3.2

    it('85.3.3 works with small value', async function() {
      const id = insertID++;
      const specialStr = '85.3.3';
      const contentLength = 20;
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.3.3

    it('85.3.4 works with (64K - 1) value', async function() {
      const id = insertID++;
      const specialStr = '85.3.4';
      const contentLength = 65535;
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.3.4

    it('85.3.5 works with (64K + 1) value', async function() {
      const id = insertID++;
      const specialStr = '85.3.4';
      const contentLength = 65537;
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.3.5

    it('85.3.6 works with (1MB + 1) value', async function() {
      const id = insertID++;
      const specialStr = '85.3.6';
      const contentLength = 1048577; // 1MB + 1
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.3.6

    it('85.3.7 works with dbms_lob.substr()', async function() {
      const id = insertID++;
      const specialStr = '85.3.7';
      const contentLength = 200;
      const specialStrLength = specialStr.length;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const result = await connection.execute(
        "SELECT dbms_lob.substr(C, " + specialStrLength + ", 1) AS C1 from nodb_clob1 WHERE ID = :id",
        { id: id },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { C1: { type: oracledb.STRING } },
          resultSet: true
        }
      );
      const row = await result.resultSet.getRow();
      const resultVal = row.C1;
      compareStrings(resultVal, specialStr, specialStr, specialStrLength);
      await result.resultSet.close();
    }); // 85.3.7

    it('85.3.8 works with EMPTY_CLOB()', async function() {
      const id = insertID++;
      const content = "EMPTY_CLOB";

      await insertAndFetch(id, null, content, null);
    }); // 85.3.8

    it('85.3.9 fetch multiple CLOB rows as String', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.3.9_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.3.9_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { C: { type: oracledb.STRING } },
          resultSet: true
        }
      );

      const rowNumFetched = 2;
      const row = await result.resultSet.getRows(rowNumFetched);
      let resultVal = row[0].C;
      compareStrings(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = row[1].C;
      compareStrings(resultVal, specialStr_2, content_2, contentLength_2);
      await result.resultSet.close();
    }); // 85.3.9

    it('85.3.10 fetch the same CLOB column multiple times', async function() {
      const id = insertID++;
      const specialStr = '85.3.10';
      const contentLength = 200;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);

      const result = await connection.execute(
        "SELECT ID, C AS C1, C AS C2 from nodb_clob1 WHERE ID = " + id,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: {
            C1: { type: oracledb.STRING },
            C2: { type: oracledb.STRING } },
          resultSet: true
        }
      );
      const row = await result.resultSet.getRow();
      let resultVal = row.C1;
      compareStrings(resultVal, specialStr, content, contentLength);
      resultVal = row.C2;
      compareStrings(resultVal, specialStr, content, contentLength);
      await result.resultSet.close();
    }); // 85.3.10

    it('85.3.11 works with update statement', async function() {
      const id = insertID++;
      const specialStr_1 = '85.3.11_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const specialStr_2 = '85.3.11_2';
      const contentLength_2 = 202;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertAndFetch(id, specialStr_1, content_1, contentLength_1);
      await updateClobTable1(id, content_2);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE ID = " + id,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { C: { type: oracledb.STRING } },
          resultSet: true
        }
      );
      const row = await result.resultSet.getRow();
      const resultVal = row.C;
      compareStrings(resultVal, specialStr_2, content_2, contentLength_2);
      await result.resultSet.close();
    }); // 85.3.11

    it('85.3.12 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.3.12_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.3.12_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { C: { type: oracledb.STRING } },
          resultSet: true
        }
      );
      const rowNumFetched = 2;
      const row = await result.resultSet.getRows(rowNumFetched);
      assert.strictEqual(row.length, 2);
      let resultVal = row[0].C;
      compareStrings(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = row[1].C;
      compareStrings(resultVal, specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
      await result.resultSet.close();
    }); // 85.3.12

    it('85.3.13 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.3.13_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.3.13_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { C: { type: oracledb.STRING } },
          resultSet: true
        }
      );

      const rowNumFetched = 2;
      const row = await result.resultSet.getRows(rowNumFetched);
      assert.strictEqual(row.length, 2);
      let resultVal = row[0].C;
      compareStrings(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = row[1].C;
      compareStrings(resultVal, specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
      await result.resultSet.close();
    }); // 85.3.13

  }); // 85.3

  describe('85.4 fetch CLOB columns by setting fetchInfo option and outFormat = oracledb.OUT_FORMAT_ARRAY', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    }); // before

    after('drop table', async function() {
      await connection.execute(drop_table1);
    }); // after

    insertID = 0;
    const insertAndFetch = async function(id, specialStr, insertContent, insertContentLength) {
      await insertIntoClobTable1(id, insertContent);
      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE ID = :id",
        { id: id },
        {
          outFormat: oracledb.OUT_FORMAT_ARRAY,
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      const resultVal = result.rows[0][1];
      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        compareStrings(resultVal, specialStr, insertContent, insertContentLength);
      }
    };

    it('85.4.1 works with NULL value', async function() {
      const id = insertID++;
      const content = null;

      await insertAndFetch(id, null, content, null);
    }); // 85.4.1

    it('85.4.2 works with empty String', async function() {
      const id = insertID++;
      const content = "";

      await insertAndFetch(id, null, content, null);
    }); // 85.4.2

    it('85.4.3 works with small value', async function() {
      const id = insertID++;
      const specialStr = '85.4.3';
      const contentLength = 20;
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.4.3

    it('85.4.4 works with (64K - 1) value', async function() {
      const id = insertID++;
      const specialStr = '85.4.4';
      const contentLength = 65535;
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.4.4

    it('85.4.5 works with (64K + 1) value', async function() {
      const id = insertID++;
      const specialStr = '85.4.5';
      const contentLength = 65537;
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.4.5

    it('85.4.6 works with (1MB + 1) value', async function() {
      const id = insertID++;
      const specialStr = '85.4.6';
      const contentLength = 1048577; // 1MB + 1
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.4.6

    it('85.4.7 works with dbms_lob.substr()', async function() {
      const id = insertID++;
      const specialStr = '85.4.7';
      const contentLength = 200;
      const specialStrLength = specialStr.length;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const result = await connection.execute(
        "SELECT dbms_lob.substr(C, " + specialStrLength + ", 1) AS C1 from nodb_clob1 WHERE ID = :id",
        { id: id },
        {
          fetchInfo: { C1: { type: oracledb.STRING } }
        }
      );
      const resultVal = result.rows[0][0];
      compareStrings(resultVal, specialStr, specialStr, specialStrLength);
    }); // 85.4.7

    it('85.4.8 works with EMPTY_CLOB()', async function() {
      const id = insertID++;
      const content = "EMPTY_CLOB";

      await insertAndFetch(id, null, content, null);
    }); // 85.4.8

    it('85.4.9 fetch multiple CLOB rows as String', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.4.9_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.4.9_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_ARRAY,
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      let resultVal = result.rows[0][1];
      compareStrings(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = result.rows[1][1];
      compareStrings(resultVal, specialStr_2, content_2, contentLength_2);
    }); // 85.4.9

    it('85.4.10 fetch the same CLOB column multiple times', async function() {
      const id = insertID++;
      const specialStr = '85.4.10';
      const contentLength = 200;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const result = await  connection.execute(
        "SELECT ID, C AS C1, C AS C2 from nodb_clob1 WHERE ID = " + id,
        { },
        {
          fetchInfo: {
            C1: { type: oracledb.STRING },
            C2: { type: oracledb.STRING } }
        }
      );
      let resultVal = result.rows[0][1];
      compareStrings(resultVal, specialStr, content, contentLength);
      resultVal = result.rows[0][2];
      compareStrings(resultVal, specialStr, content, contentLength);
    }); // 85.4.10

    it('85.4.11 works with update statement', async function() {
      const id = insertID++;
      const specialStr_1 = '85.4.11_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const specialStr_2 = '85.4.11_2';
      const contentLength_2 = 208;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertAndFetch(id, specialStr_1, content_1, contentLength_1);
      await updateClobTable1(id, content_2);

      const result =  await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE ID = " + id,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_ARRAY,
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      const resultVal = result.rows[0][1];
      compareStrings(resultVal, specialStr_2, content_2, contentLength_2);
    }); // 85.4.11

    it('85.4.12 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.4.12_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.4.12_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_ARRAY,
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      assert.strictEqual(result.rows.length, 1);
      const resultVal = result.rows[0][1];
      compareStrings(resultVal, specialStr_1, content_1, contentLength_1);
      oracledb.maxRows = maxRowsBak;
    }); // 85.4.12

    it('85.4.13 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.4.13_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.4.13_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_ARRAY,
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      assert.strictEqual(result.rows.length, 2);
      let resultVal = result.rows[0][1];
      compareStrings(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = result.rows[1][1];
      compareStrings(resultVal, specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
    }); // 85.4.13

    it('85.4.14 works with REF CURSOR', async function() {
      const id = insertID++;
      const specialStr = '85.4.14';
      const contentLength = 100;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const ref_proc = "CREATE OR REPLACE PROCEDURE nodb_ref(clob_cursor OUT SYS_REFCURSOR)\n" +
      "AS \n" +
      "BEGIN \n" +
      "    OPEN clob_cursor FOR \n" +
      "        SELECT C from nodb_clob1 WHERE ID = " + id + "; \n" +
      "END;";
      await connection.execute(ref_proc);

      const sql = "BEGIN nodb_ref(:c); END;";
      const bindVar = {
        c: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute(
        sql,
        bindVar,
        {
          outFormat: oracledb.OUT_FORMAT_ARRAY,
          fetchInfo: { C: { type: oracledb.STRING } }
        }
      );
      const rows = await result.outBinds.c.getRows(3);
      const resultVal = rows[0][0];
      compareStrings(resultVal, specialStr, content, contentLength);
      await result.outBinds.c.close();

      const ref_proc_drop = "DROP PROCEDURE nodb_ref";
      await connection.execute(ref_proc_drop);
    }); //  85.4.14

  }); // 85.4

  describe('85.5 fetch CLOB columns by setting fetchInfo option, outFormat = oracledb.OUT_FORMAT_ARRAY and resultSet = true', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    }); // before

    after('drop table', async function() {
      await connection.execute(drop_table1);
    }); // after

    insertID = 0;
    const insertAndFetch = async function(id, specialStr, insertContent, insertContentLength) {
      await insertIntoClobTable1(id, insertContent);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE ID = :id",
        { id: id },
        {
          outFormat: oracledb.OUT_FORMAT_ARRAY,
          fetchInfo: { C: { type: oracledb.STRING } },
          resultSet: true
        }
      );
      const row = await result.resultSet.getRow();

      const resultVal = row[1];
      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        compareStrings(resultVal, specialStr, insertContent, insertContentLength);
      }
      await result.resultSet.close();
    };

    it('85.5.1 works with NULL value', async function() {
      const id = insertID++;
      const content = null;

      await insertAndFetch(id, null, content, null);
    }); // 85.5.1

    it('85.5.2 works with empty String', async function() {
      const id = insertID++;
      const content = "";

      await insertAndFetch(id, null, content, null);
    }); // 85.5.2

    it('85.5.3 works with small value', async function() {
      const id = insertID++;
      const specialStr = '85.5.3';
      const contentLength = 20;
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.5.3

    it('85.5.4 works with (64K - 1) value', async function() {
      const id = insertID++;
      const specialStr = '85.5.4';
      const contentLength = 65535;
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.5.4

    it('85.5.5 works with (64K + 1) value', async function() {
      const id = insertID++;
      const specialStr = '85.5.5';
      const contentLength = 65537;
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.5.5

    it('85.5.6 works with (1MB + 1) value', async function() {
      const id = insertID++;
      const specialStr = '85.5.6';
      const contentLength = 1048577; // 1MB + 1
      const content = random.getRandomString(contentLength, specialStr);

      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 85.5.6

    it('85.5.7 works with dbms_lob.substr()', async function() {
      const id = insertID++;
      const specialStr = '85.5.7';
      const contentLength = 200;
      const specialStrLength = specialStr.length;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const result = await connection.execute(
        "SELECT dbms_lob.substr(C, " + specialStrLength + ", 1) AS C1 from nodb_clob1 WHERE ID = :id",
        { id: id },
        {
          outFormat: oracledb.OUT_FORMAT_ARRAY,
          fetchInfo: { C1: { type: oracledb.STRING } },
          resultSet: true
        }
      );
      const row = await result.resultSet.getRow();
      const resultVal = row[0];
      compareStrings(resultVal, specialStr, specialStr, specialStrLength);
      await result.resultSet.close();
    }); // 85.5.7

    it('85.5.8 works with EMPTY_CLOB()', async function() {
      const id = insertID++;
      const content = "EMPTY_CLOB";

      await insertAndFetch(id, null, content, null);
    }); // 85.5.8

    it('85.5.9 fetch multiple CLOB rows as String', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.5.9_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.5.9_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_ARRAY,
          fetchInfo: { C: { type: oracledb.STRING } },
          resultSet: true
        }
      );

      const rowNumFetched = 2;
      const row = await result.resultSet.getRows(rowNumFetched);
      assert.strictEqual(row.length, 2);
      let resultVal = row[0][1];
      compareStrings(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = row[1][1];
      compareStrings(resultVal, specialStr_2, content_2, contentLength_2);
      await result.resultSet.close();
    }); // 85.5.9

    it('85.5.10 fetch the same CLOB column multiple times', async function() {
      const id = insertID++;
      const specialStr = '85.5.10';
      const contentLength = 200;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);

      const result = await connection.execute(
        "SELECT ID, C AS C1, C AS C2 from nodb_clob1 WHERE ID = " + id,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_ARRAY,
          fetchInfo: {
            C1: { type: oracledb.STRING },
            C2: { type: oracledb.STRING } },
          resultSet: true
        }
      );
      const row = await result.resultSet.getRow();
      let resultVal = row[1];
      compareStrings(resultVal, specialStr, content, contentLength);
      resultVal = row[2];
      compareStrings(resultVal, specialStr, content, contentLength);

      await result.resultSet.close();
    }); // 85.5.10

    it('85.5.11 works with update statement', async function() {
      const id = insertID++;
      const specialStr_1 = '85.5.11_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const specialStr_2 = '85.5.11_2';
      const contentLength_2 = 208;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertAndFetch(id, specialStr_1, content_1, contentLength_1);
      await updateClobTable1(id, content_2);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE ID = " + id,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_ARRAY,
          fetchInfo: { C: { type: oracledb.STRING } },
          resultSet: true
        }
      );
      const row = await result.resultSet.getRow();
      const resultVal = row[1];
      compareStrings(resultVal, specialStr_2, content_2, contentLength_2);

      await result.resultSet.close();
    }); // 85.5.11

    it('85.5.12 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.5.12_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.5.12_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_ARRAY,
          fetchInfo: { C: { type: oracledb.STRING } },
          resultSet: true
        }
      );
      const rowNumFetched = 2;
      const row = await result.resultSet.getRows(rowNumFetched);
      assert.strictEqual(row.length, 2);

      let resultVal = row[0][1];
      compareStrings(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = row[1][1];
      oracledb.maxRows = maxRowsBak;
      await result.resultSet.close();
    }); // 85.5.12

    it('85.5.13 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '85.5.13_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '85.5.13_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);

      const result = await connection.execute(
        "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2,
        { },
        {
          outFormat: oracledb.OUT_FORMAT_ARRAY,
          fetchInfo: { C: { type: oracledb.STRING } },
          resultSet: true
        }
      );
      const rowNumFetched = 2;
      const row = await result.resultSet.getRows(rowNumFetched);
      assert.strictEqual(row.length, 2);

      let resultVal = row[0][1];
      compareStrings(resultVal, specialStr_1, content_1, contentLength_1);
      resultVal = row[1][1];
      oracledb.maxRows = maxRowsBak;
      await result.resultSet.close();
    }); // 85.5.13

  }); // 85.5

});

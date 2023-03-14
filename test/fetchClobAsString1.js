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
 *   84. fetchClobAsString.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - CLOB.
 *    To fetch CLOB columns as strings by setting oracledb.fetchAsString
 *    This could be very useful for smaller CLOB size as it can be fetched as string and processed in memory itself.
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const fs       = require('fs');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');

describe('84. fetchClobAsString1.js', function() {

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
    await fs.promises.writeFile(inFileName, '');
  }); // before

  after('release connection', async function() {
    oracledb.stmtCacheSize = defaultStmtCache;
    await connection.close();
    await fs.promises.unlink(inFileName);
  });  // after

  const insertIntoClobTable1 = async function(id, content) {
    if (content == "EMPTY_CLOB") {
      const result = await connection.execute(
        "INSERT INTO nodb_clob1 VALUES (:ID, EMPTY_CLOB())", [ id ]);
      assert.strictEqual(result.rowsAffected, 1);
    } else {
      const sql = "INSERT INTO nodb_clob1 VALUES (:ID, :C)";
      const binds = {
        ID : { val : id },
        C : { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };
      const result = await connection.execute(sql, binds);
      assert.strictEqual(result.rowsAffected, 1);
    }
  };

  const updateClobTable1 = async function(id, content) {
    const sql = "UPDATE nodb_clob1 set C = :C where ID = :ID";
    const binds = { ID: id, C: content };
    const result = await connection.execute(sql, binds);
    assert.strictEqual(result.rowsAffected, 1);
  };

  // compare two string
  const compareStrings = function(resultVal, specialStr, content, contentLength) {
    const specialStrLen = specialStr.length;
    const resultLen = resultVal.length;
    assert.strictEqual(resultLen, contentLength);
    assert.strictEqual(resultVal.substring(0, specialStrLen), specialStr);
    assert.strictEqual(resultVal.substring(resultLen - specialStrLen, resultLen), specialStr);
  };

  describe('84.1 fetch CLOB columns by setting oracledb.fetchAsString',  function() {

    before('create Table and populate', async function() {
      await connection.execute(proc_create_table1);
    });

    after('drop table', async function() {
      await connection.execute(drop_table1);
    });

    beforeEach('set oracledb.fetchAsString', function() {
      oracledb.fetchAsString = [ oracledb.CLOB ];
    });

    afterEach('clear the By type specification', function() {
      oracledb.fetchAsString = [];
    });

    const insertAndFetch = async function(id, specialStr, insertContent, insertContentLength) {
      await insertIntoClobTable1(id, insertContent);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = :id";
      const binds = { id : id };
      const result = await connection.execute(sql, binds);
      if (specialStr === null) {
        assert.strictEqual(result.rows[0][1], null);
      } else {
        compareStrings(result.rows[0][1], specialStr, insertContent, insertContentLength);
      }
    };

    it('84.1.1 works with NULL value', async function() {
      const id = insertID++;
      const content = null;
      await insertAndFetch(id, null, content, null);
    }); // 84.1.1

    it('84.1.2 works with empty string', async function() {
      const id = insertID++;
      const content = "";
      await insertAndFetch(id, null, content, null);
    }); // 84.1.2

    it('84.1.3 works with small CLOB data', async function() {
      const id = insertID++;
      const specialStr = '84.1.3';
      const contentLength = 26;
      const content = random.getRandomString(contentLength, specialStr);
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 84.1.3

    it('84.1.4 works with (64K - 1) data', async function() {
      const id = insertID++;
      const specialStr = '84.1.4';
      const contentLength = 65535;
      const content = random.getRandomString(contentLength, specialStr);
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 84.1.4

    it('84.1.5 works with (64K + 1) data', async function() {
      const id = insertID++;
      const specialStr = '84.1.5';
      const contentLength = 65537;
      const content = random.getRandomString(contentLength, specialStr);
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 84.1.5

    it('84.1.6 works with (1MB + 1) data', async function() {
      const id = insertID++;
      const specialStr = '84.1.6';
      const contentLength = 1048577; // 1MB + 1
      const content = random.getRandomString(contentLength, specialStr);
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 84.1.6

    it('84.1.7 fetch with substr()', async function() {
      const id = insertID++;
      const specialStr = '84.1.7';
      const specialStrLen = specialStr.length;
      const contentLength = 100;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const sql = "SELECT substr(C, 1, " + specialStrLen + ") from nodb_clob1 WHERE ID = :id";
      const result = await connection.execute(sql, { id : id });
      compareStrings(result.rows[0][0], specialStr, specialStr, specialStrLen);
    }); // 84.1.7

    it('84.1.8 works with EMPTY_CLOB()', async function() {
      const id = insertID++;
      const content = "EMPTY_CLOB";
      await insertAndFetch(id, null, content, null);
    }); // 84.1.8

    it('84.1.9 fetch multiple CLOB columns as String', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.1.9_1';
      const contentLength_1 = 26;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.1.9_2';
      const contentLength_2 = 30;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 where id = " + id_1 + " or id = " + id_2;
      const result = await connection.execute(sql);
      compareStrings(result.rows[0][1], specialStr_1, content_1, contentLength_1);
      compareStrings(result.rows[1][1], specialStr_2, content_2, contentLength_2);
    }); // 84.1.9

    it('84.1.10 fetch the same CLOB column multiple times', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.1.10_1';
      const contentLength_1 = 20;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.1.10_2';
      const contentLength_2 = 36;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C AS C1, C AS C2 from nodb_clob1 where id = " + id_1 + " or id = " + id_2;
      const result = await connection.execute(sql);
      compareStrings(result.rows[0][1], specialStr_1, content_1, contentLength_1);
      compareStrings(result.rows[0][2], specialStr_1, content_1, contentLength_1);
      compareStrings(result.rows[1][1], specialStr_2, content_2, contentLength_2);
      compareStrings(result.rows[1][2], specialStr_2, content_2, contentLength_2);
    }); // 84.1.10

    it('84.1.11 works with update statement', async function() {
      const id = insertID++;
      const specialStr_1 = '84.1.11_1';
      const contentLength_1 = 26;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const specialStr_2 = '84.1.11_2';
      const contentLength_2 = 30;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertAndFetch(id, specialStr_1, content_1, contentLength_1);
      await updateClobTable1(id, content_2);
      const sql = "SELECT ID, C from nodb_clob1 where id = " + id;
      const result = await connection.execute(sql);
      compareStrings(result.rows[0][1], specialStr_2, content_2, contentLength_2);
    }); // 84.1.11

    it('84.1.12 works with REF CURSOR', async function() {
      const id = insertID++;
      const specialStr = '84.1.12';
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
      const result = await connection.execute(sql, bindVar);
      const rows = await result.outBinds.c.getRows(3);
      const resultVal = rows[0][0];
      assert.strictEqual(typeof resultVal, 'string');
      compareStrings(resultVal, specialStr, content, contentLength);
      await result.outBinds.c.close();
      const ref_proc_drop = "DROP PROCEDURE nodb_ref";
      await connection.execute(ref_proc_drop);
    }); // 84.1.12

    it('84.1.13 fetch CLOB with stream', async function() {
      const id = insertID++;
      const specialStr = '84.1.13';
      const contentLength = 40;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      oracledb.fetchAsString = [];
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = :id";
      const binds = { id : id };
      const result = await connection.execute(sql, binds);
      const lob = result.rows[0][1];
      const clobData = await lob.getData();
      compareStrings(clobData, specialStr, content, contentLength);
      lob.destroy();
    }); // 84.1.13

    it('84.1.14 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.1.14_1';
      const contentLength_1 = 26;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.1.14_2';
      const contentLength_2 = 30;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      // oracledb.maxRows: The maximum number of rows that are fetched by the execute() call of the Connection object when not using a ResultSet.
      // Rows beyond this limit are not fetched from the database.
      oracledb.maxRows = 1;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 where id = " + id_1 + " or id = " + id_2;
      const result = await connection.execute(sql);
      assert.strictEqual(result.rows.length, 1);
      compareStrings(result.rows[0][1], specialStr_1, content_1, contentLength_1);
      oracledb.maxRows = maxRowsBak;
    }); // 84.1.14

    it('84.1.15 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.1.15_1';
      const contentLength_1 = 26;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.1.15_2';
      const contentLength_2 = 30;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 20;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 where id = " + id_1 + " or id = " + id_2;
      const result = await connection.execute(sql);
      compareStrings(result.rows[0][1], specialStr_1, content_1, contentLength_1);
      compareStrings(result.rows[1][1], specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
    }); // 84.1.15

    it('84.1.16 override oracledb.fetchAsString with fetchInfo set to oracledb.DEFAULT', async function() {
      const id = insertID++;
      const specialStr = '84.1.16';
      const contentLength = 20;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = :id";
      const binds = { id : id };
      const options = {
        fetchInfo : { C : { type : oracledb.DEFAULT } }
      };
      const result = await connection.execute(sql, binds, options);
      const lob = result.rows[0][1];
      const clobData = await lob.getData();
      lob.destroy();
      compareStrings(clobData, specialStr, content, contentLength);
    }); // 84.1.16

    it('84.1.17 works with connection.queryStream()', async function() {
      const id = insertID++;
      const specialStr = '84.1.17';
      const contentLength = 200;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id;
      const stream = connection.queryStream(sql);
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', (data) => {
          const result = data[1];
          assert.strictEqual(typeof result, "string");
          compareStrings(result, specialStr, content, contentLength);
        });
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
      });
    }); // 84.1.17

    it('84.1.18 works with connection.queryStream() and oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.1.18_1';
      const contentLength_1 = 26;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.1.18_2';
      const contentLength_2 = 30;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 20;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2;
      const stream = connection.queryStream(sql);
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
    }); // 84.1.18

    it('84.1.19 works with connection.queryStream() and oracledb.maxRows = actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.1.19_1';
      const contentLength_1 = 26;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.1.19_2';
      const contentLength_2 = 30;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 2;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2;
      const stream = connection.queryStream(sql);
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
    }); // 84.1.19

    it('84.1.20 works with connection.queryStream() and oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.1.20_1';
      const contentLength_1 = 26;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.1.20_2';
      const contentLength_2 = 30;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2;
      const stream = connection.queryStream(sql);
      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', (data) => {
          const result = data[1];
          assert.strictEqual(typeof result, "string");
          counter++;
          if (counter == 1) {
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
    }); // 84.1.20

  }); // 84.1

  describe('84.2 fetch CLOB columns by setting oracledb.fetchAsString and outFormat = oracledb.OUT_FORMAT_OBJECT', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    });

    after('drop table', async function() {
      await connection.execute(drop_table1);
    });

    beforeEach('set oracledb.fetchAsString', function() {
      oracledb.fetchAsString = [ oracledb.CLOB ];
    });

    afterEach('clear the by-type specification', function() {
      oracledb.fetchAsString = [];
    });

    const insertAndFetch = async function(id, specialStr, insertContent, insertContentLength) {
      await insertIntoClobTable1(id, insertContent);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = :id";
      const binds = { id : id };
      const options = { outFormat : oracledb.OUT_FORMAT_OBJECT };
      const result = await connection.execute(sql, binds, options);
      const resultVal = result.rows[0].C;
      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        compareStrings(resultVal, specialStr, insertContent, insertContentLength);
      }
    };

    it('84.2.1 works with NULL value', async function() {
      const id = insertID++;
      const content = null;
      await insertAndFetch(id, null, content, null);
    }); // 84.2.1

    it('84.2.2 works with empty String', async function() {
      const id = insertID++;
      const content = "";
      await insertAndFetch(id, null, content, null);
    }); // 84.2.2

    it('84.2.3 works with small value', async function() {
      const id = insertID++;
      const specialStr = '84.2.3';
      const contentLength = 20;
      const content = random.getRandomString(contentLength, specialStr);
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 84.2.3

    it('84.2.4 works with (64K - 1) value', async function() {
      const id = insertID++;
      const specialStr = '84.2.4';
      const contentLength = 65535;
      const content = random.getRandomString(contentLength, specialStr);
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 84.2.4

    it('84.2.5 works with (64K + 1) value', async function() {
      const id = insertID++;
      const specialStr = '84.2.5';
      const contentLength = 65537;
      const content = random.getRandomString(contentLength, specialStr);
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 84.2.5

    it('84.2.6 works with (1MB + 1) data', async function() {
      const id = insertID++;
      const specialStr = '84.2.6';
      const contentLength = 1048577; // 1MB + 1
      const content = random.getRandomString(contentLength, specialStr);
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 84.2.6

    it('84.2.7 works with dbms_lob.substr()', async function() {
      const id = insertID++;
      const specialStr = '84.2.7';
      const contentLength = 200;
      const specialStrLength = specialStr.length;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const sql = "SELECT dbms_lob.substr(C, " + specialStrLength + ", 1) AS C1 from nodb_clob1 WHERE ID = :id";
      const binds = { id : id };
      const options = { outFormat : oracledb.OUT_FORMAT_OBJECT };
      const result = await connection.execute(sql, binds, options);
      compareStrings(result.rows[0].C1, specialStr, specialStr, specialStrLength);
    }); // 84.2.7

    it('84.2.8 works with EMPTY_CLOB()', async function() {
      const id = insertID++;
      const content = "EMPTY_CLOB";
      await insertAndFetch(id, null, content, null);
    }); // 84.2.8

    it('84.2.9 fetch multiple CLOB rows as String', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.2.9_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.2.9_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2;
      const binds = {};
      const options = { outFormat : oracledb.OUT_FORMAT_OBJECT };
      const result = await connection.execute(sql, binds, options);
      compareStrings(result.rows[0].C, specialStr_1, content_1, contentLength_1);
      compareStrings(result.rows[1].C, specialStr_2, content_2, contentLength_2);
    }); // 84.2.9

    it('84.2.10 fetch the same CLOB column multiple times', async function() {
      const id = insertID++;
      const specialStr = '84.2.10';
      const contentLength = 200;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const sql = "SELECT ID, C AS C1, C AS C2 from nodb_clob1 WHERE ID = " + id;
      const binds = {};
      const options = { outFormat : oracledb.OUT_FORMAT_OBJECT };
      const result = await connection.execute(sql, binds, options);
      compareStrings(result.rows[0].C1, specialStr, content, contentLength);
      compareStrings(result.rows[0].C2, specialStr, content, contentLength);
    }); // 84.2.10

    it('84.2.11 works with update statement', async function() {
      const id = insertID++;
      const specialStr_1 = '84.2.11_1';
      const contentLength_1 = 201;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const specialStr_2 = '84.2.11_2';
      const contentLength_2 = 208;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertAndFetch(id, specialStr_1, content_1, contentLength_1);
      await updateClobTable1(id, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id;
      const binds = {};
      const options = { outFormat : oracledb.OUT_FORMAT_OBJECT };
      const result = await connection.execute(sql, binds, options);
      compareStrings(result.rows[0].C, specialStr_2, content_2, contentLength_2);
    }); // 84.2.11

    it('84.2.12 works with REF CURSOR', async function() {
      const id = insertID++;
      const specialStr = '84.2.12';
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
      const options = { outFormat : oracledb.OUT_FORMAT_OBJECT };
      const result = await connection.execute(sql, bindVar, options);
      const rows = await result.outBinds.c.getRows(3);
      const resultVal = rows[0].C;
      assert.strictEqual(typeof resultVal, 'string');
      compareStrings(resultVal, specialStr, content, contentLength);
      await result.outBinds.c.close();
      const ref_proc_drop = "DROP PROCEDURE nodb_ref";
      await connection.execute(ref_proc_drop);
    }); // 84.2.12

    it('84.2.13 fetch CLOB with stream', async function() {
      const id = insertID++;
      const specialStr = '84.2.13';
      const contentLength = 200;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      oracledb.fetchAsString = [];
      const sql = "SELECT C from nodb_clob1 WHERE ID = " + id;
      const result = await connection.execute(sql);
      const lob = result.rows[0][0];
      const clobData = await lob.getData();
      lob.destroy();
      compareStrings(clobData, specialStr, content, contentLength);
    }); // 84.2.13

    it('84.2.14 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.2.14_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.2.14_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      // oracledb.maxRows: The maximum number of rows that are fetched by the execute() call of the Connection object when not using a ResultSet.
      // Rows beyond this limit are not fetched from the database.
      oracledb.maxRows = 1;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2;
      const binds = {};
      const options = { outFormat : oracledb.OUT_FORMAT_OBJECT };
      const result = await connection.execute(sql, binds, options);
      assert.strictEqual(result.rows.length, 1);
      compareStrings(result.rows[0].C, specialStr_1, content_1, contentLength_1);
      oracledb.maxRows = maxRowsBak;
    }); // 84.2.14

    it('84.2.15 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.2.15_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.2.15_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2;
      const binds = {};
      const options = { outFormat : oracledb.OUT_FORMAT_OBJECT };
      const result = await connection.execute(sql, binds, options);
      assert.strictEqual(result.rows.length, 2);
      compareStrings(result.rows[0].C, specialStr_1, content_1, contentLength_1);
      compareStrings(result.rows[1].C, specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
    }); // 84.2.15

    it('84.2.16 override oracledb.fetchAsString with fetchInfo set to oracledb.DEFAULT', async function() {
      const id = insertID++;
      const specialStr = '84.2.16';
      const contentLength = 20;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = :id";
      const binds = { id : id };
      const options = {
        fetchInfo : { C : { type : oracledb.DEFAULT } }
      };
      const result = await connection.execute(sql, binds, options);
      const lob = result.rows[0][1];
      const clobData = await lob.getData();
      lob.destroy();
      compareStrings(clobData, specialStr, content, contentLength);
    }); // 84.2.16

  }); // 84.2

  describe('84.3 fetch CLOB columns by setting oracledb.fetchAsString, outFormat = oracledb.OUT_FORMAT_OBJECT and resultSet = true', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    });

    after('drop table', async function() {
      await connection.execute(drop_table1);
    });

    beforeEach('set oracledb.fetchAsString', function() {
      oracledb.fetchAsString = [ oracledb.CLOB ];
    }); // beforeEach

    afterEach('clear the by-type specification', function() {
      oracledb.fetchAsString = [];
    }); // afterEach

    const insertAndFetch = async function(id, specialStr, insertContent, insertContentLength) {
      await insertIntoClobTable1(id, insertContent);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = :id";
      const binds = { id : id };
      const options = {
        outFormat : oracledb.OUT_FORMAT_OBJECT,
        resultSet : true
      };
      const result = await connection.execute(sql, binds, options);
      const row = await result.resultSet.getRow();
      const resultVal = row.C;
      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        compareStrings(resultVal, specialStr, insertContent, insertContentLength);
      }
      await result.resultSet.close();
    };

    it('84.3.1 works with NULL value', async function() {
      const id = insertID++;
      const content = null;
      await insertAndFetch(id, null, content, null);
    }); // 84.3.1

    it('84.3.2 works with empty String', async function() {
      const id = insertID++;
      const content = "";
      await insertAndFetch(id, null, content, null);
    }); // 84.3.2

    it('84.3.3 works with small value', async function() {
      const id = insertID++;
      const specialStr = '84.3.3';
      const contentLength = 20;
      const content = random.getRandomString(contentLength, specialStr);
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 84.3.3

    it('84.3.4 works with (64K - 1) value', async function() {
      const id = insertID++;
      const specialStr = '84.3.4';
      const contentLength = 65535;
      const content = random.getRandomString(contentLength, specialStr);
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 84.3.4

    it('84.3.5 works with (64K + 1) value', async function() {
      const id = insertID++;
      const specialStr = '84.3.5';
      const contentLength = 65537;
      const content = random.getRandomString(contentLength, specialStr);
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 84.3.5

    it('84.3.6 works with (1MB + 1) data', async function() {
      const id = insertID++;
      const specialStr = '84.3.6';
      const contentLength = 1048577; // 1MB + 1
      const content = random.getRandomString(contentLength, specialStr);
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 84.3.6

    it('84.3.7 works with dbms_lob.substr()', async function() {
      const id = insertID++;
      const specialStr = '84.3.7';
      const contentLength = 200;
      const specialStrLength = specialStr.length;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const sql = "SELECT dbms_lob.substr(C, " + specialStrLength + ", 1) AS C1 from nodb_clob1 WHERE ID = :id";
      const binds = { id : id };
      const options = {
        outFormat : oracledb.OUT_FORMAT_OBJECT,
        resultSet : true
      };
      const result = await connection.execute(sql, binds, options);
      const row = await result.resultSet.getRow();
      compareStrings(row.C1, specialStr, specialStr, specialStrLength);
      await result.resultSet.close();
    }); // 84.3.7

    it('84.3.8 works with EMPTY_CLOB()', async function() {
      const id = insertID++;
      const content = "EMPTY_CLOB";
      await insertAndFetch(id, null, content, null);
    }); // 84.3.8

    it('84.3.9 fetch multiple CLOB rows as String', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.3.9_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.3.9_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2;
      const binds = {};
      const options = {
        outFormat : oracledb.OUT_FORMAT_OBJECT,
        resultSet : true
      };
      const result = await connection.execute(sql, binds, options);
      const rows = await result.resultSet.getRows(2);
      compareStrings(rows[0].C, specialStr_1, content_1, contentLength_1);
      compareStrings(rows[1].C, specialStr_2, content_2, contentLength_2);
      await result.resultSet.close();
    }); // 84.3.9

    it('84.3.10 fetch the same CLOB column multiple times', async function() {
      const id = insertID++;
      const specialStr = '84.3.10';
      const contentLength = 200;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const sql = "SELECT ID, C AS C1, C AS C2 from nodb_clob1 WHERE ID = " + id;
      const binds = {};
      const options = {
        outFormat : oracledb.OUT_FORMAT_OBJECT,
        resultSet : true
      };
      const result = await connection.execute(sql, binds, options);
      const row = await result.resultSet.getRow();
      compareStrings(row.C1, specialStr, content, contentLength);
      compareStrings(row.C2, specialStr, content, contentLength);
      await result.resultSet.close();
    }); // 84.3.10

    it('84.3.11 works with update statement', async function() {
      const id = insertID++;
      const specialStr_1 = '84.3.11_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const specialStr_2 = '84.3.11_2';
      const contentLength_2 = 208;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertAndFetch(id, specialStr_1, content_1, contentLength_1);
      await updateClobTable1(id, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id;
      const binds = {};
      const options = {
        outFormat : oracledb.OUT_FORMAT_OBJECT,
        resultSet : true
      };
      const result = await connection.execute(sql, binds, options);
      const row = await result.resultSet.getRow();
      compareStrings(row.C, specialStr_2, content_2, contentLength_2);
      await result.resultSet.close();
    }); // 84.3.11

    it('84.3.13 fetch CLOB with stream', async function() {
      const id = insertID++;
      const specialStr = '84.3.13';
      const contentLength = 200;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      oracledb.fetchAsString = [];
      const sql = "SELECT C from nodb_clob1 WHERE ID = " + id;
      const result = await connection.execute(sql);
      const lob = result.rows[0][0];
      const clobData = await lob.getData();
      lob.destroy();
      compareStrings(clobData, specialStr, content, contentLength);
    }); // 84.3.13

    it('84.3.14 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.3.14_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.3.14_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1; // maxRows is ignored when fetching rows with a ResultSet.

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2;
      const binds = {};
      const options = {
        outFormat : oracledb.OUT_FORMAT_OBJECT,
        resultSet : true
      };
      const result = await connection.execute(sql, binds, options);
      const rows = await result.resultSet.getRows(2);
      assert.strictEqual(rows.length, 2);
      compareStrings(rows[0].C, specialStr_1, content_1, contentLength_1);
      compareStrings(rows[1].C, specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
      await result.resultSet.close();
    }); // 84.3.14

    it('84.3.15 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.3.15_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.3.15_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2;
      const binds = {};
      const options = {
        outFormat : oracledb.OUT_FORMAT_OBJECT,
        resultSet : true
      };
      const result = await connection.execute(sql, binds, options);
      const rows = await result.resultSet.getRows(2);
      assert.strictEqual(rows.length, 2);
      compareStrings(rows[0].C, specialStr_1, content_1, contentLength_1);
      compareStrings(rows[1].C, specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
      await result.resultSet.close();
    }); // 84.3.15

    it('84.3.16 override oracledb.fetchAsString with fetchInfo set to oracledb.DEFAULT', async function() {
      const id = insertID++;
      const specialStr = '84.3.16';
      const contentLength = 20;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = :id";
      const binds = { id : id };
      const options = {
        fetchInfo : { C : { type : oracledb.DEFAULT } }
      };
      const result = await connection.execute(sql, binds, options);
      const lob = result.rows[0][1];
      const clobData = await lob.getData();
      compareStrings(clobData, specialStr, content, contentLength);
      lob.destroy();
    }); // 84.3.16

  }); // 84.3

  describe('84.4 fetch CLOB columns by setting oracledb.fetchAsString and outFormat = oracledb.OUT_FORMAT_ARRAY', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    });

    after('drop table', async function() {
      await connection.execute(drop_table1);
    });

    beforeEach('set oracledb.fetchAsString', function() {
      oracledb.fetchAsString = [ oracledb.CLOB ];
    });

    afterEach('clear the by-type specification', function() {
      oracledb.fetchAsString = [];
    });

    const insetAndFetch = async function(id, specialStr, insertcontent, insetContentLength) {
      await insertIntoClobTable1(id, insertcontent);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = :id";
      const binds = { id : id };
      const options = { outFormat : oracledb.OUT_FORMAT_ARRAY };
      const result = await connection.execute(sql, binds, options);
      const resultVal = result.rows[0][1];
      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        compareStrings(resultVal, specialStr, insertcontent, insetContentLength);
      }
    };

    it('84.4.1 works with NULL value', async function() {
      const id = insertID++;
      const content = null;
      await insetAndFetch(id, null, content, null);
    }); // 84.4.1

    it('84.4.2 works with empty String', async function() {
      const id = insertID++;
      const content = "";
      await insetAndFetch(id, null, content, null);
    }); // 84.4.2

    it('84.4.3 works with small value', async function() {
      const id = insertID++;
      const specialStr = '84.4.3';
      const contentLength = 20;
      const content = random.getRandomString(contentLength, specialStr);
      await insetAndFetch(id, specialStr, content, contentLength);
    }); // 84.4.3

    it('84.4.4 works with (64K - 1) value', async function() {
      const id = insertID++;
      const specialStr = '84.4.4';
      const contentLength = 65535;
      const content = random.getRandomString(contentLength, specialStr);
      await insetAndFetch(id, specialStr, content, contentLength);
    }); // 84.4.4

    it('84.4.5 works with (64K + 1) value', async function() {
      const id = insertID++;
      const specialStr = '84.4.5';
      const contentLength = 65537;
      const content = random.getRandomString(contentLength, specialStr);
      await insetAndFetch(id, specialStr, content, contentLength);
    }); // 84.4.5

    it('84.4.6 works with (1MB + 1) data', async function() {
      const id = insertID++;
      const specialStr = '84.4.6';
      const contentLength = 1048577; // 1MB + 1
      const content = random.getRandomString(contentLength, specialStr);
      await insetAndFetch(id, specialStr, content, contentLength);
    }); // 84.4.6

    it('84.4.7 works with dbms_lob.substr()', async function() {
      const id = insertID++;
      const specialStr = '84.4.7';
      const contentLength = 200;
      const specialStrLength = specialStr.length;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const sql = "SELECT dbms_lob.substr(C, " + specialStrLength + ", 1) from nodb_clob1 WHERE ID = :id";
      const binds = { id : id };
      const options = { outFormat : oracledb.OUT_FORMAT_ARRAY };
      const result = await connection.execute(sql, binds, options);
      compareStrings(result.rows[0][0], specialStr, specialStr, specialStrLength);
    }); // 84.4.7

    it('84.4.8 works with EMPTY_CLOB()', async function() {
      const id = insertID++;
      const content = "EMPTY_CLOB";
      await insetAndFetch(id, null, content, null);
    }); // 84.4.8

    it('84.4.9 fetch multiple CLOB rows as String', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.4.9_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.4.9_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2;
      const binds = {};
      const options = { outFormat : oracledb.OUT_FORMAT_ARRAY };
      const result = await connection.execute(sql, binds, options);
      compareStrings(result.rows[0][1], specialStr_1, content_1, contentLength_1);
      compareStrings(result.rows[1][1], specialStr_2, content_2, contentLength_2);
    }); // 84.4.9

    it('84.4.10 fetch the same CLOB column multiple times', async function() {
      const id = insertID++;
      const specialStr = '84.4.10';
      const contentLength = 200;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const sql = "SELECT ID, C AS C1, C AS C2 from nodb_clob1 WHERE ID = " + id;
      const binds = {};
      const options = { outFormat : oracledb.OUT_FORMAT_ARRAY };
      const result = await connection.execute(sql, binds, options);
      compareStrings(result.rows[0][1], specialStr, content, contentLength);
      compareStrings(result.rows[0][2], specialStr, content, contentLength);
    }); // 84.4.10

    it('84.4.11 works with update statement', async function() {
      const id = insertID++;
      const specialStr_1 = '84.4.11_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const specialStr_2 = '84.4.11_2';
      const contentLength_2 = 208;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insetAndFetch(id, specialStr_1, content_1, contentLength_1);
      await updateClobTable1(id, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id;
      const binds = {};
      const options = { outFormat : oracledb.OUT_FORMAT_ARRAY };
      const result = await connection.execute(sql, binds, options);
      compareStrings(result.rows[0][1], specialStr_2, content_2, contentLength_2);
    }); // 84.4.11

    it('84.4.12 works with REF CURSOR', async function() {
      const id = insertID++;
      const specialStr = '84.4.12';
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
      const options = { outFormat : oracledb.OUT_FORMAT_ARRAY };
      const result = await connection.execute(sql, bindVar, options);
      const rows = await result.outBinds.c.getRows(3);
      compareStrings(rows[0][0], specialStr, content, contentLength);
      await result.outBinds.c.close();
      const ref_proc_drop = "DROP PROCEDURE nodb_ref";
      await connection.execute(ref_proc_drop);
    }); // 84.4.12

    it('84.4.13 fetch CLOB with stream', async function() {
      const id = insertID++;
      const specialStr = '84.4.13';
      const contentLength = 200;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      oracledb.fetchAsString = [];
      const sql = "SELECT C from nodb_clob1 WHERE ID = " + id;
      const result = await connection.execute(sql);
      const lob = result.rows[0][0];
      const clobData = await lob.getData();
      compareStrings(clobData, specialStr, content, contentLength);
      lob.destroy();
    }); // 84.4.13

    it('84.4.14 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.4.14_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.4.14_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      // oracledb.maxRows: The maximum number of rows that are fetched by the execute() call of the Connection object when not using a ResultSet.
      // Rows beyond this limit are not fetched from the database.
      oracledb.maxRows = 1;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2;
      const binds = {};
      const options = { outFormat : oracledb.OUT_FORMAT_ARRAY };
      const result = await connection.execute(sql, binds, options);
      assert.strictEqual(result.rows.length, 1);
      compareStrings(result.rows[0][1], specialStr_1, content_1, contentLength_1);
      oracledb.maxRows = maxRowsBak;
    }); // 84.4.14

    it('84.4.15 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.4.15_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.4.15_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2;
      const binds = {};
      const options = { outFormat : oracledb.OUT_FORMAT_ARRAY };
      const result = await connection.execute(sql, binds, options);
      assert.strictEqual(result.rows.length, 2);
      compareStrings(result.rows[0][1], specialStr_1, content_1, contentLength_1);
      compareStrings(result.rows[1][1], specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
    }); // 84.4.15

    it('84.4.16 override oracledb.fetchAsString with fetchInfo set to oracledb.DEFAULT', async function() {
      const id = insertID++;
      const specialStr = '84.4.16';
      const contentLength = 20;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = :id";
      const binds = { id : id };
      const options = {
        fetchInfo : { C : { type : oracledb.DEFAULT } }
      };
      const result = await connection.execute(sql, binds, options);
      const lob = result.rows[0][1];
      const clobData = await lob.getData();
      compareStrings(clobData, specialStr, content, contentLength);
      lob.destroy();
    }); // 84.4.16

  }); // 84.4

  describe('84.5 fetch CLOB columns by setting oracledb.fetchAsString, outFormat = oracledb.OUT_FORMAT_ARRAY and resultSet = true', function() {

    before('Create table and populate', async function() {
      await connection.execute(proc_create_table1);
    });

    after('drop table', async function() {
      await connection.execute(drop_table1);
    });

    beforeEach('set oracledb.fetchAsString', function() {
      oracledb.fetchAsString = [ oracledb.CLOB ];
    });

    afterEach('clear the by-type specification', function() {
      oracledb.fetchAsString = [];
    });

    const insertAndFetch = async function(id, specialStr, insertContent, insertContentLength) {
      await insertIntoClobTable1(id, insertContent);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = :id";
      const binds = { id : id };
      const options = {
        outFormat : oracledb.OUT_FORMAT_ARRAY,
        resultSet : true
      };
      const result = await connection.execute(sql, binds, options);
      const row = await result.resultSet.getRow();
      const resultVal = row[1];
      if (specialStr === null) {
        assert.strictEqual(resultVal, null);
      } else {
        compareStrings(resultVal, specialStr, insertContent, insertContentLength);
      }
      await result.resultSet.close();
    };

    it('84.5.1 works with NULL value', async function() {
      const id = insertID++;
      const content = null;
      await insertAndFetch(id, null, content, null);
    }); // 84.5.1

    it('84.5.2 works with empty String', async function() {
      const id = insertID++;
      const content = "";
      await insertAndFetch(id, null, content, null);
    }); // 84.5.2

    it('84.5.3 works with small value', async function() {
      const id = insertID++;
      const specialStr = '84.5.3';
      const contentLength = 20;
      const content = random.getRandomString(contentLength, specialStr);
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 84.5.3

    it('84.5.4 works with (64K - 1) value', async function() {
      const id = insertID++;
      const specialStr = '84.5.4';
      const contentLength = 65535;
      const content = random.getRandomString(contentLength, specialStr);
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 84.5.4

    it('84.5.5 works with (64K + 1) value', async function() {
      const id = insertID++;
      const specialStr = '84.5.5';
      const contentLength = 65537;
      const content = random.getRandomString(contentLength, specialStr);
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 84.5.5

    it('84.5.6 works with (1MB + 1) data', async function() {
      const id = insertID++;
      const specialStr = '84.5.6';
      const contentLength = 1048577; // 1MB + 1
      const content = random.getRandomString(contentLength, specialStr);
      await insertAndFetch(id, specialStr, content, contentLength);
    }); // 84.5.6

    it('84.5.7 works with dbms_lob.substr()', async function() {
      const id = insertID++;
      const specialStr = '84.5.7';
      const contentLength = 200;
      const specialStrLength = specialStr.length;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const sql = "SELECT dbms_lob.substr(C, " + specialStrLength + ", 1) AS C1 from nodb_clob1 WHERE ID = :id";
      const binds = { id : id };
      const options = {
        outFormat : oracledb.OUT_FORMAT_ARRAY,
        resultSet : true
      };
      const result = await connection.execute(sql, binds, options);
      const row = await result.resultSet.getRow();
      compareStrings(row[0], specialStr, specialStr, specialStrLength);
      await result.resultSet.close();
    }); // 84.5.7

    it('84.5.8 works with EMPTY_CLOB()', async function() {
      const id = insertID++;
      const content = "EMPTY_CLOB";
      await insertAndFetch(id, null, content, null);
    }); // 84.5.8

    it('84.5.9 fetch multiple CLOB rows as String', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.5.9_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.5.9_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2;
      const binds = {};
      const options = {
        outFormat : oracledb.OUT_FORMAT_ARRAY,
        resultSet : true
      };
      const result = await connection.execute(sql, binds, options);
      const rows = await result.resultSet.getRows(2);
      compareStrings(rows[0][1], specialStr_1, content_1, contentLength_1);
      compareStrings(rows[1][1], specialStr_2, content_2, contentLength_2);
      await result.resultSet.close();
    }); // 84.5.9

    it('84.5.10 fetch the same CLOB column multiple times', async function() {
      const id = insertID++;
      const specialStr = '84.5.10';
      const contentLength = 200;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const sql = "SELECT ID, C AS C1, C AS C2 from nodb_clob1 WHERE ID = " + id;
      const binds = {};
      const options = {
        outFormat : oracledb.OUT_FORMAT_ARRAY,
        resultSet : true
      };
      const result = await connection.execute(sql, binds, options);
      const row = await result.resultSet.getRow();
      compareStrings(row[1], specialStr, content, contentLength);
      compareStrings(row[2], specialStr, content, contentLength);
      await result.resultSet.close();
    }); // 84.5.10

    it('84.5.11 works with update statement', async function() {
      const id = insertID++;
      const specialStr_1 = '84.5.11_1';
      const contentLength_1 = 208;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const specialStr_2 = '84.5.11_2';
      const contentLength_2 = 208;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertAndFetch(id, specialStr_1, content_1, contentLength_1);
      await updateClobTable1(id, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id;
      const binds = {};
      const options = {
        outFormat : oracledb.OUT_FORMAT_ARRAY,
        resultSet : true
      };
      const result = await connection.execute(sql, binds, options);
      const row = await result.resultSet.getRow();
      compareStrings(row[1], specialStr_2, content_2, contentLength_2);
      await result.resultSet.close();
    }); // 84.5.11

    it('84.5.13 fetch CLOB with stream', async function() {
      const id = insertID++;
      const specialStr = '84.5.13';
      const contentLength = 200;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      oracledb.fetchAsString = [];
      const sql = "SELECT C from nodb_clob1 WHERE ID = " + id;
      const result = await connection.execute(sql);
      const lob = result.rows[0][0];
      const clobData = await lob.getData();
      compareStrings(clobData, specialStr, content, contentLength);
      lob.destroy();
    }); // 84.5.13

    it('84.5.14 works with setting oracledb.maxRows < actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.5.14_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.5.14_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1; // maxRows is ignored when fetching rows with a ResultSet.

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2;
      const binds = {};
      const options = {
        outFormat : oracledb.OUT_FORMAT_ARRAY,
        resultSet : true
      };
      const result = await connection.execute(sql, binds, options);
      const rows = await result.resultSet.getRows(2);
      assert.strictEqual(rows.length, 2);
      compareStrings(rows[0][1], specialStr_1, content_1, contentLength_1);
      compareStrings(rows[1][1], specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
      await result.resultSet.close();
    }); // 84.5.14

    it('84.5.15 works with setting oracledb.maxRows > actual number of rows in the table', async function() {
      const id_1 = insertID++;
      const specialStr_1 = '84.5.15_1';
      const contentLength_1 = 200;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const id_2 = insertID++;
      const specialStr_2 = '84.5.15_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      await insertIntoClobTable1(id_1, content_1);
      await insertIntoClobTable1(id_2, content_2);
      const sql = "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " + id_2;
      const binds = {};
      const options = {
        outFormat : oracledb.OUT_FORMAT_ARRAY,
        resultSet : true
      };
      const result = await connection.execute(sql, binds, options);
      const rows = await result.resultSet.getRows(2);
      assert.strictEqual(rows.length, 2);
      compareStrings(rows[0][1], specialStr_1, content_1, contentLength_1);
      compareStrings(rows[1][1], specialStr_2, content_2, contentLength_2);
      oracledb.maxRows = maxRowsBak;
      await result.resultSet.close();
    }); // 84.5.15

    it('84.5.16 override oracledb.fetchAsString with fetchInfo set to oracledb.DEFAULT', async function() {
      const id = insertID++;
      const specialStr = '84.5.16';
      const contentLength = 20;
      const content = random.getRandomString(contentLength, specialStr);

      await insertIntoClobTable1(id, content);
      const sql = "SELECT ID, C from nodb_clob1 WHERE ID = :id";
      const binds = { id : id };
      const options = {
        fetchInfo : { C : { type : oracledb.DEFAULT } }
      };
      const result = await connection.execute(sql, binds, options);
      const lob = result.rows[0][1];
      const clobData = await lob.getData();
      compareStrings(clobData, specialStr, content, contentLength);
      lob.destroy();
    }); // 84.5.16

  }); // 84.5

});

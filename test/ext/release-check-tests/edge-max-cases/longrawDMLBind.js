/* Copyright (c) 2024, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * The node-oracledb test suite uses 'mocha' and 'assert'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   8. longrawDMLBind.js
 *
 * DESCRIPTION
 *    Test LONG RAW type DML support.
 *    Long column restrictions: http://docs.oracle.com/cd/B19306_01/server.102/b14200/sql_elements001.htm#SQLRF00201
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig      = require('../../../dbconfig.js');
const random     = require('../../../random.js');
const assist      = require('../../../dataTypeAssist.js');

describe('8. longrawDMLBind.js', function() {
  this.timeout(100000);
  let connection = null;
  const tableName = "nodb_longraw";
  let insertID = 0;
  const table_create = "BEGIN \n" +
                     "    DECLARE \n" +
                     "        e_table_missing EXCEPTION; \n" +
                     "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                     "    BEGIN \n" +
                     "        EXECUTE IMMEDIATE('DROP TABLE " + tableName + " PURGE'); \n" +
                     "    EXCEPTION \n" +
                     "        WHEN e_table_missing \n" +
                     "        THEN NULL; \n" +
                     "    END; \n" +
                     "    EXECUTE IMMEDIATE (' \n" +
                     "        CREATE TABLE " + tableName + " ( \n" +
                     "            id         NUMBER, \n" +
                     "            content    LONG RAW\n" +
                     "        ) \n" +
                     "    '); \n" +
                     "END; ";
  const table_drop = "DROP TABLE " + tableName + " PURGE";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(table_create);
  }); // before

  after(async function() {
    await connection.execute(table_drop);
    await connection.release();
  }); // after

  beforeEach(function() {
    insertID++;
  });

  describe('8.1 INSERT and SELECT', function() {

    it('8.1.1 works with data size 1MB + 1', async function() {
      const size = 1 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(size);
      const insertedBuf = Buffer.from(insertedStr);
      await test1(insertedBuf);
    });

    it('8.1.2 works with data size 10MB + 1', async function() {
      const size = 10 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(size);
      const insertedBuf = Buffer.from(insertedStr);
      await test1(insertedBuf);
    });

    it('8.1.3 works with data size 50MB + 1', async function() {
      const size = 50 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(size);
      const insertedBuf = Buffer.from(insertedStr);
      await test1(insertedBuf);
    });

    it('8.1.4 works with data size 128MB + 1', async function() {
      const size = 128 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(size);
      const insertedBuf = Buffer.from(insertedStr);
      await test1(insertedBuf);
    });

    it('8.1.5 works with data size 256MB - 16', async function() {
      const bigStr_1 = getBigBuffer(1, 16);
      const bigStr_2 = getBigBuffer(1, 0);
      const totalLength = 256 * 1024 * 1024 - 16;
      const insertedBuf = Buffer.concat([bigStr_1, bigStr_2], totalLength);
      await test1(insertedBuf);
    });

  }); // 8.1

  describe('8.2 UPDATE', function() {

    it('8.2.1 works with data size 1MB + 1', async function() {
      const size = 1 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(100);
      const updateStr = random.getRandomLengthString(size);
      const insertedBuf = Buffer.from(insertedStr);
      const updateBuf = Buffer.from(updateStr);
      await test2(insertedBuf, updateBuf);
    });

    it('8.2.2 works with data size 10MB + 1', async function() {
      const size = 10 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(200);
      const updateStr = random.getRandomLengthString(size);
      const insertedBuf = Buffer.from(insertedStr);
      const updateBuf = Buffer.from(updateStr);
      await test2(insertedBuf, updateBuf);
    });

    it('8.2.3 works with data size 50MB + 1', async function() {
      const size = 50 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(10);
      const updateStr = random.getRandomLengthString(size);
      const insertedBuf = Buffer.from(insertedStr);
      const updateBuf = Buffer.from(updateStr);
      await test2(insertedBuf, updateBuf);
    });

    it('8.2.4 works with data size 128MB + 1', async function() {
      const size = 128 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(65536);
      const updateStr = random.getRandomLengthString(size);
      const insertedBuf = Buffer.from(insertedStr);
      const updateBuf = Buffer.from(updateStr);
      await test2(insertedBuf, updateBuf);
    });

    it('8.2.5 works with data size 256MB - 16', async function() {
      const insertedStr = random.getRandomLengthString(65536);
      const insertedBuf = Buffer.from(insertedStr);
      const bigStr_1 = getBigBuffer(1, 16);
      const bigStr_2 = getBigBuffer(1, 0);
      const totalLength = 256 * 1024 * 1024 - 16;
      const updateBuf = Buffer.concat([bigStr_1, bigStr_2], totalLength);
      await test2(insertedBuf, updateBuf);
    });

  });

  const test1 = async function(content) {
    await insert(content);
    await fetch(content);
  };

  const test2 = async function(insertedStr, updateStr) {
    await insert(insertedStr);
    await update(updateStr);
    await fetch(updateStr);
  };

  const insert = async function(content) {
    const sql = "insert into " + tableName + " (id, content) values (:i, :c)";
    const bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
    };
    const result = await connection.execute(
      sql,
      bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  const update = async function(content) {
    const sql = "update " + tableName + " set content = :c where id = :i";
    const bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
    };
    const result = await connection.execute(
      sql,
      bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  const fetch = async function(expected) {
    const sql = "select content from " + tableName + " where id = " + insertID;
    const result = await connection.execute(sql);
    assist.compare2Buffers(result.rows[0][0], expected);
  };

  const getBigBuffer = function(loop, minus) {
    let largeBuffer = Buffer.from("", 'utf8');
    const stringSizeInEachLoop = 128 * 1024 * 1024 - minus;
    const bigStr = random.getRandomLengthString(stringSizeInEachLoop);
    const bigBuffer = Buffer.from(bigStr);
    const totalLength = largeBuffer.length + bigBuffer.length;
    largeBuffer = Buffer.concat([largeBuffer, bigBuffer], totalLength);
    return largeBuffer;
  };

});

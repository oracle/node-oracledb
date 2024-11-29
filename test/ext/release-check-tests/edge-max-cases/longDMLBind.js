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
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   7. longDMLBind.js
 *
 * DESCRIPTION
 *    Test LONG type DML support.
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
const dbConfig  = require('../../../dbconfig.js');
const random = require('../../../random.js');

describe('7. longDMLBind.js', function() {
  let connection = null;
  const tableName = `nodb_long`;
  let insertID = 0;
  let memoryError = false; // flag for memory/tablespace error
  const table_create = `BEGIN \n
                          DECLARE \n
                              e_table_missing EXCEPTION; \n
                              PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n
                          BEGIN \n
                              EXECUTE IMMEDIATE('DROP TABLE ` + tableName + ` PURGE'); \n
                          EXCEPTION \n
                              WHEN e_table_missing \n
                              THEN NULL; \n
                          END; \n
                          EXECUTE IMMEDIATE (' \n
                              CREATE TABLE ` + tableName + ` ( \n
                                  id         NUMBER, \n
                                  content    LONG \n
                              ) \n
                          '); \n
                      END; `;
  const table_drop = `DROP TABLE ` + tableName + ` PURGE`;

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

  describe('7.1 INSERT and SELECT', function() {

    it('7.1.1 works with data size 1MB + 1', async function() {
      const size = 1 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(size);
      await test1(insertedStr);
    });

    it('7.1.2 works with data size 10MB + 1', async function() {
      const size = 10 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(size);
      await test1(insertedStr);
    });

    it('7.1.3 works with data size 50MB + 1', async function() {
      const size = 51 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(size);
      await test1(insertedStr);
    });

    it('7.1.4 works with data size 128MB + 1', async function() {
      const size = 128 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(size);
      await test1(insertedStr);
    });

    it('7.1.5 works with data size 256MB - 16', async function() {
      const bigStr_1 = getBigBuffer(1, 16);
      const bigStr_2 = getBigBuffer(1, 0);
      const totalLength = 256 * 1024 * 1024 - 16;
      const largeBuffer = Buffer.concat([bigStr_1, bigStr_2], totalLength);
      const insertedStr = largeBuffer.toString();
      await test1(insertedStr);
    });

  }); // 7.1

  describe('7.2 UPDATE', function() {

    it('7.2.1 works with data size 1MB + 1', async function() {
      const size = 1 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(65537);
      const updateStr = random.getRandomLengthString(size);
      await test2(insertedStr, updateStr);
    });

    it('7.2.2 works with data size 10MB + 1', async function() {
      const size = 10 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(65537);
      const updateStr = random.getRandomLengthString(size);
      await test2(insertedStr, updateStr);
    });

    it('7.2.3 works with data size 50MB + 1', async function() {
      const size = 50 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(40000);
      const updateStr = random.getRandomLengthString(size);
      await test2(insertedStr, updateStr);
    });

    it('7.2.4 works with data size 128MB + 1', async function() {
      const size = 128 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(80000);
      const updateStr = random.getRandomLengthString(size);
      await test2(insertedStr, updateStr);
    });

    it('7.2.5 works with data size 256MB - 16', async function() {
      const size = 128 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(size);
      const bigStr_1 = getBigBuffer(1, 16);
      const bigStr_2 = getBigBuffer(1, 0);
      const totalLength = 256 * 1024 * 1024 - 16;
      const largeBuffer = Buffer.concat([bigStr_1, bigStr_2], totalLength);
      const updateStr = largeBuffer.toString();
      await test2(insertedStr, updateStr);
    });
  });

  const test1 = async function(content) {
    await insert(content);
    await fetch(content);
  };

  const test2 = async function(insertedStr, updateStr) {
    await insert(insertedStr);
    await update(updateStr);
    if (memoryError === true) {
      await fetch(insertedStr);
    } else {
      await fetch(updateStr);
    }
  };

  const insert = async function(content) {
    const sql = `insert into ` + tableName + ` (id, content) values (:i, :c)`;
    let result = null;
    const bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING }
    };
    result = await connection.execute(sql, bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  const update = async function(content) {
    const sql = `update ` + tableName + ` set content = :c where id = :i`;
    let result = null;
    const bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING }
    };
    try {
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.rowsAffected, 1);
    } catch (err) {
      if (err) {
        // ORA-30036: unable to extend segment by 8 in undo tablespace
        assert.equal(err.message.substring(0, 10), `ORA-30036:`);
        memoryError = true;
      }
    }
  };

  const fetch = async function(expected) {
    const sql = `select content from ` + tableName + ` where id = ` + insertID;
    let result = null;
    result = await connection.execute(sql);
    assert.strictEqual(result.rows[0][0], expected);
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

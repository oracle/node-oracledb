/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 *   125. longDMLBind.js
 *
 * DESCRIPTION
 *    Test LONG type DML support.
 *    Long column restrictions: http://docs.oracle.com/cd/B19306_01/server.102/b14200/sql_elements001.htm#SQLRF00201
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');

describe('125. longDMLBind.js', function() {

  let connection = null;
  const tableName = "nodb_long";
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
                     "            content    LONG \n" +
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

  describe('125.1 INSERT and SELECT', function() {

    it('125.1.1 works with data size 64K - 1', async function() {
      await test1(random.getRandomLengthString(65535), 65535);
    });

    it('125.1.2 works with data size 64K', async function() {
      await test1(random.getRandomLengthString(65536), 65536);
    });

    it('125.1.3 works with data size 64K + 1', async function() {
      await test1(random.getRandomLengthString(65537), 65537);
    });

    it('125.1.4 works with data size 1MB + 1', async function() {
      const size = 1 * 1024 * 1024 + 1;
      await test1(random.getRandomLengthString(size), size);
    });

  }); // 125.1

  describe('125.2 UPDATE', function() {

    it('125.2.1 works with data size 64K - 1', async function() {
      await test2(random.getRandomLengthString(100), random.getRandomLengthString(65535), 65535);
    });

    it('125.2.2 works with data size 64K', async function() {
      await test2(random.getRandomLengthString(200), random.getRandomLengthString(65536), 65536);
    });

    it('125.2.3 works with data size 64K + 1', async function() {
      await test2(random.getRandomLengthString(10), random.getRandomLengthString(65537), 65537);
    });

    it('125.2.4 works with data size 1MB + 1', async function() {
      const size = 1 * 1024 * 1024 + 1;
      await test2(random.getRandomLengthString(65536), random.getRandomLengthString(size), size);
    });

  }); // 125.3

  describe('125.3 RETURNING INTO', function() {

    it('125.3.1 do not support in returning into', async function() {
      await test3(random.getRandomLengthString(100), random.getRandomLengthString(65535));
    });

  }); // 125.3

  const test1 = async function(content, maxsize) {
    await insert(content, maxsize);
    await fetch(content);
  };

  const test2 = async function(insertedStr, updateStr, maxsize) {
    await insert(insertedStr, insertedStr.length);
    await update(updateStr, maxsize);
    await fetch(updateStr);
  };

  const test3 = async function(insertedStr, updateStr) {
    await insert(insertedStr, insertedStr.length);
    await returning(updateStr);
  };

  const insert = async function(content, maxsize) {
    const sql_query = "insert into " + tableName + " (id, content) values (:i, :c)";
    const bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: maxsize }
    };
    const result = await connection.execute(sql_query, bindVar);
    assert(result);
    assert.equal(1, result.rowsAffected);
  };

  const update = async function(content, maxsize) {
    const sql_query = "update " + tableName + " set content = :c where id = :i";
    const bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: maxsize }
    };
    const result = await connection.execute(sql_query, bindVar);
    assert(result);
    assert.equal(1, result.rowsAffected);
  };

  const returning = async function(content) {
    const sql_query = "update " + tableName + " set content = :c1 where id = :i returning content into :c2";
    const bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c1: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING },
      c2: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
    };
    try {
      await connection.execute(sql_query, bindVar);
    } catch (err) {
      assert.equal(err.message.substring(0, 10), "ORA-22816:");
    }
    // ORA-22816: unsupported feature with RETURNING clause
  };

  const fetch = async function(expected) {
    const sql_query = "select content from " + tableName + " where id = " + insertID;
    const result = await connection.execute(sql_query);
    assert(result);
    assert.strictEqual(result.rows[0][0], expected);

  };

});

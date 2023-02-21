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
 *   126. longrawDMLBind.js
 *
 * DESCRIPTION
 *    Test LONG RAW type DML support.
 *    Long column restrictions: http://docs.oracle.com/cd/B19306_01/server.102/b14200/sql_elements001.htm#SQLRF00201
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');
const random   = require('./random.js');

describe('126. longrawDMLBind.js', function() {

  let connection;
  const tableName = "nodb_longraw";
  let insertID = 0;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    const sqlCreate =  `
        CREATE TABLE ${tableName} (
            id         NUMBER,
            content    LONG RAW
        )`;
    const sql = testsUtil.sqlCreateTable(tableName, sqlCreate);
    await connection.execute(sql);
  });

  after(async function() {
    const sql = testsUtil.sqlDropTable(tableName);
    await connection.execute(sql);
    await connection.close();
  });

  beforeEach(function() {
    insertID++;
  });

  describe('126.1 INSERT and SELECT', function() {

    it('126.1.1 works with data size 64K - 1', async function() {
      const insertedStr = random.getRandomLengthString(65535);
      const insertedBuf = Buffer.from(insertedStr);
      const maxsize = 65535;
      await test1(insertedBuf, maxsize);
    });

    it('126.1.2 works with data size 64K', async function() {
      const insertedStr = random.getRandomLengthString(65536);
      const insertedBuf = Buffer.from(insertedStr);
      const maxsize = 65536;
      await test1(insertedBuf, maxsize);
    });

    it('126.1.3 works with data size 64K + 1', async function() {
      const insertedStr = random.getRandomLengthString(65537);
      const insertedBuf = Buffer.from(insertedStr);
      const maxsize = 65537;
      await test1(insertedBuf, maxsize);
    });

    it('126.1.4 works with data size 1MB + 1', async function() {
      const size = 1 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(size);
      const insertedBuf = Buffer.from(insertedStr);
      await test1(insertedBuf, size);
    });

    it('126.1.5 works with data size 100', async function() {
      const insertedStr = random.getRandomLengthString(100);
      const insertedBuf = Buffer.from(insertedStr);
      await test1(insertedBuf, 100);
    });

    it('126.1.6 set maxSize to 2000', async function() {
      const insertedStr = random.getRandomLengthString(100);
      const insertedBuf = Buffer.from(insertedStr);
      const maxsize = 2000;
      await test1(insertedBuf, maxsize);
    });

    it('126.1.7 set maxSize to 4GB', async function() {
      const insertedStr = random.getRandomLengthString(100);
      const insertedBuf = Buffer.from(insertedStr);
      const maxsize = 4 * 1024 * 1024 * 1024;
      await test1(insertedBuf, maxsize);
    });

  }); // 126.1

  describe('126.2 UPDATE', function() {

    it('126.2.1 works with data size 64K - 1', async function() {
      const insertedStr = random.getRandomLengthString(100);
      const updateStr = random.getRandomLengthString(65535);
      const insertedBuf = Buffer.from(insertedStr);
      const updateBuf = Buffer.from(updateStr);
      await test2(insertedBuf, updateBuf, 65535);
    });

    it('126.2.2 works with data size 64K', async function() {
      const insertedStr = random.getRandomLengthString(200);
      const updateStr = random.getRandomLengthString(65536);
      const insertedBuf = Buffer.from(insertedStr);
      const updateBuf = Buffer.from(updateStr);
      await test2(insertedBuf, updateBuf, 65536);
    });

    it('126.2.3 works with data size 64K + 1', async function() {
      const insertedStr = random.getRandomLengthString(10);
      const updateStr = random.getRandomLengthString(65537);
      const insertedBuf = Buffer.from(insertedStr);
      const updateBuf = Buffer.from(updateStr);
      await test2(insertedBuf, updateBuf, 65537);
    });

    it('126.2.4 works with data size 1MB + 1', async function() {
      const size = 1 * 1024 * 1024 + 1;
      const insertedStr = random.getRandomLengthString(65536);
      const updateStr = random.getRandomLengthString(size);
      const insertedBuf = Buffer.from(insertedStr);
      const updateBuf = Buffer.from(updateStr);
      await test2(insertedBuf, updateBuf, size);
    });

    it('126.2.5 set maxSize to 2000', async function() {
      const insertedStr = random.getRandomLengthString(100);
      const updateStr = random.getRandomLengthString(500);
      const insertedBuf = Buffer.from(insertedStr);
      const updateBuf = Buffer.from(updateStr);
      await test2(insertedBuf, updateBuf, 2000);
    });

    it('126.2.6 set maxSize to 4GB', async function() {
      const insertedStr = random.getRandomLengthString(100);
      const updateStr = random.getRandomLengthString(500);
      const insertedBuf = Buffer.from(insertedStr);
      const updateBuf = Buffer.from(updateStr);
      const maxsize = 4 * 1024 * 1024 * 1024;
      await test2(insertedBuf, updateBuf, maxsize);
    });

  }); // 126.2

  describe.skip('126.3 RETURNING INTO', function() {

    it('126.3.1 works with data size 64K - 1', async function() {
      const insertedStr = random.getRandomLengthString(100);
      const updateStr = random.getRandomLengthString(65535);
      const insertedBuf = Buffer.from(insertedStr);
      const updateBuf = Buffer.from(updateStr);
      await test3(insertedBuf, updateBuf);
    });

  }); // 126.3

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
    const sql = "insert into " + tableName + " (id, content) values (:i, :c)";
    const bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER, maxSize: maxsize }
    };
    const result = await connection.execute(sql, bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  const update = async function(content, maxsize) {
    const sql = "update " + tableName + " set content = :c where id = :i";
    const bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER, maxSize: maxsize }
    };
    const result = await connection.execute(sql, bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  const returning = async function(content) {
    const sql = "update " + tableName + " set content = :c1 where id = :i returning content into :c2";
    const bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c1: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER },
      c2: { dir: oracledb.BIND_OUT, type: oracledb.BUFFER }
    };
    await connection.execute(sql, bindVar);
  };

  const fetch = async function(expected) {
    const sql = "select content from " + tableName + " where id = " + insertID;
    const result = await connection.execute(sql);
    assert.deepEqual(result.rows[0][0], expected);
  };

});

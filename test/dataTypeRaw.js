/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

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
 *   42. dataTypeRaw.js
 *
 * DESCRIPTION
 *   Testing Oracle data type support - RAW.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const assist   = require('./dataTypeAssist.js');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');

describe('42. dataTypeRaw.js', function() {

  let connection = null;
  let tableName = "nodb_raw";
  let insertID = 1;

  let bufLen = [10, 100, 1000, 2000]; // buffer length
  let bufs = [];
  for (let i = 0; i < bufLen.length; i++)
    bufs[i] = assist.createBuffer(bufLen[i]);

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('close connection', async function() {
    await connection.close();
  });

  describe('42.1 testing RAW data in various lengths', function() {

    before('create table, insert data', async function() {
      await assist.setUp(connection, tableName, bufs);
    });

    after(async function() {
      await connection.execute("DROP table " + tableName + " PURGE");
    });

    it('42.1.1 SELECT query', async function() {
      await assist.dataTypeSupport(connection, tableName, bufs);
    });

    it('42.1.2 resultSet stores RAW data correctly', async function() {
      await assist.verifyResultSet(connection, tableName, bufs);
    });

    it('42.1.3 works well with REF Cursor', async function() {
      await assist.verifyRefCursor(connection, tableName, bufs);
    });

    it('42.1.4 result set getRow() function works well with RAW', async function() {

      let sql1 = "select dummy, HEXTORAW('0123456789ABCDEF0123456789ABCDEF') from dual";
      let result = await connection.execute(
        sql1,
        [],
        { resultSet: true });

      await fetchOneRowFromRS(result.resultSet);

      async function fetchOneRowFromRS(rs) {
        let row = await rs.getRow();

        if (row) {
          await fetchOneRowFromRS(rs);
        } else {
          await rs.close();
        }
      }
    }); // 42.1.4

    it('42.1.5 a negative case which hits NJS-011 error', async function() {
      await assert.rejects(
        async () => await connection.execute(
          "INSERT INTO " + tableName + " (content ) VALUES (:c)",
          { c : { val: 1234, type: oracledb.BUFFER, dir:oracledb.BIND_IN } }),
        // NJS-011: encountered bind value and type mismatch
        /NJS-011:/
      );
    });
  });

  describe('42.2 stores null value correctly', function() {
    it('42.2.1 testing Null, Empty string and Undefined', async function() {
      await assist.verifyNullValues(connection, tableName);
    });
  });

  describe('42.3 DML Returning', function() {

    before('create table', async function() {
      await connection.execute(assist.sqlCreateTable(tableName));
    });

    after(async function() {
      await connection.execute("DROP table " + tableName + " PURGE");
    });

    it('42.3.1 INSERT statement with Object binding', async function() {
      let seq = 1;
      let size = 10;
      let bindValue = assist.createBuffer(size);

      let result = await connection.execute(
        "INSERT INTO " + tableName + " VALUES (:n, :c) RETURNING num, content INTO :rid, :rc",
        {
          n   : seq,
          c   : { type: oracledb.BUFFER, val: bindValue, dir: oracledb.BIND_IN },
          rid : { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rc  : { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 2000 }
        },
        { autoCommit: true });

      assert.strictEqual(result.outBinds.rid[0], seq);
      assert.deepStrictEqual(result.outBinds.rc[0], bindValue);
    });  // 42.3.1

    it('42.3.2 INSERT statement with ARRAY binding', async function() {
      let seq = 2;
      let size = 10;
      let bindValue = assist.createBuffer(size);

      let result = await connection.execute(
        "INSERT INTO " + tableName + " VALUES (:n, :c) RETURNING num, content INTO :rid, :rc",
        [
          seq,
          { type: oracledb.BUFFER, val: bindValue, dir: oracledb.BIND_IN },
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 2000 }
        ],
        { autoCommit: true });
      assert.strictEqual(result.outBinds[0][0], seq);
      assert.deepStrictEqual(result.outBinds[1][0], bindValue);
    }); // 42.3.2

    it('42.3.3 INSERT statement with exact maxSize restriction', async function() {
      let seq = 3;
      let size = 100;
      let bindValue = assist.createBuffer(size);

      let result = await connection.execute(
        "INSERT INTO " + tableName + " VALUES (:n, :c) RETURNING num, content INTO :rid, :rc",
        {
          n   : seq,
          c   : { type: oracledb.BUFFER, val: bindValue, dir: oracledb.BIND_IN },
          rid : { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rc  : { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size}
        },
        { autoCommit: true });
      assert.strictEqual(result.outBinds.rid[0], seq);
      assert.deepStrictEqual(result.outBinds.rc[0], bindValue);
    });

    it('42.3.4 UPDATE statement', async function() {
      let seq = 2;
      let size = 10;
      let bindValue = assist.createBuffer(size);

      let result = await connection.execute(
        "UPDATE " + tableName + " SET content = :c WHERE num = :n RETURNING num, content INTO :rid, :rc",
        {
          n   : seq,
          c   : { type: oracledb.BUFFER, val: bindValue, dir: oracledb.BIND_IN },
          rid : { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rc  : { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 2000 }
        },
        { autoCommit: true });
      assert.strictEqual(result.outBinds.rid[0], seq);
      assert.deepStrictEqual(result.outBinds.rc[0], bindValue);
    }); // 42.3.4

    it('42.3.5 DELETE statement with single row matching', async function() {
      let seq = 1;

      let result = await connection.execute(
        "DELETE FROM " + tableName + " WHERE num = :1 RETURNING num, content INTO :2, :3",
        [
          seq,
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 2000 }
        ],
        { autoCommit: true });
      assert.strictEqual(result.outBinds[0][0], seq);
    });

    it('42.3.6 DELETE statement with multiple rows matching', async function() {
      let seq = 1;

      let result = await connection.execute(
        "DELETE FROM " + tableName + " WHERE num > :n RETURNING num, content INTO :rid, :rc",
        {
          n   : seq,
          rid : { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rc  : { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 2000 }
        },
        { autoCommit: true });
      assert.deepStrictEqual(result.outBinds.rid, [2, 3]);
    });

  }); // 42.3

  describe('42.4 in PL/SQL, the maximum size is 32767', function() {

    let proc =
      "CREATE OR REPLACE PROCEDURE nodb_testraw (p_in IN RAW, p_out OUT RAW) " +
      "AS " +
      "BEGIN " +
      "  p_out := p_in; " +
      "END; ";

    before('create procedure', async function() {
      await connection.execute(proc);
    });

    after(async function() {
      await connection.execute("DROP PROCEDURE nodb_testraw");
    });

    it('42.4.1 works well when the length of data is less than maxSize', async function() {
      let size = 5;
      let buf = assist.createBuffer(size);

      let result = await connection.execute(
        "BEGIN nodb_testraw(:i, :o); END;",
        {
          i: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: buf },
          o: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 32800}
        });

      assert.strictEqual(Buffer.isBuffer(result.outBinds.o), true);
      assert.strictEqual(result.outBinds.o.length, size);
    });

    it('42.4.2 works well when the length of data is exactly 32767', async function() {
      let size = 32767;
      let buf = assist.createBuffer(size);

      let result = await connection.execute(
        "BEGIN nodb_testraw(:i, :o); END;",
        {
          i: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: buf },
          o: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 32767}
        });

      assert.deepStrictEqual(Buffer.isBuffer(result.outBinds.o), true);
      assert.strictEqual(result.outBinds.o.length, size);
    });

    it('42.4.3 throws error when the length of data is greater than maxSize', async function() {
      let size = 32700;
      let buf = assist.createBuffer(size);

      await assert.rejects(
        async () => await connection.execute(
          "BEGIN nodb_testraw(:i, :o); END;",
          {
            i: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: buf },
            o: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: (size - 100) }
          }),
        // ORA-06502: PL/SQL: numeric or value error\nORA-06512: at line 1
        /ORA-06502:/
      );
    });

    it('42.4.4 throws error when both data and maxSize are greater than 32767', async function() {
      let size = 32800;
      let buf = assist.createBuffer(size);
      await assert.rejects(
        async () => await connection.execute(
          "BEGIN nodb_testraw(:i, :o); END;",
          {
            i: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: buf },
            o: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 40000}
          }),
        // ORA-06502: PL/SQL: numeric or value error\nORA-06512: at line 1
        /ORA-06502:/
      );
    });
  }); // 42.4

  describe('42.5 INSERT and SELECT', function() {
    before(async function() {
      await connection.execute(assist.sqlCreateTable(tableName));
    });

    after(async function() {
      await connection.execute(
        "DROP table " + tableName + " PURGE");
    });

    beforeEach(function() {
      insertID++;
    });

    it('42.5.1 works with data size 100', async function() {
      let insertedStr = random.getRandomLengthString(100);
      let insertedBuf = Buffer.from(insertedStr);
      await test1(insertedBuf);
    });

    it('42.5.2 works with data size 2000', async function() {
      let insertedStr = random.getRandomLengthString(2000);
      let insertedBuf = Buffer.from(insertedStr);
      await test1(insertedBuf);
    });

    it('42.5.3 works with default type/dir', async function() {
      let insertedStr = random.getRandomLengthString(2000);
      let insertedBuf = Buffer.from(insertedStr);
      await test1_default(insertedBuf);
    });

  }); // 42.5

  describe('42.6 UPDATE', function() {
    before(async function() {
      await connection.execute(assist.sqlCreateTable(tableName));
    });

    after(async function() {
      await connection.execute("DROP table " + tableName + " PURGE");
    });

    beforeEach(function() {
      insertID++;
    });

    it('42.6.1 works with data size 100', async function() {
      let insertedStr = random.getRandomLengthString(20);
      let updateStr = random.getRandomLengthString(100);
      let insertedBuf = Buffer.from(insertedStr);
      let updateBuf = Buffer.from(updateStr);
      await test2(insertedBuf, updateBuf);
    });

    it('42.6.2 works with data size 2000', async function() {
      let insertedStr = random.getRandomLengthString(30);
      let updateStr = random.getRandomLengthString(2000);
      let insertedBuf = Buffer.from(insertedStr);
      let updateBuf = Buffer.from(updateStr);
      await test2(insertedBuf, updateBuf);
    });

    it('42.6.3 works with default type/dir', async function() {
      let insertedStr = random.getRandomLengthString(30);
      let updateStr = random.getRandomLengthString(2000);
      let insertedBuf = Buffer.from(insertedStr);
      let updateBuf = Buffer.from(updateStr);
      await test2_default(insertedBuf, updateBuf);
    });

  }); // 42.6

  let test1 = async function(content) {

    await insert(content);

    await fetch(content);
  };

  let test1_default = async function(content) {

    await insert_default(content);

    await fetch(content);
  };

  let test2 = async function(insertedStr, updateStr) {

    await insert(insertedStr);

    await update(updateStr);

    await fetch(updateStr);
  };

  let test2_default = async function(insertedStr, updateStr) {

    await insert(insertedStr);

    await update_default(updateStr);

    await fetch(updateStr);
  };

  let insert = async function(content) {
    let sql = "insert into " + tableName + " (num, content) values (:i, :c)";
    let bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
    };
    let result = await connection.execute(
      sql,
      bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  let insert_default = async function(content) {
    let sql = "insert into " + tableName + " (num, content) values (:i, :c)";
    let bindVar = {
      i: insertID,
      c: content
    };
    let result = await connection.execute(
      sql,
      bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  let update = async function(content) {
    let sql = "update " + tableName + " set content = :c where num = :i";
    let bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
    };
    let result = await connection.execute(
      sql,
      bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  let update_default = async function(content) {
    let sql = "update " + tableName + " set content = :c where num = :i";
    let bindVar = {
      i: insertID,
      c: content
    };
    let result = await connection.execute(
      sql,
      bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  let fetch = async function(expected) {
    let sql = "select content from " + tableName + " where num = " + insertID;
    let result = await connection.execute(sql);
    assert.deepStrictEqual(result.rows[0][0], expected);
  };
});

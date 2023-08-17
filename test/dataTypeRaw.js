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
const testsUtil = require('./testsUtil.js');

describe('42. dataTypeRaw.js', function() {

  let connection = null;
  const tableName = "nodb_raw";
  let insertID = 1;
  const bufferToHexString = (v) => (v === null) ? null : v.toString('hex').toUpperCase();

  const bufLen = [10, 100, 1000, 2000]; // buffer length
  const bufs = [];
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

      const sql1 = "select dummy, HEXTORAW('0123456789ABCDEF0123456789ABCDEF') from dual";
      const result = await connection.execute(
        sql1,
        [],
        { resultSet: true });

      await fetchOneRowFromRS(result.resultSet);

      async function fetchOneRowFromRS(rs) {
        const row = await rs.getRow();

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
      const seq = 1;
      const size = 10;
      const bindValue = assist.createBuffer(size);

      const result = await connection.execute(
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
      const seq = 2;
      const size = 10;
      const bindValue = assist.createBuffer(size);

      const result = await connection.execute(
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
      const seq = 3;
      const size = 100;
      const bindValue = assist.createBuffer(size);

      const result = await connection.execute(
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
      const seq = 2;
      const size = 10;
      const bindValue = assist.createBuffer(size);

      const result = await connection.execute(
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
      const seq = 1;

      const result = await connection.execute(
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
      const seq = 1;

      const result = await connection.execute(
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

    const proc =
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
      const size = 5;
      const buf = assist.createBuffer(size);

      const result = await connection.execute(
        "BEGIN nodb_testraw(:i, :o); END;",
        {
          i: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: buf },
          o: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 32800}
        });

      assert.strictEqual(Buffer.isBuffer(result.outBinds.o), true);
      assert.strictEqual(result.outBinds.o.length, size);
    });

    it('42.4.2 works well when the length of data is exactly 32767', async function() {
      const size = 32767;
      const buf = assist.createBuffer(size);

      const result = await connection.execute(
        "BEGIN nodb_testraw(:i, :o); END;",
        {
          i: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: buf },
          o: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 32767}
        });

      assert.deepStrictEqual(Buffer.isBuffer(result.outBinds.o), true);
      assert.strictEqual(result.outBinds.o.length, size);
    });

    it('42.4.3 throws error when the length of data is greater than maxSize', async function() {
      const size = 32700;
      const buf = assist.createBuffer(size);

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
      const size = 32800;
      const buf = assist.createBuffer(size);
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
      oracledb.fetchAsString = [];
    });

    beforeEach(function() {
      insertID++;
    });

    it('42.5.1 works with data size 100', async function() {
      const insertedStr = random.getRandomLengthString(100);
      const insertedBuf = Buffer.from(insertedStr);
      await test1(insertedBuf);
    });

    it('42.5.2 works with data size 2000', async function() {
      const insertedStr = random.getRandomLengthString(2000);
      const insertedBuf = Buffer.from(insertedStr);
      await test1(insertedBuf);
    });

    it('42.5.3 works with default type/dir', async function() {
      const insertedStr = random.getRandomLengthString(2000);
      const insertedBuf = Buffer.from(insertedStr);
      await test1_default(insertedBuf);
    });

    it('42.5.4 works with default type/dir and fetch as string', async function() {
      const insertedStr = random.getRandomLengthString(2000);
      const insertedBuf = Buffer.from(insertedStr);
      await test1_default_string(insertedBuf);
    });

    it('42.5.5 works with data size 2000 and fetch as string', async function() {
      const insertedStr = random.getRandomLengthString(2000);
      const insertedBuf = Buffer.from(insertedStr);
      await test1_string(insertedBuf);
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
      const insertedStr = random.getRandomLengthString(20);
      const updateStr = random.getRandomLengthString(100);
      const insertedBuf = Buffer.from(insertedStr);
      const updateBuf = Buffer.from(updateStr);
      await test2(insertedBuf, updateBuf);
    });

    it('42.6.2 works with data size 2000', async function() {
      const insertedStr = random.getRandomLengthString(30);
      const updateStr = random.getRandomLengthString(2000);
      const insertedBuf = Buffer.from(insertedStr);
      const updateBuf = Buffer.from(updateStr);
      await test2(insertedBuf, updateBuf);
    });

    it('42.6.3 works with default type/dir', async function() {
      const insertedStr = random.getRandomLengthString(30);
      const updateStr = random.getRandomLengthString(2000);
      const insertedBuf = Buffer.from(insertedStr);
      const updateBuf = Buffer.from(updateStr);
      await test2_default(insertedBuf, updateBuf);
    });

  }); // 42.6

  const test1 = async function(content) {

    await insert(content);

    await fetch(content);
  };

  const test1_default = async function(content) {

    await insert_default(content);

    await fetch(content);
  };

  const test1_string = async function(content) {
    await insert(content);
    await fetchString(bufferToHexString(content));
  };

  const test1_default_string = async function(content) {
    await insert_default(content);
    await fetchString(bufferToHexString(content));
  };

  const test2 = async function(insertedStr, updateStr) {

    await insert(insertedStr);

    await update(updateStr);

    await fetch(updateStr);
  };

  const test2_default = async function(insertedStr, updateStr) {

    await insert(insertedStr);

    await update_default(updateStr);

    await fetch(updateStr);
  };

  const insert = async function(content) {
    const sql = "insert into " + tableName + " (num, content) values (:i, :c)";
    const bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
    };
    const result = await connection.execute(
      sql,
      bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  const insert_default = async function(content) {
    const sql = "insert into " + tableName + " (num, content) values (:i, :c)";
    const bindVar = {
      i: insertID,
      c: content
    };
    const result = await connection.execute(
      sql,
      bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  const update = async function(content) {
    const sql = "update " + tableName + " set content = :c where num = :i";
    const bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
    };
    const result = await connection.execute(
      sql,
      bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  const update_default = async function(content) {
    const sql = "update " + tableName + " set content = :c where num = :i";
    const bindVar = {
      i: insertID,
      c: content
    };
    const result = await connection.execute(
      sql,
      bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  const fetch = async function(expected) {
    const sql = "select content from " + tableName + " where num = " + insertID;
    const result = await connection.execute(sql);
    assert.deepStrictEqual(result.rows[0][0], expected);
  };

  const fetchString = async function(expected) {
    oracledb.fetchAsString = [oracledb.DB_TYPE_RAW];
    const sql = "select content from " + tableName + " where num = " + insertID;
    const result = await connection.execute(sql);
    assert.deepStrictEqual(result.rows[0][0], expected);
  };

  describe('42.7 DB_TYPE_RAW in Advanced Queue (AQ)', function() {
    let isRunnable = true;
    let conn;
    const AQ_USER = 'NODB_SCHEMA_AQTEST8';
    const AQ_USER_PWD = testsUtil.generateRandomPassword();
    const rawQueueName = "NODB_RAW_QUEUE8";
    const RAW_TABLE = "NODB_RAW_QUEUE_TAB";

    before(async function() {
      if (!dbConfig.test.DBA_PRIVILEGE || oracledb.thin) {
        isRunnable = false;
      }
      if (!isRunnable) {
        this.skip();
      } else {
        await testsUtil.createAQtestUser(AQ_USER, AQ_USER_PWD);
        const credential = {
          user:             AQ_USER,
          password:         AQ_USER_PWD,
          connectionString: dbConfig.connectString
        };
        conn = await oracledb.getConnection(credential);

        const plsql = `
          BEGIN
            DBMS_AQADM.CREATE_QUEUE_TABLE(
              QUEUE_TABLE         => '${AQ_USER}.${RAW_TABLE}',
              QUEUE_PAYLOAD_TYPE  =>  'RAW'
            );
            DBMS_AQADM.CREATE_QUEUE(
              QUEUE_NAME   => '${AQ_USER}.${rawQueueName}',
              QUEUE_TABLE  => '${AQ_USER}.${RAW_TABLE}'
            );
            DBMS_AQADM.START_QUEUE(
              QUEUE_NAME    => '${AQ_USER}.${rawQueueName}'
            );
          END;
        `;
        await conn.execute(plsql);
      }
    });   //before

    after(async function() {
      if (!isRunnable) {
        return;
      } else {
        await conn.close ();
        await testsUtil.dropAQtestUser(AQ_USER);
      }
    });   // after

    it('42.7.1 enqOne/deqOne with DB_TYPE_RAW specified', async () => {
      const queue1 = await conn.getQueue(rawQueueName,
        { payloadType: oracledb.DB_TYPE_RAW }
      );
      const messageString = 'This is my message';
      const msgBuf = Buffer.from(messageString, 'utf8');
      await queue1.enqOne(msgBuf);
      await conn.commit();

      //Dequeue
      const queue2 = await conn.getQueue(rawQueueName);
      const msg = await queue2.deqOne();
      assert(msg);
      assert.strictEqual(msg.payload.toString(), messageString);
    });    // 42.7.1

    it('42.7.2 enqMany/deqMany with DB_TYPE_RAW specified', async () => {
      const queue1 = await conn.getQueue(rawQueueName,
        {payloadType: oracledb.DB_TYPE_RAW});
      const messages1 = [
        "Message 1",
        Buffer.from ("Message 2", "utf-8"),
        Buffer.from ("Message 3", "utf-8"),
        "Message 4"
      ];
      await queue1.enqMany(messages1);
      await conn.commit ();

      /*Dequeue */
      const queue2 = await conn.getQueue(rawQueueName);
      const messages2 = await queue2.deqMany(5);
      await conn.commit ();
      assert.strictEqual(messages2.length, messages1.length);
      assert.strictEqual(messages2[0].payload.toString(), messages1[0]);
      assert.strictEqual(messages2[1].payload.toString(),
        messages1[1].toString());
      assert.strictEqual(messages2[2].payload.toString(),
        messages1[2].toString());
      assert.strictEqual(messages2[3].payload.toString(), messages1[3]);
    });

  });

});

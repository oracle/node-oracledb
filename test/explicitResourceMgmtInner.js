/* Copyright (c) 2026, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   explicitResourceMgmtInner.js
 *
 * DESCRIPTION
 *   Container file for Explicit Resource Management tests for Connection,
 *   Pool, and ResultSet objects.
 *   This feature requires Node.js 24 or later.
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');

describe('323. explicitResourceMgmt.js', function() {

  describe('323.1 Connection with await using', function() {
    it('323.1.1 basic connection is closed at scope exit', async function() {
      let conn;
      {
        await using connection = await oracledb.getConnection(dbConfig);
        conn = connection;
        const result = await connection.execute('SELECT 1 FROM DUAL');
        assert.strictEqual(result.rows[0][0], 1);
      }

      await assert.rejects(
        () => conn.execute('SELECT 1 FROM DUAL'),
        /NJS-003:/ // NJS-003: invalid or closed connection
      );
    });

    it('323.1.2 connection close with SQL error', async function() {
      let conn;

      await assert.rejects(
        async () => {
          await using connection = await oracledb.getConnection(dbConfig);
          conn = connection;
          await connection.execute('SELECT * FROM non_existent_table');
        },
        /ORA-00942:/ // table or view does not exist
      );

      // ERM must still close the connection
      await assert.rejects(
        () => conn.execute('SELECT 1 FROM DUAL'),
        /NJS-003:/ // NJS-003: invalid or closed connection
      );
    });

    it('323.1.3 manual close inside await using results in closed connection', async function() {
      let conn;

      await assert.rejects(
        async () => {
          await using connection = await oracledb.getConnection(dbConfig);
          conn = connection;
          await connection.close();
        },
        /NJS-003:/ // NJS-003: invalid or closed connection
      );

      await assert.rejects(
        () => conn.execute('SELECT 1 FROM DUAL'),
        /NJS-003:/ // NJS-003: invalid or closed connection
      );
    });

    it('323.1.4 connection object unusable after block', async function() {
      let conn;

      {
        await using connection = await oracledb.getConnection(dbConfig);
        conn = connection;
        await connection.execute('SELECT 1 FROM DUAL');
      }

      await assert.rejects(
        () => conn.ping(),
        /NJS-003:/ // NJS-003: invalid or closed connection
      );
    });
  });

  describe('323.2 Pool with await using', function() {

    it('323.2.1 pool is closed at scope exit', async function() {
      let pool;

      {
        await using p = await oracledb.createPool(dbConfig);
        pool = p;

        const conn = await pool.getConnection();
        await conn.execute('SELECT 1 FROM DUAL');
        await conn.close();
      }

      await assert.rejects(
        () => pool.getConnection(),
        /NJS-065:/ // NJS-065: connection pool was closed
      );
    });

    it('323.2.2 pool closes even when error is thrown', async function() {
      let pool;

      await assert.rejects(
        async () => {
          await using p = await oracledb.createPool(dbConfig);
          pool = p;
          throw new Error('forced error');
        },
        /forced error/
      );

      await assert.rejects(
        async () => await pool.getConnection(),
        /NJS-065:/ // NJS-065: connection pool was closed
      );
    });

    it('323.2.3 create connection in the pool also with await using', async function() {
      let pool;

      {
        await using p = await oracledb.createPool(dbConfig);
        pool = p;

        await using conn = await pool.getConnection();
        await conn.execute('SELECT 1 FROM DUAL');
      }

      await assert.rejects(
        () => pool.getConnection(),
        /NJS-065:/ // NJS-065: connection pool was closed
      );
    });
  });

  describe('323.3 ResultSet with await using', function() {
    let conn;

    beforeEach(async function() {
      conn = await oracledb.getConnection(dbConfig);
    });

    afterEach(async function() {
      if (conn) {
        await conn.close();
        conn = null;
      }
    });

    it('323.3.1 resultSet is closed at scope exit', async function() {
      let rs;

      const result = await conn.execute(
        'SELECT level FROM dual CONNECT BY level <= 2',
        [],
        { resultSet: true }
      );

      {
        await using r = result.resultSet;
        rs = r;
        const row = await r.getRow();
        assert.strictEqual(row[0], 1);
      }

      await assert.rejects(
        () => rs.getRow(),
        /NJS-018:/ // NJS-018: invalid ResultSet
      );
    });

    it('323.3.2 resultSet close does not close connection', async function() {
      const result = await conn.execute(
        'SELECT 1 FROM DUAL',
        [],
        { resultSet: true }
      );

      {
        await using rs = result.resultSet;
        await rs.getRow();
      }

      const res = await conn.execute('SELECT 1 FROM DUAL');
      assert.strictEqual(res.rows[0][0], 1);
    });
  });

  describe('323.4 Combined scenarios', function() {

    it('323.4.1 pool, connection and resultSet are all closed', async function() {
      let pool, conn, rs;

      {
        await using p = await oracledb.createPool(dbConfig);
        pool = p;

        await using c = await pool.getConnection();
        conn = c;

        const result = await conn.execute(
          'SELECT level FROM dual CONNECT BY level <= 1',
          [],
          { resultSet: true }
        );

        await using r = result.resultSet;
        rs = r;

        const row = await rs.getRow();
        assert.strictEqual(row[0], 1);
      }

      await assert.rejects(() => rs.getRow(), /NJS-018:/);
      await assert.rejects(() => conn.execute('SELECT 1 FROM DUAL'), /NJS-003:/);
      await assert.rejects(() => pool.getConnection(), /NJS-065:/);
    });

    it('323.4.2 resources are cleaned up when error occurs mid-scope', async function() {
      let pool, conn;

      await assert.rejects(
        async () => {
          await using p = await oracledb.createPool(dbConfig);
          pool = p;

          await using c = await pool.getConnection();
          conn = c;

          throw new Error('combined error');
        },
        /combined error/
      );

      await assert.rejects(() => conn.execute('SELECT 1 FROM DUAL'), /NJS-003:/);
      await assert.rejects(() => pool.getConnection(), /NJS-065:/);
    });

    it('323.4.3 parallel connections are all closed', async function() {
      let conn1, conn2;

      {
        await using pool = await oracledb.createPool({ ...dbConfig, poolMin: 2, poolMax: 5 });

        await using c1 = await pool.getConnection();
        await using c2 = await pool.getConnection();

        conn1 = c1;
        conn2 = c2;

        const [r1, r2] = await Promise.all([
          conn1.execute('SELECT 1 FROM DUAL'),
          conn2.execute('SELECT 2 FROM DUAL')
        ]);

        assert.strictEqual(r1.rows[0][0], 1);
        assert.strictEqual(r2.rows[0][0], 2);
      }

      await assert.rejects(() => conn1.execute('SELECT 1 FROM DUAL'), /NJS-003:/);
      await assert.rejects(() => conn2.execute('SELECT 1 FROM DUAL'), /NJS-003:/);
    });
  });

  describe('323.5 Edge cases and error scenarios', function() {

    it('323.5.1 double close inside await using throws', async function() {
      await assert.rejects(
        async () => {
          await using conn = await oracledb.getConnection(dbConfig);
          await conn.close();
        },
        /NJS-003:/ // NJS-003: invalid or closed connection
      );
    });

    it('323.5.2 manual double close throws', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      await conn.close();

      await assert.rejects(
        () => conn.close(),
        /NJS-003:/ // NJS-003: invalid or closed connection
      );
    });
  });

  describe('323.6 pool dispose with busy connections', function() {
    let pool;
    let leakedConn;

    after(async function() {
      if (leakedConn) {
        await leakedConn.close();
        leakedConn = null;
      }

      if (pool) {
        await pool.close(0); // force close to drain event loop
        pool = null;
      }
    });

    it('323.6.1 pool dispose throws when connections are busy', async function() {
      await assert.rejects(
        async () => {
          await using p = await oracledb.createPool(dbConfig);
          pool = p;

          leakedConn = await pool.getConnection();
          const result = await leakedConn.execute('SELECT 1 FROM DUAL');
          assert.strictEqual(result.rows[0][0], 1);

          // Intentionally leak the connection
        },
        /NJS-104:/ // connection pool cannot be closed because connections are busy
      );
    });
  });
});

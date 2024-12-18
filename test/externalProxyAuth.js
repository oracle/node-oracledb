/* Copyright (c) 2021, 2024, Oracle and/or its affiliates. */

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
 *   180. externalProxyAuth.js
 *
 * DESCRIPTION
 *   Test external proxy authentication.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

async function ShowUserInfo(conn) {
  const result = await conn.execute(`
    select
      sys_context('USERENV', 'PROXY_USER'),
      sys_context('USERENV', 'SESSION_USER')
    from dual`);
  return [result.rows[0][0], result.rows[0][1]];
}

describe('180. externalProxyAuth.js', function() {

  before('Check version greater than 1202000000', async function() {
    const preReqSucc = await testsUtil.checkPrerequisites(1202000000, 1202000000);
    if (!preReqSucc) {
      console.log("    Version less than 1202000000, Aborting.");
      this.skip();
    }
  });

  describe('180.1 Non-Pool Connect', function() {

    it('180.1.1 Non-Pool Connect: Username-Password Auth', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const schema = await testsUtil.getUser(conn);
      const [proxy_user, session_user] = await ShowUserInfo(conn);
      assert.strictEqual(proxy_user, null);
      assert.strictEqual(session_user, schema);
      await conn.close();
    });

    it('180.1.2 Non-Pool Connect: External Auth', async function() {
      if (!dbConfig.test.externalAuth) {
        this.skip();
      }
      const conn = await oracledb.getConnection({
        connectString: dbConfig.connectString,
        externalAuth: true
      });
      const schema = await testsUtil.getUser(conn);
      const [proxy_user, session_user] = await ShowUserInfo(conn);
      assert.strictEqual(proxy_user, null);
      assert.strictEqual(session_user, schema);
      await conn.close();
    });

    it('180.1.3 Non-Pool Connect: Username-Password Auth with proxy', async function() {
      if (!dbConfig.test.proxySessionUser) {
        this.skip();
      }
      const conn = await oracledb.getConnection({
        ...dbConfig,
        user: `${dbConfig.user}[${dbConfig.test.proxySessionUser}]`,
      });
      const schema = await testsUtil.getUser(conn);
      const [proxy_user, session_user] = await ShowUserInfo(conn);
      assert.strictEqual(proxy_user, schema);
      assert.strictEqual(session_user, dbConfig.test.proxySessionUser.toUpperCase());
      await conn.close();
    });

    it('180.1.4 Non-Pool Connect: External Auth with proxy', async function() {
      if (!dbConfig.test.externalAuth || !dbConfig.test.proxySessionUser) {
        this.skip();
      }
      const conn = await oracledb.getConnection({
        connectString: dbConfig.connectString,
        user: `[${dbConfig.test.proxySessionUser}]`,
        externalAuth: true,
      });
      const schema = await testsUtil.getUser(conn);
      const [proxy_user, session_user] = await ShowUserInfo(conn);
      assert.strictEqual(proxy_user, schema);
      assert.strictEqual(session_user, dbConfig.test.proxySessionUser.toUpperCase());
      await conn.close();
    });

    it('180.1.5 Non-Pool Connect: External Auth with proxy no brackets', async function() {
      if (!dbConfig.test.externalAuth || !dbConfig.test.proxySessionUser) {
        this.skip();
      }
      await assert.rejects(
        async () => {
          await oracledb.getConnection({
            connectString: dbConfig.connectString,
            user: dbConfig.test.proxySessionUser,
            externalAuth: true,
          });
        },
        /NJS-140:/
      );
    });

    it('180.1.6 Non-Pool Connect: External Auth with proxy and session user', async function() {
      if (!dbConfig.test.externalAuth || !dbConfig.test.proxySessionUser) {
        this.skip();
      }

      await assert.rejects(
        async () => {
          await oracledb.getConnection({
            connectString: dbConfig.connectString,
            user: `${dbConfig.user}[${dbConfig.test.proxySessionUser}]`,
            externalAuth: true,
          });
        },
        /NJS-140:/
      );
    });

  });

  describe('180.2 Pooled Connect', function() {

    it('180.2.1 Pooled Connect: Username-Password Auth', async function() {
      const pool = await oracledb.createPool(dbConfig);
      const conn = await pool.getConnection();
      const schema = await testsUtil.getUser(conn);
      const [proxy_user, session_user] = await ShowUserInfo(conn);
      assert.strictEqual(proxy_user, null);
      assert.strictEqual(session_user, schema);
      await conn.close();
      await pool.close(0);
    });

    it('180.2.2 Pooled Connect: External Auth', async function() {
      if (!dbConfig.test.externalAuth) {
        this.skip();
      }
      const pool = await oracledb.createPool({
        connectString: dbConfig.connectString,
        externalAuth: true,
      });
      const conn = await pool.getConnection();
      const schema = await testsUtil.getUser(conn);
      const [proxy_user, session_user] = await ShowUserInfo(conn);
      assert.strictEqual(proxy_user, null);
      assert.strictEqual(session_user, schema);
      await conn.close();
      await pool.close(0);
    });

    it('180.2.3 Pooled Connect: Username-Password Auth with proxy when create pool', async function() {
      if (!dbConfig.test.proxySessionUser) {
        this.skip();
      }
      const pool = await oracledb.createPool({
        ...dbConfig,
        user: `${dbConfig.user}[${dbConfig.test.proxySessionUser}]`,
      });
      const conn = await pool.getConnection();
      const schema = await testsUtil.getUser(conn);
      const [proxy_user, session_user] = await ShowUserInfo(conn);
      assert.strictEqual(proxy_user, schema);
      assert.strictEqual(session_user, dbConfig.test.proxySessionUser.toUpperCase());
      await conn.close();
      await pool.close(0);
    });

    it('180.2.4 Pooled Connect: Username-Password Auth with proxy when acquire connection', async function() {
      if (oracledb.thin || !dbConfig.test.proxySessionUser) {
        this.skip();
      }
      const pool = await oracledb.createPool({
        ...dbConfig,
        homogeneous: false,
      });
      const conn = await pool.getConnection({ "user": dbConfig.test.proxySessionUser });
      const schema = await testsUtil.getUser(conn);
      const [proxy_user, session_user] = await ShowUserInfo(conn);
      assert.strictEqual(proxy_user, schema);
      assert.strictEqual(session_user, dbConfig.test.proxySessionUser.toUpperCase());
      await conn.close();
      await pool.close(0);
    });

    it('180.2.5 Pooled Connect: Username-Password Auth with proxy when acquire connection', async function() {
      if (!oracledb.thin || !dbConfig.test.proxySessionUser) {
        this.skip();
      }
      const pool = await oracledb.createPool({
        ...dbConfig,
        homogeneous: false,
      });
      await assert.rejects(
        async () => {
          await pool.getConnection({ "user": `[${dbConfig.test.proxySessionUser}]` });
        },
        /ORA-00987:/
      );
      await pool.close(0);
    });

    it('180.2.6 Pooled Connect: External Auth with proxy when create pool', async function() {
      if (!dbConfig.test.externalAuth || !dbConfig.test.proxySessionUser) {
        this.skip();
      }
      await assert.rejects(
        async () => {
          await oracledb.createPool({
            connectString: dbConfig.connectString,
            user: `[${dbConfig.test.proxySessionUser}]`,
            externalAuth: true,
          });
        },
        /NJS-136:/
      );
    });

    it('180.2.7 Pooled Connect: External Auth with proxy no brackets when create pool', async function() {
      if (!dbConfig.test.externalAuth || !dbConfig.test.proxySessionUser) {
        this.skip();
      }
      await assert.rejects(
        async () => {
          await oracledb.createPool({
            connectString: dbConfig.connectString,
            user: dbConfig.test.proxySessionUser,
            externalAuth: true,
          });
        },
        /NJS-136:/
      );
    });

    it('180.2.8 Pooled Connect: External Auth with proxy when acquire connection', async function() {
      if (!dbConfig.test.externalAuth || !dbConfig.test.proxySessionUser) {
        this.skip();
      }
      const pool = await oracledb.createPool({
        connectString: dbConfig.connectString,
        externalAuth: true,
      });
      const conn = await pool.getConnection({user: `[${dbConfig.test.proxySessionUser}]`});
      const schema = await testsUtil.getUser(conn);
      const [proxy_user, session_user] = await ShowUserInfo(conn);
      assert.strictEqual(proxy_user, schema);
      assert.strictEqual(session_user, dbConfig.test.proxySessionUser.toUpperCase());
      await conn.close();
      await pool.close(0);
    });

    it('180.2.9 Pooled Connect: External Auth with proxy no brackets when acquire connection', async function() {
      if (!dbConfig.test.externalAuth || !dbConfig.test.proxySessionUser) {
        this.skip();
      }
      const pool = await oracledb.createPool({
        connectString: dbConfig.connectString,
        externalAuth: true,
      });
      await assert.rejects(
        async () => {
          await pool.getConnection({user: dbConfig.test.proxySessionUser});
        },
        /NJS-140:/
      );
      await pool.close(0);
    });
  });
});

/* Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   180. externalProxyAuth.js
 *
 * DESCRIPTION
 *   Test external proxy authentication.
 *   Source the externalProxyAuthSetup.tcsh in csh shell first
 *   Make sure the env vars described in externalProxyAuthSetup.tcsh are set
 *   Tests on external authentication will skip if environment variable
 *     NODE_ORACLEDB_EXTERNALAUTH is not set or set to false
 *   All cases should pass
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js')

async function ShowUserInfo(conn) {
  let result = await conn.execute(`
    select
      sys_context('USERENV', 'PROXY_USER'),
      sys_context('USERENV', 'SESSION_USER')
    from dual`);
  return [result.rows[0][0], result.rows[0][1]]
};


describe('180. externalProxyAuth.js', function () {

  before('Check version greater than 1202000000', async function () {
    let preReqSucc = await testsUtil.checkPrerequisites(1202000000, 1202000000);
    if (!preReqSucc) {
      console.log("    Version less than 1202000000, Aborting.");
      this.skip();
    }
  });

  describe('180.1 Non-Pool Connect', function () {

    it('180.1.1 Non-Pool Connect: Username-Password Auth', async function () {
      let conn;
      try {
        conn = await oracledb.getConnection(dbconfig);
        const [proxy_user, session_user] = await ShowUserInfo(conn);
        should.strictEqual(proxy_user, null);
        should.strictEqual(session_user, dbconfig.user.toUpperCase());
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('180.1.2 Non-Pool Connect: External Auth', async function () {
      if (!dbconfig.test.externalAuth) {
        this.skip();
      }
      let conn;
      try {
        conn = await oracledb.getConnection({
          connectString: dbconfig.connectString,
          externalAuth: true
        });
        const [proxy_user, session_user] = await ShowUserInfo(conn);
        should.strictEqual(proxy_user, null);
        should.strictEqual(session_user, dbconfig.user.toUpperCase());
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('180.1.3 Non-Pool Connect: Username-Password Auth with proxy', async function () {
      if (!dbconfig.test.proxySessionUser) {
        this.skip();
      }
      let conn;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          user: `${dbconfig.user}[${dbconfig.test.proxySessionUser}]`,
        });
        const [proxy_user, session_user] = await ShowUserInfo(conn);
        should.strictEqual(proxy_user, dbconfig.user.toUpperCase());
        should.strictEqual(session_user, dbconfig.test.proxySessionUser.toUpperCase());
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('180.1.4 Non-Pool Connect: External Auth with proxy', async function () {
      if (!dbconfig.test.externalAuth || !dbconfig.test.proxySessionUser) {
        this.skip();
      }
      let conn;
      try {
        conn = await oracledb.getConnection({
          connectString: dbconfig.connectString,
          user: `[${dbconfig.test.proxySessionUser}]`,
          externalAuth: true,
        });
        const [proxy_user, session_user] = await ShowUserInfo(conn);
        should.strictEqual(proxy_user, dbconfig.user.toUpperCase());
        should.strictEqual(session_user, dbconfig.test.proxySessionUser.toUpperCase());
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('180.1.5 Non-Pool Connect: External Auth with proxy no brackets', async function () {
      if (!dbconfig.test.externalAuth || !dbconfig.test.proxySessionUser) {
        this.skip();
      }
      let conn;
      try {
        await testsUtil.assertThrowsAsync(
          async () => {
            conn = await oracledb.getConnection({
              connectString: dbconfig.connectString,
              user: dbconfig.test.proxySessionUser,
              externalAuth: true,
            });
            const [proxy_user, session_user] = await ShowUserInfo(conn);
          },
         /DPI-1069:/
        );
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });
  });

  describe('180.2 Pooled Connect', function () {

    it('180.2.1 Pooled Connect: Username-Password Auth', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool(dbconfig);
        conn = await pool.getConnection();
        const [proxy_user, session_user] = await ShowUserInfo(conn);
        should.strictEqual(proxy_user, null);
        should.strictEqual(session_user, dbconfig.user.toUpperCase());
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('180.2.2 Pooled Connect: External Auth', async function () {
      if (!dbconfig.test.externalAuth) {
        this.skip();
      }
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          connectString: dbconfig.connectString,
          externalAuth: true,
        });
        conn = await pool.getConnection();
        const [proxy_user, session_user] = await ShowUserInfo(conn);
        should.strictEqual(proxy_user, null);
        should.strictEqual(session_user, dbconfig.user.toUpperCase());
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('180.2.3 Pooled Connect: Username-Password Auth with proxy when create pool', async function () {
      if (!dbconfig.test.proxySessionUser) {
        this.skip();
      }
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          user: `${dbconfig.user}[${dbconfig.test.proxySessionUser}]`,
        });
        conn = await pool.getConnection();
        const [proxy_user, session_user] = await ShowUserInfo(conn);
        should.strictEqual(proxy_user, dbconfig.user.toUpperCase());
        should.strictEqual(session_user, dbconfig.test.proxySessionUser.toUpperCase());
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('180.2.4 Pooled Connect: Username-Password Auth with proxy when acquire connection', async function () {
      if (!dbconfig.test.proxySessionUser) {
        this.skip();
      }
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          homogeneous: false,
        });
        conn = await pool.getConnection({ "user": dbconfig.test.proxySessionUser });
        const [proxy_user, session_user] = await ShowUserInfo(conn);
        should.strictEqual(proxy_user, dbconfig.user.toUpperCase());
        should.strictEqual(session_user, dbconfig.test.proxySessionUser.toUpperCase());
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('180.2.5 Pooled Connect: Username-Password Auth with proxy when acquire connection', async function () {
      if (!dbconfig.test.proxySessionUser) {
        this.skip();
      }
      let conn, pool;
      try {
        await testsUtil.assertThrowsAsync(
          async () => {
            pool = await oracledb.createPool({
              ...dbconfig,
              homogeneous: false,
            });
            conn = await pool.getConnection({ "user": `[${dbconfig.test.proxySessionUser}]` });
            const [proxy_user, session_user] = await ShowUserInfo(conn);
          },
         /ORA-00987:/
        );
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('180.2.6 Pooled Connect: External Auth with proxy when create pool', async function () {
      if (!dbconfig.test.externalAuth || !dbconfig.test.proxySessionUser) {
        this.skip();
      }
      let conn, pool;
      try {
        await testsUtil.assertThrowsAsync(
          async () => {
            pool = await oracledb.createPool({
              connectString: dbconfig.connectString,
              user: `[${dbconfig.test.proxySessionUser}]`,
              externalAuth: true,
            });
            conn = await pool.getConnection();
            const [proxy_user, session_user] = await ShowUserInfo(conn);
          },
         /DPI-1032:/
        );
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('180.2.7 Pooled Connect: External Auth with proxy no brackets when create pool', async function () {
      if (!dbconfig.test.externalAuth || !dbconfig.test.proxySessionUser) {
        this.skip();
      }
      let conn, pool;
      try {
        await testsUtil.assertThrowsAsync(
          async () => {
            pool = await oracledb.createPool({
              connectString: dbconfig.connectString,
              user: dbconfig.test.proxySessionUser,
              externalAuth: true,
            });
            conn = await pool.getConnection();
            const [proxy_user, session_user] = await ShowUserInfo(conn);
          },
         /DPI-1032:/
        );
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('180.2.8 Pooled Connect: External Auth with proxy when acquire connection', async function () {
      if (!dbconfig.test.externalAuth || !dbconfig.test.proxySessionUser) {
        this.skip();
      }
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          connectString: dbconfig.connectString,
          externalAuth: true,
        });
        conn = await pool.getConnection({user: `[${dbconfig.test.proxySessionUser}]`});
        const [proxy_user, session_user] = await ShowUserInfo(conn);
        should.strictEqual(proxy_user, dbconfig.user.toUpperCase());
        should.strictEqual(session_user, dbconfig.test.proxySessionUser.toUpperCase());
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('180.2.9 Pooled Connect: External Auth with proxy no brackets when acquire connection', async function () {
      if (!dbconfig.test.externalAuth || !dbconfig.test.proxySessionUser) {
        this.skip();
      }
      let conn, pool;
      try {
        await testsUtil.assertThrowsAsync(
          async () => {
            pool = await oracledb.createPool({
              connectString: dbconfig.connectString,
              externalAuth: true,
            });
            conn = await pool.getConnection({user: dbconfig.test.proxySessionUser});
            const [proxy_user, session_user] = await ShowUserInfo(conn);
          },
         /DPI-1069:/
        );
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });
  });
});

/* Copyright (c) 2021, 2023, Oracle and/or its affiliates. */

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
 *   258. keepInStmtCache.js
 *
 * DESCRIPTION
 *   Test cases to check the exclusion of SQL statements from statement cache
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('258. keepInStmtCache.js', function() {
  const iters = 10;       // number of statement iterations
  let conn;
  let sysDBAConn;
  const q = `SELECT 1 from DUAL`;
  let sid;

  before(async function() {
    if (!dbConfig.test.DBA_PRIVILEGE) {
      // Without DBA privilege, the test cannot get the current parse count!
      // So skip the tests
      this.skip();
    } else {
      const dbaConfig = {
        user : dbConfig.test.DBA_user,
        password: dbConfig.test.DBA_password,
        connectionString: dbConfig.connectString,
        privilege: oracledb.SYSDBA
      };
      const dbconfig = {
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: dbConfig.connectionString || dbConfig.connectString
      };

      conn = await oracledb.getConnection (dbconfig);
      sysDBAConn = await oracledb.getConnection(dbaConfig);
      sid = await testsUtil.getSid(conn);

    }
  });

  after (async function() {
    if (conn) {
      await conn.close ();
    }
    if (sysDBAConn) {
      await sysDBAConn.close ();
    }
  });

  describe('258.1 tests for keepInStmtCache & execute', function() {
    it('258.1.1 keepInStmtCache & execute default', async function() {
      // flush the statement cache
      await conn.execute(q, {}, { keepInStmtCache: false });

      const c1 = await testsUtil.getParseCount(sysDBAConn, sid);
      for (let i = 0; i < iters; i++) {
        await conn.execute(q);
      }
      const c2 = await testsUtil.getParseCount(sysDBAConn, sid);
      assert.strictEqual(c2 - c1, 1);
    });

    it('258.1.2 keepInStmtCache & execute include', async function() {
      // flush the statement cache
      await conn.execute(q, {}, { keepInStmtCache: false });

      const c1 = await testsUtil.getParseCount(sysDBAConn, sid);
      for (let i = 0; i < iters; i++) {
        await conn.execute(q, {}, {keepInStmtCache : true});
      }
      const c2 = await testsUtil.getParseCount(sysDBAConn, sid);
      assert.strictEqual(c2 - c1, 1);
    });

    it('258.1.3 keepInStmtCache & execute exclude', async function() {
      // flush the statement cache
      await conn.execute(q, {}, {keepInStmtCache: false});

      const c1 = await testsUtil.getParseCount (sysDBAConn, sid);
      for (let i = 0; i < iters; i++) {
        await conn.execute(q, {}, {keepInStmtCache : false});
      }
      const c2 = await testsUtil.getParseCount(sysDBAConn, sid);
      assert.strictEqual(c2 - c1, iters);
    });

  });


  describe('258.2 tests using keepInStmtCache & resultSet', function() {

    it('258.2.1 keepInStmtCache & resultSet default', async function() {
      // flush the statement cache
      await conn.execute(q, {}, {keepInStmtCache: false});

      const c1 = await testsUtil.getParseCount(sysDBAConn, sid);
      for (let i = 0; i < iters; i++) {
        const result = await conn.execute(q, {}, {resultSet: true});
        await result.resultSet.close();
      }
      const c2 = await testsUtil.getParseCount(sysDBAConn, sid);
      assert.strictEqual(c2 - c1, 1);
    });

    it('258.2.2 keepInStmtCache & resultSet include', async function() {
      // flush the statement cache
      await conn.execute(q, {}, {keepInStmtCache: false});

      const c1 = await testsUtil.getParseCount(sysDBAConn, sid);
      for (let i = 0; i < iters; i++) {
        const result = await conn.execute(q, {},
          {keepInStmtCache: true, resultSet: true});
        await result.resultSet.close();
      }
      const c2 = await testsUtil.getParseCount(sysDBAConn, sid);
      assert.strictEqual(c2 - c1, 1);
    });

    it('258.2.3 keepInStmtCache & resultSet exclude', async function() {
      // flush the statement cache
      await conn.execute(q, {}, {keepInStmtCache: false, resultSet: true});

      const c1 = await testsUtil.getParseCount (sysDBAConn, sid);
      for (let i = 0; i < iters; i++) {
        const result = await conn.execute(q, {},
          {keepInStmtCache: false, resultSet: true});
        await result.resultSet.close();
      }
      const c2 = await testsUtil.getParseCount(sysDBAConn, sid);
      assert.strictEqual(c2 - c1, iters);
    });

  });

  describe('258.3 tests using keepInStmtCache & queryStream', function() {

    it('258.3.1 keepInStmtCache & queryStream default', async function() {
      // flush the statement cache
      await conn.execute(q, {}, { keepInStmtCache: false });

      const c1 = await testsUtil.getParseCount(sysDBAConn, sid);
      for (let i = 0; i < iters; i++) {
        const stream = conn.queryStream(q, [], {resultSet: true});
        const consumeStream = new Promise((resolve, reject) => {
          stream.on('error', function(error) {
            reject(error);
          });
          stream.on('data', function()   {
          });
          stream.on('end', function() {
            stream.destroy();
          });
          stream.on('close', function() {
            resolve();
          });
        });
        await consumeStream;
      }
      const c2 = await testsUtil.getParseCount(sysDBAConn, sid);
      assert.strictEqual(c2 - c1, 1);
    });

    it('258.3.2 keepInStmtCache & querystream include', async function() {
      // flush the statement cache
      await conn.execute(q, {}, {keepInStmtCache: false});

      const c1 = await testsUtil.getParseCount(sysDBAConn, sid);
      for (let i = 0; i < iters; i++) {
        const stream = conn.queryStream(q, [], {resultSet: true});
        const consumeStream = new Promise ((resolve, reject) => {
          stream.on('error', function(error) {
            reject(error);
          });
          stream.on('data', function() {
          });
          stream.on('end', function() {
            stream.destroy();
          });
          stream.on('close', function() {
            resolve();
          });
        });
        await consumeStream;
      }
      const c2 = await testsUtil.getParseCount(sysDBAConn, sid);
      assert.strictEqual(c2 - c1, 1);
    });

    it('258.3.3 keepInStmtCache & queryStream exclude', async function() {
      // flush the statement cache
      await conn.execute(q, {}, { keepInStmtCache: false, resultSet: true });

      const c1 = await testsUtil.getParseCount(sysDBAConn, sid);
      for (let i = 0; i < iters; i++) {
        const stream = conn.queryStream(q, [],
          {keepInStmtCache: false, resultSet: true});
        const consumeStream = new Promise ((resolve, reject) => {
          stream.on('error', function(error) {
            reject(error);
          });
          stream.on('data', function() {
          });
          stream.on('end', function() {
            stream.destroy();
          });
          stream.on('close', function() {
            resolve();
          });
        });
        await consumeStream;
      }

      const c2 = await testsUtil.getParseCount(sysDBAConn, sid);
      assert.strictEqual(c2 - c1, iters);
    });

  });

});

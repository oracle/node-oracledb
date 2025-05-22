/* Copyright (c) 2015, 2024, Oracle and/or its affiliates. */

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
 *   2. pool.js
 *
 * DESCRIPTION
 *   Testing properties of connection pool.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');
const random   = require('./random.js');

describe('2. pool.js', function() {

  describe('2.1 default setting', function() {

    it('2.1.1 testing default values of pool properties', async function() {
      const pool = await oracledb.createPool(dbConfig);
      assert.strictEqual(pool.poolMin, oracledb.poolMin);
      assert.strictEqual(pool.poolMax, oracledb.poolMax);
      assert.strictEqual(pool.poolIncrement, oracledb.poolIncrement);
      assert.strictEqual(pool.poolTimeout, oracledb.poolTimeout);
      assert.strictEqual(pool.poolPingTimeout, oracledb.poolPingTimeout);
      assert.strictEqual(pool.stmtCacheSize, oracledb.stmtCacheSize);
      assert.strictEqual(pool.connectionsOpen, 0);
      assert.strictEqual(pool.connectionsInUse, 0);
      assert.strictEqual(pool.maxLifetimeSession, 0);
      await pool.close(0);
    });
  });

  describe('2.2 poolMin', function() {

    it('2.2.1 poolMin cannot be a negative number', async function() {
      const config = {...dbConfig,
        poolMin: -5,
        poolMax: 5,
        poolIncrement: 1,
        poolTimeout: 28,
        stmtCacheSize: 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.2.2 poolMin must be a Number', async function() {
      const config = {...dbConfig,
        poolMin: NaN,
        poolMax: 5,
        poolIncrement: 1,
        poolTimeout: 28,
        stmtCacheSize: 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.2.3 poolMin cannot greater than poolMax', async function() {
      const config = {...dbConfig,
        poolMin: 10,
        poolMax: 5,
        poolIncrement: 1,
        poolTimeout: 28,
        stmtCacheSize: 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-092:/
      );
    });

    it('2.2.4 (poolMin + poolIncrement) can equal to poolMax', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 5,
        poolIncrement: 4,
        poolTimeout: 28,
        stmtCacheSize: 23
      };
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.connectionsInUse, 0);
      await pool.close(0);
    });
  }); // 2.2

  describe('2.3 poolMax', function() {
    let pool;

    afterEach(async function() {
      // Ensure that pool is closed irrespective of any test failures.
      // Not closing a pool impacts the poolCache, which may be used by later
      // tests and lead to false test failures.
      if (pool) {
        await pool.close(0);
        pool = null;
      }
    });

    it('2.3.1 poolMax cannot be a negative value', async function() {
      const config = {...dbConfig,
        poolMin: 5,
        poolMax: -5,
        poolIncrement: 1,
        poolTimeout: 28,
        stmtCacheSize: 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.3.2 poolMax cannot be 0', async function() {
      const config = {...dbConfig,
        poolMin: 0,
        poolMax: 0,
        poolIncrement: 1,
        poolTimeout: 28,
        stmtCacheSize: 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.3.3 poolMax must be a number', async function() {
      const config = {...dbConfig,
        poolMin: true,
        poolMax: 5,
        poolIncrement: 1,
        poolTimeout: 28,
        stmtCacheSize: 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.3.4 poolMax and poolMin actually limit the pool size', async function() {
      const conns = [];
      const config = {
        ...dbConfig,
        poolMax: 2,
        poolMin: 1,
        poolTimeout: 1,
        queueTimeout: 2000
      };
      pool = await oracledb.createPool(config);
      conns.push(await pool.getConnection());
      conns.push(await pool.getConnection());
      await assert.rejects(
        async () => await pool.getConnection(),
        /NJS-040:/
      );
      for (let i = 0; i < conns.length; i++) {
        await conns[i].close();
      }

      // the number of remaining connections after poolTimeout seconds should
      // be greater or equal to poolMin
      await new Promise((resolve) => {
        setTimeout(function() {
          assert(pool.connectionsOpen >= pool.poolMin);
          resolve();
        }, 2000);
      });
    });
  }); // 2.3

  describe('2.4 poolIncrement', function() {

    it('2.4.1 poolIncrement cannot be a negative value', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 5,
        poolIncrement: -1,
        poolTimeout: 28,
        stmtCacheSize: 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.4.2 poolIncrement must be a Number', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 10,
        poolIncrement: false,
        poolTimeout: 28,
        stmtCacheSize: 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.4.3 the amount of open connections equals to poolMax when (connectionsOpen + poolIncrement) > poolMax', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 4,
        poolIncrement: 2,
        poolTimeout: 28,
        stmtCacheSize: 23
      };
      const pool = await oracledb.createPool(config);
      const conn1 = await pool.getConnection();
      assert.strictEqual(pool.connectionsOpen, 1);
      const conn2 = await pool.getConnection();
      assert.strictEqual(pool.connectionsInUse, 2);
      const conn3 = await pool.getConnection();
      assert.strictEqual(pool.connectionsOpen, 3);
      assert.strictEqual(pool.connectionsInUse, 3);
      const conn4 = await pool.getConnection();
      assert.strictEqual(pool.connectionsOpen, 4);
      assert.strictEqual(pool.connectionsInUse, 4);
      await conn1.close();
      await conn2.close();
      await conn3.close();
      await conn4.close();
      await pool.close(0);
    });
  }); // 2.4

  describe('2.5 poolTimeout', function() {

    it('2.5.1 poolTimeout cannot be a negative number', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 5,
        poolIncrement: 1,
        poolTimeout: -5,
        stmtCacheSize: 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.5.2 poolTimeout can be 0, which disables timeout feature', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 5,
        poolIncrement: 1,
        poolTimeout: 0,
        stmtCacheSize: 23
      };
      const pool = await oracledb.createPool(config);
      await pool.close(0);
    });

    it('2.5.3 poolTimeout must be a number', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 5,
        poolIncrement: 1,
        poolTimeout: NaN,
        stmtCacheSize: 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });
  });

  describe('2.6 stmtCacheSize', function() {

    it('2.6.1 stmtCacheSize cannot be a negative value', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 5,
        poolIncrement: 1,
        poolTimeout: 28,
        stmtCacheSize: -9
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.6.2 stmtCacheSize can be 0', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 5,
        poolIncrement: 1,
        poolTimeout: 28,
        stmtCacheSize: 0
      };
      const pool = await oracledb.createPool(config);
      await pool.close(0);
    });

    it('2.6.3 stmtCacheSize must be a Number', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 5,
        poolIncrement: 1,
        poolTimeout: 28,
        stmtCacheSize: NaN
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });
  });

  describe('2.7 getConnection', function() {
    it('2.7.1 passes error in callback if called after pool is terminated and a callback is provided', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 2,
        poolIncrement: 1,
        poolTimeout: 1
      };
      const pool1 = await oracledb.createPool(config);
      await pool1.close();
      await assert.rejects(
        async () => await pool1.getConnection(),
        /NJS-065:/
      );
    });
  });

  describe('2.8 connection request queue', function() {
    let pool;

    afterEach(async function() {
      // Ensure that pool is closed irrespective of any test failures.
      // Not closing a pool impacts the poolCache, which may be used by later
      // tests and lead to false test failures.
      if (pool) {
        await pool.close(0);
        pool = null;
      }
    });
    function getBlockingSql(secondsToBlock) {
      const blockingSql = '' +
        'declare \n' +
        ' \n' +
        '  l_start timestamp with local time zone := systimestamp; \n' +
        ' \n' +
        'begin \n' +
        ' \n' +
        '  loop \n' +
        '    exit when l_start + interval \'' + (secondsToBlock || 3) + '\' second <= systimestamp; \n' +
        '  end loop; \n' +
        ' \n' +
        'end;';

      return blockingSql;
    }

    it('2.8.1 basic case', async function() {
      const config = {...dbConfig,
        poolMin: 0,
        poolMax: 1,
        poolIncrement: 1,
        poolTimeout: 1
      };
      pool = await oracledb.createPool(config);
      const routine1 = async function() {
        const conn = await pool.getConnection();
        await conn.execute(getBlockingSql(3));
        await conn.close();
      };
      const routine2 = async function() {
        await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });
        const conn = await pool.getConnection();
        await conn.close();
      };
      await Promise.all([routine1(), routine2()]);
    });

    it('2.8.2 generates NJS-040 if request is queued and queueTimeout expires', async function() {
      const config = {...dbConfig,
        poolMin: 0,
        poolMax: 1,
        poolIncrement: 1,
        poolTimeout: 1,
        queueTimeout: 2000 //2 seconds
      };
      pool = await oracledb.createPool(config);
      const routine1 = async function() {
        const conn = await pool.getConnection();
        await conn.execute(getBlockingSql(4));
        await conn.close();
      };
      const routine2 = async function() {
        await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });
        await assert.rejects(
          async () => await pool.getConnection(),
          /NJS-040:/
        );
      };
      await Promise.all([routine1(), routine2()]);
    });

    it('2.8.3 generates NJS-076 if request exceeds queueMax', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        queueTimeout: 2000, // 2 seconds
        queueMax: 1
      };
      pool = await oracledb.createPool(config);
      let conn1;
      const routine1 = async function() {
        conn1 = await pool.getConnection();
        await assert.rejects(
          async () => await pool.getConnection(),
          /NJS-040:/ //connection request timeout. Request exceeded "queueTimeout" of 2000
        );
      };
      const routine2 = async function() {
        await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });
        // wait for a connection to wait in a connection queue
        await testsUtil.checkAndWait(100, 50, () => pool._pendingRequestQueue.size === 1);
        await assert.rejects(
          async () => await pool.getConnection(),
          /NJS-076:/
        );
      };
      await Promise.all([routine1(), routine2()]);

      await conn1.close();
    });

    it('2.8.4 generates NJS-076 if request exceeds queueMax 0', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        queueTimeout: 5000, // 5 seconds
        queueMax: 0
      };
      pool = await oracledb.createPool(config);
      const conn = await pool.getConnection();
      await assert.rejects(
        async () => await pool.getConnection(),
        /NJS-076:/
      );
      await conn.close();
    });

    it('2.8.5 request queue never terminate for queueTimeout set to 0', async function() {
      const config = {...dbConfig,
        poolMin: 0,
        poolMax: 1,
        poolIncrement: 1,
        poolTimeout: 1,
        queueTimeout: 0 // 0 seconds
      };
      pool = await oracledb.createPool(config);
      const routine1 = async function() {
        const conn = await pool.getConnection();
        await conn.execute(getBlockingSql(3));
        await conn.close();
      };
      const routine2 = async function() {
        await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });
        const conn = await pool.getConnection();
        await conn.close();
      };
      await Promise.all([routine1(), routine2()]);
    });

    it('2.8.6 queueMax range check, queueMax -1', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        queueMax: -1
      };
      pool = await oracledb.createPool(config);
      const conn = await pool.getConnection();
      await conn.close();
    });

    it('2.8.7 queueMax range check, queueMax -0.5 not an integer', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        queueMax: -1.5
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });
  });

  describe('2.9 enableStatistics & logStatistics functionality', function() {

    it('2.9.1 does not work after the pool has been terminated', async function() {
      const config = {...dbConfig,
        poolMin: 0,
        poolMax: 1,
        poolIncrement: 1,
        poolTimeout: 1,
        enableStatistics: true
      };
      const pool = await oracledb.createPool(config);
      const conn = await pool.getConnection();
      await conn.execute("select 1 from dual");
      await conn.close();
      await pool.close(0);
      assert.throws(
        () => pool.logStatistics(),
        /NJS-065:/
      );
    });
  });

  describe('2.10 Close method', function() {

    it('2.10.1 close can be used as an alternative to release', async function() {
      const config = {...dbConfig,
        poolMin: 0,
        poolMax: 1,
        poolIncrement: 1,
        poolTimeout: 1
      };
      const pool = await oracledb.createPool(config);
      await pool.close(0);
    });
  }); // 2.10

  describe('2.11 Invalid Credential', function() {

    it('2.11.1 error occurs at creating pool when poolMin (user defined) greater than or equal to poolMax (default)', async function() {
      const config = {
        user: 'notexist',
        password: testsUtil.generateRandomPassword(),
        connectString: dbConfig.connectString,
        poolMin: 5
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-092:/
      );
    }); // 2.11.1

    it('2.11.2 error occurs at getConnection() when poolMin is the default value 0', async function() {
      const config = {
        ...dbConfig,
        user: 'notexist',
        password: testsUtil.generateRandomPassword()
      };
      const pool = await oracledb.createPool(config);
      await assert.rejects(
        async () => await pool.getConnection(),
        /ORA-01017:/
      );
      await pool.close(0);
    }); // 2.11.2

  }); // 2.11

  describe('2.12 connectionString alias', function() {

    it('2.12.1 allows connectionString to be used as an alias for connectString', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0
      };
      const pool = await oracledb.createPool(config);
      await pool.close(0);
    });
  }); // 2.12

  describe('2.13 connect string', function() {

    it('2.13.1 both connectString & connectionString provided', async function() {
      const config = {...dbConfig,
        connectionString: dbConfig.connectString,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-075:/
      );
    });  // 2.13.1

    it('2.13.2 Negative - empty connect string', async function() {
      const config = {...dbConfig,
        connectString: dbConfig.connectString_does_not_exist,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /ORA-01017:|NJS-125:|ORA-12162:/
        // ORA-12162: TNS:net service name is incorrectly specified (23.3 Database Thin Mode)
        // ORA-01017: invalid username/password; logon denied
        // NJS-125: "connectString" cannot be empty or undefined. Bequeath connections are not supported in Thin mode
      );
    });  // 2.13.2
  });  // 2.13

  describe('2.14 username alias', function() {
    let pool;

    afterEach(async function() {
      // Ensure that pool is closed irrespective of any test failures.
      // Not closing a pool impacts the poolCache, which may be used by later
      // tests and lead to false test failures.
      if (pool) {
        await pool.close(0);
        pool = null;
      }
    });

    it('2.14.1 allows username to be used as an alias for user', async function() {
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0
      };
      delete config.user;
      pool = await oracledb.createPool(config);
    }); // 2.14.1

    it('2.14.2 both user and username specified', async function() {
      const config = {...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-080:/
      );
    }); // 2.14.2

    it('2.14.3 uses username alias to login with SYSDBA privilege', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) return this.skip();
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        privilege: oracledb.SYSDBA,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0
      };
      delete config.user;
      pool = await oracledb.createPool(config);
    }); // 2.14.3
  }); // 2.14

  describe('2.15 creation time non editable properties', function() {
    let pool;

    afterEach(async function() {
      // Ensure that pool is closed irrespective of any test failures.
      // Not closing a pool impacts the poolCache, which may be used by later
      // tests and lead to false test failures.
      if (pool) {
        await pool.close(0);
        pool = null;
      }
    });

    it('2.15.1 default edition value', async function() {
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0
      };
      delete config.user;
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.edition, "");
    }); // 2.15.1

    it('2.15.2 ORA$BASE edition value', async function() {
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        edition: "ORA$BASE"
      };
      delete config.user;
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.edition, "ORA$BASE");
    }); // 2.15.2

    it('2.15.3 default value for events - false', async function() {
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0
      };
      delete config.user;
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.events, false);
    });  // 2.15.3

    it('2.15.4 events - false', async function() {
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        events: false
      };
      delete config.user;
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.events, false);
    }); // 2.15.4

    it('2.15.5 events - true', async function() {
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        events: true
      };
      delete config.user;
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.events, true);
    });  // 2.15.5

    it('2.15.6 externalAuth - default false', async function() {
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
      };
      delete config.user;
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.externalAuth, false);
    });  // 2.15.6

    (!oracledb.thin ? it : it.skip)('2.15.7 externalAuth - true', async function() {
      const config = {
        connectString: dbConfig.connectString,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        externalAuth: true
      };
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.externalAuth, true);
    }); // 2.15.7

    it('2.15.8 externalAuth - false', async function() {
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        externalAuth: false
      };
      delete config.user;
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.externalAuth, false);
    }); // 2.15.8

    it('2.15.9 homogeneous - default true', async function() {
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
      };
      delete config.user;
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.homogeneous, true);
    });  // 2.15.9

    it('2.15.10 homogeneous - true', async function() {
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        homogeneous: true
      };
      delete config.user;
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.homogeneous, true);
    });  // 2.15.10

    it('2.15.11 homogeneous - false', async function() {
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        homogeneous: false
      };
      delete config.user;
      if (!oracledb.thin) {
        pool = await oracledb.createPool(config);
        assert.strictEqual(pool.homogeneous, false);
      } else {
        await assert.rejects(
          async () => await oracledb.createPool(config),
          /NJS-089:/
        );
      }
    });  // 2.15.11

    it('2.15.12 user name', async function() {
      const config = {...dbConfig,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
      };
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.user, dbConfig.user);
    });  // 2.15.12

    (!oracledb.thin ? it : it.skip)('2.15.13 user name - undefined', async function() {
      // NOTE: An heterogeneous pool is created for testing property with
      // externalAuth is set to false, the username/password are required
      // while calling getConnection().  In this case, connections are NOT
      // required and so, wallet/OS authentication setup is not available.
      const config = {
        connectString: dbConfig.connectString,
        walletPassword: dbConfig.walletPassword,
        walletLocation: dbConfig.walletLocation,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        externalAuth: true
      };
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.user, undefined);
    });  // 2.15.13

    it('2.15.14 connectString', async function() {
      const config = {
        ...dbConfig,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
      };
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.connectString, config.connectString);
    });  // 2.15.14

    it('2.15.15 externalAuth - true and non-empty password', async function() {
      const config = {
        connectString: dbConfig.connectString,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        externalAuth: true,
        password: testsUtil.generateRandomPassword()
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-136:/
      );
    });  // 2.15.15

    it('2.15.16 empty Credentials', async function() {
      const config = {
        connectString: dbConfig.connectString,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /ORA-24415:|NJS-101:/
      );
    }); // 2.15.16
  }); // 2.15

  describe('2.16 Pool non-configurable properties global/local override', function() {
    let pool;

    afterEach(async function() {
      // Ensure that pool is closed irrespective of any test failures.
      // Not closing a pool impacts the poolCache, which may be used by later
      // tests and lead to false test failures.
      if (pool) {
        await pool.close(0);
        pool = null;
      }
    });

    it('2.16.1 edition only globally set', async function() {
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0
      };
      delete config.user;
      oracledb.edition = "ORA$BASE";
      pool = await oracledb.createPool(config);
      oracledb.edition = "";
      assert.strictEqual(pool.edition, "ORA$BASE");
    });  // 2.16.1

    it('2.16.2 edition override', async function() {
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        edition: "ORA$BASE"
      };
      delete config.user;
      oracledb.edition = "";
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.edition, "ORA$BASE");
    });  // 2.16.2

    it('2.16.3 edition override to empty string', async function() {
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        edition: ""
      };
      delete config.user;
      oracledb.edition = "ORA$BASE";
      pool = await oracledb.createPool(config);
      oracledb.edition = "";
      assert.strictEqual(pool.edition, "");
    });  // 2.16.3

    it('2.16.4 events override to true', async function() {
      const origEvents = oracledb.events;
      oracledb.events = false;
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        events: true
      };
      delete config.user;
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.events, true);
      oracledb.events = origEvents;
    });  // 2.16.4

    it('2.16.5 events override to false', async function() {
      const origEvents = oracledb.events;
      oracledb.events = true;
      const config = {
        ...dbConfig,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        events: false
      };
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.events, false);
      oracledb.events = origEvents;
    });    // 2.16.5

    it('2.16.6 externalAuth override to false', async function() {
      const origExternalAuth = oracledb.externalAuth;
      oracledb.externalAuth = true;
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        externalAuth: false
      };
      delete config.user;
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.externalAuth, false);
      oracledb.externalAuth = origExternalAuth;
    });  // 2.16.6

    (!oracledb.thin ? it : it.skip)('2.16.7 externalAuth override to true', async function() {
      const origExternalAuth = oracledb.externalAuth;
      oracledb.externalAuth = false;
      const config = {
        connectString: dbConfig.connectString,
        walletPassword: dbConfig.walletPassword,
        walletLocation: dbConfig.walletLocation,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0,
        externalAuth: true
      };
      pool = await oracledb.createPool(config);
      assert.strictEqual(pool.externalAuth, true);
      oracledb.externalAuth = origExternalAuth;
    });  // 2.16.7
  });  // 2.16

  describe('2.17 Check execute same/different query with new/released session from pool', function() {
    let pool;

    afterEach(async function() {
      // Ensure that pool is closed irrespective of any test failures.
      // Not closing a pool impacts the poolCache, which may be used by later
      // tests and lead to false test failures.
      if (pool) {
        await pool.close(0);
        pool = null;
      }
    });

    it('2.17.1 same query execution from new and released session', async function() {
      const config = {...dbConfig
      };
      pool = await oracledb.createPool(config);
      const conn1 = await pool.getConnection();
      const result1 = await conn1.execute("SELECT 1 FROM DUAL");
      assert(result1);
      assert.strictEqual(result1.rows[0][0], 1);
      await conn1.close();
      const conn2 = await pool.getConnection();
      const result2 = await conn2.execute("SELECT 1 FROM DUAL");
      assert(result2);
      assert.strictEqual(result2.rows[0][0], 1);
      await conn2.close();
    });   // 2.17.1

    it('2.17.2 different query execution from new and released session', async function() {
      const config = {...dbConfig
      };
      pool = await oracledb.createPool(config);
      const conn1 = await pool.getConnection();
      const result1 = await conn1.execute("SELECT 1 FROM DUAL");
      assert(result1);
      assert.strictEqual(result1.rows[0][0], 1);
      await conn1.close();
      const conn2 = await pool.getConnection();
      const result2 = await conn2.execute("SELECT 2 FROM DUAL");
      assert(result2);
      assert.strictEqual(result2.rows[0][0], 2);
      await conn2.close();
    });  // 2.17.2

  });   // 2.17

  describe('2.18 pool stats', function() {
    it('2.18.1 driver mode in pool stats', async function() {
      const config = {
        ...dbConfig,
        enableStatistics: true
      };
      const pool = await oracledb.createPool(config);
      const poolstatistics = pool.getStatistics();
      assert.strictEqual(oracledb.thin, poolstatistics.thin);
      await pool.close();
    }); // 2.18.1
  }); // 2.18

  describe('2.19 DBA and Non-DBA user login with SYSDBA privilege', function() {
    it('2.19.1 DBA user with SYSDBA privilege', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) this.skip();

      // Connection pool configuration with non dba username and password
      const nondbaConfig = {
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: dbConfig.connectString,
        privilege: oracledb.SYSDBA,
        poolMin: 2,      // Minimum number of connections in the pool
        poolMax: 10,     // Maximum number of connections in the pool
        poolIncrement: 2 // Number of connections to add when needed
      };

      // Create connection pool non-dba user and password
      const poolNormal = await oracledb.createPool(nondbaConfig);
      assert.strictEqual(poolNormal.connectionsInUse, 0);
      await poolNormal.close(0);

      // Connection pool configuration with DBA user and password
      let username = "", password = "", poolMin, poolIncr;
      let priv, connConfig = {};
      if (oracledb.thin) {
        username = dbConfig.test.DBA_user;
        password = dbConfig.test.DBA_password;
        poolMin = 2;
        poolIncr = 2;
        priv = oracledb.SYSDBA;
      }
      const dbaConfig = {
        user: username,
        password: password,
        connectString: dbConfig.connectString,
        privilege: priv,
        poolMin: poolMin,        // Minimum number of connections in the pool
        poolMax: 10,             // Maximum number of connections in the pool
        poolIncrement: poolIncr  // Number of connections to add when needed
      };
      if (!oracledb.thin) {
        dbaConfig.homogeneous = false;
        connConfig = {
          privilege: oracledb.SYSDBA,
          user: dbConfig.test.DBA_user,
          password: dbConfig.test.DBA_password
        };
      }
      const pool = await oracledb.createPool(dbaConfig);

      // Get a connection from the pool
      const connection = await pool.getConnection(connConfig);
      assert.strictEqual(pool.connectionsInUse, 1);

      connConfig.privilege = 100; // invalid value.
      await assert.rejects(
        async () => await pool.getConnection(connConfig),
        /NJS-007: invalid value for "privilege" in parameter 1/
      );

      // Release the connection back to the pool
      await connection.close();
      await pool.close(0);
    }); // 2.19.1
  }); // 2.19

  describe('2.20 settable parameters', function() {
    const sqlSessionDetails = `SELECT machine, osuser, terminal, program
      FROM v$session
      WHERE sid = (SELECT sys_context('userenv', 'sid') FROM dual)`;

    const sqlDriverName = `SELECT CLIENT_DRIVER FROM V$SESSION_CONNECT_INFO
      WHERE sid = (SELECT sys_context('userenv', 'sid') FROM dual)`;

    // SQL query to fetch DRCP connection pool information with machine, terminal, and program
    const sqlDRCPSessionDetails = `SELECT machine, terminal, program
      FROM v$cpool_conn_info
      WHERE machine = :machine AND program = :program AND terminal = :terminal`;

    let origMachineName, origProgramName, origUserName, origTerminalName;
    let origDriverName;

    const dbaConfig = {
      user: dbConfig.test.DBA_user,
      password: dbConfig.test.DBA_password,
      connectString: dbConfig.connectString,
      privilege: oracledb.SYSDBA,
    };

    beforeEach(async function() {
      if (!dbConfig.test.DBA_PRIVILEGE || !oracledb.thin) this.skip();

      const dbaConnection = await oracledb.getConnection(dbaConfig);
      const result = await dbaConnection.execute(sqlSessionDetails);

      origMachineName = result.rows[0][0];
      origUserName = result.rows[0][1];
      origTerminalName = result.rows[0][2];
      origProgramName = result.rows[0][3];

      const driverResult = await dbaConnection.execute(sqlDriverName);
      origDriverName = driverResult.rows[0][0];

      await dbaConnection.close();
    });

    afterEach(function() {
      if (!dbConfig.test.DBA_PRIVILEGE || !oracledb.thin) return;

      oracledb.driverName = origDriverName ?? "";
      oracledb.program = origProgramName ?? "";
      oracledb.terminal = origTerminalName ?? "";
      oracledb.machine = origMachineName ?? "";
      oracledb.osUser = origUserName ?? "";
    });

    it('2.20.1 Check parameter values after user update', async function() {
      // Generate unique random values for initial connection parameters
      const randomPgm1 = random.getRandomLengthString(16);
      const randomTerm1 = random.getRandomLengthString(16);
      const randomMachine1 = random.getRandomLengthString(16);
      const randomDriver1 = 'driver1';

      // Set initial parameters
      oracledb.driverName = randomDriver1;
      oracledb.program = randomPgm1;
      oracledb.terminal = randomTerm1;
      oracledb.machine = randomMachine1;
      oracledb.osUser = 'user1';

      const pool = await oracledb.createPool(dbaConfig);
      const conn = await pool.getConnection();

      // Validate initial parameters
      let res = await conn.execute(sqlSessionDetails);
      assert.strictEqual(res.rows[0][0], randomMachine1);
      assert.strictEqual(res.rows[0][1], 'user1');
      assert.strictEqual(res.rows[0][2], randomTerm1);
      assert.strictEqual(res.rows[0][3], randomPgm1);

      if (dbConfig.test.drcp) {
        const reqRow = [randomMachine1, randomTerm1, randomPgm1];
        res = await conn.execute(sqlDRCPSessionDetails, { machine: randomMachine1, program: randomPgm1, terminal: randomTerm1 });
        assert.deepStrictEqual(res.rows[0], reqRow);
      }

      res = await conn.execute(sqlDriverName);
      assert.strictEqual(res.rows[0][0], randomDriver1);

      // Change parameters after pool creation (should not affect existing pool connections)
      const randomPgm2 = random.getRandomLengthString(16);
      const randomTerm2 = random.getRandomLengthString(16);
      const randomMachine2 = random.getRandomLengthString(16);
      const randomDriver2 = 'driver2';

      oracledb.driverName = randomDriver2;
      oracledb.program = randomPgm2;
      oracledb.terminal = randomTerm2;
      oracledb.machine = randomMachine2;
      oracledb.osUser = 'user2';

      // Validate parameters for existing connection (should match initial values)
      res = await conn.execute(sqlSessionDetails);
      assert.strictEqual(res.rows[0][0], randomMachine1);
      assert.strictEqual(res.rows[0][1], 'user1');
      assert.strictEqual(res.rows[0][2], randomTerm1);
      assert.strictEqual(res.rows[0][3], randomPgm1);

      if (dbConfig.test.drcp) {
        const reqRow = [randomMachine1, randomTerm1, randomPgm1];
        res = await conn.execute(sqlDRCPSessionDetails, { machine: randomMachine1, program: randomPgm1, terminal: randomTerm1 });
        assert.deepStrictEqual(res.rows[0], reqRow);
      }

      res = await conn.execute(sqlDriverName);
      assert.strictEqual(res.rows[0][0], randomDriver1);

      // Create a new pool with updated parameters and validate
      const pool2 = await oracledb.createPool(dbaConfig);
      const conn2 = await pool2.getConnection();

      res = await conn2.execute(sqlSessionDetails);
      assert.strictEqual(res.rows[0][0], randomMachine2);
      assert.strictEqual(res.rows[0][1], 'user2');
      assert.strictEqual(res.rows[0][2], randomTerm2);
      assert.strictEqual(res.rows[0][3], randomPgm2);

      if (dbConfig.test.drcp) {
        const reqRow = [randomMachine2, randomTerm2, randomPgm2];
        res = await conn2.execute(sqlDRCPSessionDetails, { machine: randomMachine2, program: randomPgm2, terminal: randomTerm2 });
        assert.deepStrictEqual(res.rows[0], reqRow);
      }

      res = await conn2.execute(sqlDriverName);
      assert.strictEqual(res.rows[0][0], randomDriver2);

      await conn.close();
      await conn2.close();
      await pool.close(0);
      await pool2.close(0);
    });

    it('2.20.2 negative - Check parameter value types', async function() {
      const dbaConfig = {
        user: dbConfig.test.DBA_user,
        password: dbConfig.test.DBA_password,
        connectString: dbConfig.connectString,
        privilege: oracledb.SYSDBA,
      };

      dbaConfig.driverName = null;
      await assert.rejects(
        async () => await oracledb.createPool(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.driverName = 1;
      await assert.rejects(
        async () => await oracledb.createPool(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.machine = null;
      await assert.rejects(
        async () => await oracledb.createPool(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.machine = 1;
      await assert.rejects(
        async () => await oracledb.createPool(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.terminal = null;
      await assert.rejects(
        async () => await oracledb.createPool(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.terminal = 1;
      await assert.rejects(
        async () => await oracledb.createPool(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.program = null;
      await assert.rejects(
        async () => await oracledb.createPool(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.program = 1;
      await assert.rejects(
        async () => await oracledb.createPool(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.osUser = null;
      await assert.rejects(
        async () => await oracledb.createPool(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.osUser = 1;
      await assert.rejects(
        async () => await oracledb.createPool(dbaConfig),
        /NJS-007:/
      );

    }); // 2.20.2

    it('2.20.3 Check session parameters across multiple connections from the same pool', async function() {
      const randomPgm = random.getRandomLengthString(16);
      const randomTerm = random.getRandomLengthString(16);
      const randomMachine = random.getRandomLengthString(16);
      const randomDriver = 'multi_driver';

      // Set parameters for the pool
      oracledb.driverName = randomDriver;
      oracledb.program = randomPgm;
      oracledb.terminal = randomTerm;
      oracledb.machine = randomMachine;
      oracledb.osUser = 'multi_osuser';

      const pool = await oracledb.createPool({
        ...dbaConfig,
        poolMin: 2,
      });

      // Validate parameters for multiple connections from the same pool
      const conn1 = await pool.getConnection();
      let res = await conn1.execute(sqlSessionDetails);
      assert.strictEqual(res.rows[0][0], randomMachine);
      assert.strictEqual(res.rows[0][1], 'multi_osuser');
      assert.strictEqual(res.rows[0][2], randomTerm);
      assert.strictEqual(res.rows[0][3], randomPgm);

      if (dbConfig.test.drcp) {
        const reqRow = [randomMachine, randomTerm, randomPgm];
        res = await conn1.execute(sqlDRCPSessionDetails, { machine: randomMachine, program: randomPgm, terminal: randomTerm });
        assert.deepStrictEqual(res.rows[0], reqRow);
      }

      const conn2 = await pool.getConnection();
      res = await conn2.execute(sqlSessionDetails);
      assert.strictEqual(res.rows[0][0], randomMachine);
      assert.strictEqual(res.rows[0][1], 'multi_osuser');
      assert.strictEqual(res.rows[0][2], randomTerm);
      assert.strictEqual(res.rows[0][3], randomPgm);

      if (dbConfig.test.drcp) {
        const reqRow = [randomMachine, randomTerm, randomPgm];
        res = await conn2.execute(sqlDRCPSessionDetails, { machine: randomMachine, program: randomPgm, terminal: randomTerm });
        assert.deepStrictEqual(res.rows[0], reqRow);
      }

      await conn1.close();
      await conn2.close();
      await pool.close(0);
    });

    it('2.20.4 Check default session parameter values after pool creation', async function() {
      const prePoolPgm = random.getRandomLengthString(16);
      const prePoolTerm = random.getRandomLengthString(16);
      const prePoolMachine = random.getRandomLengthString(16);
      const prePoolDriver = 'pre_pool_driver';

      // Set parameters before pool creation
      oracledb.driverName = prePoolDriver;
      oracledb.program = prePoolPgm;
      oracledb.terminal = prePoolTerm;
      oracledb.machine = prePoolMachine;
      oracledb.osUser = 'pre_pool_osuser';

      const pool = await oracledb.createPool({
        ...dbaConfig,
        poolMin: 2,
      });

      // Reset parameters after pool creation (should not affect existing pool connections)
      oracledb.driverName = 'new_driver';
      oracledb.program = 'new_program';
      oracledb.terminal = 'new_terminal';
      oracledb.machine = 'new_machine';
      oracledb.osUser = 'new_osuser';

      const conn = await pool.getConnection();
      let res = await conn.execute(sqlSessionDetails);
      assert.strictEqual(res.rows[0][0], prePoolMachine);
      assert.strictEqual(res.rows[0][1], 'pre_pool_osuser');
      assert.strictEqual(res.rows[0][2], prePoolTerm);
      assert.strictEqual(res.rows[0][3], prePoolPgm);

      if (dbConfig.test.drcp) {
        const reqRow = [prePoolMachine, prePoolTerm, prePoolPgm];
        res = await conn.execute(sqlDRCPSessionDetails, { machine: prePoolMachine, program: prePoolPgm, terminal: prePoolTerm });
        assert.deepStrictEqual(res.rows[0], reqRow);
      }

      res = await conn.execute(sqlDriverName);
      /*
        In Oracle 12.1.1 DB, The driver name (CLIENT_DRIVER column in V$SESSION_CONNECT_INFO view)
        can be set only upto 8 characters.
      */
      const serverVersion = conn.oracleServerVersion;
      if (serverVersion < 1201000200)
        assert.strictEqual(res.rows[0][0], "pre_pool");
      else assert.strictEqual(res.rows[0][0], prePoolDriver);

      await conn.close();
      await pool.close(0);
    });
  });
});

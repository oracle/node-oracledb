/* Copyright (c) 2015, 2022, Oracle and/or its affiliates. */

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

describe('2. pool.js', function() {

  describe('2.1 default setting', function() {

    it('2.1.1 testing default values of pool properties', async function() {
      const pool = await oracledb.createPool(dbConfig);
      assert.strictEqual(pool.poolMin, oracledb.poolMin);
      assert.strictEqual(pool.poolMax, oracledb.poolMax);
      assert.strictEqual(pool.poolIncrement, oracledb.poolIncrement);
      assert.strictEqual(pool.poolTimeout, oracledb.poolTimeout);
      assert.strictEqual(pool.stmtCacheSize, oracledb.stmtCacheSize);
      assert.strictEqual(pool.connectionsOpen, 0);
      assert.strictEqual(pool.connectionsInUse, 0);
      await pool.close();
    });

  });

  describe('2.2 poolMin', function() {

    it('2.2.1 poolMin cannot be a negative number', async function() {
      const config = {...dbConfig,
        poolMin           : -5,
        poolMax           : 5,
        poolIncrement     : 1,
        poolTimeout       : 28,
        stmtCacheSize     : 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.2.2 poolMin must be a Number', async function() {
      const config = {...dbConfig,
        poolMin           : NaN,
        poolMax           : 5,
        poolIncrement     : 1,
        poolTimeout       : 28,
        stmtCacheSize     : 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.2.3 poolMin cannot greater than poolMax', async function() {
      const config = {...dbConfig,
        poolMin           : 10,
        poolMax           : 5,
        poolIncrement     : 1,
        poolTimeout       : 28,
        stmtCacheSize     : 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-092:/
      );
    });

    it('2.2.4 (poolMin + poolIncrement) can equal to poolMax', async function() {
      const config = {...dbConfig,
        poolMin           : 1,
        poolMax           : 5,
        poolIncrement     : 4,
        poolTimeout       : 28,
        stmtCacheSize     : 23
      };
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.connectionsInUse, 0);
      await pool.close();
    });

  }); // 2.2

  describe('2.3 poolMax', function() {

    it('2.3.1 poolMax cannot be a negative value', async function() {
      const config = {...dbConfig,
        poolMin           : 5,
        poolMax           : -5,
        poolIncrement     : 1,
        poolTimeout       : 28,
        stmtCacheSize     : 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.3.2 poolMax cannot be 0', async function() {
      const config = {...dbConfig,
        poolMin           : 0,
        poolMax           : 0,
        poolIncrement     : 1,
        poolTimeout       : 28,
        stmtCacheSize     : 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.3.3 poolMax must be a number', async function() {
      const config = {...dbConfig,
        poolMin           : true,
        poolMax           : 5,
        poolIncrement     : 1,
        poolTimeout       : 28,
        stmtCacheSize     : 23
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
        queueTimeout: 1
      };
      const pool = await oracledb.createPool(config);
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
      await pool.close();
    });

  }); // 2.3

  describe('2.4 poolIncrement', function() {

    it('2.4.1 poolIncrement cannot be a negative value', async function() {
      const config = {...dbConfig,
        poolMin           : 1,
        poolMax           : 5,
        poolIncrement     : -1,
        poolTimeout       : 28,
        stmtCacheSize     : 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.4.2 poolIncrement must be a Number', async function() {
      const config = {...dbConfig,
        poolMin           : 1,
        poolMax           : 10,
        poolIncrement     : false,
        poolTimeout       : 28,
        stmtCacheSize     : 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.4.3 the amount of open connections equals to poolMax when (connectionsOpen + poolIncrement) > poolMax', async function() {
      const config = {...dbConfig,
        poolMin           : 1,
        poolMax           : 4,
        poolIncrement     : 2,
        poolTimeout       : 28,
        stmtCacheSize     : 23
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
      await pool.close();
    });

  }); // 2.4

  describe('2.5 poolTimeout', function() {

    it('2.5.1 poolTimeout cannot be a negative number', async function() {
      const config = {...dbConfig,
        poolMin           : 1,
        poolMax           : 5,
        poolIncrement     : 1,
        poolTimeout       : -5,
        stmtCacheSize     : 23
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.5.2 poolTimeout can be 0, which disables timeout feature', async function() {
      const config = {...dbConfig,
        poolMin           : 1,
        poolMax           : 5,
        poolIncrement     : 1,
        poolTimeout       : 0,
        stmtCacheSize     : 23
      };
      const pool = await oracledb.createPool(config);
      await pool.close();
    });

    it('2.5.3 poolTimeout must be a number', async function() {
      const config = {...dbConfig,
        poolMin           : 1,
        poolMax           : 5,
        poolIncrement     : 1,
        poolTimeout       : NaN,
        stmtCacheSize     : 23
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
        poolMin           : 1,
        poolMax           : 5,
        poolIncrement     : 1,
        poolTimeout       : 28,
        stmtCacheSize     : -9
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

    it('2.6.2 stmtCacheSize can be 0', async function() {
      const config = {...dbConfig,
        poolMin           : 1,
        poolMax           : 5,
        poolIncrement     : 1,
        poolTimeout       : 28,
        stmtCacheSize     : 0
      };
      const pool = await oracledb.createPool(config);
      await pool.close();
    });

    it('2.6.3 stmtCacheSize must be a Number', async function() {
      const config = {...dbConfig,
        poolMin           : 1,
        poolMax           : 5,
        poolIncrement     : 1,
        poolTimeout       : 28,
        stmtCacheSize     : NaN
      };
      await assert.rejects(
        async () => await oracledb.createPool(config),
        /NJS-007:/
      );
    });

  });

  describe('2.7 getConnection', function() {
    let pool1;

    beforeEach('get pool ready', async function() {
      const config = {...dbConfig,
        poolMin           : 1,
        poolMax           : 2,
        poolIncrement     : 1,
        poolTimeout       : 1
      };
      pool1 = await oracledb.createPool(config);
    });

    it('2.7.1 passes error in callback if called after pool is terminated and a callback is provided', async function() {
      await pool1.close();
      await assert.rejects(
        async () => await pool1.getConnection(),
        /NJS-065:/
      );
    });

  });

  describe('2.8 connection request queue', function() {

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
        poolMin           : 0,
        poolMax           : 1,
        poolIncrement     : 1,
        poolTimeout       : 1
      };
      const pool = await oracledb.createPool(config);
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
      await pool.close();
    });

    it('2.8.2 generates NJS-040 if request is queued and queueTimeout expires', async function() {
      const config = {...dbConfig,
        poolMin           : 0,
        poolMax           : 1,
        poolIncrement     : 1,
        poolTimeout       : 1,
        queueTimeout      : 2000 //2 seconds
      };
      const pool = await oracledb.createPool(config);
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
      await pool.close();
    });

    it('2.8.3 does not generate NJS-040 if request is queued for less time than queueTimeout', async function() {
      const config = {...dbConfig,
        poolMin           : 0,
        poolMax           : 1,
        poolIncrement     : 1,
        poolTimeout       : 1,
        queueTimeout      : 3000 //3 seconds
      };
      const pool = await oracledb.createPool(config);
      const routine1 = async function() {
        const conn = await pool.getConnection();
        await conn.execute(getBlockingSql(2));
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
      await pool.close();
    });

    it('2.8.4 generates NJS-076 if request exceeds queueMax', async function() {
      const config = {...dbConfig,
        poolMin           : 1,
        poolMax           : 1,
        poolIncrement     : 0,
        queueTimeout      : 2000, // 2 seconds
        queueMax          : 1
      };
      const pool = await oracledb.createPool(config);
      const routine1 = async function() {
        const conn1 = await pool.getConnection();
        await assert.rejects(
          async () => await pool.getConnection(),
          /NJS-040:/
        );
        await conn1.close();
      };
      const routine2 = async function() {
        await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });
        await assert.rejects(
          async () => await pool.getConnection(),
          /NJS-076:/
        );
      };
      await Promise.all([routine1(), routine2()]);
      await pool.close();
    });

    it('2.8.5 generates NJS-076 if request exceeds queueMax 0', async function() {
      const config = {...dbConfig,
        poolMin           : 1,
        poolMax           : 1,
        poolIncrement     : 0,
        queueTimeout      : 5000, // 5 seconds
        queueMax          : 0
      };
      const pool = await oracledb.createPool(config);
      const conn = await pool.getConnection();
      await assert.rejects(
        async () => await pool.getConnection(),
        /NJS-076:/
      );
      await conn.close();
      await pool.close();
    });

    it('2.8.6 request queue never terminate for queueTimeout set to 0', async function() {
      const config = {...dbConfig,
        poolMin           : 0,
        poolMax           : 1,
        poolIncrement     : 1,
        poolTimeout       : 1,
        queueTimeout      : 0 // 0 seconds
      };
      const pool = await oracledb.createPool(config);
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
      await pool.close();
    });

  });

  describe('2.9 _enableStats & _logStats functionality', function() {

    it('2.9.1 does not work after the pool has been terminated', async function() {
      const config = {...dbConfig,
        poolMin           : 0,
        poolMax           : 1,
        poolIncrement     : 1,
        poolTimeout       : 1,
        _enableStats      : true
      };
      const pool = await oracledb.createPool(config);
      const conn = await pool.getConnection();
      await conn.execute("select 1 from dual");
      await conn.close();
      await pool.close();
      assert.throws(
        () => pool._logStats(),
        /NJS-065:/
      );
    });

  });

  describe('2.10 Close method', function() {

    it('2.10.1 close can be used as an alternative to release', async function() {
      const config = {...dbConfig,
        poolMin           : 0,
        poolMax           : 1,
        poolIncrement     : 1,
        poolTimeout       : 1
      };
      const pool = await oracledb.createPool(config);
      await pool.close();
    });

  }); // 2.10

  describe('2.11 Invalid Credential', function() {

    it('2.11.1 error occurs at creating pool when poolMin (user defined) greater than or equal to poolMax (default)', async function() {
      const config = {
        user: 'notexist',
        password: 'nopass',
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
        password: 'nopass',
      };
      const pool = await oracledb.createPool(config);
      await assert.rejects(
        async () => await pool.getConnection(),
        /ORA-01017:/
      );
      await pool.close();
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
      await pool.close();
    });

  }); // 2.12

  describe('2.13 connectString & connectionString provided', function() {

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

  });  // 2.13.1

  describe('2.14 username alias', function() {

    it('2.14.1 allows username to be used as an alias for user', async function() {
      const config = {
        ...dbConfig,
        username: dbConfig.user,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0
      };
      delete config.user;
      const pool = await oracledb.createPool(config);
      await pool.close();
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
        privilege : oracledb.SYSDBA,
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0
      };
      delete config.user;
      const pool = await oracledb.createPool(config);
      await pool.close();
    }); // 2.14.3

  }); // 2.14
  describe('2.15 creation time non editable properties', function() {

    it('2.15.1 default edition value', async function() {
      const config = {
        ...dbConfig,
        username:      dbConfig.user,
        poolMin:       1,
        poolMax:       1,
        poolIncrement: 0
      };
      delete config.user;
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.edition, "");
      await pool.close();
    });   // 2.15.1

    it('2.15.2 ORA$BASE edition value', async function() {
      const config = {
        ...dbConfig,
        username:      dbConfig.user,
        poolMin:       1,
        poolMax:       1,
        poolIncrement: 0,
        edition:       "ORA$BASE"
      };
      delete config.user;
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.edition, "ORA$BASE");
      await pool.close();
    });     // 2.15.2

    it('2.15.3 default value for events - false', async function() {
      const config = {
        ...dbConfig,
        username:      dbConfig.user,
        poolMin:       1,
        poolMax:       1,
        poolIncrement: 0
      };
      delete config.user;
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.events, false);
      await pool.close();
    });  // 2.15.3

    it('2.15.4 events - false', async function() {
      const config = {
        ...dbConfig,
        username:      dbConfig.user,
        poolMin:       1,
        poolMax:       1,
        poolIncrement: 0,
        events:        false
      };
      delete config.user;
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.events, false);
      await pool.close();
    });   // 2.15.4

    it('2.15.5 events - true', async function() {
      const config = {
        ...dbConfig,
        username:      dbConfig.user,
        poolMin:       1,
        poolMax:       1,
        poolIncrement: 0,
        events:        true
      };
      delete config.user;
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.events, true);
      await pool.close();
    });  // 2.15.5

    it('2.15.6 externalAuth - default false', async function() {
      const config = {
        ...dbConfig,
        username:      dbConfig.user,
        poolMin:       1,
        poolMax:       1,
        poolIncrement: 0,
      };
      delete config.user;
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.externalAuth, false);
      await pool.close();
    });  // 2.15.6

    it('2.15.7 externalAuth - true', async function() {
      const config = {
        connectString: dbConfig.connectString,
        poolMin:       1,
        poolMax:       1,
        poolIncrement: 0,
        externalAuth:  true
      };
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.externalAuth, true);
      await pool.close();
    });  // 2.15.7

    it('2.15.8 externalAuth - false', async function() {
      const config = {
        ...dbConfig,
        username :     dbConfig.user,
        poolMin:       1,
        poolMax:       1,
        poolIncrement: 0,
        externalAuth:  false
      };
      delete config.user;
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.externalAuth, false);
      await pool.close();
    });   // 2.15.8

    it('2.15.9 homogeneous - default true', async function() {
      const config = {
        ...dbConfig,
        username:      dbConfig.user,
        poolMin:       1,
        poolMax:       1,
        poolIncrement: 0,
      };
      delete config.user;
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.homogeneous, true);
      await pool.close();
    });  // 2.15.9

    it('2.15.10 homogeneous - true', async function() {
      const config = {
        ...dbConfig,
        username:      dbConfig.user,
        poolMin:       1,
        poolMax:       1,
        poolIncrement: 0,
        homogeneous:   true
      };
      delete config.user;
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.homogeneous, true);
      await pool.close();
    });  // 2.15.10

    it('2.15.11 homogeneous - false', async function() {
      const config = {
        ...dbConfig,
        username:      dbConfig.user,
        poolMin:       1,
        poolMax:       1,
        poolIncrement: 0,
        homogeneous:   false
      };
      delete config.user;
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.homogeneous, false);
      await pool.close();
    });  // 2.15.11

    it('2.15.12 user name', async function() {
      const config = {...dbConfig,
        poolMin:       1,
        poolMax:       1,
        poolIncrement: 0,
      };
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.user, dbConfig.user);
      await pool.close();
    });  // 2.15.12

    it('2.15.13 user name - undefined', async function() {
      // NOTE: An heterogeneous pool is created for testing property with
      // externalAuth is set to false, the username/password are required
      // while calling getConnection().  In this case, connections are NOT
      // required and so, wallet/OS authentication setup is not available.
      const config = {
        connectString: dbConfig.connectString,
        poolMin:       1,
        poolMax:       1,
        poolIncrement: 0,
        externalAuth:  true
      };
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.user, undefined);
      await pool.close();
    });  // 2.15.13

    it('2.15.14 connectString', async function() {
      const config = {
        ...dbConfig,
        poolMin:       1,
        poolMax:       1,
        poolIncrement: 0,
      };
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.connectString, config.connectString);
      await pool.close();
    });  // 2.15.14

  });   // 2.15

  describe('2.16 Pool non-configurable properties global/local override', function() {

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
      const pool = await oracledb.createPool(config);
      oracledb.edition = "";
      assert.strictEqual(pool.edition, "ORA$BASE");
      await pool.close();
    });    // 2.16.1

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
      const pool = await oracledb.createPool(config);
      assert.strictEqual(pool.edition, "ORA$BASE");
      await pool.close();
    });    // 2.16.2

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
      const pool = await oracledb.createPool(config);
      oracledb.edition = "";
      assert.strictEqual(pool.edition, "");
      await pool.close();
    });    // 2.16.3

    it('2.16.4 events override to true', async function() {
      const origEvents = oracledb.events;
      oracledb.events = false;
      try {
        const config = {
          ...dbConfig,
          username: dbConfig.user,
          poolMin: 1,
          poolMax: 1,
          poolIncrement: 0,
          events: true
        };
        delete config.user;
        const pool = await oracledb.createPool(config);
        assert.strictEqual(pool.events, true);
        await pool.close();
      } finally {
        oracledb.events = origEvents;
      }
    });    // 2.16.4

    it('2.16.5 events override to false', async function() {
      const origEvents = oracledb.events;
      oracledb.events = true;
      try {
        const config = {
          ...dbConfig,
          poolMin: 1,
          poolMax: 1,
          poolIncrement: 0,
          events: false
        };
        const pool = await oracledb.createPool(config);
        assert.strictEqual(pool.events, false);
        await pool.close();
      } finally {
        oracledb.events = origEvents;
      }
    });    // 2.16.5

    it('2.16.6 externalAuth override to false', async function() {
      const origExternalAuth = oracledb.externalAuth;
      oracledb.externalAuth = true;
      try {
        const config = {
          ...dbConfig,
          username: dbConfig.user,
          poolMin: 1,
          poolMax: 1,
          poolIncrement: 0,
          externalAuth: false
        };
        delete config.user;
        const pool = await oracledb.createPool(config);
        assert.strictEqual(pool.externalAuth, false);
        await pool.close();
      } finally {
        oracledb.externalAuth = origExternalAuth;
      }
    });    // 2.16.6

    it('2.16.7 externalAuth override to true', async function() {
      const origExternalAuth = oracledb.externalAuth;
      oracledb.externalAuth = false;
      try {
        const config = {
          connectString: dbConfig.connectString,
          poolMin: 1,
          poolMax: 1,
          poolIncrement: 0,
          externalAuth: true
        };
        const pool = await oracledb.createPool(config);
        assert.strictEqual(pool.externalAuth, true);
        await pool.close();
      } finally {
        oracledb.externalAuth = origExternalAuth;
      }
    });    // 2.16.7

  });  // 2.16

});

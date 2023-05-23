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
 *   5. externalAuth.js
 *
 * DESCRIPTION
 *   Testing external authentication functionality.
 *
 *   Note that enabling the externalAuth feature requires configuration on the
 *   database besides setting "externalAuth" attribute to be true. Please refer
 *   to API documentation about configuration.
 *   https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#extauth
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

(!oracledb.thin ? describe : describe.skip)('5. externalAuth.js', function() {

  describe('5.1 tests that work both when DB has configured externalAuth and not configured', function() {

    it('5.1.1 can get connection from oracledb with correct user/password when externalAuth is disabled', async function() {

      const connection = await oracledb.getConnection(
        {
          externalAuth:  false,
          user:          dbConfig.user,
          password:      dbConfig.password,
          connectString: dbConfig.connectString
        }
      );
      const result = await connection.execute("select (7+8) from dual");
      assert.strictEqual(result.rows[0][0], 15);

      await connection.close();

    }); // 5.1.1

    it('5.1.2 throws error when getting connection from oracledb with correct user/password when externalAuth is enabled', async function() {

      await assert.rejects(
        async () => {
          await oracledb.getConnection(
            {
              externalAuth:  true,
              user:          dbConfig.user,
              password:      dbConfig.password,
              connectString: dbConfig.connectString
            }
          );
        },
        // NJS-136: user and password should not be set when using external authentication
        /NJS-136:/
      );

    }); // 5.1.2

    it("5.1.3 throws error when gettting connection from oracledb given only invalid 'user' when externalAuth is enabled", async function() {

      await assert.rejects(
        async () => {
          await oracledb.getConnection(
            {
              externalAuth: true,
              user:          "[ invalid_user ]",
              connectString: dbConfig.connectString
            }
          );
        },
        // NJS-136: user and password should not be set when using external authentication
        /NJS-136:/
      );
    }); // 5.1.3

    it("5.1.4 throws error when gettting connection from oracledb given only 'password' when externalAuth is enabled", async function() {

      await assert.rejects(
        async () => {
          await oracledb.getConnection(
            {
              externalAuth:  true,
              password:      dbConfig.password,
              connectString: dbConfig.connectString
            }
          );
        },
        // NJS-136: user and password should not be set when using external authentication
        /NJS-136:/
      );
    }); // 5.1.4

    it("5.1.5 can get pool from oracledb with user/password when externalAuth is disabled", async function() {

      const pool = await oracledb.createPool(
        {
          externalAuth:  false,
          user:          dbConfig.user,
          password:      dbConfig.password,
          connectString: dbConfig.connectString
        }
      );
      const connection = await pool.getConnection();
      const result = await connection.execute("select (3+5) from dual");
      assert.strictEqual(result.rows[0][0], 8);

      await connection.close();
      await pool.close();
    }); // 5.1.5

    it("5.1.6 throws error when getting pool from oracledb given user/password when externalAuth is enabled", async function() {

      await assert.rejects(
        async () => {
          await oracledb.createPool(
            {
              externalAuth:  true,
              user:          dbConfig.user,
              password:      dbConfig.password,
              connectString: dbConfig.connectString
            }
          );
        },
        // NJS-136: user and password should not be set when using external authentication
        /NJS-136:/
      );
    }); // 5.1.6

    it("5.1.7 throws error when getting pool from oracledb only given username when externalAuth is enabled", async function() {

      await assert.rejects(
        async () => {
          await oracledb.createPool(
            {
              externalAuth:  true,
              user:          dbConfig.user,
              connectString: dbConfig.connectString
            }
          );
        },
        // NJS-136: user and password should not be set when using external authentication
        /NJS-136:/
      );
    }); // 5.1.7

    it("5.1.8 throws error when getting pool from oracledb only given password when externalAuth is enabled", async function() {

      await assert.rejects(
        async () => {
          await oracledb.createPool(
            {
              externalAuth:  true,
              password:      dbConfig.password,
              connectString: dbConfig.connectString
            }
          );
        },
        // NJS-136: user and password should not be set when using external authentication
        /NJS-136:/
      );
    }); // 5.1.8

  }); // 5.1

  describe('5.2 tests only work when externalAuth is configured on DB', function() {

    before(function() {
      if (dbConfig.test.externalAuth !== true) this.skip();
    });

    it("5.2.1 can get connection from oracledb with external authentication", async function() {


      const connection = await oracledb.getConnection(
        {
          externalAuth:  true,
          connectString: dbConfig.connectString
        }
      );
      const result = await connection.execute("select (7+8) from dual");
      assert.strictEqual(result.rows[0][0], 15);

      await connection.close();
    }); // 5.2.1

    it("5.2.2 can get pool from oracledb with external authentication", async function() {

      const pool = await oracledb.createPool(
        {
          externalAuth: true,
          connectString: dbConfig.connectString
        }
      );
      // verify poolMin value
      assert.strictEqual(pool.connectionsOpen, 0);
      const connection = await pool.getConnection();
      const result = await connection.execute("select (3+5) from dual");
      assert.strictEqual(result.rows[0][0], 8);

      await connection.close();
      await pool.close();
    }); // 5.2.2

    it("5.2.3 gets multiple connections from oracledb", async function() {

      const getConns = async function(id) {
        let connection = await oracledb.getConnection(
          {
            externalAuth:  true,
            connectString: dbConfig.connectString
          }
        );
        return {num:  id, inst: connection};
      };

      const closeConns = async function(conns) {
        for (let item of conns) {
          // console.log("-- close conn " + item.num);
          let connection = item.inst;
          let result = await connection.execute("select (5+7) from dual");
          assert.strictEqual(result.rows[0][0], 12);

          await connection.close();
        }
      };

      // Main function of this case
      let connArr = []; // Initialize array of connections with IDs from 1 to 9
      for (let id = 1; id <= 9; id++) {
        connArr[id] = await getConns(id);
      }

      await closeConns(connArr);

    }); // 5.2.3

    it("5.2.4 gets multiple pools from oracledb", async function() {

      const getPools = async function(id) {
        let pool = await oracledb.createPool(
          {
            externalAuth:  true,
            connectString: dbConfig.connectString
          }
        );
        return {num:  id, inst: pool};
      };

      const closePools = async function(pools) {
        for (let item of pools) {
          // console.log("-- close pool " + item.num);
          let pool = item.inst;
          let connection = await pool.getConnection();
          let result = await connection.execute("select (8+9) from dual");
          assert.strictEqual(result.rows[0][0], 17);

          await connection.close();
          await pool.close();
        }
      };

      // Main function of this case
      let poolArr = []; // Initialize array of pools with IDs from 1 to 9
      for (let id = 1; id <= 9; id++) {
        poolArr[id] = await getPools(id);
      }

      await closePools(poolArr);
    }); // 5.2.4

    it("5.2.5 poolMin no longer takes effect under externalAuth", async function() {

      const pool = await oracledb.createPool(
        {
          externalAuth: true,
          connectString: dbConfig.connectString,
          poolMin: 5,
          poolMax: 20,
          poolIncrement: 2
        }
      );
      assert.strictEqual(pool.connectionsOpen, 0);

      await pool.close();
    }); // 5.2.5

    it("5.2.6 poolIncrement no longer takes effect", async function() {

      const pool = await oracledb.createPool(
        {
          externalAuth: true,
          connectString: dbConfig.connectString,
          poolMin: 5,
          poolMax: 20,
          poolIncrement: 2
        }
      );
      const conn1 = await pool.getConnection();
      assert.strictEqual(pool.connectionsOpen, 1);
      const conn2 = await pool.getConnection();
      assert.strictEqual(pool.connectionsOpen, 2);

      await conn1.close();
      await conn2.close();
      await pool.close();
    }); // 5.2.6

  }); // 5.2

});

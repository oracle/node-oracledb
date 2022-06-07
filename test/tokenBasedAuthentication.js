/* Copyright (c) 2022, Oracle and/or its affiliates. */

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
 * NAME
 *   265. tokenBasedAuthentication.js
 *
 * DESCRIPTION
 *   Testing properties of pool and standalone connection using
 *   token based authentication.
*****************************************************************************/
'use strict';

var oracledb = require('oracledb');
const assert = require('assert');
var dbConfig = require('./tokenBasedAuthenticationConfig.js');

describe('265. Token based authentication', function() {

  describe('265.1 Pool', function() {

    it('265.1.1 create pool connection', async () => {
      let pool;
      try {
        pool = await oracledb.createPool({
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 1,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
        assert.ok(pool);
      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.2 acquire multiple sessions from pool', async () => {
      let pool, conn1, conn2;
      try {
        pool = await oracledb.createPool({
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 2,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
        assert.ok(pool);

        conn1 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        conn2 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 2);
        assert.deepEqual(pool.connectionsInUse, 2);
      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (conn1)
            await conn1.close();
          if (conn2)
            await conn2.close();
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.3 acquire multiple sessions from multiple pool', async () => {
      let pool1, conn1, conn2;
      try {
        pool1 = await oracledb.createPool({
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 2,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
        assert.ok(pool1);

        conn1 = await pool1.getConnection();
        assert.deepEqual(pool1.connectionsOpen, 1);
        assert.deepEqual(pool1.connectionsInUse, 1);

        conn2 = await pool1.getConnection();
        assert.deepEqual(pool1.connectionsOpen, 2);
        assert.deepEqual(pool1.connectionsInUse, 2);
      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (conn1)
            await conn1.close();
          if (conn2)
            await conn2.close();
          if (pool1)
            await pool1.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }

      let pool2, conn3, conn4;
      try {
        pool2 = await oracledb.createPool({
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 2,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
        assert.ok(pool2);

        conn3 = await pool2.getConnection();
        assert.deepEqual(pool2.connectionsOpen, 1);
        assert.deepEqual(pool2.connectionsInUse, 1);

        conn4 = await pool2.getConnection();
        assert.deepEqual(pool2.connectionsOpen, 2);
        assert.deepEqual(pool2.connectionsInUse, 2);
      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (conn3)
            await conn3.close();
          if (conn4)
            await conn4.close();
          if (pool2)
            await pool2.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.4 query execution', async () => {
      let pool, conn;
      try {
        pool = await oracledb.createPool({
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
        assert.ok(pool);

        conn = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        const sql = `SELECT
                     TO_CHAR(current_date, 'DD-Mon-YYYY HH24:MI') AS D
                     FROM DUAL`;
        const result = await conn.execute(sql);
        assert.notEqual(result, {});
      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (conn)
            await conn.close();
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.5 homogenous should be true', async () => {
      let pool;
      try {
        pool = await oracledb.createPool({
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : false
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-085:/, 'regexp does not match');
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.6 externalAuth should be true', async () => {
      let pool;
      try {
        pool = await oracledb.createPool({
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          externalAuth      : false,
          homogeneous       : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-085:/, 'regexp does not match');
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.7 token should be set in accessToken', async () => {
      let pool;
      const ResObj = {
        privateKey   : dbConfig.accessToken.privateKey
      };
      try {
        pool = await oracledb.createPool({
          accessToken       : ResObj,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-084:/, 'regexp does not match');
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.8 token length should be not be 0 in accessToken', async () => {
      let pool;
      const ResObj = {
        privateKey   : dbConfig.accessToken.privateKey,
        token: ''
      };
      try {
        pool = await oracledb.createPool({
          accessToken       : ResObj,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-084:/, 'regexp does not match');
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.9 privateKey should be set in accessToken', async () => {
      let pool;
      const ResObj = {
        token             : dbConfig.accessToken.token
      };
      try {
        pool = await oracledb.createPool({
          accessToken       : ResObj,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-084:/, 'regexp does not match');
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.10 privateKey length should not be 0 in accessToken', async () => {
      let pool;
      const ResObj = {
        privateKey   : '',
        token        : dbConfig.accessToken.token
      };
      try {
        pool = await oracledb.createPool({
          accessToken       : ResObj,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-084:/, 'regexp does not match');
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.11 with callback having valid token', async () => {
      function callback() {
        return dbConfig.callbackValid;
      }

      let pool, conn1, conn2;
      try {
        pool = await oracledb.createPool({
          accessToken         : dbConfig.accessToken,
          connectString       : dbConfig.connectString,
          poolMin             : 1,
          poolMax             : 5,
          poolIncrement       : 1,
          externalAuth        : true,
          homogeneous         : true,
          accessTokenCallback : callback
        });
        assert.ok(pool);

        conn1 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        // invalidate token to test callback
        pool.setAccessToken(dbConfig.expiredAccessToken);

        conn2 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 2);
        assert.deepEqual(pool.connectionsInUse, 2);

      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (conn1)
            await conn1.close();
          if (conn2)
            await conn2.close();
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.12 no callback and expired token', async () => {
      let pool, conn1, conn2;
      try {
        pool = await oracledb.createPool({
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
        assert.ok(pool);

        conn1 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        // invalidate token to test callback
        pool.setAccessToken(dbConfig.expiredAccessToken);

        conn2 = await pool.getConnection();

      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^ORA-25708:/, 'regexp does not match');
      } finally {
        try {
          if (conn1)
            await conn1.close();
          if (conn2)
            await conn2.close();
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.13 with callback having invalid token', async () => {
      function callback() {
        // returns invalid token parameters values
        // invalid token and private key values
        return dbConfig.callbackInvalid1;
      }

      let pool, conn1, conn2;
      try {
        pool = await oracledb.createPool({
          accessToken         : dbConfig.accessToken,
          connectString       : dbConfig.connectString,
          poolMin             : 1,
          poolMax             : 5,
          poolIncrement       : 1,
          externalAuth        : true,
          homogeneous         : true,
          accessTokenCallback : callback
        });
        assert.ok(pool);

        conn1 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        // invalidate token to test callback
        pool.setAccessToken(dbConfig.expiredAccessToken);

        conn2 = await pool.getConnection();

      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^ORA-25707:/, 'regexp does not match');
      } finally {
        try {
          if (conn1)
            await conn1.close();
          if (conn2)
            await conn2.close();
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.14 with callback having missing token', async () => {
      function callback() {
        // missing token
        return dbConfig.callbackInvalid2;
      }

      let pool, conn1, conn2;
      try {
        pool = await oracledb.createPool({
          accessToken         : dbConfig.accessToken,
          connectString       : dbConfig.connectString,
          poolMin             : 1,
          poolMax             : 5,
          poolIncrement       : 1,
          externalAuth        : true,
          homogeneous         : true,
          accessTokenCallback : callback
        });
        assert.ok(pool);

        conn1 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        // invalidate token to test callback
        pool.setAccessToken(dbConfig.expiredAccessToken);

        conn2 = await pool.getConnection();

      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^Error: NJS-004:/, 'regexp does not match');
      } finally {
        try {
          if (conn1)
            await conn1.close();
          if (conn2)
            await conn2.close();
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.15 with callback having 0 length token', async () => {
      function callback() {
        // empty token
        return dbConfig.callbackInvalid3;
      }

      let pool, conn1, conn2;
      try {
        pool = await oracledb.createPool({
          accessToken         : dbConfig.accessToken,
          connectString       : dbConfig.connectString,
          poolMin             : 1,
          poolMax             : 5,
          poolIncrement       : 1,
          externalAuth        : true,
          homogeneous         : true,
          accessTokenCallback : callback
        });
        assert.ok(pool);

        conn1 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        // invalidate token to test callback
        pool.setAccessToken(dbConfig.expiredAccessToken);

        conn2 = await pool.getConnection();

      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^ORA-01017:/, 'regexp does not match');
      } finally {
        try {
          if (conn1)
            await conn1.close();
          if (conn2)
            await conn2.close();
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.16 with callback having missing privateKey', async () => {
      function callback() {
        // missing tokenprivatekey attribute
        return dbConfig.callbackInvalid4;
      }

      let pool, conn1, conn2;
      try {
        pool = await oracledb.createPool({
          accessToken         : dbConfig.accessToken,
          connectString       : dbConfig.connectString,
          poolMin             : 1,
          poolMax             : 5,
          poolIncrement       : 1,
          externalAuth        : true,
          homogeneous         : true,
          accessTokenCallback : callback
        });
        assert.ok(pool);

        conn1 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        // invalidate token to test callback
        pool.setAccessToken(dbConfig.expiredAccessToken);

        conn2 = await pool.getConnection();

      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^Error: NJS-004:/, 'regexp does not match');
      } finally {
        try {
          if (conn1)
            await conn1.close();
          if (conn2)
            await conn2.close();
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.17 with callback having 0 length privateKey', async () => {
      function callback() {
        // empty tokenPrivatekey parameter
        return dbConfig.callbackInvalid5;
      }

      let pool, conn1, conn2;
      try {
        pool = await oracledb.createPool({
          accessToken         : dbConfig.accessToken,
          connectString       : dbConfig.connectString,
          poolMin             : 1,
          poolMax             : 5,
          poolIncrement       : 1,
          externalAuth        : true,
          homogeneous         : true,
          accessTokenCallback : callback
        });
        assert.ok(pool);

        conn1 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        // invalidate token to test callback
        pool.setAccessToken(dbConfig.expiredAccessToken);

        conn2 = await pool.getConnection();

      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^ORA-01017:/, 'regexp does not match');
      } finally {
        try {
          if (conn1)
            await conn1.close();
          if (conn2)
            await conn2.close();
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.18 user/password without tokens and externalAuth set to true', async () => {
      let pool;
      try {
        pool = await oracledb.createPool({
          user              : dbConfig.user,
          password          : dbConfig.password,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
        assert.ok(pool);
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^DPI-1032:/, 'regexp does not match');
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.19 user/password with tokens', async () => {
      let pool;
      try {
        pool = await oracledb.createPool({
          user              : dbConfig.user,
          password          : dbConfig.password,
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
        assert.ok(pool);
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-084:/, 'regexp does not match');
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.20 invalidate tokens using setAccessToken with missing token', async () => {
      function callback() {
        // valid token and privateKey
        return dbConfig.callbackValid;
      }

      let pool, conn1, conn2;
      try {
        pool = await oracledb.createPool({
          accessToken         : dbConfig.accessToken,
          connectString       : dbConfig.connectString,
          poolMin             : 1,
          poolMax             : 5,
          poolIncrement       : 1,
          externalAuth        : true,
          homogeneous         : true,
          accessTokenCallback : callback
        });
        assert.ok(pool);

        conn1 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        // invalidate token to test callback
        pool.setAccessToken({
          privateKey : dbConfig.expiredAccessToken.privateKey
        });

        conn2 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 2);
        assert.deepEqual(pool.connectionsInUse, 2);

      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (conn1)
            await conn1.close();
          if (conn2)
            await conn2.close();
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.21 invalidate tokens using setAccessToken with empty token', async () => {
      function callback() {
        // valid token and privateKey values
        return dbConfig.callbackValid;
      }

      let pool, conn1, conn2;
      try {
        pool = await oracledb.createPool({
          accessToken         : dbConfig.accessToken,
          connectString       : dbConfig.connectString,
          poolMin             : 1,
          poolMax             : 5,
          poolIncrement       : 1,
          externalAuth        : true,
          homogeneous         : true,
          accessTokenCallback : callback
        });
        assert.ok(pool);

        conn1 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        // invalidate token to test callback
        pool.setAccessToken({
          token       : '',
          privateKey  : dbConfig.expiredAccessToken.privateKey
        });

        conn2 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 2);
        assert.deepEqual(pool.connectionsInUse, 2);

      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (conn1)
            await conn1.close();
          if (conn2)
            await conn2.close();
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.22 invalidate tokens using setAccessToken with empty privateKey', async () => {
      function callback() {
        // valid token and privateKey values
        return dbConfig.callbackValid;
      }

      let pool, conn1, conn2;
      try {
        pool = await oracledb.createPool({
          accessToken         : dbConfig.accessToken,
          connectString       : dbConfig.connectString,
          poolMin             : 1,
          poolMax             : 5,
          poolIncrement       : 1,
          externalAuth        : true,
          homogeneous         : true,
          accessTokenCallback : callback
        });
        assert.ok(pool);

        conn1 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        // invalidate token to test callback
        pool.setAccessToken({
          token           : dbConfig.expiredAccessToken.token,
          privateKey      : ''
        });

        conn2 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 2);
        assert.deepEqual(pool.connectionsInUse, 2);

      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (conn1)
            await conn1.close();
          if (conn2)
            await conn2.close();
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.23 invalidate tokens using setAccessToken with missing privateKey', async () => {
      function callback() {
        // valid token and privateKey values
        return dbConfig.callbackValid;
      }

      let pool, conn1, conn2;
      try {
        pool = await oracledb.createPool({
          accessToken         : dbConfig.accessToken,
          connectString       : dbConfig.connectString,
          poolMin             : 1,
          poolMax             : 5,
          poolIncrement       : 1,
          externalAuth        : true,
          homogeneous         : true,
          accessTokenCallback : callback
        });
        assert.ok(pool);

        conn1 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        // invalidate token to test callback
        pool.setAccessToken({
          token  : dbConfig.expiredAccessToken.token
        });

        conn2 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 2);
        assert.deepEqual(pool.connectionsInUse, 2);

      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (conn1)
            await conn1.close();
          if (conn2)
            await conn2.close();
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.24 with callback having valid tokens in multiple pool', async () => {
      function callback() {
        // valid token and privateKey values
        return dbConfig.callbackValid;
      }

      let pool1, conn1, conn2;
      try {
        pool1 = await oracledb.createPool({
          accessToken         : dbConfig.accessToken,
          connectString       : dbConfig.connectString,
          poolMin             : 1,
          poolMax             : 2,
          poolIncrement       : 1,
          externalAuth        : true,
          homogeneous         : true,
          accessTokenCallback : callback
        });
        assert.ok(pool1);

        conn1 = await pool1.getConnection();
        assert.deepEqual(pool1.connectionsOpen, 1);
        assert.deepEqual(pool1.connectionsInUse, 1);

        pool1.setAccessToken({
          token: dbConfig.expiredAccessToken.token
        });

        conn2 = await pool1.getConnection();
        assert.deepEqual(pool1.connectionsOpen, 2);
        assert.deepEqual(pool1.connectionsInUse, 2);
      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (conn1)
            await conn1.close();
          if (conn2)
            await conn2.close();
          if (pool1)
            await pool1.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }

      let pool2, conn3, conn4;
      try {
        pool2 = await oracledb.createPool({
          accessToken         : dbConfig.accessToken,
          connectString       : dbConfig.connectString,
          poolMin             : 1,
          poolMax             : 2,
          poolIncrement       : 1,
          externalAuth        : true,
          homogeneous         : true,
          accessTokenCallback : callback
        });
        assert.ok(pool2);

        conn3 = await pool2.getConnection();
        assert.deepEqual(pool2.connectionsOpen, 1);
        assert.deepEqual(pool2.connectionsInUse, 1);

        pool2.setAccessToken({
          token   : dbConfig.expiredAccessToken.token
        });

        conn4 = await pool2.getConnection();
        assert.deepEqual(pool2.connectionsOpen, 2);
        assert.deepEqual(pool2.connectionsInUse, 2);
      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (conn3)
            await conn3.close();
          if (conn4)
            await conn4.close();
          if (pool2)
            await pool2.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.25 with callback having valid and invalid tokens in multiple pool', async () => {
      function callback1() {
        // valid token and privateKey values
        return dbConfig.callbackValid;
      }

      function callback2() {
        return dbConfig.callbackInvalid5;
      }

      let pool1, conn1, conn2;
      try {
        pool1 = await oracledb.createPool({
          accessToken         : dbConfig.accessToken,
          connectString       : dbConfig.connectString,
          poolMin             : 1,
          poolMax             : 2,
          poolIncrement       : 1,
          externalAuth        : true,
          homogeneous         : true,
          accessTokenCallback : callback1
        });
        assert.ok(pool1);

        conn1 = await pool1.getConnection();
        assert.deepEqual(pool1.connectionsOpen, 1);
        assert.deepEqual(pool1.connectionsInUse, 1);

        pool1.setAccessToken({
          token   : dbConfig.expiredAccessToken.token
        });

        conn2 = await pool1.getConnection();
        assert.deepEqual(pool1.connectionsOpen, 2);
        assert.deepEqual(pool1.connectionsInUse, 2);
      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (conn1)
            await conn1.close();
          if (conn2)
            await conn2.close();
          if (pool1)
            await pool1.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }

      let pool2, conn3, conn4;
      try {
        pool2 = await oracledb.createPool({
          accessToken         : dbConfig.accessToken,
          connectString       : dbConfig.connectString,
          poolMin             : 1,
          poolMax             : 2,
          poolIncrement       : 1,
          externalAuth        : true,
          homogeneous         : true,
          accessTokenCallback : callback2
        });
        assert.ok(pool2);

        conn3 = await pool2.getConnection();
        assert.deepEqual(pool2.connectionsOpen, 1);
        assert.deepEqual(pool2.connectionsInUse, 1);

        pool2.setAccessToken({
          token  : dbConfig.expiredAccessToken.token
        });

        conn4 = await pool2.getConnection();
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^ORA-01017:/, 'regexp does not match');
      } finally {
        try {
          if (conn3)
            await conn3.close();
          if (conn4)
            await conn4.close();
          if (pool2)
            await pool2.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.26 acquiring released session after token expiry', async () => {
      let pool, conn1;
      try {
        pool = await oracledb.createPool({
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 1,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
        assert.ok(pool);
        conn1 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        await conn1.close();

        // invalidate tokens
        pool.setAccessToken(dbConfig.expiredAccessToken);

        conn1 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        await conn1.close();

      } catch (err) {
        assert.notDeepEqual(err, {});
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.27 acquiring released session with existing tag, with token expiry', async () => {
      function initSession(connection, requestedTag, callbackFn) {
        const tagParts = requestedTag.split('=');
        if (tagParts[0] != 'USER_TZ') {
          callbackFn(new Error('Error: Only property USER_TZ is supported'));
          return;
        }
        connection.execute(
          `ALTER SESSION SET TIME_ZONE = '${tagParts[1]}'`,
          (err) => {
            connection.tag = requestedTag;
            callbackFn(err);
          }
        );
      }

      let pool, conn1, conn2, conn3;
      // callback function for token refresh is not called
      try {
        pool = await oracledb.createPool({
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 2,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true,
          sessionCallback   : initSession
        });
        assert.ok(pool);

        conn1 = await pool.getConnection({
          poolAlias : 'default',
          tag       : "USER_TZ=UTC"
        });
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        conn2 = await pool.getConnection({
          poolAlias  : 'default',
          tag        : "USER_TZ=GMT"
        });
        assert.deepEqual(pool.connectionsOpen, 2);
        assert.deepEqual(pool.connectionsInUse, 2);

        if (conn1)
          await conn1.close();
        if (conn2)
          await conn2.close();

        // invalidate tokens
        pool.setAccessToken(dbConfig.expiredAccessToken);

        // acquire session with existing tag
        // doen't need token refresh
        conn3 = await pool.getConnection({
          poolAlias : 'default',
          tag       : "USER_TZ=GMT"
        });
        if (conn3)
          await conn3.close();

      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.28 acquiring released session without existing tag, with token expiry', async () => {
      function initSession(connection, requestedTag, callbackFn) {
        const tagParts = requestedTag.split('=');
        if (tagParts[0] != 'USER_TZ') {
          callbackFn(new Error('Error: Only property USER_TZ is supported'));
          return;
        }
        connection.execute(
          `ALTER SESSION SET TIME_ZONE = '${tagParts[1]}'`,
          (err) => {
            connection.tag = requestedTag;
            callbackFn(err);
          }
        );
      }

      let pool, conn1, conn2, conn3;
      // callback function for token refresh is not called
      try {
        pool = await oracledb.createPool({
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 2,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true,
          sessionCallback   : initSession
        });
        assert.ok(pool);

        conn1 = await pool.getConnection({
          poolAlias : 'default',
          tag       : "USER_TZ=UTC"});
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);

        conn2 = await pool.getConnection({
          poolAlias : 'default',
          tag       : "USER_TZ=GMT"
        });
        assert.deepEqual(pool.connectionsOpen, 2);
        assert.deepEqual(pool.connectionsInUse, 2);

        if (conn1)
          await conn1.close();
        if (conn2)
          await conn2.close();

        // invalidate tokens
        pool.setAccessToken(dbConfig.expiredAccessToken);

        conn3 = await pool.getConnection({
          poolAlias : 'default',
          tag       : "USER_TZ=Australia/Melbourne"
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^ORA-25708:/, 'regexp does not match');
      } finally {
        try {
          if (conn3)
            await conn3.close();
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.29 user/password without tokens and externalAuth set to false', async () => {
      let pool;
      try {
        pool = await oracledb.createPool({
          user              : dbConfig.user,
          password          : dbConfig.password,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          externalAuth      : false,
          homogeneous       : true
        });
        assert.ok(pool);
      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.30 token and private key should be private', async () => {
      let pool;
      try {
        pool = await oracledb.createPool({
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 2,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
        assert.ok(pool);
        assert.deepEqual(pool.token, undefined);
        assert.deepEqual(pool.privateKey, undefined);
      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.31 token and private key value should not be shown in logs', async () => {
      let pool;
      try {
        pool = await oracledb.createPool({
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 2,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true,
          enableStatistics  : true
        });
        assert.ok(pool);
        const poolstatistics = pool.getStatistics();
        assert.deepEqual(poolstatistics.token, undefined);
        assert.deepEqual(poolstatistics.privateKey, undefined);
      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.32 not readable token and private key value', async () => {
      const testData = {
        token       :  '1Àè&ýÿÿ¿',
        privateKey  :  '1Àè&ýÿÿ¿'
      };

      let pool;
      try {
        pool = await oracledb.createPool({
          accessToken       : testData,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 2,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^ORA-25707:/, 'regexp does not match');
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.33 pool creation with 0 connection', async () => {
      let pool;
      try {
        pool = await oracledb.createPool({
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          poolMin           : 0,
          poolMax           : 2,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
        assert.ok(pool);
      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.34 token expires before creating connection', async () => {
      function callback() {
        return dbConfig.callbackValid;
      }

      let pool, conn1, conn2;
      try {
        pool = await oracledb.createPool({
          accessToken         : dbConfig.accessToken,
          connectString       : dbConfig.connectString,
          poolMin             : 0,
          poolMax             : 1,
          poolIncrement       : 1,
          externalAuth        : true,
          homogeneous         : true,
          accessTokenCallback : callback
        });
        assert.ok(pool);

        // invalidate token to test callback
        pool.setAccessToken(dbConfig.expiredAccessToken);

        conn1 = await pool.getConnection();
        assert.deepEqual(pool.connectionsOpen, 1);
        assert.deepEqual(pool.connectionsInUse, 1);
      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (conn1)
            await conn1.close();
          if (conn2)
            await conn2.close();
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.35 undefined token and private key value', async () => {
      const testData = {
        token       :  undefined,
        privateKey  :  undefined
      };

      let pool;
      try {
        pool = await oracledb.createPool({
          accessToken       : testData,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 2,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-084:/, 'regexp does not match');
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.36 user/password with accessTokenCallback', async () => {
      function callback() {
        return dbConfig.callbackValid;
      }
      let pool;
      try {
        pool = await oracledb.createPool({
          user                  : dbConfig.user,
          password              : dbConfig.password,
          accessTokenCallback   : callback,
          connectString         : dbConfig.connectString,
          poolMin               : 1,
          poolMax               : 5,
          poolIncrement         : 1,
          externalAuth          : false,
          homogeneous           : true
        });
        assert.ok(pool);
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-084:/, 'regexp does not match');
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.1.37 create pool connection using expired token', async () => {
      let pool;

      try {
        pool = await oracledb.createPool({
          accessToken       : dbConfig.expiredAccessToken,
          connectString     : dbConfig.connectString,
          poolMin           : 1,
          poolMax           : 1,
          poolIncrement     : 1,
          externalAuth      : true,
          homogeneous       : true
        });
        assert.ok(pool);
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^ORA-25708:/, 'regexp does not match');
      } finally {
        try {
          if (pool)
            await pool.close(0);
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });
  });

  describe('265.2 Standalone', function() {

    it('265.2.1 create standalone connection', async () => {
      let conn;
      try {
        conn = await oracledb.getConnection({
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          externalAuth      : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
      } finally {
        try {
          if (conn)
            await conn.close();
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.2.2 standalone connection with invalid data', async () => {
      let conn;
      const ResObj = {
        token        : dbConfig.accessToken.privateKey,
        privateKey   : dbConfig.accessToken.token
      };
      try {
        conn = await oracledb.getConnection({
          accessToken       : ResObj,
          connectString     : dbConfig.connectString,
          externalAuth      : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^ORA-25707:/, 'regexp does not match');
      } finally {
        try {
          if (conn)
            await conn.close();
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.2.3 standalone connection with missing data', async () => {
      let conn;
      const ResObj = {
        privateKey   : dbConfig.accessToken.token
      };
      try {
        conn = await oracledb.getConnection({
          accessToken       : ResObj,
          connectString     : dbConfig.connectString,
          externalAuth      : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-084:/, 'regexp does not match');
      } finally {
        try {
          if (conn)
            await conn.close();
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.2.4 standalone connection with missing data', async () => {
      let conn;
      const ResObj = {
        token: dbConfig.accessToken.privateKey
      };
      try {
        conn = await oracledb.getConnection({
          accessToken       : ResObj,
          connectString     : dbConfig.connectString,
          externalAuth      : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-084:/, 'regexp does not match');
      } finally {
        try {
          if (conn)
            await conn.close();
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.2.5 standalone connection with empty data', async () => {
      let conn;
      const ResObj = {
        token        : dbConfig.accessToken.token,
        privateKey   : ''
      };
      try {
        conn = await oracledb.getConnection({
          accessToken       : ResObj,
          connectString     : dbConfig.connectString,
          externalAuth      : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-084:/, 'regexp does not match');
      } finally {
        try {
          if (conn)
            await conn.close();
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });


    it('265.2.6 standalone connection with empty data', async () => {
      let conn;
      const ResObj = {
        token        : '',
        privateKey   : dbConfig.accessToken.privateKey
      };
      try {
        conn = await oracledb.getConnection({
          accessToken       : ResObj,
          connectString     : dbConfig.connectString,
          externalAuth      : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-084:/, 'regexp does not match');
      } finally {
        try {
          if (conn)
            await conn.close();
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.2.7 externalAuth must be set to true', async () => {
      let conn;
      try {
        conn = await oracledb.getConnection({
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          externalAuth      : false
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-086:/, 'regexp does not match');
      } finally {
        try {
          if (conn)
            await conn.close();
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.2.8 user/password with tokens', async () => {
      let conn;
      try {
        conn = await oracledb.getConnection({
          user              : dbConfig.user,
          password          : dbConfig.password,
          accessToken       : dbConfig.accessToken,
          connectString     : dbConfig.connectString,
          externalAuth      : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-084:/, 'regexp does not match');
      } finally {
        try {
          if (conn)
            await conn.close();
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.2.9 user/password without tokens', async () => {
      let conn;
      try {
        conn = await oracledb.getConnection({
          user              : dbConfig.user,
          password          : dbConfig.password,
          connectString     : dbConfig.connectString,
          externalAuth      : false
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-084:/, 'regexp does not match');
      } finally {
        try {
          if (conn)
            await conn.close();
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.2.10 standalone connection with undefined private key and token', async () => {
      let conn;
      const ResObj = {
        token        : undefined,
        privateKey   : undefined
      };
      try {
        conn = await oracledb.getConnection({
          accessToken       : ResObj,
          connectString     : dbConfig.connectString,
          externalAuth      : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^NJS-084:/, 'regexp does not match');
      } finally {
        try {
          if (conn)
            await conn.close();
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.2.11 standalone connection with not readable data', async () => {
      let conn;
      const ResObj = {
        token        : '1Àè&ýÿÿ¿',
        privateKey   : '1Àè&ýÿÿ¿'
      };
      try {
        conn = await oracledb.getConnection({
          accessToken       : ResObj,
          connectString     : dbConfig.connectString,
          externalAuth      : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^ORA-25707:/, 'regexp does not match');
      } finally {
        try {
          if (conn)
            await conn.close();
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.2.12 token and private key are private', async () => {
      let conn;
      const ResObj = {
        token        : dbConfig.accessToken.token,
        privateKey   : dbConfig.accessToken.privateKey,
      };
      try {
        conn = await oracledb.getConnection({
          accessToken       : ResObj,
          connectString     : dbConfig.connectString,
          externalAuth      : true
        });
        assert.deepEqual(conn.token, undefined);
        assert.deepEqual(conn.privateKey, undefined);
      } catch (err) {
        assert.deepEqual(err, {});
      } finally {
        try {
          if (conn)
            await conn.close();
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });

    it('265.2.13 standalone connection with expired token', async () => {
      let conn;
      const ResObj = {
        token        : dbConfig.expiredAccessToken.token,
        privateKey   : dbConfig.expiredAccessToken.privateKey
      };
      try {
        conn = await oracledb.getConnection({
          accessToken       : ResObj,
          connectString     : dbConfig.connectString,
          externalAuth      : true
        });
      } catch (err) {
        assert.notDeepEqual(err, {});
        assert.match(err.message, /^ORA-25708:/, 'regexp does not match');
      } finally {
        try {
          if (conn)
            await conn.close();
        } catch (err) {
          assert.deepEqual(err, {});
        }
      }
    });
  });
});

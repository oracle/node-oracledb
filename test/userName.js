/* Copyright (c) 2021, 2022, Oracle and/or its affiliates. */

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
 *   248. userName.js
 *
 * DESCRIPTION
 *   Testing with username and user.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const assist    = require('./dataTypeAssist.js');
const testsUtil = require('./testsUtil.js');

describe('248. userName.js', function() {
  const dbaCredential = {
    username      : dbConfig.test.DBA_user,
    password      : dbConfig.test.DBA_password,
    connectString : dbConfig.connectString,
    privilege     : oracledb.SYSDBA
  };

  const createUser = async function(userSchema, password) {
    let dbaConn;
    try {
      dbaConn = await oracledb.getConnection(dbaCredential);

      let sql = `create user ${userSchema} identified by ${password}`;
      await dbaConn.execute(sql);

      sql = `grant create session to ${userSchema}`;
      await dbaConn.execute(sql);
    } catch (err) {
      assert.fail(err);
    } finally {
      await dbaConn.close();
    }
  };

  const dropUser = async function(userSchema) {
    try {
      const dbaConn = await oracledb.getConnection(dbaCredential);

      const sql = `drop user ${userSchema} cascade`;
      await dbaConn.execute(sql);
      await dbaConn.close();
    } catch (err) {
      assert.fail(err);
    }
  };

  describe('248.1 test with different size of username', () => {

    it('248.1.1 test with username size 30', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) this.skip();

      try {
        const userSchema = await assist.createSchemaString(30);
        const password = "Welcome";
        await createUser(userSchema, password);

        const credential = {
          username     : userSchema,
          password     : password,
          connectString: dbConfig.connectString
        };

        const conn = await oracledb.getConnection(credential);
        assert(conn);
        await conn.close();

        await dropUser(userSchema);

      } catch (err) {
        assert.fail(err);
      }
    }); // 248.1.1

    it('248.1.2 test with username size 100', async function() {
      let runnable = await testsUtil.isLongUserNameRunnable();
      if (!runnable) {
        this.skip();
        return;
      }

      try {
        const userSchema = await assist.createSchemaString(100);
        const password = "Welcome";
        await createUser(userSchema, password);

        const credential = {
          username     : userSchema,
          password     : password,
          connectString: dbConfig.connectString
        };

        let conn = await oracledb.getConnection(credential);
        assert(conn);
        await conn.close();

        await dropUser(userSchema);

      } catch (err) {
        assert.fail(err);
      }
    }); // 248.1.2

    it('248.1.3 test with username size 128', async function() {
      let runnable = await testsUtil.isLongUserNameRunnable();
      if (!runnable) {
        this.skip();
        return;
      }

      try {
        const userSchema = await assist.createSchemaString(128);
        const password = "Welcome";
        await createUser(userSchema, password);

        const credential = {
          username     : userSchema,
          password     : password,
          connectString: dbConfig.connectString
        };

        const conn = await oracledb.getConnection(credential);
        assert(conn);
        await conn.close();

        await dropUser(userSchema);

      } catch (err) {
        assert.fail(err);
      }

    }); // 248.1.3

    it('248.1.4 test with username size 1000', async function() {
      let runnable = await testsUtil.isLongUserNameRunnable();
      if (!runnable) {
        this.skip();
        return;
      }

      let dbaConn;

      try {
        const userSchema = await assist.createSchemaString(1000);
        const password = "Welcome";

        dbaConn = await oracledb.getConnection(dbaCredential);

        let sql = `create user ${userSchema} identified by ${password}`;
        await dbaConn.execute(sql);

        sql = `grant create session to ${userSchema}`;
        await dbaConn.execute(sql);

        assert.fail();  // should not be here

      } catch (err) {
        assert(err);
        assert(err.message.startsWith('ORA-00972:'));
      } finally {
        await dbaConn.close();
      }

    }); // 248.1.4

    it('248.1.5 negative test: username = null', async function() {
      try {
        const credential = {
          username     : null,
          password     : dbConfig.password,
          connectString: dbConfig.connectString
        };
        await assert.rejects(
          async () => {
            await oracledb.getConnection(credential);
          },
          /NJS-007/
        );
      } catch (error) {
        assert.fail(error);
      }
    }); // 248.1.5

    it('248.1.6 negative test: username = "null"', async function() {
      try {
        const credential = {
          username     : "null",
          password     : dbConfig.password,
          connectString: dbConfig.connectString
        };
        await assert.rejects(
          async () => {
            await oracledb.getConnection(credential);
          },
          /ORA-01017/
        );
      } catch (error) {
        assert.fail(error);
      }
    }); // 248.1.6

    it('248.1.7 negative test: username = undefined', async function() {
      try {
        const credential = {
          username     : undefined,
          password     : dbConfig.password,
          connectString: dbConfig.connectString
        };
        await assert.rejects(
          async () => {
            await oracledb.getConnection(credential);
          },
          /ORA-01017/
        );
      } catch (error) {
        assert.fail(error);
      }
    }); // 248.1.7

    it('248.1.8 negative test: username = "undefined"', async function() {
      try {
        const credential = {
          username     : "undefined",
          password     : dbConfig.password,
          connectString: dbConfig.connectString
        };
        await assert.rejects(
          async () => {
            await oracledb.getConnection(credential);
          },
          /ORA-01017/
        );
      } catch (error) {
        assert.fail(error);
      }
    }); // 248.1.8

    it('248.1.9 negative test: username = empty string', async function() {
      try {
        const credential = {
          username     : "",
          password     : dbConfig.password,
          connectString: dbConfig.connectString
        };
        await assert.rejects(
          async () => {
            await oracledb.getConnection(credential);
          },
          /ORA-01017/
        );
      } catch (error) {
        assert.fail(error);
      }
    }); // 248.1.9

    it('248.1.10 negative test: username = NaN', async function() {
      try {
        const credential = {
          username     : NaN,
          password     : dbConfig.password,
          connectString: dbConfig.connectString
        };
        await assert.rejects(
          async () => {
            await oracledb.getConnection(credential);
          },
          /NJS-007/
        );
      } catch (error) {
        assert.fail(error);
      }
    }); // 248.1.10

    it('248.1.11 negative test: username in array', async function() {
      try {
        const credential = {
          username     : ["scott", "scott"],
          password     : dbConfig.password,
          connectString: dbConfig.connectString
        };
        await assert.rejects(
          async () => {
            await oracledb.getConnection(credential);
          },
          /NJS-007/
        );
      } catch (error) {
        assert.fail(error);
      }
    }); // 248.1.11

  }); // 248.1

  describe('248.2 test with different size of user', () => {

    it('248.2.1 test with user size 30', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) this.skip();

      try {
        const userSchema = await assist.createSchemaString(30);
        const password = "Welcome";
        await createUser(userSchema, password);

        const credential = {
          username     : userSchema,
          password     : password,
          connectString: dbConfig.connectString
        };

        const conn = await oracledb.getConnection(credential);
        assert(conn);
        await conn.close();

        await dropUser(userSchema);

      } catch (err) {
        assert.fail(err);
      }
    }); // 248.2.1

    it('248.2.2 test with user size 100', async function() {
      let runnable = await testsUtil.isLongUserNameRunnable();
      if (!runnable) {
        this.skip();
        return;
      }

      try {
        const userSchema = await assist.createSchemaString(100);
        const password = "Welcome";
        await createUser(userSchema, password);

        const credential = {
          username     : userSchema,
          password     : password,
          connectString: dbConfig.connectString
        };

        const conn = await oracledb.getConnection(credential);
        assert(conn);
        await conn.close();

        await dropUser(userSchema);

      } catch (err) {
        assert.fail(err);
      }
    }); // 248.2.2

    it('248.2.3 test with user size 128', async function() {
      let runnable = await testsUtil.isLongUserNameRunnable();
      if (!runnable) {
        this.skip();
        return;
      }

      try {
        const userSchema = await assist.createSchemaString(128);
        const password = "Welcome";
        await createUser(userSchema, password);

        const credential = {
          username     : userSchema,
          password     : password,
          connectString: dbConfig.connectString
        };

        const conn = await oracledb.getConnection(credential);
        assert(conn);
        await conn.close();

        await dropUser(userSchema);

      } catch (err) {
        assert.fail(err);
      }

    }); // 248.2.3

    it('248.2.4 test with username size 1000', async function() {
      let runnable = await testsUtil.isLongUserNameRunnable();
      if (!runnable) {
        this.skip();
        return;
      }

      let dbaConn;
      try {
        const userSchema = await assist.createSchemaString(1000);
        const password = "Welcome";

        dbaConn = await oracledb.getConnection(dbaCredential);

        let sql = `create user ${userSchema} identified by ${password}`;
        await dbaConn.execute(sql);

        sql = `grant create session to ${userSchema}`;
        await dbaConn.execute(sql);

        assert.fail();

      } catch (err) {
        assert(err);
        assert(err.message.startsWith('ORA-00972:'));  // identifier too long
      } finally {
        await dbaConn.close();
      }

    }); // 248.2.4

    it('248.2.5 negative test: username = null', async function() {
      try {
        const credential = {
          user         : null,
          password     : dbConfig.password,
          connectString: dbConfig.connectString
        };
        await assert.rejects(
          async () => {
            await oracledb.getConnection(credential);
          },
          /NJS-007/
        );
      } catch (error) {
        assert.fail(error);
      }
    }); // 248.2.5

    it('248.2.6 negative test: username = "null"', async function() {
      try {
        const credential = {
          user         : "null",
          password     : dbConfig.password,
          connectString: dbConfig.connectString
        };
        await assert.rejects(
          async () => {
            await oracledb.getConnection(credential);
          },
          /ORA-01017/
        );
      } catch (error) {
        assert.fail(error);
      }
    }); // 248.2.6

    it('248.2.7 negative test: username = undefined', async function() {
      try {
        const credential = {
          user         : undefined,
          password     : dbConfig.password,
          connectString: dbConfig.connectString
        };
        await assert.rejects(
          async () => {
            await oracledb.getConnection(credential);
          },
          /ORA-01017/
        );
      } catch (error) {
        assert.fail(error);
      }
    }); // 248.2.7

    it('248.2.8 negative test: username = "undefined"', async function() {
      try {
        const credential = {
          user         : "undefined",
          password     : dbConfig.password,
          connectString: dbConfig.connectString
        };
        await assert.rejects(
          async () => {
            await oracledb.getConnection(credential);
          },
          /ORA-01017/
        );
      } catch (error) {
        assert.fail(error);
      }
    }); // 248.2.8

    it('248.2.9 negative test: username = empty string', async function() {
      try {
        const credential = {
          user         : "",
          password     : dbConfig.password,
          connectString: dbConfig.connectString
        };
        await assert.rejects(
          async () => {
            await oracledb.getConnection(credential);
          },
          /ORA-01017/
        );
      } catch (error) {
        assert.fail(error);
      }
    }); // 248.2.9

    it('248.2.10 negative test: username = NaN', async function() {
      try {
        const credential = {
          user         : NaN,
          password     : dbConfig.password,
          connectString: dbConfig.connectString
        };
        await assert.rejects(
          async () => {
            await oracledb.getConnection(credential);
          },
          /NJS-007/
        );
      } catch (error) {
        assert.fail(error);
      }
    }); // 248.2.10

    it('248.2.11 negative test: username in array', async function() {
      try {
        const credential = {
          user         : ["scott", "scott"],
          password     : dbConfig.password,
          connectString: dbConfig.connectString
        };
        await assert.rejects(
          async () => {
            await oracledb.getConnection(credential);
          },
          /NJS-007/
        );
      } catch (error) {
        assert.fail(error);
      }
    }); // 248.2.11

  }); // 248.2

});

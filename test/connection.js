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
 *   1. connection.js
 *
 * DESCRIPTION
 *   Testing a basic connection to the database.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('1. connection.js', function() {

  const credentials = {
    user:          dbConfig.user,
    password:      dbConfig.password,
    connectString: dbConfig.connectString
  };

  describe('1.1 can run SQL query with different output formats', function() {

    let connection = null;
    const script =
      "BEGIN \
          DECLARE \
              e_table_missing EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE nodb_conn_dept1 PURGE'); \
          EXCEPTION \
              WHEN e_table_missing \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE nodb_conn_dept1 ( \
                  department_id NUMBER,  \
                  department_name VARCHAR2(20) \
              ) \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_conn_dept1  \
                   (department_id, department_name) VALUES \
                   (40,''Human Resources'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_conn_dept1  \
                   (department_id, department_name) VALUES \
                   (20, ''Marketing'') \
          '); \
      END; ";

    before(async function() {
      connection = await oracledb.getConnection(credentials);
      await connection.execute(script);
    });

    after(async function() {
      await connection.execute('DROP TABLE nodb_conn_dept1 PURGE');
      await connection.release();
    });

    const query = "SELECT department_id, department_name " +
                "FROM nodb_conn_dept1 " +
                "WHERE department_id = :id";

    it('1.1.1 ARRAY format by default', async function() {
      const defaultFormat = oracledb.outFormat;
      assert.strictEqual(defaultFormat, oracledb.OUT_FORMAT_ARRAY);
      const result = await connection.execute(query, [40]);
      assert(result);
      assert.deepStrictEqual(result.rows, [[ 40, 'Human Resources' ]]);
    });

    it('1.1.2 ARRAY format explicitly', async function() {
      const result = await connection.execute(query, {id: 20}, {outFormat: oracledb.OUT_FORMAT_ARRAY});
      assert(result);
      assert.deepStrictEqual(result.rows, [[ 20, 'Marketing' ]]);
    });

    it('1.1.3 OBJECT format', async function() {
      const result = await connection.execute(query, {id: 20}, {outFormat: oracledb.OUT_FORMAT_OBJECT});
      assert(result);
      assert.deepStrictEqual(result.rows, [{ DEPARTMENT_ID: 20, DEPARTMENT_NAME: 'Marketing' }]);
    });

    it('1.1.4 Negative test - invalid outFormat value', async function() {
      await assert.rejects(
        async () => {
          await connection.execute(query, {id: 20}, {outFormat:0 });
        },
        /NJS-007:/
      );
    });
  });

  describe('1.2 can call PL/SQL procedures', function() {
    let connection = false;

    const proc = "CREATE OR REPLACE PROCEDURE nodb_bindingtest (p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT VARCHAR2) "
                + "AS "
                + "BEGIN "
                + "  p_out := p_in || ' ' || p_inout; "
                + "END; ";

    before(async function() {
      connection = await oracledb.getConnection(credentials);
      await connection.execute(proc);
    });

    after(async function() {
      await connection.execute("DROP PROCEDURE nodb_bindingtest");
      await connection.release();
    });

    it('1.2.1 bind parameters in various ways', async function() {
      const bindValues = {
        i: 'Alan', // default is type STRING and direction Infinity
        io: { val: 'Turing', type: oracledb.STRING, dir: oracledb.BIND_INOUT },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute("BEGIN nodb_bindingtest(:i, :io, :o); END;", bindValues);
      assert(result);
      assert.strictEqual(result.outBinds.io, 'Turing');
      assert.strictEqual(result.outBinds.o, 'Alan Turing');
    });
  });

  describe('1.3 statementCacheSize controls statement caching', function() {
    const makeTable =
        "BEGIN \
            DECLARE \
                e_table_missing EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE nodb_conn_emp4 PURGE'); \
            EXCEPTION \
                WHEN e_table_missing \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE nodb_conn_emp4 ( \
                    id NUMBER,  \
                    name VARCHAR2(4000) \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_conn_emp4  \
                   VALUES \
                   (1001,''Chris Jones'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_conn_emp4  \
                   VALUES \
                   (1002,''Tom Kyte'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_conn_emp4  \
                   VALUES \
                   (2001, ''Karen Morton'') \
            '); \
        END; ";

    let connection = false;
    const defaultStmtCache = oracledb.stmtCacheSize; // 30

    beforeEach('get connection and prepare table', async function() {
      connection = await oracledb.getConnection(credentials);
      await connection.execute(makeTable);
    });

    afterEach('drop table and release connection', async function() {
      oracledb.stmtCacheSize = defaultStmtCache;
      await connection.execute("DROP TABLE nodb_conn_emp4 PURGE");
      await connection.release();
    });

    it('1.3.1 stmtCacheSize = 0, which disable statement caching', async function() {
      oracledb.stmtCacheSize = 0;

      await connection.execute("INSERT INTO nodb_conn_emp4 VALUES (:num, :str)",
        { num: 1003, str: 'Robyn Sands' },
        { autoCommit: true });
      await connection.execute("INSERT INTO nodb_conn_emp4 VALUES (:num, :str)",
        { num: 1004, str: 'Bryant Lin' },
        { autoCommit: true });
      await connection.execute("INSERT INTO nodb_conn_emp4 VALUES (:num, :str)",
        { num: 1005, str: 'Patrick Engebresson' },
        { autoCommit: true });
    });

    it('1.3.2 works well when statement cache enabled (stmtCacheSize > 0) ', async function() {
      oracledb.stmtCacheSize = 100;

      await connection.execute("INSERT INTO nodb_conn_emp4 VALUES (:num, :str)",
        { num: 1003, str: 'Robyn Sands' },
        { autoCommit: true });
      await connection.execute("INSERT INTO nodb_conn_emp4 VALUES (:num, :str)",
        { num: 1004, str: 'Bryant Lin' },
        { autoCommit: true });
      await connection.execute("INSERT INTO nodb_conn_emp4 VALUES (:num, :str)",
        { num: 1005, str: 'Patrick Engebresson' },
        { autoCommit: true });
    });

  });

  describe('1.4 Testing commit() & rollback() functions', function() {
    const makeTable =
        "BEGIN \
            DECLARE \
                e_table_missing EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE nodb_conn_emp5 PURGE'); \
            EXCEPTION \
                WHEN e_table_missing \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE nodb_conn_emp5 ( \
                    id NUMBER,  \
                    name VARCHAR2(4000) \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_conn_emp5  \
                   VALUES \
                   (1001,''Tom Kyte'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_conn_emp5  \
                   VALUES \
                   (1002, ''Karen Morton'') \
            '); \
        END; ";

    let conn1 = false;
    let conn2 = false;
    beforeEach('get 2 connections and create the table', async function() {
      conn1 = await oracledb.getConnection(credentials);
      conn2 = await oracledb.getConnection(credentials);
      await conn1.execute(makeTable, [], { autoCommit: true });
    });

    afterEach('drop table and release connections', async function() {
      await conn2.execute("DROP TABLE nodb_conn_emp5 PURGE");
      await conn1.release();
      await conn2.release();
    });

    it('1.4.1 commit() function works well', async function() {
      await conn2.execute("INSERT INTO nodb_conn_emp5 VALUES (:num, :str)",
        { num: 1003, str: 'Patrick Engebresson' });
      let result = await conn1.execute("SELECT COUNT(*) FROM nodb_conn_emp5");
      assert(result);
      assert.strictEqual(result.rows[0][0], 2);
      result = await conn2.execute("SELECT COUNT(*) FROM nodb_conn_emp5");
      assert.strictEqual(result.rows[0][0], 3);
      await conn2.commit();
      result = await conn1.execute("SELECT COUNT(*) FROM nodb_conn_emp5");
      assert.strictEqual(result.rows[0][0], 3);
    });

    it('1.4.2 rollback() function works well', async function() {
      await conn2.execute("INSERT INTO nodb_conn_emp5 VALUES (:num, :str)",
        { num: 1003, str: 'Patrick Engebresson' });

      let result = await conn1.execute("SELECT COUNT(*) FROM nodb_conn_emp5");
      assert(result);
      assert.strictEqual(result.rows[0][0], 2);

      result = await conn2.execute("SELECT COUNT(*) FROM nodb_conn_emp5");
      assert.strictEqual(result.rows[0][0], 3);
      await conn2.rollback();
      result = await conn2.execute("SELECT COUNT(*) FROM nodb_conn_emp5");
      assert.strictEqual(result.rows[0][0], 2);
    });
  });

  describe('1.5 Close method', function() {

    it('1.5.1 close can be used as an alternative to release', async function() {
      const conn = await oracledb.getConnection(credentials);
      await conn.close();
    });
  });

  describe('1.6 connectionString alias', function() {

    it('1.6.1 allows connectionString to be used as an alias for connectString', async function() {
      const connection = await oracledb.getConnection({
        user: dbConfig.user,
        password: dbConfig.password,
        connectionString: dbConfig.connectString
      });
      await connection.close();
    });

  });

  describe('1.7 privileged connections', function() {

    it('1.7.1 Negative value - null', async function() {
      const credential = {
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: dbConfig.connectString,
        privilege: null
      };
      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /NJS-007: invalid value for "privilege" in parameter 1/
      );
    });

    it('1.7.2 Negative - invalid type, a String', async function() {
      const credential = {
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: dbConfig.connectString,
        privilege: 'sysdba'
      };
      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /NJS-007: invalid value for "privilege" in parameter 1/
      );
    });

    it('1.7.3 Negative value - random constants', async function() {
      const credential = {
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: dbConfig.connectString,
        privilege: 23
      };

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /ORA-24300/
      );// ORA-24300: bad value for mode
    });

    it('1.7.4 Negative value - NaN', async function() {
      const credential = {
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: dbConfig.connectString,
        privilege: NaN
      };

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /NJS-007: invalid value for "privilege" in parameter 1/
      );
    });

    it('1.7.5 gets ignored when acquiring a connection from Pool', async function() {
      const credential = {
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: dbConfig.connectString,
        privilege: null,
        poolMin: 1
      };
      const pool = await oracledb.createPool(credential);
      const conn = await pool.getConnection();
      await conn.close();
      await pool.close();
    });

  }); // 1.7

  describe('1.8 Ping method', function() {

    it('1.8.1 ping() checks the connection is usable', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      await conn.ping();
      await conn.close();
    });

    it('1.8.2 closed connection', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      await conn.close();
      await assert.rejects(
        async () => {
          await conn.ping();
        },
        /NJS-003: invalid connection/
      );
    });
  }); // 1.8

  describe('1.9 connectString & connectionString specified', function() {

    it('1.9.1 both connectString & ConnectionString specified', async function() {
      const credential = {
        user : dbConfig.user,
        password : dbConfig.password,
        connectString : dbConfig.connectString,
        connectionString : dbConfig.connectString
      };

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /NJS-075:/
      );
    });
  }); //1.9

  describe('1.10 user & username specified', function() {

    it('1.10.1 both user & username specified', async function() {
      const credential = {
        user : dbConfig.user,
        username : dbConfig.user,
        password : dbConfig.password,
        connectString : dbConfig.connectString
      };

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /NJS-080:/
      );
    });

    it('1.10.2 allows username to be used as an alias for user', async function() {
      const credential = {
        username : dbConfig.user,
        password : dbConfig.password,
        connectString : dbConfig.connectString
      };

      await oracledb.getConnection(credential);
    });

    it('1.10.3 uses username alias to login with SYSDBA privilege', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) this.skip();
      const credential = {
        username : dbConfig.test.DBA_user,
        password : dbConfig.test.DBA_password,
        connectString : dbConfig.connectString,
        privilege : oracledb.SYSDBA
      };

      await oracledb.getConnection(credential);
    });
  }); //1.10
  describe('1.11 Invalid credentials', function() {

    it('1.11.1 using bad connect string', async function() {
      const credential = {
        username : dbConfig.user,
        password : dbConfig.password,
        connectString : "invalid connect string"
      };

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /ORA-12154:/
      );
    });

    it('1.11.2 using user', async function() {
      const credential = {
        username : "tiger",
        password : dbConfig.password,
        connectString : dbConfig.connectString
      };

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /ORA-01017:/
      );
    });

    it('1.11.3 using invalid password', async function() {
      const credential = {
        username : dbConfig.user,
        password : "undefined",
        connectString : dbConfig.connectString
      };

      await assert.rejects(
        async () => {
          await oracledb.getConnection(credential);
        },
        /ORA-01017:/
      );
    });
  }); //1.11

  describe('1.12 confirm an exception is raised after closing a connection', function() {

    it('1.12.1 exception_on_close', async function() {
      const credential = {
        user : dbConfig.user,
        password : dbConfig.password,
        connectString : dbConfig.connectString,
      };
      let connection = false;
      connection = await oracledb.getConnection(credential);
      await connection.close();
      await assert.rejects(
        async () => {
          await connection.execute('SELECT * FROM DUAL');
        },
        /NJS-003:/
      );
    });
  }); //1.12
});

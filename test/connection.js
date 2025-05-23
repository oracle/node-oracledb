/* Copyright (c) 2015, 2025, Oracle and/or its affiliates. */

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
const assert = require('assert');
const dbConfig = require('./dbconfig.js');
const os = require('os');
const random = require('./random.js');
const testsUtil = require('./testsUtil.js');

describe('1. connection.js', function() {

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

    const commentSQL = "COMMENT ON TABLE nodb_conn_dept1 IS \
      'This is a table with information about various departments'";

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute(script);
      await connection.execute(commentSQL);
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
        async () => await connection.execute(query, {id: 20}, {outFormat: 0 }),
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
      connection = await oracledb.getConnection(dbConfig);
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
      connection = await oracledb.getConnection(dbConfig);
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

    let conn1, conn2;
    beforeEach('get 2 connections and create the table', async function() {
      conn1 = await oracledb.getConnection(dbConfig);
      conn2 = await oracledb.getConnection(dbConfig);
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
      const conn = await oracledb.getConnection(dbConfig);
      await conn.release();
    });
  });

  describe('1.6 connectionString alias', function() {

    it('1.6.1 allows connectionString to be used as an alias for connectString', async function() {
      const credential = {...dbConfig, connectionString: dbConfig.connectString};
      delete credential.connectString;

      const connection = await oracledb.getConnection(credential);
      await connection.release();
    });

  });

  describe('1.7 privileged connections', function() {

    it('1.7.1 Negative value - null', async function() {
      const credential = {...dbConfig, privilege: null};

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        /NJS-007: invalid value for "privilege" in parameter 1/
      );
    });

    it('1.7.2 Negative - invalid type, a String', async function() {
      const credential = {...dbConfig, privilege: 'sysdba'};

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        /NJS-007:/
      );
    });

    it('1.7.3 Negative value - random constants', async function() {
      const credential = {...dbConfig, privilege: 23};

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        /NJS-007:/
      );
    });

    it('1.7.4 Negative value - NaN', async function() {
      const credential = {...dbConfig, privilege: NaN};

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        /NJS-007:/
      );
    });

    it('1.7.5 Negative - throws error, when invalid privilege is provided for creating a Pool', async function() {
      const credential = {...dbConfig, privilege: null, poolMin: 1};
      await assert.rejects(
        async () => await oracledb.createPool(credential),
        /NJS-007:/
      );
    });

    it('1.7.6 negative test case SYSPRELIM & SYSASM', async function() {
      const credential = {...dbConfig,
        privilege: oracledb.SYSASM | oracledb.SYSPRELIM
      };
      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        /ORA-01031:|ORA-24542:|ORA-56618:/
        // ORA-56618: DRCP: PRELIM mode logon not allowed
      ); /*ORA-56618: This error is thrown when DRCP and Implicit Connection Pooling is enabled*/
    });

  }); // 1.7

  describe('1.8 Ping method', function() {

    it('1.8.1 ping() checks the connection is usable', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      await conn.ping();
      await conn.release();
    });

    it('1.8.2 closed connection', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      await conn.release();
      await assert.rejects(
        async () => await conn.ping(),
        /NJS-003:/
      );
    });
  }); // 1.8

  describe('1.9 connectString & connectionString specified', function() {

    it('1.9.1 both connectString & ConnectionString specified', async function() {
      const credential = {...dbConfig, connectionString: dbConfig.connectString};

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        /NJS-075:/
      );
    });
  }); //1.9

  describe('1.10 user & username specified', function() {

    it('1.10.1 both user & username specified', async function() {
      const credential = {...dbConfig, username: dbConfig.user};

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        /NJS-080:/
      );
    });

    it('1.10.2 allows username to be used as an alias for user', async function() {
      const credential = {...dbConfig};
      delete credential.user;
      credential.username = dbConfig.user;

      const conn = await oracledb.getConnection(credential);
      await conn.release();
    });

    it('1.10.3 uses username alias to login with SYSDBA privilege', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) this.skip();
      const credential = {...dbConfig, privilege: oracledb.SYSDBA};
      credential.user = dbConfig.test.DBA_user;
      credential.password = dbConfig.test.DBA_password;

      const conn = await oracledb.getConnection(credential);
      await conn.release();
    });
  }); //1.10

  describe('1.11 Invalid credentials', function() {

    it('1.11.1 using bad connect string', async function() {
      const credential = {...dbConfig};
      credential.connectString = "invalid connect string";

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        /ORA-12154:|NJS-514:|NJS-516:|NJS-517:/
      );
    });

    it('1.11.2 using user', async function() {
      const credential = {...dbConfig};
      credential.user = "tiger";

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        /ORA-01017:/
      );
    });

    it('1.11.3 using invalid password', async function() {
      const credential = {...dbConfig};
      credential.password = "undefined";

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        /ORA-01017:/
      );
    });
  }); //1.11

  describe('1.12 confirm an exception is raised after closing a connection', function() {

    it('1.12.1 exception_on_close', async function() {
      const connection = await oracledb.getConnection(dbConfig);
      await connection.release();
      await assert.rejects(
        async () => await connection.execute('SELECT * FROM DUAL'),
        /NJS-003:/
      );
    });
  }); //1.12

  describe('1.13 interval datatypes - basic SELECT', function() {
    let connection;
    afterEach (async function() {
      if (connection) {
        await  connection.close();
        connection = null;
      }
    });

    it('1.13.1 year to month interval basic case', async function() {
      connection = await oracledb.getConnection(dbConfig);
      const result = await connection.execute("select INTERVAL '10-2' YEAR TO MONTH from dual");
      assert(result.rows[0][0] instanceof oracledb.IntervalYM);
      assert.strictEqual(result.rows[0][0].years, 10);
      assert.strictEqual(result.rows[0][0].months, 2);
    });

    it('1.13.2 day to second interval basic case', async function() {
      connection = await oracledb.getConnection(dbConfig);
      const result = await connection.execute("select INTERVAL '11 10:09:08.555' DAY TO SECOND from dual");
      assert(result.rows[0][0] instanceof oracledb.IntervalDS);
      assert.strictEqual(result.rows[0][0].days, 11);
      assert.strictEqual(result.rows[0][0].hours, 10);
      assert.strictEqual(result.rows[0][0].minutes, 9);
      assert.strictEqual(result.rows[0][0].seconds, 8);
      assert.strictEqual(result.rows[0][0].fseconds, 555 * (10 ** 6)); // convert to nanoseconds
    });
  }); //1.13

  describe('1.14 unacceptable boundary values for number datatypes', function() {

    it('1.14.1 unacceptable boundary numbers should get rejected', async function() {
      const connection = await oracledb.getConnection(dbConfig);
      const in_values = ["1e126", "-1e126", "1/0", "-1/0", "1/0.0", "1.0/0", "1.0e126", "1.0e126.0", "NaN", "undefined", "Infinity", "-Infinity"];
      await Promise.all(in_values.map(async function(element) {
        await assert.rejects(
          async () =>
            await connection.execute("select " + element + " from dual"),
          /ORA-01426:|ORA-01476:|ORA-00904:/ //ORA-01426: numeric overflow  | ORA-01476: divisor is equal to zero | ORA-00904: invalid identifier'
        );
      }));
      await connection.release();
    });
  }); //1.14

  describe('1.15 result after bad execute', function() {

    it('1.15.1 subsequent executes should succeed after bad execute', async function() {
      const connection = await oracledb.getConnection(dbConfig);
      await assert.rejects(
        async () =>
          await connection.execute("begin raise_application_error(-20000, 'application error raised'); end;"),
        /ORA-20000:/ //ORA-20000: application error raised
      );
      await connection.execute("begin null; end;");
      await connection.close();
    });

    it('1.15.2 result after bad execute', async function() {
      const connection = await oracledb.getConnection(dbConfig);
      await assert.rejects(
        async () => await connection.execute("select y from dual", {},
          {
            outFormat: oracledb.OBJECT,
          }),
        /ORA-00904:/ //ORA-00904: "Y": invalid identifier'
      );
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    });
  }); //1.15

  describe('1.16 error on empty connectString with thin mode', function() {
    before(function() {
      if (!oracledb.thin) {
        this.skip();
      }
    });

    it('1.16.1 connectString = ""', async function() {
      const credential = {...dbConfig, connectString: ""};

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        /NJS-125:/
      );
    });

    it('1.16.2 connectString undefined', async function() {
      const credential = {...dbConfig, connectString: undefined};

      await assert.rejects(
        async () => await oracledb.getConnection(credential),
        /NJS-125:/
      );
    });
  }); //1.16

  describe('1.17 Oracle Database instance name associated with the connection', function() {
    it('1.17.1 connection parameter instanceName comparision with query result', async function() {
      const connection = await oracledb.getConnection(dbConfig);
      const query = "select upper(sys_context('userenv', 'instance_name')) from dual";
      const result = await connection.execute(query);
      assert(result);
      assert.deepStrictEqual(result.rows[0][0], connection.instanceName.toUpperCase());
      connection.close();
    });
  }); //1.17

  describe('1.18 settable parameters', function() {
    // SQL query to fetch session details
    const sqlSessionDetails = `SELECT machine, osuser, terminal, program
      FROM v$session
      WHERE sid = (SELECT sys_context('userenv', 'sid') FROM dual)`;

    // SQL query to fetch driver name
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
      let result;
      if (!dbConfig.test.DBA_PRIVILEGE || !oracledb.thin) this.skip();

      const dbaConnection = await oracledb.getConnection(dbaConfig);
      result = await dbaConnection.execute(sqlSessionDetails);

      // Capture original values from the session
      origMachineName = result.rows[0][0];
      origUserName = result.rows[0][1];
      origTerminalName = result.rows[0][2];
      origProgramName = result.rows[0][3];

      result = await dbaConnection.execute(sqlDriverName);
      origDriverName = result.rows[0][0];

      await dbaConnection.close();
    });

    afterEach(function() {
      if (!dbConfig.test.DBA_PRIVILEGE || !oracledb.thin) return;

      // Reset oracledb parameters to original values
      oracledb.driverName = origDriverName ?? "";
      oracledb.program = origProgramName ?? "";
      oracledb.terminal = origTerminalName ?? "";
      oracledb.machine = origMachineName ?? "";
      oracledb.osUser = origUserName ?? "";
    });

    it('1.18.1 negative - Check parameter value type', async function() {
      const dbaConfig = {
        user: dbConfig.test.DBA_user,
        password: dbConfig.test.DBA_password,
        connectString: dbConfig.connectString,
        privilege: oracledb.SYSDBA,
      };

      dbaConfig.driverName = null;
      await assert.rejects(
        async () => await oracledb.getConnection(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.driverName = 1;
      await assert.rejects(
        async () => await oracledb.getConnection(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.machine = null;
      await assert.rejects(
        async () => await oracledb.getConnection(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.machine = 1;
      await assert.rejects(
        async () => await oracledb.getConnection(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.terminal = null;
      await assert.rejects(
        async () => await oracledb.getConnection(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.terminal = 1;
      await assert.rejects(
        async () => await oracledb.getConnection(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.program = null;
      await assert.rejects(
        async () => await oracledb.getConnection(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.program = 1;
      await assert.rejects(
        async () => await oracledb.getConnection(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.osUser = null;
      await assert.rejects(
        async () => await oracledb.getConnection(dbaConfig),
        /NJS-007:/
      );

      dbaConfig.osUser = 1;
      await assert.rejects(
        async () => await oracledb.getConnection(dbaConfig),
        /NJS-007:/
      );
    }); // 1.18.1

    it('1.18.2 Check parameter values after user update', async function() {
      // Generate random values for the first connection
      const randomPgm1 = random.getRandomLengthString(16);
      const randomTerm1 = random.getRandomLengthString(16);
      const randomMachine1 = random.getRandomLengthString(16);

      // Set the parameters for the first connection
      oracledb.driverName = 'mydriver';
      oracledb.program = randomPgm1;
      oracledb.terminal = randomTerm1;
      oracledb.machine = randomMachine1;
      oracledb.osUser = 'myuser';

      const conn1 = await oracledb.getConnection(dbaConfig);

      // Validate parameters for the first connection
      let res = await conn1.execute(sqlSessionDetails);
      assert.deepStrictEqual(res.rows[0][0], randomMachine1);
      assert.deepStrictEqual(res.rows[0][1], 'myuser');
      assert.deepStrictEqual(res.rows[0][2], randomTerm1);
      assert.deepStrictEqual(res.rows[0][3], randomPgm1);

      // Check DRCP session info for the first connection if enabled
      if (dbConfig.test.drcp) {
        const bindParams1 = { machine: randomMachine1, program: randomPgm1, terminal: randomTerm1 };
        res = await conn1.execute(sqlDRCPSessionDetails, bindParams1);
        const reqRow1 = [randomMachine1, randomTerm1, randomPgm1];
        assert.deepStrictEqual(res.rows[0], reqRow1);
      }

      res = await conn1.execute(sqlDriverName);
      assert.deepStrictEqual(res.rows[0][0], 'mydriver');

      // Generate random values for the second connection
      const randomPgm2 = random.getRandomLengthString(16);
      const randomTerm2 = random.getRandomLengthString(16);
      const randomMachine2 = random.getRandomLengthString(16);

      // Set new parameters for the second connection
      oracledb.driverName = 'mydriver1';
      oracledb.program = randomPgm2;
      oracledb.terminal = randomTerm2;
      oracledb.machine = randomMachine2;
      oracledb.osUser = 'myuser1';

      const conn2 = await oracledb.getConnection(dbaConfig);

      // Validate parameters for the second connection
      res = await conn2.execute(sqlSessionDetails);
      assert.deepStrictEqual(res.rows[0][0], randomMachine2);
      assert.deepStrictEqual(res.rows[0][1], 'myuser1');
      assert.deepStrictEqual(res.rows[0][2], randomTerm2);
      assert.deepStrictEqual(res.rows[0][3], randomPgm2);

      // Check DRCP session info for the second connection if enabled
      if (dbConfig.test.drcp) {
        const bindParams2 = { machine: randomMachine2, program: randomPgm2, terminal: randomTerm2 };
        res = await conn2.execute(sqlDRCPSessionDetails, bindParams2);
        const reqRow2 = [randomMachine2, randomTerm2, randomPgm2];
        assert.deepStrictEqual(res.rows[0], reqRow2);
      }

      res = await conn2.execute(sqlDriverName);
      /*
        In Oracle 12.1.1 DB, The driver
        name (CLIENT_DRIVER column in V$SESSION_CONNECT_INFO view) can be set
        upto only 8 characters.
      */
      let serverVersion = conn2.oracleServerVersion;
      if (serverVersion < 1201000200)
        assert.deepStrictEqual(res.rows[0][0], 'mydriver');
      else assert.deepStrictEqual(res.rows[0][0], 'mydriver1');

      // Generate random values for the third connection
      const randomPgm3 = random.getRandomLengthString(16);
      const randomTerm3 = random.getRandomLengthString(16);
      const randomMachine3 = random.getRandomLengthString(16);

      // Set new parameters for the third connection
      oracledb.driverName = 'mydriver3';
      oracledb.program = randomPgm3;
      oracledb.terminal = randomTerm3;
      oracledb.machine = randomMachine3;
      oracledb.osUser = 'myuser3';

      const conn3 = await oracledb.getConnection(dbaConfig);

      // Validate parameters for the third connection
      res = await conn3.execute(sqlSessionDetails);
      assert.deepStrictEqual(res.rows[0][0], randomMachine3);
      assert.deepStrictEqual(res.rows[0][1], 'myuser3');
      assert.deepStrictEqual(res.rows[0][2], randomTerm3);
      assert.deepStrictEqual(res.rows[0][3], randomPgm3);

      // Check DRCP session info for the third connection if enabled
      if (dbConfig.test.drcp) {
        const bindParams3 = { machine: randomMachine3, program: randomPgm3, terminal: randomTerm3 };
        res = await conn3.execute(sqlDRCPSessionDetails, bindParams3);
        const reqRow3 = [randomMachine3, randomTerm3, randomPgm3];
        assert.deepStrictEqual(res.rows[0], reqRow3);
      }

      res = await conn3.execute(sqlDriverName);
      /*
        In Oracle 12.1.1 DB, The driver name (CLIENT_DRIVER column in V$SESSION_CONNECT_INFO view)
        can be set only upto 8 characters.
      */
      serverVersion = conn2.oracleServerVersion;
      if (serverVersion < 1201000200)
        assert.deepStrictEqual(res.rows[0][0], 'mydriver');
      else assert.deepStrictEqual(res.rows[0][0], 'mydriver3');

      // Cleanup
      await conn1.close();
      await conn2.close();
      await conn3.close();
    }); // 1.18.2

    it('1.18.3 Check default values of session parameters without setting them', async function() {
      const dbaConfig = {
        user: dbConfig.test.DBA_user,
        password: dbConfig.test.DBA_password,
        connectString: dbConfig.connectString,
        privilege: oracledb.SYSDBA,
      };

      const conn = await oracledb.getConnection(dbaConfig);

      // Whitespaces, comma, ( and ) are replaced by ? for the program name
      // in V$SESSION
      let sanitizedProgName = process.argv0.replace(/[\s(),]/g, '?');
      /*
        In Oracle < 23.0 DB, The program name (program column in v$session view)
        can be set only upto 48 characters.
      */
      const serverVersion = conn.oracleServerVersion;
      if (serverVersion < 2300000000)
        sanitizedProgName = sanitizedProgName.substring(0, 48);

      // Fetch values from v$session
      let res = await conn.execute(sqlSessionDetails);
      assert.strictEqual(res.rows[0][0], os.hostname());
      assert.strictEqual(res.rows[0][1], os.userInfo().username);
      assert.strictEqual(res.rows[0][2], 'unknown');
      assert.strictEqual(res.rows[0][3], sanitizedProgName);

      if (dbConfig.test.drcp) {
        const bindParams = {
          machine: os.hostname(),
          terminal: 'unknown',
          program: sanitizedProgName
        };
        res = await conn.execute(sqlDRCPSessionDetails, bindParams);
        assert.deepStrictEqual(res.rows[0][0], os.hostname());
        assert.deepStrictEqual(res.rows[0][1], 'unknown');
        assert.deepStrictEqual(res.rows[0][2], sanitizedProgName);
      }

      res = await conn.execute(sqlDriverName);
      /*
        In Oracle 12.1.1 DB, The driver name (CLIENT_DRIVER column in V$SESSION_CONNECT_INFO view)
        can be set only upto 8 characters.
      */
      if (serverVersion < 1201000200)
        assert.strictEqual(res.rows[0][0], "node-ora");
      else assert.strictEqual(res.rows[0][0], "node-oracledb : " + oracledb.versionString + " thn");

      await conn.close();
    }); // 1.18.3

    it('1.18.4 Check parameter persistence across multiple connections', async function() {
      // Generate two sets of unique random values for first and second connections
      const randomPgm1 = random.getRandomLengthString(16);
      const randomTerm1 = random.getRandomLengthString(16);
      const randomMachine1 = random.getRandomLengthString(16);
      const randomPgm2 = random.getRandomLengthString(16);
      const randomTerm2 = random.getRandomLengthString(16);
      const randomMachine2 = random.getRandomLengthString(16);

      // Set oracledb parameters to the first set of generated random values
      oracledb.program = randomPgm1;
      oracledb.terminal = randomTerm1;
      oracledb.machine = randomMachine1;

      // First connection and validation
      const conn1 = await oracledb.getConnection(dbaConfig);
      let res = await conn1.execute(sqlSessionDetails);
      assert.strictEqual(res.rows[0][0], randomMachine1);
      assert.strictEqual(res.rows[0][2], randomTerm1);
      assert.strictEqual(res.rows[0][3], randomPgm1);

      // Check DRCP session information if enabled
      if (dbConfig.test.drcp) {
        const bindParams = {
          machine: randomMachine1,
          program: randomPgm1,
          terminal: randomTerm1
        };
        res = await conn1.execute(sqlDRCPSessionDetails, bindParams);
        const reqRow = [randomMachine1, randomTerm1, randomPgm1];

        // Verify the DRCP session row exists
        assert.deepStrictEqual(res.rows[0], reqRow);
      }
      await conn1.close();

      // Set oracledb parameters to the second set of generated random values
      oracledb.program = randomPgm2;
      oracledb.terminal = randomTerm2;
      oracledb.machine = randomMachine2;

      // Second connection and validation
      const conn2 = await oracledb.getConnection(dbaConfig);
      res = await conn2.execute(sqlSessionDetails);
      assert.strictEqual(res.rows[0][0], randomMachine2);
      assert.strictEqual(res.rows[0][2], randomTerm2);
      assert.strictEqual(res.rows[0][3], randomPgm2);

      // Verify DRCP session information with the second set of values if enabled
      if (dbConfig.test.drcp) {
        const bindParams = {
          machine: randomMachine2,
          program: randomPgm2,
          terminal: randomTerm2
        };
        res = await conn2.execute(sqlDRCPSessionDetails, bindParams);
        const reqRow = [randomMachine2, randomTerm2, randomPgm2];
        // Confirm DRCP session row for second connection
        assert.deepStrictEqual(res.rows[0], reqRow);
      }

      await conn2.close();
    }); // 1.18.4
  }); // 1.18

  describe('1.19 Check error in the middle of a statement execute', function() {

    let connection;
    const tbl = 'nodb_num_tab';

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
      const createTableSql = `CREATE TABLE ${tbl} (id NUMBER, data NUMBER)`;
      await testsUtil.createTable(connection, tbl, createTableSql);
    });

    after(async function() {
      await connection.execute(`DROP TABLE ${tbl} PURGE`);
      await connection.close();
    });

    it('1.19.1 Negative - divide by zero error in the middle of an SQL request', async function() {
      // Insert data
      const sql = `INSERT INTO ${tbl} VALUES (:1, :2)`;
      const binds = Array.from({ length: 1500 }, (_, i) => [i + 1, i < 1499 ? 2 : 0]);
      let options = {
        autoCommit: true,
        bindDefs: [
          { type: oracledb.NUMBER },
          { type: oracledb.NUMBER }
        ]
      };
      const result = await connection.executeMany(sql, binds, options);
      assert.strictEqual(result.rowsAffected, 1500);

      // Query with a divide by zero in between
      const query = `select id, 1 / data from ${tbl} where id < 1500
                      union all
                      select id, 1 / data from ${tbl} where id = 1500`;
      options = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,   // query result format
        fetchArraySize: 1500                 // internal buffer allocation size for tuning
      };

      await  assert.rejects(
        async () => await connection.execute(query, {}, options),
        /ORA-01476:/
      );
    });
  });

  describe('1.20 appContext property', function() {

    let connection;
    before(function() {
      // application context settings are not supported with DRCP
      if (dbConfig.test.drcp) this.skip();
    });

    after(function() {
      // application context settings are not supported with DRCP
      if (dbConfig.test.drcp) return;
    });

    afterEach(async function() {
      if (connection) {
        await connection.close();
        connection = null;
      }
    });

    it('1.20.1 set valid appContext values in connection', async function() {
      const APP_CTX_NAMESPACE = 'CLIENTCONTEXT';
      const APP_CTX_ENTRIES = [
        [ APP_CTX_NAMESPACE, 'ATTR1', 'VALUE1' ],
        [ APP_CTX_NAMESPACE, 'ATTR2', 'VALUE2' ],
        [ APP_CTX_NAMESPACE, 'ATTR3', 'VALUE3' ],
      ];
      const config = { ...dbConfig, appContext: APP_CTX_ENTRIES };

      connection = await oracledb.getConnection(config);
      for (const entry of APP_CTX_ENTRIES) {
        const result = await connection.execute(
          // The statement to execute
          `SELECT sys_context(:1, :2) FROM dual`,

          // The "bind value" with namespace and name
          [entry[0], entry[1]]
        );
        assert.strictEqual(result.rows[0][0], entry[2]);
      }
    }); // 1.20.1

    it('1.20.2 set invalid appContext values in connection', async function() {
      const APP_CTX_NAMESPACE = 'CLIENTCONTEXT';
      const APP_CTX_ENTRIES = [
        [ APP_CTX_NAMESPACE, 'ATTR1' ],
        [ APP_CTX_NAMESPACE, 'ATTR2' ],
        [ APP_CTX_NAMESPACE, 'ATTR3' ],
      ];
      const config = { ...dbConfig, appContext: APP_CTX_ENTRIES };
      await assert.rejects(
        async () => {
          await oracledb.getConnection(config);
        },
        /NJS-007:/
      );
    }); // 1.20.2

    it('1.20.3 ignore empty appContext array in connection', async function() {
      const config = { ...dbConfig, appContext: [] };
      connection = await oracledb.getConnection(config);
      assert(connection);
    }); // 1.20.3
  }); // 1.20
});

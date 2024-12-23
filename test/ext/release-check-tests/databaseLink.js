/* Copyright (c) 2024, Oracle and/or its affiliates. */

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
 *   databaseLink.js
 *
 * DESCRIPTION
 *   DML operations on different DataTypes with database link
 *
 *   Grant Link Creation (sysdba):
 *      CONNECT sys/<dba_password>@<db_alias1> AS SYSDBA  -- Connect as sysdba on database alias 1
 *      GRANT CREATE PUBLIC DATABASE LINK TO scott;
 *   Connect as User (e.g. scott/tiger):
 *      CONNECT scott/tiger@<db_alias1>  -- Connect as regular user on alias 1
 *   Create Table and Insert Data. Commit.
 *
 *   Set the Environment Variable NODE_ORACLEDB_CONNECTIONSTRING1
 *
 *   Connect as sysdba (different database alias):
 *      CONNECT sys/<dba_password>@<db_alias2> AS SYSDBA  -- Connect as sysdba on database alias 2
 *   Create Database Link:
 *      CREATE DATABASE LINK link_name  -- Replace with desired name
 *      CONNECT TO scott IDENTIFIED BY tiger
 *      USING '<db_alias1>';  -- Replace with connection string for alias 1
 *   Access Table via Link:
 *      SELECT * FROM my_table@link_name;
 *
 *****************************************************************************/
'use strict';

const assert  = require('assert');
const oracledb  = require('oracledb');
const dbConfig  = require('../../dbconfig.js');
const testsUtil  = require('../../testsUtil.js');
const random  = require('../../random.js');

describe('1. vectorDatabaseLink.js', function() {
  if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING1) {
    throw new Error("Set the Environment Variable NODE_ORACLEDB_CONNECTIONSTRING1 to create a database link in this database.");
  }

  const linkName = 'remoteDb';
  const tableName = 'nodb_DbLinkTable';
  const user = 'C##' + dbConfig.createUser();
  const pwd = testsUtil.generateRandomPassword();
  const createUser = `create user ${user} identified by ${pwd}`;
  const grantPriv = `grant all privileges to ${user}`;
  let dbaConn2, isRunnable;
  const dbaAlias1Credentials = {
    user: dbConfig.test.DBA_user,
    password: dbConfig.test.DBA_password,
    connectString: dbConfig.connectString,
    privilege: oracledb.SYSDBA,
  };

  const dbaAlias2Credentials = {
    user: dbConfig.test.DBA_user,
    password: dbConfig.test.DBA_password,
    connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING1,
    privilege: oracledb.SYSDBA,
  };

  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites(1800000000, 2300000000);
    if (!isRunnable) this.skip();

    dbaConn2 = await oracledb.getConnection(dbaAlias2Credentials);
    await dbaConn2.execute(createUser);
    await dbaConn2.execute(grantPriv);
  });

  after(async function() {
    if (!isRunnable) return;
    await dbaConn2.execute(`DROP USER ${user} CASCADE`);
    await dbaConn2.close();
  });

  describe('1.1 standalone connections with different datatypes', function() {
    let connection = null;

    const defaultFetchTypeHandler = oracledb.fetchTypeHandler;

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);

      const dbaConn1 = await oracledb.getConnection(dbaAlias1Credentials);
      await dbaConn1.execute(`GRANT CREATE PUBLIC DATABASE LINK TO scott`);

      await dbaConn1.close();

      const sql = `CREATE TABLE ${tableName} (
                    intCol        NUMBER(9) not null,
                    vectorCol     VECTOR,
                    blobCol       BLOB,
                    clobCol       CLOB,
                    dateCol       DATE,
                    charCol       CHAR(10),
                    float2Col     FLOAT(24),
                    floatCol      FLOAT,
                    jsonCol       JSON,
                    longCol       LONG,
                    ncharCol      NCHAR(5),
                    nclobCol      NCLOB,
                    nvarchar2Col  NVARCHAR2(17),
                    varchar2Col   VARCHAR2(255)
                  )`;
      const plsql = testsUtil.sqlCreateTable(tableName, sql);
      await connection.execute(plsql);


      await dbaConn2.execute(`CREATE DATABASE LINK IF NOT EXISTS ${linkName}
                              CONNECT TO scott IDENTIFIED BY tiger
                              USING '${dbConfig.connectString}'
                            `);
    });

    after(async function() {
      await connection.execute(`DROP TABLE ${tableName} PURGE`);
      await connection.close();
    });

    beforeEach(async function() {
      await connection.execute(`truncate table ${tableName}`);
    });

    it('1.1.1 insert and fetch float and double array into vector column of default storage (float32)', async function() {
      const isRunnable = await testsUtil.checkPrerequisites(2300000000, 2300000000);
      if (!isRunnable) this.skip();
      oracledb.fetchTypeHandler = function(metadata) {
        if (metadata.dbType === oracledb.DB_TYPE_VECTOR) {
          const myConverter = (v) => {
            if (v !== null) {
              return Array.from(v);
            }
            return v;
          };
          return {converter: myConverter};
        }
      };
      const FloatArray = new Float32Array([0 * 0.23987, 1 * -0.23987, 2 * -0.23987]);

      const DoubleArray = new Float64Array([0 * 2 * -0.23987, 1 * 2 * -0.23987, 2 * 2 * -0.23987]);

      // inserting a float32 array
      await connection.execute(`insert into ${tableName} (intCol, vectorCol)
                    values(1, :2)`, {2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
        val: FloatArray
      }});

      // inserting a double array
      await connection.execute(`insert into ${tableName} (intCol, vectorCol)
                    values(1, :2)`, {2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
        val: DoubleArray
      }});
      let result = await connection.execute(`select vectorCol from ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0], [0, -0.23986999690532684, -0.4797399938106537]);

      // Commit the transaction
      await connection.commit();

      result = await dbaConn2.execute(`select vectorCol from ${tableName}@${linkName}`);
      assert.deepStrictEqual(result.rows[0][0], [0, -0.23986999690532684, -0.4797399938106537]);
      oracledb.fetchTypeHandler = defaultFetchTypeHandler;
    }); // 1.1.1

    it('1.1.2 insert and fetch json datatype', async function() {
      const isRunnable = await testsUtil.checkPrerequisites(2300000000, 2300000000);
      if (!isRunnable) this.skip();
      const outFormatBak = oracledb.outFormat;
      oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
      oracledb.extendedMetaData = true;
      const data = { "empId": 1, "empName": "Employee1", "city": "New City" };
      const sql = `INSERT into ${tableName} (intCol, jsonCol) VALUES (2, :bv)`;
      let j;
      if (testsUtil.getClientVersion() >= 2100000000) {
        await connection.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        // With older client versions, insert as a JSON string
        const s = JSON.stringify(data);
        const b = Buffer.from(s, 'utf8');
        await connection.execute(sql, { bv: { val: b } });
      }

      let result = await connection.execute(`SELECT JSONCol FROM ${tableName}`);
      j = result.rows[0].JSONCOL;
      assert.strictEqual(j.empId, 1);
      assert.strictEqual(j.empName, 'Employee1');
      assert.strictEqual(j.city, 'New City');

      // Commit the transaction
      await connection.commit();

      // Fetch the inserted data from the db_alias2
      result = await dbaConn2.execute(`SELECT JSONCol FROM ${tableName}@${linkName}`);
      j = result.rows[0].JSONCOL;
      assert.strictEqual(j.empId, 1);
      assert.strictEqual(j.empName, 'Employee1');
      assert.strictEqual(j.city, 'New City');
      oracledb.outFormat = outFormatBak;
    }); // 1.1.2

    it('1.1.3 insert and fetch blob datatype', async function() {
      const contentLength = 65535;
      const specialStr = "1.3";
      const bigStr = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(bigStr, "utf-8");
      await connection.execute(
        `INSERT INTO ${tableName} (intCol, blobCol) VALUES (3, :C)`,
        {
          C: { val: content, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
        });
      let result = await connection.execute(`SELECT BLOBCol FROM ${tableName}`);
      let lob = result.rows[0][0];
      let blobData = await lob.getData();
      assert.deepStrictEqual(blobData, content);

      // Commit the transaction
      await connection.commit();

      result = await dbaConn2.execute(`SELECT BLOBCol FROM ${tableName}@${linkName}`);
      lob = result.rows[0][0];
      blobData = await lob.getData();
      assert.deepStrictEqual(blobData, content);
    }); // 1.1.3

    it('1.1.4 insert and fetch clob datatype', async function() {
      const contentLength = 65535;
      const specialStr = "1.4";
      const content = random.getRandomString(contentLength, specialStr);

      // Insert data into the table
      await connection.execute(
        `INSERT INTO ${tableName} (intCol, clobCol) VALUES (4, :C)`,
        {
          C: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING }
        });

      // Fetch the inserted data
      let result = await connection.execute(`SELECT CLOBCol FROM ${tableName}`);
      let lob = result.rows[0][0];
      assert(lob);

      // Set the encoding so we get a 'string' not a 'buffer'
      lob.setEncoding('utf8');

      // Process the LOB data
      await new Promise((resolve, reject) => {
        let clobData = '';

        lob.on('data', function(chunk) {
          clobData += chunk;
        });

        lob.on('error', function(err) {
          assert.ifError(err, "lob.on 'error' event.");
          reject(err);
        });

        lob.on('end', function(err) {
          assert.ifError(err);
          const resultLength = clobData.length;
          const specStrLength = specialStr.length;
          assert.strictEqual(resultLength, content.length);
          assert.strictEqual(clobData.substring(0, specStrLength), specialStr);
          assert.strictEqual(clobData.substring(resultLength - specStrLength, resultLength), specialStr);
          resolve();
        });
      });

      // Destroy the LOB to release resources
      lob.destroy();

      // Commit the transaction
      await connection.commit();

      // Fetch the data using database link
      result = await dbaConn2.execute(`SELECT CLOBCol FROM ${tableName}@${linkName}`);
      lob = result.rows[0][0];
      assert(lob);

      // Set the encoding so we get a 'string' not a 'buffer'
      lob.setEncoding('utf8');

      // Process the LOB data
      await new Promise((resolve, reject) => {
        let clobData = '';

        lob.on('data', function(chunk) {
          clobData += chunk;
        });

        lob.on('error', function(err) {
          assert.ifError(err, "lob.on 'error' event.");
          reject(err);
        });

        lob.on('end', function(err) {
          assert.ifError(err);
          const resultLength = clobData.length;
          const specStrLength = specialStr.length;
          assert.strictEqual(resultLength, content.length);
          assert.strictEqual(clobData.substring(0, specStrLength), specialStr);
          assert.strictEqual(clobData.substring(resultLength - specStrLength, resultLength), specialStr);
          resolve();
        });
      });

      // Destroy the LOB to release resources
      lob.destroy();
    });

    it('1.1.5 insert and fetch varchar datatype', async function() {
    // Insert data into the VARCHAR2 column
      const data = {
        varchar2Data: "Hello, Node-oracledb!"
      };
      await connection.execute(`INSERT INTO ${tableName} (intCol, varchar2Col)
                              VALUES (5, :varchar2Data)`, data);

      // Commit the transaction
      await connection.commit();

      let result = await connection.execute(`SELECT VARCHAR2Col FROM ${tableName}`);
      assert.strictEqual(result.rows[0][0], "Hello, Node-oracledb!");

      result = await dbaConn2.execute(`SELECT VARCHAR2Col FROM ${tableName}@${linkName}`);
      assert.strictEqual(result.rows[0][0], "Hello, Node-oracledb!");
    }); // 1.1.5

    it('1.1.6 insert and fetch date datatype', async function() {
    // Insert data into the VARCHAR2 column
      const date =  new Date("2024-08-05 00:00:00.000");
      const data = {
        dateData: date // Current date/time
      };
      await connection.execute(`INSERT INTO ${tableName} (intCol, dateCol)
                              VALUES (6, :dateData)`, data);

      // Commit the transaction
      await connection.commit();

      let result = await connection.execute(`SELECT dateCol FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0], date);

      result = await dbaConn2.execute(`SELECT dateCol FROM ${tableName}@${linkName}`);
      assert.deepStrictEqual(result.rows[0][0], date);
    }); // 1.1.6

    it('1.1.7 insert and fetch char datatype', async function() {
      const data = {
        charData: 'randomText'
      };
      await connection.execute(`INSERT INTO ${tableName} (intCol, charCol)
                              VALUES (7, :charData)`, data);

      // Commit the transaction
      await connection.commit();

      let result = await connection.execute(`SELECT charCol FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0], 'randomText');

      result = await dbaConn2.execute(`SELECT charCol FROM ${tableName}@${linkName}`);
      assert.deepStrictEqual(result.rows[0][0], 'randomText');
    }); // 1.1.7

    it('1.1.8 insert and fetch float2 datatype', async function() {
      const data = {
        float2Data: 123.456789012
      };
      await connection.execute(`INSERT INTO ${tableName} (intCol, float2Col)
                              VALUES (8, :float2Data)`, data);

      // Commit the transaction
      await connection.commit();

      let result = await connection.execute(`SELECT float2Col FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0], 123.45679);

      result = await dbaConn2.execute(`SELECT float2Col FROM ${tableName}@${linkName}`);
      assert.deepStrictEqual(result.rows[0][0], 123.45679);
    }); // 1.1.8

    it('1.1.9 insert and fetch float datatype', async function() {
      const data = {
        floatData: 789.123
      };
      await connection.execute(`INSERT INTO ${tableName} (intCol, floatCol)
                              VALUES (9, :floatData)`, data);

      // Commit the transaction
      await connection.commit();

      let result = await connection.execute(`SELECT floatCol FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0], 789.123);

      result = await dbaConn2.execute(`SELECT floatCol FROM ${tableName}@${linkName}`);
      assert.deepStrictEqual(result.rows[0][0], 789.123);
    }); // 1.1.9

    it('1.1.10 insert and fetch long datatype', async function() {
      const data = {
        longData: 'This is a long string.'
      };
      await connection.execute(`INSERT INTO ${tableName} (intCol, longCol)
                              VALUES (10, :longData)`, data);

      // Commit the transaction
      await connection.commit();

      let result = await connection.execute(`SELECT longCol FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0], 'This is a long string.');

      result = await dbaConn2.execute(`SELECT longCol FROM ${tableName}@${linkName}`);
      assert.deepStrictEqual(result.rows[0][0], 'This is a long string.');
    }); // 1.1.10

    it('1.1.11 insert and fetch NChar datatype', async function() {
      const data = {
        ncharData: 'WXYZ.'
      };
      await connection.execute(`INSERT INTO ${tableName} (intCol, ncharCol)
                              VALUES (11, :ncharData)`, data);

      // Commit the transaction
      await connection.commit();

      let result = await connection.execute(`SELECT ncharCol FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0], 'WXYZ.');

      result = await dbaConn2.execute(`SELECT ncharCol FROM ${tableName}@${linkName}`);
      assert.deepStrictEqual(result.rows[0][0], 'WXYZ.');
    }); // 1.1.11

    it('1.1.12 insert and fetch NVarchar2 datatype', async function() {
      const data = {
        nvarchar2Data: 'Hello, NVARCHAR2'
      };
      await connection.execute(`INSERT INTO ${tableName} (intCol, nvarchar2Col)
                              VALUES (12, :nvarchar2Data)`, data);

      // Commit the transaction
      await connection.commit();

      let result = await connection.execute(`SELECT nvarchar2Col FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0], 'Hello, NVARCHAR2');

      result = await dbaConn2.execute(`SELECT nvarchar2Col FROM ${tableName}@${linkName}`);
      assert.deepStrictEqual(result.rows[0][0], 'Hello, NVARCHAR2');
    }); // 1.1.12

    it('1.1.13 insert and fetch varchar2 datatype', async function() {
      const contentLength = 255;
      const specialStr = "1.13";
      const bigStr = random.getRandomString(contentLength, specialStr);
      const data = {
        varchar2Data: bigStr
      };
      await connection.execute(`INSERT INTO ${tableName} (intCol, varchar2Col)
                              VALUES (13, :varchar2Data)`, data);

      // Commit the transaction
      await connection.commit();

      let result = await connection.execute(`SELECT varchar2Col FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0][0], bigStr);

      result = await dbaConn2.execute(`SELECT varchar2Col FROM ${tableName}@${linkName}`);
      assert.deepStrictEqual(result.rows[0][0], bigStr);
    }); // 1.1.13

    it('1.1.14 insert and fetch NClob datatype', async function() {
      const insertLength = 100;
      const insertStr = random.getRandomLengthString(insertLength);
      const sql = `INSERT INTO ${tableName} (intCol, nclobCol) VALUES(14, TO_NCLOB(:c))`;
      const bindVar = {
        c: { val: insertStr, type: oracledb.STRING, dir: oracledb.BIND_IN},
      };
      await connection.execute(sql, bindVar);

      let result = null;
      result = await connection.execute(
        `SELECT TO_CLOB(nclobCol) FROM ${tableName}`);
      let lob = result.rows[0][0];
      assert(lob);
      await new Promise((resolve, reject) => {
        let clob = '';

        lob.setEncoding('utf8'); // set the encoding so we get a 'string' not a 'buffer'

        lob.on('data', function(chunk) {
          clob += chunk;
        });

        lob.on('end', function() {
          assert.strictEqual(clob.length, insertStr.length);
          assert.strictEqual(clob, insertStr);
          resolve();
        });

        lob.on('error', reject);
      });

      // Destroy the LOB to release resources
      lob.destroy();

      // Commit the transaction
      await connection.commit();

      result = await dbaConn2.execute(`SELECT TO_CLOB(nclobCol) FROM ${tableName}@${linkName}`);
      lob = result.rows[0][0];

      assert(lob);
      await new Promise((resolve, reject) => {
        let clob = '';
        lob.setEncoding('utf8'); // set the encoding so we get a 'string' not a 'buffer'

        lob.on('data', function(chunk) {
          clob += chunk;
        });

        lob.on('end', function() {
          assert.strictEqual(clob.length, insertStr.length);
          assert.strictEqual(clob, insertStr);
          resolve();
        });

        lob.on('error', reject);
      });

      // Destroy the LOB to release resources
      lob.destroy();
    }); // 1.1.14
  });

  describe('1.2 pool connection', function() {
    let create_table_sql, plsql, pool, pool2, connection, dbaAlias2Credentials1, connection2;
    const tableName = 'nodb_DbLinkTable';
    before(async function() {
      // Create connection pool for regular operations
      pool = await oracledb.createPool(dbConfig);

      // Get a connection from the regular pool
      connection = await pool.getConnection();

      create_table_sql =  `
      CREATE TABLE ${tableName} (
        intCol NUMBER not null,
        nameCol VARCHAR2(100),
        deptCol VARCHAR2(100)
      )`;

      plsql = testsUtil.sqlCreateTable(tableName, create_table_sql);
      // Create a table using the regular connection
      await connection.execute(plsql);

      // Create connection pool for SYSDBA operations
      dbaAlias2Credentials1 = {
        user: user,
        password: pwd,
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING1,
      };
      pool2 = await oracledb.createPool(dbaAlias2Credentials1);

      // Get a connection from the SYSDBA pool
      connection2 = await pool2.getConnection();

      await connection2.execute(`CREATE DATABASE LINK IF NOT EXISTS ${linkName}
                                  CONNECT TO scott IDENTIFIED BY tiger
                                  USING '${dbConfig.connectString}'
                                `);
    });

    after(async function() {
      await connection.execute(testsUtil.sqlDropTable(tableName));
      await connection.close();
      await connection2.close();
      await pool.close();
      await pool2.close();
    });

    it('1.2.1 insert/update and fetch', async function() {
      // Insert data into the table using the regular connection
      await connection.execute(`
          INSERT INTO ${tableName} (intCol, nameCol, deptCol) VALUES (101, 'John Doe', 'IT')
        `);

      // Commit changes
      await connection.commit();

      // Fetch and display the inserted data using the regular connection
      let result = await connection.execute(`SELECT * FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0], [101, 'John Doe', 'IT']);

      // Fetch and display the inserted data using the SYSDBA connection from another database alias
      result = await connection2.execute(`SELECT * FROM ${tableName}@${linkName}`);
      assert.deepStrictEqual(result.rows[0], [101, 'John Doe', 'IT']);

      // Update a row using the SYSDBA connection
      await connection.execute(`
          UPDATE ${tableName} SET deptCol = 'Finance' WHERE intCol = 101
        `);

      // Commit changes
      await connection.commit();

      // Fetch and display the inserted data using the regular connection
      result  = await connection.execute(`SELECT * FROM ${tableName}`);
      assert.deepStrictEqual(result.rows[0], [ 101, 'John Doe', 'Finance' ]);

      // Fetch and display the updated data using the SYSDBA connection
      result = await connection2.execute(`SELECT * FROM ${tableName}@${linkName}`);
      assert.deepStrictEqual(result.rows[0], [ 101, 'John Doe', 'Finance' ]);
    }); // 1.2.1
  });
});

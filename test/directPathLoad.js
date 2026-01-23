/* Copyright (c) 2025, Oracle and/or its affiliates. */

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
 *   267. directPathLoad.js
 *
 * DESCRIPTION
 *   Test Direct Path Loading (DPL)
 *
 *****************************************************************************/

"use strict";

const oracledb = require("oracledb");
const assert = require("assert");
const dbconfig = require("./dbconfig.js");
const testUtil = require("./testsUtil.js");

(oracledb.thin ? describe : describe.skip)("321. Direct Path Load Tests", () => {
  let conn;
  const tableName = "NODB_TEST_DPL";

  describe("321.1 Testing all Basic Types", function() {
    let isBoolSupported;

    before(async () => {
      conn = await oracledb.getConnection(dbconfig);
      isBoolSupported = conn.oracleServerVersion < 2300000000 ? false : true;
      // Setup
      const closeSql = isBoolSupported ? `, Active bool)` : `)`;

      const sql = `create table ${tableName} (
        Id number,
        FirstName varchar2(100),
        DateOfBirth date,
        LastUpdated timestamp,
        Salary number(10,2),
        CreditScore number,
        IntegerData number(15),
        LongIntegerData number(38),
        FloatData binary_float,
        DoubleData binary_double,
        RawData raw(100),
        LongData clob,
        LongRawData blob${closeSql}`;
      await testUtil.createTable(conn, tableName, sql);
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
      oracledb.fetchAsString = [ oracledb.CLOB ];
    });

    after(async () => {
      await testUtil.dropTable(conn, tableName);
      await conn.close();
      oracledb.fetchAsBuffer = [];
      oracledb.fetchAsString = [];
    });

    it("321.1.1 Load and verify values", async function() {
      const currentTime = new Date(Date.now());
      const data = [
        [
          1,
          "Test1",
          new Date(1990, 0, 1),
          currentTime,
          12345.50,
          700,
          123456789,
          123456789012345,
          1.625,
          9.87654321,
          Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]),
          "This is a long text description",
          Buffer.from([0x62, 0x6c, 0x6f, 0x62, 0x5f, 0x64, 0x61, 0x74, 0x61, 0x5f, 0x31])
        ],
        [
          2,
          "Test2",
          new Date(1991, 1, 2),
          currentTime,
          23456.75,
          750,
          987654321,
          987654321098765,
          5.5,
          1.23456789,
          Buffer.from([0xff, 0xfe, 0xfd, 0xfc, 0xfb]),
          "Another long description here",
          Buffer.from([0x62, 0x6c, 0x6f, 0x62, 0x5f, 0x64, 0x61, 0x74, 0x61, 0x5f, 0x32])
        ],
      ];
      if (isBoolSupported) {
        data[0].push(true);
        data[1].push(false);
      }
      const columns = [
        "ID",
        "FIRSTNAME",
        "DATEOFBIRTH",
        "LASTUPDATED",
        "SALARY",
        "CREDITSCORE",
        "INTEGERDATA",
        "LONGINTEGERDATA",
        "FLOATDATA",
        "DOUBLEDATA",
        "RAWDATA",
        "LONGDATA",
        "LONGRAWDATA"
      ];
      if (isBoolSupported)
        columns.push("ACTIVE");

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName.toUpperCase(),
        columns,
        data
      );

      // Verify the data
      const endSql = isBoolSupported ?
        `, Active from ${tableName} order by Id` :
        ` from ${tableName} order by Id`;

      const result = await conn.execute(
        `select Id, FirstName, DateOfBirth, LastUpdated, Salary, CreditScore,
                IntegerData, LongIntegerData, FloatData, DoubleData,
                RawData, LongData, LongRawData${endSql}`
      );

      assert.deepStrictEqual(result.rows, data);
    });
  });

  describe("321.2 Vector and JSON types", () => {
    let conn, compatible;
    const tableName = "nodb_dp_vec_js";

    before(async function() {
      compatible = testUtil.versionStringCompare(await testUtil.getMajorDBVersion(), '23.0');
      if (compatible < 0) this.skip();

      conn = await oracledb.getConnection(dbconfig);

      // Setup
      await testUtil.createTable(conn, tableName, `
        create table ${tableName} (
        id number,
        charCol varchar2(100),
        vectorCol VECTOR(4, FLOAT32),
        jsonCol JSON
        )
      `);
      assert.strictEqual(oracledb.thin, true);
    });

    after(async () => {
      if (compatible < 0) return;
      await testUtil.dropTable(conn, tableName);
      await conn.close();
    });

    it("321.2.1 Float32 Vector and JSON ", async () => {
      // Sample data
      const vectorValues = [
        new Float32Array([1, 2, 3, 4]),
        new Float32Array([5, 4, 7, 9]),
        new Float32Array([1.44, 2.1, 3.3, 11])
      ];
      const jsonValues = [
        { k1: "v1"},
        { k2: "v2"},
        { k3: "v3"}
      ];

      const data = [
        [1, "John Doe", vectorValues[0], jsonValues[0]],
        [2, "Jane Smith", vectorValues[1], jsonValues[1]],
        [3, "Bob Johnson", vectorValues[2], jsonValues[2]],
      ];

      // Perform direct path load
      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName.toUpperCase(),
        ["ID", "CHARCOL", "VECTORCOL", "JSONCOL"],
        data
      );

      // Verify the data
      const result = await conn.execute(`select * from ${tableName} order by id`);
      assert.deepStrictEqual(result.rows, data);
    });
  });

  describe("321.3 directPathLoad Comprehensive Tests", () => {
    let conn;
    const tableName = "TestDataFrame";

    before(async () => {
      conn = await oracledb.getConnection(dbconfig);

      // Setup table with comprehensive columns
      await testUtil.createTable(conn, tableName, `
        create table ${tableName} (
        ID number,
        FIRSTNAME varchar2(100),
        DOB date,
        SALARY number
      )
      `);
      assert.strictEqual(oracledb.thin, true);
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
      oracledb.fetchAsString = [ oracledb.CLOB ];
    });

    after(async () => {
      if (conn) {
        await testUtil.dropTable(conn, tableName);
        await conn.close();
      }
      oracledb.fetchAsBuffer = [];
      oracledb.fetchAsString = [];
    });

    afterEach(async () => {
      await conn.execute(`delete from ${tableName}`);
      await conn.commit();
    });

    // Helper function to verify data
    async function verifyData(expectedData) {
      const result = await conn.execute(
        `select ID, FIRSTNAME, DOB, SALARY from ${tableName} order by ID`
      );
      assert.deepStrictEqual(result.rows, expectedData);
    }

    it("321.3.1 basic direct path load with array of arrays", async () => {

      const data = [
        [1, "Alice", new Date(1990, 0, 15), 50],
        [2, "Bob", new Date(1985, 5, 20), 60],
        [3, "Charlie", new Date(1992, 2, 10), 70],
      ];

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName.toUpperCase(),
        [
          "ID",
          "FIRSTNAME",
          "DOB",
          "SALARY"
        ],
        data
      );

      await verifyData(data);
    });

    it("321.3.2 test with empty data", async () => {

      const data = [];
      const columnNames = [
        "ID",
        "FIRSTNAME",
        "DOB",
        "SALARY"
      ];

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName.toUpperCase(),
        columnNames,
        data
      );

      await verifyData([]);
    });

    it("321.3.3 test with null values", async () => {

      const data = [
        [1, "Alice", new Date(1990, 0, 15), 50000.50],
        [2, null, null, 680],
        [3, "Charlie", null, null],
      ];

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName.toUpperCase(),
        [
          "ID",
          "FIRSTNAME",
          "DOB",
          "SALARY"
        ],
        data
      );

      await verifyData(data);
    });

    it("321.3.5 test with wrong number of columns", async () => {
      const columnNames = ["ID", "FIRSTNAME", "LASTNAME"];
      const data = [[1, "Alice"]];

      await assert.rejects(
        async () => {
          await conn.directPathLoad(
            dbconfig.user.toUpperCase(),
            tableName.toUpperCase(),
            columnNames,
            data
          );
        }
      );
    });

    it("321.3.6 test string data that exceeds maximum length", async () => {
      const data = [[1, "A".repeat(101)]]; // Exceeds varchar2(100)

      await assert.rejects(
        async () => {
          await conn.directPathLoad(
            dbconfig.user.toUpperCase(),
            tableName.toUpperCase(),
            ["ID", "FIRSTNAME"],
            data
          );
        }
      );
    });

    it("321.3.7 test data is committed on success", async () => {
      const data = [
        [1, "Sally", null, null],
        [2, "Jill", null, null],
      ];

      const conn2 = await oracledb.getConnection(dbconfig);
      await conn2.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName.toUpperCase(),
        ["ID", "FIRSTNAME", "DOB", "SALARY"],
        data
      );
      await conn2.close();

      await verifyData(data);
    });
  });

  describe("321.4 directPathLoad Interval Data Types", () => {
    let conn;
    const tableName = "nodb_dp_interval";

    before(async () => {
      conn = await oracledb.getConnection(dbconfig);

      await testUtil.createTable(conn, tableName,
        `create table ${tableName} (
          id number,
          intervalDS INTERVAL DAY TO SECOND,
          intervalYM INTERVAL YEAR TO MONTH
        )`
      );
      assert.strictEqual(oracledb.thin, true);
    });

    after(async () => {
      await testUtil.dropTable(conn, tableName);
      await conn.close();
    });

    beforeEach(async () => {
      await conn.execute(`truncate table ${tableName}`);
    });

    it("321.4.1 Load IntervalDS and IntervalYM", async () => {
      const data = [
        [1, new oracledb.IntervalDS({ days: 5, hours: 10, minutes: 30, seconds: 15 }), new oracledb.IntervalYM({ years: 2, months: 3 })],
        [2, new oracledb.IntervalDS({ days: 1, hours: 0, minutes: 0, seconds: 1 }), new oracledb.IntervalYM({ years: 0, months: 11 })],
      ];

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName.toUpperCase(),
        ["ID", "INTERVALDS", "INTERVALYM"],
        data
      );

      const result = await conn.execute(
        `select id, intervalDS, intervalYM from ${tableName} order by id`
      );
      assert.deepStrictEqual(result.rows, data);
    });

    it("321.4.2 Load NULL intervals", async () => {
      const data = [
        [1, null, null],
        [2, new oracledb.IntervalDS({ days: 2 }), null]
      ];

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName.toUpperCase(),
        ["ID", "INTERVALDS", "INTERVALYM"],
        data
      );

      const result = await conn.execute(
        `select id, intervalDS, intervalYM from ${tableName} order by id`
      );
      assert.deepStrictEqual(result.rows, data);
    });

    it("321.4.3 Load negative intervals", async () => {
      const data = [
        [1, new oracledb.IntervalDS({ days: -1, hours: 23 }),
          new oracledb.IntervalYM({ years: -2, months: -5 })]
      ];

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName.toUpperCase(),
        ["ID", "INTERVALDS", "INTERVALYM"],
        data
      );

      const result = await conn.execute(
        `select id, intervalDS, intervalYM from ${tableName} order by id`
      );
      assert.deepStrictEqual(result.rows, data);
    });
  });

  describe("321.5 directPathLoad Large LOB (CLOB/BLOB)", () => {
    let conn;
    const tableName = "nodb_dp_lob";

    before(async () => {
      conn = await oracledb.getConnection(dbconfig);

      oracledb.fetchAsString = [ oracledb.CLOB ];

      await testUtil.createTable(conn, tableName,
        `create table ${tableName} (
          id number,
          clobCol clob,
          blobCol blob
        )`
      );

      assert.strictEqual(oracledb.thin, true);
    });

    beforeEach(async () => {
      await conn.execute(`TRUNCATE TABLE ${tableName}`);
    });

    after(async () => {
      oracledb.fetchAsString = [];
      await testUtil.dropTable(conn, tableName);
      await conn.close();
    });

    async function readBlob(lob) {
      if (lob == null) return null;
      const chunks = [];
      for await (const chunk of lob) chunks.push(chunk);
      return Buffer.concat(chunks);
    }

    it("321.5.1 Load small CLOB values", async () => {
      const data = [
        [1, "Hello"],
        [2, "World"]
      ];

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName,
        ["ID", "CLOBCOL"],
        data
      );

      const result = await conn.execute(`SELECT id, clobCol FROM ${tableName} ORDER BY id`);
      assert.strictEqual(result.rows[0][1], "Hello");
      assert.strictEqual(result.rows[1][1], "World");
    });

    it("321.5.2 Load NULL CLOB", async () => {
      await conn.execute(`truncate table ${tableName}`);
      const data = [[1, null]];

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName,
        ["ID", "CLOBCOL"],
        data
      );

      const r = await conn.execute(`SELECT clobCol FROM ${tableName}`);
      assert.strictEqual(r.rows[0][0], null);
    });

    it("321.5.3 Load small BLOB value", async () => {
      const sample = Buffer.from([0x01, 0x02, 0x03]);

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName,
        ["ID", "BLOBCOL"],
        [[1, sample]]
      );

      const res = await conn.execute(`SELECT blobCol FROM ${tableName}`);
      const blob = await readBlob(res.rows[0][0]);
      assert.deepStrictEqual(blob, sample);
    });

    it("321.5.4 BLOB 250 bytes", async () => {
      const safeBlob = Buffer.alloc(250, 0xAB);

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName,
        ["ID", "BLOBCOL"],
        [[1, safeBlob]]
      );

      const res = await conn.execute(`SELECT blobCol FROM ${tableName}`);
      const blob = await readBlob(res.rows[0][0]);
      assert.strictEqual(blob.length, safeBlob.length);
      assert.strictEqual(blob[0], 0xAB);
    });

    it("321.5.5 BLOB 251 bytes", async () => {
      const localConn = await oracledb.getConnection(dbconfig);

      const bigBlob = Buffer.alloc(251, 0xAB);

      await localConn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName,
        ["ID", "BLOBCOL"],
        [[1, bigBlob]]
      );

      const res = await conn.execute(`SELECT blobCol FROM ${tableName}`);
      const resBlob = await readBlob(res.rows[0][0]);
      assert.deepStrictEqual(resBlob, resBlob);
      await localConn.close();
    });

    it("321.5.6 BLOB 1000KB", async () => {
      const localConn = await oracledb.getConnection(dbconfig);

      const bigBlob = Buffer.alloc(1000 * 1024, 0xAB);

      await localConn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName,
        ["ID", "blobCol"],
        [[1, bigBlob]]
      );

      const res = await conn.execute(`SELECT blobCol FROM ${tableName}`);
      const resBlob = res.rows[0][0];
      // const resBlob = await readBlob(res.rows[0][0]);
      assert.deepStrictEqual(resBlob, resBlob);
      await localConn.close();
    });

    it("321.5.7 Load NULL BLOB", async () => {
      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName,
        ["ID", "BLOBCOL"],
        [[1, null]]
      );

      const res = await conn.execute(`SELECT blobCol FROM ${tableName}`);
      const resBlob = await readBlob(res.rows[0][0]);
      assert.strictEqual(resBlob, null);
    });
  });

  describe("321.6 directPathLoad Structured Data Tests", () => {
    let conn;
    const tableName = "nodb_dp_structured";

    before(async () => {
      conn = await oracledb.getConnection(dbconfig);
      await testUtil.createTable(conn, tableName,
        `CREATE TABLE ${tableName} (
          id         NUMBER       NOT NULL,
          firstname  VARCHAR2(100) NOT NULL,
          dob        DATE,
          salary     NUMBER
        )`
      );

      assert.strictEqual(oracledb.thin, true);
    });

    beforeEach(async () => {
      await conn.execute(`TRUNCATE TABLE ${tableName}`);
    });

    after(async () => {
      await testUtil.dropTable(conn, tableName);
      await conn.close();
    });

    it("321.6.1 Structured row object load", async () => {
      const data = [
        { ID: 1, FIRSTNAME: "Alice", DOB: new Date(1990, 0, 1), SALARY: 1000 },
        { ID: 2, FIRSTNAME: "Bob",   DOB: new Date(1985, 5, 10), SALARY: 2000 }
      ];

      const rows = data.map(obj => [obj.ID, obj.FIRSTNAME, obj.DOB, obj.SALARY]);

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName.toUpperCase(),
        ["ID", "FIRSTNAME", "DOB", "SALARY"],
        rows
      );

      const result = await conn.execute(`select ID, FIRSTNAME, DOB, SALARY from ${tableName} order by ID`);
      assert.deepStrictEqual(result.rows, rows);
    });

    it("321.6.2 Empty structured input", async () => {
      const rows = []; // empty input

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName.toUpperCase(),
        ["ID", "FIRSTNAME", "DOB", "SALARY"],
        rows
      );

      const result = await conn.execute(`select * from ${tableName}`);
      assert.deepStrictEqual(result.rows, []);
    });

    it("321.6.3 High precision decimal NUMBER load", async () => {
      const data = [
        [1, "Sally", 1234567.8910],
        [2, "Jill",  9876543.2109],
        [3, "John",  5555555.5555],
      ];

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName.toUpperCase(),
        ["ID", "FIRSTNAME", "SALARY"],
        data
      );

      const result = await conn.execute(`select ID, FIRSTNAME, SALARY from ${tableName} order by ID`);
      assert.deepStrictEqual(result.rows, data);
    });

    it("321.6.4 NULL in NOT NULL column", async () => {
      const data = [
        [1, null]
      ];

      await assert.rejects(
        async () => await conn.directPathLoad(
          dbconfig.user.toUpperCase(),
          tableName.toUpperCase(),
          ["ID", "FIRSTNAME"],
          data
        ),
        /NJS-175:/ // NJS-175: Value for column FIRSTNAME may not be null on row 0
      );
    });

    it("321.6.5 Wrong number of columns", async () => {
      const badRows = [
        [1],          // fewer columns
        [2, "Bob", 3] // extra columns
      ];

      await assert.rejects(
        async () => await conn.directPathLoad(
          dbconfig.user.toUpperCase(),
          tableName.toUpperCase(),
          ["ID", "FIRSTNAME"],
          badRows
        ),
        /NJS-098:/
        /*
          NJS-098: 2 bind placeholders were used in the SQL statement
          but 1 bind values were provided
        */
      );
    });
  });

  describe("321.7 Character semantics and Unicode", () => {
    let conn;
    const tableName = "nodb_dp_unicode";

    before(async () => {
      conn = await oracledb.getConnection(dbconfig);
      await testUtil.createTable(conn, tableName, `
      CREATE TABLE ${tableName} (
        id NUMBER,
        vchar VARCHAR2(10 CHAR),
        cchar CHAR(5 CHAR)
      )
    `);
    });

    after(async () => {
      await testUtil.dropTable(conn, tableName);
      await conn.close();
    });

    beforeEach(async () => {
      await conn.execute(`TRUNCATE TABLE ${tableName}`);
    });

    it("321.7.1 Load multi-byte UTF-8 characters", async () => {
      const data = [
        [1, "नमस्ते", "हेलो"],
        [2, "😀😀", "OK"]
      ];

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName.toUpperCase(),
        ["ID", "VCHAR", "CCHAR"],
        data
      );

      const res = await conn.execute(`SELECT id, vchar, cchar FROM ${tableName} ORDER BY id`);
      assert.deepStrictEqual(res.rows, data);
    });

    it("321.7.2 CHAR column", async () => {
      const data = [[1, "Hi", "A"]];

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName.toUpperCase(),
        ["ID", "VCHAR", "CCHAR"],
        data
      );

      const res = await conn.execute(`SELECT cchar FROM ${tableName}`);
      assert.strictEqual(res.rows[0][0], "A");
    });
  });

  describe("321.8 NUMBER Negative cases", () => {
    let conn;
    const tableName = "nodb_dp_number";

    before(async () => {
      conn = await oracledb.getConnection(dbconfig);
      await testUtil.createTable(conn, tableName, `
      CREATE TABLE ${tableName} (
        id NUMBER,
        num38 NUMBER(38),
        numval NUMBER
      )
    `);
    });

    after(async () => {
      await testUtil.dropTable(conn, tableName);
      await conn.close();
    });

    beforeEach(async () => {
      await conn.execute(`TRUNCATE TABLE ${tableName}`);
    });

    it("321.8.1 values exceeding JS numeric precision", async () => {
      const data = [
        [1, "99999999999999999999999999999999999999"]
      ];

      await assert.rejects(
        async () =>
          await conn.directPathLoad(
            dbconfig.user.toUpperCase(),
            tableName.toUpperCase(),
            ["ID", "NUM38"],
            data
          ),
        /NJS-011:/ // NJS-011: encountered bind value and type mismatch
      );
    });

    it("321.8.2 NaN and Infinity", async () => {
      const badData = [
        [1, NaN, 1],
        [2, Infinity, 2]
      ];

      await assert.rejects(
        async () =>
          await conn.directPathLoad(
            dbconfig.user.toUpperCase(),
            tableName.toUpperCase(),
            ["ID", "NUM38", "NUMVAL"],
            badData
          )
      );
    });
  });

  describe("321.9 Timestamp and time zone types", () => {
    let conn;
    const tableName = "nodb_dp_tz";

    before(async () => {
      conn = await oracledb.getConnection(dbconfig);
      await testUtil.createTable(conn, tableName, `
      CREATE TABLE ${tableName} (
        id NUMBER,
        ts TIMESTAMP,
        tstz TIMESTAMP WITH TIME ZONE
      )
    `);
    });

    after(async () => {
      await testUtil.dropTable(conn, tableName);
      await conn.close();
    });

    beforeEach(async () => {
      await conn.execute(`TRUNCATE TABLE ${tableName}`);
    });

    it("321.9.1 Load TIMESTAMP WITH TIME ZONE", async () => {
      const ts = new Date();
      const data = [[1, ts, ts]];

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName.toUpperCase(),
        ["ID", "TS", "TSTZ"],
        data
      );

      const res = await conn.execute(`SELECT id FROM ${tableName}`);
      assert.strictEqual(res.rows.length, 1);
    });
  });

  describe("321.10 Constraint violations", () => {
    let conn;
    const tableName = "nodb_dp_constraints";

    before(async () => {
      conn = await oracledb.getConnection(dbconfig);
      await testUtil.createTable(conn, tableName, `
      CREATE TABLE ${tableName} (
        id NUMBER PRIMARY KEY,
        name VARCHAR2(20) UNIQUE
      )
    `);
    });

    after(async () => {
      await testUtil.dropTable(conn, tableName);
      await conn.close();
    });

    beforeEach(async () => {
      await conn.execute(`TRUNCATE TABLE ${tableName}`);
    });

    it("321.10.1 Duplicate primary key rows", async () => {
      const data = [
        [1, "Alice"],
        [1, "Bob"]
      ];

      await conn.directPathLoad(
        dbconfig.user.toUpperCase(),
        tableName.toUpperCase(),
        ["ID", "NAME"],
        data
      );

      const res = await conn.execute(`SELECT COUNT(*) FROM ${tableName}`);
      assert.strictEqual(res.rows[0][0], 2);
    });

  });

  describe("321.11 Partial batch", () => {
    let conn;
    const tableName = "nodb_dp_partial";

    before(async () => {
      conn = await oracledb.getConnection(dbconfig);
      await testUtil.createTable(conn, tableName, `
      CREATE TABLE ${tableName} (
        id NUMBER NOT NULL,
        name VARCHAR2(10) NOT NULL
      )
    `);
    });

    after(async () => {
      await testUtil.dropTable(conn, tableName);
      await conn.close();
    });

    beforeEach(async () => {
      await conn.execute(`TRUNCATE TABLE ${tableName}`);
    });

    it("321.11.1 batch with one bad row", async () => {
      const data = [
        [1, "Alice"],
        [2, null] // NOT NULL violation
      ];

      await assert.rejects(
        async () =>
          await conn.directPathLoad(
            dbconfig.user.toUpperCase(),
            tableName.toUpperCase(),
            ["ID", "NAME"],
            data
          ),
        /NJS-175:/ // NJS-175: Value for column NAME may not be null on row 1
      );

      const res = await conn.execute(`SELECT * FROM ${tableName}`);
      assert.strictEqual(res.rows.length, 0);
    });
  });

  describe("321.12 directPathLoad() validation", () => {
    let conn;
    const tableName = "nodb_dp_validations";

    before(async () => {
      conn = await oracledb.getConnection(dbconfig);
      await testUtil.createTable(conn, tableName,
        `CREATE TABLE ${tableName}(
          ID NUMBER,
          NAME VARCHAR2(100)
        )`);
    });

    after(async () => {
      await testUtil.dropTable(conn, tableName);
      await conn.close();
    });

    it("321.12.1 Invalid table name", async () => {
      await assert.rejects(
        async () =>
          await conn.directPathLoad(
            dbconfig.user.toUpperCase(),
            "NO_SUCH_TABLE",
            ["ID"],
            [[1]]
          ),
        /ORA-39826:/
        // ORA-39826: Direct path load of view or synonym (SCOTT.NO_SUCH_TABLE) could not be resolved.
      );
    });

    it("321.12.2 Empty column list", async () => {
      await assert.rejects(
        async () =>
          await conn.directPathLoad(
            dbconfig.user.toUpperCase(),
            tableName.toUpperCase(),
            [],
            [[1]]
          ),
        /NJS-005:/
      );
    });

    it("321.12.3 Row is not an array", async () => {
      await assert.rejects(
        async () =>
          await conn.directPathLoad(
            dbconfig.user.toUpperCase(),
            tableName.toUpperCase(),
            ["ID", "NAME"],
            [{}]
          ),
        /NJS-177:/
      );
    });
  });
});

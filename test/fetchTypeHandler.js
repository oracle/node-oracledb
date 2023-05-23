/* Copyright (c) 2023, Oracle and/or its affiliates. */

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
 *   271. fetchTypeHandler.js
 *
 * DESCRIPTION
 *   Testing driver fetchTypeHandler feature.
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require(`./testsUtil.js`);

describe('271. fetchTypeHandler.js', function() {

  let connection = null;
  before('Get connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('Release connection', async function() {
    await connection.close();
  });

  afterEach('Reset oracledb.fetchTypeHandler property', function() {
    oracledb.fetchTypeHandler = undefined;
  });

  it('271.1 Property value check', async function() {
    const myFetchTypeHandler = function() {
      return {converter: (val) => val.toString()};
    };

    oracledb.fetchTypeHandler = myFetchTypeHandler;
    const sql = `select 1+1 from dual`;
    const result = await connection.execute(sql);
    assert.strictEqual(result.rows[0][0], '2');
  });

  it('271.2 invalid syntax for "type" should result in error', async function() {
    oracledb.fetchTypeHandler = function() {
      return {'hello' : oracledb.STRING};
    };
    const result = await connection.execute(`SELECT 1+1 FROM DUAL`);
    assert.strictEqual(result.rows[0][0], 2);
  });

  it('271.3 value attribute "type" must be a valid database type', async function() {
    oracledb.fetchTypeHandler = function() {
      return {type : oracledb.BIND_IN};
    };

    await assert.rejects(
      async () => {
        await connection.execute(
          "SELECT SYSDATE AS THE_DATE FROM DUAL");
      },
      // NJS-121: fetchTypeHandler return value attribute "type" must be a valid database type
      /NJS-121:/
    );
  });

  it('271.4 attribute "converter" must be a function', async function() {
    const myFetchTypeHandler = function() {
      return {converter: oracledb.STRING};
    };

    oracledb.fetchTypeHandler = myFetchTypeHandler;
    const sql = `select 1+1 from dual`;
    await assert.rejects(
      async () => await connection.execute(sql),
      /NJS-122:/ //NJS-122: fetchTypeHandler return value attribute "converter" must be a function
    );
  });

  it('271.5 FetchTypeHandler return value attribute "converter" must be a function', async function() {
    const myFetchTypeHandler = function() {
      return {converter: 5};
    };

    oracledb.fetchTypeHandler = myFetchTypeHandler;
    const sql = `select 1+1 from dual`;
    await assert.rejects(
      async () => await connection.execute(sql),
      /NJS-122:/ //NJS-122: fetchTypeHandler return value attribute "converter" must be a function
    );
  });

  it('271.6 fetchTypeHandler return value must be an object', async function() {
    oracledb.fetchTypeHandler = function() {
      return 2;
    };
    const sql = `select 1+1 from dual`;
    await assert.rejects(
      async () => await connection.execute(sql),
      /NJS-120:/ //NJS-120: fetchTypeHandler return value must be an object
    );
  });

  it('271.7 Not supported database type conversion', async function() {
    oracledb.fetchTypeHandler = function() {
      return {type: oracledb.NUMBER};
    };

    await assert.rejects(
      async () => await connection.execute("SELECT ROWID from DUAL"),
      /NJS-119:/ //NJS-119: conversion from type DB_TYPE_ROWID to type DB_TYPE_NUMBER is not supported/
    );
  });

  it('271.8 Fetch number as string', async function() {
    oracledb.fetchTypeHandler = function() {
      return {type: oracledb.STRING};
    };

    const sql = `select 5, 6 from dual`;
    const result = await connection.execute(sql);
    assert.strictEqual(result.rows[0][0], '5');
  });

  it('271.9 Fetch DATE column values as STRING - by-Column name', async function() {
    oracledb.fetchTypeHandler = function() {
      return {type: oracledb.STRING};
    };

    let result = await connection.execute(
      "SELECT TO_DATE('2005-01-06', 'YYYY-DD-MM') AS TS_DATE FROM DUAL",
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    );
    assert.strictEqual(typeof result.rows[0].TS_DATE, "string");
  });

  it('271.10 fetchTypeHandler will take precedence over fetchInfo', async function() {
    await connection.execute("alter session set time_zone = '+0:00'");
    oracledb.fetchTypeHandler = function(metadata) {
      if (metadata.dbTypeName === "TIMESTAMP") {
        return {type: oracledb.DATE};
      }
      return {type: oracledb.NUMBER};
    };

    const result = await connection.execute(
      "SELECT 1234567 AS TS_NUM, TO_TIMESTAMP('1999-12-01 11:10:01.00123', 'YYYY-MM-DD HH:MI:SS.FF') AS TS_DATE FROM DUAL",
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo:
        {
          "TS_DATE" : { type : oracledb.STRING },
          "TS_NUM"  : { type : oracledb.STRING }
        }
      });
    assert.deepEqual(result.rows[0].TS_DATE, new Date('1999-12-01 11:10:01.001'));
    assert.strictEqual(typeof result.rows[0].TS_NUM, 'number');
    assert.strictEqual(result.rows[0].TS_NUM, 1234567);
  });

  it('271.11 fetchInfo will take precedence over fetchTypeHandler when "undefined" returned', async function() {
    await connection.execute("alter session set time_zone = '+0:00'");
    oracledb.fetchTypeHandler = function() {
      return undefined;
    };

    const result = await connection.execute(
      "SELECT 1234567 AS TS_NUM, TO_TIMESTAMP('1999-12-01 11:10:01.00123', 'YYYY-MM-DD HH:MI:SS.FF') AS TS_DATE FROM DUAL",
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo :
        {
          "TS_DATE" : { type : oracledb.DEFAULT },
          "TS_NUM"  : { type : oracledb.STRING }
        }
      });
    assert.deepEqual(result.rows[0].TS_DATE, new Date('1999-12-01 11:10:01.001'));
    assert.strictEqual(typeof result.rows[0].TS_NUM, 'string');
    assert.strictEqual(result.rows[0].TS_NUM, '1234567');
  });

  it('271.12 Fetch DATE, NUMBER column values STRING - by Column-name', async function() {
    await connection.execute("alter session set time_zone = '+0:00'");
    oracledb.fetchTypeHandler = function() {
      return {type: oracledb.STRING};
    };
    let result = await connection.execute(
      "SELECT 1234567 AS TS_NUM, TO_TIMESTAMP('1999-12-01 11:10:01.00123', 'YYYY-MM-DD HH:MI:SS.FF') AS TS_DATE FROM DUAL",
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    );
    assert.strictEqual(typeof result.rows[0].TS_DATE, "string");
    assert.strictEqual(typeof result.rows[0].TS_NUM, "string");
    assert.strictEqual(Number(result.rows[0].TS_NUM), 1234567);
  });

  it('271.13 Fetch DATE, NUMBER column as STRING by-type and override at execute time', async function() {
    oracledb.fetchTypeHandler = function(metadata) {
      if (metadata.dbType === oracledb.DB_TYPE_DATE) {
        return {type: oracledb.DATE};
      }
      return {type: oracledb.NUMBER};
    };

    const myFetchTypeHandler = function() {
      return { type : oracledb.STRING };
    };

    const options = {fetchTypeHandler: myFetchTypeHandler};
    let result = await connection.execute(
      "SELECT 1234567 AS TS_NUM, TO_DATE('1999-12-01', 'YYYY-MM-DD') AS TS_DATE FROM DUAL",
      [],
      options
    );
    assert.strictEqual(result.rows[0][0], '1234567');
    assert.strictEqual(typeof result.rows[0][1], "string");
  });

  it('271.14 Fetch DATE, NUMBER column as STRING by-type with converter', async function() {
    oracledb.fetchTypeHandler = function(metadata) {
      if (metadata.dbType === oracledb.DB_TYPE_DATE) {
        const myConverter = (v) => {
          const year = v.getUTCFullYear();
          const month = ("0" + (v.getUTCMonth() + 1)).slice(-2); // Add leading zero if needed
          const day = ("0" + v.getUTCDate()).slice(-2); // Add leading zero if needed
          const formattedDate = `${year}-${month}-${day}`;
          return formattedDate;
        };
        return {converter: myConverter};
      }
      return {type: oracledb.NUMBER};
    };

    let result = await connection.execute(
      "SELECT 1234567 AS TS_NUM, TO_DATE('1999-12-01', 'YYYY-MM-DD') AS TS_DATE FROM DUAL"
    );
    assert.strictEqual(result.rows[0][0], 1234567);
    assert.strictEqual(result.rows[0][1], "1999-12-01");
  });

  it('271.15 Negative cases', async function() {
    const array = ['', null, NaN, 10, 'abc', [], oracledb.DATE];
    await Promise.all(array.map(function(element) {
      assert.throws(() => oracledb.fetchTypeHandler = element,
        /NJS-004:/ //NJS-004: invalid value for property fetchTypeHandler
      );
    }));
  });


  it('271.16 Padding numeric values with leading zeroes', async function() {
    oracledb.fetchTypeHandler = function(metadata) {
      if (metadata.name.endsWith("Id")) {
        const myConverter = (v) => {
          if (v !== null)
            v = v.padStart(9, "0");
          return v;
        };
        return {type: oracledb.DB_TYPE_VARCHAR, converter: myConverter};
      }
    };
    const sql = `select 5 as "MyId", 6 as "MyValue", 'A string' as "MyString" from dual`;
    const result = await connection.execute(sql);

    assert.strictEqual(result.metaData[0].name, 'MyId');
    assert.deepEqual(result.rows, [ [ '000000005', 6, 'A string' ] ]);
  });

  it('271.17 converting dates to use the requested locale-specific format', async function() {
    const myFetchTypeHandler = function(metadata) {
      if (metadata.dbType === oracledb.DB_TYPE_DATE) {
        const myConverter = (v) => {
          if (v !== null) {
            v = v.toLocaleString('fr');
          }
          return v;
        };
        return {converter: myConverter};
      }
    };
    const sql = `select sysdate from dual`;
    const binds = [];
    const options = {fetchTypeHandler: myFetchTypeHandler};
    const result = await connection.execute(sql, binds, options);
    assert.strictEqual(typeof result.rows[0][0], 'string');
  });

  it('271.18 getting JSON data', async function() {
    if (connection.oracleServerVersion < 2100000000 || testsUtil.getClientVersion() < 2100000000) {
      this.skip();
    }
    const TABLE = 'jsondata';
    oracledb.fetchTypeHandler = function() {
      const myConverter = (v) => {
        v.empId = 10;
        return v;
      };
      return {converter: myConverter};
    };

    const createTable = (`CREATE TABLE ${TABLE} (
                            obj_data JSON
                          )
                        `);
    const plsql = testsUtil.sqlCreateTable(TABLE, createTable);
    await connection.execute(plsql);

    const sql = `INSERT into ${TABLE} VALUES ('{"empId": 1, "empName": "Employee1", "city": "New City"}')`;
    await connection.execute(sql);

    const result = await connection.execute(`select * from ${TABLE}`);
    assert.strictEqual(result.rows[0][0]["empId"], 10);
    assert.strictEqual(result.rows[0][0]["empName"], 'Employee1');
    assert.strictEqual(result.rows[0][0]["city"], 'New City');
    await connection.execute(testsUtil.sqlDropTable(TABLE));
  });

  /*
  * The maximum safe integer in JavaScript is (2^53 - 1).
  * The minimum safe integer in JavaScript is (-(2^53 - 1)).
  * Numbers out of above range will be rounded.
  * The last element is out of Oracle database standard Number range. It will be rounded by database.
  */
  let numStrs =
    [
      '17249138680355831',
      '-17249138680355831',
      '0.17249138680355831',
      '-0.17249138680355831',
      '0.1724913868035583123456789123456789123456'
    ];

  let numResults =
    [
      '17249138680355831',
      '-17249138680355831',
      '.17249138680355831',
      '-.17249138680355831',
      '.172491386803558312345678912345678912346'
    ];

  it('271.19 large numbers with fetchTypeHandler', async function() {
    oracledb.fetchTypeHandler = function() {
      return {type: oracledb.STRING};
    };

    for (let element of numStrs) {
      let result = await connection.execute(
        "SELECT TO_NUMBER( " + element + " ) AS TS_NUM FROM DUAL",
        [],
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT
        }
      );
      assert.strictEqual(typeof result.rows[0].TS_NUM, "string");
      assert.strictEqual(result.rows[0].TS_NUM, numResults[numStrs.indexOf(element)]);
    }
  });

  it('271.20 setting a private property in the metadata', async function() {
    oracledb.fetchTypeHandler = function(metadata) {
      metadata._privateProp = 'I am a private property of ' + metadata.name;
    };

    const sql = `select 5 as "MyId", 6 as "MyValue", 'A string' as "MyString" from dual`;
    const result = await connection.execute(sql);

    assert.strictEqual(result.metaData[0]._privateProp, "I am a private property of MyId");
    assert.strictEqual(result.metaData[1]._privateProp, "I am a private property of MyValue");
    assert.strictEqual(result.metaData[2]._privateProp, "I am a private property of MyString");
  });

  it('271.21 fetchTypeHandler for nulls with converter function', async function() {
    oracledb.fetchTypeHandler = function() {
      const myConverter = (v) => {
        return String(v);
      };
      return {converter: myConverter};
    };

    const sql = `SELECT NULL FROM DUAL`;
    const result = await connection.execute(sql);
    assert.strictEqual(result.rows[0][0], "null");
  });

  it('271.22 converter function to convert column val to string', async function() {
    const TABLE = 't';
    const sql = `CREATE TABLE ${TABLE} (n_col NUMBER)`;
    const plsql = testsUtil.sqlCreateTable(TABLE, sql);
    await connection.execute(plsql);
    const inssql = `INSERT INTO ${TABLE} (n_col) VALUES (:bv)`;
    await connection.execute(inssql, { bv: 123 });

    function fetchTypeHandlerFunc(metadata) {
      if (metadata.dbType === oracledb.DB_TYPE_NUMBER) {
        return {converter: convertToString};
      }
    }

    function convertToString(val) {
      if (val !== null) {
        val = 'abc';
      }
      return val;
    }

    const result = await connection.execute(
      `select * from ${TABLE}`,
      [],
      {
        fetchTypeHandler: fetchTypeHandlerFunc,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    );

    assert.strictEqual(result.rows[0].N_COL, 'abc');
    await connection.execute(testsUtil.sqlDropTable(TABLE));
  });

  it('271.23 converter function with multiple columns', async function() {
    await connection.execute("alter session set time_zone = '+0:00'");

    oracledb.fetchTypeHandler = function(metadata) {
      if (metadata.dbTypeName === "TIMESTAMP") {
        return {type: oracledb.DATE};
      } else if (metadata.dbTypeName === "NUMBER") {
        return {type: oracledb.STRING};
      }
    };
    const TABLE = 'my_table';
    const sql = `CREATE TABLE ${TABLE} (
                  id NUMBER,
                  name VARCHAR2(50),
                  age NUMBER,
                  created_date TIMESTAMP
                )`;
    const plsql = testsUtil.sqlCreateTable(TABLE, sql);
    await connection.execute(plsql);

    await connection.execute(`INSERT INTO ${TABLE} values (01, 'ABC', 23,
                TO_TIMESTAMP('2023-04-27 10:30:00', 'YYYY-MM-DD HH24:MI:SS'))`);
    const result = await connection.execute(
      `SELECT id, name, age,
      created_date AS TS_DATE FROM ${TABLE}`,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    );

    assert.deepEqual(Object.getOwnPropertyNames(result.rows[0]), ["ID", "NAME", "AGE", "TS_DATE"]);
    assert.deepEqual(result.rows[0].ID, "1");
    assert.deepEqual(result.rows[0].NAME, "ABC");
    assert.deepEqual(result.rows[0].AGE, "23");
    assert.deepEqual(result.rows[0].TS_DATE, new Date('2023-04-27T10:30:00.000Z'));
    await connection.execute(testsUtil.sqlDropTable(TABLE));
  });
});

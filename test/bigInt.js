/* Copyright (c) 2024, 2025, Oracle and/or its affiliates. */

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
 *   300. bigInt.js
 *
 * DESCRIPTION
 *   Test cases related to use of bigInts for binding and fetching.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const assert = require('assert');
const testsUtil = require('./testsUtil.js');

describe('300. bigInt.js', function() {
  let connection;
  const createTable = `CREATE TABLE nodb_bigint (id NUMBER)`;
  const dropTable = `DROP TABLE nodb_bigint PURGE`;
  let bints, expectedRows;

  before('get connection and create table', async function() {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(createTable);
    const sql = 'INSERT INTO nodb_bigint VALUES(:a)';
    bints = [
      589508999999999999999n, // takes around 70 bits
      BigInt(Number.MAX_SAFE_INTEGER) + 1n, // unsafe positive value Number
      BigInt(Number.MAX_SAFE_INTEGER) + 2n, // unsafe positive value Number
      0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn, // 128 bits
      BigInt(Number.MAX_SAFE_INTEGER) - 1n, // unsafe negative value Number
      BigInt(Number.MIN_SAFE_INTEGER) - 2n, // unsafe negative value Number
      98765432123456n, // safe Number.
      200n, // smaller number.
      23.4, // float
      BigInt(Number.MAX_SAFE_INTEGER),
      BigInt(Number.MIN_SAFE_INTEGER)
    ];

    expectedRows = bints.map((element) => {
      return [Number(element)];
    });
    const binds = [];
    for (let i = 0; i < bints.length; i++) {
      binds[i] = {a: bints[i]};
    }
    const options = {
      bindDefs: {
        a: { type: oracledb.NUMBER }
      }
    };
    await connection.executeMany(sql, binds, options);

    const bind = [123n];
    // Insert using execute.
    await connection.execute(sql, bind);
    expectedRows.push([Number(123n)]);
  });

  after('drop table and release connection', async function() {
    await connection.execute(dropTable);
    await connection.close();
  });

  describe('300.1 verify the bigints array', function() {
    it('300.1.1 verify rows', async function() {
      const result = await connection.execute(` select * from nodb_bigint`);
      assert.deepStrictEqual(expectedRows, result.rows);
    }); //300.1.1

  }); //300.1

  describe('300.2 fetch values', function() {
    const sql = 'SELECT id FROM nodb_bigint WHERE id = :1';

    afterEach('Reset oracledb.fetchTypeHandler property', function() {
      oracledb.fetchTypeHandler = undefined;
    });

    it('300.2.1 fetches the value as number(default)', async function() {
      const num = bints[4];
      const bind = [ num ];
      const result = await connection.execute(sql, bind);
      assert.deepStrictEqual(result.rows[0][0], Number(num));
    }); //300.2.1

    it('300.2.2 use fetchTypeHandler to get BigInt value', async function() {
      // Define fetchType handler to return Number as string
      // and convert the string to BigInt.
      const myFetchTypeHandler = function(metadata) {
        if (metadata.dbTypeName === "NUMBER") {
          return {
            type: oracledb.DB_TYPE_VARCHAR, converter: (val) => {
              return val === null ? null : BigInt(val);
            }
          };
        }
      };
      oracledb.fetchTypeHandler = myFetchTypeHandler;

      const result = await connection.execute(sql, [bints[0]]);
      assert.deepStrictEqual(result.rows[0][0], bints[0]);
    }); //300.2.2

    it('300.2.3 fetch Number.MAX_SAFE_INTEGER + 1', async function() {
      const num = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
      const bindval = [ num ];

      const result = await connection.execute(sql, bindval);
      assert.deepStrictEqual(result.rows[0][0], Number(num));

    }); //300.2.3

    it('300.2.4 truncates Unsafe Integers', async function() {
      const num = BigInt(Number.MAX_SAFE_INTEGER) + 2n;
      const bindval = [ num ];

      const result = await connection.execute(sql, bindval);
      assert.deepStrictEqual(result.rows[0][0], Number(Number.MAX_SAFE_INTEGER + 1));

    }); //300.2.4

  }); //300.2

  describe('300.3 BigInt property inside objects', function() {
    const MYTYPE = 'NODB_BIGINT_300_3';
    const MYTYPE_2 = 'NODB_BIGINT_300_3_1';
    const sql = `CREATE OR REPLACE TYPE ${MYTYPE} AS OBJECT (TESTNUMBER NUMBER,
    TESTINT INTEGER, TESTBDOUBLE BINARY_DOUBLE, TESTNUMBER2 NUMBER)`;
    const sql2 = `CREATE OR REPLACE TYPE ${MYTYPE_2} IS TABLE OF NUMBER`;
    const intVal = Number.MAX_SAFE_INTEGER;
    const bdouble = Number.MAX_SAFE_INTEGER - 1;
    const toJsonProto = BigInt.prototype.toJSON; // save
    const myDbObjectFetchTypeHandler = function(metadata) {
      if (metadata.type === oracledb.DB_TYPE_NUMBER) {
        return {
          converter: (val) => {
            if (val.includes('.')) {
              return parseFloat(val); // It's a float, return as Number
            }

            // Convert to BigInt to avoid loss of precision.
            const bigIntValue = BigInt(val);

            // If BigInt value fits within the safe integer range for numbers.
            if (bigIntValue >= Number.MIN_SAFE_INTEGER && bigIntValue <= Number.MAX_SAFE_INTEGER) {
              return Number(val);
            }
            return bigIntValue;
          }
        };
      }
    };

    before('create type', async function() {
      await testsUtil.createType(connection, MYTYPE, sql);
      await testsUtil.createType(connection, MYTYPE_2, sql2);
    });

    after('drop type', async function() {
      await testsUtil.dropType(connection, MYTYPE);
      await testsUtil.dropType(connection, MYTYPE_2);
    });

    afterEach('resetFetchType', function() {
      oracledb.dbObjectTypeHandler = undefined;
      BigInt.prototype.toJSON = toJsonProto; // retore it.
    });

    it('300.3.1 read bigint property from object type', async function() {
      const num = 589508999999999999999n;
      const expected = {
        t: {
          TESTNUMBER: num.toString(), TESTINT: intVal, TESTBDOUBLE: bdouble, TESTNUMBER2: num.toString()
        }
      };
      const plsql = `declare myType ${MYTYPE} := :t; begin :t := myType; end;`;
      const bind =
      {
        t: {
          dir: oracledb.BIND_INOUT,
          type: MYTYPE,
          val: {
            'TESTNUMBER': num, 'TESTINT': intVal, 'TESTBDOUBLE': bdouble,
            'TESTNUMBER2': num
          }
        }
      };
      oracledb.dbObjectTypeHandler = myDbObjectFetchTypeHandler;
      let result = await connection.execute(plsql, bind, {outFormat: oracledb.OUT_FORMAT_OBJECT});

      // BigInt is returned as the 589508999999999999999n can not be safely represented
      // in JS Number.
      assert(result.outBinds.t.TESTNUMBER === num);
      assert(typeof result.outBinds.t.TESTNUMBER == 'bigint');
      BigInt.prototype.toJSON = function() {
        return this.toString();
      };
      assert.deepStrictEqual(JSON.stringify(expected), JSON.stringify(result.outBinds));

      // pass safe number as BigInt, we get Number as it can represented safely as JS Number.
      bind.t.val.TESTNUMBER = BigInt(Number.MAX_SAFE_INTEGER);
      result = await connection.execute(plsql, bind, {outFormat: oracledb.OUT_FORMAT_OBJECT});
      assert(result.outBinds.t.TESTNUMBER === Number.MAX_SAFE_INTEGER);
      assert(typeof result.outBinds.t.TESTNUMBER == 'number');
    }); //300.3.1

    it('300.3.2 read bigint values from collection type', async function() {
      const expected = {"t": bints.map(num => {
        if (num < Number.MIN_SAFE_INTEGER || num > Number.MAX_SAFE_INTEGER) {
          return num.toString(); // Convert unsafe numbers to strings
        }
        return Number(num); // Conver safe numbers to Numbers
      })};

      const plsql = `declare myType ${MYTYPE_2} := :t; begin :t := myType; end;`;
      oracledb.dbObjectTypeHandler = myDbObjectFetchTypeHandler;
      const pInClass = await connection.getDbObjectClass(MYTYPE_2);
      const pInObj = new pInClass(bints);
      const bind =
      {
        t: {
          dir: oracledb.BIND_INOUT,
          type: MYTYPE_2,
          val: pInObj
        }
      };
      const result = await connection.execute(plsql, bind, {outFormat: oracledb.OUT_FORMAT_OBJECT});
      BigInt.prototype.toJSON = function() {
        return this.toString();
      };
      assert.deepStrictEqual(JSON.stringify(expected), JSON.stringify(result.outBinds));
    }); //300.3.2

  });

}); //300

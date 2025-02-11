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

}); //300

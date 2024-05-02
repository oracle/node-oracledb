/* Copyright 2024, Oracle and/or its affiliates. */

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

  before('get connection and create table', async function() {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(createTable);
  });

  after('drop table and release connection', async function() {
    await connection.execute(dropTable);
    await connection.close();
  });

  describe('300.1 can bind bigInts', function() {

    it('300.1.1 with execute', async function() {
      const sql = 'INSERT INTO nodb_bigint VALUES(:1)';
      const bind = [123n];
      await assert.doesNotReject(connection.execute(sql, bind));
    }); //300.1.1

    it('300.1.2 with executeMany', async function() {
      const sql = 'INSERT INTO nodb_bigint VALUES(:a)';
      const binds = [
        { a: 1234n },
        { a: 98765432123456n },
        { a: -1234n },
        { a: BigInt(Number.MAX_SAFE_INTEGER) + 1n }
      ];
      const options = {
        bindDefs: {
          a: { type: oracledb.NUMBER }
        }
      };
      await assert.doesNotReject(connection.executeMany(sql, binds, options));
    }); //300.1.2

  }); //300.1

  describe('300.2 fetch values', function() {
    const sql = 'SELECT id FROM nodb_bigint WHERE id = :1';
    const bind = [ 123n ];

    afterEach('Reset oracledb.fetchTypeHandler property', function() {
      oracledb.fetchTypeHandler = undefined;
    });

    it('300.2.1 fetches the value as number(default)', async function() {
      const result = await connection.execute(sql, bind);
      assert.deepStrictEqual(result.rows[0][0], 123);
    }); //300.2.1

    it('300.2.2 use fetchTypeHandler to get BigInt value', async function() {
      const myFetchTypeHandler = function() {
        return {converter: (val) => val === null ? null : BigInt(val)};
      };

      oracledb.fetchTypeHandler = myFetchTypeHandler;

      const result = await connection.execute(sql, bind);
      assert.deepStrictEqual(result.rows[0][0], 123n);
    }); //300.2.2

    it('300.2.3 fetches values greater than Number.MAX_SAFE_INTEGER correctly', async function() {
      const bindval = [ BigInt(Number.MAX_SAFE_INTEGER) + 1n ];

      const result = await connection.execute(sql, bindval);
      assert.deepStrictEqual(result.rows[0][0], Number.MAX_SAFE_INTEGER + 1);

    }); //300.2.3

  }); //300.2

}); //300

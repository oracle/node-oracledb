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
 *   295. dataTypeVector2.js
 *
 * DESCRIPTION
 *  Testing Vector data Type using older clients
 *
 *****************************************************************************/
'use strict';

const assert  = require('assert');
const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('295. dataTypeVector2.js', function() {
  let connection = null, isRunnable = false;
  const defaultFetchTypeHandler = oracledb.fetchTypeHandler;
  const tableName = 'nodb_vectorDbTable2';

  before('Get connection', async function() {
    connection = await oracledb.getConnection(dbConfig);

    // Vector column is supported from 23.4 release onwards.
    // Verify the tests only if server supports vector column and client doesn't
    // support vectors and client/server are capable of reading isJson metadata.
    isRunnable = (!oracledb.thin && testsUtil.getClientVersion() < 2304000000
      && connection.oracleServerVersion >= 2304000000
      && await testsUtil.isJsonMetaDataRunnable());
    if (!isRunnable) this.skip();

    // Fetching vector column from old instant client will get
    // type as CLOB which will still be fetched as CLOB unless
    // this setting is made true explicitly.
    oracledb.future.oldJsonColumnAsObj = true;

    const sql = `CREATE TABLE ${tableName} (
      IntCol                  NUMBER(9) not null,
      VectorCol               VECTOR,
      VectorFixedCol          VECTOR(2),
      Vector32Col             VECTOR(10, float32),
      Vector64Col             VECTOR(10, float64),
      VectorInt8Col           VECTOR(4, int8),
      VectorFlexCol           VECTOR(*, *)
      )`;
    const plsql = testsUtil.sqlCreateTable(tableName, sql);
    await connection.execute(plsql);
  });

  after('Release connection', async function() {
    if (isRunnable) {
      await connection.execute(testsUtil.sqlDropTable(tableName));
      oracledb.future.oldJsonColumnAsObj = false;
    }
    await connection.close();
  });

  beforeEach(async function() {
    await connection.execute(`DELETE FROM ${tableName}`);
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
  });

  afterEach(function() {
    oracledb.fetchTypeHandler = defaultFetchTypeHandler;
  });

  it('295.1 verify fetch information for older clients', async function() {
    const expectedValues = [["INTCOL", "DB_TYPE_NUMBER", false], [
      "VECTORCOL", "DB_TYPE_CLOB", true], ["VECTORFIXEDCOL",
      "DB_TYPE_CLOB", true], ["VECTOR32COL", "DB_TYPE_CLOB",
      true], ["VECTOR64COL", "DB_TYPE_CLOB", true], ["VECTORINT8COL", "DB_TYPE_CLOB", true],
    ["VECTORFLEXCOL", "DB_TYPE_CLOB", true]];

    const result = await connection.execute(`SELECT * FROM ${tableName}`);
    const values = result.metaData.map(column => [
      column.name,
      column.dbType.name,
      column.isJson,
    ]);

    assert.deepStrictEqual(values, expectedValues);
  });

  it('295.2 verify default fetched value is an array', async function() {
    const expected_data = [
      1,
      [6501, 25.25, 18.125, -3.5],
      [11, -12.5],
      [-5.25, -1.75, 0, 18.375, 1.25, 54, -7.875, 10.125, -12, 14],
      [-1, 1, -2, 2, -3, 3, -4, 4, -5, 5],
      [126, 125, -126, 127],
      [-5, 5, -10, 10, -15, 15, -20, 20, -25, 25],
    ];

    await connection.execute(`DELETE FROM ${tableName}`);
    const sql = `
      INSERT INTO ${tableName} VALUES(
        ${expected_data.map(d =>
    (Array.isArray(d) ? `'${JSON.stringify(d)}'` : `'${d}'`)).join(',')})`;

    await connection.execute(sql);
    await connection.commit();

    const result = await connection.execute(`SELECT * FROM ${tableName}`);
    const fetched_data = result.rows[0];
    assert.deepStrictEqual(fetched_data, expected_data);
  });

  it('295.3 verify fetched value as intermediate long value', async function() {
    const expected_data = [
      1,
      [6501, 25.25, 18.125, -3.5],
      [11, -12.5],
      [-5.25, -1.75, 0, 18.375, 1.25, 54, -7.875, 10.125, -12, 14],
      [-1, 1, -2, 2, -3, 3, -4, 4, -5, 5],
      [126, 125, -126, 127],
      [-5, 5, -10, 10, -15, 15, -20, 20, -25, 25],
    ];

    await connection.execute(`DELETE FROM ${tableName}`);
    const sql = `
      INSERT INTO ${tableName} VALUES(
        ${expected_data.map(d =>
    (Array.isArray(d) ? `'${JSON.stringify(d)}'` : `'${d}'`)).join(',')}
      )`;

    await connection.execute(sql);
    await connection.commit();

    const result = await connection.execute(`SELECT * FROM ${tableName}`);
    const fetched_data = result.rows[0];
    assert.deepStrictEqual(fetched_data, expected_data);
  });

  it('295.4 verify fetched value as intermediate string value', async function() {
    const expected_data = [
      1,
      [6501, 25.25, 18.125, -3.5],
      [11, -12.5],
      [-5.25, -1.75, 0, 18.375, 1.25, 54, -7.875, 10.125, -12, 14],
      [-1, 1, -2, 2, -3, 3, -4, 4, -5, 5],
      [126, 125, -126, 127],
      [-5, 5, -10, 10, -15, 15, -20, 20, -25, 25],
    ];

    await connection.execute(`DELETE FROM ${tableName}`);
    const sql = `
      INSERT INTO ${tableName} VALUES(
        ${expected_data.map(d =>
    (Array.isArray(d) ? `'${JSON.stringify(d)}'` : `'${d}'`)).join(',')})`;

    await connection.execute(sql);
    await connection.commit();

    const result = await connection.execute(`SELECT * FROM ${tableName}`);
    const fetched_data = result.rows[0];
    assert.deepStrictEqual(fetched_data, expected_data);
  });
});

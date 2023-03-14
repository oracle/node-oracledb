/* Copyright (c) 2017, 2023, Oracle and/or its affiliates. */

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
 *   53. resultSetClose.js
 *
 * DESCRIPTION
 *   Negative cases against resulstSet.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');

describe('53. resultSetClose.js', function() {

  let connection = null;
  let resultSet  = null;
  let tableName  = "nodb_number";
  let numbers    = assist.data.numbers;

  before(async function() {

    connection = await oracledb.getConnection(dbConfig);

    await assist.setUp(connection, tableName, numbers);

    let result = await connection.execute(
      `SELECT * FROM ` + tableName + ` ORDER BY num`,
      [],
      { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT });

    resultSet = result.resultSet;

    assert(resultSet.metaData);
    let t = resultSet.metaData;
    assert.strictEqual(t[0].name, 'NUM');
    assert.strictEqual(t[1].name, 'CONTENT');

    await resultSet.close();
  }); // before

  after(async function() {

    await connection.execute(`DROP TABLE ` + tableName + ` PURGE`);

    await connection.close();
  }); // after

  it('53.1 can not get metaData property', function() {
    assert.strictEqual(resultSet.metaData, undefined);
  }); // 53.1

  it('53.2 can not call close() again', async function() {
    await assert.rejects(
      async () => {
        await resultSet.close();
      },
      /NJS-018:/ //'NJS-018: invalid ResultSet'
    );
  }); // 53.2

  it('53.3 can not call getRow()', async function() {
    await assert.rejects(
      async () => {
        await resultSet.getRow();
      },
      /NJS-018:/ //'NJS-018: invalid ResultSet'
    );
  }); // 53.3

  it('53.4 can not call getRows()', async function() {
    let numRows = 3;
    await assert.rejects(
      async () => {
        await resultSet.getRows(numRows);
      },
      /NJS-018:/ //'NJS-018: invalid ResultSet'
    );
  }); // 53.4

  it('53.5 can not call toQueryStream()', async function() {
    await assert.rejects(
      async () => {
        await resultSet.toQueryStream();
      },
      /NJS-041:/ //NJS-041: cannot convert ResultSet to QueryStream after invoking methods/
    );
  }); // 53.5

  it('53.6 can call getRow() again in the callback of getRow()', async function() {

    let rs2   = null;
    let tab   = "nodb_float";

    await assist.setUp(connection, tab, numbers);

    let result = await connection.execute(
      `SELECT * FROM ` + tab + ` ORDER BY num`,
      [],
      { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT });

    rs2 = result.resultSet;

    let row = await rs2.getRow();
    assert(row);

    let row2 = await rs2.getRow();
    assert(row2);

    await rs2.close();

    await connection.execute(`DROP TABLE ` + tab + ` PURGE`);
  }); // 53.6

});

/* Copyright (c) 2026, Oracle and/or its affiliates. */
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
 *   nestedCursorResultSetMemCheck.js
 *
 * DESCRIPTION
 *   Exercises nested cursor getRows() while forcing parent result set
 *   reallocation, and checks that native memory growth remains bounded.
 *
 *   Run with:
 *     node --expose-gc nestedCursorResultSetMemCheck.js
 *
 *****************************************************************************/
'use strict';

const assert = require('assert');
const oracledb = require('oracledb');
const dbConfig = require('../../../dbconfig.js');

const ITERATIONS = 500;
const WARMUP_ITERATIONS = 10;
const MAX_RSS_GROWTH = 128 * 1024 * 1024;
const NESTED_FETCH_SIZES = [1, 8, 32];
const TABLE_DEPT = 'NODB_RS_NC_MEM_DEPT';
const TABLE_EMP = 'NODB_RS_NC_MEM_EMP';

let connection;

function bytesToMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

async function dropTable(name) {
  await connection.execute(`
    BEGIN
      EXECUTE IMMEDIATE 'DROP TABLE ${name} PURGE';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLCODE != -942 THEN
            RAISE;
          END IF;
    END;`);
}

async function setup() {
  await dropTable(TABLE_EMP);
  await dropTable(TABLE_DEPT);

  await connection.execute(`
    CREATE TABLE ${TABLE_DEPT} (
      department_id NUMBER,
      department_name VARCHAR2(30)
    )`);

  await connection.execute(`
    CREATE TABLE ${TABLE_EMP} (
      department_id NUMBER,
      employee_id NUMBER,
      employee_name VARCHAR2(30),
      detail VARCHAR2(4000)
    )`);

  await connection.executeMany(
    `INSERT INTO ${TABLE_DEPT} VALUES (:1, :2)`,
    [
      [101, 'R&D'],
      [201, 'Sales'],
      [301, 'Marketing']
    ]
  );

  const detailValue = 'x'.repeat(4000);
  const binds = [];

  for (let i = 0; i < 160; i++) {
    binds.push([301, 1100 + i, `Marketing ${i}`, detailValue]);
  }
  binds.push([101, 1001, 'R&D 1', detailValue]);

  await connection.executeMany(
    `INSERT INTO ${TABLE_EMP} VALUES (:1, :2, :3, :4)`,
    binds,
    {
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.NUMBER },
        { type: oracledb.STRING, maxSize: 30 },
        { type: oracledb.STRING, maxSize: detailValue.length }
      ]
    }
  );

  await connection.commit();
}

async function cleanup() {
  await dropTable(TABLE_EMP);
  await dropTable(TABLE_DEPT);
}

function getSql() {
  const nestedColumns = ['employee_id'];

  for (let i = 1; i <= 20; i++) {
    nestedColumns.push(`detail detail${i}`);
  }

  return `SELECT department_name, CURSOR(
    SELECT ${nestedColumns.join(', ')}
    FROM ${TABLE_EMP} B
    WHERE A.department_id = B.department_id
    ORDER BY employee_id
  ) AS nc
  FROM ${TABLE_DEPT} A
  ORDER BY department_id`;
}

async function consumeNestedResultSet(resultSet, expectedRowCount) {
  let rowsFetched = 0;

  for (const size of NESTED_FETCH_SIZES) {
    const rows = await resultSet.getRows(size);
    rowsFetched += rows.length;
    if (rows.length === 0) {
      break;
    }
  }

  const remainingRows = await resultSet.getRows(0);
  rowsFetched += remainingRows.length;
  assert.strictEqual(rowsFetched, expectedRowCount);
  await resultSet.close();
}

async function closeNestedResultSets(rows) {
  for (const row of rows) {
    await row.NC.close();
  }
}

async function getNestedCursorRows() {
  const result = await connection.execute(
    getSql(),
    [],
    {
      resultSet: true,
      fetchArraySize: 1,
      outFormat: oracledb.OUT_FORMAT_OBJECT
    }
  );

  const firstRows = await result.resultSet.getRows(1);
  assert.strictEqual(firstRows.length, 1);
  assert.strictEqual(firstRows[0].DEPARTMENT_NAME, 'R&D');

  const remainingRows = await result.resultSet.getRows(2);
  assert.strictEqual(remainingRows.length, 2);
  assert.strictEqual(remainingRows[0].DEPARTMENT_NAME, 'Sales');
  assert.strictEqual(remainingRows[1].DEPARTMENT_NAME, 'Marketing');

  return { resultSet: result.resultSet, firstRows, remainingRows };
}

async function runCorrectnessCheck() {
  const { resultSet, firstRows, remainingRows } = await getNestedCursorRows();

  await consumeNestedResultSet(firstRows[0].NC, 1);
  await consumeNestedResultSet(remainingRows[0].NC, 0);
  await consumeNestedResultSet(remainingRows[1].NC, 160);
  await resultSet.close();
}

async function runQuery() {
  const { resultSet, firstRows, remainingRows } = await getNestedCursorRows();

  await consumeNestedResultSet(firstRows[0].NC, 1);
  await closeNestedResultSets(remainingRows);
  await resultSet.close();
}

async function runTestLoop() {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    await runQuery();
  }

  global.gc();
  const initialRss = process.memoryUsage().rss;

  for (let i = 0; i < ITERATIONS; i++) {
    await runQuery();

    if (i % 20 === 0) {
      global.gc();
      const currentRss = process.memoryUsage().rss;
      console.log(
        `Iteration ${i}: RSS ${bytesToMB(currentRss)} MB, ` +
        `growth ${bytesToMB(currentRss - initialRss)} MB`
      );
    }
  }

  global.gc();
  const finalRss = process.memoryUsage().rss;
  const rssGrowth = finalRss - initialRss;

  console.log(`Initial RSS: ${bytesToMB(initialRss)} MB`);
  console.log(`Final RSS: ${bytesToMB(finalRss)} MB`);
  console.log(`RSS growth: ${bytesToMB(rssGrowth)} MB`);

  assert(
    rssGrowth <= MAX_RSS_GROWTH,
    `Nested cursor native memory grew by ${bytesToMB(rssGrowth)} MB`
  );
}

async function main() {
  if (oracledb.thin) {
    console.log('Skipping test. Thick mode is required.');
    return;
  }

  if (typeof global.gc !== 'function') {
    throw new Error('Run this test with node --expose-gc');
  }

  connection = await oracledb.getConnection(dbConfig);
  await setup();
  await runCorrectnessCheck();
  await runTestLoop();
  await cleanup();
  await connection.close();
}

main();

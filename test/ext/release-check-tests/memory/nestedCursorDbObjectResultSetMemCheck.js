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
 *   nestedCursorDbObjectResultSetMemCheck.js
 *
 * DESCRIPTION
 *   Exercises nested cursor ResultSets that fetch DbObjects and checks that
 *   native memory growth remains bounded.
 *
 *   Run with:
 *     node --expose-gc nestedCursorDbObjectResultSetMemCheck.js
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
const NESTED_ROW_COUNT = 64;
const PARENT_ROW_COUNT = 3;

let connection;

function bytesToMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

function getSql() {
  return `SELECT parent_id, CURSOR(
    SELECT SYS.ODCINUMBERLIST(A.parent_id, B.row_id) AS object_value
    FROM (
      SELECT LEVEL AS row_id
      FROM DUAL
      CONNECT BY LEVEL <= ${NESTED_ROW_COUNT}
    ) B -- inner cursor query
    ORDER BY B.row_id
  ) AS nc
  FROM ( -- outermost query
    SELECT LEVEL AS parent_id
    FROM DUAL
    CONNECT BY LEVEL <= ${PARENT_ROW_COUNT}
  ) A
  ORDER BY parent_id`;
}

function checkRows(rows, parentId, firstRowId) {
  for (let i = 0; i < rows.length; i++) {
    assert.deepStrictEqual(
      rows[i].OBJECT_VALUE.getValues(),
      [parentId, firstRowId + i]
    );
  }
}

async function consumeNestedResultSet(resultSet, parentId) {
  let rowsFetched = 0;

  for (const size of NESTED_FETCH_SIZES) {
    const rows = await resultSet.getRows(size);
    checkRows(rows, parentId, rowsFetched + 1);
    rowsFetched += rows.length;
  }

  const remainingRows = await resultSet.getRows(0);
  checkRows(remainingRows, parentId, rowsFetched + 1);
  rowsFetched += remainingRows.length;

  assert.strictEqual(rowsFetched, NESTED_ROW_COUNT);
  await resultSet.close();
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
  assert.strictEqual(firstRows[0].PARENT_ID, 1);

  const remainingRows = await result.resultSet.getRows(2);
  assert.strictEqual(remainingRows.length, 2);
  assert.strictEqual(remainingRows[0].PARENT_ID, 2);
  assert.strictEqual(remainingRows[1].PARENT_ID, 3);

  return { resultSet: result.resultSet, firstRows, remainingRows };
}

async function runQuery() {
  const { resultSet, firstRows, remainingRows } =
    await getNestedCursorRows();
  const rows = firstRows.concat(remainingRows);

  for (const row of rows) {
    await consumeNestedResultSet(row.NC, row.PARENT_ID);
  }
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
    `Nested cursor DbObject memory grew by ${bytesToMB(rssGrowth)} MB`
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
  try {
    await runQuery();
    await runTestLoop();
  } finally {
    await connection.close();
  }
}

main();

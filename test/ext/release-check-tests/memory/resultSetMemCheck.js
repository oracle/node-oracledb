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
 *   resultSetMemCheck.js
 *
 * DESCRIPTION
 *   Exercises ResultSet getRows() and checks that native memory growth
 *   remains bounded.
 *
 *   Run with:
 *     node --expose-gc resultSetMemCheck.js
 *
 *****************************************************************************/
'use strict';

const assert = require('assert');
const oracledb = require('oracledb');
const dbConfig = require('../../../dbconfig.js');

const ITERATIONS = 500;
const WARMUP_ITERATIONS = 10;
const MAX_RSS_GROWTH = 128 * 1024 * 1024;
const FETCH_SIZES = [2, 8, 32, 128];
const ROW_COUNT = 250;

const TABLE_NAME = 'NODB_RS_MEM_CHECK';

let connection;

function bytesToMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

async function setup() {
  await connection.execute(`
    BEGIN
      EXECUTE IMMEDIATE 'DROP TABLE ${TABLE_NAME} PURGE';
      EXCEPTION
        WHEN OTHERS THEN
        IF SQLCODE != -942 THEN
          RAISE;
        END IF;
    END;`);

  await connection.execute(`
    CREATE TABLE ${TABLE_NAME} (
      id NUMBER,
      c CLOB
    )`);

  const clobValue = 'x'.repeat(8192);
  const binds = [];

  for (let i = 1; i <= ROW_COUNT; i++) {
    binds.push({ id: i, c: clobValue });
  }

  await connection.executeMany(
    `INSERT INTO ${TABLE_NAME} VALUES (:id, :c)`,
    binds,
    {
      bindDefs: {
        id: { type: oracledb.NUMBER },
        c: { type: oracledb.STRING, maxSize: clobValue.length }
      }
    }
  );

  await connection.commit();
}

async function cleanup() {
  await connection.execute(`
    BEGIN
      EXECUTE IMMEDIATE 'DROP TABLE ${TABLE_NAME} PURGE';
      EXCEPTION
        WHEN OTHERS THEN
        IF SQLCODE != -942 THEN
          RAISE;
        END IF;
    END;`);
}

function getSql() {
  const columns = [];

  for (let i = 1; i <= 20; i++) {
    columns.push(`c c${i}`);
  }

  return `SELECT ${columns.join(', ')} FROM ${TABLE_NAME} ORDER BY id`;
}

async function closeLobsInRows(rows) {
  for (const row of rows) {
    for (const value of row) {
      if (value && typeof value.close === 'function') {
        await value.close();
      }
    }
  }
}

async function getResultSet(sql) {
  const result = await connection.execute(
    sql,
    [],
    {
      resultSet: true,
      fetchArraySize: 1
    }
  );

  return result.resultSet;
}

async function consumeResultSet(resultSet, expectedRowCount) {
  let rowsFetched = 0;

  for (const size of FETCH_SIZES) {
    const rows = await resultSet.getRows(size);
    assert.strictEqual(rows.length, size);
    await closeLobsInRows(rows);
    rowsFetched += rows.length;
  }

  if (expectedRowCount !== undefined) {
    const remainingRows = await resultSet.getRows(0);
    assert.strictEqual(remainingRows.length, expectedRowCount - rowsFetched);
    await closeLobsInRows(remainingRows);
  }

  await resultSet.close();
}

async function runCorrectnessCheck(sql) {
  const resultSet = await getResultSet(sql);

  await consumeResultSet(resultSet, ROW_COUNT);
}

async function runQuery(sql) {
  const resultSet = await getResultSet(sql);

  await consumeResultSet(resultSet);
}

async function runTestLoop() {
  const sql = getSql();

  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    await runQuery(sql);
  }

  global.gc();
  const initialRss = process.memoryUsage().rss;

  for (let i = 0; i < ITERATIONS; i++) {
    await runQuery(sql);

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
    `ResultSet native memory grew by ${bytesToMB(rssGrowth)} MB`
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
  await runCorrectnessCheck(getSql());
  await runTestLoop();
  await cleanup();
  await connection.close();
}

main();

/* Copyright (c) 2019, 2023, Oracle and/or its affiliates. */

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
 *   196. getDataOfLob.js
 *
 * DESCRIPTION
 *   Test the asynchronous method getData() on LOB columns.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const fs        = require('fs');
const util      = require('util');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('196. getDataOfLob.js', () => {

  let conn;
  const tab1 = 'nodb_tab_myclob';
  const tab2 = 'nodb_tab_myblob';

  before('prepare the table', async () => {
    conn = await oracledb.getConnection(dbConfig);

    let sql =
      `create table ${tab1} (
        id number(9) not null,
        value clob not null
      )`;
    let plsql = testsUtil.sqlCreateTable(tab1, sql);
    await conn.execute(plsql);

    sql =
      `create table ${tab2} (
        id number(9) not null,
        value blob not null
      )`;
    plsql = testsUtil.sqlCreateTable(tab2, sql);
    await conn.execute(plsql);
  }); // before()

  after(async () => {
    let sql = `drop table ${tab1} purge`;
    await conn.execute(sql);

    sql = `drop table ${tab2} purge`;
    await conn.execute(sql);

    await conn.close();
  }); // after()

  it('196.1 getData() works on CLOB ', async () => {
    const content = 'A short string value';
    let sql = `insert into ${tab1} values (1, '${content}')`;
    await conn.execute(sql);

    sql = `select * from ${tab1} where id = 1`;
    const result = await conn.execute(sql);
    const clob = result.rows[0][1];
    const value = await clob.getData();

    assert.strictEqual(value, content);
  }); // 196.1

  it('196.2 getData() returns CLOB as Strings', async () => {

    const txtFile = 'test/clobexample.txt';
    const inStream = fs.createReadStream(txtFile);
    const num = 2;
    let sql = `insert into ${tab1} values (:i, empty_clob())
      returning value into :lobbv`;
    const binds = { i: num, lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } };
    const opt = { autoCommit: false };

    // Insertion with Stream
    const result = await conn.execute(sql, binds, opt);

    const clob = result.outBinds.lobbv[0];
    inStream.pipe(clob);

    const insertionComplete = new Promise((resolve, reject) => {
      inStream.on('error', reject);
      clob.on('error', reject);
      clob.on('finish', () => resolve(conn.commit()));
    });

    await insertionComplete;

    // Query
    sql = `select value from ${tab1} where id = ${num}`;
    const outResult = await conn.execute(sql);
    const outLob = outResult.rows[0][0];

    const queryResult = await outLob.getData();

    // Verify
    const readFile = util.promisify(fs.readFile);
    const content = await readFile(txtFile);
    assert.strictEqual(queryResult, content.toString());

  }); // 196.2

  it('196.3 getData() on BLOB', async () => {
    const content = 'A somewhat longer BLOB value';
    let sql = `insert into ${tab2} values ( 1, utl_raw.cast_to_raw('${content}') )`;
    await conn.execute(sql);

    sql = `select * from ${tab2} where id = 1`;
    const result = await conn.execute(sql);
    const clob = result.rows[0][1];
    const value = await clob.getData();

    assert.strictEqual(value.toString(), content);
  }); // 196.3

  it('196.4 getData() returns BLOB as Buffer', async () => {
    const jpgFile = 'test/tree.jpg';
    const inStream = fs.createReadStream(jpgFile);
    const num = 2;
    let sql = `insert into ${tab2} values (:i, empty_blob())
      returning value into :lobbv`;
    const binds = { i: num, lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } };
    const opt = { autoCommit: false };

    // Insertion with Stream
    const result = await conn.execute(sql, binds, opt);

    const blob = result.outBinds.lobbv[0];
    inStream.pipe(blob);

    const insertionComplete = new Promise((resolve, reject) => {
      inStream.on('error', reject);
      blob.on('error', reject);
      blob.on('finish', () => resolve(conn.commit()));
    });

    await insertionComplete;

    // Query
    sql = `select value from ${tab2} where id = ${num}`;
    const outResult = await conn.execute(sql);
    const outLob = outResult.rows[0][0];

    const queryResult = await outLob.getData();

    // Verify
    const readFile = util.promisify(fs.readFile);
    const content = await readFile(jpgFile);
    const isEqual = content.equals(queryResult);
    assert.strictEqual(isEqual, true);
  }); // 196.4

  it('196.5 getData() on empty LOB returns null', async () => {
    const tempLob = await conn.createLob(oracledb.BLOB);
    const value = await tempLob.getData();
    assert.strictEqual(value, null);
    await tempLob.close();
  }); // 196.5

  it('196.6 works with temp LOB', async () => {
    const inFileName = 'test/clobexample.txt';
    const tempLob = await conn.createLob(oracledb.CLOB);
    const inStream = fs.createReadStream(inFileName);

    inStream.pipe(tempLob);

    const insertionComplete = new Promise((resolve, reject) => {
      inStream.on('error', reject);
      tempLob.on('error', reject);
      tempLob.on('finish', resolve);
    });

    await insertionComplete;

    // Query
    const queryResult = await tempLob.getData();

    // Verify
    const readFile = util.promisify(fs.readFile);
    const content = await readFile(inFileName);
    assert.strictEqual(queryResult, content.toString());

    await tempLob.close();
  }); // 196.6

});

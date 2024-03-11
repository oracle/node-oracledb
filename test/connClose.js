/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 *   52. connClose.js
 *
 * DESCRIPTION
 *   Negative cases against connection.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('52. connClose.js', function() {

  it('52.1 can not set property, stmtCacheSize, after connection closes', async function() {
    const connection = await oracledb.getConnection(dbConfig);
    const defaultSize = 30;
    assert.strictEqual(connection.stmtCacheSize, defaultSize);
    await connection.close();
    assert.throws(
      function() {
        connection.stmtCacheSize = 10;
      },
      "TypeError: Cannot assign to read only property 'stmtCacheSize' of object '#<Connection>'"
    );
  }); // 52.1

  it('52.2 can not set property, clientId, after connection closes', async function() {
    const connection = await oracledb.getConnection(dbConfig);
    assert(connection);
    await connection.close();
    assert.throws(
      function() {
        connection.clientId = "52.3";
      },
      /NJS-003:/
    );
  }); // 52.2

  it('52.3 can not set property, module', async function() {
    const connection = await oracledb.getConnection(dbConfig);
    assert(connection);
    await connection.close();
    assert.throws(
      function() {
        connection.module = "52.4";
      },
      /NJS-003:/
    );
  }); // 52.3

  it('52.4 can not set property, action', async function() {
    const connection = await oracledb.getConnection(dbConfig);
    assert(connection);
    await connection.close();
    assert.throws(
      function() {
        connection.module = "52.5";
      },
      /NJS-003:/
    );
  }); // 52.4

  it('52.5 can not call method, execute()', async function() {
    const connection = await oracledb.getConnection(dbConfig);
    assert(connection);
    await connection.close();
    await assert.rejects(
      async () => {
        await connection.execute("select sysdate from dual");
      },
      /NJS-003:/
    );
  }); // 52.5

  it('52.6 can not call method, break()', async function() {
    const connection = await oracledb.getConnection(dbConfig);
    assert(connection);
    await connection.close();
    await assert.rejects(
      async () => {
        await connection.break();
      },
      /NJS-003:/
    );
  }); // 52.6

  it('52.7 can not call method, commit()', async function() {
    const connection = await oracledb.getConnection(dbConfig);
    assert(connection);
    await connection.close();
    await assert.rejects(
      async () => {
        await connection.commit();
      },
      /NJS-003:/
    );
  }); // 52.7

  it('52.8 can not call method, createLob()', async function() {
    const connection = await oracledb.getConnection(dbConfig);
    assert(connection);
    await connection.close();
    await assert.rejects(
      async () => {
        await connection.createLob(oracledb.CLOB);
      },
      /NJS-003:/
    );
  }); // 52.8

  it('52.9 can not call method, queryStream()', async function() {
    const connection = await oracledb.getConnection(dbConfig);
    await connection.close();
    const stream = await connection.queryStream("select sysdate from dual");

    await assert.rejects(
      async () => {
        await new Promise((resolve, reject) => {
          stream.on('data', () => reject(new Error('data event!')));
          stream.on('error', reject);
          stream.on('end', stream.destroy);
          stream.on('close', resolve);
        });
      },
      /NJS-003:/
    );
  }); // 52.9

  it('52.10 can not call release() multiple times', async function() {
    const connection = await oracledb.getConnection(dbConfig);
    assert(connection);
    await connection.close();
    await assert.rejects(
      async () => await connection.commit(),
      /NJS-003:/
    );
  }); // 52.10

  it('52.11 can not call method, rollback()', async function() {
    const connection = await oracledb.getConnection(dbConfig);
    assert(connection);
    await connection.close();
    await assert.rejects(
      async () => await connection.rollback(),
      /NJS-003:/
    );
  }); // 52.11

  it("52.12 can access properties of closed connection without error", async function() {
    const connection = await oracledb.getConnection(dbConfig);
    assert(connection);
    await connection.close();
    assert.strictEqual(connection.stmtCacheSize, undefined);
    assert.strictEqual(connection.oracleServerVersion, undefined);
    assert.strictEqual(connection.oracleServerVersionString, undefined);
    assert.strictEqual(connection.action, null);
    assert.strictEqual(connection.clientId, null);
    assert.strictEqual(connection.module, null);
  }); // 52.12

});

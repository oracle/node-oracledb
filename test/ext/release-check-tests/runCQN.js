/* Copyright (c) 2021, 2025, Oracle and/or its affiliates. */

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
 *   185. runCQN.js
 *
 * DESCRIPTION
 *   Test Continuous Query Notification (CQN).
 *
 *   To keep it simple, this test will not run on macOS. Because the database
 *   must be able to connect to the node-oracledb machine for notifications
 *   to be received. Typically this means that the machine running node-oracledb
 *   needs a fixed IP address.
 *
 *   Due to the limitation of Mocha, it could not catch the stacked callback
 *   errors. We may see errors as outputs.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('../../dbconfig.js');
const testsUtil = require('../../testsUtil.js');

describe('185. runCQN.js', function() {

  let isRunnable = true;
  let conn, connAsDBA;

  before(async function() {
    if (oracledb.thin || (!dbConfig.test.DBA_PRIVILEGE) || (process.platform == 'darwin')) {
      isRunnable = false;
    }

    if (!isRunnable) {
      this.skip();
    } else {
      const dbaCredential = {
        user: dbConfig.test.DBA_user,
        password: dbConfig.test.DBA_password,
        connectString: dbConfig.connectString,
        privilege: oracledb.SYSDBA
      };
      connAsDBA = await oracledb.getConnection(dbaCredential);

      const sql = `GRANT CHANGE NOTIFICATION TO ${dbConfig.user}`;
      await connAsDBA.execute(sql);

      conn = await oracledb.getConnection({
        ...dbConfig,
        events: true
      });

    }
  }); // before()

  after(async function() {
    if (!isRunnable) {
      return;
    } else {

      const sql = `REVOKE CHANGE NOTIFICATION FROM ${dbConfig.user}`;
      await connAsDBA.execute(sql);

      await conn.close();
      await connAsDBA.close();
    }
  }); // after()

  it('185.1 examples/cqn1.js', async () => {

    const TABLE = 'nodb_tab_cqn_1';
    let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;
    await conn.execute(testsUtil.sqlCreateTable(TABLE, sql));
    const myCallback = function(message) {
      assert.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
      assert.strictEqual(message.registered, true);
      const table = message.queries[0].tables[0];
      const tableName = dbConfig.user.toUpperCase() + '.' + TABLE.toUpperCase();
      assert.strictEqual(table.name, tableName);
      assert.strictEqual(table.operation, oracledb.CQN_OPCODE_INSERT);
    };

    const options = {
      callback: myCallback,
      sql: `SELECT * FROM ${TABLE} WHERE k > :bv`,
      binds: { bv: 100 },
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS
    };

    await conn.subscribe('sub1', options);

    // subscribe again with same sql should be no-op
    await conn.subscribe('sub1', options);

    sql = `INSERT INTO ${TABLE} VALUES (101)`;
    await conn.execute(sql);

    await conn.commit();

    await conn.unsubscribe('sub1');

    await testsUtil.dropTable(conn, TABLE);
  }); // 185.1

  it('185.2 SQL Delete operation', async () => {

    const TABLE = 'nodb_tab_cqn_2';
    let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;
    await conn.execute(testsUtil.sqlCreateTable(TABLE, sql));

    const myCallback = function(message) {
      assert.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
      assert.strictEqual(message.registered, true);
      const table = message.queries[0].tables[0];
      const tableName = dbConfig.user.toUpperCase() + '.' + TABLE.toUpperCase();
      assert.strictEqual(table.name, tableName);
      const expect = oracledb.CQN_OPCODE_INSERT |
                     oracledb.CQN_OPCODE_DELETE |
                     oracledb.CQN_OPCODE_ALL_ROWS;
      assert.strictEqual(expect, table.operation);
    };

    const options = {
      callback: myCallback,
      sql: `SELECT * FROM ${TABLE}`,
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_QUERY
    };
    await conn.subscribe('sub2', options);
    sql = `INSERT INTO ${TABLE} VALUES (99)`;
    await conn.execute(sql);

    sql = `INSERT INTO ${TABLE} VALUES (102)`;
    await conn.execute(sql);

    sql = `DELETE FROM ${TABLE} WHERE k > :bv`;
    await conn.execute(sql, { bv: 100 });

    await conn.commit();

    await conn.unsubscribe('sub2');

    await testsUtil.dropTable(conn, TABLE);
  }); // 185.2

  it('185.3 Specify the notification only for INSERT operation', async () => {

    const TABLE = 'nodb_tab_cqn_3';
    let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;
    await conn.execute(testsUtil.sqlCreateTable(TABLE, sql));

    const myCallback = function(message) {
      assert.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
      assert.strictEqual(message.registered, true);
      const table = message.queries[0].tables[0];
      const tableName = dbConfig.user.toUpperCase() + '.' + TABLE.toUpperCase();
      assert.strictEqual(table.name, tableName);
      const expect = oracledb.CQN_OPCODE_INSERT | oracledb.CQN_OPCODE_ALL_ROWS;
      assert.strictEqual(table.operation, expect);
    };

    const options = {
      callback: myCallback,
      sql: `SELECT * FROM ${TABLE}`,
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_QUERY,
      operations: oracledb.CQN_OPCODE_INSERT
    };

    await conn.subscribe('sub3', options);

    sql = `DELETE FROM ${TABLE} WHERE k > :bv`;
    await conn.execute(sql, { bv: 100 });

    sql = `INSERT INTO ${TABLE} VALUES (103)`;
    await conn.execute(sql);

    await conn.commit();

    await conn.unsubscribe('sub3');

    await testsUtil.dropTable(conn, TABLE);
  }); // 185.3

  it('185.4 Negative - provide invalid SQL in CQN option', async () => {
    const TABLE = 'nodb_tab_cqn_4';

    const myCallback = function(message) {
      assert(message);
    };

    const options = {
      callback: myCallback,
      sql: `DELETE FROM ${TABLE} WHERE k > :bv`,
      binds: { bv: 100 },
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_QUERY
    };

    await assert.rejects(
      async () => {
        await conn.subscribe('sub4', options);
      },
      /DPI-1013:/
    );
    // DPI-1013: not supported

  }); // 185.4

  it('185.5 examples/cqn2.js', async () => {

    const TABLE = 'nodb_tab_cqn_5';
    let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;
    await conn.execute(testsUtil.sqlCreateTable(TABLE, sql));

    const myCallback = function(message) {
      assert.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE);
      assert.strictEqual(message.registered, true);
    };

    const options = {
      callback: myCallback,
      sql: `SELECT * FROM ${TABLE}`,
      timeout: 60,
      qos: oracledb.SUBSCR_QOS_ROWIDS,
      // Group notifications in batches covering 1 second
      // intervals, and send a summary
      groupingClass: oracledb.SUBSCR_GROUPING_CLASS_TIME,
      groupingValue: 1,
      groupingType: oracledb.SUBSCR_GROUPING_TYPE_SUMMARY
    };

    await conn.subscribe('sub5', options);

    sql = `INSERT INTO ${TABLE} VALUES (:1)`;
    const bindArr = [ [1], [2], [3], [4], [5], [6], [7] ];
    for (let i = 0; i < bindArr.length; i++) {
      await conn.execute(sql, bindArr[i], { autoCommit: true });
    }

    await conn.commit();

    await conn.unsubscribe('sub5');
    await testsUtil.dropTable(conn, TABLE);
  }); // 185.5

  it('185.6 Get the registration ID "regId" for subscriptions', async () => {
    const TABLE = 'nodb_tab_cqn_6';
    let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;
    await conn.execute(testsUtil.sqlCreateTable(TABLE, sql));

    const myCallback = function(message) {
      assert.strictEqual(message.registered, true);
    };

    const options = {
      callback: myCallback,
      sql: `SELECT * FROM ${TABLE} WHERE k > :bv`,
      binds: { bv: 100 },
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS
    };

    await conn.commit();

    const result = await conn.subscribe('sub6', options);
    assert.strictEqual(typeof result.regId, "number");

    const tableName = dbConfig.user.toUpperCase() + '.' + TABLE.toUpperCase();
    sql = `SELECT regid FROM USER_CHANGE_NOTIFICATION_REGS
               WHERE table_name = '${tableName}'`;
    const res = await conn.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    assert.strictEqual(result.regId, res.rows[0].REGID);

    sql = `INSERT INTO ${TABLE} VALUES (101)`;
    await conn.execute(sql);

    await conn.commit();

    await conn.unsubscribe('sub6');
    await testsUtil.dropTable(conn, TABLE);
  }); // 185.6

  it('185.7 Negative - unsubscribe multiple times', async () => {
    const TABLE = 'nodb_tab_cqn_7';
    let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;
    await conn.execute(testsUtil.sqlCreateTable(TABLE, sql));

    const myCallback = function(message) {
      assert.strictEqual(message.registered, true);
    };

    const options = {
      callback: myCallback,
      sql: `SELECT * FROM ${TABLE} WHERE k > :bv`,
      binds: { bv: 100 },
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS
    };

    await conn.subscribe('sub7', options);

    sql = `INSERT INTO ${TABLE} VALUES (101)`;
    await conn.execute(sql);

    await conn.commit();

    await conn.unsubscribe('sub7');

    await testsUtil.dropTable(conn, TABLE);
    await assert.rejects(
      async () => {
        await conn.unsubscribe('sub7');
      },
      /NJS-061:/ // NJS-061: invalid subscription
    );
  }); // 185.7

  it('185.8 Negative - unsubscribe nonexistent subscriptions', async () => {
    await assert.rejects(
      async () => {
        await conn.unsubscribe('nonexist');
      },
      /NJS-061:/ // NJS-061: invalid subscription
    );
  }); // 185.8

  // A variation of 185.4
  it('185.9 Negative - unsubscribe the invalid subscription', async () => {
    const TABLE = 'nodb_tab_cqn_9';

    const myCallback = function(message) {
      assert.strictEqual(message.registered, true);
    };

    const options = {
      callback: myCallback,
      sql: `DELETE FROM ${TABLE} WHERE k > :bv`,
      binds: { bv: 100 },
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_QUERY
    };

    await assert.rejects(
      async () => {
        await conn.subscribe('sub9', options);
      },
      /DPI-1013:/
    );
    // DPI-1013: not supported

    await assert.rejects(
      async () => {
        await conn.unsubscribe('sub9');
      },
      /NJS-061:/
    );
  }); // 185.9

  it('185.10 Notify on UPDATE operation', async () => {
    const TABLE = 'nodb_tab_cqn_10';
    let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER,
            v VARCHAR2(50)
          )`;
    await conn.execute(testsUtil.sqlCreateTable(TABLE, sql));

    const myCallback = function(message) {
      assert.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
      assert.strictEqual(message.registered, true);
      const table = message.queries[0].tables[0];
      const tableName = dbConfig.user.toUpperCase() + '.' + TABLE.toUpperCase();
      assert.strictEqual(table.name, tableName);
      assert.strictEqual(table.operation, oracledb.CQN_OPCODE_UPDATE);
    };

    const options = {
      callback: myCallback,
      sql: `SELECT * FROM ${TABLE} WHERE k > :bv`,
      binds: { bv: 0 },
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS
    };

    await conn.subscribe('sub10', options);

    sql = `INSERT INTO ${TABLE} VALUES (1, 'Initial')`;
    await conn.execute(sql);

    sql = `UPDATE ${TABLE} SET v = 'Updated' WHERE k = 1`;
    await conn.execute(sql);

    await conn.commit();

    await conn.unsubscribe('sub10');
    await testsUtil.dropTable(conn, TABLE);
  }); // 185.10

  it('185.11 Notification grouping by message count', async () => {
    const TABLE = 'nodb_tab_cqn_11';
    let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;

    await conn.execute(testsUtil.sqlCreateTable(TABLE, sql));

    const myCallback = function(message) {
      assert.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
      assert.strictEqual(message.registered, true);
    };

    const options = {
      callback: myCallback,
      sql: `SELECT * FROM ${TABLE}`,
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_QUERY,
      groupingClass: oracledb.SUBSCR_GROUPING_CLASS_MESSAGE,
      groupingValue: 5, // Group notifications after 5 changes
      groupingType: oracledb.SUBSCR_GROUPING_TYPE_SUMMARY
    };

    await conn.subscribe('sub11', options);

    sql = `INSERT INTO ${TABLE} VALUES (:1)`;
    const bindArr = [ [1], [2], [3], [4], [5], [6] ];
    for (let i = 0; i < bindArr.length; i++) {
      await conn.execute(sql, bindArr[i], { autoCommit: true });
    }

    await conn.unsubscribe('sub11');
    await testsUtil.dropTable(conn, TABLE);
  }); // 185.11

  it('185.12 Notify for specific columns', async () => {
    const TABLE = 'nodb_tab_cqn_12';
    let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER,
            v VARCHAR2(50)
          )`;
    await conn.execute(testsUtil.sqlCreateTable(TABLE, sql));

    const myCallback = function(message) {
      assert.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
      assert.strictEqual(message.registered, true);
      const table = message.queries[0].tables[0];
      const tableName = dbConfig.user.toUpperCase() + '.' + TABLE.toUpperCase();
      assert.strictEqual(table.name, tableName);
      assert.strictEqual(table.operation, oracledb.CQN_OPCODE_UPDATE);
    };

    const options = {
      callback: myCallback,
      sql: `SELECT v FROM ${TABLE} WHERE k = :bv`,
      binds: { bv: 1 },
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS
    };

    await conn.subscribe('sub12', options);

    sql = `INSERT INTO ${TABLE} VALUES (1, 'Initial')`;
    await conn.execute(sql);

    sql = `UPDATE ${TABLE} SET v = 'Updated' WHERE k = 1`;
    await conn.execute(sql);

    await conn.commit();

    await conn.unsubscribe('sub12');
    await testsUtil.dropTable(conn, TABLE);
  }); // 185.12

  it('185.13 Notify only on ROWID changes', async () => {
    const TABLE = 'nodb_tab_cqn_13';
    let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;
    await conn.execute(testsUtil.sqlCreateTable(TABLE, sql));

    const myCallback = function(message) {
      assert.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
      assert.strictEqual(message.registered, true);
    };

    const options = {
      callback: myCallback,
      sql: `SELECT ROWID FROM ${TABLE}`,
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_ROWIDS
    };

    await conn.subscribe('sub13', options);

    sql = `INSERT INTO ${TABLE} VALUES (1)`;
    await conn.execute(sql);

    sql = `INSERT INTO ${TABLE} VALUES (2)`;
    await conn.execute(sql);

    await conn.commit();

    await conn.unsubscribe('sub13');
    await testsUtil.dropTable(conn, TABLE);
  }); // 185.13

  it('185.14 Multiple Inserts Trigger Notification', async () => {
    const TABLE = 'nodb_tab_cqn_10';
    let sql = `CREATE TABLE ${TABLE} (k NUMBER)`;
    await conn.execute(testsUtil.sqlCreateTable(TABLE, sql));

    const myCallback = function(message) {
      assert.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
      assert.strictEqual(message.registered, true);
      const table = message.queries[0].tables[0];
      assert.strictEqual(table.operation, oracledb.CQN_OPCODE_INSERT);
    };

    const options = {
      callback: myCallback,
      sql: `SELECT * FROM ${TABLE}`,
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_QUERY
    };

    await conn.subscribe('sub10', options);

    for (let i = 1; i <= 5; i++) {
      sql = `INSERT INTO ${TABLE} VALUES (${i})`;
      await conn.execute(sql);
    }

    await conn.commit();
    await conn.unsubscribe('sub10');
    await testsUtil.dropTable(conn, TABLE);
  }); // 185.14

  it('185.15 Update Operation Notification', async () => {
    const TABLE = 'nodb_tab_cqn_11';
    let sql = `CREATE TABLE ${TABLE} (k NUMBER)`;
    await conn.execute(testsUtil.sqlCreateTable(TABLE, sql));

    const myCallback = function(message) {
      assert.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
      assert.strictEqual(message.registered, true);
      const table = message.queries[0].tables[0];
      assert.strictEqual(table.operation, oracledb.CQN_OPCODE_UPDATE);
    };

    const options = {
      callback: myCallback,
      sql: `SELECT * FROM ${TABLE}`,
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_QUERY
    };

    await conn.subscribe('sub11', options);

    sql = `INSERT INTO ${TABLE} VALUES (200)`;
    await conn.execute(sql);

    sql = `UPDATE ${TABLE} SET k = k + 1 WHERE k = 200`;
    await conn.execute(sql);

    await conn.commit();

    await conn.unsubscribe('sub11');
    await testsUtil.dropTable(conn, TABLE);
  }); // 185.15

  it('185.16 Negative - Subscribe to Invalid Table', async () => {
    const myCallback = function(message) {
      assert(message);
    };

    const options = {
      callback: myCallback,
      sql: `SELECT * FROM non_existent_table`,
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_QUERY
    };

    await assert.rejects(
      async () => await conn.subscribe('sub12', options),
      /ORA-00942:/ //ORA-00942: table or view does not exist
    );
  }); // 185.16

  // Skipping these tests because of a subscription issue that cause segfault
  it.skip('185.17 CQN subscriptions using the same name with unsubscribe', async () => {
    const cqnCallback = function(message) {
      assert(message);
    };

    const subscriptions = [
      'SQL1',
      'SQL2',
    ];

    for (const subscription of subscriptions) {
      await conn.subscribe('cqn', {
        callback: cqnCallback,
        port: 5000,
        timeout: 24 * 60 * 60, // 24 hours
        qos: oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS,
        sql: subscription,
        operations: oracledb.CQN_OPCODE_INSERT | oracledb.CQN_OPCODE_UPDATE,
      });
      await conn.unsubscribe('cqn');
    }
  }); // 185.17

  // Skipping these tests because of a subscription issue that cause segfault
  describe.skip('185.18 multiple CQN Subscriptions with the Same Name', function() {
    let connection;
    const tableName = 'TestTable_CQN';
    const sql = `CREATE TABLE ${tableName} (
        id NUMBER GENERATED ALWAYS AS IDENTITY,
        data VARCHAR2(100)
      )`;

    // Promise to track if CQN messages have been processed
    let cqnMessageReceived = false;

    // CQN callback
    function cqnCallback(message) {
      cqnMessageReceived = true;
      assert.ok(message);
      assert.strictEqual(typeof message.type, 'number');
      assert.strictEqual(message.type, oracledb.CQN_EVENT_OBJCHANGE);
    }

    before(async function() {
      connection = await oracledb.getConnection({
        ...dbConfig,
        events: true,
      });

      await conn.execute(testsUtil.sqlCreateTable(tableName, sql));
      await connection.execute(`INSERT INTO ${tableName} (data) VALUES ('Initial data1')`);
      await connection.execute(`INSERT INTO ${tableName} (data) VALUES ('Initial data2')`);
      await connection.commit();
    });

    after(async function() {
      await connection.unsubscribe('cqn');

      await connection.execute(`DROP TABLE ${tableName} PURGE`);
      await connection.close();
    });

    it('185.18.1 allow multiple CQN subscriptions with the same name', async function() {
      const subscriptions = [
        `SELECT * FROM ${tableName} WHERE id = 1`,
        `SELECT * FROM ${tableName} WHERE id = 2`,
      ];

      for (const subscription of subscriptions) {
        await connection.subscribe('cqn', {
          callback: cqnCallback,
          qos: oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS,
          sql: subscription,
        });
      }

      let result = await connection.execute(`
      UPDATE ${tableName} SET data = 'Updated data1' WHERE id = 1
    `);
      await connection.commit();
      assert.strictEqual(result.rowsAffected, 1);

      result = await connection.execute(`
      UPDATE ${tableName} SET data = 'Updated data2' WHERE id = 2
    `);
      await connection.commit();
      assert.strictEqual(result.rowsAffected, 1);

      // Wait for CQN message to be processed
      const startTime = Date.now();
      while (!cqnMessageReceived && Date.now() - startTime < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms
      }
    }); // 185.18.1
  }); // 185.18

  // It has to be run with node option --expose_gc as global.gc is used.
  // Ex: node --expose_gc --trace-warnings /home/user/node_modules/mocha/lib/cli/cli.js
  // test/ext/release-check-tests/runCQN.js --t 0
  it('185.19 check memory leaks/corruptions in subscribe/unsubscribe in loop', async () => {

    const TABLE = 'nodb_tab_cqn_memloop';
    let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;
    const myCallback = function(message) {
      assert.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
      assert.strictEqual(message.registered, true);
      const table = message.queries[0].tables[0];
      const tableName = dbConfig.user.toUpperCase() + '.' + TABLE.toUpperCase();
      assert.strictEqual(table.name, tableName);
      assert.strictEqual(table.operation, oracledb.CQN_OPCODE_INSERT);
    };
    const options = {
      callback: myCallback,
      sql: `SELECT * FROM ${TABLE} WHERE k > :bv`,
      binds: { bv: 100 },
      timeout: 20,
      qos: oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS
    };

    await conn.execute(testsUtil.sqlCreateTable(TABLE, sql));
    const initialMemory = process.memoryUsage().rss;
    const iterations = 100; // increase this to large value to check mem leaks
    for (let i = 0; i < iterations; i++) {
      await conn.subscribe('sub1', options);
      sql = `INSERT INTO ${TABLE} VALUES (101)`;
      await conn.execute(sql);
      await conn.commit();
      await conn.unsubscribe('sub1');
      global.gc();
      await new Promise(r => setTimeout(r, 2000));
    }
    const finalMemory = process.memoryUsage().rss;
    console.log(`Memory before loop: ${initialMemory} bytes`);
    console.log(`Memory after loop:  ${finalMemory} bytes`);

    // one way to assert this difference is its not huge or linear if you plot.
    console.log(`Memory difference:  ${finalMemory - initialMemory} bytes`);
    await testsUtil.dropTable(conn, TABLE);
  }); // 185.19

}); // 185

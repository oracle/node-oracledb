/* Copyright (c) 2021, 2026, Oracle and/or its affiliates. */

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
 *   In Thick mode, this test will not run on macOS. The Thick mode
 *   server-initiated notification path requires the database to connect to
 *   the node-oracledb machine, which typically means that the machine running
 *   node-oracledb needs a fixed IP address. Thin mode uses client-initiated
 *   notifications and does not need that callback setup.
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
  let conn, connAsDBA, subscribeWithDefaults;

  before(async function() {
    if ((!dbConfig.test.DBA_PRIVILEGE) ||
        (!oracledb.thin && process.platform == 'darwin')) {
      isRunnable = false;
    }

    // Thin CQN uses the client-initiated EMON transport, available from
    // Oracle Database 19.4 onward.
    if (isRunnable && oracledb.thin && !(await testsUtil.checkPrerequisites(
      1904000000, 1904000000))) {
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

      const connectOptions = {...dbConfig};
      if (!oracledb.thin) {
        connectOptions.events = true;
      }
      conn = await oracledb.getConnection(connectOptions);

      subscribeWithDefaults = async function(name, options) {
        const subscribeOptions = {...options};
        if (oracledb.thin && subscribeOptions.clientInitiated === undefined)
          subscribeOptions.clientInitiated = true;
        return await conn.subscribe(name, subscribeOptions);
      };
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

  describe('185.1 Normal CQN operations', function() {

    it('185.1.1 examples/cqn1.js', async () => {
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

      await subscribeWithDefaults('sub1', options);

      // subscribe again with same sql should be no-op
      await subscribeWithDefaults('sub1', options);

      sql = `INSERT INTO ${TABLE} VALUES (101)`;
      await conn.execute(sql);

      await conn.commit();

      await conn.unsubscribe('sub1');

      await testsUtil.dropTable(conn, TABLE);
    }); // 185.1.1

    it('185.1.2 SQL Delete operation', async () => {

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
      await subscribeWithDefaults('sub2', options);
      sql = `INSERT INTO ${TABLE} VALUES (99)`;
      await conn.execute(sql);

      sql = `INSERT INTO ${TABLE} VALUES (102)`;
      await conn.execute(sql);

      sql = `DELETE FROM ${TABLE} WHERE k > :bv`;
      await conn.execute(sql, { bv: 100 });

      await conn.commit();

      await conn.unsubscribe('sub2');

      await testsUtil.dropTable(conn, TABLE);
    }); // 185.1.2

    it('185.1.3 Specify the notification only for INSERT operation', async () => {
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

      await subscribeWithDefaults('sub3', options);

      sql = `DELETE FROM ${TABLE} WHERE k > :bv`;
      await conn.execute(sql, { bv: 100 });

      sql = `INSERT INTO ${TABLE} VALUES (103)`;
      await conn.execute(sql);
      await conn.commit();

      await conn.unsubscribe('sub3');

      await testsUtil.dropTable(conn, TABLE);
    }); // 185.1.3

    it('185.1.4 Negative - provide invalid SQL in CQN option', async () => {
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
          await subscribeWithDefaults('sub4', options);
        },
        /(DPI-1087:|NJS-019:)/
      );
      // NJS-019 (Thin) / DPI-1087 (Thick): SQL is not a query.

    }); // 185.1.4

    it('185.1.5 examples/cqn2.js', async function() {
      if (oracledb.thin) {
        // Notification grouping is not supported with Thin client-initiated
        // CQN subscriptions.
        return this.skip();
      }

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

      await subscribeWithDefaults('sub5', options);

      sql = `INSERT INTO ${TABLE} VALUES (:1)`;
      const bindArr = [ [1], [2], [3], [4], [5], [6], [7] ];
      for (let i = 0; i < bindArr.length; i++) {
        await conn.execute(sql, bindArr[i], { autoCommit: true });
      }

      await conn.commit();

      await conn.unsubscribe('sub5');
      await testsUtil.dropTable(conn, TABLE);
    }); // 185.1.5

    it('185.1.6 Get the registration ID "regId" for subscriptions', async () => {
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

      const result = await subscribeWithDefaults('sub6', options);
      // subscribe() exposes a CQN registration ID as a JavaScript number.
      assert.strictEqual(typeof result.regId, 'number');

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
    }); // 185.1.6

    it('185.1.7 Negative - unsubscribe multiple times', async () => {
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

      await subscribeWithDefaults('sub7', options);

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
    }); // 185.1.7

    it('185.1.8 Negative - unsubscribe nonexistent subscriptions', async () => {
      await assert.rejects(
        async () => {
          await conn.unsubscribe('nonexist');
        },
        /NJS-061:/ // NJS-061: invalid subscription
      );
    }); // 185.1.8

    // A variation of 185.1.4
    it('185.1.9 Negative - unsubscribe the invalid subscription', async () => {
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
          await subscribeWithDefaults('sub9', options);
        },
        /(DPI-1087:|NJS-019:)/
      );
      // NJS-019 (Thin) / DPI-1087 (Thick): SQL is not a query.

      await assert.rejects(
        async () => {
          await conn.unsubscribe('sub9');
        },
        /NJS-061:/
      );
    }); // 185.1.9

    it('185.1.10 Notify on UPDATE operation', async () => {
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

      await subscribeWithDefaults('sub10', options);

      sql = `INSERT INTO ${TABLE} VALUES (1, 'Initial')`;
      await conn.execute(sql);

      sql = `UPDATE ${TABLE} SET v = 'Updated' WHERE k = 1`;
      await conn.execute(sql);

      await conn.commit();

      await conn.unsubscribe('sub10');
      await testsUtil.dropTable(conn, TABLE);
    }); // 185.1.10

    it('185.1.11 Notification grouping by message count', async function() {
      if (oracledb.thin) {
        // Notification grouping is not supported with Thin client-initiated
        // CQN subscriptions.
        return this.skip();
      }

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

      await subscribeWithDefaults('sub11', options);

      sql = `INSERT INTO ${TABLE} VALUES (:1)`;
      const bindArr = [ [1], [2], [3], [4], [5], [6] ];
      for (let i = 0; i < bindArr.length; i++) {
        await conn.execute(sql, bindArr[i], { autoCommit: true });
      }

      await conn.unsubscribe('sub11');
      await testsUtil.dropTable(conn, TABLE);
    }); // 185.1.11

    it('185.1.12 Notify for specific columns', async () => {
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

      await subscribeWithDefaults('sub12', options);

      sql = `INSERT INTO ${TABLE} VALUES (1, 'Initial')`;
      await conn.execute(sql);

      sql = `UPDATE ${TABLE} SET v = 'Updated' WHERE k = 1`;
      await conn.execute(sql);

      await conn.commit();

      await conn.unsubscribe('sub12');
      await testsUtil.dropTable(conn, TABLE);
    }); // 185.1.12

    it('185.1.13 Notify only on ROWID changes', async () => {
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

      await subscribeWithDefaults('sub13', options);

      sql = `INSERT INTO ${TABLE} VALUES (1)`;
      await conn.execute(sql);

      sql = `INSERT INTO ${TABLE} VALUES (2)`;
      await conn.execute(sql);

      await conn.commit();

      await conn.unsubscribe('sub13');
      await testsUtil.dropTable(conn, TABLE);
    }); // 185.1.13

    it('185.1.14 Multiple Inserts Trigger Notification', async () => {
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

      await subscribeWithDefaults('sub10', options);

      for (let i = 1; i <= 5; i++) {
        sql = `INSERT INTO ${TABLE} VALUES (${i})`;
        await conn.execute(sql);
      }

      await conn.commit();
      await conn.unsubscribe('sub10');
      await testsUtil.dropTable(conn, TABLE);
    }); // 185.1.14

    it('185.1.15 Update Operation Notification', async () => {
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

      await subscribeWithDefaults('sub11', options);

      sql = `INSERT INTO ${TABLE} VALUES (200)`;
      await conn.execute(sql);

      sql = `UPDATE ${TABLE} SET k = k + 1 WHERE k = 200`;
      await conn.execute(sql);

      await conn.commit();

      await conn.unsubscribe('sub11');
      await testsUtil.dropTable(conn, TABLE);
    }); // 185.1.15

    it('185.1.16 Negative - Subscribe to Invalid Table', async () => {
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
        async () => await subscribeWithDefaults('sub12', options),
        /ORA-00942:/ //ORA-00942: table or view does not exist
      );
    }); // 185.1.16

    // Skipping these tests because of a subscription issue that cause segfault
    it.skip('185.1.17 CQN subscriptions using the same name with unsubscribe', async () => {
      const cqnCallback = function(message) {
        assert(message);
      };

      const subscriptions = [
        'SQL1',
        'SQL2',
      ];

      for (const subscription of subscriptions) {
        await subscribeWithDefaults('cqn', {
          callback: cqnCallback,
          port: 5000,
          timeout: 24 * 60 * 60, // 24 hours
          qos: oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS,
          sql: subscription,
          operations: oracledb.CQN_OPCODE_INSERT | oracledb.CQN_OPCODE_UPDATE,
        });
        await conn.unsubscribe('cqn');
      }
    }); // 185.1.17
  }); // 185.1

  // Skipping these tests because of a subscription issue that cause segfault
  describe.skip('185.2 multiple CQN Subscriptions with the same name', function() {
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
      assert(message);
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

    it('185.2.1 allow multiple CQN subscriptions with the same name', async function() {
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
    }); // 185.2.1
  }); // 185.2

  // It has to be run with node option --expose_gc as global.gc is used.
  // Ex: node --expose_gc --trace-warnings /home/user/node_modules/mocha/lib/cli/cli.js
  // test/ext/release-check-tests/runCQN.js --t 0
  describe('185.3 subscribe/unsubscribe memory checks', function() {
    it('185.3.1 check memory leaks/corruptions in subscribe/unsubscribe in loop', async function() {
      if (typeof global.gc !== 'function') this.skip();

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
        await subscribeWithDefaults('sub1', options);
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
    }); // 185.3.1
  }); //185.3

  // These release-check tests wait for real CQN callbacks from the database.
  // They require CHANGE NOTIFICATION privilege, compatible database/client
  // versions, and working notification delivery. Since notification delivery
  // is asynchronous and environment-dependent, setup issues can appear as
  // intermittent waits, hangs, or timeout failures.
  describe('185.4 Extended CQN notification delivery', function() {

    const notificationTimeout = 30000;
    const nameSuffix = `${Date.now().toString(36)}${process.pid.toString(36)}`;

    function assertTableName(table, tableName) {
      const expectedName = `${dbConfig.user}.${tableName}`.toUpperCase();
      assert.strictEqual(table.name, expectedName);
    }

    function getSubName(name) {
      return `${name}_${nameSuffix}`;
    }

    function createNotificationTracker(expectedCount, verifyMessage,
      timeoutMs = notificationTimeout) {
      const messages = [];
      let settled = false;
      let resolveWait, rejectWait;
      const wait = new Promise((resolve, reject) => {
        resolveWait = resolve;
        rejectWait = reject;
      });
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          const message = `Timed out waiting for ${expectedCount} CQN `
            + `notification(s); received ${messages.length}`;
          rejectWait(new Error(message));
        }
      }, timeoutMs);

      return {
        callback(message) {
          if (settled) {
            return;
          }
          try {
            verifyMessage(message, messages.length);
            messages.push(message);
            if (messages.length === expectedCount) {
              settled = true;
              clearTimeout(timeout);
              resolveWait(messages);
            }
          } catch (err) {
            settled = true;
            clearTimeout(timeout);
            rejectWait(err);
          }
        },
        wait() {
          return wait;
        }
      };
    }

    it('185.4.1 DML and truncate notifications include ROWIDs', async function() {
      const tableName = 'nodb_tab_cqn_lifecycle';
      const subName = getSubName('cqn_lifecycle');
      const sql = `CREATE TABLE ${tableName} (
        k NUMBER,
        v VARCHAR2(50)
      )`;
      const tableOperations = [];
      const rowOperations = [];
      const rowids = [];
      const expectedTableOperations = [
        oracledb.CQN_OPCODE_INSERT,
        oracledb.CQN_OPCODE_UPDATE,
        oracledb.CQN_OPCODE_INSERT,
        oracledb.CQN_OPCODE_DELETE,
        oracledb.CQN_OPCODE_ALTER | oracledb.CQN_OPCODE_ALL_ROWS
      ];
      const expectedRowOperations = [
        oracledb.CQN_OPCODE_INSERT,
        oracledb.CQN_OPCODE_UPDATE,
        oracledb.CQN_OPCODE_INSERT,
        oracledb.CQN_OPCODE_DELETE
      ];
      const expectedRowids = [];
      let isSubscribed = false;

      await conn.execute(testsUtil.sqlCreateTable(tableName, sql));
      const notifications = createNotificationTracker(5, function(message) {
        assert.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE);
        assert.strictEqual(message.registered, true);
        assert(Buffer.isBuffer(message.txId));
        assert.strictEqual(message.txId.length, 8);
        assert.strictEqual(message.msgId, undefined);
        assert.strictEqual(message.queueName, undefined);
        assert.strictEqual(message.queries, undefined);
        assert.strictEqual(message.tables.length, 1);
        const table = message.tables[0];
        assertTableName(table, tableName);
        tableOperations.push(table.operation);
        for (const row of table.rows || []) {
          rowOperations.push(row.operation);
          rowids.push(row.rowid);
        }
      });

      try {
        await subscribeWithDefaults(subName, {
          callback: notifications.callback,
          sql: `SELECT * FROM ${tableName}`,
          timeout: 20,
          qos: oracledb.SUBSCR_QOS_ROWIDS
        });
        isSubscribed = true;
        await testsUtil.sleep(500);

        await conn.execute(`INSERT INTO ${tableName} VALUES (1, 'test')`);
        let result = await conn.execute(
          `SELECT ROWID FROM ${tableName} WHERE k = 1`
        );
        expectedRowids.push(result.rows[0][0]);
        await conn.commit();
        await testsUtil.sleep(500);

        await conn.execute(`UPDATE ${tableName} SET v = 'update' WHERE k = 1`);
        result = await conn.execute(
          `SELECT ROWID FROM ${tableName} WHERE k = 1`
        );
        expectedRowids.push(result.rows[0][0]);
        await conn.commit();
        await testsUtil.sleep(500);

        await conn.execute(`INSERT INTO ${tableName} VALUES (2, 'test2')`);
        result = await conn.execute(
          `SELECT ROWID FROM ${tableName} WHERE k = 2`
        );
        expectedRowids.push(result.rows[0][0]);
        await conn.commit();
        await testsUtil.sleep(500);

        await conn.execute(`DELETE FROM ${tableName} WHERE k = 2`);
        expectedRowids.push(expectedRowids[expectedRowids.length - 1]);
        await conn.commit();
        await testsUtil.sleep(500);

        await conn.execute(`TRUNCATE TABLE ${tableName}`);
        await notifications.wait();

        assert.deepStrictEqual(tableOperations, expectedTableOperations);
        assert.deepStrictEqual(rowOperations, expectedRowOperations);
        assert.deepStrictEqual(rowids, expectedRowids);
      } finally {
        if (isSubscribed) {
          await conn.unsubscribe(subName);
        }
        await testsUtil.dropTable(conn, tableName);
      }
    }); // 185.4.1

    it('185.4.2 query-level notifications include ROWIDs', async function() {
      const tableName = 'nodb_tab_cqn_query_lifecycle';
      const subName = getSubName('cqn_query_lifecycle');
      const sql = `CREATE TABLE ${tableName} (
        k NUMBER,
        v VARCHAR2(50)
      )`;
      const tableOperations = [];
      const rowOperations = [];
      const rowids = [];
      const expectedTableOperations = [
        oracledb.CQN_OPCODE_INSERT,
        oracledb.CQN_OPCODE_UPDATE,
        oracledb.CQN_OPCODE_INSERT,
        oracledb.CQN_OPCODE_DELETE,
        oracledb.CQN_OPCODE_ALTER | oracledb.CQN_OPCODE_ALL_ROWS
      ];
      const expectedRowOperations = [
        oracledb.CQN_OPCODE_INSERT,
        oracledb.CQN_OPCODE_UPDATE,
        oracledb.CQN_OPCODE_INSERT,
        oracledb.CQN_OPCODE_DELETE
      ];
      const expectedRowids = [];
      let isSubscribed = false;

      await conn.execute(testsUtil.sqlCreateTable(tableName, sql));
      const notifications = createNotificationTracker(5, function(message) {
        assert.strictEqual(message.type,
          oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
        assert.strictEqual(message.registered, true);
        assert.strictEqual(message.msgId, undefined);
        assert.strictEqual(message.queueName, undefined);
        assert.strictEqual(message.tables, undefined);
        assert.strictEqual(message.queries.length, 1);
        if (oracledb.thin) {
          assert(message.queries[0].id > 0n);
        }
        assert.strictEqual(message.queries[0].tables.length, 1);
        const table = message.queries[0].tables[0];
        assertTableName(table, tableName);
        tableOperations.push(table.operation);
        for (const row of table.rows || []) {
          rowOperations.push(row.operation);
          rowids.push(row.rowid);
        }
      });

      try {
        await subscribeWithDefaults(subName, {
          callback: notifications.callback,
          sql: `SELECT * FROM ${tableName} WHERE k > :bv`,
          binds: { bv: 0 },
          // This test performs several DML/commit cycles; allow slower
          // database environments to complete before registration expires.
          timeout: 60,
          qos: oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS
        });
        isSubscribed = true;
        await testsUtil.sleep(500);

        await conn.execute(`INSERT INTO ${tableName} VALUES (1, 'test')`);
        let result = await conn.execute(
          `SELECT ROWID FROM ${tableName} WHERE k = 1`
        );
        expectedRowids.push(result.rows[0][0]);
        await conn.commit();
        await testsUtil.sleep(500);

        await conn.execute(`UPDATE ${tableName} SET v = 'update' WHERE k = 1`);
        result = await conn.execute(
          `SELECT ROWID FROM ${tableName} WHERE k = 1`
        );
        expectedRowids.push(result.rows[0][0]);
        await conn.commit();
        await testsUtil.sleep(500);

        await conn.execute(`INSERT INTO ${tableName} VALUES (2, 'test2')`);
        result = await conn.execute(
          `SELECT ROWID FROM ${tableName} WHERE k = 2`
        );
        expectedRowids.push(result.rows[0][0]);
        await conn.commit();
        await testsUtil.sleep(500);

        await conn.execute(`DELETE FROM ${tableName} WHERE k = 2`);
        expectedRowids.push(expectedRowids[expectedRowids.length - 1]);
        await conn.commit();
        await testsUtil.sleep(500);

        await conn.execute(`TRUNCATE TABLE ${tableName}`);
        await notifications.wait();

        assert.deepStrictEqual(tableOperations, expectedTableOperations);
        assert.deepStrictEqual(rowOperations, expectedRowOperations);
        assert.deepStrictEqual(rowids, expectedRowids);
      } finally {
        if (isSubscribed) {
          await conn.unsubscribe(subName);
        }
        await testsUtil.dropTable(conn, tableName);
      }
    }); // 185.4.2

    it('185.4.3 handles CQN timeout deregistration',
      async function() {
        // On 19c, a client-initiated CQN registration expires at its timeout,
        // but EMON does not reliably receive the terminal DEREG callback.
        // This test specifically requires that callback, so skip 19c.
        if (conn.oracleServerVersion >= 1900000000 &&
            conn.oracleServerVersion < 2000000000) {
          this.skip();
        }

        const tableName = 'nodb_tab_cqn_timeout_dereg';
        const subName = getSubName('cqn_timeout_dereg');
        let isSubscribed = false;

        await conn.execute(testsUtil.sqlCreateTable(tableName,
          `CREATE TABLE ${tableName} (k NUMBER)`));
        const notifications = createNotificationTracker(1, function(message) {
          assert.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_DEREG);
          assert.strictEqual(message.registered, false);
        }, 60000);

        try {
          await subscribeWithDefaults(subName, {
            callback: notifications.callback,
            sql: `SELECT * FROM ${tableName}`,
            timeout: 1,
            qos: oracledb.SUBSCR_QOS_QUERY
          });
          isSubscribed = true;
          await notifications.wait();
          // The database has sent terminal DEREG, so cleanup must not issue a
          // second unsubscribe if the mode-specific check below fails.
          isSubscribed = false;

          if (oracledb.thin) {
            // Thin removes the public subscription entry after DEREG.
            await assert.rejects(
              async () => await conn.unsubscribe(subName),
              /NJS-061:/
            );
          } else {
            // OCI treats unsubscribe after timeout deregistration as a no-op.
            await conn.unsubscribe(subName);
          }
        } finally {
          if (isSubscribed) {
            await conn.unsubscribe(subName);
          }
          await testsUtil.dropTable(conn, tableName);
        }
      }); // 185.4.3

    it('185.4.4 keeps a CQN subscription active after its pool connection is released',
      async function() {
        const tableName = 'nodb_tab_cqn_pool';
        const subName = getSubName('cqn_pool');
        const poolOptions = {...dbConfig, poolMin: 0, poolMax: 2};
        if (!oracledb.thin) {
          poolOptions.events = true;
        }
        const pool = await oracledb.createPool(poolOptions);
        let subscribeConn, workConn, isSubscribed = false;
        const notifications = createNotificationTracker(1, function(message) {
          assert.strictEqual(message.registered, true);
          assertTableName(message.queries[0].tables[0], tableName);
        });

        await conn.execute(testsUtil.sqlCreateTable(tableName,
          `CREATE TABLE ${tableName} (k NUMBER)`));
        try {
          subscribeConn = await pool.getConnection();
          const options = {
            callback: notifications.callback,
            sql: `SELECT * FROM ${tableName}`,
            timeout: 20,
            qos: oracledb.SUBSCR_QOS_QUERY
          };
          if (oracledb.thin) {
            options.clientInitiated = true;
          }
          await subscribeConn.subscribe(subName, options);
          isSubscribed = true;
          await subscribeConn.close();
          subscribeConn = null;
          await testsUtil.sleep(500);

          workConn = await pool.getConnection();
          await workConn.execute(`INSERT INTO ${tableName} VALUES (1)`);
          await workConn.commit();
          await notifications.wait();
          await workConn.unsubscribe(subName);
          isSubscribed = false;
        } finally {
          if (subscribeConn) {
            await subscribeConn.close();
          }
          if (workConn) {
            if (isSubscribed) {
              await workConn.unsubscribe(subName);
              isSubscribed = false;
            }
            await workConn.close();
          }
          await pool.close();
          await testsUtil.dropTable(conn, tableName);
        }
      }); // 185.4.4

    it('185.4.5 unsubscribes CQN before releasing its pool connection',
      async function() {
        const tableName = 'nodb_tab_cqn_pool_unsubscribe';
        const subName = getSubName('cqn_pool_unsubscribe');
        const poolOptions = {...dbConfig, poolMin: 0, poolMax: 1};
        if (!oracledb.thin) {
          poolOptions.events = true;
        }
        let pool, subscribeConn, isSubscribed = false;

        await conn.execute(testsUtil.sqlCreateTable(tableName,
          `CREATE TABLE ${tableName} (k NUMBER)`));
        try {
          pool = await oracledb.createPool(poolOptions);
          subscribeConn = await pool.getConnection();
          const options = {
            callback: function(message) {
              assert(message);
            },
            sql: `SELECT * FROM ${tableName}`,
            timeout: 20,
            qos: oracledb.SUBSCR_QOS_QUERY
          };
          if (oracledb.thin) {
            options.clientInitiated = true;
          }

          // Create and remove the subscription on the same pool checkout.
          await subscribeConn.subscribe(subName, options);
          isSubscribed = true;
          await subscribeConn.unsubscribe(subName);
          isSubscribed = false;

          // The removed subscription is no longer tracked by the driver.
          await assert.rejects(
            async () => await subscribeConn.unsubscribe(subName),
            /(NJS-061:|DPI-1002:)/
          );

          // The connection can now be released and its pool closed cleanly.
          await subscribeConn.close();
          subscribeConn = null;
          await pool.close();
          pool = null;
        } finally {
          if (subscribeConn) {
            if (isSubscribed) {
              await subscribeConn.unsubscribe(subName);
            }
            await subscribeConn.close();
          }
          if (pool) {
            await pool.close();
          }
          await testsUtil.dropTable(conn, tableName);
        }
      }); // 185.4.5

    it('185.4.6 handles CQN notifications split across 512-byte SDUs',
      async function() {
        // On 19c, EMON does not reliably receive the continuation packets for
        // a CQN notification fragmented by the minimum 512-byte SDU. Normal
        // CQN delivery works; this test needs the split-packet payload.
        // Later database releases deliver and decode this payload correctly.
        if (oracledb.thin && conn.oracleServerVersion >= 1900000000 &&
            conn.oracleServerVersion < 2000000000) {
          this.skip();
        }

        const tableName = 'nodb_tab_cqn_sdu';
        const subName = getSubName('cqn_sdu');
        const rowCount = 40;
        const sql = `CREATE TABLE ${tableName} (
          k NUMBER,
          v VARCHAR2(100)
        )`;
        const connectOptions = {...dbConfig, sdu: 512};
        if (!oracledb.thin) {
          connectOptions.events = true;
        }
        const sduConn = await oracledb.getConnection(connectOptions);
        let isSubscribed = false;
        const notifications = createNotificationTracker(1, function(message) {
          assert.strictEqual(message.type,
            oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
          assert.strictEqual(message.tables, undefined);
          assert.strictEqual(message.queries.length, 1);
          assert.strictEqual(message.queries[0].tables.length, 1);
          const table = message.queries[0].tables[0];
          assertTableName(table, tableName);
          assert(table.rows.length >= rowCount);
        });

        await sduConn.execute(testsUtil.sqlCreateTable(tableName, sql));
        try {
          const subscribeOptions = {
            callback: notifications.callback,
            sql: `SELECT * FROM ${tableName}`,
            qos: oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS,
            timeout: 20
          };
          if (oracledb.thin) {
            subscribeOptions.clientInitiated = true;
          }
          await sduConn.subscribe(subName, subscribeOptions);
          isSubscribed = true;
          await testsUtil.sleep(500);

          // The notification contains one ROWID entry per changed row. Forty
          // entries make the CQN notification larger than the 512-byte SDU.
          const binds = [];
          for (let i = 1; i <= rowCount; i++) {
            binds.push([i, 'x']);
          }
          await sduConn.executeMany(
            `INSERT INTO ${tableName} (k, v) VALUES (:1, :2)`, binds);
          await sduConn.commit();
          await notifications.wait();
        } finally {
          if (isSubscribed) {
            await sduConn.unsubscribe(subName);
          }
          await testsUtil.dropTable(sduConn, tableName);
          await sduConn.close();
        }
      }); // 185.4.6

  }); // 185.4

}); // 185

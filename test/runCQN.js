/* Copyright (c) 2019, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   185. runCQN.js
 *
 * DESCRIPTION
 *   Test Continuous Query Notification (CQN).
 *
 *   To keep it simple, this test will not run on my macOS. Because the database
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
const should    = require('should');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('185. runCQN.js', function() {

  let isRunnable = true;
  let conn, connAsDBA;

  before(async function() {
    if ( (!dbconfig.test.DBA_PRIVILEGE) || (process.platform == 'darwin') ) {
      isRunnable = false;
    }

    if (!isRunnable) {
      this.skip();
      return;
    } else {

      try {

        let credential = {
          user:          dbconfig.test.DBA_user,
          password:      dbconfig.test.DBA_password,
          connectString: dbconfig.connectString,
          privilege:     oracledb.SYSDBA
        };
        connAsDBA = await oracledb.getConnection(credential);

        let sql = `GRANT CHANGE NOTIFICATION TO ${dbconfig.user}`;
        await connAsDBA.execute(sql);

        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true
        });

      } catch (err) {
        should.not.exist(err);
      }

    }
  }); // before()

  after(async function() {
    if (!isRunnable) {
      return;
    } else {
      try {

        let sql = `REVOKE CHANGE NOTIFICATION FROM ${dbconfig.user}`;
        await connAsDBA.execute(sql);

        await conn.close();
        await connAsDBA.close();
      } catch (err) {
        should.not.exist(err);
      }
    }
  }); // after()

  it('185.1 examples/cqn1.js', async () => {

    try {
      const TABLE = 'nodb_tab_cqn_1';
      let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;
      let plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

      const myCallback = async function(message) {
        // console.log(message);
        should.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
        should.strictEqual(message.registered, true);
        const table = message.queries[0].tables[0];
        const tableName = dbconfig.user.toUpperCase() + '.' + TABLE.toUpperCase();
        should.strictEqual(table.name, tableName);
        should.strictEqual(table.operation, oracledb.CQN_OPCODE_INSERT);
      };

      const options = {
        callback : myCallback,
        sql: `SELECT * FROM ${TABLE} WHERE k > :bv`,
        binds: { bv : 100 },
        timeout : 20,
        qos : oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS
      };

      await conn.subscribe('mysub', options);

      sql = `INSERT INTO ${TABLE} VALUES (101)`;
      await conn.execute(sql);

      plsql = `BEGIN DBMS_SESSION.SLEEP(2); END;`;
      await conn.execute(plsql);
      await conn.commit();

      await conn.unsubscribe('mysub');

      sql = `DROP TABLE ${TABLE} PURGE`;
      await conn.execute(sql);
    } catch (err) {
      should.not.exist(err);
    }

  }); // 185.1

  it('185.2 SQL Delete operation', async () => {
    try {

      const TABLE = 'nodb_tab_cqn_2';
      let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;
      let plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

      const myCallback = async function(message) {
        console.log(message);
        should.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
        should.strictEqual(message.registered, true);
        const table = message.queries[0].tables[0];
        const tableName = dbconfig.user.toUpperCase() + '.' + TABLE.toUpperCase();
        should.strictEqual(table.name, tableName);
        should.strictEqual(table.operation, oracledb.CQN_OPCODE_DELETE);
      };

      const options = {
        callback : myCallback,
        sql: `SELECT * FROM ${TABLE}`,
        timeout : 20,
        qos : oracledb.SUBSCR_QOS_QUERY
      };
      await conn.subscribe('sub2', options);

      sql = `DELETE FROM ${TABLE} WHERE k > :bv`;
      await conn.execute(sql, { bv : 100 });

      plsql = `BEGIN DBMS_SESSION.SLEEP(2); END;`;
      await conn.execute(plsql);
      await conn.commit();

      await conn.unsubscribe('sub2');

      sql = `DROP TABLE ${TABLE} PURGE`;
      await conn.execute(sql);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 185.2

  it('185.3 Specify the notification only for INSERT operation', async() => {
    try {

      const TABLE = 'nodb_tab_cqn_3';
      let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;
      let plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

      const myCallback = async function(message) {
        // console.log(message);
        should.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
        should.strictEqual(message.registered, true);
        const table = message.queries[0].tables[0];
        const tableName = dbconfig.user.toUpperCase() + '.' + TABLE.toUpperCase();
        should.strictEqual(table.name, tableName);
        let expect = oracledb.CQN_OPCODE_INSERT | oracledb.CQN_OPCODE_ALL_ROWS;
        should.strictEqual(table.operation, expect);
      };

      const options = {
        callback : myCallback,
        sql: `SELECT * FROM ${TABLE}`,
        timeout : 20,
        qos : oracledb.SUBSCR_QOS_QUERY,
        operations: oracledb.CQN_OPCODE_INSERT
      };

      await conn.subscribe('sub3', options);

      sql = `DELETE FROM ${TABLE} WHERE k > :bv`;
      await conn.execute(sql, { bv : 100 });

      sql = `INSERT INTO ${TABLE} VALUES (103)`;
      await conn.execute(sql);

      plsql = `BEGIN DBMS_SESSION.SLEEP(2); END;`;
      await conn.execute(plsql);
      await conn.commit();

      await conn.unsubscribe('sub3');

      sql = `DROP TABLE ${TABLE} PURGE`;
      await conn.execute(sql);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 185.3

  it('185.4 Negative - provide invalid SQL in CQN option', async() => {
    try {
      const TABLE = 'nodb_tab_cqn_4';
      const myCallback = async function(message) {
        console.log(message);
      };

      const options = {
        callback : myCallback,
        sql: `DELETE FROM ${TABLE} WHERE k > :bv`,
        binds: { bv : 100 },
        timeout : 20,
        qos : oracledb.SUBSCR_QOS_QUERY
      };

      await assert.rejects(
        async () => {
          await conn.subscribe('sub4', options);
        },
        /DPI-1013/
      );
      // DPI-1013: not supported

    } catch (err) {
      should.not.exist(err);
    }
  }); // 185.4

  it('185.5 examples/cqn2.js', async () => {
    try {

      const TABLE = 'nodb_tab_cqn_5';
      let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;
      let plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

      const myCallback = async function(message) {
        // console.log(message);
        should.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE);
        should.strictEqual(message.registered, true);
      };

      const options = {
        callback : myCallback,
        sql: `SELECT * FROM ${TABLE}`,
        timeout : 60,
        qos : oracledb.SUBSCR_QOS_ROWIDS,
        // Group notifications in batches covering 2 second
        // intervals, and send a summary
        groupingClass : oracledb.SUBSCR_GROUPING_CLASS_TIME,
        groupingValue : 2,
        groupingType  : oracledb.SUBSCR_GROUPING_TYPE_SUMMARY
      };

      await conn.subscribe('sub5', options);

      sql = `INSERT INTO ${TABLE} VALUES (:1)`;
      let bindArr = [ [1], [2], [3], [4], [5], [6], [7] ];
      for (let i = 0; i < bindArr.length; i++) {
        await conn.execute(sql, bindArr[i], { autoCommit: true });
      }

      plsql = `BEGIN DBMS_SESSION.SLEEP(2); END;`;
      await conn.execute(plsql);
      await conn.commit();

      await conn.unsubscribe('sub5');

      sql = `DROP TABLE ${TABLE} PURGE`;
      await conn.execute(sql);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 185.5

  it('185.6 Get the registration ID "regId" for subscriptions', async () => {
    try {
      const TABLE = 'nodb_tab_cqn_6';
      let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;
      let plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

      const myCallback = async function(message) {
        // console.log(message);
        should.strictEqual(message.registered, true);
      };

      const options = {
        callback : myCallback,
        sql: `SELECT * FROM ${TABLE} WHERE k > :bv`,
        binds: { bv : 100 },
        timeout : 20,
        qos : oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS
      };

      let sleepPLSQL = `BEGIN DBMS_SESSION.SLEEP(2); END;`;
      await conn.execute(plsql);
      await conn.commit();

      const result = await conn.subscribe('sub6', options);
      (result.regId).should.be.a.Number();

      const tableName = dbconfig.user.toUpperCase() + '.' + TABLE.toUpperCase();
      sql = `SELECT regid FROM USER_CHANGE_NOTIFICATION_REGS
               WHERE table_name = '${tableName}'`;
      const res = await conn.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      should.strictEqual(result.regId, res.rows[0].REGID);

      sql = `INSERT INTO ${TABLE} VALUES (101)`;
      await conn.execute(sql);

      await conn.execute(sleepPLSQL);
      await conn.commit();

      await conn.unsubscribe('sub6');

      sql = `DROP TABLE ${TABLE} PURGE`;
      await conn.execute(sql);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 185.6

  it('185.7 Negative - unsubscribe multiple times', async () => {
    try {
      const TABLE = 'nodb_tab_cqn_7';
      let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;
      let plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

      const myCallback = async function(message) {
        // console.log(message);
        should.strictEqual(message.registered, true);
      };

      const options = {
        callback : myCallback,
        sql: `SELECT * FROM ${TABLE} WHERE k > :bv`,
        binds: { bv : 100 },
        timeout : 20,
        qos : oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS
      };

      await conn.subscribe('sub7', options);

      sql = `INSERT INTO ${TABLE} VALUES (101)`;
      await conn.execute(sql);

      plsql = `BEGIN DBMS_SESSION.SLEEP(2); END;`;
      await conn.execute(plsql);
      await conn.commit();

      await conn.unsubscribe('sub7');

      sql = `DROP TABLE ${TABLE} PURGE`;
      await conn.execute(sql);

      await assert.rejects(
        async () => {
          await conn.unsubscribe('sub7');
        },
        /NJS-061/
      );
      // NJS-061: invalid subscription
    } catch (err) {
      should.not.exist(err);
    }

  }); // 185.7

  it('185.8 Negative - unsubscribe nonexistent subscriptions', async () => {
    try {
      await assert.rejects(
        async () => {
          await conn.unsubscribe('nonexist');
        },
        /NJS-061/
      );
      // NJS-061: invalid subscription
    } catch (err) {
      should.not.exist(err);
    }
  }); // 185.8

  // An variation of 185.4
  it('185.9 Negative - unsubscribe the invalid subscription', async () => {
    try {
      const TABLE = 'nodb_tab_cqn_9';
      const myCallback = async function(message) {
        console.log(message);
      };

      const options = {
        callback : myCallback,
        sql: `DELETE FROM ${TABLE} WHERE k > :bv`,
        binds: { bv : 100 },
        timeout : 20,
        qos : oracledb.SUBSCR_QOS_QUERY
      };

      await assert.rejects(
        async () => {
          await conn.subscribe('sub9', options);
        },
        /DPI-1013/
      );
      // DPI-1013: not supported

      await conn.unsubscribe('sub9');

    } catch (err) {
      should.not.exist(err);
    }
  }); // 185.9

});

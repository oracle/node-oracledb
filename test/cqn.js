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
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   185. cqn.js
 *
 * DESCRIPTION
 *   The functionality tests on CQN.
 *
 *   The test suite will skip this test file if the current platform is OSX.
 *   Because CQN on OSX requires extra networks configurations that is
 *   not covered by the test script.
 *
 *   Case 185.1.4 will try to get local IP address to specifiy the address
 *   that the subscription should listen to receive notifications. If the
 *   script failed to get local IP address, this case is skipped.
 *
 *   For now, this whole test file is skipped because of bug 29277021 may
 *   generate segment fault upon CQN unsbuscription. Will remove the skip
 *   mark after bug 29277021 is fixed.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

let REGULAR_CALLBACK_TIMEOUT = 10;
let REGULAR_CALLBACK_TIMEOUT_MS = 10000;

const PACKAGE_USER = dbconfig.user.toUpperCase();

describe.skip('185. cqn.js', function () {

  let callbackMsg = [];
  let localIPAddress = undefined;

  let timeoutID, timeoutResolve;

  async function addChangeNotificationPriv(username) {
    if (dbconfig.test.DBA_PRIVILEGE) {
      let conn;
      try {
        conn = await oracledb.getConnection({
          user: dbconfig.test.DBA_user,
          password: dbconfig.test.DBA_password,
          connectString: dbconfig.connectString,
          privilege: oracledb.SYSDBA,
        });
        await conn.execute(`GRANT CHANGE NOTIFICATION TO ${username}`);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    } else {
      throw (`Privilege CHANGE NOTIFICATION is not granted to user ${username}, but DBA user is not provided`);
    }
  }

  async function revokeChangeNotificationPriv(username) {
    if (dbconfig.test.DBA_PRIVILEGE) {
      let conn;
      try {
        conn = await oracledb.getConnection({
          user: dbconfig.test.DBA_user,
          password: dbconfig.test.DBA_password,
          connectString: dbconfig.connectString,
          privilege: oracledb.SYSDBA,
        });
        await conn.execute(`REVOKE CHANGE NOTIFICATION FROM ${username}`);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    } else {
      throw (`Privilege CHANGE NOTIFICATION is granted to user ${username}, but DBA user is not provided`);
    }
  }

  async function checkNotificationPriv(conn) {
    try {
      const res = await conn.execute(`select PRIVILEGE from USER_SYS_PRIVS`);
      if (res && res.rows.length > 0) {
        for (let i = 0; i < res.rows.length; i++) {
          if (res.rows[i][0] === 'CHANGE NOTIFICATION') return true;
        }
      }
      return false;
    } catch (err) {
      should.not.exist(err);
      return false;
    }
  }

  async function truncateTable() {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      await conn.execute("truncate table cqn_test_table");
      await conn.execute("truncate table cqn_test_table_2");
    } catch (err) {
      should.not.exist(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }

  /*
   * Parameters:
   * requestedValue: string to be inserted to requested_value column
   * conn: If provided a connection object, then use the given connection to execute the insert; If undefined, create a new connection to execute the insert
   * tableName: Name of table to be inserted, by default is "cqn_test_table"
   * isCommitRequired: Whether to perform commit after the insert operation, by default is true
   * times: Number of times to perform the insert, by default is 1
   */
  async function insertStringIntoTestTable(requestedValue, conn=undefined, tableName="cqn_test_table", isCommitRequired=true, times=1) {
    let createNewConnection = !Boolean(conn);
    for (let i = 0; i < times; i++) {
      try {
        if (createNewConnection) conn = await oracledb.getConnection(dbconfig);
        await conn.execute(`insert into ${tableName} values ('${requestedValue}', systimestamp)`);
        if (isCommitRequired) await conn.commit();
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (createNewConnection) {
          try {
            await conn.close();
          } catch (err) {
            should.not.exist(err);
          }
        }
      }
    }
  }

  async function updateTimestampsOfTestTable(str, conn=undefined, times=1) {
    let createNewConnection = !Boolean(conn);
    for (let i = 0; i < times; i++) {
      try {
        if (createNewConnection) conn = await oracledb.getConnection(dbconfig);
        await conn.execute(`update cqn_test_table set fixup_timestamp = systimestamp where requested_value = '${str}'`);
        await conn.execute(`commit`);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (createNewConnection) {
          try {
            await conn.close();
          } catch (err) {
            should.not.exist(err);
          }
        }
      }
    }
  }

  function sleep(ms, isInterruptable=false) {
    return new Promise(resolve => {
      if (isInterruptable) {
        timeoutResolve = resolve;
        timeoutID = setTimeout(resolve, ms);
      } else {
        setTimeout(resolve, ms);
      }
    });
  }

  function cqnEventCallback(message) {
    callbackMsg.push(message);
    clearTimeout(timeoutID);
    if (timeoutResolve) timeoutResolve();

    if (dbconfig.test.printDebugMsg) {
      console.log("Message type:", message.type);
      if (message.type == oracledb.SUBSCR_EVENT_TYPE_DEREG) {
        console.log("Deregistration has taken place...");
        return;
      }
      console.log("Message database name:", message.dbName);
      console.log("Message transaction id:", message.txId);
      if (message.tables) {
        for (let i = 0; i < message.tables.length; i++) {
          let table = message.tables[i];
          console.log("--> Table Name:", table.name);
          console.log("--> Table Operation:", table.operation);
          if (table.rows) {
            for (let j = 0; j < table.rows.length; j++) {
              let row = table.rows[j];
              console.log("--> --> Row Rowid:", row.rowid);
              console.log("--> --> Row Operation:", row.operation);
              console.log(Array(61).join("-"));
            }
          }
        }
      } else if (message.queries) {
        for (let i = 0; i < message.queries.length; i++) {
          console.log("--> Query Number:", i);
          let tables = message.queries[i].tables;
          for (let i = 0; i < tables.length; i++) {
            let table = tables[i];
            console.log("--> --> Table Name:", table.name);
            console.log("--> --> Table Operation:", table.operation);
            if (table.rows) {
              for (let j = 0; j < table.rows.length; j++) {
                let row = table.rows[j];
                console.log("--> --> --> Row Rowid:", row.rowid);
                console.log("--> --> --> Row Operation:", row.operation);
                console.log(Array(61).join("-"));
              }
            }
          }
        }
      }
      console.log(Array(61).join("="));
    }
  }

  before(async function () {
    if (dbconfig.test.platform === "osx") this.skip();
    let conn;
    try {
      localIPAddress = testsUtil.getLocalIPAddress();
      conn = await oracledb.getConnection(dbconfig);
      if (!await checkNotificationPriv(conn)) {
        await addChangeNotificationPriv(dbconfig.user);
      }
      let sql = "BEGIN \n" +
        "    DECLARE \n" +
        "        e_table_missing EXCEPTION; \n" +
        "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
        "    BEGIN \n" +
        "        EXECUTE IMMEDIATE('DROP TABLE cqn_test_table PURGE'); \n" +
        "    EXCEPTION \n" +
        "        WHEN e_table_missing \n" +
        "        THEN NULL; \n" +
        "    END; \n" +
        "    EXECUTE IMMEDIATE (' \n" +
        "        CREATE TABLE cqn_test_table ( \n" +
        "            requested_value  varchar2(250), \n" +
        "            fixup_timestamp  timestamp \n" +
        "        ) \n" +
        "    '); \n" +
        "END; ";
      await conn.execute(sql);
      sql = "BEGIN \n" +
        "    DECLARE \n" +
        "        e_table_missing EXCEPTION; \n" +
        "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
        "    BEGIN \n" +
        "        EXECUTE IMMEDIATE('DROP TABLE cqn_test_table_2 PURGE'); \n" +
        "    EXCEPTION \n" +
        "        WHEN e_table_missing \n" +
        "        THEN NULL; \n" +
        "    END; \n" +
        "    EXECUTE IMMEDIATE (' \n" +
        "        CREATE TABLE cqn_test_table_2 ( \n" +
        "            requested_value  varchar2(250), \n" +
        "            fixup_timestamp  timestamp \n" +
        "        ) \n" +
        "    '); \n" +
        "END; ";
      await conn.execute(sql);
      REGULAR_CALLBACK_TIMEOUT_MS = await testsUtil.measureNetworkRoundTripTime() * 2;
      REGULAR_CALLBACK_TIMEOUT = Math.ceil(REGULAR_CALLBACK_TIMEOUT_MS/1000);
    } catch (err) {
      should.not.exist(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  });

  beforeEach(async function () {
    callbackMsg = [];
    await truncateTable();
  });

  afterEach(function () {
    clearTimeout(timeoutID);
  });

  describe('185.1 Positive Cases', function () {

    it('185.1.1 Register simple callback and unsubscribe', async function() {
      let conn;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        const subscribeOptions = {
          sql: "select * from cqn_test_table",
          callback: cqnEventCallback,
        }
        await conn.subscribe('sub1', subscribeOptions);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.unsubscribe('sub1');
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('185.1.2 Register callback then insert using the same connection', async function() {
      let conn;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        const subscribeOptions = {
          sql: "select * from cqn_test_table",
          callback: cqnEventCallback,
        }
        await conn.subscribe('sub1', subscribeOptions);
        await insertStringIntoTestTable('testStr1', conn);
        await sleep(REGULAR_CALLBACK_TIMEOUT_MS);

        const msg = callbackMsg.pop();
        should.exist(msg);
        should.strictEqual(msg.type, oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE);
        should.strictEqual(msg.tables.length, 1);
        should.strictEqual(msg.tables[0].name, `${PACKAGE_USER}.CQN_TEST_TABLE`);
        should.strictEqual(msg.tables[0].operation, oracledb.CQN_OPCODE_ALL_ROWS | oracledb.CQN_OPCODE_INSERT);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.unsubscribe('sub1');
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('185.1.3 Register callback then insert using different connection', async function() {
      let conn;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        const subscribeOptions = {
          sql: "select * from cqn_test_table",
          callback: cqnEventCallback,
        }
        await conn.subscribe('sub1', subscribeOptions);
        await insertStringIntoTestTable('testStr1');
        await sleep(REGULAR_CALLBACK_TIMEOUT_MS);

        const msg = callbackMsg.pop();
        should.exist(msg);
        should.strictEqual(msg.type, oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE);
        should.strictEqual(msg.tables.length, 1);
        should.strictEqual(msg.tables[0].name, `${PACKAGE_USER}.CQN_TEST_TABLE`);
        should.strictEqual(msg.tables[0].operation, oracledb.CQN_OPCODE_ALL_ROWS | oracledb.CQN_OPCODE_INSERT);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.unsubscribe('sub1');
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('185.1.4 Register callback specifiing local IP address and port number', async function() {
      if (!localIPAddress) this.skip();
      let conn;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        const subscribeOptions = {
          sql: "select * from cqn_test_table",
          ipAddress: localIPAddress[0].address,
          port: 0,  // Assign a random port by OS
          callback: cqnEventCallback,
        }
        await conn.subscribe('sub1', subscribeOptions);
        await insertStringIntoTestTable('testStr1', conn);
        await sleep(REGULAR_CALLBACK_TIMEOUT_MS);
        const msg = callbackMsg.pop();
        should.exist(msg);
        should.strictEqual(msg.type, oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE);
        should.strictEqual(msg.tables.length, 1);
        should.strictEqual(msg.tables[0].name, `${PACKAGE_USER}.CQN_TEST_TABLE`);
        should.strictEqual(msg.tables[0].operation, oracledb.CQN_OPCODE_ALL_ROWS | oracledb.CQN_OPCODE_INSERT);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.unsubscribe('sub1');
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('185.1.5 Register callback specifiing timeout', async function() {
      let conn, unsubscribeFailed = true;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        const subscribeOptions = {
          sql: "select * from cqn_test_table",
          timeout: 1,
          callback: cqnEventCallback,
        }
        await conn.subscribe('sub1', subscribeOptions);
        await sleep(REGULAR_CALLBACK_TIMEOUT_MS < 1000? 4000: REGULAR_CALLBACK_TIMEOUT_MS * 4);
        const msg = callbackMsg.pop();
        should.exist(msg);
        should.strictEqual(msg.type, oracledb.SUBSCR_EVENT_TYPE_DEREG);
        should.strictEqual(msg.registered, false);
        unsubscribeFailed = false;
      } catch (err) {
        should.not.exist(err);
        clearInterval(interval);
      } finally {
        if (conn) {
          try {
            if (unsubscribeFailed) await conn.unsubscribe('sub1');
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('185.1.6 Register callback limiting operation', async function() {
      let conn;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        const subscribeOptions = {
          sql: "select * from cqn_test_table",
          operations: oracledb.CQN_OPCODE_INSERT,
          callback: cqnEventCallback,
        }
        await conn.subscribe('sub1', subscribeOptions);
        await insertStringIntoTestTable('testStr1');
        await updateTimestampsOfTestTable('testStr1', conn);
        await sleep(REGULAR_CALLBACK_TIMEOUT_MS);

        const msg = callbackMsg.pop();
        should.exist(msg);
        should.strictEqual(msg.type, oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE);
        should.strictEqual(msg.tables.length, 1);
        should.strictEqual(msg.tables[0].name, `${PACKAGE_USER}.CQN_TEST_TABLE`);
        should.strictEqual(msg.tables[0].operation, oracledb.CQN_OPCODE_INSERT | oracledb.CQN_OPCODE_ALL_ROWS);
        await truncateTable();
        await sleep(REGULAR_CALLBACK_TIMEOUT_MS);
        should.strictEqual(callbackMsg.length, 0);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.unsubscribe('sub1');
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('185.1.7 Register callback using summary grouping', async function() {
      let conn;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        const subscribeOptions = {
          sql: "select * from cqn_test_table",
          groupingClass: oracledb.SUBSCR_GROUPING_CLASS_TIME,
          groupingValue: 2,
          callback: cqnEventCallback,
        }
        await conn.subscribe('sub1', subscribeOptions);
        await conn.subscribe('sub1', { sql: "select * from cqn_test_table_2" });
        await insertStringIntoTestTable('testStr1', conn);
        await insertStringIntoTestTable('testStr1', conn, 'cqn_test_table_2');
        await sleep(REGULAR_CALLBACK_TIMEOUT_MS < 1000? 6000: REGULAR_CALLBACK_TIMEOUT_MS * 6);
        const msg = callbackMsg.pop();
        should.exist(msg);
        should.strictEqual(msg.type, oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE);
        should.strictEqual(msg.tables.length, 2);
        should.strictEqual(msg.tables[0].name, `${PACKAGE_USER}.CQN_TEST_TABLE`);
        should.strictEqual(msg.tables[0].operation, oracledb.CQN_OPCODE_INSERT | oracledb.CQN_OPCODE_ALL_ROWS);
        should.strictEqual(msg.tables[1].name, `${PACKAGE_USER}.CQN_TEST_TABLE_2`);
        should.strictEqual(msg.tables[1].operation, oracledb.CQN_OPCODE_INSERT | oracledb.CQN_OPCODE_ALL_ROWS);
        should.strictEqual(callbackMsg.length, 0);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.unsubscribe('sub1');
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('185.1.8 Register callback using last grouping', async function() {
      let conn;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        const subscribeOptions = {
          sql: "select * from cqn_test_table",
          groupingClass: oracledb.SUBSCR_GROUPING_CLASS_TIME,
          groupingType: oracledb.SUBSCR_GROUPING_TYPE_LAST,
          groupingValue: 2,
          callback: cqnEventCallback,
        }
        await conn.subscribe('sub1', subscribeOptions);
        await conn.subscribe('sub1', { sql: "select * from cqn_test_table_2" });
        await insertStringIntoTestTable('testStr1', conn);
        await insertStringIntoTestTable('testStr1', conn, 'cqn_test_table_2');
        await sleep(REGULAR_CALLBACK_TIMEOUT_MS < 1000? 6000: REGULAR_CALLBACK_TIMEOUT_MS * 6);
        const msg = callbackMsg.pop();
        should.exist(msg);
        should.strictEqual(msg.type, oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE);
        should.strictEqual(msg.tables.length, 1);
        should.strictEqual(msg.tables[0].name, `${PACKAGE_USER}.CQN_TEST_TABLE_2`);
        should.strictEqual(msg.tables[0].operation, oracledb.CQN_OPCODE_INSERT | oracledb.CQN_OPCODE_ALL_ROWS);
        should.strictEqual(callbackMsg.length, 0);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.unsubscribe('sub1');
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('185.1.9 Update table subscribed on object level when query result does not change', async function() {
      let conn;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        await insertStringIntoTestTable('testStr1', conn);
        const subscribeOptions = {
          sql: "select requested_value from cqn_test_table",
          callback: cqnEventCallback,
        }
        await conn.subscribe('sub1', subscribeOptions);
        await updateTimestampsOfTestTable('testStr1', conn);
        await sleep(REGULAR_CALLBACK_TIMEOUT_MS);
        const msg = callbackMsg.pop();
        should.exist(msg);
        should.strictEqual(msg.type, oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE);
        should.strictEqual(msg.tables.length, 1);
        should.strictEqual(msg.tables[0].name, `${PACKAGE_USER}.CQN_TEST_TABLE`);
        should.strictEqual(msg.tables[0].operation, oracledb.CQN_OPCODE_UPDATE | oracledb.CQN_OPCODE_ALL_ROWS);
        should.strictEqual(callbackMsg.length, 0);
        await truncateTable();
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.unsubscribe('sub1');
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('185.1.10 Update table subscribed on query level when query result does not change', async function() {
      let conn;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        await insertStringIntoTestTable('testStr1', conn);
        const subscribeOptions = {
          sql: "select requested_value from cqn_test_table",
          qos: oracledb.SUBSCR_QOS_QUERY,
          callback: cqnEventCallback,
        }
        await conn.subscribe('sub1', subscribeOptions);
        await updateTimestampsOfTestTable('testStr1', conn);
        await sleep(REGULAR_CALLBACK_TIMEOUT_MS);
        should.strictEqual(callbackMsg.length, 0);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.unsubscribe('sub1');
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('185.1.11 Subscription with multiple queries on single table', async function() {
      let conn;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        const subscribeOptions = {
          sql: "select requested_value from cqn_test_table where requested_value != 'testStr10'",
          qos: oracledb.SUBSCR_QOS_QUERY,
          callback: cqnEventCallback,
        }
        await conn.subscribe('sub1', subscribeOptions);
        for (let i = 1; i < 12; i++) {
          await conn.subscribe('sub1', { sql: `select requested_value from cqn_test_table where requested_value != 'testStr1${i}'` });
        }
        await insertStringIntoTestTable('testStr1', conn);
        await sleep(REGULAR_CALLBACK_TIMEOUT_MS);
        const msg = callbackMsg.pop();
        should.exist(msg);
        should.strictEqual(msg.type, oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
        should.not.exist(msg.tables);
        should.strictEqual(msg.queries.length, 12);
        for (let i = 0; i < 12; i++) {
          should.strictEqual(msg.queries[i].tables[0].name, `${PACKAGE_USER}.CQN_TEST_TABLE`);
          should.strictEqual(msg.queries[i].tables[0].operation, oracledb.CQN_OPCODE_INSERT | oracledb.CQN_OPCODE_ALL_ROWS);
        }
        should.strictEqual(callbackMsg.length, 0);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.unsubscribe('sub1');
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('185.1.12 Subscription with single query on multiple tables', async function() {
      let conn;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        const subscribeOptions = {
          sql: "select n.requested_value from cqn_test_table n, cqn_test_table_2 s where n.requested_value = s.requested_value",
          qos: oracledb.SUBSCR_QOS_QUERY,
          callback: cqnEventCallback,
        }
        await conn.subscribe('sub1', subscribeOptions);
        await insertStringIntoTestTable('testStr1', conn, undefined, false);
        await insertStringIntoTestTable('testStr1', conn, 'cqn_test_table_2');
        await sleep(REGULAR_CALLBACK_TIMEOUT_MS);
        const msg = callbackMsg.pop();
        should.exist(msg);
        should.strictEqual(msg.type, oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
        should.not.exist(msg.tables);
        should.strictEqual(msg.queries.length, 1);
        should.strictEqual(msg.queries[0].tables.length, 2);
        should.strictEqual(msg.queries[0].tables[0].name, `${PACKAGE_USER}.CQN_TEST_TABLE`);
        should.strictEqual(msg.queries[0].tables[0].operation, oracledb.CQN_OPCODE_INSERT | oracledb.CQN_OPCODE_ALL_ROWS);
        should.strictEqual(msg.queries[0].tables[1].name, `${PACKAGE_USER}.CQN_TEST_TABLE_2`);
        should.strictEqual(msg.queries[0].tables[1].operation, oracledb.CQN_OPCODE_INSERT | oracledb.CQN_OPCODE_ALL_ROWS);
        should.strictEqual(callbackMsg.length, 0);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.unsubscribe('sub1');
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('185.1.13 Two connections subscribe the same table using the same callback', async function() {
      let conn, conn2;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        const subscribeOptions = {
          sql: "select * from cqn_test_table",
          callback: cqnEventCallback,
        }
        await conn.subscribe('sub1', subscribeOptions);
        conn2 = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        await conn2.subscribe('sub1', subscribeOptions);
        await insertStringIntoTestTable('testStr1', conn);
        await sleep(REGULAR_CALLBACK_TIMEOUT_MS);
        let msg = callbackMsg.pop();
        should.exist(msg);
        should.strictEqual(msg.type, oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE);
        should.strictEqual(msg.tables.length, 1);
        should.strictEqual(msg.tables[0].name, `${PACKAGE_USER}.CQN_TEST_TABLE`);
        should.strictEqual(msg.tables[0].operation, oracledb.CQN_OPCODE_ALL_ROWS | oracledb.CQN_OPCODE_INSERT);
        should.strictEqual(callbackMsg.length, 0);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.unsubscribe('sub1');
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (conn2) {
          try {
            await conn2.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('185.1.14 Two connections subscribe different tables using the same callback', async function() {
      let conn, conn2;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        await conn.subscribe('sub1', {
          sql: "select * from cqn_test_table",
          callback: cqnEventCallback,
        });
        conn2 = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        await conn2.subscribe('sub1', {
          sql: "select * from cqn_test_table_2",
          callback: cqnEventCallback,
        });
        await insertStringIntoTestTable('testStr1', conn);
        await sleep(REGULAR_CALLBACK_TIMEOUT_MS);
        let msg = callbackMsg.pop();
        should.exist(msg);
        should.strictEqual(msg.type, oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE);
        should.strictEqual(msg.tables.length, 1);
        should.strictEqual(msg.tables[0].name, `${PACKAGE_USER}.CQN_TEST_TABLE`);
        should.strictEqual(msg.tables[0].operation, oracledb.CQN_OPCODE_ALL_ROWS | oracledb.CQN_OPCODE_INSERT);
        should.strictEqual(callbackMsg.length, 0);
        await insertStringIntoTestTable('testStr1', conn, "cqn_test_table_2");
        await sleep(REGULAR_CALLBACK_TIMEOUT_MS);
        msg = callbackMsg.pop();
        should.exist(msg);
        should.strictEqual(msg.type, oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE);
        should.strictEqual(msg.tables.length, 1);
        should.strictEqual(msg.tables[0].name, `${PACKAGE_USER}.CQN_TEST_TABLE_2`);
        should.strictEqual(msg.tables[0].operation, oracledb.CQN_OPCODE_ALL_ROWS | oracledb.CQN_OPCODE_INSERT);
        should.strictEqual(callbackMsg.length, 0);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.unsubscribe('sub1');
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (conn2) {
          try {
            await conn2.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('185.1.15 Unsubscribe upon first notification received', async function() {
      let conn;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        const subscribeOptions = {
          sql: "select requested_value from cqn_test_table",
          qos: oracledb.SUBSCR_QOS_DEREG_NFY,
          callback: cqnEventCallback,
        }
        await conn.subscribe('sub1', subscribeOptions);
        await insertStringIntoTestTable('testStr1', conn);
        await sleep(REGULAR_CALLBACK_TIMEOUT_MS);
        should.strictEqual(callbackMsg.length, 1);
        await testsUtil.assertThrowsAsync(async () => {
          await conn.unsubscribe('sub1');
        }, /NJS-061:/); // NJS-061: invalid subscription
        await truncateTable();
      } catch (err) {
        console.log(err);
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

  });

  describe('185.2 Negative Cases', function () {

    it('185.2.1 Does not throw error when trying to unsubscribe twice', async function() {
      let conn;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        const subscribeOptions = {
          sql: "select * from cqn_test_table",
          callback: cqnEventCallback,
        }
        await conn.subscribe('sub1', subscribeOptions);
        await conn.unsubscribe('sub1');
        await testsUtil.assertThrowsAsync(async () => {
          await conn.unsubscribe('sub1');
        }, /NJS-061:/); // NJS-061: invalid subscription
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('185.2.2 Throw error ORA-29972 if CHANGE NOTIFICATION is revoked from the user ', async function() {
      let conn;
      try {
        await revokeChangeNotificationPriv(dbconfig.user);
        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true,
        });
        const subscribeOptions = {
          sql: "select * from cqn_test_table",
          callback: cqnEventCallback,
        }
        await testsUtil.assertThrowsAsync(async () => {
          await conn.subscribe('sub1', subscribeOptions);
        }, /ORA-29972:/); // ORA-29972: user does not have privilege to change/ create registration
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

  });
});

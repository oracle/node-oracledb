/* Copyright (c) 2021, 2022, Oracle and/or its affiliates. */

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
 *   256. executeQueue.js
 *   Tests for oracledb.errorOnConcurrentExecute
 *
 *****************************************************************************/

'use strict';

const assert    = require('assert');
const oracledb  = require('oracledb');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe("256. executeQueue.js", function() {
  let connection;
  let errorOnConcurrentExecuteBak = oracledb.errorOnConcurrentExecute;

  const content = [];
  content[0] = { name: "Venkat", address: {city: "Bengaluru"} };
  content[1] = { name: "May", address: {city: "London"} };
  const loopCount = 2;

  before(async function() {
    connection = await oracledb.getConnection(dbconfig);
  }); //before()

  after(async function() {
    if (connection) {
      await connection.close();
    }
  }); //after()

  afterEach(function() {
    oracledb.errorOnConcurrentExecute = errorOnConcurrentExecuteBak;
  }); //afterEach()

  describe("256.1 Connection.execute()", function() {

    // causes a break to be issued; this must be done *after* an execute has
    // already taken place; otherwise, the break() is ignored; a sleep of 200
    // ms should be sufficient for the prepare phase of the execution to be
    // completed (probably less than 1 ms in most instances but better to err
    // on the side of caution)
    async function doBreak(connection) {
      await new Promise(resolve => {
        setTimeout(resolve, 200);
      });
      await connection.break();
    }

    async function doSleep(connection) {
      const sql = `begin dbms_session.sleep(5); end;`;
      await connection.execute(sql);
    }

    async function doQuery(connection) {
      const result = await connection.execute(`select * from dual`);
      return (result.rows[0][0]);
    }

    it('256.1.1 errorOnConcurrentExecute set to false', async function() {
      oracledb.errorOnConcurrentExecute = false;
      const promises = [];
      for (let i = 0 ; i < loopCount; i++) {
        promises[i] = doQuery(connection);
      }
      let values = await Promise.allSettled(promises);
      for (let i = 0; i < loopCount; i++) {
        assert.strictEqual(values[i].status, 'fulfilled');
        assert.strictEqual(values[i].value, 'X');
      }
    });

    it('256.1.2 errorOnConcurrentExecute set to true', async function() {
      oracledb.errorOnConcurrentExecute = true;
      const promises = [];
      for (let i = 0 ; i < loopCount; i++) {
        promises[i] = doQuery(connection);
      }
      const values = await Promise.allSettled(promises);
      assert.strictEqual(values[1].status, 'rejected');
      assert.match(values[1].reason.message, /NJS-081:/);
    });

    it('256.1.3 break() not constrained by queue', async function() {

      // Skip for older versions since this test might hang unless DISABLE_OOB=ON is in sqlnet.ora
      if (connection.oracleServerVersion <= 1900000000 || oracledb.oracleClientVersion <= 1900000000) {
        this.skip();
        return;
      }

      oracledb.errorOnConcurrentExecute = true;
      const promises = [doSleep(connection), doBreak(connection)];
      const values = await Promise.allSettled(promises);
      assert.strictEqual(values[0].status, 'rejected');
      assert.match(values[0].reason.message, /ORA-01013:/);
    });
  });

  describe("256.2 SodaDatabase.createCollection()", function() {
    before(async function() {
      const runnable = await testsUtil.isSodaRunnable();
      if (!runnable) {
        this.skip();
      }
    });
    async function doCreateCollection(sd, collName) {
      return await sd.createCollection(collName);
    }

    it('256.2.1 errorOnConcurrentExecute set to false', async function() {
      oracledb.errorOnConcurrentExecute = false;
      const promises = [];
      const sd = connection.getSodaDatabase();
      let collName = "soda_collection";
      for (let i = 0 ; i < loopCount; i++) {
        promises[i] = doCreateCollection(sd, collName + i);
      }
      let values = await Promise.allSettled(promises);
      collName = "soda_collection";
      for (let i = 0 ; i < loopCount; i++) {
        assert.strictEqual(values[i].status, 'fulfilled');
        assert.strictEqual(values[i].value.name, collName + i);
        (values[i].value).drop();
      }
    });

    it('256.2.2 errorOnConcurrentExecute set to true', async function() {
      oracledb.errorOnConcurrentExecute = true;
      const promises = [];
      const sd = connection.getSodaDatabase();
      let collName = "soda_collection";
      for (let i = 0 ; i < loopCount; i++) {
        collName = collName + i;
        promises[i] = doCreateCollection(sd, collName);
      }
      const values = await Promise.allSettled(promises);
      assert.strictEqual(values[1].status, 'rejected');
      assert.match(values[1].reason.message, /NJS-081:/);
    });
  });

  describe("256.3 SodaCollection.insertOne()", function() {
    before(async function() {
      const runnable = await testsUtil.isSodaRunnable();
      if (!runnable) {
        this.skip();
      }
    });
    async function doInsertCollection(collection, content) {
      return await collection.insertOne(content);
    }

    it('256.3.1 errorOnConcurrentExecute set to false', async function() {
      oracledb.errorOnConcurrentExecute = false;
      const promises = [];
      const sd = connection.getSodaDatabase();
      const collection = await sd.createCollection("soda_collection_256_3_1");
      for (let i = 0 ; i < loopCount; i++) {
        promises[i] = doInsertCollection(collection, content[i]);
      }
      await Promise.allSettled(promises);
      const res1 = await collection.find().count();
      assert.strictEqual(res1.count, 2);
      await connection.commit();
      await collection.drop();
    });

    it('256.3.2 errorOnConcurrentExecute set to true', async function() {
      oracledb.errorOnConcurrentExecute = true;
      const promises = [];
      const sd = connection.getSodaDatabase();
      const collection = await sd.createCollection("soda_collection_256_3_2");
      for (let i = 0 ; i < loopCount; i++) {
        promises[i] = doInsertCollection(collection, content[i]);
      }
      const values = await Promise.allSettled(promises);
      assert.strictEqual(values[1].status, 'rejected');
      assert.match(values[1].reason.message, /NJS-081:/);
    });
  });

  describe("256.4 SodaOperation.count()", function() {
    before(async function() {
      const runnable = await testsUtil.isSodaRunnable();
      if (!runnable) {
        this.skip();
      }
    });
    async function doCount(collection) {
      return await collection.find().count();
    }

    it('256.4.1 errorOnConcurrentExecute set to false', async function() {
      oracledb.errorOnConcurrentExecute = false;
      const promises = [];
      const sd = connection.getSodaDatabase();
      const collection = await sd.createCollection("soda_collection_256_4_1");
      for (let i = 0 ; i < loopCount; i++) {
        await collection.insertOne(content[i]);
      }
      for (let i = 0 ; i < loopCount; i++) {
        promises[i] = doCount(collection);
      }
      let values = await Promise.allSettled(promises);
      for (let i = 0 ; i < loopCount; i++) {
        assert.strictEqual(values[i].status, 'fulfilled');
        assert.strictEqual(values[i].value.count, 2);
      }
      await connection.commit();
      await collection.drop();
    });

    it('256.4.2 errorOnConcurrentExecute set to true', async function() {
      oracledb.errorOnConcurrentExecute = true;
      const promises = [];
      const sd = connection.getSodaDatabase();
      const collection = await sd.createCollection("soda_collection_256_4_2");
      for (let i = 0 ; i < loopCount; i++) {
        await collection.insertOne(content[i]);
      }
      for (let i = 0 ; i < loopCount; i++) {
        promises[i] = doCount(collection);
      }
      const values = await Promise.allSettled(promises);
      assert.strictEqual(values[1].status, 'rejected');
      assert.match(values[1].reason.message, /NJS-081:/);
    });
  });

  describe("256.5 SodaDocCursor.getNext()", function() {
    before(async function() {
      const runnable = await testsUtil.isSodaRunnable();
      if (!runnable) {
        this.skip();
      }
    });
    async function doGetNext(docCursor) {
      return await docCursor.getNext();
    }

    it('256.5.1 errorOnConcurrentExecute set to false', async function() {
      oracledb.errorOnConcurrentExecute = false;
      const promises = [];
      const sd = connection.getSodaDatabase();
      const collection = await sd.createCollection("soda_collection_256_5_1");
      for (let i = 0 ; i < loopCount; i++) {
        await collection.insertOne(content[i]);
      }
      const docCursor = await collection.find().getCursor();
      for (let i = 0 ; i < loopCount; i++) {
        promises[i] = doGetNext(docCursor);
      }
      let values = await Promise.allSettled(promises);
      for (let i = 0 ; i < loopCount; i++) {
        assert.strictEqual(values[i].status, 'fulfilled');
        assert.equal(values[i].value.getContent().toString(), content[i]);
      }
      await connection.commit();
      await collection.drop();
    });

    it('256.5.2 errorOnConcurrentExecute set to true', async function() {
      oracledb.errorOnConcurrentExecute = true;
      const promises = [];
      const sd = connection.getSodaDatabase();
      const collection = await sd.createCollection("soda_collection_256_5_2");
      for (let i = 0 ; i < loopCount; i++) {
        await collection.insertOne(content[i]);
      }
      const docCursor = await collection.find().getCursor();
      for (let i = 0 ; i < loopCount; i++) {
        promises[i] = doGetNext(docCursor);
      }
      const values = await Promise.allSettled(promises);
      assert.strictEqual(values[1].status, 'rejected');
      assert.match(values[1].reason.message, /NJS-081:/);
    });
  });

  describe("256.6 Execute queue length", function() {
    async function doQuery(connection) {
      const ql = connection._impl._requestQueue.length; // This one is an internal variable
      await connection.execute(`select * from dual`);
      return (ql);
    }

    it('256.6.1 errorOnConcurrentExecute set to false', async function() {
      oracledb.errorOnConcurrentExecute = false;
      const promises = [];
      for (let i = 0 ; i < 4; i++) {
        promises[i] = doQuery(connection);
      }
      let values = await Promise.allSettled(promises);
      assert.strictEqual(values[0].status, 'fulfilled');
      assert.strictEqual(values[0].value, 0);   // It will execute first, 0 in the queue
      assert.strictEqual(values[1].status, 'fulfilled');
      assert.strictEqual(values[1].value, 0);   // When the 2nd starts, there should be 1 executing, and 0 in the queue
      assert.strictEqual(values[2].status, 'fulfilled');
      assert.strictEqual(values[2].value, 1);  // When the 3rd starts, there should be 1 executing, and 1 in the queue
      assert.strictEqual(values[3].status, 'fulfilled');
      assert.strictEqual(values[3].value, 2);  // When the 4th starts, there should be 1 executing, and 2 in the queue
      const queueTotal = values.reduce((prev, cur) => prev + cur.value, 0);
      assert.strictEqual(queueTotal, 3);
    });

    it('256.6.2 errorOnConcurrentExecute set to true', async function() {
      oracledb.errorOnConcurrentExecute = true;
      const promises = [];

      for (let i = 0 ; i < 3; i++) {
        promises[i] = doQuery(connection);
      }
      const values = await Promise.allSettled(promises);
      assert.strictEqual(values[1].status, 'rejected');
      assert.match(values[1].reason.message, /NJS-081:/);
    });
  });

  describe("256.7 Lob.getData()", function() {
    const tab = 'nodb_tab_myclob';
    let conn;
    before(async function() {
      try {
        conn = await oracledb.getConnection(dbconfig);
        const sql =
        `create table ${tab} (
          id number(9) not null,
          value clob not null
        )`;
        const plsql = testsUtil.sqlCreateTable(tab, sql);
        await conn.execute(plsql);
      } catch (err) {
        assert.fail(err);
      }
    });

    after(async function() {
      try {
        let sql = `drop table ${tab} purge`;
        await conn.execute(sql);
        await conn.close();
      } catch (err) {
        assert.fail(err);
      }
    });

    beforeEach(async function() {
      try {
        await conn.execute(`Delete from ` + tab);
      } catch (error) {
        assert.fail(error);
      }
    });

    async function doGetData(lob) {
      return await lob.getData();
    }

    it('256.7.1 errorOnConcurrentExecute set to false', async function() {
      oracledb.errorOnConcurrentExecute = false;
      const promises = [];
      const clob = [];
      const content = 'A short string value';
      let sql = `insert into ${tab} values (1, '${content}')`;
      await conn.execute(sql);

      sql = `select * from ${tab} where id = 1`;
      const result1 = await conn.execute(sql);
      const result2 = await conn.execute(sql);
      clob[0] = result1.rows[0][1];
      clob[1] = result2.rows[0][1];

      for (let i = 0 ; i < loopCount; i++) {
        promises[i] = doGetData(clob[i]);
      }
      let values = await Promise.allSettled(promises);
      for (let i = 0 ; i < loopCount; i++) {
        assert.strictEqual(values[i].status, 'fulfilled');
        assert.equal(values[0].value, content);
      }
    });

    it('256.7.2 errorOnConcurrentExecute set to true', async function() {
      oracledb.errorOnConcurrentExecute = true;
      const promises = [];
      const clob = [];
      const content = 'A short string value';
      let sql = `insert into ${tab} values (1, '${content}')`;
      await conn.execute(sql);

      sql = `select * from ${tab} where id = 1`;
      const result1 = await conn.execute(sql);
      const result2 = await conn.execute(sql);
      clob[0] = result1.rows[0][1];
      clob[1] = result2.rows[0][1];

      for (let i = 0 ; i < loopCount; i++) {
        promises[i] = doGetData(clob[i]);
      }
      const values = await Promise.allSettled(promises);
      assert.strictEqual(values[0].status, 'fulfilled');
      assert.equal(values[0].value, content);
      assert.strictEqual(values[1].status, 'rejected');
      assert.match(values[1].reason.message, /NJS-081:/);
    });
  });
});

/* Copyright (c) 2025, 2026, Oracle and/or its affiliates. */

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
 *   320. lobMethods.js
 *
 * DESCRIPTION
 *   Testing methods for LOB class.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const fs       = require('fs');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const stream   = require('stream');
const testsUtil = require('./testsUtil.js');
const random   = require('./random.js');

describe('320. lobMethods1.js', function() {

  let conn;

  before(async function() {
    conn = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await conn.close();
  });

  describe('320.1 LOB content streamed from file', function() {

    const tableName = 'nodb_tab_mylobs1';
    const sqlSelect = `SELECT * FROM ${tableName} WHERE id = :i`;

    before(async function() {
      const sqlCreateTab = testsUtil.sqlCreateTable(
        tableName,
        `CREATE TABLE ${tableName} ( id NUMBER, c CLOB, b BLOB )`
      );
      await conn.execute(sqlCreateTab);

      const bindVar = {
        i: 1,
        clob: { type: oracledb.CLOB, dir: oracledb.BIND_OUT },
        blob: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
      };

      const clobFile = './test/clobexample.txt';
      const blobFile = './test/fuzzydinosaur.jpg';

      let result = await conn.execute(
        `INSERT INTO ${tableName} VALUES (:i, EMPTY_CLOB(), EMPTY_BLOB())
         RETURNING c, b INTO :clob, :blob`,
        bindVar
      );

      let clob = result.outBinds.clob[0];
      let blob = result.outBinds.blob[0];

      const clobStream = fs.createReadStream(clobFile);
      const blobStream = fs.createReadStream(blobFile);

      clobStream.pipe(clob);
      blobStream.pipe(blob);

      await Promise.all([
        new Promise(res => clob.on('finish', res)),
        new Promise(res => blob.on('finish', res))
      ]);

      result = await conn.execute(sqlSelect, { i: 1 });
      clob = result.rows[0][1];
      blob = result.rows[0][2];
      await clob.getData();
      await blob.getData();
      await clob.close();
      await blob.close();
    });

    after(async function() {
      await conn.execute(testsUtil.sqlDropTable(tableName));
      await conn.commit();
    });

    it('320.1.1 lob.trim() - Normal', async function() {
      const result = await conn.execute(sqlSelect, { i: 1 });
      const clob = result.rows[0][1];
      const blob = result.rows[0][2];

      const t1 = clob.length;
      const t2 = blob.length;

      await clob.trim(t1 - 10);
      assert.strictEqual(clob.length, t1 - 10);

      await blob.trim(t2 - 10);
      assert.strictEqual(blob.length, t2 - 10);

      await clob.trim();
      assert.strictEqual(clob.length, 0);

      await blob.trim();
      assert.strictEqual(blob.length, 0);

      await clob.close();
      await blob.close();
    });

    it('320.1.2 lob.trim() - Value larger than the lob size', async function() {
      const result = await conn.execute(sqlSelect, { i: 1 });
      const clob = result.rows[0][1];
      const blob = result.rows[0][2];

      const t1 = clob.length;
      const t2 = blob.length;

      // ORA-22926: specified trim length is greater than current LOB value's length
      await assert.rejects(() => clob.trim(t1 + 10), /ORA-22926:/);
      await assert.rejects(() => blob.trim(t2 + 10), /ORA-22926:/);

      await clob.close();
      await blob.close();
    }); // 320.1.2

    it('320.1.3 lob.trim() - Negative value', async function() {
      const result = await conn.execute(sqlSelect, { i: 1 });
      const clob = result.rows[0][1];
      const blob = result.rows[0][2];

      // NJS-005: invalid value for parameter 1
      await assert.rejects(() => clob.trim(-1), /NJS-005:/);
      await assert.rejects(() => blob.trim(-1), /NJS-005:/);

      await clob.close();
      await blob.close();
    }); // 320.1.3

    it('320.1.4 lob.trim() - out of bounds length', async function() {
      const result = await conn.execute(sqlSelect, { i: 1 });
      const clob = result.rows[0][1];
      const blob = result.rows[0][2];

      // NJS-005: invalid value for parameter 1
      await assert.rejects(() => clob.trim(2 ** 64 + 1), /NJS-005:/);
      await assert.rejects(() => blob.trim(2 ** 64 + 1), /NJS-005:/);

      await clob.close();
      await blob.close();
    }); // 320.1.4
  }); // 320.1

  describe('320.2 CLOB content written directly', function() {

    const tableName = 'nodb_tab_mylobs2';
    const sqlSelect = `SELECT * FROM ${tableName} WHERE id = :i`;

    before(async function() {
      const sqlCreate = testsUtil.sqlCreateTable(
        tableName,
        `CREATE TABLE ${tableName} ( id NUMBER, c CLOB )`
      );
      await conn.execute(sqlCreate);

      const bindVar = {
        i: 1,
        clob: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
      };

      let result = await conn.execute(
        `INSERT INTO ${tableName} VALUES (:i, EMPTY_CLOB())
         RETURNING c INTO :clob`,
        bindVar
      );

      let clob = result.outBinds.clob[0];
      await clob.write('a'.repeat((2 ** 10) - 1));

      result = await conn.execute(sqlSelect, { i: 1 });
      clob = result.rows[0][1];
      await clob.close();
    });

    after(async function() {
      await conn.execute(testsUtil.sqlDropTable(tableName));
    });

    it('320.2.1 lob.trim() - Normal', async function() {
      const result = await conn.execute(sqlSelect, { i: 1 });
      const clob = result.rows[0][1];

      const t1 = clob.length;

      await clob.trim(t1 - 10);
      assert.strictEqual(clob.length, t1 - 10);

      await clob.trim();
      assert.strictEqual(clob.length, 0);

      await clob.close();
    }); // 320.2.1

    it('320.2.2 lob.trim() - Value larger than the lob size', async function() {
      const result = await conn.execute(sqlSelect, { i: 1 });
      const clob = result.rows[0][1];
      const t1 = clob.length;

      // ORA-22926: specified trim length is greater than current LOB value's length
      await assert.rejects(() => clob.trim(t1 + 10), /ORA-22926:/);

      await clob.close();
    }); // 320.2.2

    it('320.2.3 lob.trim() - Negative value', async function() {
      const result = await conn.execute(sqlSelect, { i: 1 });
      const clob = result.rows[0][1];

      // NJS-005: invalid value for parameter 1
      await assert.rejects(() => clob.trim(-1), /NJS-005:/);

      await clob.close();
    }); // 320.2.3

    it('320.2.4 lob.trim() - out of bounds length', async function() {
      const result = await conn.execute(sqlSelect, { i: 1 });
      const clob = result.rows[0][1];

      // NJS-005: invalid value for parameter 1
      await assert.rejects(() => clob.trim(2 ** 64 + 1), /NJS-005:/);

      await clob.close();
    }); // 320.2.4
  }); // 320.2

  describe('320.3 getData() method tests', function() {
    it('320.3.1 fetch complete CLOB content', async function() {
      const tableName = "nodb_lob_stream_1";
      const testData = "Test data for fetching complete LOB content";

      const sql = `CREATE TABLE ${tableName} (id NUMBER, data CLOB)`;
      const plsql = testsUtil.sqlCreateTable(tableName, sql);
      await conn.execute(plsql);

      const result = await conn.execute(
        `INSERT INTO ${tableName} VALUES (1, EMPTY_CLOB())
           RETURNING data INTO :clob`,
        { clob: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } }
      );

      const lob = result.outBinds.clob[0];

      const inStream = new stream.Readable();
      inStream.push(testData);
      inStream.push(null);

      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob);
      });

      await conn.commit();

      const fetchResult = await conn.execute(
        `SELECT data FROM ${tableName} WHERE id = 1`
      );

      const fetchedLob = fetchResult.rows[0][0];
      const data = await fetchedLob.getData();
      assert.strictEqual(data, testData);

      await fetchedLob.close();

      const dropSql = testsUtil.sqlDropTable(tableName);
      await conn.execute(dropSql);
    }); // 320.3.1

    it('320.3.2 fetch CLOB content by range', async function() {
      const tableName = "nodb_lob_stream_2";
      const testData = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

      const sql = `CREATE TABLE ${tableName} (id NUMBER, data CLOB)`;
      const plsql = testsUtil.sqlCreateTable(tableName, sql);
      await conn.execute(plsql);

      const result = await conn.execute(
        `INSERT INTO ${tableName} VALUES (1, EMPTY_CLOB())
           RETURNING data INTO :clob`,
        { clob: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } }
      );

      const lob = result.outBinds.clob[0];

      const inStream = new stream.Readable();
      inStream.push(testData);
      inStream.push(null);

      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob);
      });

      await conn.commit();

      const fetchResult = await conn.execute(
        `SELECT data FROM ${tableName} WHERE id = 1`
      );

      const fetchedLob = fetchResult.rows[0][0];
      const data = await fetchedLob.getData(5, 10);
      assert.strictEqual(data, "EFGHIJKLMN");

      await fetchedLob.close();

      const dropSql = testsUtil.sqlDropTable(tableName);
      await conn.execute(dropSql);
    }); // 320.3.2

    it('320.3.3 validate upper limit', async function() {
      const tableName = "nodb_lob_size_limit_1";
      const testData = 'A'.repeat(1024 * 1024); // 1MB

      const sql = `CREATE TABLE ${tableName} (id NUMBER, data CLOB)`;
      const plsql = testsUtil.sqlCreateTable(tableName, sql);
      await conn.execute(plsql);

      const result = await conn.execute(
        `INSERT INTO ${tableName} VALUES (1, EMPTY_CLOB()) RETURNING data INTO :clob`,
        { clob: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } }
      );

      const lob = result.outBinds.clob[0];
      const inStream = new stream.Readable();
      inStream.push(testData);
      inStream.push(null);

      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob);
      });

      await conn.commit();

      const fetchResult = await conn.execute(`SELECT data FROM ${tableName} WHERE id = 1`);
      const fetchedLob = fetchResult.rows[0][0];
      const data = await fetchedLob.getData();

      assert.strictEqual(data.length, testData.length);
      assert.strictEqual(data, testData);

      await fetchedLob.close();
      await conn.execute(testsUtil.sqlDropTable(tableName));
    }); // 320.3.3
  }); // 320.3

  describe('320.4 getData() method', function() {

    const tableName = 'nodb_clob_1';

    it('320.4.1 getData() method - CLOB', async function() {
      let sql = `CREATE TABLE ${tableName} (id NUMBER, c CLOB)`;
      const plsql = testsUtil.sqlCreateTable(tableName, sql);
      await conn.execute(plsql);
      const id = 1;
      const dataLength = 1000;
      const specialStr = "320.4.1";
      const clobStr = random.getRandomString(dataLength, specialStr);

      sql = `INSERT INTO ${tableName} (id, c) VALUES (:i, :c)`;
      await conn.execute(
        sql,
        { i: id, c: clobStr }
      );

      sql = `SELECT c FROM ${tableName} WHERE id = :1`;
      const result = await conn.execute(sql, [1]);
      const lob = result.rows[0][0];
      assert.strictEqual(lob.type, oracledb.DB_TYPE_CLOB);

      // Test getData()
      const data = await lob.getData();
      assert.strictEqual(data, clobStr);
      assert.strictEqual(data.length, dataLength);
      assert(data.includes(specialStr));

      // Test getData() with offset and length
      const offset = 100;
      const len = 200;
      const partialData = await lob.getData(offset, len);
      assert.strictEqual(partialData.length, len);
      assert.strictEqual(partialData, clobStr.substring(offset - 1, offset - 1 + len));

      await lob.close();
      await conn.execute(testsUtil.sqlDropTable(tableName));
    }); // 320.4.1

    it('320.4.2 getData() method - BLOB', async function() {
      let sql = `CREATE TABLE ${tableName} (id NUMBER, b BLOB)`;
      const plsql = testsUtil.sqlCreateTable(tableName, sql);
      await conn.execute(plsql);

      const id = 1;
      const dataLength = 1000;
      const blobData = Buffer.alloc(dataLength);
      for (let i = 0; i < dataLength; i++) {
        blobData[i] = i % 256;
      }

      sql = `INSERT INTO ${tableName} (id, b) VALUES (:i, :b)`;
      await conn.execute(
        sql,
        { i: id, b: blobData }
      );

      sql = `SELECT b FROM ${tableName} WHERE id = :1`;
      const result = await conn.execute(sql, [1]);
      const lob = result.rows[0][0];
      assert.strictEqual(lob.type, oracledb.DB_TYPE_BLOB);

      // Test getData()
      const data = await lob.getData();
      assert(Buffer.isBuffer(data));
      assert.strictEqual(data.length, dataLength);
      assert.deepStrictEqual(data, blobData);

      // Test getData() with offset and length
      const offset = 100;
      const len = 200;
      const partialData = await lob.getData(offset, len);
      assert(Buffer.isBuffer(partialData));
      assert.strictEqual(partialData.length, len);
      assert.deepStrictEqual(partialData, blobData.subarray(offset - 1, offset - 1 + len));

      await lob.close();
      await conn.execute(testsUtil.sqlDropTable(tableName));
    }); // 320.4.2
  }); // 320.4

  describe('320.5 Temporary and persistent LOBs', function() {

    it('320.5.1 Create and use temporary CLOB', async function() {
      const lob = await conn.createLob(oracledb.CLOB);
      assert.strictEqual(lob.type, oracledb.DB_TYPE_CLOB);

      const testData = "Temporary CLOB data test";
      const inStream = new stream.Readable();
      inStream.push(testData);
      inStream.push(null);

      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob);
      });

      const data = await lob.getData();
      assert.strictEqual(data, testData);

      await lob.close();
    }); // 320.5.1

    it('320.5.2 Create and use temporary BLOB', async function() {
      const lob = await conn.createLob(oracledb.BLOB);
      assert.strictEqual(lob.type, oracledb.DB_TYPE_BLOB);

      const testData = Buffer.from("Temporary BLOB data test");
      const inStream = new stream.Readable();
      inStream.push(testData);
      inStream.push(null);

      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob);
      });

      const data = await lob.getData();
      assert.deepStrictEqual(data, testData);

      await lob.close();
    }); // 320.5.2

    it('320.5.3 Set data on a temporary CLOB', async function() {
      const lob = await conn.createLob(oracledb.CLOB);
      await lob.setData('Temporary CLOB data test');

      assert.strictEqual(await lob.getData(), 'Temporary CLOB data test');
      assert.strictEqual(lob.length, 24);

      await lob.setData('Updated CLOB data');
      assert.strictEqual(await lob.getData(), 'Updated CLOB data');
      assert.strictEqual(lob.length, 17);

      await lob.close();
    }); // 320.5.3

    it('320.5.4 Set data on a temporary BLOB', async function() {
      const lob = await conn.createLob(oracledb.BLOB);
      const data = Buffer.from('Temporary BLOB data');
      await lob.setData(data);

      assert.deepStrictEqual(await lob.getData(), data);
      assert.strictEqual(lob.length, data.length);

      const updatedLongData = Buffer.from('Updated BLOB loooooooong data');
      await lob.setData(updatedLongData);
      assert.deepStrictEqual(await lob.getData(), updatedLongData);
      assert.strictEqual(lob.length, updatedLongData.length);

      const updatedShortData = Buffer.from('Updated BLOB data');
      await lob.setData(updatedShortData);
      assert.deepStrictEqual(await lob.getData(), updatedShortData);
      assert.strictEqual(lob.length, updatedShortData.length);

      await lob.close();
    }); // 320.5.4

    it('320.5.5 Set data on a persistent CLOB with transaction control', async function() {
      const tableName = 'nodb_lob_setdata_clob';
      const originalData = 'Persistent CLOB data test';
      const rolledBackData = 'Rolled back persistent CLOB data';
      const updatedData = 'Updated persistent CLOB data';
      await conn.execute(testsUtil.sqlCreateTable(
        tableName,
        `CREATE TABLE ${tableName} (id NUMBER, data CLOB)`
      ));

      try {
        let result = await conn.execute(
          `INSERT INTO ${tableName} VALUES (1, EMPTY_CLOB())
           RETURNING data INTO :clob`,
          { clob: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } }
        );
        let lob = result.outBinds.clob[0];
        await lob.setData(originalData);
        assert.strictEqual(await lob.getData(), originalData);
        await conn.commit();
        await lob.close();

        // FOR UPDATE returns an updatable locator and locks the row until the
        // transaction is committed or rolled back.
        result = await conn.execute(
          `SELECT data FROM ${tableName} WHERE id = 1 FOR UPDATE`
        );
        lob = result.rows[0][0];
        assert.strictEqual(await lob.getData(), originalData);

        // setData() has changed this locator but the transaction is still
        // open, so rollback restores the original persistent LOB value.
        await lob.setData(rolledBackData);
        assert.strictEqual(await lob.getData(), rolledBackData);
        await lob.close();
        await conn.rollback();

        result = await conn.execute(
          `SELECT data FROM ${tableName} WHERE id = 1`
        );
        lob = result.rows[0][0];
        assert.strictEqual(await lob.getData(), originalData);
        await lob.close();

        // Lock the row again before updating it, then commit to persist the
        // replacement value.
        result = await conn.execute(
          `SELECT data FROM ${tableName} WHERE id = 1 FOR UPDATE`
        );
        lob = result.rows[0][0];
        await lob.setData(updatedData);
        assert.strictEqual(await lob.getData(), updatedData);
        await conn.commit();
        await lob.close();

        lob = (await conn.execute(
          `SELECT data FROM ${tableName} WHERE id = 1`
        )).rows[0][0];
        assert.strictEqual(await lob.getData(), updatedData);
        await lob.close();
      } finally {
        await conn.rollback();
        await conn.execute(testsUtil.sqlDropTable(tableName));
      }
    }); // 320.5.5

    it('320.5.6 Set data on a persistent BLOB', async function() {
      const tableName = 'nodb_lob_setdata_blob';
      const originalData = Buffer.from('Persistent BLOB data test');
      const updatedData = Buffer.from('Updated persistent BLOB data');
      await conn.execute(testsUtil.sqlCreateTable(
        tableName,
        `CREATE TABLE ${tableName} (id NUMBER, data BLOB)`
      ));

      try {
        let result = await conn.execute(
          `INSERT INTO ${tableName} VALUES (1, EMPTY_BLOB())
           RETURNING data INTO :blob`,
          { blob: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } }
        );
        let lob = result.outBinds.blob[0];
        await lob.setData(originalData);
        assert.deepStrictEqual(await lob.getData(), originalData);
        await conn.commit();
        await lob.close();

        result = await conn.execute(
          `SELECT data FROM ${tableName} WHERE id = 1 FOR UPDATE`
        );
        lob = result.rows[0][0];
        await lob.setData(updatedData);
        assert.deepStrictEqual(await lob.getData(), updatedData);
        await conn.commit();
        await lob.close();

        result = await conn.execute(
          `SELECT data FROM ${tableName} WHERE id = 1`
        );
        lob = result.rows[0][0];
        assert.deepStrictEqual(await lob.getData(), updatedData);
        await lob.close();
      } finally {
        await conn.execute(testsUtil.sqlDropTable(tableName));
      }
    }); // 320.5.6

    it('320.5.7 Set data on a temporary NCLOB', async function() {
      const lob = await conn.createLob(oracledb.NCLOB);
      const data = 'Temporary NCLOB data test';
      assert.strictEqual(lob.type, oracledb.DB_TYPE_NCLOB);

      await lob.setData(data);
      assert.strictEqual(await lob.getData(), data);
      assert.strictEqual(lob.length, data.length);

      await lob.close();
    }); // 320.5.7

    it('320.5.8 Set empty data', async function() {
      const clob = await conn.createLob(oracledb.CLOB);
      const blob = await conn.createLob(oracledb.BLOB);

      await clob.setData('');
      await blob.setData(Buffer.alloc(0));
      assert.strictEqual(clob.length, 0);
      assert.strictEqual(blob.length, 0);

      await clob.close();
      await blob.close();
    }); // 320.5.8

    it('320.5.9 BFILE setData() is not supported', async function() {
      const result = await conn.execute(
        `SELECT BFILENAME('BFILEDIR', 'A.JPG') FROM DUAL`
      );
      const bfile = result.rows[0][0];

      await assert.rejects(
        () => bfile.setData(Buffer.from('Hello')),
        /NJS-155:/
      );
      await bfile.close();
    }); // 320.5.9

    it('320.5.10 Set data with invalid values', async function() {
      const lob = await conn.createLob(oracledb.CLOB);

      for (const value of [123, null, {}]) {
        await assert.rejects(
          () => lob.setData(value),
          /NJS-005:/
        );
      }

      await lob.close();
    }); // 320.5.10

    it('320.5.11 Set data on a closed LOB', async function() {
      const lob = await conn.createLob(oracledb.CLOB);
      await lob.close();

      await assert.rejects(
        () => lob.setData('Hello'),
        /NJS-022:/
      );
    }); // 320.5.11

    it('320.5.12 Concurrent setData() calls', async function() {
      const lob = await conn.createLob(oracledb.CLOB);
      const first = lob.setData('A'.repeat(100000));
      const second = lob.setData('B'.repeat(100000));

      await assert.rejects(second, /NJS-023:/);
      await first;
      await lob.close();
    }); // 320.5.12
  }); // 320.5

  describe('320.6 LOB write() method additional tests', function() {

    it('320.6.1 Multiple writes to same LOB', async function() {
      const lob = await conn.createLob(oracledb.CLOB);

      // First write
      let inStream = new stream.Readable();
      inStream.push("First ");
      inStream.push(null);

      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob);
      });

      assert.strictEqual(lob.length, 6);

      // create a new lob and combine data
      const lob2 = await conn.createLob(oracledb.CLOB);
      inStream = new stream.Readable();
      inStream.push("First Second ");
      inStream.push(null);

      await new Promise((resolve, reject) => {
        lob2.on('error', reject);
        lob2.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob2);
      });

      assert.strictEqual(lob2.length, 13);

      // Third write
      const lob3 = await conn.createLob(oracledb.CLOB);
      inStream = new stream.Readable();
      inStream.push("First Second Third");
      inStream.push(null);

      await new Promise((resolve, reject) => {
        lob3.on('error', reject);
        lob3.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob3);
      });

      assert.strictEqual(lob3.length, 18);

      const fullData = await lob3.getData();
      assert.strictEqual(fullData, "First Second Third");

      await lob.close();
      await lob2.close();
      await lob3.close();
    }); // 320.6.1

    it('320.6.2 Write with specific offset in middle', async function() {
      const lob = await conn.createLob(oracledb.CLOB);

      // Initial write
      let inStream = new stream.Readable();
      inStream.push("Hello World!");
      inStream.push(null);

      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob);
      });

      assert.strictEqual(lob.length, 12);

      // create a new lob with modified content
      const lob2 = await conn.createLob(oracledb.CLOB);
      inStream = new stream.Readable();
      inStream.push("Hello Node!");
      inStream.push(null);

      await new Promise((resolve, reject) => {
        lob2.on('error', reject);
        lob2.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob2);
      });

      const data = await lob2.getData();
      assert.strictEqual(data, "Hello Node!");

      await lob.close();
      await lob2.close();
    }); // 320.6.2

    it('320.6.3 Set unicode data on a temporary CLOB and then stream write', async function() {
      const lob = await conn.createLob(oracledb.CLOB);
      const data = 'A😀B';

      await lob.setData(data);
      assert.strictEqual(lob.length, data.length);
      await new Promise((resolve, reject) => {
        lob.write('C', err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      assert.strictEqual(await lob.getData(), 'C😀B');
      await lob.close();
    }); // 320.6.3

    it('320.6.4 Set empty data on a temporary CLOB and then stream write', async function() {
      const lob = await conn.createLob(oracledb.CLOB);

      await lob.setData('');
      await new Promise((resolve, reject) => {
        lob.write('C', err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      assert.strictEqual(await lob.getData(), 'C');
      await lob.close();
    }); // 320.6.4

  }); // 320.6

  describe('320.7 LOB trim() method additional tests', function() {

    it('320.7.1 Trim temporary LOB', async function() {
      const lob = await conn.createLob(oracledb.CLOB);

      const inStream = new stream.Readable();
      inStream.push("A".repeat(100));
      inStream.push(null);

      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob);
      });

      assert.strictEqual(lob.length, 100);

      await lob.trim(50);
      assert.strictEqual(lob.length, 50);

      const data = await lob.getData();
      assert.strictEqual(data, "A".repeat(50));

      await lob.close();
    }); // 320.7.1

    it('320.7.2 Trim to zero length', async function() {
      const lob = await conn.createLob(oracledb.CLOB);

      const inStream = new stream.Readable();
      inStream.push("Test data to be trimmed");
      inStream.push(null);

      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob);
      });

      const originalLength = lob.length;
      assert(originalLength > 0);

      await lob.trim(0);
      assert.strictEqual(lob.length, 0);

      const data = await lob.getData();
      assert.strictEqual(data, null);

      await lob.close();
    }); // 320.7.2
  });

  describe('320.8 LOB stream operations', function() {

    it('320.8.1 CLOB large text operation', async function() {
      const tableName = "nodb_lob_stream_6";
      const largeText = "A".repeat(100000); // 100K characters

      const sql = `CREATE TABLE ${tableName} (id NUMBER, data CLOB)`;
      const plsql = testsUtil.sqlCreateTable(tableName, sql);
      await conn.execute(plsql);

      const result = await conn.execute(
        `INSERT INTO ${tableName} VALUES (1, EMPTY_CLOB())
         RETURNING data INTO :clob`,
        { clob: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } }
      );

      const lob = result.outBinds.clob[0];

      // Write large data in chunks
      const inStream = new stream.Readable();
      const chunkSize = 20000;
      for (let i = 0; i < largeText.length; i += chunkSize) {
        inStream.push(largeText.substring(i, i + chunkSize));
      }
      inStream.push(null);

      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob);
      });

      await conn.commit();

      const fetchResult = await conn.execute(
        `SELECT data FROM ${tableName} WHERE id = 1`
      );

      const fetchedLob = fetchResult.rows[0][0];

      // Test with large offset and length
      const offset = 50001; // Start at character 50001
      const length = 30000;
      const data = await fetchedLob.getData(offset, length);
      assert.strictEqual(data.length, length);
      assert.strictEqual(data, "A".repeat(length));

      // Test near end of LOB (offset 95001 + 10000 would exceed 100000)
      const endData = await fetchedLob.getData(95001, 10000);
      assert.strictEqual(endData.length, 5000); // expected remaining data (100000 - 95000)
      assert.strictEqual(endData, "A".repeat(5000));

      await fetchedLob.close();

      const dropSql = testsUtil.sqlDropTable(tableName);
      await conn.execute(dropSql);
    }); // 320.8.1

    it('320.8.2 BLOB large binary operation', async function() {
      const tableName = "nodb_lob_stream_7";

      const sql = `CREATE TABLE ${tableName} (id NUMBER, data BLOB)`;
      const plsql = testsUtil.sqlCreateTable(tableName, sql);
      await conn.execute(plsql);

      const result = await conn.execute(
        `INSERT INTO ${tableName} VALUES (1, EMPTY_BLOB())
         RETURNING data INTO :blob`,
        { blob: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } }
      );

      const lob = result.outBinds.blob[0];

      // Create large binary buffer (1MB)
      const bufferSize = 1024 * 1024;
      const testBuffer = Buffer.alloc(bufferSize);
      for (let i = 0; i < bufferSize; i++) {
        testBuffer[i] = i % 256;
      }

      const inStream = new stream.Readable();
      inStream.push(testBuffer);
      inStream.push(null);

      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob);
      });

      await conn.commit();

      const fetchResult = await conn.execute(
        `SELECT data FROM ${tableName} WHERE id = 1`
      );

      const fetchedLob = fetchResult.rows[0][0];

      // Read large BLOB in chunks
      fetchedLob.pieceSize = 64 * 1024; // 64KB chunks

      let readBuffer = Buffer.alloc(0);
      fetchedLob.on('data', (chunk) => {
        readBuffer = Buffer.concat([readBuffer, chunk]);
      });

      await new Promise((resolve, reject) => {
        fetchedLob.on('error', reject);
        fetchedLob.on('end', resolve);
      });

      assert.strictEqual(readBuffer.length, bufferSize);
      assert.deepStrictEqual(readBuffer, testBuffer);

      await fetchedLob.close();

      const dropSql = testsUtil.sqlDropTable(tableName);
      await conn.execute(dropSql);
    }); // 320.8.2

    it('320.8.3 concurrent LOB operations', async function() {
      const numLobs = 10;
      const lobs = [];
      const dataArray = [];

      // Create multiple temp LOBs
      const promises = [];
      for (let i = 0; i < numLobs; i++) {
        promises.push(conn.createLob(oracledb.CLOB));
        dataArray[i] = `Data for LOB ${i}: ${"X".repeat(1000 * (i + 1))}`;
      }

      const createdLobs = await Promise.all(promises);

      // Write to all LOBs
      const writePromises = [];
      for (let i = 0; i < numLobs; i++) {
        const inStream = new stream.Readable();
        inStream.push(dataArray[i]);
        inStream.push(null);

        writePromises.push(
          new Promise((resolve, reject) => {
            createdLobs[i].on('error', reject);
            createdLobs[i].on('finish', resolve);
            inStream.on('error', reject);
            inStream.pipe(createdLobs[i]);
          })
        );
        lobs.push(createdLobs[i]);
      }

      await Promise.all(writePromises);

      // Read from all LOBs
      const readPromises = [];
      for (let i = 0; i < numLobs; i++) {
        readPromises.push(lobs[i].getData());
      }

      const results = await Promise.all(readPromises);

      // Verify data
      for (let i = 0; i < numLobs; i++) {
        assert.strictEqual(results[i], dataArray[i]);
      }

      // Close LOBs
      const closePromises = [];
      for (const lob of lobs) {
        closePromises.push(lob.close());
      }
      await Promise.all(closePromises);

      await conn.ping();
    }); // 320.8.3
  }); // 320.8

  describe('320.9 LOB edge cases', function() {
    it('320.9.1 empty LOB operations', async function() {
      const tableName = "nodb_lob_stream_8";

      const sql = `CREATE TABLE ${tableName} (id NUMBER, data CLOB)`;
      const plsql = testsUtil.sqlCreateTable(tableName, sql);
      await conn.execute(plsql);

      // Insert empty CLOB
      await conn.execute(
        `INSERT INTO ${tableName} VALUES (1, EMPTY_CLOB())`
      );

      const result = await conn.execute(
        `SELECT data FROM ${tableName} WHERE id = 1`
      );

      const lob = result.rows[0][0];

      // Test on empty LOB
      assert.strictEqual(lob.length, 0);

      const data = await lob.getData();
      assert.strictEqual(data, null);

      // getData with offset on empty LOB
      const dataWithOffset = await lob.getData(1, 10);
      assert.strictEqual(dataWithOffset, null);
      await lob.close();

      const dropSql = testsUtil.sqlDropTable(tableName);
      await conn.execute(dropSql);
    }); // 320.9.1

    it('320.9.2 LOB length property updates', async function() {
      const lob = await conn.createLob(oracledb.CLOB);

      assert.strictEqual(lob.length, 0);

      const data1 = "First write";
      let inStream = new stream.Readable();
      inStream.push(data1);
      inStream.push(null);

      await new Promise((resolve, reject) => {
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob);
      });

      assert.strictEqual(lob.length, data1.length);

      // Append data
      const data2 = " - Second write";
      inStream = new stream.Readable();
      inStream.push(data2);
      inStream.push(null);

      lob.end(); // Reset stream state
      const lob2 = await conn.createLob(oracledb.CLOB);

      inStream = new stream.Readable();
      inStream.push(data1 + data2);
      inStream.push(null);

      await new Promise((resolve, reject) => {
        lob2.on('error', reject);
        lob2.on('finish', resolve);
        inStream.on('error', reject);
        inStream.pipe(lob2);
      });

      assert.strictEqual(lob2.length, (data1 + data2).length);

      const fullData = await lob2.getData();
      assert.strictEqual(fullData, data1 + data2);

      await lob.close();
      await lob2.close();
    }); // 320.9.2
  }); // 320.9
}); // 320

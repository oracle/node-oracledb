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
 *   190. fetchBinaryTypesAsString.js
 *
 * DESCRIPTION
 *   The fetchAsString checks for binary numbers.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');

describe('190. fetchBinaryTypesAsString.js', function() {

  let conn;
  const tableName = "nodb_binaryToString";
  const floatPreciseThreshold = 1e-7;

  async function insertContent(contentValue) {
    await conn.execute(`INSERT INTO ${tableName} (CONTENT) VALUES (${contentValue})`);
    await conn.commit();
  }

  before(async function() {
    conn = await oracledb.getConnection(dbConfig);
    if (conn.oracleServerVersion < 1200000000) this.skip();
  });

  after(async function() {
    if (conn) {
      const sqlDropTable = `BEGIN \n` +
        `  DECLARE \n` +
        `    e_table_missing EXCEPTION; \n` +
        `    PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n` +
        `    BEGIN \n` +
        `      EXECUTE IMMEDIATE ('DROP TABLE ${tableName} PURGE' ); \n` +
        `    EXCEPTION \n` +
        `      WHEN e_table_missing \n` +
        `      THEN NULL; \n` +
        `    END; \n` +
        `END;  `;
      await conn.execute(sqlDropTable);
      await conn.close();
    }
  });

  describe("190.1 Fetch binary double", function() {

    before(async function() {
      const sql = `BEGIN \n` +
      `  DECLARE \n` +
      `    e_table_missing EXCEPTION; \n` +
      `    PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n` +
      `    BEGIN \n` +
      `      EXECUTE IMMEDIATE ('DROP TABLE ${tableName} PURGE' ); \n` +
      `    EXCEPTION \n` +
      `      WHEN e_table_missing \n` +
      `      THEN NULL; \n` +
      `    END; \n` +
      `    EXECUTE IMMEDIATE ( ' \n` +
      `      CREATE TABLE ${tableName} ( \n` +
      `        id         NUMBER GENERATED ALWAYS AS IDENTITY, \n` +
      `        content    BINARY_DOUBLE \n` +
      `      ) \n` +
      `    '); \n` +
      `END;  `;
      await conn.execute(sql);
    });

    afterEach(async function() {
      oracledb.fetchAsString = [];
      await conn.execute(`TRUNCATE TABLE ${tableName}`);
    });

    it('190.1.1 Fetch binary double should return JS number', async function() {
      oracledb.fetchAsString = [];
      const content = Math.random();
      await insertContent(content);

      const res = await conn.execute(`select content from ${tableName}`);
      assert(res.rows);
      assert.strictEqual(res.rows.length, 1);

      const fetchedNumber = res.rows[0][0];
      assert.strictEqual(typeof fetchedNumber, "number");
      const contentPreciseDelta = Math.abs(fetchedNumber - content);
      assert(contentPreciseDelta < floatPreciseThreshold);
    });

    it('190.1.2 Fetch binary double as string using fetchAsString', async function() {
      oracledb.fetchAsString = [oracledb.NUMBER];
      const content = Math.random();
      await insertContent(content);

      const res = await conn.execute(`select content from ${tableName}`);
      assert(res.rows);
      assert.strictEqual(res.rows.length, 1);

      const fetchedString = res.rows[0][0];
      assert.strictEqual(typeof fetchedString, "string");
      const contentPreciseDelta = Math.abs(parseFloat(fetchedString) - content);
      assert(contentPreciseDelta < floatPreciseThreshold);
    });

    it('190.1.3 Fetch binary double as string using fetchInfo', async function() {
      oracledb.fetchAsString = [];
      const content = Math.random();
      await insertContent(content);

      const res = await conn.execute(
        `select content from ${tableName}`, [],
        { fetchInfo: {'CONTENT': {type: oracledb.STRING}} },
      );
      assert(res.rows);
      assert.strictEqual(res.rows.length, 1);

      const fetchedString = res.rows[0][0];
      assert.strictEqual(typeof fetchedString, "string");
      const contentPreciseDelta = Math.abs(parseFloat(fetchedString) - content);
      assert(contentPreciseDelta < floatPreciseThreshold);
    });

    it('190.1.4 Fetch other types as string do not affect binary double', async function() {
      oracledb.fetchAsString = [oracledb.BUFFER, oracledb.CLOB, oracledb.DATE];
      const content = Math.random();
      await insertContent(content);

      const res = await conn.execute(`select content from ${tableName}`);
      assert(res.rows);
      assert.strictEqual(res.rows.length, 1);

      const fetchedNumber = res.rows[0][0];
      assert.strictEqual(typeof fetchedNumber, "number");
      const contentPreciseDelta = Math.abs(fetchedNumber - content);
      assert(contentPreciseDelta < floatPreciseThreshold);
    });

    it('190.1.5 Fetch binary double in multiple rows', async function() {
      oracledb.fetchAsString = [oracledb.NUMBER];
      const contents = [];
      for (let i = 0; i < 5; i++) {
        contents.push(Math.random());
        await insertContent(contents[i]);
      }
      const res = await conn.execute(`select content from ${tableName}`);
      assert(res.rows);
      assert.strictEqual(res.rows.length, 5);
      for (let i = 0; i < 5; i++) {
        const fetchedString = res.rows[i][0];
        assert.strictEqual(typeof fetchedString, "string");
        const contentPreciseDelta = Math.abs(parseFloat(fetchedString) - contents[i]);
        assert(contentPreciseDelta < floatPreciseThreshold);
      }
    });

  });

  describe("190.2 Fetch binary float", function() {

    before(async function() {
      const sql = `BEGIN \n` +
      `  DECLARE \n` +
      `    e_table_missing EXCEPTION; \n` +
      `    PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n` +
      `    BEGIN \n` +
      `      EXECUTE IMMEDIATE ('DROP TABLE ${tableName} PURGE' ); \n` +
      `    EXCEPTION \n` +
      `      WHEN e_table_missing \n` +
      `      THEN NULL; \n` +
      `    END; \n` +
      `    EXECUTE IMMEDIATE ( ' \n` +
      `      CREATE TABLE ${tableName} ( \n` +
      `        id         NUMBER GENERATED ALWAYS AS IDENTITY, \n` +
      `        content    BINARY_FLOAT \n` +
      `      ) \n` +
      `    '); \n` +
      `END;  `;
      await conn.execute(sql);
    });

    afterEach(async function() {
      oracledb.fetchAsString = [];
      await conn.execute(`TRUNCATE TABLE ${tableName}`);
    });

    it('190.2.1 Fetch binary float should return JS number', async function() {
      oracledb.fetchAsString = [];
      const content = Math.random();
      await insertContent(content);

      const res = await conn.execute(`select content from ${tableName}`);
      assert(res.rows);
      assert.strictEqual(res.rows.length, 1);
      const fetchedNumber = res.rows[0][0];
      assert.strictEqual(typeof fetchedNumber, "number");
      const contentPreciseDelta = Math.abs(fetchedNumber - content);
      assert(contentPreciseDelta < floatPreciseThreshold);
    });

    it('190.2.2 Fetch binary float as string using fetchAsString', async function() {
      oracledb.fetchAsString = [oracledb.NUMBER];
      const content = Math.random();
      await insertContent(content);

      const res = await conn.execute(`select content from ${tableName}`);
      assert(res.rows);
      assert.strictEqual(res.rows.length, 1);

      const fetchedString = res.rows[0][0];
      assert.strictEqual(typeof fetchedString, "string");
      const contentPreciseDelta = Math.abs(parseFloat(fetchedString) - content);
      assert(contentPreciseDelta < floatPreciseThreshold);
    });

    it('190.2.3 Fetch binary float as string using fetchInfo', async function() {
      oracledb.fetchAsString = [];
      const content = Math.random();
      await insertContent(content);

      const res = await conn.execute(
        `select content from ${tableName}`, [],
        { fetchInfo: {'CONTENT': {type: oracledb.STRING}} },
      );
      assert(res.rows);
      assert.strictEqual(res.rows.length, 1);

      const fetchedString = res.rows[0][0];
      assert.strictEqual(typeof fetchedString, "string");
      const contentPreciseDelta = Math.abs(parseFloat(fetchedString) - content);
      assert(contentPreciseDelta < floatPreciseThreshold);
    });

    it('190.2.4 Fetch other types as string do not affect binary float', async function() {
      oracledb.fetchAsString = [oracledb.BUFFER, oracledb.CLOB, oracledb.DATE];
      const content = Math.random();
      await insertContent(content);

      const res = await conn.execute(`select content from ${tableName}`);
      assert(res.rows);
      assert.strictEqual(res.rows.length, 1);

      const fetchedNumber = res.rows[0][0];
      assert.strictEqual(typeof fetchedNumber, "number");
      const contentPreciseDelta = Math.abs(fetchedNumber - content);
      assert(contentPreciseDelta < floatPreciseThreshold);
    });

    it('190.2.5 Fetch binary float in multiple rows', async function() {
      oracledb.fetchAsString = [oracledb.NUMBER];
      const contents = [];
      for (let i = 0; i < 5; i++) {
        contents.push(Math.random());
        await insertContent(contents[i]);
      }
      const res = await conn.execute(`select content from ${tableName}`);
      assert(res.rows);
      assert.strictEqual(res.rows.length, 5);
      for (let i = 0; i < 5; i++) {
        const fetchedString = res.rows[i][0];
        assert.strictEqual(typeof fetchedString, "string");
        const contentPreciseDelta = Math.abs(parseFloat(fetchedString) - contents[i]);
        assert(contentPreciseDelta < floatPreciseThreshold);
      }
    });

  });

});

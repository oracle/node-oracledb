/* Copyright (c) 2019, 2022, Oracle and/or its affiliates. */

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
const should    = require('should');
const dbConfig  = require('./dbconfig.js');

describe('190. fetchBinaryTypesAsString.js', function() {

  let conn;
  const tableName = "nodb_binaryToString";
  const floatPreciseThreshold = 1e-7;

  async function insertContent(contentValue) {
    try {
      await conn.execute(`INSERT INTO ${tableName} (CONTENT) VALUES (${contentValue})`);
      await conn.commit();
    } catch (err) {
      should.not.exist(err);
    }
  }

  before(async function() {
    try {
      conn = await oracledb.getConnection(dbConfig);
      if (conn.oracleServerVersion < 1200000000) this.skip();
    } catch (err) {
      should.not.exist(err);
    }
  });

  after(async function() {
    if (conn) {
      try {
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
      } catch (err) {
        should.not.exist(err);
      }
    }
  });

  describe("190.1 Fetch binary double", function() {

    before(async function() {
      try {
        let sql = `BEGIN \n` +
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
      } catch (err) {
        should.not.exist(err);
      }
    });

    afterEach(async function() {
      try {
        oracledb.fetchAsString = [];
        await conn.execute(`TRUNCATE TABLE ${tableName}`);
      } catch (err) {
        should.not.exist(err);
      }
    });

    it('190.1.1 Fetch binary double should return JS number', async function() {
      try {
        oracledb.fetchAsString = [];
        const content = Math.random();
        await insertContent(content);

        let res = await conn.execute(`select content from ${tableName}`);
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);

        let fetchedNumbner = res.rows[0][0];
        fetchedNumbner.should.be.type("number");
        let contentPreciseDelta = Math.abs(fetchedNumbner - content);
        (contentPreciseDelta < floatPreciseThreshold).should.be.true();
      } catch (err) {
        should.not.exist(err);
      }
    });

    it('190.1.2 Fetch binary double as string using fetchAsString', async function() {
      try {
        oracledb.fetchAsString = [oracledb.NUMBER];
        const content = Math.random();
        await insertContent(content);

        let res = await conn.execute(`select content from ${tableName}`);
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);

        let fetchedString = res.rows[0][0];
        fetchedString.should.be.type("string");
        let contentPreciseDelta = Math.abs(parseFloat(fetchedString) - content);
        (contentPreciseDelta < floatPreciseThreshold).should.be.true();
      } catch (err) {
        should.not.exist(err);
      }
    });

    it('190.1.3 Fetch binary double as string using fetchInfo', async function() {
      try {
        oracledb.fetchAsString = [];
        const content = Math.random();
        await insertContent(content);

        let res = await conn.execute(
          `select content from ${tableName}`, [],
          { fetchInfo: {'CONTENT': {type: oracledb.STRING}} },
        );
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);

        let fetchedString = res.rows[0][0];
        fetchedString.should.be.type("string");
        let contentPreciseDelta = Math.abs(parseFloat(fetchedString) - content);
        (contentPreciseDelta < floatPreciseThreshold).should.be.true();
      } catch (err) {
        should.not.exist(err);
      }
    });

    it('190.1.4 Fetch other types as string do not affect binary double', async function() {
      try {
        oracledb.fetchAsString = [oracledb.BUFFER, oracledb.CLOB, oracledb.DATE];
        const content = Math.random();
        await insertContent(content);

        let res = await conn.execute(`select content from ${tableName}`);
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);

        let fetchedNumbner = res.rows[0][0];
        fetchedNumbner.should.be.type("number");
        let contentPreciseDelta = Math.abs(fetchedNumbner - content);
        (contentPreciseDelta < floatPreciseThreshold).should.be.true();
      } catch (err) {
        should.not.exist(err);
      }
    });

    it('190.1.5 Fetch binary double in multiple rows', async function() {
      try {
        oracledb.fetchAsString = [oracledb.NUMBER];
        let contents = [];
        for (let i = 0; i < 5; i++) {
          contents.push(Math.random());
          await insertContent(contents[i]);
        }
        let res = await conn.execute(`select content from ${tableName}`);
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 5);
        for (let i = 0; i < 5; i++) {
          let fetchedString = res.rows[i][0];
          fetchedString.should.be.type("string");
          let contentPreciseDelta = Math.abs(parseFloat(fetchedString) - contents[i]);
          (contentPreciseDelta < floatPreciseThreshold).should.be.true();
        }
      } catch (err) {
        should.not.exist(err);
      }
    });

  });

  describe("190.2 Fetch binary float", function() {

    before(async function() {
      try {
        let sql = `BEGIN \n` +
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
      } catch (err) {
        should.not.exist(err);
      }
    });

    afterEach(async function() {
      try {
        oracledb.fetchAsString = [];
        await conn.execute(`TRUNCATE TABLE ${tableName}`);
      } catch (err) {
        should.not.exist(err);
      }
    });

    it('190.2.1 Fetch binary float should return JS number', async function() {
      try {
        oracledb.fetchAsString = [];
        const content = Math.random();
        await insertContent(content);

        let res = await conn.execute(`select content from ${tableName}`);
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);
        let fetchedNumbner = res.rows[0][0];

        fetchedNumbner.should.be.type("number");
        let contentPreciseDelta = Math.abs(fetchedNumbner - content);
        (contentPreciseDelta < floatPreciseThreshold).should.be.true();
      } catch (err) {
        should.not.exist(err);
      }
    });

    it('190.2.2 Fetch binary float as string using fetchAsString', async function() {
      try {
        oracledb.fetchAsString = [oracledb.NUMBER];
        const content = Math.random();
        await insertContent(content);

        let res = await conn.execute(`select content from ${tableName}`);
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);

        let fetchedString = res.rows[0][0];
        fetchedString.should.be.type("string");
        let contentPreciseDelta = Math.abs(parseFloat(fetchedString) - content);
        (contentPreciseDelta < floatPreciseThreshold).should.be.true();
      } catch (err) {
        should.not.exist(err);
      }
    });

    it('190.2.3 Fetch binary float as string using fetchInfo', async function() {
      try {
        oracledb.fetchAsString = [];
        const content = Math.random();
        await insertContent(content);

        let res = await conn.execute(
          `select content from ${tableName}`, [],
          { fetchInfo: {'CONTENT': {type: oracledb.STRING}} },
        );
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);

        let fetchedString = res.rows[0][0];
        fetchedString.should.be.type("string");
        let contentPreciseDelta = Math.abs(parseFloat(fetchedString) - content);
        (contentPreciseDelta < floatPreciseThreshold).should.be.true();
      } catch (err) {
        should.not.exist(err);
      }
    });

    it('190.2.4 Fetch other types as string do not affect binary float', async function() {
      try {
        oracledb.fetchAsString = [oracledb.BUFFER, oracledb.CLOB, oracledb.DATE];
        const content = Math.random();
        await insertContent(content);

        let res = await conn.execute(`select content from ${tableName}`);
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);

        let fetchedNumbner = res.rows[0][0];
        fetchedNumbner.should.be.type("number");
        let contentPreciseDelta = Math.abs(fetchedNumbner - content);
        (contentPreciseDelta < floatPreciseThreshold).should.be.true();
      } catch (err) {
        should.not.exist(err);
      }
    });

    it('190.2.5 Fetch binary float in multiple rows', async function() {
      try {
        oracledb.fetchAsString = [oracledb.NUMBER];
        let contents = [];
        for (let i = 0; i < 5; i++) {
          contents.push(Math.random());
          await insertContent(contents[i]);
        }
        let res = await conn.execute(`select content from ${tableName}`);
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 5);
        for (let i = 0; i < 5; i++) {
          let fetchedString = res.rows[i][0];
          fetchedString.should.be.type("string");
          let contentPreciseDelta = Math.abs(parseFloat(fetchedString) - contents[i]);
          (contentPreciseDelta < floatPreciseThreshold).should.be.true();
        }
      } catch (err) {
        should.not.exist(err);
      }
    });

  });

});

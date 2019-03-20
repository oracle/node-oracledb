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
 *   188. fetchRawAsString.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - RAW.
 *    To fetch RAW columns as strings.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');
const testUtil = require('./testsUtil');

describe('188. fetchRowidAsString.js', function() {

  let conn = null;
  const tableName = "nodb_rawToString";

  const rawMaxLength = 20;

  const rawContentString = random.getRandomLengthString(5);
  const rawContentNumber = random.getRandomInt(1, 99);
  const rawContentFloat = Math.random();
  const rawMaxLengthString = random.getRandomLengthString(rawMaxLength);

  function getHex(num, type) {
    let view, length;
    if (type === "float") {
      length = 4;
      view = new DataView(new ArrayBuffer(length));
      view.setFloat32(0, num);
    } else if (type === "double") {
      length = 8;
      view = new DataView(new ArrayBuffer(length));
      view.setFloat64(0, num);
    } else if (type === "integer") {
      length = 4;
      view = new DataView(new ArrayBuffer(length));
      view.setInt32(0, num);
    } else if (type === "number") {
      // Only apply to oracle number type in range 1~99 !
      return (0xc101 + num).toString(16);
    }

    const hx = (i) => ('00' + i.toString(16)).slice(-2);

    return Array
      .apply(null, { length })
      .map((_, i) => hx(view.getUint8(i)))
      .join('');
  }

  before(async function() {
    try {
      conn = await oracledb.getConnection(dbConfig);
    } catch (err) {
      should.not.exist(err);
    }
  });

  after(async function() {
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
  });

  afterEach(function() {
    oracledb.fetchAsString = [];
  });

  describe("188.1 Normal Use Cases", function() {

    before(async function() {
      try {
        const sqlCreateTable = `BEGIN \n` +
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
          `        raw_content    RAW(${rawMaxLength})  NULL, \n` +
          `        content_type   VARCHAR(20) \n` +
          `      ) \n` +
          `    '); \n` +
          `END;  `;
        await conn.execute(sqlCreateTable);

        let sql = `INSERT INTO ${tableName} VALUES(utl_raw.cast_to_raw('${rawContentString}'), 'string')`;
        await conn.execute(sql);
        sql = `INSERT INTO ${tableName} VALUES(utl_raw.cast_from_number(${rawContentNumber}), 'number')`;
        await conn.execute(sql);
        sql = `INSERT INTO ${tableName} VALUES(utl_raw.cast_from_binary_double(${rawContentFloat}), 'binary_double')`;
        await conn.execute(sql);
        sql = `INSERT INTO ${tableName} VALUES(utl_raw.cast_from_binary_float(${rawContentFloat}), 'binary_float')`;
        await conn.execute(sql);
        sql = `INSERT INTO ${tableName} VALUES(utl_raw.cast_from_binary_integer(${rawContentNumber}), 'binary_integer')`;
        await conn.execute(sql);
        sql = `INSERT INTO ${tableName} VALUES(utl_raw.cast_to_raw('${rawMaxLengthString}'), 'max_length_string')`;
        await conn.execute(sql);
        await conn.commit();
      } catch (err) {
        should.not.exist(err);
      }
    });

    it("188.1.1 Fetch RAW by default should be oracledb.BUFFER type", async function() {
      try {
        let res = await conn.execute(`select raw_content from ${tableName} where content_type='string'`);
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);
        let fetchedContent = res.rows[0][0];
        fetchedContent.should.be.type("object");
        should.strictEqual(fetchedContent.toString("hex"), Buffer.from(rawContentString).toString("hex"));
      } catch (err) {
        should.not.exist(err);
      }
    });

    it("188.1.2 Fetch RAW as string by defining fetchAsString", async function() {
      try {
        oracledb.fetchAsString = [oracledb.BUFFER];
        let res = await conn.execute(`select raw_content from ${tableName} where content_type='string'`);
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);
        let fetchedContent = res.rows[0][0];
        fetchedContent.should.be.type("string");
        should.strictEqual(fetchedContent.toLowerCase(), Buffer.from(rawContentString).toString("hex"));
      } catch (err) {
        should.not.exist(err);
      }
    });

    it("188.1.3 Fetch RAW as string by defining fetchInfo", async function() {
      try {
        oracledb.fetchAsString = [];
        let res = await conn.execute(
          `select raw_content from ${tableName} where content_type='string'`, [],
          { fetchInfo: {"RAW_CONTENT": {type: oracledb.STRING}} }
        );
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);
        let fetchedContent = res.rows[0][0];
        fetchedContent.should.be.type("string");
        should.strictEqual(fetchedContent.toLowerCase(), Buffer.from(rawContentString).toString("hex"));
      } catch (err) {
        should.not.exist(err);
      }
    });

    it("188.1.4 Fetch number converted RAW as string", async function() {
      try {
        oracledb.fetchAsString = [oracledb.BUFFER];
        let res = await conn.execute(`select raw_content from ${tableName} where content_type='number'`);
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);
        let fetchedContent = res.rows[0][0];
        fetchedContent.should.be.type("string");
        should.strictEqual(fetchedContent.toLowerCase(), getHex(rawContentNumber, "number"));
      } catch (err) {
        should.not.exist(err);
      }
    });

    it("188.1.5 Fetch binary double converted RAW as string", async function() {
      try {
        oracledb.fetchAsString = [oracledb.BUFFER];
        let res = await conn.execute(`select raw_content from ${tableName} where content_type='binary_double'`);
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);
        let fetchedContent = res.rows[0][0];
        fetchedContent.should.be.type("string");
        should.strictEqual(fetchedContent.toLowerCase(), getHex(rawContentFloat, "double"));
      } catch (err) {
        should.not.exist(err);
      }
    });

    it("188.1.6 Fetch binary float converted RAW as string", async function() {
      try {
        oracledb.fetchAsString = [oracledb.BUFFER];
        let res = await conn.execute(`select raw_content from ${tableName} where content_type='binary_float'`);
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);
        let fetchedContent = res.rows[0][0];
        fetchedContent.should.be.type("string");
        should.strictEqual(fetchedContent.toLowerCase(), getHex(rawContentFloat, "float"));
      } catch (err) {
        should.not.exist(err);
      }
    });

    it("188.1.7 Fetch binary integer converted RAW as string", async function() {
      try {
        oracledb.fetchAsString = [oracledb.BUFFER];
        let res = await conn.execute(`select raw_content from ${tableName} where content_type='binary_integer'`);
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);
        let fetchedContent = res.rows[0][0];
        fetchedContent.should.be.type("string");
        should.strictEqual(fetchedContent.toLowerCase(), getHex(rawContentNumber, "integer"));
      } catch (err) {
        should.not.exist(err);
      }
    });

    it("188.1.8 Insert a string of maximum lenght of RAW then fetch it as string", async function() {
      try {
        oracledb.fetchAsString = [oracledb.BUFFER];
        let res = await conn.execute(`select raw_content from ${tableName} where content_type='max_length_string'`);
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);
        let fetchedContent = res.rows[0][0];
        fetchedContent.should.be.type("string");
        should.strictEqual(fetchedContent.toLowerCase(), Buffer.from(rawMaxLengthString).toString("hex"));
      } catch (err) {
        should.not.exist(err);
      }
    });

    it("188.1.9 Insert a string exceeds maximum lenght of RAW", async function() {
      try {
        let contentString = random.getRandomLengthString(rawMaxLength+1);
        const sql = `INSERT INTO ${tableName} VALUES(utl_raw.cast_to_raw('${contentString}'), 'string')`;
        await testUtil.assertThrowsAsync(async () => {
          await conn.execute(sql);
          await conn.commit();
        }, /ORA-12899:/); // ORA-12899: value too large for column "HR"."NODB_RAWTOSTRING"."RAW_CONTENT" (actual: 21, maximum: 20)
      } catch (err) {
        should.not.exist(err);
      }
    });

    it("188.1.10 Insert null to RAW column then fetch it as string", async function() {
      try {
        const sql = `INSERT INTO ${tableName} VALUES(null, 'null')`;
        await conn.execute(sql);
        await conn.commit();
        oracledb.fetchAsString = [oracledb.BUFFER];
        let res = await conn.execute(`select raw_content from ${tableName} where content_type='null'`);
        should.exist(res.rows);
        should.strictEqual(res.rows.length, 1);
        should.strictEqual(res.rows[0][0], null);
      } catch (err) {
        should.not.exist(err);
      }
    });
  });

  describe("188.2 Boundary Cases", function() {

    it("188.2.1 Creating table specifing length greater than RAW max limit", async function() {
      try {
        const sql_create_table = `BEGIN \n` +
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
          `        raw_content    RAW(2001), \n` +
          `        content_type   VARCHAR(20) \n` +
          `      ) \n` +
          `    '); \n` +
          `END;  `;
        await testUtil.assertThrowsAsync(async () => {
          await conn.execute(sql_create_table);
        }, /ORA-00910:/); // ORA-00910: specified length too long for its datatype
      } catch (err) {
        should.not.exist(err);
      }
    });

  });

});

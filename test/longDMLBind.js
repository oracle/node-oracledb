/* Copyright (c) 2017, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   125. longDMLBind.js
 *
 * DESCRIPTION
 *    Test LONG type DML support.
 *    Long column restrictions: http://docs.oracle.com/cd/B19306_01/server.102/b14200/sql_elements001.htm#SQLRF00201
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');
const sql      = require('./sqlClone.js');

describe('125. longDMLBind.js', function() {

  var connection = null;
  var tableName = "nodb_long";
  var insertID = 0;
  var table_create = "BEGIN \n" +
                     "    DECLARE \n" +
                     "        e_table_missing EXCEPTION; \n" +
                     "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                     "    BEGIN \n" +
                     "        EXECUTE IMMEDIATE('DROP TABLE " + tableName + " PURGE'); \n" +
                     "    EXCEPTION \n" +
                     "        WHEN e_table_missing \n" +
                     "        THEN NULL; \n" +
                     "    END; \n" +
                     "    EXECUTE IMMEDIATE (' \n" +
                     "        CREATE TABLE " + tableName + " ( \n" +
                     "            id         NUMBER, \n" +
                     "            content    LONG \n" +
                     "        ) \n" +
                     "    '); \n" +
                     "END; ";
  var table_drop = "DROP TABLE " + tableName + " PURGE";

  before(async function() {
    try {
      connection = await oracledb.getConnection(dbConfig);
      sql.executeSql(connection, table_create, {}, {});
    } catch (err) {
      assert.ifError(err);
    }
  }); // before

  after(async function() {
    try {
      await sql.executeSql(connection, table_drop, {}, {});
      await connection.release();
    } catch (err) {
      assert.ifError(err);
    }

  }); // after

  beforeEach(function() {
    insertID++;
  });

  describe('125.1 INSERT and SELECT', function() {

    it('125.1.1 works with data size 64K - 1', async function() {
      await test1(random.getRandomLengthString(65535), 65535);
    });

    it('125.1.2 works with data size 64K', async function() {
      await test1(random.getRandomLengthString(65536), 65536);
    });

    it('125.1.3 works with data size 64K + 1', async function() {
      await test1(random.getRandomLengthString(65537), 65537);
    });

    it('125.1.4 works with data size 1MB + 1', async function() {
      const size = 1 * 1024 * 1024 + 1;
      await test1(random.getRandomLengthString(size), size);
    });

  }); // 125.1

  describe('125.2 UPDATE', function() {

    it('125.2.1 works with data size 64K - 1', async function() {
      await test2(random.getRandomLengthString(100), random.getRandomLengthString(65535), 65535);
    });

    it('125.2.2 works with data size 64K', async function() {
      await test2(random.getRandomLengthString(200), random.getRandomLengthString(65536), 65536);
    });

    it('125.2.3 works with data size 64K + 1', async function() {
      await test2(random.getRandomLengthString(10), random.getRandomLengthString(65537), 65537);
    });

    it('125.2.4 works with data size 1MB + 1', async function() {
      const size = 1 * 1024 * 1024 + 1;
      await test2(random.getRandomLengthString(65536), random.getRandomLengthString(size), size);
    });

  }); // 125.3

  describe('125.3 RETURNING INTO', function() {

    it('125.3.1 do not support in returning into', async function() {
      await test3(random.getRandomLengthString(100), random.getRandomLengthString(65535));
    });

  }); // 125.3

  var test1 = async function(content, maxsize) {
    await insert(content, maxsize);
    await fetch(content);
  };

  var test2 = async function(insertedStr, updateStr, maxsize) {
    await insert(insertedStr, insertedStr.length);
    await update(updateStr, maxsize);
    await fetch(updateStr);
  };

  var test3 = async function(insertedStr, updateStr) {
    await insert(insertedStr, insertedStr.length);
    await returning(updateStr);
  };

  var insert = async function(content, maxsize) {
    const sql_query = "insert into " + tableName + " (id, content) values (:i, :c)";
    const bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: maxsize }
    };
    const result = await connection.execute(sql_query, bindVar);
    assert(result);
    assert.equal(1, result.rowsAffected);
  };

  var update = async function(content, maxsize) {
    const sql_query = "update " + tableName + " set content = :c where id = :i";
    const bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: maxsize }
    };
    const result = await connection.execute(sql_query, bindVar);
    assert(result);
    assert.equal(1, result.rowsAffected);
  };

  var returning = async function(content) {
    const sql_query = "update " + tableName + " set content = :c1 where id = :i returning content into :c2";
    const bindVar = {
      i: { val: insertID, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c1: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING },
      c2: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
    };
    try {
      await connection.execute(sql_query, bindVar);
    } catch (err) {
      assert.equal(err.message.substring(0, 10), "ORA-22816:");
    }
    // ORA-22816: unsupported feature with RETURNING clause
  };

  var fetch = async function(expected) {
    const sql_query = "select content from " + tableName + " where id = " + insertID;
    const result = await connection.execute(sql_query);
    assert(result);
    assert.strictEqual(result.rows[0][0], expected);

  };

});

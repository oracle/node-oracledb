/* Copyright (c) 2017, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   52. connClose.js
 *
 * DESCRIPTION
 *   Negative cases against connection.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('52. connClose.js', function() {

  it('52.1 can not set property, stmtCacheSize, after connection closes', async function() {
    try {
      const connection = await oracledb.getConnection(dbConfig);
      const defaultSize = 30;
      assert.strictEqual(connection.stmtCacheSize, defaultSize);
      await connection.release();
      assert.throws(
        function() {
          connection.stmtCacheSize = 10;
        },
        "TypeError: Cannot assign to read only property 'stmtCacheSize' of object '#<Connection>'"
      );
    } catch (error) {
      assert.fail(error);
    }
  }); // 52.1

  it('52.2 can not set property, clientId, after connection closes', async function() {
    try {
      const connection = await oracledb.getConnection(dbConfig);
      assert(connection);
      await connection.release();
      assert.throws(
        function() {
          connection.clientId = "52.3";
        },
        /NJS-003: invalid connection/
      );
    } catch (error) {
      assert.fail(error);
    }
  }); // 52.2

  it('52.3 can not set property, module', async function() {
    try {
      const connection = await oracledb.getConnection(dbConfig);
      assert(connection);
      await connection.release();
      assert.throws(
        function() {
          connection.module = "52.4";
        },
        /NJS-003: invalid connection/
      );
    } catch (error) {
      assert.fail(error);
    }
  }); // 52.3

  it('52.4 can not set property, action', async function() {
    try {
      const connection = await oracledb.getConnection(dbConfig);
      assert(connection);
      await connection.release();
      assert.throws(
        function() {
          connection.module = "52.5";
        },
        /NJS-003: invalid connection/
      );
    } catch (error) {
      assert.fail(error);
    }
  }); // 52.4

  it('52.5 can not call method, execute()', async function() {
    try {
      const connection = await oracledb.getConnection(dbConfig);
      assert(connection);
      await connection.release();
      await assert.rejects(
        async () => {
          await connection.execute("select sysdate from dual");
        },
        /NJS-003: invalid connection/
      );
    } catch (error) {
      assert.fail(error);
    }
  }); // 52.5

  it('52.6 can not call method, break()', async function() {
    try {
      const connection = await oracledb.getConnection(dbConfig);
      assert(connection);
      await connection.release();
      await assert.rejects(
        async () => {
          await connection.break();
        },
        /NJS-003: invalid connection/
      );
    } catch (error) {
      assert.fail(error);
    }
  }); // 52.6

  it('52.7 can not call method, commit()', async function() {
    try {
      const connection = await oracledb.getConnection(dbConfig);
      assert(connection);
      await connection.release();
      await assert.rejects(
        async () => {
          await connection.commit();
        },
        /NJS-003: invalid connection/
      );
    } catch (error) {
      assert.fail(error);
    }
  }); // 52.7

  it('52.8 can not call method, createLob()', async function() {
    try {
      const connection = await oracledb.getConnection(dbConfig);
      assert(connection);
      await connection.release();
      await assert.rejects(
        async () => {
          await connection.createLob(oracledb.CLOB);
        },
        /NJS-003: invalid connection/
      );
    } catch (error) {
      assert.fail(error);
    }
  }); // 52.8

  it('52.9 can not call method, queryStream()', async function() {
    try {
      const connection = await oracledb.getConnection(dbConfig);
      assert(connection);
      await connection.release();
      const stream = await connection.queryStream("select sysdate from dual");
      assert(stream);

      var unexpectederr;
      stream.on("data", function(data) {
        assert.ifError(data);
        unexpectederr = new Error("should not emit 'data' event!");
      });

      stream.on("end", function() {
        assert.ifError("should not emit 'end' event!");
        unexpectederr = new Error("should not emit 'end' event!");
        stream.destroy();
      });

      stream.on("close", function() {
        return unexpectederr;
      });

      stream.on("error", function(err) {
        assert(err);
        assert.strictEqual(
          err.message,
          "NJS-003: invalid connection"
        );
      });
    } catch (error) {
      assert.fail(error);
    }
  }); // 52.9

  it('52.10 can not call release() multiple times', async function() {
    try {
      const connection = await oracledb.getConnection(dbConfig);
      assert(connection);
      await connection.release();
      await assert.rejects(
        async () => {
          await connection.commit();
        },
        /NJS-003: invalid connection/
      );
    } catch (error) {
      assert.fail(error);
    }
  }); // 52.10

  it('52.11 can not call method, rollback()', async function() {
    try {
      const connection = await oracledb.getConnection(dbConfig);
      assert(connection);
      await connection.release();
      await assert.rejects(
        async () => {
          await connection.rollback();
        },
        /NJS-003: invalid connection/
      );
    } catch (error) {
      assert.fail(error);
    }
  }); // 52.11

  it("52.12 can access properties of closed connection without error", async function() {
    try {
      const connection = await oracledb.getConnection(dbConfig);
      assert(connection);
      await connection.release();
      assert.strictEqual(connection.stmtCacheSize, undefined);
      assert.strictEqual(connection.oracleServerVersion, undefined);
      assert.strictEqual(connection.oracleServerVersionString, undefined);
      assert.strictEqual(connection.action, null);
      assert.strictEqual(connection.clientId, null);
      assert.strictEqual(connection.module, null);
    } catch (error) {
      assert.fail(error);
    }
  }); // 52.12

});

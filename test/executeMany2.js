/* Copyright (c) 2018, 2022, Oracle and/or its affiliates. */

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
 *   172. executeMany2.js
 *
 * DESCRIPTION
 *   This is a negative test of executeMany().
 *
 *   The executeMany(): Binds section of the doc says:
 *   The first data record determines the number of bind variables,
 *   each bind variable's data type, and its name (when binding by name).
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');

describe('172. executeMany2.js', function() {

  it('172.1 Negative - incorrect parameters', async () => {
    const schema = dbConfig.user.toUpperCase();
    const conn = await oracledb.getConnection(dbConfig);
    await conn.execute(
      `BEGIN EXECUTE IMMEDIATE 'DROP TABLE "${schema}"."NODB_TAB_SALES"'; EXCEPTION WHEN OTHERS THEN IF SQLCODE <> -942 THEN RAISE; END IF; END; `
    );
    await conn.execute(
      `create table "${schema}"."NODB_TAB_SALES" ("AMOUNT_SOLD" NUMBER(10,2))`
    );

    const sql = `insert into "${schema}"."NODB_TAB_SALES" ("AMOUNT_SOLD") values (:1)`;
    const binds = [ 48, 33, 3, 999, 1, 13.13 ];
    await assert.rejects(
      async () => await conn.executeMany(sql, binds),
      /NJS-005:/
    );
    // NJS-005: invalid value for parameter %d

    await conn.execute(
      `BEGIN EXECUTE IMMEDIATE 'DROP TABLE "${schema}"."NODB_TAB_SALES"'; EXCEPTION WHEN OTHERS THEN IF SQLCODE <> -942 THEN RAISE; END IF; END; `
    );
    await conn.commit();
    await conn.close();
  }); // 172.1

  describe("172.2 Binding tests for invalid binding variables", function() {

    beforeEach(async function() {
      const conn = await oracledb.getConnection(dbConfig);
      await conn.execute(
        `BEGIN EXECUTE IMMEDIATE 'DROP TABLE nodb_tab_emp'; EXCEPTION WHEN OTHERS THEN IF SQLCODE <> -942 THEN RAISE; END IF; END; `
      );
      await conn.execute(
        `create table nodb_tab_emp (id NUMBER, name VARCHAR2(100))`
      );
      await conn.close();
    });

    afterEach(async function() {
      const conn = await oracledb.getConnection(dbConfig);
      await conn.execute(
        `BEGIN EXECUTE IMMEDIATE 'DROP TABLE nodb_tab_emp'; EXCEPTION WHEN OTHERS THEN IF SQLCODE <> -942 THEN RAISE; END IF; END; `
      );
      await conn.close();
    });

    it('172.2.1 Negative - Binding by position and by name cannot be mixed', async () => {
      const conn = await oracledb.getConnection(dbConfig);
      const bindVars = [
        [1, "John Smith"],
        { a: 2, b: "Changjie" },
      ];
      const sql = `insert into nodb_tab_emp values (:a, :b)`;
      await assert.rejects(
        async () => await conn.executeMany(sql, bindVars),
        /NJS-055:/
      );
      // NJS-055: binding by position and name cannot be mixed
      await conn.close();
    });

    it('172.2.2 Negative - Binding an array which values are undefined will throw ORA-01008', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const sql = "insert into nodb_tab_emp values (:a, :b)";
      const binds = [undefined, undefined, undefined, undefined, undefined];
      await assert.rejects(
        async () => await conn.executeMany(sql, binds),
        /NJS-005:/
      );
      await conn.close();
    });

    it('172.2.3 Negative - Binding an array starts with undefined will throw ORA-01008', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const sql = "insert into nodb_tab_emp values (:a, :b)";
      const binds = [
        undefined,
        { a: 2, b: "foobar2" },
        { a: 3, b: "foobar3" },
        { a: 4, b: "foobar4" }
      ];
      await assert.rejects(
        async () => await conn.executeMany(sql, binds),
        /NJS-005:/
      );
      await conn.close();
    });

    it('172.2.4 Negative - Binding an array contains undefined will throw JS TypeError', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      const sql = "insert into nodb_tab_emp values (:a, :b)";
      const binds = [
        { a: 1, b: "foobar1" },
        undefined,
        { a: 3, b: "foobar3" },
        { a: 4, b: "foobar4" }
      ];
      await assert.rejects(
        async () => await conn.executeMany(sql, binds),
        /NJS-055:/
      );
      await conn.close();
    }); // 172.2.4

    it('172.2.5 Negative - Bind an empty array', async () => {
      const conn = await oracledb.getConnection(dbConfig);
      const sql = "insert into nodb_tab_emp values (:a, :b)";
      const binds = [];
      await assert.rejects(
        async () => await conn.executeMany(sql, binds),
        /NJS-005/
      );
      // NJS-005: invalid value for parameter 2
      await conn.close();
    }); // 172.2.5

    it('172.2.6 Negative - Set number of ierations to 0', async () => {
      const conn = await oracledb.getConnection(dbConfig);
      const sql = "insert into nodb_tab_emp values (:a, :b)";
      const binds = 0;
      await assert.rejects(
        async () => await conn.executeMany(sql, binds),
        /NJS-005/
      );
      // NJS-005: invalid value for parameter 2
      await conn.close();
    }); // 172.2.6

  }); // 172.2
});

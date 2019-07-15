/* Copyright (c) 2018, 2019, Oracle and/or its affiliates. All rights reserved. */

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
const should   = require('should');
const dbconfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('172. executeMany2.js', function() {

  it('172.1 Negative - incorrect parameters', async () => {

    let conn;
    let schema = dbconfig.user.toUpperCase();

    try {
      conn = await oracledb.getConnection(dbconfig);
      await conn.execute(
        `BEGIN EXECUTE IMMEDIATE 'DROP TABLE "${schema}"."NODB_TAB_SALES"'; EXCEPTION WHEN OTHERS THEN IF SQLCODE <> -942 THEN RAISE; END IF; END; `
      );
      await conn.execute(
        `create table "${schema}"."NODB_TAB_SALES" ("AMOUNT_SOLD" NUMBER(10,2))`
      );

    } catch(err) {
      should.not.exist(err);
    }

    await testsUtil.assertThrowsAsync(
      async () => {
        await conn.executeMany(
          `insert into "${schema}"."NODB_TAB_SALES" ("AMOUNT_SOLD") values (:1)`,
          [ 48, 33, 3, 999, 1, 13.13 ]
        );
      },
      /NJS-005:/
    );
    // NJS-005: invalid value for parameter %d

    try {
      await conn.execute(
        `BEGIN EXECUTE IMMEDIATE 'DROP TABLE "${schema}"."NODB_TAB_SALES"'; EXCEPTION WHEN OTHERS THEN IF SQLCODE <> -942 THEN RAISE; END IF; END; `
      );
      await conn.commit();
      await conn.close();
    } catch(err) {
      should.not.exist(err);
    }
  }); // 172.1

  describe("172.2 Binding tests for invalid binding variables", function() {

    beforeEach(async function() {
      let conn;
      try {
        conn = await oracledb.getConnection(dbconfig);
        await conn.execute(
          `BEGIN EXECUTE IMMEDIATE 'DROP TABLE nodb_tab_emp'; EXCEPTION WHEN OTHERS THEN IF SQLCODE <> -942 THEN RAISE; END IF; END; `
        );
        await conn.execute(
          `create table nodb_tab_emp (id NUMBER, name VARCHAR2(100))`
        );
      } catch(err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch (err) {
            should.not.exist(err);
          }
        }
      }
    });

    afterEach(async function() {
      let conn;
      try {
        conn = await oracledb.getConnection(dbconfig);
        await conn.execute(
          `BEGIN EXECUTE IMMEDIATE 'DROP TABLE nodb_tab_emp'; EXCEPTION WHEN OTHERS THEN IF SQLCODE <> -942 THEN RAISE; END IF; END; `
        );
        await conn.commit();
      } catch(err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch (err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('172.2.1 Negative - Binding by position and by name cannot be mixed', async () => {
      let conn;
      try {
        conn = await oracledb.getConnection(dbconfig);
        const bindVars = [
          [1, "John Smith"],
          { a: 2, b: "Changjie" },
        ];
        await testsUtil.assertThrowsAsync(
          async () => {
            await conn.executeMany(
              `insert into nodb_tab_emp values (:a, :b)`,
              bindVars
            );
          },
          /NJS-055:/
        );
        // NJS-055: binding by position and name cannot be mixed
      } catch(err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch (err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('172.2.2 Negative - Binding an array which values are undefined will throw ORA-01008', async function() {
      let conn;
      try {
        conn = await oracledb.getConnection(dbconfig);
        await testsUtil.assertThrowsAsync(
          async () => {
            await conn.executeMany(
              "insert into nodb_tab_emp values (:a, :b)",
              [undefined, undefined, undefined, undefined, undefined]
            );
          },
          /ORA-01008/ //ORA-01008: not all variables bound
        );
      } catch(err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch (err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('172.2.3 Negative - Binding an array starts with undefined will throw ORA-01008', async function() {
      let conn;
      try {
        conn = await oracledb.getConnection(dbconfig);
        await testsUtil.assertThrowsAsync(
          async () => {
            await conn.executeMany(
              "insert into nodb_tab_emp values (:a, :b)",
              [
                undefined,
                { a: 2, b: "foobar2" },
                { a: 3, b: "foobar3" },
                { a: 4, b: "foobar4" }
              ]
            );
          },
          /ORA-01008/ //ORA-01008: not all variables bound
        );
      } catch(err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch (err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('172.2.4 Negative - Binding an array contains undefined will throw JS TypeError', async function() {
      let conn;
      try {
        conn = await oracledb.getConnection(dbconfig);
        await testsUtil.assertThrowsAsync(
          async () => {
            await conn.executeMany(
              "insert into nodb_tab_emp values (:a, :b)",
              [
                { a: 1, b: "foobar1" },
                undefined,
                { a: 3, b: "foobar3" },
                { a: 4, b: "foobar4" }
              ]
            );
          },
          /TypeError: Cannot convert undefined or null to object/
        );
      } catch(err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch (err) {
            should.not.exist(err);
          }
        }
      }
    }); // 172.2.4

    it('172.2.5 Negative - Bind an empty array', async () => {
      try {
        let conn = await oracledb.getConnection(dbconfig);

        await testsUtil.assertThrowsAsync(
          async () => {
            await conn.executeMany(
              "insert into nodb_tab_emp values (:a, :b)",
              []
            );
          },
          /NJS-005/
        );
        // NJS-005: invalid value for parameter 2

        await conn.close();
      } catch (err) {
        should.not.exist(err);
      }
    }); // 172.2.5

    it('172.2.6 Negative - Set number of ierations to 0', async () => {
      try {
        let conn = await oracledb.getConnection(dbconfig);

        await testsUtil.assertThrowsAsync(
          async () => {
            await conn.executeMany(
              "insert into nodb_tab_emp values (:a, :b)",
              0
            );
          },
          /NJS-005/
        );
        // NJS-005: invalid value for parameter 2

        await conn.close();
      } catch (err) {
        should.not.exist(err);
      }
    }); // 172.2.6

  }); // 172.2
});
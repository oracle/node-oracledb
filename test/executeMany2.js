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
      await conn.close();
    } catch(err) {
      should.not.exist(err);
    }
  }); // 172.1

  it('172.2 binding by position and by name cannot be mixed', async () => {
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
    }

    try {
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
    }

    try {
      await conn.execute(
        `BEGIN EXECUTE IMMEDIATE 'DROP TABLE nodb_tab_emp'; EXCEPTION WHEN OTHERS THEN IF SQLCODE <> -942 THEN RAISE; END IF; END; `
      );
      await conn.commit();
      await conn.close();
    } catch(err) {
      should.not.exist(err);
    }
  }); // 172.2
});
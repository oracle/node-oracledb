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
 *   225. cqn02.js
 *
 * DESCRIPTION
 *   Negative test of CQN client initiated connections.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('225. cqn02.js', function() {

  let isRunnable = true;
  before(async function() {
    const prep = await testsUtil.checkPrerequisites(1904000000, 1904000000);
    isRunnable = !prep;

    if (!isRunnable) {
      this.skip();
    }
  }); // before()

  it('225.1 Negative - DB version or client version is less than 19.4', async () => {
    try {
      const conn = await oracledb.getConnection({
        ...dbConfig,
        events: true
      });
      const TABLE = 'nodb_tab_cqn02';
      let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;
      let plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

      const myCallback = function(message) {
        console.log(message);
      };

      const options = {
        callback : myCallback,
        sql: `SELECT * FROM ${TABLE} WHERE k > :bv`,
        binds: { bv : 100 },
        timeout : 20,
        qos : oracledb.SUBSCR_QOS_QUERY | oracledb.SUBSCR_QOS_ROWIDS,
        clientInitiated: true
      };

      await assert.rejects(
        async () => {
          await conn.subscribe('sub1', options);
        },
        /DPI-1050/
      );
      // DPI-1050: Oracle Client library is at version 19.3 but version 19.4 or higher is needed

      sql = `DROP TABLE ${TABLE} PURGE`;
      await conn.execute(sql);
      await conn.close();
    } catch (err) {
      should.not.exist(err);
    }
  }); // 225.1
});

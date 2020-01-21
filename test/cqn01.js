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
 * NAME
 *   224. cqn01.js
 *
 * DESCRIPTION
 *   Test CQN client initiated connections.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('224. cqn01.js', function() {

  let isRunnable = false;
  let conn, connAsDBA;

  before(async function() {

    const prep = await testsUtil.checkPrerequisites(1904000000, 1904000000);
    isRunnable = prep && dbconfig.test.DBA_PRIVILEGE;

    if (!isRunnable) {
      this.skip();
      return;
    } else {

      try {

        let credential = {
          user:          dbconfig.test.DBA_user,
          password:      dbconfig.test.DBA_password,
          connectString: dbconfig.connectString,
          privilege:     oracledb.SYSDBA
        };
        connAsDBA = await oracledb.getConnection(credential);

        let sql = `GRANT CHANGE NOTIFICATION TO ${dbconfig.user}`;
        await connAsDBA.execute(sql);

        conn = await oracledb.getConnection({
          ...dbconfig,
          events: true
        });

      } catch (err) {
        should.not.exist(err);
      }

    }
  }); // before()

  after(async function() {
    if (!isRunnable) {
      return;
    } else {
      try {
        let sql = `REVOKE CHANGE NOTIFICATION FROM ${dbconfig.user}`;
        await connAsDBA.execute(sql);

        await conn.close();
        await connAsDBA.close();
      } catch (err) {
        should.not.exist(err);
      }
    }
  }); // after()

  it('224.1', async () => {
    try {
      const TABLE = 'nodb_tab_cqn_01';
      let sql =
          `CREATE TABLE ${TABLE} (
            k NUMBER
          )`;
      let plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

      const myCallback = function(message) {
        // should.strictEqual(message.type, oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
        // should.strictEqual(message.registered, true);
        // const table = message.queries[0].tables[0];
        // const tableName = dbconfig.user.toUpperCase() + '.' + TABLE.toUpperCase();
        // should.strictEqual(table.name, tableName);
        // should.strictEqual(table.operation, oracledb.CQN_OPCODE_INSERT);
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

      await conn.subscribe('nodb_sub_01', options);

      sql = `INSERT INTO ${TABLE} VALUES (101)`;
      await conn.execute(sql);

      await conn.commit();

      await conn.unsubscribe('nodb_sub_01');

      sql = `DROP TABLE ${TABLE} PURGE`;
      await conn.execute(sql);
    } catch (err) {
      should.not.exist(err);
    }

  }); // 224.1
});
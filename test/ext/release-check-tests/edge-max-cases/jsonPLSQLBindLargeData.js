/* Copyright (c) 2024, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha' and 'assert'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   10. jsonPLSQLBindLargeData.js
 *
 * DESCRIPTION
 *   Testing bind larger size JSON.
 *   there is a strict standard limit for the memory usage in V8 of around 1.7 GB, if you do not increase it manually.
 *   node --max-old-space-size=4096 jsonPLSQLBindLargeData.js
 *
 *****************************************************************************/
'use strict';

const oracledb      = require('oracledb');
const assert        = require('assert');
const fs            = require('fs');
const largeFile     = require('./largeFile.js');
const dbconfig      = require('../../../dbconfig.js');
const testsUtil     = require('../../../testsUtil.js');

describe('10.jsonPLSQLBindLargeData.js', function() {
  this.timeout(3600000);
  let conn = null;
  let insertID = 100;
  const fileRoot = process.cwd();
  const TABLE = 'nodb_tab_jsontype';

  const proc_bind_in = "CREATE OR REPLACE PROCEDURE nodb_json_plsql_in (id_in IN NUMBER, json_in IN JSON)\n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into " + TABLE + " (id, jsonval) values (id_in, json_in); \n" +
                       "END nodb_json_plsql_in; ";
  const proc_in_drop = "DROP PROCEDURE nodb_json_plsql_in";
  const proc_in_run = "BEGIN nodb_json_plsql_in (:i, :json); END;";

  const proc_bind_out = "CREATE OR REPLACE PROCEDURE nodb_json_plsql_out (id_in IN NUMBER, json_out OUT JSON) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                        "    select jsonval into json_out from " + TABLE + " where id = id_in; \n" +
                       "END nodb_json_plsql_out; ";
  const proc_out_drop = "DROP PROCEDURE nodb_json_plsql_out";
  const proc_out_run = "BEGIN nodb_json_plsql_out (:i, :json); END;";

  before(async function() {
    const credential = {
      user: "sys",
      password: "knl_test7",
      connectString: dbconfig.connectString,
      privilege: oracledb.SYSDBA
    };
    const connAsDBA = await oracledb.getConnection(credential);

    let sql = `CREATE TABLESPACE tbs_nodejson DATAFILE 'tbs_nodejson.dbf' SIZE 300M EXTENT MANAGEMENT LOCAL SEGMENT SPACE MANAGEMENT AUTO`;
    await connAsDBA.execute(sql);


    sql = `ALTER USER ${dbconfig.user} QUOTA UNLIMITED ON tbs_nodejson`;
    await connAsDBA.execute(sql);

    sql = `ALTER USER ${dbconfig.user} default tablespace tbs_nodejson`;
    await connAsDBA.execute(sql);


    conn = await oracledb.getConnection(dbconfig);

    sql = `
        create table ${TABLE} (
          id        number(9) not null,
          jsonval   json not null
        )
      `;
    const plsql = testsUtil.sqlCreateTable(TABLE, sql);
    await conn.execute(plsql);

    await conn.execute(proc_bind_in);

    await conn.execute(proc_bind_out);
  }); // before

  after(async function() {
    const sql = `drop table ${TABLE} purge`;
    await conn.execute(sql);

    await conn.execute(proc_in_drop);

    await conn.execute(proc_out_drop);

    await conn.close();

  }); // after

  beforeEach(function() {
    insertID++;
  });

  let inFileName = '';

  describe('10.1 JSON, INSERT/SELECT', function() {
    it('10.1.1 BIND_IN & BIND_OUT a 1GB txt file', async function() {
      inFileName = fileRoot + '/1GBlargeString.txt';
      const fileSizeInGB = 1;
      const selectID = 1;
      const numMinus = 0;

      await bindInOut(inFileName, fileSizeInGB, numMinus, selectID, insertID);
    }); // 9.10.1

    it('10.1.2 BIND_IN & BIND_OUT a 2GB txt file', async function() {
      inFileName = fileRoot + '/2GBlargeString.txt';
      const fileSizeInGB = 2;
      const selectID = 2;
      const numMinus = 0;

      await bindInOut(inFileName, fileSizeInGB, numMinus, selectID, insertID);
    }); // 10.1.2

    // it.skip('10.1.3 BIND_IN & BIND_OUT a 4GB txt file', function() {
    //   inFileName = fileRoot + '/4GBlargeString.txt';
    //   let selectID = 3;
    //   let fileSizeInGB = 4;
    //   let numMinus = 0;

    //   bindIn(inFileName, fileSizeInGB, numMinus, selectID, insertID);
    // });

    it('10.1.4 BIND_IN & BIND_OUT a 10MB txt file', async function() {
      inFileName = fileRoot + '/smallString.txt';
      const selectID = 4;
      const fileSize = 10 * 1024 * 1024;
      const specialStr = '10.1.4';

      await bindSmallFile(inFileName, fileSize, selectID, insertID, specialStr);
    });

    it('10.1.5 BIND_IN & BIND_OUT a 20MB txt file', async function() {
      inFileName = fileRoot + '/smallString.txt';
      const selectID = 5;
      const fileSize = 20 * 1024 * 1024;
      const specialStr = '10.1.4';

      await bindSmallFile(inFileName, fileSize, selectID, insertID, specialStr);
    });

    it('10.1.6 BIND_IN & BIND_OUT a 50MB txt file', async function() {
      inFileName = fileRoot + '/smallString.txt';
      const selectID = 6;
      const fileSize = 50 * 1024 * 1024;
      const specialStr = '10.1.6';

      await bindSmallFile(inFileName, fileSize, selectID, insertID, specialStr);
    });

    const bindInOut = async function(inFileName, fileSizeInGB, numMinus, selectID, insertID) {

      let jsonVal;
      const id = insertID;

      largeFile.createFileInGB(inFileName, fileSizeInGB, numMinus);

      const datas = [];
      const readStream = fs.createReadStream(inFileName);
      await new Promise((resolve, reject) => {
        readStream.on('data', function(data) {
          datas.push(data);
        });
        readStream.on('end', function() {
          jsonVal = Buffer.from(datas);
          resolve();
        });
        readStream.on('error', reject);
      });
      let bindVar = { i: { val: id, type: oracledb.NUMBER, dir: oracledb.BIND_IN }, json: { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN } };
      let result = await conn.execute(
        proc_in_run,
        bindVar);

      bindVar = { i: { val: id, type: oracledb.NUMBER, dir: oracledb.BIND_IN }, json: { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT } };
      result = await conn.execute(
        proc_out_run,
        bindVar);
      assert.deepEqual(result.outBinds.json, jsonVal);
      fs.unlinkSync(inFileName);
    };

    const bindSmallFile = async function(inFileName, fileSize, selectID, insertID, specialStr) {
      let jsonVal;
      const id = insertID;

      largeFile.createFileInKB(inFileName, fileSize, specialStr);

      const datas = [];
      const readStream = fs.createReadStream(inFileName);
      await new Promise((resolve, reject) => {
        readStream.on('data', function(data) {
          datas.push(data);
        });
        readStream.on('end', function() {
          jsonVal = Buffer.from(datas);
          resolve();
        });
        readStream.on('error', reject);
      });
      let bindVar = { i: { val: id, type: oracledb.NUMBER, dir: oracledb.BIND_IN }, json: { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN } };
      let result = await conn.execute(
        proc_in_run,
        bindVar);
      bindVar = { i: { val: id, type: oracledb.NUMBER, dir: oracledb.BIND_IN }, json: { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_OUT } };
      result = await conn.execute(
        proc_out_run,
        bindVar);
      assert.deepEqual(result.outBinds.json, jsonVal);

      fs.unlinkSync(inFileName);
    };
  }); // 10.1
});

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
 *   9. jsonDMLBindLargeData.js
 *
 * DESCRIPTION
 *   Testing bind larger size JSON.
 *   there is a strict standard limit for the memory usage in V8 of around 1.7 GB, if you do not increase it manually.
 *   node --max-old-space-size=4096 jsonDMLBindLargeData.js
 *
 *****************************************************************************/
'use strict';

const oracledb      = require('oracledb');
const assert        = require('assert');
const fs            = require('fs');
const dbconfig      = require('../../../dbconfig.js');
const testsUtil     = require('../../../testsUtil.js');
const largeFile     = require('./largeFile.js');

describe('9.jsonDMLBindLargeData.js', function() {
  this.timeout(3600000);
  let conn = null;
  let connAsDBA = null;
  let insertID = 100;
  const fileRoot = process.cwd();
  const TABLE = 'nodb_tab_jsontype';
  let skip = false;

  before(async function() {
    const credential = {
      user: process.env.NODE_ORACLEDB_DBA_USER || "sys",
      password: process.env.NODE_ORACLEDB_DBA_PASSWORD || "knl_test7",
      connectString: dbconfig.connectString,
      privilege: oracledb.SYSDBA
    };
    connAsDBA = await oracledb.getConnection(credential);

    // JSON Column Datatype supported only from Oracle Database 21c onwards
    if (connAsDBA.oracleServerVersion < 2100000000) {
      skip = true;
      this.skip();
    }

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
  }); // before

  after(async function() {
    if (!skip) {
      const sql = `drop table ${TABLE} purge`;
      await conn.execute(sql);
      await conn.close();

      const sqlDropTblSpace = `DROP TABLESPACE tbs_nodejson including contents and datafiles`;
      await connAsDBA.execute(sqlDropTblSpace);
      await connAsDBA.close();
    }
  }); // after

  beforeEach(function() {
    insertID++;
  });

  let inFileName = '';

  describe('9.1 JSON, INSERT/SELECT', function() {
    it('9.1.1 BIND_IN & BIND_OUT a 1GB txt file', async function() {
      inFileName = fileRoot + '/1GBlargeString.txt';
      const fileSizeInGB = 1;
      const selectID = 1;
      const numMinus = 0;

      await bindIn(inFileName, fileSizeInGB, numMinus, selectID, insertID);
    }); // 9.1.1

    it('9.1.2 BIND_IN & BIND_OUT a 2GB txt file', async function() {
      inFileName = fileRoot + '/2GBlargeString.txt';
      const fileSizeInGB = 2;
      const selectID = 2;
      const numMinus = 0;

      await bindIn(inFileName, fileSizeInGB, numMinus, selectID, insertID);
    }); // 9.1.2

    // it.skip('9.1.3 BIND_IN & BIND_OUT a 4GB txt file', async function() {
    //   inFileName = fileRoot + '/4GBlargeString.txt';
    //   const selectID = 3;
    //   const fileSizeInGB = 4;
    //   const numMinus = 0;

    //   await bindIn(inFileName, fileSizeInGB, numMinus, selectID, insertID);
    // });

    it('9.1.4 BIND_IN & BIND_OUT a 10MB txt file', async function() {
      inFileName = fileRoot + '/smallString.txt';
      const selectID = 4;
      const fileSize = 10 * 1024 * 1024;
      const specialStr = '9.1.4';

      await bindSmallFile(inFileName, fileSize, selectID, insertID, specialStr);
    });

    it('9.1.5 BIND_IN & BIND_OUT a 20MB txt file', async function() {
      inFileName = fileRoot + '/smallString.txt';
      const selectID = 5;
      const fileSize = 20 * 1024 * 1024;
      const specialStr = '9.1.4';

      await bindSmallFile(inFileName, fileSize, selectID, insertID, specialStr);
    });

    it('9.1.6 BIND_IN & BIND_OUT a 50MB txt file', async function() {
      inFileName = fileRoot + '/smallString.txt';
      const selectID = 6;
      const fileSize = 50 * 1024 * 1024;
      const specialStr = '9.1.6';

      await bindSmallFile(inFileName, fileSize, selectID, insertID, specialStr);
    });

    const bindIn = async function(inFileName, fileSizeInGB, numMinus, selectID, insertID) {

      let jsonVal;

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

      const bindconst = { i: insertID, c: { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN } };
      let sql = "INSERT INTO " + TABLE + " (id, jsonval) VALUES (:i, :c)";
      let result = await conn.execute(sql, bindconst);
      assert.strictEqual(result.rowsAffected, 1);

      sql = "SELECT jsonval FROM " + TABLE + " where id = " + insertID;
      result = await conn.execute(sql);
      assert.deepStrictEqual(result.rows[0][0], jsonVal);

      if (fs.existsSync(inFileName))
        fs.unlinkSync(inFileName);
    };

    const bindSmallFile = async function(inFileName, fileSize, selectID, insertID, specialStr) {
      let jsonVal;

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

      const bindconst = { i: insertID, c: { val: jsonVal, type: oracledb.DB_TYPE_JSON, dir: oracledb.BIND_IN } };
      let sql = "INSERT INTO " + TABLE + " (id, jsonval) VALUES (:i, :c)";
      let result = await conn.execute(sql, bindconst);
      assert.strictEqual(result.rowsAffected, 1);

      sql = "SELECT jsonval FROM " + TABLE + " where id = " + insertID;
      result = await conn.execute(sql);
      assert.deepStrictEqual(result.rows[0][0], jsonVal);

      if (fs.existsSync(inFileName))
        fs.unlinkSync(inFileName);
    };

  }); // 9.1
});

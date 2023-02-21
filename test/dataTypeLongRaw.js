/* Copyright (c) 2017, 2023, Oracle and/or its affiliates. */

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
 *   104. dataTypeLongRaw.js
 *
 * DESCRIPTION
 *    Test LONG RAW type support.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');
const random   = require('./random.js');

describe('104. dataTypeLongRaw.js', function() {

  let connection;
  const tableName = "nodb_longraw";

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('104.1 LONG RAW data type support', function() {

    // Generate test data
    const strLen = [10, 100, 1000];
    const strs = [];
    const specialStr = "104.1";
    for (let i = 0; i < strLen.length; i++)
      strs[i] = random.getRandomString(strLen[i], specialStr);

    before(async function() {
      await connection.execute(assist.sqlCreateTable(tableName));
      await Promise.all(strs.map(async function(element) {
        await connection.execute(
          `insert into ` + tableName + ` values( :no, utl_raw.cast_to_raw(:bv) )`,
          { no: strs.indexOf(element), bv: element},
          { autoCommit: true });
      }));
    });

    after(async function() {
      await connection.execute("drop table " + tableName + " purge");
    });

    it('104.1.1 SELECT query', async function() {
      const result = await connection.execute(
        `select * from ` + tableName + ` order by num`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT });
      assert.strictEqual(result.rows.length, strs.length);
      for (let i = 0; i < strs.length; i++) {
        assert(Buffer.isBuffer(result.rows[i].CONTENT));
      }
    });

    it('104.1.2 works well with result set', async function() {
      const result = await connection.execute(
        `select * from ` + tableName,
        [],
        { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT });

      assert.strictEqual(result.resultSet.metaData[0].name, 'NUM');
      assert.strictEqual(result.resultSet.metaData[1].name, 'CONTENT');
      await fetchRowsFromRS(result.resultSet, strs);
    });

    it('104.1.3 works well with REF Cursor', async function() {
      const createProc = `CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR) \n` +
                       `AS \n` +
                       `BEGIN \n` +
                       `    OPEN p_out FOR \n` +
                       `        SELECT * FROM ` + tableName  + `; \n` +
                       `END; `;
      await connection.execute(createProc);

      const result = await connection.execute(
        `BEGIN testproc(:o); END;`,
        [
          { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
        ],
        { outFormat: oracledb.OUT_FORMAT_OBJECT });
      await fetchRowsFromRS(result.outBinds[0], strs);

      await connection.execute(`DROP PROCEDURE testproc`);
    });

    const numRows = 3;
    async function fetchRowsFromRS(rs, array) {
      const rows = await rs.getRows(numRows);
      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i++) {
          (Buffer.isBuffer(rows[i].CONTENT)).should.be.ok();
        }
        return fetchRowsFromRS(rs, array);
      } else {
        await rs.close();
      }
    }

  }); // 104.1

  describe('104.2 stores null values correctly', function() {
    it('104.2.1 testing Null, Empty string and Undefined', async function() {
      await assist.verifyNullValues(connection, tableName);
    });
  });

});

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
 *   113. dataTypeUrowid.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - UROWID.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const assist   = require('./dataTypeAssist.js');
const dbConfig = require('./dbconfig.js');

describe('113. dataTypeUrowid.js', function() {

  let connection = null;
  let tableName = "nodb_urowid";
  let array = assist.data.numbersForBinaryFloat;
  let numRows = array.length;  // number of rows to return from each call to getRows()

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('113.1 testing UROWID data type', function() {
    before(async function() {

      await connection.execute(assist.sqlCreateTable(tableName));

      await insertData(connection, tableName);
      await updateDate(connection, tableName);
    });

    after(async function() {
      await connection.execute(`DROP table ` + tableName + ` PURGE`);
    });

    it('113.1.1 query rowid', async function() {
      let result = await connection.execute(
        `SELECT * FROM ` + tableName);

      for (let i = 0; i < array.length; i++) {
        let resultVal = result.rows[i][1];
        assert.strictEqual(typeof resultVal, "string");
        assert(resultVal);
      }
    });

    it('113.1.2 works well with result set', async function() {
      let result = await connection.execute(
        `SELECT * FROM ` + tableName,
        [],
        { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT });

      assert.strictEqual((result.resultSet.metaData[0]).name, 'NUM');
      assert.strictEqual((result.resultSet.metaData[1]).name, 'CONTENT');
      await fetchRowsFromRS(result.resultSet);
    });

    it('113.1.3 works well with REF Cursor', async function() {
      await verifyRefCursor(connection, tableName);
    });

    it('113.1.4 columns fetched from REF CURSORS can be mapped by fetchInfo settings', async function() {
      await verifyRefCursorWithFetchInfo(connection, tableName);
    });
  });

  describe('113.2 stores null value correctly', function() {
    it('113.2.1 testing Null, Empty string and Undefined', async function() {
      await new Promise((resolve) => {
        assist.verifyNullValues(connection, tableName, resolve);
      });
    });
  });

  let insertData = async function(connection, tableName) {
    await Promise.all(array.map(async function(element) {
      let sql = "INSERT INTO " + tableName + "(num) VALUES(" + element + ")";
      await connection.execute(sql);
    }));
  };

  let updateDate = async function(connection, tableName) {
    await Promise.all(array.map(async function(element) {
      let sql = `UPDATE ` + tableName + ` T SET content = T.ROWID where num = ` + element;
      await connection.execute(sql);
    }));
  };

  let verifyRefCursor = async function(connection, tableName) {
    let createProc =
          `CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR) ` +
          `AS ` +
          `BEGIN ` +
          `    OPEN p_out FOR ` +
          `        SELECT * FROM ` + tableName  + `; ` +
          `END; `;

    await connection.execute(createProc);

    let result = await connection.execute(
      "BEGIN testproc(:o); END;",
      [
        { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      ],
      { outFormat: oracledb.OUT_FORMAT_OBJECT });
    await fetchRowsFromRS(result.outBinds[0]);

    await connection.execute("DROP PROCEDURE testproc");
  };
  let fetchRowsFromRS = async function(rs) {
    let rows = await rs.getRows(numRows);
    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i++) {
        let resultVal = rows[i].CONTENT;
        assert(resultVal);
      }
      return fetchRowsFromRS(rs);
    } else {
      await rs.close();
    }
  };

  let verifyRefCursorWithFetchInfo = async function(connection, tableName) {
    let createProc =
          `CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR) ` +
          `AS ` +
          `BEGIN ` +
          `    OPEN p_out FOR ` +
          `    SELECT * FROM ` + tableName  + `; ` +
          `END; `;

    await connection.execute(createProc);
    let result = await connection.execute(
      `BEGIN testproc(:o); END;`,
      [
        { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      ],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo:
            {
              "CONTENT": { type: oracledb.STRING }
            }
      });
    await fetchRowsFromRS_fetchas(result.outBinds[0]);

    await connection.execute(`DROP PROCEDURE testproc`);
  };

  let fetchRowsFromRS_fetchas = async function(rs) {
    let rsrows = await rs.getRows(numRows);
    if (rsrows.length > 0) {
      for (let i = 0; i < rsrows.length; i++) {
        let resultVal = rsrows[i].CONTENT;
        assert(resultVal);
        assert(typeof resultVal, "string");
        await verifyFetchValues(connection, rsrows[i].NUM, rsrows[i].CONTENT, tableName);
      }
      return fetchRowsFromRS_fetchas(rs);
    } else {
      await rs.close();
    }
  };

  async function verifyFetchValues(connection, num, content, tableName) {
    let result = await connection.execute(
      "select ROWID from " + tableName + " where num = " + num);

    assert.strictEqual(content, result.rows[0][0]);
  }
});

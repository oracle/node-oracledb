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
 *   123. dataTypeNclob.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - NCLOB.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');
const random   = require('./random.js');

describe('123. dataTypeNclob.js', function() {

  let connection = null;
  const tableName = "nodb_nclob";
  let insertID = 0;

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  beforeEach(function() {
    insertID++;
  });

  describe('123.1 insert and stream out', function() {
    before('create table', async function() {
      await connection.execute(assist.sqlCreateTable(tableName));
    });

    after(async function() {
      await connection.execute("DROP table " + tableName + " PURGE");
    });

    it('123.1.1 works with data size 100', async function() {
      const insertLength = 100;
      const insertStr = random.getRandomLengthString(insertLength);

      await insertData(tableName, insertStr);

      await streamLob(tableName, insertStr);
    });

    it('123.1.2 works with data size 3000', async function() {
      const insertLength = 3000;
      const insertStr = random.getRandomLengthString(insertLength);

      await insertData(tableName, insertStr);

      await streamLob(tableName, insertStr);

    });

  }); // 123.1

  describe('123.2 insert and fetch as string with fetchInfo', function() {
    before('create table', function() {
      assist.createTable(connection, tableName);
    });

    after(async function() {
      await connection.execute("DROP table " + tableName + " PURGE");
    });

    it('123.2.1 works with data size 100', async function() {
      const insertLength = 100;
      const insertStr = random.getRandomLengthString(insertLength);

      await insertData(tableName, insertStr);

      await fetchLob_fetchInfo(tableName, insertStr);
    });

    it('123.2.2 works with data size 3000', async function() {
      const insertLength = 3000;
      const insertStr = random.getRandomLengthString(insertLength);

      await insertData(tableName, insertStr);

      await fetchLob_fetchInfo(tableName, insertStr);
    });

    it('123.2.3 works with resultSet', async function() {
      const insertLength = 3000;
      const insertStr = random.getRandomLengthString(insertLength);

      await insertData(tableName, insertStr);

      await fetchLob_fetchInfo_rs(tableName, insertStr);
    });

  });

  describe('123.3 insert and fetch as string with oracledb.fetchAsString', function() {
    beforeEach('set oracledb.fetchAsString', function() {
      oracledb.fetchAsString = [ oracledb.CLOB ];
    }); // beforeEach

    afterEach('clear the By type specification', function() {
      oracledb.fetchAsString = [];
    }); // afterEach

    before('create table', async function() {
      await connection.execute(assist.sqlCreateTable(tableName));
    });

    after(async function() {
      await connection.execute("DROP table " + tableName + " PURGE");
    });

    it('123.3.1 works with data size 100', async function() {
      const insertLength = 100;
      const insertStr = random.getRandomLengthString(insertLength);

      await insertData(tableName, insertStr);

      await fetchLob_fetchas(tableName, insertStr);
    });

    it('123.3.2 works with data size 3000', async function() {
      const insertLength = 3000;
      const insertStr = random.getRandomLengthString(insertLength);

      await insertData(tableName, insertStr);

      await fetchLob_fetchas(tableName, insertStr);
    });

    it('123.3.2 works with resultSet', async function() {
      const insertLength = 3000;
      const insertStr = random.getRandomLengthString(insertLength);

      await insertData(tableName, insertStr);

      await fetchLob_fetchas_rs(tableName, insertStr);
    });

  });

  describe('123.4 ref cursor', function() {

    before('create table', async function() {
      await connection.execute(assist.sqlCreateTable(tableName));
    });

    after(async function() {
      oracledb.fetchAsString = [];
      await connection.execute("DROP table " + tableName + " PURGE");
    });

    it('123.4.1 columns fetched from REF CURSORS can be mapped by fetchInfo settings', async function() {
      const insertLength = 3000;
      const insertStr = random.getRandomLengthString(insertLength);

      await insertData(tableName, insertStr);

      await verifyRefCursor_fetchInfo(tableName, insertStr);
    });

    it('123.4.2 columns fetched from REF CURSORS can be mapped by oracledb.fetchAsString', async function() {
      const insertLength = 3000;
      const insertStr = random.getRandomLengthString(insertLength);
      oracledb.fetchAsString = [ oracledb.CLOB ];

      await insertData(tableName, insertStr);

      await verifyRefCursor_fetchas(tableName, insertStr);
    });
  });

  describe('123.5 stores null value correctly', function() {
    it('123.5.1 works with Null, Empty string and Undefined', async function() {
      await assist.verifyNullValues(connection, tableName);
    });
  });


  const insertData = async function(tableName, insertStr) {
    const sql = "INSERT INTO " + tableName + "(num, content) VALUES(" + insertID + ", TO_NCLOB('" + insertStr + "'))";
    await connection.execute(sql);
  };

  const streamLob = async function(tableName, originalStr) {
    let result = null;
    result = await connection.execute("SELECT TO_CLOB(content) FROM " + tableName + " where num = " + insertID);
    await new Promise((resolve, reject) => {
      let clob = '';
      const lob = result.rows[0][0];

      assert(lob);
      lob.setEncoding('utf8'); // set the encoding so we get a 'string' not a 'buffer'

      lob.on('data', function(chunk) {
        clob += chunk;
      });

      lob.on('end', function() {
        assert.strictEqual(clob.length, originalStr.length);
        assert.strictEqual(clob, originalStr);
        resolve();
      });

      lob.on('error', reject);
    });
  };

  const fetchLob_fetchInfo = async function(tableName, originalStr) {
    let result = null;
    result = await connection.execute(
      "SELECT content AS C FROM " + tableName + " where num = " + insertID,
      {},
      {
        fetchInfo: { C: { type: oracledb.STRING } }
      });

    const resultStr = result.rows[0][0];
    assert.strictEqual(resultStr.length, originalStr.length);
    assert.strictEqual(resultStr, originalStr);
  };

  const fetchLob_fetchInfo_rs = async function(tableName, originalStr) {
    let result = null;
    result = await connection.execute(
      "SELECT content FROM " + tableName + " where num = " + insertID,
      {},
      {
        fetchInfo: { CONTENT: { type: oracledb.STRING } },
        resultSet: true
      });
    assert.strictEqual((result.resultSet.metaData[0]).name, 'CONTENT');
    fetchRowFromRS(result.resultSet, originalStr);
  };

  const fetchLob_fetchas = async function(tableName, originalStr) {
    let result = null;
    result = await connection.execute("SELECT content AS C FROM " + tableName + " where num = " + insertID);
    const resultStr = result.rows[0][0];
    assert.strictEqual(resultStr.length, originalStr.length);
    assert.strictEqual(resultStr, originalStr);
  };

  const fetchLob_fetchas_rs = async function(tableName, originalStr) {
    let result = null;
    result = await connection.execute(
      "SELECT content FROM " + tableName + " where num = " + insertID,
      {},
      {
        resultSet: true
      });
    assert.strictEqual((result.resultSet.metaData[0]).name, 'CONTENT');
    fetchRowFromRS(result.resultSet, originalStr);
  };

  const fetchRowFromRS = async function(rs, originalStr) {
    let accessCount = 0;
     while (true) { // eslint-disable-line
      const row = await rs.getRow();
      if (!row)
        break;
      accessCount++;
      const resultVal = row[0];
      assert.strictEqual(resultVal.length, originalStr.length);
      assert.strictEqual(resultVal, originalStr);
    }
    await rs.close();
    assert.strictEqual(accessCount, 1);
  };

  const verifyRefCursor_fetchInfo = async function(tableName, originalStr) {
    const createProc =
          "CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR) " +
          "AS " +
          "BEGIN " +
          "    OPEN p_out FOR " +
          "        SELECT content FROM " + tableName  + " where num = " + insertID + "; " +
          "END; ";
    let result = null;
    await connection.execute(createProc);
    result =  await connection.execute(
      "BEGIN testproc(:o); END;",
      [
        { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      ],
      { fetchInfo: { CONTENT: { type: oracledb.STRING } } });
    fetchRowFromRS(result.outBinds[0], originalStr);
    await connection.execute("DROP PROCEDURE testproc");
  };

  const verifyRefCursor_fetchas = async function(tableName, originalStr) {
    const createProc =
          "CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR) " +
          "AS " +
          "BEGIN " +
          "    OPEN p_out FOR " +
          "        SELECT content FROM " + tableName  + " where num = " + insertID + "; " +
          "END; ";
    let result = null;
    await connection.execute(createProc);

    result = await connection.execute(
      "BEGIN testproc(:o); END;",
      [
        { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      ]);
    fetchRowFromRS(result.outBinds[0], originalStr);
    await connection.execute("DROP PROCEDURE testproc");
  };
});

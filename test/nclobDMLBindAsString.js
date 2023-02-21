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
 *   124. nclobDMLBindAsString.js
 *
 * DESCRIPTION
 *    Testing NCLOB binding as STRING in DML.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert    = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');
const random   = require('./random.js');

describe('124. nclobDMLBindAsString.js', function() {

  let connection = null;
  let tableName = "nodb_nclob";
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

  describe('124.1 DML binding', function() {
    before('create table', async function() {
      await connection.execute(assist.sqlCreateTable(tableName));
    });

    after(async function() {
      await connection.execute("DROP table " + tableName + " PURGE");
    });

    it('124.1.1 bind in via INSERT', async function() {
      let insertLength = 100;
      let insertStr = random.getRandomLengthString(insertLength);

      await bindIn(tableName, insertStr);

      await streamLob(tableName, insertStr);
    });

    it('124.1.2 bind out via RETURNING INTO', async function() {
      let insertLength = 3000;
      let insertStr = random.getRandomLengthString(insertLength);

      await insertData(tableName, insertStr);

      await bindOut(tableName, insertStr);
    });

    it('124.1.3 bind in via UPDATE', async function() {
      let insertLength = 100;
      let insertStr = random.getRandomLengthString(insertLength);
      let updateStr = random.getRandomLengthString(200);

      await insertData(tableName, insertStr);

      await bind_update(tableName, updateStr);

      await streamLob(tableName, updateStr);
    });

    it('124.1.3 bind in via WHERE', async function() {
      let insertLength = 500;
      let insertStr = random.getRandomLengthString(insertLength);

      await insertData(tableName, insertStr);

      await bind_where(tableName, insertStr);
    });
  });


  let insertData = async function(tableName, insertStr) {
    let sql = "INSERT INTO " + tableName + "(num, content) VALUES(" + insertID + ", TO_NCLOB('" + insertStr + "'))";
    await connection.execute(sql);
  };

  let bindIn = async function(tableName, insertStr) {
    let sql = "INSERT INTO " + tableName + "(num, content) VALUES(:i, TO_NCLOB(:c))";
    let bindVar = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN},
      c: { val: insertStr, type: oracledb.STRING, dir: oracledb.BIND_IN},
    };
    await connection.execute(sql, bindVar);
  };

  let bindOut = async function(tableName, insertStr) {
    insertID++;
    let result = null;
    result = await connection.execute(
      "INSERT INTO " + tableName + " (num, content) VALUES (:i, TO_NCLOB(:c)) RETURNING content INTO :lobbv",
      {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN},
        c: { val: insertStr, type: oracledb.STRING, dir: oracledb.BIND_IN },
        lobbv: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: insertStr.length }
      });
    let resultStr = result.outBinds.lobbv[0];
    assert.strictEqual(resultStr.length, insertStr.length);
    assert.strictEqual(resultStr, insertStr);
  };

  let bind_update = async function(tableName, insertStr) {
    let sql = "update " + tableName + " set content = TO_NCLOB(:c) where num = :i";
    let bindVar = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN},
      c: { val: insertStr, type: oracledb.STRING, dir: oracledb.BIND_IN}
    };
    await connection.execute(sql, bindVar);
  };

  let bind_where = async function(tableName, insertStr) {
    let sql = "select * from " + tableName + " where dbms_lob.compare(content, TO_NCLOB(:c)) = 0";
    let bindVar = {
      c: { val: insertStr, type: oracledb.STRING, dir: oracledb.BIND_IN}
    };
    let result = null;
    result = await connection.execute(
      sql,
      bindVar,
      {
        fetchInfo : { CONTENT : { type : oracledb.STRING } }
      });
    assert.strictEqual(result.rows[0][0], insertID);
    assert.strictEqual(result.rows[0][1], insertStr);
  };

  let streamLob = async function(tableName, originalStr) {
    let result = null;
    result = await connection.execute(
      "SELECT TO_CLOB(content) FROM " + tableName + " where num = " + insertID);
    await new Promise((resolve, reject) => {
      let clob = '';
      let lob = result.rows[0][0];

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
});

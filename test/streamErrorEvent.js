/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 *   105. streamErrorEvent.js
 *
 * DESCRIPTION
 *    Testing Stream on 'error' event.
 *    It tries to stream LOB into a read-only file which triggers error.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const fs       = require('fs');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('105. streamErrorEvent.js', function() {

  let connection = null;
  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
  }); // before

  after(async function() {
    await connection.close();
  }); // after

  it('105.1 triggers stream error event', async function() {
    let rofile = "./test-read-only.txt";
    let tableName = "nodb_tab_stream_err";
    await fs.writeFileSync(rofile, "This is a read-only file.");
    await fs.chmod(rofile, '0444', (err) => {
      if (err) throw err;
    });
    let sql = "BEGIN \n" +
                  "    DECLARE \n" +
                  "        e_table_missing EXCEPTION; \n" +
                  "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                  "    BEGIN \n" +
                  "        EXECUTE IMMEDIATE('DROP TABLE " + tableName + " PURGE'); \n" +
                  "    EXCEPTION \n" +
                  "        WHEN e_table_missing \n" +
                  "        THEN NULL; \n" +
                  "    END; \n" +
                  "    EXECUTE IMMEDIATE (' \n" +
                  "        CREATE TABLE " + tableName + " ( \n" +
                  "            id      NUMBER, \n" +
                  "            lob     CLOB \n" +
                  "        ) \n" +
                  "    '); \n" +
                  "END; ";
    await connection.execute(sql);
    sql = "insert into " + tableName + " values (:i, :c)";
    let bindVar = {
      i: { val: 89, type: oracledb.NUMBER },
      c: { val: "Changjie tries to trigger Stream error events.", type: oracledb.STRING }
    };
    let option = { autoCommit: true };
    await connection.execute(
      sql,
      bindVar,
      option);
    sql = "select lob from " + tableName;
    let result = null;
    result = await connection.execute(sql);
    await new Promise((resolve, reject) => {
      let lob = result.rows[0][0];

      lob.on('error', reject);

      lob.on('close', resolve); // Here it returns.

      let outStream = fs.createWriteStream(rofile);
      outStream.on('error', function(err) {
        assert(err);
        assert.strictEqual(err.syscall, 'open');
      });
      lob.pipe(outStream);
    });

    sql = "DROP TABLE " + tableName + " PURGE";
    await connection.execute(sql);

    await fs.unlinkSync(rofile);
  });
});

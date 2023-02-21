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
 *   138. blobDMLReturningMultipleRowsAsStream.js
 *
 * DESCRIPTION
 *   Testing BLOB DML returning multiple rows as stream.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const sql      = require('./sql.js');
const assist   = require('./dataTypeAssist.js');

describe('138. blobDMLReturningMultipleRowsAsStream.js', function() {

  let connection = null;
  let tableName = "nodb_dml_blob_138";

  const blob_table_create = "BEGIN \n" +
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
                          "            num      NUMBER, \n" +
                          "            blob     BLOB \n" +
                          "        ) \n" +
                          "    '); \n" +
                          "END; ";
  const blob_table_drop = "DROP TABLE " + tableName + " PURGE";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await connection.release();
  });

  describe('138.1 BLOB DML returning multiple rows as stream', function() {
    before(async function() {

      await sql.executeSql(connection, blob_table_create, {}, {});
      insertData(10);
    });

    after(async function() {
      await sql.executeSql(connection, blob_table_drop, {}, {});
    });

    it('138.1.1 BLOB DML returning multiple rows as stream', async function() {
      await updateReturning_stream();
    }); // 138.1.1

  }); // 138.1

  let insertData = async function(tableSize) {
    let insert_data = "DECLARE \n" +
                      "    tmpchar VARCHAR2(2000); \n" +
                      "    tmplob BLOB; \n" +
                      "BEGIN \n" +
                      "    FOR i IN 1.." + tableSize + " LOOP \n" +
                      "         select to_char(i) into tmpchar from dual; \n" +
                      "         select utl_raw.cast_to_raw(tmpchar) into tmplob from dual; \n" +
                      "         insert into " + tableName + " values (i, tmplob); \n" +
                      "    END LOOP; \n" +
                      "    commit; \n" +
                      "END; ";
    let result = null;
    await connection.execute(insert_data);
    result = await connection.execute("select num from " + tableName);
    assert.strictEqual(result.rows.length, tableSize);
  };

  let updateReturning_stream = async function() {
    let sql_update = "UPDATE " + tableName + " set num = num+10 RETURNING num, blob into :num, :lobou";
    let result = null;
    try {
      result = await connection.execute(
        sql_update,
        {
          num: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          lobou: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
        });
      let numLobs = result.outBinds.lobou.length;
      assert.strictEqual(numLobs, 10);
      for (let n = 0; n < numLobs; n++) {
        verifyLob(n, result);
      }
    } catch (err) {
      assert.ifError(err);
    }
  };

  let verifyLob = function(n, result) {
    let lob = result.outBinds.lobou[n];
    let id = result.outBinds.num[n];
    assert(lob);
    let blobData = 0;
    let totalLength = 0;
    blobData = Buffer.alloc(0);

    lob.on('data', function(chunk) {
      totalLength = totalLength + chunk.length;
      blobData = Buffer.concat([blobData, chunk], totalLength);
    });

    lob.on('error', function(err) {
      assert(err, "lob.on 'error' event.");
    });

    lob.on('end', function(err) {
      assert(err);
      let expected = Buffer.from(String(id - 10), "utf-8");
      assert.strictEqual(assist.compare2Buffers(blobData, expected), true);
    });
  };
});

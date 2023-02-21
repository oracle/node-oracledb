/* Copyright (c) 2021, 2023, Oracle and/or its affiliates. */

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
 *   245. fetchLobAsStrBuf.js
 *
 * DESCRIPTION
 *   Testing CLOB binding as String with DML and Blob binding as Buffer with DML
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');
const assist   = require('./dataTypeAssist.js');

describe('245. fetchLobAsStrBuf.js', function() {
  let connection = null;
  let insertID = 1;
  let tableName = "fetchLobAsStrBuf_table";
  let fun_create_table = "BEGIN \n" +
                          "    DECLARE \n" +
                          "        e_table_missing EXCEPTION; \n" +
                          "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                          "    BEGIN \n" +
                          "        EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE' ); \n" +
                          "    EXCEPTION \n" +
                          "        WHEN e_table_missing \n" +
                          "        THEN NULL; \n" +
                          "    END; \n" +
                          "    EXECUTE IMMEDIATE ( ' \n" +
                          "        CREATE TABLE " + tableName + " ( \n" +
                          "            id      NUMBER, \n" +
                          "            clob_col  clob, \n" +
                          "            blob_col  blob \n" +
                          "        ) \n" +
                          "    '); \n" +
                          "END;  ";
  let drop_table = "DROP TABLE " + tableName + " PURGE";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await connection.release();
  });

  let executeSQL = async function(sql) {
    await connection.execute(sql);
  };

  let insertIntoTable = async function(id, contentClob, contentBlob) {
    let result = null;
    if (contentClob == "EMPTY_CLOB" && contentBlob == "EMPTY_BLOB") {
      result = await connection.execute("insert INTO fetchLobAsStrBuf_table values(:id, EMPTY_CLOB(), EMPTY_BLOB())",
        [ id ]);
      assert.strictEqual(result.rowsAffected, 1);
    } else {
      let sql = "insert into fetchLobAsStrBuf_table (id, clob_col, blob_col) values(:id, :str, :buf)";
      let bindings = {
        id : { val : id },
        str : {val:contentClob, type:oracledb.STRING, dir:oracledb.BIND_IN},
        buf : {val:contentBlob, type:oracledb.BUFFER,  dir:oracledb.BIND_IN}
      };
      result = await connection.execute(sql, bindings);
      assert.strictEqual(result.rowsAffected, 1);
    }
  };

  let checkInsertResult = async function(id, contentClob, specialStr, contentBlob) {

    let sql = "select clob_col from fetchLobAsStrBuf_table where id = " + id;
    await verifyClobValueWithString(sql, contentClob, specialStr);

    sql = "select blob_col from fetchLobAsStrBuf_table where id = " + id;
    await verifyBlobValueWithBuffer(sql, contentBlob, specialStr);
  };

  let verifyClobValueWithString = async function(selectSql, originalString, specialStr) {
    let result = null;
    result = await connection.execute(selectSql);

    let lob = result.rows[0][0];
    if (originalString == '' || originalString == undefined || originalString == null) {
      assert.ifError(lob);
    } else {
      assert(lob);
      // set the encoding so we get a 'string' not a 'buffer'
      lob.setEncoding('utf8');
      let clobData = '';
      await new Promise((resolve, reject) => {
        lob.on('data', function(chunk) {
          clobData += chunk;
        });

        lob.on('error', function(err) {
          assert.ifError(err, "lob.on 'error' event.");
          reject();
        });

        lob.on('end', function(err) {
          assert.ifError(err);
          if (originalString == "EMPTY_CLOB") {
            assert.strictEqual(clobData, "");
          } else {
            let resultLength = clobData.length;
            let specStrLength = specialStr.length;
            assert.strictEqual(resultLength, originalString.length);
            assert.strictEqual(clobData.substring(0, specStrLength), specialStr);
            assert.strictEqual(clobData.substring(resultLength - specStrLength, resultLength), specialStr);
          }
          resolve();
        });
      });
    }
  };

  let verifyBlobValueWithBuffer = async function(selectSql, originalBuffer, specialStr) {
    let result = null;
    result = await connection.execute(selectSql);
    let lob = result.rows[0][0];
    if (originalBuffer == '' || originalBuffer == undefined) {
      assert.ifError(lob);
    } else {
      assert(lob);
      let blobData = Buffer.alloc(0);
      let totalLength = 0;
      await new Promise((resolve, reject) => {
        lob.on('data', function(chunk) {
          totalLength = totalLength + chunk.length;
          blobData = Buffer.concat([blobData, chunk], totalLength);
        });

        lob.on('error', function(err) {
          assert.ifError(err, "lob.on 'error' event.");
          reject();
        });

        lob.on('end', function() {
          if (originalBuffer == "EMPTY_BLOB") {
            let nullBuffer = Buffer.from('', "utf-8");
            assert.strictEqual(assist.compare2Buffers(blobData, nullBuffer), true);
          } else {
            assert.strictEqual(totalLength, originalBuffer.length);
            let specStrLength = specialStr.length;
            assert.strictEqual(blobData.toString('utf8', 0, specStrLength), specialStr);
            assert.strictEqual(blobData.toString('utf8', (totalLength - specStrLength), totalLength), specialStr);
            assert.strictEqual(assist.compare2Buffers(blobData, originalBuffer), true);
          }
          resolve();
        });
      });
    }
  };

  describe('245.1 CLOB,BLOB Insert', function() {

    before(async function() {
      await executeSQL(fun_create_table);
    });

    after(async function() {
      await executeSQL(drop_table);
    });

    it('245.1.1 Insert and fetch CLOB,BLOB with EMPTY_CLOB and EMPTY_BLOB', async function() {
      let id = insertID++;
      let contentClob = "EMPTY_CLOB";
      let contentBlob = "EMPTY_BLOB";

      await insertIntoTable(id, contentClob, contentBlob);

      await checkInsertResult(id, contentClob, null, contentBlob);
    });

    it('245.1.2 Insert and fetch CLOB,BLOB with String and Buffer of length 32K', async function() {
      let id = insertID++;
      let contentLength = 32768;
      let specialStr = "245.1.2";
      let contentClob = random.getRandomString(contentLength, specialStr);
      let contentBlob = Buffer.from(contentClob, "utf-8");

      await insertIntoTable(id, contentClob, contentBlob);

      await checkInsertResult(id, contentClob, specialStr, contentBlob);
    });

    it('245.1.3 Insert and fetch CLOB,BLOB with String and Buffer of length (1MB + 1)', async function() {
      let id = insertID++;
      let contentLength = 1048577;
      let specialStr = "245.1.2";
      let contentClob = random.getRandomString(contentLength, specialStr);
      let contentBlob = Buffer.from(contentClob, "utf-8");

      await insertIntoTable(id, contentClob, contentBlob);

      await checkInsertResult(id, contentClob, specialStr, contentBlob);
    });
  });
});

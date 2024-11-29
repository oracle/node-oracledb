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
 * The node-oracledb test suite uses 'mocha' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   2. blobDMLReturningSingleRowAsBuffer.js
 *
 * DESCRIPTION
 *   Testing BLOB DML returning one row as buffer when MAX_STRING_SIZE=EXTENDED.
 *
 *   Change MAX_STRING_SIZE=EXTENDED before run this test:
 *      add MAX_STRING_SIZE=EXTENDED to t_init1.ora
 *
 *      sqlplus / as sysdba
 *      SHUTDOWN IMMEDIATE;
 *      STARTUP pfile=t_init1.ora UPGRADE;
 *      ALTER SYSTEM SET MAX_STRING_SIZE=EXTENDED;
 *      @?/rdbms/admin/utl32k.sql
 *      SHUTDOWN IMMEDIATE;
 *      STARTUP pfile=t_init1.ora;
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const assist        = require('../../../dataTypeAssist.js');
const dbConfig      = require('../../../dbconfig.js');
const random        = require('../../../random.js');

describe('2. blobDMLReturningSingleRowAsBuffer.js', function() {

  const credential_DBA = {user: process.env.NODE_ORACLEDB_DBA_USER, password: process.env.NODE_ORACLEDB_DBA_PASSWORD, connectString: dbConfig.connectString, privilege: oracledb.SYSDBA};

  let connection = null;
  const tableName = "nodb_dml_blob_140";
  let serverVersion, maxStringSize;

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
    const sqlCheckMaxStrVal = "SELECT name, value FROM v$parameter WHERE name = 'max_string_size'";
    let result = null;
    connection = await oracledb.getConnection(credential_DBA);

    serverVersion = await connection.oracleServerVersion;

    result = await connection.execute(sqlCheckMaxStrVal);
    if (result.rows.length == 0) maxStringSize = "UNDEFINED";
    else maxStringSize = result.rows[0][1];
  });

  after(async function() {
    await connection.release();
  });

  describe('2.1 BLOB DML returning single row as buffer', function() {
    beforeEach(function() {
      if (maxStringSize != "EXTENDED") this.skip();
    });

    before(async function() {
      await connection.execute(blob_table_create);
      (async () => {
        for (let i = 0; i < 10; i++) {
          await insertData(i);
        }
      })();
    });
    after(async function() {
      await connection.execute(blob_table_drop);
    });

    it('2.1.1 works with empty buffer', async function() {
      const id = 1;
      const str = "";
      const content = Buffer.from(str, "utf-8");
      await bindinout_buffer(id, content);
    });

    it('2.1.2 works with white space', async function() {
      const id = 1;
      const str = " ";
      const content = Buffer.from(str, "utf-8");
      await bindinout_buffer(id, content);
    });

    it('2.1.3 works with null', async function() {
      const id = 1;
      const content = null;
      await bindinout_buffer(id, content);
    });

    it('2.1.4 works with undefined', async function() {
      const id = 1;
      const content = undefined;
      await bindinout_buffer(id, content);
    });

    it('2.1.5 works with small data size 100', async function() {
      const specialStr = "2.1.5";
      const contentLength = 100;
      const id = 1;
      const str = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(str, "utf-8");
      await bindinout_buffer(id, content);
    });

    it('2.1.6 works with data size 2000', async function() {
      const specialStr = "2.1.6";
      const contentLength = 2000;
      const id = 1;
      const str = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(str, "utf-8");
      await bindinout_buffer(id, content);
    });

    it('2.1.7 works with data size 2001', async function() {
      const specialStr = "2.1.7";
      const contentLength = 2001;
      const id = 1;
      const str = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(str, "utf-8");
      await bindinout_buffer(id, content);
    });

    it('2.1.8 works with data size 5000', async function() {
      const specialStr = "2.1.8";
      const contentLength = 5000;
      const id = 1;
      const str = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(str, "utf-8");
      await bindinout_buffer(id, content);
    });

    it('2.1.9 works with data size 32767', async function() {
      const specialStr = "2.1.9";
      const contentLength = 32767;
      const id = 1;
      const str = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(str, "utf-8");
      await bindinout_buffer(id, content);
    });

    it('2.1.10 get ORA-22835 with data size 32768', async function() {
      const specialStr = "2.1.10";
      const contentLength = 32768;
      const id = 1;
      const str = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(str, "utf-8");
      await bindinout_buffer(id, content);
    });

    it('2.1.11 get ORA-22835 with data size 400000', async function() {
      const specialStr = "2.1.11";
      const contentLength = 400000;
      const id = 1;
      const str = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(str, "utf-8");
      await bindinout_buffer(id, content);
    });

  });

  const bindinout_buffer = async function(id, content) {

    const sql_update = "UPDATE " + tableName + " set blob = :cin WHERE num = :numin RETURNING num, blob into :numout, :cout";
    const bind_var = {
      cin: { val: content, type: oracledb.BUFFER },
      cout: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 400000 },
      numout: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      numin: { val: id, type: oracledb.NUMBER, dir: oracledb.BIND_IN }
    };
    let resultBuf, resultnum;
    let result = null;

    try {
      result = await connection.execute(sql_update, bind_var);
    } catch (err) {
      if (content === null || content === undefined || content.length === 0) {
        if (serverVersion == 1201000200) {
          assert(err);
          // ORA-22275: invalid LOB locator specified
          assert.equal(err.message.substring(0, 10), `ORA-22275:`);
        } else {
          assert.ifError(err);
          resultBuf = result.outBinds.cout[0];
          resultnum = result.outBinds.numout[0];
          assert.strictEqual(resultBuf, null);
          assert.strictEqual(resultnum, id);
        }
      } else {
        if (content.length > 32767) {
          assert(err);
          // ORA-22835: Buffer too small for CLOB to CHAR or BLOB to RAW conversion (actual: XXX, maximum: 32767)
          assert.equal(err.message.substring(0, 10), `ORA-22835:`);
        } else {
          assert.ifError(err);
          resultBuf = result.outBinds.cout[0];
          resultnum = result.outBinds.numout[0];
          assert.strictEqual(assist.compare2Buffers(resultBuf, content), true);
          assert.strictEqual(resultnum, id);
        }
      }
    }
  };

  const insertData = async function(i) {
    const str = random.getRandomLengthString(i + 10);
    const blob = Buffer.from(str, "utf-8");
    let result = null;
    result = await connection.execute(
      "insert into " + tableName + " values (:id, :b)",
      {
        id: {val: i, dir: oracledb.BIND_IN, type: oracledb.NUMBER},
        b: {val: blob, dir: oracledb.BIND_IN, type: oracledb.BUFFER}
      });
    assert.strictEqual(result.rowsAffected, 1);

  };
});

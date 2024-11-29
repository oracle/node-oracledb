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
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   1. clobDMLReturningSingleRowAsString.js
 *
 * DESCRIPTION
 *   Testing CLOB DML returning one row as String when MAX_STRING_SIZE=EXTENDED.
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

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig      = require('../../../dbconfig.js');
const random        = require('../../../random.js');

describe('1. clobDMLReturningSingleRowAsString.js', function() {

  const credential_DBA = {user: process.env.NODE_ORACLEDB_DBA_USER, password: process.env.NODE_ORACLEDB_DBA_PASSWORD, connectString: dbConfig.connectString, privilege: oracledb.SYSDBA};

  let connection = null;
  const tableName = "nodb_dml_clob_136";
  let serverVersion, maxStringSize;

  const clob_table_create = "BEGIN \n" +
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
                          "            clob     CLOB \n" +
                          "        ) \n" +
                          "    '); \n" +
                          "    FOR i IN 1..10 LOOP \n" +
                          "        EXECUTE IMMEDIATE ( \n" +
                          "            'insert into " + tableName + " values (' || \n" +
                          "            to_char(i) || ', ' || to_char(i) || ')'); \n" +
                          "    END LOOP; \n" +
                          "    commit; \n" +
                          "END; ";
  const clob_table_drop = "DROP TABLE " + tableName + " PURGE";

  before(async function() {
    const sqlCheckMaxStrVal = "SELECT name, value FROM v$parameter WHERE name = 'max_string_size'";
    let result = null;

    connection = await oracledb.getConnection(credential_DBA);

    serverVersion = connection.oracleServerVersion;
    console.log("serverVersion " + serverVersion);

    result = await connection.execute(sqlCheckMaxStrVal);

    if (result.rows.length == 0) maxStringSize = "UNDEFINED";
    else maxStringSize = result.rows[0][1];
  });

  after(async function() {

    await connection.release();
  });

  describe('1.1 CLOB DML returning single row as String', function() {
    beforeEach(function() {
      if (maxStringSize != "EXTENDED") this.skip();
    });
    before(async function() {
      await connection.execute(clob_table_create);
    });
    after(async function() {
      await connection.execute(clob_table_drop);
    });

    it('1.1.1 works with empty string', async function() {
      const specialStr = "1.1.1";
      const id = 1;
      const content = "";
      await bindinout_string(id, specialStr, content);
    });

    it('1.1.2 works with white space', async function() {
      const specialStr = "1.1.2";
      const id = 1;
      const content = " ";
      await bindinout_string(id, specialStr, content);
    });

    it('1.1.3 works with null', async function() {
      const specialStr = "1.1.3";
      const id = 1;
      const content = null;
      await bindinout_string(id, specialStr, content);
    });

    it('1.1.4 works with undefined', async function() {
      const specialStr = "1.1.4";
      const id = 1;
      const content = undefined;
      await bindinout_string(id, specialStr, content);
    });

    it('1.1.5 works with small data size 100', async function() {
      const specialStr = "1.1.5";
      const contentLength = 100;
      const id = 1;
      const content = random.getRandomString(contentLength, specialStr);
      await bindinout_string(id, specialStr, content);
    });

    it('1.1.6 works with data size 4000', async function() {
      const specialStr = "1.1.6";
      const contentLength = 4000;
      const id = 1;
      const content = random.getRandomString(contentLength, specialStr);
      await bindinout_string(id, specialStr, content);
    });

    it('1.1.7 works with data size 4001', async function() {
      const specialStr = "1.1.7";
      const contentLength = 4001;
      const id = 2;
      const content = random.getRandomString(contentLength, specialStr);
      await bindinout_string(id, specialStr, content);
    });

    it('1.1.8 works with data size 5000', async function() {
      const specialStr = "1.1.8";
      const contentLength = 5000;
      const id = 2;
      const content = random.getRandomString(contentLength, specialStr);
      await bindinout_string(id, specialStr, content);
    });

    it('1.1.9 works with data size 32767', async function() {
      const specialStr = "1.1.9";
      const contentLength = 32767;
      const id = 3;
      const content = random.getRandomString(contentLength, specialStr);
      await bindinout_string(id, specialStr, content);
    });

    it('1.1.10 get ORA-22835 with data size 32768', async function() {
      const specialStr = "1.1.10";
      const contentLength = 32768;
      const id = 4;
      const content = random.getRandomString(contentLength, specialStr);
      await bindinout_string(id, specialStr, content);
    });

    it('1.1.11 get ORA-22835 with data size 400000', async function() {
      const specialStr = "1.1.11";
      const contentLength = 400000;
      const id = 5;
      const content = random.getRandomString(contentLength, specialStr);
      await bindinout_string(id, specialStr, content);
    });

  });

  const bindinout_string = async function(id, specialStr, content) {

    const sql_update = "UPDATE " + tableName + " set clob = :cin WHERE num = :numin RETURNING num, clob into :numout, :cout";
    const bind_var = {
      cin: { val: content, type: oracledb.STRING },
      cout: { val: content, type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxSize: 400000 },
      numout: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      numin: { val: id, type: oracledb.NUMBER, dir: oracledb.BIND_IN }
    };
    let result = null;

    try {
      result = await connection.execute(sql_update, bind_var);
    } catch (err) {
      if ((typeof content) === "string" && content.length > 32767) {
        assert(err);
        // ORA-22835: Buffer too small for CLOB to CHAR or BLOB to RAW conversion (actual: XXX, maximum: 32767)
        assert.equal(err.message.substring(0, 10), `ORA-22835:`);
      } else {
        let resultStr, resultnum;
        if (content === "" || content === null || content === undefined) {
          if (serverVersion == 1201000200) {
            assert(err);
            // ORA-22275: invalid LOB locator specified
            assert.equal(err.message.substring(0, 10), `ORA-22275:`);
          } else {
            resultStr = result.outBinds.cout[0];
            resultnum = result.outBinds.numout[0];
            assert.ifError(err);
            assert.strictEqual(resultStr, null);
            assert.strictEqual(resultnum, id);
          }
        } else if (content === " ") {
          resultStr = result.outBinds.cout[0];
          resultnum = result.outBinds.numout[0];
          assert.ifError(err);
          assert.strictEqual(resultStr, content);
          assert.strictEqual(resultnum, id);
        } else {
          resultStr = result.outBinds.cout[0];
          resultnum = result.outBinds.numout[0];
          assert.ifError(err);
          compareResult(content, resultStr, specialStr);
          assert.strictEqual(resultnum, id);
        }
      }
    }
  };

  const compareResult = function(oraginalStr, resultStr, specialStr) {
    const resultLength = resultStr.length;
    const specStrLength = specialStr.length;
    assert.strictEqual(oraginalStr.length, resultLength);
    assert.strictEqual(resultStr.substring(0, specStrLength), specialStr);
    assert.strictEqual(resultStr.substring(resultLength - specStrLength, resultLength), specialStr);
    assert.strictEqual(oraginalStr, resultStr);
  };

});

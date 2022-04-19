/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 * NAME
 *   136. clobDMLReturningMultipleRowsAsString.js
 *
 * DESCRIPTION
 *   Testing CLOB DML returning multiple rows as String.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const sql      = require('./sqlClone.js');

describe('136. clobDMLReturningMultipleRowsAsString.js', function() {

  var connection = null;
  var tableName = "nodb_dml_clob_136";

  var clob_table_create = "BEGIN \n" +
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
  var clob_table_drop = "DROP TABLE " + tableName + " PURGE";

  before(async function() {
    try {
      connection = await oracledb.getConnection(dbConfig);
      assert(connection);
    } catch (err) {
      assert.ifError(err);
    }
  });

  after(async function() {
    try {
      await connection.release();
    } catch (err) {
      assert.ifError(err);
    }
  });

  describe('136.1 CLOB DML returning multiple rows as String', function() {
    before(async function() {
      try {
        await sql.executeSql(connection, clob_table_create, {}, {});
      } catch (err) {
        assert.ifError(err);
      }
    });
    after(async function() {
      try {
        await sql.executeSql(connection, clob_table_drop, {}, {});
      } catch (err) {
        assert.ifError(err);
      }
    });

    it('136.1.1 CLOB DML returning multiple rows as String', async function() {
      await updateReturning_string();
    });

  });

  var updateReturning_string = async function() {
    var sql_update = "UPDATE " + tableName + " set num = num+10 RETURNING num, clob into :num, :lobou";
    const result = await connection.execute(
      sql_update,
      {
        num: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        lobou: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      });
    assert(result);
    const numLobs = result.outBinds.lobou.length;
    assert.strictEqual(numLobs, 10);
    for (var index = 0; index < result.outBinds.lobou.length; index++) {
      var lob = result.outBinds.lobou[index];
      var id = result.outBinds.num[index];
      assert.strictEqual(lob, String(id - 10));
    }
  };

});

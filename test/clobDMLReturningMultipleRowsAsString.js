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

describe('136. clobDMLReturningMultipleRowsAsString.js', function() {

  let connection = null;
  const tableName = "nodb_dml_clob_136";

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
    connection = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await connection.close();
  });

  describe('136.1 CLOB DML returning multiple rows as String', function() {

    before(async function() {
      await connection.execute(clob_table_create);
    });

    after(async function() {
      await connection.execute(clob_table_drop);
    });

    it('136.1.1 CLOB DML returning multiple rows as String', async function() {
      await updateReturning_string();
    });

  });

  const updateReturning_string = async function() {
    const sql_update = "UPDATE " + tableName + " set num = num+10 RETURNING num, clob into :num, :lobou";
    const result = await connection.execute(
      sql_update,
      {
        num: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        lobou: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      });
    const numLobs = result.outBinds.lobou.length;
    assert.strictEqual(numLobs, 10);
    for (let index = 0; index < result.outBinds.lobou.length; index++) {
      const lob = result.outBinds.lobou[index];
      const id = result.outBinds.num[index];
      assert.strictEqual(lob, String(id - 10));
    }
  };

});

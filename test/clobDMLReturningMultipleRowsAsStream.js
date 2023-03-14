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
 *   135. clobDMLReturningMultipleRowsAsStream.js
 *
 * DESCRIPTION
 *   Testing CLOB DML returning multiple rows as stream.
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const assert = require('assert');

describe('135. clobDMLReturningMultipleRowsAsStream.js', function() {

  let connection = null;
  const tableName = "nodb_dml_clob_135";

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

  describe('135.1 CLOB DML returning multiple rows as stream', function() {
    before(async function() {
      await connection.execute(clob_table_create);
    });
    after(async function() {
      await connection.execute(clob_table_drop);
    });

    it('135.1.1 CLOB DML returning multiple rows as stream', async function() {
      await updateReturning_stream();
    });

  });

  const updateReturning_stream = async function() {
    const sql_update = "UPDATE " + tableName + " set num = num+10 RETURNING num, clob into :num, :lobou";
    const result = await connection.execute(
      sql_update,
      {
        num: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        lobou: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
      }
    );
    const numLobs = result.outBinds.lobou.length;
    assert.strictEqual(numLobs, 10);
    for (let n = 0; n < numLobs; n++) {
      await verifyLob(n, result);
    }
  };

  const verifyLob = async function(n, result) {
    const lob = result.outBinds.lobou[n];
    const id = result.outBinds.num[n];
    const clobData = await lob.getData();
    assert.strictEqual(clobData, (id - 10).toString());
    await lob.close();
  };

});

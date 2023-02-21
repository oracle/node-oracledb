/* Copyright (c) 2022, 2023, Oracle and/or its affiliates. */

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
 *   263.binding_buffer_string.js
 *
 * DESCRIPTION
 *   Test case for bug 33943738
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const sql      = require('./sqlClone.js');
const dbConfig = require('./dbconfig.js');

describe('263. binding_buffer_string.js', function() {
  let connection = null;

  const proc_blob_in_tab = "BEGIN \n" +
                         "    DECLARE \n" +
                         "        e_table_missing EXCEPTION; \n" +
                         "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                         "    BEGIN \n" +
                         "        EXECUTE IMMEDIATE('DROP TABLE blob_tab PURGE'); \n" +
                         "    EXCEPTION \n" +
                         "        WHEN e_table_missing \n" +
                         "        THEN NULL; \n" +
                         "    END; \n" +
                         "    EXECUTE IMMEDIATE (' \n" +
                         "        CREATE TABLE blob_tab ( \n" +
                         "            id      NUMBER, \n" +
                         "            blob_1  BLOB \n" +
                         "        ) \n" +
                         "    '); \n" +
                         "END; ";
  const drop_table = "DROP TABLE blob_tab PURGE";
  before('get connection and create table', async function() {
    try {
      connection = await oracledb.getConnection(dbConfig);
      assert(connection);
      await sql.executeSql(connection, proc_blob_in_tab, {}, {});
    } catch (err) {
      assert.ifError(err);
    }
  });

  after('release connection', async function() {
    try {
      await sql.executeSql(connection, drop_table, {}, {});
      await connection.release();
    } catch (err) {
      assert.ifError(err);
    }

  });

  describe('263.1 BLOB, PLSQL, BIND_IN', function() {

    it('263.1.1 works with buffer', async function() {
      const data = [
        {a: 1, b: Buffer.from("Dummy data 1".repeat(5000), "utf-8")},
        {a: 2, b: Buffer.from("Dummy data 2".repeat(7500), "utf-8")}
      ];
      const bindDefs = {
        a: { type: oracledb.NUMBER },
        b: { type: oracledb.DB_TYPE_BLOB }
      };
      const options = {
        bindDefs: bindDefs,
        autoCommit: true
      };

      const result = await connection.executeMany("insert into blob_tab (id, blob_1) values(:a, :b)", data, options);
      console.log(result.rowsAffected);
      await connection.close();
    });
  });
});

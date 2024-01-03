/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

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
 *   64. sqlWithWarnings.js
 *
 * DESCRIPTION
 *   Testing to make sure OCI_SUCCESS_WITH_INFO is treated as OCI_SUCCESS
 *   Creating a PLSQL procedure with a SELECT query from a non-existing
 *   table will result in warnings (OCI_SUCCESS_WITH_INFO).
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('64. sqlWithWarnings.js', function() {

  let connection = null;
  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('64.1 SQL - Success With Info', function() {

    const tableName = "nodb_aggregate";

    before('prepare table', async function() {
      const sqlCreateTab =
        "BEGIN " +
        "  DECLARE " +
        "    e_table_missing EXCEPTION; " +
        "    PRAGMA EXCEPTION_INIT(e_table_missing, -00942); " +
        "   BEGIN " +
        "     EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE'); " +
        "   EXCEPTION " +
        "     WHEN e_table_missing " +
        "     THEN NULL; " +
        "   END; " +
        "   EXECUTE IMMEDIATE (' " +
        "     CREATE TABLE " + tableName + " ( " +
        "       num_col NUMBER " +
        "     )" +
        "   '); " +
        "END; ";

      await connection.execute(sqlCreateTab);
      await connection.execute("INSERT INTO " + tableName + " VALUES(1)");
      await connection.execute("INSERT INTO " + tableName + " VALUES(null)");
      await connection.commit();
    }); // before

    after(async function() {
      await connection.execute("DROP TABLE " + tableName + " PURGE");
    });

    it('64.1.1 Executes an aggregate query which causes warnings', async function() {
      await connection.execute(
        "SELECT MAX(NUM_COL) AS NUM_COL FROM " + tableName,
        [],
        { maxRows: 1 }
      );
    }); // 64.1.1

  }); // 64.1

  describe('64.2 PL/SQL - Success With Info', function() {

    const plsqlWithWarning =
      " CREATE OR REPLACE PROCEDURE get_emp_rs_inout " +
      "   (p_in IN NUMBER, p_out OUT SYS_REFCURSOR ) AS " +
      "  BEGIN " +
      "    OPEN p_out FOR SELECT * FROM nodb_sql_emp " +
      "  END;";

    it('64.2.1 Execute SQL Statement to create PLSQL procedure with warnings', async function() {
      assert.strictEqual(typeof connection, "object");
      await connection.execute(plsqlWithWarning);
    }); // 64.2.1

  }); // 64.2

});

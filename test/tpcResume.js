/* Copyright (c) 2021, 2022, Oracle and/or its affiliates. */

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
 *   260. tpcResume.js
 *
 * DESCRIPTION
 *   Tests for two-phase commit suspend and resume
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');


describe('260. tpcResume.js', function() {
  let connection;
  const xid = {
    "formatId": 101,
    "globalTransactionId": "testtxt1",
    "branchQualifier": "testbr1"
  };

  const createTableSQL = `
    BEGIN
      DECLARE
        e_table_missing EXCEPTION;
        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
      BEGIN
        EXECUTE IMMEDIATE('DROP TABLE nodb_tpc_resume PURGE');
      EXCEPTION
        WHEN e_table_missing THEN NULL;
      END;

      EXECUTE IMMEDIATE('
        CREATE TABLE nodb_tpc_resume(
          ID NUMBER,
          SALARY NUMBER)'
        );
    END;`;

  before (async function() {
    try {
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute(createTableSQL);
      await connection.executeMany(
        `INSERT INTO nodb_tpc_resume values (:1, :2)`,
        [[1, 100], [2, 300]],
        { autoCommit: true }
      );
      await connection.close();
    } catch (e) {
      console.error(e);
      throw (e);
    }
  });

  after(async function() {
    try {
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute(`DROP TABLE nodb_tpc_resume`);
      await connection.close();
      connection = undefined;
    } catch (e) {
      console.error(e);
      throw (e);
    }
  });


  it('260.1 TPC suspend and resume', async function() {
    let result;

    try {
      // connection 1
      connection = await oracledb.getConnection(dbConfig);
      await connection.tpcBegin(xid);
      await connection.execute(
        `UPDATE nodb_tpc_resume SET salary = salary * 1.1 WHERE id = :1`, [1]);
      await connection.execute(
        `UPDATE nodb_tpc_resume SET salary = salary * 3   WHERE id = :1`, [2]);

      result = await connection.execute(
        `SELECT salary FROM nodb_tpc_resume`);
      assert.strictEqual(result.rows[0][0], 110);
      assert.strictEqual(result.rows[1][0], 900);
      await connection.tpcEnd(xid, oracledb.TPC_END_SUSPEND);
      await connection.close();

      // connection 2
      connection = await oracledb.getConnection(dbConfig);
      await connection.tpcBegin(xid, oracledb.TPC_BEGIN_RESUME, 60);
      await connection.execute(
        `UPDATE nodb_tpc_resume SET salary = salary * 2 WHERE id = :1`, [1]);
      await connection.execute(
        `UPDATE nodb_tpc_resume SET salary = salary * 2   WHERE id = :1`, [2]);

      result = await connection.execute(
        `SELECT salary FROM nodb_tpc_resume`);
      assert.strictEqual(result.rows[0][0], 220);
      assert.strictEqual(result.rows[1][0], 1800);

      await connection.tpcCommit();
      await connection.close();

      // connection 3
      connection = await oracledb.getConnection(dbConfig);
      result = await connection.execute(
        `SELECT salary FROM nodb_tpc_resume ORDER BY id`);
      assert.strictEqual(result.rows[0][0], 220);
      assert.strictEqual(result.rows[1][0], 1800);
      await connection.close();
    } catch (e) {
      console.error(e);
      throw (e);
    }

  });

});

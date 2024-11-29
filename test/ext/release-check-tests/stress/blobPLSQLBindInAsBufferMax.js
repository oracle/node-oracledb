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
 *   clobPLSQLBindInAsStringMax.js
 *
 * DESCRIPTION
 *   This tests includes PLSQL bind_in as buffer, then check the bind_in data
 *   using bind_out as BLOB.
 *   Parameter below ****** can be changed to test different maxSize.
 *   run this tests using command: node --max-old-space-size=4096 XX.js
 *   Expected compare result: 0.
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const dbConfig = require('../../../dbconfig.js');
const assert = require('assert');

// Define global variables
let connection = null;
const bind_in_maxSize = 4 * 1024 * 1024 * 1024 - 1; // 4GB - 1
const bind_in_ID = 1;
const resultInsert_ID = 101;

const proc_blob_pre_tab = `BEGIN
    DECLARE
        e_table_missing EXCEPTION;
        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
    BEGIN
        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_lobs_pre PURGE');
    EXCEPTION
        WHEN e_table_missing THEN NULL;
    END;
    EXECUTE IMMEDIATE ('CREATE TABLE nodb_tab_lobs_pre (id NUMBER, blob BLOB)');
END;`;

const proc_blob_in_tab = `BEGIN
    DECLARE
        e_table_missing EXCEPTION;
        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
    BEGIN
        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_blob_in PURGE');
    EXCEPTION
        WHEN e_table_missing THEN NULL;
    END;
    EXECUTE IMMEDIATE ('CREATE TABLE nodb_tab_blob_in (id NUMBER, blob BLOB)');
END;`;

const drop_tab_pre = "DROP TABLE nodb_tab_lobs_pre";
const drop_tab_in = "DROP TABLE nodb_tab_blob_in";

// Helper functions
function getRandomString(length, specialStr) {
  let str = '';
  const strLength = length - specialStr.length * 2;
  while (str.length < strLength) {
    str += Math.random().toString(36).slice(2);
  }
  str = specialStr + str.substr(0, strLength) + specialStr;
  return str;
}

function get1GBBuffer(specialStr) {
  const size = 128 * 1024 * 1024;
  const bigStr = getRandomString(size, specialStr);
  return Buffer.from(bigStr);
}

// Main test function
describe('PLSQL Blob Test', function() {

  before(async function() {
    connection = await oracledb.getConnection({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString
    });
  });

  after(async function() {
    await connection.execute(drop_tab_pre);
    await connection.execute(drop_tab_in);
    await connection.release();
  });

  it('should insert and compare blobs', async function() {
    // Create tables
    await connection.execute(proc_blob_in_tab);
    await connection.execute(proc_blob_pre_tab);

    // Create and execute bind_in procedure
    const proc_bind_in = `
                CREATE OR REPLACE PROCEDURE nodb_blobs_in_741 (blob_id IN NUMBER, blob_in IN BLOB) AS
                BEGIN
                    INSERT INTO nodb_tab_blob_in (id, blob) VALUES (blob_id, blob_in);
                END nodb_blobs_in_741;`;
    await connection.execute(proc_bind_in);

    const buffer_1GB = get1GBBuffer('1GBBuffer');
    const sqlRun_bind_in = "BEGIN nodb_blobs_in_741 (:i, :b); END;";
    const bindVars_in = {
      i: { val: bind_in_ID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      b: { val: buffer_1GB, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: bind_in_maxSize }
    };
    await connection.execute(sqlRun_bind_in, bindVars_in);
    console.log("Bind_in procedure executed.");

    // Create bind_out procedure
    const proc_bind_out = `
                CREATE OR REPLACE PROCEDURE nodb_blobs_out_742 (blob_id IN NUMBER, blob_out OUT BLOB) AS
                BEGIN
                    SELECT blob INTO blob_out FROM nodb_tab_blob_in WHERE id = blob_id;
                END nodb_blobs_out_742;`;
    await connection.execute(proc_bind_out);

    // Execute bind_out
    const sqlRun_bind_out = "BEGIN nodb_blobs_out_742 (:i, :b); END;";
    const bindVars_out = { i: bind_in_ID, b: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } };
    const result = await connection.execute(sqlRun_bind_out, bindVars_out);

    // Compare blobs
    const lob = result.outBinds.b;
    const insertSql = "INSERT INTO nodb_tab_blob_in (id, blob) VALUES (:i, :c)";
    const insertVars = { i: resultInsert_ID, c: { val: lob, type: oracledb.BLOB, dir: oracledb.BIND_IN } };
    await connection.execute(insertSql, insertVars);
    await lob.close();

    const proc_compare = `
                CREATE OR REPLACE PROCEDURE nodb_blob_compare(result OUT INTEGER) AS
                BEGIN
                    SELECT DBMS_LOB.COMPARE(
                        (SELECT blob FROM nodb_tab_blob_in WHERE id = ${bind_in_ID}),
                        (SELECT blob FROM nodb_tab_blob_in WHERE id = ${resultInsert_ID})
                    ) INTO result FROM dual;
                END nodb_blob_compare;`;
    await connection.execute(proc_compare);

    const sqlCompare = "BEGIN nodb_blob_compare(:r); END;";
    const compareResult = await connection.execute(sqlCompare, { r: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } });

    // Assert the comparison result
    assert.strictEqual(compareResult.outBinds.r, 0, "BLOB data comparison failed.");
    console.log("Blob comparison successful.");
  });
});

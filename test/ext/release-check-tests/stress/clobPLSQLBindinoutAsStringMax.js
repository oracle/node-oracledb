/* Copyright (c) 2025, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   clobPLSQLBindinoutAsStringMax.js
 *
 * DESCRIPTION
 *  This tests include PLSQL bind_inout as string, then check the bind_inout data
 *  Parameter below ** can be changed to test different maxSize.
 *  run this tests using command: node --max-old-space-size=4096 XX.js
 *  Expected compare result: 0.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('../../../dbconfig.js');

let connection;

const bind_in_ID = 1;
const resultInsert_ID = 101;
const bind_inout_maxSize = 1 * 1024 * 1024 * 1024 - 2; // 4GB-1

const getRandomString = (length, specialStr) => {
  let str = '';
  const strLength = length - specialStr.length * 2;
  while (str.length < strLength) str += Math.random().toString(36).slice(2);
  str = str.substring(0, strLength);
  return specialStr + str + specialStr;
};

const getLargeString = (specialStr) => {
  const stringSizeInEachLoop = 256 * 1024 * 1024 - 16;
  return getRandomString(stringSizeInEachLoop, specialStr);
};

describe('PLSQL CLOB Bind In/Out Test', function() {

  before(async function() {
    connection = await oracledb.getConnection({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString
    });

    console.log("Connection established.");

    // Create necessary tables and procedure
    await connection.execute(`
      BEGIN
        EXECUTE IMMEDIATE 'DROP TABLE nodb_tab_clob_in PURGE';
        EXCEPTION
          WHEN OTHERS THEN NULL;
      END;
    `);

    await connection.execute(`
      CREATE TABLE nodb_tab_clob_in (
        id    NUMBER,
        clob  CLOB
      )
    `);

    await connection.execute(`
      BEGIN
        EXECUTE IMMEDIATE 'DROP TABLE nodb_tab_lobs_pre PURGE';
        EXCEPTION
          WHEN OTHERS THEN NULL;
      END;
    `);

    await connection.execute(`
      CREATE TABLE nodb_tab_lobs_pre (
        id   NUMBER,
        clob CLOB
      )
    `);

    await connection.execute(`
      CREATE OR REPLACE PROCEDURE nodb_clobs_in_741 (clob_id IN NUMBER, clob_inout IN OUT CLOB)
      AS
      BEGIN
        INSERT INTO nodb_tab_clob_in (id, clob) VALUES (clob_id, clob_inout);
        SELECT clob INTO clob_inout FROM nodb_tab_clob_in WHERE id = clob_id;
      END nodb_clobs_in_741;
    `);

    await connection.execute(`
      CREATE OR REPLACE PROCEDURE nodb_clob_compare(result OUT INTEGER, id1 IN NUMBER, id2 IN NUMBER)
      IS
        CLOB1 CLOB;
        CLOB2 CLOB;
      BEGIN
        SELECT clob INTO CLOB1 FROM nodb_tab_clob_in WHERE id = id1;
        SELECT clob INTO CLOB2 FROM nodb_tab_clob_in WHERE id = id2;
        result := DBMS_LOB.COMPARE(CLOB1, CLOB2);
      END nodb_clob_compare;
    `);

    console.log("Tables and procedures created.");
  });

  after(async function() {
    // Cleanup
    await connection.execute(`DROP PROCEDURE nodb_clob_compare`);
    await connection.execute(`DROP PROCEDURE nodb_clobs_in_741`);
    await connection.execute(`DROP TABLE nodb_tab_clob_in PURGE`);
    await connection.execute(`DROP TABLE nodb_tab_lobs_pre PURGE`);

    await connection.close();
    console.log("Connection closed and resources cleaned up.");
  });

  it('should bind INOUT clob and compare CLOBs successfully', async function() {
    const specialStr = '1GBString';
    const string_1GB = getLargeString(specialStr);
    const strLength = string_1GB.length;

    console.log(`Generated 1GB string of length: ${strLength}`);

    const bindVars = {
      i: { val: bind_in_ID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      b: { val: string_1GB, type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxSize: bind_inout_maxSize }
    };

    // Execute the procedure to bind IN/OUT the CLOB
    const result = await connection.execute(`BEGIN nodb_clobs_in_741 (:i, :b); END;`, bindVars);
    const returnedClob = result.outBinds.b;

    console.log("Bind INOUT procedure executed successfully.");

    // Insert the returned CLOB into another row for comparison
    const insertClob = `
      INSERT INTO nodb_tab_clob_in (id, clob) VALUES (:id, :clob)
    `;
    await connection.execute(insertClob, { id: resultInsert_ID, clob: returnedClob });
    console.log("Inserted CLOB into another row for comparison.");

    // Compare the two CLOBs
    const compareResult = await connection.execute(
      `BEGIN nodb_clob_compare(:r, :id1, :id2); END;`,
      {
        r: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        id1: bind_in_ID,        // first CLOB ID
        id2: resultInsert_ID    // second CLOB ID for comparison
      }
    );

    const compareValue = compareResult.outBinds.r;
    console.log(`Compare result (0 expected): ${compareValue}`);

    // Assert that the comparison result is 0 (CLOBs are identical)
    assert.strictEqual(compareValue, 0, 'CLOB comparison failed: CLOBs are not identical');
  });
});

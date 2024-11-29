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
 *   This tests include PLSQL bind_in as string, then check the bind_in data
 *   using bin_out as CLOB
 *   Parameter below ** can be changed to test different maxSize.
 *   run this tests using command: node --max-old-space-size=4096 XX.js
 *   Expected compare result: 0.
 *****************************************************************************/
'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../../../dbconfig.js');
const assert = require('assert');

describe('CLOB Tests', function() {
  let connection;
  const bind_in_maxSize = 4 * 1024 * 1024 * 1024 - 1; // 4GB-1
  const resultInsert_ID = 101;
  const bind_in_ID = 1;

  const proc_clob_pre_tab = `
    BEGIN 
      DECLARE 
          e_table_missing EXCEPTION; 
          PRAGMA EXCEPTION_INIT(e_table_missing, -00942); 
      BEGIN 
          EXECUTE IMMEDIATE('DROP TABLE nodb_tab_lobs_pre PURGE'); 
      EXCEPTION 
          WHEN e_table_missing 
          THEN NULL; 
      END; 
      EXECUTE IMMEDIATE (' 
          CREATE TABLE nodb_tab_lobs_pre ( 
              id    NUMBER, 
              clob  CLOB 
          ) 
      '); 
    END;
  `;

  const proc_clob_in_tab = `
    BEGIN 
      DECLARE 
          e_table_missing EXCEPTION; 
          PRAGMA EXCEPTION_INIT(e_table_missing, -00942); 
      BEGIN 
          EXECUTE IMMEDIATE('DROP TABLE nodb_tab_clob_in PURGE'); 
      EXCEPTION 
          WHEN e_table_missing 
          THEN NULL; 
      END; 
      EXECUTE IMMEDIATE (' 
          CREATE TABLE nodb_tab_clob_in ( 
              id      NUMBER, 
              clob    CLOB 
          ) 
      '); 
    END;
  `;

  const getRandomString = (length, specialStr) => {
    let str = '';
    const strLength = length - specialStr.length * 2;
    for (; str.length < strLength; str += Math.random().toString(36).slice(2));
    str = str.substr(0, strLength);
    return specialStr + str + specialStr;
  };

  const getLargeString = (specialStr) => {
    const stringSizeInEachLoop = 256 * 1024 * 1024 - 16;
    return getRandomString(stringSizeInEachLoop, specialStr);
  };

  before(async function() {
    connection = await oracledb.getConnection({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString
    });
  });

  after(async function() {
    if (connection)
      await connection.close();
  });

  it('should perform CLOB operations successfully', async function() {
    await connection.execute(proc_clob_in_tab);
    await connection.execute(proc_clob_pre_tab);

    const proc_bind_in = `
        CREATE OR REPLACE PROCEDURE nodb_clobs_in_741 (clob_id IN NUMBER, clob_in IN CLOB)
        AS 
        BEGIN 
            insert into nodb_tab_clob_in (id, clob) values (clob_id, clob_in); 
        END nodb_clobs_in_741;
      `;
    await connection.execute(proc_bind_in);

    const sqlRun_bind_in = "BEGIN nodb_clobs_in_741 (:i, :b); END;";
    const specialStr = '1GBString';
    const string_1GB = getLargeString(specialStr);

    const bindVar = {
      i: { val: bind_in_ID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      b: { val: string_1GB, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: bind_in_maxSize }
    };
    await connection.execute(sqlRun_bind_in, bindVar);

    await connection.execute("DROP PROCEDURE nodb_clobs_in_741");

    const proc_out = `
        CREATE OR REPLACE PROCEDURE nodb_clobs_out_742 (clob_id IN NUMBER, clob_out OUT CLOB) 
        AS 
        BEGIN 
            select clob into clob_out from nodb_tab_clob_in where id = clob_id; 
        END nodb_clobs_out_742;
      `;
    await connection.execute(proc_out);

    const sqlRun = "BEGIN nodb_clobs_out_742 (:i, :b); END;";
    const bindVarOut = {
      i: { val: bind_in_ID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      b: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
    };
    const result = await connection.execute(sqlRun, bindVarOut, { autoCommit: true });

    const lob = result.outBinds.b;
    const sql = "INSERT INTO nodb_tab_clob_in (id, clob) VALUES (:i, :c)";
    const bindVarInsert = {
      i: resultInsert_ID,
      c: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
    };

    await connection.execute(sql, bindVarInsert, { autoCommit: false });
    await lob.close();

    await connection.execute("DROP TABLE nodb_tab_lobs_pre PURGE");

    const proc_compare_CLOB = `
        CREATE OR REPLACE PROCEDURE nodb_clob_compare(result OUT INTEGER) 
        IS 
            CLOB1 CLOB; 
            CLOB2 CLOB; 
        BEGIN 
            select CLOB into CLOB1 from nodb_tab_clob_in where id = ${bind_in_ID}; 
            select CLOB into CLOB2 from nodb_tab_clob_in where id = ${resultInsert_ID}; 
            result := DBMS_LOB.COMPARE(CLOB1, CLOB2); 
        END nodb_CLOB_compare;
      `;
    await connection.execute(proc_compare_CLOB);

    const sqlRunCompareProc = "begin nodb_clob_compare(:r); end;";
    const bindVarCompare = {
      r: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };
    const compareResult = await connection.execute(sqlRunCompareProc, bindVarCompare);

    // Assert that the CLOBs are identical (compare result should be 0)
    assert.strictEqual(compareResult.outBinds.r, 0, "CLOBs should be identical");

    await connection.execute("DROP PROCEDURE nodb_clob_compare");
    await connection.execute("DROP TABLE nodb_tab_clob_in PURGE");
  });
});

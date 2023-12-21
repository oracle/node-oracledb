/* Copyright (c) 2023, Oracle and/or its affiliates. */

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
 *   293. plsqlWarning.js
 *
 * DESCRIPTION
 *   Test cases related to handling of SUCCESS_WITH_INFO warnings when
 *   compile/execute PL/SQL procedures
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const assert    = require('assert');


describe('293. plsqlWarnings.js', function() {
  it('293.1 Warning on executing PL/SQL procedure', async () => {
    const plsql = `
    CREATE OR REPLACE PROCEDURE GETDATEPROC(OUTTIME OUT TIMESTAMP) AS
    BEGIN
      SELECT CURRENT_TIME INTO :OUTTIME FROM DUAL;
    END;
  `;

    const conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(plsql);
    assert.strictEqual(result.warning.message.startsWith("NJS-700:"), true);

    // cleanup
    await conn.execute(`DROP PROCEDURE GETDATEPROC`);
    await conn.close();
  }); // 293.1

  // GH issue #823: https://github.com/oracle/node-oracledb/issues/823
  it('293.2 Warning from PL/SQL query on a non-existing table', async () => {
    const plsql = `
      create or replace procedure test293_2 as
        l_number number;
      begin
        select 1 into l_number from table_that_does_not_exist;
      end;
    `;

    const conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(plsql);
    assert.strictEqual(result.warning.message.startsWith("NJS-700:"), true);

    // cleanup
    await conn.execute(`DROP PROCEDURE test293_2`);
    await conn.close();
  }); // 293.2

});

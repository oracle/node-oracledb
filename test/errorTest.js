/* Copyright (c) 2021, 2025, Oracle and/or its affiliates. */

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
 *   240. errorTest.js
 *
 * DESCRIPTION
 *   This test verifies the error object and its properties.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('240. errorTest.js', function() {

  let conn;
  before(async () => {
    conn = await oracledb.getConnection(dbConfig);
  });

  after(async () => {
    await conn.close();
  });

  it('240.1 checks the offset value of the error', async () => {

    await assert.rejects(
      async () => await conn.execute("begin t_Missing := 5; end;"),
      (err) => {
        assert.strictEqual(err.offset, 6);
        assert.strictEqual(err.errorNum, 6550);
        return true;
      }
    );

  }); // 240.1

  it('240.2 database error', async () => {
    const plsql = `
      begin
          execute immediate ('drop table nodb_table_nonexistent');
      end;
    `;
    await assert.rejects(
      async () => await conn.execute(plsql),
      (err) => {
        assert.strictEqual(err.offset, 0);
        assert.strictEqual(err.errorNum, 942);
        return true;
      }
    );

  }); // 240.2

  it('240.3 the offset of system error is 0', async () => {
    const plsql = `
      BEGIN
          DECLARE v_invalid PLS_INTEGER;
          BEGIN
              v_invalid := 100/0;
          END;
      END;
    `;
    await assert.rejects(
      async () => await conn.execute(plsql),
      (err) => {
        assert.strictEqual(err.offset, 0);
        assert.strictEqual(err.errorNum, 1476);
        return true;
      }
    );
  });// 240.3

  it('240.4 PL/SQL syntax error', async () => {
    const plsql = `DECLARE v_missing_semicolon PLS_INTEGER
      BEGIN
          v_missing_semicolon := 46;
      END;`;
    await assert.rejects(
      async () => await conn.execute(plsql),
      (err) => {
        assert.strictEqual(err.offset, 46);
        assert.strictEqual(err.errorNum, 6550);
        return true;
      }
    );
  }); // 240.4

});

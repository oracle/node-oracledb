/* Copyright (c) 2024, Oracle and/or its affiliates. */

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
 *   Test connection.break()
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('../../dbconfig.js');
const random = require('../../random.js');

describe('brk.js', function() {
  this.timeout(100000);

  let connection = null;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);

    const proc = `
        BEGIN
          DECLARE
            e_table_missing EXCEPTION;
            PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
          BEGIN
            EXECUTE IMMEDIATE('DROP TABLE nodb_tab_brk PURGE');
          EXCEPTION
            WHEN e_table_missing THEN NULL;
          END;
          EXECUTE IMMEDIATE ('
            CREATE TABLE nodb_tab_brk(
              id      NUMBER,
              clob    CLOB
            )
          ');
        END;`;

    await executeSQL(proc);
  });

  after(async function() {
    const sql = "DROP TABLE nodb_tab_brk PURGE";
    await executeSQL(sql);
    await connection.close();
  });

  const executeSQL = async function(sql) {
    await connection.execute(sql);
  };

  it('connection.break() testing', async function() {
    const id = 123;
    const contentLength = 10485761; // 10 * 1024 * 1024 + 1
    const specialStr = "1.2.3";
    const content = random.getRandomString(contentLength, specialStr);

    const insertPromise = connection.execute(
      "INSERT INTO nodb_tab_brk VALUES (:i, :c)",
      {
        i: { val: id },
        c: { val: content, dir: oracledb.BIND_IN, type: oracledb.STRING }
      }
    );

    setTimeout(async () => {
      await connection.break();
    }, 50);

    await assert.rejects(
      async () => await insertPromise,
      /ORA-01013:/ // ORA-01013: User requested cancel of current operation.
    );
  });
});

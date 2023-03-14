/* Copyright (c) 2016, 2023, Oracle and/or its affiliates. */

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
 *   139. fetchAsStringWithRefCursor.js
 *
 * DESCRIPTION
 *   Columns fetched from REF CURSORS can be mapped by fetchInfo settings
 *   in the execute() call. The global fetchAsString or fetchAsBuffer
 *   settings work as well.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('139. fetchAsStringWithRefCursor.js', function() {
  let connection = null;
  const tableName = "nodb_tab_fetchAsRefCursor";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    // PL/SQL procedure to create the table
    let sql = "BEGIN \n" +
                "    DECLARE \n" +
                "        e_table_missing EXCEPTION; \n" +
                "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                "    BEGIN \n" +
                "        EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE' ); \n" +
                "    EXCEPTION \n" +
                "        WHEN e_table_missing \n" +
                "        THEN NULL; \n" +
                "    END; \n" +
                "    EXECUTE IMMEDIATE ( ' \n" +
                "        CREATE TABLE " + tableName + " ( \n" +
                "            id        NUMBER(10), \n" +
                "            content   VARCHAR2(20), \n" +
                "            hiredate  DATE \n" +
                "        ) \n" +
                "    '); \n" +
                "END;  ";
    await connection.execute(sql);

    // PL/SQL procedure to insert data into the table
    sql = "DECLARE \n" +
          "    x NUMBER := 0; \n" +
          "    n VARCHAR2(20); \n" +
          "BEGIN \n" +
          "    FOR i IN 1..300 LOOP \n" +
          "        x := x + 1; \n" +
          "        n := 'staff ' || x; \n" +
          "        INSERT INTO " + tableName + " VALUES(x, n, TO_DATE('2012-02-18', 'YYYY-MM-DD')); \n" +
          "    END LOOP; \n" +
          "END; ";
    await connection.execute(sql);

    // PL/SQL procedure for the ref cursor
    let proc = "CREATE OR REPLACE PROCEDURE nodb_proc_fetchcursor (p_in IN NUMBER, p_out OUT SYS_REFCURSOR) \n" +
                "AS \n" +
                "BEGIN \n" +
                "    OPEN p_out FOR \n" +
                "        SELECT * FROM " + tableName + " WHERE id > p_in; \n" +
                "END; ";
    await connection.execute(proc);
  });

  after(async function() {
    let sql = "DROP PROCEDURE nodb_proc_fetchcursor";
    await connection.execute(sql);

    sql = "DROP TABLE " + tableName + " PURGE";
    await connection.execute(sql);

    await connection.close();
    oracledb.fetchAsString = [];
  });

  it('139.1 columns fetched from REF CURSORS can be mapped by fetchInfo settings', async function() {
    let result = await connection.execute(
      "begin nodb_proc_fetchcursor(:in, :out); end;",
      {
        in: 290,
        out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo:
        {
          "ID": { type: oracledb.STRING },
          "HIREDATE": { type: oracledb.STRING }
        }
      }
    );

    const fetchRowFromRC = async function(rc) {
      const row = await rc.getRow();
      if (row) {
        assert.strictEqual(typeof row.ID, "string");
        assert.strictEqual(typeof row.HIREDATE, "string");
        return await fetchRowFromRC(rc);
      } else {
        await rc.close();
      }
    }; // fetchRowFromRC()

    await fetchRowFromRC(result.outBinds.out);

  }); // 139.1

  it('139.2 fetchAsString takes effect as well', async function() {

    oracledb.fetchAsString = [ oracledb.DATE ];
    let result = await connection.execute(
      "begin nodb_proc_fetchcursor(:in, :out); end;",
      {
        in: 295,
        out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const fetchRowFromRC = async function(rc) {
      const row = await rc.getRow();
      if (row) {
        assert.notStrictEqual(typeof row.ID, "string");
        assert.strictEqual(typeof row.HIREDATE, "string");
        return await fetchRowFromRC(rc);
      } else {
        await rc.close();
      }
    }; // fetchRowFromRC()

    await fetchRowFromRC(result.outBinds.out);
  }); // 139.2

});

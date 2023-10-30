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
 *   15. resultsetToStream.js
 *
 * DESCRIPTION
 *   Testing driver query results via stream feature.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('15. resultsetToStream.js', function() {

  let connection = null;
  const rowsAmount = 217;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);

    let proc = "BEGIN \n" +
               "    DECLARE \n" +
               "        e_table_missing EXCEPTION; \n" +
               "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
               "    BEGIN \n" +
               "        EXECUTE IMMEDIATE ('DROP TABLE nodb_rs2stream PURGE'); \n" +
               "    EXCEPTION \n" +
               "        WHEN e_table_missing \n" +
               "        THEN NULL; \n" +
               "    END; \n" +
               "    EXECUTE IMMEDIATE (' \n" +
               "        CREATE TABLE nodb_rs2stream ( \n" +
               "            employees_id NUMBER, \n" +
               "            employees_name VARCHAR2(20), \n" +
               "            employees_history CLOB \n" +
               "        ) \n" +
               "    '); \n" +
               "END; ";
    await connection.execute(proc);

    proc = "DECLARE \n" +
           "    x NUMBER := 0; \n" +
           "    n VARCHAR2(20); \n" +
           "    clobData CLOB; \n" +
           "BEGIN \n" +
           "    FOR i IN 1..217 LOOP \n" +
           "        x := x + 1; \n" +
           "        n := 'staff ' || x; \n" +
           "        INSERT INTO nodb_rs2stream VALUES (x, n, EMPTY_CLOB()) RETURNING employees_history INTO clobData; \n" +
           "        DBMS_LOB.WRITE(clobData, 20, 1, '12345678901234567890'); \n" +
           "    END LOOP; \n" +
           "end; ";
    await connection.execute(proc);
  }); // before

  after(async function() {
    await connection.execute("DROP TABLE nodb_rs2stream PURGE");
    await connection.close();
  }); // after

  describe('15.1 Testing ResultSet.toQueryStream', function() {

    it('15.1.1 should allow resultsets to be converted to streams', async function() {
      const result = await connection.execute(
        'begin \n' +
        '  open :cursor for select employees_name from nodb_rs2stream; \n' +
        'end;',
        {
          cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
        }
      );
      const stream = result.outBinds.cursor.toQueryStream();
      let counter = 0;
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('end', stream.destroy);
        stream.on('close', resolve);
        stream.on('data', function(data) {
          assert(data);
          counter++;
        });
      });
      assert.strictEqual(counter, rowsAmount);
    }); // 15.1.1

  }); // 15.1

  describe('15.2 Testing ResultSet/QueryStream conversion errors', function() {

    it('15.2.1 should prevent conversion to stream after getRow is invoked', async function() {
      const sql = `
        begin
          open :cursor for select employees_name from nodb_rs2stream;
        end;`;
      const binds = {
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute(sql, binds);
      const cursor = result.outBinds.cursor;
      await cursor.getRow();
      await assert.throws(
        () => cursor.toQueryStream(),
        // NJS-041: cannot convert to stream after invoking methods
        /NJS-041:/
      );
      await cursor.close();
    }); // 15.2.1

    it('15.2.2 should prevent conversion to stream after getRows is invoked', async function() {
      const sql = `
        begin
          open :cursor for select employees_name from nodb_rs2stream;
        end;`;
      const binds = {
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute(sql, binds);
      const cursor = result.outBinds.cursor;
      await cursor.getRows(5);
      assert.throws(
        () => cursor.toQueryStream(),
        // NJS-041: cannot convert to stream after invoking methods
        /NJS-041:/
      );
      await cursor.close();
    }); // 15.2.2

    it('15.2.3 should prevent conversion to stream after close is invoked', async function() {
      const sql = `
        begin
          open :cursor for select employees_name from nodb_rs2stream;
        end;`;
      const binds = {
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute(sql, binds);
      const cursor = result.outBinds.cursor;
      await cursor.close();
      assert.throws(
        () => cursor.toQueryStream(),
        // NJS-041: cannot convert to stream after invoking methods
        /NJS-041:/
      );
    }); // 15.2.3

    it('15.2.4 should prevent invoking getRow after conversion to stream', async function() {
      const sql = `
        begin
          open :cursor for select employees_name from nodb_rs2stream;
        end;`;
      const binds = {
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute(sql, binds);
      const cursor = result.outBinds.cursor;
      const stream = cursor.toQueryStream();
      await assert.rejects(
        async () => await cursor.getRow(),
        // NJS-042: cannot invoke methods after converting to stream
        /NJS-042:/
      );
      stream.destroy();
    }); // 15.2.4

    it('15.2.5 should prevent invoking getRows after conversion to stream', async function() {
      const sql = `
        begin
          open :cursor for select employees_name from nodb_rs2stream;
        end;`;
      const binds = {
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute(sql, binds);
      const cursor = result.outBinds.cursor;
      const stream = cursor.toQueryStream();
      await assert.rejects(
        async () => await cursor.getRows(5),
        // NJS-042: cannot invoke methods after converting to stream
        /NJS-042:/
      );
      stream.destroy();
    }); // 15.2.5

    it('15.2.6 should prevent invoking close after conversion to stream', async function() {
      const sql = `
        begin
          open :cursor for select employees_name from nodb_rs2stream;
        end;`;
      const binds = {
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute(sql, binds);
      const cursor = result.outBinds.cursor;
      const stream = cursor.toQueryStream();
      await assert.rejects(
        async () => await cursor.close(),
        // NJS-042: cannot invoke methods after converting to stream
        /NJS-042:/
      );
      stream.destroy();
    });  // 15.2.6

    it('15.2.7 should prevent calling toQueryStream more than once', async function() {
      const sql = `
        begin
          open :cursor for select employees_name from nodb_rs2stream;
        end;`;
      const binds = {
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute(sql, binds);
      const cursor = result.outBinds.cursor;
      const stream = cursor.toQueryStream();
      assert.throws(
        () => cursor.toQueryStream(),
        /NJS-043:/
      );
      stream.destroy();
    }); // 15.2.7

  }); // 15.2
});

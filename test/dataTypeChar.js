/* Copyright (c) 2015, 2022, Oracle and/or its affiliates. */

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
 *   22. dataTypeChar.js
 *
 * DESCRIPTION
 *   Testing Oracle data type support - CHAR.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const assist   = require('./dataTypeAssist.js');
const dbConfig = require('./dbconfig.js');

describe('22. dataTypeChar.js', function() {

  let connection = null;
  let tableName = "nodb_char";

  let strLen = [100, 1000, 2000];  // char string length
  let strs =
    [
      assist.createCharString(strLen[0]),
      assist.createCharString(strLen[1]),
      assist.createCharString(strLen[2]),
    ];

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('22.1 testing CHAR data in various lengths', function() {

    before('create table, insert data', async function() {
      await assist.setUp(connection, tableName, strs);
    });

    after(async function() {
      oracledb.fetchAsString = [];
      await connection.execute("DROP table " + tableName + " PURGE");
    });

    it('22.1.1 works well with SELECT query', async function() {
      await assist.dataTypeSupport(connection, tableName, strs);
    });

    it('22.1.2 works well with result set', async function() {
      await assist.verifyResultSet(connection, tableName, strs);
    });

    it('22.1.3 works well with REF Cursor', async function() {
      await assist.verifyRefCursor(connection, tableName, strs);
    });

    it('22.1.4 columns fetched from REF CURSORS can be mapped by fetchInfo settings', async function() {
      await assist.verifyRefCursorWithFetchInfo(connection, tableName, strs);
    });

  });

  describe('22.2 stores null value correctly', function() {
    it('22.2.1 testing Null, Empty string and Undefined', async function() {
      await assist.verifyNullValues(connection, tableName);
    });
  });

  describe('22.3 PL/SQL binding scalar', function() {

    it('22.3.1 PL/SQL binding scalar values IN', async function() {

      let proc = "CREATE OR REPLACE\n" +
                 "FUNCTION testchar(stringValue IN CHAR) RETURN CHAR\n" +
                 "IS\n" +
                 "BEGIN\n" +
                 "  RETURN 'Hello ' || stringValue || ' world!';\n" +
                 "END testchar;";
      assert(connection);
      await connection.execute(proc);
      let bindvars = {
        result:      {type: oracledb.STRING, dir: oracledb.BIND_OUT},
        stringValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: 'Node.js'}
      };
      await connection.execute(
        "BEGIN :result := testchar(:stringValue); END;",
        bindvars);
      await connection.execute("DROP FUNCTION testchar");
    }); // 22.3.1

    it('22.3.2 bind scalar values INOUT', async function() {

      let proc = "CREATE OR REPLACE\n" +
                 "PROCEDURE nodb_testproc(stringValue IN OUT NOCOPY CHAR)\n" +
                 "IS\n" +
                 "BEGIN\n" +
                 "  stringValue := '(' || stringValue || ')';\n" +
                 "END nodb_testproc;\n";
      await connection.execute(proc);
      let bindvars = { stringValue: {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: 'Node.js'} };
      await assert.rejects(
        async () => await connection.execute(
          "BEGIN nodb_testproc(:stringValue); END;",
          bindvars),
        // Error: ORA-06502: PL/SQL: numeric or value error: character string buffer too small
        // For SQL*PLUS driver, the behavior is the same
        /ORA-06502:/
      );

      await connection.execute("DROP PROCEDURE nodb_testproc");
    }); // 22.3.2

    it('22.3.3 bind scalar values OUT', async function() {
      let result = null;
      let proc = "CREATE OR REPLACE\n" +
                     "PROCEDURE nodb_testproc(stringValue OUT NOCOPY CHAR)\n" +
                     "IS\n" +
                     "BEGIN\n" +
                     "  stringValue := 'Hello Node.js World!';\n" +
                     "END nodb_testproc;\n";
      await connection.execute(proc);
      let bindvars = { stringValue: {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize:200} };
      result = await connection.execute(
        "BEGIN nodb_testproc(:stringValue); END;",
        bindvars);
      // There are trailing spaces with the outBind value as CHAR is a kind of
      // fix-size data type. So the case uses trim() function.
      assert.strictEqual(result.outBinds.stringValue.trim(), 'Hello Node.js World!');

      await connection.execute("DROP PROCEDURE nodb_testproc");
    }); // 22.3.3
  }); // 22.3

  describe('22.4 PL/SQL binding indexed tables', function() {

    it.skip('22.4.1 bind indexed table IN', async function() {
      let result = null;
      let proc = "CREATE OR REPLACE PACKAGE\n" +
                  "nodb_testpack\n" +
                  "IS\n" +
                  "  TYPE stringsType IS TABLE OF CHAR(30) INDEX BY BINARY_INTEGER;\n" +
                  "  FUNCTION test(strings IN stringsType) RETURN CHAR;\n" +
                  "END;";
      assert(connection);
      await connection.execute(
        proc);
      proc = "CREATE OR REPLACE PACKAGE BODY\n" +
                 "nodb_testpack\n" +
                 "IS\n" +
                 "  FUNCTION nodb_testfunc(strings IN stringsType) RETURN CHAR\n" +
                 "  IS\n" +
                 "    s CHAR(2000) := '';\n" +
                 "  BEGIN\n" +
                 "    FOR i IN 1 .. strings.COUNT LOOP\n" +
                 "      s := s || strings(i);\n" +
                 "    END LOOP;\n" +
                 "    RETURN s;\n" +
                 "  END;\n" +
                 "END;";
      await connection.execute(proc);
      let bindvars = {
        result:  {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 2000},
        strings: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: ['John', 'Doe']}
      };
      result = await connection.execute(
        "BEGIN :result := nodb_testpack.nodb_testfunc(:strings); END;",
        bindvars);
      console.log(result);
      await connection.execute(
        "DROP PACKAGE nodb_testpack");
    });
  });
});

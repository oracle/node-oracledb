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
 *   43. plsqlBindIndexedTable1.js
 *
 * DESCRIPTION
 *   Testing PL/SQL indexed tables (associative arrays).
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('43. plsqlBindIndexedTable1.js', function() {

  describe('43.1 binding PL/SQL indexed table', function() {
    let connection;

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
    });

    after(async function() {
      await connection.close();
    });

    it('43.1.1 binding PL/SQL indexed table IN by name', async function() {
      let proc = "CREATE OR REPLACE PACKAGE\n" +
                  "nodb_plsqlbindpack1\n" +
                  "IS\n" +
                  "  TYPE stringsType IS TABLE OF VARCHAR2(30) INDEX BY BINARY_INTEGER;\n" +
                  "  TYPE numbersType IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;\n" +
                  "  FUNCTION test(strings IN stringsType, numbers IN numbersType) RETURN VARCHAR2;\n" +
                  "END;";
      await connection.execute(proc);
      proc = "CREATE OR REPLACE PACKAGE BODY\n" +
                 "nodb_plsqlbindpack1\n" +
                 "IS\n" +
                 "  FUNCTION test(strings IN stringsType, numbers IN numbersType) RETURN VARCHAR2\n" +
                 "  IS\n" +
                 "    s VARCHAR2(2000) := '';\n" +
                 "  BEGIN\n" +
                 "    FOR i IN 1 .. strings.COUNT LOOP\n" +
                 "      s := s || strings(i);\n" +
                 "    END LOOP;\n" +
                 "    FOR i IN 1 .. numbers.COUNT LOOP\n" +
                 "       s := s || numbers(i);\n" +
                 "    END LOOP;\n" +
                 "    RETURN s;\n" +
                 "  END;\n" +
                 "END;";
      await connection.execute(proc);
      const bindvars = {
        result: {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 2000},
        strings: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: ['John', 'Doe']},
        numbers: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: [0, 8, 11]}
      };
      const sql = "BEGIN :result := nodb_plsqlbindpack1.test(:strings, :numbers); END;";
      const result = await connection.execute(sql, bindvars);
      assert.strictEqual(result.outBinds.result, 'JohnDoe0811');
      await connection.execute("DROP PACKAGE nodb_plsqlbindpack1");
    });

    it('43.1.2 binding PL/SQL indexed table IN by position', async function() {
      let proc = "CREATE OR REPLACE PACKAGE\n" +
                  "nodb_plsqlbindpack2\n" +
                  "IS\n" +
                  "  TYPE stringsType IS TABLE OF VARCHAR2(30) INDEX BY BINARY_INTEGER;\n" +
                  "  TYPE numbersType IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;\n" +
                  "  PROCEDURE test(s IN stringsType, n IN numbersType);\n" +
                  "END;";
      await connection.execute(proc);
      proc = "CREATE OR REPLACE PACKAGE BODY\n" +
                 "nodb_plsqlbindpack2\n" +
                 "IS\n" +
                 "  PROCEDURE test(s IN stringsType, n IN numbersType)\n" +
                 "  IS\n" +
                 "  BEGIN\n" +
                 "    IF (s(1) IS NULL OR s(1) <> 'John') THEN\n" +
                 "      raise_application_error(-20000, 'Invalid s(1): \"' || s(1) || '\"');\n" +
                 "    END IF;\n" +
                 "    IF (s(2) IS NULL OR s(2) <> 'Doe') THEN\n" +
                 "      raise_application_error(-20000, 'Invalid s(2): \"' || s(2) || '\"');\n" +
                 "    END IF;\n" +
                 "  END;\n" +
                 "END;";
      await connection.execute(proc);
      const bindvars = [
        {type: oracledb.STRING, dir: oracledb.BIND_IN, val: ['John', 'Doe']},
        {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: [8, 11]}
      ];
      const sql = "BEGIN nodb_plsqlbindpack2.test(:1, :2); END;";
      await connection.execute(sql, bindvars);
      await connection.execute("DROP PACKAGE nodb_plsqlbindpack2");
    });

    it('43.1.3 binding PL/SQL indexed table IN OUT', async function() {
      let proc = "CREATE OR REPLACE PACKAGE\n" +
                  "nodb_plsqlbindpack3\n" +
                  "IS\n" +
                  "  TYPE stringsType IS TABLE OF VARCHAR2(30) INDEX BY BINARY_INTEGER;\n" +
                  "  TYPE numbersType IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;\n" +
                  "  PROCEDURE test(strings IN OUT NOCOPY stringsType, numbers IN OUT NOCOPY numbersType);\n" +
                  "END;";
      await connection.execute(proc);
      proc = "CREATE OR REPLACE PACKAGE BODY\n" +
                 "nodb_plsqlbindpack3\n" +
                 "IS\n" +
                 "  PROCEDURE test(strings IN OUT NOCOPY stringsType, numbers IN OUT NOCOPY numbersType)\n" +
                 "  IS\n" +
                 "  BEGIN\n" +
                 "    FOR i IN 1 .. strings.COUNT LOOP\n" +
                 "      strings(i) := '(' || strings(i) || ')';\n" +
                 "    END LOOP;\n" +
                 "    FOR i IN 1 .. numbers.COUNT LOOP\n" +
                 "      numbers(i) := numbers(i) * 10;\n" +
                 "    END LOOP;\n" +
                 "    numbers(numbers.COUNT + 1) := 4711;\n" +
                 "  END;\n" +
                 "END;";
      await connection.execute(proc);
      const bindvars = {
        strings: {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: ['John', 'Doe'], maxArraySize: 2},
        numbers: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: [1, 2, 3], maxArraySize: 4}
      };
      const sql = "BEGIN nodb_plsqlbindpack3.test(:strings, :numbers); END;";
      const result = await connection.execute(sql, bindvars);
      assert.deepStrictEqual(result.outBinds.strings, ['(John)', '(Doe)']);
      assert.deepStrictEqual(result.outBinds.numbers, [10, 20, 30, 4711]);
      await connection.execute("DROP PACKAGE nodb_plsqlbindpack3");
    });

    it('43.1.4 binding PL/SQL indexed table OUT', async function() {
      let proc = "CREATE OR REPLACE PACKAGE\n" +
                 "nodb_plsqlbindpack4\n" +
                 "IS\n" +
                 "  TYPE stringsType IS TABLE OF VARCHAR2(30) INDEX BY BINARY_INTEGER;\n" +
                 "  TYPE numbersType IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;\n" +
                 "  PROCEDURE test(items IN NUMBER, strings OUT NOCOPY stringsType, numbers OUT NOCOPY numbersType);\n" +
                 "END;";
      await connection.execute(proc);
      proc = "CREATE OR REPLACE PACKAGE BODY\n" +
                 "nodb_plsqlbindpack4\n" +
                 "IS\n" +
                 "  PROCEDURE test(items IN NUMBER, strings OUT NOCOPY stringsType, numbers OUT NOCOPY numbersType)\n" +
                 "  IS\n" +
                 "  BEGIN\n" +
                 "    FOR i IN 1 .. items LOOP\n" +
                 "      strings(i) := i;\n" +
                 "    END LOOP;\n" +
                 "    FOR i IN 1 .. items LOOP\n" +
                 "      numbers(i) := i;\n" +
                 "    END LOOP;\n" +
                 "  END;\n" +
                 "END;";
      await connection.execute(proc);
      const bindvars = {
        items: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: 3},
        strings: {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxArraySize: 3},
        numbers: {type: oracledb.NUMBER, dir: oracledb.BIND_OUT, maxArraySize: 3}
      };
      const sql = "BEGIN nodb_plsqlbindpack4.test(:items, :strings, :numbers); END;";
      const result = await connection.execute(sql, bindvars);
      assert.deepStrictEqual(result.outBinds.strings, ['1', '2', '3']);
      assert.deepStrictEqual(result.outBinds.numbers, [1, 2, 3]);
      await connection.execute("DROP PACKAGE nodb_plsqlbindpack4");
    });

  });

  describe('43.2 test exceptions when using PL/SQL indexed table bindings', function() {
    let connection;

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
      let proc = "CREATE OR REPLACE PACKAGE\n" +
                  "nodb_plsqlbindpack21\n" +
                  "IS\n" +
                  "  TYPE datesType IS TABLE OF DATE INDEX BY BINARY_INTEGER;\n" +
                  "  TYPE numbersType IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;\n" +
                  "  TYPE stringsType IS TABLE OF VARCHAR2(2000) INDEX BY BINARY_INTEGER;\n" +
                  "  PROCEDURE test1(p IN numbersType);\n" +
                  "  PROCEDURE test2(p IN OUT NOCOPY numbersType);\n" +
                  "  PROCEDURE test3(p IN datesType);\n" +
                  "  PROCEDURE test4(id IN numbersType, p IN datesType);\n" +
                  "  PROCEDURE test5(p OUT stringsType);\n" +
                  "END;";
      await connection.execute(proc);
      proc = "CREATE OR REPLACE PACKAGE BODY\n" +
                 "nodb_plsqlbindpack21\n" +
                 "IS\n" +
                 "  PROCEDURE test1(p IN numbersType) IS BEGIN NULL; END;\n" +
                 "  PROCEDURE test2(p IN OUT NOCOPY numbersType) IS BEGIN NULL; END;\n" +
                 "  PROCEDURE test3(p IN datesType) IS BEGIN NULL; END;\n" +
                 "  PROCEDURE test4(id IN numbersType, p IN datesType) IS BEGIN NULL; END;\n" +
                 "  PROCEDURE test5(p OUT stringsType) IS BEGIN NULL; END;\n" +
                 "END;";
      await connection.execute(proc);
    }); // before

    after(async function() {
      await connection.execute("DROP PACKAGE nodb_plsqlbindpack21");
      await connection.close();
    });

    it('43.2.1 maxArraySize is ignored when specifying BIND_IN', async function() {
      const bindvars = {
        p: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: [1, 2, 3], maxArraySize: 2}
      };
      const sql = "BEGIN nodb_plsqlbindpack21.test1(:p); END;";
      await connection.execute(sql, bindvars);
    });

    it('43.2.2 maxArraySize is mandatory for BIND_INOUT ', async function() {
      const bindvars = {
        p: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: [1, 2, 3]}
      };
      const sql = "BEGIN nodb_plsqlbindpack21.test2(:p); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /NJS-035:/
      );
      // NJS-035: maxArraySize is required for IN OUT array bind
    });

    it('43.2.3 maxArraySize cannot smaller than the number of array elements', async function() {
      const bindvars = {
        p: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: [1, 2, 3], maxArraySize: 2}
      };
      const sql = "BEGIN nodb_plsqlbindpack21.test3(:p); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /NJS-036:/
      );
      // NJS-036: Given Array is of size greater than maxArraySize property.
    });

    it('43.2.5 negative case: incorrect type of array element - bind by name 1', async function() {
      const bindvars = {
        id: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: ["1", 1]},
        p: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: "hi"}
      };
      const sql = "BEGIN nodb_plsqlbindpack21.test4(:id, :p); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /NJS-037: .* index 0 .* bind ":id"/
      );
      // NJS-037: invalid data type at array index 0 for bind ":id"
    });

    it('43.2.6 negative case: incorrect type of array element - bind by name 2', async function() {
      const bindvars = {
        id: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: [1, 2, "hi"]},
        p: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: [1, 'hello']}
      };
      const sql = "BEGIN nodb_plsqlbindpack21.test4(:id, :p); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /NJS-037: .* index 2 .* bind ":id"/
      );
      // NJS-037: invalid data type at array index 2 for bind ":id"
    });

    it('43.2.7 negative case: incorrect type of array element - bind by name 3', async function() {
      const bindvars = {
        id: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: [1, 2]},
        p: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: ['hello', 1]}
      };
      const sql = "BEGIN nodb_plsqlbindpack21.test4(:id, :p); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /NJS-037: .* index 0 .* bind ":p"/
      );
    });

    it('43.2.8 negative case: incorrect type of array element - bind by name 4', async function() {
      const bindvars = {
        id: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: [1, 2, 3]},
        p: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: [1, 2, 'hello']}
      };
      const sql = "BEGIN nodb_plsqlbindpack21.test4(:id, :p); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /NJS-037: .* index 2 .* bind ":p"/
      );
    });

    it('43.2.9 supports binding by position', async function() {
      const bindvars = [
        {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: [1, 2]}
      ];
      const sql = "BEGIN nodb_plsqlbindpack21.test1(:1); END;";
      await connection.execute(sql, bindvars);
    });

    it('43.2.10 negative case: incorrect type of array elements - bind by pos 1', async function() {
      const bindvars = [
        { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: ['hello', 1] },
        { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: "hi" }
      ];
      const sql = "BEGIN nodb_plsqlbindpack21.test4 (:1, :2); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /NJS-052: .* index 0 .* position 1/
      );
    });

    it('43.2.11 negative case: incorrect type of array elements - bind by pos 2', async function() {
      const bindvars = [
        { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: [1, 2, "hi"] },
        { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: "hi" }
      ];
      const sql = "BEGIN nodb_plsqlbindpack21.test4 (:1, :2); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /NJS-052: .* index 2 .* position 1/
      );
    });

    it('43.2.12 negative case: incorrect type of array elements - bind by pos 3', async function() {
      const bindvars = [
        { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: [1, 2] },
        { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: ["hi", 1] }
      ];
      const sql = "BEGIN nodb_plsqlbindpack21.test4 (:1, :2); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /NJS-052: .* index 0 .* position 2/
      );
    });

    it('43.2.13 negative case: incorrect type of array elements - bind by pos 4', async function() {
      const bindvars = [
        { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: [1, 2, 3] },
        { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: [1, 2, "hi"] }
      ];
      const sql = "BEGIN nodb_plsqlbindpack21.test4 (:1, :2); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /NJS-052: .* index 2 .* position 2/
      );
    });

  }); // 43.2

  describe('43.3 binding PL/SQL scalar', function() {
    let connection;

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute("alter session set time_zone = 'UTC'");
    });

    after(async function() {
      await connection.close();
    });

    it('43.3.1 binding PL/SQL scalar IN', async function() {
      const proc = "CREATE OR REPLACE\n" +
                 "FUNCTION nodb_plsqlbindfunc31(stringValue IN VARCHAR2, numberValue IN NUMBER, dateValue IN DATE) RETURN VARCHAR2\n" +
                 "IS\n" +
                 "BEGIN\n" +
                 "  RETURN stringValue || ' ' || numberValue || ' released in ' || TO_CHAR(dateValue, 'MON YYYY');\n" +
                 "END nodb_plsqlbindfunc31;";
      await connection.execute(proc);
      const bindvars = {
        result: {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 2000},
        stringValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: 'Space odyssey'},
        numberValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: 2001 },
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: new Date(1968, 3, 2) }
      };
      const sql = "BEGIN :result := nodb_plsqlbindfunc31(:stringValue, :numberValue, :dateValue); END;";
      const result = await connection.execute(sql, bindvars);
      assert.strictEqual(result.outBinds.result, 'Space odyssey 2001 released in APR 1968');
      await connection.execute("DROP FUNCTION nodb_plsqlbindfunc31");
    });

    it('43.3.2 binding PL/SQL scalar IN/OUT', async function() {
      const proc = "CREATE OR REPLACE\n" +
                 "PROCEDURE nodb_plsqlbindproc32(stringValue IN OUT NOCOPY VARCHAR2, numberValue IN OUT NOCOPY NUMBER, dateValue IN OUT NOCOPY DATE)\n" +
                 "IS\n" +
                 "BEGIN\n" +
                 "  stringValue := '(' || stringValue || ')';\n" +
                 "  numberValue := NumberValue + 100;\n" +
                 //"  dateValue   := "
                 "END nodb_plsqlbindproc32;\n";
      await connection.execute(proc);
      const releaseDate = new Date(1968, 3, 2);
      const bindvars = {
        stringValue: {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: 'Space odyssey'},
        numberValue: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: 2001},
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_INOUT, val: releaseDate}
      };
      const sql = "BEGIN nodb_plsqlbindproc32(:stringValue, :numberValue, :dateValue); END;";
      const result = await connection.execute(sql, bindvars);
      assert.strictEqual(result.outBinds.stringValue, '(Space odyssey)');
      assert.strictEqual(result.outBinds.numberValue, 2101);
      await connection.execute("DROP PROCEDURE nodb_plsqlbindproc32");
    });

    it('43.3.3 binding PL/SQL scalar OUT by name', async function() {
      const proc = "CREATE OR REPLACE\n" +
                 "PROCEDURE nodb_plsqlbindproc33(stringValue OUT VARCHAR2, numberValue OUT NUMBER, dateValue OUT DATE)\n" +
                 "IS\n" +
                 "BEGIN\n" +
                 "  stringValue := 'Space odyssey';\n" +
                 "  numberValue := 2001;\n" +
                 "  dateValue   := TO_DATE('04-02-1968', 'MM-DD-YYYY');" +
                 "END nodb_plsqlbindproc33;\n";
      await connection.execute(proc);
      const bindvars = {
        stringValue: {type: oracledb.STRING, dir: oracledb.BIND_OUT},
        numberValue: {type: oracledb.NUMBER, dir: oracledb.BIND_OUT},
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_OUT}
      };
      const sql = "BEGIN nodb_plsqlbindproc33(:stringValue, :numberValue, :dateValue); END;";
      const result = await connection.execute(sql, bindvars);
      assert.strictEqual(result.outBinds.stringValue, 'Space odyssey');
      assert.strictEqual(result.outBinds.numberValue, 2001);
      assert.deepStrictEqual(result.outBinds.dateValue, new Date(1968, 3, 2));
      await connection.execute("DROP PROCEDURE nodb_plsqlbindproc33");
    });

    it('43.3.4 binding PL/SQL scalar OUT by position', async function() {
      const proc = "CREATE OR REPLACE\n" +
                 "PROCEDURE nodb_plsqlbindproc34(stringValue OUT VARCHAR2, numberValue OUT NUMBER, dateValue OUT DATE)\n" +
                 "IS\n" +
                 "BEGIN\n" +
                 "  stringValue := 'Space odyssey';\n" +
                 "  numberValue := 2001;\n" +
                 "  dateValue   := TO_DATE('04-02-1968', 'MM-DD-YYYY');" +
                 "END nodb_plsqlbindproc34;\n";
      await connection.execute(proc);
      const bindvars = [
        {type: oracledb.STRING, dir: oracledb.BIND_OUT},
        {type: oracledb.NUMBER, dir: oracledb.BIND_OUT},
        {type: oracledb.DATE, dir: oracledb.BIND_OUT}
      ];
      const sql = "BEGIN nodb_plsqlbindproc34(:1, :2, :3); END;";
      const result = await connection.execute(sql, bindvars);
      assert.strictEqual(result.outBinds[0], 'Space odyssey');
      assert.strictEqual(result.outBinds[1], 2001);
      assert.deepStrictEqual(result.outBinds[2], new Date(1968, 3, 2));
      await connection.execute("DROP PROCEDURE nodb_plsqlbindproc34");
    });

  }); // 43.3

  describe('43.4 test attribute - maxArraySize', function() {
    let connection;

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
      let proc = "CREATE OR REPLACE PACKAGE\n" +
                  "nodb_plsqlbindpack41\n" +
                  "IS\n" +
                  "  TYPE datesType IS TABLE OF DATE INDEX BY BINARY_INTEGER;\n" +
                  "  TYPE numbersType IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;\n" +
                  "  TYPE stringsType IS TABLE OF VARCHAR2(2000) INDEX BY BINARY_INTEGER;\n" +
                  "  PROCEDURE test1(p IN numbersType);\n" +
                  "  PROCEDURE test2(p IN OUT NOCOPY numbersType);\n" +
                  "  PROCEDURE test3(p IN datesType);\n" +
                  "  PROCEDURE test4(p IN stringsType);\n" +
                  "  PROCEDURE test5(p IN numbersType);\n" +
                  "END;";
      await connection.execute(proc);
      proc = "CREATE OR REPLACE PACKAGE BODY\n" +
                 "nodb_plsqlbindpack41\n" +
                 "IS\n" +
                 "  PROCEDURE test1(p IN numbersType) IS BEGIN NULL; END;\n" +
                 "  PROCEDURE test2(p IN OUT NOCOPY numbersType) IS BEGIN NULL; END;\n" +
                 "  PROCEDURE test3(p IN datesType) IS BEGIN NULL; END;\n" +
                 "  PROCEDURE test4(p IN stringsType) IS BEGIN NULL; END;\n" +
                 "  PROCEDURE test5(p IN numbersType) IS BEGIN NULL; END;\n" +
                 "END;";
      await connection.execute(proc);
    });

    after(async function() {
      await connection.execute("DROP PACKAGE nodb_plsqlbindpack41");
      await connection.close();
    });

    it('43.4.1 maxArraySize property is ignored for BIND_IN', async function() {
      const bindvars = {
        p: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: [1, 2, 3], maxArraySize: 1}
      };
      const sql = "BEGIN nodb_plsqlbindpack41.test1(:p); END;";
      await connection.execute(sql, bindvars);
    });

    it('43.4.2 maxArraySize is mandatory for BIND_INOUT', async function() {
      const bindvars = {
        p: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: [1, 2, 3]}
      };
      const sql = "BEGIN nodb_plsqlbindpack41.test2(:p); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /NJS-035:/
      );
      // NJS-035: maxArraySize is required for IN OUT array bind
    });

    it('43.4.3 maxArraySize cannot smaller than the number of array elements', async function() {
      const bindvars = {
        p: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: [1, 2, 3], maxArraySize: 2}
      };
      const sql = "BEGIN nodb_plsqlbindpack41.test2(:p); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /NJS-036:/
      );
    });

    it('43.4.4 maxArraySize can be equal to the number of array elements', async function() {
      const bindvars = {
        p: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: [1, 2, 3], maxArraySize: 3}
      };
      const sql = "BEGIN nodb_plsqlbindpack41.test2(:p); END;";
      await connection.execute(sql, bindvars);
    });

    it('43.4.5 negative case: large value', async function() {
      if (oracledb.thin)
        return this.skip();
      const bindvars = {
        p: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: [1, 2, 3], maxArraySize: 987654321}
      };
      const sql = "BEGIN nodb_plsqlbindpack41.test2(:p); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /DPI-1015:/
      );
    });

    it('43.4.6 negative case: < 0', async function() {
      const bindvars = {
        p: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: [1, 2, 3], maxArraySize: -9}
      };
      const sql = "BEGIN nodb_plsqlbindpack41.test2(:p); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /NJS-007:/
      );
    });

    it('43.4.7 negative case: = 0', async function() {
      const bindvars = {
        p: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: [1, 2, 3], maxArraySize: 0}
      };
      const sql = "BEGIN nodb_plsqlbindpack41.test2(:p); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /NJS-007:/
      );
    });

    it('43.4.8 negative case: assign a string to it', async function() {
      const bindvars = {
        p: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: [1, 2, 3], maxArraySize: 'foobar'}
      };
      const sql = "BEGIN nodb_plsqlbindpack41.test2(:p); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /NJS-007:/
      );
    });

    it('43.4.9 negative case: NaN', async function() {
      const bindvars = {
        p: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: [1, 2, 3], maxArraySize: NaN}
      };
      const sql = "BEGIN nodb_plsqlbindpack41.test2(:p); END;";
      await assert.rejects(
        async () => await connection.execute(sql, bindvars),
        /NJS-007:/
      );
    });

  }); // 43.4

});

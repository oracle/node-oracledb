/* Copyright (c) 2026, Oracle and/or its affiliates. */

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
 *   sqlAssert.js
 *
 * DESCRIPTION
 *   Tests the SQL helper methods implemented in Node.js to validate and
 *   enquote SQL strings and help mitigate SQL injection risks.
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('325. sqlAssert.js', function() {
  this.timeout(30000);
  let conn;
  const literalInjectionPayloads = [
    "x' OR '1'='1",
    "abc'); DROP TABLE t; --",
    "abc' UNION SELECT dummy FROM dual --",
    "abc'/*comment*/",
    '-- line comment',
    ';\nBEGIN NULL; END;',
    "'quoted'",
    "A'B'C"
  ];
  const quotedExoticNamePayloads = [
    'DUAL --',
    'DUAL/*x*/',
    'A OR 1=1',
    'A,B',
    'A B',
    'A;DROP',
    'A\nB'
  ];
  const qualifiedNameAttackPayloads = [
    '',
    '   ',
    'SCOTT.EMP --',
    'SCOTT.EMP/*x*/',
    'SCOTT.EMP UNION SELECT dummy FROM dual',
    'SCOTT..EMP',
    'SCOTT.',
    '.EMP',
    'A.   ',
    'A@',
    'A@   ',
    'A@B@C',
    '"A".B extra',
    'SCOTT."bad',
    'DUAL" WHERE 1=1 --',
    'A;BEGIN NULL;END;'
  ];

  const expectSuccess = (cases, fn) => {
    cases.forEach((testCase) => {
      assert.strictEqual(fn(testCase), testCase.expected);
    });
  };

  const expectFailure = (cases, fn, errRegex = /NJS-183:/) => {
    cases.forEach((testCase) => {
      assert.throws(() => fn(testCase), errRegex);
    });
  };

  before(async () => {
    conn = await oracledb.getConnection(dbConfig);
  });

  after(async () => {
    await conn.close();
  });

  it('325.1 enquotes literals', function() {
    const successCases = [
      {input: 'test_2300', expected: "'test_2300'"},
      {input: "a'b'c'd", expected: "'a''b''c''d'"},
      {input: "'abc'", expected: "'''abc'''"},
      {input: '', expected: "''"},
      {input: '   ', expected: "'   '"},
      {input: 'String with\u0000null', expected: "'String with\u0000null'"},
      {input: 'A\u0001B', expected: "'A\u0001B'"},
      {input: '\r', expected: "'\r'"},
      {input: '\t \n\r', expected: "'\t \n\r'"},
      {input: '𝒜𝒷𝒸', expected: "'𝒜𝒷𝒸'"},
      {input: '\tnewline\n', expected: "'\tnewline\n'"}
    ];
    const invalidTypeCases = [null, undefined, 123, true, {}, []];

    expectSuccess(successCases, (testCase) => oracledb.enquoteLiteral(testCase.input));
    const longLiteral = 'a'.repeat(10000);
    assert.strictEqual(oracledb.enquoteLiteral(longLiteral), `'${longLiteral}'`);
    const onlyQuotes = "''''";
    const doubledQuotes = "''".repeat(4);
    assert.strictEqual(oracledb.enquoteLiteral(onlyQuotes), `'${doubledQuotes}'`);
    const escapeLike = "\\'\\''";
    assert.strictEqual(oracledb.enquoteLiteral(escapeLike), `'${escapeLike.replace(/'/g, "''")}'`);
    const injectionPayload = "'; DROP TABLE users; --";
    const quotedPayload = oracledb.enquoteLiteral(injectionPayload);
    assert.ok(quotedPayload.includes("''; DROP TABLE users; --"));
    assert.throws(() => oracledb.enquoteLiteral(), /NJS-009:/);
    assert.throws(() => oracledb.enquoteLiteral('a', 'b'), /NJS-009:/);
    invalidTypeCases.forEach((value) => assert.throws(
      () => oracledb.enquoteLiteral(value),
      /NJS-005:/
    ));
  });

  it('325.2 enquotes names', function() {
    const successCases = [
      {input: 'test_2301a', capitalize: false, expected: '"test_2301a"'},
      {input: 'test_2301b', capitalize: true, expected: '"TEST_2301B"'},
      {input: '', capitalize: false, expected: '""'},
      {input: '', capitalize: true, expected: '""'},
      {input: '   ', capitalize: false, expected: '"   "'},
      {input: '   ', capitalize: true, expected: '"   "'},
      {input: '   abc ', capitalize: true, expected: '"   ABC "'},
      {input: '   abc ', capitalize: false, expected: '"   abc "'},
      {input: 'My User', capitalize: false, expected: '"My User"'},
      {input: 'My User', capitalize: true, expected: '"MY USER"'},
      {input: "O'Brian", capitalize: false, expected: "\"O'Brian\""},
      {input: "O'Brian", capitalize: true, expected: "\"O'BRIAN\""},
      {input: 'Lik--Wong', capitalize: false, expected: '"Lik--Wong"'},
      {input: 'Lik--Wong', capitalize: true, expected: '"LIK--WONG"'},
      {input: "Scott's View", capitalize: false, expected: "\"Scott's View\""},
      {input: "Scott's View", capitalize: true, expected: "\"SCOTT'S VIEW\""},
      {input: 'SCOTT.EMP', capitalize: false, expected: '"SCOTT.EMP"'},
      {input: 'E.Wang', capitalize: false, expected: '"E.Wang"'},
      {input: 'E.Wang', capitalize: true, expected: '"E.WANG"'},
      {input: 'A@B', capitalize: false, expected: '"A@B"'},
      {input: 'éclair', capitalize: false, expected: '"éclair"'},
      {input: 'éclair', capitalize: true, expected: `"${'éclair'.toUpperCase()}"`},
      {input: 'Δelta name', capitalize: false, expected: '"Δelta name"'},
      {input: 'Δelta name', capitalize: true, expected: `"${'Δelta name'.toUpperCase()}"`},
      {input: "ab\u0000cd", capitalize: false, expected: "\"ab\u0000cd\""},
      {input: "ab\u0000cd", capitalize: true, expected: "\"AB\u0000CD\""},
      {input: '\tabc\n', capitalize: false, expected: '"\tabc\n"'},
      {input: 'line1\nline2', capitalize: false, expected: '"line1\nline2"'},
      {input: 'line1\nline2', capitalize: true, expected: '"LINE1\nLINE2"'},
      {input: 'line1\rline2', capitalize: false, expected: '"line1\rline2"'},
      {input: 'line1\rline2', capitalize: true, expected: '"LINE1\rLINE2"'},
      {input: 'A\u0001B', capitalize: false, expected: '"A\u0001B"'},
      {input: 'A\u0001B', capitalize: true, expected: '"A\u0001B"'},
      {input: 'emp name', capitalize: false, expected: '"emp name"'},
      {input: 'emp;drop', capitalize: false, expected: '"emp;drop"'},
      {input: '_$#', capitalize: true, expected: '"_$#"'},
      {input: 'Δ$#_é', capitalize: true, expected: `"${'Δ$#_é'.toUpperCase()}"`}
    ];
    const failureCases = [
      {input: 'test_"2301c', capitalize: true},
      {input: '"MiXeD"', capitalize: false},
      {input: '"My User"', capitalize: false},
      {input: '"O\'Brian"', capitalize: true},
      {input: '""', capitalize: false},
      {input: '"bad', capitalize: false},
      {input: 'abc"xyz', capitalize: false}
    ];
    const invalidTypeCases = [null, undefined, 123, true, {}, []];
    const invalidCapitalizeCases = [null, 0, 1, 'true', {}, []];

    expectSuccess(successCases,
      (testCase) => oracledb.enquoteName(testCase.input, testCase.capitalize));
    assert.strictEqual(oracledb.enquoteName('default_case'), '"DEFAULT_CASE"');
    assert.strictEqual(oracledb.enquoteName('éclair'),
      `"${'éclair'.toUpperCase()}"`);
    assert.strictEqual(oracledb.enquoteName('default_case', undefined), '"DEFAULT_CASE"');
    assert.throws(() => oracledb.enquoteName(), /NJS-009:/);
    assert.throws(() => oracledb.enquoteName('a', true, 'b'), /NJS-009:/);
    expectFailure(failureCases,
      (testCase) => oracledb.enquoteName(testCase.input, testCase.capitalize));
    invalidTypeCases.forEach((value) => assert.throws(
      () => oracledb.enquoteName(value, true),
      /NJS-005:/
    ));
    invalidCapitalizeCases.forEach((value) => assert.throws(
      () => oracledb.enquoteName('valid_name', value),
      /NJS-005:/
    ));
  });

  it('325.3 validates simple SQL names', function() {
    const validNames = [
      'a',
      'Z',
      'test_2303#$',
      'a1',
      'a_b$c#1',
      '   test_2303    ',
      '"test_2303"',
      '  "test_2303"    ',
      '"My User"',
      '" "',
      '"a b c"',
      '"a\tb"',
      '"a\nb"',
      '"a\rb"',
      '"a\u0001b"',
      'a\u0301',
      'NJS_A\u0301',
      '𐐀name',
      '𐐀\u0301name',
      'éclair',
      'Δelta'
    ];
    const invalidNames = [
      '',
      '    ',
      '\n\t   ',
      '""',
      '   ""   ',
      '"test_2303',
      'test_2303.',
      '"test_2303" after"',
      '"a\nb" extra',
      'test_2303 embedded spaces',
      '"test_2303" extraneous',
      '_',
      '$',
      '#',
      '_abc',
      '$abc',
      '#abc',
      '1a',
      '12345',
      '"abc""de"',
      "\"ab\u0000cd\"",
      'ͅname',
      'a\u200B',
      'column\tname',
      'column\nname',
      'column\u200Cname',
      'column\u200Dname',
      'a²'
    ];

    validNames.forEach((name) => assert.strictEqual(oracledb.isSimpleSqlName(name), true));
    invalidNames.forEach((name) => assert.strictEqual(oracledb.isSimpleSqlName(name), false));
    assert.throws(() => oracledb.isSimpleSqlName(null), /NJS-005:/);
    [undefined, 123, true, {}, []].forEach((value) => assert.throws(
      () => oracledb.isSimpleSqlName(value),
      /NJS-005:/
    ));
    assert.throws(() => oracledb.isSimpleSqlName(), /NJS-009:/);
    assert.throws(() => oracledb.isSimpleSqlName('a', 'b'), /NJS-009:/);
  });

  it('325.4 validates qualified SQL names', function() {
    const validNames = [
      'test_2302',
      'test_2302.subvalue',
      'test_2302.subvalue.tertiary',
      'a.b.c.d.e.f',
      '    test_2302   ',
      'a .b',
      'a. b',
      'a . b',
      '    test_2302  .  subvalue  ',
      '    "test_2302"  .  subvalue  ',
      '    "test_2302"  .  "subvalue"  ',
      'NJS_A\u0301.subvalue',
      'test_2302.a\u0301',
      '𐐀name.subvalue',
      'owner.𐐀name',
      'test2302@dblink',
      'test2302   @   dblink',
      'test2302@"dblink"',
      'A@B.C',
      'a@b.c.d.e',
      'a.b@c.d.e.f',
      '"A@B".C',
      '"A.B".C',
      '"a\nb".c',
      '"a\u0001b".c',
      'SCOTT.EMP@SALES.US.EXAMPLE.COM',
      'SCOTT.EMP   @   SALES.US.EXAMPLE.COM',
      '\nschema.table',
      'schema.table\n',
      'schema.table\t@dblink',
      'schema.table@db_link$',
      'schema.table@db_link#',
      '"My Table"@A.B',
      'éclair.Δelta.表',
      'éclair.Δelta',
      '"My Table".subvalue'
    ];
    const invalidNames = [
      '',
      '   ',
      '\n\t  ',
      '    "test_2302"  .  "subvalue"  extraneous ',
      '    "test_2302"  -  "subvalue"  ',
      'test2302   @   1notalink',
      '@MYLINK',
      'a.   ',
      'a@   ',
      'SCOTT.',
      'SCOTT..EMP',
      '.SCOTT',
      'A@B@C',
      'A@B.',
      'A@.B',
      'A@B..C',
      '"abc""de".value',
      'schema.table@db!link',
      'ͅname.value',
      'owner.ͅname',
      'owner.a²',
      '"'.repeat(10000)
    ];

    validNames.forEach((name) => assert.strictEqual(oracledb.isQualifiedSqlName(name), true));
    invalidNames.forEach((name) => assert.strictEqual(oracledb.isQualifiedSqlName(name), false));
    assert.throws(() => oracledb.isQualifiedSqlName(null), /NJS-005:/);
    [undefined, 123, true, {}, []].forEach((value) => assert.throws(
      () => oracledb.isQualifiedSqlName(value),
      /NJS-005:/
    ));
    assert.throws(() => oracledb.isQualifiedSqlName(), /NJS-009:/);
    assert.throws(() => oracledb.isQualifiedSqlName('a', 'b'), /NJS-009:/);
  });

  describe('325.5 Injection-focused helper tests', function() {

    it('325.5.1 safely encloses literal attack payloads', function() {
      literalInjectionPayloads.forEach((payload) => {
        assert.strictEqual(oracledb.enquoteLiteral(payload), `'${payload.replace(/'/g, "''")}'`);
      });
    });

    it('325.5.2 rejects simple-name attack payloads', function() {
      ['"A" extra', '"abc""de"'].forEach((payload) => {
        assert.strictEqual(oracledb.isSimpleSqlName(payload), false);
        assert.throws(
          () => oracledb.enquoteName(payload, false),
          /NJS-183: invalid SQL name: embedded double quotes are not allowed/
        );
      });
    });

    it('325.5.3 quotes raw exotic single identifiers safely', function() {
      quotedExoticNamePayloads.forEach((name) => {
        assert.strictEqual(oracledb.enquoteName(name, false), `"${name}"`);
        assert.strictEqual(oracledb.enquoteName(name, true), `"${name.toUpperCase()}"`);
      });
    });

    it('325.5.4 rejects qualified-name attack payloads', function() {
      qualifiedNameAttackPayloads.forEach((payload) => {
        assert.strictEqual(oracledb.isQualifiedSqlName(payload), false);
      });
    });
  });

  describe('325.6 Functional integration tests', function() {
    const tablePrefix = 'njs_sql_assert_fn_';

    it('325.6.1 safe dynamic SQL', async () => {
      const rawTableName = `${tablePrefix}${Date.now()}`;
      assert.strictEqual(oracledb.isSimpleSqlName(rawTableName), true);
      const quotedTable = oracledb.enquoteName(rawTableName, true);
      const idColumn = oracledb.enquoteName('id', true);
      const valueColumn = oracledb.enquoteName('val', true);

      try {
        const createSql = `CREATE TABLE ${quotedTable} (${idColumn} number, ${valueColumn} varchar2(60))`;
        await conn.execute(testsUtil.sqlCreateTable(quotedTable, createSql));

        const literalValue = oracledb.enquoteLiteral("node'oracledb");
        await conn.execute(`insert into ${quotedTable} (${idColumn}, ${valueColumn}) values (1, ${literalValue})`);
        await conn.commit();

        const result = await conn.execute(`select ${valueColumn} from ${quotedTable} where ${idColumn} = 1`);
        assert.deepStrictEqual(result.rows, [["node'oracledb"]]);
      } finally {
        await conn.execute(testsUtil.sqlDropTable(quotedTable));
      }
    });

    it('325.6.2 safe dynamic SQL with raw exotic identifier', async () => {
      const cases = [
        { rawTableName: `njs exotic lower ${Date.now()}`, capitalize: false },
        { rawTableName: `njs exotic mixed ${Date.now()}`, capitalize: true }
      ];
      const idColumn = oracledb.enquoteName('id', true);
      const valueColumn = oracledb.enquoteName('val', true);

      for (const testCase of cases) {
        const quotedTable = oracledb.enquoteName(testCase.rawTableName,
          testCase.capitalize);
        try {
          const createSql = `CREATE TABLE ${quotedTable} (${idColumn} number, ${valueColumn} varchar2(60))`;
          await conn.execute(testsUtil.sqlCreateTable(quotedTable, createSql));

          const literalValue = oracledb.enquoteLiteral("node'oracledb");
          await conn.execute(`insert into ${quotedTable} (${idColumn}, ${valueColumn}) values (1, ${literalValue})`);
          await conn.commit();

          const result = await conn.execute(`select ${valueColumn} from ${quotedTable} where ${idColumn} = 1`);
          assert.deepStrictEqual(result.rows, [["node'oracledb"]]);
        } finally {
          await conn.execute(testsUtil.sqlDropTable(quotedTable));
        }
      }
    });

    it('325.6.3 stores literal attack payloads as data', async () => {
      const rawTableName = `${tablePrefix}${Date.now()}_lit`;
      const quotedTable = oracledb.enquoteName(rawTableName, true);
      const idColumn = oracledb.enquoteName('id', true);
      const valueColumn = oracledb.enquoteName('val', true);

      try {
        const createSql = `CREATE TABLE ${quotedTable} (${idColumn} number, ${valueColumn} varchar2(200))`;
        await conn.execute(testsUtil.sqlCreateTable(quotedTable, createSql));

        for (const [index, payload] of literalInjectionPayloads.entries()) {
          const literalValue = oracledb.enquoteLiteral(payload);
          await conn.execute(`insert into ${quotedTable} (${idColumn}, ${valueColumn}) values (${index + 1}, ${literalValue})`);
        }
        await conn.commit();

        const result = await conn.execute(
          `select ${valueColumn} from ${quotedTable} order by ${idColumn}`
        );
        assert.deepStrictEqual(result.rows.map((row) => row[0]), literalInjectionPayloads);
      } finally {
        await conn.execute(testsUtil.sqlDropTable(quotedTable));
      }
    });

    it('325.6.4 blocks identifier injection attempts', async () => {
      const executedTables = [];
      const selectDummy = async (input) => {
        if (!oracledb.isQualifiedSqlName(input))
          return false;
        executedTables.push(input);
        const result = await conn.execute(`select dummy from ${input}`);
        return result.rows[0][0];
      };

      const dummyValue = await selectDummy('DUAL');
      assert.strictEqual(dummyValue, 'X');

      for (const payload of qualifiedNameAttackPayloads)
        assert.strictEqual(await selectDummy(payload), false);
      assert.deepStrictEqual(executedTables, ['DUAL']);
    });
  });

  describe('325.7 DBMS_ASSERT comparisons', function() {

    it('325.7.1 qualified_sql_name dotted dblink', async () => {
      const input = 'SCOTT.EMP@SALES.US.EXAMPLE.COM';
      const result = await conn.execute(
        `BEGIN
           :output := dbms_assert.qualified_sql_name(:input);
         END;`,
        {
          input,
          output: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
        }
      );
      assert.strictEqual(result.outBinds.output, input);
      assert.strictEqual(oracledb.isQualifiedSqlName(input), true);
    });

    it('325.7.2 simple_sql_name rejects superscript digits', async () => {
      const input = 'A\u00B2';
      await assert.rejects(
        () => conn.execute(
          `BEGIN
             :output := dbms_assert.simple_sql_name(:input);
           END;`,
          {
            input,
            output: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
          }
        ),
        /ORA-44003:/
      );
      assert.strictEqual(oracledb.isSimpleSqlName(input), false);
    });

    it('325.7.3 simple_sql_name accepts combining marks', async function() {
      const charset = await testsUtil.getDBCharSet(conn);
      if (charset !== 'AL32UTF8') {
        // DBMS_ASSERT.SIMPLE_SQL_NAME() can behave differently for combining
        // marks on older database character sets.
        this.skip();
      }

      const rawName = `NJS_DECOMPOSED_${Date.now()}a\u0301`;
      const simpleResult = await conn.execute(
        `BEGIN
           :output := dbms_assert.simple_sql_name(:input);
         END;`,
        {
          input: rawName,
          output: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
        }
      );
      assert.strictEqual(simpleResult.outBinds.output, rawName);
      assert.strictEqual(oracledb.isSimpleSqlName(rawName), true);

      const idColumn = oracledb.enquoteName('id', true);
      try {
        const createSql = `CREATE TABLE ${rawName} (${idColumn} NUMBER)`;
        await conn.execute(testsUtil.sqlCreateTable(rawName, createSql));
        await conn.execute(`INSERT INTO ${rawName} (${idColumn}) VALUES (42)`);
        const rows = await conn.execute(`SELECT ${idColumn} FROM ${rawName}`);
        assert.deepStrictEqual(rows.rows, [[42]]);
      } finally {
        await conn.execute(testsUtil.sqlDropTable(rawName));
      }
    });

    it('325.7.4 enquote_name uppercase behavior differs from Oracle NLS behavior', async () => {
      const rawIdentifier = 'ß';
      const dbmsResult = await conn.execute(
        `BEGIN
           :output := dbms_assert.enquote_name(:input, TRUE);
         END;`,
        {
          input: rawIdentifier,
          output: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
        }
      );
      const dbmsQuoted = dbmsResult.outBinds.output;
      assert.strictEqual(dbmsQuoted, '"ß"');

      const idColumn = oracledb.enquoteName('id', true);
      const helperQuoted = oracledb.enquoteName(rawIdentifier, true);
      assert.strictEqual(helperQuoted, '"SS"');

      try {
        await conn.execute(testsUtil.sqlCreateTable(
          dbmsQuoted,
          `CREATE TABLE ${dbmsQuoted} (${idColumn} NUMBER)`
        ));
        await conn.execute(`INSERT INTO ${dbmsQuoted} (${idColumn}) VALUES (1)`);
        const rows = await conn.execute(`SELECT ${idColumn} FROM ${dbmsQuoted}`);
        assert.deepStrictEqual(rows.rows, [[1]]);
        await assert.rejects(
          () => conn.execute(`SELECT ${idColumn} FROM ${helperQuoted}`),
          /ORA-00942:/
        );
      } finally {
        await conn.execute(testsUtil.sqlDropTable(dbmsQuoted));
      }

      assert.notStrictEqual(helperQuoted, dbmsQuoted);
    });
  });

});

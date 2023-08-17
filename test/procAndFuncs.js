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
 *   268. procAndFuncs.js
 *
 * DESCRIPTION:
 * Tests for stored procedures and functions
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('268. tests for calling stored procedures and functions', function() {
  describe('268.1 calling stored procedures', function() {
    let connection = null;

    const script = `CREATE OR REPLACE PROCEDURE proc_Test (a_InValue IN VARCHAR2, a_InOutValue IN OUT NUMBER, a_OutValue OUT NUMBER) AS \n` +
                   `BEGIN \n` +
                   `a_InOutValue := a_InOutValue * length(a_InValue); \n` +
                   `a_OutValue := length(a_InValue); \n` +
                   `END;`;

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute(script);
    });

    after(async function() {
      await connection.execute(`DROP PROCEDURE proc_Test`);
      await connection.close();
    });

    it('268.1.1 executing a stored procedure', async function() {
      const outValue = { type: oracledb.NUMBER, dir: oracledb.BIND_OUT };
      const result = await connection.execute(
        `BEGIN proc_Test(:a_InValue, :a_InOutValue, :a_OutValue); END;`,
        {
          a_InValue: "hi",
          a_InOutValue: 5,
          a_OutValue: outValue
        },
        { outFormat: oracledb.OBJECT }
      );
      assert.deepStrictEqual(result.outBinds, { a_OutValue: 2 });
    });

    it('268.1.2 executing a stored procedure with all args keyword args', async function() {
      const inout_value = {
        dir: oracledb.BIND_INOUT,
        type: oracledb.NUMBER,
        val: 5
      };
      const out_value = {
        dir: oracledb.BIND_OUT,
        type: oracledb.NUMBER
      };
      const results = await connection.execute(
        `BEGIN proc_Test(:a_InValue, :a_InOutValue, :a_OutValue); END;`,
        {
          a_InValue: 'hi',
          a_InOutValue: inout_value,
          a_OutValue: out_value
        }
      );
      assert(results.outBinds.a_InOutValue, 10);
      assert(results.outBinds.a_OutValue, 2.0);
    });

    it('268.1.3 executing a stored procedure with last arg as keyword arg', async function() {

      const outValue = { type: oracledb.NUMBER, dir: oracledb.BIND_OUT };
      const result = await connection.execute(`BEGIN proc_Test(:a_InValue, :a_InOutValue, :a_OutValue); END;`,
        { a_InValue: "hi", a_InOutValue: 5, a_OutValue: outValue });

      assert.strictEqual(result.outBinds.a_OutValue, 2.0);
    });
  });

  describe('268.2 calling stored procedures no args', function() {
    let connection = null;

    const script = `CREATE OR REPLACE PROCEDURE proc_TestNoArgs AS \n` +
                   `BEGIN \n` +
                   `null; \n` +
                   `END;`;

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute(script);
    });

    after(async function() {
      await connection.execute(`DROP PROCEDURE proc_TestNoArgs`);
      await connection.close();
    });
    it('268.2.1 executing a stored procedure with last arg as keyword arg', async function() {
      const result = await connection.execute(
        `BEGIN proc_TestNoArgs; END;`,
        [],
        { outFormat: oracledb.OBJECT }
      );
      assert.deepStrictEqual(result, {});
    });
  });

  describe('268.3 calling functions', function() {
    let connection = null;
    const script = `CREATE OR REPLACE FUNCTION function_Test(a_String VARCHAR2, a_ExtraAmount NUMBER) return number AS \n` +
                   `BEGIN \n` +
                   `return length(a_String) + a_ExtraAmount; \n` +
                   `END;`;

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute(script);
    });

    after(async function() {
      await connection.execute(`DROP FUNCTION function_Test`);
      await connection.close();
    });

    it('268.3.1 executing a stored function', async function() {

      const result = await connection.execute(`SELECT function_Test('hi', 5) as result FROM DUAL`, [], { outFormat: oracledb.OBJECT });
      assert.deepStrictEqual(result.rows[0], {"RESULT":7});
    });

    it('268.3.2 executing a stored function with extra args', async function() {
      await assert.rejects(
        async () => {
          await connection.execute(`SELECT function_Test('hi', 5, 7) as result FROM DUAL`, [], { outFormat: oracledb.OBJECT }),
          /ORA-06553:/; //Error: ORA-06553: PLS-306: wrong number or types of arguments in call to 'FUNCTION_TEST'
        });
    });

    it('268.3.3 executing a stored function with wrong function name', async function() {
      await assert.rejects(
        async () => {
          await connection.execute(`SELECT fun_Test('hi', 5) as result FROM DUAL`, [], { outFormat: oracledb.OBJECT }),
          /ORA-12545:/; //ORA-12545: Connect failed because target host or object does not exist
        });
    });

    it('268.3.4 executing a stored function with wrong args', async function() {
      await assert.rejects(
        async () => {
          await connection.execute(`SELECT function_Test(5, 'Hi') as result FROM DUAL`, [], { outFormat: oracledb.OBJECT }),
          /ORA-12545:/; //ORA-12545: Connect failed because target host or object does not exist
        });
    });

    it('268.3.5 executing a stored function with no args', async function() {
      await assert.rejects(
        async () => {
          await connection.execute(`SELECT function_Test as result FROM DUAL`, [], { outFormat: oracledb.OBJECT }),
          /ORA-12545:/; //ORA-12545: Connect failed because target host or object does not exist
        });
    });

    it('268.3.6 executing a stored function with only one args', async function() {
      await assert.rejects(
        async () => {
          await connection.execute(`SELECT function_Test('Hi') as result FROM DUAL`, [], { outFormat: oracledb.OBJECT }),
          /ORA-12545:/; //ORA-12545: Connect failed because target host or object does not exist
        });
    });
  });

  describe('268.4 calling functions without any arguments', function() {
    let connection = null;
    const script = `CREATE OR REPLACE FUNCTION function_TestNoArgs return number AS \n` +
                   `BEGIN \n` +
                   `return 123; \n` +
                   `END;`;

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute(script);
    });

    after(async function() {
      await connection.execute(`DROP FUNCTION function_TestNoArgs`);
      await connection.close();
    });

    it('268.4.1 executing a stored function without any arguments', async function() {

      const result = await connection.execute(`SELECT function_TestNoArgs() as result FROM DUAL`, [], { outFormat: oracledb.OBJECT });
      assert.deepStrictEqual(result.rows[0], {"RESULT": 123});
    });
  });
});

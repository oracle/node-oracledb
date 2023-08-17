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
 * Licensed under the Apache License, Version 2.0 (the `License`);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an `AS IS` BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   280. pipelinedTables.js
 *
 * DESCRIPTION
 *   Testing Pipelined Table Functions
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('280. pipelinedTables.js', function() {
  let connection = null;

  before('Get connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('Release connection', async function() {
    await connection.close();
  });

  it('280.1 Creating and Invoking Pipelined Table Function', async function() {
    await connection.execute(`CREATE OR REPLACE PACKAGE pkg1 AUTHID DEFINER AS
          TYPE numset_t IS TABLE OF NUMBER;
          FUNCTION f1(x NUMBER) RETURN numset_t PIPELINED;
        END pkg1;`);

    await connection.execute(`CREATE OR REPLACE PACKAGE BODY pkg1 AS
          FUNCTION f1(x NUMBER) RETURN numset_t PIPELINED IS
          BEGIN
            FOR i IN 1..x LOOP
              PIPE ROW(i);
            END LOOP;
            RETURN;
          END f1;
        END pkg1;`);

    let result = await connection.execute(`SELECT * FROM TABLE (pkg1.f1(5))`);
    assert.deepEqual(result.rows, [[1], [2], [3], [4], [5]]);

    result = await connection.execute(`SELECT * FROM TABLE (pkg1.f1(2))`);
    assert.deepEqual(result.rows, [[1], [2]]);
  });

  it('280.2 Invoking Pipelined Table Function with invalid syntax', async function() {
    await connection.execute(`CREATE OR REPLACE PACKAGE pkg1 AUTHID DEFINER AS
          TYPE numset_t IS TABLE OF NUMBER;
          FUNCTION f1(x NUMBER) RETURN numset_t PIPELINED;
        END pkg1;
        /`);

    await connection.execute(`CREATE OR REPLACE PACKAGE BODY pkg1 AS
          FUNCTION f1(x NUMBER) RETURN numset_t PIPELINED IS
          BEGIN
            FOR i IN 1..x LOOP
              PIPE ROW(j);
            END LOOP;
            RETURN;
          END f1;
        END pkg1;
        `);

    await assert.rejects(
      async () => await connection.execute(`SELECT * FROM TABLE (pkg1.f1(5))`),
      /ORA-06575:/ //ORA-06575: Package or function PKG1 is in an invalid state
    );
  });

  it('280.3 Invoking normal Table followed by Pipelined table', async function() {
    // create a schema-level nested table type of strings
    await connection.execute(`CREATE OR REPLACE TYPE strings_t IS TABLE OF VARCHAR2 (100)`);

    // compile a table function that returns a nested table of that type with a single string inside it
    await connection.execute(`CREATE OR REPLACE FUNCTION strings
               RETURN strings_t
               AUTHID DEFINER
            IS
               l_strings strings_t := strings_t ('abc');
            BEGIN
               RETURN l_strings;
            END;`);

    // call the table function
    let result = await connection.execute(`SELECT COLUMN_VALUE my_string FROM TABLE (strings ())`);
    assert.deepEqual(result.rows, [['abc']]);

    // create a pipelined version of that same table function
    await connection.execute(`CREATE OR REPLACE FUNCTION strings_pl
                   RETURN strings_t
                   PIPELINED
                   AUTHID DEFINER
                IS
                BEGIN
                   PIPE ROW ('abc');
                   RETURN;
                END;`);

    result = await connection.execute(`SELECT COLUMN_VALUE my_string FROM TABLE (strings ())`);
    assert.strictEqual(result.rows[0][0], 'abc');
  });

  it('280.4 Pipelined Table Functions with types', async function() {
    // Create the types to support the Pipelined table function
    await connection.execute(`CREATE TYPE ptf_row AS OBJECT (
          id           NUMBER,
          description  VARCHAR2(50)
        )`);

    await connection.execute(`CREATE TYPE ptf_tab IS TABLE OF ptf_row`);

    // Build a pipelined table function
    await connection.execute(`CREATE OR REPLACE FUNCTION get_tab_ptf (p_rows IN NUMBER) RETURN ptf_tab PIPELINED AS
        BEGIN
          FOR i IN 1 .. p_rows LOOP
            PIPE ROW(ptf_row(i, 'Description for ' || i));
          END LOOP;
          RETURN;
        END;`);

    const result = await connection.execute(`SELECT *
        FROM   TABLE(get_tab_ptf(10))
        ORDER BY id DESC`);

    assert.deepEqual(result.rows, [[10, "Description for 10"],
      [9, "Description for 9"],
      [8, "Description for 8"],
      [7, "Description for 7"],
      [6, "Description for 6"],
      [5, "Description for 5"],
      [4, "Description for 4"],
      [3, "Description for 3"],
      [2, "Description for 2"],
      [1, "Description for 1"]]);

    await connection.execute(`DROP FUNCTION get_tab_ptf`);
    await connection.execute(`DROP TYPE ptf_tab`);
    await connection.execute(`DROP TYPE ptf_row`);
  });

  it('280.5 Parallel Enabled Pipelined Table Functions', async function() {
    await connection.execute(`CREATE TABLE parallel_test (
              id           NUMBER(10),
              country_code VARCHAR2(5),
              description  VARCHAR2(50)
            )`);

    await connection.execute(`INSERT /*+ APPEND */ INTO parallel_test
        SELECT level AS id,
               (CASE TRUNC(MOD(level, 4))
                 WHEN 1 THEN 'IN'
                 WHEN 2 THEN 'UK'
                 ELSE 'US'
                END) AS country_code,
               'Description or ' || level AS description
        FROM dual
        CONNECT BY level <= 100000`);

    await connection.commit();
    const result = await connection.execute(`SELECT country_code, count(*) FROM parallel_test GROUP BY country_code ORDER BY country_code ASC`);
    assert.deepEqual(result.rows, [["IN", 25000], ["UK", 25000], ["US", 50000]]);
    await connection.execute(`drop table parallel_test PURGE`);
  });
});

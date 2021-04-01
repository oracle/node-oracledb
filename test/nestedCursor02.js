/* Copyright (c) 2020, 2021, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   233. nestedCursor02.js
 *
 * DESCRIPTION
 *   Nested Cursor.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');

describe('233. nestedCursor02.js', () => {

  it('233.1 example-nested-cursor.js', async () => {
    const simpleSql = `
      select
        'String Val',
        cursor(
          select 1, 'Nested Row 1' from dual
          union all
          select 2, 'Nested Row 2' from dual
          union all
          select 3, 'Nested Row 3' from dual
        ) as nc
      from dual`;

    const complexSql = `
      select
        'Level 1 String',
        cursor(
          select
            'Level 2 String',
            cursor(
              select
                'Level 3 String',
                cursor(
                  select 1, 'Level 4 String A' from dual
                  union all
                  select 2, 'Level 4 String B' from dual
                  union all
                  select 3, 'Level 4 String C' from dual
                ) as nc3
              from dual
            ) as nc2
          from dual
        ) as nc1
      from dual`;

    async function traverse_results(resultSet) {
      const fetchedRows = [];
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const row = await resultSet.getRow();
          if (!row) {
            await resultSet.close();
            break;
          }
          for (const i in row) {
            if (row[i] instanceof oracledb.ResultSet) {
              row[i] = await traverse_results(row[i]);
            }
          }
          fetchedRows.push(row);
        }
        return fetchedRows;
      } catch (err) {
        should.not.exist(err);
      }

    } // traverse_results()

    try {
      let conn = await oracledb.getConnection(dbconfig);

      const rowsSimple = [
        [ 1, 'Nested Row 1' ], [ 2, 'Nested Row 2' ], [ 3, 'Nested Row 3' ]
      ];

      const rowsComplex = [
        [ 1, 'Level 4 String A' ],
        [ 2, 'Level 4 String B' ],
        [ 3, 'Level 4 String C' ]
      ];

      // (1) Simple SQL, no result set
      const result1 = await conn.execute(simpleSql);
      const rows1 = result1.rows;
      should.strictEqual(rows1[0][0], 'String Val');
      should.deepEqual(rows1[0][1], rowsSimple);

      should.strictEqual(result1.metaData[0].name, "'STRINGVAL'");
      should.strictEqual(result1.metaData[1].name, 'NC');
      should.strictEqual(result1.metaData[1].metaData[0].name, '1');
      should.strictEqual(result1.metaData[1].metaData[1].name, "'NESTEDROW1'");

      // (2) Simple SQL, result set
      const result2 = await conn.execute(simpleSql, [], { resultSet: true });
      const rows2 = await traverse_results(result2.resultSet);
      should.strictEqual(rows2[0][0], 'String Val');
      should.deepEqual(rows2[0][1], rowsSimple);

      should.strictEqual(result1.metaData[0].name, "'STRINGVAL'");
      should.strictEqual(result1.metaData[1].name, 'NC');

      // (3) Complex SQL, no result set
      const result3 = await conn.execute(complexSql);
      const rows3 = result3.rows;
      should.strictEqual(rows3[0][0], 'Level 1 String');
      should.strictEqual(rows3[0][1][0][0], 'Level 2 String');
      should.strictEqual(rows3[0][1][0][1][0][0], 'Level 3 String');
      should.deepEqual(rows3[0][1][0][1][0][1], rowsComplex);

      should.strictEqual(result3.metaData[0].name, "'LEVEL1STRING'");
      should.strictEqual(result3.metaData[1].name, 'NC1');

      should.strictEqual(result3.metaData[1].metaData[0].name, "'LEVEL2STRING'");
      should.strictEqual(result3.metaData[1].metaData[1].name, 'NC2');

      should.strictEqual(result3.metaData[1].metaData[1].metaData[0].name, "'LEVEL3STRING'");
      should.strictEqual(result3.metaData[1].metaData[1].metaData[1].name, 'NC3');

      should.strictEqual(result3.metaData[1].metaData[1].metaData[1].metaData[0].name, '1');
      should.strictEqual(result3.metaData[1].metaData[1].metaData[1].metaData[1].name, "'LEVEL4STRINGA'");

      // (4) Complex SQL, result set
      const result4 = await conn.execute(complexSql, [], { resultSet: true });
      const rows4 = await traverse_results(result4.resultSet);
      should.strictEqual(rows4[0][0], 'Level 1 String');
      should.strictEqual(rows4[0][1][0][0], 'Level 2 String');
      should.strictEqual(rows4[0][1][0][1][0][0], 'Level 3 String');
      should.deepEqual(rows4[0][1][0][1][0][1], rowsComplex);

      should.strictEqual(result4.metaData[0].name, "'LEVEL1STRING'");
      should.strictEqual(result4.metaData[1].name, 'NC1');

      await conn.close();
    } catch (err) {
      should.not.exist(err);
    }
  });
});

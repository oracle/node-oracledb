/* Copyright (c) 2025, Oracle and/or its affiliates. */

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
 *   311. dataTypeIntervalYM.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - IntervalYM (Year-to-Month).
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('311. dataTypeIntervalYM.js', function() {
  let connection;
  const rawData = [];
  const dataByKey = {};

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);

    // Create the table
    const sql = `CREATE TABLE TestIntervalYMs (
          IntCol NUMBER(10),
          IntervalCol INTERVAL YEAR TO MONTH,
          NullableCol INTERVAL YEAR TO MONTH,
          IntervalPrecisionCol INTERVAL YEAR(3) TO MONTH
          )`;
    await connection.execute(testsUtil.sqlCreateTable('TestIntervalYMs', sql));

    // Populate table and rawData
    await connection.execute(`BEGIN
      FOR i IN 1..10 LOOP
          INSERT INTO TestIntervalYMs
          VALUES (i, TO_YMINTERVAL(TO_CHAR(i - 5) || '-' || TO_CHAR(i)),
                  DECODE(MOD(i, 2), 0, NULL,
                  TO_YMINTERVAL(TO_CHAR(i + 5) || '-' || TO_CHAR(i + 2))),
                  TO_YMINTERVAL('3-8'));
      END LOOP;
    END;`);

    // Prepare raw data
    for (let i = 1; i <= 10; i++) {
      const interval = new oracledb.IntervalYM({ years: i - 5, months: (i - 5) < 0 ? -i : i });
      const nullableInterval = i % 2 === 0 ? null : new oracledb.IntervalYM({ years: i + 5, months: i + 2 });
      const precisionCol = new oracledb.IntervalYM({years: 3, months: 8});
      const row = [i, interval, nullableInterval, precisionCol];
      rawData.push(row);
      dataByKey[i] = row;
    }
  });

  after(async function() {
    await testsUtil.dropTable(connection, 'TestIntervalYMs');
    await connection.close();
  });

  it('311.1 binding in an interval', async function() {
    const bind = { value: { dir: oracledb.BIND_IN,
      type: oracledb.DB_TYPE_INTERVAL_YM,
      val: new oracledb.IntervalYM({ years: 1, months: 6 })
    } };
    const result = await connection.execute(
      `SELECT * FROM TestIntervalYMs WHERE IntervalCol = :value`,
      bind
    );
    assert.deepStrictEqual(result.rows, [rawData[5]]);
  }); // 311.1

  it('311.2 binding null', async function() {
    const result = await connection.execute(
      'SELECT * FROM TestIntervalYMs WHERE IntervalCol = :value',
      { value: null }
    );
    assert.deepStrictEqual(result.rows, []);
  }); // 311.2

  it('311.3 binding out with interval column', async function() {
    const result = await connection.execute(
      `BEGIN :value := TO_YMINTERVAL('-25-7'); END;`,
      { value: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_INTERVAL_YM } }
    );
    assert(result.outBinds.value instanceof oracledb.IntervalYM);
    assert.deepStrictEqual(result.outBinds.value, new oracledb.IntervalYM({ years: -25, months: -7 }));
  }); // 311.3

  it('311.4 binding in/out with interval column', async function() {
    const result = await connection.execute(
      `BEGIN :value := :value + TO_YMINTERVAL('3-8'); END;`,
      {
        value: {
          dir: oracledb.BIND_INOUT,
          type: oracledb.DB_TYPE_INTERVAL_YM,
          val: new oracledb.IntervalYM({ years: 8, months: 4 }),
        }
      }
    );
    assert(result.outBinds.value instanceof oracledb.IntervalYM);
    assert.deepStrictEqual(result.outBinds.value, new oracledb.IntervalYM({ years: 12, months: 0 }));
  }); // 311.4

  it('311.5 column metadata', async function() {
    const result = await connection.execute('SELECT * FROM TestIntervalYMs');
    const expected = [
      { name: 'INTCOL', type: oracledb.DB_TYPE_NUMBER },
      { name: 'INTERVALCOL', type: oracledb.DB_TYPE_INTERVAL_YM },
      { name: 'NULLABLECOL', type: oracledb.DB_TYPE_INTERVAL_YM },
      { name: 'INTERVALPRECISIONCOL', type: oracledb.DB_TYPE_INTERVAL_YM },
    ];
    assert.deepStrictEqual(
      result.metaData.map(col => ({ name: col.name, type: col.dbType })),
      expected
    );
  }); // 311.5

  it('311.6 fetch all data', async function() {
    const result = await connection.execute('SELECT * FROM TestIntervalYMs ORDER BY IntCol');
    assert.deepStrictEqual(result.rows, rawData);
  }); // 311.6

  it('311.7 fetch data in chunks', async function() {
    const result = await connection.execute('SELECT * FROM TestIntervalYMs ORDER BY IntCol', [], { fetchArraySize: 3 });
    assert.deepStrictEqual(result.rows.slice(0, 3), rawData.slice(0, 3));
  }); // 311.7

  it('311.8 fetch single rows', async function() {
    const result = await connection.execute(
      'SELECT * FROM TestIntervalYMs WHERE IntCol IN (3, 4) ORDER BY IntCol'
    );
    assert.deepStrictEqual(result.rows[0], dataByKey[3]);
    assert.deepStrictEqual(result.rows[1], dataByKey[4]);
  }); // 311.8

  it('311.9 bind and fetch negative interval', async function() {
    const bind = { dir: oracledb.BIND_IN,
      type: oracledb.DB_TYPE_INTERVAL_YM,
      val: new oracledb.IntervalYM({ years: -12, months: -5 })
    };
    const result = await connection.execute('SELECT :1 FROM dual', [bind]);
    assert.deepStrictEqual(result.rows[0][0], bind.val);
  }); // 311.9

  it('311.10 bind and fetch max interval value', async function() {
    const maxInterval = new oracledb.IntervalYM({ years: 999, months: 11 });
    const result = await connection.execute(
      'SELECT :1 FROM dual',
      [
        {
          dir: oracledb.BIND_IN,
          type: oracledb.DB_TYPE_INTERVAL_YM,
          val: maxInterval,
        },
      ]
    );
    assert.deepStrictEqual(result.rows[0][0], maxInterval);
  }); // 311.10

  it('311.11 bind and fetch min interval value', async function() {
    const minInterval = new oracledb.IntervalYM({ years: -999, months: -11 });
    const result = await connection.execute(
      'SELECT :1 FROM dual',
      [
        {
          dir: oracledb.BIND_IN,
          type: oracledb.DB_TYPE_INTERVAL_YM,
          val: minInterval,
        },
      ]
    );
    assert.deepStrictEqual(result.rows[0][0], minInterval);
  }); // 311.11

  it('311.12 bind and fetch interval with zero values', async function() {
    const zeroInterval = new oracledb.IntervalYM();
    const result = await connection.execute(
      'SELECT :1 FROM dual',
      [
        {
          dir: oracledb.BIND_IN,
          type: oracledb.DB_TYPE_INTERVAL_YM,
          val: zeroInterval,
        },
      ]
    );
    assert.deepStrictEqual(result.rows[0][0], zeroInterval);
  }); // 311.12

  it('311.13 bind and fetch interval with negative months and positive years', async function() {
    const mixedInterval = new oracledb.IntervalYM({ years: 5, months: -3 });
    const result = await connection.execute(
      'SELECT :1 FROM dual',
      [
        {
          dir: oracledb.BIND_IN,
          type: oracledb.DB_TYPE_INTERVAL_YM,
          val: mixedInterval,
        },
      ]
    );
    assert.deepStrictEqual(result.rows[0][0], mixedInterval);
  }); // 311.13

  it('311.14 bind and fetch interval with large year value', async function() {
    const largeYearInterval = new oracledb.IntervalYM({ years: 1000, months: 5 });
    const result = await connection.execute(
      'SELECT :1 FROM dual',
      [
        {
          dir: oracledb.BIND_IN,
          type: oracledb.DB_TYPE_INTERVAL_YM,
          val: largeYearInterval,
        },
      ]
    );
    assert.deepStrictEqual(result.rows[0][0], largeYearInterval);
  }); // 311.14

  it('311.15 bind and fetch interval from a table', async function() {
    const tableInterval = new oracledb.IntervalYM({ years: 3, months: 7 });
    const createTableSQL = `CREATE TABLE IntervalTest (Col INTERVAL YEAR TO MONTH)`;

    await connection.execute(testsUtil.sqlCreateTable('IntervalTest', createTableSQL));
    await connection.execute(
      'INSERT INTO IntervalTest VALUES (:1)',
      [
        {
          dir: oracledb.BIND_IN,
          type: oracledb.DB_TYPE_INTERVAL_YM,
          val: tableInterval,
        },
      ]
    );

    const result = await connection.execute('SELECT * FROM IntervalTest');
    assert.deepStrictEqual(result.rows[0][0], tableInterval);

    await testsUtil.dropTable(connection, 'IntervalTest');
  }); // 311.15

  it('311.16 bind and fetch interval in WHERE clause', async function() {
    const whereInterval = new oracledb.IntervalYM({ years: 2, months: 3 });
    const createTableSQL = `CREATE TABLE IntervalWhereTest (ID NUMBER, Col INTERVAL YEAR TO MONTH)`;

    await connection.execute(testsUtil.sqlCreateTable('IntervalWhereTest', createTableSQL));
    await connection.execute(
      'INSERT INTO IntervalWhereTest VALUES (1, :1)',
      [
        {
          dir: oracledb.BIND_IN,
          type: oracledb.DB_TYPE_INTERVAL_YM,
          val: whereInterval,
        },
      ]
    );

    const result = await connection.execute(
      'SELECT ID FROM IntervalWhereTest WHERE Col = :1',
      [
        {
          dir: oracledb.BIND_IN,
          type: oracledb.DB_TYPE_INTERVAL_YM,
          val: whereInterval,
        },
      ]
    );
    assert.deepStrictEqual(result.rows[0][0], 1);
    await testsUtil.dropTable(connection, 'IntervalWhereTest');
  }); // 311.16

  it('311.17 handle complex interval arithmetic in PL/SQL', async function() {
    const result = await connection.execute(`
      BEGIN
        DECLARE
          v_interval1 INTERVAL YEAR TO MONTH := TO_YMINTERVAL('5-6');
          v_interval2 INTERVAL YEAR TO MONTH := TO_YMINTERVAL('2-3');
          v_result INTERVAL YEAR TO MONTH;
        BEGIN
          v_result := v_interval1 - v_interval2;
          :output := v_result;
        END;
      END;
    `, {
      output: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_INTERVAL_YM }
    });

    assert.deepStrictEqual(result.outBinds.output, new oracledb.IntervalYM({ years: 3, months: 3 }));
  }); // 311.17

  it('311.18 validate interval precision constraints', async function() {
    const createTableSQL = `
      CREATE TABLE IntervalPrecisionTest (
        Col1 INTERVAL YEAR TO MONTH, -- default year precision is 2
        Col2 INTERVAL YEAR(4) TO MONTH
      )
    `;

    await connection.execute(testsUtil.sqlCreateTable('IntervalPrecisionTest', createTableSQL));

    // Test valid insertions with different precisions
    await connection.execute(`
        INSERT INTO IntervalPrecisionTest VALUES
        (TO_YMINTERVAL('99-11'), TO_YMINTERVAL('9999-11'))
      `);

    // Attempt to insert values exceeding precision throw an error
    await assert.rejects(
      connection.execute(`
          INSERT INTO IntervalPrecisionTest VALUES
          (TO_YMINTERVAL('100-0'), TO_YMINTERVAL('10000-0'))
        `),
      /ORA-01873:/  // Specified precision does not match column definition
    );
    await testsUtil.dropTable(connection, 'IntervalPrecisionTest');
  }); // 311.18

  it('311.19 test interval comparison operations', async function() {
    // Multi-row insert is supported only from 23ai DB
    if (connection.oracleServerVersion < 2306000000)
      this.skip();

    const createTableSQL = `
      CREATE TABLE IntervalComparisonTest (
        ID NUMBER,
        IntervalCol INTERVAL YEAR TO MONTH
      )
    `;
    await connection.execute(testsUtil.sqlCreateTable('IntervalComparisonTest', createTableSQL));

    // Insert various intervals
    await connection.execute(`
        INSERT INTO IntervalComparisonTest VALUES
        (1, TO_YMINTERVAL('1-0')),
        (2, TO_YMINTERVAL('1-6')),
        (3, TO_YMINTERVAL('2-0')),
        (4, TO_YMINTERVAL('-1-6'))
      `);

    // Test various comparison queries
    const gtResult = await connection.execute(`
        SELECT ID FROM IntervalComparisonTest
        WHERE IntervalCol > TO_YMINTERVAL('1-0')
      `);
    assert.strictEqual(gtResult.rows.length, 2);
    assert.deepStrictEqual(gtResult.rows.map(r => r[0]), [2, 3]);

    const ltResult = await connection.execute(`
        SELECT ID FROM IntervalComparisonTest
        WHERE IntervalCol < TO_YMINTERVAL('1-0')
      `);
    assert.strictEqual(ltResult.rows.length, 1);
    assert.deepStrictEqual(ltResult.rows[0][0], 4);
    await testsUtil.dropTable(connection, 'IntervalComparisonTest');
  }); // 311.19

  it('311.20 handle interval type conversions', async function() {
    const result = await connection.execute(`
      SELECT
        TO_CHAR(TO_YMINTERVAL('5-6')) AS CharInterval,
        TO_NUMBER(EXTRACT(YEAR FROM TO_YMINTERVAL('5-6'))) AS ExtractedYear,
        TO_NUMBER(EXTRACT(MONTH FROM TO_YMINTERVAL('5-6'))) AS ExtractedMonth
      FROM DUAL
    `);

    assert.strictEqual(result.rows[0][0], '+000000005-06');
    assert.strictEqual(result.rows[0][1], 5);
    assert.strictEqual(result.rows[0][2], 6);
  }); // 311.20

  it('311.21 test interval with null and undefined values', async function() {
    // Multi-row insert is supported only from 23ai DB
    if (connection.oracleServerVersion < 2306000000)
      this.skip();

    const createTableSQL = `
      CREATE TABLE IntervalNullTest (
        Col1 INTERVAL YEAR TO MONTH,
        Col2 INTERVAL YEAR TO MONTH
      )
    `;

    await connection.execute(testsUtil.sqlCreateTable('IntervalNullTest', createTableSQL));

    // Test various null scenarios
    await connection.execute(`
        INSERT INTO IntervalNullTest VALUES
        (TO_YMINTERVAL('5-6'), NULL),
        (NULL, TO_YMINTERVAL('2-3'))
      `);

    const result = await connection.execute(
      'SELECT * FROM IntervalNullTest WHERE Col2 IS NULL OR Col1 IS NULL'
    );

    assert.strictEqual(result.rows.length, 2);

    await testsUtil.dropTable(connection, 'IntervalNullTest');
  }); // 311.21

  it('311.22 SELECT INTERVAL with year only', async function() {
    const result = await connection.execute("SELECT INTERVAL '9' YEAR FROM dual");
    assert.deepStrictEqual(result.rows[0][0], new oracledb.IntervalYM({ years: 9, months: 0 }));
  }); // 311.22

  it('311.23 SELECT INTERVAL with month (2-digits) only', async function() {
    const result = await connection.execute("SELECT INTERVAL '40' MONTH FROM dual");
    assert.deepStrictEqual(result.rows[0][0], new oracledb.IntervalYM({ years: 3, months: 4 }));
  }); // 311.23

  it('311.24 SELECT INTERVAL with month (3-digits) only', async function() {
    const result = await connection.execute("SELECT INTERVAL '500' MONTH FROM dual");
    assert.deepStrictEqual(result.rows[0][0], new oracledb.IntervalYM({ years: 41, months: 8 }));
  }); // 311.24

  it('311.25 invalid interval format', async function() {
    const invalidInterval = 'INVALID-INTERVAL';
    await assert.rejects(
      connection.execute(
        'SELECT TO_YMINTERVAL(:1) FROM DUAL',
        [invalidInterval]
      ),
      /ORA-01867:/ // The interval literal does not match the format
    );
  }); // 311.25

  it('311.26 invalid attribute in bind value', async function() {
    const largeInterval = { yeas: 100000000, months: 13 };
    await assert.rejects(
      connection.execute(
        'SELECT :1 FROM dual',
        [
          {
            dir: oracledb.BIND_IN,
            type: oracledb.DB_TYPE_INTERVAL_YM,
            val: largeInterval,
          },
        ]
      ),
      /NJS-011:/ // encountered bind value and type mismatch
    );
  }); // 311.26

  it('311.27 negative precision for interval', async function() {
    const invalidTableSQL = `
      CREATE TABLE InvalidPrecisionTest (
        Col INTERVAL YEAR(-1) TO MONTH
      )
    `;
    await assert.rejects(
      connection.execute(testsUtil.sqlCreateTable('InvalidPrecisionTest', invalidTableSQL)),
      /ORA-30088:/ // ORA-30088: datetime/interval precision is out of range
    );
  }); // 311.27

  it('311.28 non-numeric input for interval', function() {
    assert.throws(
      () => new oracledb.IntervalYM({ years: 'five', months: 'twelve' }),
      /NJS-007: invalid value for "years" in parameter 1/
    );

    // non-numeric "months" attribute
    assert.throws(
      () => new oracledb.IntervalYM({ years: 5, months: 'twelve' }),
      /NJS-007: invalid value for "months" in parameter 1/
    );
  }); // 311.28

  it('311.29 interval arithmetic with invalid types', async function() {
    await assert.rejects(
      connection.execute(`
        BEGIN
          DECLARE
            v_interval INTERVAL YEAR TO MONTH := TO_YMINTERVAL('5-6');
            v_result INTERVAL YEAR TO MONTH;
          BEGIN
            v_result := v_interval + 'INVALID';
          END;
        END;
        `
      ),
      /ORA-01867:/ // ORA-01867: the interval is invalid
    );
  }); // 311.29

  it('311.30 interval column with null precision', async function() {
    const invalidTableSQL = `
      CREATE TABLE NullPrecisionTest (
        Col INTERVAL YEAR(NULL) TO MONTH
      )
    `;
    await assert.rejects(
      connection.execute(testsUtil.sqlCreateTable('NullPrecisionTest', invalidTableSQL)),
      /ORA-30088:/ // ORA-30088: datetime/interval precision is out of range
    );
  }); //311.30

  it('311.31 insert data with invalid year precision into interval column', async function() {
    const createTableSQL = `
      CREATE TABLE PrecisionMismatchTest (
        Col INTERVAL YEAR(3) TO MONTH
      )
    `;
    await connection.execute(testsUtil.sqlCreateTable('PrecisionMismatchTest', createTableSQL));

    const mismatchedInterval = new oracledb.IntervalYM({ years: 9999, months: 11 }); // Exceeds YEAR(3) precision
    await assert.rejects(
      connection.execute(
        'INSERT INTO PrecisionMismatchTest VALUES (:1)',
        [
          {
            dir: oracledb.BIND_IN,
            type: oracledb.DB_TYPE_INTERVAL_YM,
            val: mismatchedInterval,
          },
        ]
      ),
      /ORA-01873:/ // ORA-01873: the leading precision of the interval is too small
    );

    await testsUtil.dropTable(connection, 'PrecisionMismatchTest');
  }); // 311.31

  it('311.32 interval comparison with invalid format', async function() {
    await assert.rejects(
      connection.execute(
        'SELECT * FROM TestIntervalYMs WHERE IntervalCol = TO_YMINTERVAL(:1)',
        ['INVALID-FORMAT']
      ),
      /ORA-01867:/ // ORA-01867: the interval is invalid
    );
  }); // 311.32

  it('311.33 empty interval value in bind', async function() {
    const emptyInterval = { years: null, months: null };
    await assert.rejects(
      connection.execute(
        'SELECT :1 FROM dual',
        [
          {
            dir: oracledb.BIND_IN,
            type: oracledb.DB_TYPE_INTERVAL_YM,
            val: emptyInterval,
          },
        ]
      ),
      /NJS-011:/ // NJS-011: encountered bind value and type mismatch
    );
  }); // 311.33

  it('311.34 bulk inserts with INTERVAL YEAR TO MONTH', async function() {
    const sql = `INSERT INTO TestIntervalYMs (IntCol, IntervalCol,
      NullableCol, IntervalPrecisionCol) VALUES (:1, TO_YMINTERVAL(:2),
      TO_YMINTERVAL(:3), TO_YMINTERVAL(:4))`;

    const binds = [
      [11, '1-6', null, '3-8'],
      [12, '2-3', '5-2', '3-8'],
      [13, '-4-9', null, '3-8'],
      [14, '10-0', '2-6', '3-8']
    ];

    const options = { autoCommit: true };

    await connection.executeMany(sql, binds, options);

    const result = await connection.execute(
      `SELECT IntCol, IntervalCol, NullableCol, IntervalPrecisionCol FROM
        TestIntervalYMs WHERE IntCol IN (11, 12, 13, 14)`
    );

    const expectedResults = [
      [11, new oracledb.IntervalYM({ years: 1, months: 6 }), null,
        new oracledb.IntervalYM({ years: 3, months: 8 })
      ],
      [12, new oracledb.IntervalYM({ years: 2, months: 3 }),
        new oracledb.IntervalYM({ years: 5, months: 2 }),
        new oracledb.IntervalYM({ years: 3, months: 8 })
      ],
      [13, new oracledb.IntervalYM({ years: -4, months: -9 }), null,
        new oracledb.IntervalYM({ years: 3, months: 8 })
      ],
      [14, new oracledb.IntervalYM({ years: 10, months: 0 }),
        new oracledb.IntervalYM({ years: 2, months: 6 }),
        new oracledb.IntervalYM({ years: 3, months: 8 })
      ]
    ];

    assert.deepStrictEqual(result.rows, expectedResults);
  }); // 311.34

  it('311.35 ignore additional invalid attribute in bind value', async function() {
    const customInterval = new oracledb.IntervalYM({ years: 5, months: 12, days: 23 });
    const result = await connection.execute(
      'SELECT :1 FROM dual',
      [
        {
          dir: oracledb.BIND_IN,
          type: oracledb.DB_TYPE_INTERVAL_YM,
          val: customInterval,
        },
      ]
    );
    assert.deepStrictEqual(result.rows[0][0], new oracledb.IntervalYM({ years: 5, months: 12 }));
  }); // 311.35

  it('311.36 Negative - inserting a POJO instead of an IntervalYM object for an IntervalYM bind', async function() {
    const createTableSQL = `CREATE TABLE IntervalExtraAttrTest (Col INTERVAL YEAR TO MONTH)`;
    await connection.execute(testsUtil.sqlCreateTable('IntervalExtraAttrTest', createTableSQL));

    // Invalid object containing an extra 'randomAttr' field
    const invalidInterval = { years: 3, months: 7, randomAttr: 'extra' };

    await assert.rejects(
      async () => await connection.execute(
        `INSERT INTO IntervalExtraAttrTest VALUES (:1)`,
        [{ dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_INTERVAL_YM, val: invalidInterval }]
      ),
      /NJS-011:/ // NJS-011: encountered bind value and type mismatch
    );

    await testsUtil.dropTable(connection, 'IntervalExtraAttrTest');
  }); // 311.36

  it('311.37 fetch INTERVAL YM as string format', async function() {
    const createTableSQL = `CREATE TABLE IntervalStringFormatTest (Col INTERVAL YEAR TO MONTH)`;
    await connection.execute(testsUtil.sqlCreateTable('IntervalStringFormatTest', createTableSQL));

    // Insert an IntervalYM value
    await connection.execute(
      `INSERT INTO IntervalStringFormatTest VALUES (TO_YMINTERVAL('5-6'))`
    );

    // Fetch the interval normally
    const result1 = await connection.execute(`SELECT Col FROM IntervalStringFormatTest`);
    assert.deepStrictEqual(result1.rows[0][0], new oracledb.IntervalYM({ years: 5, months: 6 }));

    // Fetch interval as string using TO_CHAR
    const result2 = await connection.execute(`SELECT TO_CHAR(Col) FROM IntervalStringFormatTest`);
    assert.strictEqual(result2.rows[0][0], '+05-06');

    await testsUtil.dropTable(connection, 'IntervalStringFormatTest');
  }); // 311.37

  it('311.38 invalid attribute values', function() {
    assert.throws(
      () => new oracledb.IntervalYM({ years: null, months: null }),
      /NJS-007: invalid value for "years" in parameter 1/
    );

    assert.throws(
      () => new oracledb.IntervalYM({ years: 5.2, months: null }),
      /NJS-007: invalid value for "years" in parameter 1/
    );

    assert.throws(
      () => new oracledb.IntervalYM({ years: 5, months: 11.5 }),
      /NJS-007: invalid value for "months" in parameter 1/
    );
  }); // 311.38

  it('311.39 IntervalYM constructor with missing attributes', async function() {
    const intervals = [
      new oracledb.IntervalYM(),  // no attributes
      new oracledb.IntervalYM({}),  // empty object
      new oracledb.IntervalYM({ years: 5 }),  // only years
      new oracledb.IntervalYM({ months: 6 })  // only months
    ];

    const result = await connection.execute(
      'SELECT :1, :2, :3, :4 FROM dual',
      intervals.map(interval => ({
        dir: oracledb.BIND_IN,
        type: oracledb.DB_TYPE_INTERVAL_YM,
        val: interval
      }))
    );

    assert.deepStrictEqual(result.rows[0][0], new oracledb.IntervalYM({ years: 0, months: 0 }));
    assert.deepStrictEqual(result.rows[0][1], new oracledb.IntervalYM({ years: 0, months: 0 }));
    assert.deepStrictEqual(result.rows[0][2], new oracledb.IntervalYM({ years: 5, months: 0 }));
    assert.deepStrictEqual(result.rows[0][3], new oracledb.IntervalYM({ years: 0, months: 6 }));
  }); // 311.39

  it('311.40 months normalization', async function() {
    const intervals = [
      new oracledb.IntervalYM({ months: 25 }),
      new oracledb.IntervalYM({ months: -25 }),
      new oracledb.IntervalYM({ years: 1, months: 15 }),
      new oracledb.IntervalYM({ years: -1, months: -15 })
    ];

    const result = await connection.execute(
      'SELECT :1, :2, :3, :4 FROM dual',
      intervals.map(interval => ({
        dir: oracledb.BIND_IN,
        type: oracledb.DB_TYPE_INTERVAL_YM,
        val: interval
      }))
    );

    assert.deepStrictEqual(result.rows[0][0], new oracledb.IntervalYM({ months: 25, years: 0 }));
    assert.deepStrictEqual(result.rows[0][1], new oracledb.IntervalYM({ years: 0, months: -25 }));
    assert.deepStrictEqual(result.rows[0][2], new oracledb.IntervalYM({ years: 1, months: 15 }));
    assert.deepStrictEqual(result.rows[0][3], new oracledb.IntervalYM({ years: -1, months: -15 }));
  }); // 311.40

  it('311.41 PL/SQL aggregate functions', async function() {
    // Multi-row insert is supported only from 23ai DB
    if (connection.oracleServerVersion < 2306000000)
      this.skip();

    const createTableSQL = `
      CREATE TABLE IntervalAggregateTest (
        ID NUMBER,
        IntervalCol INTERVAL YEAR TO MONTH
      )
    `;

    await connection.execute(testsUtil.sqlCreateTable('IntervalAggregateTest', createTableSQL));

    // Insert test data
    await connection.execute(`
      INSERT ALL
        INTO IntervalAggregateTest VALUES (1, TO_YMINTERVAL('2-6'))
        INTO IntervalAggregateTest VALUES (2, TO_YMINTERVAL('3-4'))
        INTO IntervalAggregateTest VALUES (3, TO_YMINTERVAL('1-8'))
      SELECT * FROM dual
    `);

    // Test MIN, MAX functions
    const result = await connection.execute(`
      SELECT
        MIN(IntervalCol) as MinInterval,
        MAX(IntervalCol) as MaxInterval
      FROM IntervalAggregateTest
    `);

    assert.deepStrictEqual(result.rows[0][0], new oracledb.IntervalYM({ years: 1, months: 8 }));
    assert.deepStrictEqual(result.rows[0][1], new oracledb.IntervalYM({ years: 3, months: 4 }));

    await testsUtil.dropTable(connection, 'IntervalAggregateTest');
  }); // 311.41

  it('311.42 IntervalYM in PL/SQL record types', async function() {
    const plsql = `
      DECLARE
        TYPE interval_record IS RECORD (
          id NUMBER,
          interval_val INTERVAL YEAR TO MONTH
        );
        v_record interval_record;
      BEGIN
        v_record.id := 1;
        v_record.interval_val := TO_YMINTERVAL('5-6');
        :result := v_record.interval_val;
      END;
    `;

    const result = await connection.execute(
      plsql,
      {
        result: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_INTERVAL_YM }
      }
    );

    assert.deepStrictEqual(result.outBinds.result, new oracledb.IntervalYM({ years: 5, months: 6 }));
  }); // 311.42

  it('311.43 IntervalYM with leading/trailing whitespace', async function() {
    const result = await connection.execute(`
      SELECT
        TO_YMINTERVAL('  5-6  ') as WithSpaces,
        TO_YMINTERVAL('5-6') as NoSpaces
      FROM dual
    `);

    const expectedInterval = new oracledb.IntervalYM({ years: 5, months: 6 });
    assert.deepStrictEqual(result.rows[0][0], expectedInterval);
    assert.deepStrictEqual(result.rows[0][1], expectedInterval);
  }); // 311.43

  it('311.44 different precision specifications', async function() {
    const createTableSQL = `
      CREATE TABLE IntervalPrecisionTest (
        Col1 INTERVAL YEAR(2) TO MONTH,
        Col2 INTERVAL YEAR(4) TO MONTH,
        Col3 INTERVAL YEAR(9) TO MONTH
      )
    `;

    await connection.execute(testsUtil.sqlCreateTable('IntervalPrecisionTest', createTableSQL));

    // Test inserting values within precision limits
    await connection.execute(`
      INSERT INTO IntervalPrecisionTest VALUES (
        TO_YMINTERVAL('99-11'),
        TO_YMINTERVAL('9999-11'),
        TO_YMINTERVAL('999999999-11')
      )
    `);

    // Verify the values
    const result = await connection.execute('SELECT * FROM IntervalPrecisionTest');
    assert.deepStrictEqual(result.rows[0][0], new oracledb.IntervalYM({ years: 99, months: 11 }));
    assert.deepStrictEqual(result.rows[0][1], new oracledb.IntervalYM({ years: 9999, months: 11 }));
    assert.deepStrictEqual(result.rows[0][2], new oracledb.IntervalYM({ years: 999999999, months: 11 }));

    await testsUtil.dropTable(connection, 'IntervalPrecisionTest');
  }); // 311.44

  it('311.45 IntervalYM with fractional months', async function() {
    await assert.rejects(
      connection.execute("SELECT TO_YMINTERVAL('5-6.5') FROM dual"),
      /ORA-01867:/  // ORA-01867: the interval is invalid
    );
  }); // 311.45
});

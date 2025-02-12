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
 *   312. dataTypeIntervalDS.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - IntervalDS (Days-to-Second).
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('312. dataTypeIntervalDS.js', function() {
  let conn;
  const tableName = 'TestIntervals';

  before(async function() {
    conn = await oracledb.getConnection(dbConfig);

    // Create the table
    const sql = `CREATE TABLE ${tableName} (
        IntCol NUMBER(9) NOT NULL,
        IntervalCol INTERVAL DAY TO SECOND NOT NULL,
        NullableCol INTERVAL DAY TO SECOND,
        IntervalPrecisionCol INTERVAL DAY(7) TO SECOND,
        IntervalPrecisionScaleCol INTERVAL DAY(8) TO SECOND(9)
      )`;

    await conn.execute(testsUtil.sqlCreateTable(tableName, sql));

    // Insert test data
    const plsql = `
      BEGIN
        FOR i IN 1..10 LOOP
          INSERT INTO ${tableName}
          VALUES (
            i,
            TO_DSINTERVAL(TO_CHAR(i) || ' ' || TO_CHAR(i) || ':' || TO_CHAR(i * 2) || ':' || TO_CHAR(i * 3)),
            CASE
              WHEN MOD(i, 2) = 0 THEN NULL
              ELSE TO_DSINTERVAL(TO_CHAR(i + 5) || ' ' || TO_CHAR(i + 2) || ':' || TO_CHAR(i * 2 + 5) || ':' || TO_CHAR(i * 3 + 5))
            END,
            TO_DSINTERVAL('8 05:15:00'),
            TO_DSINTERVAL('10 12:15:15')
          );
        END LOOP;
      END;
    `;
    await conn.execute(plsql);
    await conn.commit();
  });

  after(async function() {
    // Drop the table
    await testsUtil.dropTable(conn, tableName);
    await conn.close();
  });

  it('312.1 - binding in an interval', async function() {
    const value = new oracledb.IntervalDS({ days: 5, hours: 5, minutes: 10, seconds: 15, fseconds: 0 });
    const result = await conn.execute(
      `SELECT * FROM ${tableName} WHERE IntervalCol = :value`,
      { value: { val: value, type: oracledb.DB_TYPE_INTERVAL_DS } }
    );
    assert.strictEqual(result.rows.length, 1);
    assert.strictEqual(result.rows[0][0], 5);
  }); // 312.1

  it('312.2 - binding a null value for an interval column', async function() {
    const result = await conn.execute(
      `SELECT * FROM ${tableName} WHERE IntervalCol = :value`,
      { value: null }
    );
    assert.deepStrictEqual(result.rows, []);
  }); // 312.2

  it('312.3 - binding out with interval column', async function() {
    const bindVars = {
      value: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_INTERVAL_DS },
    };
    const result = await conn.execute(
      `BEGIN :value := TO_DSINTERVAL('8 09:24:18.123789'); END;`,
      bindVars
    );

    const expectedObj = new oracledb.IntervalDS({days: 8, hours: 9,
      minutes: 24, seconds: 18, fseconds: 123789000});
    assert(result.outBinds.value instanceof oracledb.IntervalDS);
    assert.deepStrictEqual(result.outBinds.value, expectedObj);
  }); // 312.3

  it('312.4 - binding out with interval column - no fractional seconds', async function() {
    const bindVars = {
      value: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_INTERVAL_DS },
    };
    const result = await conn.execute(
      `BEGIN :value := TO_DSINTERVAL('8 09:30:00'); END;`,
      bindVars
    );

    const expectedObj = new oracledb.IntervalDS({days: 8, hours: 9,
      minutes: 30, seconds: 0, fseconds: 0});
    assert(result.outBinds.value instanceof oracledb.IntervalDS);
    assert.deepStrictEqual(result.outBinds.value, expectedObj);
  }); // 312.4

  it('312.5 - binding in/out with interval arithmetic', async function() {
    const bindVars = {
      value: {
        dir: oracledb.BIND_INOUT,
        type: oracledb.DB_TYPE_INTERVAL_DS,
        val: new oracledb.IntervalDS({ days: 5, hours: 2, minutes: 15, seconds: 0 }),
      },
    };
    const result = await conn.execute(
      `BEGIN :value := :value + TO_DSINTERVAL('5 08:30:00'); END;`,
      bindVars
    );
    assert(result.outBinds.value instanceof oracledb.IntervalDS);
    assert.deepStrictEqual(result.outBinds.value,
      new oracledb.IntervalDS({ "days": 10, "hours": 10, "minutes": 45, "seconds": 0 }));
  }); // 312.5

  it('312.6 - binding in/out with fractional seconds', async function() {
    const bindVars = {
      value: {
        dir: oracledb.BIND_INOUT,
        type: oracledb.DB_TYPE_INTERVAL_DS,
        val: new oracledb.IntervalDS({ days: 5, hours: 0, minutes: 0, seconds: 12, fseconds: 123789 })
      },
    };
    const result = await conn.execute(
      `BEGIN :value := :value + TO_DSINTERVAL('5 08:30:00'); END;`,
      bindVars
    );
    assert(result.outBinds.value instanceof oracledb.IntervalDS);
    assert.deepStrictEqual(result.outBinds.value,
      new oracledb.IntervalDS({"days": 10, "hours": 8, "minutes": 30,
        "seconds": 12, "fseconds": 123789}));
  }); // 312.6

  it('312.7 - column metadata', async function() {
    const result = await conn.execute(`SELECT * FROM ${tableName}`);
    const metadata = result.metaData.map((col) => ({
      name: col.name,
      type: col.dbType,
    }));

    const expectedMetadata = [
      { name: 'INTCOL', type: oracledb.DB_TYPE_NUMBER },
      { name: 'INTERVALCOL', type: oracledb.DB_TYPE_INTERVAL_DS },
      { name: 'NULLABLECOL', type: oracledb.DB_TYPE_INTERVAL_DS },
      { name: 'INTERVALPRECISIONCOL', type: oracledb.DB_TYPE_INTERVAL_DS },
      { name: 'INTERVALPRECISIONSCALECOL', type: oracledb.DB_TYPE_INTERVAL_DS },
    ];

    assert.deepStrictEqual(metadata, expectedMetadata);
  }); // 312.7

  it('312.8 - fetch all rows', async function() {
    const result = await conn.execute(`SELECT * FROM ${tableName} ORDER BY IntCol`);
    assert.strictEqual(result.rows.length, 10);
  }); // 312.8

  it('312.9 - fetch data in chunks', async function() {
    const result = await conn.execute(`SELECT * FROM ${tableName} ORDER BY IntCol`);
    const chunk1 = result.rows.slice(0, 3);
    const chunk2 = result.rows.slice(3, 5);
    const chunk3 = result.rows.slice(5, 9);
    const chunk4 = result.rows.slice(9, 10);

    assert.strictEqual(chunk1.length, 3);
    assert.strictEqual(chunk2.length, 2);
    assert.strictEqual(chunk3.length, 4);
    assert.strictEqual(chunk4.length, 1);
  }); // 312.9

  it('312.10 - fetch single row', async function() {
    const result = await conn.execute(
      `SELECT * FROM ${tableName} WHERE IntCol IN (3, 4) ORDER BY IntCol`
    );
    assert.strictEqual(result.rows[0][0], 3);
    assert.strictEqual(result.rows[1][0], 4);
  }); // 312.10

  it('312.11 - bind and fetch a negative interval', async function() {
    const bind = { dir: oracledb.BIND_IN,
      type: oracledb.DB_TYPE_INTERVAL_DS,
      val: new oracledb.IntervalDS({ days: -1, hours: 23, minutes: 58,
        seconds: 34, fseconds: 431152000 })
    };
    const result = await conn.execute(`SELECT :1 FROM DUAL`, [bind]);
    assert.deepStrictEqual(result.rows[0][0], bind.val);
  }); // 312.11

  it('312.12 - fetch interval with maximum fractional seconds', async function() {
    const maxFsInterval = new oracledb.IntervalDS({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      fseconds: 999999999
    });

    const result = await conn.execute(
      `SELECT :1 FROM DUAL`,
      [{
        dir: oracledb.BIND_IN,
        type: oracledb.DB_TYPE_INTERVAL_DS,
        val: maxFsInterval
      }]
    );

    assert.deepStrictEqual(result.rows[0][0], maxFsInterval);
  }); // 312.12

  it('312.13 - fetch interval with maximum days for DAY(7) precision', async function() {
    const result = await conn.execute(
      `SELECT TO_DSINTERVAL('9999999 23:59:59.999999999') FROM DUAL`
    );
    assert.deepStrictEqual(result.rows[0][0], new oracledb.IntervalDS({
      days: 9999999,
      hours: 23,
      minutes: 59,
      seconds: 59,
      fseconds: 999999999
    }));
  }); // 312.13

  it('312.14 - insert interval exceeding day precision (DAY(7))', async function() {
    const value = new oracledb.IntervalDS({ days: 10000000, hours: 0,
      minutes: 0, seconds: 0, fseconds: 0 });
    await assert.rejects(
      async () => await conn.execute(
        `INSERT INTO ${tableName} (IntCol, IntervalCol, NullableCol, IntervalPrecisionCol, IntervalPrecisionScaleCol)
         VALUES (11, TO_DSINTERVAL('1 00:00:00'), NULL, :value, TO_DSINTERVAL('0 00:00:00'))`,
        { value: { val: value, type: oracledb.DB_TYPE_INTERVAL_DS } }
      ),
      /ORA-01873:/ //ORA-01873: the leading precision of the interval is too small
    );
  }); // 312.14

  it('312.15 - interval components exceeding normal ranges', async function() {
    await assert.rejects(
      async () => await conn.execute(
        `SELECT TO_DSINTERVAL('1 25:70:70.999999999') FROM DUAL`
      ),
      /ORA-01850:/ // ORA-01850: hour must be between 0 and 23
    );
  }); // 312.15

  it('312.16 - select rows where NullableCol is NULL', async function() {
    const result = await conn.execute(
      `SELECT COUNT(*) FROM ${tableName} WHERE NullableCol IS NULL`
    );
    assert.strictEqual(result.rows[0][0], 5);
  }); // 312.16

  it('312.17 - verify non-NULL NullableCol value for IntCol=1', async function() {
    const result = await conn.execute(
      `SELECT NullableCol FROM ${tableName} WHERE IntCol = 1`
    );
    const expected = new oracledb.IntervalDS({
      days: 6,
      hours: 3,
      minutes: 7,
      seconds: 8,
      fseconds: 0
    });
    assert.deepStrictEqual(result.rows[0][0], expected);
  }); // 312.17

  it('312.18 - select rows where IntervalCol > 5 days', async function() {
    const value = new oracledb.IntervalDS({ days: 5, hours: 0, minutes: 0, seconds: 0, fseconds: 0 });
    const result = await conn.execute(
      `SELECT IntCol FROM ${tableName} WHERE IntervalCol > :value`,
      { value: { val: value, type: oracledb.DB_TYPE_INTERVAL_DS } }
    );
    assert.deepStrictEqual(result.rows, [[5], [6], [7], [8], [9], [10]]);
  }); // 312.18

  it('312.19 - interval arithmetic in SQL', async function() {
    const result = await conn.execute(`
      SELECT TO_DSINTERVAL('1 02:30:00') + TO_DSINTERVAL('3 12:45:15.123') FROM DUAL
    `);
    const expected = new oracledb.IntervalDS({
      days: 4,
      hours: 15,
      minutes: 15,
      seconds: 15,
      fseconds: 123000000
    });
    assert.deepStrictEqual(result.rows[0][0], expected);
  }); // 312.19

  it('312.20 - select maximum IntervalCol from table', async function() {
    const result = await conn.execute(
      `SELECT MAX(IntervalCol) FROM ${tableName}`
    );
    const expected = new oracledb.IntervalDS({
      days: 10,
      hours: 10,
      minutes: 20,
      seconds: 30,
      fseconds: 0
    });
    assert.deepStrictEqual(result.rows[0][0], expected);
  }); // 312.20

  it('312.21 - test interval with null and undefined values', async function() {
    // Multi-row insert is supported only from 23ai DB
    if (conn.oracleServerVersion < 2306000000)
      this.skip();

    const sql = `CREATE TABLE IntervalDSNullTest (
                  Col1 INTERVAL DAY TO SECOND,
                  Col2 INTERVAL DAY TO SECOND
                )`;
    await conn.execute(testsUtil.sqlCreateTable('IntervalDSNullTest', sql));

    await conn.execute(`
      INSERT INTO IntervalDSNullTest VALUES
      (TO_DSINTERVAL('5 06:30:45'), NULL),
      (NULL, TO_DSINTERVAL('2 12:30:15'))
    `);

    const result = await conn.execute(
      `SELECT * FROM IntervalDSNullTest WHERE Col2 IS NULL OR Col1 IS NULL`
    );
    assert.strictEqual(result.rows.length, 2);
    await testsUtil.dropTable(conn, 'IntervalDSNullTest');
  }); // 312.21

  it('312.22 - SELECT INTERVAL with seconds only', async function() {
    const result = await conn.execute("SELECT INTERVAL '900' SECOND(3) FROM DUAL");
    assert.deepStrictEqual(result.rows[0][0],
      new oracledb.IntervalDS({ days: 0, hours: 0, minutes: 15, seconds: 0, fseconds: 0 }));
  }); // 312.22

  it('312.23 - SELECT INTERVAL with fractional seconds overflow', async function() {
    const result = await conn.execute(
      "SELECT TO_DSINTERVAL('0 00:00:01.999999999') FROM DUAL"
    );
    assert.deepStrictEqual(result.rows[0][0],
      new oracledb.IntervalDS({ seconds: 1, fseconds: 999999999 }));
  }); // 312.23

  it('312.24 - invalid interval format', async function() {
    await assert.rejects(
      async () => await conn.execute("SELECT TO_DSINTERVAL('INVALID') FROM DUAL"),
      /ORA-01867:/ //  ORA-01867: the interval is invalid
    );
  }); // 312.24

  it('312.25 - invalid attribute in bind value', async function() {
    const invalidInterval = { day: 5, hours: 10 }; // Misspelled 'days'
    await assert.rejects(
      async () => await conn.execute(
        `SELECT :1 FROM DUAL`,
        [{
          dir: oracledb.BIND_IN,
          type: oracledb.DB_TYPE_INTERVAL_DS,
          val: invalidInterval
        }]
      ),
      /NJS-011:/ // NJS-011: encountered bind value and type mismatch
    );
  }); // 312.25

  it('312.26 - negative precision for interval', async function() {
    await assert.rejects(
      async () => await conn.execute(`CREATE TABLE InvalidDSTest (
        Col INTERVAL DAY(-1) TO SECOND
      )`),
      /ORA-30088:/ // ORA-30088: datetime/interval precision is out of range
    );
  }); // 312.26

  it('312.27 - non-numeric input for interval', function() {
    assert.throws(
      () => new oracledb.IntervalDS({ days: 'five', seconds: 'ten' }),
      /NJS-007: invalid value for "days" in parameter 1/
    );
  }); // 312.27

  it('312.28 - interval arithmetic with invalid types', async function() {
    await assert.rejects(
      async () => await conn.execute(`
        BEGIN
          DECLARE
            v_interval INTERVAL DAY TO SECOND := TO_DSINTERVAL('5 06:30:00');
            v_result INTERVAL DAY TO SECOND;
          BEGIN
            v_result := v_interval + 'INVALID';
          END;
        END;`
      ),
      /ORA-01867:/ //  ORA-01867: the interval is invalid
    );

    const bindVars = {
      invalidValue: {
        dir: oracledb.BIND_IN,
        type: oracledb.DB_TYPE_VARCHAR,
        val: 'INVALID'
      }
    };

    await assert.rejects(
      async () => await conn.execute(
        `BEGIN
        DECLARE
          v_interval INTERVAL DAY TO SECOND := TO_DSINTERVAL('5 06:30:00');
          v_result INTERVAL DAY TO SECOND;
        BEGIN
          v_result := v_interval + :invalidValue;
        END;
      END;`,
        bindVars),
      /ORA-01867:/ //  ORA-01867: the interval is invalid
    );
  }); // 312.28

  it('312.29 - day and seconds precision', async function() {
    const createTableSQL = `CREATE TABLE IntervalWithPrecision (
                              Col INTERVAL DAY(3) TO SECOND(3)
                            )`;
    await conn.execute(testsUtil.sqlCreateTable('IntervalWithPrecision', createTableSQL));

    const invalidInterval = new oracledb.IntervalDS({
      days: 1000, // Exceeds DAY PRECISION
      hours: 0,
      minutes: 0,
      seconds: 1,
      fseconds: 999999999 // fseconds value is truncated
    });
    await assert.rejects(
      async () => await conn.execute(
        `INSERT INTO IntervalWithPrecision VALUES (:1)`,
        [{
          dir: oracledb.BIND_IN,
          type: oracledb.DB_TYPE_INTERVAL_DS,
          val: invalidInterval
        }]
      ),
      /ORA-01873:/ //ORA-01873: the leading precision of the interval is too small
    );

    let result, roundedInterval;

    roundedInterval = new oracledb.IntervalDS({
      days: 100,
      seconds: 1,
      fseconds: 999455555 // fseconds value is rounded off to 3 decimal places
    }); // '100 00:00:01.999455555' is rounded off to '100 00:00:01.999'

    result = await conn.execute(
      `INSERT INTO IntervalWithPrecision VALUES (:1)`,
      [{
        dir: oracledb.BIND_IN,
        type: oracledb.DB_TYPE_INTERVAL_DS,
        val: roundedInterval
      }]
    );
    assert.strictEqual(result.rowsAffected, 1);
    result = await conn.execute('SELECT * FROM IntervalWithPrecision');
    assert.strictEqual(result.rows[0][0].fseconds, 999000000);

    roundedInterval = new oracledb.IntervalDS({
      days: 100,
      seconds: 1,
      fseconds: 999999999 // fseconds value is rounded off to 3 decimal places
    }); // '100 00:00:01.999999999' is rounded off to '100 00:00:02.000'

    result = await conn.execute(
      `INSERT INTO IntervalWithPrecision VALUES (:1)`,
      [{
        dir: oracledb.BIND_IN,
        type: oracledb.DB_TYPE_INTERVAL_DS,
        val: roundedInterval
      }]
    );
    assert.strictEqual(result.rowsAffected, 1);
    result = await conn.execute('SELECT * FROM IntervalWithPrecision');
    assert.strictEqual(result.rows[1][0].seconds, 2);
    assert.strictEqual(result.rows[1][0].fseconds, 0);
    await testsUtil.dropTable(conn, 'IntervalWithPrecision');
  }); // 312.29

  it('312.30 - interval comparison with invalid format', async function() {
    await assert.rejects(
      async () => await conn.execute(
        `SELECT * FROM ${tableName} WHERE IntervalCol = TO_DSINTERVAL(:1)`,
        ['INVALID-FORMAT']
      ),
      /ORA-01867:/ //  ORA-01867: the interval is invalid
    );
  }); // 312.30

  it('312.31 - interval with null attributes in bind', function() {
    const nullIntervalObj = { days: null, hours: null, minutes: null,
      seconds: null, fseconds: null };
    assert.throws(
      () => new oracledb.IntervalDS(nullIntervalObj),
      /NJS-007: invalid value for "days" in parameter 1/
    );
  }); // 312.31

  it('312.32 - maximum allowed interval value', async function() {
    const result = await conn.execute(
      "SELECT TO_DSINTERVAL('9999999 23:59:59.999999999') FROM DUAL"
    );
    assert.deepStrictEqual(result.rows[0][0], new oracledb.IntervalDS({
      days: 9999999,
      hours: 23,
      minutes: 59,
      seconds: 59,
      fseconds: 999999999
    }));
  }); // 312.32

  it('312.33 - interval with all components at maximum', async function() {
    const bindVal = new oracledb.IntervalDS({
      days: 9999999,
      hours: 23,
      minutes: 59,
      seconds: 59,
      fseconds: 999999999
    });
    const result = await conn.execute(
      'SELECT :1 FROM DUAL',
      [{
        dir: oracledb.BIND_IN,
        type: oracledb.DB_TYPE_INTERVAL_DS,
        val: bindVal
      }]
    );
    assert.deepStrictEqual(result.rows[0][0], bindVal);
  }); // 312.33

  it('312.34 - bind and fetch interval with zero values', async function() {
    // Test zero intervals
    const zeroInterval = new oracledb.IntervalDS();
    let result;

    // Bind in a complete zero interval
    result = await conn.execute(
      `SELECT :1 FROM DUAL`,
      [{
        dir: oracledb.BIND_IN,
        type: oracledb.DB_TYPE_INTERVAL_DS,
        val: zeroInterval
      }]
    );
    assert.deepStrictEqual(result.rows[0][0], zeroInterval);

    // Create an IntervalDS object with an empty JS object passed in!
    const zeroIntervalWithEmptyObj = new oracledb.IntervalDS({});

    // Bind in a complete zero interval
    result = await conn.execute(
      `SELECT :1 FROM DUAL`,
      [{
        dir: oracledb.BIND_IN,
        type: oracledb.DB_TYPE_INTERVAL_DS,
        val: zeroIntervalWithEmptyObj
      }]
    );
    assert.deepStrictEqual(result.rows[0][0], zeroInterval);

    // Test partial zeros with fractional seconds
    const zeroWithFraction = new oracledb.IntervalDS({
      fseconds: 500000000 // 0.5 seconds
    });
    result = await conn.execute(
      `SELECT :1 FROM DUAL`,
      [{
        dir: oracledb.BIND_IN,
        type: oracledb.DB_TYPE_INTERVAL_DS,
        val: zeroWithFraction
      }]
    );
    assert.deepStrictEqual(result.rows[0][0], zeroWithFraction);

    // Test zero interval in table operations
    await conn.execute(
      `INSERT INTO ${tableName} VALUES (
        11,
        TO_DSINTERVAL('0 00:00:00'),
        TO_DSINTERVAL('0 00:00:00.000'),
        TO_DSINTERVAL('0 00:00:00'),
        TO_DSINTERVAL('0 00:00:00')
      )`
    );

    result = await conn.execute(
      `SELECT IntervalCol FROM ${tableName} WHERE IntCol = 11`
    );
    assert.deepStrictEqual(result.rows[0][0], zeroInterval);
  }); // 312.34

  it('312.35 - interval with negative fractional seconds', async function() {
    const createTableSQL = `CREATE TABLE IntervalTbl (
      Col INTERVAL DAY TO SECOND
    )`;
    await conn.execute(testsUtil.sqlCreateTable('IntervalTbl', createTableSQL));

    const bindVal = new oracledb.IntervalDS({
      days: 2,
      hours: 3,
      minutes: 15,
      seconds: 45,
      fseconds: -500000000 // Negative 0.5 seconds
    });

    let result;
    result = await conn.execute(
      `INSERT INTO IntervalTbl VALUES (:1)`,
      [{
        dir: oracledb.BIND_IN,
        type: oracledb.DB_TYPE_INTERVAL_DS,
        val: bindVal
      }]
    );
    assert.strictEqual(result.rowsAffected, 1);
    result = await conn.execute('SELECT * FROM IntervalTbl');
    assert.strictEqual(result.rows[0][0].seconds, 45);
    assert.strictEqual(result.rows[0][0].fseconds, -500000000);
    await testsUtil.dropTable(conn, 'IntervalTbl');
  }); // 312.35

  it('312.36 - interval multiplication in SQL', async function() {
    const result = await conn.execute(`
      SELECT 2 * TO_DSINTERVAL('1 12:30:00') FROM DUAL
    `);
    const expected = new oracledb.IntervalDS({
      days: 3,
      hours: 1,
      minutes: 0,
      seconds: 0,
      fseconds: 0
    });
    assert.deepStrictEqual(result.rows[0][0], expected);
  }); // 312.36

  it('312.37 - interval subtraction in SQL', async function() {
    const result = await conn.execute(`
      SELECT TO_DSINTERVAL('3 06:45:30') - TO_DSINTERVAL('1 12:15:15') FROM DUAL
    `);
    const expected = new oracledb.IntervalDS({
      days: 1,
      hours: 18,
      minutes: 30,
      seconds: 15,
      fseconds: 0
    });
    assert.deepStrictEqual(result.rows[0][0], expected);
  }); // 312.37

  it('312.38 - SQL functions with intervals', async function() {
    const bindVal = {
      days: -2,
      hours: 3,
      minutes: 15,
      seconds: 45,
      fseconds: 0
    };

    // ABS() on interval
    await assert.rejects(
      async () => await conn.execute(
        `SELECT ABS(TO_DSINTERVAL(:1)) FROM DUAL`,
        [{ dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_INTERVAL_DS,
          val: new oracledb.IntervalDS(bindVal) }
        ]
      ),
      /ORA-00932:/ /* ORA-00932: expression is of data type INTERVAL DAY TO SECOND,
                    which is incompatible with expected data type NUMBER
                 */
    );
  }); // 312.38

  it('312.39 - bulk inserts with intervals', async function() {
    const sql = `INSERT INTO ${tableName} (IntCol, IntervalCol, NullableCol,
      IntervalPrecisionCol, IntervalPrecisionScaleCol) VALUES (:1, :2, :3, :4, :5)`;

    const binds = [
      [12,
        new oracledb.IntervalDS({ days: 1, hours: 1, minutes: 1, seconds: 1,
          fseconds: 0 }), null, null, null
      ],
      [13,
        new oracledb.IntervalDS({ days: 2, hours: 2, minutes: 2, seconds: 2,
          fseconds: 200000000 }), null, null, null
      ],
      [14,
        new oracledb.IntervalDS({ days: 3, hours: 33, minutes: 3, seconds: 3,
          fseconds: 300000000 }), null, null, null
      ]
    ];

    const options = { autoCommit: true, bindDefs: [
      { type: oracledb.DB_TYPE_NUMBER },
      { type: oracledb.DB_TYPE_INTERVAL_DS },
      { type: oracledb.DB_TYPE_INTERVAL_DS },
      { type: oracledb.DB_TYPE_INTERVAL_DS },
      { type: oracledb.DB_TYPE_INTERVAL_DS }
    ]};

    let result;
    result = await conn.executeMany(sql, binds, options);
    assert.strictEqual(result.rowsAffected, 3);

    result = await conn.execute(
      `SELECT * FROM ${tableName} WHERE IntCol IN (12, 13, 14)`
    );
    assert.deepStrictEqual(result.rows.map((r) => r[0]), [binds[0][0], binds[1][0], binds[2][0]]);
    assert.deepStrictEqual(result.rows.map((r) => r[1]), [binds[0][1], binds[1][1], binds[2][1]]);
    assert.deepStrictEqual(result.rows.map((r) => r[2]), [null, null, null]);
    assert.deepStrictEqual(result.rows.map((r) => r[3]), [null, null, null]);
    assert.deepStrictEqual(result.rows.map((r) => r[4]), [null, null, null]);
  }); // 312.39

  it('312.40 - rounding fractional seconds during arithmetic', async function() {
    const result = await conn.execute(`
      SELECT TO_DSINTERVAL('0 00:00:01.999999999') + TO_DSINTERVAL('0 00:00:00.000000001') FROM DUAL
    `);
    assert.deepStrictEqual(result.rows[0][0], new oracledb.IntervalDS({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 2,
      fseconds: 0
    }));
  }); // 312.40

  it('312.41 - Negative - bind a POJO instead of an IntervalDS object', async function() {
    const invalidIntervalDSObj = { das: 10, years: 4, months: 5,
      seconds: '1', fseconds: '2a' };
    await assert.rejects(
      async () => await conn.execute(
        'SELECT :1 FROM DUAL',
        [{
          dir: oracledb.BIND_IN,
          type: oracledb.DB_TYPE_INTERVAL_DS,
          val: invalidIntervalDSObj
        }]
      ),
      /NJS-011:/ // NJS-011: encountered bind value and type mismatch
    );
  }); // 312.41

  it('312.42 - some invalid attribute values in bind', function() {
    let invalidIntervalObj;
    invalidIntervalObj = { days: 3, hours: 4, months: '5', seconds: 1,
      fseconds: '2a' };
    assert.throws(
      () => new oracledb.IntervalDS(invalidIntervalObj),
      /NJS-007: invalid value for "fseconds" in parameter 1/
    );

    invalidIntervalObj = { days: 3, hours: 4, minutes: 5.2, seconds: 1,
      fseconds: '2a' };
    assert.throws(
      () => new oracledb.IntervalDS(invalidIntervalObj),
      /NJS-007: invalid value for "minutes" in parameter 1/
    );
  }); // 312.42

  it('312.43 - ignore additional invalid attribute in bind value', async function() {
    const customInterval = { days: 5, hours: 12, minutes: 23, seconds: 34,
      fseconds: 100, years: 40 };
    const result = await conn.execute('SELECT :1 FROM dual',
      [
        {
          dir: oracledb.BIND_IN,
          type: oracledb.DB_TYPE_INTERVAL_DS,
          val: new oracledb.IntervalDS(customInterval),
        },
      ]
    );
    assert.strictEqual(result.rows[0][0].days, customInterval.days);
    assert.strictEqual(result.rows[0][0].hours, customInterval.hours);
    assert.strictEqual(result.rows[0][0].minutes, customInterval.minutes);
    assert.strictEqual(result.rows[0][0].seconds, customInterval.seconds);
    assert.strictEqual(result.rows[0][0].fseconds, customInterval.fseconds);
    assert.strictEqual(result.rows[0][0].years, undefined);
  }); // 312.43

  it('312.44 - ignore invalid attribute in bind value', async function() {
    const createTableSQL = `CREATE TABLE IntervalTbl (
      Col INTERVAL DAY TO SECOND
    )`;
    await conn.execute(testsUtil.sqlCreateTable('IntervalTbl', createTableSQL));

    const bindVal = {
      days: 2,
      hours: 3,
      minutes: 15,
      seconds: 45,
      weeks: 5
    };

    let result;
    result = await conn.execute(
      `INSERT INTO IntervalTbl VALUES (:1)`,
      [{
        dir: oracledb.BIND_IN,
        type: oracledb.DB_TYPE_INTERVAL_DS,
        val: new oracledb.IntervalDS(bindVal)
      }]
    );
    assert.strictEqual(result.rowsAffected, 1);
    result = await conn.execute('SELECT * FROM IntervalTbl');
    assert.strictEqual(result.rows[0][0].days, bindVal.days);
    assert.strictEqual(result.rows[0][0].seconds, bindVal.seconds);
    assert.strictEqual(result.rows[0][0].hours, bindVal.hours);
    assert.strictEqual(result.rows[0][0].minutes, bindVal.minutes);
    assert.strictEqual(result.rows[0][0].fseconds, 0);
    assert.strictEqual(result.rows[0][0].weeks, undefined);
    await testsUtil.dropTable(conn, 'IntervalTbl');
  }); // 312.44

  it('312.45 - insert and fetch interval with only days and seconds', async function() {
    const createTableSQL = `CREATE TABLE IntervalTbl (
      Col INTERVAL DAY TO SECOND
    )`;
    await conn.execute(testsUtil.sqlCreateTable('IntervalTbl', createTableSQL));

    const bindVal = {
      days: 2,
      seconds: 40,
    };

    let result;
    result = await conn.execute(
      `INSERT INTO IntervalTbl VALUES (:1)`,
      [{
        dir: oracledb.BIND_IN,
        type: oracledb.DB_TYPE_INTERVAL_DS,
        val: new oracledb.IntervalDS(bindVal)
      }]
    );
    assert.strictEqual(result.rowsAffected, 1);
    result = await conn.execute('SELECT * FROM IntervalTbl');
    assert.strictEqual(result.rows[0][0].days, bindVal.days);
    assert.strictEqual(result.rows[0][0].seconds, bindVal.seconds);
    assert.strictEqual(result.rows[0][0].hours, 0);
    assert.strictEqual(result.rows[0][0].minutes, 0);
    assert.strictEqual(result.rows[0][0].fseconds, 0);
    await testsUtil.dropTable(conn, 'IntervalTbl');
  }); // 312.45


  it('312.46 - bind interval with only hours and minutes', async function() {
    const bindVal = new oracledb.IntervalDS({ hours: 2, minutes: 15 });
    const result = await conn.execute(
      `SELECT :1 FROM DUAL`,
      [{ dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_INTERVAL_DS, val: bindVal }]
    );
    assert(result.rows[0][0] instanceof oracledb.IntervalDS);
    assert.deepStrictEqual(result.rows[0][0], bindVal);
    assert.strictEqual(result.rows[0][0].days, 0);
    assert.strictEqual(result.rows[0][0].hours, bindVal.hours);
    assert.strictEqual(result.rows[0][0].minutes, bindVal.minutes);
    assert.strictEqual(result.rows[0][0].seconds, 0);
    assert.strictEqual(result.rows[0][0].fseconds, 0);
  }); // 312.46

  it('312.47 - constructor with partial attributes', function() {
    // Test partial initialization (e.g., days only, hours only)
    const intervalDaysOnly = new oracledb.IntervalDS({ days: 3 });
    assert.strictEqual(intervalDaysOnly.days, 3);
    assert.strictEqual(intervalDaysOnly.hours, 0);
    assert.strictEqual(intervalDaysOnly.minutes, 0);
    assert.strictEqual(intervalDaysOnly.seconds, 0);
    assert.strictEqual(intervalDaysOnly.fseconds, 0);

    const intervalHoursOnly = new oracledb.IntervalDS({ hours: 8 });
    assert.strictEqual(intervalHoursOnly.days, 0);
    assert.strictEqual(intervalHoursOnly.hours, 8);
  }); // 312.47

  it('312.48 - time component normalization during binding', async function() {
    const interval = new oracledb.IntervalDS({ hours: 25, minutes: 70, seconds: 70, fseconds: 1000000000 });
    const result = await conn.execute(
      'SELECT :1 FROM dual',
      [{ dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_INTERVAL_DS, val: interval }]
    );
    assert.deepStrictEqual(result.rows[0][0],
      new oracledb.IntervalDS({ days: 0, fseconds: 1000000000, hours: 25, minutes: 70, seconds: 70 }));
  }); // 312.48

  it('312.49 - undefined/null in constructor attributes', function() {
    // Undefined should default to 0
    const intervalUndefined = new oracledb.IntervalDS({ days: undefined, hours: 5 });
    assert.strictEqual(intervalUndefined.days, 0);
    assert.strictEqual(intervalUndefined.hours, 5);

    // Null should throw validation error
    assert.throws(() => {
      new oracledb.IntervalDS({ days: null, hours: 3 });
    }, /NJS-007:/);
  }); // 312.49

  it('312.50 - PL/SQL function returning IntervalDS', async function() {
    // Create PL/SQL function
    await conn.execute(`
      CREATE OR REPLACE FUNCTION GetDSInterval RETURN INTERVAL DAY TO SECOND IS
      BEGIN
        RETURN TO_DSINTERVAL('5 06:30:45.123456789');
      END;
    `);

    // Call function and verify result
    const result = await conn.execute(
      `BEGIN :out := GetDSInterval(); END;`,
      { out: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_INTERVAL_DS } }
    );
    assert.deepStrictEqual(result.outBinds.out,
      new oracledb.IntervalDS({ days: 5, hours: 6, minutes: 30, seconds: 45, fseconds: 123457000 }));

    await conn.execute(`DROP FUNCTION GetDSInterval`);
  }); // 312.50

  it('312.51 - reject non-IntervalDS binds', async function() {
    // Test plain object instead of IntervalDS instance
    await assert.rejects(
      conn.execute(
        'SELECT :1 FROM dual',
        [{
          dir: oracledb.BIND_IN,
          type: oracledb.DB_TYPE_INTERVAL_DS,
          val: { days: 2, hours: 3 } // Not an IntervalDS instance
        }]
      ),
      /NJS-011:/
    );
  }); // 312.51

  it('312.52 - string values in constructor attributes', function() {
    assert.throws(() => {
      new oracledb.IntervalDS({ days: '5', hours: '6' });
    }, /NJS-007:/);
  }); // 312.52

  it('312.53 - interval sorting in queries', async function() {
    // Test ORDER BY with IntervalDS column
    await conn.execute(`
      CREATE TABLE IntervalDSSortTest (
        Id NUMBER,
        IntervalCol INTERVAL DAY TO SECOND
      )
    `);

    await conn.executeMany(`
      INSERT INTO IntervalDSSortTest VALUES (:1, TO_DSINTERVAL(:2))
    `, [
      [1, '1 06:00:00'],
      [2, '0 12:30:00'],
      [3, '2 00:00:00']
    ]);

    const result = await conn.execute(`
      SELECT Id FROM IntervalDSSortTest ORDER BY IntervalCol
    `);
    assert.deepStrictEqual(
      result.rows.map(row => row[0]),
      [2, 1, 3] // Expected order: 12h30m, 1d6h, 2d
    );

    await testsUtil.dropTable(conn, 'IntervalDSSortTest');
  }); // 312.53

  it('312.54 - interval arithmetic with multiple operations', async function() {
    // Test chained arithmetic operations
    const result = await conn.execute(`
      BEGIN
        DECLARE
          v_interval INTERVAL DAY TO SECOND := TO_DSINTERVAL('5 06:30:45');
        BEGIN
          v_interval := v_interval + TO_DSINTERVAL('2 12:15:30');
          v_interval := v_interval - TO_DSINTERVAL('1 00:00:00');
          :result := v_interval;
        END;
      END;
    `, {
      result: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_INTERVAL_DS }
    });

    assert.deepStrictEqual(
      result.outBinds.result,
      new oracledb.IntervalDS({ days: 6, hours: 18, minutes: 46, seconds: 15 })
    );
  }); // 312.54
});

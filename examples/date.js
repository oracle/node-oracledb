/* Copyright (c) 2015, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   date.js
 *
 * DESCRIPTION
 *   Insert and query DATE and TIMESTAMP columns.
 *
 *   When bound in an INSERT, JavaScript Dates are inserted using
 *   TIMESTAMP WITH LOCAL TIMEZONE.  Similarly for queries, TIMESTAMP
 *   and DATE columns are fetched as TIMESTAMP WITH LOCAL TIMEZONE.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************///

// Using a fixed Oracle time zone helps avoid machine and deployment differences
process.env.ORA_SDTZ = 'UTC';

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function run() {

  let connection;

  try {
    let result, date;

    connection = await oracledb.getConnection(dbConfig);

    console.log('Creating table');
    await connection.execute(
      `BEGIN
         DECLARE
           e_table_exists EXCEPTION;
           PRAGMA EXCEPTION_INIT(e_table_exists, -00942);
         BEGIN
           EXECUTE IMMEDIATE ('DROP TABLE datetest');
         EXCEPTION
           WHEN e_table_exists
           THEN NULL;
         END;
       END;`);

    await connection.execute(
      `CREATE TABLE datetest(
         id NUMBER,
         timestampcol TIMESTAMP,
         timestamptz  TIMESTAMP WITH TIME ZONE,
         timestampltz TIMESTAMP WITH LOCAL TIME ZONE,
         datecol DATE)`);

    // When bound, JavaScript Dates are inserted using TIMESTAMP WITH LOCAL TIMEZONE
    date = new Date();
    console.log('Inserting JavaScript date: ' + date);
    result = await connection.execute(
      `INSERT INTO datetest (id, timestampcol, timestamptz, timestampltz, datecol)
       VALUES (1, :ts, :tstz, :tsltz, :td)`,
      { ts: date, tstz: date, tsltz: date, td: date });
    console.log('Rows inserted: ' + result.rowsAffected );

    console.log('Query Results:');
    result = await connection.execute(
      `SELECT id, timestampcol, timestamptz, timestampltz, datecol,
              TO_CHAR(CURRENT_DATE, 'DD-Mon-YYYY HH24:MI') AS CD
       FROM datetest
       ORDER BY id`);
    console.log(result.rows);

    console.log('Altering session time zone');
    await connection.execute(`ALTER SESSION SET TIME_ZONE='+5:00'`);  // resets ORA_SDTZ value

    date = new Date();
    console.log('Inserting JavaScript date: ' + date);
    result = await connection.execute(
      `INSERT INTO datetest (id, timestampcol, timestamptz, timestampltz, datecol)
       VALUES (2, :ts, :tstz, :tsltz, :td)`,
      { ts: date, tstz: date, tsltz: date, td: date });
    console.log('Rows inserted: ' + result.rowsAffected );

    console.log('Query Results:');
    result = await connection.execute(
      `SELECT id, timestampcol, timestamptz, timestampltz, datecol,
              TO_CHAR(CURRENT_DATE, 'DD-Mon-YYYY HH24:MI') AS CD
       FROM datetest
       ORDER BY id`);
    console.log(result.rows);

    // Show the queried dates are of type Date
    let ts = result.rows[0]['TIMESTAMPCOL'];
    ts.setDate(ts.getDate() + 5);
    console.log('TIMESTAMP manipulation in JavaScript:', ts);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

run();

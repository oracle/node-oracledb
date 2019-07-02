/* Copyright (c) 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   impres.js
 *
 * DESCRIPTION
 *   Shows PL/SQL 'Implict Results' returning multiple query results
 *   from PL/SQL code.
 *
 *   This example requires node-oracledb 4.0 or later, Oracle Database
 *   12c or later, and Oracle Client 12c libraries or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

oracledb.outFormat =  oracledb.OUT_FORMAT_OBJECT;

async function run() {
  let connection;

  try {

    connection = await oracledb.getConnection(dbConfig);

    let result, row;

    const plsql = `
      DECLARE
        c1 SYS_REFCURSOR;
        c2 SYS_REFCURSOR;
      BEGIN
        OPEN c1 FOR SELECT city, postal_code
                    FROM locations
                    WHERE location_id < 1500;
        DBMS_SQL.RETURN_RESULT(c1);

        OPEN C2 FOR SELECT job_id, employee_id, last_name
                    FROM employees
                    WHERE employee_id < 110;
        DBMS_SQL.RETURN_RESULT(c2);
      END;`;

    console.log('1. Implict Results fully fetched at execute:');
    result = await connection.execute(plsql);
    console.log(result.implicitResults);

    console.log();

    console.log('2. Implict Results using node-oracledb ResultSets:');
    result = await connection.execute(plsql, [], { resultSet: true });
    for (const rs of result.implicitResults) {
      console.log(" Implicit Result Set:");
      while ((row = await rs.getRow())) {
        console.log("  ", row);
      }
      console.log();
      await rs.close();
    }

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

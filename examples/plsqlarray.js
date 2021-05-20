/* Copyright (c) 2016, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   plsqlarray.js
 *
 * DESCRIPTION
 *   Examples of binding PL/SQL "INDEX BY" tables.  Beach names and
 *   water depths are passed into the first PL/SQL procedure which
 *   inserts them into a table.  The second PL/SQL procedure queries
 *   that table and returns the values.  The third procedure accepts
 *   arrays, and returns the values sorted by the beach name.
 *
 *   This example requires node-oracledb 1.6 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

// On Windows and macOS, you can specify the directory containing the Oracle
// Client Libraries at runtime, or before Node.js starts.  On other platforms
// the system library search path must always be set before Node.js is started.
// See the node-oracledb installation documentation.
// If the search path is not correct, you will get a DPI-1047 error.
if (process.platform === 'win32') { // Windows
  oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_19_11' });
} else if (process.platform === 'darwin') { // macOS
  oracledb.initOracleClient({ libDir: process.env.HOME + '/Downloads/instantclient_19_8' });
}

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    //
    // Create table and package
    //

    const stmts = [
      `DROP TABLE no_waveheight`,

      `CREATE TABLE no_waveheight (beach VARCHAR2(50), depth NUMBER)`,

      `CREATE OR REPLACE PACKAGE no_beachpkg IS
         TYPE beachType IS TABLE OF VARCHAR2(30) INDEX BY BINARY_INTEGER;
         TYPE depthType IS TABLE OF NUMBER       INDEX BY BINARY_INTEGER;
         PROCEDURE array_in(beaches IN beachType, depths IN depthType);
         PROCEDURE array_out(beaches OUT beachType, depths OUT depthType);
         PROCEDURE array_inout(beaches IN OUT beachType, depths IN OUT depthType);
       END;`,

      `CREATE OR REPLACE PACKAGE BODY no_beachpkg IS

         -- Insert array values into a table
         PROCEDURE array_in(beaches IN beachType, depths IN depthType) IS
         BEGIN
           IF beaches.COUNT <> depths.COUNT THEN
              RAISE_APPLICATION_ERROR(-20000, 'Array lengths must match for this example.');
           END IF;
           FORALL i IN INDICES OF beaches
             INSERT INTO no_waveheight (beach, depth) VALUES (beaches(i), depths(i));
         END;

         -- Return the values from a table
         PROCEDURE array_out(beaches OUT beachType, depths OUT depthType) IS
         BEGIN
           SELECT beach, depth BULK COLLECT INTO beaches, depths FROM no_waveheight;
         END;

         -- Return the arguments sorted
         PROCEDURE array_inout(beaches IN OUT beachType, depths IN OUT depthType) IS
         BEGIN
           IF beaches.COUNT <> depths.COUNT THEN
              RAISE_APPLICATION_ERROR(-20001, 'Array lengths must match for this example.');
           END IF;
           FORALL i IN INDICES OF beaches
             INSERT INTO no_waveheight (beach, depth) VALUES (beaches(i), depths(i));
           SELECT beach, depth BULK COLLECT INTO beaches, depths FROM no_waveheight ORDER BY 1;
         END;

        END;`
    ];

    for (const s of stmts) {
      try {
        await connection.execute(s);
      } catch (e) {
        if (e.errorNum != 942)
          console.error(e);
      }
    }

    let result;

    //
    // PL/SQL array bind IN parameters:
    // Pass arrays of values to a PL/SQL procedure
    //

    await connection.execute(
      `BEGIN
         no_beachpkg.array_in(:beach_in, :depth_in);
       END;`,
      {
        beach_in:
        { type : oracledb.STRING,
          dir: oracledb.BIND_IN,
          val: ["Malibu Beach", "Bondi Beach", "Waikiki Beach"] },
        depth_in:
        { type : oracledb.NUMBER,
          dir: oracledb.BIND_IN,
          val: [45, 30, 67] }
      }
    );
    console.log('Data was bound in successfully');

    //
    // PL/SQL array bind OUT parameters:
    // Fetch arrays of values from a PL/SQL procedure
    //

    result = await connection.execute(
      `BEGIN
         no_beachpkg.array_out(:beach_out, :depth_out);
       END;`,
      {
        beach_out:
        { type: oracledb.STRING,
          dir: oracledb.BIND_OUT,
          maxArraySize: 3 },
        depth_out:
        { type: oracledb.NUMBER,
          dir: oracledb.BIND_OUT,
          maxArraySize: 3 }
      }
    );
    console.log("Binds returned:");
    console.log(result.outBinds);

    //
    // PL/SQL array bind IN OUT parameters:
    // Return input arrays sorted by beach name
    //

    result = await connection.execute(
      `BEGIN
         no_beachpkg.array_inout(:beach_inout, :depth_inout);
       END;`,
      {
        beach_inout:
        { type: oracledb.STRING,
          dir: oracledb.BIND_INOUT,
          val: ["Port Melbourne Beach", "Eighty Mile Beach", "Chesil Beach"],
          maxArraySize: 6 },
        depth_inout:
        { type: oracledb.NUMBER,
          dir: oracledb.BIND_INOUT,
          val: [8, 3, 70],
          maxArraySize: 6 }
      }
    );
    console.log("Binds returned:");
    console.log(result.outBinds);

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

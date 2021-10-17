/* Copyright (c) 2015, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   plsqlfunc.js
 *
 * DESCRIPTION
 *   Shows how to call a PL/SQL function.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const fs = require('fs');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

// On Windows and macOS, you can specify the directory containing the Oracle
// Client Libraries at runtime, or before Node.js starts.  On other platforms
// the system library search path must always be set before Node.js is started.
// See the node-oracledb installation documentation.
// If the search path is not correct, you will get a DPI-1047 error.
let libPath;
if (process.platform === 'win32') {           // Windows
  libPath = 'C:\\oracle\\instantclient_19_12';
} else if (process.platform === 'darwin') {   // macOS
  libPath = process.env.HOME + '/Downloads/instantclient_19_8';
}
if (libPath && fs.existsSync(libPath)) {
  oracledb.initOracleClient({ libDir: libPath });
}

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    // Create a PL/SQL stored procedure

    await connection.execute(
      `CREATE OR REPLACE FUNCTION no_func
         (p1_in IN VARCHAR2, p2_in IN VARCHAR2, p3_out OUT NUMBER) RETURN VARCHAR2
       AS
       BEGIN
         p3_out := 123;
         RETURN p1_in || ' ' || p2_in;
       END;`
    );

    // Invoke the PL/SQL function.
    //
    // The equivalent call with PL/SQL named parameter syntax is:
    // `BEGIN
    //    :ret := no_func(p1_in => :p1, p2_in => :p2, p3_out => :p3);
    //  END;`

    const result = await connection.execute(
      `BEGIN
         :ret := no_func(:p1, :p2, :p3);
       END;`,
      {
        p1:  'Chris', // Bind type is determined from the data.  Default direction is BIND_IN
        p2:  'Jones',
        p3:  { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        ret: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 40 }
      });

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

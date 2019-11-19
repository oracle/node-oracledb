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
 *   plsqlproc.js
 *
 * DESCRIPTION
 *   Show calling a PL/SQL procedure and binding parameters in various ways.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

async function run() {

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    // Create a PL/SQL stored procedure

    await connection.execute(
      `CREATE OR REPLACE PROCEDURE no_proc
         (p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT NUMBER)
       AS
       BEGIN
         p_inout := p_in || p_inout;
         p_out := 101;
       END;`
    );

    // Invoke the PL/SQL stored procedure.
    //
    // The equivalent call with PL/SQL named parameter syntax is:
    // `BEGIN
    //    no_proc(p_in => :i, p_inout => :io, p_out => :o);
    //  END;`

    const result = await connection.execute(
      `BEGIN
         no_proc(:i, :io, :o);
       END;`,
      {
        i:  'Chris',  // Bind type is determined from the data.  Default direction is BIND_IN
        io: { val: 'Jones', dir: oracledb.BIND_INOUT },
        o:  { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      }
    );

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

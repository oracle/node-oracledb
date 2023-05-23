/* Copyright (c) 2019, 2023, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   plsqlrecord.js
 *
 * DESCRIPTION
 *   Shows binding of PL/SQL RECORDS
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

// This example requires node-oracledb Thick mode.
//
// Thick mode requires Oracle Client or Oracle Instant Client libraries.  On
// Windows and macOS Intel you can specify the directory containing the
// libraries at runtime or before Node.js starts.  On other platforms (where
// Oracle libraries are available) the system library search path must always
// include the Oracle library path before Node.js starts.  If the search path
// is not correct, you will get a DPI-1047 error.  See the node-oracledb
// installation documentation.
let clientOpts = {};
if (process.platform === 'win32') {                                   // Windows
  clientOpts = { libDir: 'C:\\oracle\\instantclient_19_17' };
} else if (process.platform === 'darwin' && process.arch === 'x64') { // macOS Intel
  clientOpts = { libDir: process.env.HOME + '/Downloads/instantclient_19_8' };
}
oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode

async function run() {
  let connection, binds, options, result, obj;

  // The PL/SQL that is called in each example
  const plsql = `CALL rectest.myproc(:inbv, :outbv)`;

  try {

    connection = await oracledb.getConnection(dbConfig);

    //
    // Create a PL/SQL package that uses a RECORD
    //

    const stmts = [
      `CREATE OR REPLACE PACKAGE rectest AS
         TYPE rectype IS RECORD (name VARCHAR2(40), pos NUMBER);
         PROCEDURE myproc (p_in IN rectype, p_out OUT rectype);
       END rectest;`,

      `CREATE OR REPLACE PACKAGE BODY rectest AS
         PROCEDURE myproc (p_in IN rectype, p_out OUT rectype) AS
         BEGIN
           p_out := p_in;
           p_out.pos := p_out.pos * 2;
         END;
       END rectest;`
    ];

    for (const s of stmts) {
      try {
        await connection.execute(s);
      } catch (e) {
        console.error(e);
      }
    }


    //
    // Get the RECORD prototype object
    //

    const RecTypeClass = await connection.getDbObjectClass("RECTEST.RECTYPE");
    // console.log(RecTypeClass.prototype);


    //
    // Single execution
    //

    console.log('Using the constructor to create an object:');
    obj = new RecTypeClass({ NAME: 'Ship', POS: 12 });

    binds = {
      inbv: obj,
      outbv: { type: RecTypeClass, dir: oracledb.BIND_OUT }
    };

    result = await connection.execute(plsql, binds);
    console.log(result.outBinds.outbv);

    console.log('\nBinding the record values directly:');

    binds = {
      inbv: { type: RecTypeClass, val: { NAME: 'Plane', POS: 34 } },
      outbv: { type: RecTypeClass, dir: oracledb.BIND_OUT }
    };

    result = await connection.execute(plsql, binds);
    console.log(result.outBinds.outbv);

    // Using the name for the type
    binds = {
      inbv: { type: "RECTEST.RECTYPE", val: { NAME: 'Car', POS: 56 } },
      outbv: { type: RecTypeClass, dir: oracledb.BIND_OUT }
    };

    result = await connection.execute(plsql, binds);
    console.log(result.outBinds.outbv);

    //
    // executeMany()
    //

    console.log('\nExample with executeMany():');

    binds = [
      { inbv: { NAME: 'Train', POS: 78 } },
      { inbv: { NAME: 'Bike', POS: 83 } }
    ];

    options = {
      bindDefs: {
        inbv: { type: RecTypeClass },
        outbv: { type: RecTypeClass, dir: oracledb.BIND_OUT },
      }
    };

    result = await connection.executeMany(plsql, binds, options);
    for (const b of result.outBinds) {
      console.log(b.outbv);
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

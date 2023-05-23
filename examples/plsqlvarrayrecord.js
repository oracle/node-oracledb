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
 *   plsqlvarrayrecord.js
 *
 * DESCRIPTION
 *   Shows binding a VARRAY of RECORD in PL/SQL
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
  let connection;

  try {

    connection = await oracledb.getConnection(dbConfig);

    // Create a PL/SQL package that uses a RECORD

    const stmts = [

      `CREATE OR REPLACE PACKAGE netball AS
         TYPE playerType IS RECORD (name VARCHAR2(40), position varchar2(20), shirtnumber NUMBER);
         TYPE teamType IS VARRAY(10) OF playerType;
         PROCEDURE assignShirtNumbers (t_in IN teamType, t_out OUT teamType);
       END netball;`,


      `CREATE OR REPLACE PACKAGE BODY netball AS

         PROCEDURE assignShirtNumbers (t_in IN teamtype, t_out OUT teamtype) AS
           p teamType := teamType();
         BEGIN
           FOR i in 1..t_in.COUNT LOOP
             p.EXTEND;
             p(i) := t_in(i);
             p(i).SHIRTNUMBER := i;
           END LOOP;
           t_out := p;
         END;

       END netball;`

    ];

    for (const s of stmts) {
      try {
        await connection.execute(s);
      } catch (e) {
        console.error(e);
      }
    }

    const plsql = `CALL netball.assignShirtNumbers(:inbv, :outbv)`;

    const binds = {
      inbv:
      {
        type: "NETBALL.TEAMTYPE",  // the name of the top level database type, case sensitive
        val:
        [
          { NAME: 'Jay',    POSITION: 'GOAL ATTACK',  SHIRTNUMBER: 0 },
          { NAME: 'Leslie', POSITION: 'CENTRE',       SHIRTNUMBER: 0 },
          { NAME: 'Chris',  POSITION: 'WING DEFENCE', SHIRTNUMBER: 0 }
        ]
      },
      outbv:
      {
        type: "NETBALL.TEAMTYPE",
        dir: oracledb.BIND_OUT
      }
    };

    const result = await connection.execute(plsql, binds);

    for (const player of result.outBinds.outbv) {
      console.log(player.NAME, ":", player.SHIRTNUMBER);
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

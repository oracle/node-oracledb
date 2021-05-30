/* Copyright (c) 2019, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   demodrop.js
 *
 * DESCRIPTION
 *   Cleanup schema objects created by node-oracledb examples
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

  console.log('Dropping schema objects');

  try {

    connection = await oracledb.getConnection(dbConfig);

    const stmts = [
      `DROP PROCEDURE no_proc`,

      `DROP FUNCTION no_func`,

      `DROP PROCEDURE no_get_rs`,

      `DROP PACKAGE no_beachpkg`,

      `DROP TABLE no_banana_farmer PURGE`,

      `DROP TABLE no_farmtab PURGE`,

      `DROP TABLE no_purchaseorder PURGE`,

      `DROP TABLE no_purchaseorder_b PURGE`,

      `DROP TABLE no_lastinsertid PURGE`,

      `DROP TABLE no_dmlrupdtab PURGE`,

      `DROP TABLE no_lobs PURGE`,

      `DROP TYPE no_dorow`,

      `DROP FUNCTION no_dofetch`,

      `DROP TABLE no_raw PURGE`,

      `DROP TABLE no_waveheight PURGE`,

      `DROP PROCEDURE no_lob_in_out`,

      `DROP PROCEDURE no_lobs_in`,

      `DROP PROCEDURE no_lobs_out`,

      `DROP TABLE no_em_tab PURGE`,

      `DROP TABLE no_em_childtab PURGE`,

      `DROP TABLE no_em_parenttab PURGE`,

      `DROP PROCEDURE no_em_proc`,

      `DROP TABLE no_cqntable PURGE`,

      `DROP TABLE no_datetab PURGE`,

      `DROP TABLE no_sports PURGE`,

      `DROP TABLE no_example PURGE`,

      `DROP TABLE no_geometry PURGE`,

      `DROP TABLE no_tab1 PURGE`,

      `DROP TABLE no_tab2 PURGE`,

      `DROP TABLE no_nc_people PURGE`,

      `DROP TABLE no_nc_address PURGE`,

      `CALL DBMS_AQADM.STOP_QUEUE('DEMO_RAW_QUEUE')`,

      `CALL DBMS_AQADM.DROP_QUEUE('DEMO_RAW_QUEUE')`,

      `CALL DBMS_AQADM.DROP_QUEUE_TABLE('DEMO_RAW_QUEUE_TAB')`,

      `CALL DBMS_AQADM.STOP_QUEUE('ADDR_QUEUE')`,

      `CALL DBMS_AQADM.DROP_QUEUE('ADDR_QUEUE')`,

      `CALL DBMS_AQADM.DROP_QUEUE_TABLE('ADDR_QUEUE_TAB')`

    ];

    for (const s of stmts) {
      try {
        console.log(s);
        await connection.execute(s);
      } catch (e) {
        // do nothing
      }
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

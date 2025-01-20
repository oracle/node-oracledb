/* Copyright (c) 2025, Oracle and/or its affiliates. */

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
 *   dbobjassocarray.js
 *
 * DESCRIPTION
 *   Tests the use of Associative Array-type dbObjects indexed by integer.
 *
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

// This example runs in both node-oracledb Thin and Thick modes.
//
// Optionally run in node-oracledb Thick mode
if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {

  // Thick mode requires Oracle Client or Oracle Instant Client libraries.
  // On Windows and macOS you can specify the directory containing the
  // libraries at runtime or before Node.js starts.  On other platforms (where
  // Oracle libraries are available) the system library search path must always
  // include the Oracle library path before Node.js starts.  If the search path
  // is not correct, you will get a DPI-1047 error.  See the node-oracledb
  // installation documentation.
  let clientOpts = {};
  // On Windows and macOS platforms, set the environment variable
  // NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
  if (process.platform === 'win32' || process.platform === 'darwin') {
    clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
  }
  oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
}

console.log(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');

async function run() {

  let connection;

  const PKG1 = 'NODB_PKG_OBJ_1_PLS_INTEGER';
  const TYPE1 = 'NODB_TYP_OBJ_1_PLS_ARR_INTEGER';

  try {
    // Get a non-pooled connection
    connection = await oracledb.getConnection(dbConfig);

    // Create the package with the Associative Array
    let pkgSql =
      `CREATE OR REPLACE PACKAGE ${PKG1} AUTHID DEFINER AS
        TYPE ${TYPE1} IS TABLE OF NUMBER INDEX BY PLS_INTEGER;
        FUNCTION F1  RETURN ${TYPE1};
        END;`;
    await connection.execute(pkgSql);

    pkgSql = `CREATE OR REPLACE PACKAGE BODY ${PKG1} AS
            FUNCTION F1  RETURN ${TYPE1} IS
            R ${TYPE1};
            BEGIN
              R(5):=55;
              R(2):=22;
              R(10):=120;
              RETURN R;
            END ;
            END ${PKG1} ;`;
    await connection.execute(pkgSql);

    const result = await connection.execute(
      `BEGIN
        :ret := ${PKG1}.f1;
      END;`,
      {
        ret: {
          dir: oracledb.BIND_OUT,
          type: `${PKG1}.${TYPE1}`
        }
      });
    const dbObj = result.outBinds.ret;
    const dbObj1 = dbObj.copy();
    console.log('The original DbObject returned is:', dbObj.toMap());
    console.log('The copied DbObject is:', dbObj1.toMap());
    console.log('The element at position 2 in the original DbObject:', dbObj[2]);
    console.log('The element at position 2 in the copied DbObject:', dbObj1[2]);

    dbObj1.deleteElement(2);
    console.log("\nDeleted element at index 2 in the copied DbObject");
    console.log("Now, the copied DbObject is:", dbObj1.toMap());
    console.log("The original DbObject is still:", dbObj.toMap());

    dbObj.append(67);
    console.log("\nAppended the value 67 to the original DbObject");
    console.log("Now the length of original DbObject:", dbObj.length);
    console.log("The original DbObject is now:", dbObj.toMap());
    console.log("The keys in the original DbObject are:", dbObj.getKeys());
    console.log("The values in the original DbObject are:", dbObj.getValues());

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        await connection.execute(
          `DECLARE
          e_type_missing EXCEPTION;
          PRAGMA EXCEPTION_INIT(e_type_missing, -4043);
          BEGIN
          EXECUTE IMMEDIATE ('DROP TYPE ${TYPE1} FORCE');
          EXCEPTION
          WHEN e_type_missing THEN NULL;
          END;`
        );
        await connection.execute(`DROP package ${PKG1}`);
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

run();

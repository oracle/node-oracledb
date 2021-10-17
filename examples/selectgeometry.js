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
 *   selectgeometry.js
 *
 * DESCRIPTION
 *   Insert and query Oracle Spatial geometries.
 *
 *   This example requires node-oracledb 4 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

'use strict';

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

// If each object's attributes are accessed multiple times, it may be more
// efficient to fetch as simple JavaScriptobjects.
// oracledb.dbObjectAsPojo = true;

async function run() {

  let connection, result;

  try {

    connection = await oracledb.getConnection(dbConfig);

    //
    // Setup
    //
    const stmts = [
      `DROP TABLE no_geometry`,

      `CREATE TABLE no_geometry (id NUMBER, geometry MDSYS.SDO_GEOMETRY)`
    ];

    for (const s of stmts) {
      try {
        await connection.execute(s);
      } catch (e) {
        if (e.errorNum != 942)
          console.error(e);
      }
    }

    //
    // Get a prototype object for the database SDO_GEOMETRY type.
    //
    // getDbObjectClass() can require a round-trip so minimize calls
    // to it.  Pass a fully qualified type name when possible.
    // Only the top-level type needs to be acquired.
    //
    const GeomType = await connection.getDbObjectClass('MDSYS.SDO_GEOMETRY');
    // console.log(GeomType.prototype); // show attributes available

    //
    // Insert Method 1: pass a JavaScript object to the constructor.
    //
    // The JavaScript attributes match the Oracle type attributes.
    // These particular Oracle object attribute names were created
    // case insensitively (the default when quotes weren't used) but
    // need to uppercase in node-oracledb.
    //
    //
    const geometry1 = new GeomType(
      {
        SDO_GTYPE: 2003,
        SDO_SRID: null,
        SDO_POINT: null,
        SDO_ELEM_INFO: [ 1, 1003, 3 ],
        SDO_ORDINATES: [ 1, 2, 5, 8 ]
      }
    );

    await connection.execute(
      `INSERT INTO no_geometry (id, geometry) VALUES (:id, :g)`,
      {id: 1, g: geometry1}
    );

    //
    // Insert Method 2: use the Oracle type name and bind the JavaScript object directly.
    // Use a fully qualified type name when possible.
    //

    await connection.execute(
      `INSERT INTO no_geometry (id, geometry) VALUES (:id, :g)`,
      { id: 2,
        g: {
          type: 'MDSYS.SDO_GEOMETRY',   // the name of the top-level database type, case sensitive
          val: {                        // a JavaScript object that maps to the DB object
            SDO_GTYPE: 2003,
            SDO_SRID: null,
            SDO_POINT: null,
            SDO_ELEM_INFO: [ 1, 1003, 3 ],
            SDO_ORDINATES: [ 4, 8, 5, 9 ]
          }
        }
      }
    );

    //
    // Fetch the objects back
    //

    result = await connection.execute(
      `SELECT id, geometry FROM no_geometry`,
      [],
      // outFormat determines whether rows will be in arrays or JavaScript objects.
      // It does not affect how the GEOMETRY column itself is represented.
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    for (const row of result.rows) {
      console.log('Object id', row.ID);
      const g = row.GEOMETRY;                         // a DbObject for the named Oracle type
      console.log('Geometry is', g);                  // the whole object
      console.log('Ordinates are', g.SDO_ORDINATES);  // can access attributes
      console.log('JSON', JSON.stringify(g));         // Objects can be stringified
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

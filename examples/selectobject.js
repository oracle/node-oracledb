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
 *   selectobject.js
 *
 * DESCRIPTION
 *   Insert and query a named Oracle database object.
 *   Shows various ways to work with objects.
 *
 *   This example requires node-oracledb 4 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

'use strict';

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

// If each object's attributes are accessed multiple times, it may be more
// efficient to fetch as simple JavaScriptobjects.
// oracledb.dbObjectAsPojo = true;

async function run() {

  let connection, result;

  try {

    connection = await oracledb.getConnection(dbConfig);

    //
    // Create a table with a named type
    //

    const stmts = [
      `DROP TABLE no_farmtab`,

      `DROP TYPE dbfarmtype`,

      `DROP TYPE dbharvesttype`,

      `CREATE TYPE dbharvesttype AS VARRAY(10) OF VARCHAR2(20)`,

      `CREATE TYPE dbfarmtype AS OBJECT (
         farmername     VARCHAR2(20),
         harvest        dbharvesttype)`,

      `CREATE TABLE no_farmtab (id NUMBER, farm dbfarmtype)`
    ];

    for (const s of stmts) {
      try {
        await connection.execute(s);
      } catch (e) {
        if (e.errorNum != 942 && e.errorNum != 4043)
          console.error(e);
      }
    }

    //
    // Get a prototype object for the database DBHARVESTTYPE type.
    //
    // The case of the name is significant.
    //
    // getDbObjectClass() can require a round-trip so minimize calls
    // to it.  Pass a fully qualified type name when possible.
    //
    const FarmType = await connection.getDbObjectClass('DBFARMTYPE');

    console.log('Farm Type:');
    console.log(FarmType.prototype); // show attributes available

    // Nested type
    console.log('\nHarvest Type:');
    console.log(FarmType.prototype.attributes.HARVEST.typeClass.prototype);

    //
    // Insert Method 1: pass a JavaScript object to the constructor.
    //
    // The JavaScript attribute names match the Oracle type
    // attributes.  These particular Oracle object attribute names
    // were created case insensitively in the database.  This is the
    // default when quotes aren't used in the CREATE statement.  In
    // node-oracledb attributes created like this need to be
    // uppercase.
    //
    console.log('\nA FarmType object:');

    const farm1 = new FarmType(
      {
        FARMERNAME: 'MacDonald',
        HARVEST:  ['Apples', 'Pears', 'Peaches']
      }
    );
    console.log(farm1);

    await connection.execute(
      `INSERT INTO no_farmtab (id, farm) VALUES (:id, :f)`,
      {id: 1, f: farm1}
    );

    //
    // Insert Method 2: set each attribute individually
    //
    console.log('\nA nested type:');

    // Find the subtype prototype object.
    //
    // The commented getDbObjectClass() line has the same effect as
    // the line above but will require a round-trip to the database
    // because a fully qualified name was not used, meaning the type
    // information couldn't be looked up in node-oracledb's type
    // cache.
    const HarvestType = FarmType.prototype.attributes.HARVEST.typeClass;
    // const HarvestType = await connection.getDbObjectClass('DBHARVESTTYPE');

    console.log(HarvestType);
    console.log(HarvestType.toString());

    const farm2 = new FarmType();
    farm2.FARMERNAME = 'Giles';
    farm2.HARVEST = new HarvestType(['carrots', 'peas']);
    farm2.HARVEST.trim(1);             // whoops! no peas
    farm2.HARVEST.append('tomatoes');  // extend the collection
    console.log(farm2.HARVEST.getValues());

    await connection.execute(
      `INSERT INTO no_farmtab (id, farm) VALUES (:id, :f)`,
      { id: 2, f: farm2 }
    );


    //
    // Insert Method 3: use the prototype object for the bind 'type',
    // and supply a JavaScript object directly for the 'val'
    //

    await connection.execute(
      `INSERT INTO no_farmtab (id, farm) VALUES (:id, :f)`,
      { id: 3,
        f: {
          type: FarmType,   // pass the prototype object
          val: {             // a JavaScript object that maps to the DB object
            FARMERNAME: 'Smith',
            HARVEST: [ 'pepper', 'cinnamon', 'nutmeg' ]
          }
        }
      }
    );


    //
    // Insert Method 4: use the Oracle type name.
    // Note: use a fully qualified type name when possible.
    //

    await connection.execute(
      `INSERT INTO no_farmtab (id, farm) VALUES (:id, :f)`,
      { id: 4,
        f: {
          type: 'DBFARMTYPE',   // the name of the top level database type, case sensitive
          val: {                // a JavaScript object that maps to the DB object
            FARMERNAME: 'Boy',
            HARVEST: ['flowers', 'seedlings' ]
          }
        }
      }
    );


    //
    // Fetch an object back
    //
    console.log('\nQuerying:');

    result = await connection.execute(
      `SELECT id, farm FROM no_farmtab WHERE id = 1 `,
      [],
      // outFormat determines whether rows will be in arrays or JavaScript objects.
      // It does not affect how the FARM column itself is represented.
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    for (const row of result.rows) {

      const farm = row.FARM;                            // a DbObject for the named Oracle type

      console.log('\nFarm is:', farm);                  // the whole object
      console.log('JSON', JSON.stringify(farm));        // Objects can be stringified

      console.log('\nFarmer name', farm.FARMERNAME);    // an attribute of the object
      console.log('Harvest is:');                       // iterate over the collection
      for (const crop of farm.HARVEST) {
        console.log(crop);
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

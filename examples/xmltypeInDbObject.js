/* Copyright (c) 2024, Oracle and/or its affiliates. */

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
 *   xmltypeInDbObject.js
 *
 * DESCRIPTION
 *   Work with XMLType data in DbObject (Thin mode only)
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

// This example runs in node-oracledb Thin mode only.
if (!oracledb.thin) {
  console.log ("This example does not run in Thick mode");
  process.exit(0);
}

async function run() {
  let conn;
  const TYPE1 = 'NODB_TEST_XMLTYPE';

  const XMLData =
    '<Warehouse>\n  ' +
    '<WarehouseId>1</WarehouseId>\n  ' +
    '<WarehouseName>Melbourne, Australia</WarehouseName>\n  ' +
    '<Building>Owned</Building>\n  ' +
    '<Area>2020</Area>\n  ' +
    '<Docks>1</Docks>\n  ' +
    '<DockType>Rear load</DockType>\n  ' +
    '<WaterAccess>false</WaterAccess>\n  ' +
    '<RailAccess>N</RailAccess>\n  ' +
    '<Parking>Garage</Parking>\n  ' +
    '<VClearance>20</VClearance>\n' +
    '</Warehouse>\n';

  try {
    conn = await oracledb.getConnection(dbConfig);

    const sqlTypeCreate = `CREATE TYPE ${TYPE1} FORCE AS OBJECT (
      XMLDATA sys.xmltype)`;
    await conn.execute(sqlTypeCreate);

    const sql = `SELECT ${TYPE1}(sys.xmltype('${XMLData}')) FROM dual`;
    const result = await conn.execute(sql);

    console.log('XML Data:');
    console.log('---------');
    console.log(result.rows[0][0].XMLDATA);

    // Validate metadata
    const xmlObjClass = result.metaData[0];
    const pInObj = new xmlObjClass.dbTypeClass();
    console.log('Data Type:');
    console.log('----------');
    console.log(pInObj.attributes.XMLDATA.type);

  } catch (e) {
    if (e.errorNum != 942)
      console.log(e);
  } finally {
    if (conn) {
      await conn.execute(`DROP TYPE ${TYPE1}`);
      await conn.close();
    }
  }
}

run();

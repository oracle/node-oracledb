/* Copyright (c) 2018, 2022, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   sodaUtil.js
 *
 * DESCRIPTION
 *   The utility functions of SODA tests.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const dbconfig = require('./dbconfig.js');

let sodaUtil = exports;
module.exports = sodaUtil;

let isSodaRoleGranted = false;

sodaUtil.cleanup = async function() {
  let conn;
  try {
    conn = await oracledb.getConnection(dbconfig);
    let sd = conn.getSodaDatabase();

    let cNames = await sd.getCollectionNames();
    if (cNames.length > 0) {
      for (let i = 0; i < cNames.length; i++) {
        let coll = await sd.openCollection(cNames[i]);
        await coll.drop();
      }
    }
  } catch (err) {
    console.error('Error in processing:\n', err);
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        console.error('Error in closing connection:\n', err);
      }
    }
  }

}; // cleanup()

sodaUtil.isSodaRoleGranted = async function() {
  if (isSodaRoleGranted == false) {
    let conn = await oracledb.getConnection(dbconfig);
    let sql = `select count(*) from user_role_privs where GRANTED_ROLE='SODA_APP'`;
    let result = await conn.execute(sql);
    if (result.rows[0][0] == 1) {
      isSodaRoleGranted = true;
    }
    await conn.close();
  }

  return isSodaRoleGranted;
}; // isSodaRoleGranted()


sodaUtil.t_contents = [
  { id: 1001, name: "Gillian", office: "Shenzhen" },
  { id: 1002, name: "Chris",    office: "Melbourne" },
  { id: 1003, name: "Changjie", office: "Shenzhen" },
  { id: 1004, name: "Venkat",   office: "Bangalore" },
  { id: 1005, name: "May",      office: "London" },
  { id: 1006, name: "Joe",      office: "San Francisco" },
  { id: 1007, name: "Gavin",    office: "New York" }
];

sodaUtil.t_contents_spatial = [
  {
    id: 1001,
    name: "Gillian",
    office: "Shenzhen",
    geometry: {
      "type": "Point",
      "coordinates": [125.6, 10.1]
    }
  },
  {
    id: 1002,
    name: "Chris",
    office: "Melbourne",
    geometry: {
      "type": "Point",
      "coordinates": [125.6, 20.1]
    }
  },
  {
    id: 1003,
    name: "Changjie",
    office: "Shenzhen",
    geometry: {
      "type": "Point",
      "coordinates": [125.6, 30.1]
    }
  },
  {
    id: 1004,
    name: "Venkat",
    office: "Bangalore",
    geometry: {
      "type": "Point",
      "coordinates": [135.6, 10.1]
    }
  },
  {
    id: 1005,
    name: "May",
    office: "London",
    geometry: {
      "type": "Point",
      "coordinates": [145.6, 10.1]
    }
  },
  {
    id: 1006,
    name: "Joe",
    office: "San Francisco",
    geometry: {
      "type": "Point",
      "coordinates": [155.6, 10.1]
    }
  },
  {
    id: 1007,
    name: "Gavin",
    office: "New York",
    geometry: {
      "type": "Point",
      "coordinates": [165.6, 10.1]
    }
  }
];

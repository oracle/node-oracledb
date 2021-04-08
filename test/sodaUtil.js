/* Copyright (c) 2018, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
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
      console.log("existing collections: ");
      console.log(cNames);

      for (let i = 0; i < cNames.length; i++) {
        let coll = await sd.openCollection(cNames[i]);
        let res = await coll.drop();
        if (res.dropped) {
          console.log("Succeed to drop collection", cNames[i]);
        } else {
          console.log("Fail to drop collection", cNames[i]);
        }
      }
    }

  } catch (err) {
    console.log('Error in processing:\n', err);
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        console.log('Error in closing connection:\n', err);
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

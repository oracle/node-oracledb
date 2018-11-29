/* Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved. */

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
const assert   = require('assert');

let sodaUtil = exports;
module.exports = sodaUtil;

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

  } catch(err) {
    console.log('Error in processing:\n', err);
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch(err) {
        console.log('Error in closing connection:\n', err);
      }
    }
  }

}; // cleanup()

sodaUtil.checkPrerequisites = async function() {

  if (oracledb.oracleClientVersion < 1803000000) return false;

  try {
    let connection = await oracledb.getConnection(dbconfig);
    if (connection.oracleServerVersion < 1803000000) return false;

    await connection.close();

    return true;
  } catch(err) {
    console.log('Error in checking prerequistes:\n', err);
  }
};

sodaUtil.assertThrowsAsync = async function(fn, RegExp) {
  let f = () => {};
  try {
    await fn();
  } catch(e) {
    f = () => { throw e; };
  } finally {
    assert.throws(f, RegExp);
  }
};

sodaUtil.t_contents = [
  { id: 1001, name: "Gillian",  office: "Shenzhen" },
  { id: 1002, name: "Chris",    office: "Melbourne" },
  { id: 1003, name: "Changjie", office: "Shenzhen" },
  { id: 1004, name: "Venkat",   office: "Bangalore" },
  { id: 1005, name: "May",      office: "London" },
  { id: 1006, name: "Joe",      office: "San Francisco" },
  { id: 1007, name: "Gavin",    office: "New York" }
];